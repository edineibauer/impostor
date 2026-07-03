const CACHE_NAME = 'impostor-v12';
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './game-local.js',
    './game-online.js',
    './game-quemsoueu.js',
    './game-verdade.js',
    './i18n.js',
    './words-pt.js',
    './words-en.js',
    './words-es.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip Firebase and external API calls
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') ||
        event.request.url.includes('gstatic')) {
        return;
    }
    
    // Network-first: com internet, sempre serve a versão mais recente e
    // atualiza o cache; sem internet, cai no cache (offline continua ok).
    // Imagens ficam cache-first (não mudam e são pesadas).
    const isImage = event.request.destination === 'image' || /\.(png|jpg|jpeg|webp|ico)(\?|$)/.test(event.request.url);

    if (isImage) {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            }))
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
            })
    );
});
