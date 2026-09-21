import {computeStudentLedger,money} from './ledger-engine.js';
import {MONTHS} from './config.js';

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}
function active(x){return String(x.status||'active')!=='reversed'}
function tagged(row,kind){return row?{...row,_kind:kind}:null}

export const SlipService={
  latest(state){
    const rows=[
      ...(state.feeReceipts||[]).filter(active).map(r=>tagged(r,'receipt')),
      ...(state.feeEntries||[]).filter(active).map(r=>tagged(r,'legacy'))
    ];
    return rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0]||null;
  },
  byId(state,id){
    const modern=(state.feeReceipts||[]).find(r=>r.id===id);if(modern)return tagged(modern,'receipt');
    const legacy=(state.feeEntries||[]).find(r=>r.id===id);return legacy?tagged(legacy,'legacy'):null;
  },
  find(state,receipt){
    const q=String(receipt||'').trim().toLowerCase();
    const modern=(state.feeReceipts||[]).find(r=>String(r.receipt_no||'').toLowerCase()===q);if(modern)return tagged(modern,'receipt');
    const legacy=(state.feeEntries||[]).find(r=>String(r.receipt_no||'').toLowerCase()===q);return legacy?tagged(legacy,'legacy'):null;
  },
  lines(state,receiptId){return (state.feeReceiptMonths||[]).filter(m=>m.receipt_id===receiptId).sort((a,b)=>Number(a.fee_month)-Number(b.fee_month))},
  render(state,fee){
    if(!fee)return '<div class="empty-state">No slip selected.</div>';
    if(fee._kind==='receipt'||(state.feeReceipts||[]).some(r=>r.id===fee.id))return renderReceipt(state,fee);
    return renderLegacy(state,fee);
  }
};

function renderReceipt(state,receipt){
  const s=state.students.find(x=>x.id===receipt.student_id);if(!s)return '<div class="empty-state">Student record not found.</div>';
  const lines=SlipService.lines(state,receipt.id),ledger=computeStudentLedger(state,s.id,receipt.fee_year),pendingOfficial=!receipt.receipt_no;
  const relatedRefund=(state.refunds||[]).find(r=>r.fee_receipt_id===receipt.id&&active(r));
  const beforeState={...state,feeReceipts:(state.feeReceipts||[]).filter(r=>r.id!==receipt.id),feeReceiptMonths:(state.feeReceiptMonths||[]).filter(m=>m.receipt_id!==receipt.id),refunds:(state.refunds||[]).filter(r=>r.fee_receipt_id!==receipt.id)};
  const before=computeStudentLedger(beforeState,s.id,receipt.fee_year);
  const cash=lines.reduce((a,l)=>a+Number(l.cash_paid||0),0),discount=lines.reduce((a,l)=>a+Number(l.discount||0),0),fine=lines.reduce((a,l)=>a+Number(l.fine||0),0);
  return '<article class="a5-slip" id="print-slip">'+
    '<header><img src="assets/logo.svg" alt="" width="54"><h2>'+esc(state.settings.school_name||'UMEED Education System')+'</h2><div>OFFICIAL FEE RECEIPT</div>'+(pendingOfficial?'<strong style="color:#b10515">PENDING CLOUD SYNC — NOT AN OFFICIAL RECEIPT NUMBER</strong>':'')+'</header>'+
    '<div class="slip-grid">'+row('Receipt',receipt.receipt_no||'Pending Sync')+row('Date',receipt.payment_date)+row('Student',s.student_name)+row('Parent / Guardian',s.father_name)+row('Roll No',s.roll_number)+row('Class',className(state,s.class_id))+row('Phone / WhatsApp',s.phone_number||'-')+row('Fee Year',receipt.fee_year)+'</div>'+
    '<div class="table-outer" style="margin-top:12px"><table style="min-width:0;color:#111"><thead><tr><th>Month</th><th>Fee</th><th>Cash</th><th>Discount</th><th>Fine</th></tr></thead><tbody>'+
    (lines.length?lines.map(l=>'<tr><td>'+esc(MONTHS[Number(l.fee_month)-1])+'</td><td>'+money(l.monthly_fee)+'</td><td>'+money(l.cash_paid)+'</td><td>'+money(l.discount)+'</td><td>'+money(l.fine)+'</td></tr>').join(''):'<tr><td colspan="5">Annual Fund / adjustment only</td></tr>')+
    '</tbody></table></div>'+
    '<div style="margin-top:12px;border:1px solid #bbb;padding:8px">'+
    line('Monthly Cash Received',money(cash))+line('Discount / Concession',money(discount))+line('Fine',money(fine))+line('Annual Fund Received',money(receipt.annual_fund_paid))+line('Refund',money(relatedRefund?.amount||0))+line('Previous Total Pending',money(before?.totalPending||0))+line('Annual Fund Paid',money(ledger.annualPaid))+line('Annual Fund Pending',money(ledger.annualPending))+line('Current Total Pending',money(ledger.totalPending),true)+line('Receipt Cash Total',money(cash+Number(receipt.annual_fund_paid||0)),true)+'</div>'+
    (receipt.notes?'<div style="font-size:10px;margin-top:8px"><b>Notes:</b> '+esc(receipt.notes)+'</div>':'')+
    '<div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px"><span>Prepared by: '+esc(state.settings.prepared_by||'Admin/Cashier')+'</span><span>Signature: __________________</span></div></article>';
}
function renderLegacy(state,fee){
  const s=state.students.find(x=>x.id===fee.student_id);if(!s)return '<div class="empty-state">Student record not found.</div>';
  const ledger=computeStudentLedger(state,s.id,fee.fee_year),month=ledger.monthly[Number(fee.fee_month)-1],pendingOfficial=!fee.receipt_no;
  const relatedRefund=(state.refunds||[]).find(r=>r.fee_entry_id===fee.id&&active(r));
  return '<article class="a5-slip" id="print-slip"><header><img src="assets/logo.svg" alt="" width="54"><h2>'+esc(state.settings.school_name||'UMEED Education System')+'</h2><div>OFFICIAL FEE RECEIPT</div>'+(pendingOfficial?'<strong style="color:#b10515">PENDING CLOUD SYNC</strong>':'')+'</header><div class="slip-grid">'+row('Receipt',fee.receipt_no||'Pending Sync')+row('Date',fee.payment_date)+row('Student',s.student_name)+row('Parent / Guardian',s.father_name)+row('Roll No',s.roll_number)+row('Class',className(state,s.class_id))+row('Phone / WhatsApp',s.phone_number||'-')+row('Month / Year',MONTHS[Number(fee.fee_month)-1]+' '+fee.fee_year)+'</div><div style="margin-top:12px;border:1px solid #bbb;padding:8px">'+line('Monthly Fee',money(fee.monthly_fee||month.baseFee))+line('Cash Received',money(fee.cash_paid))+line('Discount',money(fee.discount))+line('Fine',money(fee.fine))+line('Annual Fund Received',money(fee.annual_fund_paid))+line('Refund',money(relatedRefund?.amount||0))+line('Total Pending',money(ledger.totalPending),true)+'</div><div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px"><span>Prepared by: '+esc(state.settings.prepared_by||'Admin/Cashier')+'</span><span>Signature: __________________</span></div></article>';
}
function row(label,value){return '<div class="slip-row"><b>'+esc(label)+':</b> '+esc(value)+'</div>'}
function line(label,value,bold=false){return '<div class="slip-row"><span>'+esc(label)+'</span><'+(bold?'strong':'b')+' style="float:right">'+esc(value)+'</'+(bold?'strong':'b')+'></div>'}