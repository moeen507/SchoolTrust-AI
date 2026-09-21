import {ROUTES,ROUTE_ALIASES} from './config.js';

const LABELS={
 dashboard:'Dashboard',students:'Students','fee-entry':'Fee Entry',ledger:'Ledger','fee-slip':'Fee Slip',
 'student-counter':'Syllabus + Canteen',d6:'D6 / Records',reports:'Reports',settings:'Settings'
};
const ICONS={
 dashboard:'⌂',students:'♙','fee-entry':'＋',ledger:'▤','fee-slip':'▧','student-counter':'◈',
 d6:'▦',reports:'◫',settings:'⚙'
};
const controllers={
 dashboard:()=>import('./controllers/dashboard-controller.js'),
 students:()=>import('./controllers/students-controller.js'),
 'fee-entry':()=>import('./controllers/fee-entry-controller.js'),
 ledger:()=>import('./controllers/ledger-controller.js'),
 'fee-slip':()=>import('./controllers/fee-slip-controller.js'),
 'student-counter':()=>import('./controllers/student-counter-controller.js'),
 d6:()=>import('./controllers/d6-controller.js'),
 reports:()=>import('./controllers/reports-controller.js'),
 settings:()=>import('./controllers/settings-controller.js')
};
let activeController=null;
function normalize(route){return ROUTE_ALIASES[String(route||'').toLowerCase()]||'dashboard'}
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
function closeDrawer(){
  document.getElementById('mobile-drawer')?.classList.remove('open');
  document.getElementById('drawer-backdrop')?.classList.remove('show');
  document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','true');
}
function openDrawer(){
  document.getElementById('mobile-drawer')?.classList.add('open');
  document.getElementById('drawer-backdrop')?.classList.add('show');
  document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','false');
}
export const NavigationController={
  current:'dashboard',
  async init({onRefresh,onSync}={}){
    const desktop=document.getElementById('desktop-nav'),drawer=document.getElementById('drawer-nav');
    desktop.innerHTML=ROUTES.map(r=>'<button class="nav-link" data-route="'+r+'"><span>'+ICONS[r]+'</span> '+LABELS[r]+'</button>').join('');
    drawer.innerHTML=ROUTES.map(r=>'<button class="drawer-nav-link" data-route="'+r+'"><span>'+ICONS[r]+'</span> '+LABELS[r]+'</button>').join('');
    document.addEventListener('click',e=>{const el=e.target.closest('[data-route]');if(!el)return;e.preventDefault();this.go(el.dataset.route)});
    document.getElementById('mobile-menu-button').onclick=openDrawer;document.getElementById('dock-more').onclick=openDrawer;
    document.getElementById('drawer-close').onclick=closeDrawer;document.getElementById('drawer-backdrop').onclick=closeDrawer;
    document.getElementById('cloud-refresh').onclick=()=>onRefresh?.();document.getElementById('manual-sync-button').onclick=()=>onSync?.();
    await this.go(location.hash.replace(/^#/,'')||'dashboard',false);
  },
  async go(route,updateHash=true){
    route=normalize(route);this.current=route;if(updateHash)history.replaceState(null,'','#'+route);
    setActive(route);closeDrawer();await loadPage(route);return route;
  },
  updateConnection({online,pending=0}){
    const pill=document.getElementById('connection-pill');if(!pill)return;
    pill.textContent=online?(pending?'Online · '+pending+' pending':'Online'):'Offline · '+pending+' pending';
    pill.className='connection-pill '+(online?(pending?'pending':'online'):'');
    const count=document.getElementById('queue-count');if(count)count.textContent=String(pending);
  }
};