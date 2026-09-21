import {CONFIG} from './config.js';
import {AuthService} from './auth-service.js';

function headers(extra={}){
  const token=AuthService.token();
  if(!token)throw Object.assign(new Error('Please sign in.'),{status:401});
  return {apikey:CONFIG.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json',...extra};
}
async function decode(response){
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!response.ok)throw Object.assign(new Error(data?.message||data?.error||String(data||'Supabase request failed.')),{status:response.status,data});
  return data;
}
async function rest(path,options={}){return decode(await fetch(CONFIG.supabaseUrl+'/rest/v1/'+path,{...options,headers:headers(options.headers||{})}))}
export const SupabaseSyncService={
  profile:null,
  isNetworkError(error){return !error?.status},
  async loadProfile(){
    const uid=AuthService.user()?.id;if(!uid)throw new Error('No authenticated user.');
    const rows=await rest('profiles?select=id,org_id,role,display_name&id=eq.'+encodeURIComponent(uid));
    if(!rows?.length)throw new Error('Your login has no UMEED profile/organization assignment.');
    this.profile=rows[0];return this.profile;
  },
  orgId(){return this.profile?.org_id||null},
  async fetchTable(table,select='*',order='updated_at.desc'){
    const org=this.orgId();if(!org)throw new Error('Organization is not loaded.');
    let q=table+'?select='+encodeURIComponent(select)+'&org_id=eq.'+encodeURIComponent(org);
    if(order)q+='&order='+encodeURIComponent(order);
    return await rest(q);
  },
  async refreshAll(){
    const [students,classes,feeEntries,refunds,activity,settings]=await Promise.all([
      this.fetchTable('students'),this.fetchTable('classes'),this.fetchTable('fee_entries'),
      this.fetchTable('refunds'),this.fetchTable('activity_log'),this.fetchTable('settings')
    ]);
    return {students,classes,feeEntries,refunds,activityLog:activity,settings:settings?.[0]||null};
  },
  async upsert(table,row){
    const data={...row,org_id:this.orgId()};
    return await rest(table+'?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(data)});
  },
  async upsertMany(table,rows){
    const org=this.orgId(),data=rows.map(r=>({...r,org_id:org}));
    return await rest(table+'?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(data)});
  },
  async rpc(name,payload){return await rest('rpc/'+name,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)})},
  async healthCheck(){
    const results=[];for(const table of ['profiles','classes','students','settings','fee_entries','refunds','activity_log','sync_metadata']){
      try{await rest(table+'?select=*&limit=1');results.push({table,ok:true})}catch(e){results.push({table,ok:false,error:e.message,status:e.status})}
    }return results;
  },
  async syncQueue(state,onProgress=()=>{}){
    if(!navigator.onLine)throw new Error('Internet connection is required to sync pending records.');
    const pending=state.syncQueue.filter(q=>q.status==='pending');let done=0;
    for(const q of pending){
      try{
        let remote=null;
        if(q.type==='student_upsert')remote=await this.upsert('students',q.payload);
        else if(q.type==='settings_rpc')remote=await this.rpc('update_app_settings',q.payload);
        else if(q.type==='activity_upsert')remote=await this.upsert('activity_log',q.payload);
        else if(q.type==='fee_rpc')remote=await this.rpc('record_fee_entry',q.payload);
        else if(q.type==='refund_rpc')remote=await this.rpc('record_refund',q.payload);
        else{q.status='skipped';continue}

        if(q.type==='fee_rpc'){
          const row=Array.isArray(remote)?remote[0]:remote;if(row){state.feeEntries=state.feeEntries.filter(x=>x.id!==q.local_id);state.feeEntries.push(row)}
        }else if(q.type==='refund_rpc'){
          const row=Array.isArray(remote)?remote[0]:remote;if(row){state.refunds=state.refunds.filter(x=>x.id!==q.local_id);state.refunds.push(row)}
        }else if(q.type==='settings_rpc'){
          const row=Array.isArray(remote)?remote[0]:remote;if(row)state.settings=row;
        }

        q.status='synced';q.synced_at=new Date().toISOString();q.last_error='';done++;onProgress(done,pending.length,q);
      }catch(e){
        q.last_error=e.message;
        if(this.isNetworkError(e))throw e;
        throw new Error('Sync stopped on '+q.type+': '+e.message);
      }
    }
    state.syncQueue=state.syncQueue.filter(q=>q.status==='pending');
    state.lastSync=new Date().toISOString();
    try{await this.upsert('sync_metadata',{id:crypto.randomUUID(),device_id:navigator.userAgent.slice(0,180),last_sync_at:state.lastSync,pending_count:state.syncQueue.length,updated_at:state.lastSync})}catch{}
    return {count:done,pending:state.syncQueue.length};
  }
};
