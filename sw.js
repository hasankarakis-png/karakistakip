// Ağ öncelikli; çevrimdışıyken uygulama kabuğunu (ve Supabase istemci kütüphanesini) önbellekten açar. Supabase veri istekleri önbelleğe alınmaz.
const K="takip-v3";
const CDN="cdn.jsdelivr.net";
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==K).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  // Büyük tercih verisi: önce önbellekten hemen aç, arkada yenile.
  if(e.request.method==="GET"&&u.origin===location.origin&&u.pathname.endsWith("/tercih.json")){
    e.respondWith(caches.open(K).then(c=>c.match(e.request).then(hit=>{const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net})));return;
  }
  if(e.request.method!=="GET"||(u.origin!==location.origin&&u.hostname!==CDN))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok||r.type==="opaque"){const c=r.clone();caches.open(K).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html")||caches.match("./"))));
});
// Bildirim hangi ekranı açacağını (url, ör. "./#mesaj") taşıyabilir; açık uygulama varsa ona iletilir.
self.addEventListener("push",e=>{let d={};try{d=e.data.json()}catch(x){}const url=typeof d.url==="string"&&/^\.\/(#[a-z]+)?$/.test(d.url)?d.url:"./";e.waitUntil(self.registration.showNotification(d.title||"Karakış Takip",{body:d.body||"",icon:"icon-192.png",badge:"icon-192.png",tag:d.tag||undefined,data:{url}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||"./";e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus" in c){try{c.postMessage({go:url})}catch(x){}return c.focus()}}return clients.openWindow(url)}))});
