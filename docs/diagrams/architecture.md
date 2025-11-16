# Architecture Overview

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface │    │  Application    │    │   Data Storage   │
│                 │    │   Logic         │    │                 │
│ - HTML Screens  │◄──►│ - Modules       │◄──►│ - IndexedDB      │
│ - Components    │    │ - Event System  │    │ - LocalStorage   │
│ - Navigation    │    │ - State Mgmt    │    │ - Cache API      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Web Audio API  │    │  Service Worker │    │   External APIs  │
│                 │    │                 │    │                 │
│ - Audio Context │    │ - Caching       │    │ - Last.fm        │
│ - Processing    │    │ - Background Sync│    │ - MusicBrainz   │
│ - Visualization │    │ - Push Notifs   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Module Architecture

```
UIManager
├── Screen Management
├── Event Delegation
├── Responsive Layout
└── Component Loading

AudioModule
├── Web Audio Context
├── Playback Controls
├── Equalizer (5-band)
├── Visualizations
└── Gapless Playback

StorageModule
├── IndexedDB Operations
├── Song Management
├── Playlist Management
├── User Preferences
└── Offline Cache

SearchModule
├── Fuse.js Integration
├── Fuzzy Search
├── Advanced Filtering
└── Index Management

VoiceModule
├── Speech Recognition
├── Command Processing
└── Voice Commands

OfflineModule
├── Service Worker
├── Background Sync
├── Cache Management
└── Network Detection
```

## Data Flow

### Song Playback Flow
```
User Click → UIManager → AudioModule.loadSong()
    ↓              ↓              ↓
UI Update → Event Emit → Web Audio API
    ↓              ↓              ↓
Mini Player → State Update → Audio Playback
```

### Search Flow
```
User Input → UIManager → SearchModule.searchSongs()
    ↓              ↓              ↓
Filter UI → Query Processing → Fuse.js Search
    ↓              ↓              ↓
Results → UI Update → Song List Display
```

### Import Flow
```
File Select → UIManager → StorageModule.saveSong()
    ↓              ↓              ↓
Progress UI → Metadata Extract → IndexedDB Save
    ↓              ↓              ↓
Success Msg → Library Update → Search Reindex
```

## Component Hierarchy

```
App Container
├── Navigation Bar
├── Screen Container
│   ├── Home Screen
│   │   ├── Search Bar
│   │   ├── Filter Dropdowns
│   │   ├── Song Grid/List
│   │   └── Empty State
│   ├── Player Screen
│   │   ├── Full Player
│   │   ├── Equalizer
│   │   └── Visualizer
│   ├── Playlists Screen
│   │   ├── Playlist Grid
│   │   └── Create Button
│   ├── Playlist Detail
│   │   ├── Playlist Info
│   │   ├── Song List
│   │   └── Drag Handles
│   └── Settings Screen
│       ├── Audio Settings
│       ├── UI Settings
│       └── Storage Settings
└── Mini Player
    ├── Controls
    ├── Progress
    └── Song Info
```

## State Management

### Global State
- Current screen
- Playback state
- User preferences
- Network status

### Component State
- UI view mode (grid/list)
- Search filters
- Modal visibility
- Loading states

### Audio State
- Current song
- Playback position
- Volume level
- EQ settings
- Playback rate

## Event System

### Custom Events
- `song-loaded`
- `playback-started`
- `playback-paused`
- `song-ended`
- `search-results`
- `playlist-updated`
- `network-changed`

### Event Flow
```
User Action → DOM Event → UIManager → Module Method
                                      ↓
                                Event Emission → UI Update
```

## Performance Optimizations

### Rendering
- Virtual scrolling for large lists
- Lazy loading for images
- Debounced search input
- RequestAnimationFrame for animations

### Audio
- Web Audio API for low latency
- AudioWorklet for heavy processing
- Streaming for large files
- Gapless buffer management

### Storage
- IndexedDB for structured data
- Blob storage for audio files
- Lazy indexing for search
- Background sync for uploads

### Caching
- Service Worker for static assets
- Runtime caching for API responses
- Audio file caching
- Image lazy loading