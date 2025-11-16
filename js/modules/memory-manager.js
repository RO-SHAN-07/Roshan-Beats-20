// Memory Management Module for Roshan Beats PWA
// Implements object pooling, garbage collection hints, and memory monitoring

import { logger } from './logger.js';

class ObjectPool {
  constructor(createFunc, resetFunc = null, initialSize = 10) {
    this.createFunc = createFunc;
    this.resetFunc = resetFunc;
    this.pool = [];
    this.active = new Set();

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFunc());
    }
  }

  acquire() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFunc();
    }

    this.active.add(obj);
    return obj;
  }

  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);

      // Reset object if reset function provided
      if (this.resetFunc) {
        this.resetFunc(obj);
      }

      this.pool.push(obj);
    }
  }

  getStats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }

  clear() {
    this.pool = [];
    this.active.clear();
  }
}

// DOM Element pool for frequent DOM operations
class DOMElementPool extends ObjectPool {
  constructor(tagName, className = '', initialSize = 20) {
    super(
      () => {
        const el = document.createElement(tagName);
        if (className) {
          el.className = className;
        }
        return el;
      },
      (el) => {
        // Reset element
        el.innerHTML = '';
        el.className = className;
        el.removeAttribute('style');
        // Remove all event listeners by cloning
        const newEl = el.cloneNode(false);
        el.parentNode?.replaceChild(newEl, el);
        return newEl;
      },
      initialSize,
    );
  }
}

// Audio buffer pool for audio processing
class AudioBufferPool extends ObjectPool {
  constructor(audioContext, initialSize = 5) {
    super(
      () => audioContext.createBuffer(2, audioContext.sampleRate * 1, audioContext.sampleRate), // 1 second stereo buffer
      (buffer) => {
        // Clear buffer data
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const data = buffer.getChannelData(channel);
          data.fill(0);
        }
        return buffer;
      },
      initialSize,
    );
    this.audioContext = audioContext;
  }
}

// Memory monitor and manager
class MemoryManager {
  constructor() {
    this.pools = new Map();
    this.monitors = new Map();
    this.gcThreshold = 50 * 1024 * 1024; // 50MB
    this.lastGC = Date.now();

    this.init();
  }

  init() {
    logger.info('Initializing Memory Manager');

    // Create common object pools
    logger.debug('Creating object pools');
    this.createPool('songCard', () => new DOMElementPool('div', 'song-card'), 30);
    this.createPool('playlistCard', () => new DOMElementPool('div', 'playlist-card'), 20);
    this.createPool('listItem', () => new DOMElementPool('div', 'song-list-item'), 50);

    // Start memory monitoring
    logger.debug('Starting memory monitoring');
    this.startMemoryMonitoring();

    // Setup cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logger.info('Page hidden, performing aggressive cleanup');
        this.aggressiveCleanup();
      } else {
        logger.debug('Page visible again');
      }
    });

    // Periodic cleanup
    setInterval(() => {
      logger.debug('Running periodic cleanup');
      this.periodicCleanup();
    }, 300000); // 5 minutes

    logger.info('Memory Manager initialized successfully');
  }

  createPool(name, poolFactory, initialSize = 10) {
    this.pools.set(name, poolFactory(initialSize));
  }

  getPool(name) {
    return this.pools.get(name);
  }

  acquireFromPool(name) {
    const pool = this.pools.get(name);
    return pool ? pool.acquire() : null;
  }

  releaseToPool(name, obj) {
    const pool = this.pools.get(name);
    if (pool) {
      pool.release(obj);
    }
  }

  // Efficient DOM manipulation with DocumentFragment
  createFragment() {
    return document.createDocumentFragment();
  }

  batchCreateElements(tagName, count, className = '') {
    const fragment = this.createFragment();
    const pool = this.pools.get(tagName + 'Pool') || new DOMElementPool(tagName, className, count);

    for (let i = 0; i < count; i++) {
      const el = pool.acquire();
      fragment.appendChild(el);
    }

    return { fragment, pool };
  }

  // Memory monitoring
  startMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  checkMemoryUsage() {
    if (!performance.memory) {
      return;
    }

    const memInfo = performance.memory;
    const usedPercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;

    logger.debug('Memory usage check', {
      used: memInfo.usedJSHeapSize,
      total: memInfo.totalJSHeapSize,
      limit: memInfo.jsHeapSizeLimit,
      percent: usedPercent.toFixed(1) + '%',
    });

    if (usedPercent > 80) {
      logger.warn('High memory usage detected', { percent: usedPercent.toFixed(1) + '%' });
      this.aggressiveCleanup();
    }

    // Trigger garbage collection hint if available
    if (window.gc && usedPercent > 90) {
      logger.info('Triggering garbage collection due to critical memory usage');
      window.gc();
    }
  }

  // Cleanup strategies
  periodicCleanup() {
    logger.debug('Starting periodic memory cleanup');

    // Clean up unused pooled objects
    for (const [name, pool] of this.pools) {
      const stats = pool.getStats();
      // If pool has too many unused objects, trim it
      if (stats.pooled > stats.active * 2 && stats.pooled > 20) {
        const toRemove = Math.floor(stats.pooled * 0.3);
        const beforeCount = stats.pooled;
        pool.pool.splice(-toRemove);
        const afterCount = pool.getStats().pooled;
        logger.debug('Trimmed pool during periodic cleanup', {
          poolName: name,
          before: beforeCount,
          after: afterCount,
          removed: toRemove,
        });
      }
    }

    // Clean up event listeners on detached elements
    logger.debug('Cleaning up detached elements');
    this.cleanupDetachedElements();

    // Force GC if it's been more than 10 minutes
    if (Date.now() - this.lastGC > 600000 && window.gc) {
      logger.info('Forcing garbage collection during periodic cleanup');
      window.gc();
      this.lastGC = Date.now();
    }

    logger.debug('Periodic cleanup completed');
  }

  aggressiveCleanup() {
    logger.info('Performing aggressive memory cleanup');

    // Clear all pools beyond minimum
    for (const [name, pool] of this.pools) {
      const stats = pool.getStats();
      const beforeCount = stats.pooled;
      if (stats.pooled > 10) {
        pool.pool.splice(10); // Keep only 10 items
        const afterCount = pool.getStats().pooled;
        logger.debug('Trimmed pool', { poolName: name, before: beforeCount, after: afterCount });
      }
    }

    // Clear cached images not in viewport
    logger.debug('Clearing non-visible cached images');
    this.clearNonVisibleImages();

    // Clear unused caches
    logger.debug('Clearing unused caches');
    this.clearUnusedCaches();

    // Force garbage collection
    if (window.gc) {
      logger.info('Forcing garbage collection');
      window.gc();
    }

    logger.info('Aggressive cleanup completed');
  }

  cleanupDetachedElements() {
    // Find and clean up detached elements with event listeners
    const detachedElements = document.querySelectorAll('.pooled-element:not(:visible)');
    detachedElements.forEach(el => {
      if (!document.contains(el)) {
        // Element is detached, clean it up
        el.innerHTML = '';
        el.removeAttribute('style');
      }
    });
  }

  clearNonVisibleImages() {
    const images = document.querySelectorAll('img.lazy.loaded');
    images.forEach(img => {
      if (!this.isElementInViewport(img)) {
        // Reset to placeholder to free memory
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        img.classList.remove('loaded');
      }
    });
  }

  clearUnusedCaches() {
    // Clear old cache entries if cache API is available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }
  }

  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Memory pressure handling
  handleMemoryPressure() {
    if ('memory' in performance) {
      const memInfo = performance.memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        pressure: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) > 0.8,
      };
    }
    return null;
  }

  // Get comprehensive memory stats
  getMemoryStats() {
    const poolStats = {};
    for (const [name, pool] of this.pools) {
      poolStats[name] = pool.getStats();
    }

    return {
      pools: poolStats,
      memory: this.handleMemoryPressure(),
      timestamp: Date.now(),
    };
  }

  // Cleanup on destroy
  destroy() {
    for (const [name, pool] of this.pools) {
      pool.clear();
    }
    this.pools.clear();
    this.monitors.clear();
  }
}

// Optimized DOM manipulation utilities
export class DOMOptimizer {
  constructor() {
    this.memoryManager = new MemoryManager();
  }

  // Batch DOM updates to prevent layout thrashing
  batchUpdate(updates) {
    const fragment = this.memoryManager.createFragment();

    updates.forEach(update => {
      try {
        update(fragment);
      } catch (error) {
        console.error('Batch update error:', error);
      }
    });

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      // Apply all updates at once
      document.body.appendChild(fragment);
    });
  }

  // Efficient list rendering with object pooling
  renderList(container, items, renderItem, itemType = 'listItem') {
    logger.debug('Rendering list with object pooling', { itemCount: items.length, itemType });

    const startTime = performance.now();

    // Clear existing content efficiently
    let clearedCount = 0;
    while (container.firstChild) {
      const child = container.firstChild;
      // Try to return to pool if it's a pooled element
      if (child.classList?.contains('pooled-element')) {
        this.memoryManager.releaseToPool(itemType, child);
      }
      container.removeChild(child);
      clearedCount++;
    }

    if (clearedCount > 0) {
      logger.debug('Cleared existing elements', { clearedCount });
    }

    const fragment = this.memoryManager.createFragment();
    let reusedCount = 0;
    let createdCount = 0;

    items.forEach(item => {
      let element = this.memoryManager.acquireFromPool(itemType);
      if (!element) {
        element = renderItem(item);
        element.classList.add('pooled-element');
        createdCount++;
      } else {
        // Reuse existing element
        this.updateElement(element, item);
        reusedCount++;
      }
      fragment.appendChild(element);
    });

    container.appendChild(fragment);

    const renderTime = performance.now() - startTime;
    logger.info('List rendering completed', {
      itemCount: items.length,
      reusedCount,
      createdCount,
      renderTime: `${renderTime.toFixed(2)}ms`,
    });
  }

  updateElement(element, data) {
    // Update element content without recreating
    // This would be customized based on element type
    element.dataset.id = data.id;
    element.textContent = data.title || data.name || 'Unknown';
  }

  // Efficient style updates
  batchStyleUpdates(elements, styles) {
    requestAnimationFrame(() => {
      elements.forEach((el, index) => {
        Object.assign(el.style, styles[index] || styles);
      });
    });
  }
}

// Global instances
export const memoryManager = new MemoryManager();
export const domOptimizer = new DOMOptimizer();

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
  memoryManager.destroy();
});
