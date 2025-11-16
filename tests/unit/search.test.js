import { searchManager } from '../../js/modules/search.js';

describe('Search Manager', () => {
  const mockSongs = [
    { id: 1, title: 'Song One', artist: 'Artist A', album: 'Album X', genre: 'Rock' },
    { id: 2, title: 'Song Two', artist: 'Artist B', album: 'Album Y', genre: 'Pop' },
    { id: 3, title: 'Another Song', artist: 'Artist A', album: 'Album Z', genre: 'Jazz' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset search manager
    searchManager.songs = [];
    searchManager.indexed = false;
    searchManager.indexingPromise = null;
  });

  describe('indexSongs', () => {
    it('should index songs', async () => {
      const fuse = await searchManager.indexSongs(mockSongs);
      expect(fuse).toBeDefined();
      expect(searchManager.indexed).toBe(true);
    });
  });

  describe('searchSongs', () => {
    beforeEach(async () => {
      await searchManager.indexSongs(mockSongs);
    });

    it('should search songs by query', async () => {
      const results = await searchManager.searchSongs('Song');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return all songs for empty query', async () => {
      const results = await searchManager.searchSongs('');
      expect(results).toEqual(mockSongs);
    });

    it('should filter by genre', async () => {
      const results = await searchManager.searchSongs('Song', { genre: 'Rock' });
      expect(results.every(song => song.genre === 'Rock')).toBe(true);
    });

    it('should filter by artist', async () => {
      const results = await searchManager.searchSongs('Song', { artist: 'Artist A' });
      expect(results.every(song => song.artist === 'Artist A')).toBe(true);
    });

    it('should filter by album', async () => {
      const results = await searchManager.searchSongs('Song', { album: 'Album X' });
      expect(results.every(song => song.album === 'Album X')).toBe(true);
    });
  });

  describe('filterByGenre', () => {
    it('should filter songs by genre', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.filterByGenre('Rock');
      expect(results).toEqual([mockSongs[0]]);
    });

    it('should return all songs for empty genre', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.filterByGenre('');
      expect(results).toEqual(mockSongs);
    });
  });

  describe('filterByArtist', () => {
    it('should filter songs by artist', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.filterByArtist('Artist A');
      expect(results).toEqual([mockSongs[0], mockSongs[2]]);
    });
  });

  describe('filterByAlbum', () => {
    it('should filter songs by album', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.filterByAlbum('Album X');
      expect(results).toEqual([mockSongs[0]]);
    });
  });

  describe('advancedFilter', () => {
    it('should filter by text query', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.advancedFilter({ query: 'One' });
      expect(results).toEqual([mockSongs[0]]);
    });

    it('should filter by genres array', () => {
      searchManager.songs = mockSongs;
      const results = searchManager.advancedFilter({ genres: ['Rock', 'Pop'] });
      expect(results).toEqual([mockSongs[0], mockSongs[1]]);
    });

    it('should filter by duration range', () => {
      const songsWithDuration = mockSongs.map(song => ({ ...song, duration: 200 }));
      searchManager.songs = songsWithDuration;
      const results = searchManager.advancedFilter({ minDuration: 180, maxDuration: 220 });
      expect(results).toEqual(songsWithDuration);
    });
  });

  describe('updateIndex', () => {
    it('should update search index', async () => {
      const updatedSongs = [...mockSongs, { id: 4, title: 'New Song', artist: 'New Artist' }];
      await searchManager.updateIndex(updatedSongs);
      expect(searchManager.songs).toEqual(updatedSongs);
      expect(searchManager.indexed).toBe(true);
    });
  });

  describe('getUniqueValues', () => {
    it('should get unique values for field', () => {
      searchManager.songs = mockSongs;
      const genres = searchManager.getUniqueValues('genre');
      expect(genres).toEqual(['Jazz', 'Pop', 'Rock']);
    });
  });
});
