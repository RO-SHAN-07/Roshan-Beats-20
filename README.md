# Roshan Beats PWA

A modern, progressive web app for music playback with offline capabilities, advanced audio features, and a beautiful user interface.

## Features

### Core Functionality
- **Music Library Management**: Import and organize your music collection
- **Advanced Audio Player**: Web Audio API with EQ, gapless playback, and visualizations
- **Offline Support**: Cache songs for offline listening
- **Playlist Management**: Create, edit, and manage playlists with drag-and-drop
- **Smart Search**: Fuzzy search with filters by artist, album, genre
- **Voice Commands**: Control playback with voice recognition
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Audio Features
- **Equalizer**: 5-band EQ with presets (Flat, Rock, Pop, Jazz, Classical)
- **Playback Controls**: Play, pause, stop, seek, volume, speed control
- **Gapless Playback**: Seamless transitions between songs
- **Visualizer**: Real-time audio spectrum and waveform display
- **Metadata Support**: Album art fetching, ID3 tag reading

### PWA Features
- **Installable**: Add to home screen on mobile devices
- **Offline Mode**: Full functionality without internet connection
- **Background Sync**: Sync data when connection is restored
- **Push Notifications**: Updates and recommendations
- **Service Worker**: Caching and background processing

## Installation

### Prerequisites
- Node.js 16+ and npm
- Modern web browser with PWA support

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/roshan-beats-pwa.git
   cd roshan-beats-pwa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests (requires dev server running)
npm run test:e2e
```

### Deployment
```bash
# Build and deploy to GitHub Pages
npm run deploy
```

## Usage

### Getting Started
1. **Import Music**: Click the import button to add songs from your device
2. **Create Playlists**: Organize your music into custom playlists
3. **Search & Filter**: Use the search bar and filters to find specific songs
4. **Voice Control**: Say "play", "pause", "next", etc. to control playback

### Keyboard Shortcuts
- `Space`: Play/Pause
- `→`: Next song
- `←`: Previous song
- `↑/↓`: Volume up/down
- `Escape`: Close modals

### Voice Commands
- "Play [song name]"
- "Pause/Stop"
- "Next/Previous"
- "Volume up/down"
- "Shuffle on/off"
- "Search for [query]"

## API Reference

### Storage Module
```javascript
import { saveSong, getSongs, createPlaylist } from './js/modules/storage.js';

// Save a song
await saveSong({ title: 'Song', artist: 'Artist', file: blob });

// Get all songs
const songs = await getSongs();

// Create playlist
await createPlaylist('My Playlist', 'Description', [songIds]);
```

### Audio Module
```javascript
import { initAudio, loadSong, play, setVolume } from './js/modules/audio.js';

// Initialize audio context
initAudio();

// Load and play song
await loadSong(songBlob);
play();

// Control volume (0-1)
setVolume(0.8);
```

### Search Module
```javascript
import { searchManager } from './js/modules/search.js';

// Search songs
const results = await searchManager.searchSongs('query', { genre: 'Rock' });

// Filter by criteria
const filtered = searchManager.advancedFilter({ genres: ['Rock', 'Pop'] });
```

### UI Module
```javascript
import { uiManager } from './js/modules/ui.js';

// Show different screens
uiManager.showScreen('player');
uiManager.showScreen('playlists', { playlistId: 1 });

// Display messages
uiManager.showSuccessMessage('Song added!');
uiManager.showErrorMessage('Failed to load');
```

## Architecture

### Project Structure
```
roshan-beats-pwa/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── package.json            # Dependencies and scripts
├── js/
│   ├── main.js            # Application entry point
│   ├── modules/           # Feature modules
│   │   ├── storage.js     # IndexedDB operations
│   │   ├── audio.js       # Web Audio API
│   │   ├── search.js      # Search functionality
│   │   ├── ui.js          # UI management
│   │   ├── voice.js       # Voice recognition
│   │   └── offline.js     # Offline support
│   └── features.js        # Feature flags
├── css/
│   ├── base.css           # Base styles
│   ├── components.css     # Component styles
│   ├── themes.css         # Theme variables
│   ├── animations.css     # Animations
│   └── responsive.css     # Media queries
├── html/
│   ├── screens/           # Screen templates
│   └── components/        # Reusable components
├── assets/                # Static assets
└── tests/                 # Test suites
    ├── unit/             # Unit tests
    ├── integration/      # Integration tests
    └── e2e/              # End-to-end tests
```

### Data Flow
1. **User Interaction** → UI Module
2. **UI Events** → Audio/Storage/Search Modules
3. **Data Persistence** → IndexedDB via Storage Module
4. **Audio Processing** → Web Audio API via Audio Module
5. **Search Queries** → Fuse.js via Search Module

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### PWA Requirements
- HTTPS (required for service workers)
- Modern browser with Web Audio API support
- IndexedDB support for storage

## Troubleshooting

### Common Issues

**Audio not playing**
- Check browser permissions for autoplay
- Ensure Web Audio API is supported
- Try refreshing the page

**Import not working**
- Check file format support (MP3, WAV, OGG)
- Ensure files are not corrupted
- Check available storage space

**Search not finding songs**
- Ensure songs are properly indexed
- Check metadata is correctly read
- Try clearing search and re-indexing

**Offline mode not working**
- Check service worker registration
- Ensure songs are cached
- Verify browser offline capabilities

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('debug', 'true');
```

### Reset Application
Clear all data:
```javascript
localStorage.clear();
indexedDB.deleteDatabase('RoshanBeatsDB');
```

## Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run test suite: `npm test`
5. Submit pull request

### Code Style
- Use ES6+ features
- Follow modular architecture
- Add JSDoc comments for functions
- Write comprehensive tests

### Testing
- Unit tests for all modules
- Integration tests for module interactions
- E2E tests for critical user flows
- Maintain >80% code coverage

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0
- Initial release
- Core music playback functionality
- PWA features
- Offline support
- Voice commands
- Comprehensive test suite

## Roadmap

- [ ] Cloud sync
- [ ] Social features
- [ ] Advanced visualizations
- [ ] Plugin system
- [ ] Multi-language support

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/roshan-beats-pwa/issues)
- Docs: [Wiki](https://github.com/yourusername/roshan-beats-pwa/wiki)
- Email: support@roshanbeats.com
