// IndexedDB and localStorage management
import { logger } from './modules/logger.js';

// IndexedDB setup
const dbName = 'RoshanBeatsDB';
const dbVersion = 1;

function openDB() {
  logger.debug('Opening IndexedDB database', { dbName, dbVersion });

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onerror = () => {
      logger.error('Failed to open IndexedDB', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      logger.info('IndexedDB opened successfully');
      resolve(request.result);
    };
    request.onupgradeneeded = (event) => {
      logger.info('Database upgrade needed', { oldVersion: event.oldVersion, newVersion: event.newVersion });
      const db = event.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
        logger.debug('Created songs object store');
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'id' });
        logger.debug('Created metadata object store');
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
        logger.debug('Created playlists object store');
      }
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user', { keyPath: 'id' });
        logger.debug('Created user object store');
      }
    };
  });
}

// Load data from IndexedDB
async function loadData() {
  logger.info('Loading data from IndexedDB');
  const startTime = performance.now();

  try {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata', 'playlists'], 'readonly');
    const songsStore = tx.objectStore('songs');
    const metadataStore = tx.objectStore('metadata');
    const playlistsStore = tx.objectStore('playlists');

    logger.debug('Fetching songs from database');
    songs = await new Promise(resolve => {
      const request = songsStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });

    logger.debug('Fetching metadata from database');
    const metadata = await new Promise(resolve => {
      const request = metadataStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });

    logger.debug('Fetching playlists from database');
    playlists = await new Promise(resolve => {
      const request = playlistsStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });

    // Merge metadata with songs
    logger.debug('Merging metadata with songs');
    songs.forEach(song => {
      const meta = metadata.find(m => m.id === song.id);
      if (meta) {
        Object.assign(song, meta);
      }
    });

    const loadTime = performance.now() - startTime;
    logger.info('Data loaded successfully', {
      songCount: songs.length,
      playlistCount: playlists.length,
      loadTime: `${loadTime.toFixed(2)}ms`
    });

    updateSongList();
    updatePlaylistList();
  } catch (error) {
    logger.error('Failed to load data from IndexedDB', error);
    throw error;
  }
}

// Save data to IndexedDB
async function saveSong(song) {
  logger.debug('Saving song to database', { title: song.title, artist: song.artist, id: song.id });

  try {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata'], 'readwrite');
    tx.objectStore('songs').put(song);
    tx.objectStore('metadata').put({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      cover: song.cover,
    });

    logger.info('Song saved successfully', { songId: song.id });
  } catch (error) {
    logger.error('Failed to save song', error, { songId: song.id });
    throw error;
  }
}

async function savePlaylist(playlist) {
  logger.debug('Saving playlist to database', { name: playlist.name, id: playlist.id, songCount: playlist.songs?.length });

  try {
    const db = await openDB();
    const tx = db.transaction('playlists', 'readwrite');
    tx.objectStore('playlists').put(playlist);

    logger.info('Playlist saved successfully', { playlistId: playlist.id, name: playlist.name });
  } catch (error) {
    logger.error('Failed to save playlist', error, { playlistId: playlist.id });
    throw error;
  }
}

// IndexedDB for user
async function saveUser(user) {
  logger.debug('Saving user profile', { userId: user.id });

  try {
    const db = await openDB();
    const tx = db.transaction('user', 'readwrite');
    tx.objectStore('user').put(user);

    logger.info('User profile saved successfully', { userId: user.id });
  } catch (error) {
    logger.error('Failed to save user profile', error, { userId: user.id });
    throw error;
  }
}

async function loadUser() {
  logger.debug('Loading user profile');

  try {
    const db = await openDB();
    const tx = db.transaction('user', 'readonly');
    const user = await new Promise(resolve => {
      const request = tx.objectStore('user').get('profile');
      request.onsuccess = () => resolve(request.result || {});
    });

    logger.info('User profile loaded', { hasProfile: !!user.id });
    return user;
  } catch (error) {
    logger.error('Failed to load user profile', error);
    throw error;
  }
}

// Export functions
export { openDB, loadData, saveSong, savePlaylist, saveUser, loadUser };
