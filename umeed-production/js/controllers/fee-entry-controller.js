import {AppContext} from '../app-context.js';
import {FeeService} from '../fee-service.js';
import {ActivityService} from '../activity-service.js';
import {PopupService} from '../popup-service.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className,today} from '../dom-utils.js';

let selectedId=null;
let selectedMonths=new Set();

function studentLabel(s){return [s.roll_number,s.student_name,className(AppContext.state,s.class_id),s.phone_number].filter(Boolean).join(' — ')}
function setupStudents(){
  const input=document.getElementById('fee-student-search'),list=document.createElement('datalist');list.id='fee-student-options';
  list.innerHTML=(AppContext.state.students||[]).filter(s=>String(s.status||'active')!=='deleted').map(s=>'<option value="'+escapeHtml(studentLabel(s))+'"></option>').join('');
  document.body.appendChild(list);input.setAttribute('list',list.id);
  const resolve=()=>{const v=input.value.trim().toLowerCase();const s=(AppContext.state.students||[]).find(x=>studentLabel(x).toLowerCase()===v||String(x.roll_number).toLowerCase()===v||String(x.phone_number||'').toLowerCase()===v);if(s)selectStudent(s.id)};
  input.onchange=resolve;input.onblur=resolve;
}
function selectStudent(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;
  selectedId=id;selectedMonths.clear();
  document.getElementById('fee-student-search').value=studentLabel(s);
  document.getElementById('fee-roll').value=s.roll_number;
  document.getElementById('fee-name').value=s.student_name;
  document.getElementById('fee-guardian').value=s.father_name;
  document.getElementById('fee-class').value=className(AppContext.state,s.class_id);
  document.getElementById('fee-phone').value=s.phone_number||'';
  render();
}
function ledger(){
  if(!selectedId)return null;
  return computeStudentLedger(AppContext.state,selectedId,Number(document.getElementById('fee-year').value||new Date().getFullYear()));
}
function lineValue(month,key){
  const el=document.querySelector('[data-month="'+month+'"][data-key="'+key+'"]');return Number(el?.value||0);
}
function selectedLines(){
  const l=ledger();if(!l)return [];
  return [...selectedMonths].sort((a,b)=>a-b).map(month=>({
    fee_month:month,
    cash_paid:lineValue(month,'cash'),
    discount:lineValue(month,'discount'),
    fine:lineValue(month,'fine')
  }));
}
function renderMonthGrid(){
  const l=ledger(),host=document.getElementById('fee-month-grid');
  if(!l){host.innerHTML='<div class="empty-state">Select a student to view monthly dues.</div>';return}
  host.innerHTML='<div class="table-outer"><table><thead><tr><th></th><th>Month</th><th>Fee</th><th>Status</th><th>Pending</th><th>Cash</th><th>Discount</th><th>Fine</th></tr></thead><tbody>'+l.monthly.map(m=>{
    const checked=selectedMonths.has(m.month),disabled=m.pending<=0&&!checked;
    return '<tr><td><input type="checkbox" data-select-month="'+m.month+'" '+(checked?'checked':'')+' '+(disabled?'disabled':'')+'></td><td><b>'+m.name+'</b></td><td>'+money(m.baseFee)+'</td><td><span class="badge '+(m.status==='Clear'?'green':m.status==='Partial'?'warn':'red')+'">'+m.status+'</span></td><td>'+money(m.pending)+'</td><td><input data-month="'+m.month+'" data-key="cash" type="number" min="0" value="'+(checked?m.pending:0)+'" '+(!checked?'disabled':'')+' style="width:105px"></td><td><input data-month="'+m.month+'" data-key="discount" type="number" min="0" value="0" '+(!checked?'disabled':'')+' style="width:95px"></td><td><input data-month="'+m.month+'" data-key="fine" type="number" min="0" value="0" '+(!checked?'disabled':'')+' style="width:85px"></td></tr>';
  }).join('')+'</tbody></table></div>';
  document.querySelectorAll('[data-select-month]').forEach(cb=>cb.onchange=()=>{
    const m=Number(cb.dataset.selectMonth);if(cb.checked)selectedMonths.add(m);else selectedMonths.delete(m);renderMonthGrid();renderReceiptSummary();
  });
  document.querySelectorAll('[data-key]').forEach(el=>el.oninput=renderReceiptSummary);
}
function renderLedgerSummary(){
  const l=ledger(),host=document.getElementById('fee-ledger-summary');
  if(!l){host.innerHTML='';return}
  document.getElementById('fee-monthly').value=l.classMonthlyFee;
  document.getElementById('annual-fund-help').textContent='Paid '+money(l.annualPaid)+' · Pending '+money(l.annualPending);
  host.innerHTML=[
    ['Class Fee',money(l.classMonthlyFee)],['Paid Months',l.paidMonths],['Partial',l.partialMonths],['Pending Months',l.pendingMonths],
    ['Annual Paid',money(l.annualPaid)],['Annual Pending',money(l.annualPending)],['Total Fee Pending',money(l.totalPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
}
function renderReceiptSummary(){
  const l=ledger(),host=document.getElementById('fee-receipt-summary');if(!l){host.innerHTML='<div class="empty-state">Select a student.</div>';return}
  const lines=selectedLines(),annual=Number(document.getElementById('fee-annual').value||0),refund=Number(document.getElementById('fee-refund').value||0);
  const cash=lines.reduce((a,x)=>a+Number(x.cash_paid||0),0),discount=lines.reduce((a,x)=>a+Number(x.discount||0),0),fine=lines.reduce((a,x)=>a+Number(x.fine||0),0);
  host.innerHTML='<div class="summary-strip">'+[
    ['Months',lines.length],['Monthly Cash',money(cash)],['Discount',money(discount)],['Fine',money(fine)],['Annual Fund',money(annual)],['Refund',money(refund)],['Net Cash',money(cash+annual-refund)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('')+'</div><div class="page-subtitle" style="margin-top:12px">'+(lines.length?'Selected: '+lines.map(x=>MONTHS[x.fee_month-1]).join(', '):'No monthly fee selected.')+'</div>';
}
function render(){renderLedgerSummary();renderMonthGrid();renderReceiptSummary()}
async function save(){
  if(!selectedId)return PopupService.warning('Select a student first.');
  const input={student_id:selectedId,fee_year:Number(document.getElementById('fee-year').value),payment_date:document.getElementById('fee-date').value,annual_fund_paid:Number(document.getElementById('fee-annual').value||0),refund_amount:Number(document.getElementById('fee-refund').value||0),notes:document.getElementById('fee-notes').value,months:selectedLines(),source_device:navigator.userAgent.slice(0,180)};
  try{
    const result=await FeeService.save(AppContext.state,input),s=AppContext.state.students.find(x=>x.id===selectedId);
    if(result.receipt)await ActivityService.log(AppContext.state,{action:'fee_receipt_saved',entity_type:'fee_receipt',entity_id:result.receipt.id,message:'Fee receipt saved for '+s.student_name,amount:input.months.reduce((a,x)=>a+Number(x.cash_paid||0),0)+Number(input.annual_fund_paid||0)});
    if(result.refund)await ActivityService.log(AppContext.state,{action:'refund_added',entity_type:'refund',entity_id:result.refund.id,message:'Refund recorded for '+s.student_name,amount:Number(input.refund_amount||0)});
    await AppContext.save();
    if(result.queued)PopupService.warning('Saved offline. Official receipt number will be assigned after sync.');else PopupService.success(result.receipt?'Fee Slip generated: '+result.receipt.receipt_no:'Refund recorded.');
    if(result.receipt){await AppContext.setSelectedSlip(result.receipt.id);await AppContext.navigate('fee-slip')}else render();
  }catch(e){PopupService.error(e.message)}
}
export default{
  async init(){
    document.getElementById('fee-series-badge').textContent='Fee Series: '+(AppContext.state.settings.fee_receipt_prefix||'UES');
    document.getElementById('fee-year').value=new Date().getFullYear();document.getElementById('fee-date').value=today();
    setupStudents();
    const pre=sessionStorage.getItem('umeed:student');if(pre){sessionStorage.removeItem('umeed:student');selectStudent(pre)}else render();
    document.getElementById('fee-year').onchange=()=>{selectedMonths.clear();render()};
    document.getElementById('fee-annual').oninput=renderReceiptSummary;document.getElementById('fee-refund').oninput=renderReceiptSummary;
    document.getElementById('select-pending').onclick=()=>{const l=ledger();if(!l)return;selectedMonths=new Set(l.monthly.filter(m=>m.pending>0).map(m=>m.month));renderMonthGrid();renderReceiptSummary()};
    document.getElementById('select-full-year').onclick=()=>{const l=ledger();if(!l)return;selectedMonths=new Set(l.monthly.filter(m=>m.pending>0).map(m=>m.month));renderMonthGrid();renderReceiptSummary()};
    document.getElementById('clear-months').onclick=()=>{selectedMonths.clear();renderMonthGrid();renderReceiptSummary()};
    document.getElementById('save-fee-receipt').onclick=save;
    document.getElementById('fee-whatsapp').onclick=()=>{try{if(!selectedId)throw new Error('Select a student first.');WhatsAppService.open(AppContext.state,selectedId,WhatsAppService.reminder(AppContext.state,selectedId,Number(document.getElementById('fee-year').value)));PopupService.success('WhatsApp opened.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('fee-offline-banner').innerHTML=navigator.onLine?'':'<div class="sync-banner"><div><b>Offline Accountant Mode</b><div class="page-subtitle">Entries save to this device and will synchronize automatically when the accountant reconnects.</div></div></div>';
  },
  destroy(){document.getElementById('fee-student-options')?.remove()}
};