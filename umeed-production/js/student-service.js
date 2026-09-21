import {ValidationService} from './validation-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';

const iso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();

function normalize(input){return {
  id:input.id||id(),roll_number:String(input.roll_number||'').trim(),student_name:String(input.student_name||'').trim(),
  father_name:String(input.father_name||'').trim(),class_id:input.class_id,phone_number:String(input.phone_number||'').trim(),
  status:input.status||'active',created_at:input.created_at||iso(),updated_at:iso(),source_device:input.source_device||'client'
}}
function duplicate(state,row,ignoreId=null,extra=[]){
  const roll=String(row.roll_number).toLowerCase(),name=String(row.student_name).toLowerCase(),father=String(row.father_name).toLowerCase();
  return [...state.students,...extra].find(s=>s.id!==ignoreId&&String(s.status||'active').toLowerCase()!=='deleted'&&s.class_id===row.class_id&&(
    String(s.roll_number).toLowerCase()===roll||(String(s.student_name).toLowerCase()===name&&String(s.father_name).toLowerCase()===father)
  ));
}
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}
export const StudentService={
  newId:id,
  findDuplicate:duplicate,
  async save(state,input){
    const row=normalize(input);ValidationService.student(row);
    const dup=duplicate(state,row,input.id||null);if(dup)throw new Error('Duplicate student detected in the same class.');
    const idx=state.students.findIndex(s=>s.id===row.id);if(idx>=0)state.students[idx]=row;else state.students.push(row);
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{const saved=await SupabaseSyncService.upsert('students',row);if(saved?.[0])state.students[state.students.findIndex(s=>s.id===row.id)]=saved[0];return {row:saved?.[0]||row,queued:false}}
      catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
    }
    queue(state,{id:id(),key:'student:'+row.id,type:'student_upsert',payload:row,created_at:iso(),status:'pending'});
    return {row,queued:true};
  },
  async bulkImport(state,inputs){
    const accepted=[],skipped=[];
    for(const input of inputs){
      try{
        const row=normalize(input);ValidationService.student(row);
        if(duplicate(state,row,null,accepted)){skipped.push({input,reason:'Duplicate student'});continue}
        accepted.push(row);
      }catch(e){skipped.push({input,reason:e.message})}
    }
    if(!accepted.length)return {accepted:[],skipped,queued:0};
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{
        const saved=await SupabaseSyncService.upsertMany('students',accepted);
        for(const row of saved||[]){state.students=state.students.filter(s=>s.id!==row.id);state.students.push(row)}
        return {accepted:saved||accepted,skipped,queued:0};
      }catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
    }
    for(const row of accepted){state.students=state.students.filter(s=>s.id!==row.id);state.students.push(row);queue(state,{id:id(),key:'student:'+row.id,type:'student_upsert',payload:row,created_at:iso(),status:'pending'})}
    return {accepted,skipped,queued:accepted.length};
  },
  async softDelete(state,studentId){
    const row=state.students.find(s=>s.id===studentId);if(!row)throw new Error('Student not found.');
    row.status='deleted';row.updated_at=iso();
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{await SupabaseSyncService.upsert('students',row);return {queued:false}}catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
    }
    queue(state,{id:id(),key:'student:'+row.id,type:'student_upsert',payload:row,created_at:iso(),status:'pending'});return {queued:true};
  },
  filter(state,{query='',classId='',status='active'}={}){
    const q=query.trim().toLowerCase();return state.students.filter(s=>(!status||String(s.status||'active').toLowerCase()===status)&&(!classId||s.class_id===classId)&&(!q||[s.roll_number,s.student_name,s.father_name,s.phone_number].join(' ').toLowerCase().includes(q)))
  }
};
