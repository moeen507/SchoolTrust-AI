import {normalizePakPhone} from './validation-service.js';
import {computeStudentLedger,money} from './ledger-engine.js';
import {MONTHS} from './config.js';

function baseStudent(state,studentId){
  const s=state.students.find(x=>x.id===studentId);
  if(!s)throw new Error('Student not found.');
  if(!s.phone_number)throw new Error('Phone / WhatsApp number is missing for this student.');
  return s;
}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}

export const WhatsAppService={
  reminder(state,studentId,year,month=null){
    const s=baseStudent(state,studentId),l=computeStudentLedger(state,studentId,year),m=month?l.monthly[Number(month)-1]:null;
    return [
      'Assalam o Alaikum,','',
      'Dear Parent / Guardian,',
      'This is a fee reminder from '+(state.settings.school_name||'UMEED Education System')+'.','',
      'Student: '+s.student_name,
      'Roll No: '+s.roll_number,
      'Class: '+className(state,s.class_id),
      ...(m?[
        '',
        'Pending Month: '+m.name+' '+year,
        'Monthly Fee: '+money(m.baseFee),
        'Paid/Discount Adjusted: '+money(m.covered),
        'Pending Monthly Fee: '+money(m.pending)
      ]:[]),
      '',
      'Annual Fund Paid: '+money(l.annualPaid),
      'Annual Fund Pending: '+money(l.annualPending),
      'Total Pending: '+money(l.totalPending),
      '',
      'Kindly clear the dues at your earliest convenience.','',
      'Thank you,',
      state.settings.school_name||'UMEED Education System'
    ].join('\n');
  },

  slip(state,fee){
    const stored=(state.feeReceipts||[]).find(r=>r.id===fee.id);
    const modern=stored?{...stored,_kind:'receipt'}:(fee?._kind==='receipt'?fee:null);

    if(modern){
      const s=baseStudent(state,modern.student_id);
      const l=computeStudentLedger(state,s.id,modern.fee_year);
      const lines=(state.feeReceiptMonths||[]).filter(m=>m.receipt_id===modern.id).sort((a,b)=>Number(a.fee_month)-Number(b.fee_month));
      const refund=(state.refunds||[]).find(r=>r.fee_receipt_id===modern.id&&String(r.status||'active')!=='reversed');
      const cash=lines.reduce((a,x)=>a+Number(x.cash_paid||0),0);
      const discount=lines.reduce((a,x)=>a+Number(x.discount||0),0);
      const fine=lines.reduce((a,x)=>a+Number(x.fine||0),0);
      const monthText=lines.length?lines.map(x=>MONTHS[Number(x.fee_month)-1]+' '+x.fee_year).join(', '):'Annual Fund only';

      return [
        state.settings.school_name||'UMEED Education System',
        'Fee Receipt: '+(modern.receipt_no||'PENDING SYNC'),
        'Date: '+modern.payment_date,
        'Student: '+s.student_name,
        'Parent / Guardian: '+s.father_name,
        'Roll No: '+s.roll_number,
        'Class: '+className(state,s.class_id),
        'Month(s): '+monthText,
        'Monthly Cash: '+money(cash),
        'Discount: '+money(discount),
        'Fine: '+money(fine),
        'Annual Fund Received: '+money(modern.annual_fund_paid),
        'Refund: '+money(refund?.amount||0),
        'Annual Fund Pending: '+money(l.annualPending),
        'Total Pending: '+money(l.totalPending)
      ].join('\n');
    }

    const s=baseStudent(state,fee.student_id);
    const l=computeStudentLedger(state,s.id,fee.fee_year);
    const m=l.monthly[Number(fee.fee_month)-1];
    const refund=(state.refunds||[]).find(r=>r.fee_entry_id===fee.id&&String(r.status||'active')!=='reversed');

    return [
      state.settings.school_name||'UMEED Education System',
      'Fee Receipt: '+(fee.receipt_no||'PENDING SYNC'),
      'Date: '+fee.payment_date,
      'Student: '+s.student_name,
      'Parent / Guardian: '+s.father_name,
      'Roll No: '+s.roll_number,
      'Class: '+className(state,s.class_id),
      'Month/Year: '+m.name+' '+fee.fee_year,
      'Monthly Fee: '+money(fee.monthly_fee||m.baseFee),
      'Cash Received: '+money(fee.cash_paid),
      'Discount: '+money(fee.discount),
      'Fine: '+money(fee.fine),
      'Annual Fund Received: '+money(fee.annual_fund_paid),
      'Refund: '+money(refund?.amount||0),
      'Total Pending: '+money(l.totalPending)
    ].join('\n');
  },

  open(state,studentId,message){
    const s=baseStudent(state,studentId),phone=normalizePakPhone(s.phone_number);
    if(!phone)throw new Error('Invalid phone number.');
    const url='https://wa.me/'+encodeURIComponent(phone)+'?text='+encodeURIComponent(message);
    window.open(url,'_blank','noopener,noreferrer');
    return url;
  }
};