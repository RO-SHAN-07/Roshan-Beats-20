import { uiManager } from '../../js/modules/ui.js';

describe('UI Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document methods
    document.body.innerHTML = '';
    document.getElementById = jest.fn((id) => {
      const el = document.createElement('div');
      el.id = id;
      return el;
    });
    document.querySelector = jest.fn((selector) => document.createElement('div'));
    document.querySelectorAll = jest.fn(() => []);
    document.createElement = jest.fn((tag) => {
      const el = {
        className: '',
        innerHTML: '',
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        appendChild: jest.fn(),
        insertAdjacentHTML: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        getBoundingClientRect: jest.fn(() => ({ top: 0, height: 0 })),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(),
        },
      };
      return el;
    });
  });

  describe('init', () => {
    it('should initialize UI manager', async () => {
      await uiManager.init();
    });
  });

  describe('showScreen', () => {
    it('should show screen', () => {
      uiManager.screens = { home: '<div>Home</div>' };
      uiManager.showScreen('home');
      expect(uiManager.currentScreen).toBe('home');
    });
  });

  describe('updateNav', () => {
    it('should update navigation', () => {
      uiManager.updateNav();
    });
  });

  describe('populateSongLibrary', () => {
    it('should populate song library', async () => {
      await uiManager.populateSongLibrary();
    });
  });

  describe('populatePlaylists', () => {
    it('should populate playlists', async () => {
      await uiManager.populatePlaylists();
    });
  });

  describe('populatePlaylistDetail', () => {
    it('should populate playlist detail', async () => {
      await uiManager.populatePlaylistDetail(1);
    });
  });

  describe('toggleView', () => {
    it('should toggle view', () => {
      uiManager.toggleView();
      expect(uiManager.isGridView).toBe(false);
      uiManager.toggleView();
      expect(uiManager.isGridView).toBe(true);
    });
  });

  describe('triggerImport', () => {
    it('should trigger file import', () => {
      uiManager.triggerImport();
    });
  });

  describe('handleFileImport', () => {
    it('should handle file import', async () => {
      const files = [new File([''], 'test.mp3')];
      await uiManager.handleFileImport(files);
    });
  });

  describe('openCreatePlaylistModal', () => {
    it('should open create playlist modal', () => {
      uiManager.openCreatePlaylistModal();
    });
  });

  describe('closeModal', () => {
    it('should close modal', () => {
      uiManager.closeModal();
    });
  });

  describe('playSong', () => {
    it('should play song', () => {
      const song = { title: 'Test', artist: 'Artist' };
      uiManager.playSong(song);
    });
  });

  describe('formatDuration', () => {
    it('should format duration', () => {
      const formatted = uiManager.formatDuration(125);
      expect(formatted).toBe('2:05');
    });
  });

  describe('showErrorMessage', () => {
    it('should show error message', () => {
      uiManager.showErrorMessage('Test error');
    });
  });

  describe('showSuccessMessage', () => {
    it('should show success message', () => {
      uiManager.showSuccessMessage('Test success');
    });
  });

  describe('vibrate', () => {
    it('should vibrate', () => {
      uiManager.vibrate([100]);
      expect(navigator.vibrate).toHaveBeenCalledWith([100]);
    });
  });
});
