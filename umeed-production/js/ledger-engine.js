import {CONFIG,MONTHS} from './config.js';

const n=v=>Number(v||0);
const active=e=>String(e.status||'active').toLowerCase()!=='reversed'&&String(e.status||'active').toLowerCase()!=='deleted';

export function getClassMonthlyFee(state,classId,year=new Date().getFullYear()){
  const scheduled=(state.classFeeSchedule||[]).find(x=>x.class_id===classId&&Number(x.fee_year)===Number(year));
  if(scheduled)return n(scheduled.monthly_fee);
  const cls=state.classes.find(c=>c.id===classId);
  return n(cls?.default_monthly_fee??CONFIG.monthlyFee);
}

function receiptLinesForStudent(state,studentId,year){
  const headers=(state.feeReceipts||[]).filter(r=>r.student_id===studentId&&Number(r.fee_year)===Number(year)&&active(r));
  const headerMap=new Map(headers.map(r=>[r.id,r]));
  const lines=(state.feeReceiptMonths||[]).filter(m=>m.student_id===studentId&&Number(m.fee_year)===Number(year)&&headerMap.has(m.receipt_id)).map(m=>{
    const h=headerMap.get(m.receipt_id);
    return {...m,receipt_no:h.receipt_no,payment_date:h.payment_date,created_at:h.created_at,source_device:h.source_device,_receipt_id:h.id,_type:'fee_line'};
  });
  return {headers,lines};
}

export function computeStudentLedger(state,studentId,year=new Date().getFullYear()){
  const student=state.students.find(s=>s.id===studentId&&String(s.status||'active').toLowerCase()!=='deleted');
  if(!student)return null;

  const scheduledFee=getClassMonthlyFee(state,student.class_id,year);
  const legacy=(state.feeEntries||[]).filter(e=>e.student_id===studentId&&Number(e.fee_year)===Number(year)&&active(e)).map(e=>({...e,_type:'legacy_fee'}));
  const modern=receiptLinesForStudent(state,studentId,year);
  const monthlyRows=[...legacy,...modern.lines];
  const refunds=(state.refunds||[]).filter(r=>r.student_id===studentId&&Number(r.fee_year||new Date(r.refund_date||r.created_at).getFullYear())===Number(year)&&active(r));

  const monthly=MONTHS.map((name,i)=>{
    const month=i+1,rows=monthlyRows.filter(e=>Number(e.fee_month)===month);
    const fine=rows.reduce((a,r)=>a+n(r.fine),0);
    const cash=rows.reduce((a,r)=>a+n(r.cash_paid),0);
    const discount=rows.reduce((a,r)=>a+n(r.discount),0);
    const snap=rows.map(r=>n(r.monthly_fee)).filter(v=>v>0);
    const baseFee=snap.length?snap[0]:scheduledFee;
    const expected=baseFee+fine;
    const covered=cash+discount;
    const pending=Math.max(expected-covered,0);
    const status=pending<=0?'Clear':covered>0?'Partial':'Pending';
    return {month,name,rows,baseFee,expected,cash,discount,fine,covered,pending,status};
  });

  const annualExpected=n(state.settings?.annual_fund??CONFIG.annualFund);
  const legacyAnnual=legacy.reduce((a,r)=>a+n(r.annual_fund_paid),0);
  const modernAnnual=modern.headers.reduce((a,r)=>a+n(r.annual_fund_paid),0);
  const annualPaid=legacyAnnual+modernAnnual;
  const annualPending=Math.max(annualExpected-annualPaid,0);

  const totalMonthlyCash=monthly.reduce((a,m)=>a+m.cash,0);
  const totalDiscount=monthly.reduce((a,m)=>a+m.discount,0);
  const totalFine=monthly.reduce((a,m)=>a+m.fine,0);
  const monthlyPending=monthly.reduce((a,m)=>a+m.pending,0);
  const totalRefund=refunds.reduce((a,r)=>a+n(r.amount||r.refund_amount),0);
  const totalCash=totalMonthlyCash+annualPaid;
  const totalPending=monthlyPending+annualPending;

  const receiptTransactions=modern.headers.map(h=>{
    const lines=modern.lines.filter(l=>l.receipt_id===h.id);
    return {
      ...h,
      _type:'fee_receipt',
      cash_paid:lines.reduce((a,l)=>a+n(l.cash_paid),0),
      discount:lines.reduce((a,l)=>a+n(l.discount),0),
      fine:lines.reduce((a,l)=>a+n(l.fine),0),
      months:lines.map(l=>Number(l.fee_month)),
      month_labels:lines.map(l=>MONTHS[Number(l.fee_month)-1]).join(', ')
    };
  });

  const transactions=[
    ...legacy,
    ...receiptTransactions,
    ...refunds.map(r=>({...r,_type:'refund'}))
  ].sort((a,b)=>String(b.payment_date||b.refund_date||b.created_at).localeCompare(String(a.payment_date||a.refund_date||a.created_at)));

  return {
    student,year,classMonthlyFee:scheduledFee,annualExpected,monthly,annualPaid,annualPending,
    totalMonthlyCash,totalCash,totalDiscount,totalFine,totalRefund,monthlyPending,totalPending,
    netCash:totalCash-totalRefund,
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
