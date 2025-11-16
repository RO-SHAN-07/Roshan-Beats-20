# Roshan Beats - Advanced Music Player

A comprehensive music streaming and playback application available as both a Progressive Web App (PWA) and native Android app. Features advanced audio processing, offline capabilities, AI-powered recommendations, and seamless cross-platform experience.

[![GitHub Release](https://img.shields.io/github/v/release/yourusername/roshan-beats)](https://github.com/yourusername/roshan-beats/releases)
[![Android APK](https://img.shields.io/badge/Android-APK-green)](https://github.com/yourusername/roshan-beats/releases/latest/download/app-release.apk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

### Core Functionality
- **🎵 Advanced Music Player**: Web Audio API with professional-grade EQ, gapless playback, and real-time visualizations
- **📱 Cross-Platform**: Available as PWA and native Android app with Capacitor
- **💾 Offline Support**: Cache unlimited songs for offline listening with smart storage management
- **📋 Playlist Management**: Create, edit, and manage playlists with drag-and-drop and collaborative features
- **🔍 Smart Search**: AI-powered fuzzy search with filters by artist, album, genre, mood, and tempo
- **🎤 Voice Commands**: Natural language voice control with wake word detection
- **📱 Responsive Design**: Optimized for desktop, tablet, mobile, and Android devices

### Audio Features
- **🎛️ Professional Equalizer**: 10-band parametric EQ with presets (Flat, Rock, Pop, Jazz, Classical, Bass Boost, Vocal Boost)
- **🎚️ Playback Controls**: Advanced controls including play, pause, stop, seek, volume, speed (0.5x-2x), pitch shift
- **🔄 Gapless Playback**: Seamless transitions between songs with crossfade options
- **📊 Real-time Visualizer**: Multiple visualization modes (spectrum, waveform, circular, bars) with customizable themes
- **🏷️ Rich Metadata**: Album art fetching, ID3 tag reading/writing, lyrics support, and music analysis

### Advanced Features
- **🤖 AI Recommendations**: Machine learning-powered song recommendations based on listening history
- **📸 AR Camera Integration**: Augmented reality features for interactive music experiences
- **🗺️ Location-Based Features**: GPS integration for location-tagged playlists and venue discovery
- **📅 Calendar Integration**: Schedule playback, set reminders, and create time-based playlists
- **🛒 Shopping Cart**: In-app purchases for premium features and exclusive content
- **💬 Social Features**: Share playlists, follow artists, and connect with other music lovers
- **📊 Analytics Dashboard**: Detailed listening statistics and music discovery insights
- **🌙 Theme Customization**: Multiple themes including dark mode, AMOLED, and custom color schemes

### Platform-Specific Features

#### PWA Features
- **📲 Installable**: Add to home screen on any device
- **🔄 Background Sync**: Automatic data synchronization
- **🔔 Push Notifications**: Personalized music recommendations and updates
- **⚡ Service Worker**: Advanced caching and background processing

#### Android App Features
- **📱 Native Performance**: Optimized for Android with hardware acceleration
- **👆 Haptic Feedback**: Native touch feedback for enhanced user experience
- **🔒 Biometric Authentication**: Fingerprint and face unlock support
- **💳 Google Pay Integration**: Seamless in-app payments
- **📍 Precise GPS**: High-accuracy location services
- **📷 Camera Access**: Native camera API for AR features
- **🔊 Hardware Controls**: Volume buttons and back button integration
- **🔔 FCM Notifications**: Firebase Cloud Messaging for reliable push notifications

## 📦 Installation & Setup

### Prerequisites
- **For PWA**: Node.js 16+, npm, modern web browser
- **For Android App**: Android Studio, Java 11+, Android SDK (API 21+)
- **Development**: Git, VS Code (recommended)

### Option 1: Progressive Web App (PWA)

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/roshan-beats.git
   cd roshan-beats
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run serve
   ```

4. **Access Application**:
   - Open http://localhost:3000 in your browser
   - Install as PWA by clicking "Add to Home Screen"

### Option 2: Native Android App

#### From Source Code
1. **Setup Development Environment**:
   ```bash
   # Install Capacitor CLI globally
   npm install -g @capacitor/cli

   # Install Android dependencies
   npm install @capacitor/android @capacitor/camera @capacitor/push-notifications @capacitor/device @capacitor/geolocation @capacitor/haptics @capacitor/app
   ```

2. **Build and Run Android App**:
   ```bash
   # Build web assets
   npm run build

   # Initialize Capacitor
   npx cap init "Roshan Beats" "com.roshanbeats.app" --web-dir=dist

   # Add Android platform
   npx cap add android

   # Sync assets
   npx cap sync android

   # Open in Android Studio
   npx cap open android
   ```

3. **Build APK**:
   ```bash
   # Debug APK
   cd android && ./gradlew assembleDebug

   # Release APK (requires signing configuration)
   cd android && ./gradlew assembleRelease
   ```

#### Direct APK Download
- **Latest Release**: [Download APK](https://github.com/yourusername/roshan-beats/releases/latest/download/app-release.apk)
- **Debug Version**: Available in releases for testing

### Building for Production

#### PWA Deployment
```bash
# Build optimized bundle
npm run build

# Deploy to hosting service (Netlify, Vercel, etc.)
# Copy dist/ contents to your web server
```

#### Android App Store
```bash
# Generate signed release APK
cd android && ./gradlew assembleRelease

# Upload to Google Play Console
# - Create developer account
# - Submit APK for review
# - Configure store listing
```

### Testing

#### Automated Tests
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

#### Manual Testing
- **PWA**: Test in Chrome, Firefox, Safari, Edge
- **Android**: Test on devices/emulators with different screen sizes
- **Features**: Audio playback, offline mode, search, voice commands
- **Performance**: Memory usage, battery consumption, load times

## 🎵 Usage Guide

### Getting Started
1. **Launch App**: Open PWA in browser or install Android app
2. **Grant Permissions**: Allow camera, microphone, location, and storage access (Android)
3. **Import Music**: Click import button to add songs from device or cloud storage
4. **Create Profile**: Set up user profile with preferences and biometric authentication
5. **Explore Features**: Navigate through player, playlists, search, and social features

### Core Controls

#### Playback Controls
- **Play/Pause**: Tap play button or use voice command "play/pause"
- **Skip Tracks**: Tap next/previous or say "next song/previous song"
- **Seek**: Drag progress bar or say "skip to 2 minutes"
- **Volume**: Use slider or say "volume up/down"
- **Shuffle/Repeat**: Toggle modes in player controls

#### Playlist Management
- **Create Playlist**: Tap "+" button in playlists section
- **Add Songs**: Drag songs to playlist or use "Add to playlist" option
- **Collaborative Playlists**: Share playlist link for collaborative editing
- **Smart Playlists**: Auto-generated based on listening habits

### Advanced Features

#### Voice Commands
- "Play [song/artist/album]"
- "Pause/Stop/Resume"
- "Next/Previous track"
- "Volume [up/down/mute]"
- "Shuffle on/off"
- "Create playlist [name]"
- "Search for [query]"
- "What's playing?"
- "Add to favorites"

#### Keyboard Shortcuts (PWA)
- `Space`: Play/Pause
- `→/←`: Next/Previous track
- `↑/↓`: Volume control
- `S`: Shuffle toggle
- `R`: Repeat toggle
- `F`: Fullscreen toggle
- `M`: Mute/unmute
- `Escape`: Close modals

#### Android-Specific Controls
- **Hardware Buttons**: Volume keys control audio, back button navigates
- **Haptic Feedback**: Touch interactions provide tactile feedback
- **Biometric Unlock**: Fingerprint/face ID for quick access
- **Notification Controls**: Play/pause/skip from lock screen

#### AR Features (Android)
- **Camera Access**: Grant camera permission for AR experiences
- **Interactive Overlays**: Point camera at objects for music-triggered AR content
- **Venue Discovery**: Location-based AR for nearby music events

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

## 🏗️ Architecture & Technology

### Technology Stack

#### Frontend
- **Framework**: Vanilla JavaScript (ES6+) with modular architecture
- **Build Tool**: Parcel bundler with hot reloading
- **Styling**: CSS3 with CSS Grid/Flexbox, CSS Variables for theming
- **PWA**: Service Worker API, Web App Manifest, Cache API
- **Audio**: Web Audio API for professional audio processing
- **Storage**: IndexedDB for client-side data persistence

#### Android App
- **Framework**: Capacitor (Ionic) for web-to-native bridging
- **Native Code**: Java/Kotlin for Android-specific features
- **Plugins**: Capacitor plugins for camera, geolocation, push notifications, etc.
- **Build System**: Gradle with Android Gradle Plugin

#### Backend Services
- **Hosting**: Static hosting (Netlify, Vercel, or traditional web servers)
- **APIs**: RESTful APIs for cloud features (optional)
- **Database**: Firebase Firestore for user data (optional)
- **CDN**: Content delivery for media assets

### Project Structure
```
roshan-beats/
├── 📁 android/                    # Android native project (Capacitor)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/.../MainActivity.java
│   │   │   └── res/.../           # Android resources
│   │   ├── build.gradle
│   │   └── google-services.json   # Firebase config
│   └── gradle/wrapper/
├── 📁 assets/                     # Static assets
│   ├── icons/                     # App icons (PNG)
│   └── images/                    # UI images
├── 📁 css/                        # Stylesheets
│   ├── animations.css             # CSS animations
│   ├── base.css                   # Base styles
│   ├── components.css             # Component styles
│   ├── responsive.css             # Media queries & mobile
│   └── themes.css                 # Theme variables
├── 📁 docs/                       # Documentation
│   ├── api/                       # API documentation
│   ├── diagrams/                  # Architecture diagrams
│   └── guides/                    # User guides
├── 📁 html/                       # HTML templates
│   ├── components/                # Reusable components
│   ├── screens/                   # Screen templates
│   └── [screen].html              # Individual screens
├── 📁 js/                         # JavaScript modules
│   ├── main.js                    # Application entry point
│   ├── modules/                   # Feature modules
│   │   ├── animation-engine.js    # Animation system
│   │   ├── audio.js               # Audio processing
│   │   ├── di-container.js        # Dependency injection
│   │   ├── error-handler.js       # Error handling
│   │   ├── event-utils.js         # Event management
│   │   ├── hardware.js            # Hardware integration
│   │   ├── i18n.js                # Internationalization
│   │   ├── logger.js               # Logging system
│   │   ├── memory-manager.js      # Memory management
│   │   ├── network-detection.js   # Network monitoring
│   │   ├── offline.js             # Offline functionality
│   │   ├── performance-monitor.js # Performance tracking
│   │   ├── performance.js         # Performance utilities
│   │   ├── push-notifications.js  # Push notifications
│   │   ├── recommendations.js     # AI recommendations
│   │   ├── resource-hints.js      # Resource optimization
│   │   ├── search.js              # Search functionality
│   │   ├── storage.js             # Data persistence
│   │   ├── ui.js                  # UI management
│   │   ├── validation.js          # Input validation
│   │   ├── virtual-scroll.js      # Virtual scrolling
│   │   └── voice.js               # Voice recognition
│   ├── polyfills.js               # Browser polyfills
│   ├── ui.js                      # Legacy UI (being phased out)
│   └── features.js                # Feature flags
├── 📁 scripts/                    # Build scripts
│   ├── generate-icons.js          # Icon generation
│   └── optimize-assets.js         # Asset optimization
├── 📁 tests/                      # Test suites
│   ├── accessibility.test.js      # Accessibility tests
│   ├── setup.js                   # Test configuration
│   ├── e2e/                       # End-to-end tests
│   ├── integration/               # Integration tests
│   └── unit/                      # Unit tests
├── 📄 capacitor.config.json       # Capacitor configuration
├── 📄 index.html                  # Main HTML entry point
├── 📄 manifest.json               # PWA manifest
├── 📄 package.json                # NPM dependencies
├── 📄 PROJECT_MEMORY_BANK.md      # Master project documentation
├── 📄 README.md                   # This file
├── 📄 server.js                   # Development server
├── 📄 sw.js                       # Service worker
└── 📄 [config files]              # Various config files
```

### System Architecture

#### Modular Architecture
- **Dependency Injection**: Clean separation of concerns with DI container
- **Event-Driven**: Pub/sub pattern for loose coupling between modules
- **Plugin System**: Extensible architecture for additional features
- **Worker Threads**: Background processing for heavy computations

#### Data Flow Architecture
1. **User Interaction** → UI Module (event handling)
2. **UI Events** → Feature Modules (business logic)
3. **Data Operations** → Storage Module (IndexedDB/Firebase)
4. **Audio Processing** → Audio Module (Web Audio API)
5. **Search Queries** → Search Module (Fuse.js + AI)
6. **Network Requests** → Network Module (fetch API)
7. **Background Tasks** → Worker Manager (Web Workers)

#### Android Integration
- **Capacitor Bridge**: Web-to-native communication layer
- **Plugin System**: Native functionality via Capacitor plugins
- **Platform Detection**: Runtime platform-specific code execution
- **Permission Management**: Native permission handling

### Performance Optimizations
- **Lazy Loading**: Modules loaded on demand
- **Virtual Scrolling**: Efficient rendering of large lists
- **Memory Management**: Automatic cleanup and garbage collection
- **Caching Strategy**: Multi-level caching (memory, IndexedDB, service worker)
- **Resource Hints**: Preloading critical resources
- **Code Splitting**: Dynamic imports for reduced bundle size

## 🌐 Platform Support

### Progressive Web App (PWA)
**Browser Requirements:**
- **Chrome**: 70+ (recommended)
- **Firefox**: 65+
- **Safari**: 12+
- **Edge**: 79+
- **Samsung Internet**: 10+

**PWA Requirements:**
- HTTPS (required for service workers and camera access)
- Modern browser with Web Audio API support
- IndexedDB support for offline storage
- Service Worker API for background processing

### Native Android App
**Android Requirements:**
- **Minimum Version**: Android 5.0 (API 21)
- **Recommended**: Android 8.0+ (API 26) for optimal performance
- **Target SDK**: API 34 (Android 14)
- **Architecture**: ARM64, ARM32, x86, x86_64

**Device Features:**
- Camera (optional, for AR features)
- Microphone (optional, for voice commands)
- GPS (optional, for location features)
- Biometric hardware (optional, for authentication)
- Storage access for music files

### Capacitor Compatibility
- **Capacitor**: 7.x
- **Android Gradle Plugin**: 8.x
- **Java**: 11+
- **Android Studio**: 2022.3.1+
## 📥 Downloads & Releases

### Latest Releases
- **[📱 Android APK](https://github.com/yourusername/roshan-beats/releases/latest/download/app-release.apk)** - Direct download for Android devices
- **[🌐 PWA Version](https://yourusername.github.io/roshan-beats/)** - Web-based version
- **[📦 Source Code](https://github.com/yourusername/roshan-beats/archive/refs/tags/v1.0.0.zip)** - Complete source code

### Release Channels
- **Stable Releases**: Production-ready versions with full testing
- **Beta Releases**: Pre-release versions with new features
- **Nightly Builds**: Development builds (not recommended for production)

### Version History
- **v1.1.0** (Latest): Android app release with native features
- **v1.0.0**: Initial PWA release with core functionality


## 🔧 Troubleshooting

### PWA Issues

**Audio not playing**
- Check browser permissions for autoplay policies
- Ensure Web Audio API is supported (Chrome 70+ recommended)
- Try refreshing the page or clearing browser cache
- Check for conflicting browser extensions

**Import not working**
- Supported formats: MP3, WAV, OGG, AAC, FLAC
- Check file size limits (max 50MB per file)
- Ensure files are not corrupted or password-protected
- Verify available storage space (>100MB free)

**Search not finding songs**
- Ensure songs are properly indexed (check console for errors)
- Verify metadata is correctly read from ID3 tags
- Try clearing search cache: `localStorage.removeItem('searchIndex')`
- Re-index library from settings

**Offline mode not working**
- Check service worker registration in DevTools → Application
- Ensure songs are cached (check Cache Storage)
- Verify browser supports offline capabilities
- Clear all caches and re-cache content

### Android App Issues

**App not installing**
- Enable "Install unknown apps" in Android settings
- Check available storage space (>200MB free)
- Ensure APK is not corrupted (verify download)
- Try different USB cable or installation method

**Permissions denied**
- Grant all requested permissions in app settings
- Check Android version compatibility (minimum API 21)
- Restart device after granting permissions
- Clear app data and reinstall if issues persist

**Camera/AR not working**
- Grant camera permission in Android settings
- Ensure device has camera hardware
- Check for conflicting camera apps
- Restart app after granting permissions

**GPS/Location issues**
- Enable location services in Android settings
- Grant precise location permission
- Check GPS signal strength
- Try toggling location mode (High accuracy)

**Push notifications not received**
- Check notification permissions in Android settings
- Verify Firebase configuration
- Ensure internet connection for FCM
- Check battery optimization settings

**Biometric authentication failing**
- Ensure device has biometric hardware (fingerprint/face)
- Check biometric settings are configured
- Try re-enrolling biometric data
- Restart device and try again

### Debug Mode
Enable detailed logging:
```javascript
// For PWA
localStorage.setItem('debug', 'true');
localStorage.setItem('logLevel', 'debug');

// For Android (via console)
console.log('Debug mode enabled');
```

### Reset Application
**PWA Reset:**
```javascript
localStorage.clear();
indexedDB.deleteDatabase('RoshanBeatsDB');
location.reload();
```

**Android Reset:**
- Settings → Apps → Roshan Beats → Storage → Clear data
- Reinstall app from APK
- Check for app updates

### Performance Issues
- **Slow loading**: Clear cache, check network connection
- **High battery usage**: Check background processes, update Android
- **Memory issues**: Close other apps, restart device
- **Storage full**: Clear cached data, move files to external storage

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

## 📋 Changelog

### v1.1.0 (Latest) - Android App Release
- ✅ **Native Android App**: Full Capacitor conversion with native performance
- ✅ **Capacitor Integration**: Camera, geolocation, push notifications, haptic feedback
- ✅ **Biometric Authentication**: Fingerprint and face unlock support
- ✅ **AR Camera Features**: Augmented reality music experiences
- ✅ **Google Pay Integration**: Seamless in-app payments
- ✅ **Hardware Controls**: Volume buttons and back button integration
- ✅ **Firebase Notifications**: Reliable push notifications via FCM
- ✅ **Mobile Optimizations**: Safe area insets, high-DPI displays, touch interactions

### v1.0.0 - Initial PWA Release
- ✅ Core music playback functionality with Web Audio API
- ✅ Progressive Web App features (installable, offline, push notifications)
- ✅ Advanced audio processing (10-band EQ, gapless playback, visualizations)
- ✅ Smart search and playlist management
- ✅ Voice command integration
- ✅ Comprehensive test suite and documentation

## 🗺️ Roadmap

### Phase 1: Core Enhancement (Current)
- [x] Android app conversion with Capacitor
- [x] Native feature integration (camera, GPS, biometrics)
- [x] Mobile UI optimizations
- [ ] Cloud sync with Firebase
- [ ] Social features (sharing, following)

### Phase 2: Advanced Features (Q1 2025)
- [ ] AI-powered music recommendations
- [ ] Advanced AR experiences
- [ ] Collaborative playlists
- [ ] Multi-language support (i18n)
- [ ] Plugin system for extensions

### Phase 3: Enterprise Features (Q2 2025)
- [ ] Team/organization accounts
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] White-label solutions
- [ ] Advanced security features

### Phase 4: Ecosystem Expansion (Q3 2025)
- [ ] iOS app release
- [ ] Desktop applications (Windows, macOS)
- [ ] Web API for external integrations
- [ ] Music streaming service integration
- [ ] Hardware integrations (smart speakers, wearables)

## 🆘 Support & Community

### Getting Help
- **📖 Documentation**: [PROJECT_MEMORY_BANK.md](PROJECT_MEMORY_BANK.md) - Complete technical documentation
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/yourusername/roshan-beats/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/yourusername/roshan-beats/discussions)
- **📧 Email Support**: support@roshanbeats.com
- **💬 Community**: [Discord Server](https://discord.gg/roshanbeats) (coming soon)

### Resources
- **📚 API Documentation**: [docs/api/](docs/api/) - Module and API references
- **🎯 User Guides**: [docs/guides/](docs/guides/) - Feature walkthroughs
- **🔧 Troubleshooting**: See troubleshooting section above
- **📱 Android Setup**: [Capacitor Documentation](https://capacitorjs.com/docs)

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Security
If you discover a security vulnerability, please email security@roshanbeats.com instead of creating a public issue.
