const CACHE='umeed-fee-v32-offline-r2';
async function installShell(){
  const cache=await caches.open(CACHE);
  let files=['./','./index.html'];
  try{
    const r=await fetch('./precache.json',{cache:'no-store'});
    if(r.ok)files=files.concat(await r.json());
  }catch{}
  files=[...new Set(files)];
  await cache.addAll(files);
}
self.addEventListener('install',e=>e.waitUntil(installShell().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('.supabase.co'))return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c)).catch(()=>{});return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    if(cached)return cached;
    return fetch(e.request).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{})}return r});
  }));
});