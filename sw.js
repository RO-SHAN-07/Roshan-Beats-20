const CACHE_NAME = 'roshan-beats-v3';
const STATIC_CACHE = 'roshan-beats-static-v3';
const DYNAMIC_CACHE = 'roshan-beats-dynamic-v3';
const AUDIO_CACHE = 'roshan-beats-audio-v3';
const IMAGE_CACHE = 'roshan-beats-images-v3';

// Aggressive precaching strategy
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Critical CSS
  '/css/base.css',
  '/css/components.css',
  // Fonts
  '/assets/fonts/roboto.woff2',
  '/assets/fonts/material-icons.woff2',
  // Icons
  '/assets/icons/play.png',
  '/assets/icons/pause.png',
  '/assets/icons/next.png',
  '/assets/icons/prev.png',
  // Default images
  '/assets/images/default-cover.png',
  '/assets/images/default-playlist.png',
];

// Additional resources to precache
const additionalUrlsToCache = [
  '/css/themes.css',
  '/css/responsive.css',
  '/css/animations.css',
  '/js/modules/ui.js',
  '/js/modules/storage.js',
  '/js/modules/performance.js',
  '/js/modules/resource-hints.js',
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

// Stale-while-revalidate strategy for fresh content with cache fallback
const staleWhileRevalidate = async (request, cacheName = STATIC_CACHE) => {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Always try to fetch fresh version in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.error('Stale-while-revalidate fetch failed:', error);
    return null;
  });

  // Return cached version immediately if available, otherwise wait for network
  if (cachedResponse) {
    // Update cache in background
    fetchPromise.then(() => {});
    return cachedResponse;
  }

  // No cache, wait for network
  const networkResponse = await fetchPromise;
  return networkResponse || new Response('Offline', { status: 503 });
};

// Network-aware caching strategy
const networkAwareCache = async (request, cacheName = DYNAMIC_CACHE) => {
  // Check if we have network info from main thread
  const networkInfo = await getNetworkInfo();

  if (networkInfo && networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
    // On slow networks, prefer cache aggressively
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Still try network but with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const networkResponse = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('Slow network, using cache only', { status: 503 });
    }
  } else {
    // Normal network, use network-first
    return networkFirst(request, cacheName);
  }
};

// Store network info from main thread
let currentNetworkInfo = null;

async function getNetworkInfo() {
  return currentNetworkInfo;
}

// Offline queue using IndexedDB
const DB_NAME = 'roshan-beats-offline-queue';
const DB_VERSION = 1;
const QUEUE_STORE = 'failed-requests';

async function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function queueFailedRequest(requestData) {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    await new Promise((resolve, reject) => {
      const request = store.add({
        url: requestData.url,
        method: requestData.method || 'GET',
        headers: requestData.headers || {},
        body: requestData.body || null,
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

async function getQueuedRequests() {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get queued requests:', error);
    return [];
  }
}

async function removeQueuedRequest(id) {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error('Failed to remove queued request:', error);
  }
}

async function retryQueuedRequests() {
  const queuedRequests = await getQueuedRequests();
  for (const queued of queuedRequests) {
    try {
      const response = await fetch(queued.url, {
        method: queued.method,
        headers: queued.headers,
        body: queued.body,
      });
      if (response.ok) {
        await removeQueuedRequest(queued.id);
        console.log('Retried queued request successfully:', queued.url);
      } else {
        console.log('Queued request still failing:', queued.url);
      }
    } catch (error) {
      console.log('Retry failed for queued request:', queued.url, error);
    }
  }
}

// Network-first strategy for dynamic data
const networkFirst = async (request, cacheName = DYNAMIC_CACHE) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network request failed:', error);
    // Queue failed requests for retry (for non-GET methods)
    if (request.method !== 'GET') {
      queueFailedRequest({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.body ? await request.clone().text() : null,
      });
    }
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
};

// Audio caching strategy - cache aggressively for offline playback
const audioCacheStrategy = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache audio files aggressively
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Audio fetch failed:', error);
    return new Response('Audio unavailable offline', { status: 503 });
  }
};

// Image caching strategy with WebP fallback
const imageCacheStrategy = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Try to serve WebP version if original failed
    const webpUrl = request.url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (webpUrl !== request.url) {
      const webpRequest = new Request(webpUrl);
      const webpCached = await caches.match(webpRequest);
      if (webpCached) {
        return webpCached;
      }
    }

    return new Response('Image unavailable', { status: 503 });
  }
};

self.addEventListener('install', event => {
  console.log('Service Worker installing with aggressive caching');

  event.waitUntil(
    Promise.all([
      // Cache critical resources first
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Caching critical resources...');
          return cache.addAll(urlsToCache);
        }),

      // Cache additional resources
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Caching additional resources...');
          return cache.addAll(additionalUrlsToCache);
        }),

      // Pre-warm image cache with default images
      caches.open(IMAGE_CACHE)
        .then(cache => {
          const imageUrls = [
            '/assets/images/default-cover.png',
            '/assets/images/default-playlist.png',
            '/assets/icons/play.png',
            '/assets/icons/pause.png',
          ];
          return cache.addAll(imageUrls);
        }),
    ]),
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating with enhanced cache management');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Keep only current version caches
            const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE, IMAGE_CACHE];
            if (!validCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),

      // Implement cache size management
      manageCacheSize(),

      // Claim clients immediately
      self.clients.claim(),
    ]),
  );
});

// Cache size management to prevent unlimited growth
async function manageCacheSize() {
  const maxCacheSize = {
    [DYNAMIC_CACHE]: 50 * 1024 * 1024, // 50MB for dynamic content
    [AUDIO_CACHE]: 500 * 1024 * 1024,  // 500MB for audio
    [IMAGE_CACHE]: 100 * 1024 * 1024,   // 100MB for images
  };

  for (const [cacheName, maxSize] of Object.entries(maxCacheSize)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      if (keys.length > 100) { // If more than 100 items, check size
        // Simple LRU: remove oldest entries if over limit
        // In production, you'd track access times
        const toDelete = keys.slice(0, Math.floor(keys.length * 0.2)); // Remove 20% oldest
        await Promise.all(toDelete.map(request => cache.delete(request)));
        console.log(`Cleaned up ${toDelete.length} items from ${cacheName}`);
      }
    } catch (error) {
      console.error(`Failed to manage cache size for ${cacheName}:`, error);
    }
  }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Aggressive caching strategies based on resource type
  if (event.request.method !== 'GET') {
    // Handle POST, PUT, DELETE requests
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Audio files - cache aggressively
  if (event.request.url.includes('.mp3') ||
      event.request.url.includes('.wav') ||
      event.request.url.includes('.flac') ||
      event.request.url.includes('.ogg') ||
      event.request.url.includes('.m4a')) {
    event.respondWith(audioCacheStrategy(event.request));
    return;
  }

  // Images - network-aware caching
  if (event.request.url.includes('.png') ||
      event.request.url.includes('.jpg') ||
      event.request.url.includes('.jpeg') ||
      event.request.url.includes('.webp') ||
      event.request.url.includes('.gif') ||
      event.request.url.includes('.svg')) {
    event.respondWith(networkAwareCache(event.request, IMAGE_CACHE));
    return;
  }

  // Fonts - cache aggressively
  if (event.request.url.includes('.woff') ||
      event.request.url.includes('.woff2') ||
      event.request.url.includes('.ttf')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Static assets - stale while revalidate for freshness
  if (event.request.url.includes('/css/') ||
      event.request.url.includes('/js/') ||
      event.request.url.includes('/assets/') ||
      event.request.url.includes('/manifest.json')) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // API calls - network-aware caching
  if (url.pathname.startsWith('/api/') ||
      event.request.url.includes('lastfm') ||
      event.request.url.includes('musicbrainz') ||
      event.request.url.includes('spotify')) {
    event.respondWith(networkAwareCache(event.request, DYNAMIC_CACHE));
    return;
  }

  // HTML pages - network first for fresh content
  if (event.request.url.includes('.html') ||
      event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  // Default strategy
  event.respondWith(cacheFirst(event.request, DYNAMIC_CACHE));
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'cache-song') {
    // Cache song logic here, e.g., fetch and cache
    const songId = event.data.songId;
    // Implement caching
  }

  if (event.data && event.data.action === 'network-info') {
    // Update network info for adaptive caching
    currentNetworkInfo = event.data.info;
  }

  if (event.data && event.data.action === 'queue-request') {
    // Queue failed request for offline retry
    queueFailedRequest(event.data.request);
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('Push received:', event);

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || 'New update available!',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Roshan Beats', options),
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Syncing data...');
  // Retry queued failed requests
  await retryQueuedRequests();
  // Additional sync logic can be added here
}
