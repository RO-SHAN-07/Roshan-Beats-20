import { uiManager } from '../../js/modules/ui.js';
import { searchManager } from '../../js/modules/search.js';

describe('Search-UI Integration', () => {
  const mockSongs = [
    { id: 1, title: 'Rock Song', artist: 'Rock Artist', genre: 'Rock' },
    { id: 2, title: 'Pop Song', artist: 'Pop Artist', genre: 'Pop' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock DOM elements
    document.getElementById = jest.fn((id) => {
      const el = document.createElement('input');
      el.id = id;
      el.value = '';
      return el;
    });
    document.querySelectorAll = jest.fn(() => []);
    document.createElement = jest.fn(() => ({
      innerHTML: '',
      appendChild: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() },
    }));

    // Mock search manager
    searchManager.songs = mockSongs;
    searchManager.indexed = true;
    searchManager.searchSongs = jest.fn(() => mockSongs);
    searchManager.filterByGenre = jest.fn(() => mockSongs);
    searchManager.getUniqueValues = jest.fn(() => ['Rock', 'Pop']);
  });

  describe('Search Functionality', () => {
    it('should search songs through UI', async () => {
      // Mock search input
      const searchInput = document.getElementById('search-input');
      searchInput.value = 'Rock';

      await uiManager.handleSearch();

      expect(searchManager.searchSongs).toHaveBeenCalledWith('Rock', {
        genre: '',
        artist: '',
        album: '',
      });
    });

    it('should filter by genre', async () => {
      const genreSelect = document.getElementById('genre-filter');
      genreSelect.value = 'Rock';

      await uiManager.handleFilterChange();

      expect(searchManager.filterByGenre).toHaveBeenCalledWith('Rock');
    });
  });

  describe('Filter Dropdowns', () => {
    it('should populate filter dropdowns', async () => {
      await uiManager.populateFilterDropdowns();

      expect(searchManager.getUniqueValues).toHaveBeenCalledWith('genre');
      expect(searchManager.getUniqueValues).toHaveBeenCalledWith('artist');
      expect(searchManager.getUniqueValues).toHaveBeenCalledWith('album');
    });
  });

  describe('Search and Filter Combination', () => {
    it('should combine search and filters', async () => {
      const searchInput = document.getElementById('search-input');
      const genreSelect = document.getElementById('genre-filter');
      searchInput.value = 'Song';
      genreSelect.value = 'Rock';

      await uiManager.populateSongLibrary();

      expect(searchManager.searchSongs).toHaveBeenCalledWith('Song', {
        genre: 'Rock',
        artist: '',
        album: '',
      });
    });
  });
});
