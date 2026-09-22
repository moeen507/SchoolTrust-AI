import {AppContext} from '../app-context.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {StudentAccountService} from '../student-account-service.js';
import {ExportService} from '../export-service.js';
import {PopupService} from '../popup-service.js';
import {escapeHtml,className} from '../dom-utils.js';
import {MONTHS} from '../config.js';

function student(){return AppContext.state.students.find(s=>s.id===AppContext.profile.student_id)}
function years(){
  const set=new Set([new Date().getFullYear()]);
  (AppContext.state.feeReceipts||[]).forEach(r=>set.add(Number(r.fee_year)));
  (AppContext.state.feeEntries||[]).forEach(r=>set.add(Number(r.fee_year)));
  return [...set].filter(Boolean).sort((a,b)=>b-a);
}
function render(){
  const s=student();if(!s){document.getElementById('student-profile-card').innerHTML='<div class="empty-state">Student profile not found.</div>';return}
  const y=Number(document.getElementById('student-portal-year').value||new Date().getFullYear()),l=computeStudentLedger(AppContext.state,s.id,y);
  document.getElementById('student-profile-card').innerHTML='<div class="summary-strip">'+[
    ['Student',escapeHtml(s.student_name)],['Roll No.',escapeHtml(s.roll_number)],['Parent / Guardian',escapeHtml(s.father_name)],['Class',escapeHtml(className(AppContext.state,s.class_id))],['Phone / WhatsApp',escapeHtml(s.phone_number||'-')]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('')+'</div>';
  document.getElementById('student-ledger-stats').innerHTML=[
    ['Class Monthly Fee',money(l.classMonthlyFee)],['Paid Months',l.paidMonths],['Partial Months',l.partialMonths],['Pending Months',l.pendingMonths],['Fee Pending',money(l.monthlyPending)],['Total Pending',money(l.totalPending)]
  ].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
  document.getElementById('student-months').innerHTML='<div class="table-outer"><table><thead><tr><th>Month</th><th>Fee</th><th>Cash</th><th>Discount</th><th>Fine</th><th>Pending</th><th>Status</th></tr></thead><tbody>'+l.monthly.map(m=>'<tr><td><b>'+m.name+'</b></td><td>'+money(m.baseFee)+'</td><td>'+money(m.cash)+'</td><td>'+money(m.discount)+'</td><td>'+money(m.fine)+'</td><td>'+money(m.pending)+'</td><td><span class="badge '+(m.status==='Clear'?'green':m.status==='Partial'?'warn':'red')+'">'+m.status+'</span></td></tr>').join('')+'</tbody></table></div>';
  document.getElementById('student-annual').innerHTML='<div class="summary-strip"><div class="summary-item"><small>Annual Fund</small><b>'+money(l.annualExpected)+'</b></div><div class="summary-item"><small>Paid</small><b>'+money(l.annualPaid)+'</b></div><div class="summary-item"><small>Pending</small><b>'+money(l.annualPending)+'</b></div></div>';

  const feeRows=[
    ...(AppContext.state.feeReceipts||[]).filter(r=>r.student_id===s.id&&Number(r.fee_year)===y).map(r=>({receipt:r.receipt_no||'Pending Sync',date:r.payment_date,details:(AppContext.state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id).map(m=>MONTHS[Number(m.fee_month)-1]).join(', ')+(Number(r.annual_fund_paid||0)>0?' + Annual Fund':''),amount:(AppContext.state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id).reduce((a,m)=>a+Number(m.cash_paid||0),0)+Number(r.annual_fund_paid||0)})),
    ...(AppContext.state.feeEntries||[]).filter(r=>r.student_id===s.id&&Number(r.fee_year)===y).map(r=>({receipt:r.receipt_no||'Pending Sync',date:r.payment_date,details:MONTHS[Number(r.fee_month)-1]+' '+y,amount:Number(r.cash_paid||0)+Number(r.annual_fund_paid||0)}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  document.getElementById('student-fee-history').innerHTML='<div class="table-outer"><table><thead><tr><th>Slip</th><th>Date</th><th>Details</th><th>Cash</th></tr></thead><tbody>'+(feeRows.length?feeRows.map(r=>'<tr><td><b>'+escapeHtml(r.receipt)+'</b></td><td>'+escapeHtml(r.date)+'</td><td>'+escapeHtml(r.details)+'</td><td>'+money(r.amount)+'</td></tr>').join(''):'<tr><td colspan="4"><div class="empty-state">No fee history for this year.</div></td></tr>')+'</tbody></table></div>';

  const counter=(AppContext.state.counterSales||[]).filter(r=>r.student_id===s.id).sort((a,b)=>String(b.sale_date).localeCompare(String(a.sale_date)));
  document.getElementById('student-counter-history').innerHTML='<div class="table-outer"><table><thead><tr><th>Slip</th><th>Date</th><th>Type</th><th>Items</th><th>Total</th></tr></thead><tbody>'+(counter.length?counter.map(r=>'<tr><td><b>'+escapeHtml(r.receipt_no||'Pending Sync')+'</b></td><td>'+escapeHtml(r.sale_date)+'</td><td>'+escapeHtml(r.channel==='canteen'?'Canteen':'Student Syllabus')+'</td><td>'+escapeHtml((AppContext.state.counterSaleItems||[]).filter(i=>i.sale_id===r.id).map(i=>i.item_name+' × '+i.quantity).join(', '))+'</td><td>'+money(r.total)+'</td></tr>').join(''):'<tr><td colspan="5"><div class="empty-state">No Syllabus/Canteen history.</div></td></tr>')+'</tbody></table></div>';
}
function download(){
  const s=student(),y=Number(document.getElementById('student-portal-year').value),l=computeStudentLedger(AppContext.state,s.id,y);
  ExportService.csv(l.monthly.map(m=>({student:s.student_name,roll_number:s.roll_number,parent_guardian:s.father_name,class:className(AppContext.state,s.class_id),year:y,month:m.name,monthly_fee:m.baseFee,cash_paid:m.cash,discount:m.discount,fine:m.fine,pending:m.pending,status:m.status,annual_fund_paid:l.annualPaid,annual_fund_pending:l.annualPending,total_pending:l.totalPending})),'UMEED-'+s.roll_number+'-History-'+y+'.csv');
}
async function changePassword(){
  const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
  box.innerHTML='<h3>Change Student Password</h3><div class="form-group"><label>New Password</label><input id="student-new-password" type="password" minlength="8"></div><div class="actions" style="margin-top:14px"><button id="student-password-save" class="btn btn-gold">Change Password</button><button id="student-password-cancel" class="btn btn-ghost">Cancel</button></div>';
  back.appendChild(box);root.appendChild(back);document.getElementById('student-password-cancel').onclick=()=>back.remove();
  document.getElementById('student-password-save').onclick=async()=>{try{await StudentAccountService.changePassword(document.getElementById('student-new-password').value);AppContext.profile.must_change_password=false;back.remove();PopupService.success('Password changed.')}catch(e){PopupService.error(e.message)}};
}
export default{
  async init(){
    const sel=document.getElementById('student-portal-year');sel.innerHTML=years().map(y=>'<option value="'+y+'">'+y+'</option>').join('');sel.onchange=render;
    document.getElementById('student-portal-download').onclick=download;document.getElementById('student-change-password').onclick=changePassword;render();
    if(AppContext.profile.must_change_password)PopupService.warning('For security, change your temporary student password after first login.');
  },destroy(){}
};