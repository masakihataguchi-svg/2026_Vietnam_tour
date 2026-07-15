const CACHE_NAME = 'vietnam-tour-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './config.json',
  './icon.png',
  './manifest.json'
];

// インストール時にコアファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュのクリーンアップ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ネットワーク優先 (Googleスプレッドシートのリアルタイム更新を阻害しないため)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // オンラインで正常取得できたら、自ドメインのリソースはキャッシュを更新
        if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
