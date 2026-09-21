import {computeStudentLedger} from './ledger-engine.js';

export const ReportsEngine={
  monthDefaulters(state,month,year,filters={}){
    return state.students.filter(s=>String(s.status||'active')!=='deleted').map(student=>{
      const ledger=computeStudentLedger(state,student.id,year),m=ledger?.monthly?.[Number(month)-1];
      return ledger&&m?{student,ledger,month:m}:null;
    }).filter(Boolean).filter(x=>x.month.pending>0).filter(x=>match(x.student,filters));
  },
  yearDefaulters(state,year,filters={}){
    return state.students.filter(s=>String(s.status||'active')!=='deleted').map(student=>({student,ledger:computeStudentLedger(state,student.id,year)})).filter(x=>x.ledger&&x.ledger.totalPending>0).filter(x=>match(x.student,filters));
  },
  refunds(state,year,filters={}){
    return state.refunds.filter(r=>String(r.status||'active')!=='deleted'&&Number(r.fee_year||new Date(r.refund_date).getFullYear())===Number(year)).map(refund=>({refund,student:state.students.find(s=>s.id===refund.student_id)})).filter(x=>x.student&&match(x.student,filters));
  },
  studentHistory(state,studentId,year){return computeStudentLedger(state,studentId,year)}
};
function match(student,{query='',classId=''}={}){
  if(classId&&student.class_id!==classId)return false;
  const q=String(query||'').trim().toLowerCase();return !q||[student.roll_number,student.student_name,student.father_name,student.phone_number].join(' ').toLowerCase().includes(q);
}
