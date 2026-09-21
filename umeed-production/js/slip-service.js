import {computeStudentLedger,money} from './ledger-engine.js';
import {MONTHS} from './config.js';

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}
export const SlipService={
  latest(state){return [...state.feeEntries].filter(e=>String(e.status||'active')!=='reversed').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0]||null},
  find(state,receipt){const q=String(receipt||'').trim().toLowerCase();return state.feeEntries.find(e=>String(e.receipt_no||'').toLowerCase()===q)||null},
  render(state,fee){
    if(!fee)return '<div class="empty-state">No slip selected.</div>';
    const s=state.students.find(x=>x.id===fee.student_id);if(!s)return '<div class="empty-state">Student record not found.</div>';
    const ledger=computeStudentLedger(state,s.id,fee.fee_year),month=ledger.monthly[Number(fee.fee_month)-1],pendingOfficial=!fee.receipt_no;
    const relatedRefund=state.refunds.find(r=>r.fee_entry_id===fee.id&&String(r.status||'active')!=='reversed');
    const beforeState={...state,feeEntries:state.feeEntries.filter(e=>e.id!==fee.id),refunds:state.refunds.filter(r=>r.fee_entry_id!==fee.id)};
    const before=computeStudentLedger(beforeState,s.id,fee.fee_year),previousBalance=before?.totalPending??ledger.totalPending;
    return '<article class="a5-slip" id="print-slip">'+
      '<header><img src="assets/logo.svg" alt="" width="54"><h2>'+esc(state.settings.school_name||'UMEED Education System')+'</h2><div>OFFICIAL FEE RECEIPT</div>'+(pendingOfficial?'<strong style="color:#b10515">PENDING CLOUD SYNC — NOT AN OFFICIAL RECEIPT NUMBER</strong>':'')+'</header>'+
      '<div class="slip-grid">'+
      row('Receipt',fee.receipt_no||'Pending Sync')+row('Date',fee.payment_date)+row('Student',s.student_name)+row('Father',s.father_name)+row('Roll No',s.roll_number)+row('Class',className(state,s.class_id))+row('Phone',s.phone_number||'-')+row('Month / Year',MONTHS[Number(fee.fee_month)-1]+' '+fee.fee_year)+'</div>'+
      '<div style="margin-top:12px;border:1px solid #bbb;padding:8px">'+
      line('Monthly Fee',money(fee.monthly_fee||month.baseFee))+line('Discount / Concession',money(fee.discount))+line('Fine',money(fee.fine))+line('Cash Received',money(fee.cash_paid))+line('Annual Fund Received',money(fee.annual_fund_paid))+line('Refund',money(relatedRefund?.amount||relatedRefund?.refund_amount||0))+line('Previous Balance',money(previousBalance))+line('Current Monthly Balance',money(month.pending))+line('Annual Fund Paid',money(ledger.annualPaid))+line('Annual Fund Pending',money(ledger.annualPending))+line('Total Pending',money(ledger.totalPending),true)+'</div>'+
      '<div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px"><span>Prepared by: '+esc(state.settings.prepared_by||'Admin/Cashier')+'</span><span>Signature: __________________</span></div></article>';
  }
};
function row(label,value){return '<div class="slip-row"><b>'+esc(label)+':</b> '+esc(value)+'</div>'}
function line(label,value,bold=false){return '<div class="slip-row"><span>'+esc(label)+'</span><'+(bold?'strong':'b')+' style="float:right">'+esc(value)+'</'+(bold?'strong':'b')+'></div>'}