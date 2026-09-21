import {AppContext} from '../app-context.js';
import {StorageService,emptyCache} from '../storage-service.js';
import {ExportService} from '../export-service.js';
import {PopupService} from '../popup-service.js';
import {AuthService} from '../auth-service.js';
import {computeStudentLedger} from '../ledger-engine.js';
import {className,escapeHtml} from '../dom-utils.js';
import {MONTHS} from '../config.js';

function render(){
  const s=AppContext.state,p=s.syncQueue.filter(q=>q.status==='pending').length;
  document.getElementById('d6-stats').innerHTML=[
    ['Students',s.students.length],['Fee Slips',(s.feeReceipts||[]).length+(s.feeEntries||[]).length],['Counter Receipts',(s.counterSales||[]).length],
    ['Catalog Items',(s.catalogItems||[]).filter(x=>String(x.status||'active')==='active').length],['Refunds',s.refunds.length],['Pending Sync',p]
  ].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
  document.getElementById('sync-status-box').innerHTML='<p>Last cloud refresh: <b>'+(s.lastCloudRefresh?new Date(s.lastCloudRefresh).toLocaleString():'Never')+'</b></p><p>Last manual sync: <b>'+(s.lastSync?new Date(s.lastSync).toLocaleString():'Never')+'</b></p><p>Pending offline changes: <b>'+p+'</b></p>';
  document.getElementById('local-record-summary').innerHTML='<p>IndexedDB preserves students, multi-month Fee Slips, refunds, class fee schedules, Syllabus/Canteen catalog and unsynced transactions. Supabase remains the centralized database when online.</p>';
}
async function backup(){
  const data=await StorageService.exportBackup(AppContext.state);
  try{
    if(window.umeedDesktop?.exportJson){const r=await window.umeedDesktop.exportJson(data);if(r?.ok)PopupService.success('Backup created.');}
    else{ExportService.json(data,'UMEED-Backup-v3.2.json');PopupService.success('Backup downloaded.')}
  }catch(e){PopupService.error(e.message)}
}
async function restoreData(data){
  try{
    StorageService.validateBackup(data);
    if(!await PopupService.confirm('Restore Backup','Replace the current local cache with this backup? Central Supabase data is not silently overwritten.','Restore'))return;
    const fresh=emptyCache();Object.assign(AppContext.state,fresh,data);await AppContext.save();PopupService.success('Local backup restored.');location.reload();
  }catch(e){PopupService.error('Restore failed: '+e.message)}
}
async function restore(){
  if(window.umeedDesktop?.importJson){const r=await window.umeedDesktop.importJson();if(r?.ok)await restoreData(r.data);return}
  const input=document.getElementById('global-file-input');input.accept='.json';input.value='';input.onchange=async()=>{if(!input.files?.[0])return;try{await restoreData(JSON.parse(await input.files[0].text()))}catch(e){PopupService.error(e.message)}};input.click();
}
function exportLedger(){
  const y=new Date().getFullYear();
  ExportService.csv(AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted').map(s=>{const l=computeStudentLedger(AppContext.state,s.id,y);return {
    roll_number:s.roll_number,student_name:s.student_name,parent_guardian:s.father_name,class:className(AppContext.state,s.class_id),phone_whatsapp:s.phone_number,year:y,
    class_monthly_fee:l.classMonthlyFee,total_cash:l.totalCash,total_discount:l.totalDiscount,total_fine:l.totalFine,total_refund:l.totalRefund,
    annual_fund_paid:l.annualPaid,annual_fund_pending:l.annualPending,monthly_pending:l.monthlyPending,total_pending:l.totalPending
  }}),'UMEED-Ledger-Summary.csv');
}
function exportFees(){
  const rows=[];
  for(const r of AppContext.state.feeReceipts||[]){
    const s=AppContext.state.students.find(x=>x.id===r.student_id),lines=(AppContext.state.feeReceiptMonths||[]).filter(m=>m.receipt_id===r.id);
    rows.push({receipt_no:r.receipt_no||'Pending Sync',date:r.payment_date,roll:s?.roll_number||'',student:s?.student_name||'',parent_guardian:s?.father_name||'',class:className(AppContext.state,s?.class_id),months:lines.map(m=>MONTHS[Number(m.fee_month)-1]).join(', '),monthly_cash:lines.reduce((a,m)=>a+Number(m.cash_paid||0),0),discount:lines.reduce((a,m)=>a+Number(m.discount||0),0),fine:lines.reduce((a,m)=>a+Number(m.fine||0),0),annual_fund:r.annual_fund_paid,total_cash:lines.reduce((a,m)=>a+Number(m.cash_paid||0),0)+Number(r.annual_fund_paid||0),status:r.status});
  }
  for(const e of AppContext.state.feeEntries||[]){
    const s=AppContext.state.students.find(x=>x.id===e.student_id);rows.push({receipt_no:e.receipt_no||'Pending Sync',date:e.payment_date,roll:s?.roll_number||'',student:s?.student_name||'',parent_guardian:s?.father_name||'',class:className(AppContext.state,s?.class_id),months:MONTHS[Number(e.fee_month)-1],monthly_cash:e.cash_paid,discount:e.discount,fine:e.fine,annual_fund:e.annual_fund_paid,total_cash:Number(e.cash_paid||0)+Number(e.annual_fund_paid||0),status:e.status,legacy:true});
  }
  ExportService.csv(rows,'UMEED-Fee-Slips.csv');
}
function exportCounter(){
  ExportService.csv((AppContext.state.counterSales||[]).map(r=>{const s=AppContext.state.students.find(x=>x.id===r.student_id);return {
    receipt_no:r.receipt_no||'Pending Sync',date:r.sale_date,type:r.channel==='canteen'?'Canteen':'Student Syllabus',
    roll_number:s?.roll_number||'',student_name:s?.student_name||'',parent_guardian:s?.father_name||'',class:className(AppContext.state,s?.class_id),total:r.total,status:r.status
  }}),'UMEED-Syllabus-Canteen-Receipts.csv');
}
function askPassword(){
  return new Promise(resolve=>{
    const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
    box.innerHTML='<h3>Password Verification</h3><p>Enter your current password to authorize clearing local data from this device.</p><div class="form-group"><label>Current Password</label><input id="d6-password" type="password" autocomplete="current-password"></div><div class="actions" style="margin-top:14px"><button id="d6-password-ok" class="btn btn-red">Verify & Clear</button><button id="d6-password-cancel" class="btn btn-ghost">Cancel</button></div>';
    back.appendChild(box);root.appendChild(back);document.getElementById('d6-password').focus();
    document.getElementById('d6-password-cancel').onclick=()=>{back.remove();resolve(null)};
    document.getElementById('d6-password-ok').onclick=()=>{const v=document.getElementById('d6-password').value;back.remove();resolve(v)};
  });
}
export default{
  async init(){
    render();document.getElementById('backup-create').onclick=backup;document.getElementById('backup-restore').onclick=restore;document.getElementById('backup-import').onclick=restore;
    document.getElementById('export-students').onclick=()=>ExportService.csv(AppContext.state.students.map(s=>({roll_number:s.roll_number,student_name:s.student_name,parent_guardian:s.father_name,class:className(AppContext.state,s.class_id),phone_whatsapp:s.phone_number,status:s.status})),'UMEED-Students.csv');
    document.getElementById('export-fees').onclick=exportFees;document.getElementById('export-counter').onclick=exportCounter;document.getElementById('export-ledger').onclick=exportLedger;
    document.getElementById('sync-pending').onclick=async()=>{await AppContext.syncPending();render()};document.getElementById('cloud-refresh-d6').onclick=async()=>{await AppContext.refreshCloud();render()};
    document.getElementById('clear-local').onclick=async()=>{
      if(!await PopupService.confirm('Clear Local Cache','Clear this device cache? Central Supabase data will NOT be deleted.','Continue'))return;
      const password=await askPassword();if(!password)return;
      try{await AuthService.reauthenticate(password);Object.assign(AppContext.state,emptyCache());await AppContext.save();PopupService.success('Local cache cleared after password verification.');location.reload()}catch(e){PopupService.error(e.message)}
    };
  },destroy(){}
};