// IndexedDB and localStorage management
// IndexedDB setup
const dbName = 'RoshanBeatsDB';
const dbVersion = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('songs')) {
                db.createObjectStore('songs', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('user')) {
                db.createObjectStore('user', { keyPath: 'id' });
            }
        };
    });
}

// Load data from IndexedDB
async function loadData() {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata', 'playlists'], 'readonly');
    const songsStore = tx.objectStore('songs');
    const metadataStore = tx.objectStore('metadata');
    const playlistsStore = tx.objectStore('playlists');

    songs = await new Promise(resolve => {
        const request = songsStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    const metadata = await new Promise(resolve => {
        const request = metadataStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    playlists = await new Promise(resolve => {
        const request = playlistsStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    // Merge metadata with songs
    songs.forEach(song => {
        const meta = metadata.find(m => m.id === song.id);
        if (meta) Object.assign(song, meta);
    });

    updateSongList();
    updatePlaylistList();
}

// Save data to IndexedDB
async function saveSong(song) {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata'], 'readwrite');
    tx.objectStore('songs').put(song);
    tx.objectStore('metadata').put({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        cover: song.cover
    });
}

async function savePlaylist(playlist) {
    const db = await openDB();
    const tx = db.transaction('playlists', 'readwrite');
    tx.objectStore('playlists').put(playlist);
}

// IndexedDB for user
async function saveUser(user) {
    const db = await openDB();
    const tx = db.transaction('user', 'readwrite');
    tx.objectStore('user').put(user);
}

async function loadUser() {
    const db = await openDB();
    const tx = db.transaction('user', 'readonly');
    const user = await new Promise(resolve => {
        const request = tx.objectStore('user').get('profile');
        request.onsuccess = () => resolve(request.result || {});
    });
    return user;
}