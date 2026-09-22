import {computeStudentLedger,money} from './ledger-engine.js';
import {MONTHS} from './config.js';

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function className(state,id){return state.classes.find(c=>c.id===id)?.class_name||'-'}
function isReceipt(state,row){return (state.feeReceipts||[]).some(r=>r.id===row?.id)}
function created(row){return String(row?.created_at||row?.payment_date||'')}
export const SlipService={
  latest(state){
    const all=[...(state.feeReceipts||[]).filter(r=>String(r.status||'active')!=='reversed'),...(state.feeEntries||[]).filter(e=>String(e.status||'active')!=='reversed')];
    return all.sort((a,b)=>created(b).localeCompare(created(a)))[0]||null;
  },
  find(state,receipt){
    const q=String(receipt||'').trim().toLowerCase();
    return [...(state.feeReceipts||[]),...(state.feeEntries||[])].find(e=>String(e.receipt_no||'').toLowerCase()===q)||null;
  },
  render(state,row){
    if(!row)return '<div class="empty-state">No slip selected.</div>';
    const s=state.students.find(x=>x.id===row.student_id);if(!s)return '<div class="empty-state">Student record not found.</div>';
    const multi=isReceipt(state,row),ledger=computeStudentLedger(state,s.id,row.fee_year),pendingOfficial=!row.receipt_no;
    if(multi){
      const lines=(state.feeReceiptMonths||[]).filter(m=>m.receipt_id===row.id).sort((a,b)=>Number(a.fee_month)-Number(b.fee_month));
      const refund=state.refunds.find(r=>r.fee_receipt_id===row.id&&String(r.status||'active')!=='reversed');
      const monthCash=lines.reduce((a,m)=>a+Number(m.cash_paid||0),0);
      const discount=lines.reduce((a,m)=>a+Number(m.discount||0),0);
      const fine=lines.reduce((a,m)=>a+Number(m.fine||0),0);
      return '<article class="a5-slip" id="print-slip"><header><img src="assets/logo.svg" alt="" width="54"><h2>'+esc(state.settings.school_name||'UMEED Education System')+'</h2><div>OFFICIAL FEE RECEIPT</div>'+(pendingOfficial?'<strong style="color:#b10515">PENDING CLOUD SYNC — NOT AN OFFICIAL RECEIPT NUMBER</strong>':'')+'</header>'+
        '<div class="slip-grid">'+rowHtml('Receipt',row.receipt_no||'Pending Sync')+rowHtml('Date',row.payment_date)+rowHtml('Student',s.student_name)+rowHtml('Parent / Guardian',s.father_name)+rowHtml('Roll No',s.roll_number)+rowHtml('Class',className(state,s.class_id))+rowHtml('Phone',s.phone_number||'-')+rowHtml('Year',row.fee_year)+'</div>'+
        '<div class="table-outer counter-slip-table" style="margin-top:12px"><table style="min-width:0;color:#111"><thead><tr><th>Month</th><th>Fee</th><th>Cash</th><th>Discount</th><th>Fine</th></tr></thead><tbody>'+lines.map(m=>'<tr><td>'+esc(MONTHS[Number(m.fee_month)-1])+'</td><td>'+money(m.monthly_fee)+'</td><td>'+money(m.cash_paid)+'</td><td>'+money(m.discount)+'</td><td>'+money(m.fine)+'</td></tr>').join('')+'</tbody></table></div>'+
        '<div style="margin-top:12px;border:1px solid #bbb;padding:8px">'+lineHtml('Monthly Cash',money(monthCash))+lineHtml('Discount / Concession',money(discount))+lineHtml('Fine',money(fine))+lineHtml('Annual Fund Received',money(row.annual_fund_paid))+lineHtml('Refund',money(refund?.amount||0))+lineHtml('Annual Fund Paid',money(ledger.annualPaid))+lineHtml('Annual Fund Pending',money(ledger.annualPending))+lineHtml('Total Pending',money(ledger.totalPending),true)+'</div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px"><span>Prepared by: '+esc(state.settings.prepared_by||'Admin/Cashier')+'</span><span>Signature: __________________</span></div></article>';
    }
    const month=ledger.monthly[Number(row.fee_month)-1],refund=state.refunds.find(r=>r.fee_entry_id===row.id&&String(r.status||'active')!=='reversed');
    return '<article class="a5-slip" id="print-slip"><header><img src="assets/logo.svg" alt="" width="54"><h2>'+esc(state.settings.school_name||'UMEED Education System')+'</h2><div>OFFICIAL FEE RECEIPT</div>'+(pendingOfficial?'<strong style="color:#b10515">PENDING CLOUD SYNC — NOT AN OFFICIAL RECEIPT NUMBER</strong>':'')+'</header>'+
      '<div class="slip-grid">'+rowHtml('Receipt',row.receipt_no||'Pending Sync')+rowHtml('Date',row.payment_date)+rowHtml('Student',s.student_name)+rowHtml('Parent / Guardian',s.father_name)+rowHtml('Roll No',s.roll_number)+rowHtml('Class',className(state,s.class_id))+rowHtml('Month / Year',MONTHS[Number(row.fee_month)-1]+' '+row.fee_year)+'</div>'+
      '<div style="margin-top:12px;border:1px solid #bbb;padding:8px">'+lineHtml('Monthly Fee',money(row.monthly_fee||month.baseFee))+lineHtml('Discount',money(row.discount))+lineHtml('Fine',money(row.fine))+lineHtml('Cash Received',money(row.cash_paid))+lineHtml('Annual Fund Received',money(row.annual_fund_paid))+lineHtml('Refund',money(refund?.amount||0))+lineHtml('Total Pending',money(ledger.totalPending),true)+'</div></article>';
  }
};
function rowHtml(label,value){return '<div class="slip-row"><b>'+esc(label)+':</b> '+esc(value)+'</div>'}
function lineHtml(label,value,bold=false){return '<div class="slip-row"><span>'+esc(label)+'</span><'+(bold?'strong':'b')+' style="float:right">'+esc(value)+'</'+(bold?'strong':'b')+'></div>'}