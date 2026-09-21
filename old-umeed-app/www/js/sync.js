import {CONFIG} from './config.js';
import {now} from './storage.js';
const map={classes:'classes',students:'students',feeEntries:'fee_records',refunds:'refunds',feeSlips:'fee_slips',settings:'app_settings'};
function headers(state,extra={}){const key=state.settings.supabaseKey||CONFIG.supabaseKey;return {apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...extra}}
function base(state){return String(state.settings.supabaseUrl||CONFIG.supabaseUrl).replace(/\/$/,'')}
async function req(state,path,opt={}){const r=await fetch(base(state)+'/rest/v1/'+path,{...opt,headers:{...headers(state),...(opt.headers||{})}});const txt=await r.text();if(!r.ok)throw new Error(r.status+' '+txt.slice(0,400));return txt?JSON.parse(txt):[]}
export async function healthCheck(state){
  const tests=[];for(const t of ['classes','students','fee_records','refunds','fee_slips','app_settings']){try{await req(state,t+'?select=*&limit=1');tests.push({table:t,ok:true})}catch(e){tests.push({table:t,ok:false,error:e.message})}}return tests;
}
function toCloud(table,row,state){
  if(table==='students')return {id:row.id,roll_number:String(row.roll_number||''),student_name:row.student_name||'',father_name:row.father_name||'',class_id:row.class_id||null,phone_number:row.phone_number||'',admission_number:row.admission_number||'',status:row.status||'Active',created_at:row.created_at,updated_at:row.updated_at};
  if(table==='classes')return {id:row.id,class_name:row.class_name||'',section:row.section||'',status:row.status||'Active',created_at:row.created_at,updated_at:row.updated_at};
  if(table==='feeEntries')return {id:row.id,student_id:row.student_id,class_id:row.class_id,fee_month:row.fee_month,fee_year:+row.fee_year,fee_type:'Monthly Fee',total_amount:Number(row.monthly_fee||0)+Number(row.fine||0),paid_amount:Number(row.cash_paid||0),pending_amount:Number(row.monthly_pending||0),discount_amount:Number(row.discount||0),fine_amount:Number(row.fine||0),payment_status:row.monthly_status||'Unpaid',payment_date:row.payment_date||null,payment_method:row.payment_method||'Cash',remarks:JSON.stringify({annual_fund_paid:Number(row.annual_fund_paid||0),notes:row.notes||'',slip_no:row.slip_no||''}),created_at:row.created_at,updated_at:row.updated_at};
  if(table==='refunds')return {id:row.id,student_id:row.student_id,refund_amount:Number(row.refund_amount||0),refund_date:row.refund_date||null,reason:row.reason||'',created_at:row.created_at,updated_at:row.updated_at};
  if(table==='feeSlips')return {id:row.id,student_id:row.student_id,fee_record_id:row.fee_record_id||null,slip_number:row.slip_number,slip_date:row.slip_date,amount:Number(row.amount||0),remarks:row.remarks||'',created_at:row.created_at};
  if(table==='settings')return {id:'main',school_name:state.settings.schoolName,school_phone:state.settings.schoolPhone,school_address:state.settings.schoolAddress,default_currency:'Rs.',sync_mode:'manual',slip_paper_size:state.settings.paperSize,settings:state.settings,created_at:state.meta.createdAt||now(),updated_at:now()};
  return row;
}
export async function syncPending(state,onProgress=()=>{}){
  const pending=state.syncQueue.filter(x=>x.status==='pending');if(!pending.length)return {ok:true,count:0};let done=0;
  for(const q of pending){
    try{
      let row=q.table==='settings'?state.settings:(state[q.table]||[]).find(x=>x.id===q.recordId);
      if(!row){q.status='skipped';continue}
      const table=map[q.table];if(!table){q.status='skipped';continue}
      await req(state,table+'?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(toCloud(q.table,row,state))});
      q.status='synced';q.lastError='';q.syncedAt=now();done++;onProgress(done,pending.length);
    }catch(e){q.status='pending';q.lastError=e.message;throw e}
  }
  state.meta.lastSync=now();return {ok:true,count:done};
}
