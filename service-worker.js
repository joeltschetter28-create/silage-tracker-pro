const CACHE='silage-tracker-pro-v3.14.1-001';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./silage-banner.png','./load-sound.mp3','./chime-alt.mp3','./core-state.js','./loads.js','./navigation-setup.js','./counter-and-picker.js','./truck-and-batch-edit.js','./render-and-reports.js','./csv-io.js','./backup-and-init.js','./app-init.js','./scroll-collapse.js','./keyboard-assist.js'];
self.addEventListener('install',event=>{
  // Cached one at a time on purpose: addAll() rejects the whole install if a
  // single asset 404s, which silently leaves the app with no worker at all.
  event.waitUntil(caches.open(CACHE)
    .then(cache=>Promise.allSettled(ASSETS.map(asset=>cache.add(asset))))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  // The page itself is fetched network-first so a new deploy shows up straight away.
  // Everything else stays cache-first; the cache name above busts them on release.
  if(event.request.mode==='navigate'||event.request.destination==='document'){
    event.respondWith(fetch(event.request).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy))}
      return response;
    }).catch(()=>caches.match('./index.html').then(hit=>hit||caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
    return response;
  })));
});
