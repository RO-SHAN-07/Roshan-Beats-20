// Roshan Beats Offline Module
// Handles service worker registration, caching, and background sync

let isOnline = navigator.onLine;
let serviceWorkerRegistration = null;

export function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        serviceWorkerRegistration = registration;
        console.log('Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              emit('sw-update');
            }
          });
        });

        // Background sync support
        if ('sync' in registration) {
          // Register sync for data uploads
          registration.sync.register('sync-data');
        }
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

export function cacheSong(songId) {
  // This could trigger caching in SW or use Cache API directly
  if (serviceWorkerRegistration) {
    // Send message to SW to cache the song
    serviceWorkerRegistration.active.postMessage({
      action: 'cache-song',
      songId: songId
    });
  }
}

export function isOnline() {
  return navigator.onLine;
}

export function syncData() {
  if (serviceWorkerRegistration && 'sync' in serviceWorkerRegistration) {
    serviceWorkerRegistration.sync.register('sync-data');
  } else {
    // Fallback: sync immediately if online
    if (isOnline()) {
      // Perform sync logic here, e.g., upload pending data
      emit('sync-complete');
    }
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  isOnline = true;
  emit('online');
  // Auto-sync when coming online
  syncData();
});

window.addEventListener('offline', () => {
  isOnline = false;
  emit('offline');
});

// Event system for this module
let eventListeners = {};

function emit(event, data) {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback(data));
  }
}

export function on(event, callback) {
  eventListeners[event] = eventListeners[event] || [];
  eventListeners[event].push(callback);
}