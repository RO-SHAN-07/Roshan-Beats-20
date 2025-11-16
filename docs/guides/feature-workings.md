# Roshan Beats Feature Workings

This document details the internal implementation and workings of all major features in the Roshan Beats music player PWA.

## 1. Audio Playback System

### Core Architecture
- **Web Audio API**: Primary audio processing engine
- **AudioContext**: Manages audio graph and processing
- **BufferSourceNode**: Handles audio buffer playback
- **GainNode**: Volume control and fade effects
- **AnalyserNode**: Real-time frequency analysis for visualizations

### Playback Flow
1. **Song Loading**:
   - Fetch audio file (Blob or URL)
   - Decode to AudioBuffer using `audioContext.decodeAudioData()`
   - Apply normalization if enabled
   - Store in memory for playback

2. **Playback Control**:
   - Create BufferSourceNode from decoded buffer
   - Connect through audio effects chain
   - Start playback with `sourceNode.start()`
   - Monitor playback state and position

3. **Queue Management**:
   - Maintain ordered array of songs
   - Track current index and playback position
   - Handle shuffle/repeat modes
   - Preload next song for gapless playback

### Audio Effects Chain
```
AudioBuffer → BufferSourceNode → EQ Filters → GainNode → AnalyserNode → Destination
```

### Advanced Features
- **Gapless Playback**: Preload next buffer, crossfade between tracks
- **Pitch/Tempo Shift**: Modify playback rate (basic implementation)
- **Normalization**: Peak normalization to prevent clipping
- **Crossfade**: Overlap tracks during transitions

## 2. Search and Indexing System

### Search Architecture
- **Fuse.js Library**: Fuzzy search implementation
- **IndexedDB**: Persistent storage with indexes
- **Real-time Indexing**: Automatic indexing on song import

### Indexing Process
1. **Song Import**:
   - Extract metadata (title, artist, album, genre)
   - Generate searchable tokens
   - Store in IndexedDB with multiple indexes

2. **Search Execution**:
   - Query across title, artist, album fields
   - Apply fuzzy matching with configurable threshold
   - Filter by genre/artist/album if specified
   - Sort by relevance score

3. **Performance Optimization**:
   - Index songs on import for instant search
   - Cache search results
   - Debounce search input to reduce API calls

### Search Features
- **Multi-field Search**: Title, artist, album simultaneously
- **Filter Combination**: Genre + artist + album filters
- **Fuzzy Matching**: Handle typos and partial matches
- **Instant Results**: Real-time search as user types

## 3. Playlist Management

### Data Structure
```javascript
{
  id: "playlist-uuid",
  name: "My Playlist",
  description: "Optional description",
  songs: [songId1, songId2, ...],
  created: timestamp,
  modified: timestamp,
  cover: "optional-cover-url"
}
```

### CRUD Operations
- **Create**: Generate UUID, initialize empty songs array
- **Read**: Load from IndexedDB with song details
- **Update**: Modify metadata or song order
- **Delete**: Remove playlist and update references

### Drag & Drop Implementation
- **HTML5 Drag API**: Native drag events
- **Visual Feedback**: Placeholder elements during drag
- **Order Calculation**: Determine drop position
- **Array Manipulation**: Reorder songs array
- **Persistence**: Save changes to IndexedDB

### Playlist Features
- **Song Addition/Removal**: Dynamic playlist modification
- **Reorder Songs**: Drag-drop reordering
- **Bulk Operations**: Add multiple songs at once
- **Duplicate Prevention**: Check for existing songs

## 4. Offline Storage and Synchronization

### Storage Architecture
- **IndexedDB**: Primary storage for songs, playlists, metadata
- **Cache API**: Service worker caching for assets
- **Blob Storage**: Audio files stored as Blobs
- **Version Control**: Data versioning for sync

### Offline Strategy
1. **Cache on Play**: Store songs as they're played
2. **Background Sync**: Queue operations when offline
3. **Conflict Resolution**: Handle concurrent changes
4. **Quota Management**: Monitor storage usage

### Sync Process
- **Online Detection**: Monitor navigator.onLine
- **Queue Processing**: Execute queued operations
- **Conflict Handling**: User choice for conflicts
- **Progress Indication**: Show sync status

### Storage Optimization
- **Compression**: Store metadata efficiently
- **Lazy Loading**: Load data on demand
- **Cleanup**: Remove unused cached content
- **Quota Monitoring**: Warn before storage limits

## 5. Voice Command System

### Speech Recognition
- **Web Speech API**: Browser-native speech recognition
- **Continuous Listening**: Maintain active listening state
- **Language Support**: Configurable language recognition

### Command Processing
1. **Speech to Text**: Convert audio to text
2. **Intent Recognition**: Parse natural language commands
3. **Action Mapping**: Map commands to app functions
4. **Execution**: Trigger appropriate UI/audio actions

### Supported Commands
- **Playback Control**: "play", "pause", "stop", "next", "previous"
- **Song Selection**: "play [song name]", "play [artist]"
- **Queue Management**: "add to queue", "clear queue"
- **Search**: "search for [query]"
- **Settings**: "shuffle on/off", "repeat mode"

### Implementation Details
- **Permission Handling**: Request microphone access
- **Error Recovery**: Handle recognition failures
- **Feedback**: Visual/audio confirmation of commands
- **Fallback**: Graceful degradation without voice support

## 6. Gesture Control System

### Touch Event Handling
- **Touch Events**: Native touchstart, touchmove, touchend
- **Gesture Recognition**: Detect swipe, tap, pinch gestures
- **Multi-touch Support**: Handle multiple simultaneous touches

### Gesture Types
1. **Swipe Gestures**:
   - **Horizontal Swipe**: Skip tracks (left/right)
   - **Vertical Swipe**: Volume control (up/down)
   - **Detection**: Track touch movement vectors

2. **Tap Gestures**:
   - **Single Tap**: Play/pause
   - **Double Tap**: Toggle favorite
   - **Long Press**: Show context menu

3. **Pinch Gestures**:
   - **Pinch In/Out**: Zoom visualizer
   - **Two-finger Rotation**: EQ adjustment

### Implementation
- **Event Delegation**: Centralized gesture handling
- **Velocity Tracking**: Measure gesture speed/distance
- **Threshold Configuration**: Configurable sensitivity
- **Haptic Feedback**: Vibration on gesture completion

## 7. Equalizer and Audio Effects

### EQ Architecture
- **BiquadFilterNode**: Web Audio API filters
- **Frequency Bands**: 60Hz, 250Hz, 1kHz, 4kHz, 16kHz
- **Filter Types**: Peaking filters for each band
- **Real-time Adjustment**: Live parameter changes

### EQ Presets
```javascript
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  rock: [3, 1, -1, 1, 3],
  pop: [-2, 1, 3, 2, -1],
  jazz: [2, 1, -1, 0, 2],
  classical: [0, 0, 0, 0, 0]
};
```

### Audio Effects
- **Crossfade**: Linear fade between tracks
- **Fade In/Out**: Smooth volume transitions
- **Normalization**: Peak level adjustment
- **Sleep Timer**: Automatic fade out

### Real-time Processing
- **Low Latency**: Minimize audio processing delay
- **Efficient Algorithms**: Optimized for real-time use
- **Memory Management**: Clean up unused nodes

## 8. Settings and Preferences

### Settings Architecture
- **LocalStorage**: User preferences and settings
- **IndexedDB**: Audio settings and preferences
- **Real-time Sync**: Immediate UI updates
- **Validation**: Input validation and sanitization

### Settings Categories
1. **Audio Settings**:
   - EQ presets and custom curves
   - Playback options (repeat, shuffle)
   - Audio effects (crossfade, normalization)

2. **UI Settings**:
   - Theme selection
   - Layout preferences (grid/list)
   - Language selection

3. **Privacy Settings**:
   - Analytics opt-out
   - Data export/import
   - Clear all data

### Persistence Strategy
- **Immediate Save**: Auto-save on change
- **Backup**: Export/import settings
- **Reset**: Restore defaults
- **Migration**: Handle setting updates

## 9. Error Handling and Recovery

### Error Classification
- **Network Errors**: Connection issues, timeouts
- **Storage Errors**: Quota exceeded, corruption
- **Playback Errors**: Unsupported formats, corrupted files
- **Permission Errors**: Access denied, blocked features

### Recovery Strategies
- **Retry Logic**: Exponential backoff for transient errors
- **Fallback Options**: Alternative implementations
- **User Guidance**: Clear error messages with solutions
- **Graceful Degradation**: Continue with reduced functionality

### Logging System
- **Error Categorization**: Group similar errors
- **Context Capture**: Include relevant state information
- **Remote Logging**: Optional error reporting
- **Analytics**: Track error patterns

## 10. Performance Optimization

### Core Web Vitals
- **Largest Contentful Paint (LCP)**: Optimize initial load
- **First Input Delay (FID)**: Minimize interaction latency
- **Cumulative Layout Shift (CLS)**: Prevent layout shifts

### Optimization Techniques
- **Lazy Loading**: Images, components, data
- **Virtual Scrolling**: Large lists without DOM bloat
- **Memory Management**: Clean up unused resources
- **Caching Strategy**: Intelligent asset caching

### Monitoring
- **Performance Metrics**: Track loading, interaction times
- **Memory Usage**: Monitor heap usage
- **Network Requests**: Analyze request patterns
- **Error Rates**: Track feature reliability