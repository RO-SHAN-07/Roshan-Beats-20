class HardwareManager {
  constructor() {
    this.volumeUpHandler = null;
    this.volumeDownHandler = null;
    this.backButtonHandler = null;
    this.menuButtonHandler = null;
  }

  init() {
    this.setupVolumeButtons();
    this.setupBackButton();
    this.setupMenuButton();
    this.setupScreenOrientation();
  }

  setupVolumeButtons() {
    // Volume buttons are handled by the browser/OS
    // We can listen for volumechange events on audio elements
    // But for hardware buttons, we need to prevent default and handle custom behavior

    // Note: Direct hardware button access is limited in web apps
    // This is more of a placeholder for future Android-specific APIs
    console.log('Hardware volume button support initialized');
  }

  setupBackButton() {
    // Handle Android back button
    if (window.history && window.history.pushState) {
      window.addEventListener('popstate', (event) => {
        // Prevent default back behavior and handle custom navigation
        event.preventDefault();

        // Custom back button logic
        this.handleBackButton();
      });
    }

    // For PWA installed on Android, back button can be handled
    window.addEventListener('beforeunload', (event) => {
      // Handle app close
      console.log('App closing via back button');
    });
  }

  setupMenuButton() {
    // Android menu button (if available)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Menu' || event.keyCode === 93) { // Menu key
        event.preventDefault();
        this.handleMenuButton();
      }
    });
  }

  setupScreenOrientation() {
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      console.log('Orientation changed to:', screen.orientation.angle);

      // Adjust UI for orientation
      if (screen.orientation.angle === 90 || screen.orientation.angle === -90) {
        document.body.classList.add('landscape');
        document.body.classList.remove('portrait');
      } else {
        document.body.classList.add('portrait');
        document.body.classList.remove('landscape');
      }
    });

    // Request full screen on orientation change (for immersive experience)
    if (document.documentElement.requestFullscreen) {
      document.addEventListener('orientationchange', () => {
        if (screen.orientation.angle !== 0) {
          document.documentElement.requestFullscreen().catch(console.error);
        }
      });
    }
  }

  handleBackButton() {
    // Custom back navigation logic
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen && currentScreen.id !== 'home-screen') {
      // Go back to home or previous screen
      // This would integrate with the UI manager
      console.log('Back button pressed - navigating back');
      // For now, just log
    } else {
      // If on home screen, show exit confirmation
      if (confirm('Exit Roshan Beats?')) {
        window.close();
      }
    }
  }

  handleMenuButton() {
    // Show context menu or settings
    console.log('Menu button pressed');
    // Could open a quick menu
  }

  setVolumeUpHandler(handler) {
    this.volumeUpHandler = handler;
  }

  setVolumeDownHandler(handler) {
    this.volumeDownHandler = handler;
  }

  setBackButtonHandler(handler) {
    this.backButtonHandler = handler;
  }

  setMenuButtonHandler(handler) {
    this.menuButtonHandler = handler;
  }

  // Vibration API for haptic feedback
  vibrate(pattern = 200) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Wake lock for continuous playback
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
        return wakeLock;
      } catch (error) {
        console.error('Wake lock failed:', error);
      }
    }
  }
}

export default new HardwareManager();