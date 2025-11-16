2;// Gesture handling using TouchEvent API
import { play, pause, playNext, playPrevious, toggleShuffle, setVolume, getCurrentSong, getDuration, seek, addToQueue } from './modules/audio.js';
import { uiManager } from './modules/ui.js';

// Configuration
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const PINCH_THRESHOLD = 10; // Minimum scale change for pinch
const DOUBLE_TAP_DELAY = 300; // Max time between taps for double-tap
const LONG_PRESS_DELAY = 500; // Time for long-press
const CIRCLE_THRESHOLD = 20; // Minimum points for circle detection
const CIRCLE_RADIUS_VARIANCE = 30; // Max variance in radius for circle
const FLICK_TIME_THRESHOLD = 300; // Max time for flick
const FLICK_VELOCITY_THRESHOLD = 0.5; // Min velocity for flick (pixels/ms)
const FLICK_DISTANCE_THRESHOLD = 50; // Min distance for flick
const VOLUME_SWIPE_SENSITIVITY = 0.005; // Volume change per pixel
const SCRUB_SENSITIVITY = 0.01; // Seek change per pixel

// Navigable screens for swipe navigation
const navigableScreens = ['home-screen', 'playlists-screen', 'settings-screen', 'search-screen', 'notifications-screen', 'chat-screen', 'gallery-screen', 'dashboard-screen', 'profile-screen'];
let currentNavIndex = 0;

// Track current screen
function getCurrentScreen() {
  const activeScreen = document.querySelector('.screen.active');
  return activeScreen ? activeScreen.id : null;
}

// Haptic feedback
function vibrate(pattern = [50]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// New gesture variables
let isScrubbing = false;
let scrubStartX = 0;
let scrubStartTime = 0;
const volumeStartY = 0;
let isVolumeAdjusting = false;
const pinchStartDistance = 0;
let currentZoom = 1;
const rotateStartAngle = 0;

function setCurrentNavIndex() {
  const current = getCurrentScreen();
  currentNavIndex = navigableScreens.indexOf(current);
  if (currentNavIndex === -1) {
    currentNavIndex = 0;
  }
}

// Swipe left/right for navigation
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isThreeFingerSwipe = false;
let touchPath = [];
let touchStartTime = 0;
let isMultiSelect = false;
let twoFingerStartTime = 0;
let twoFingerMoved = false;

function handleTouchStart(e) {
  if (e.touches.length === 3) {
    isThreeFingerSwipe = true;
  } else {
    isThreeFingerSwipe = false;
  }
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
  touchPath = [{x: touchStartX, y: touchStartY}];
  if (e.touches.length === 2) {
    twoFingerStartTime = Date.now();
    twoFingerMoved = false;
  }

  // Check for tap and hold on progress bar
  const progressBar = e.target.closest('#seek-bar, .progress-bar');
  if (progressBar && e.touches.length === 1) {
    isScrubbing = true;
    scrubStartX = touchStartX;
    scrubStartTime = getCurrentTime();
    vibrate([20]);
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 3 && isThreeFingerSwipe) {
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
  } else if (e.touches.length === 1) {
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
    touchPath.push({x: touchEndX, y: touchEndY});

    // Handle scrubbing
    if (isScrubbing) {
      const deltaX = touchEndX - scrubStartX;
      const duration = getDuration();
      const newTime = Math.max(0, Math.min(duration, scrubStartTime + (deltaX * SCRUB_SENSITIVITY * duration)));
      seek(newTime);
      e.preventDefault();
    }
  }
  if (e.touches.length === 2) {
    twoFingerMoved = true;
  }
}

function handleTouchEnd(e) {
  if (e.touches.length > 0) {
    return;
  } // Still touching

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);
  const currentScreen = getCurrentScreen();

  // Check for player screen swipe left/right to skip tracks
  if (currentScreen === 'player-screen' && absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
    if (deltaX > 0) {
      playPrevious();
      vibrate([30]);
    } else {
      playNext();
      vibrate([30]);
    }
    return;
  }

  // Check for swipe up/down on volume slider
  const volumeSlider = document.elementFromPoint(touchStartX, touchStartY)?.closest('#volume-bar, .volume-slider');
  if (volumeSlider && absDeltaY > absDeltaX && absDeltaY > SWIPE_THRESHOLD / 2) {
    const volumeChange = -deltaY * VOLUME_SWIPE_SENSITIVITY;
    setVolume(Math.max(0, Math.min(1, getCurrentVolume() + volumeChange)));
    vibrate([20]);
    return;
  }

  // Check for swipe from left edge to reveal mini-player
  if (touchStartX < 50 && deltaX > SWIPE_THRESHOLD && absDeltaY < SWIPE_THRESHOLD) {
    revealMiniPlayer();
    vibrate([50]);
    return;
  }

  // Check for swipe down on playlist screen to refresh
  if (currentScreen === 'playlists-screen' && deltaY > SWIPE_THRESHOLD && absDeltaX < SWIPE_THRESHOLD / 2 && touchStartY < 100) {
    refreshPlaylists();
    vibrate([100, 50, 100]);
    return;
  }

  // Check for swipe up/down on main screen for volume (when not on controls)
  if ((currentScreen === 'home-screen' || currentScreen === 'playlists-screen') && absDeltaY > absDeltaX && absDeltaY > SWIPE_THRESHOLD) {
    const targetElement = document.elementFromPoint(touchStartX, touchStartY);
    if (!targetElement?.closest('.song-card, .playlist-card, .nav-item, button, input')) {
      const volumeChange = -deltaY * VOLUME_SWIPE_SENSITIVITY;
      setVolume(Math.max(0, Math.min(1, getCurrentVolume() + volumeChange)));
      vibrate([20]);
      return;
    }
  }

  // Check for edge swipe to reveal side menu
  if (touchStartX < 20 && deltaX > SWIPE_THRESHOLD) {
    revealSideMenu();
  } else if (absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
    if (isThreeFingerSwipe) {
      // Three-finger swipe to switch between tabs (screens)
      if (deltaX > 0) {
        navigateToPreviousScreen();
      } else {
        navigateToNextScreen();
      }
    } else {
      // One-finger swipe for navigation
      if (deltaX > 0) {
        navigateToPreviousScreen();
      } else {
        navigateToNextScreen();
      }
    }
  } else if (touchPath.length > CIRCLE_THRESHOLD && isCircularGesture(touchPath)) {
    cycleThroughOptions();
  }

  // Check for flick gesture
  const timeDiff = Date.now() - touchStartTime;
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  const velocity = distance / timeDiff;
  if (timeDiff < FLICK_TIME_THRESHOLD && velocity > FLICK_VELOCITY_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -FLICK_DISTANCE_THRESHOLD) {
    // Flick up for deletion
    const element = document.elementFromPoint(touchEndX, touchEndY);
    const item = element.closest('.song-item, .playlist-item');
    if (item) {
      quickDelete(item);
    }
  }

  // Check for two-finger tap
  if (e.changedTouches.length === 2 && !twoFingerMoved && Date.now() - twoFingerStartTime < 300) {
    zoomToFit();
  }

  // Check for palm swipe to dismiss keyboard
  const screenHeight = window.innerHeight;
  if (touchStartY > screenHeight * 0.6 && absDeltaX > SWIPE_THRESHOLD && absDeltaY < SWIPE_THRESHOLD / 2) {
    dismissKeyboard();
  }

  // Check for three-finger tap to toggle shuffle
  if (e.changedTouches.length === 3 && !isThreeFingerSwipe && Date.now() - touchStartTime < 300) {
    toggleShuffle();
    vibrate([100, 50, 100]);
    return;
  }

  // Reset gesture flags
  isScrubbing = false;
  isVolumeAdjusting = false;
}

function navigateToNextScreen() {
  setCurrentNavIndex();
  currentNavIndex = (currentNavIndex + 1) % navigableScreens.length;
  showScreen(navigableScreens[currentNavIndex]);
}

function navigateToPreviousScreen() {
  setCurrentNavIndex();
  currentNavIndex = currentNavIndex > 0 ? currentNavIndex - 1 : navigableScreens.length - 1;
  showScreen(navigableScreens[currentNavIndex]);
}

// Circular gesture to cycle through options
function isCircularGesture(points) {
  if (points.length < CIRCLE_THRESHOLD) {
    return false;
  }
  const start = points[0];
  const end = points[points.length - 1];
  const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  if (distance > 50) {
    return false;
  } // Start and end should be close

  // Calculate center
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;

  // Calculate radii
  const radii = [];
  for (const p of points) {
    const r = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
    radii.push(r);
  }
  const avgRadius = radii.reduce((a, b) => a + b) / radii.length;
  const variance = radii.reduce((sum, r) => sum + (r - avgRadius) ** 2, 0) / radii.length;
  return Math.sqrt(variance) < CIRCLE_RADIUS_VARIANCE;
}

function cycleThroughOptions() {
  // Cycle through navigable screens
  navigateToNextScreen();
}

function quickDelete(item) {
  // Remove the item from DOM
  item.remove();
  console.log('Quick deleted item');
  // In real app, update storage, etc.
}

function performMultiSelect() {
  const current = getCurrentScreen();
  if (current === 'home-screen' || current === 'playlists-screen') {
    const items = document.querySelectorAll('.song-item, .playlist-item');
    items.forEach(item => item.classList.add('selected'));
    console.log('Multi-selected all items');
  }
}

function zoomToFit() {
  const current = getCurrentScreen();
  let target = null;
  if (current === 'gallery-screen') {
    target = document.querySelector('.media-grid');
  } else if (current === 'map-screen') {
    target = document.querySelector('.map-container');
  }
  if (target) {
    target.style.transform = 'scale(1)';
    currentScale = 1;
    console.log('Zoomed to fit');
  }
}

function revealSideMenu() {
  // Toggle side menu visibility
  const sideMenu = document.querySelector('.side-menu');
  if (sideMenu) {
    sideMenu.classList.toggle('visible');
    console.log('Side menu revealed');
  } else {
    console.log('No side menu found');
  }
}

function getCurrentVolume() {
  // This would need to be implemented in audio module, for now return 0.5
  return 0.5;
}

function revealMiniPlayer() {
  const miniPlayer = document.getElementById('mini-player');
  if (miniPlayer) {
    miniPlayer.style.display = 'flex';
    console.log('Mini player revealed');
  }
}

function refreshPlaylists() {
  // Refresh playlists - in real app, fetch from server or reload
  console.log('Refreshing playlists');
  // For demo, just vibrate
}

function toggleLyricsFullscreen() {
  const lyricsPanel = document.getElementById('lyrics-panel');
  if (lyricsPanel) {
    lyricsPanel.classList.toggle('fullscreen');
    console.log('Lyrics fullscreen toggled');
  }
}

// Pinch to zoom on images/maps
let initialDistance = 0;
let currentScale = 1;

// Two-finger rotate for image manipulation
let initialAngle = 0;
let currentRotation = 0;

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getAngle(touches) {
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function handlePinchStart(e) {
  if (e.touches.length >= 3) {
    isMultiSelect = true;
  } else if (e.touches.length === 2) {
    initialDistance = getDistance(e.touches);
    initialAngle = getAngle(e.touches);
    isMultiSelect = false;
  }
}

function handlePinchMove(e) {
  if (e.touches.length === 2 && initialDistance > 0) {
    const currentDistance = getDistance(e.touches);
    const scale = currentDistance / initialDistance;
    if (Math.abs(scale - 1) > PINCH_THRESHOLD / 100) {
      zoomElement(scale);
    }

    // Handle rotation
    const currentAngle = getAngle(e.touches);
    const rotation = currentAngle - initialAngle;
    if (Math.abs(rotation) > 5) { // threshold for rotation
      rotateEQ(rotation);
    }
  }
}

function handlePinchEnd(e) {
  if (isMultiSelect) {
    performMultiSelect();
    isMultiSelect = false;
  }
  initialDistance = 0;
  currentScale = 1;
  initialAngle = 0;
  currentRotation = 0;
}

function zoomElement(scale) {
  const currentScreen = getCurrentScreen();
  let targetElement = null;

  if (currentScreen === 'player-screen') {
    // Pinch on visualizer to zoom in/out
    targetElement = document.querySelector('.visualizer, #visualizer');
  } else if (currentScreen === 'gallery-screen') {
    targetElement = document.querySelector('.media-grid');
  } else if (currentScreen === 'map-screen') {
    targetElement = document.querySelector('.map-container');
  }

  if (targetElement) {
    currentZoom *= scale;
    currentZoom = Math.max(0.5, Math.min(3, currentZoom)); // Limit zoom
    targetElement.style.transform = `scale(${currentZoom})`;
    targetElement.style.transformOrigin = 'center';
    vibrate([20]);
  }
}

function rotateElement(rotation) {
  const currentScreen = getCurrentScreen();
  let targetElement = null;

  if (currentScreen === 'gallery-screen') {
    targetElement = document.querySelector('.media-grid img'); // assuming single image or first
  }

  if (targetElement) {
    currentRotation += rotation;
    targetElement.style.transform = `rotate(${currentRotation}deg)`;
  }
}

function rotateEQ(rotation) {
  // Two-finger rotate on EQ controls for adjustment
  const eqControls = document.querySelector('.eq-controls, #eq-section');
  if (eqControls) {
    // Adjust EQ based on rotation
    const adjustment = rotation > 0 ? 1 : -1;
    // For demo, adjust first band
    console.log('Adjusting EQ by', adjustment);
    vibrate([20]);
  }
}

// Double-tap to like/favorite or knock to wake
let lastTapTime = 0;
let tapCount = 0;
let lastTapX = 0;
let lastTapY = 0;

function handleDoubleTap(e) {
  const currentTime = Date.now();
  const timeDiff = currentTime - lastTapTime;
  const tapX = e.changedTouches[0].clientX;
  const tapY = e.changedTouches[0].clientY;

  if (timeDiff < DOUBLE_TAP_DELAY && tapCount === 1 && Math.abs(tapX - lastTapX) < 50 && Math.abs(tapY - lastTapY) < 50) {
    // Double tap detected
    const albumArt = e.target.closest('#album-art, .album-cover');
    if (albumArt) {
      // Double tap on album art to toggle play/pause
      const currentSong = getCurrentSong();
      if (currentSong) {
        // Toggle play/pause - need to check current state
        // For now, assume pause if playing
        pause();
        vibrate([50]);
      } else {
        play();
        vibrate([50]);
      }
    } else {
      const lyricsPanel = e.target.closest('#lyrics-panel, .lyrics-container');
      if (lyricsPanel) {
        // Double tap on lyrics panel to toggle fullscreen
        toggleLyricsFullscreen();
        vibrate([100]);
      } else {
        const item = e.target.closest('.song-item, .playlist-item');
        if (item) {
          toggleFavorite(item);
        } else {
          // Knock gesture: double-tap on screen to wake device
          wakeDevice();
        }
      }
    }
    tapCount = 0;
  } else {
    tapCount = 1;
    lastTapX = tapX;
    lastTapY = tapY;
  }

  lastTapTime = currentTime;
}

function toggleFavorite(element) {
  // Find the song item or similar
  const item = element.closest('.song-item, .playlist-item');
  if (item) {
    item.classList.toggle('favorite');
    // Here you could save to storage or update UI
    console.log('Toggled favorite for item');
  }
}

function wakeDevice() {
  // Simulate waking device - in web app, perhaps resume from idle or show notification
  console.log('Device woken via knock gesture');
  // For demo, show a notification or alert
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Device Woken', { body: 'Knock gesture detected' });
  } else {
    alert('Device Woken');
  }
  // Perhaps resume playback or refresh
  // For now, just log
}

function dismissKeyboard() {
  // Dismiss virtual keyboard by blurring active element
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    activeElement.blur();
    console.log('Keyboard dismissed via palm swipe');
  }
}

// Finger drawing for signature input
let isDrawing = false;
let signatureCanvas = null;
let signatureCtx = null;

function initSignatureDrawing() {
  signatureCanvas = document.getElementById('signature-canvas');
  if (signatureCanvas) {
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.strokeStyle = '#000';
  }
}

function handleDrawingStart(e) {
  if (!signatureCanvas) {
    return;
  }
  isDrawing = true;
  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  signatureCtx.beginPath();
  signatureCtx.moveTo(x, y);
  e.preventDefault();
}

function handleDrawingMove(e) {
  if (!isDrawing || !signatureCanvas) {
    return;
  }
  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  signatureCtx.lineTo(x, y);
  signatureCtx.stroke();
  e.preventDefault();
}

function handleDrawingEnd(e) {
  if (!signatureCanvas) {
    return;
  }
  isDrawing = false;
  e.preventDefault();
}

function clearSignature() {
  if (signatureCtx) {
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  }
}

// Long-press for context menu
let longPressTimer = null;
let longPressElement = null;

function handleLongPressStart(e) {
  longPressElement = e.target;
  longPressTimer = setTimeout(() => {
    const trackItem = longPressElement.closest('.song-item, .song-list-item');
    if (trackItem) {
      // Long press on track in list to add to current queue
      const songId = trackItem.dataset.songId || trackItem.querySelector('h3')?.textContent;
      if (songId) {
        addToQueue({ id: songId, title: trackItem.querySelector('h3')?.textContent || 'Unknown' });
        vibrate([100, 50, 100]);
        console.log('Song added to queue via long press');
      }
    } else {
      showContextMenu(longPressElement);
    }
  }, LONG_PRESS_DELAY);
}

function handleLongPressEnd(e) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function showContextMenu(element) {
  const item = element.closest('.song-item, .playlist-item');
  if (item) {
    // Simple context menu - in real app, show a modal or dropdown
    alert('Context menu for: ' + item.querySelector('h3, .playlist-name').textContent);
  }
}

// Tap and hold to drag and drop elements
let dragTimer = null;
let isDragging = false;
let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function handleDragLongPressStart(e) {
  const element = e.target.closest('.song-item, .playlist-item');
  if (element) {
    dragTimer = setTimeout(() => {
      startDrag(element, e);
    }, LONG_PRESS_DELAY);
  }
}

function handleDragLongPressEnd(e) {
  if (dragTimer) {
    clearTimeout(dragTimer);
    dragTimer = null;
  }
  if (isDragging) {
    endDrag(e);
  }
}

function startDrag(element, e) {
  isDragging = true;
  draggedElement = element;
  dragOffsetX = e.touches[0].clientX - element.getBoundingClientRect().left;
  dragOffsetY = e.touches[0].clientY - element.getBoundingClientRect().top;
  element.style.position = 'absolute';
  element.style.zIndex = '1000';
  element.style.pointerEvents = 'none';
}

function handleDragMove(e) {
  if (isDragging && draggedElement) {
    const x = e.touches[0].clientX - dragOffsetX;
    const y = e.touches[0].clientY - dragOffsetY;
    draggedElement.style.left = x + 'px';
    draggedElement.style.top = y + 'px';
    e.preventDefault();
  }
}

function endDrag(e) {
  if (draggedElement) {
    const dropTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (dropTarget.closest('.playlist-detail')) {
      console.log('Dropped song into playlist');
    }
    draggedElement.style.position = '';
    draggedElement.style.left = '';
    draggedElement.style.top = '';
    draggedElement.style.zIndex = '';
    draggedElement.style.pointerEvents = '';
    isDragging = false;
    draggedElement = null;
  }
}

// Long-press for quick actions (force touch alternative)
let quickActionTimer = null;

function handleQuickActionStart(e) {
  const element = e.target.closest('.song-item');
  if (element) {
    quickActionTimer = setTimeout(() => {
      showQuickAction(element);
    }, LONG_PRESS_DELAY / 2); // Shorter delay for quick actions
  }
}

function handleQuickActionEnd(e) {
  if (quickActionTimer) {
    clearTimeout(quickActionTimer);
    quickActionTimer = null;
  }
}

function showQuickAction(element) {
  // Quick action: peek and pop alternative
  const songTitle = element.querySelector('h3').textContent;
  alert('Quick preview: ' + songTitle);
  // In real app, show overlay or play preview
}

// Shake gesture to refresh content
let lastAcceleration = { x: 0, y: 0, z: 0 };
let shakeCount = 0;

function handleDeviceMotion(e) {
  const acceleration = e.accelerationIncludingGravity;
  const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
  const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
  const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);

  if (deltaX > 15 || deltaY > 15 || deltaZ > 15) {
    shakeCount++;
    if (shakeCount > 3) {
      refreshContent();
      shakeCount = 0;
    }
  } else {
    shakeCount = Math.max(0, shakeCount - 1);
  }

  lastAcceleration = { x: acceleration.x, y: acceleration.y, z: acceleration.z };
}

function refreshContent() {
  // Refresh current screen content
  console.log('Shake detected: refreshing content');
  // Simple refresh
  location.reload();
}

// Initialize gestures
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  // Swipe navigation on app container
  app.addEventListener('touchstart', handleTouchStart, { passive: true });
  app.addEventListener('touchmove', handleTouchMove, { passive: true });
  app.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Pinch and rotate on specific screens
  app.addEventListener('touchstart', handlePinchStart, { passive: true });
  app.addEventListener('touchmove', handlePinchMove, { passive: true });
  app.addEventListener('touchend', handlePinchEnd, { passive: true });

  // Double-tap and long-press on items
  app.addEventListener('touchend', handleDoubleTap, { passive: true });
  app.addEventListener('touchstart', handleLongPressStart, { passive: true });
  app.addEventListener('touchend', handleLongPressEnd, { passive: true });
  app.addEventListener('touchmove', handleLongPressEnd, { passive: true }); // Cancel on move

  // Drag and drop
  app.addEventListener('touchstart', handleDragLongPressStart, { passive: false });
  app.addEventListener('touchmove', handleDragMove, { passive: false });
  app.addEventListener('touchend', handleDragLongPressEnd, { passive: false });

  // Quick actions long-press
  app.addEventListener('touchstart', handleQuickActionStart, { passive: true });
  app.addEventListener('touchend', handleQuickActionEnd, { passive: true });
  app.addEventListener('touchmove', handleQuickActionEnd, { passive: true });

  // Shake gesture
  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', handleDeviceMotion);
  }
});
