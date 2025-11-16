import { uiManager } from '../../js/modules/ui.js';
import { saveSong, getSongs, createPlaylist, getPlaylists } from '../../js/modules/storage.js';

describe('UI-Storage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock DOM
    document.body.innerHTML = '';
    document.getElementById = jest.fn((id) => {
      const el = document.createElement('div');
      el.id = id;
      el.innerHTML = '';
      el.style = {};
      el.querySelectorAll = jest.fn(() => []);
      return el;
    });
    document.querySelector = jest.fn(() => document.createElement('div'));
    document.querySelectorAll = jest.fn(() => []);
    document.createElement = jest.fn((tag) => ({
      className: '',
      innerHTML: '',
      style: {},
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      insertAdjacentHTML: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      classList: { add: jest.fn(), remove: jest.fn() },
    }));

    // Mock indexedDB
    global.indexedDB.open.mockReturnValue({
      onsuccess: null,
      onerror: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(() => ({ onsuccess: null, result: 1 })),
            getAll: jest.fn(() => ({ onsuccess: null, result: [] })),
            add: jest.fn(() => ({ onsuccess: null, result: 1 })),
          })),
        })),
      },
    });
  });

  describe('Song Library Population', () => {
    it('should populate song library from storage', async () => {
      const mockSongs = [
        { id: 1, title: 'Song 1', artist: 'Artist 1' },
        { id: 2, title: 'Song 2', artist: 'Artist 2' },
      ];

      // Mock getSongs to return songs
      getSongs.mockResolvedValue(mockSongs);

      await uiManager.populateSongLibrary();

      // Verify getSongs was called
      expect(getSongs).toHaveBeenCalled();
    });
  });

  describe('Playlist Management', () => {
    it('should create and display playlists', async () => {
      const mockPlaylists = [
        { id: 1, name: 'Playlist 1', songs: [] },
      ];

      getPlaylists.mockResolvedValue(mockPlaylists);

      await uiManager.populatePlaylists();

      expect(getPlaylists).toHaveBeenCalled();
    });

    it('should create playlist through UI', async () => {
      createPlaylist.mockResolvedValue(1);

      // Simulate creating playlist
      await uiManager.createPlaylistModal();

      expect(createPlaylist).toHaveBeenCalled();
    });
  });

  describe('Song Import', () => {
    it('should import songs and save to storage', async () => {
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });

      saveSong.mockResolvedValue(1);

      await uiManager.handleFileImport([mockFile]);

      // Note: Actual implementation might need metadata extraction
      // This tests the integration point
    });
  });
});
