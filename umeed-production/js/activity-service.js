import {SupabaseSyncService} from './supabase-sync-service.js';
const iso=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}
export const ActivityService={
  async log(state,{action,entity_type,entity_id=null,message,amount=null}){
    const row={id:uuid(),action,entity_type,entity_id,message,amount,created_at:iso(),updated_at:iso()};
    state.activityLog.unshift(row);if(state.activityLog.length>1500)state.activityLog.length=1500;
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{await SupabaseSyncService.upsert('activity_log',row);return}catch(e){if(!SupabaseSyncService.isNetworkError(e))return}
    }
    queue(state,{id:uuid(),key:'activity:'+row.id,type:'activity_upsert',payload:row,created_at:iso(),status:'pending'});
  }
};
