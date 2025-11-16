# Storage Module API

The Storage module provides IndexedDB-based data persistence for the Roshan Beats PWA.

## Overview

All functions return Promises and use IndexedDB for client-side storage. The database schema includes:
- Songs: Music library with metadata
- Playlists: User-created playlists
- UserPreferences: Encrypted user settings
- PlaybackHistory: Listening history
- OfflineCache: Cached audio files
- Metadata: Additional song metadata

## Functions

### Database Operations

#### `openDB()`
Opens the IndexedDB database connection.

**Returns:** `Promise<IDBDatabase>`

**Example:**
```javascript
import { openDB } from './js/modules/storage.js';

const db = await openDB();
```

### Song Management

#### `saveSong(song)`
Saves a song to the database.

**Parameters:**
- `song` (Object): Song object with properties like title, artist, album, etc.

**Returns:** `Promise<number>` - The song ID

**Example:**
```javascript
const song = {
  title: 'Song Title',
  artist: 'Artist Name',
  album: 'Album Name',
  genre: 'Rock',
  duration: 180,
  file: blob
};

const songId = await saveSong(song);
```

#### `getSongs(query?)`
Retrieves songs from the database.

**Parameters:**
- `query` (Object, optional): Query object for filtering

**Returns:** `Promise<Array>` - Array of song objects

**Examples:**
```javascript
// Get all songs
const allSongs = await getSongs();

// Get songs by artist
const artistSongs = await getSongs({ artist: 'Artist Name' });

// Get songs by genre
const rockSongs = await getSongs({ genre: 'Rock' });
```

#### `deleteSong(id)`
Deletes a song from the database.

**Parameters:**
- `id` (number): Song ID to delete

**Returns:** `Promise<void>`

**Example:**
```javascript
await deleteSong(123);
```

#### `updateSongMetadata(id, updates)`
Updates song metadata.

**Parameters:**
- `id` (number): Song ID
- `updates` (Object): Properties to update

**Returns:** `Promise<void>`

**Example:**
```javascript
await updateSongMetadata(123, { title: 'New Title', artist: 'New Artist' });
```

### Playlist Management

#### `createPlaylist(name, description, songs)`
Creates a new playlist.

**Parameters:**
- `name` (string): Playlist name
- `description` (string): Playlist description
- `songs` (Array): Array of song objects

**Returns:** `Promise<number>` - Playlist ID

**Example:**
```javascript
const playlistId = await createPlaylist('My Playlist', 'Description', [song1, song2]);
```

#### `getPlaylists()`
Retrieves all playlists.

**Returns:** `Promise<Array>` - Array of playlist objects

**Example:**
```javascript
const playlists = await getPlaylists();
```

#### `updatePlaylist(id, updates)`
Updates a playlist.

**Parameters:**
- `id` (number): Playlist ID
- `updates` (Object): Properties to update

**Returns:** `Promise<void>`

**Example:**
```javascript
await updatePlaylist(1, { name: 'Updated Name', songs: [song1, song3] });
```

#### `deletePlaylist(id)`
Deletes a playlist.

**Parameters:**
- `id` (number): Playlist ID

**Returns:** `Promise<void>`

**Example:**
```javascript
await deletePlaylist(1);
```

### User Preferences

#### `getPreferences()`
Retrieves encrypted user preferences.

**Returns:** `Promise<Object|null>` - Decrypted preferences object

**Example:**
```javascript
const prefs = await getPreferences();
if (prefs) {
  console.log('Theme:', prefs.theme);
}
```

#### `savePreferences(prefs)`
Saves encrypted user preferences.

**Parameters:**
- `prefs` (Object): Preferences object to encrypt and save

**Returns:** `Promise<void>`

**Example:**
```javascript
await savePreferences({ theme: 'dark', volume: 0.8 });
```

### Playback History

#### `addHistory(songId, durationPlayed)`
Adds an entry to playback history.

**Parameters:**
- `songId` (number): ID of the played song
- `durationPlayed` (number): Duration played in seconds

**Returns:** `Promise<number>` - History entry ID

**Example:**
```javascript
await addHistory(123, 45); // Played 45 seconds of song 123
```

#### `getHistory(limit?)`
Retrieves recent playback history.

**Parameters:**
- `limit` (number, optional): Maximum number of entries (default: 10)

**Returns:** `Promise<Array>` - Array of history entries

**Example:**
```javascript
const recentHistory = await getHistory(20);
```

### Offline Caching

#### `cacheSong(songId, blob)`
Caches a song blob for offline playback.

**Parameters:**
- `songId` (number): Song ID
- `blob` (Blob): Audio file blob

**Returns:** `Promise<number>` - Cache entry ID

**Example:**
```javascript
await cacheSong(123, audioBlob);
```

#### `getCachedSong(songId)`
Retrieves a cached song.

**Parameters:**
- `songId` (number): Song ID

**Returns:** `Promise<Blob|null>` - Cached audio blob or null

**Example:**
```javascript
const cachedAudio = await getCachedSong(123);
if (cachedAudio) {
  // Play from cache
}
```

#### `clearCache()`
Clears all cached songs.

**Returns:** `Promise<void>`

**Example:**
```javascript
await clearCache();
```

### Utilities

#### `fetchAlbumArt(title, artist)`
Fetches album artwork from Last.fm API.

**Parameters:**
- `title` (string): Album title
- `artist` (string): Artist name

**Returns:** `Promise<string|null>` - Image URL or null

**Example:**
```javascript
const artUrl = await fetchAlbumArt('Album Name', 'Artist Name');
if (artUrl) {
  // Display album art
}
```

## Data Schemas

### Song Object
```javascript
{
  id: number,           // Auto-generated
  title: string,        // Song title
  artist: string,       // Artist name
  album: string,        // Album name
  genre: string,        // Music genre
  duration: number,     // Duration in seconds
  year: number,         // Release year
  cover: string,        // Album art URL
  file: Blob           // Audio file blob
}
```

### Playlist Object
```javascript
{
  id: number,           // Auto-generated
  name: string,         // Playlist name
  description: string,  // Description
  songs: Array<Song>    // Array of song objects
}
```

### History Entry
```javascript
{
  id: number,           // Auto-generated
  songId: number,       // Referenced song ID
  timestamp: number,    // Unix timestamp
  durationPlayed: number // Seconds played
}
```

## Error Handling

All functions may throw errors for:
- Database connection failures
- Invalid parameters
- Storage quota exceeded
- Encryption/decryption failures

**Example error handling:**
```javascript
try {
  await saveSong(song);
} catch (error) {
  console.error('Failed to save song:', error);
  // Handle error (show user message, retry, etc.)
}
```

## Performance Considerations

- Large audio files are stored as Blobs
- Metadata is indexed for fast queries
- Encryption uses Web Crypto API for security
- Lazy loading for large datasets