# UI Module API

Manages screen switching, event delegation, and responsive layout for the Roshan Beats PWA.

## UIManager Class

### Constructor
```javascript
const uiManager = new UIManager();
```

### Screen Management

#### `showScreen(screenName, data?)`
Displays a screen with optional data.

**Parameters:**
- `screenName` (string): Screen to show
- `data` (Object): Screen-specific data

**Example:**
```javascript
uiManager.showScreen('player');
uiManager.showScreen('playlist-detail', { playlistId: 1 });
```

#### `updateNav()`
Updates navigation highlighting.

#### `populateScreen(screenName, data)`
Populates screen content.

### Song Library

#### `populateSongLibrary()`
Loads and displays song library.

#### `renderSongGrid(songs, container)`
Renders songs in grid view.

#### `renderSongList(songs, container)`
Renders songs in list view.

#### `toggleView()`
Toggles between grid and list view.

### Playlists

#### `populatePlaylists()`
Loads and displays playlists.

#### `populatePlaylistDetail(playlistId)`
Loads playlist details.

#### `createPlaylistModal()`
Shows create playlist modal.

#### `editPlaylist(id)`
Shows edit playlist modal.

#### `deletePlaylist(id)`
Deletes a playlist.

### Search & Filter

#### `handleSearch()`
Handles search input.

#### `handleFilterChange()`
Handles filter changes.

#### `clearSearch()`
Clears search input.

#### `resetFilters()`
Resets all filters.

#### `populateFilterDropdowns()`
Populates genre/artist/album dropdowns.

### Import & File Handling

#### `triggerImport()`
Triggers file import dialog.

#### `handleFileImport(files)`
Processes imported files.

### Messages

#### `showErrorMessage(message, retryCallback?)`
Shows error message.

#### `showSuccessMessage(message)`
Shows success message.

### Utilities

#### `formatDuration(seconds)`
Formats duration as MM:SS.

#### `lazyLoadImages(container)`
Implements lazy loading for images.

#### `vibrate(pattern)`
Triggers device vibration.

#### `setupResponsiveLayout()`
Sets up responsive breakpoints.

#### `setupEventDelegation()`
Sets up global event listeners.

### Event System

#### `onScreenShow(screenName, data)`
Called when screen is shown.

#### `setupPlaylistDragAndDrop(playlistId)`
Sets up drag-and-drop for playlists.

## Screens

- `home` - Song library
- `player` - Full player
- `playlists` - Playlist list
- `playlist-detail` - Playlist contents
- `settings` - App settings

## Components

- `mini-player` - Bottom playback controls
- `nav` - Navigation bar
- `modals` - Modal dialogs

## Events

Global event delegation handles:
- Navigation clicks
- Button clicks
- Form submissions
- Keyboard shortcuts
- Touch gestures