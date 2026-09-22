import {normalizePakPhone} from './validation-service.js';
import {computeStudentLedger,money} from './ledger-engine.js';
import {MONTHS} from './config.js';

function baseStudent(state,studentId){const s=state.students.find(x=>x.id===studentId);if(!s)throw new Error('Student not found.');if(!s.phone_number)throw new Error('Phone number is missing for this student.');return s}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}
export const WhatsAppService={
  reminder(state,studentId,year,month=null){
    const s=baseStudent(state,studentId),l=computeStudentLedger(state,studentId,year),m=month?l.monthly[Number(month)-1]:null;
    const pendingMonths=l.monthly.filter(x=>x.pending>0).map(x=>x.name).join(', ');
    return ['Assalam o Alaikum,','','Dear Parent,','This is a fee reminder from '+(state.settings.school_name||'UMEED Education System')+'.','',
      'Student: '+s.student_name,'Roll No: '+s.roll_number,'Class: '+className(state,s.class_id),
      ...(m?['','Pending Month: '+m.name+' '+year,'Monthly Fee: '+money(m.baseFee),'Paid/Discount Adjusted: '+money(m.covered),'Pending Monthly Fee: '+money(m.pending)]:['','Pending Months: '+(pendingMonths||'None')]),
      '','Annual Fund Paid: '+money(l.annualPaid),'Annual Fund Pending: '+money(l.annualPending),'Total Pending: '+money(l.totalPending),
      '','Kindly clear the dues at your earliest convenience.','','Thank you,',state.settings.school_name||'UMEED Education System'].join('\n');
  },
  slip(state,row){
    const s=baseStudent(state,row.student_id),l=computeStudentLedger(state,s.id,row.fee_year),multi=(state.feeReceipts||[]).some(r=>r.id===row.id);
    if(multi){
      const lines=(state.feeReceiptMonths||[]).filter(m=>m.receipt_id===row.id),refund=state.refunds.find(r=>r.fee_receipt_id===row.id&&String(r.status||'active')!=='reversed');
      return [(state.settings.school_name||'UMEED Education System'),'Fee Receipt: '+(row.receipt_no||'PENDING SYNC'),'Date: '+row.payment_date,'Student: '+s.student_name,'Parent / Guardian: '+s.father_name,'Roll No: '+s.roll_number,'Class: '+className(state,s.class_id),'Months: '+(lines.map(m=>MONTHS[Number(m.fee_month)-1]).join(', ')||'Annual Fund only'),'Monthly Cash: '+money(lines.reduce((a,m)=>a+Number(m.cash_paid||0),0)),'Discount: '+money(lines.reduce((a,m)=>a+Number(m.discount||0),0)),'Fine: '+money(lines.reduce((a,m)=>a+Number(m.fine||0),0)),'Annual Fund Received: '+money(row.annual_fund_paid),'Refund: '+money(refund?.amount||0),'Annual Fund Pending: '+money(l.annualPending),'Total Pending: '+money(l.totalPending)].join('\n');
    }
    const m=l.monthly[Number(row.fee_month)-1];
    return [(state.settings.school_name||'UMEED Education System'),'Fee Receipt: '+(row.receipt_no||'PENDING SYNC'),'Date: '+row.payment_date,'Student: '+s.student_name,'Roll No: '+s.roll_number,'Class: '+className(state,s.class_id),'Month/Year: '+m.name+' '+row.fee_year,'Monthly Fee: '+money(row.monthly_fee||m.baseFee),'Cash Received: '+money(row.cash_paid),'Discount: '+money(row.discount),'Annual Fund Received: '+money(row.annual_fund_paid),'Total Pending: '+money(l.totalPending)].join('\n');
  },
  open(state,studentId,message){
    const s=baseStudent(state,studentId),phone=normalizePakPhone(s.phone_number);if(!phone)throw new Error('Invalid phone number.');
    const url='https://wa.me/'+encodeURIComponent(phone)+'?text='+encodeURIComponent(message);window.open(url,'_blank','noopener,noreferrer');return url;
  }
};