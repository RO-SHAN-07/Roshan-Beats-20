import { openDB, saveSong, getSongs, deleteSong, createPlaylist, getPlaylists, updatePlaylist, deletePlaylist, getPreferences, savePreferences, addHistory, getHistory, cacheSong, getCachedSong, clearCache, updateSongMetadata, fetchAlbumArt } from '../../js/modules/storage.js';

describe('Storage Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock indexedDB request success
    global.indexedDB.open.mockReturnValue({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        objectStoreNames: { contains: jest.fn(() => true) },
        createObjectStore: jest.fn(() => ({
          createIndex: jest.fn()
        })),
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(() => ({ onsuccess: null, onerror: null, result: 1 })),
            get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
            delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
            clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
            openCursor: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            index: jest.fn(() => ({
              getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] }))
            })),
            add: jest.fn(() => ({ onsuccess: null, onerror: null, result: 1 }))
          }))
        }))
      }
    });
  });

  describe('openDB', () => {
    it('should open database successfully', async () => {
      const db = await openDB();
      expect(db).toBeDefined();
    });
  });

  describe('saveSong', () => {
    it('should save a song', async () => {
      const song = { title: 'Test Song', artist: 'Test Artist' };
      const result = await saveSong(song);
      expect(result).toBe(1);
    });
  });

  describe('getSongs', () => {
    it('should get all songs', async () => {
      const songs = await getSongs();
      expect(Array.isArray(songs)).toBe(true);
    });

    it('should get songs by query', async () => {
      const songs = await getSongs({ artist: 'Test Artist' });
      expect(Array.isArray(songs)).toBe(true);
    });
  });

  describe('deleteSong', () => {
    it('should delete a song', async () => {
      await expect(deleteSong(1)).resolves.toBeUndefined();
    });
  });

  describe('createPlaylist', () => {
    it('should create a playlist', async () => {
      const result = await createPlaylist('Test Playlist', 'Description', []);
      expect(result).toBe(1);
    });
  });

  describe('getPlaylists', () => {
    it('should get all playlists', async () => {
      const playlists = await getPlaylists();
      expect(Array.isArray(playlists)).toBe(true);
    });
  });

  describe('updatePlaylist', () => {
    it('should update a playlist', async () => {
      await expect(updatePlaylist(1, { name: 'Updated' })).resolves.toBeUndefined();
    });
  });

  describe('deletePlaylist', () => {
    it('should delete a playlist', async () => {
      await expect(deletePlaylist(1)).resolves.toBeUndefined();
    });
  });

  describe('getPreferences', () => {
    it('should get preferences', async () => {
      const prefs = await getPreferences();
      expect(prefs).toBeNull();
    });
  });

  describe('savePreferences', () => {
    it('should save preferences', async () => {
      const prefs = { theme: 'dark' };
      await expect(savePreferences(prefs)).resolves.toBeUndefined();
    });
  });

  describe('addHistory', () => {
    it('should add history entry', async () => {
      const result = await addHistory(1, 30);
      expect(result).toBe(1);
    });
  });

  describe('getHistory', () => {
    it('should get history', async () => {
      const history = await getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('cacheSong', () => {
    it('should cache a song', async () => {
      const result = await cacheSong(1, new Blob());
      expect(result).toBe(1);
    });
  });

  describe('getCachedSong', () => {
    it('should get cached song', async () => {
      const blob = await getCachedSong(1);
      expect(blob).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      await expect(clearCache()).resolves.toBeUndefined();
    });
  });

  describe('updateSongMetadata', () => {
    it('should update song metadata', async () => {
      await expect(updateSongMetadata(1, { title: 'Updated' })).resolves.toBeUndefined();
    });
  });

  describe('fetchAlbumArt', () => {
    it('should fetch album art', async () => {
      global.fetch.mockResolvedValue({
        json: jest.fn(() => ({ album: { image: [{ '#text': 'url' }] } }))
      });
      const url = await fetchAlbumArt('Album', 'Artist');
      expect(typeof url).toBe('string');
    });
  });
});