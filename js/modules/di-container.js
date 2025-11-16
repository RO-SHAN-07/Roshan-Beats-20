/**
 * Simple Dependency Injection Container for Roshan Beats PWA
 * Provides loose coupling and better testability.
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.instances = new Map();
  }

  /**
   * Registers a service with the container.
   * @param {string} name - Service name.
   * @param {Function | object} service - Service class or instance.
   * @param {Array} dependencies - Array of dependency names.
   */
  register(name, service, dependencies = []) {
    this.services.set(name, {
      service,
      dependencies,
      singleton: true,
    });
  }

  /**
   * Registers a factory function.
   * @param {string} name - Factory name.
   * @param {Function} factory - Factory function.
   * @param {Array} dependencies - Array of dependency names.
   */
  registerFactory(name, factory, dependencies = []) {
    this.factories.set(name, {
      factory,
      dependencies,
    });
  }

  /**
   * Registers a singleton instance.
   * @param {string} name - Service name.
   * @param {object} instance - Service instance.
   */
  registerInstance(name, instance) {
    this.instances.set(name, instance);
  }

  /**
   * Resolves a service by name.
   * @param {string} name - Service name.
   * @returns {*} - Resolved service.
   */
  resolve(name) {
    // Check if it's already instantiated
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      const { factory, dependencies } = this.factories.get(name);
      const deps = dependencies.map(dep => this.resolve(dep));
      const instance = factory(...deps);
      return instance;
    }

    // Check if it's a service
    if (this.services.has(name)) {
      const { service, dependencies, singleton } = this.services.get(name);
      const deps = dependencies.map(dep => this.resolve(dep));

      let instance;
      if (typeof service === 'function') {
        instance = new service(...deps);
      } else {
        instance = service;
      }

      if (singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Checks if a service is registered.
   * @param {string} name - Service name.
   * @returns {boolean} - Whether the service is registered.
   */
  has(name) {
    return this.services.has(name) || this.factories.has(name) || this.instances.has(name);
  }

  /**
   * Clears all registered services.
   */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.instances.clear();
  }
}

// Create singleton container instance
export const container = new DIContainer();

// Initialize core services
import { logger } from './logger.js';
import { uiManager } from './ui.js';
import { errorHandler } from './error-handler.js';
import { performanceMonitor } from './performance-monitor.js';

// Register core services
container.registerInstance('logger', logger);
container.registerInstance('uiManager', uiManager);
container.registerInstance('errorHandler', errorHandler);
container.registerInstance('performanceMonitor', performanceMonitor);

// Factory for audio service (needs to be instantiated when needed)
container.registerFactory('audioService', async () => {
  const { initAudio } = await import('./audio.js');
  await initAudio();
  return { initAudio };
}, ['logger']);

// Factory for storage service
container.registerFactory('storageService', async () => {
  const { getSongs, saveSong, createPlaylist } = await import('./storage.js');
  return { getSongs, saveSong, createPlaylist };
}, ['logger']);

// Factory for search service
container.registerFactory('searchService', async () => {
  const { searchManager } = await import('./search.js');
  return searchManager;
}, ['logger']);

// Export container for use in other modules
export default container;
