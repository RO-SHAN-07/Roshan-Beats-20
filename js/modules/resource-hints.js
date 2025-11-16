// Resource Hints Module for Roshan Beats PWA
// Implements preload, prefetch, preconnect, and dns-prefetch for optimal loading

class ResourceHintsManager {
    constructor() {
        this.hints = new Set();
        this.preloaded = new Set();
        this.prefetched = new Set();
    }

    // Preload critical resources
    preloadCritical() {
        const criticalResources = [
            // Fonts
            { href: 'assets/fonts/roboto.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
            { href: 'assets/fonts/material-icons.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },

            // Critical CSS
            { href: 'css/base.css', as: 'style' },
            { href: 'css/components.css', as: 'style' },

            // Critical JS
            { href: 'js/main.js', as: 'script' }
        ];

        criticalResources.forEach(resource => this.addPreloadHint(resource));
    }

    // Prefetch likely next resources
    prefetchNext() {
        const nextResources = [
            // Player screen resources
            { href: 'html/player.html', as: 'document' },
            { href: 'css/animations.css', as: 'style' },

            // Common images
            { href: 'assets/images/default-cover.png', as: 'image' },
            { href: 'assets/icons/play.png', as: 'image' }
        ];

        nextResources.forEach(resource => this.addPrefetchHint(resource));
    }

    // Preconnect to external domains
    preconnectExternal() {
        const externalDomains = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net',
            'https://ws.audioscrobbler.com' // Last.fm API
        ];

        externalDomains.forEach(domain => this.addPreconnectHint(domain));
    }

    // DNS prefetch for additional domains
    dnsPrefetch() {
        const domains = [
            'https://api.example.com', // Placeholder for future APIs
            'https://analytics.example.com' // Placeholder for analytics
        ];

        domains.forEach(domain => this.addDNSPrefetchHint(domain));
    }

    // Add preload hint
    addPreloadHint({ href, as, type, crossorigin }) {
        if (this.preloaded.has(href)) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        if (type) link.type = type;
        if (crossorigin) link.crossOrigin = crossorigin;

        document.head.appendChild(link);
        this.preloaded.add(href);
        this.hints.add(href);
    }

    // Add prefetch hint
    addPrefetchHint({ href, as }) {
        if (this.prefetched.has(href)) return;

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        if (as) link.as = as;

        document.head.appendChild(link);
        this.prefetched.add(href);
        this.hints.add(href);
    }

    // Add preconnect hint
    addPreconnectHint(href) {
        if (this.hints.has(href)) return;

        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        link.crossOrigin = 'anonymous';

        document.head.appendChild(link);
        this.hints.add(href);
    }

    // Add DNS prefetch hint
    addDNSPrefetchHint(href) {
        if (this.hints.has(href)) return;

        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = href;

        document.head.appendChild(link);
        this.hints.add(href);
    }

    // Preload module when needed
    async preloadModule(modulePath) {
        if (this.preloaded.has(modulePath)) return;

        try {
            // Use dynamic import to preload
            await import(modulePath);
            this.preloaded.add(modulePath);
        } catch (error) {
            console.warn(`Failed to preload module: ${modulePath}`, error);
        }
    }

    // Preload audio when likely to be played
    preloadAudio(song) {
        if (!song || !song.src) return;

        // Only preload if not already cached
        if ('caches' in window) {
            caches.open('audio-cache').then(cache => {
                cache.match(song.src).then(response => {
                    if (!response) {
                        // Preload audio file
                        this.addPreloadHint({
                            href: song.src,
                            as: 'audio'
                        });
                    }
                });
            });
        }
    }

    // Initialize all resource hints
    init() {
        // Add critical preloads immediately
        this.preloadCritical();

        // Add preconnects
        this.preconnectExternal();

        // Add DNS prefetch
        this.dnsPrefetch();

        // Add prefetch for likely next resources after a delay
        setTimeout(() => {
            this.prefetchNext();
        }, 2000);
    }

    // Clean up hints (useful for memory management)
    cleanup() {
        // Remove non-critical hints if needed
        const links = document.querySelectorAll('link[rel="prefetch"], link[rel="dns-prefetch"]');
        links.forEach(link => {
            if (!link.href.includes('critical') && !link.href.includes('base')) {
                link.remove();
                this.hints.delete(link.href);
            }
        });
    }
}

// Global instance
export const resourceHints = new ResourceHintsManager();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => resourceHints.init());
} else {
    resourceHints.init();
}