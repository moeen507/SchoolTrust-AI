import {CONFIG} from './config.js';
import {SupabaseSyncService} from './supabase-sync-service.js';

const iso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}
function payload(row){return {p_school_name:row.school_name,p_school_phone:row.school_phone,p_school_address:row.school_address,p_slip_prefix:row.slip_prefix,p_prepared_by:row.prepared_by}}
export const SettingsService={
  normalize(input,current={}){
    return {...current,school_name:String(input.school_name||'UMEED Education System').trim(),school_phone:String(input.school_phone||'').trim(),school_address:String(input.school_address||'').trim(),monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund,slip_prefix:String(input.slip_prefix||'UES').trim()||'UES',prepared_by:String(input.prepared_by||'Admin/Cashier').trim(),updated_at:iso()};
  },
  async save(state,input){
    const row=this.normalize(input,state.settings);state.settings=row;
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{
        const result=await SupabaseSyncService.rpc('update_app_settings',payload(row));
        const saved=Array.isArray(result)?result[0]:result;if(saved)state.settings=saved;
        return {queued:false};
      }catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
    }
    queue(state,{id:id(),key:'settings',type:'settings_rpc',payload:payload(row),created_at:iso(),status:'pending'});
    return {queued:true};
  }
};
