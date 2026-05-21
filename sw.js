const CACHE = 'pirozhki-v2';
const ASSETS = ['/', '/index.html', '/admin.html', '/login.html', '/core.js', '/i18n.js', '/style.css', '/manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
