import {MONTHS} from './config.js';
import {load,persist,uid,now,today,queue,activity,exportBackup,importBackup,csvDownload,resetOperationalData} from './storage.js';
import {money,studentById,classById,computeStudentLedger,dashboardMetrics,nextSlipNumber,normalizePakPhone} from './ledger.js';
import {healthCheck,syncPending} from './sync.js';

let state=load();
const ui={reportMode:'month',reportMonth:MONTHS[new Date().getMonth()],reportYear:new Date().getFullYear(),selectedSlip:null,importRows:[]};
const pages=[
 ['dashboard','Dashboard','Live overview, collections and recent activity'],
 ['students','Student Registry','Add, import, search and class-wise records'],
 ['fee-entry','Fee Entry','Monthly fee, annual fund, refunds and receipt generation'],
 ['ledger','Student Ledger','Premium 12-month student financial ledger'],
 ['fee-slip','Fee Slip','A5 receipt search, print and WhatsApp'],
 ['d6','D6 / Database','Backup, restore, exports and sync control center'],
 ['reports','Reports','Monthly/yearly defaulters, refunds and student history'],
 ['whatsapp','WhatsApp','Accurate ledger-based parent reminders'],
 ['settings','Settings','School, fee, printing and Supabase configuration']
];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function save(renderNow=true){persist(state);if(renderNow)render()}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3300)}
function activeStudents(){return state.students.filter(s=>s.status!=='Deleted')}
function showModal(html){const m=$('modalRoot');m.innerHTML='<div class="modal">'+html+'</div>';m.classList.remove('hidden')}
function closeModal(){$('modalRoot').classList.add('hidden');$('modalRoot').innerHTML=''}
function badge(status){return '<span class="badge '+String(status||'neutral').toLowerCase()+'">'+esc(status||'-')+'</span>'}
function nav(){
 $('nav').innerHTML=pages.map(p=>'<button class="navBtn '+(state.meta.activePage===p[0]?'active':'')+'" data-page="'+p[0]+'">'+p[1]+'</button>').join('');
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.meta.activePage=b.dataset.page;save(false);render();if(innerWidth<760)$('sidebar').classList.remove('open')});
}
function updateShell(){
 const p=pages.find(x=>x[0]===state.meta.activePage)||pages[0];
 $('pageTitle').textContent=p[1];$('pageSub').textContent=p[2];$('yearBadge').textContent=new Date().getFullYear();
 const pending=state.syncQueue.filter(x=>x.status==='pending').length;
 $('pendingSync').textContent=pending+' change'+(pending===1?'':'s')+' pending';
}
function render(){
 nav();updateShell();
 const f={
  dashboard:dashboardPage,students:studentsPage,'fee-entry':feeEntryPage,ledger:ledgerPage,'fee-slip':slipPage,d6:d6Page,reports:reportsPage,whatsapp:whatsappPage,settings:settingsPage
 }[state.meta.activePage]||dashboardPage;
 $('content').innerHTML=f();bindPage();
}
function metric(label,value,sub){return '<div class="card metric"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub">'+sub+'</div></div>'}
function dashboardPage(){
 const y=new Date().getFullYear(),m=dashboardMetrics(state,y);
 const monthTotals=MONTHS.map(mon=>state.feeEntries.filter(e=>e.status!=='Deleted'&&+e.fee_year===y&&e.fee_month===mon).reduce((a,e)=>a+Number(e.cash_paid||0)+Number(e.annual_fund_paid||0),0));
 const max=Math.max(1,...monthTotals);
 const chart='<div class="chart">'+monthTotals.map((v,i)=>'<div class="barCol"><div class="bar" style="height:'+Math.max(2,Math.round(v/max*150))+'px"></div><span>'+MONTHS[i].slice(0,3)+'</span></div>').join('')+'</div>';
 const activityRows=state.activityLog.slice(0,8).map(a=>'<div class="activity"><div><b>'+esc(a.message)+'</b><br><small>'+new Date(a.createdAt).toLocaleString()+'</small></div><div>'+((a.amount!==null&&a.amount!==undefined)?money(a.amount):'')+'</div></div>').join('')||'<div class="empty">No activity yet.</div>';
 return '<div class="grid cols4">'+
 metric('Total Students',m.students,'Active student registry')+
 metric('Cash Received',money(m.cash),'Monthly + annual fund cash')+
 metric('Discount Given',money(m.discount),'Concession, not cash')+
 metric('Annual Fund',money(m.annual),'Collected annual fund')+
 metric('Total Pending',money(m.pending),'Monthly + annual fund dues')+
 metric('Defaulters',m.defaulters,'Students with pending balance')+
 metric('Refunds',money(m.refunds),'Refunded cash tracked separately')+
 metric('Pending Sync',state.syncQueue.filter(x=>x.status==='pending').length,'Manual cloud upload queue')+
 '</div><div class="grid cols2" style="margin-top:12px"><div class="card"><div class="sectionHead"><div><h3>'+y+' Collection Trend</h3><p>Cash and annual fund received</p></div></div>'+chart+'</div><div class="card"><div class="sectionHead"><div><h3>Recent Activity</h3><p>Real local transactions only</p></div></div><div class="activityList">'+activityRows+'</div></div></div>';
}
function studentsPage(){
 const students=activeStudents();
 return '<div class="grid cols4">'+metric('Students',students.length,'Current active records')+metric('Classes',new Set(students.map(s=>s.class_id)).size,'Classes with students')+metric('No Phone',students.filter(s=>!s.phone_number).length,'Missing parent contact')+metric('Pending Sync',state.syncQueue.filter(x=>x.table==='students'&&x.status==='pending').length,'Student changes not uploaded')+'</div>'+
 '<div class="sectionHead"><div><h2>Student Registry</h2><p>Search, filter, import and manage real students</p></div><div class="actions"><button class="btn" data-action="import-students">Import Excel/CSV</button><button class="btn" data-action="export-students">Export CSV</button><button class="btn gold" data-action="student-new">+ Add Student</button></div></div>'+
 '<div class="filters"><input id="studentSearch" placeholder="Search roll, student, father, phone"><select id="studentClass"><option value="">All Classes</option>'+classOptions('')+'</select><select id="studentStatus"><option>Active</option><option>Deleted</option></select></div><div id="studentTable">'+studentTable(students)+'</div>';
}
function classOptions(selected){return state.classes.filter(c=>c.status!=='Deleted').map(c=>'<option value="'+c.id+'" '+(selected===c.id?'selected':'')+'>'+esc(classById(state,c.id))+'</option>').join('')}
function studentTable(rows){
 return '<div class="tableWrap"><table><thead><tr><th>Roll</th><th>Student</th><th>Father</th><th>Class</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
 (rows.length?rows.map(s=>'<tr><td><b>'+esc(s.roll_number)+'</b></td><td>'+esc(s.student_name)+'</td><td>'+esc(s.father_name)+'</td><td>'+esc(classById(state,s.class_id))+'</td><td>'+esc(s.phone_number||'-')+'</td><td>'+badge(s.status||'Active')+'</td><td class="actions"><button class="btn" data-action="student-edit" data-id="'+s.id+'">Edit</button><button class="btn" data-action="ledger-open" data-id="'+s.id+'">Ledger</button><button class="btn gold" data-action="fee-for" data-id="'+s.id+'">Fee</button><button class="btn red" data-action="student-delete" data-id="'+s.id+'">Delete</button></td></tr>').join(''):'<tr><td colspan="7"><div class="empty">No students yet. Import Excel/CSV or add the first student.</div></td></tr>')+
 '</tbody></table></div>';
}
function feeEntryPage(){
 const slip=nextSlipNumber(state);
 return '<div class="syncNotice"><div><b>Manual Sync Mode</b><br><span class="studentMeta">Fee entries are saved locally first. Review them, then use Sync Pending Data.</span></div><button class="btn gold" data-action="sync-now">Sync Pending Data</button></div>'+
 '<div class="card"><div class="sectionHead"><div><h2>Fee Entry</h2><p>One form for monthly fee, annual fund, fine, discount and refund</p></div><span class="badge neutral">Next Slip: '+esc(slip)+'</span></div>'+
 '<form id="feeForm" class="formGrid"><div class="field span2"><label>Student</label><select name="student_id" id="feeStudent" required><option value="">Select student by roll / name / class</option>'+activeStudents().map(s=>'<option value="'+s.id+'">'+esc(s.roll_number)+' — '+esc(s.student_name)+' — '+esc(classById(state,s.class_id))+'</option>').join('')+'</select></div><div class="field"><label>Payment Date</label><input name="payment_date" type="date" value="'+today()+'" required></div>'+
 '<div class="field"><label>Month</label><select name="fee_month">'+MONTHS.map(m=>'<option '+(m===MONTHS[new Date().getMonth()]?'selected':'')+'>'+m+'</option>').join('')+'</select></div><div class="field"><label>Year</label><input name="fee_year" type="number" value="'+new Date().getFullYear()+'" required></div><div class="field"><label>Monthly Fee</label><input name="monthly_fee" type="number" value="'+Number(state.settings.monthlyFee||2000)+'" readonly></div>'+
 '<div class="field"><label>Cash Paid</label><input name="cash_paid" type="number" min="0" value="0"></div><div class="field"><label>Discount / Concession</label><input name="discount" type="number" min="0" value="0"></div><div class="field"><label>Fine</label><input name="fine" type="number" min="0" value="0"></div>'+
 '<div class="field"><label>Annual Fund Payment</label><input name="annual_fund_paid" type="number" min="0" value="0"><span class="studentMeta">Annual target: '+money(state.settings.annualFund)+'</span></div><div class="field"><label>Refund Amount</label><input name="refund_amount" type="number" min="0" value="0"></div><div class="field"><label>Payment Method</label><select name="payment_method"><option>Cash</option><option>Bank</option><option>EasyPaisa</option><option>JazzCash</option></select></div>'+
 '<div class="field span3"><label>Notes / Refund Reason</label><textarea name="notes" rows="2"></textarea></div><div class="span3 actions"><button class="btn gold" type="submit">Save Fee & Generate Slip</button><button class="btn" type="button" data-action="slip-latest">Open Latest Slip</button></div></form></div>'+
 '<div class="sectionHead"><div><h3>Recent Fee Entries</h3><p>Latest saved local transactions</p></div></div>'+feeTable(state.feeEntries.filter(e=>e.status!=='Deleted').slice().sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,12));
}
function feeTable(rows){
 return '<div class="tableWrap"><table><thead><tr><th>Slip</th><th>Student</th><th>Month</th><th>Cash</th><th>Discount</th><th>Fine</th><th>Annual</th><th>Pending</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
 (rows.length?rows.map(e=>{const s=studentById(state,e.student_id);return '<tr><td>'+esc(e.slip_no||'-')+'</td><td><b>'+esc(s?.student_name||'-')+'</b><br><small>'+esc(classById(state,e.class_id))+'</small></td><td>'+esc(e.fee_month)+' '+e.fee_year+'</td><td>'+money(e.cash_paid)+'</td><td>'+money(e.discount)+'</td><td>'+money(e.fine)+'</td><td>'+money(e.annual_fund_paid)+'</td><td>'+money(e.monthly_pending)+'</td><td>'+badge(e.monthly_status)+'</td><td class="actions"><button class="btn" data-action="slip-by-entry" data-id="'+e.id+'">Slip</button><button class="btn" data-action="wa-entry" data-id="'+e.id+'">WhatsApp</button></td></tr>'}).join(''):'<tr><td colspan="10"><div class="empty">No fee entries yet.</div></td></tr>')+
 '</tbody></table></div>';
}
function ledgerPage(){
 const y=new Date().getFullYear();
 return '<div class="sectionHead"><div><h2>Student Ledger</h2><p>One centralized ledger engine for all pages and reports</p></div></div><div class="filters"><input id="ledgerSearch" placeholder="Search roll, name, father, phone"><select id="ledgerClass"><option value="">All Classes</option>'+classOptions('')+'</select><input id="ledgerYear" type="number" value="'+y+'"></div><div id="ledgerCards">'+ledgerCards(activeStudents(),y)+'</div>';
}
function ledgerCards(students,year){
 if(!students.length)return '<div class="card empty">No students available.</div>';
 return '<div class="grid cols3">'+students.map(s=>{const l=computeStudentLedger(state,s.id,year);return '<div class="card ledgerCard"><div class="sectionHead"><div><h3>'+esc(s.student_name)+'</h3><p>Roll '+esc(s.roll_number)+' · '+esc(classById(state,s.class_id))+'</p></div><button class="btn gold" data-action="ledger-open" data-id="'+s.id+'">Open</button></div><div class="kpiStrip"><div class="miniKpi"><span>Cash</span><b>'+money(l.totalCash)+'</b></div><div class="miniKpi"><span>Paid Months</span><b>'+l.paidMonths+'/12</b></div><div class="miniKpi"><span>Annual Paid</span><b>'+money(l.annualPaid)+'</b></div><div class="miniKpi"><span>Pending</span><b>'+money(l.totalPending)+'</b></div><div class="miniKpi"><span>Refund</span><b>'+money(l.totalRefund)+'</b></div><div class="miniKpi"><span>Discount</span><b>'+money(l.totalDiscount)+'</b></div></div><div class="months">'+l.months.map(m=>'<div class="monthCell '+m.status+'">'+m.month.slice(0,3)+'<br>'+m.status+'</div>').join('')+'</div></div>'}).join('')+'</div>';
}
function slipPage(){
 const slips=state.feeSlips.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 const selected=ui.selectedSlip?state.feeSlips.find(s=>s.id===ui.selectedSlip):slips[0];
 return '<div class="sectionHead"><div><h2>A5 Fee Slip</h2><p>Print-safe vertical receipt using exact selected transaction</p></div><div class="actions"><button class="btn" data-action="slip-latest">Latest Slip</button><button class="btn" data-action="slip-search">Search Slip</button><button class="btn gold" data-action="print-slip" '+(!selected?'disabled':'')+'>Print A5</button></div></div>'+(selected?slipHTML(selected):'<div class="card empty">No fee slip has been generated yet.</div>');
}
function slipHTML(slip){
 const st=studentById(state,slip.student_id);const e=state.feeEntries.find(x=>x.id===slip.fee_record_id);if(!st||!e)return '<div class="card empty">Slip record is incomplete.</div>';
 const ledger=computeStudentLedger(state,st.id,+e.fee_year);
 return '<div class="a5Slip" id="printSlip"><div class="slipHeader"><h2>'+esc(state.settings.schoolName)+'</h2><div>OFFICIAL FEE RECEIPT</div><small>'+esc(state.settings.schoolAddress||'')+' '+esc(state.settings.schoolPhone||'')+'</small></div><div class="slipGrid"><div class="slipRow"><b>Receipt:</b> '+esc(slip.slip_number)+'</div><div class="slipRow"><b>Date:</b> '+esc(slip.slip_date)+'</div><div class="slipRow"><b>Student:</b> '+esc(st.student_name)+'</div><div class="slipRow"><b>Father:</b> '+esc(st.father_name)+'</div><div class="slipRow"><b>Roll:</b> '+esc(st.roll_number)+'</div><div class="slipRow"><b>Class:</b> '+esc(classById(state,st.class_id))+'</div><div class="slipRow"><b>Month:</b> '+esc(e.fee_month)+' '+e.fee_year+'</div><div class="slipRow"><b>Phone:</b> '+esc(st.phone_number||'-')+'</div></div><div class="slipTotals"><div class="slipRow">Monthly Fee <b style="float:right">'+money(e.monthly_fee)+'</b></div><div class="slipRow">Discount <b style="float:right">'+money(e.discount)+'</b></div><div class="slipRow">Fine <b style="float:right">'+money(e.fine)+'</b></div><div class="slipRow">Cash Received <b style="float:right">'+money(e.cash_paid)+'</b></div><div class="slipRow">Annual Fund Received <b style="float:right">'+money(e.annual_fund_paid)+'</b></div><div class="slipRow">Refund <b style="float:right">'+money(slip.refund_amount||0)+'</b></div><div class="slipRow">Monthly Status <b style="float:right">'+esc(e.monthly_status)+'</b></div><div class="slipRow">Annual Fund Pending <b style="float:right">'+money(ledger.annualPending)+'</b></div><div class="slipRow"><b>Total Pending</b><b style="float:right">'+money(ledger.totalPending)+'</b></div></div><div class="slipFooter"><div>Prepared by: '+esc(state.settings.preparedBy)+'</div><div>Signature: __________________</div></div></div><div class="actions" style="justify-content:center;margin-top:12px"><button class="btn" data-action="wa-slip" data-id="'+slip.id+'">WhatsApp Slip</button><button class="btn" data-action="copy-slip" data-id="'+slip.id+'">Copy Message</button><button class="btn" data-action="ledger-open" data-id="'+st.id+'">Open Ledger</button></div>';
}
function d6Page(){
 const pending=state.syncQueue.filter(x=>x.status==='pending').length;
 return '<div class="grid cols4">'+metric('Students',state.students.length,'Local records')+metric('Fee Entries',state.feeEntries.length,'Local transactions')+metric('Refunds',state.refunds.length,'Separate refund records')+metric('Pending Sync',pending,'Manual cloud queue')+'</div><div class="grid cols2" style="margin-top:12px"><div class="card"><div class="sectionHead"><div><h3>Backup & Export</h3><p>Local data is primary</p></div></div><div class="actions"><button class="btn gold" data-action="backup">Backup JSON</button><button class="btn" data-action="restore">Restore Backup</button><button class="btn" data-action="export-students">Students CSV</button><button class="btn" data-action="export-fees">Fee CSV</button><button class="btn" data-action="export-ledger">Ledger CSV</button></div></div><div class="card"><div class="sectionHead"><div><h3>Supabase Manual Sync</h3><p>Never overwrites local data silently</p></div></div><p>Last sync: <b>'+esc(state.meta.lastSync?new Date(state.meta.lastSync).toLocaleString():'Never')+'</b></p><p>Pending changes: <b>'+pending+'</b></p><div class="actions"><button class="btn gold" data-action="sync-now">Sync Pending Data</button><button class="btn" data-action="health-check">Check Cloud Schema</button></div></div></div><div class="dangerBox" style="margin-top:12px"><h3>Destructive Controls</h3><p class="studentMeta">Clearing local data requires explicit confirmation. It does not delete Supabase records.</p><button class="btn red" data-action="clear-local">Clear Local Operational Data</button></div>';
}
function reportsPage(){
 const tabs=[['month','Month-wise Defaulters'],['year','Whole Year Defaulters'],['refund','Refund Report'],['history','Student Full History']];
 const tab='<div class="reportTabs">'+tabs.map(t=>'<button class="tabBtn '+(ui.reportMode===t[0]?'active':'')+'" data-report="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>';
 let body='';
 if(ui.reportMode==='month')body=monthReport();
 if(ui.reportMode==='year')body=yearReport();
 if(ui.reportMode==='refund')body=refundReport();
 if(ui.reportMode==='history')body=historyReport();
 return '<div class="sectionHead"><div><h2>Fee Reports</h2><p>Every report uses the same central ledger engine</p></div><div class="actions"><button class="btn" data-action="report-export">Export Current CSV</button><button class="btn" data-action="report-print">Print</button></div></div>'+tab+body;
}
function reportFilters(showMonth=true){return '<div class="filters"><input id="reportSearch" placeholder="Search roll, student, father"><select id="reportClass"><option value="">All Classes</option>'+classOptions('')+'</select>'+(showMonth?'<select id="reportMonth">'+MONTHS.map(m=>'<option '+(m===ui.reportMonth?'selected':'')+'>'+m+'</option>').join('')+'</select>':'')+'<input id="reportYear" type="number" value="'+ui.reportYear+'"></div>'}
function filteredStudentsFromReport(){const q=String($('reportSearch')?.value||'').toLowerCase(),cid=$('reportClass')?.value||'';return activeStudents().filter(s=>(!cid||s.class_id===cid)&&(!q||[s.roll_number,s.student_name,s.father_name].join(' ').toLowerCase().includes(q)))}
function monthReport(){
 const rows=activeStudents().map(s=>{const l=computeStudentLedger(state,s.id,ui.reportYear);const m=l.months.find(x=>x.month===ui.reportMonth);return {s,l,m}}).filter(x=>x.m.pending>0);
 return reportFilters(true)+'<div class="tableWrap"><table><thead><tr><th>Roll</th><th>Student</th><th>Class</th><th>Month</th><th>Fee</th><th>Covered</th><th>Monthly Pending</th><th>Annual Pending</th><th>Total Pending</th><th>Action</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.s.roll_number)+'</td><td>'+esc(x.s.student_name)+'<br><small>'+esc(x.s.father_name)+'</small></td><td>'+esc(classById(state,x.s.class_id))+'</td><td>'+ui.reportMonth+' '+ui.reportYear+'</td><td>'+money(x.m.base+x.m.fine)+'</td><td>'+money(x.m.covered)+'</td><td>'+money(x.m.pending)+'</td><td>'+money(x.l.annualPending)+'</td><td><b>'+money(x.m.pending+x.l.annualPending)+'</b></td><td><button class="btn" data-action="wa-defaulter" data-id="'+x.s.id+'">WhatsApp</button></td></tr>').join('')+'</tbody></table></div>';
}
function yearReport(){
 const rows=activeStudents().map(s=>({s,l:computeStudentLedger(state,s.id,ui.reportYear)})).filter(x=>x.l.totalPending>0);
 return reportFilters(false)+'<div class="tableWrap"><table><thead><tr><th>Roll</th><th>Student</th><th>Father</th><th>Class</th><th>Paid Months</th><th>Partial</th><th>Monthly Pending</th><th>Annual Pending</th><th>Total Pending</th><th>Action</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.s.roll_number)+'</td><td>'+esc(x.s.student_name)+'</td><td>'+esc(x.s.father_name)+'</td><td>'+esc(classById(state,x.s.class_id))+'</td><td>'+x.l.paidMonths+'/12</td><td>'+x.l.partialMonths+'</td><td>'+money(x.l.monthlyPending)+'</td><td>'+money(x.l.annualPending)+'</td><td><b>'+money(x.l.totalPending)+'</b></td><td><button class="btn" data-action="wa-defaulter" data-id="'+x.s.id+'">WhatsApp</button></td></tr>').join('')+'</tbody></table></div>';
}
function refundReport(){
 const rows=state.refunds.filter(r=>r.status!=='Deleted').slice().sort((a,b)=>String(b.refund_date).localeCompare(String(a.refund_date)));
 return reportFilters(false)+'<div class="tableWrap"><table><thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Amount</th><th>Reason</th></tr></thead><tbody>'+rows.map(r=>{const s=studentById(state,r.student_id);return '<tr><td>'+esc(r.refund_date)+'</td><td>'+esc(s?.student_name||'-')+'</td><td>'+esc(classById(state,s?.class_id))+'</td><td>'+money(r.refund_amount)+'</td><td>'+esc(r.reason||'')+'</td></tr>'}).join('')+'</tbody></table></div>';
}
function historyReport(){
 return '<div class="card"><div class="field"><label>Select Student</label><select id="historyStudent"><option value="">Choose student</option>'+activeStudents().map(s=>'<option value="'+s.id+'">'+esc(s.roll_number)+' — '+esc(s.student_name)+'</option>').join('')+'</select></div><div id="historyOutput" style="margin-top:12px"><div class="empty">Select a student to view the complete financial history.</div></div></div>';
}
function whatsappPage(){
 return '<div class="card"><div class="sectionHead"><div><h2>WhatsApp Reminder Center</h2><p>Messages are calculated from the selected student ledger only</p></div></div><div class="formGrid"><div class="field span2"><label>Student</label><select id="waStudent"><option value="">Select student</option>'+activeStudents().map(s=>'<option value="'+s.id+'">'+esc(s.roll_number)+' — '+esc(s.student_name)+'</option>').join('')+'</select></div><div class="field"><label>Year</label><input id="waYear" type="number" value="'+new Date().getFullYear()+'"></div><div class="span3 actions"><button class="btn gold" data-action="wa-ledger">Open Ledger Reminder</button></div></div></div>';
}
function settingsPage(){
 const s=state.settings;
 return '<form id="settingsForm" class="card formGrid"><div class="field span2"><label>School Name</label><input name="schoolName" value="'+esc(s.schoolName)+'"></div><div class="field"><label>School Phone</label><input name="schoolPhone" value="'+esc(s.schoolPhone)+'"></div><div class="field span3"><label>School Address</label><input name="schoolAddress" value="'+esc(s.schoolAddress)+'"></div><div class="field"><label>Monthly Fee</label><input name="monthlyFee" type="number" value="'+Number(s.monthlyFee||2000)+'"></div><div class="field"><label>Annual Fund</label><input name="annualFund" type="number" value="'+Number(s.annualFund||2150)+'"></div><div class="field"><label>Prepared By / Cashier</label><input name="preparedBy" value="'+esc(s.preparedBy||'')+'"></div><div class="field"><label>Slip Prefix</label><input name="slipPrefix" value="'+esc(s.slipPrefix)+'"></div><div class="field"><label>Current Slip Number</label><input name="currentSlipNumber" type="number" value="'+Number(s.currentSlipNumber||25001)+'"></div><div class="field"><label>Paper Size</label><select name="paperSize"><option selected>A5 Portrait</option></select></div><div class="field span3"><label>Supabase URL</label><input name="supabaseUrl" value="'+esc(s.supabaseUrl)+'"></div><div class="field span3"><label>Supabase Publishable Key</label><input name="supabaseKey" value="'+esc(s.supabaseKey)+'"></div><div class="span3 actions"><button class="btn gold" type="submit">Save Settings</button><button class="btn" type="button" data-action="health-check">Test Supabase Schema</button></div></form>';
}
function bindPage(){
 const f=$('feeForm');if(f)f.onsubmit=saveFee;
 const sf=$('settingsForm');if(sf)sf.onsubmit=saveSettings;
 const ss=$('studentSearch');if(ss)ss.oninput=filterStudents;
 const sc=$('studentClass');if(sc)sc.onchange=filterStudents;
 const ls=$('ledgerSearch');if(ls)ls.oninput=filterLedger;
 const lc=$('ledgerClass');if(lc)lc.onchange=filterLedger;
 const ly=$('ledgerYear');if(ly)ly.onchange=filterLedger;
 document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>{ui.reportMode=b.dataset.report;render()});
 const rm=$('reportMonth');if(rm)rm.onchange=()=>{ui.reportMonth=rm.value;render()};
 const ry=$('reportYear');if(ry)ry.onchange=()=>{ui.reportYear=+ry.value||new Date().getFullYear();render()};
 const hs=$('historyStudent');if(hs)hs.onchange=()=>renderHistory(hs.value);
}
function filterStudents(){const q=String($('studentSearch')?.value||'').toLowerCase(),cid=$('studentClass')?.value||'';const rows=activeStudents().filter(s=>(!cid||s.class_id===cid)&&(!q||[s.roll_number,s.student_name,s.father_name,s.phone_number].join(' ').toLowerCase().includes(q)));$('studentTable').innerHTML=studentTable(rows)}
function filterLedger(){const q=String($('ledgerSearch')?.value||'').toLowerCase(),cid=$('ledgerClass')?.value||'',year=+$('ledgerYear').value||new Date().getFullYear();const rows=activeStudents().filter(s=>(!cid||s.class_id===cid)&&(!q||[s.roll_number,s.student_name,s.father_name,s.phone_number].join(' ').toLowerCase().includes(q)));$('ledgerCards').innerHTML=ledgerCards(rows,year)}
function openStudent(id=null){
 const s=id?state.students.find(x=>x.id===id):null;
 showModal('<div class="modalHead"><h2>'+(s?'Edit':'Add')+' Student</h2><button class="closeBtn" data-action="close-modal">Close</button></div><form id="studentForm" class="formGrid"><div class="field"><label>Roll Number</label><input name="roll_number" required value="'+esc(s?.roll_number||'')+'"></div><div class="field"><label>Student Name</label><input name="student_name" required value="'+esc(s?.student_name||'')+'"></div><div class="field"><label>Father Name</label><input name="father_name" required value="'+esc(s?.father_name||'')+'"></div><div class="field"><label>Class</label><select name="class_id" required><option value="">Select Class</option>'+classOptions(s?.class_id||'')+'</select></div><div class="field"><label>Phone</label><input name="phone_number" value="'+esc(s?.phone_number||'')+'"></div><div class="field"><label>Admission No.</label><input name="admission_number" value="'+esc(s?.admission_number||'')+'"></div><div class="span3"><button class="btn gold" type="submit">Save Student</button></div></form>');
 $('studentForm').onsubmit=e=>saveStudentForm(e,id);
}
function saveStudentForm(e,id){e.preventDefault();const f=e.target,roll=f.roll_number.value.trim(),cid=f.class_id.value;const dup=state.students.find(x=>x.status!=='Deleted'&&x.id!==id&&String(x.roll_number).toLowerCase()===roll.toLowerCase()&&x.class_id===cid);if(dup){toast('Duplicate roll number in the same class is not allowed.');return}const obj=id?state.students.find(x=>x.id===id):{id:uid(),created_at:now(),status:'Active'};Object.assign(obj,{roll_number:roll,student_name:f.student_name.value.trim(),father_name:f.father_name.value.trim(),class_id:cid,phone_number:f.phone_number.value.trim(),admission_number:f.admission_number.value.trim(),updated_at:now(),sync_status:'pending'});if(!id)state.students.push(obj);queue(state,'students',obj.id);activity(state,id?'student_updated':'student_added',(id?'Updated ':'Added ')+obj.student_name,obj.id);save(false);closeModal();toast('Student saved locally.');render()}
function importStudents(){
 const p=$('filePicker');p.accept='.xlsx,.xls,.csv';p.value='';p.onchange=async()=>{const file=p.files[0];if(!file)return;try{const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(ws,{defval:''});const norm=k=>String(k).toLowerCase().replace(/[^a-z0-9]/g,'');ui.importRows=raw.map(r=>{const g=names=>{for(const n of names){const key=Object.keys(r).find(k=>norm(k)===norm(n));if(key)return r[key]}return ''};return {roll_number:String(g(['roll number','roll no','roll'])).trim(),student_name:String(g(['student name','name'])).trim(),father_name:String(g(['father name','father'])).trim(),class_name:String(g(['class','grade'])).trim(),phone_number:String(g(['phone','mobile','contact'])).trim()}}).filter(r=>r.roll_number&&r.student_name);showImportPreview()}catch(err){toast('Import failed: '+err.message)} };p.click();
}
function showImportPreview(){const rows=ui.importRows.slice(0,50);showModal('<div class="modalHead"><h2>Import Preview</h2><button class="closeBtn" data-action="close-modal">Close</button></div><p>'+ui.importRows.length+' valid row(s) detected. Duplicates will be skipped, not overwritten.</p><div class="tableWrap"><table><thead><tr><th>Roll</th><th>Student</th><th>Father</th><th>Class</th><th>Phone</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.roll_number)+'</td><td>'+esc(r.student_name)+'</td><td>'+esc(r.father_name)+'</td><td>'+esc(r.class_name)+'</td><td>'+esc(r.phone_number)+'</td></tr>').join('')+'</tbody></table></div><div class="actions" style="margin-top:12px"><button class="btn gold" data-action="import-confirm">Import '+ui.importRows.length+' Student(s)</button></div>')}
function confirmImport(){
 let added=0,skipped=0;
 for(const r of ui.importRows){
  let c=state.classes.find(x=>x.status!=='Deleted'&&String(x.class_name).toLowerCase()===r.class_name.toLowerCase());
  if(!c&&r.class_name){c={id:uid(),class_name:r.class_name,section:'',status:'Active',created_at:now(),updated_at:now(),sync_status:'pending'};state.classes.push(c);queue(state,'classes',c.id)}
  if(!c){skipped++;continue}
  const dup=state.students.find(x=>x.status!=='Deleted'&&x.class_id===c.id&&(String(x.roll_number).toLowerCase()===r.roll_number.toLowerCase()||(x.student_name.toLowerCase()===r.student_name.toLowerCase()&&x.father_name.toLowerCase()===r.father_name.toLowerCase())));
  if(dup){skipped++;continue}
  const s={id:uid(),roll_number:r.roll_number,student_name:r.student_name,father_name:r.father_name,class_id:c.id,phone_number:r.phone_number,admission_number:'',status:'Active',created_at:now(),updated_at:now(),sync_status:'pending'};state.students.push(s);queue(state,'students',s.id);added++;
 }
 activity(state,'students_imported','Imported '+added+' students');save(false);closeModal();toast('Imported '+added+'; skipped '+skipped+' duplicate/invalid row(s).');render()
}
function saveFee(e){
 e.preventDefault();const f=e.target,s=studentById(state,f.student_id.value);if(!s){toast('Select a student.');return}
 const month=f.fee_month.value,year=+f.fee_year.value,cash=+f.cash_paid.value||0,discount=+f.discount.value||0,fine=+f.fine.value||0,annual=+f.annual_fund_paid.value||0,refund=+f.refund_amount.value||0,base=Number(state.settings.monthlyFee||2000);
 if([cash,discount,fine,annual,refund].some(v=>v<0)){toast('Amounts cannot be negative.');return}
 const ledgerBefore=computeStudentLedger(state,s.id,year),existingMonth=ledgerBefore.months.find(m=>m.month===month);
 if(existingMonth.status==='Paid'&&(cash>0||discount>0||fine>0)){toast('This monthly fee is already clear. Duplicate monthly fee entry blocked.');return}
 if(discount>existingMonth.pending+fine){toast('Discount exceeds the remaining monthly balance.');return}
 if(annual>ledgerBefore.annualPending){toast('Annual Fund payment exceeds remaining Annual Fund balance.');return}
 const maxRefund=Math.max(0,ledgerBefore.totalCash-ledgerBefore.totalRefund);if(refund>maxRefund){toast('Refund exceeds available paid cash.');return}
 const covered=cash+discount,monthlyPending=Math.max(base+fine-existingMonth.covered-covered,0),status=monthlyPending<=0?'Paid':(existingMonth.covered+covered)>0?'Partial':'Unpaid',slipNo=nextSlipNumber(state);
 const entry={id:uid(),student_id:s.id,class_id:s.class_id,fee_month:month,fee_year:year,monthly_fee:base,cash_paid:cash,discount,fine,annual_fund_paid:annual,monthly_pending:monthlyPending,monthly_status:status,payment_date:f.payment_date.value,payment_method:f.payment_method.value,notes:f.notes.value.trim(),slip_no:slipNo,status:'Active',created_at:now(),updated_at:now(),sync_status:'pending'};
 state.feeEntries.push(entry);queue(state,'feeEntries',entry.id);activity(state,'fee_saved','Fee entry '+slipNo+' saved for '+s.student_name,s.id,cash+annual);
 let refundObj=null;if(refund>0){refundObj={id:uid(),student_id:s.id,refund_amount:refund,refund_date:f.payment_date.value,reason:f.notes.value.trim()||'Fee refund',status:'Active',created_at:now(),updated_at:now(),sync_status:'pending'};state.refunds.push(refundObj);queue(state,'refunds',refundObj.id);activity(state,'refund_added','Refund added for '+s.student_name,s.id,refund)}
 const slip={id:uid(),student_id:s.id,fee_record_id:entry.id,slip_number:slipNo,slip_date:f.payment_date.value,amount:cash+annual,refund_amount:refund,remarks:f.notes.value.trim(),created_at:now(),sync_status:'pending'};state.feeSlips.push(slip);queue(state,'feeSlips',slip.id);state.settings.currentSlipNumber=Number(state.settings.currentSlipNumber||25001)+1;state.settings.updatedAt=now();queue(state,'settings','main');ui.selectedSlip=slip.id;save(false);toast('Fee saved locally and A5 slip generated.');state.meta.activePage='fee-slip';render()
}
function renderHistory(id){const out=$('historyOutput');if(!out)return;if(!id){out.innerHTML='<div class="empty">Select a student.</div>';return}const l=computeStudentLedger(state,id,ui.reportYear),s=l.student;out.innerHTML='<div class="kpiStrip"><div class="miniKpi"><span>Cash</span><b>'+money(l.totalCash)+'</b></div><div class="miniKpi"><span>Discount</span><b>'+money(l.totalDiscount)+'</b></div><div class="miniKpi"><span>Fine</span><b>'+money(l.totalFine)+'</b></div><div class="miniKpi"><span>Annual Paid</span><b>'+money(l.annualPaid)+'</b></div><div class="miniKpi"><span>Refund</span><b>'+money(l.totalRefund)+'</b></div><div class="miniKpi"><span>Pending</span><b>'+money(l.totalPending)+'</b></div></div><div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>Type</th><th>Date</th><th>Month</th><th>Cash/Refund</th><th>Discount</th><th>Annual</th><th>Notes</th></tr></thead><tbody>'+l.transactions.map(t=>'<tr><td>'+esc(t._kind)+'</td><td>'+esc(t.payment_date||t.refund_date||'')+'</td><td>'+esc(t.fee_month||'-')+'</td><td>'+money(t._kind==='refund'?t.refund_amount:t.cash_paid)+'</td><td>'+money(t.discount||0)+'</td><td>'+money(t.annual_fund_paid||0)+'</td><td>'+esc(t.notes||t.reason||'')+'</td></tr>').join('')+'</tbody></table></div>'}
function ledgerModal(id){const l=computeStudentLedger(state,id,new Date().getFullYear());if(!l)return;const s=l.student;showModal('<div class="modalHead"><div><h2>'+esc(s.student_name)+'</h2><div class="studentMeta">Roll '+esc(s.roll_number)+' · '+esc(classById(state,s.class_id))+' · Father: '+esc(s.father_name)+'</div></div><button class="closeBtn" data-action="close-modal">Close</button></div><div class="kpiStrip"><div class="miniKpi"><span>Total Cash</span><b>'+money(l.totalCash)+'</b></div><div class="miniKpi"><span>Months Paid</span><b>'+l.paidMonths+'/12</b></div><div class="miniKpi"><span>Discount</span><b>'+money(l.totalDiscount)+'</b></div><div class="miniKpi"><span>Annual Paid</span><b>'+money(l.annualPaid)+'</b></div><div class="miniKpi"><span>Refund</span><b>'+money(l.totalRefund)+'</b></div><div class="miniKpi"><span>Total Pending</span><b>'+money(l.totalPending)+'</b></div></div><div class="months">'+l.months.map(m=>'<div class="monthCell '+m.status+'">'+m.month.slice(0,3)+'<br>'+m.status+'<br>'+money(m.pending)+'</div>').join('')+'</div>')}
function waMessage(id,month=null,year=new Date().getFullYear()){const l=computeStudentLedger(state,id,year);if(!l)return '';const s=l.student,m=month?l.months.find(x=>x.month===month):null;return 'Assalam o Alaikum,\n\nDear Parent,\nThis is a fee reminder from '+state.settings.schoolName+'.\n\nStudent: '+s.student_name+'\nRoll No: '+s.roll_number+'\nClass: '+classById(state,s.class_id)+'\n'+(m?'\nPending Month: '+m.month+' '+year+'\nMonthly Fee: '+money(m.base)+'\nPaid/Discount Adjusted: '+money(m.covered)+'\nPending Monthly Fee: '+money(m.pending)+'\n':'')+'\nAnnual Fund Pending: '+money(l.annualPending)+'\nTotal Pending: '+money(l.totalPending)+'\n\nKindly clear the dues at your earliest convenience.\n\nThank you,\n'+state.settings.schoolName}
function openWhatsApp(id,msg){const s=studentById(state,id);if(!s||!s.phone_number){toast('Phone number is missing for this student.');return}const p=normalizePakPhone(s.phone_number);window.open('https://wa.me/'+p+'?text='+encodeURIComponent(msg),'_blank','noopener');toast('WhatsApp reminder opened.')}
function slipMessage(slip){const st=studentById(state,slip.student_id),e=state.feeEntries.find(x=>x.id===slip.fee_record_id),l=computeStudentLedger(state,st.id,+e.fee_year);return state.settings.schoolName+'\nFee Receipt '+slip.slip_number+'\nDate: '+slip.slip_date+'\nStudent: '+st.student_name+'\nFather: '+st.father_name+'\nRoll: '+st.roll_number+'\nClass: '+classById(state,st.class_id)+'\nMonth: '+e.fee_month+' '+e.fee_year+'\nCash Received: '+money(e.cash_paid)+'\nDiscount: '+money(e.discount)+'\nAnnual Fund Received: '+money(e.annual_fund_paid)+'\nMonthly Status: '+e.monthly_status+'\nAnnual Fund Pending: '+money(l.annualPending)+'\nTotal Pending: '+money(l.totalPending)}
async function doSync(){try{const pending=state.syncQueue.filter(x=>x.status==='pending').length;if(!pending){toast('No pending changes to sync.');return}const r=await syncPending(state,(d,t)=>toast('Syncing '+d+'/'+t));save(false);toast('Synced '+r.count+' pending change(s) to Supabase.');render()}catch(e){save(false);toast('Sync failed: '+e.message)}}
async function checkHealth(){try{const r=await healthCheck(state);const bad=r.filter(x=>!x.ok);showModal('<div class="modalHead"><h2>Supabase Schema Check</h2><button class="closeBtn" data-action="close-modal">Close</button></div>'+r.map(x=>'<div class="activity"><b>'+x.table+'</b><span>'+ (x.ok?'<span class="badge paid">Ready</span>':'<span class="badge unpaid">Missing / blocked</span>')+'</span></div>').join('')+(bad.length?'<div class="dangerBox" style="margin-top:12px">The app stays local-first until these tables/RLS policies are available. No dummy data will be shown.</div>':''))}catch(e){toast('Cloud check failed: '+e.message)}}
function saveSettings(e){e.preventDefault();const f=e.target;state.settings={...state.settings,schoolName:f.schoolName.value.trim()||'UMEED Education System',schoolPhone:f.schoolPhone.value.trim(),schoolAddress:f.schoolAddress.value.trim(),monthlyFee:+f.monthlyFee.value||2000,annualFund:+f.annualFund.value||2150,preparedBy:f.preparedBy.value.trim(),slipPrefix:f.slipPrefix.value.trim()||'UES',currentSlipNumber:+f.currentSlipNumber.value||25001,paperSize:f.paperSize.value,supabaseUrl:f.supabaseUrl.value.trim(),supabaseKey:f.supabaseKey.value.trim(),syncMode:'manual',updatedAt:now()};queue(state,'settings','main');activity(state,'settings_saved','Settings updated');save(false);toast('Settings saved locally.');render()}
function currentReportRows(){
 if(ui.reportMode==='refund')return state.refunds.filter(r=>r.status!=='Deleted').map(r=>{const s=studentById(state,r.student_id);return {date:r.refund_date,roll:s?.roll_number,student:s?.student_name,class:classById(state,s?.class_id),refund:r.refund_amount,reason:r.reason}});
 if(ui.reportMode==='month')return activeStudents().map(s=>{const l=computeStudentLedger(state,s.id,ui.reportYear),m=l.months.find(x=>x.month===ui.reportMonth);return {roll:s.roll_number,student:s.student_name,father:s.father_name,class:classById(state,s.class_id),month:ui.reportMonth,year:ui.reportYear,monthly_pending:m.pending,annual_pending:l.annualPending,total_pending:m.pending+l.annualPending}}).filter(x=>x.monthly_pending>0);
 if(ui.reportMode==='year')return activeStudents().map(s=>{const l=computeStudentLedger(state,s.id,ui.reportYear);return {roll:s.roll_number,student:s.student_name,father:s.father_name,class:classById(state,s.class_id),year:ui.reportYear,paid_months:l.paidMonths,partial_months:l.partialMonths,monthly_pending:l.monthlyPending,annual_pending:l.annualPending,total_pending:l.totalPending}}).filter(x=>x.total_pending>0);
 return [];
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='close-modal')closeModal();
 if(a==='student-new')openStudent();
 if(a==='student-edit')openStudent(id);
 if(a==='student-delete'){const s=state.students.find(x=>x.id===id);if(s&&confirm('Delete '+s.student_name+' from the local active registry?')){s.status='Deleted';s.updated_at=now();queue(state,'students',s.id);activity(state,'student_deleted','Deleted '+s.student_name,s.id);save();toast('Student marked deleted locally.')}}
 if(a==='import-students')importStudents();
 if(a==='import-confirm')confirmImport();
 if(a==='export-students')csvDownload(activeStudents().map(s=>({roll_number:s.roll_number,student_name:s.student_name,father_name:s.father_name,class:classById(state,s.class_id),phone:s.phone_number,admission_number:s.admission_number})),'UMEED-Students-'+today()+'.csv');
 if(a==='export-fees')csvDownload(state.feeEntries,'UMEED-Fee-Entries-'+today()+'.csv');
 if(a==='export-ledger')csvDownload(activeStudents().map(s=>{const l=computeStudentLedger(state,s.id,new Date().getFullYear());return {roll:s.roll_number,student:s.student_name,class:classById(state,s.class_id),cash:l.totalCash,discount:l.totalDiscount,annual_paid:l.annualPaid,annual_pending:l.annualPending,monthly_pending:l.monthlyPending,total_pending:l.totalPending,refund:l.totalRefund}}),'UMEED-Ledger-'+today()+'.csv');
 if(a==='fee-for'){state.meta.activePage='fee-entry';save(false);render();setTimeout(()=>{$('feeStudent').value=id},0)}
 if(a==='open-fee'){state.meta.activePage='fee-entry';save(false);render()}
 if(a==='ledger-open')ledgerModal(id);
 if(a==='slip-by-entry'){const s=state.feeSlips.find(x=>x.fee_record_id===id);if(s){ui.selectedSlip=s.id;state.meta.activePage='fee-slip';save(false);render()}}
 if(a==='slip-latest'){const s=state.feeSlips.slice().sort((x,y)=>String(y.created_at).localeCompare(String(x.created_at)))[0];if(s){ui.selectedSlip=s.id;state.meta.activePage='fee-slip';save(false);render()}else toast('No fee slip exists yet.')}
 if(a==='slip-search'){showModal('<div class="modalHead"><h2>Search Fee Slip</h2><button class="closeBtn" data-action="close-modal">Close</button></div><div class="field"><label>Receipt Number</label><input id="slipSearchInput" placeholder="e.g. UES-25001"></div><div class="actions" style="margin-top:10px"><button class="btn gold" data-action="slip-search-go">Open Slip</button></div>')}
 if(a==='slip-search-go'){const q=String($('slipSearchInput').value||'').toLowerCase();const s=state.feeSlips.find(x=>String(x.slip_number).toLowerCase()===q);if(!s){toast('Slip not found.');return}ui.selectedSlip=s.id;closeModal();state.meta.activePage='fee-slip';save(false);render()}
 if(a==='print-slip')window.print();
 if(a==='wa-entry'){const en=state.feeEntries.find(x=>x.id===id);if(en)openWhatsApp(en.student_id,waMessage(en.student_id,en.fee_month,en.fee_year))}
 if(a==='wa-defaulter')openWhatsApp(id,waMessage(id,ui.reportMode==='month'?ui.reportMonth:null,ui.reportYear));
 if(a==='wa-ledger'){const id2=$('waStudent')?.value;if(!id2){toast('Select a student.');return}openWhatsApp(id2,waMessage(id2,null,+$('waYear').value||new Date().getFullYear()))}
 if(a==='wa-slip'){const s=state.feeSlips.find(x=>x.id===id);if(s)openWhatsApp(s.student_id,slipMessage(s))}
 if(a==='copy-slip'){const s=state.feeSlips.find(x=>x.id===id);if(s){await navigator.clipboard.writeText(slipMessage(s));toast('Slip message copied.')}}
 if(a==='backup')exportBackup(state);
 if(a==='restore'){const p=$('filePicker');p.accept='.json';p.value='';p.onchange=async()=>{try{state=await importBackup(p.files[0]);persist(state);toast('Backup restored.');render()}catch(err){toast(err.message)}};p.click()}
 if(a==='clear-local'){if(confirm('This will clear local students, fees, refunds and slips. Supabase will not be deleted. Continue?')&&confirm('Final confirmation: clear local operational data?')){resetOperationalData(state);persist(state);toast('Local operational data cleared.');render()}}
 if(a==='sync-now')doSync();
 if(a==='health-check')checkHealth();
 if(a==='report-export')csvDownload(currentReportRows(),'UMEED-'+ui.reportMode+'-report-'+today()+'.csv');
 if(a==='report-print')window.print();
});
$('mobileMenu').onclick=()=>$('sidebar').classList.toggle('open');
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
checkHealth().then(()=>closeModal()).catch(()=>{});
