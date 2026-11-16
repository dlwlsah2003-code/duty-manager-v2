const CACHE_NAME = 'duty-manager-v3-4'; // 버전 올려서 구 캐시 강제 삭제
const STATIC = ['./', './index.html', './manifest.json', './launchericon-192x192.png'];
const DB = 'https://duty-manager-3c981-default-rtdb.asia-southeast1.firebasedatabase.app';

let currentUser = '';
let es = null;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if(u.includes('firebase') || u.includes('gstatic.com') || u.includes('googleapis.com') || u.includes('onesignal.com')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if(res && res.status === 200 && res.type !== 'opaque') caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
    return res;
  })).catch(() => caches.match('./index.html')));
});
self.addEventListener('message', e => {
  if(!e.data) return;
  if(e.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if(e.data.type === 'SET_USER') { currentUser = e.data.username || ''; currentUser ? startListening() : stopListening(); return; }
  if(e.data.type === 'CLEAR_USER') { currentUser = ''; stopListening(); }
});
function startListening() {
  stopListening();
  if(!currentUser) return;
  const safe = currentUser.replace(/[.#$[\]]/g, '_');
  try {
    es = new EventSource(`${DB}/notifications/${safe}.json`);
    es.addEventListener('put', onFBEvent);
    es.addEventListener('patch', onFBEvent);
    es.onerror = () => { stopListening(); setTimeout(() => { if(currentUser) startListening(); }, 15000); };
  } catch(err) { console.warn('[SW] EventSource 실패:', err); }
}
function stopListening() { if(es) { es.close(); es = null; } }
async function onFBEvent(e) {
  if(!currentUser) return;
  let payload; try { payload = JSON.parse(e.data); } catch { return; }
  if(!payload || !payload.data) return;
  const safe = currentUser.replace(/[.#$[\]]/g, '_');
  const data = payload.data;
  const entries = (typeof data === 'object' && data !== null) ? Object.entries(data) : [];
  for(const [key, notif] of entries) {
    if(!notif || notif.shown) continue;
    await self.registration.showNotification(notif.title || '🗓️ 당직 관리', {
      body: notif.body || '', icon: './launchericon-192x192.png',
      badge: './launchericon-192x192.png', tag: key,
      requireInteraction: true, vibrate: [200, 100, 200], data: { url: './' }
    });
    fetch(`${DB}/notifications/${safe}/${key}.json`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({shown: true})
    }).catch(() => {});
  }
}
self.addEventListener('push', e => {
  if(!e.data) return;
  let d; try { d = e.data.json(); } catch { d = {title:'당직 관리', body:e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || '🗓️ 당직 관리', {
    body: d.body || '', icon: './launchericon-192x192.png',
    badge: './launchericon-192x192.png', tag: d.tag || 'duty',
    requireInteraction: true, vibrate: [200, 100, 200], data: {url: './'}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(cs => {
    for(const c of cs) { if('focus' in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
