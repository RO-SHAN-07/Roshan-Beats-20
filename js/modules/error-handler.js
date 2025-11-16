/**
 * Global error handling and recovery system for Roshan Beats PWA
 * Provides comprehensive error boundary, logging, and recovery mechanisms.
 */

import { logger } from './logger.js';
import { uiManager } from './ui.js';

class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.recoveryStrategies = new Map();
    this.errorCounts = new Map();
    this.maxRetries = 3;
    this.setupGlobalHandlers();
    this.setupRecoveryStrategies();
  }

  /**
   * Sets up global error event listeners.
   */
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event);
    });

    // Handle service worker errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'error') {
          this.handleServiceWorkerError(event.data.error);
        }
      });
    }

    // Handle network errors
    window.addEventListener('online', () => {
      this.handleNetworkRecovery();
    });

    window.addEventListener('offline', () => {
      this.handleNetworkError();
    });
  }

  /**
   * Sets up recovery strategies for different error types.
   */
  setupRecoveryStrategies() {
    this.recoveryStrategies.set('network', this.networkRecovery.bind(this));
    this.recoveryStrategies.set('audio', this.audioRecovery.bind(this));
    this.recoveryStrategies.set('storage', this.storageRecovery.bind(this));
    this.recoveryStrategies.set('permission', this.permissionRecovery.bind(this));
    this.recoveryStrategies.set('critical', this.criticalRecovery.bind(this));
  }

  /**
   * Handles unhandled promise rejections.
   * @param {PromiseRejectionEvent} event - The rejection event.
   */
  handleUnhandledRejection(event) {
    logger.error('Unhandled promise rejection', event.reason, {
      promise: event.promise,
      stack: event.reason?.stack,
    });

    // Prevent default browser handling
    event.preventDefault();

    // Attempt recovery based on error type
    const recoveryType = this.classifyError(event.reason);
    this.attemptRecovery(recoveryType, { error: event.reason, type: 'promise' });
  }

  /**
   * Handles global JavaScript errors.
   * @param {ErrorEvent} event - The error event.
   */
  handleGlobalError(event) {
    logger.error('Global JavaScript error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message,
    });

    // Don't show error UI for script loading errors in production
    if (event.filename && event.filename.includes('.js') && !event.error) {
      return;
    }

    const error = {
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    };

    this.handleCriticalError(event.error || new Error(event.message), error);
  }

  /**
   * Handles critical application errors.
   * @param {Error} error - The error object.
   * @param {object} context - Additional error context.
   */
  handleCriticalError(error, context = {}) {
    const errorId = this.generateErrorId(error, context);
    const errorCount = this.errorCounts.get(errorId) || 0;

    this.errorCounts.set(errorId, errorCount + 1);

    logger.error('Critical application error', error, {
      ...context,
      errorId,
      errorCount: errorCount + 1,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Determine if app can continue
    const isRecoverable = this.isErrorRecoverable(error, context);

    if (isRecoverable && errorCount < this.maxRetries) {
      this.attemptRecovery('critical', { error, context, errorId });
    } else {
      this.showCriticalErrorScreen(error, context);
    }
  }

  /**
   * Handles service worker errors.
   * @param {Error} error - The service worker error.
   */
  handleServiceWorkerError(error) {
    logger.error('Service Worker error', error);

    uiManager.showErrorMessage(
      'Background service error. Some features may be limited.',
      () => {
        // Attempt to re-register service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register(new URL('/sw.js', import.meta.url)).catch(regError => {
            logger.error('Failed to re-register service worker', regError);
          });
        }
      },
    );
  }

  /**
   * Handles network connectivity changes.
   */
  handleNetworkError() {
    logger.warn('Network connection lost');
    uiManager.setOfflineMode(true);
  }

  /**
   * Handles network recovery.
   */
  handleNetworkRecovery() {
    logger.info('Network connection restored');
    uiManager.setOfflineMode(false);

    // Process queued operations
    this.processErrorQueue();
  }

  /**
   * Classifies errors by type for appropriate recovery strategies.
   * @param {Error} error - The error to classify.
   * @returns {string} - The error classification.
   */
  classifyError(error) {
    if (!error) {
      return 'unknown';
    }

    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || name.includes('network')) {
      return 'network';
    }

    if (message.includes('audio') || message.includes('media') || name.includes('audio')) {
      return 'audio';
    }

    if (message.includes('storage') || message.includes('quota') || name.includes('storage')) {
      return 'storage';
    }

    if (message.includes('permission') || message.includes('denied') || name.includes('permission')) {
      return 'permission';
    }

    return 'critical';
  }

  /**
   * Determines if an error is recoverable.
   * @param {Error} error - The error object.
   * @param {object} context - Error context.
   * @returns {boolean} - Whether the error is recoverable.
   */
  isErrorRecoverable(error, context) {
    if (!error) {
      return true;
    }

    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /temporary/i,
      /unavailable/i,
      /suspended/i,
      /interrupted/i,
    ];

    const errorString = `${error.message || ''} ${error.name || ''} ${context.filename || ''}`.toLowerCase();

    return recoverablePatterns.some(pattern => pattern.test(errorString));
  }

  /**
   * Attempts to recover from an error using appropriate strategy.
   * @param {string} recoveryType - The type of recovery to attempt.
   * @param {object} data - Recovery context data.
   */
  async attemptRecovery(recoveryType, data = {}) {
    const strategy = this.recoveryStrategies.get(recoveryType);

    if (!strategy) {
      logger.warn(`No recovery strategy for type: ${recoveryType}`);
      return;
    }

    try {
      logger.info(`Attempting recovery: ${recoveryType}`, data);
      await strategy(data);
      logger.info(`Recovery successful: ${recoveryType}`);
    } catch (recoveryError) {
      logger.error(`Recovery failed: ${recoveryType}`, recoveryError);
      this.queueErrorForRetry(recoveryType, data);
    }
  }

  /**
   * Network error recovery strategy.
   * @param {object} data - Recovery context.
   */
  async networkRecovery(data) {
    if (navigator.onLine) {
      // Retry pending network operations
      if (window.processSyncQueue) {
        await window.processSyncQueue();
      }
      uiManager.showSuccessMessage('Connection restored. Syncing data...');
    } else {
      throw new Error('Still offline');
    }
  }

  /**
   * Audio context recovery strategy.
   * @param {object} data - Recovery context.
   */
  async audioRecovery(data) {
    // Reinitialize audio context
    if (window.AudioContext || window.webkitAudioContext) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.audioContext && window.audioContext.state === 'suspended') {
          await window.audioContext.resume();
        } else {
          // Create new context if needed
          window.audioContext = new AudioContext();
        }
        uiManager.showSuccessMessage('Audio system recovered');
      } catch (error) {
        throw new Error('Audio recovery failed');
      }
    }
  }

  /**
   * Storage error recovery strategy.
   * @param {object} data - Recovery context.
   */
  async storageRecovery(data) {
    // Clear corrupted cache and reinitialize storage
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name)),
        );
      }

      // Reinitialize IndexedDB
      if (window.indexedDB) {
        // Force close any existing connections
        // This is a simplified approach - in production you'd want more sophisticated recovery
        logger.info('Storage recovery: clearing corrupted data');
      }

      uiManager.showSuccessMessage('Storage recovered');
    } catch (error) {
      throw new Error('Storage recovery failed');
    }
  }

  /**
   * Permission error recovery strategy.
   * @param {object} data - Recovery context.
   */
  async permissionRecovery(data) {
    // Guide user to grant permissions
    uiManager.showPermissionError(data.permissionType || 'unknown',
      'Please check your browser settings and grant the required permissions.');
  }

  /**
   * Critical error recovery strategy.
   * @param {object} data - Recovery context.
   */
  async criticalRecovery(data) {
    // Try to reinitialize core systems
    try {
      // Reinitialize UI
      if (uiManager && typeof uiManager.adaptUI === 'function') {
        await uiManager.adaptUI();
      }

      // Reinitialize audio if available
      if (window.initAudio && typeof window.initAudio === 'function') {
        await window.initAudio();
      }

      uiManager.showSuccessMessage('Application recovered from error');
    } catch (error) {
      throw new Error('Critical recovery failed');
    }
  }

  /**
   * Queues an error for later retry.
   * @param {string} recoveryType - The recovery type.
   * @param {object} data - Error context data.
   */
  queueErrorForRetry(recoveryType, data) {
    this.errorQueue.push({
      type: recoveryType,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Process queue when conditions improve
    if (navigator.onLine) {
      setTimeout(() => this.processErrorQueue(), 5000);
    }
  }

  /**
   * Processes queued errors for retry.
   */
  async processErrorQueue() {
    const now = Date.now();
    const toProcess = this.errorQueue.filter(item =>
      now - item.timestamp > 30000, // Wait 30 seconds before retry
    );

    for (const item of toProcess) {
      if (item.retryCount < this.maxRetries) {
        item.retryCount++;
        await this.attemptRecovery(item.type, item.data);
      }
    }

    // Remove processed items
    this.errorQueue = this.errorQueue.filter(item => !toProcess.includes(item));
  }

  /**
   * Shows critical error screen when recovery fails.
   * @param {Error} error - The error that caused the critical failure.
   * @param {object} context - Error context.
   */
  showCriticalErrorScreen(error, context) {
    const errorScreen = document.createElement('div');
    errorScreen.className = 'critical-error-screen';
    errorScreen.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1>Something went wrong</h1>
        <p>The application encountered a critical error and cannot continue safely.</p>
        <div class="error-details">
          <strong>Error:</strong> ${error?.message || 'Unknown error'}
          <br><strong>Time:</strong> ${new Date().toLocaleString()}
        </div>
        <div class="error-actions">
          <button id="retry-app">Try Again</button>
          <button id="reset-app-critical">Reset App</button>
          <button id="report-error">Report Issue</button>
        </div>
      </div>
    `;

    document.body.appendChild(errorScreen);

    // Add event listeners
    errorScreen.querySelector('#retry-app').addEventListener('click', () => {
      errorScreen.remove();
      window.location.reload();
    });

    errorScreen.querySelector('#reset-app-critical').addEventListener('click', async () => {
      // Reset app data
      localStorage.clear();
      sessionStorage.clear();
      errorScreen.remove();
      window.location.reload();
    });

    errorScreen.querySelector('#report-error').addEventListener('click', () => {
      this.reportError(error, context);
    });
  }

  /**
   * Reports an error for debugging.
   * @param {Error} error - The error to report.
   * @param {object} context - Error context.
   */
  reportError(error, context) {
    const report = {
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      },
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      logs: logger.getLogs ? logger.getLogs('error', 10) : [],
    };

    // Copy to clipboard or send to service
    const reportText = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(reportText).then(() => {
      uiManager.showSuccessMessage('Error report copied to clipboard. Please send it to support.');
    }).catch(() => {
      console.log('Error Report:', report);
      uiManager.showErrorMessage('Error report logged to console. Please check developer tools.');
    });
  }

  /**
   * Generates a unique error ID for tracking.
   * @param {Error} error - The error object.
   * @param {object} context - Error context.
   * @returns {string} - Unique error identifier.
   */
  generateErrorId(error, context) {
    const components = [
      error?.name || 'Unknown',
      error?.message?.substring(0, 50) || 'No message',
      context?.filename || 'unknown',
      context?.lineno || '0',
    ];
    return btoa(components.join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Logs performance metrics for error analysis.
   * @param {string} operation - The operation being measured.
   * @param {number} duration - Duration in milliseconds.
   * @param {boolean} success - Whether the operation succeeded.
   */
  logPerformanceMetric(operation, duration, success) {
    logger.debug('Performance metric', {
      operation,
      duration,
      success,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      } : null,
    });
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Export error boundary function for components
export function withErrorBoundary(fn, fallbackMessage = 'An error occurred') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handleCriticalError(error, {
        component: fn.name,
        args: args.map(arg => typeof arg === 'object' ? '[object]' : arg),
      });
      uiManager.showErrorMessage(fallbackMessage);
      return null;
    }
  };
}
