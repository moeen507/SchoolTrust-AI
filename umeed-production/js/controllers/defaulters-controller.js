import {AppContext} from '../app-context.js';
import {ReportsEngine} from '../reports-engine.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {PopupService} from '../popup-service.js';
import {MONTHS} from '../config.js';
import {money} from '../ledger-engine.js';
import {escapeHtml,className,optionList} from '../dom-utils.js';
import {debounce} from '../validation-service.js';

function filters(){return {query:document.getElementById('def-search').value||'',classId:document.getElementById('def-class').value||''}}
function month(){return Number(document.getElementById('def-month').value)}
function year(){return Number(document.getElementById('def-year').value)}
function render(){
  const rows=ReportsEngine.monthDefaulters(AppContext.state,month(),year(),filters()),total=rows.reduce((a,x)=>a+x.month.pending+x.ledger.annualPending,0);
  document.getElementById('def-stats').innerHTML=[
    ['Defaulter Students',rows.length],['Selected Month',MONTHS[month()-1]+' '+year()],['Outstanding',money(total)],['Reminder Date','From 7th']
  ].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
  document.getElementById('def-table').innerHTML='<div class="table-outer"><table><thead><tr><th>Roll</th><th>Student</th><th>Parent / Guardian</th><th>Class</th><th>Phone</th><th>Monthly Fee</th><th>Covered</th><th>Month Pending</th><th>Annual Pending</th><th>Total Due</th><th></th></tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td><b>'+escapeHtml(x.student.roll_number)+'</b></td><td>'+escapeHtml(x.student.student_name)+'</td><td>'+escapeHtml(x.student.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,x.student.class_id))+'</td><td>'+escapeHtml(x.student.phone_number||'-')+'</td><td>'+money(x.month.baseFee)+'</td><td>'+money(x.month.covered)+'</td><td>'+money(x.month.pending)+'</td><td>'+money(x.ledger.annualPending)+'</td><td><b>'+money(x.month.pending+x.ledger.annualPending)+'</b></td><td><button class="btn btn-green" data-def-wa="'+x.student.id+'">WhatsApp</button></td></tr>').join(''):'<tr><td colspan="11"><div class="empty-state">No defaulters for the selected month.</div></td></tr>')+'</tbody></table></div>';
  document.querySelectorAll('[data-def-wa]').forEach(b=>b.onclick=()=>{try{WhatsAppService.open(AppContext.state,b.dataset.defWa,WhatsAppService.reminder(AppContext.state,b.dataset.defWa,year(),month()));PopupService.success('WhatsApp reminder opened.')}catch(e){PopupService.error(e.message)}});
}
export default{
  async init(){
    document.getElementById('def-month').innerHTML=MONTHS.map((m,i)=>'<option value="'+(i+1)+'" '+(i===new Date().getMonth()?'selected':'')+'>'+m+'</option>').join('');
    document.getElementById('def-year').value=new Date().getFullYear();document.getElementById('def-class').innerHTML='<option value="">All Classes</option>'+optionList(AppContext.state.classes,'','id',c=>c.class_name);
    const f=debounce(render,180);document.getElementById('def-search').oninput=f;document.getElementById('def-class').onchange=render;document.getElementById('def-month').onchange=render;document.getElementById('def-year').onchange=render;document.getElementById('def-refresh').onclick=render;render();
  },destroy(){}
};