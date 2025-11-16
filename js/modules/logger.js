// Roshan Beats Logger Module
// Provides structured logging with different levels and optional remote logging

import { uiManager } from './ui.js';

class Logger {
    constructor() {
        this.level = this.getLogLevel();
        this.logs = [];
        this.maxLogs = 1000;
        this.remoteEndpoint = null; // For future remote logging
        this.errorCategories = {
            network: ['fetch', 'network', 'connection', 'timeout'],
            database: ['indexeddb', 'storage', 'quota', 'transaction'],
            audio: ['audio', 'playback', 'context', 'media'],
            permission: ['permission', 'access', 'denied'],
            file: ['file', 'format', 'corrupt', 'size'],
            api: ['api', 'service', 'external'],
            serviceWorker: ['serviceworker', 'sync', 'background']
        };
    }

    getLogLevel() {
        const level = localStorage.getItem('logLevel') || 'info';
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        return levels[level] || 2;
    }

    setLogLevel(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        if (levels.includes(level)) {
            localStorage.setItem('logLevel', level);
            this.level = levels.indexOf(level);
        }
    }

    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const formatted = {
            timestamp,
            level,
            message,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Add stack trace for errors
        if (level === 'error' && context.error) {
            formatted.stack = context.error.stack;
        }

        return formatted;
    }

    log(level, message, context = {}) {
        const levelNum = ['error', 'warn', 'info', 'debug'].indexOf(level);

        if (levelNum > this.level) return;

        const formatted = this.formatMessage(level, message, context);

        // Store in memory
        this.logs.push(formatted);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output
        const consoleMethod = level === 'debug' ? 'log' : level;
        console[consoleMethod](`[${formatted.timestamp}] ${level.toUpperCase()}: ${message}`, context);

        // Remote logging (future feature)
        if (this.remoteEndpoint && level === 'error') {
            this.sendRemoteLog(formatted);
        }

        // Emit event for UI logging display
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('log', { detail: formatted }));
        }
    }

    error(message, error = null, context = {}) {
        const errorContext = { ...context };
        if (error) {
            errorContext.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        // Categorize error and show user-friendly message
        const category = this.categorizeError(message, error);
        const userMessage = this.generateUserFriendlyMessage(message, error, category);

        // Log technical details
        this.log('error', message, errorContext);

        // Show user-friendly message if not already handled by specific UI functions
        if (!context.skipUIMessage) {
            this.showUserErrorMessage(userMessage, category, error);
        }

        return { category, userMessage };
    }

    categorizeError(message, error) {
        const text = (message + (error?.message || '')).toLowerCase();

        for (const [category, keywords] of Object.entries(this.errorCategories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }

        return 'general';
    }

    generateUserFriendlyMessage(message, error, category) {
        const messages = {
            network: 'Connection problem. Please check your internet and try again.',
            database: 'Data storage issue. Your changes may not be saved.',
            audio: 'Audio playback problem. Try refreshing or checking your audio settings.',
            permission: 'Permission required. Please allow access in your browser settings.',
            file: 'File problem. Please check the file and try again.',
            api: 'Service temporarily unavailable. Please try again later.',
            serviceWorker: 'Background service issue. Some features may be limited.',
            general: 'Something went wrong. Please try again or refresh the page.'
        };

        return messages[category] || messages.general;
    }

    showUserErrorMessage(message, category, error) {
        // Determine if error should show retry option
        const retryableCategories = ['network', 'api', 'database'];
        const shouldRetry = retryableCategories.includes(category);

        uiManager.showErrorMessage(message, shouldRetry ? () => {
            // Generic retry - in practice, this would need context-specific retry logic
            window.location.reload();
        } : null);
    }

    warn(message, context = {}) {
        this.log('warn', message, context);
    }

    info(message, context = {}) {
        this.log('info', message, context);
    }

    debug(message, context = {}) {
        this.log('debug', message, context);
    }

    async sendRemoteLog(logData) {
        // Placeholder for remote logging service
        try {
            // await fetch(this.remoteEndpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(logData)
            // });
        } catch (error) {
            console.error('Failed to send remote log:', error);
        }
    }

    getLogs(level = null, limit = 100) {
        let filtered = this.logs;
        if (level) {
            filtered = filtered.filter(log => log.level === level);
        }
        return filtered.slice(-limit);
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    // Performance logging
    time(label) {
        console.time(label);
    }

    timeEnd(label) {
        console.timeEnd(label);
    }

    // User action logging
    logUserAction(action, details = {}) {
        this.info(`User action: ${action}`, {
            action,
            ...details,
            timestamp: Date.now()
        });
    }

    // Error boundary logging
    logErrorBoundary(error, errorInfo) {
        this.error('React Error Boundary caught an error', error, {
            errorInfo,
            componentStack: errorInfo.componentStack
        });
    }

    // Performance error tracking
    logPerformanceError(operation, duration, threshold) {
        if (duration > threshold) {
            this.warn(`Performance issue: ${operation} took ${duration}ms`, {
                operation,
                duration,
                threshold,
                type: 'performance'
            });
        }
    }

    // User action error tracking
    logUserActionError(action, error, context = {}) {
        this.error(`User action failed: ${action}`, error, {
            ...context,
            action,
            userAction: true
        });
    }

    // Network error tracking
    logNetworkError(url, error, context = {}) {
        this.error(`Network request failed: ${url}`, error, {
            ...context,
            url,
            type: 'network',
            skipUIMessage: true // Let network-specific UI handlers show messages
        });
    }

    // Database error tracking
    logDatabaseError(operation, error, context = {}) {
        this.error(`Database operation failed: ${operation}`, error, {
            ...context,
            operation,
            type: 'database',
            skipUIMessage: true // Let database-specific UI handlers show messages
        });
    }

    // Get error statistics
    getErrorStats(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const recentErrors = this.logs.filter(log =>
            log.level === 'error' &&
            new Date(log.timestamp).getTime() > cutoff
        );

        const stats = {
            total: recentErrors.length,
            byCategory: {},
            byHour: {}
        };

        recentErrors.forEach(error => {
            const category = this.categorizeError(error.message, error.context?.error);
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

            const hour = new Date(error.timestamp).getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });

        return stats;
    }

    // Export error report
    exportErrorReport(hours = 24) {
        const stats = this.getErrorStats(hours);
        const recentErrors = this.logs
            .filter(log => log.level === 'error')
            .slice(-50); // Last 50 errors

        return {
            generated: new Date().toISOString(),
            period: `${hours} hours`,
            statistics: stats,
            recentErrors: recentErrors.map(error => ({
                timestamp: error.timestamp,
                message: error.message,
                category: this.categorizeError(error.message, error.context?.error),
                context: error.context
            }))
        };
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    logger.error('Uncaught error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason);
});

// Export singleton instance
export const logger = new Logger();

// Export additional utilities
export { Logger };