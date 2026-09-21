import {AppContext} from '../app-context.js';
import {FeeService} from '../fee-service.js';
import {ActivityService} from '../activity-service.js';
import {PopupService} from '../popup-service.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className,today} from '../dom-utils.js';

let selectedId=null;
function studentLabel(s){return [s.roll_number,s.student_name,className(AppContext.state,s.class_id),s.phone_number].filter(Boolean).join(' — ')}
function setupStudentList(){
  const input=document.getElementById('fee-student-search'),list=document.createElement('datalist');list.id='fee-student-options';
  list.innerHTML=AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted').map(s=>'<option value="'+escapeHtml(studentLabel(s))+'"></option>').join('');
  document.body.appendChild(list);input.setAttribute('list',list.id);
  const resolve=()=>{const value=input.value.trim().toLowerCase();const s=AppContext.state.students.find(x=>studentLabel(x).toLowerCase()===value||String(x.roll_number).toLowerCase()===value||String(x.phone_number||'').toLowerCase()===value);if(s)selectStudent(s.id)};
  input.onchange=resolve;input.onblur=resolve;
}
function selectStudent(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;selectedId=id;
  document.getElementById('fee-student-id').value=id;document.getElementById('fee-student-search').value=studentLabel(s);
  document.getElementById('fee-roll').value=s.roll_number;document.getElementById('fee-class').value=className(AppContext.state,s.class_id);document.getElementById('fee-father').value=s.father_name;
  updatePreview();
}
function updatePreview(){
  if(!selectedId)return;
  const y=Number(document.getElementById('fee-year').value||new Date().getFullYear()),m=Number(document.getElementById('fee-month').value||1),l=computeStudentLedger(AppContext.state,selectedId,y);if(!l)return;
  const month=l.monthly[m-1];
  document.getElementById('fee-monthly').value=month.baseFee;
  document.getElementById('annual-fund-help').textContent='Annual Fund: '+money(l.annualPaid)+' paid · '+money(l.annualPending)+' pending';
  document.getElementById('fee-balance-preview').innerHTML=[
    ['Class Monthly Fee',money(l.classMonthlyFee)],['Selected Month',month.status+' · '+money(month.pending)],
    ['Annual Fund Paid',money(l.annualPaid)],['Annual Fund Pending',money(l.annualPending)],['Total Pending',money(l.totalPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
  document.getElementById('fee-month-status').innerHTML=l.monthly.map(mm=>'<button type="button" class="month-cell '+mm.status.toLowerCase()+'" data-fee-month="'+mm.month+'"><b>'+mm.name.slice(0,3)+'</b><br>'+mm.status+'<br>'+money(mm.pending)+'</button>').join('');
  document.querySelectorAll('[data-fee-month]').forEach(b=>b.onclick=()=>{document.getElementById('fee-month').value=b.dataset.feeMonth;updatePreview()});
}
function recent(){
  const rows=[...AppContext.state.feeEntries].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,12);
  document.getElementById('recent-fees').innerHTML='<div class="table-outer"><table><thead><tr><th>Receipt</th><th>Student</th><th>Month</th><th>Class Fee</th><th>Cash</th><th>Discount</th><th>Fine</th><th>Annual</th><th>Sync</th></tr></thead><tbody>'+(rows.length?rows.map(e=>{const s=AppContext.state.students.find(x=>x.id===e.student_id);return '<tr><td>'+escapeHtml(e.receipt_no||'Pending Sync')+'</td><td>'+escapeHtml(s?.student_name||'-')+'</td><td>'+escapeHtml(MONTHS[Number(e.fee_month)-1])+' '+e.fee_year+'</td><td>'+money(e.monthly_fee)+'</td><td>'+money(e.cash_paid)+'</td><td>'+money(e.discount)+'</td><td>'+money(e.fine)+'</td><td>'+money(e.annual_fund_paid)+'</td><td><span class="badge '+(e.receipt_no?'green':'warn')+'">'+(e.receipt_no?'Central':'Pending')+'</span></td></tr>'}).join(''):'<tr><td colspan="9"><div class="empty-state">No fee entries yet.</div></td></tr>')+'</tbody></table></div>';
}
async function submit(e){
  e.preventDefault();if(!selectedId){PopupService.warning('Select a student first.');return}
  const input={student_id:selectedId,fee_month:Number(document.getElementById('fee-month').value),fee_year:Number(document.getElementById('fee-year').value),cash_paid:Number(document.getElementById('fee-cash').value||0),discount:Number(document.getElementById('fee-discount').value||0),fine:Number(document.getElementById('fee-fine').value||0),annual_fund_paid:Number(document.getElementById('fee-annual').value||0),refund_amount:Number(document.getElementById('fee-refund').value||0),payment_date:document.getElementById('fee-date').value,notes:document.getElementById('fee-notes').value,source_device:navigator.userAgent.slice(0,180)};
  try{
    const result=await FeeService.save(AppContext.state,input),s=AppContext.state.students.find(x=>x.id===selectedId);
    if(result.fee)await ActivityService.log(AppContext.state,{action:'fee_saved',entity_type:'fee_entry',entity_id:result.fee.id,message:'Fee saved for '+s.student_name,amount:Number(input.cash_paid)+Number(input.annual_fund_paid)});
    if(result.refund)await ActivityService.log(AppContext.state,{action:'refund_added',entity_type:'refund',entity_id:result.refund.id,message:'Refund recorded for '+s.student_name,amount:Number(input.refund_amount)});
    await AppContext.save();
    if(result.queued)PopupService.warning('Saved offline. Pending records require Manual Sync.');else PopupService.success(result.fee?'Fee saved and official receipt generated.':'Refund recorded.');
    if(result.fee){await AppContext.setSelectedSlip(result.fee.id);await AppContext.navigate('fee-slip')}else{sessionStorage.setItem('umeed:student',selectedId);await AppContext.navigate('ledger')}
  }catch(err){PopupService.error(err.message)}
}
export default{
  async init(){
    document.getElementById('fee-series-badge').textContent='Fee Series: '+(AppContext.state.settings.fee_receipt_prefix||AppContext.state.settings.slip_prefix||'UES');
    document.getElementById('fee-month').innerHTML=MONTHS.map((m,i)=>'<option value="'+(i+1)+'" '+(i===new Date().getMonth()?'selected':'')+'>'+m+'</option>').join('');
    document.getElementById('fee-year').value=new Date().getFullYear();document.getElementById('fee-date').value=today();
    setupStudentList();recent();
    const pre=sessionStorage.getItem('umeed:student');if(pre){sessionStorage.removeItem('umeed:student');selectStudent(pre)}
    for(const id of ['fee-month','fee-year'])document.getElementById(id).onchange=updatePreview;
    document.getElementById('fee-form').onsubmit=submit;
    document.getElementById('fee-open-ledger').onclick=()=>{if(!selectedId)return PopupService.warning('Select a student first.');sessionStorage.setItem('umeed:student',selectedId);AppContext.navigate('ledger')};
    document.getElementById('fee-whatsapp').onclick=()=>{try{if(!selectedId)throw new Error('Select a student first.');const y=Number(document.getElementById('fee-year').value),m=Number(document.getElementById('fee-month').value);WhatsAppService.open(AppContext.state,selectedId,WhatsAppService.reminder(AppContext.state,selectedId,y,m));PopupService.success('WhatsApp opened.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('fee-offline-banner').innerHTML=navigator.onLine?'':'<div class="sync-banner"><div><b>Offline mode</b><div class="page-subtitle">Transactions are saved locally and queued. Official Fee receipt numbers are assigned only after manual sync.</div></div></div>';
  },
  destroy(){document.getElementById('fee-student-options')?.remove()}
};