import {AppContext} from '../app-context.js';
import {computeDashboard,money} from '../ledger-engine.js';
import {MONTHS} from '../config.js';
import {escapeHtml,shortDate} from '../dom-utils.js';

function stat(label,value,sub){return '<div class="stat-card"><div class="stat-label">'+label+'</div><div class="stat-value">'+value+'</div><div class="stat-sub">'+sub+'</div></div>'}
function render(){
  const s=AppContext.state,y=new Date().getFullYear(),m=computeDashboard(s,y);
  document.getElementById('dashboard-stats').innerHTML=[
    stat('Total Students',m.students,'Active student records'),
    stat('Fee Cash',money(m.totalCash),'Monthly fee + Annual Fund'),
    stat('Syllabus Sales',money(m.syllabusSales),'Student Syllabus / Store'),
    stat('Canteen Sales',money(m.canteenSales),'Shared counter series'),
    stat('Total Collected',money(m.overallCollected),'Fee + Syllabus + Canteen'),
    stat('Discount Given',money(m.totalDiscount),'Not counted as cash'),
    stat('Annual Fund Received',money(m.totalAnnualFund),'Tracked inside Fee Entry'),
    stat('Fee Pending',money(m.totalPending),'Monthly + Annual Fund pending'),
    stat('Defaulters',m.totalDefaulters,'Students with fee balance'),
    stat('Refunds',money(m.totalRefunds),'Separate from collections'),
    stat('Offline Queue',s.syncQueue.filter(q=>q.status==='pending').length,'Manual sync only')
  ].join('');

  const monthly=MONTHS.map((_,i)=>{
    const legacy=(s.feeEntries||[]).filter(e=>Number(e.fee_year)===y&&Number(e.fee_month)===i+1&&String(e.status||'active')!=='reversed').reduce((a,e)=>a+Number(e.cash_paid||0),0);
    const modern=(s.feeReceiptMonths||[]).filter(e=>Number(e.fee_year)===y&&Number(e.fee_month)===i+1).reduce((a,e)=>a+Number(e.cash_paid||0),0);
    return legacy+modern;
  });
  const max=Math.max(1,...monthly);
  document.getElementById('collection-chart').innerHTML='<div style="height:220px;display:flex;align-items:end;gap:8px;padding:10px 4px 24px">'+monthly.map((v,i)=>'<div style="flex:1;text-align:center"><div title="'+money(v)+'" style="height:'+Math.max(2,Math.round(v/max*170))+'px;background:linear-gradient(180deg,#E3C26F,#8d6c2e);border-radius:6px 6px 2px 2px"></div><small style="color:#9a8e7e">'+MONTHS[i].slice(0,3)+'</small></div>').join('')+'</div>';

  const activity=s.activityLog.slice(0,8);
  document.getElementById('recent-activity').innerHTML=activity.length?activity.map(a=>'<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div><b>'+escapeHtml(a.message||a.action)+'</b><br><small style="color:#9a8e7e">'+shortDate(a.created_at)+'</small></div><span>'+(a.amount!=null?money(a.amount):'')+'</span></div>').join(''):'<div class="empty-state">No activity yet.</div>';

  const classes=s.classes.map(c=>({name:c.class_name,count:s.students.filter(st=>st.class_id===c.id&&String(st.status||'active')!=='deleted').length})).filter(x=>x.count>0);
  document.getElementById('class-summary').innerHTML=classes.length?'<div class="summary-strip">'+classes.slice(0,15).map(x=>'<div class="summary-item"><small>'+escapeHtml(x.name)+'</small><b>'+x.count+'</b></div>').join('')+'</div>':'<div class="empty-state">No student data yet.</div>';
  const clear=m.ledgers.filter(l=>l.totalPending===0).length,partial=m.ledgers.filter(l=>l.totalPending>0&&l.totalCash>0).length,none=m.ledgers.filter(l=>l.totalCash===0).length;
  document.getElementById('payment-status').innerHTML='<div class="summary-strip"><div class="summary-item"><small>Fully Clear</small><b>'+clear+'</b></div><div class="summary-item"><small>Partial</small><b>'+partial+'</b></div><div class="summary-item"><small>No Fee Payment</small><b>'+none+'</b></div></div>';
}
export default{async init(){render();document.getElementById('dashboard-refresh').onclick=async()=>{await AppContext.refreshCloud();render()}},destroy(){}};