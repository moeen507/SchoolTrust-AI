import {ValidationService} from './validation-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {StudentAccountService} from './student-account-service.js';

const iso=()=>new Date().toISOString(),id=()=>crypto.randomUUID();

function normalize(input){return {
  id:input.id||id(),roll_number:String(input.roll_number||'').trim(),student_name:String(input.student_name||'').trim(),
  father_name:String(input.father_name||'').trim(),class_id:input.class_id,phone_number:String(input.phone_number||'').trim(),
  status:input.status||'active',created_at:input.created_at||iso(),updated_at:iso(),source_device:input.source_device||'client'
}}
function duplicate(state,row,ignoreId=null,extra=[]){
  const roll=String(row.roll_number).toLowerCase(),name=String(row.student_name).toLowerCase(),guardian=String(row.father_name).toLowerCase();
  return [...state.students,...extra].find(s=>s.id!==ignoreId&&String(s.status||'active').toLowerCase()!=='deleted'&&(
    String(s.roll_number).toLowerCase()===roll||(s.class_id===row.class_id&&String(s.student_name).toLowerCase()===name&&String(s.father_name).toLowerCase()===guardian)
  ));
}
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}

export const StudentService={
  newId:id,
  findDuplicate:duplicate,
  async createAutoRoll(state,input){
    if(!navigator.onLine)throw new Error('Internet connection is required to allocate a new official roll number and student login.');
    if(!SupabaseSyncService.profile)throw new Error('UMEED profile is not loaded.');
    const row={roll_number:String(state.settings.next_student_roll_no||1),student_name:String(input.student_name||'').trim(),father_name:String(input.father_name||'').trim(),class_id:input.class_id,phone_number:String(input.phone_number||'').trim()};
    ValidationService.student(row);
    const result=await SupabaseSyncService.rpc('create_student_auto_roll',{
      p_id:id(),p_student_name:row.student_name,p_guardian_name:row.father_name,p_class_id:row.class_id,p_phone_number:row.phone_number,p_source_device:input.source_device||navigator.userAgent.slice(0,180)
    });
    const saved=Array.isArray(result)?result[0]:result;if(!saved)throw new Error('Student could not be created.');
    state.students=state.students.filter(s=>s.id!==saved.id);state.students.push(saved);
    state.settings.next_student_roll_no=Math.max(Number(state.settings.next_student_roll_no||1),Number(saved.roll_number||0)+1);
    let credentials=[];try{credentials=await StudentAccountService.provision(saved.id)}catch(e){return {row:saved,queued:false,credentials:[],account_warning:e.message}}
    return {row:saved,queued:false,credentials};
  },
  async update(state,input){
    const current=state.students.find(s=>s.id===input.id);if(!current)throw new Error('Student not found.');
    const row=normalize({...input,roll_number:current.roll_number});ValidationService.student(row);
    const dup=duplicate(state,row,row.id);if(dup)throw new Error('Duplicate student detected.');
    const idx=state.students.findIndex(s=>s.id===row.id);state.students[idx]=row;
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{const saved=await SupabaseSyncService.upsert('students',row);if(saved?.[0])state.students[idx]=saved[0];return {row:saved?.[0]||row,queued:false}}
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
    if(!accepted.length)return {accepted:[],skipped,queued:0,credentials:[]};
    if(!navigator.onLine)throw new Error('Student import requires internet so roll/account allocation stays centralized.');
    const saved=await SupabaseSyncService.upsertMany('students',accepted);
    for(const row of saved||[]){state.students=state.students.filter(s=>s.id!==row.id);state.students.push(row)}
    const next=await SupabaseSyncService.rpc('reconcile_student_roll_counter',{});
    state.settings.next_student_roll_no=Number(Array.isArray(next)?next[0]:next||state.settings.next_student_roll_no);

    const rows=saved||accepted,credentials=[];
    for(let i=0;i<rows.length;i+=50){
      const batch=rows.slice(i,i+50).map(r=>r.id);
      const creds=await StudentAccountService.provisionBatch(batch);
      credentials.push(...creds);
    }
    return {accepted:rows,skipped,queued:0,credentials};
  },
  async softDelete(state,studentId){
    const row=state.students.find(s=>s.id===studentId);if(!row)throw new Error('Student not found.');
    row.status='deleted';row.updated_at=iso();
    if(navigator.onLine&&SupabaseSyncService.profile){
      const saved=await SupabaseSyncService.upsert('students',row);if(saved?.[0])Object.assign(row,saved[0]);return {queued:false}
    }
    throw new Error('Student deletion requires internet so authorization can be verified.');
  },
  filter(state,{query='',classId='',status='active'}={}){
    const q=query.trim().toLowerCase();return state.students.filter(s=>(!status||String(s.status||'active').toLowerCase()===status)&&(!classId||s.class_id===classId)&&(!q||[s.roll_number,s.student_name,s.father_name,s.phone_number].join(' ').toLowerCase().includes(q)))
  }
};