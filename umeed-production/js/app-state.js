import {CONFIG} from './config.js';
import {StorageService} from './storage-service.js';
import {AuthService} from './auth-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {PopupService} from './popup-service.js';
import {NavigationController} from './navigation-controller.js';
import {AppContext} from './app-context.js';
import {computeStudentLedger} from './ledger-engine.js';

let state=await StorageService.loadCache();
let expectedLoginRole=null;

function mergeDefaults(settings={}){
  return {
    school_name:'UMEED Education System',school_phone:'',school_address:'',
    monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund,
    fee_receipt_prefix:'UES',next_fee_receipt_no:1,counter_receipt_prefix:'SC',next_counter_receipt_no:1,
    next_student_roll_no:1,slip_prefix:'UES',next_receipt_no:1,prepared_by:'Admin/Cashier',
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
async function syncPending({silent=false}={}){
  try{
    if(AuthService.offlineSession)throw new Error('Reconnect to the internet so your login token can refresh before syncing.');
    const pending=state.syncQueue.filter(q=>q.status==='pending').length;if(!pending){if(!silent)PopupService.info('No pending offline records to sync.');return}
    if(!silent){
      const ok=await PopupService.confirm('Sync Pending Data','Upload '+pending+' offline change(s) to the centralized Supabase database?','Sync Now');if(!ok)return;
    }
    const result=await SupabaseSyncService.syncQueue(state,silent?()=>{}:(done,total)=>PopupService.info('Syncing '+done+' of '+total+'…'));
    await refreshCloud({quiet:true});await persist();if(!silent)PopupService.success('Sync complete. '+result.count+' record(s) uploaded.');
    if(NavigationController.current&&!silent)await NavigationController.go(NavigationController.current,false);
  }catch(e){await persist();if(!silent)PopupService.error(e.message);else PopupService.warning('Automatic sync could not finish: '+e.message)}
}
async function autoSyncAccountant(){
  const r=SupabaseSyncService.profile?.role;
  if(!navigator.onLine||!['accountant','cashier'].includes(r)||!state.syncQueue.some(q=>q.status==='pending'))return;
  await syncPending({silent:true});
  PopupService.success('Offline accountant entries synchronized automatically.');
}
async function setSelectedSlip(id){state.selectedSlipId=id;await persist()}
async function setSelectedCounterSale(id){state.selectedCounterSaleId=id;await persist()}
async function signOut(){await AuthService.signOut();SupabaseSyncService.profile=null;state.profile=null;await persist();document.getElementById('app-root').innerHTML='';showLogin()}

function roleCards(){
  return '<div class="login-role-grid">'+[
    ['super_admin','♛','Super Admin','Full system control'],
    ['admin','◆','Admin','Operations & settings'],
    ['accountant','▣','Accountant','Collections & slips'],
    ['student','◎','Student','My own record']
  ].map(r=>'<button type="button" class="login-role-card" data-login-role="'+r[0]+'"><span>'+r[1]+'</span><b>'+r[2]+'</b><small>'+r[3]+'</small></button>').join('')+'</div>';
}
function loginMarkup(){
  return '<main class="login-shell"><section class="login-card login-card-wide"><div class="login-brand"><img src="assets/logo.svg" alt="UMEED"><h1>UMEED EDUCATION SYSTEM</h1><p>Centralized Student Finance & Services</p></div>'+
    '<div id="role-step"><h3 class="login-step-title">Select your role</h3>'+roleCards()+'</div>'+
    '<form id="login-form" style="display:none"><button type="button" id="login-back" class="btn btn-ghost" style="margin-bottom:12px">← Change Role</button><div class="login-role-selected" id="login-role-selected"></div>'+
    '<div class="form-group"><label id="login-identity-label">Email</label><input id="login-identity" autocomplete="username" required></div>'+
    '<div class="form-group" style="margin-top:12px"><label>Password</label><input id="login-password" type="password" autocomplete="current-password" required></div>'+
    '<button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:18px" type="submit">Secure Sign In</button><p id="login-error" class="page-subtitle" style="color:#ff9aaa;text-align:center"></p></form></section></main>';
}
function roleMatches(expected,actual){
  if(!expected)return true;
  if(expected==='super_admin')return ['owner','super_admin'].includes(actual);
  if(expected==='accountant')return ['accountant','cashier'].includes(actual);
  return expected===actual;
}
function showLogin(){
  document.getElementById('app-root').innerHTML=loginMarkup();expectedLoginRole=null;
  document.querySelectorAll('[data-login-role]').forEach(btn=>btn.onclick=()=>{
    expectedLoginRole=btn.dataset.loginRole;document.getElementById('role-step').style.display='none';document.getElementById('login-form').style.display='block';
    const student=expectedLoginRole==='student';
    document.getElementById('login-role-selected').innerHTML='<b>'+btn.querySelector('b').textContent+'</b><small>'+btn.querySelector('small').textContent+'</small>';
    document.getElementById('login-identity-label').textContent=student?'Roll Number':'Email';
    const input=document.getElementById('login-identity');input.type=student?'text':'email';input.placeholder=student?'e.g. 606':'name@example.com';input.value='';input.focus();
  });
  document.getElementById('login-back').onclick=()=>{expectedLoginRole=null;document.getElementById('role-step').style.display='block';document.getElementById('login-form').style.display='none';document.getElementById('login-error').textContent=''};
  document.getElementById('login-form').onsubmit=async e=>{
    e.preventDefault();const err=document.getElementById('login-error');err.textContent='Signing in…';
    try{
      const raw=document.getElementById('login-identity').value.trim();
      const email=expectedLoginRole==='student'?raw.toLowerCase()+'@student.umeedschool.local':raw;
      await AuthService.signIn(email,document.getElementById('login-password').value);err.textContent='';
      await bootAuthenticated(expectedLoginRole);
    }catch(ex){err.textContent=ex.message}
  };
}
function showDefaulterNotice(){
  const role=SupabaseSyncService.profile?.role;if(role==='student')return;
  const now=new Date();if(now.getDate()<7)return;
  const year=now.getFullYear(),month=now.getMonth()+1;
  const defaulters=(state.students||[]).filter(s=>String(s.status||'active')==='active').map(s=>computeStudentLedger(state,s.id,year)).filter(l=>l&&l.monthly[month-1]?.pending>0);
  if(defaulters.length)PopupService.warning(defaulters.length+' student(s) are fee defaulters for '+lMonth(month)+'. Open Reports to review and send WhatsApp reminders.');
}
function lMonth(m){return ['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]}

async function bootAuthenticated(expectedRole=null){
  if(navigator.onLine&&!AuthService.offlineSession){
    try{
      await SupabaseSyncService.loadProfile();
      if(!roleMatches(expectedRole,SupabaseSyncService.profile.role)){const actual=SupabaseSyncService.profile.role;await AuthService.signOut();SupabaseSyncService.profile=null;throw new Error('This account is authorized as '+actual+', not the selected role.')}
      state.profile=SupabaseSyncService.profile;await persist();
    }catch(e){if(AuthService.token())await AuthService.signOut();PopupService.error(e.message);showLogin();return}
  }else{
    if(!state.profile){await AuthService.signOut();PopupService.error('This device has no cached UMEED profile. Connect to the internet and sign in once.');showLogin();return}
    SupabaseSyncService.profile=state.profile;
  }

  const shell=await fetch('app-shell.html',{cache:'no-store'});document.getElementById('app-root').innerHTML=await shell.text();
  AppContext.state=state;AppContext.profile=SupabaseSyncService.profile;AppContext.navigate=r=>NavigationController.go(r);AppContext.save=persist;
  AppContext.refreshCloud=refreshCloud;AppContext.syncPending=()=>syncPending({silent:false});AppContext.signOut=signOut;AppContext.setSelectedSlip=setSelectedSlip;AppContext.setSelectedCounterSale=setSelectedCounterSale;
  await refreshCloud({quiet:true});
  await NavigationController.init({profile:SupabaseSyncService.profile,onRefresh:async()=>{await refreshCloud();await NavigationController.go(NavigationController.current,false)},onSync:()=>syncPending({silent:false})});
  updateConnection();await autoSyncAccountant();showDefaulterNotice();
}
window.addEventListener('online',async()=>{
  updateConnection();
  if(AuthService.offlineSession){try{await AuthService.refresh();PopupService.info('Online again. Login token refreshed.')}catch{PopupService.warning('Reconnect requires sign-in before cloud sync.');return}}
  await autoSyncAccountant();updateConnection();
});
window.addEventListener('offline',updateConnection);
if('serviceWorker'in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
const restored=await AuthService.restore();if(restored)await bootAuthenticated();else showLogin();
