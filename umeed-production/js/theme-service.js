const KEY='umeed:theme';
const THEMES=new Set(['dark','light']);
function current(){const t=document.documentElement.dataset.theme;return THEMES.has(t)?t:'dark'}
function apply(theme,{persist=true}={}){
  const next=THEMES.has(theme)?theme:'dark';
  document.documentElement.dataset.theme=next;
  document.documentElement.style.colorScheme=next;
  if(persist){try{localStorage.setItem(KEY,next)}catch{}}
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',next==='light'?'#F7F3EC':'#0A0C10');
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    btn.setAttribute('aria-pressed',String(next==='light'));
    btn.setAttribute('title',next==='light'?'Switch to dark mode':'Switch to white mode');
    const icon=btn.querySelector('[data-theme-icon]');if(icon)icon.textContent=next==='light'?'☾':'☀';
    const label=btn.querySelector('[data-theme-label]');if(label)label.textContent=next==='light'?'Dark':'White';
  });
  document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeChoice===next));
  window.dispatchEvent(new CustomEvent('umeed:theme',{detail:{theme:next}}));
  return next;
}
function bind(root=document){
  root.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    if(btn.dataset.themeBound)return;btn.dataset.themeBound='1';btn.addEventListener('click',()=>apply(current()==='light'?'dark':'light'));
  });
  root.querySelectorAll('[data-theme-choice]').forEach(btn=>{
    if(btn.dataset.themeBound)return;btn.dataset.themeBound='1';btn.addEventListener('click',()=>apply(btn.dataset.themeChoice));
  });
  apply(current(),{persist:false});
}
export const ThemeService={current,apply,bind,toggle:()=>apply(current()==='light'?'dark':'light')};