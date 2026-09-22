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
    const staff=await rest('profiles?select=id,org_id,role,display_name&id=eq.'+encodeURIComponent(uid));
    if(staff?.length){this.profile=staff[0];return this.profile}
    const students=await rest('student_accounts?select=student_id,auth_user_id,org_id,login_roll,must_change_password,status&auth_user_id=eq.'+encodeURIComponent(uid));
    if(students?.length){
      const a=students[0];this.profile={id:uid,org_id:a.org_id,role:'student',student_id:a.student_id,display_name:'Student '+a.login_roll,login_roll:a.login_roll,must_change_password:a.must_change_password,status:a.status};return this.profile;
    }
    throw new Error('Your login has no UMEED access mapping.');
  },
  orgId(){return this.profile?.org_id||null},
  async fetchTable(table,select='*',order='updated_at.desc'){
    const org=this.orgId();if(!org)throw new Error('Organization is not loaded.');
    let q=table+'?select='+encodeURIComponent(select)+'&org_id=eq.'+encodeURIComponent(org);
    if(order)q+='&order='+encodeURIComponent(order);
    return await rest(q);
  },
  async refreshAll(){
    const [students,classes,classFeeSchedule,feeEntries,feeReceipts,feeReceiptMonths,refunds,activity,settings,catalogItems,counterSales,counterSaleItems]=await Promise.all([
      this.fetchTable('students'),this.fetchTable('classes'),this.fetchTable('class_fee_schedule'),
      this.fetchTable('fee_entries'),this.fetchTable('fee_receipts'),this.fetchTable('fee_receipt_months'),
      this.fetchTable('refunds'),this.fetchTable('activity_log'),this.fetchTable('settings'),
      this.fetchTable('catalog_items'),this.fetchTable('counter_sales'),this.fetchTable('counter_sale_items')
    ]);
    return {students,classes,classFeeSchedule,feeEntries,feeReceipts,feeReceiptMonths,refunds,activityLog:activity,settings:settings?.[0]||null,catalogItems,counterSales,counterSaleItems};
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
    const tables=['profiles','student_accounts','classes','class_fee_schedule','students','settings','fee_entries','fee_receipts','fee_receipt_months','refunds','catalog_items','counter_sales','counter_sale_items','activity_log','sync_metadata'];
    const results=[];for(const table of tables){try{await rest(table+'?select=*&limit=1');results.push({table,ok:true})}catch(e){results.push({table,ok:false,error:e.message,status:e.status})}}
    return results;
  },
  async syncQueue(state,onProgress=()=>{}){
    if(!navigator.onLine)throw new Error('Internet connection is required to sync pending records.');
    const pending=state.syncQueue.filter(q=>q.status==='pending');let done=0;
    for(const q of pending){
      try{
        let remote=null;
        if(q.type==='student_upsert')remote=await this.upsert('students',q.payload);
        else if(q.type==='settings_v31_rpc')remote=await this.rpc('update_app_settings_v31',q.payload);
        else if(q.type==='activity_upsert')remote=await this.upsert('activity_log',q.payload);
        else if(q.type==='fee_rpc')remote=await this.rpc('record_fee_entry',q.payload);
        else if(q.type==='fee_receipt_rpc')remote=await this.rpc('record_fee_receipt_v32',q.payload);
        else if(q.type==='refund_rpc')remote=await this.rpc(q.payload?.p_fee_receipt_id!==undefined?'record_refund_v32':'record_refund',q.payload);
        else if(q.type==='counter_sale_rpc')remote=await this.rpc('record_counter_sale',q.payload);
        else{q.status='skipped';continue}

        if(q.type==='fee_rpc'){const row=Array.isArray(remote)?remote[0]:remote;if(row){state.feeEntries=state.feeEntries.filter(x=>x.id!==q.local_id);state.feeEntries.push(row)}}
        else if(q.type==='fee_receipt_rpc'){const row=Array.isArray(remote)?remote[0]:remote;if(row){state.feeReceipts=state.feeReceipts.filter(x=>x.id!==q.local_id);state.feeReceipts.push(row)}}
        else if(q.type==='refund_rpc'){const row=Array.isArray(remote)?remote[0]:remote;if(row){state.refunds=state.refunds.filter(x=>x.id!==q.local_id);state.refunds.push(row)}}
        else if(q.type==='settings_v31_rpc'){const row=Array.isArray(remote)?remote[0]:remote;if(row)state.settings=row}
        else if(q.type==='counter_sale_rpc'){const row=Array.isArray(remote)?remote[0]:remote;if(row){state.counterSales=state.counterSales.filter(x=>x.id!==q.local_id);state.counterSales.push(row)}}

        q.status='synced';q.synced_at=new Date().toISOString();q.last_error='';done++;onProgress(done,pending.length,q);
      }catch(e){q.last_error=e.message;if(this.isNetworkError(e))throw e;throw new Error('Sync stopped on '+q.type+': '+e.message)}
    }
    state.syncQueue=state.syncQueue.filter(q=>q.status==='pending');state.lastSync=new Date().toISOString();
    if(this.profile?.role!=='student'){try{await this.upsert('sync_metadata',{id:crypto.randomUUID(),device_id:navigator.userAgent.slice(0,180),last_sync_at:state.lastSync,pending_count:state.syncQueue.length,updated_at:state.lastSync})}catch{}}
    return {count:done,pending:state.syncQueue.length};
  }
};