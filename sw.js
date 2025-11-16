const CACHE_NAME = 'roshan-beats-v2';
const STATIC_CACHE = 'roshan-beats-static-v2';
const DYNAMIC_CACHE = 'roshan-beats-dynamic-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/components.css',
  '/css/themes.css',
  '/css/responsive.css',
  '/css/animations.css',
  '/js/main.js'
];

// Cache-first strategy for static assets
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
};

// Network-first strategy for dynamic data
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-first for static assets
  if (event.request.url.includes('/css/') ||
      event.request.url.includes('/js/') ||
      event.request.url.includes('/assets/') ||
      event.request.url.includes('/manifest.json')) {
    event.respondWith(cacheFirst(event.request));
  }
  // Network-first for API calls or dynamic content
  else if (url.pathname.startsWith('/api/') ||
           event.request.url.includes('lastfm') ||
           event.request.method !== 'GET') {
    event.respondWith(networkFirst(event.request));
  }
  // Default cache-first
  else {
    event.respondWith(cacheFirst(event.request));
  }
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'cache-song') {
    // Cache song logic here, e.g., fetch and cache
    const songId = event.data.songId;
    // Implement caching
  }
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implement data sync logic, e.g., upload pending data
  console.log('Syncing data...');
  // Fetch pending data from IndexedDB and upload
}
