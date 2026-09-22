import {CONFIG} from './config.js';
import {StorageService,emptyCache} from './storage-service.js';
import {AuthService} from './auth-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {PopupService} from './popup-service.js';
import {NavigationController} from './navigation-controller.js';
import {ReportsEngine} from './reports-engine.js';
import {AppContext} from './app-context.js';\nimport {ThemeService} from './theme-service.js';

let state=emptyCache();
let autoSyncInFlight=false;

function mergeDefaults(settings={}){
  return {
    school_name:'UMEED Education System',school_phone:'',school_address:'',
    monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund,
    fee_receipt_prefix:'UES',next_fee_receipt_no:1,
    counter_receipt_prefix:'SC',next_counter_receipt_no:1,
    next_student_roll_no:1,slip_prefix:'UES',next_receipt_no:1,prepared_by:'Admin/Cashier',
    ...settings,monthly_fee:CONFIG.monthlyFee,annual_fund:CONFIG.annualFund
  };
}
async function loadUserState(){
  const uid=AuthService.user()?.id;
  state=uid?await StorageService.loadCache(uid):emptyCache();
  state.settings=mergeDefaults(state.settings);
}
async function persist(){
  const uid=AuthService.user()?.id;if(uid)await StorageService.saveCache(state,uid);
  updateConnection();
}
function updateConnection(){
  NavigationController.updateConnection({
    online:navigator.onLine&&!!AuthService.token()&&!AuthService.offlineSession,
    pending:(state.syncQueue||[]).filter(q=>q.status==='pending').length
  });
}
function overlayPending(){
  const pending=(state.syncQueue||[]).filter(x=>x.status==='pending');
  for(const q of pending){
    if(q.type==='student_upsert'){
      state.students=state.students.filter(x=>x.id!==q.payload.id);state.students.push(q.payload);
    }else if(q.type==='fee_receipt_rpc'){
      const p=q.payload,id=q.local_id||p.p_id;
      if(!state.feeReceipts.some(x=>x.id===id)){
        state.feeReceipts.push({id,org_id:SupabaseSyncService.orgId(),student_id:p.p_student_id,receipt_no:null,fee_year:Number(p.p_fee_year),payment_date:p.p_payment_date,annual_fund_paid:Number(p.p_annual_fund_paid||0),notes:String(p.p_notes||''),source_device:p.p_source_device||'offline',status:'active',sync_status:'pending',created_at:q.created_at,updated_at:q.created_at});
      }
      if(!(state.feeReceiptMonths||[]).some(x=>x.receipt_id===id)){
        const ledger=state.students.some(s=>s.id===p.p_student_id)?null:null;
        for(const line of (p.p_months||[])){
          state.feeReceiptMonths.push({id:id+':'+line.fee_month,org_id:SupabaseSyncService.orgId(),receipt_id:id,student_id:p.p_student_id,fee_month:Number(line.fee_month),fee_year:Number(p.p_fee_year),monthly_fee:0,cash_paid:Number(line.cash_paid||0),discount:Number(line.discount||0),fine:Number(line.fine||0),created_at:q.created_at,updated_at:q.created_at,_pending:true});
        }
      }
    }else if(q.type==='refund_rpc'){
      const p=q.payload,id=q.local_id||p.p_id;
      if(!state.refunds.some(x=>x.id===id))state.refunds.push({id,org_id:SupabaseSyncService.orgId(),student_id:p.p_student_id,fee_receipt_id:p.p_fee_receipt_id||null,fee_entry_id:p.p_fee_entry_id||null,fee_year:Number(p.p_fee_year),amount:Number(p.p_amount||0),refund_date:p.p_refund_date,notes:String(p.p_notes||''),status:'active',sync_status:'pending',created_at:q.created_at,updated_at:q.created_at});
    }else if(q.type==='counter_sale_rpc'){
      const p=q.payload,id=q.local_id||p.p_id;
      if(!state.counterSales.some(x=>x.id===id)){
        const total=(p.p_items||[]).reduce((a,i)=>a+Number(i.quantity||0)*Number(i.unit_price||0),0);
        state.counterSales.push({id,org_id:SupabaseSyncService.orgId(),student_id:p.p_student_id,channel:p.p_channel,receipt_no:null,sale_date:p.p_sale_date,subtotal:total,total,notes:String(p.p_notes||''),source_device:p.p_source_device||'offline',status:'active',sync_status:'pending',created_at:q.created_at,updated_at:q.created_at});
        for(const [idx,i] of (p.p_items||[]).entries())state.counterSaleItems.push({id:id+':'+idx,org_id:SupabaseSyncService.orgId(),sale_id:id,catalog_item_id:i.catalog_item_id||null,item_name:i.item_name||'',quantity:Number(i.quantity||0),unit_price:Number(i.unit_price||0),line_total:Number(i.quantity||0)*Number(i.unit_price||0),created_at:q.created_at,updated_at:q.created_at,_pending:true});
      }
    }
  }
}
async function refreshStaffCloud({quiet=false}={}){
  const cloud=await SupabaseSyncService.refreshAll();
  state.students=cloud.students||[];state.classes=cloud.classes||[];state.classFeeSchedule=cloud.classFeeSchedule||[];
  state.studentClassHistory=cloud.studentClassHistory||[];
  state.feeEntries=cloud.feeEntries||[];state.feeReceipts=cloud.feeReceipts||[];state.feeReceiptMonths=cloud.feeReceiptMonths||[];
  state.refunds=cloud.refunds||[];state.activityLog=cloud.activityLog||[];
  state.catalogItems=cloud.catalogItems||[];state.counterSales=cloud.counterSales||[];state.counterSaleItems=cloud.counterSaleItems||[];
  state.settings=mergeDefaults(cloud.settings||state.settings);overlayPending();
  state.lastCloudRefresh=new Date().toISOString();await persist();
  if(!quiet)PopupService.success('Central database refreshed.');return true;
}
async function refreshStudentCloud({quiet=false}={}){
  let bundle=await SupabaseSyncService.rpc('get_student_portal_bundle',{});
  if(Array.isArray(bundle))bundle=bundle[0]||{};
  const student=bundle.student;
  if(!student)throw new Error('Student portal data is unavailable.');
  state.studentAccount=bundle.account||null;
  state.students=[student];
  state.classes=bundle.classes||[];
  state.studentClassHistory=bundle.class_history||[];
  state.classFeeSchedule=bundle.class_fee_schedule||[];
  state.feeEntries=bundle.legacy_fee_entries||[];
  state.feeReceipts=bundle.fee_receipts||[];
  state.feeReceiptMonths=bundle.fee_receipt_months||[];
  state.refunds=bundle.refunds||[];
  state.counterSales=bundle.counter_sales||[];
  state.counterSaleItems=bundle.counter_sale_items||[];
  state.catalogItems=[];state.activityLog=[];
  state.settings=mergeDefaults(bundle.settings||{});
  state.lastCloudRefresh=new Date().toISOString();await persist();
  if(!quiet)PopupService.success('Your student record has been refreshed.');return true;
}
async function refreshCloud({quiet=false}={}){
  if(!navigator.onLine||AuthService.offlineSession){if(!quiet)PopupService.warning('Offline: using this user’s secure local cache.');return false}
  try{
    if(!SupabaseSyncService.profile)await SupabaseSyncService.loadProfile();
    state.profile=SupabaseSyncService.profile;
    return SupabaseSyncService.profile.role==='student'?await refreshStudentCloud({quiet}):await refreshStaffCloud({quiet});
  }catch(e){if(!quiet)PopupService.error('Cloud refresh failed: '+e.message);return false}
}
async function syncPending(){
  try{
    if(SupabaseSyncService.profile?.role==='student')throw new Error('Student accounts do not have data-entry sync permissions.');
    if(AuthService.offlineSession)throw new Error('Reconnect to the internet so your login token can refresh before syncing.');
    const pending=(state.syncQueue||[]).filter(q=>q.status==='pending').length;
    if(!pending){PopupService.info('No pending offline records to sync.');return}
    if(!await PopupService.confirm('Sync Pending Data','Upload '+pending+' offline change(s) to the centralized database?','Sync Now'))return;
    const result=await SupabaseSyncService.syncQueue(state,(done,total)=>PopupService.info('Syncing '+done+' of '+total+'…'));
    await refreshCloud({quiet:true});await persist();PopupService.success('Sync complete. '+result.count+' record(s) uploaded.');
    if(NavigationController.current)await NavigationController.go(NavigationController.current,false);
  }catch(e){await persist();PopupService.error(e.message)}
}
async function autoSyncPending(){
  const role=SupabaseSyncService.profile?.role;
  if(autoSyncInFlight||!navigator.onLine||AuthService.offlineSession||!['accountant','cashier'].includes(role))return false;
  const count=(state.syncQueue||[]).filter(q=>q.status==='pending').length;if(!count)return false;
  autoSyncInFlight=true;
  try{
    const result=await SupabaseSyncService.syncQueue(state);
    await refreshStaffCloud({quiet:true});
    await persist();
    PopupService.success('Connection restored — '+result.count+' offline record(s) synchronized automatically.');
    window.dispatchEvent(new CustomEvent('umeed:auto-synced',{detail:result}));
    return true;
  }catch(e){
    await persist();
    PopupService.warning('Automatic sync paused: '+e.message+' Pending data is still محفوظ locally.');
    return false;
  }finally{autoSyncInFlight=false}
}
async function setSelectedSlip(id){state.selectedSlipId=id;await persist()}
async function setSelectedCounterSale(id){state.selectedCounterSaleId=id;await persist()}
async function signOut(){
  await persist();await AuthService.signOut();SupabaseSyncService.profile=null;state=emptyCache();
  document.getElementById('app-root').innerHTML='';showLogin();
}
function loginMarkup(){
  return '<main class="login-shell"><button class="theme-toggle login-theme-toggle" data-theme-toggle type="button" aria-label="Toggle appearance"><span data-theme-icon>☀</span><span data-theme-label>White</span></button><section class="login-card role-login-card">'+
  '<div class="login-brand"><img src="assets/logo.svg" alt="UMEED"><h1>UMEED EDUCATION SYSTEM</h1><p>Centralized Student Finance & Services</p></div>'+
  '<div id="login-role-step"><p class="login-step-title">Choose your login role</p><div class="login-role-grid">'+
  '<button class="login-role-card" data-login-role="admin"><b>Super Admin / Admin</b><span>Full authorized school management</span></button>'+
  '<button class="login-role-card" data-login-role="accountant"><b>Accountant</b><span>Collections, fee slips and counter entry</span></button>'+
  '<button class="login-role-card" data-login-role="student"><b>Student</b><span>Own history, slips and downloads only</span></button>'+
  '</div></div>'+
  '<form id="login-form" style="display:none"><div class="login-selected-role"><button type="button" id="login-back" class="btn btn-ghost">← Change Role</button><b id="login-role-title"></b></div>'+
  '<div class="form-group"><label id="login-id-label">Email</label><input id="login-identifier" autocomplete="username" required></div>'+
  '<div class="form-group" style="margin-top:12px"><label>Password</label><input id="login-password" type="password" autocomplete="current-password" required></div>'+
  '<button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:18px" type="submit">Sign In</button>'+
  '<p id="login-error" class="page-subtitle" style="color:#ff9aaa;text-align:center"></p></form></section></main>';
}
function showLogin(){
  document.getElementById('app-root').innerHTML=loginMarkup();ThemeService.bind(document);let mode=null;
  const roleStep=document.getElementById('login-role-step'),form=document.getElementById('login-form');
  document.querySelectorAll('[data-login-role]').forEach(btn=>btn.onclick=()=>{
    mode=btn.dataset.loginRole;roleStep.style.display='none';form.style.display='block';
    const student=mode==='student';
    document.getElementById('login-role-title').textContent=student?'Student Login':mode==='accountant'?'Accountant Login':'Super Admin / Admin Login';
    document.getElementById('login-id-label').textContent=student?'Roll Number / Student ID':'Email';
    const id=document.getElementById('login-identifier');id.type=student?'text':'email';id.placeholder=student?'Enter roll number':'name@example.com';id.value='';id.focus();
  });
  document.getElementById('login-back').onclick=()=>{mode=null;form.style.display='none';roleStep.style.display='block';document.getElementById('login-error').textContent=''};
  form.onsubmit=async e=>{
    e.preventDefault();const err=document.getElementById('login-error');err.textContent='Signing in…';
    try{
      const identifier=document.getElementById('login-identifier').value.trim(),password=document.getElementById('login-password').value;
      if(mode==='student')await AuthService.studentSignIn(identifier,password);else await AuthService.signIn(identifier,password);
      await loadUserState();err.textContent='';await bootAuthenticated(mode);
    }catch(ex){err.textContent=ex.message}
  };
}
function modeAllowed(mode,role){
  if(!mode)return true;
  if(mode==='student')return role==='student';
  if(mode==='accountant')return ['accountant','cashier'].includes(role);
  if(mode==='admin')return ['owner','admin'].includes(role);
  return false;
}
async function maybeDefaulterAlert(){
  const role=SupabaseSyncService.profile?.role;
  if(!['owner','admin','accountant','cashier'].includes(role))return;
  const now=new Date();if(now.getDate()<7)return;
  const year=now.getFullYear(),month=now.getMonth()+1;
  const rows=ReportsEngine.monthDefaulters(state,month,year,{});
  if(!rows.length)return;
  const uid=AuthService.user()?.id||'user',day=now.toISOString().slice(0,10),key='umeed:defaulter-alert:'+uid+':'+day;
  if(localStorage.getItem(key))return;
  localStorage.setItem(key,'1');
  const open=await PopupService.confirm('Monthly Defaulter Alert',rows.length+' student(s) still have pending fee for this month. WhatsApp reminders are ready from the Defaulters page.','Open Defaulters');
  if(open&&NavigationController.can('defaulters'))await NavigationController.go('defaulters');
}
async function bootAuthenticated(expectedMode=null){
  if(navigator.onLine&&!AuthService.offlineSession){
    try{
      await SupabaseSyncService.loadProfile();
      if(!modeAllowed(expectedMode,SupabaseSyncService.profile.role))throw new Error('This account does not belong to the selected login role.');
      state.profile=SupabaseSyncService.profile;await persist();
    }catch(e){await AuthService.signOut();SupabaseSyncService.profile=null;PopupService.error(e.message);showLogin();return}
  }else{
    if(!state.profile){await AuthService.signOut();PopupService.error('This device has no cached profile. Connect to the internet and sign in once.');showLogin();return}
    SupabaseSyncService.profile=state.profile;
  }
  const shell=await fetch('app-shell.html',{cache:'no-store'});document.getElementById('app-root').innerHTML=await shell.text();ThemeService.bind(document);
  AppContext.state=state;AppContext.profile=SupabaseSyncService.profile;AppContext.navigate=r=>NavigationController.go(r);AppContext.save=persist;
  AppContext.refreshCloud=refreshCloud;AppContext.syncPending=syncPending;AppContext.signOut=signOut;AppContext.setSelectedSlip=setSelectedSlip;AppContext.setSelectedCounterSale=setSelectedCounterSale;
  await refreshCloud({quiet:true});
  await NavigationController.init({profile:SupabaseSyncService.profile,onRefresh:async()=>{await refreshCloud();await NavigationController.go(NavigationController.current,false)},onSync:syncPending});
  updateConnection();
  if(['accountant','cashier'].includes(SupabaseSyncService.profile?.role)&&navigator.onLine)setTimeout(()=>autoSyncPending(),450);
  setTimeout(()=>maybeDefaulterAlert(),350);
}
window.addEventListener('online',async()=>{
  updateConnection();
  if(AuthService.offlineSession){
    try{await AuthService.refresh();AuthService.offlineSession=false;updateConnection()}
    catch{PopupService.warning('Reconnect requires sign-in before cloud sync.');return}
  }
  await autoSyncPending();
});
window.addEventListener('offline',updateConnection);
if('serviceWorker'in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});

const restored=await AuthService.restore();
if(restored){await loadUserState();await bootAuthenticated()}else showLogin();