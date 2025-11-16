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

    // Monitor optimization effectiveness
    monitorOptimizations() {
        // Monitor virtual scrolling performance
        this.monitorVirtualScrolling();

        // Monitor Web Worker performance
        this.monitorWebWorkers();

        // Monitor memory management
        this.monitorMemoryManagement();

        // Monitor animation performance
        this.monitorAnimations();

        // Monitor caching effectiveness
        this.monitorCaching();

        // Generate optimization report
        setInterval(() => {
            this.generateOptimizationReport();
        }, 60000); // Every minute
    }

    monitorVirtualScrolling() {
        // Monitor virtual scrolling performance
        if (window.virtualScrollerPerfMonitor) {
            const stats = window.virtualScrollerPerfMonitor.getMetrics();
            this.recordMetric('VirtualScroll_RenderTime', stats.averageRenderTime);
            this.recordMetric('VirtualScroll_ItemsRendered', stats.itemsRendered);
        }
    }

    monitorWebWorkers() {
        // Monitor Web Worker performance
        if (window.workerManager) {
            const stats = window.workerManager.getStats();
            this.recordMetric('WebWorkers_Active', stats.activeWorkers);
            this.recordMetric('WebWorkers_Queued', stats.queuedTasks);
        }
    }

    monitorMemoryManagement() {
        // Monitor memory pool usage
        if (window.memoryManager) {
            const stats = window.memoryManager.getMemoryStats();
            Object.entries(stats.pools).forEach(([poolName, poolStats]) => {
                this.recordMetric(`MemoryPool_${poolName}_Active`, poolStats.active);
                this.recordMetric(`MemoryPool_${poolName}_Pooled`, poolStats.pooled);
            });

            if (stats.memory) {
                this.recordMetric('Memory_JSHeapUsed', stats.memory.used);
                this.recordMetric('Memory_JSHeapPressure', stats.memory.pressure ? 1 : 0);
            }
        }
    }

    monitorAnimations() {
        // Monitor animation frame rate
        let frameCount = 0;
        let lastTime = performance.now();

        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                const fps = (frameCount * 1000) / (currentTime - lastTime);
                this.recordMetric('Animation_FPS', fps);
                frameCount = 0;
                lastTime = currentTime;
            }

            if (window.animationEngine?.isRunning) {
                requestAnimationFrame(measureFPS);
            }
        };

        if (window.animationEngine) {
            requestAnimationFrame(measureFPS);
        }
    }

    monitorCaching() {
        // Monitor cache hit rates
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.open(cacheName).then(cache => {
                        // This is a simplified cache monitoring
                        // In production, you'd track cache hits/misses
                        this.recordMetric(`Cache_${cacheName.replace(/[^a-zA-Z0-9]/g, '_')}_Size`, 0); // Placeholder
                    });
                });
            });
        }
    }

    generateOptimizationReport() {
        const report = {
            timestamp: Date.now(),
            optimizations: {
                virtualScrolling: this.getAverageMetric('VirtualScroll_RenderTime'),
                webWorkers: {
                    active: this.getLatestMetric('WebWorkers_Active')?.value || 0,
                    queued: this.getLatestMetric('WebWorkers_Queued')?.value || 0
                },
                memoryManagement: {
                    pools: Object.keys(this.metrics).filter(key => key.startsWith('MemoryPool_')).length,
                    pressure: this.getLatestMetric('Memory_JSHeapPressure')?.value || 0
                },
                animations: this.getAverageMetric('Animation_FPS'),
                caching: Object.keys(this.metrics).filter(key => key.startsWith('Cache_')).length
            },
            recommendations: this.generateOptimizationRecommendations()
        };

        logger.debug('Optimization report generated', report);
        return report;
    }

    generateOptimizationRecommendations() {
        const recommendations = [];

        const avgRenderTime = this.getAverageMetric('VirtualScroll_RenderTime');
        if (avgRenderTime > 16) { // More than one frame at 60fps
            recommendations.push('Virtual scrolling render time is high. Consider reducing buffer size or optimizing render function.');
        }

        const activeWorkers = this.getLatestMetric('WebWorkers_Active')?.value || 0;
        if (activeWorkers > 4) {
            recommendations.push('High number of active Web Workers. Consider reducing concurrency or optimizing worker tasks.');
        }

        const memoryPressure = this.getLatestMetric('Memory_JSHeapPressure')?.value || 0;
        if (memoryPressure > 0) {
            recommendations.push('Memory pressure detected. Consider implementing more aggressive cleanup or reducing object pooling.');
        }

        const fps = this.getAverageMetric('Animation_FPS');
        if (fps && fps < 50) {
            recommendations.push('Low animation frame rate detected. Consider reducing animation complexity or using GPU acceleration.');
        }

        return recommendations;
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

    // Monitor optimization effectiveness
    performanceMonitor.monitorOptimizations();
}