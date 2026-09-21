import {CONFIG} from './config.js';
import {StorageService} from './storage-service.js';
import {AuthService} from './auth-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {PopupService} from './popup-service.js';
import {NavigationController} from './navigation-controller.js';
import {AppContext} from './app-context.js';

let state=await StorageService.loadCache();

function mergeDefaults(settings={}){
  return {
    school_name:'UMEED Education System',school_phone:'',school_address:'',
    monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund,
    fee_receipt_prefix:'UES',next_fee_receipt_no:1,
    counter_receipt_prefix:'SC',next_counter_receipt_no:1,
    next_student_roll_no:1,
    slip_prefix:'UES',next_receipt_no:1,prepared_by:'Admin/Cashier',
    ...settings,monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund
  };
}
state.settings=mergeDefaults(state.settings);

async function persist(){await StorageService.saveCache(state);updateConnection()}
function updateConnection(){NavigationController.updateConnection({online:navigator.onLine&&!!AuthService.token()&&!AuthService.offlineSession,pending:state.syncQueue.filter(q=>q.status==='pending').length})}
function overlayPending(){
  for(const q of state.syncQueue.filter(x=>x.status==='pending')){
    if(q.type==='student_upsert'){state.students=state.students.filter(x=>x.id!==q.payload.id);state.students.push(q.payload)}
  }
}
async function refreshCloud({quiet=false}={}){
  if(!navigator.onLine||AuthService.offlineSession){if(!quiet)PopupService.warning('Offline: using the last local cache.');return false}
  try{
    if(!SupabaseSyncService.profile)await SupabaseSyncService.loadProfile();
    state.profile=SupabaseSyncService.profile;
    const cloud=await SupabaseSyncService.refreshAll();
    state.students=cloud.students||[];state.classes=cloud.classes||[];state.classFeeSchedule=cloud.classFeeSchedule||[];
    state.feeEntries=cloud.feeEntries||[];state.feeReceipts=cloud.feeReceipts||[];state.feeReceiptMonths=cloud.feeReceiptMonths||[];
    state.refunds=cloud.refunds||[];state.activityLog=cloud.activityLog||[];
    state.catalogItems=cloud.catalogItems||[];state.counterSales=cloud.counterSales||[];state.counterSaleItems=cloud.counterSaleItems||[];
    state.settings=mergeDefaults(cloud.settings||state.settings);
    overlayPending();state.lastCloudRefresh=new Date().toISOString();await persist();
    if(!quiet)PopupService.success('Central database refreshed.');
    return true;
  }catch(e){if(!quiet)PopupService.error('Cloud refresh failed: '+e.message);return false}
}
async function syncPending(){
  try{
    if(AuthService.offlineSession)throw new Error('Reconnect to the internet so your login token can refresh before syncing.');
    const pending=state.syncQueue.filter(q=>q.status==='pending').length;
    if(!pending){PopupService.info('No pending offline records to sync.');return}
    if(!await PopupService.confirm('Sync Pending Data','Upload '+pending+' offline change(s) to the centralized database?','Sync Now'))return;
    const result=await SupabaseSyncService.syncQueue(state,(done,total)=>PopupService.info('Syncing '+done+' of '+total+'…'));
    await refreshCloud({quiet:true});await persist();PopupService.success('Sync complete. '+result.count+' record(s) uploaded.');
    if(NavigationController.current)await NavigationController.go(NavigationController.current,false);
  }catch(e){await persist();PopupService.error(e.message)}
}
async function setSelectedSlip(id){state.selectedSlipId=id;await persist()}
async function setSelectedCounterSale(id){state.selectedCounterSaleId=id;await persist()}
async function signOut(){await AuthService.signOut();SupabaseSyncService.profile=null;state.profile=null;await persist();document.getElementById('app-root').innerHTML='';showLogin()}
function loginMarkup(){
  return '<main class="login-shell"><section class="login-card"><div class="login-brand"><img src="assets/logo.svg" alt="UMEED"><h1>UMEED EDUCATION SYSTEM</h1><p>Centralized Student Finance & Services</p></div><form id="login-form"><div class="form-group"><label>Email</label><input id="login-email" type="email" autocomplete="username" required></div><div class="form-group" style="margin-top:12px"><label>Password</label><input id="login-password" type="password" autocomplete="current-password" required></div><button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:18px" type="submit">Sign In</button><p id="login-error" class="page-subtitle" style="color:#ff9aaa;text-align:center"></p></form></section></main>';
}
function showLogin(){
  document.getElementById('app-root').innerHTML=loginMarkup();
  document.getElementById('login-form').onsubmit=async e=>{
    e.preventDefault();const err=document.getElementById('login-error');err.textContent='Signing in…';
    try{await AuthService.signIn(document.getElementById('login-email').value.trim(),document.getElementById('login-password').value);err.textContent='';await bootAuthenticated()}
    catch(ex){err.textContent=ex.message}
  };
}
async function bootAuthenticated(){
  if(navigator.onLine&&!AuthService.offlineSession){
    try{await SupabaseSyncService.loadProfile();state.profile=SupabaseSyncService.profile;await persist()}
    catch(e){await AuthService.signOut();PopupService.error(e.message);showLogin();return}
  }else{
    if(!state.profile){await AuthService.signOut();PopupService.error('This device has no cached UMEED profile. Connect to the internet and sign in once.');showLogin();return}
    SupabaseSyncService.profile=state.profile;
  }
  const shell=await fetch('app-shell.html',{cache:'no-store'});document.getElementById('app-root').innerHTML=await shell.text();
  AppContext.state=state;AppContext.profile=SupabaseSyncService.profile;AppContext.navigate=r=>NavigationController.go(r);AppContext.save=persist;
  AppContext.refreshCloud=refreshCloud;AppContext.syncPending=syncPending;AppContext.signOut=signOut;AppContext.setSelectedSlip=setSelectedSlip;AppContext.setSelectedCounterSale=setSelectedCounterSale;
  await refreshCloud({quiet:true});
  await NavigationController.init({profile:SupabaseSyncService.profile,onRefresh:async()=>{await refreshCloud();await NavigationController.go(NavigationController.current,false)},onSync:syncPending});
  updateConnection();
}
window.addEventListener('online',async()=>{updateConnection();if(AuthService.offlineSession){try{await AuthService.refresh();PopupService.info('Online again. Login token refreshed.');updateConnection()}catch{PopupService.warning('Reconnect requires sign-in before cloud sync.')}}});
window.addEventListener('offline',updateConnection);
if('serviceWorker'in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
const restored=await AuthService.restore();if(restored)await bootAuthenticated();else showLogin();