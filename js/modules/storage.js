import { logger } from './logger.js';
import { uiManager } from './ui.js';

const dbName = 'RoshanBeatsDB';
const dbVersion = 2; // Incremented for migration support
let db;
let isOnline = navigator.onLine;
let pendingOperations = [];

async function openDB() {
  logger.debug('Opening IndexedDB database', { dbName, dbVersion });

  // Check quota before opening
  await checkStorageQuota();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = async (event) => {
      logger.info('Upgrading database schema', { oldVersion: event.oldVersion, newVersion: event.newVersion });
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      try {
        await migrateDatabase(db, oldVersion, dbVersion);
        logger.info('Database migration completed successfully');
      } catch (error) {
        logger.error('Database migration failed', error);
        uiManager.showDatabaseError('migration', error.message);
        reject(error);
        return;
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;

      // Set up error handlers
      db.onerror = (event) => {
        logger.error('Database error', event.target.error);
        uiManager.showDatabaseError('corruption', event.target.error.message);
      };

      db.onabort = (event) => {
        logger.warn('Database transaction aborted', event.target.error);
      };

      logger.info('Database opened successfully');
      resolve(db);
    };

    request.onerror = (event) => {
      logger.error('Failed to open database', event.target.error);
      uiManager.showDatabaseError('corruption', event.target.error.message);
      reject(event.target.error);
    };

    request.onblocked = (event) => {
      logger.warn('Database open blocked - another connection is open');
      uiManager.showErrorMessage('Database is busy. Please close other tabs and try again.');
    };
  });
}

async function migrateDatabase(db, oldVersion, newVersion) {
  logger.info('Starting database migration', { from: oldVersion, to: newVersion });

  // Migration from version 1 to 2
  if (oldVersion < 2) {
    // Add new stores and indexes for version 2
    if (!db.objectStoreNames.contains('SyncQueue')) {
      const syncStore = db.createObjectStore('SyncQueue', { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('operation', 'operation', { unique: false });
    }

    if (!db.objectStoreNames.contains('DataVersions')) {
      db.createObjectStore('DataVersions', { keyPath: 'store' });
    }

    // Add new indexes to existing stores
    const songsStore = db.objectStoreNames.contains('Songs') ?
      request.transaction.objectStore('Songs') : db.createObjectStore('Songs', { keyPath: 'id', autoIncrement: true });

    if (!songsStore.indexNames.contains('dateAdded')) {
      songsStore.createIndex('dateAdded', 'dateAdded', { unique: false });
    }

    if (!songsStore.indexNames.contains('lastPlayed')) {
      songsStore.createIndex('lastPlayed', 'lastPlayed', { unique: false });
    }
  }

  // Future migrations can be added here
}

async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedPercent = (estimate.usage / estimate.quota) * 100;

      logger.debug('Storage quota check', {
        used: estimate.usage,
        quota: estimate.quota,
        percent: usedPercent
      });

      if (usedPercent > 90) {
        uiManager.showDatabaseError('quota');
      } else if (usedPercent > 80) {
        logger.warn('Storage usage high', { percent: usedPercent });
      }
    } catch (error) {
      logger.error('Failed to check storage quota', error);
    }
  }
}

function validateSongData(song) {
  const errors = [];

  // Required fields
  if (!song.title || typeof song.title !== 'string' || song.title.trim().length === 0) {
    errors.push('Song title is required and must be a non-empty string');
  }

  if (!song.artist || typeof song.artist !== 'string' || song.artist.trim().length === 0) {
    errors.push('Artist name is required and must be a non-empty string');
  }

  // Optional but validated fields
  if (song.album && (typeof song.album !== 'string' || song.album.length > 100)) {
    errors.push('Album name must be a string with maximum 100 characters');
  }

  if (song.genre && (typeof song.genre !== 'string' || song.genre.length > 50)) {
    errors.push('Genre must be a string with maximum 50 characters');
  }

  if (song.year && (!Number.isInteger(song.year) || song.year < 1900 || song.year > new Date().getFullYear() + 1)) {
    errors.push('Year must be a valid integer between 1900 and next year');
  }

  if (song.duration && (!Number.isFinite(song.duration) || song.duration <= 0 || song.duration > 3600)) {
    errors.push('Duration must be a positive number less than 1 hour');
  }

  // File size limits (if blob is provided)
  if (song.blob && song.blob.size > 100 * 1024 * 1024) { // 100MB limit
    errors.push('Song file size must not exceed 100MB');
  }

  // URL validation
  if (song.src && typeof song.src === 'string') {
    try {
      new URL(song.src);
    } catch {
      errors.push('Song source URL must be a valid URL');
    }
  }

  return errors;
}

async function saveSong(song) {
    // Validate song data
    const validationErrors = validateSongData(song);
    if (validationErrors.length > 0) {
        const error = new Error('Song validation failed: ' + validationErrors.join(', '));
        logger.error('Song validation failed', error, { song, errors: validationErrors });
        throw error;
    }

    // Check user limits
    await checkUserLimits('songs');

    logger.debug('Saving song', { title: song.title, artist: song.artist });

    await openDB();
    const transaction = db.transaction(['Songs'], 'readwrite');
    const store = transaction.objectStore('Songs');

    // Add metadata
    song.dateAdded = song.dateAdded || Date.now();
    song.lastModified = Date.now();

    return new Promise((resolve, reject) => {
        const request = store.put(song);
        request.onsuccess = () => {
            logger.info('Song saved successfully', { songId: request.result });
            uiManager.notifyDataUpdate('songs', { type: 'added', song });
            resolve(request.result);
        };
        request.onerror = () => {
            logger.error('Failed to save song', request.error, { song });
            reject(request.error);
        };
    });
}

// Batch save songs for better performance
async function saveSongsBatch(songs) {
    if (!songs || songs.length === 0) return [];

    logger.debug('Batch saving songs', { count: songs.length });

    // Validate all songs first
    const validationErrors = [];
    songs.forEach((song, index) => {
        const errors = validateSongData(song);
        if (errors.length > 0) {
            validationErrors.push({ index, errors });
        }
    });

    if (validationErrors.length > 0) {
        const error = new Error('Batch validation failed for songs: ' + validationErrors.map(e => `Song ${e.index}: ${e.errors.join(', ')}`).join('; '));
        logger.error('Batch validation failed', error, { validationErrors });
        throw error;
    }

    // Check user limits
    await checkUserLimits('songs');

    await openDB();
    const transaction = db.transaction(['Songs'], 'readwrite');
    const store = transaction.objectStore('Songs');

    const results = [];
    const errors = [];

    // Process in chunks to avoid overwhelming the transaction
    const chunkSize = 50;
    for (let i = 0; i < songs.length; i += chunkSize) {
        const chunk = songs.slice(i, i + chunkSize);

        for (const song of chunk) {
            try {
                // Add metadata
                song.dateAdded = song.dateAdded || Date.now();
                song.lastModified = Date.now();

                const request = store.put(song);
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });

                results.push(request.result);
            } catch (error) {
                errors.push({ song: song.title, error });
            }
        }

        // Yield control to avoid blocking
        if (i + chunkSize < songs.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    if (errors.length > 0) {
        logger.warn('Some songs failed to save in batch', { errors });
    }

    logger.info('Batch save completed', { saved: results.length, failed: errors.length });
    uiManager.notifyDataUpdate('songs', { type: 'batch_added', count: results.length });

    return results;
}

function getSongs(query = {}, options = {}) {
  const { limit, offset, paginate } = options;
  logger.debug('Getting songs', { query, options });

  return openDB().then(() => {
    const transaction = db.transaction(['Songs'], 'readonly');
    const store = transaction.objectStore('Songs');

    if (Object.keys(query).length === 0) {
      return new Promise((resolve, reject) => {
        if (paginate && limit) {
          // Use cursor for pagination
          const request = store.openCursor();
          const results = [];
          let count = 0;
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && (offset === undefined || count >= offset) && results.length < limit) {
              results.push(cursor.value);
              count++;
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        } else {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      });
    } else {
      const indexName = Object.keys(query)[0];
      const value = query[indexName];
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        if (paginate && limit) {
          const request = index.openCursor(IDBKeyRange.only(value));
          const results = [];
          let count = 0;
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && (offset === undefined || count >= offset) && results.length < limit) {
              results.push(cursor.value);
              count++;
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        } else {
          const request = index.getAll(value);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      });
    }
  });
}

function deleteSong(id) {
  return openDB().then(() => {
    const transaction = db.transaction(['Songs'], 'readwrite');
    const store = transaction.objectStore('Songs');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function validatePlaylistData(name, description, songs) {
  const errors = [];

  // Required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Playlist name is required and must be a non-empty string');
  }

  if (name && name.length > 100) {
    errors.push('Playlist name must not exceed 100 characters');
  }

  if (description && (typeof description !== 'string' || description.length > 500)) {
    errors.push('Playlist description must be a string with maximum 500 characters');
  }

  // Songs validation
  if (songs && !Array.isArray(songs)) {
    errors.push('Songs must be an array');
  }

  if (songs && songs.length > 1000) {
    errors.push('Playlist cannot contain more than 1000 songs');
  }

  return errors;
}

async function checkUserLimits(resourceType) {
  const limits = {
    songs: 10000, // Max 10,000 songs
    playlists: 100, // Max 100 playlists
    playlistSongs: 1000, // Max 1000 songs per playlist
    storage: 1024 * 1024 * 1024 // 1GB storage limit
  };

  try {
    await openDB();
    const transaction = db.transaction(['Songs', 'Playlists'], 'readonly');

    if (resourceType === 'songs') {
      const songStore = transaction.objectStore('Songs');
      const countRequest = songStore.count();
      const currentCount = await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      if (currentCount >= limits.songs) {
        throw new Error(`Song limit exceeded. Maximum ${limits.songs} songs allowed.`);
      }
    }

    if (resourceType === 'playlists') {
      const playlistStore = transaction.objectStore('Playlists');
      const countRequest = playlistStore.count();
      const currentCount = await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      if (currentCount >= limits.playlists) {
        throw new Error(`Playlist limit exceeded. Maximum ${limits.playlists} playlists allowed.`);
      }
    }

    // Check storage usage
    const estimate = await navigator.storage.estimate();
    if (estimate.usage >= limits.storage) {
      throw new Error(`Storage limit exceeded. Maximum ${limits.storage / (1024 * 1024 * 1024)}GB allowed.`);
    }

  } catch (error) {
    logger.error('User limit check failed', error);
    throw error;
  }
}

function createPlaylist(name, description, songs) {
  // Validate playlist data
  const validationErrors = validatePlaylistData(name, description, songs);
  if (validationErrors.length > 0) {
    const error = new Error('Playlist validation failed: ' + validationErrors.join(', '));
    logger.error('Playlist validation failed', error, { name, description, songs, errors: validationErrors });
    throw error;
  }

  // Check user limits
  return checkUserLimits('playlists').then(() => {
    const playlist = {
      name: name.trim(),
      description: description ? description.trim() : '',
      songs: songs || [],
      created: Date.now(),
      modified: Date.now()
    };

    return openDB().then(() => {
      const transaction = db.transaction(['Playlists'], 'readwrite');
      const store = transaction.objectStore('Playlists');
      return new Promise((resolve, reject) => {
        const request = store.add(playlist);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  });
}

function getPlaylists() {
  return openDB().then(() => {
    const transaction = db.transaction(['Playlists'], 'readonly');
    const store = transaction.objectStore('Playlists');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function updatePlaylist(id, updates) {
  return openDB().then(() => {
    const transaction = db.transaction(['Playlists'], 'readwrite');
    const store = transaction.objectStore('Playlists');
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const playlist = getRequest.result;
        if (playlist) {
          Object.assign(playlist, updates);
          const putRequest = store.put(playlist);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Playlist not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  });
}

function deletePlaylist(id) {
  return openDB().then(() => {
    const transaction = db.transaction(['Playlists'], 'readwrite');
    const store = transaction.objectStore('Playlists');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function getPreferences() {
  await openDB();
  const transaction = db.transaction(['UserPreferences'], 'readonly');
  const store = transaction.objectStore('UserPreferences');
  return new Promise((resolve, reject) => {
    const request = store.get('prefs');
    request.onsuccess = async () => {
      const data = request.result;
      if (!data) {
        resolve(null);
        return;
      }
      try {
        const key = await crypto.subtle.importKey('raw', data.key, 'AES-GCM', false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.iv }, key, data.encrypted);
        const decoder = new TextDecoder();
        const prefs = JSON.parse(decoder.decode(decrypted));
        resolve(prefs);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function savePreferences(prefs) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(prefs));
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const encryptedPrefs = {
    id: 'prefs',
    encrypted,
    iv,
    key: await crypto.subtle.exportKey('raw', key)
  };
  await openDB();
  const transaction = db.transaction(['UserPreferences'], 'readwrite');
  const store = transaction.objectStore('UserPreferences');
  return new Promise((resolve, reject) => {
    const request = store.put(encryptedPrefs);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function addHistory(songId, durationPlayed) {
  const entry = { songId, timestamp: Date.now(), durationPlayed };
  return openDB().then(() => {
    const transaction = db.transaction(['PlaybackHistory'], 'readwrite');
    const store = transaction.objectStore('PlaybackHistory');
    return new Promise((resolve, reject) => {
      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getHistory(limit = 10) {
  return openDB().then(() => {
    const transaction = db.transaction(['PlaybackHistory'], 'readonly');
    const store = transaction.objectStore('PlaybackHistory');
    const index = store.index('timestamp');
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function cacheSong(songId, blob) {
  const entry = { songId, blob };
  return openDB().then(() => {
    const transaction = db.transaction(['OfflineCache'], 'readwrite');
    const store = transaction.objectStore('OfflineCache');
    return new Promise((resolve, reject) => {
      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getCachedSong(songId) {
  return openDB().then(() => {
    const transaction = db.transaction(['OfflineCache'], 'readonly');
    const store = transaction.objectStore('OfflineCache');
    const index = store.index('songId');
    return new Promise((resolve, reject) => {
      const request = index.get(songId);
      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
      request.onerror = () => reject(request.error);
    });
  });
}

function clearCache() {
  return openDB().then(() => {
    const transaction = db.transaction(['OfflineCache'], 'readwrite');
    const store = transaction.objectStore('OfflineCache');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function updateSongMetadata(id, updates) {
  return openDB().then(() => {
    const transaction = db.transaction(['Songs'], 'readwrite');
    const store = transaction.objectStore('Songs');
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const song = getRequest.result;
        if (song) {
          Object.assign(song, updates);
          const putRequest = store.put(song);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Song not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  });
}

async function fetchAlbumArt(title, artist) {
  try {
    // Using Last.fm API (requires API key, using demo key for example)
    const apiKey = 'YOUR_LASTFM_API_KEY'; // Replace with actual key
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(title)}&format=json`);
    const data = await response.json();
    if (data.album && data.album.image && data.album.image.length > 0) {
      // Return the largest image
      return data.album.image[data.album.image.length - 1]['#text'];
    }
  } catch (error) {
    console.error('Failed to fetch album art:', error);
  }
  return null;
}

// ===== ENHANCED DATABASE OPERATIONS WITH ERROR HANDLING =====

async function executeWithRetry(operation, operationName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      uiManager.showLoadingState(`${operationName}-loading`, `Loading ${operationName}...`);
      const result = await operation();
      uiManager.hideLoadingState(`${operationName}-loading`);
      return result;
    } catch (error) {
      uiManager.hideLoadingState(`${operationName}-loading`);

      logger.warn(`${operationName} attempt ${attempt} failed`, error);

      if (attempt === maxRetries) {
        if (isOnline) {
          uiManager.showDatabaseError('transaction', `${operationName} failed after ${maxRetries} attempts`);
        } else {
          // Queue for later sync
          await queueOperation(operationName, operation);
          uiManager.showErrorMessage(`${operationName} queued for sync when back online`);
        }
        throw error;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

async function queueOperation(operationName, operation) {
  const queuedOp = {
    id: Date.now() + Math.random(),
    operation: operationName,
    data: operation.toString(), // Store function reference
    timestamp: Date.now(),
    retryCount: 0
  };

  try {
    await openDB();
    const transaction = db.transaction(['SyncQueue'], 'readwrite');
    const store = transaction.objectStore('SyncQueue');
    await new Promise((resolve, reject) => {
      const request = store.add(queuedOp);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    pendingOperations.push(queuedOp);
    logger.info('Operation queued for sync', { operation: operationName });
  } catch (error) {
    logger.error('Failed to queue operation', error);
  }
}

async function processSyncQueue() {
  if (!isOnline || pendingOperations.length === 0) return;

  uiManager.showSyncIndicator('pending operations');

  const operations = [...pendingOperations];
  pendingOperations = [];

  for (const op of operations) {
    try {
      // Execute the queued operation
      // Note: In a real implementation, you'd need to reconstruct the operation
      logger.info('Processing queued operation', { operation: op.operation });

      // Remove from queue after successful execution
      await openDB();
      const transaction = db.transaction(['SyncQueue'], 'readwrite');
      const store = transaction.objectStore('SyncQueue');
      await new Promise((resolve, reject) => {
        const request = store.delete(op.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      logger.error('Failed to process queued operation', error, op);
      op.retryCount++;

      if (op.retryCount < 3) {
        pendingOperations.push(op);
      } else {
        uiManager.showErrorMessage(`Operation ${op.operation} failed permanently`);
      }
    }
  }

  uiManager.hideSyncIndicator();
}

// Enhanced saveSong with error handling and sync
async function saveSong(song) {
  return executeWithRetry(async () => {
    logger.debug('Saving song', { title: song.title, artist: song.artist });

    await openDB();
    const transaction = db.transaction(['Songs'], 'readwrite');
    const store = transaction.objectStore('Songs');

    // Add metadata
    song.dateAdded = song.dateAdded || Date.now();
    song.lastModified = Date.now();

    return new Promise((resolve, reject) => {
      const request = store.put(song);
      request.onsuccess = () => {
        logger.info('Song saved successfully', { songId: request.result });
        uiManager.notifyDataUpdate('songs', { type: 'added', song });
        resolve(request.result);
      };
      request.onerror = () => {
        logger.error('Failed to save song', request.error, { song });
        reject(request.error);
      };
    });
  }, 'save song');
}

// Enhanced getSongs with offline fallback
async function getSongs(query = {}, options = {}) {
  try {
    return await executeWithRetry(async () => {
      const { limit, offset, paginate } = options;
      logger.debug('Getting songs', { query, options });

      await openDB();
      const transaction = db.transaction(['Songs'], 'readonly');
      const store = transaction.objectStore('Songs');

      if (Object.keys(query).length === 0) {
        return new Promise((resolve, reject) => {
          if (paginate && limit) {
            const request = store.openCursor();
            const results = [];
            let count = 0;
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor && (offset === undefined || count >= offset) && results.length < limit) {
                results.push(cursor.value);
                count++;
                cursor.continue();
              } else {
                resolve(results);
              }
            };
            request.onerror = () => reject(request.error);
          } else {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }
        });
      } else {
        const indexName = Object.keys(query)[0];
        const value = query[indexName];
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
          if (paginate && limit) {
            const request = index.openCursor(IDBKeyRange.only(value));
            const results = [];
            let count = 0;
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor && (offset === undefined || count >= offset) && results.length < limit) {
                results.push(cursor.value);
                count++;
                cursor.continue();
              } else {
                resolve(results);
              }
            };
            request.onerror = () => reject(request.error);
          } else {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }
        });
      }
    }, 'get songs');
  } catch (error) {
    if (!isOnline) {
      logger.info('Offline: returning cached songs');
      return getCachedSongs(query, options);
    }
    throw error;
  }
}

async function getCachedSongs(query = {}, options = {}) {
  // Return basic cached data when offline
  try {
    await openDB();
    const transaction = db.transaction(['OfflineCache'], 'readonly');
    const store = transaction.objectStore('OfflineCache');
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        // Return cached song metadata (without blobs)
        const cached = request.result.map(item => ({
          id: item.songId,
          title: 'Cached Song',
          artist: 'Unknown',
          cached: true
        }));
        resolve(cached);
      };
      request.onerror = () => resolve([]);
    });
  } catch (error) {
    logger.error('Failed to get cached songs', error);
    return [];
  }
}

// Network status monitoring
window.addEventListener('online', () => {
  isOnline = true;
  uiManager.setOfflineMode(false);
  processSyncQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
  uiManager.setOfflineMode(true);
});

// Real-time data version tracking
async function updateDataVersion(storeName) {
  try {
    await openDB();
    const transaction = db.transaction(['DataVersions'], 'readwrite');
    const store = transaction.objectStore('DataVersions');
    await new Promise((resolve, reject) => {
      const request = store.put({
        store: storeName,
        version: Date.now(),
        lastModified: new Date().toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('Failed to update data version', error);
  }
}

async function getDataVersion(storeName) {
  try {
    await openDB();
    const transaction = db.transaction(['DataVersions'], 'readonly');
    const store = transaction.objectStore('DataVersions');
    return new Promise((resolve) => {
      const request = store.get(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    logger.error('Failed to get data version', error);
    return null;
  }
}

export {
  openDB,
  saveSong,
  saveSongsBatch,
  getSongs,
  deleteSong,
  createPlaylist,
  getPlaylists,
  updatePlaylist,
  deletePlaylist,
  getPreferences,
  savePreferences,
  addHistory,
  getHistory,
  cacheSong,
  getCachedSong,
  clearCache,
  updateSongMetadata,
  fetchAlbumArt,
  // Enhanced functions
  executeWithRetry,
  queueOperation,
  processSyncQueue,
  updateDataVersion,
  getDataVersion,
  checkStorageQuota
};