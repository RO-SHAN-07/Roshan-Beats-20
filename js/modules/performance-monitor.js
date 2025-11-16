/**
 * Performance monitoring and optimization utilities for Roshan Beats PWA
 * Handles memory management, debouncing, efficient DOM manipulation, and performance metrics
 */

import { logger } from './logger.js';
import { uiManager } from './ui.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.debounceTimers = new WeakMap();
    this.throttleTimers = new WeakMap();
    this.eventListeners = new WeakMap();
    this.intersectionObservers = new Set();
    this.resizeObservers = new Set();
    this.mutationObservers = new Set();
    this.enabled = true;
    this.memoryThreshold = 0.8; // 80% memory usage threshold
    this.setupPerformanceMonitoring();
  }

  /**
   * Sets up performance monitoring and cleanup
   */
  setupPerformanceMonitoring() {
    // Monitor memory usage
    if ('memory' in performance) {
      this.startMemoryMonitoring();
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      this.setupLongTaskMonitoring();
    }

    // Setup periodic cleanup
    this.setupPeriodicCleanup();

    // Monitor page visibility for performance adjustments
    this.setupVisibilityMonitoring();
  }

  /**
   * Starts memory usage monitoring
   */
  startMemoryMonitoring() {
    const checkMemory = () => {
      const memInfo = performance.memory;
      const usedPercent = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;

      if (usedPercent > this.memoryThreshold) {
        logger.warn('High memory usage detected', {
          used: memInfo.usedJSHeapSize,
          limit: memInfo.jsHeapSizeLimit,
          percent: usedPercent
        });

        this.performMemoryCleanup();
        uiManager.showErrorMessage('High memory usage detected. Performing cleanup...', null, false);
      }

      if (this.enabled) {
        setTimeout(checkMemory, 30000); // Check every 30 seconds
      }
    };

    setTimeout(checkMemory, 30000);
  }

  /**
   * Sets up monitoring for long tasks
   */
  setupLongTaskMonitoring() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            logger.warn('Long task detected', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      logger.debug('Long task monitoring not supported', error);
    }
  }

  /**
   * Sets up periodic cleanup of resources
   */
  setupPeriodicCleanup() {
    // Clean up every 5 minutes
    setInterval(() => {
      this.performPeriodicCleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Monitors page visibility for performance adjustments
   */
  setupVisibilityMonitoring() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onPageHidden();
      } else {
        this.onPageVisible();
      }
    });
  }

  /**
   * Called when page becomes hidden
   */
  onPageHidden() {
    // Reduce performance monitoring frequency
    this.enabled = false;

    // Pause non-essential operations
    this.pauseNonEssentialOperations();
  }

  /**
   * Called when page becomes visible
   */
  onPageVisible() {
    // Resume full performance monitoring
    this.enabled = true;

    // Resume operations
    this.resumeOperations();

    // Perform cleanup after returning
    setTimeout(() => {
      this.performMemoryCleanup();
    }, 1000);
  }

  /**
   * Pauses non-essential operations when page is hidden
   */
  pauseNonEssentialOperations() {
    // Pause animations
    document.body.classList.add('performance-saving');

    // Reduce monitoring frequency
    // (Already handled by enabled flag)
  }

  /**
   * Resumes operations when page becomes visible
   */
  resumeOperations() {
    // Resume animations
    document.body.classList.remove('performance-saving');
  }

  /**
   * Performs memory cleanup
   */
  performMemoryCleanup() {
    // Clear cached images not in viewport
    this.clearInvisibleImages();

    // Clean up event listeners
    this.cleanupOrphanedListeners();

    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }

    logger.debug('Memory cleanup performed');
  }

  /**
   * Performs periodic cleanup of resources
   */
  performPeriodicCleanup() {
    // Clean up old cached data
    this.cleanupExpiredCache();

    // Reset metrics
    this.resetMetrics();

    logger.debug('Periodic cleanup performed');
  }

  /**
   * Clears images that are not in viewport to save memory
   */
  clearInvisibleImages() {
    const images = document.querySelectorAll('img[data-src]');
    const viewportHeight = window.innerHeight;

    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      const isVisible = rect.top < viewportHeight && rect.bottom > 0;

      if (!isVisible && img.hasAttribute('loaded')) {
        // Reset to placeholder to free memory
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        img.removeAttribute('loaded');
      }
    });
  }

  /**
   * Cleans up orphaned event listeners
   */
  cleanupOrphanedListeners() {
    // This is a simplified cleanup - in practice, you'd need to track listeners more carefully
    logger.debug('Cleaning up orphaned listeners');
  }

  /**
   * Cleans up expired cached data
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up localStorage items with expiry
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.timestamp && (now - data.timestamp) > expiryTime) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Resets performance metrics
   */
  resetMetrics() {
    // Keep only recent metrics (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const [key, metric] of this.metrics) {
      if (metric.timestamp < oneHourAgo) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * Measures execution time of a function
   * @param {string} name - Name of the operation
   * @param {Function} fn - Function to measure
   * @returns {*} - Result of the function
   */
  async measureExecutionTime(name, fn) {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric(name, duration, true);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, false);
      throw error;
    }
  }

  /**
   * Records a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {boolean} success - Whether the operation succeeded
   */
  recordMetric(name, value, success) {
    const metric = {
      name,
      value,
      success,
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name);
    metrics.push(metric);

    // Keep only last 100 metrics per name
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Log slow operations
    if (value > 100) { // Operations taking more than 100ms
      logger.warn('Slow operation detected', { name, duration: value, success });
    }
  }

  /**
   * Gets performance metrics for analysis
   * @param {string} name - Metric name (optional)
   * @returns {Object} - Performance metrics
   */
  getMetrics(name = null) {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const result = {};
    for (const [key, metrics] of this.metrics) {
      result[key] = metrics;
    }
    return result;
  }

  /**
   * Debounces a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Whether to call immediately
   * @returns {Function} - Debounced function
   */
  debounce(func, wait, immediate = false) {
    const context = this;
    return function(...args) {
      const later = () => {
        context.debounceTimers.delete(func);
        if (!immediate) func.apply(this, args);
      };

      const callNow = immediate && !context.debounceTimers.has(func);

      clearTimeout(context.debounceTimers.get(func));
      context.debounceTimers.set(func, setTimeout(later, wait));

      if (callNow) func.apply(this, args);
    };
  }

  /**
   * Throttles a function call
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} - Throttled function
   */
  throttle(func, limit) {
    const context = this;
    return function(...args) {
      if (!context.throttleTimers.has(func)) {
        func.apply(this, args);
        context.throttleTimers.set(func, setTimeout(() => {
          context.throttleTimers.delete(func);
        }, limit));
      }
    };
  }

  /**
   * Efficiently updates DOM with batched operations
   * @param {Function} updateFn - Function that performs DOM updates
   */
  batchDOMUpdates(updateFn) {
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      // Create a document fragment for batched updates if needed
      updateFn();
    });
  }

  /**
   * Creates an efficient event listener with automatic cleanup
   * @param {Element} element - DOM element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   * @returns {Function} - Cleanup function
   */
  addEfficientListener(element, event, handler, options = {}) {
    if (!element) return () => {};

    // Debounce scroll and resize events by default
    let finalHandler = handler;
    if (event === 'scroll' || event === 'resize') {
      finalHandler = this.debounce(handler, 16); // ~60fps
    }

    element.addEventListener(event, finalHandler, options);

    // Store for cleanup
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Map());
    }
    this.eventListeners.get(element).set(event, finalHandler);

    // Return cleanup function
    return () => {
      element.removeEventListener(event, finalHandler, options);
      const elementListeners = this.eventListeners.get(element);
      if (elementListeners) {
        elementListeners.delete(event);
        if (elementListeners.size === 0) {
          this.eventListeners.delete(element);
        }
      }
    };
  }

  /**
   * Creates an intersection observer with automatic cleanup
   * @param {Element} element - Element to observe
   * @param {Function} callback - Intersection callback
   * @param {Object} options - Intersection observer options
   * @returns {Function} - Cleanup function
   */
  observeIntersection(element, callback, options = {}) {
    if (!element || !('IntersectionObserver' in window)) {
      return () => {};
    }

    const observer = new IntersectionObserver(callback, options);
    observer.observe(element);
    this.intersectionObservers.add(observer);

    return () => {
      observer.unobserve(element);
      this.intersectionObservers.delete(observer);
    };
  }

  /**
   * Creates a resize observer with automatic cleanup
   * @param {Element} element - Element to observe
   * @param {Function} callback - Resize callback
   * @returns {Function} - Cleanup function
   */
  observeResize(element, callback) {
    if (!element || !('ResizeObserver' in window)) {
      return () => {};
    }

    const observer = new ResizeObserver(callback);
    observer.observe(element);
    this.resizeObservers.add(observer);

    return () => {
      observer.unobserve(element);
      this.resizeObservers.delete(observer);
    };
  }

  /**
   * Creates a mutation observer with automatic cleanup
   * @param {Element} element - Element to observe
   * @param {Function} callback - Mutation callback
   * @param {Object} options - Mutation observer options
   * @returns {Function} - Cleanup function
   */
  observeMutations(element, callback, options = {}) {
    if (!element || !('MutationObserver' in window)) {
      return () => {};
    }

    const observer = new MutationObserver(callback);
    observer.observe(element, options);
    this.mutationObservers.add(observer);

    return () => {
      observer.disconnect();
      this.mutationObservers.delete(observer);
    };
  }

  /**
   * Cleans up all observers and listeners
   */
  cleanup() {
    // Clean up observers
    this.intersectionObservers.forEach(observer => observer.disconnect());
    this.resizeObservers.forEach(observer => observer.disconnect());
    this.mutationObservers.forEach(observer => observer.disconnect());

    // Clean up performance observers
    this.observers.forEach(observer => observer.disconnect());

    // Clear collections
    this.intersectionObservers.clear();
    this.resizeObservers.clear();
    this.mutationObservers.clear();
    this.observers.clear();

    // Clear timers
    this.debounceTimers = new WeakMap();
    this.throttleTimers = new WeakMap();

    logger.debug('Performance monitor cleanup completed');
  }

  /**
   * Gets memory usage information
   * @returns {Object} - Memory usage data
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      const mem = performance.memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit,
        percent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  /**
   * Forces garbage collection (if available)
   */
  forceGC() {
    if (window.gc) {
      window.gc();
      logger.debug('Forced garbage collection');
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions for easy access
export const debounce = performanceMonitor.debounce.bind(performanceMonitor);
export const throttle = performanceMonitor.throttle.bind(performanceMonitor);
export const measureExecutionTime = performanceMonitor.measureExecutionTime.bind(performanceMonitor);
export const batchDOMUpdates = performanceMonitor.batchDOMUpdates.bind(performanceMonitor);
export const addEfficientListener = performanceMonitor.addEfficientListener.bind(performanceMonitor);