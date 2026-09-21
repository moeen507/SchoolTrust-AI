const CACHE='umeed-fee-v3-shell';
const SHELL=['./index.html','./app-shell.html','./css/style.css','./css/print-a5.css','./assets/logo.svg','./js/app-state.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('.supabase.co')) return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});