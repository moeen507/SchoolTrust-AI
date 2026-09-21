import {AppContext} from '../app-context.js';
import {ReportsEngine} from '../reports-engine.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {ExportService} from '../export-service.js';
import {PopupService} from '../popup-service.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className,optionList} from '../dom-utils.js';
import {debounce} from '../validation-service.js';

let mode='month',historyStudent=null;
const filters=()=>({query:document.getElementById('report-search')?.value||'',classId:document.getElementById('report-class')?.value||''});
const year=()=>Number(document.getElementById('report-year')?.value||new Date().getFullYear());
const month=()=>Number(document.getElementById('report-month')?.value||new Date().getMonth()+1);
function statusAllowed(status){const f=document.getElementById('report-status')?.value||'';return !f||String(status).toLowerCase()===f}
function monthTable(){
  const rows=ReportsEngine.monthDefaulters(AppContext.state,month(),year(),filters()).filter(x=>statusAllowed(x.month.status));
  return '<div class="table-outer"><table><thead><tr><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th>Month</th><th>Expected</th><th>Covered</th><th>Monthly Pending</th><th>Annual Pending</th><th>Total</th><th>Action</th></tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td>'+escapeHtml(x.student.roll_number)+'</td><td>'+escapeHtml(x.student.student_name)+'</td><td>'+escapeHtml(x.student.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,x.student.class_id))+'</td><td>'+MONTHS[month()-1]+' '+year()+'</td><td>'+money(x.month.expected)+'</td><td>'+money(x.month.covered)+'</td><td>'+money(x.month.pending)+'</td><td>'+money(x.ledger.annualPending)+'</td><td><b>'+money(x.month.pending+x.ledger.annualPending)+'</b></td><td><button class="btn btn-green" data-wa="'+x.student.id+'">WhatsApp</button></td></tr>').join(''):'<tr><td colspan="11"><div class="empty-state">No month-wise defaulters found.</div></td></tr>')+'</tbody></table></div>';
}
function yearTable(){
  const rows=ReportsEngine.yearDefaulters(AppContext.state,year(),filters()).filter(x=>statusAllowed(x.ledger.totalPending===0?'Clear':x.ledger.totalCash>0?'Partial':'Pending'));
  return '<div class="table-outer"><table><thead><tr><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th>Class Fee</th><th>Paid Months</th><th>Partial</th><th>Pending</th><th>Monthly Pending</th><th>Annual Pending</th><th>Total Pending</th></tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td>'+escapeHtml(x.student.roll_number)+'</td><td>'+escapeHtml(x.student.student_name)+'</td><td>'+escapeHtml(x.student.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,x.student.class_id))+'</td><td>'+money(x.ledger.classMonthlyFee)+'</td><td>'+x.ledger.paidMonths+'/12</td><td>'+x.ledger.partialMonths+'</td><td>'+x.ledger.pendingMonths+'</td><td>'+money(x.ledger.monthlyPending)+'</td><td>'+money(x.ledger.annualPending)+'</td><td><b>'+money(x.ledger.totalPending)+'</b></td></tr>').join(''):'<tr><td colspan="11"><div class="empty-state">No yearly defaulters found.</div></td></tr>')+'</tbody></table></div>';
}
function refundTable(){
  const rows=ReportsEngine.refunds(AppContext.state,year(),filters());
  return '<div class="table-outer"><table><thead><tr><th>Date</th><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th>Refund Amount</th><th>Notes</th></tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td>'+escapeHtml(x.refund.refund_date)+'</td><td>'+escapeHtml(x.student.roll_number)+'</td><td>'+escapeHtml(x.student.student_name)+'</td><td>'+escapeHtml(x.student.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,x.student.class_id))+'</td><td>'+money(x.refund.amount||x.refund.refund_amount)+'</td><td>'+escapeHtml(x.refund.notes||'')+'</td></tr>').join(''):'<tr><td colspan="7"><div class="empty-state">No refund entries found.</div></td></tr>')+'</tbody></table></div>';
}
function txRow(t){
  if(t._type==='refund')return '<tr><td>Refund</td><td>'+escapeHtml(t.refund_date||'-')+'</td><td>-</td><td>'+money(t.amount||t.refund_amount)+'</td><td>-</td><td>-</td><td>-</td><td>'+escapeHtml(t.notes||'-')+'</td></tr>';
  if(t._type==='fee_receipt')return '<tr><td>Fee Slip</td><td>'+escapeHtml(t.payment_date||'-')+'</td><td>'+escapeHtml(t.month_labels||'Annual Fund')+'</td><td>'+money(t.cash_paid)+'</td><td>'+money(t.discount)+'</td><td>'+money(t.fine)+'</td><td>'+money(t.annual_fund_paid)+'</td><td>'+escapeHtml(t.receipt_no||'Pending Sync')+'</td></tr>';
  return '<tr><td>Fee (Legacy)</td><td>'+escapeHtml(t.payment_date||'-')+'</td><td>'+escapeHtml(MONTHS[Number(t.fee_month)-1]||'-')+'</td><td>'+money(t.cash_paid)+'</td><td>'+money(t.discount)+'</td><td>'+money(t.fine)+'</td><td>'+money(t.annual_fund_paid)+'</td><td>'+escapeHtml(t.receipt_no||'-')+'</td></tr>';
}
function historyView(){
  const students=AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted'&&(!filters().classId||s.class_id===filters().classId)&&(!filters().query||[s.roll_number,s.student_name,s.father_name].join(' ').toLowerCase().includes(filters().query.toLowerCase())));
  if(!historyStudent)return '<div class="table-outer"><table><thead><tr><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th></th></tr></thead><tbody>'+students.slice(0,100).map(s=>'<tr><td>'+escapeHtml(s.roll_number)+'</td><td>'+escapeHtml(s.student_name)+'</td><td>'+escapeHtml(s.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,s.class_id))+'</td><td><button class="btn btn-gold" data-history="'+s.id+'">View History</button></td></tr>').join('')+'</tbody></table></div>';
  const l=computeStudentLedger(AppContext.state,historyStudent,year());if(!l){historyStudent=null;return '<div class="empty-state">Student not found.</div>'}
  return '<div class="actions" style="margin-bottom:12px"><button class="btn btn-ghost" id="history-back">← Back</button></div><div class="summary-strip">'+[['Class Fee',money(l.classMonthlyFee)],['Cash',money(l.totalCash)],['Discount',money(l.totalDiscount)],['Fine',money(l.totalFine)],['Refund',money(l.totalRefund)],['Annual Pending',money(l.annualPending)],['Total Pending',money(l.totalPending)]].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('')+'</div><div class="table-outer" style="margin-top:12px"><table><thead><tr><th>Type</th><th>Date</th><th>Month(s)</th><th>Cash / Refund</th><th>Discount</th><th>Fine</th><th>Annual Fund</th><th>Receipt / Note</th></tr></thead><tbody>'+l.transactions.map(txRow).join('')+'</tbody></table></div>';
}
function render(){
  document.querySelectorAll('[data-report]').forEach(b=>b.classList.toggle('active',b.dataset.report===mode));
  document.getElementById('report-month').style.display=mode==='month'?'':'none';document.getElementById('report-status').style.display=['month','year'].includes(mode)?'':'none';
  document.getElementById('report-host').innerHTML=mode==='month'?monthTable():mode==='year'?yearTable():mode==='refund'?refundTable():historyView();
  document.querySelectorAll('[data-wa]').forEach(b=>b.onclick=()=>{try{WhatsAppService.open(AppContext.state,b.dataset.wa,WhatsAppService.reminder(AppContext.state,b.dataset.wa,year(),mode==='month'?month():null));PopupService.success('WhatsApp opened.')}catch(e){PopupService.error(e.message)}});
  document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{historyStudent=b.dataset.history;render()});const back=document.getElementById('history-back');if(back)back.onclick=()=>{historyStudent=null;render()};
}
function exportRows(){
  if(mode==='month')return ReportsEngine.monthDefaulters(AppContext.state,month(),year(),filters()).map(x=>({roll:x.student.roll_number,student:x.student.student_name,parent_guardian:x.student.father_name,class:className(AppContext.state,x.student.class_id),month:MONTHS[month()-1],year:year(),expected:x.month.expected,monthly_pending:x.month.pending,annual_fund_pending:x.ledger.annualPending,total_pending:x.month.pending+x.ledger.annualPending}));
  if(mode==='year')return ReportsEngine.yearDefaulters(AppContext.state,year(),filters()).map(x=>({roll:x.student.roll_number,student:x.student.student_name,parent_guardian:x.student.father_name,class:className(AppContext.state,x.student.class_id),class_monthly_fee:x.ledger.classMonthlyFee,year:year(),paid_months:x.ledger.paidMonths,partial_months:x.ledger.partialMonths,pending_months:x.ledger.pendingMonths,monthly_pending:x.ledger.monthlyPending,annual_fund_pending:x.ledger.annualPending,total_pending:x.ledger.totalPending}));
  if(mode==='refund')return ReportsEngine.refunds(AppContext.state,year(),filters()).map(x=>({date:x.refund.refund_date,roll:x.student.roll_number,student:x.student.student_name,parent_guardian:x.student.father_name,class:className(AppContext.state,x.student.class_id),refund_amount:x.refund.amount||x.refund.refund_amount,notes:x.refund.notes||''}));
  if(historyStudent){const l=computeStudentLedger(AppContext.state,historyStudent,year());return l.transactions.map(t=>({...t}))}
  return [];
}
export default{
  async init(){
    document.getElementById('report-class').innerHTML='<option value="">All Classes</option>'+optionList(AppContext.state.classes,'','id',c=>c.class_name);
    document.getElementById('report-month').innerHTML=MONTHS.map((m,i)=>'<option value="'+(i+1)+'" '+(i===new Date().getMonth()?'selected':'')+'>'+m+'</option>').join('');
    document.getElementById('report-year').value=new Date().getFullYear();document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>{mode=b.dataset.report;historyStudent=null;render()});
    const refresh=debounce(render,200);for(const id of ['report-search','report-class','report-month','report-year','report-status'])document.getElementById(id).addEventListener(id==='report-search'?'input':'change',refresh);
    document.getElementById('report-export').onclick=()=>{ExportService.csv(exportRows(),'UMEED-'+mode+'-Report.csv');PopupService.success('Report exported.')};
    document.getElementById('report-print').onclick=()=>{document.body.classList.add('report-printing');window.print();setTimeout(()=>document.body.classList.remove('report-printing'),300);PopupService.success('Report sent to print.')};render();
  },destroy(){document.body.classList.remove('report-printing')}
};