// Event Handling Utilities for Roshan Beats PWA
// Implements debouncing, throttling, and efficient event delegation

// Debounce function - delays execution until after wait time has passed
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(this, args);
    };
}

// Throttle function - limits execution to once per wait period
export function throttle(func, wait) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

// Advanced throttle with leading and trailing options
export function throttleAdvanced(func, wait, options = {}) {
    let timeout, previous = 0;
    const { leading = true, trailing = true } = options;

    return function executedFunction(...args) {
        const now = Date.now();

        if (!leading && !previous) {
            previous = now;
        }

        const remaining = wait - (now - previous);

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            if (leading) {
                func.apply(this, args);
            }
        } else if (!timeout && trailing) {
            timeout = setTimeout(() => {
                previous = leading ? Date.now() : 0;
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

// Event delegation with performance optimizations
export class EventDelegator {
    constructor(rootElement = document) {
        this.rootElement = rootElement;
        this.delegatedEvents = new Map();
        this.touchEvents = new Map();
    }

    // Add delegated event listener
    on(eventType, selector, handler, options = {}) {
        if (!this.delegatedEvents.has(eventType)) {
            this.delegatedEvents.set(eventType, new Map());

            // Use passive listeners for better performance where possible
            const isPassiveSupported = this.supportsPassive();
            const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'wheel', 'scroll'];

            const eventOptions = passiveEvents.includes(eventType) && isPassiveSupported
                ? { passive: true, ...options }
                : options;

            this.rootElement.addEventListener(eventType, this.handleDelegatedEvent.bind(this), eventOptions);
        }

        if (!this.delegatedEvents.get(eventType).has(selector)) {
            this.delegatedEvents.get(eventType).set(selector, []);
        }

        this.delegatedEvents.get(eventType).get(selector).push(handler);
    }

    // Remove delegated event listener
    off(eventType, selector, handler) {
        if (this.delegatedEvents.has(eventType) && this.delegatedEvents.get(eventType).has(selector)) {
            const handlers = this.delegatedEvents.get(eventType).get(selector);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }

            if (handlers.length === 0) {
                this.delegatedEvents.get(eventType).delete(selector);
            }
        }
    }

    // Handle delegated events
    handleDelegatedEvent(event) {
        const eventType = event.type;
        if (!this.delegatedEvents.has(eventType)) return;

        const selectors = this.delegatedEvents.get(eventType);
        let target = event.target;

        // Walk up the DOM tree to find matching elements
        while (target && target !== this.rootElement) {
            for (const [selector, handlers] of selectors) {
                if (target.matches && target.matches(selector)) {
                    // Execute all handlers for this selector
                    handlers.forEach(handler => {
                        try {
                            handler.call(target, event);
                        } catch (error) {
                            console.error('Event handler error:', error);
                        }
                    });

                    // Stop if event should not bubble
                    if (!event.bubbles) break;
                }
            }

            target = target.parentElement;
        }
    }

    // Optimized touch event handling
    onTouch(eventType, selector, handler, options = {}) {
        const touchHandler = this.createTouchHandler(handler, options);
        this.on(eventType, selector, touchHandler, options);
    }

    // Create optimized touch handler
    createTouchHandler(originalHandler, options = {}) {
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let hasMoved = false;

        return function touchEventHandler(event) {
            const touches = event.touches || event.changedTouches;
            if (!touches || touches.length === 0) return;

            const touch = touches[0];
            const currentTime = Date.now();

            switch (event.type) {
                case 'touchstart':
                    touchStartTime = currentTime;
                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    hasMoved = false;
                    break;

                case 'touchmove':
                    const deltaX = Math.abs(touch.clientX - touchStartX);
                    const deltaY = Math.abs(touch.clientY - touchStartY);
                    if (deltaX > 10 || deltaY > 10) {
                        hasMoved = true;
                    }
                    break;

                case 'touchend':
                    const touchDuration = currentTime - touchStartTime;
                    const finalTouch = event.changedTouches[0];
                    const endDeltaX = Math.abs(finalTouch.clientX - touchStartX);
                    const endDeltaY = Math.abs(finalTouch.clientY - touchStartY);

                    // Create enhanced touch event data
                    const touchData = {
                        duration: touchDuration,
                        startX: touchStartX,
                        startY: touchStartY,
                        endX: finalTouch.clientX,
                        endY: finalTouch.clientY,
                        deltaX: endDeltaX,
                        deltaY: endDeltaY,
                        hasMoved,
                        velocity: hasMoved ? Math.sqrt(endDeltaX ** 2 + endDeltaY ** 2) / touchDuration : 0
                    };

                    // Add touch data to event
                    event.touchData = touchData;

                    // Handle tap vs swipe
                    if (!hasMoved && touchDuration < 300) {
                        // This is a tap
                        event.touchType = 'tap';
                    } else if (hasMoved && (endDeltaX > 50 || endDeltaY > 50)) {
                        // This is a swipe
                        event.touchType = 'swipe';
                        event.swipeDirection = this.getSwipeDirection(endDeltaX, endDeltaY, touchStartX, touchStartY, finalTouch.clientX, finalTouch.clientY);
                    }

                    break;
            }

            originalHandler.call(this, event);
        }.bind(this);
    }

    // Determine swipe direction
    getSwipeDirection(deltaX, deltaY, startX, startY, endX, endY) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return endX > startX ? 'right' : 'left';
        } else {
            return endY > startY ? 'down' : 'up';
        }
    }

    // Check for passive event support
    supportsPassive() {
        let supportsPassive = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get: () => supportsPassive = true
            });
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
        } catch (e) {}
        return supportsPassive;
    }

    // Batch DOM updates to reduce layout thrashing
    batchUpdate(updates) {
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    }

    // Cleanup
    destroy() {
        // Remove all event listeners
        for (const [eventType] of this.delegatedEvents) {
            this.rootElement.removeEventListener(eventType, this.handleDelegatedEvent);
        }
        this.delegatedEvents.clear();
        this.touchEvents.clear();
    }
}

// Optimized scroll handler with throttling
export class ScrollOptimizer {
    constructor(element, callback, options = {}) {
        this.element = element;
        this.callback = callback;
        this.options = {
            throttleMs: 16, // ~60fps
            passive: true,
            ...options
        };

        this.lastScrollTop = 0;
        this.ticking = false;

        this.bindEvents();
    }

    bindEvents() {
        this.element.addEventListener('scroll', this.handleScroll.bind(this), {
            passive: this.options.passive
        });
    }

    handleScroll(event) {
        this.lastScrollTop = this.element.scrollTop;

        if (!this.ticking) {
            requestAnimationFrame(() => {
                this.callback(this.lastScrollTop, event);
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    destroy() {
        this.element.removeEventListener('scroll', this.handleScroll);
    }
}

// Resize observer with debouncing
export class ResizeOptimizer {
    constructor(element, callback, options = {}) {
        this.element = element;
        this.callback = callback;
        this.options = {
            debounceMs: 150,
            ...options
        };

        this.debouncedCallback = debounce(callback, this.options.debounceMs);

        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                this.debouncedCallback(entries);
            });
            this.resizeObserver.observe(element);
        } else {
            // Fallback to window resize
            window.addEventListener('resize', this.debouncedCallback, { passive: true });
        }
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        } else {
            window.removeEventListener('resize', this.debouncedCallback);
        }
    }
}

// Global event delegator instance
export const eventDelegator = new EventDelegator();

// Common debounced event handlers
export const debouncedSearch = debounce((query, callback) => {
    callback(query);
}, 300);

export const throttledScroll = throttle((callback) => {
    callback();
}, 16);

export const debouncedResize = debounce((callback) => {
    callback();
}, 150);