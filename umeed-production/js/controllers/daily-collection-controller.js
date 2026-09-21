import {AppContext} from '../app-context.js';
import {DailyCollectionService} from '../daily-collection-service.js';
import {ExportService} from '../export-service.js';
import {money} from '../ledger-engine.js';
import {escapeHtml,today} from '../dom-utils.js';
import {debounce} from '../validation-service.js';

let current=null;
function render(){
  const date=document.getElementById('collection-date').value||today();current=DailyCollectionService.build(AppContext.state,date);
  document.getElementById('collection-stats').innerHTML=[
    ['Monthly Fee Cash',money(current.feeCash)],['Annual Fund',money(current.annualFund)],['Syllabus',money(current.syllabus)],
    ['Canteen',money(current.canteen)],['Gross Collection',money(current.gross)],['Refunds',money(current.refunds)],['Net Collection',money(current.net)],['Slips / Rows',current.rows.length]
  ].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
  document.getElementById('collection-summary-label').textContent='Collection date: '+date+' · Net '+money(current.net);
  renderTable();
}
function renderTable(){
  const q=(document.getElementById('collection-search').value||'').toLowerCase().trim();
  const rows=current.rows.filter(r=>!q||[r.receipt_no,r.roll,r.student,r.guardian,r.class_name,r.type,r.details].join(' ').toLowerCase().includes(q));
  document.getElementById('collection-table').innerHTML='<div class="table-outer"><table><thead><tr><th>Slip No.</th><th>Type</th><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th>Details</th><th>Amount</th></tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr><td><b>'+escapeHtml(r.receipt_no)+'</b></td><td><span class="badge '+(r.type==='Refund'?'red':r.type==='Canteen'?'warn':r.type==='Syllabus'?'gold':'green')+'">'+escapeHtml(r.type)+'</span></td><td>'+escapeHtml(r.roll)+'</td><td>'+escapeHtml(r.student)+'</td><td>'+escapeHtml(r.guardian)+'</td><td>'+escapeHtml(r.class_name)+'</td><td>'+escapeHtml(r.details)+'</td><td><b>'+money(r.amount)+'</b></td></tr>').join(''):'<tr><td colspan="8"><div class="empty-state">No collection records for this date.</div></td></tr>')+'</tbody></table></div>';
}
export default{
  async init(){
    document.getElementById('collection-date').value=today();document.getElementById('collection-refresh').onclick=render;
    document.getElementById('collection-date').onchange=render;document.getElementById('collection-search').oninput=debounce(renderTable,180);
    document.getElementById('collection-export').onclick=()=>{if(!current)render();ExportService.csv(current.rows.map(r=>({date:current.date,slip_no:r.receipt_no,type:r.type,roll:r.roll,student:r.student,parent_guardian:r.guardian,class:r.class_name,details:r.details,amount:r.amount})),'UMEED-Daily-Collection-'+current.date+'.csv')};
    render();
  },destroy(){}
};