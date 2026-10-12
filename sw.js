const CACHE_NAME = 'cwy-hub-v4';
const ASSETS = ['./index.html', './manifest.json', './main.png', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // One unavailable icon must not prevent the app screen from being cached.
    await Promise.allSettled(ASSETS.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('cwy-hub-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only cache this app's assets; linked apps manage their own requests.
  const known = ASSETS.some(asset => new URL(asset, self.registration.scope).pathname === url.pathname);
  const home = request.mode === 'navigate' && (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname);
  if (!known && !home) return;
  const key = home ? new URL('./index.html', self.registration.scope).href : request;
  const refresh = (async () => {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(key, response.clone());
    }
    return response;
  })();
  event.waitUntil(refresh.catch(() => {}));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    return cached || await refresh;
  })());
});
