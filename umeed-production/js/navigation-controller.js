import {ROUTE_ALIASES} from './config.js';

const LABELS={
 dashboard:'Dashboard','daily-collection':'Daily Collection',students:'Students','fee-entry':'Fee Entry',ledger:'Ledger','fee-slip':'Fee Slip',
 'student-counter':'Syllabus + Canteen',d6:'D6 / Records',reports:'Reports',settings:'Settings',users:'User Management','student-portal':'My Record'
};
const ICONS={
 dashboard:'⌂','daily-collection':'▣',students:'♙','fee-entry':'＋',ledger:'▤','fee-slip':'▧','student-counter':'◈',
 d6:'▦',reports:'◫',settings:'⚙',users:'♟','student-portal':'◎'
};
const controllers={
 dashboard:()=>import('./controllers/dashboard-controller.js'),
 'daily-collection':()=>import('./controllers/daily-collection-controller.js'),
 students:()=>import('./controllers/students-controller.js'),
 'fee-entry':()=>import('./controllers/fee-entry-controller.js'),
 ledger:()=>import('./controllers/ledger-controller.js'),
 'fee-slip':()=>import('./controllers/fee-slip-controller.js'),
 'student-counter':()=>import('./controllers/student-counter-controller.js'),
 d6:()=>import('./controllers/d6-controller.js'),
 reports:()=>import('./controllers/reports-controller.js'),
 settings:()=>import('./controllers/settings-controller.js'),
 users:()=>import('./controllers/users-controller.js'),
 'student-portal':()=>import('./controllers/student-portal-controller.js')
};
let activeController=null,role='accountant',allowed=[];
function roleName(r){return r==='owner'||r==='super_admin'?'Super Admin':r==='admin'?'Admin':r==='accountant'?'Accountant':r==='cashier'?'Cashier':r==='auditor'?'Auditor':r==='student'?'Student':r}
function routesFor(r){
  if(r==='owner'||r==='super_admin')return ['dashboard','daily-collection','students','fee-entry','ledger','fee-slip','student-counter','d6','reports','settings','users'];
  if(r==='admin')return ['dashboard','daily-collection','students','fee-entry','ledger','fee-slip','student-counter','d6','reports','settings'];
  if(r==='accountant'||r==='cashier')return ['daily-collection','fee-entry','fee-slip','student-counter'];
  if(r==='auditor')return ['daily-collection','ledger','reports'];
  if(r==='student')return ['student-portal'];
  return ['daily-collection'];
}
function normalize(route){
  const r=ROUTE_ALIASES[String(route||'').toLowerCase()]||route||'dashboard';
  return allowed.includes(r)?r:(allowed[0]||'daily-collection');
}
function setActive(route){
  document.querySelectorAll('[data-route]').forEach(el=>el.classList.toggle('active',el.dataset.route===route));
  document.querySelectorAll('.nav-link,.drawer-nav-link').forEach(el=>el.classList.toggle('active',el.dataset.route===route));
}
async function loadPage(route){
  const host=document.getElementById('page-host'),response=await fetch('pages/'+route+'.html',{cache:'no-store'});
  if(!response.ok)throw new Error('Unable to load '+route+' page.');
  host.innerHTML=await response.text();
  if(activeController?.destroy)await activeController.destroy();
  const mod=await controllers[route]();activeController=mod.default||mod;
  if(activeController?.init)await activeController.init();
}
function closeDrawer(){document.getElementById('mobile-drawer')?.classList.remove('open');document.getElementById('drawer-backdrop')?.classList.remove('show');document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','true')}
function openDrawer(){document.getElementById('mobile-drawer')?.classList.add('open');document.getElementById('drawer-backdrop')?.classList.add('show');document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','false')}
function mobileDock(){
  const dock=document.getElementById('mobile-dock');
  if(role==='student'){dock.innerHTML='<button data-route="student-portal" class="active"><span>◎</span><small>My Record</small></button><button id="dock-more"><span>•••</span><small>More</small></button>';document.getElementById('dock-more').onclick=openDrawer;return}
  const routes=(role==='accountant'||role==='cashier')?['daily-collection','fee-entry','student-counter','fee-slip']:allowed.includes('dashboard')?['dashboard','students','fee-entry','student-counter']:allowed.slice(0,4);
  dock.innerHTML=routes.filter(r=>allowed.includes(r)).map(r=>'<button data-route="'+r+'" class="'+(r==='fee-entry'?'dock-primary':'')+'"><span>'+ICONS[r]+'</span><small>'+LABELS[r].replace('Syllabus + Canteen','Counter').replace('Daily Collection','Collection')+'</small></button>').join('')+'<button id="dock-more"><span>•••</span><small>More</small></button>';
  document.getElementById('dock-more').onclick=openDrawer;
}
export const NavigationController={
  current:null,
  can(route){return allowed.includes(route)},
  role(){return role},
  async init({profile,onRefresh,onSync}={}){
    role=profile?.role||'accountant';allowed=routesFor(role);
    const desktop=document.getElementById('desktop-nav'),drawer=document.getElementById('drawer-nav');
    desktop.innerHTML=allowed.map(r=>'<button class="nav-link" data-route="'+r+'"><span>'+ICONS[r]+'</span> '+LABELS[r]+'</button>').join('');
    drawer.innerHTML=allowed.map(r=>'<button class="drawer-nav-link" data-route="'+r+'"><span>'+ICONS[r]+'</span> '+LABELS[r]+'</button>').join('');
    document.getElementById('role-label').textContent=roleName(role)+' · '+(role==='student'?'Student Self Service':'Student Finance & Services');
    document.getElementById('drawer-role').textContent=roleName(role);
    if(role==='student'){document.getElementById('manual-sync-button').style.display='none';document.getElementById('cloud-refresh').title='Refresh my record'}
    mobileDock();
    document.addEventListener('click',e=>{const el=e.target.closest('[data-route]');if(!el)return;e.preventDefault();this.go(el.dataset.route)});
    document.getElementById('mobile-menu-button').onclick=openDrawer;document.getElementById('drawer-close').onclick=closeDrawer;document.getElementById('drawer-backdrop').onclick=closeDrawer;
    document.getElementById('cloud-refresh').onclick=()=>onRefresh?.();document.getElementById('manual-sync-button').onclick=()=>onSync?.();
    await this.go(location.hash.replace(/^#/,'')||allowed[0],false);
  },
  async go(route,updateHash=true){route=normalize(route);this.current=route;if(updateHash)history.replaceState(null,'','#'+route);setActive(route);closeDrawer();await loadPage(route);return route},
  updateConnection({online,pending=0}){
    const pill=document.getElementById('connection-pill');if(!pill)return;
    pill.textContent=online?(pending?'Online · '+pending+' pending':'Online'):'Offline · '+pending+' pending';pill.className='connection-pill '+(online?(pending?'pending':'online'):'');
    const count=document.getElementById('queue-count');if(count)count.textContent=String(pending);
  }
};