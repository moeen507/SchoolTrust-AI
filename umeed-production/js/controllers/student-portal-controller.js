import {AppContext} from '../app-context.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {SlipService} from '../slip-service.js';
import {ExportService} from '../export-service.js';
import {AuthService} from '../auth-service.js';
import {StudentAccountService} from '../student-account-service.js';
import {PopupService} from '../popup-service.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className} from '../dom-utils.js';

function student(){return AppContext.state.students[0]||null}
function years(){
  const s=student();if(!s)return [new Date().getFullYear()];
  const set=new Set([new Date().getFullYear()]);
  (AppContext.state.studentClassHistory||[]).forEach(h=>set.add(Number(h.academic_year)));
  (AppContext.state.feeReceipts||[]).forEach(r=>set.add(Number(r.fee_year)));
  (AppContext.state.feeEntries||[]).forEach(r=>set.add(Number(r.fee_year)));
  return [...set].filter(Number.isFinite).sort((a,b)=>b-a);
}
function selectedYear(){return Number(document.getElementById('portal-year').value||new Date().getFullYear())}
function renderProfile(){
  const s=student();if(!s)return;
  document.getElementById('portal-profile').innerHTML='<div class="summary-strip">'+[
    ['Student ID / Roll',s.roll_number],['Student Name',s.student_name],['Parent / Guardian',s.father_name],
    ['Current Class',className(AppContext.state,s.class_id)],['Phone / WhatsApp',s.phone_number]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+escapeHtml(x[1]||'-')+'</b></div>').join('')+'</div>';
}
function renderSummary(){
  const s=student(),l=s?computeStudentLedger(AppContext.state,s.id,selectedYear()):null;if(!l)return;
  document.getElementById('portal-summary').innerHTML=[
    ['Class',className(AppContext.state,l.ledgerClassId)],['Monthly Fee',money(l.classMonthlyFee)],['Paid Months',l.paidMonths+'/12'],
    ['Partial',l.partialMonths],['Monthly Pending',money(l.monthlyPending)],['Annual Fund Paid',money(l.annualPaid)],
    ['Annual Fund Pending',money(l.annualPending)],['Total Pending',money(l.totalPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+escapeHtml(x[1])+'</b></div>').join('');
  document.getElementById('portal-months').innerHTML=l.monthly.map(m=>'<div class="month-cell '+m.status.toLowerCase()+'"><b>'+m.name.slice(0,3)+'</b><br>'+m.status+'<br>'+money(m.pending)+'</div>').join('');
}
function openSlip(id){
  const fee=SlipService.byId(AppContext.state,id);if(!fee)return PopupService.warning('Slip not found.');
  const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';box.style.width='min(760px,96vw)';
  box.innerHTML='<div class="actions no-print" style="justify-content:flex-end"><button id="portal-print-slip" class="btn btn-gold">Print / Save PDF</button><button id="portal-close-slip" class="btn btn-ghost">Close</button></div>'+SlipService.render(AppContext.state,fee);
  back.appendChild(box);root.appendChild(back);
  document.getElementById('portal-close-slip').onclick=()=>back.remove();
  document.getElementById('portal-print-slip').onclick=()=>window.print();
}
function renderFees(){
  const y=selectedYear(),receipts=(AppContext.state.feeReceipts||[]).filter(r=>Number(r.fee_year)===y&&String(r.status||'active')!=='reversed');
  const legacy=(AppContext.state.feeEntries||[]).filter(r=>Number(r.fee_year)===y&&String(r.status||'active')!=='reversed');
  const refunds=(AppContext.state.refunds||[]).filter(r=>Number(r.fee_year)===y&&String(r.status||'active')!=='reversed');
  const rows=[
    ...receipts.map(r=>{const lines=(AppContext.state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id),cash=lines.reduce((a,m)=>a+Number(m.cash_paid||0),0);return {id:r.id,date:r.payment_date,receipt:r.receipt_no||'Pending Sync',details:lines.map(m=>MONTHS[Number(m.fee_month)-1]).join(', ')||'Annual Fund',amount:cash+Number(r.annual_fund_paid||0),type:'Fee Slip'}}),
    ...legacy.map(r=>({id:r.id,date:r.payment_date,receipt:r.receipt_no||'Legacy',details:MONTHS[Number(r.fee_month)-1],amount:Number(r.cash_paid||0)+Number(r.annual_fund_paid||0),type:'Legacy Fee'})),
    ...refunds.map(r=>({id:null,date:r.refund_date,receipt:'REFUND',details:r.notes||'Refund',amount:-Number(r.amount||0),type:'Refund'}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  document.getElementById('portal-fees').innerHTML='<div class="table-outer"><table><thead><tr><th>Date</th><th>Type</th><th>Receipt</th><th>Details</th><th>Amount</th><th></th></tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr><td>'+escapeHtml(r.date)+'</td><td>'+escapeHtml(r.type)+'</td><td><b>'+escapeHtml(r.receipt)+'</b></td><td>'+escapeHtml(r.details)+'</td><td>'+money(r.amount)+'</td><td>'+(r.id?'<button class="btn btn-ghost" data-portal-slip="'+r.id+'">View</button>':'')+'</td></tr>').join(''):'<tr><td colspan="6"><div class="empty-state">No fee activity for this year.</div></td></tr>')+'</tbody></table></div>';
  document.querySelectorAll('[data-portal-slip]').forEach(b=>b.onclick=()=>openSlip(b.dataset.portalSlip));
}
function renderClasses(){
  const rows=[...(AppContext.state.studentClassHistory||[])].sort((a,b)=>String(b.start_date).localeCompare(String(a.start_date)));
  document.getElementById('portal-classes').innerHTML='<div class="table-outer"><table><thead><tr><th>Academic Year</th><th>Class</th><th>From</th><th>To</th></tr></thead><tbody>'+(rows.length?rows.map(h=>'<tr><td>'+h.academic_year+'</td><td>'+escapeHtml(className(AppContext.state,h.class_id))+'</td><td>'+escapeHtml(h.start_date||'-')+'</td><td>'+escapeHtml(h.end_date||'Current')+'</td></tr>').join(''):'<tr><td colspan="4"><div class="empty-state">No class history yet.</div></td></tr>')+'</tbody></table></div>';
}
function renderCounter(){
  const sales=[...(AppContext.state.counterSales||[])].filter(s=>String(s.status||'active')!=='reversed').sort((a,b)=>String(b.sale_date).localeCompare(String(a.sale_date)));
  document.getElementById('portal-counter').innerHTML='<div class="table-outer"><table><thead><tr><th>Date</th><th>Receipt</th><th>Type</th><th>Items</th><th>Total</th></tr></thead><tbody>'+(sales.length?sales.map(s=>{const items=(AppContext.state.counterSaleItems||[]).filter(i=>i.sale_id===s.id).map(i=>i.item_name+' × '+i.quantity).join(', ');return '<tr><td>'+escapeHtml(s.sale_date)+'</td><td><b>'+escapeHtml(s.receipt_no||'Pending Sync')+'</b></td><td>'+(s.channel==='canteen'?'Canteen':'Syllabus')+'</td><td>'+escapeHtml(items||'-')+'</td><td>'+money(s.total)+'</td></tr>'}).join(''):'<tr><td colspan="5"><div class="empty-state">No Syllabus/Canteen purchases yet.</div></td></tr>')+'</tbody></table></div>';
}
function renderAll(){renderProfile();renderSummary();renderFees();renderClasses();renderCounter()}
async function changePassword(){
  const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
  box.innerHTML='<h3>Change Student Password</h3><p>Choose a private password with at least 8 characters.</p><div class="form-group"><label>New Password</label><input id="portal-new-pass" type="password" minlength="8"></div><div class="form-group" style="margin-top:10px"><label>Confirm Password</label><input id="portal-confirm-pass" type="password" minlength="8"></div><div class="actions" style="margin-top:14px"><button id="portal-save-pass" class="btn btn-gold">Change Password</button><button id="portal-cancel-pass" class="btn btn-ghost">Cancel</button></div>';
  back.appendChild(box);root.appendChild(back);
  document.getElementById('portal-cancel-pass').onclick=()=>back.remove();
  document.getElementById('portal-save-pass').onclick=async()=>{try{const p=document.getElementById('portal-new-pass').value,c=document.getElementById('portal-confirm-pass').value;if(p!==c)throw new Error('Passwords do not match.');await AuthService.updatePassword(p);await StudentAccountService.markPasswordChanged();AppContext.state.studentAccount.must_change_password=false;await AppContext.save();back.remove();renderPasswordBanner();PopupService.success('Password changed.')}catch(e){PopupService.error(e.message)}};
}
function renderPasswordBanner(){
  const host=document.getElementById('portal-password-banner'),must=AppContext.state.studentAccount?.must_change_password;
  host.innerHTML=must?'<div class="sync-banner"><div><b>Temporary password detected</b><div class="page-subtitle">Change your password before continuing to use this account regularly.</div></div><button id="portal-change-password" class="btn btn-gold">Change Password</button></div>':'<div class="actions" style="justify-content:flex-end;margin-bottom:10px"><button id="portal-change-password" class="btn btn-ghost">Change Password</button></div>';
  document.getElementById('portal-change-password').onclick=changePassword;
}
function download(){
  const s=student(),y=selectedYear(),l=computeStudentLedger(AppContext.state,s.id,y);
  const rows=l.monthly.map(m=>({student_id:s.roll_number,student_name:s.student_name,parent_guardian:s.father_name,class:className(AppContext.state,l.ledgerClassId),year:y,month:m.name,monthly_fee:m.baseFee,cash_paid:m.cash,discount:m.discount,fine:m.fine,status:m.status,pending:m.pending,annual_fund_paid:l.annualPaid,annual_fund_pending:l.annualPending,total_pending:l.totalPending}));
  ExportService.csv(rows,'UMEED-Student-'+s.roll_number+'-'+y+'-Statement.csv');
}
export default{
  async init(){
    const y=document.getElementById('portal-year');y.innerHTML=years().map(v=>'<option value="'+v+'">'+v+'</option>').join('');y.value=String(new Date().getFullYear());if(![...y.options].some(o=>o.value===y.value))y.selectedIndex=0;
    y.onchange=renderAll;document.getElementById('portal-refresh').onclick=async()=>{await AppContext.refreshCloud();renderAll();renderPasswordBanner()};document.getElementById('portal-download').onclick=download;renderPasswordBanner();renderAll();
  },destroy(){}
};