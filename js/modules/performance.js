// Roshan Beats Performance Monitoring Module
// Provides performance audits, metrics collection, and optimization suggestions

import { logger } from './logger.js';

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = [];
        this.isEnabled = localStorage.getItem('performanceMonitoring') !== 'false';
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('performanceMonitoring', 'true');
        logger.info('Performance monitoring enabled');
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('performanceMonitoring', 'false');
        logger.info('Performance monitoring disabled');
    }

    // Core Web Vitals
    measureCoreWebVitals() {
        if (!this.isEnabled) return;

        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordMetric('LCP', lastEntry.startTime);
                    logger.info('LCP measured', { value: lastEntry.startTime });
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.recordMetric('FID', entry.processingStart - entry.startTime);
                        logger.info('FID measured', { value: entry.processingStart - entry.startTime });
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });

                // Cumulative Layout Shift (CLS)
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    this.recordMetric('CLS', clsValue);
                    logger.info('CLS measured', { value: clsValue });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });

            } catch (error) {
                logger.warn('Performance Observer not supported', error);
            }
        }
    }

    // Custom metrics
    startTiming(label) {
        if (!this.isEnabled) return;
        this.metrics[label] = { start: performance.now() };
    }

    endTiming(label) {
        if (!this.isEnabled || !this.metrics[label]) return;

        const duration = performance.now() - this.metrics[label].start;
        this.recordMetric(label, duration);
        logger.debug(`Timing: ${label}`, { duration });

        delete this.metrics[label];
        return duration;
    }

    recordMetric(name, value, unit = 'ms') {
        if (!this.isEnabled) return;

        const metric = {
            name,
            value,
            unit,
            timestamp: Date.now()
        };

        // Store in local metrics
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }
        this.metrics[name].push(metric);

        // Keep only last 100 measurements
        if (this.metrics[name].length > 100) {
            this.metrics[name].shift();
        }

        // Notify observers
        this.notifyObservers(metric);
    }

    // Memory usage
    measureMemoryUsage() {
        if (!this.isEnabled || !performance.memory) return;

        const memory = performance.memory;
        this.recordMetric('JSHeapUsedSize', memory.usedJSHeapSize, 'bytes');
        this.recordMetric('JSHeapTotalSize', memory.totalJSHeapSize, 'bytes');
        this.recordMetric('JSHeapLimit', memory.jsHeapSizeLimit, 'bytes');

        logger.debug('Memory usage measured', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
        });
    }

    // Network monitoring
    monitorNetworkRequests() {
        if (!this.isEnabled) return;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;
                this.recordMetric('NetworkRequest', duration);
                logger.debug('Network request completed', {
                    url: args[0],
                    duration,
                    status: response.status
                });
                return response;
            } catch (error) {
                const duration = performance.now() - start;
                this.recordMetric('NetworkRequestFailed', duration);
                logger.warn('Network request failed', { url: args[0], duration, error });
                throw error;
            }
        };
    }

    // Database performance
    measureDBOperation(operation, startTime) {
        if (!this.isEnabled) return;

        const duration = performance.now() - startTime;
        this.recordMetric(`DB_${operation}`, duration);
        logger.debug(`Database operation: ${operation}`, { duration });
    }

    // Audio performance
    measureAudioOperation(operation, startTime) {
        if (!this.isEnabled) return;

        const duration = performance.now() - startTime;
        this.recordMetric(`Audio_${operation}`, duration);
        logger.debug(`Audio operation: ${operation}`, { duration });
    }

    // Observer pattern for real-time monitoring
    addObserver(callback) {
        this.observers.push(callback);
    }

    removeObserver(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    notifyObservers(metric) {
        this.observers.forEach(callback => {
            try {
                callback(metric);
            } catch (error) {
                logger.error('Observer callback failed', error);
            }
        });
    }

    // Performance audit
    runAudit() {
        if (!this.isEnabled) return null;

        const audit = {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            recommendations: []
        };

        // Analyze metrics and provide recommendations
        const avgLCP = this.getAverageMetric('LCP');
        if (avgLCP > 2500) {
            audit.recommendations.push({
                type: 'LCP',
                severity: 'high',
                message: 'Largest Contentful Paint is too slow. Optimize image loading and reduce render-blocking resources.',
                value: avgLCP
            });
        }

        const avgFID = this.getAverageMetric('FID');
        if (avgFID > 100) {
            audit.recommendations.push({
                type: 'FID',
                severity: 'high',
                message: 'First Input Delay is high. Reduce JavaScript execution time and optimize event handlers.',
                value: avgFID
            });
        }

        const avgCLS = this.getAverageMetric('CLS');
        if (avgCLS > 0.1) {
            audit.recommendations.push({
                type: 'CLS',
                severity: 'medium',
                message: 'Cumulative Layout Shift detected. Ensure stable element positioning.',
                value: avgCLS
            });
        }

        const memoryUsage = this.getLatestMetric('JSHeapUsedSize');
        if (memoryUsage && memoryUsage.value > 50 * 1024 * 1024) { // 50MB
            audit.recommendations.push({
                type: 'Memory',
                severity: 'medium',
                message: 'High memory usage detected. Consider implementing virtual scrolling or pagination.',
                value: memoryUsage.value
            });
        }

        logger.info('Performance audit completed', { recommendationsCount: audit.recommendations.length });
        return audit;
    }

    getAverageMetric(name) {
        const metrics = this.metrics[name];
        if (!metrics || metrics.length === 0) return null;

        const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
        return sum / metrics.length;
    }

    getLatestMetric(name) {
        const metrics = this.metrics[name];
        return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
    }

    // Export metrics for analysis
    exportMetrics() {
        return JSON.stringify({
            metrics: this.metrics,
            audit: this.runAudit()
        }, null, 2);
    }

    // Reset metrics
    resetMetrics() {
        this.metrics = {};
        logger.info('Performance metrics reset');
    }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring
if (performanceMonitor.isEnabled) {
    performanceMonitor.measureCoreWebVitals();
    performanceMonitor.monitorNetworkRequests();

    // Periodic measurements
    setInterval(() => {
        performanceMonitor.measureMemoryUsage();
    }, 30000); // Every 30 seconds
}