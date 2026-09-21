import {AppContext} from '../app-context.js';
import {computeStudentLedger,money} from '../ledger-engine.js';
import {MONTHS} from '../config.js';
import {escapeHtml,className,optionList} from '../dom-utils.js';
import {debounce} from '../validation-service.js';

let page=1;const PAGE=18;
function filtered(){
  const q=(document.getElementById('ledger-search')?.value||'').trim().toLowerCase(),cid=document.getElementById('ledger-class')?.value||'';
  return AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted'&&(!cid||s.class_id===cid)&&(!q||[s.roll_number,s.student_name,s.father_name,s.phone_number,className(AppContext.state,s.class_id)].join(' ').toLowerCase().includes(q)));
}
function card(s,year){
  const l=computeStudentLedger(AppContext.state,s.id,year);return '<article class="ledger-card"><div class="ledger-head"><div><h3>'+escapeHtml(s.student_name)+'</h3><div class="ledger-meta">Roll '+escapeHtml(s.roll_number)+' · '+escapeHtml(className(AppContext.state,s.class_id))+'<br>Parent/Guardian: '+escapeHtml(s.father_name)+' · '+escapeHtml(s.phone_number||'No phone')+'</div></div><button class="btn btn-gold" data-open-ledger="'+s.id+'">Open</button></div><div class="ledger-kpis">'+[
    ['Class Fee',money(l.classMonthlyFee)],['Total Cash',money(l.totalCash)],['Paid Months',l.paidMonths+'/12'],['Partial',l.partialMonths],['Annual Pending',money(l.annualPending)],['Total Pending',money(l.totalPending)]
  ].map(x=>'<div class="mini-kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div><div class="month-grid">'+l.monthly.map(m=>'<div class="month-cell '+m.status.toLowerCase()+'">'+m.name.slice(0,3)+'<br>'+m.status+'<br>'+money(m.pending)+'</div>').join('')+'</div></article>';
}
function transactionRow(t){
  if(t._type==='refund')return '<tr><td>Refund</td><td>'+escapeHtml(t.refund_date||t.created_at||'-')+'</td><td>-</td><td>'+money(t.amount||t.refund_amount)+'</td><td>-</td><td>-</td><td>-</td><td>'+escapeHtml(t.notes||'-')+'</td></tr>';
  if(t._type==='fee_receipt')return '<tr><td>Fee Slip</td><td>'+escapeHtml(t.payment_date||'-')+'</td><td>'+escapeHtml(t.month_labels||'Annual Fund')+'</td><td>'+money(t.cash_paid)+'</td><td>'+money(t.discount)+'</td><td>'+money(t.fine)+'</td><td>'+money(t.annual_fund_paid)+'</td><td>'+escapeHtml(t.receipt_no||'Pending Sync')+'</td></tr>';
  return '<tr><td>Fee (Legacy)</td><td>'+escapeHtml(t.payment_date||'-')+'</td><td>'+escapeHtml(MONTHS[Number(t.fee_month)-1]||'-')+'</td><td>'+money(t.cash_paid)+'</td><td>'+money(t.discount)+'</td><td>'+money(t.fine)+'</td><td>'+money(t.annual_fund_paid)+'</td><td>'+escapeHtml(t.receipt_no||'-')+'</td></tr>';
}
function render(){
  const rows=filtered(),year=Number(document.getElementById('ledger-year').value||new Date().getFullYear()),pages=Math.max(1,Math.ceil(rows.length/PAGE));page=Math.min(page,pages);
  document.getElementById('ledger-list').innerHTML='<div class="grid-3">'+rows.slice((page-1)*PAGE,page*PAGE).map(s=>card(s,year)).join('')+'</div>'+(rows.length?'':'<div class="empty-state">No students found.</div>');
  document.getElementById('ledger-pagination').innerHTML='<span style="margin-right:auto;color:#9a8e7e;font-size:11px">'+rows.length+' student(s)</span><button id="ledger-prev">Previous</button><span>Page '+page+' / '+pages+'</span><button id="ledger-next">Next</button>';
  document.getElementById('ledger-prev').disabled=page<=1;document.getElementById('ledger-next').disabled=page>=pages;document.getElementById('ledger-prev').onclick=()=>{page--;render()};document.getElementById('ledger-next').onclick=()=>{page++;render()};
  document.querySelectorAll('[data-open-ledger]').forEach(b=>b.onclick=()=>openDetail(b.dataset.openLedger,year));
}
function openDetail(id,year){
  const l=computeStudentLedger(AppContext.state,id,year);if(!l)return;const s=l.student,root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';box.style.width='min(1050px,96vw)';
  const canAdd=!['auditor'].includes(AppContext.profile?.role||'');
  box.innerHTML='<h3>'+escapeHtml(s.student_name)+' — '+year+'</h3><p>Roll '+escapeHtml(s.roll_number)+' · '+escapeHtml(className(AppContext.state,s.class_id))+' · Parent/Guardian: '+escapeHtml(s.father_name)+' · '+escapeHtml(s.phone_number)+'</p><div class="summary-strip">'+[
    ['Class Monthly Fee',money(l.classMonthlyFee)],['Total Cash',money(l.totalCash)],['Paid Months',l.paidMonths+'/12'],['Annual Paid',money(l.annualPaid)],['Annual Pending',money(l.annualPending)],['Refunds',money(l.totalRefund)],['Total Pending',money(l.totalPending)]
  ].map(x=>'<div class="summary-item"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('')+'</div><div class="table-outer" style="margin-top:12px"><table><thead><tr><th>Type</th><th>Date</th><th>Month(s)</th><th>Cash / Refund</th><th>Discount</th><th>Fine</th><th>Annual Fund</th><th>Receipt / Note</th></tr></thead><tbody>'+l.transactions.map(transactionRow).join('')+'</tbody></table></div><div class="actions" style="margin-top:12px"><button id="ledger-close" class="btn btn-gold">Close</button>'+(canAdd?'<button id="ledger-fee" class="btn btn-ghost">Add Fee</button>':'')+'</div>';
  back.appendChild(box);root.appendChild(back);document.getElementById('ledger-close').onclick=()=>back.remove();const fee=document.getElementById('ledger-fee');if(fee)fee.onclick=()=>{back.remove();sessionStorage.setItem('umeed:student',id);AppContext.navigate('fee-entry')};
}
export default{
  async init(){
    document.getElementById('ledger-year').value=new Date().getFullYear();document.getElementById('ledger-class').innerHTML='<option value="">All Classes</option>'+optionList(AppContext.state.classes,'','id',c=>c.class_name);
    const pre=sessionStorage.getItem('umeed:student');if(pre){sessionStorage.removeItem('umeed:student');const st=AppContext.state.students.find(s=>s.id===pre);if(st)document.getElementById('ledger-search').value=st.roll_number}
    const f=debounce(()=>{page=1;render()},220);document.getElementById('ledger-search').oninput=f;document.getElementById('ledger-class').onchange=f;document.getElementById('ledger-year').onchange=f;render();
  },destroy(){}
};