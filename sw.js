// Service Worker for 화성차체3부 당직 관리 시스템 PWA
const CACHE_NAME = 'duty-manager-v2.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 설치 이벤트 - 캐시 저장
self.addEventListener('install', event => {
  console.log('[Service Worker] 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 캐시 저장 중');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 즉시 활성화
  );
});

// 활성화 이벤트 - 이전 캐시 삭제
self.addEventListener('activate', event => {
  console.log('[Service Worker] 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 이전 캐시 삭제:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백 전략
self.addEventListener('fetch', event => {
  // Confluence API 요청은 항상 네트워크 사용 (실시간 데이터)
  if (event.request.url.includes('confluence.hmg-corp.io')) {
    event.respondWith(
      fetch(event.request)
        .catch(err => {
          console.warn('[Service Worker] Confluence API 연결 실패:', err);
          return new Response(
            JSON.stringify({ error: 'API 연결 실패', offline: true }), 
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 일반 리소스는 네트워크 우선, 실패시 캐시 사용
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공한 응답을 캐시에 저장
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패시 캐시에서 가져오기
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] 캐시에서 제공:', event.request.url);
            return cachedResponse;
          }
          // 캐시에도 없으면 오프라인 페이지 표시
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 푸시 알림 이벤트 (향후 확장 가능)
self.addEventListener('push', event => {
  console.log('[Service Worker] 푸시 알림 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 당직 교환 요청이 있습니다.',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'duty-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: '확인하기', icon: './icons/icon-72x72.png' },
      { action: 'close', title: '닫기', icon: './icons/icon-72x72.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('당직 관리 알림', options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 알림 클릭:', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// 백그라운드 동기화 (향후 확장 가능)
self.addEventListener('sync', event => {
  console.log('[Service Worker] 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'sync-duty-data') {
    event.waitUntil(
      // Confluence 데이터 동기화 로직
      fetch('./').then(() => {
        console.log('[Service Worker] 데이터 동기화 완료');
      })
    );
  }
});

// 메시지 수신 (앱과 Service Worker 간 통신)
self.addEventListener('message', event => {
  console.log('[Service Worker] 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache);
      })
    );
  }
});

console.log('[Service Worker] 로드 완료');
