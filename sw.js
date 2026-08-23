// JapocanoPOS Service Worker
// オフライン対応のためのキャッシュ管理

const CACHE_NAME = 'japocano-pos-v1';
const OFFLINE_URL = '/anime-pos/index.html';

// キャッシュするファイル一覧
const CACHE_FILES = [
  '/anime-pos/',
  '/anime-pos/index.html',
];

// インストール時：必要なファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    }).then(() => self.skipWaiting())
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時：キャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  // GASへのAPIリクエストはキャッシュしない
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 正常なレスポンスのみキャッシュ
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(() => {
        // オフライン時はキャッシュから返す
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
