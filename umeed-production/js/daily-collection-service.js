import {MONTHS} from './config.js';

const n=v=>Number(v||0);
const active=x=>String(x.status||'active')!=='reversed';
function student(state,id){return state.students.find(s=>s.id===id)}
function cls(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}

export const DailyCollectionService={
  build(state,date){
    const rows=[];
    let feeCash=0,annualFund=0,syllabus=0,canteen=0,refunds=0;

    for(const r of (state.feeReceipts||[]).filter(x=>active(x)&&x.payment_date===date)){
      const s=student(state,r.student_id),lines=(state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id);
      const monthCash=lines.reduce((a,m)=>a+n(m.cash_paid),0);
      const annual=n(r.annual_fund_paid);feeCash+=monthCash;annualFund+=annual;
      const details=lines.map(m=>MONTHS[Number(m.fee_month)-1]+' '+m.fee_year).join(', ')+(annual?' + Annual Fund':'');
      rows.push({id:r.id,type:'Fee',receipt_no:r.receipt_no||'Pending Sync',student:s?.student_name||'-',guardian:s?.father_name||'-',roll:s?.roll_number||'-',class_name:cls(state,s?.class_id),amount:monthCash+annual,details,created_at:r.created_at});
    }

    // Legacy v3.0/v3.1 fee entries remain visible in historical collection.
    for(const e of (state.feeEntries||[]).filter(x=>active(x)&&x.payment_date===date)){
      const s=student(state,e.student_id),cash=n(e.cash_paid),annual=n(e.annual_fund_paid);feeCash+=cash;annualFund+=annual;
      rows.push({id:e.id,type:'Fee (Legacy)',receipt_no:e.receipt_no||'Pending Sync',student:s?.student_name||'-',guardian:s?.father_name||'-',roll:s?.roll_number||'-',class_name:cls(state,s?.class_id),amount:cash+annual,details:MONTHS[Number(e.fee_month)-1]+' '+e.fee_year+(annual?' + Annual Fund':''),created_at:e.created_at});
    }

    for(const r of (state.counterSales||[]).filter(x=>active(x)&&x.sale_date===date)){
      const s=student(state,r.student_id),amount=n(r.total),isCanteen=r.channel==='canteen';
      if(isCanteen)canteen+=amount;else syllabus+=amount;
      const items=(state.counterSaleItems||[]).filter(i=>i.sale_id===r.id).map(i=>i.item_name+' × '+i.quantity).join(', ');
      rows.push({id:r.id,type:isCanteen?'Canteen':'Syllabus',receipt_no:r.receipt_no||'Pending Sync',student:s?.student_name||'-',guardian:s?.father_name||'-',roll:s?.roll_number||'-',class_name:cls(state,s?.class_id),amount,details:items||'-',created_at:r.created_at});
    }

    for(const r of (state.refunds||[]).filter(x=>active(x)&&x.refund_date===date)){
      const s=student(state,r.student_id),amount=n(r.amount||r.refund_amount);refunds+=amount;
      rows.push({id:r.id,type:'Refund',receipt_no:'REFUND',student:s?.student_name||'-',guardian:s?.father_name||'-',roll:s?.roll_number||'-',class_name:cls(state,s?.class_id),amount:-amount,details:r.notes||'Refund',created_at:r.created_at});
    }

    rows.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const gross=feeCash+annualFund+syllabus+canteen,net=gross-refunds;
    return {date,feeCash,annualFund,syllabus,canteen,counterTotal:syllabus+canteen,refunds,gross,net,rows};
  }
};