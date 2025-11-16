import { uiManager } from './modules/ui.js';
import { initAudio } from './modules/audio.js';
import { searchManager } from './modules/search.js';

async function loadComponents() {
    // Load reusable components
    const components = ['nav', 'mini-player', 'modals'];
    for (const component of components) {
        try {
            const response = await fetch(`html/components/${component}.html`);
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error(`Failed to load component ${component}:`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check feature support and apply graceful degradation
    uiManager.degradeGracefully();

    // Load components first
    await loadComponents();

    // Initialize audio system
    await initAudio();

    // Initialize UI manager (this will load screens and set up everything)
    await uiManager.init();

    // Load initial data and show appropriate screen
    try {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('onboardingComplete');
        if (!hasCompletedOnboarding) {
            // Show onboarding for new users
            uiManager.showScreen('onboarding');
        } else {
            // Show home screen for returning users
            uiManager.showScreen('home');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        // Fallback to home screen
        uiManager.showScreen('home');
    }
});
