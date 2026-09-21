import {AppContext} from '../app-context.js';
import {FeeService} from '../fee-service.js';
import {ActivityService} from '../activity-service.js';
import {PopupService} from '../popup-service.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className,today} from '../dom-utils.js';

let selectedId=null,selectedMonths=new Map();

function studentLabel(s){return [s.roll_number,s.student_name,s.father_name,className(AppContext.state,s.class_id),s.phone_number].filter(Boolean).join(' — ')}
function renderFinder(query){
  const host=document.getElementById('fee-finder-results');if(!host)return;
  const q=String(query||'').trim().toLowerCase();
  if(!q){host.innerHTML='';host.classList.remove('show');return}
  const rows=AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted').map(s=>{
    const hay=[s.roll_number,s.student_name,s.father_name,className(AppContext.state,s.class_id),s.phone_number].join(' ').toLowerCase();
    const exact=String(s.roll_number).toLowerCase()===q||String(s.phone_number||'').toLowerCase()===q;
    const starts=String(s.roll_number).toLowerCase().startsWith(q)||String(s.student_name).toLowerCase().startsWith(q);
    return {s,score:exact?0:starts?1:hay.includes(q)?2:99};
  }).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||Number(a.s.roll_number||0)-Number(b.s.roll_number||0)).slice(0,10);
  host.innerHTML=rows.length?rows.map(({s})=>'<button type="button" class="finder-result" data-finder-student="'+s.id+'"><b>'+escapeHtml(s.roll_number)+' · '+escapeHtml(s.student_name)+'</b><span>'+escapeHtml(s.father_name)+' · '+escapeHtml(className(AppContext.state,s.class_id))+' · '+escapeHtml(s.phone_number)+'</span></button>').join(''):'<div class="finder-empty">No matching student</div>';
  host.classList.add('show');
  document.querySelectorAll('[data-finder-student]').forEach(b=>b.onclick=()=>{selectStudent(b.dataset.finderStudent);host.classList.remove('show')});
}
function setupStudentFinder(){
  const input=document.getElementById('fee-student-search');
  input.oninput=()=>{
    const value=input.value.trim().toLowerCase(),exact=AppContext.state.students.find(x=>String(x.roll_number).toLowerCase()===value||String(x.phone_number||'').toLowerCase()===value);
    if(exact){selectStudent(exact.id);document.getElementById('fee-finder-results').classList.remove('show');return}
    renderFinder(value);
  };
  input.onfocus=()=>{if(input.value)renderFinder(input.value)};
  input.onblur=()=>setTimeout(()=>document.getElementById('fee-finder-results')?.classList.remove('show'),180);
}
function selectStudent(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;selectedId=id;selectedMonths.clear();
  document.getElementById('fee-student-id').value=id;document.getElementById('fee-student-search').value=studentLabel(s);
  document.getElementById('fee-roll').value=s.roll_number;document.getElementById('fee-name').value=s.student_name;document.getElementById('fee-guardian').value=s.father_name;
  document.getElementById('fee-class').value=className(AppContext.state,s.class_id);document.getElementById('fee-phone').value=s.phone_number;
  updatePreview();
}
function ledger(){return selectedId?computeStudentLedger(AppContext.state,selectedId,Number(document.getElementById('fee-year').value||new Date().getFullYear())):null}
function updatePreview(){
  const l=ledger();if(!l)return;
  document.getElementById('fee-balance-preview').innerHTML=[
    ['Class Monthly Fee',money(l.classMonthlyFee)],['Paid Months',l.paidMonths+'/12'],['Partial Months',l.partialMonths],['Pending Months',l.pendingMonths],['Monthly Pending',money(l.monthlyPending)],['Total Fee Pending',money(l.totalPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
  document.getElementById('fee-month-status').innerHTML=l.monthly.map(mm=>'<button type="button" class="month-cell '+mm.status.toLowerCase()+(selectedMonths.has(mm.month)?' selected':'')+'" data-fee-month="'+mm.month+'" '+(mm.status==='Clear'?'disabled':'')+'><b>'+mm.name.slice(0,3)+'</b><br>'+mm.status+'<br>'+money(mm.pending)+'</button>').join('');
  document.querySelectorAll('[data-fee-month]').forEach(b=>b.onclick=()=>toggleMonth(Number(b.dataset.feeMonth)));
  document.getElementById('annual-fund-summary').innerHTML=[
    ['Annual Fund',money(l.annualExpected)],['Paid',money(l.annualPaid)],['Pending',money(l.annualPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
  document.getElementById('annual-fund-help').textContent='Maximum remaining: '+money(l.annualPending);
  renderSelected();renderSlipSummary();
}
function toggleMonth(month){
  const l=ledger(),m=l?.monthly?.[month-1];if(!m||m.status==='Clear')return;
  if(selectedMonths.has(month))selectedMonths.delete(month);else selectedMonths.set(month,{fee_month:month,cash_paid:m.pending,discount:0,fine:0});
  updatePreview();
}
function selectAll(){
  const l=ledger();if(!l)return PopupService.warning('Select a student first.');
  selectedMonths.clear();l.monthly.filter(m=>m.status!=='Clear').forEach(m=>selectedMonths.set(m.month,{fee_month:m.month,cash_paid:m.pending,discount:0,fine:0}));updatePreview();
}
function renderSelected(){
  const l=ledger(),host=document.getElementById('selected-months-host');if(!l||!selectedMonths.size){host.innerHTML='<div class="empty-state">Select one or more pending months.</div>';return}
  const rows=[...selectedMonths.values()].sort((a,b)=>a.fee_month-b.fee_month);
  host.innerHTML='<div class="table-outer"><table><thead><tr><th>Month</th><th>Fee</th><th>Current Pending</th><th>Cash</th><th>Discount</th><th>Fine</th><th></th></tr></thead><tbody>'+rows.map(line=>{const m=l.monthly[line.fee_month-1];return '<tr><td><b>'+m.name+'</b></td><td>'+money(m.baseFee)+'</td><td>'+money(m.pending)+'</td><td><input data-line-cash="'+line.fee_month+'" type="number" min="0" value="'+line.cash_paid+'" style="width:120px"></td><td><input data-line-discount="'+line.fee_month+'" type="number" min="0" value="'+line.discount+'" style="width:110px"></td><td><input data-line-fine="'+line.fee_month+'" type="number" min="0" value="'+line.fine+'" style="width:100px"></td><td><button class="btn btn-red" data-line-remove="'+line.fee_month+'">Remove</button></td></tr>'}).join('')+'</tbody></table></div>';
  document.querySelectorAll('[data-line-cash]').forEach(el=>el.oninput=()=>{selectedMonths.get(Number(el.dataset.lineCash)).cash_paid=Number(el.value||0);renderSlipSummary()});
  document.querySelectorAll('[data-line-discount]').forEach(el=>el.oninput=()=>{selectedMonths.get(Number(el.dataset.lineDiscount)).discount=Number(el.value||0);renderSlipSummary()});
  document.querySelectorAll('[data-line-fine]').forEach(el=>el.oninput=()=>{selectedMonths.get(Number(el.dataset.lineFine)).fine=Number(el.value||0);renderSlipSummary()});
  document.querySelectorAll('[data-line-remove]').forEach(el=>el.onclick=()=>{selectedMonths.delete(Number(el.dataset.lineRemove));updatePreview()});
}
function renderSlipSummary(){
  const months=[...selectedMonths.values()],cash=months.reduce((a,m)=>a+Number(m.cash_paid||0),0),discount=months.reduce((a,m)=>a+Number(m.discount||0),0),fine=months.reduce((a,m)=>a+Number(m.fine||0),0),annual=Number(document.getElementById('fee-annual').value||0),refund=Number(document.getElementById('fee-refund').value||0);
  document.getElementById('fee-slip-summary').innerHTML=[
    ['Selected Months',months.length],['Monthly Cash',money(cash)],['Discount',money(discount)],['Fine',money(fine)],['Annual Fund',money(annual)],['Receipt Cash',money(cash+annual)],['Refund',money(refund)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
}
function recent(){
  const modern=[...(AppContext.state.feeReceipts||[])].map(r=>({...r,_modern:true})),legacy=[...(AppContext.state.feeEntries||[])].map(r=>({...r,_modern:false}));
  const rows=[...modern,...legacy].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,15);
  document.getElementById('recent-fees').innerHTML='<div class="table-outer"><table><thead><tr><th>Receipt</th><th>Student</th><th>Months</th><th>Monthly Cash</th><th>Annual</th><th>Total Cash</th><th>Sync</th></tr></thead><tbody>'+(rows.length?rows.map(r=>{const s=AppContext.state.students.find(x=>x.id===r.student_id);if(r._modern){const lines=(AppContext.state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id),cash=lines.reduce((a,m)=>a+Number(m.cash_paid||0),0),months=lines.map(m=>MONTHS[Number(m.fee_month)-1].slice(0,3)).join(', ')||'Annual Fund';return '<tr><td><b>'+escapeHtml(r.receipt_no||'Pending Sync')+'</b></td><td>'+escapeHtml(s?.student_name||'-')+'</td><td>'+escapeHtml(months)+'</td><td>'+money(cash)+'</td><td>'+money(r.annual_fund_paid)+'</td><td>'+money(cash+Number(r.annual_fund_paid||0))+'</td><td><span class="badge '+(r.receipt_no?'green':'warn')+'">'+(r.receipt_no?'Central':'Pending')+'</span></td></tr>'}return '<tr><td>'+escapeHtml(r.receipt_no||'Pending Sync')+'</td><td>'+escapeHtml(s?.student_name||'-')+'</td><td>'+MONTHS[Number(r.fee_month)-1].slice(0,3)+'</td><td>'+money(r.cash_paid)+'</td><td>'+money(r.annual_fund_paid)+'</td><td>'+money(Number(r.cash_paid||0)+Number(r.annual_fund_paid||0))+'</td><td><span class="badge gold">Legacy</span></td></tr>'}).join(''):'<tr><td colspan="7"><div class="empty-state">No fee slips yet.</div></td></tr>')+'</tbody></table></div>';
}
async function save(){
  if(!selectedId)return PopupService.warning('Select a student first.');
  const input={student_id:selectedId,fee_year:Number(document.getElementById('fee-year').value),months:[...selectedMonths.values()],annual_fund_paid:Number(document.getElementById('fee-annual').value||0),refund_amount:Number(document.getElementById('fee-refund').value||0),payment_date:document.getElementById('fee-date').value,notes:document.getElementById('fee-notes').value,source_device:navigator.userAgent.slice(0,180)};
  try{
    const result=await FeeService.saveReceipt(AppContext.state,input),s=AppContext.state.students.find(x=>x.id===selectedId),cash=input.months.reduce((a,m)=>a+Number(m.cash_paid||0),0)+input.annual_fund_paid;
    if(result.receipt)await ActivityService.log(AppContext.state,{action:'fee_receipt_saved',entity_type:'fee_receipt',entity_id:result.receipt.id,message:'Fee slip saved for '+s.student_name,amount:cash});
    if(result.refund)await ActivityService.log(AppContext.state,{action:'refund_added',entity_type:'refund',entity_id:result.refund.id,message:'Refund recorded for '+s.student_name,amount:input.refund_amount});
    await AppContext.save();
    if(result.queued)PopupService.warning('Saved offline. Official Fee Slip number will be assigned after Manual Sync.');else PopupService.success(result.receipt?'Fee Slip '+result.receipt.receipt_no+' saved.':'Refund recorded.');
    selectedMonths.clear();document.getElementById('fee-annual').value='0';document.getElementById('fee-refund').value='0';
    if(result.receipt){await AppContext.setSelectedSlip(result.receipt.id);await AppContext.navigate('fee-slip')}else{sessionStorage.setItem('umeed:student',selectedId);await AppContext.navigate('ledger')}
  }catch(e){PopupService.error(e.message)}
}
export default{
  async init(){
    document.getElementById('fee-series-badge').textContent='Fee Series: '+(AppContext.state.settings.fee_receipt_prefix||'UES');
    document.getElementById('fee-year').value=new Date().getFullYear();document.getElementById('fee-date').value=today();setupStudentFinder();recent();
    const pre=sessionStorage.getItem('umeed:student');if(pre){sessionStorage.removeItem('umeed:student');selectStudent(pre)}
    document.getElementById('fee-year').onchange=()=>{selectedMonths.clear();updatePreview()};
    document.getElementById('fee-select-all').onclick=selectAll;document.getElementById('fee-clear-months').onclick=()=>{selectedMonths.clear();updatePreview()};
    document.getElementById('annual-pay-full').onclick=()=>{const l=ledger();if(!l)return PopupService.warning('Select a student first.');document.getElementById('fee-annual').value=l.annualPending;renderSlipSummary()};
    document.getElementById('fee-annual').oninput=renderSlipSummary;document.getElementById('fee-refund').oninput=renderSlipSummary;
    document.getElementById('fee-save').onclick=save;
    document.getElementById('fee-open-ledger').onclick=()=>{if(!selectedId)return PopupService.warning('Select a student first.');sessionStorage.setItem('umeed:student',selectedId);AppContext.navigate('ledger')};
    document.getElementById('fee-whatsapp').onclick=()=>{try{if(!selectedId)throw new Error('Select a student first.');WhatsAppService.open(AppContext.state,selectedId,WhatsAppService.reminder(AppContext.state,selectedId,Number(document.getElementById('fee-year').value),null));PopupService.success('WhatsApp opened.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('fee-offline-banner').innerHTML=navigator.onLine?'':'<div class="sync-banner"><div><b>Offline mode</b><div class="page-subtitle">Receipt can be queued locally. Official Fee Slip number is assigned only after Manual Sync.</div></div></div>';
  },destroy(){document.getElementById('fee-finder-results')?.classList.remove('show')}
};