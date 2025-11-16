// Virtual Scrolling Module for Roshan Beats PWA
// Implements efficient rendering of large lists with virtualization

class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 60, // Default item height in pixels
      containerHeight: 400, // Default container height
      bufferSize: 5, // Number of items to render outside visible area
      ...options,
    };

    this.items = [];
    this.scrollTop = 0;
    this.visibleRange = { start: 0, end: 0 };

    this.init();
  }

  init() {
    this.container.style.height = `${this.options.containerHeight}px`;
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    // Create viewport element
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.height = `${this.getTotalHeight()}px`;
    this.container.appendChild(this.viewport);

    this.attachScrollListener();
    this.updateVisibleRange();
  }

  setItems(items) {
    this.items = items;
    this.viewport.style.height = `${this.getTotalHeight()}px`;
    this.updateVisibleRange();
  }

  getTotalHeight() {
    return this.items.length * this.options.itemHeight;
  }

  attachScrollListener() {
    this.container.addEventListener('scroll', (e) => {
      this.scrollTop = e.target.scrollTop;
      this.updateVisibleRange();
    }, { passive: true });
  }

  updateVisibleRange() {
    const start = Math.floor(this.scrollTop / this.options.itemHeight);
    const visibleCount = Math.ceil(this.options.containerHeight / this.options.itemHeight);
    const end = Math.min(start + visibleCount + (this.options.bufferSize * 2), this.items.length);

    const newStart = Math.max(0, start - this.options.bufferSize);
    const newEnd = Math.min(this.items.length, end + this.options.bufferSize);

    if (newStart !== this.visibleRange.start || newEnd !== this.visibleRange.end) {
      this.visibleRange = { start: newStart, end: newEnd };
      this.renderVisibleItems();
    }
  }

  renderVisibleItems() {
    // Clear existing items
    this.viewport.innerHTML = '';

    // Calculate offset for visible items
    const offsetY = this.visibleRange.start * this.options.itemHeight;

    // Create fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
      const item = this.items[i];
      const itemElement = this.options.renderItem(item, i);

      itemElement.style.position = 'absolute';
      itemElement.style.top = `${(i - this.visibleRange.start) * this.options.itemHeight + offsetY}px`;
      itemElement.style.width = '100%';
      itemElement.style.height = `${this.options.itemHeight}px`;

      fragment.appendChild(itemElement);
    }

    this.viewport.appendChild(fragment);
  }

  // Scroll to specific item
  scrollToItem(index) {
    const scrollTop = index * this.options.itemHeight;
    this.container.scrollTop = scrollTop;
  }

  // Get item at specific position
  getItemAtPosition(y) {
    const index = Math.floor((this.scrollTop + y) / this.options.itemHeight);
    return this.items[index];
  }

  // Update item height (useful for dynamic content)
  updateItemHeight(newHeight) {
    this.options.itemHeight = newHeight;
    this.viewport.style.height = `${this.getTotalHeight()}px`;
    this.updateVisibleRange();
  }

  // Refresh visible items (useful after data changes)
  refresh() {
    this.updateVisibleRange();
  }

  // Cleanup
  destroy() {
    this.container.removeEventListener('scroll', this.attachScrollListener);
    this.container.innerHTML = '';
  }
}

// Song list virtual scroller
class SongVirtualScroller extends VirtualScroller {
  constructor(container, options = {}) {
    super(container, {
      itemHeight: 60,
      renderItem: (song, index) => this.renderSongItem(song, index),
      ...options,
    });
  }

  renderSongItem(song, index) {
    const item = document.createElement('div');
    item.className = 'song-list-item virtual-item';
    item.dataset.songId = song.id;
    item.dataset.index = index;

    item.innerHTML = `
            <div class="song-number">${index + 1}</div>
            <img class="song-cover lazy" data-src="${song.cover || 'assets/images/default-cover.png'}" alt="${song.title} cover" loading="lazy">
            <div class="song-info">
                <h3 class="song-title">${song.title}</h3>
                <p class="song-artist">${song.artist}</p>
            </div>
            <div class="song-duration">${this.formatDuration(song.duration)}</div>
            <button class="song-menu-btn" data-song-id="${song.id}" aria-label="Song options">⋯</button>
        `;

    // Add click handler
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.song-menu-btn')) {
        // Import audio module dynamically when needed
        import('./audio.js').then(({ setQueue, play }) => {
          setQueue([song], 0);
          play(song);
        });
      }
    });

    return item;
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Playlist virtual scroller
class PlaylistVirtualScroller extends VirtualScroller {
  constructor(container, options = {}) {
    super(container, {
      itemHeight: 80,
      renderItem: (playlist, index) => this.renderPlaylistItem(playlist, index),
      ...options,
    });
  }

  renderPlaylistItem(playlist, index) {
    const item = document.createElement('div');
    item.className = 'playlist-card virtual-item';
    item.dataset.playlistId = playlist.id;
    item.dataset.index = index;

    item.innerHTML = `
            <div class="playlist-cover" style="background-image: url(${playlist.cover || 'assets/images/default-playlist.png'})"></div>
            <div class="playlist-info">
                <h3 class="playlist-title">${playlist.name}</h3>
                <p class="playlist-meta">${playlist.songs?.length || 0} songs • ${this.formatLastPlayed(playlist.lastPlayed)}</p>
            </div>
            <button class="playlist-menu-btn" data-playlist-id="${playlist.id}" aria-label="Playlist options">⋯</button>
        `;

    // Add click handler
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.playlist-menu-btn')) {
        // Navigate to playlist detail
        if (window.uiManager) {
          window.uiManager.showScreen('playlist-detail', { playlistId: playlist.id });
        }
      }
    });

    return item;
  }

  formatLastPlayed(timestamp) {
    if (!timestamp) {
      return 'Never played';
    }

    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Played today';
    }
    if (days === 1) {
      return 'Played yesterday';
    }
    if (days < 7) {
      return `Played ${days} days ago`;
    }
    if (days < 30) {
      return `Played ${Math.floor(days / 7)} weeks ago`;
    }
    return `Played ${Math.floor(days / 30)} months ago`;
  }
}

// Factory function to create appropriate virtual scroller
export function createVirtualScroller(type, container, options = {}) {
  switch (type) {
  case 'songs':
    return new SongVirtualScroller(container, options);
  case 'playlists':
    return new PlaylistVirtualScroller(container, options);
  default:
    return new VirtualScroller(container, options);
  }
}

// Performance monitoring for virtual scrolling
export class VirtualScrollPerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      scrollEvents: 0,
      itemsRendered: 0,
    };
  }

  recordRenderTime(time) {
    this.metrics.renderTime.push(time);
    if (this.metrics.renderTime.length > 100) {
      this.metrics.renderTime.shift();
    }
  }

  recordScrollEvent() {
    this.metrics.scrollEvents++;
  }

  recordItemsRendered(count) {
    this.metrics.itemsRendered = count;
  }

  getAverageRenderTime() {
    if (this.metrics.renderTime.length === 0) {
      return 0;
    }
    return this.metrics.renderTime.reduce((a, b) => a + b, 0) / this.metrics.renderTime.length;
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageRenderTime: this.getAverageRenderTime(),
    };
  }
}
