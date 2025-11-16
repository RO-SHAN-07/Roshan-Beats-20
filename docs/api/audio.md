# Audio Module API

The Audio module provides Web Audio API-based audio playback with advanced features like equalization, gapless playback, and visualizations.

## Overview

Uses Web Audio API for high-quality audio processing with features like:
- 5-band equalizer with presets
- Real-time audio visualizations
- Gapless playback
- Playback rate control
- Volume management

## Functions

### Initialization

#### `initAudio()`
Initializes the Web Audio context and creates audio nodes.

**Returns:** `void`

**Example:**
```javascript
import { initAudio } from './js/modules/audio.js';

initAudio();
```

### Song Loading

#### `loadSong(source)`
Loads audio from a URL or Blob.

**Parameters:**
- `source` (string|Blob): Audio source URL or blob

**Returns:** `Promise<void>`

**Examples:**
```javascript
// Load from URL
await loadSong('path/to/song.mp3');

// Load from blob
const response = await fetch('song.mp3');
const blob = await response.blob();
await loadSong(blob);
```

### Playback Controls

#### `play()`
Starts audio playback.

**Returns:** `void`

**Example:**
```javascript
play();
```

#### `pause()`
Pauses audio playback.

**Returns:** `void`

**Example:**
```javascript
pause();
```

#### `stop()`
Stops audio playback and resets position.

**Returns:** `void`

**Example:**
```javascript
stop();
```

#### `seek(time)`
Seeks to a specific time position.

**Parameters:**
- `time` (number): Time in seconds

**Returns:** `void`

**Example:**
```javascript
seek(120); // Seek to 2 minutes
```

### Audio Controls

#### `setVolume(level)`
Sets the playback volume.

**Parameters:**
- `level` (number): Volume level (0.0 to 1.0)

**Returns:** `void`

**Example:**
```javascript
setVolume(0.8); // 80% volume
```

#### `setPlaybackRate(rate)`
Sets the playback speed.

**Parameters:**
- `rate` (number): Playback rate (0.5 to 2.0)

**Returns:** `void`

**Example:**
```javascript
setPlaybackRate(1.2); // 20% faster
```

### Equalizer

#### `applyEQ(bands)`
Applies custom EQ settings.

**Parameters:**
- `bands` (Array<number>): Array of 5 gain values in dB

**Returns:** `void`

**Example:**
```javascript
applyEQ([3, 1, -1, 1, 3]); // Rock preset
```

#### `setEQPreset(preset)`
Applies a predefined EQ preset.

**Parameters:**
- `preset` (string): Preset name ('flat', 'rock', 'pop', 'jazz', 'classical')

**Returns:** `void`

**Example:**
```javascript
setEQPreset('rock');
```

### Visualizations

#### `getVisualizerData(type)`
Gets audio visualization data.

**Parameters:**
- `type` (string): Data type ('spectrum', 'waveform', 'circular')

**Returns:** `Uint8Array|null` - Audio data array

**Examples:**
```javascript
// Get frequency spectrum
const spectrum = getVisualizerData('spectrum');

// Get waveform data
const waveform = getVisualizerData('waveform');
```

### Gapless Playback

#### `enableGapless()`
Enables gapless playback mode.

**Returns:** `void`

**Example:**
```javascript
enableGapless();
```

### Status Getters

#### `getCurrentTime()`
Gets current playback position.

**Returns:** `number` - Current time in seconds

**Example:**
```javascript
const currentTime = getCurrentTime();
```

#### `getDuration()`
Gets total song duration.

**Returns:** `number` - Duration in seconds

**Example:**
```javascript
const duration = getDuration();
```

### Event System

#### `on(event, callback)`
Registers an event listener.

**Parameters:**
- `event` (string): Event name
- `callback` (Function): Event handler function

**Returns:** `void`

**Example:**
```javascript
on('play', () => console.log('Playback started'));
on('ended', () => console.log('Song ended'));
```

## Events

### Playback Events
- `play` - Fired when playback starts
- `pause` - Fired when playback pauses
- `ended` - Fired when song ends
- `timeupdate` - Fired during playback (for progress updates)

### Loading Events
- `loaded` - Fired when song is loaded
- `error` - Fired when loading or playback error occurs

### Custom Events
- `command` - Fired for voice commands (from voice module)

## EQ Presets

```javascript
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  rock: [3, 1, -1, 1, 3],
  pop: [-2, 1, 3, 2, -1],
  jazz: [2, 1, -1, 0, 2],
  classical: [0, 0, 0, 0, 0]
};
```

## Frequency Bands

The 5-band EQ operates on these center frequencies:
- Band 1: 60 Hz (Bass)
- Band 2: 250 Hz (Low mids)
- Band 3: 1000 Hz (Mids)
- Band 4: 4000 Hz (High mids)
- Band 5: 16000 Hz (Treble)

## Audio Context State

The Web Audio API requires user interaction to start the audio context. The module handles this automatically, but may emit 'error' events if the context fails to start.

## Browser Compatibility

Requires Web Audio API support:
- Chrome 14+
- Firefox 25+
- Safari 6+
- Edge 12+

## Error Handling

Common errors:
- `NotSupportedError`: Web Audio API not supported
- `InvalidStateError`: Audio context in invalid state
- `NotAllowedError`: Autoplay blocked by browser

**Example:**
```javascript
on('error', (error) => {
  console.error('Audio error:', error);
  // Handle error (fallback to HTML audio, show message, etc.)
});
```

## Performance Considerations

- Audio processing happens in real-time
- Visualizations use requestAnimationFrame for smooth updates
- Large audio files are streamed to avoid memory issues
- EQ processing adds minimal CPU overhead