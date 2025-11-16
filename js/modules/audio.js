l
// Roshan Beats Audio Module using Web Audio API

let audioContext;
let gainNode;
let analyserNode;
let sourceNode;
let buffer;
let filters = [];
let isPlaying = false;
let currentTime = 0;
let duration = 0;
let playbackRate = 1;
let volume = 1;
let gaplessEnabled = false;
let nextBuffer;
let startTime;
let eventListeners = {};

// Background playback and Media Session
let mediaSessionSupported = false;
let currentSong = null;
let queue = [];
let queueIndex = -1;
let repeatMode = 'off'; // 'off', 'one', 'all'
let shuffleEnabled = false;
let shuffleSeed = null;
let crossfadeEnabled = false;
let crossfadeDuration = 3; // seconds
let sleepTimer = null;
let sleepTimerEnd = null;
let fadeInEnabled = true;
let fadeInDuration = 1; // seconds
let normalizationEnabled = false;
let pitchShift = 0; // semitones
let tempoShift = 0; // percentage
let bookmarks = new Set();
let lyrics = null;
let lyricsIndex = -1;
let autoPlaySimilar = false;

const EQ_FREQUENCIES = [60, 250, 1000, 4000, 16000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  rock: [3, 1, -1, 1, 3],
  pop: [-2, 1, 3, 2, -1],
  jazz: [2, 1, -1, 0, 2],
  classical: [0, 0, 0, 0, 0]
};

/**
 * Emits a custom event to all registered listeners
 * @param {string} event - The event name to emit
 * @param {*} data - The data to pass to event listeners
 */
function emit(event, data) {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback(data));
  }
}

function updateTime() {
  if (isPlaying) {
    emit('timeupdate');
    requestAnimationFrame(updateTime);
  }
}

/**
 * Initializes the Web Audio API context and audio processing chain
 * Sets up gain nodes, analyzers, EQ filters, and media session support
 * @returns {void}
 * @emits audioContextSuspended - When audio context is resumed from suspended state
 * @emits error - When audio initialization fails
 */
export function initAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      gainNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);

      // Initialize EQ filters
      filters = EQ_FREQUENCIES.map(freq => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      // Connect filters in chain
      gainNode.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(analyserNode);

      // Initialize Media Session API for background playback
      initMediaSession();

      // Initialize Web Audio effects chain for advanced features
      initAudioEffects();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
      emit('audioContextSuspended');
    }
  } catch (error) {
    emit('error', error);
  }
}

function initMediaSession() {
  if ('mediaSession' in navigator) {
    mediaSessionSupported = true;

    // Set up media session action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      stop();
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
      seek(Math.max(0, getCurrentTime() - 10));
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
      seek(Math.min(duration, getCurrentTime() + 10));
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });
  }
}

function initAudioEffects() {
  // Initialize additional audio nodes for effects
  // These will be connected as needed
}

function updateMediaSession() {
  if (!mediaSessionSupported || !currentSong) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentSong.title,
    artist: currentSong.artist,
    album: currentSong.album,
    artwork: currentSong.cover ? [{ src: currentSong.cover, sizes: '512x512', type: 'image/png' }] : undefined
  });

  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

export async function loadSong(source) {
  try {
    let arrayBuffer;
    if (source instanceof Blob) {
      arrayBuffer = await source.arrayBuffer();
    } else {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    }
    buffer = await audioContext.decodeAudioData(arrayBuffer);
    duration = buffer.duration;

    // Apply normalization if enabled
    if (normalizationEnabled) {
      normalizeAudio();
    }

    emit('loaded', { duration, buffer });
  } catch (error) {
    // Fallback to HTML Audio element for unsupported formats
    console.warn('Web Audio decoding failed, format may not be supported:', error);
    emit('fileCorrupted', { error: error.message, source });
    emit('error', error);
  }
}

function normalizeAudio() {
  if (!buffer) return;

  // Simple peak normalization - find max amplitude and scale
  const channelData = buffer.getChannelData(0);
  let maxAmplitude = 0;

  for (let i = 0; i < channelData.length; i++) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
  }

  if (maxAmplitude > 0) {
    const scale = 0.9 / maxAmplitude; // Leave some headroom
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }
  }
}

/**
 * Starts or resumes audio playback
 * @param {Object|null} song - Song object to load and play, or null to resume current song
 * @param {boolean} startFromQueue - Whether this play call is from queue management (affects fade-in)
 * @returns {void}
 * @emits play - When playback starts
 */
export function play(song = null, startFromQueue = false) {
  if (song) {
    // Load new song
    loadSongFromQueue(song);
    return;
  }

  if (!buffer) return;

  if (sourceNode) {
    sourceNode.stop();
  }

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.playbackRate.value = playbackRate;

  // Apply pitch/tempo if needed
  if (pitchShift !== 0 || tempoShift !== 0) {
    // Note: Full pitch/tempo shifting requires AudioWorklet or external library
    // For now, we'll use basic playback rate adjustment
    const adjustedRate = playbackRate * (1 + tempoShift / 100);
    sourceNode.playbackRate.value = Math.max(0.5, Math.min(2, adjustedRate));
  } else {
    sourceNode.playbackRate.value = playbackRate;
  }

  // Handle fade-in
  if (fadeInEnabled && !startFromQueue) {
    applyFadeIn();
  }

  sourceNode.connect(gainNode);
  startTime = audioContext.currentTime - currentTime;
  sourceNode.start(0, currentTime);

  sourceNode.onended = () => {
    isPlaying = false;
    handleTrackEnd();
  };

  isPlaying = true;
  updateMediaSession();
  emit('play');
  updateTime();
  updateLyricsSync();
}

function applyFadeIn() {
  if (!gainNode) return;

  const fadeInStart = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, fadeInStart);
  gainNode.gain.linearRampToValueAtTime(volume, fadeInStart + fadeInDuration);
}

function handleTrackEnd() {
  emit('ended');

  // Handle sleep timer
  if (sleepTimer && Date.now() >= sleepTimerEnd) {
    stopSleepTimer();
    pause();
    return;
  }

  // Auto-play next track based on queue/repeat/shuffle
  const nextSong = getNextSong();
  if (nextSong) {
    if (crossfadeEnabled) {
      crossfadeToNext(nextSong);
    } else {
      playNext();
    }
  } else if (repeatMode === 'all' && queue.length > 0) {
    // Restart queue
    queueIndex = 0;
    play(queue[0]);
  }
}

function crossfadeToNext(nextSong) {
  // Create crossfade by overlapping tracks
  const currentGain = gainNode.gain;
  const fadeOutStart = audioContext.currentTime;
  const fadeOutEnd = fadeOutStart + crossfadeDuration;

  // Fade out current track
  currentGain.setValueAtTime(currentGain.value, fadeOutStart);
  currentGain.linearRampToValueAtTime(0, fadeOutEnd);

  // Load and start next track with fade in
  setTimeout(() => {
    loadSongFromQueue(nextSong);
    play(null, true);
  }, (crossfadeDuration / 2) * 1000);
}

function loadSongFromQueue(song) {
  currentSong = song;
  currentTime = 0;
  loadSong(song.src || song.url || song);
}

export function pause() {
  if (sourceNode && isPlaying) {
    sourceNode.stop();
    currentTime += (audioContext.currentTime - startTime) * playbackRate;
    isPlaying = false;
    updateMediaSession();
    emit('pause');
  }
}

export function stop() {
  if (sourceNode) {
    sourceNode.stop();
  }
  currentTime = 0;
  isPlaying = false;
  emit('ended'); // or 'stop', but 'ended' as per spec
}

export function seek(time) {
  time = Math.max(0, Math.min(time, duration));
  if (isPlaying) {
    pause();
    currentTime = time;
    play();
  } else {
    currentTime = time;
  }
}

export function setVolume(level) {
  volume = Math.max(0, Math.min(level, 1));
  if (gainNode) {
    gainNode.gain.value = volume;
  }
}

export function setPlaybackRate(rate) {
  playbackRate = Math.max(0.5, Math.min(rate, 2));
  if (sourceNode) {
    sourceNode.playbackRate.value = playbackRate;
  }
}

export function applyEQ(bands) {
  if (filters.length === bands.length) {
    filters.forEach((filter, i) => {
      filter.gain.value = bands[i];
    });
  }
}

export function setEQPreset(preset) {
  if (EQ_PRESETS[preset]) {
    applyEQ(EQ_PRESETS[preset]);
  }
}

export function getVisualizerData(type) {
  if (!analyserNode) return null;
  const bufferLength = analyserNode.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  if (type === 'spectrum' || type === 'circular') {
    analyserNode.getByteFrequencyData(data);
  } else if (type === 'waveform') {
    analyserNode.getByteTimeDomainData(data);
  }
  return data;
}

export function enableGapless() {
  gaplessEnabled = true;
  // Preloading logic would require next song source, so flag set
}

export function getCurrentTime() {
  if (isPlaying) {
    return currentTime + (audioContext.currentTime - startTime) * playbackRate;
  }
  return currentTime;
}

export function getDuration() {
  return duration;
}

// Queue Management
export function setQueue(songs, startIndex = 0) {
  queue = [...songs];
  queueIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
  emit('queueChanged', { queue, index: queueIndex });
}

export function addToQueue(song, position = 'end') {
  if (position === 'next') {
    queue.splice(queueIndex + 1, 0, song);
  } else if (position === 'end') {
    queue.push(song);
  } else if (typeof position === 'number') {
    queue.splice(position, 0, song);
  }
  emit('queueChanged', { queue, index: queueIndex });
}

export function removeFromQueue(index) {
  if (index >= 0 && index < queue.length) {
    queue.splice(index, 1);
    if (index <= queueIndex) {
      queueIndex = Math.max(0, queueIndex - 1);
    }
    emit('queueChanged', { queue, index: queueIndex });
  }
}

export function moveInQueue(fromIndex, toIndex) {
  if (fromIndex >= 0 && fromIndex < queue.length && toIndex >= 0 && toIndex < queue.length) {
    const [song] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, song);

    if (fromIndex === queueIndex) {
      queueIndex = toIndex;
    } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
      queueIndex--;
    } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
      queueIndex++;
    }

    emit('queueChanged', { queue, index: queueIndex });
  }
}

export function clearQueue() {
  queue = [];
  queueIndex = -1;
  emit('queueChanged', { queue, index: queueIndex });
}

export function getQueue() {
  return { queue, index: queueIndex };
}

export function playNext() {
  const nextSong = getNextSong();
  if (nextSong) {
    queueIndex++;
    play(nextSong);
  }
}

export function playPrevious() {
  if (queueIndex > 0) {
    queueIndex--;
    play(queue[queueIndex]);
  } else if (repeatMode === 'all') {
    queueIndex = queue.length - 1;
    play(queue[queueIndex]);
  }
}

function getNextSong() {
  if (shuffleEnabled) {
    return getShuffledNextSong();
  }

  if (queueIndex < queue.length - 1) {
    return queue[queueIndex + 1];
  } else if (repeatMode === 'all') {
    return queue[0];
  }

  // Auto-play suggestions when queue ends
  if (autoPlaySimilar && currentSong) {
    return getAutoPlaySuggestion();
  }

  return null;
}

function getAutoPlaySuggestion() {
  // Get similar songs based on current song and listening history
  const history = getHistory ? getHistory(20) : [];
  const recentArtists = [...new Set(history.slice(0, 5).map(h => h.artist))];
  const recentGenres = [...new Set(history.slice(0, 5).map(h => h.genre))];

  // Find songs by same artist or similar genres
  const allSongs = getSongs ? getSongs() : [];
  const candidates = allSongs.filter(song => {
    if (song.id === currentSong.id) return false; // Don't repeat current song

    // Prioritize same artist
    if (song.artist === currentSong.artist) return true;

    // Then same genre
    if (song.genre && currentSong.genre && song.genre === currentSong.genre) return true;

    // Then recently played artists/genres
    if (recentArtists.includes(song.artist)) return true;
    if (song.genre && recentGenres.includes(song.genre)) return true;

    return false;
  });

  if (candidates.length === 0) return null;

  // Weight candidates by relevance
  const weightedCandidates = candidates.map(song => {
    let score = 1;

    if (song.artist === currentSong.artist) score += 3;
    if (song.genre === currentSong.genre) score += 2;
    if (recentArtists.includes(song.artist)) score += 1;
    if (recentGenres.includes(song.genre)) score += 1;

    // Reduce score for recently played songs
    const recentPlays = history.filter(h => h.songId === song.id).length;
    score *= Math.max(0.1, 1 - (recentPlays * 0.3));

    return { song, score };
  });

  // Sort by score and pick best match
  weightedCandidates.sort((a, b) => b.score - a.score);
  return weightedCandidates[0].song;
}

function getShuffledNextSong() {
  if (!shuffleSeed) {
    shuffleSeed = Math.random();
  }

  // Smart shuffle based on listening history and preferences
  const availableSongs = queue.filter((_, i) => i !== queueIndex);
  if (availableSongs.length === 0) return null;

  // Get listening history to weight shuffle
  const history = getHistory ? getHistory(50) : [];
  const playedSongIds = new Set(history.map(h => h.songId));

  // Weight songs based on play frequency and recency
  const weightedSongs = availableSongs.map((song, index) => {
    let weight = 1;

    // Reduce weight for recently played songs
    if (playedSongIds.has(song.id)) {
      const recentPlays = history.filter(h => h.songId === song.id).length;
      weight *= Math.max(0.1, 1 - (recentPlays * 0.2)); // Reduce weight for frequently played
    }

    // Increase weight for songs by favorite artists/genres
    if (song.artist === currentSong?.artist) {
      weight *= 1.5; // Prefer same artist
    }

    // Add some randomness
    weight *= (0.5 + Math.random());

    return { song, index, weight };
  });

  // Sort by weight and pick top candidate
  weightedSongs.sort((a, b) => b.weight - a.weight);

  // Use weighted random selection from top candidates
  const topCandidates = weightedSongs.slice(0, Math.min(5, weightedSongs.length));
  const totalWeight = topCandidates.reduce((sum, item) => sum + item.weight, 0);
  let random = (shuffleSeed * 1000 + Date.now()) % totalWeight;

  for (const item of topCandidates) {
    random -= item.weight;
    if (random <= 0) {
      return item.song;
    }
  }

  // Fallback to simple random
  const randomIndex = Math.floor((shuffleSeed * 1000 + Date.now()) % availableSongs.length);
  return availableSongs[randomIndex];
}

// Repeat and Shuffle
export function setRepeatMode(mode) {
  repeatMode = mode;
  emit('repeatModeChanged', mode);
}

export function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  shuffleSeed = shuffleEnabled ? Math.random() : null;
  emit('shuffleChanged', shuffleEnabled);
}

export function getRepeatMode() {
  return repeatMode;
}

export function getShuffleEnabled() {
  return shuffleEnabled;
}

// Playback Speed
export function setPlaybackSpeed(speed) {
  playbackRate = Math.max(0.5, Math.min(2, speed));
  if (sourceNode) {
    sourceNode.playbackRate.value = playbackRate;
  }
  emit('playbackSpeedChanged', playbackRate);
}

// Bookmarks/Favorites
export function toggleBookmark(songId) {
  if (bookmarks.has(songId)) {
    bookmarks.delete(songId);
  } else {
    bookmarks.add(songId);
  }
  emit('bookmarksChanged', Array.from(bookmarks));
}

export function isBookmarked(songId) {
  return bookmarks.has(songId);
}

export function getBookmarks() {
  return Array.from(bookmarks);
}

// Sleep Timer
export function setSleepTimer(minutes) {
  if (sleepTimer) {
    clearTimeout(sleepTimer);
  }

  sleepTimerEnd = Date.now() + (minutes * 60 * 1000);
  sleepTimer = setTimeout(() => {
    fadeOutAndStop();
  }, minutes * 60 * 1000);

  emit('sleepTimerSet', minutes);
}

export function cancelSleepTimer() {
  if (sleepTimer) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
    sleepTimerEnd = null;
    emit('sleepTimerCancelled');
  }
}

export function getSleepTimerRemaining() {
  if (!sleepTimerEnd) return 0;
  return Math.max(0, sleepTimerEnd - Date.now());
}

function fadeOutAndStop() {
  if (!gainNode) return;

  const fadeOutStart = audioContext.currentTime;
  const fadeOutEnd = fadeOutStart + 5; // 5 second fade out

  gainNode.gain.setValueAtTime(gainNode.gain.value, fadeOutStart);
  gainNode.gain.linearRampToValueAtTime(0, fadeOutEnd);

  setTimeout(() => {
    pause();
    sleepTimer = null;
    sleepTimerEnd = null;
  }, 5000);
}

// Lyrics
export function setLyrics(songId, lyricsData) {
  lyrics = lyricsData;
  lyricsIndex = -1;
  emit('lyricsLoaded', lyricsData);
}

export function getLyrics() {
  return lyrics;
}

function updateLyricsSync() {
  if (!lyrics || !isPlaying) return;

  const currentTimeMs = getCurrentTime() * 1000;
  let newIndex = -1;

  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTimeMs) {
      newIndex = i;
    } else {
      break;
    }
  }

  if (newIndex !== lyricsIndex) {
    lyricsIndex = newIndex;
    emit('lyricsSync', { index: lyricsIndex, line: lyrics[lyricsIndex] });
  }

  requestAnimationFrame(updateLyricsSync);
}

// Audio Effects
export function setCrossfade(enabled, duration = 3) {
  crossfadeEnabled = enabled;
  crossfadeDuration = duration;
  emit('crossfadeChanged', { enabled, duration });
}

export function setFadeIn(enabled, duration = 1) {
  fadeInEnabled = enabled;
  fadeInDuration = duration;
  emit('fadeInChanged', { enabled, duration });
}

export function setNormalization(enabled) {
  normalizationEnabled = enabled;
  // Note: Audio normalization requires analyzing the buffer
  // Implementation would need to scan buffer and adjust gain accordingly
  emit('normalizationChanged', enabled);
}

export function setPitchShift(semitones) {
  pitchShift = Math.max(-12, Math.min(12, semitones));
  // Note: Full pitch shifting requires AudioWorklet or external library
  emit('pitchShiftChanged', pitchShift);
}

export function setTempoShift(percentage) {
  tempoShift = Math.max(-50, Math.min(50, percentage));
  // Note: Tempo shifting without pitch change requires complex processing
  emit('tempoShiftChanged', tempoShift);
}

export function setAutoPlaySimilar(enabled) {
  autoPlaySimilar = enabled;
  emit('autoPlaySimilarChanged', enabled);
}

// Getters for UI
export function getCurrentSong() {
  return currentSong;
}

export function getPlaybackSpeed() {
  return playbackRate;
}

export function getCrossfadeSettings() {
  return { enabled: crossfadeEnabled, duration: crossfadeDuration };
}

export function getFadeInSettings() {
  return { enabled: fadeInEnabled, duration: fadeInDuration };
}

export function getPitchShift() {
  return pitchShift;
}

export function getTempoShift() {
  return tempoShift;
}

export function getAutoPlaySimilar() {
  return autoPlaySimilar;
}

export function on(event, callback) {
  eventListeners[event] = eventListeners[event] || [];
  eventListeners[event].push(callback);
}