import './polyfills.js';
import container from './modules/di-container.js';
import networkDetector from './modules/network-detection.js';
import i18n from './modules/i18n.js';
import hardwareManager from './modules/hardware.js';

async function loadComponents() {
    const logger = container.resolve('logger');

    // Load reusable components
    const components = ['nav', 'mini-player', 'modals'];
    for (const component of components) {
        try {
            const response = await fetch(`html/components/${component}.html`);
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            logger.error(`Failed to load component ${component}`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const uiManager = container.resolve('uiManager');
    const performanceMonitor = container.resolve('performanceMonitor');

    // Check feature support and apply graceful degradation
    uiManager.degradeGracefully();

    // Apply adaptive loading based on network conditions
    const networkInfo = networkDetector.getNetworkInfo();
    if (networkDetector.isSlowConnection()) {
        document.body.classList.add('slow-network');
        // On slow networks, show skeleton screens immediately
        uiManager.showSkeletonScreens();
    } else {
        document.body.classList.add('fast-network');
    }

    // Load components first
    await loadComponents();

    // Initialize UI manager (this will load screens and set up everything)
    await uiManager.init();

    // Initialize internationalization
    i18n.init();

    // Initialize hardware integrations
    hardwareManager.init();

    // Adaptive loading for audio and search systems
    let audioPromise, searchPromise;
    if (networkDetector.isSlowConnection()) {
        // On slow networks, lazy load when needed
        audioPromise = import('./modules/audio.js').then(module => module.initAudio());
        searchPromise = import('./modules/search.js').then(module => {
            return module.searchManager;
        });
    } else {
        // On fast networks, preload immediately
        audioPromise = import('./modules/audio.js').then(module => module.initAudio());
        searchPromise = import('./modules/search.js').then(module => {
            return module.searchManager;
        });
        // Start preloading in background
        Promise.all([audioPromise, searchPromise]).catch(error => {
            const logger = container.resolve('logger');
            logger.warn('Preloading failed, will load on demand:', error);
        });
    }

    // Load initial data and show appropriate screen
    try {
        // Check user states and preferences
        const hasCompletedOnboarding = localStorage.getItem('onboardingComplete');
        const userPreferences = localStorage.getItem('userPreferences');
        // All features are now free - set premium to true
        localStorage.setItem('premiumUser', 'true');
        const isPremiumUser = true;
        const lastScreen = localStorage.getItem('lastScreen');

        // Apply user preferences early
        if (userPreferences) {
            const prefs = JSON.parse(userPreferences);
            if (prefs.theme) {
                document.body.className = `theme-${prefs.theme}`;
            }
            if (prefs.language) {
                // Apply language if supported
                document.documentElement.lang = prefs.language;
            }
        }

        // Determine initial screen based on user state
        if (!hasCompletedOnboarding) {
            // Show onboarding for new users
            uiManager.showScreen('onboarding');
        } else if (isPremiumUser && lastScreen === 'premium-features') {
            // Resume on premium features for premium users
            uiManager.showScreen('premium-features');
        } else if (lastScreen && ['home', 'player', 'playlists', 'settings'].includes(lastScreen)) {
            // Resume on last viewed screen for returning users
            uiManager.showScreen(lastScreen);
        } else {
            // Default to home screen
            uiManager.showScreen('home');
        }

        // All features are now free - no premium prompts needed

    } catch (error) {
        const logger = container.resolve('logger');
        logger.error('Error initializing app', error);
        // Fallback to home screen
        uiManager.showScreen('home');
    }
});
