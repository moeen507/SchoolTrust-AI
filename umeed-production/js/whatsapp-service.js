import {normalizePakPhone} from './validation-service.js';
import {computeStudentLedger,money} from './ledger-engine.js';

function baseStudent(state,studentId){const s=state.students.find(x=>x.id===studentId);if(!s)throw new Error('Student not found.');if(!s.phone_number)throw new Error('Phone number is missing for this student.');return s}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}
export const WhatsAppService={
  reminder(state,studentId,year,month=null){
    const s=baseStudent(state,studentId),l=computeStudentLedger(state,studentId,year),m=month?l.monthly[Number(month)-1]:null;
    return ['Assalam o Alaikum,','','Dear Parent,','This is a fee reminder from '+(state.settings.school_name||'UMEED Education System')+'.','',
      'Student: '+s.student_name,'Roll No: '+s.roll_number,'Class: '+className(state,s.class_id),
      ...(m?['','Pending Month: '+m.name+' '+year,'Monthly Fee: '+money(m.baseFee),'Paid/Discount Adjusted: '+money(m.covered),'Pending Monthly Fee: '+money(m.pending)]:[]),
      '','Annual Fund Paid: '+money(l.annualPaid),'Annual Fund Pending: '+money(l.annualPending),'Total Pending: '+money(l.totalPending),
      '','Kindly clear the dues at your earliest convenience.','','Thank you,',state.settings.school_name||'UMEED Education System'].join('\n');
  },
  slip(state,fee){
    const s=baseStudent(state,fee.student_id),l=computeStudentLedger(state,s.id,fee.fee_year),m=l.monthly[Number(fee.fee_month)-1],refund=state.refunds.find(r=>r.fee_entry_id===fee.id&&String(r.status||'active')!=='reversed');
    return [(state.settings.school_name||'UMEED Education System'),'Fee Receipt: '+(fee.receipt_no||'PENDING SYNC'),'Date: '+fee.payment_date,'Student: '+s.student_name,'Father: '+s.father_name,'Roll No: '+s.roll_number,'Class: '+className(state,s.class_id),'Month/Year: '+m.name+' '+fee.fee_year,'Monthly Fee: '+money(fee.monthly_fee||m.baseFee),'Cash Received: '+money(fee.cash_paid),'Discount: '+money(fee.discount),'Fine: '+money(fee.fine),'Annual Fund Received: '+money(fee.annual_fund_paid),'Refund: '+money(refund?.amount||refund?.refund_amount||0),'Monthly Fee Status: '+m.status,'Annual Fund Status: '+(l.annualPending===0?'Clear':'Pending '+money(l.annualPending)),'Total Pending: '+money(l.totalPending)].join('\n');
  },
  open(state,studentId,message){
    const s=baseStudent(state,studentId),phone=normalizePakPhone(s.phone_number);if(!phone)throw new Error('Invalid phone number.');
    const url='https://wa.me/'+encodeURIComponent(phone)+'?text='+encodeURIComponent(message);window.open(url,'_blank','noopener,noreferrer');return url;
  }
};