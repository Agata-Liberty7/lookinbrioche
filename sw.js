const CACHE = 'lookin-v2';

const ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/admin.html',
  '/login.html',
  '/core.js',
  '/i18n.js',
  '/install-prompt.js',
  '/style.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('lookin-') && key !== CACHE)
            .map(key => caches.delete(key))
        )
      ),
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
