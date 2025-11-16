// Web Worker Manager for Roshan Beats PWA
// Manages Web Workers for heavy computations and background tasks

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = [];
    this.maxConcurrentWorkers = navigator.hardwareConcurrency || 4;
    this.activeWorkers = 0;
  }

  // Create and manage search worker
  createSearchWorker() {
    if (this.workers.has('search')) {
      return this.workers.get('search');
    }

    try {
      const worker = new Worker('js/workers/search-worker.js');
      const workerWrapper = new WorkerWrapper('search', worker);

      this.workers.set('search', workerWrapper);
      return workerWrapper;
    } catch (error) {
      console.error('Failed to create search worker:', error);
      // Fallback to main thread processing
      return new FallbackSearchProcessor();
    }
  }

  // Create audio processing worker (for future use)
  createAudioWorker() {
    if (this.workers.has('audio')) {
      return this.workers.get('audio');
    }

    // Placeholder for audio processing worker
    // This could handle audio analysis, effects processing, etc.
    console.log('Audio worker not yet implemented');
    return null;
  }

  // Queue task for execution
  async queueTask(workerType, task, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const taskItem = {
        workerType,
        task,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to queue with priority sorting
      this.taskQueue.push(taskItem);
      this.taskQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      this.processQueue();
    });
  }

  // Process queued tasks
  async processQueue() {
    if (this.activeWorkers >= this.maxConcurrentWorkers || this.taskQueue.length === 0) {
      return;
    }

    const taskItem = this.taskQueue.shift();
    this.activeWorkers++;

    try {
      let worker;
      switch (taskItem.workerType) {
      case 'search':
        worker = this.createSearchWorker();
        break;
      case 'audio':
        worker = this.createAudioWorker();
        break;
      default:
        throw new Error(`Unknown worker type: ${taskItem.workerType}`);
      }

      if (worker) {
        const result = await worker.execute(taskItem.task);
        taskItem.resolve(result);
      } else {
        throw new Error(`Worker ${taskItem.workerType} not available`);
      }
    } catch (error) {
      taskItem.reject(error);
    } finally {
      this.activeWorkers--;
      // Process next task
      setTimeout(() => this.processQueue(), 0);
    }
  }

  // Terminate all workers
  terminateAll() {
    for (const [type, worker] of this.workers) {
      try {
        worker.terminate();
      } catch (error) {
        console.error(`Failed to terminate ${type} worker:`, error);
      }
    }
    this.workers.clear();
    this.taskQueue = [];
    this.activeWorkers = 0;
  }

  // Get worker stats
  getStats() {
    return {
      activeWorkers: this.activeWorkers,
      queuedTasks: this.taskQueue.length,
      maxConcurrent: this.maxConcurrentWorkers,
      workers: Array.from(this.workers.keys()),
    };
  }
}

// Worker wrapper with promise-based API
class WorkerWrapper {
  constructor(type, worker) {
    this.type = type;
    this.worker = worker;
    this.pendingTasks = new Map();
    this.taskId = 0;

    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  execute(task) {
    return new Promise((resolve, reject) => {
      const id = ++this.taskId;
      this.pendingTasks.set(id, { resolve, reject, task });

      this.worker.postMessage({
        id,
        ...task,
      });
    });
  }

  handleMessage(event) {
    const { id, type, data } = event.data;

    if (this.pendingTasks.has(id)) {
      const { resolve, reject } = this.pendingTasks.get(id);
      this.pendingTasks.delete(id);

      if (type === 'ERROR') {
        reject(new Error(data.message));
      } else {
        resolve(data);
      }
    }
  }

  handleError(error) {
    console.error(`${this.type} worker error:`, error);

    // Reject all pending tasks
    for (const [id, { reject }] of this.pendingTasks) {
      reject(new Error(`Worker error: ${error.message}`));
    }
    this.pendingTasks.clear();
  }

  terminate() {
    this.worker.terminate();
  }
}

// Fallback search processor for when Web Workers aren't available
class FallbackSearchProcessor {
  constructor() {
    // Import search logic for fallback
    this.searchIndex = { songs: [] };
  }

  async execute(task) {
    // Simple fallback search implementation
    switch (task.type) {
    case 'BUILD_INDEX':
      this.searchIndex.songs = task.data.songs.map(song => ({
        id: song.id,
        title: song.title || '',
        artist: song.artist || '',
        album: song.album || '',
        genre: song.genre || '',
        searchableText: `${song.title} ${song.artist} ${song.album} ${song.genre}`.toLowerCase(),
      }));
      return { success: true, indexSize: this.searchIndex.songs.length };

    case 'SEARCH':
      const results = this.simpleSearch(task.data.query, task.data.filters);
      return results;

    case 'GET_FILTERS':
      return this.getFilterOptions();

    default:
      return { error: 'Unknown task type' };
    }
  }

  simpleSearch(query, filters = {}) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    const searchTerm = query.toLowerCase();
    const results = [];

    this.searchIndex.songs.forEach(song => {
      let score = 0;

      if (song.searchableText.includes(searchTerm)) {
        score = 1;
      }

      // Apply filters
      let passesFilters = true;
      if (filters.genre && song.genre !== filters.genre) {
        passesFilters = false;
      }
      if (filters.artist && song.artist !== filters.artist) {
        passesFilters = false;
      }
      if (filters.album && song.album !== filters.album) {
        passesFilters = false;
      }

      if (score > 0 && passesFilters) {
        results.push({ ...song, score });
      }
    });

    results.sort((a, b) => b.score - a.score);

    return {
      results: results.slice(0, 50),
      total: results.length,
      query,
      filters,
    };
  }

  getFilterOptions() {
    const artists = new Set();
    const albums = new Set();
    const genres = new Set();

    this.searchIndex.songs.forEach(song => {
      if (song.artist) {
        artists.add(song.artist);
      }
      if (song.album) {
        albums.add(song.album);
      }
      if (song.genre) {
        genres.add(song.genre);
      }
    });

    return {
      artists: Array.from(artists).sort(),
      albums: Array.from(albums).sort(),
      genres: Array.from(genres).sort(),
    };
  }
}

// Debounced task execution to prevent overwhelming workers
function debounceTask(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global worker manager instance
export const workerManager = new WorkerManager();

// Auto-terminate workers on page unload
window.addEventListener('beforeunload', () => {
  workerManager.terminateAll();
});

// Export debounced search function
export const debouncedSearch = debounceTask(
  (query, filters, callback) => {
    workerManager.queueTask('search', {
      type: 'SEARCH',
      data: { query, filters },
    }).then(callback);
  },
  150, // 150ms debounce
);
