# Search Module API

Provides fuzzy search functionality using Fuse.js for finding songs in the music library.

## Overview

The SearchManager class handles:
- Full-text search across song metadata
- Fuzzy matching with configurable thresholds
- Advanced filtering by multiple criteria
- Lazy indexing for performance

## SearchManager Class

### Constructor
```javascript
const searchManager = new SearchManager();
```

### Methods

#### `indexSongs(songs?)`
Indexes songs for search.

**Parameters:**
- `songs` (Array, optional): Songs to index, fetches from storage if not provided

**Returns:** `Promise<Fuse>` - Fuse.js instance

**Example:**
```javascript
await searchManager.indexSongs();
```

#### `searchSongs(query, options?)`
Performs fuzzy search on songs.

**Parameters:**
- `query` (string): Search query
- `options` (Object): Search options

**Returns:** `Promise<Array>` - Matching songs

**Example:**
```javascript
const results = await searchManager.searchSongs('rock music', {
  genre: 'Rock',
  artist: 'Artist Name'
});
```

#### `filterByGenre(genre)`
Filters songs by genre.

**Parameters:**
- `genre` (string): Genre to filter by

**Returns:** `Array` - Filtered songs

#### `filterByArtist(artist)`
Filters songs by artist.

**Parameters:**
- `artist` (string): Artist to filter by

**Returns:** `Array` - Filtered songs

#### `filterByAlbum(album)`
Filters songs by album.

**Parameters:**
- `album` (string): Album to filter by

**Returns:** `Array` - Filtered songs

#### `advancedFilter(criteria)`
Advanced filtering with complex criteria.

**Parameters:**
- `criteria` (Object): Filter criteria

**Returns:** `Array` - Filtered songs

**Example:**
```javascript
const results = searchManager.advancedFilter({
  query: 'rock',
  genres: ['Rock', 'Metal'],
  minDuration: 180,
  maxYear: 2020
});
```

#### `updateIndex(songs)`
Updates the search index.

**Parameters:**
- `songs` (Array): Updated songs array

**Returns:** `Promise<void>`

#### `getUniqueValues(field)`
Gets unique values for a metadata field.

**Parameters:**
- `field` (string): Field name ('genre', 'artist', 'album')

**Returns:** `Array` - Unique values

## Search Options

```javascript
{
  genre: string,    // Filter by genre
  artist: string,   // Filter by artist
  album: string     // Filter by album
}
```

## Advanced Filter Criteria

```javascript
{
  query: string,           // Text search
  genres: Array<string>,   // Multiple genres
  artists: Array<string>,  // Multiple artists
  albums: Array<string>,   // Multiple albums
  minDuration: number,     // Minimum duration
  maxDuration: number,     // Maximum duration
  minYear: number,         // Minimum year
  maxYear: number          // Maximum year
}
```

## Fuse.js Configuration

```javascript
{
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'artist', weight: 0.3 },
    { name: 'album', weight: 0.2 },
    { name: 'genre', weight: 0.1 }
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  useExtendedSearch: true,
  ignoreLocation: true,
  findAllMatches: true
}