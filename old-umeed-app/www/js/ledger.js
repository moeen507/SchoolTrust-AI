import {MONTHS} from './config.js';
export const money=v=>'Rs. '+Number(v||0).toLocaleString('en-PK',{maximumFractionDigits:0});
export function studentById(state,id){return state.students.find(s=>s.id===id&&s.status!=='Deleted')}
export function classById(state,id){const c=state.classes.find(x=>x.id===id);return c?[c.class_name,c.section].filter(Boolean).join(' - '):'Unassigned'}
export function entriesFor(state,studentId,year=null){
  return state.feeEntries.filter(e=>e.student_id===studentId&&e.status!=='Deleted'&&(!year||+e.fee_year===+year));
}
export function refundsFor(state,studentId,year=null){
  return state.refunds.filter(r=>r.student_id===studentId&&r.status!=='Deleted'&&(!year||new Date(r.refund_date||r.created_at).getFullYear()===+year));
}
export function computeMonth(state,studentId,month,year){
  const base=Number(state.settings.monthlyFee||2000);
  const rows=entriesFor(state,studentId,year).filter(e=>e.fee_month===month);
  const cash=rows.reduce((a,r)=>a+Number(r.cash_paid||0),0);
  const discount=rows.reduce((a,r)=>a+Number(r.discount||0),0);
  const fine=rows.reduce((a,r)=>a+Number(r.fine||0),0);
  const expected=base+fine;
  const covered=cash+discount;
  const pending=Math.max(expected-covered,0);
  const status=pending<=0?'Paid':covered>0?'Partial':'Unpaid';
  return {month,year,base,fine,cash,discount,covered,pending,status,rows};
}
export function computeStudentLedger(state,studentId,year=new Date().getFullYear()){
  const s=studentById(state,studentId);if(!s)return null;
  const months=MONTHS.map(m=>computeMonth(state,studentId,m,year));
  const allYearEntries=entriesFor(state,studentId,year);
  const annualTarget=Number(state.settings.annualFund||2150);
  const annualPaid=allYearEntries.reduce((a,r)=>a+Number(r.annual_fund_paid||0),0);
  const annualPending=Math.max(annualTarget-annualPaid,0);
  const refunds=refundsFor(state,studentId,year);
  const totalRefund=refunds.reduce((a,r)=>a+Number(r.refund_amount||0),0);
  const totalCash=months.reduce((a,m)=>a+m.cash,0);
  const totalDiscount=months.reduce((a,m)=>a+m.discount,0);
  const totalFine=months.reduce((a,m)=>a+m.fine,0);
  const monthlyPending=months.reduce((a,m)=>a+m.pending,0);
  const totalPending=monthlyPending+annualPending;
  const transactions=[...allYearEntries.map(e=>({...e,_kind:'fee'})),...refunds.map(r=>({...r,_kind:'refund'}))].sort((a,b)=>String(b.payment_date||b.refund_date||b.created_at).localeCompare(String(a.payment_date||a.refund_date||a.created_at)));
  return {student:s,year,months,annualTarget,annualPaid,annualPending,refunds,totalRefund,totalCash,totalDiscount,totalFine,monthlyPending,totalPending,paidMonths:months.filter(m=>m.status==='Paid').length,partialMonths:months.filter(m=>m.status==='Partial').length,pendingMonths:months.filter(m=>m.status!=='Paid').length,transactions};
}
export function dashboardMetrics(state,year=new Date().getFullYear()){
  const ledgers=state.students.filter(s=>s.status!=='Deleted').map(s=>computeStudentLedger(state,s.id,year)).filter(Boolean);
  const allEntries=state.feeEntries.filter(e=>e.status!=='Deleted');
  return {
    students:ledgers.length,
    cash:allEntries.reduce((a,e)=>a+Number(e.cash_paid||0)+Number(e.annual_fund_paid||0),0),
    discount:allEntries.reduce((a,e)=>a+Number(e.discount||0),0),
    annual:allEntries.reduce((a,e)=>a+Number(e.annual_fund_paid||0),0),
    pending:ledgers.reduce((a,l)=>a+l.totalPending,0),
    defaulters:ledgers.filter(l=>l.totalPending>0).length,
    refunds:state.refunds.filter(r=>r.status!=='Deleted').reduce((a,r)=>a+Number(r.refund_amount||0),0),
    ledgers
  };
}
export function nextSlipNumber(state){const n=Number(state.settings.currentSlipNumber||25001);return String(state.settings.slipPrefix||'UES')+'-'+n}
export function normalizePakPhone(v){
  const d=String(v||'').replace(/\D/g,'');
  if(!d)return '';
  if(d.startsWith('92'))return d;
  if(d.startsWith('0'))return '92'+d.slice(1);
  if(d.length===10&&d.startsWith('3'))return '92'+d;
  return d;
}
