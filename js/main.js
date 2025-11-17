import './polyfills.js';
import container from './modules/di-container.js';
import networkDetector from './modules/network-detection.js';
import i18n from './modules/i18n.js';
import hardwareManager from './modules/hardware.js';

async function loadComponents() {
  const logger = container.resolve('logger');

  logger.info('Starting component loading', { components: ['nav', 'mini-player', 'modals'] });

  // Load reusable components
  const components = ['nav', 'mini-player', 'modals'];
  for (const component of components) {
    logger.debug(`Loading component: ${component}`);
    try {
      const startTime = performance.now();
      const response = await fetch(`html/components/${component}.html`);
      const html = await response.text();
      document.body.insertAdjacentHTML('beforeend', html);
      const loadTime = performance.now() - startTime;
      logger.info(`Component loaded successfully: ${component}`, { loadTime: `${loadTime.toFixed(2)}ms` });
    } catch (error) {
      logger.error(`Failed to load component ${component}`, error, { component });
    }
  }

  logger.info('Component loading completed');
}

document.addEventListener('DOMContentLoaded', async () => {
  const logger = container.resolve('logger');
  const uiManager = container.resolve('uiManager');
  const performanceMonitor = container.resolve('performanceMonitor');

  logger.info('DOMContentLoaded event fired, starting app initialization');

  // Check feature support and apply graceful degradation
  logger.debug('Checking feature support and applying graceful degradation');
  uiManager.degradeGracefully();

  // Apply adaptive loading based on network conditions
  const networkInfo = networkDetector.getNetworkInfo();
  logger.info('Network conditions detected', { networkInfo, isSlow: networkDetector.isSlowConnection() });
  if (networkDetector.isSlowConnection()) {
    document.body.classList.add('slow-network');
    logger.info('Slow network detected, showing skeleton screens');
    // On slow networks, show skeleton screens immediately
    uiManager.showSkeletonScreens();
  } else {
    document.body.classList.add('fast-network');
    logger.info('Fast network detected');
  }

  // Load components first
  logger.info('Starting component loading phase');
  await loadComponents();

  // Initialize UI manager (this will load screens and set up everything)
  logger.info('Initializing UI manager');
  const uiInitStart = performance.now();
  await uiManager.init();
  const uiInitTime = performance.now() - uiInitStart;
  logger.info('UI manager initialized', { initTime: `${uiInitTime.toFixed(2)}ms` });

  // Initialize internationalization
  logger.debug('Initializing internationalization');
  i18n.init();

  // Initialize hardware integrations
  logger.debug('Initializing hardware integrations');
  hardwareManager.init();

  // Adaptive loading for audio and search systems
  logger.info('Starting adaptive loading for audio and search systems');
  let audioPromise, searchPromise;
  if (networkDetector.isSlowConnection()) {
    // On slow networks, lazy load when needed
    logger.info('Slow network: lazy loading audio and search modules');
    audioPromise = import('./modules/audio.js').then(module => {
      console.log('DEBUG: audio module imported, initAudio exists:', typeof module.initAudio);
      if (typeof module.initAudio !== 'function') {
        throw new Error('initAudio is not a function in audio module');
      }
      return module.initAudio();
    }).catch(error => {
      logger.error('Failed to import audio module', error);
      return null;
    });
    searchPromise = import('./modules/search.js').then(module => {
      console.log('DEBUG: search module imported, searchManager exists:', typeof module.searchManager);
      if (!module.searchManager) {
        throw new Error('searchManager is undefined in search module');
      }
      return module.searchManager;
    }).catch(error => {
      logger.error('Failed to import search module', error);
      return null;
    });
  } else {
    // On fast networks, preload immediately
    logger.info('Fast network: preloading audio and search modules');
    audioPromise = import('./modules/audio.js').then(module => {
      console.log('DEBUG: audio module imported, initAudio exists:', typeof module.initAudio);
      if (typeof module.initAudio !== 'function') {
        throw new Error('initAudio is not a function in audio module');
      }
      return module.initAudio();
    }).catch(error => {
      logger.error('Failed to import audio module', error);
      return null;
    });
    searchPromise = import('./modules/search.js').then(module => {
      console.log('DEBUG: search module imported, searchManager exists:', typeof module.searchManager);
      if (!module.searchManager) {
        throw new Error('searchManager is undefined in search module');
      }
      return module.searchManager;
    }).catch(error => {
      logger.error('Failed to import search module', error);
      return null;
    });
    // Start preloading in background
    Promise.all([audioPromise, searchPromise]).catch(error => {
      const logger = container.resolve('logger');
      logger.warn('Preloading failed, will load on demand', error);
    });
  }

  // Load initial data and show appropriate screen
  logger.info('Loading initial data and determining start screen');
  try {
    // Check user states and preferences
    const hasCompletedOnboarding = localStorage.getItem('onboardingComplete');
    const userPreferences = localStorage.getItem('userPreferences');
    // All features are now free - set premium to true
    localStorage.setItem('premiumUser', 'true');
    const isPremiumUser = true;
    const lastScreen = localStorage.getItem('lastScreen');

    logger.debug('User state check', {
      hasCompletedOnboarding: !!hasCompletedOnboarding,
      hasUserPreferences: !!userPreferences,
      isPremiumUser,
      lastScreen
    });

    // Apply user preferences early
    if (userPreferences) {
      const prefs = JSON.parse(userPreferences);
      logger.info('Applying user preferences', { theme: prefs.theme, language: prefs.language });
      if (prefs.theme) {
        document.body.className = `theme-${prefs.theme}`;
      }
      if (prefs.language) {
        // Apply language if supported
        document.documentElement.lang = prefs.language;
      }
    }

    // Determine initial screen based on user state
    let initialScreen = 'home'; // default
    if (!hasCompletedOnboarding) {
      // Show onboarding for new users
      initialScreen = 'onboarding';
      logger.info('New user detected, showing onboarding');
    } else if (isPremiumUser && lastScreen === 'premium-features') {
      // Resume on premium features for premium users
      initialScreen = 'premium-features';
      logger.info('Premium user resuming on premium features');
    } else if (lastScreen && ['home', 'player', 'playlists', 'settings'].includes(lastScreen)) {
      // Resume on last viewed screen for returning users
      initialScreen = lastScreen;
      logger.info('Returning user, resuming on last screen', { lastScreen });
    } else {
      // Default to home screen
      logger.info('Defaulting to home screen');
    }

    logger.info('Showing initial screen', { screen: initialScreen });
    uiManager.showScreen(initialScreen);

    // All features are now free - no premium prompts needed
    logger.info('App initialization completed successfully');

  } catch (error) {
    const logger = container.resolve('logger');
    logger.error('Error initializing app', error, { phase: 'initial-screen-determination' });
    // Fallback to home screen
    logger.info('Falling back to home screen due to initialization error');
    uiManager.showScreen('home');
  }
});
