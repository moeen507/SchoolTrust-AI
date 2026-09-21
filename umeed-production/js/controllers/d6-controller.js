import {AppContext} from '../app-context.js';
import {StorageService,emptyCache} from '../storage-service.js';
import {ExportService} from '../export-service.js';
import {PopupService} from '../popup-service.js';
import {computeStudentLedger} from '../ledger-engine.js';
import {className} from '../dom-utils.js';

function render(){
  const s=AppContext.state,p=s.syncQueue.filter(q=>q.status==='pending').length;
  document.getElementById('d6-stats').innerHTML=[['Students',s.students.length],['Fee Records',s.feeEntries.length],['Refunds',s.refunds.length],['Pending Sync',p]].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
  document.getElementById('sync-status-box').innerHTML='<p>Last cloud refresh: <b>'+(s.lastCloudRefresh?new Date(s.lastCloudRefresh).toLocaleString():'Never')+'</b></p><p>Last manual sync: <b>'+(s.lastSync?new Date(s.lastSync).toLocaleString():'Never')+'</b></p><p>Pending offline changes: <b>'+p+'</b></p>';
  document.getElementById('local-record-summary').innerHTML='<p>Local IndexedDB cache preserves the latest downloaded data plus unsynced changes. Supabase is the centralized authoritative database when online.</p>';
}
async function backup(){
  const data=await StorageService.exportBackup(AppContext.state);
  try{
    if(window.umeedDesktop?.exportJson){const r=await window.umeedDesktop.exportJson(data);if(r?.ok)PopupService.success('Backup created.');}
    else{ExportService.json(data,'UMEED-Backup.json');PopupService.success('Backup downloaded.')}
  }catch(e){PopupService.error(e.message)}
}
async function restoreData(data){
  try{StorageService.validateBackup(data);if(!await PopupService.confirm('Restore Backup','Replace the current local cache with this backup? Central Supabase data is not silently overwritten.','Restore'))return;
    const fresh=emptyCache();Object.assign(AppContext.state,fresh,data);await AppContext.save();PopupService.success('Local backup restored. Use Manual Sync only if restored data contains pending operations.');location.reload();
  }catch(e){PopupService.error('Restore failed: '+e.message)}
}
async function restore(){
  if(window.umeedDesktop?.importJson){const r=await window.umeedDesktop.importJson();if(r?.ok)await restoreData(r.data);return}
  const input=document.getElementById('global-file-input');input.accept='.json';input.value='';input.onchange=async()=>{if(!input.files?.[0])return;try{await restoreData(JSON.parse(await input.files[0].text()))}catch(e){PopupService.error(e.message)}};input.click();
}
function exportLedger(){
  const y=new Date().getFullYear();ExportService.csv(AppContext.state.students.filter(s=>String(s.status||'active')!=='deleted').map(s=>{const l=computeStudentLedger(AppContext.state,s.id,y);return {roll_number:s.roll_number,student_name:s.student_name,father_name:s.father_name,class:className(AppContext.state,s.class_id),year:y,total_cash:l.totalCash,total_discount:l.totalDiscount,total_fine:l.totalFine,total_refund:l.totalRefund,annual_fund_paid:l.annualPaid,annual_fund_pending:l.annualPending,monthly_pending:l.monthlyPending,total_pending:l.totalPending}}),'UMEED-Ledger-Summary.csv')
}
export default{
  async init(){
    render();document.getElementById('backup-create').onclick=backup;document.getElementById('backup-restore').onclick=restore;document.getElementById('backup-import').onclick=restore;
    document.getElementById('export-students').onclick=()=>ExportService.csv(AppContext.state.students,'UMEED-Students.csv');
    document.getElementById('export-fees').onclick=()=>ExportService.csv(AppContext.state.feeEntries,'UMEED-Fee-Records.csv');
    document.getElementById('export-ledger').onclick=exportLedger;
    document.getElementById('sync-pending').onclick=async()=>{await AppContext.syncPending();render()};
    document.getElementById('cloud-refresh-d6').onclick=async()=>{await AppContext.refreshCloud();render()};
    document.getElementById('clear-local').onclick=async()=>{if(!await PopupService.confirm('Clear Local Cache','Clear local cached students, fees and settings from this device? Central Supabase data will NOT be deleted.','Clear Cache'))return;Object.assign(AppContext.state,emptyCache());await AppContext.save();PopupService.success('Local cache cleared.');location.reload()};
  },destroy(){}
};
