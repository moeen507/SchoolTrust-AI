import {CONFIG,MONTHS} from './config.js';

const n=v=>Number(v||0);
const active=e=>String(e.status||'active').toLowerCase()!=='reversed'&&String(e.status||'active').toLowerCase()!=='deleted';

export function getClassMonthlyFee(state,classId,year=new Date().getFullYear()){
  const scheduled=(state.classFeeSchedule||[]).find(x=>x.class_id===classId&&Number(x.fee_year)===Number(year));
  if(scheduled)return n(scheduled.monthly_fee);
  const cls=state.classes.find(c=>c.id===classId);
  return n(cls?.default_monthly_fee??CONFIG.monthlyFee);
}

export function computeStudentLedger(state,studentId,year=new Date().getFullYear()){
  const student=state.students.find(s=>s.id===studentId&&String(s.status||'active').toLowerCase()!=='deleted');
  if(!student)return null;
  const scheduledFee=getClassMonthlyFee(state,student.class_id,year);
  const entries=state.feeEntries.filter(e=>e.student_id===studentId&&Number(e.fee_year)===Number(year)&&active(e));
  const refunds=state.refunds.filter(r=>r.student_id===studentId&&Number(r.fee_year||new Date(r.refund_date||r.created_at).getFullYear())===Number(year)&&active(r));
  const monthly=MONTHS.map((name,i)=>{
    const month=i+1,rows=entries.filter(e=>Number(e.fee_month)===month);
    const fine=rows.reduce((a,r)=>a+n(r.fine),0);
    const cash=rows.reduce((a,r)=>a+n(r.cash_paid),0);
    const discount=rows.reduce((a,r)=>a+n(r.discount),0);
    const baseFee=rows.length?n(rows[0].monthly_fee??scheduledFee):scheduledFee;
    const expected=baseFee+fine;
    const covered=cash+discount;
    const pending=Math.max(expected-covered,0);
    const status=pending<=0?'Clear':covered>0?'Partial':'Pending';
    return {month,name,rows,baseFee,expected,cash,discount,fine,covered,pending,status};
  });
  const annualExpected=n(state.settings?.annual_fund??CONFIG.annualFund);
  const annualPaid=entries.reduce((a,r)=>a+n(r.annual_fund_paid),0);
  const annualPending=Math.max(annualExpected-annualPaid,0);
  const totalMonthlyCash=monthly.reduce((a,m)=>a+m.cash,0);
  const totalDiscount=monthly.reduce((a,m)=>a+m.discount,0);
  const totalFine=monthly.reduce((a,m)=>a+m.fine,0);
  const monthlyPending=monthly.reduce((a,m)=>a+m.pending,0);
  const totalRefund=refunds.reduce((a,r)=>a+n(r.amount||r.refund_amount),0);
  const totalCash=totalMonthlyCash+annualPaid;
  const totalPending=monthlyPending+annualPending;
  const transactions=[
    ...entries.map(e=>({...e,_type:'fee'})),
    ...refunds.map(r=>({...r,_type:'refund'}))
  ].sort((a,b)=>String(b.payment_date||b.refund_date||b.created_at).localeCompare(String(a.payment_date||a.refund_date||a.created_at)));
  return {
    student,year,classMonthlyFee:scheduledFee,annualExpected,monthly,annualPaid,annualPending,totalMonthlyCash,totalCash,totalDiscount,totalFine,totalRefund,
    monthlyPending,totalPending,netCash:totalCash-totalRefund,
    paidMonths:monthly.filter(m=>m.status==='Clear').length,
    partialMonths:monthly.filter(m=>m.status==='Partial').length,
    pendingMonths:monthly.filter(m=>m.status==='Pending').length,
    discountedMonths:monthly.filter(m=>m.discount>0).length,
    transactions
  };
}
export function computeDashboard(state,year=new Date().getFullYear()){
  const ledgers=state.students.filter(s=>String(s.status||'active').toLowerCase()!=='deleted').map(s=>computeStudentLedger(state,s.id,year)).filter(Boolean);
  const liveSales=(state.counterSales||[]).filter(s=>String(s.status||'active')!=='reversed');
  const syllabusSales=liveSales.filter(s=>s.channel==='store').reduce((a,s)=>a+n(s.total),0);
  const canteenSales=liveSales.filter(s=>s.channel==='canteen').reduce((a,s)=>a+n(s.total),0);
  const feeCash=ledgers.reduce((a,l)=>a+l.totalCash,0);
  return {
    students:ledgers.length,totalCash:feeCash,totalDiscount:ledgers.reduce((a,l)=>a+l.totalDiscount,0),
    totalAnnualFund:ledgers.reduce((a,l)=>a+l.annualPaid,0),totalPending:ledgers.reduce((a,l)=>a+l.totalPending,0),
    totalRefunds:ledgers.reduce((a,l)=>a+l.totalRefund,0),totalDefaulters:ledgers.filter(l=>l.totalPending>0).length,
    syllabusSales,canteenSales,counterSales:syllabusSales+canteenSales,overallCollected:feeCash+syllabusSales+canteenSales,ledgers
  };
}
export function monthStatus(state,studentId,month,year){return computeStudentLedger(state,studentId,year)?.monthly?.[Number(month)-1]||null}
export function money(v){return 'Rs. '+Number(v||0).toLocaleString('en-PK',{maximumFractionDigits:0})}