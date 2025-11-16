/**
 * Network Detection Utilities
 * Detects network conditions for adaptive loading and caching.
 */

class NetworkDetector {
  constructor() {
    this.networkInfo = {
      effectiveType: '4g', // default
      downlink: 10, // Mbps
      rtt: 50, // ms
      saveData: false,
    };
    this.speedTestResults = null;
    this.init();
  }

  init() {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.updateNetworkInfo(connection);

      connection.addEventListener('change', () => {
        this.updateNetworkInfo(connection);
        this.notifyServiceWorker();
      });
    }

    // Perform initial speed test
    this.performSpeedTest();
  }

  updateNetworkInfo(connection) {
    this.networkInfo = {
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 50,
      saveData: connection.saveData || false,
    };
  }

  async performSpeedTest() {
    try {
      const startTime = Date.now();
      // Download a small image to measure speed
      const response = await fetch('/assets/images/default-cover.png', {
        method: 'GET',
        cache: 'no-cache',
      });
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const contentLength = response.headers.get('content-length') || 10000; // fallback
      const bitsLoaded = contentLength * 8;
      const speedBps = bitsLoaded / duration;
      const speedMbps = speedBps / (1024 * 1024);

      this.speedTestResults = {
        speedMbps,
        duration,
        effectiveType: this.classifyConnection(speedMbps),
      };

      this.notifyServiceWorker();
    } catch (error) {
      console.warn('Speed test failed:', error);
      this.speedTestResults = { speedMbps: 1, effectiveType: 'slow' };
    }
  }

  classifyConnection(speedMbps) {
    if (speedMbps > 5) {
      return 'fast';
    }
    if (speedMbps > 1) {
      return 'medium';
    }
    return 'slow';
  }

  getNetworkInfo() {
    return {
      ...this.networkInfo,
      ...this.speedTestResults,
    };
  }

  isSlowConnection() {
    const info = this.getNetworkInfo();
    return info.effectiveType === 'slow-2g' ||
           info.effectiveType === '2g' ||
           info.effectiveType === 'slow' ||
           info.downlink < 1;
  }

  isSaveDataMode() {
    return this.networkInfo.saveData;
  }

  notifyServiceWorker() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const info = this.getNetworkInfo();
      navigator.serviceWorker.controller.postMessage({
        action: 'network-info',
        info,
      });
    }
  }

  // Adaptive loading helpers
  shouldLoadHighQuality() {
    return !this.isSlowConnection() && !this.isSaveDataMode();
  }

  getImageQuality() {
    if (this.isSlowConnection() || this.isSaveDataMode()) {
      return 'low';
    }
    return 'high';
  }

  getVideoQuality() {
    if (this.isSlowConnection()) {
      return 'low';
    }
    if (this.isSaveDataMode()) {
      return 'medium';
    }
    return 'high';
  }
}

const networkDetector = new NetworkDetector();

export default networkDetector;
