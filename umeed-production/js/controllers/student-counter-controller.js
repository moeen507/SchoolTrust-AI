import {AppContext} from '../app-context.js';
import {CounterService} from '../counter-service.js';
import {ActivityService} from '../activity-service.js';
import {PopupService} from '../popup-service.js';
import {escapeHtml,className,today} from '../dom-utils.js';
import {money} from '../ledger-engine.js';

let selectedStudentId=null,cart=[],currentSale=null;

function studentLabel(s){return [s.roll_number,s.student_name,className(AppContext.state,s.class_id),s.phone_number].filter(Boolean).join(' — ')}
function setupStudents(){
  const input=document.getElementById('counter-student-search'),list=document.createElement('datalist');list.id='counter-student-options';
  list.innerHTML=AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted').map(s=>'<option value="'+escapeHtml(studentLabel(s))+'"></option>').join('');
  document.body.appendChild(list);input.setAttribute('list',list.id);
  const resolve=()=>{const v=input.value.trim().toLowerCase(),s=AppContext.state.students.find(x=>studentLabel(x).toLowerCase()===v||String(x.roll_number).toLowerCase()===v||String(x.phone_number||'').toLowerCase()===v);if(s)selectStudent(s.id)};
  input.onchange=resolve;input.onblur=resolve;
}
function selectStudent(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;selectedStudentId=id;
  document.getElementById('counter-student-id').value=id;document.getElementById('counter-student-search').value=studentLabel(s);
  document.getElementById('counter-roll').value=s.roll_number;document.getElementById('counter-class').value=className(AppContext.state,s.class_id);document.getElementById('counter-father').value=s.father_name;
}
function catalog(){
  const channel=document.getElementById('counter-channel').value,select=document.getElementById('counter-item-select');
  const items=(AppContext.state.catalogItems||[]).filter(i=>i.channel===channel&&String(i.status||'active')==='active').sort((a,b)=>String(a.item_name).localeCompare(String(b.item_name)));
  select.innerHTML='<option value="">Custom / Select Item</option>'+items.map(i=>'<option value="'+i.id+'">'+escapeHtml(i.item_name)+' — '+money(i.unit_price)+'</option>').join('');
  select.onchange=()=>{const i=items.find(x=>x.id===select.value);if(i){document.getElementById('counter-item-name').value=i.item_name;document.getElementById('counter-item-price').value=i.unit_price}else{document.getElementById('counter-item-name').value='';document.getElementById('counter-item-price').value=''}};
}
function renderCart(){
  const total=CounterService.total(cart);
  document.getElementById('counter-cart').innerHTML=cart.length?'<div class="table-outer"><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead><tbody>'+cart.map((i,idx)=>'<tr><td>'+escapeHtml(i.item_name)+'</td><td>'+i.quantity+'</td><td>'+money(i.unit_price)+'</td><td>'+money(i.quantity*i.unit_price)+'</td><td><button class="btn btn-red" data-cart-remove="'+idx+'">Remove</button></td></tr>').join('')+'<tr><td colspan="3"><b>Slip Total</b></td><td><b>'+money(total)+'</b></td><td></td></tr></tbody></table></div>':'<div class="empty-state">No items on this slip.</div>';
  document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.cartRemove),1);renderCart()});
}
function addItem(){
  const catalogId=document.getElementById('counter-item-select').value||null;
  const name=document.getElementById('counter-item-name').value.trim(),qty=Number(document.getElementById('counter-item-qty').value||0),price=Number(document.getElementById('counter-item-price').value||0);
  if(!name)return PopupService.warning('Enter or select an item name.');if(qty<=0)return PopupService.warning('Quantity must be greater than zero.');if(price<0)return PopupService.warning('Price cannot be negative.');
  cart.push({catalog_item_id:catalogId,item_name:name,quantity:qty,unit_price:price});renderCart();
  document.getElementById('counter-item-select').value='';document.getElementById('counter-item-name').value='';document.getElementById('counter-item-price').value='';document.getElementById('counter-item-qty').value='1';
}
function saleItems(sale){return CounterService.items(AppContext.state,sale.id)}
function renderSlip(sale){
  currentSale=sale;if(!sale){document.getElementById('counter-slip-host').innerHTML='<div class="empty-state">Save or select a counter receipt to preview it.</div>';return}
  const s=AppContext.state.students.find(x=>x.id===sale.student_id),items=saleItems(sale);
  const title=sale.channel==='canteen'?'CANTEEN':'STUDENT SYLLABUS / STORE';
  document.getElementById('counter-slip-host').innerHTML='<article class="a5-slip counter-slip" id="print-counter-slip"><header><img src="assets/logo.svg" alt="" width="54"><h2>'+escapeHtml(AppContext.state.settings.school_name||'UMEED Education System')+'</h2><div>'+title+' RECEIPT</div>'+(!sale.receipt_no?'<strong style="color:#b10515">PENDING CLOUD SYNC — NOT AN OFFICIAL RECEIPT NUMBER</strong>':'')+'</header><div class="slip-grid"><div class="slip-row"><b>Receipt:</b> '+escapeHtml(sale.receipt_no||'Pending Sync')+'</div><div class="slip-row"><b>Date:</b> '+escapeHtml(sale.sale_date)+'</div><div class="slip-row"><b>Student:</b> '+escapeHtml(s?.student_name||'-')+'</div><div class="slip-row"><b>Roll No:</b> '+escapeHtml(s?.roll_number||'-')+'</div><div class="slip-row"><b>Class:</b> '+escapeHtml(className(AppContext.state,s?.class_id))+'</div><div class="slip-row"><b>Father:</b> '+escapeHtml(s?.father_name||'-')+'</div></div><div class="table-outer counter-slip-table" style="margin-top:12px"><table style="min-width:0;color:#111"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>'+items.map(i=>'<tr><td>'+escapeHtml(i.item_name)+'</td><td>'+i.quantity+'</td><td>'+money(i.unit_price)+'</td><td>'+money(i.line_total)+'</td></tr>').join('')+'<tr><td colspan="3"><b>Total</b></td><td><b>'+money(sale.total)+'</b></td></tr></tbody></table></div><div style="display:flex;justify-content:space-between;margin-top:28px;font-size:11px"><span>Prepared by: '+escapeHtml(AppContext.state.settings.prepared_by||'Admin/Cashier')+'</span><span>Signature: __________________</span></div></article>';
}
function renderRecent(){
  const rows=[...(AppContext.state.counterSales||[])].filter(s=>String(s.status||'active')!=='reversed').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,20);
  document.getElementById('counter-recent').innerHTML='<div class="table-outer"><table><thead><tr><th>Receipt</th><th>Date</th><th>Type</th><th>Student</th><th>Class</th><th>Total</th><th></th></tr></thead><tbody>'+(rows.length?rows.map(r=>{const s=AppContext.state.students.find(x=>x.id===r.student_id);return '<tr><td><b>'+escapeHtml(r.receipt_no||'Pending Sync')+'</b></td><td>'+escapeHtml(r.sale_date)+'</td><td><span class="badge '+(r.channel==='canteen'?'warn':'gold')+'">'+(r.channel==='canteen'?'Canteen':'Syllabus')+'</span></td><td>'+escapeHtml(s?.student_name||'-')+'</td><td>'+escapeHtml(className(AppContext.state,s?.class_id))+'</td><td>'+money(r.total)+'</td><td><button class="btn btn-ghost" data-counter-open="'+r.id+'">Open</button></td></tr>'}).join(''):'<tr><td colspan="7"><div class="empty-state">No Syllabus/Canteen receipts yet.</div></td></tr>')+'</tbody></table></div>';
  document.querySelectorAll('[data-counter-open]').forEach(b=>b.onclick=()=>renderSlip(AppContext.state.counterSales.find(x=>x.id===b.dataset.counterOpen)));
}
async function save(){
  try{
    if(!selectedStudentId)throw new Error('Select a student first.');
    const result=await CounterService.save(AppContext.state,{student_id:selectedStudentId,channel:document.getElementById('counter-channel').value,sale_date:document.getElementById('counter-date').value,notes:document.getElementById('counter-notes').value,items:cart,source_device:navigator.userAgent.slice(0,180)});
    const student=AppContext.state.students.find(s=>s.id===selectedStudentId);
    await ActivityService.log(AppContext.state,{action:'counter_sale',entity_type:'counter_sale',entity_id:result.sale.id,message:(result.sale.channel==='canteen'?'Canteen':'Syllabus')+' sale for '+student.student_name,amount:Number(result.sale.total)});
    await AppContext.setSelectedCounterSale(result.sale.id);await AppContext.save();cart=[];renderCart();renderRecent();renderSlip(result.sale);
    if(result.queued)PopupService.warning('Counter sale saved offline. Official shared receipt number will be assigned after Manual Sync.');else PopupService.success('Syllabus/Canteen receipt saved: '+result.sale.receipt_no);
  }catch(e){PopupService.error(e.message)}
}
export default{
  async init(){
    document.getElementById('counter-date').value=today();document.getElementById('counter-series-badge').textContent='Shared Series: '+(AppContext.state.settings.counter_receipt_prefix||'SC');
    setupStudents();catalog();renderCart();renderRecent();
    document.getElementById('counter-channel').onchange=()=>{catalog();cart=[];renderCart()};
    document.getElementById('counter-add-item').onclick=addItem;document.getElementById('counter-save').onclick=save;document.getElementById('counter-clear').onclick=()=>{cart=[];renderCart()};
    document.getElementById('counter-print').onclick=async()=>{if(!currentSale)return PopupService.warning('Open a counter slip first.');if(!currentSale.receipt_no)return PopupService.warning('Sync this offline receipt before official printing.');try{document.body.classList.add('counter-printing');if(window.umeedDesktop?.printA5){const r=await window.umeedDesktop.printA5();if(!r?.ok)throw new Error(r?.error||'Print failed')}else window.print();setTimeout(()=>document.body.classList.remove('counter-printing'),300)}catch(e){document.body.classList.remove('counter-printing');PopupService.error(e.message)}};
    document.getElementById('counter-offline-banner').innerHTML=navigator.onLine?'':'<div class="sync-banner"><div><b>Offline mode</b><div class="page-subtitle">Sale can be queued, but the official shared Syllabus/Canteen receipt number is issued only after Manual Sync.</div></div></div>';
    const pre=AppContext.state.selectedCounterSaleId&&AppContext.state.counterSales.find(x=>x.id===AppContext.state.selectedCounterSaleId);if(pre)renderSlip(pre);
  },
  destroy(){document.getElementById('counter-student-options')?.remove();document.body.classList.remove('counter-printing')}
};