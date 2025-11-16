import { loadSong, play } from '../../js/modules/audio.js';
import { getCachedSong, cacheSong } from '../../js/modules/storage.js';

describe('Audio-Storage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock indexedDB for storage
    global.indexedDB.open.mockReturnValue({
      onsuccess: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(() => ({ onsuccess: null, result: 1 })),
            get: jest.fn(() => ({ onsuccess: null, result: { blob: new Blob() } })),
          })),
        })),
      },
    });
  });

  describe('Song Loading and Caching', () => {
    it('should load song and cache it', async () => {
      const blob = new Blob(['audio data']);
      cacheSong.mockResolvedValue(1);

      // Load song
      await loadSong(blob);

      // Cache should be available
      const cached = await getCachedSong(1);
      expect(cached).toBeInstanceOf(Blob);
    });

    it('should play cached song', async () => {
      const cachedBlob = new Blob(['audio data']);
      getCachedSong.mockResolvedValue(cachedBlob);

      // Load from cache
      await loadSong(cachedBlob);

      // Should be able to play
      play();
    });
  });

  describe('Offline Playback', () => {
    it('should load song from cache when offline', async () => {
      // Mock offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const cachedBlob = new Blob(['audio data']);
      getCachedSong.mockResolvedValue(cachedBlob);

      await loadSong(cachedBlob);

      // Should still work offline
      expect(loadSong).toHaveBeenCalledWith(cachedBlob);
    });
  });
});
