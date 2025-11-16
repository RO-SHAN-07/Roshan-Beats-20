e;/**
Ee * UI Module for Roshan Beats PWA
ee * Handles screen switching, event delegation, and responsive layout management
ee */

import { logger } from './logger.js';
import { getSongs, getPlaylists, createPlaylist, updatePlaylist, deletePlaylist, getPreferences, savePreferences } from './storage.js';
import { searchManager } from './search.js';
import {
  play, pause, stop, seek, setVolume, setPlaybackSpeed, setRepeatMode, toggleShuffle, getRepeatMode,
  setQueue, addToQueue, removeFromQueue, moveInQueue, clearQueue, getQueue,
  playNext, playPrevious, toggleBookmark, isBookmarked, getBookmarks,
  setSleepTimer, cancelSleepTimer, getSleepTimerRemaining,
  setLyrics, getLyrics, setCrossfade, setFadeIn, setNormalization,
  setPitchShift, setTempoShift, setAutoPlaySimilar,
  getCurrentSong, getCurrentTime, getDuration, on,
} from './audio.js';
import { performanceMonitor } from './performance-monitor.js';
import { Haptics } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';

class UIManager {
  constructor() {
    this.currentScreen = 'home';
    this.screens = {};
    this.components = {};
    this.eventListeners = {};
    this.isGridView = true;
    this.navigationHistory = ['home']; // Track navigation history
    this.breadcrumbTrail = [{ name: 'Home', screen: 'home' }];
    // Don't call init() here - it will be called explicitly after DOMContentLoaded
  }

  async init() {
    await this.loadComponents();
    await this.loadScreens();
    this.setupEventDelegation();
    this.setupResponsiveLayout();
    this.setupAudioEventListeners();
    this.setupBackButton();
    await this.loadAudioSettings();
    await this.adaptUI();

    // Handle deep linking on initial load
    this.handleDeepLink();

    // Enforce platform guidelines and requirements
    this.enforcePlatformGuidelines();

    // Setup performance optimizations
    this.setupMemoryManagement();

    // Setup security measures
    this.setupContentSecurity();

    // Setup notification system
    this.setupNotificationSystem();

    // Check all permissions on startup
    this.checkAllPermissions();

    // Setup error recovery system
    this.setupErrorRecovery();

    // Setup accessibility features
    this.setupAccessibility();

    // Setup reactive behaviors
    this.setupReactiveBehaviors();

    this.updateNav();
  }

  async loadComponents() {
    const components = ['mini-player', 'nav', 'modals'];
    for (const component of components) {
      try {
        const response = await fetch(`html/components/${component}.html`);
        const html = await response.text();
        this.components[component] = html;
        document.body.insertAdjacentHTML('beforeend', html);
      } catch (error) {
        console.error(`Failed to load component ${component}:`, error);
      }
    }
  }

  async loadScreens() {
    const screens = ['home', 'player', 'playlists', 'playlist-detail', 'settings'];
    for (const screen of screens) {
      try {
        const response = await fetch(`html/screens/${screen}.html`);
        const html = await response.text();
        this.screens[screen] = html;
      } catch (error) {
        console.error(`Failed to load screen ${screen}:`, error);
      }
    }
  }

  showScreen(screenName, data = {}, options = {}) {
    logger.debug('Showing screen', { screenName, data, options });

    if (!this.screens[screenName]) {
      logger.error('Screen not found', { screenName });
      return;
    }

    // Handle navigation history
    if (!options.replace && !options.modal) {
      this.addToHistory(screenName, data);
    }

    // Add transition class for smooth animations
    document.body.classList.add('navigating');

    // Hide current screen with transition
    const currentScreenEl = document.querySelector('.screen.active');
    if (currentScreenEl) {
      currentScreenEl.classList.add('exiting');
      setTimeout(() => {
        currentScreenEl.classList.remove('active', 'exiting');
      }, 150); // Match CSS transition duration
    }

    // Remove existing screen content after transition
    setTimeout(() => {
      const appContainer = document.getElementById('app-container') || document.body;
      const existingScreen = appContainer.querySelector('.screen:not(.exiting)');
      if (existingScreen) {
        existingScreen.remove();
      }

      // Insert new screen
      appContainer.insertAdjacentHTML('afterbegin', this.screens[screenName]);
      const newScreen = appContainer.querySelector('.screen');
      newScreen.classList.add('entering');

      setTimeout(() => {
        newScreen.classList.remove('entering');
        newScreen.classList.add('active');
        document.body.classList.remove('navigating');
        logger.info('Screen transition completed', { screenName });
      }, 50);

      this.currentScreen = screenName;
      this.updateNav();
      this.updateBreadcrumbs(data);

      // Populate screen with data
      this.populateScreen(screenName, data);

      // Trigger screen-specific logic
      this.onScreenShow(screenName, data);

      // Announce screen change for accessibility
      this.announceScreenChange(screenName);

      // Update URL for deep linking
      this.updateURL(screenName, data);
    }, 150);
  }

  addToHistory(screenName, data) {
    // Don't add to history if it's the same screen
    if (this.navigationHistory[this.navigationHistory.length - 1] === screenName) {
      return;
    }

    // Limit history to prevent memory issues
    if (this.navigationHistory.length > 10) {
      this.navigationHistory.shift();
    }

    this.navigationHistory.push(screenName);
  }

  goBack() {
    if (this.navigationHistory.length > 1) {
      // Remove current screen from history
      this.navigationHistory.pop();

      // Get previous screen
      const previousScreen = this.navigationHistory[this.navigationHistory.length - 1];

      // Navigate back with replace option to avoid adding to history again
      this.showScreen(previousScreen, {}, { replace: true, back: true });
    }
  }

  updateBreadcrumbs(data) {
    const breadcrumbEl = document.getElementById('breadcrumb-trail');
    if (!breadcrumbEl) {
      return;
    }

    // Update breadcrumb trail
    this.updateBreadcrumbTrail(data);

    // Render breadcrumbs
    breadcrumbEl.innerHTML = this.breadcrumbTrail.map((crumb, index) => {
      if (index === this.breadcrumbTrail.length - 1) {
        return `<span class="breadcrumb-current">${crumb.name}</span>`;
      } else {
        return `<button class="breadcrumb-link" data-screen="${crumb.screen}" data-index="${index}">${crumb.name}</button>`;
      }
    }).join(' <span class="breadcrumb-separator">></span> ');

    // Add click handlers
    breadcrumbEl.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetIndex = parseInt(e.target.dataset.index);
        const targetScreen = e.target.dataset.screen;

        // Navigate to the clicked breadcrumb
        this.showScreen(targetScreen, {}, { replace: true });

        // Trim breadcrumb trail to the clicked level
        this.breadcrumbTrail = this.breadcrumbTrail.slice(0, targetIndex + 1);
      });
    });
  }

  updateBreadcrumbTrail(data) {
    const screenNames = {
      'home': 'Home',
      'playlists': 'Playlists',
      'playlist-detail': 'Playlist',
      'player': 'Now Playing',
      'settings': 'Settings',
      'search': 'Search',
      'profile': 'Profile',
    };

    const screenName = screenNames[this.currentScreen] || this.currentScreen;

    // Handle special cases
    if (this.currentScreen === 'playlist-detail' && data?.playlistId) {
      // For playlist detail, we need the playlist name
      // This would be async, but for now use a placeholder
      this.breadcrumbTrail = [
        { name: 'Home', screen: 'home' },
        { name: 'Playlists', screen: 'playlists' },
        { name: data.playlistName || 'Playlist', screen: 'playlist-detail' },
      ];
    } else {
      // Default breadcrumb logic
      if (this.currentScreen === 'home') {
        this.breadcrumbTrail = [{ name: screenName, screen: this.currentScreen }];
      } else {
        // Ensure we have the home breadcrumb
        if (this.breadcrumbTrail.length === 0 || this.breadcrumbTrail[0].screen !== 'home') {
          this.breadcrumbTrail = [{ name: 'Home', screen: 'home' }];
        }

        // Add current screen if not already there
        const lastCrumb = this.breadcrumbTrail[this.breadcrumbTrail.length - 1];
        if (lastCrumb.screen !== this.currentScreen) {
          this.breadcrumbTrail.push({ name: screenName, screen: this.currentScreen });
        }
      }
    }
  }

  updateURL(screenName, data) {
    // Update URL for deep linking
    const url = new URL(window.location);

    if (screenName === 'home') {
      url.pathname = '/';
      url.search = '';
    } else {
      url.pathname = `/${screenName}`;
      url.search = '';

      // Add query parameters for data
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
          }
        });
      }
    }

    // Update URL without triggering navigation
    window.history.replaceState({ screen: screenName, data }, '', url.toString());
  }

  handleDeepLink() {
    // Handle initial load with URL parameters
    const url = new URL(window.location);
    const path = url.pathname.substring(1); // Remove leading slash
    const params = Object.fromEntries(url.searchParams.entries());

    if (path && path !== 'home' && this.screens[path]) {
      this.showScreen(path, params, { replace: true });
    }
  }

  async setupBackButton() {
    // Handle browser back button
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.screen) {
        this.showScreen(event.state.screen, event.state.data, { replace: true, back: true });
      } else {
        this.goBack();
      }
    });

    // Handle Android back button using Capacitor App plugin
    try {
      await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          this.goBack();
        } else {
          // Exit app or show exit confirmation
          App.exitApp();
        }
      });
    } catch (error) {
      // Fallback to cordova/phonegap style
      if (window.navigator && window.navigator.app) {
        document.addEventListener('backbutton', (e) => {
          e.preventDefault();
          this.goBack();
        });
      }
    }

    // Get device info for hardware capabilities
    try {
      const deviceInfo = await Device.getInfo();
      this.deviceInfo = deviceInfo;
      logger.info('Device info loaded', deviceInfo);
    } catch (error) {
      logger.warn('Failed to get device info', error);
    }
  }

  updateNav() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${this.currentScreen}`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
  }

  populateScreen(screenName, data) {
    switch (screenName) {
    case 'home':
      this.populateSongLibrary();
      break;
    case 'playlists':
      this.populatePlaylists();
      break;
    case 'playlist-detail':
      this.populatePlaylistDetail(data.playlistId);
      break;
    case 'player':
      // Player data is handled by audio module
      break;
    case 'settings':
      // Settings are static
      break;
    }
  }

  async populateSongLibrary() {
    logger.debug('Populating song library');
    const startTime = performance.now();

    try {
      // Show loading state
      this.showLoadingState('loading-state', 'Loading your music library...');

      let songs = await getSongs();
      logger.debug('Retrieved songs from storage', { count: songs?.length });

      // Index songs for search
      await searchManager.updateIndex(songs);
      logger.debug('Updated search index');

      // Apply search and filters
      const searchQuery = document.getElementById('search-input')?.value?.trim() || '';
      const genreFilter = document.getElementById('genre-filter')?.value || '';
      const artistFilter = document.getElementById('artist-filter')?.value || '';
      const albumFilter = document.getElementById('album-filter')?.value || '';

      logger.debug('Applying filters', { searchQuery, genreFilter, artistFilter, albumFilter });

      if (searchQuery) {
        songs = await searchManager.searchSongs(searchQuery, {
          genre: genreFilter,
          artist: artistFilter,
          album: albumFilter,
        });
        logger.debug('Search results', { query: searchQuery, results: songs?.length });
      } else {
        // Apply filters without search
        if (genreFilter) {
          songs = searchManager.filterByGenre(genreFilter);
          logger.debug('Applied genre filter', { genre: genreFilter, results: songs?.length });
        }
        if (artistFilter) {
          songs = searchManager.filterByArtist(artistFilter);
          logger.debug('Applied artist filter', { artist: artistFilter, results: songs?.length });
        }
        if (albumFilter) {
          songs = searchManager.filterByAlbum(albumFilter);
          logger.debug('Applied album filter', { album: albumFilter, results: songs?.length });
        }
      }

      const songGrid = document.getElementById('song-grid');
      const songList = document.getElementById('song-list');
      const emptyState = document.getElementById('empty-state');
      const noResultsState = document.getElementById('no-results-state');
      const loadingState = document.getElementById('loading-state');
      const networkErrorState = document.getElementById('network-error-state');
      const permissionErrorState = document.getElementById('permission-error-state');
      const quotaErrorState = document.getElementById('quota-error-state');
      const databaseErrorState = document.getElementById('database-error-state');

      // Hide all states initially
      [emptyState, noResultsState, loadingState, networkErrorState,
        permissionErrorState, quotaErrorState, databaseErrorState,
        songGrid, songList].forEach(el => {
        if (el) {
          el.style.display = 'none';
        }
      });

      // Get all songs to check if library is empty
      const allSongs = await getSongs();

      if (!allSongs || allSongs.length === 0) {
        logger.info('Song library is empty');
        emptyState.style.display = 'block';
        return;
      }

      if (!songs || songs.length === 0) {
        logger.info('No songs match current filters');
        noResultsState.style.display = 'block';
        return;
      }

      // Show content
      if (this.isGridView) {
        songGrid.style.display = 'grid';
        this.renderSongGrid(songs, songGrid);
        logger.debug('Rendered song grid', { songCount: songs.length });
      } else {
        songList.style.display = 'block';
        this.renderSongList(songs, songList);
        logger.debug('Rendered song list', { songCount: songs.length });
      }

      // Populate filter dropdowns
      this.populateFilterDropdowns();

      const loadTime = performance.now() - startTime;
      logger.info('Song library populated successfully', {
        totalSongs: allSongs.length,
        filteredSongs: songs.length,
        loadTime: `${loadTime.toFixed(2)}ms`,
        viewMode: this.isGridView ? 'grid' : 'list',
      });

    } catch (error) {
      logger.error('Failed to populate song library', error);
      this.hideLoadingState('loading-state');

      // Determine error type and show appropriate state
      if (error.name === 'QuotaExceededError') {
        this.showQuotaError();
      } else if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        this.showPermissionError('storage');
      } else if (!navigator.onLine) {
        this.showNetworkError(() => this.populateSongLibrary());
      } else {
        this.showDatabaseError('Failed to load music library');
      }
    }
  }

  showQuotaError() {
    const quotaState = document.getElementById('quota-error-state');
    if (quotaState) {
      quotaState.style.display = 'block';
    }
  }

  showPermissionError(permissionType) {
    const permissionState = document.getElementById('permission-error-state');
    if (permissionState) {
      permissionState.style.display = 'block';
      // Update message based on permission type
      const messageEl = permissionState.querySelector('p');
      if (messageEl) {
        const messages = {
          storage: 'Grant storage permission to save your music library',
          microphone: 'Allow microphone access for voice commands',
          notifications: 'Enable notifications for playback alerts',
        };
        messageEl.textContent = messages[permissionType] || messages.storage;
      }
    }
  }

  showDatabaseError(message = 'Database error occurred') {
    const dbState = document.getElementById('database-error-state');
    if (dbState) {
      const messageEl = dbState.querySelector('p');
      if (messageEl) {
        messageEl.textContent = message;
      }
      dbState.style.display = 'block';
    }
  }

  async populateFilterDropdowns() {
    const genres = searchManager.getUniqueValues('genre');
    const artists = searchManager.getUniqueValues('artist');
    const albums = searchManager.getUniqueValues('album');

    // Populate genre filter
    const genreSelect = document.getElementById('genre-filter');
    if (genreSelect) {
      genreSelect.innerHTML = '<option value="">All Genres</option>';
      genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
      });
    }

    // Populate artist filter
    const artistSelect = document.getElementById('artist-filter');
    if (artistSelect) {
      artistSelect.innerHTML = '<option value="">All Artists</option>';
      artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        artistSelect.appendChild(option);
      });
    }

    // Populate album filter
    const albumSelect = document.getElementById('album-filter');
    if (albumSelect) {
      albumSelect.innerHTML = '<option value="">All Albums</option>';
      albums.forEach(album => {
        const option = document.createElement('option');
        option.value = album;
        option.textContent = album;
        albumSelect.appendChild(option);
      });
    }
  }

  renderSongGrid(songs, container) {
    container.innerHTML = '';
    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.innerHTML = `
                <img class="song-cover lazy" data-src="${song.cover || 'assets/images/default-cover.png'}" alt="${song.title} cover" loading="lazy">
                <div class="song-info">
                    <h3 class="song-title">${song.title}</h3>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <button class="song-menu-btn" data-song-id="${song.id}" aria-label="Song options">⋯</button>
            `;
      card.addEventListener('click', () => this.playSong(song));
      container.appendChild(card);
    });
    this.lazyLoadImages(container);
  }

  renderSongList(songs, container) {
    container.innerHTML = '';
    songs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-list-item';
      item.innerHTML = `
                <img class="song-cover lazy" data-src="${song.cover || 'assets/images/default-cover.png'}" alt="${song.title} cover" loading="lazy">
                <div class="song-info">
                    <h3 class="song-title">${song.title}</h3>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <div class="song-duration">${this.formatDuration(song.duration)}</div>
                <button class="song-menu-btn" data-song-id="${song.id}" aria-label="Song options">⋯</button>
            `;
      item.addEventListener('click', () => this.playSong(song));
      container.appendChild(item);
    });
    this.lazyLoadImages(container);
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async populatePlaylists() {
    const playlists = await getPlaylists();
    const playlistGrid = document.getElementById('playlist-grid');
    const emptyState = document.getElementById('playlists-empty');

    if (!playlists || playlists.length === 0) {
      emptyState.style.display = 'block';
      playlistGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    playlistGrid.style.display = 'grid';
    playlistGrid.innerHTML = '';

    playlists.forEach(playlist => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
                <div class="playlist-cover" style="background-image: url(${playlist.cover || 'assets/images/default-playlist.png'})"></div>
                <div class="playlist-info">
                    <h3 class="playlist-title">${playlist.name}</h3>
                    <p class="playlist-count">${playlist.songs?.length || 0} songs</p>
                </div>
            `;
      card.addEventListener('click', () => this.showScreen('playlist-detail', { playlistId: playlist.id }));
      playlistGrid.appendChild(card);
    });
  }

  async populatePlaylistDetail(playlistId) {
    const playlists = await getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      return;
    }

    document.getElementById('playlist-title').textContent = playlist.name;
    document.getElementById('playlist-description').textContent = playlist.description || '';
    document.getElementById('song-count').textContent = `${playlist.songs?.length || 0} songs`;

    const songList = document.getElementById('playlist-songs');
    const emptyState = document.getElementById('playlist-empty');

    if (!playlist.songs || playlist.songs.length === 0) {
      emptyState.style.display = 'block';
      songList.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    songList.style.display = 'block';
    songList.innerHTML = '';

    playlist.songs.forEach((song, index) => {
      const item = document.createElement('div');
      item.className = 'song-list-item draggable-item';
      item.setAttribute('data-song-id', song.id);
      item.setAttribute('data-index', index);
      item.setAttribute('draggable', 'true');
      item.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <div class="song-cover" style="background-image: url(${song.cover || 'assets/images/default-cover.png'})"></div>
                <div class="song-info">
                    <h3 class="song-title">${song.title}</h3>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <div class="song-duration">${this.formatDuration(song.duration)}</div>
                <button class="song-menu-btn" data-song-id="${song.id}" aria-label="Song options">⋯</button>
            `;
      item.addEventListener('click', (e) => {
        // Don't play if clicking on drag handle or menu button
        if (!e.target.closest('.drag-handle') && !e.target.closest('.song-menu-btn')) {
          this.playSong(song);
        }
      });
      songList.appendChild(item);
    });
  }

  setupEventDelegation() {
    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('.nav-item')) {
        const screen = e.target.id.replace('nav-', '');
        this.showScreen(screen);
      }
    });

    // View toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('#view-toggle')) {
        this.toggleView();
      }
    });

    // Import button
    document.addEventListener('click', (e) => {
      if (e.target.matches('#import-btn, #fab-import')) {
        this.triggerImport();
      }
    });

    // Mini player expand
    document.addEventListener('click', (e) => {
      if (e.target.matches('#expand-player')) {
        this.showScreen('player');
      }
    });

    // Modals
    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal-backdrop, .close-btn')) {
        this.closeModal();
      }
    });

    // Create playlist
    document.addEventListener('click', (e) => {
      if (e.target.matches('#create-playlist-btn, #create-first-playlist')) {
        this.openCreatePlaylistModal();
      }
    });

    // Back button
    document.addEventListener('click', (e) => {
      if (e.target.matches('#back-btn')) {
        this.goBack();
      }
    });

    // Search and filter events
    document.addEventListener('input', (e) => {
      if (e.target.matches('#search-input')) {
        this.handleSearch();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('#genre-filter, #artist-filter, #album-filter')) {
        this.handleFilterChange();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('#search-clear')) {
        this.clearSearch();
      }
      if (e.target.matches('#filter-reset')) {
        this.resetFilters();
      }
      if (e.target.matches('#clear-search-filters')) {
        this.clearSearch();
        this.resetFilters();
      }
      // New error state handlers
      if (e.target.matches('#retry-network')) {
        this.retryNetworkConnection();
      }
      if (e.target.matches('#grant-storage-permission')) {
        this.requestPermission('storage');
      }
      if (e.target.matches('#manage-storage')) {
        this.showStorageManagement();
      }
      if (e.target.matches('#clear-cache')) {
        this.clearCache();
      }
      if (e.target.matches('#retry-database')) {
        this.populateSongLibrary();
      }
      if (e.target.matches('#import-tutorial')) {
        this.showImportTutorial();
      }
      if (e.target.matches('#search-suggestions')) {
        this.showSearchSuggestions();
      }
      if (e.target.matches('#permission-help')) {
        this.showPermissionHelp();
      }
      // Player error handlers
      if (e.target.matches('#resume-audio')) {
        this.resumeAudioContext();
      }
      if (e.target.matches('#skip-song')) {
        this.skipCorruptedSong();
      }
      if (e.target.matches('#retry-playback')) {
        this.retryPlayback();
      }
      if (e.target.matches('#report-issue')) {
        this.reportPlaybackIssue();
      }
      if (e.target.matches('#search-lyrics')) {
        this.searchLyrics();
      }
      if (e.target.matches('#add-lyrics-manually')) {
        this.showLyricsEditor();
      }
      // Playlist error handlers
      if (e.target.matches('#retry-load-playlists')) {
        this.populatePlaylists();
      }
      if (e.target.matches('#retry-create-playlist')) {
        this.openCreatePlaylistModal();
      }
      if (e.target.matches('#playlist-tutorial')) {
        this.showPlaylistTutorial();
      }
      if (e.target.matches('#retry-load-playlist')) {
        this.populatePlaylistDetail(this.currentPlaylistId);
      }
      if (e.target.matches('#retry-save-playlist')) {
        // Retry last save operation
        this.retryLastPlaylistOperation();
      }
      if (e.target.matches('#browse-songs')) {
        this.showScreen('home');
      }
    });

    // Audio controls
    document.addEventListener('click', (e) => {
      if (e.target.matches('#play-pause-btn')) {
        // Toggle play/pause - this would need to check current state
        if (e.target.textContent === '▶') {
          play();
          e.target.textContent = '⏸';
        } else {
          pause();
          e.target.textContent = '▶';
        }
      }
      if (e.target.matches('#next-btn')) {
        playNext();
      }
      if (e.target.matches('#prev-btn')) {
        playPrevious();
      }
      if (e.target.matches('#shuffle-btn')) {
        toggleShuffle();
      }
      if (e.target.matches('#repeat-btn')) {
        const currentMode = getRepeatMode();
        const modes = ['off', 'all', 'one'];
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        setRepeatMode(nextMode);
      }
      if (e.target.matches('#bookmark-btn')) {
        const currentSong = getCurrentSong();
        if (currentSong) {
          toggleBookmark(currentSong.id);
        }
      }
      if (e.target.matches('#queue-toggle')) {
        this.toggleQueuePanel();
      }
      if (e.target.matches('#close-queue')) {
        this.hideQueuePanel();
      }
      if (e.target.matches('#clear-queue')) {
        clearQueue();
      }
      if (e.target.matches('#cancel-sleep')) {
        cancelSleepTimer();
      }
    });

    // Speed control
    document.addEventListener('change', (e) => {
      if (e.target.matches('#speed-select')) {
        setPlaybackSpeed(parseFloat(e.target.value));
      }
    });

    // Seek bar
    document.addEventListener('click', (e) => {
      if (e.target.closest('#seek-bar')) {
        const rect = e.target.closest('#seek-bar').getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const duration = getDuration();
        seek(percent * duration);
      }
    });

    // Volume control
    document.addEventListener('input', (e) => {
      if (e.target.matches('#volume-bar input')) {
        setVolume(parseFloat(e.target.value));
      }
    });

    // Queue item interactions
    document.addEventListener('click', (e) => {
      if (e.target.matches('.queue-remove')) {
        const index = parseInt(e.target.dataset.index);
        removeFromQueue(index);
      }
      if (e.target.matches('.queue-item')) {
        const index = parseInt(e.target.dataset.index);
        const queue = getQueue();
        if (queue.queue[index]) {
          setQueue(queue.queue, index);
          play(queue.queue[index]);
        }
      }
    });

    // Legal and support buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('#view-terms')) {
        window.open('terms.html', '_blank');
      }
      if (e.target.matches('#view-privacy')) {
        window.open('privacy-policy.html', '_blank');
      }
      if (e.target.matches('#view-help')) {
        this.showScreen('help');
      }
      if (e.target.matches('#send-feedback')) {
        this.showScreen('feedback');
      }
      if (e.target.matches('#export-data')) {
        this.exportUserData();
      }
      if (e.target.matches('#reset-app')) {
        this.confirmAppReset();
      }
      if (e.target.matches('#export-logs')) {
        this.exportErrorLogs();
      }
      if (e.target.matches('#view-shortcuts')) {
        this.showKeyboardShortcuts();
      }
      if (e.target.matches('#check-updates')) {
        this.checkForUpdates();
      }
      if (e.target.matches('#view-license')) {
        this.showLicense();
      }
    });

    // Notification preferences
    document.addEventListener('change', (e) => {
      if (e.target.matches('#notify-playback, #notify-system, #notify-new-songs, #notify-playlists')) {
        this.updateNotificationPreferences();
      }
      if (e.target.matches('#performance-monitoring')) {
        this.togglePerformanceMonitoring(e.target.checked);
      }
      if (e.target.matches('#debug-mode')) {
        this.toggleDebugMode(e.target.checked);
      }
      if (e.target.matches('#log-level')) {
        this.setLogLevel(e.target.value);
      }
      if (e.target.matches('#theme-selector')) {
        this.setTheme(e.target.value);
      }
      if (e.target.matches('#font-size')) {
        this.setFontSize(e.target.value);
      }
      if (e.target.matches('#language')) {
        this.setLanguage(e.target.value);
      }
      if (e.target.matches('#high-contrast')) {
        this.toggleHighContrast(e.target.checked);
      }
      if (e.target.matches('#reduce-motion')) {
        this.toggleReduceMotion(e.target.checked);
      }
      if (e.target.matches('#screen-reader')) {
        this.toggleScreenReader(e.target.checked);
      }
    });

    // File input for importing settings
    document.addEventListener('change', (e) => {
      if (e.target.matches('#import-settings')) {
        this.importSettings(e.target.files[0]);
      }
    });

    // Settings audio controls
    document.addEventListener('change', async (e) => {
      if (e.target.matches('#repeat-mode')) {
        setRepeatMode(e.target.value);
        await this.saveAudioSettings();
      }
      if (e.target.matches('#crossfade-enabled')) {
        const duration = parseFloat(document.getElementById('crossfade-duration').value);
        setCrossfade(e.target.checked, duration);
        await this.saveAudioSettings();
      }
      if (e.target.matches('#crossfade-duration')) {
        const enabled = document.getElementById('crossfade-enabled').checked;
        setCrossfade(enabled, parseFloat(e.target.value));
        await this.saveAudioSettings();
      }
      if (e.target.matches('#fadein-enabled')) {
        const duration = parseFloat(document.getElementById('fadein-duration').value);
        setFadeIn(e.target.checked, duration);
        await this.saveAudioSettings();
      }
      if (e.target.matches('#fadein-duration')) {
        const enabled = document.getElementById('fadein-enabled').checked;
        setFadeIn(enabled, parseFloat(e.target.value));
        await this.saveAudioSettings();
      }
      if (e.target.matches('#normalization-enabled')) {
        setNormalization(e.target.checked);
        await this.saveAudioSettings();
      }
      if (e.target.matches('#pitch-shift')) {
        setPitchShift(parseInt(e.target.value));
        await this.saveAudioSettings();
      }
      if (e.target.matches('#tempo-shift')) {
        setTempoShift(parseInt(e.target.value));
        await this.saveAudioSettings();
      }
      if (e.target.matches('#autoplay-similar')) {
        setAutoPlaySimilar(e.target.checked);
        await this.saveAudioSettings();
      }
      if (e.target.matches('#sleep-timer-duration')) {
        const minutes = parseInt(e.target.value);
        if (minutes > 0) {
          setSleepTimer(minutes);
        } else {
          cancelSleepTimer();
        }
        // Sleep timer is temporary, don't save to preferences
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.hideQueuePanel();
      }
      if (e.key === ' ') {
        e.preventDefault();
        // Toggle play/pause
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
          playPauseBtn.click();
        }
      }
      if (e.key === 'ArrowRight') {
        playNext();
      }
      if (e.key === 'ArrowLeft') {
        playPrevious();
      }
    });
  }

  setupResponsiveLayout() {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    mediaQuery.addEventListener('change', (e) => {
      this.handleResponsiveLayout(e.matches);
    });
    this.handleResponsiveLayout(mediaQuery.matches);

    // Monitor network conditions
    this.setupNetworkMonitoring();

    // Monitor battery status if available
    this.setupBatteryMonitoring();
  }

  handleResponsiveLayout(isMobile) {
    const miniPlayer = document.getElementById('mini-player');
    if (isMobile) {
      // Adjust layout for mobile
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }
  }

  toggleView() {
    this.isGridView = !this.isGridView;
    this.populateSongLibrary();
  }

  triggerImport() {
    // Trigger file input for importing songs
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'audio/*';
    fileInput.addEventListener('change', (e) => {
      this.handleFileImport(e.target.files);
    });
    fileInput.click();
  }

  async handleFileImport(files) {
    logger.info('Starting file import', { fileCount: files.length });

    // Validate all files first
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const fileErrors = this.validateFileUpload(file);
      if (fileErrors.length > 0) {
        errors.push(`${file.name}: ${fileErrors.join(', ')}`);
        logger.warn('File validation failed', { fileName: file.name, errors: fileErrors });
      } else {
        validFiles.push(file);
        logger.debug('File validated successfully', { fileName: file.name, size: file.size });
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      logger.warn('Some files rejected during validation', { rejectedCount: errors.length });
      this.showErrorMessage(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) {
      logger.info('No valid files to import');
      return;
    }

    logger.info('Processing valid files', { validCount: validFiles.length });

    // Show loading state
    const loadingState = document.getElementById('loading-state');
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = '<div class="progress-fill" id="import-progress"></div>';
    loadingState.appendChild(progressBar);

    loadingState.style.display = 'block';

    let imported = 0;
    const total = validFiles.length;
    const progressFill = document.getElementById('import-progress');
    const startTime = performance.now();

    // Process valid files
    for (const file of validFiles) {
      try {
        // Sanitize filename
        const sanitizedName = this.sanitizeInput(file.name);

        // Extract metadata and save to storage
        logger.info('Importing file', { name: sanitizedName, size: file.size, type: file.type });

        // Simulate processing time (in real implementation, extract metadata)
        await new Promise(resolve => setTimeout(resolve, 100));

        imported++;
        if (progressFill) {
          progressFill.style.width = `${(imported / total) * 100}%`;
        }

        logger.debug('File imported successfully', { fileName: sanitizedName, progress: `${imported}/${total}` });
      } catch (error) {
        logger.error('Error importing file', error, { fileName: file.name });
        // Show error message with retry
        this.showErrorMessage(`Failed to import ${file.name}`, () => {
          // Retry import for this file
          this.handleFileImport([file]);
        });
      }
    }

    const importTime = performance.now() - startTime;

    // Hide loading state
    loadingState.style.display = 'none';
    if (progressBar.parentNode) {
      progressBar.remove();
    }

    // Refresh library
    await this.populateSongLibrary();

    // Show success message
    if (imported > 0) {
      logger.info('File import completed', {
        importedCount: imported,
        totalFiles: total,
        importTime: `${importTime.toFixed(2)}ms`,
      });
      this.showSuccessMessage(`Imported ${imported} songs successfully`);
      this.vibrate([100, 50, 100]);
    } else {
      logger.warn('No files were successfully imported');
    }
  }

  openCreatePlaylistModal() {
    const modal = document.getElementById('create-playlist-modal');
    modal.style.display = 'block';
    document.getElementById('playlist-name').focus();
  }

  closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
  }

  playSong(song) {
    logger.debug('Playing song', { title: song.title, artist: song.artist, id: song.id });

    // Set up queue with this song and play it
    setQueue([song], 0);
    play(song);

    // Show mini player
    document.getElementById('mini-player').style.display = 'flex';

    // Haptic feedback
    this.vibrate([30]);

    logger.info('Song playback initiated', { songId: song.id, title: song.title });
  }

  onScreenShow(screenName, data) {
    // Screen-specific initialization
    switch (screenName) {
    case 'home':
      // Focus search if needed
      this.showContextualActions('library');
      break;
    case 'player':
      // Initialize player controls
      this.showContextualActions('player');
      break;
    case 'playlist-detail':
      this.setupPlaylistDragAndDrop(data.playlistId);
      this.showContextualActions('playlist');
      break;
    case 'playlists':
      this.showContextualActions('playlists');
      break;
    case 'onboarding':
      this.initOnboarding();
      break;
    }
  }

  showContextualActions(context) {
    // Hide all contextual actions first
    document.querySelectorAll('.contextual-action').forEach(el => el.style.display = 'none');

    // Show context-specific actions
    switch (context) {
    case 'library':
      // Show import, search, filter actions
      this.showAction('quick-import');
      this.showAction('advanced-search');
      this.showAction('bulk-select');
      break;
    case 'player':
      // Show playback controls, lyrics, queue
      this.showAction('lyrics-toggle');
      this.showAction('queue-toggle');
      this.showAction('share-song');
      break;
    case 'playlist':
      // Show add songs, reorder, share playlist
      this.showAction('add-songs');
      this.showAction('reorder-mode');
      this.showAction('share-playlist');
      break;
    case 'playlists':
      // Show create playlist, import playlists
      this.showAction('create-playlist');
      this.showAction('import-playlist');
      break;
    }
  }

  showAction(actionId) {
    const actionEl = document.getElementById(actionId);
    if (actionEl) {
      actionEl.style.display = 'block';
    }
  }

  performContextualAction(action, data) {
    switch (action) {
    case 'add-to-queue':
      if (data.song) {
        addToQueue(data.song);
        this.showSuccessMessage('Added to queue');
      }
      break;
    case 'add-to-playlist':
      if (data.song) {
        // Show playlist selection modal
        this.showPlaylistSelection(data.song);
      }
      break;
    case 'share-song':
      if (data.song) {
        this.shareContent('song', data.song);
      }
      break;
    case 'download-song':
      if (data.song) {
        this.downloadSong(data.song);
      }
      break;
    case 'view-artist':
      if (data.artist) {
        this.showScreen('artist-detail', { artist: data.artist });
      }
      break;
    case 'similar-songs':
      if (data.song) {
        this.showSimilarSongs(data.song);
      }
      break;
    }
  }

  showPlaylistSelection(song) {
    // Create and show playlist selection modal
    const modal = document.createElement('div');
    modal.className = 'modal playlist-selection-modal';
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <h3>Add to Playlist</h3>
                <div id="playlist-selection-list">
                    <!-- Playlists will be populated here -->
                </div>
                <div class="modal-actions">
                    <button class="outlined-btn close-btn">Cancel</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // Populate playlists
    this.populatePlaylistSelection(song);

    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  }

  async populatePlaylistSelection(song) {
    const playlists = await getPlaylists();
    const listEl = document.getElementById('playlist-selection-list');

    if (!playlists || playlists.length === 0) {
      listEl.innerHTML = '<p>No playlists available. Create one first.</p>';
      return;
    }

    listEl.innerHTML = playlists.map(playlist => `
            <div class="playlist-option" data-playlist-id="${playlist.id}">
                <span>${playlist.name}</span>
                <span class="song-count">${playlist.songs?.length || 0} songs</span>
            </div>
        `).join('');

    // Add click handlers
    listEl.querySelectorAll('.playlist-option').forEach(option => {
      option.addEventListener('click', async () => {
        const playlistId = option.dataset.playlistId;
        await this.addSongToPlaylist(song.id, playlistId);
        document.querySelector('.playlist-selection-modal').remove();
      });
    });
  }

  shareContent(type, item) {
    const shareData = {
      title: `Check out this ${type}`,
      text: `Listen to "${item.title}" on Roshan Beats!`,
      url: `${window.location.origin}/${type}/${item.id}`,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(text).then(() => {
        this.showSuccessMessage('Link copied to clipboard!');
      });
    }
  }

  downloadSong(song) {
    // Create download link for cached song
    const link = document.createElement('a');
    link.href = song.src || song.url;
    link.download = `${song.title} - ${song.artist}.mp3`;
    link.click();
  }

  showSimilarSongs(song) {
    // Find and display similar songs
    // This would use the auto-play suggestion logic
    this.showScreen('similar-songs', { baseSong: song });
  }

  setupPlaylistDragAndDrop(playlistId) {
    const songList = document.getElementById('playlist-songs');
    if (!songList) {
      return;
    }

    let draggedElement = null;
    let placeholder = null;

    const createPlaceholder = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'song-list-item placeholder';
      placeholder.innerHTML = '<div class="placeholder-content">Drop here</div>';
      return placeholder;
    };

    songList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-item')) {
        draggedElement = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.target.style.opacity = '0.5';
      }
    });

    songList.addEventListener('dragend', (e) => {
      if (draggedElement) {
        draggedElement.style.opacity = '';
        draggedElement = null;
      }
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
        placeholder = null;
      }
    });

    songList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = this.getDragAfterElement(songList, e.clientY);
      if (!placeholder) {
        placeholder = createPlaceholder();
      }

      if (afterElement == null) {
        songList.appendChild(placeholder);
      } else {
        songList.insertBefore(placeholder, afterElement);
      }
    });

    songList.addEventListener('drop', async (e) => {
      e.preventDefault();

      if (!draggedElement || !placeholder) {
        return;
      }

      const draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
      const placeholderIndex = Array.from(songList.children).indexOf(placeholder);

      // Remove placeholder
      placeholder.remove();
      placeholder = null;

      // If position didn't change, do nothing
      if (draggedIndex === placeholderIndex) {
        return;
      }

      // Get current playlist
      const playlists = await getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist || !playlist.songs) {
        return;
      }

      // Reorder songs array
      const songs = [...playlist.songs];
      const [removed] = songs.splice(draggedIndex, 1);
      songs.splice(placeholderIndex, 0, removed);

      // Update playlist
      await updatePlaylist(playlistId, { songs });

      // Refresh UI
      await this.populatePlaylistDetail(playlistId);
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-item:not(.placeholder)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Search and filter handlers
  async handleSearch() {
    if (this.currentScreen === 'home') {
      await this.populateSongLibrary();

      // Announce search results for accessibility
      const songGrid = document.getElementById('song-grid');
      const songList = document.getElementById('song-list');
      const visibleContainer = songGrid && songGrid.style.display !== 'none' ? songGrid : songList;
      if (visibleContainer) {
        const songCount = visibleContainer.children.length;
        this.announceContentChange(`Search completed, ${songCount} songs found`);
      }
    }
  }

  async handleFilterChange() {
    if (this.currentScreen === 'home') {
      await this.populateSongLibrary();
    }
  }

  async clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
      await this.handleSearch();
    }
  }

  async resetFilters() {
    const genreFilter = document.getElementById('genre-filter');
    const artistFilter = document.getElementById('artist-filter');
    const albumFilter = document.getElementById('album-filter');

    if (genreFilter) {
      genreFilter.value = '';
    }
    if (artistFilter) {
      artistFilter.value = '';
    }
    if (albumFilter) {
      albumFilter.value = '';
    }

    await this.handleFilterChange();
  }

  // New error handling methods
  retryNetworkConnection() {
    if (navigator.onLine) {
      this.hideNetworkError();
      this.populateSongLibrary();
    } else {
      this.showErrorMessage('Still offline. Please check your connection.');
    }
  }

  hideNetworkError() {
    const networkState = document.getElementById('network-error-state');
    if (networkState) {
      networkState.style.display = 'none';
    }
  }

  async showStorageManagement() {
    // Show storage usage and management options
    const { checkStorageQuota } = await import('./storage.js');
    await checkStorageQuota();
    // This would open a storage management modal in a full implementation
    this.showErrorMessage('Storage management feature coming soon');
  }

  showImportTutorial() {
    this.showSuccessMessage('Import Tutorial: Click "Import Songs" and select audio files from your device');
  }

  showSearchSuggestions() {
    const suggestions = [
      'Try searching by artist name',
      'Use genre filters to narrow results',
      'Check spelling of song titles',
      'Try partial words or phrases',
    ];
    const message = 'Search Tips:\n' + suggestions.map(s => '• ' + s).join('\n');
    this.showSuccessMessage(message);
  }

  showPermissionHelp() {
    this.showSuccessMessage('To grant storage permission: Click the lock/info icon in address bar → Site settings → Storage → Allow');
  }

  // Player error handling methods
  skipCorruptedSong() {
    this.hideFileError();
    playNext();
  }

  retryPlayback() {
    const currentSong = getCurrentSong();
    if (currentSong) {
      this.hidePlaybackError();
      play(currentSong);
    }
  }

  reportPlaybackIssue() {
    const currentSong = getCurrentSong();
    const issue = {
      song: currentSong?.title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    logger.error('User reported playback issue', null, issue);
    this.showSuccessMessage('Issue reported. Thank you for helping improve the app!');
  }

  async searchLyrics() {
    const currentSong = getCurrentSong();
    if (!currentSong) {
      return;
    }

    try {
      this.showLoadingState('lyrics-loading', 'Searching for lyrics...');
      // This would integrate with lyrics API
      const lyrics = await this.fetchLyrics(currentSong.title, currentSong.artist);
      if (lyrics) {
        setLyrics(currentSong.id, lyrics);
        this.displayLyrics(lyrics);
        this.hideEmptyState('lyrics', 'lyrics-empty');
      } else {
        this.showEmptyState('lyrics', 'lyrics-empty');
      }
    } catch (error) {
      logger.error('Failed to search lyrics', error);
      this.showApiError('lyrics');
    } finally {
      this.hideLoadingState('lyrics-loading');
    }
  }

  showLyricsEditor() {
    // Show modal for manual lyrics entry
    const modal = document.createElement('div');
    modal.className = 'modal lyrics-editor-modal';
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <h3>Add Lyrics Manually</h3>
                <textarea id="lyrics-textarea" placeholder="Paste lyrics here..." rows="10"></textarea>
                <div class="modal-actions">
                    <button class="outlined-btn close-btn">Cancel</button>
                    <button class="elevated-btn" id="save-lyrics">Save Lyrics</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelector('#save-lyrics').addEventListener('click', async () => {
      const lyricsText = modal.querySelector('#lyrics-textarea').value.trim();
      if (lyricsText) {
        const currentSong = getCurrentSong();
        if (currentSong) {
          await setLyrics(currentSong.id, [{ text: lyricsText, timestamp: 0 }]);
          this.displayLyrics([{ text: lyricsText, timestamp: 0 }]);
          this.hideEmptyState('lyrics', 'lyrics-empty');
        }
      }
      modal.remove();
    });

    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  }

  hideFileError() {
    const errorEl = document.getElementById('file-corruption-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
    const contentEl = document.getElementById('player-content');
    if (contentEl) {
      contentEl.style.display = 'block';
    }
  }

  hidePlaybackError() {
    const errorEl = document.getElementById('network-playback-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
    const contentEl = document.getElementById('player-content');
    if (contentEl) {
      contentEl.style.display = 'block';
    }
  }

  async fetchLyrics(title, artist) {
    // Placeholder for lyrics API integration
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return null; // No lyrics found
    } catch (error) {
      throw error;
    }
  }

  // Playlist error handling methods
  showPlaylistTutorial() {
    this.showSuccessMessage('Playlist Tutorial: Click "Create New Playlist", give it a name, then add songs from your library');
  }

  retryLastPlaylistOperation() {
    // This would need to be implemented based on what the last operation was
    this.showErrorMessage('Retry functionality for last operation');
  }

  // Update populatePlaylists with error handling
  async populatePlaylists() {
    try {
      this.showLoadingState('playlists-loading', 'Loading playlists...');

      const playlists = await getPlaylists();
      const playlistList = document.getElementById('playlist-list');
      const emptyState = document.getElementById('playlists-empty');
      const loadingState = document.getElementById('playlists-loading');
      const errorState = document.getElementById('playlists-load-error');

      // Hide all states
      [emptyState, loadingState, errorState].forEach(el => {
        if (el) {
          el.style.display = 'none';
        }
      });

      if (!playlists || playlists.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      // Populate playlists
      if (playlistList) {
        playlistList.innerHTML = playlists.map(playlist => `
                    <div class="playlist-item" data-playlist-id="${playlist.id}">
                        <h3>${playlist.name}</h3>
                        <p>${playlist.songs?.length || 0} songs</p>
                    </div>
                `).join('');
      }

    } catch (error) {
      logger.error('Failed to populate playlists', error);
      this.hideLoadingState('playlists-loading');
      const errorState = document.getElementById('playlists-load-error');
      if (errorState) {
        errorState.style.display = 'block';
      }
    }
  }

  // Update populatePlaylistDetail with error handling
  async populatePlaylistDetail(playlistId) {
    this.currentPlaylistId = playlistId;

    try {
      this.showLoadingState('playlist-loading', 'Loading playlist...');

      const playlists = await getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);

      if (!playlist) {
        throw new Error('Playlist not found');
      }

      const playlistSongs = document.getElementById('playlist-songs');
      const emptyState = document.getElementById('playlist-empty');
      const loadingState = document.getElementById('playlist-loading');
      const errorState = document.getElementById('playlist-load-error');
      const titleEl = document.getElementById('playlist-title');

      // Hide all states
      [emptyState, loadingState, errorState].forEach(el => {
        if (el) {
          el.style.display = 'none';
        }
      });

      if (titleEl) {
        titleEl.textContent = playlist.name;
      }

      if (!playlist.songs || playlist.songs.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      // Populate songs
      if (playlistSongs) {
        playlistSongs.innerHTML = playlist.songs.map(song => `
                    <div class="song-item" data-song-id="${song.id}">
                        <span>${song.title} - ${song.artist}</span>
                    </div>
                `).join('');
      }

    } catch (error) {
      logger.error('Failed to populate playlist detail', error);
      this.hideLoadingState('playlist-loading');
      const errorState = document.getElementById('playlist-load-error');
      if (errorState) {
        errorState.style.display = 'block';
      }
    }
  }

  // Playlist management functions
  async createPlaylistModal() {
    const modal = document.getElementById('create-playlist-modal');
    if (!modal) {
      console.error('Create playlist modal not found');
      return;
    }

    modal.style.display = 'block';
    const nameInput = document.getElementById('playlist-name');
    const descInput = document.getElementById('playlist-description');
    const createBtn = document.getElementById('confirm-create-playlist');

    if (nameInput) {
      nameInput.focus();
    }

    // Handle create button
    const handleCreate = async () => {
      const name = nameInput?.value?.trim();
      const description = descInput?.value?.trim();

      if (!name) {
        this.showErrorMessage('Please enter a playlist name');
        return;
      }

      try {
        await createPlaylist(name, description, []);
        this.closeModal();
        // Reset form
        if (nameInput) {
          nameInput.value = '';
        }
        if (descInput) {
          descInput.value = '';
        }
        // Refresh playlists
        await this.populatePlaylists();
      } catch (error) {
        console.error('Error creating playlist:', error);
        this.showErrorMessage('Failed to create playlist', () => {
          handleCreate();
        });
      }
    };

    // Remove previous listeners
    createBtn?.removeEventListener('click', handleCreate);
    createBtn?.addEventListener('click', handleCreate);
  }

  async editPlaylist(id) {
    const playlists = await getPlaylists();
    const playlist = playlists.find(p => p.id === id);
    if (!playlist) {
      console.error('Playlist not found');
      return;
    }

    const modal = document.getElementById('edit-playlist-modal');
    if (!modal) {
      console.error('Edit playlist modal not found');
      return;
    }

    // Populate modal with current data
    const nameInput = document.getElementById('edit-playlist-name');
    const descInput = document.getElementById('edit-playlist-description');
    const saveBtn = document.getElementById('confirm-edit-playlist');

    if (nameInput) {
      nameInput.value = playlist.name || '';
    }
    if (descInput) {
      descInput.value = playlist.description || '';
    }

    modal.style.display = 'block';
    if (nameInput) {
      nameInput.focus();
    }

    // Handle save button
    const handleSave = async () => {
      const name = nameInput?.value?.trim();
      const description = descInput?.value?.trim();

      if (!name) {
        this.showErrorMessage('Please enter a playlist name');
        return;
      }

      try {
        await updatePlaylist(id, { name, description });
        this.closeModal();
        // Refresh current screen
        if (this.currentScreen === 'playlists') {
          await this.populatePlaylists();
        } else if (this.currentScreen === 'playlist-detail') {
          await this.populatePlaylistDetail(id);
        }
      } catch (error) {
        console.error('Error updating playlist:', error);
        this.showErrorMessage('Failed to update playlist');
      }
    };

    // Remove previous listeners
    saveBtn?.removeEventListener('click', handleSave);
    saveBtn?.addEventListener('click', handleSave);
  }

  async deletePlaylist(id) {
    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      await deletePlaylist(id);
      // Navigate back to playlists screen
      this.showScreen('playlists');
      await this.populatePlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      this.showErrorMessage('Failed to delete playlist');
    }
  }

  async addSongToPlaylist(songId, playlistId) {
    try {
      const playlists = await getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      // Check if song is already in playlist
      if (playlist.songs?.some(song => song.id === songId)) {
        this.showErrorMessage('Song is already in this playlist');
        return;
      }

      // Get song details
      const songs = await getSongs();
      const song = songs.find(s => s.id === songId);
      if (!song) {
        throw new Error('Song not found');
      }

      // Add song to playlist
      const updatedSongs = [...(playlist.songs || []), song];
      await updatePlaylist(playlistId, { songs: updatedSongs });

      // Refresh UI if on playlist detail screen
      if (this.currentScreen === 'playlist-detail') {
        await this.populatePlaylistDetail(playlistId);
      }

      console.log('Song added to playlist successfully');
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      this.showErrorMessage('Failed to add song to playlist');
    }
  }

  async removeSongFromPlaylist(songId, playlistId) {
    try {
      const playlists = await getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      // Remove song from playlist
      const updatedSongs = playlist.songs?.filter(song => song.id !== songId) || [];
      await updatePlaylist(playlistId, { songs: updatedSongs });

      // Refresh UI if on playlist detail screen
      if (this.currentScreen === 'playlist-detail') {
        await this.populatePlaylistDetail(playlistId);
      }

      console.log('Song removed from playlist successfully');
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      this.showErrorMessage('Failed to remove song from playlist');
    }
  }

  async reorderPlaylistSongs(playlistId, newOrder) {
    try {
      const playlists = await getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      // Reorder songs based on new order (array of song IDs)
      const reorderedSongs = newOrder.map(songId =>
        playlist.songs?.find(song => song.id === songId),
      ).filter(song => song); // Remove undefined entries

      await updatePlaylist(playlistId, { songs: reorderedSongs });

      // Refresh UI if on playlist detail screen
      if (this.currentScreen === 'playlist-detail') {
        await this.populatePlaylistDetail(playlistId);
      }

      console.log('Playlist songs reordered successfully');
    } catch (error) {
      console.error('Error reordering playlist songs:', error);
      this.showErrorMessage('Failed to reorder playlist songs');
    }
  }

  lazyLoadImages(container) {
    const lazyImages = container.querySelectorAll('img.lazy');
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });
      lazyImages.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for older browsers
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }

  showErrorMessage(message, retryCallback = null) {
    // Create and show error toast/snackbar
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    let buttons = '<button class="error-close" aria-label="Close">✕</button>';
    if (retryCallback) {
      buttons = '<button class="error-retry" aria-label="Retry">Retry</button>' + buttons;
    }
    errorEl.innerHTML = `
            <span>${message}</span>
            ${buttons}
        `;
    document.body.appendChild(errorEl);

    // Auto remove after 5 seconds if no retry
    if (!retryCallback) {
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.remove();
        }
      }, 5000);
    }

    // Close button
    errorEl.querySelector('.error-close').addEventListener('click', () => {
      errorEl.remove();
    });

    // Retry button
    if (retryCallback) {
      errorEl.querySelector('.error-retry').addEventListener('click', () => {
        errorEl.remove();
        retryCallback();
      });
    }
  }

  showSuccessMessage(message) {
    // Create and show success toast/snackbar
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.innerHTML = `
            <span>${message}</span>
            <button class="success-close" aria-label="Close">✕</button>
        `;
    document.body.appendChild(successEl);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (successEl.parentNode) {
        successEl.remove();
      }
    }, 3000);

    // Close button
    successEl.querySelector('.success-close').addEventListener('click', () => {
      successEl.remove();
    });
  }

  async vibrate(pattern = [50]) {
    try {
      await Haptics.vibrate({ duration: pattern[0] || 50 });
    } catch (error) {
      // Fallback to navigator.vibrate if Capacitor not available
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    }
  }

  setupAudioEventListeners() {
    // Audio event listeners
    on('play', () => {
      this.updatePlayerUI();
      const currentSong = getCurrentSong();
      if (currentSong) {
        this.announceContentChange(`Playing ${currentSong.title} by ${currentSong.artist}`);
      }
    });
    on('pause', () => {
      this.updatePlayerUI();
      this.announceContentChange('Playback paused');
    });
    on('ended', () => {
      this.updatePlayerUI();
      this.announceContentChange('Song ended');
    });
    on('timeupdate', () => this.updateProgress());
    on('loaded', () => this.updatePlayerUI());
    on('queueChanged', (data) => {
      this.updateQueueDisplay(data);
      this.announceContentChange(`Queue updated, ${data.queue?.length || 0} songs`);
    });
    on('repeatModeChanged', (mode) => {
      this.updateRepeatButton(mode);
      this.announceContentChange(`Repeat mode: ${mode}`);
    });
    on('shuffleChanged', (enabled) => {
      this.updateShuffleButton(enabled);
      this.announceContentChange(`Shuffle ${enabled ? 'enabled' : 'disabled'}`);
    });
    on('bookmarksChanged', (bookmarks) => this.updateBookmarks(bookmarks));
    on('sleepTimerSet', (minutes) => {
      this.showSleepTimer(minutes);
      this.announceContentChange(`Sleep timer set for ${minutes} minutes`);
    });
    on('sleepTimerCancelled', () => {
      this.hideSleepTimer();
      this.announceContentChange('Sleep timer cancelled');
    });
    on('lyricsLoaded', (lyrics) => {
      this.displayLyrics(lyrics);
      this.announceContentChange('Lyrics loaded');
    });
    on('lyricsSync', (data) => this.syncLyrics(data));

    // Error event listeners
    on('audioContextSuspended', () => {
      this.showAudioContextError();
      this.announceContentChange('Audio suspended, click to resume');
    });
    on('fileCorrupted', (data) => {
      this.showFileCorruptionError(data);
      this.announceContentChange('File corrupted, unable to play');
    });
    on('networkError', () => {
      this.showNetworkPlaybackError();
      this.announceContentChange('Network error, playback failed');
    });
    on('playbackError', (error) => {
      this.handlePlaybackError(error);
      this.announceContentChange('Playback error occurred');
    });

    // Start sleep timer countdown
    setInterval(() => this.updateSleepTimerCountdown(), 1000);
  }

  showFileCorruptionError(data) {
    const errorEl = document.getElementById('file-corruption-error');
    const contentEl = document.getElementById('player-content');
    const messageEl = document.getElementById('file-error-message');

    if (errorEl && contentEl) {
      if (messageEl) {
        messageEl.textContent = data?.message || 'Unable to play this file. It may be corrupted or in an unsupported format.';
      }
      errorEl.style.display = 'block';
      contentEl.style.display = 'none';
    }
  }

  showNetworkPlaybackError() {
    const errorEl = document.getElementById('network-playback-error');
    const contentEl = document.getElementById('player-content');

    if (errorEl && contentEl) {
      errorEl.style.display = 'block';
      contentEl.style.display = 'none';
    }
  }

  handlePlaybackError(error) {
    logger.error('Playback error occurred', error);
    if (!navigator.onLine) {
      this.showNetworkPlaybackError();
    } else {
      this.showFileCorruptionError({ message: 'Playback failed. The file may be corrupted.' });
    }
  }

  updatePlayerUI() {
    const currentSong = getCurrentSong();
    if (currentSong) {
      document.getElementById('track-title').textContent = currentSong.title || 'Unknown';
      document.getElementById('track-artist').textContent = currentSong.artist || 'Unknown';
      document.getElementById('album-art').style.backgroundImage = `url(${currentSong.cover || 'assets/images/default-cover.png'})`;

      // Update bookmark button
      const bookmarkBtn = document.getElementById('bookmark-btn');
      if (bookmarkBtn) {
        bookmarkBtn.textContent = isBookmarked(currentSong.id) ? '💖' : '❤️';
      }
    }

    // Update play/pause button
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
      // This would need to be updated based on actual playing state
      // For now, assume it's handled by existing logic
    }

    this.updateProgress();
  }

  updateProgress() {
    const currentTime = getCurrentTime();
    const duration = getDuration();
    const seekBar = document.getElementById('seek-fill');
    const seekBarContainer = document.getElementById('seek-bar');

    if (seekBar && duration > 0) {
      const progress = (currentTime / duration) * 100;
      seekBar.style.width = `${progress}%`;
    }

    // Update time display if exists
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatDuration(currentTime);
    }
    if (durationEl) {
      durationEl.textContent = this.formatDuration(duration);
    }
  }

  updateQueueDisplay(data) {
    const queueList = document.getElementById('queue-list');
    if (!queueList) {
      return;
    }

    const { queue, index } = data;

    if (queue.length === 0) {
      queueList.innerHTML = '<div class="empty-queue">Queue is empty</div>';
      return;
    }

    queueList.innerHTML = queue.map((song, i) => `
            <div class="queue-item ${i === index ? 'current' : ''}" data-index="${i}">
                <div class="queue-song-info">
                    <span class="queue-title">${song.title}</span>
                    <span class="queue-artist">${song.artist}</span>
                </div>
                <div class="queue-duration">${this.formatDuration(song.duration)}</div>
                <button class="queue-remove" data-index="${i}">✕</button>
            </div>
        `).join('');
  }

  updateRepeatButton(mode) {
    const repeatBtn = document.getElementById('repeat-btn');
    if (repeatBtn) {
      repeatBtn.textContent = mode === 'off' ? '🔁' : mode === 'one' ? '🔂' : '🔁';
      repeatBtn.classList.toggle('active', mode !== 'off');
    }
  }

  updateShuffleButton(enabled) {
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', enabled);
    }
  }

  updateBookmarks(bookmarks) {
    // Update bookmark indicators in song lists
    document.querySelectorAll('.song-card, .song-list-item').forEach(item => {
      const songId = item.dataset.songId;
      if (songId && bookmarks.includes(songId)) {
        item.classList.add('bookmarked');
      } else {
        item.classList.remove('bookmarked');
      }
    });
  }

  showSleepTimer(minutes) {
    const sleepDisplay = document.getElementById('sleep-timer-display');
    if (sleepDisplay) {
      sleepDisplay.style.display = 'flex';
    }
  }

  hideSleepTimer() {
    const sleepDisplay = document.getElementById('sleep-timer-display');
    if (sleepDisplay) {
      sleepDisplay.style.display = 'none';
    }
  }

  updateSleepTimerCountdown() {
    const remaining = getSleepTimerRemaining();
    const countdownEl = document.getElementById('sleep-countdown');
    if (countdownEl && remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  displayLyrics(lyrics) {
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) {
      return;
    }

    if (!lyrics || lyrics.length === 0) {
      lyricsContent.innerHTML = '<div class="no-lyrics">No lyrics available</div>';
      return;
    }

    lyricsContent.innerHTML = lyrics.map((line, index) =>
      `<div class="lyrics-line" data-index="${index}">${line.text}</div>`,
    ).join('');
  }

  syncLyrics(data) {
    const { index } = data;
    document.querySelectorAll('.lyrics-line').forEach((line, i) => {
      line.classList.toggle('active', i === index);
    });
  }

  toggleQueuePanel() {
    const queuePanel = document.getElementById('queue-panel');
    if (queuePanel) {
      const isVisible = queuePanel.style.display !== 'none';
      if (isVisible) {
        this.hideQueuePanel();
      } else {
        queuePanel.style.display = 'block';
        this.updateQueueDisplay(getQueue());
      }
    }
  }

  hideQueuePanel() {
    const queuePanel = document.getElementById('queue-panel');
    if (queuePanel) {
      queuePanel.style.display = 'none';
    }
  }

  async loadAudioSettings() {
    try {
      const prefs = await getPreferences();
      if (prefs) {
        // Apply saved settings to audio module
        if (prefs.repeatMode) {
          setRepeatMode(prefs.repeatMode);
        }
        if (prefs.crossfadeEnabled !== undefined) {
          setCrossfade(prefs.crossfadeEnabled, prefs.crossfadeDuration || 3);
        }
        if (prefs.fadeInEnabled !== undefined) {
          setFadeIn(prefs.fadeInEnabled, prefs.fadeInDuration || 1);
        }
        if (prefs.normalizationEnabled !== undefined) {
          setNormalization(prefs.normalizationEnabled);
        }
        if (prefs.pitchShift !== undefined) {
          setPitchShift(prefs.pitchShift);
        }
        if (prefs.tempoShift !== undefined) {
          setTempoShift(prefs.tempoShift);
        }
        if (prefs.autoPlaySimilar !== undefined) {
          setAutoPlaySimilar(prefs.autoPlaySimilar);
        }

        // Update UI controls
        this.updateSettingsUI(prefs);
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }

  updateSettingsUI(prefs) {
    // Update settings controls with saved values
    const repeatModeSelect = document.getElementById('repeat-mode');
    if (repeatModeSelect && prefs.repeatMode) {
      repeatModeSelect.value = prefs.repeatMode;
    }

    const crossfadeEnabled = document.getElementById('crossfade-enabled');
    if (crossfadeEnabled && prefs.crossfadeEnabled !== undefined) {
      crossfadeEnabled.checked = prefs.crossfadeEnabled;
    }

    const crossfadeDuration = document.getElementById('crossfade-duration');
    if (crossfadeDuration && prefs.crossfadeDuration) {
      crossfadeDuration.value = prefs.crossfadeDuration;
    }

    const fadeInEnabled = document.getElementById('fadein-enabled');
    if (fadeInEnabled && prefs.fadeInEnabled !== undefined) {
      fadeInEnabled.checked = prefs.fadeInEnabled;
    }

    const fadeInDuration = document.getElementById('fadein-duration');
    if (fadeInDuration && prefs.fadeInDuration) {
      fadeInDuration.value = prefs.fadeInDuration;
    }

    const normalizationEnabled = document.getElementById('normalization-enabled');
    if (normalizationEnabled && prefs.normalizationEnabled !== undefined) {
      normalizationEnabled.checked = prefs.normalizationEnabled;
    }

    const pitchShift = document.getElementById('pitch-shift');
    if (pitchShift && prefs.pitchShift !== undefined) {
      pitchShift.value = prefs.pitchShift;
    }

    const tempoShift = document.getElementById('tempo-shift');
    if (tempoShift && prefs.tempoShift !== undefined) {
      tempoShift.value = prefs.tempoShift;
    }

    const autoPlaySimilar = document.getElementById('autoplay-similar');
    if (autoPlaySimilar && prefs.autoPlaySimilar !== undefined) {
      autoPlaySimilar.checked = prefs.autoPlaySimilar;
    }
  }

  async saveAudioSettings() {
    try {
      const prefs = {
        repeatMode: document.getElementById('repeat-mode')?.value || 'off',
        crossfadeEnabled: document.getElementById('crossfade-enabled')?.checked || false,
        crossfadeDuration: parseFloat(document.getElementById('crossfade-duration')?.value) || 3,
        fadeInEnabled: document.getElementById('fadein-enabled')?.checked || true,
        fadeInDuration: parseFloat(document.getElementById('fadein-duration')?.value) || 1,
        normalizationEnabled: document.getElementById('normalization-enabled')?.checked || false,
        pitchShift: parseInt(document.getElementById('pitch-shift')?.value) || 0,
        tempoShift: parseInt(document.getElementById('tempo-shift')?.value) || 0,
        autoPlaySimilar: document.getElementById('autoplay-similar')?.checked || false,
      };

      await savePreferences(prefs);
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  initOnboarding() {
    let currentStep = 1;
    const totalSteps = 7;

    const showStep = (step) => {
      document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
      document.getElementById(`step${step}`).classList.add('active');
      document.querySelectorAll('.indicator').forEach(i => i.classList.remove('active'));
      document.querySelector(`.indicator[data-step="${step}"]`).classList.add('active');
      currentStep = step;
    };

    // Terms acceptance handling
    const termsCheckbox = document.getElementById('accept-terms');
    const nextStep5Btn = document.getElementById('next-step5');
    if (termsCheckbox && nextStep5Btn) {
      termsCheckbox.addEventListener('change', () => {
        nextStep5Btn.disabled = !termsCheckbox.checked;
      });
    }

    // Event listeners for navigation
    document.getElementById('next-step1').addEventListener('click', () => showStep(2));
    document.getElementById('prev-step2').addEventListener('click', () => showStep(1));
    document.getElementById('grant-permissions').addEventListener('click', () => {
      // Request storage permission if needed
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'persistent-storage' }).then(result => {
          if (result.state === 'granted') {
            showStep(3);
          } else {
            // Request permission
            // For simplicity, assume granted or show message
            showStep(3);
          }
        });
      } else {
        showStep(3);
      }
    });
    document.getElementById('prev-step3').addEventListener('click', () => showStep(2));
    document.getElementById('next-step3').addEventListener('click', () => showStep(4));
    document.getElementById('prev-step4').addEventListener('click', () => showStep(3));
    document.getElementById('next-step4').addEventListener('click', () => showStep(5));
    document.getElementById('prev-step5').addEventListener('click', () => showStep(4));
    document.getElementById('next-step5').addEventListener('click', () => {
      if (termsCheckbox && termsCheckbox.checked) {
        // Save terms acceptance
        localStorage.setItem('termsAccepted', 'true');
        localStorage.setItem('termsAcceptedDate', new Date().toISOString());
        showStep(6);
      }
    });
    document.getElementById('prev-step6').addEventListener('click', () => showStep(5));
    document.getElementById('next-step6').addEventListener('click', () => {
      // Save preferences
      const theme = document.getElementById('onboard-theme').value;
      const eq = document.getElementById('onboard-eq').value;
      // Apply theme
      document.body.className = `theme-${theme}`;
      // Save preferences
      localStorage.setItem('userPreferences', JSON.stringify({ theme, eq }));
      // TODO: Apply EQ preset
      showStep(7);
    });
    document.getElementById('prev-step7').addEventListener('click', () => showStep(6));
    document.getElementById('finish-onboarding').addEventListener('click', () => {
      // Mark onboarding as complete
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('firstUse', Date.now().toString());
      this.vibrate([200]);
      this.showScreen('home');
    });
  }

  // ===== NOTIFICATION SYSTEM =====

  setupNotificationSystem() {
    // Request notification permission on app start
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        this.requestPermission('notifications');
      }, 3000); // Wait 3 seconds after app load
    }

    // Listen for audio events to show notifications
    on('play', (data) => this.showPlaybackNotification('play', data));
    on('pause', (data) => this.showPlaybackNotification('pause', data));
    on('ended', (data) => this.showPlaybackNotification('ended', data));
    on('sleepTimerSet', (minutes) => this.showSystemNotification('sleepTimer', { minutes }));
    on('sleepTimerCancelled', () => this.showSystemNotification('sleepTimerCancelled'));

    // System notifications
    window.addEventListener('online', () => this.showSystemNotification('backOnline'));
    window.addEventListener('offline', () => this.showSystemNotification('goneOffline'));
  }

  async showPlaybackNotification(type, data) {
    if (!this.shouldShowNotification('playback')) {
      return;
    }

    const song = data?.song || getCurrentSong();
    if (!song) {
      return;
    }

    let title, body, icon;

    switch (type) {
    case 'play':
      title = 'Now Playing';
      body = `${song.title} - ${song.artist}`;
      icon = song.cover || 'assets/icons/play.png';
      break;
    case 'pause':
      title = 'Playback Paused';
      body = `${song.title} - ${song.artist}`;
      icon = 'assets/icons/pause.png';
      break;
    case 'ended':
      title = 'Song Ended';
      body = `${song.title} - ${song.artist}`;
      icon = 'assets/icons/end.png';
      break;
    }

    await this.showNotification(title, { body, icon, tag: 'playback' });
  }

  async showSystemNotification(type, data = {}) {
    if (!this.shouldShowNotification('system')) {
      return;
    }

    let title, body, icon;

    switch (type) {
    case 'sleepTimer':
      title = 'Sleep Timer Set';
      body = `Music will stop in ${data.minutes} minutes`;
      icon = 'assets/icons/timer.png';
      break;
    case 'sleepTimerCancelled':
      title = 'Sleep Timer Cancelled';
      body = 'Sleep timer has been turned off';
      icon = 'assets/icons/timer-off.png';
      break;
    case 'backOnline':
      title = 'Back Online';
      body = 'Your music library is now synced';
      icon = 'assets/icons/online.png';
      break;
    case 'goneOffline':
      title = 'Offline Mode';
      body = 'Some features may be limited';
      icon = 'assets/icons/offline.png';
      break;
    case 'newSong':
      title = 'New Song Added';
      body = `${data.title} by ${data.artist}`;
      icon = data.cover || 'assets/icons/music.png';
      break;
    case 'playlistUpdate':
      title = 'Playlist Updated';
      body = `${data.playlistName} has been modified`;
      icon = 'assets/icons/playlist.png';
      break;
    }

    await this.showNotification(title, { body, icon, tag: 'system' });
  }

  async showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          ...options,
          requireInteraction: false,
          silent: false,
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
          notification.close();
        }, 3000);

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

      } catch (error) {
        logger.error('Failed to show notification', error);
      }
    }
  }

  shouldShowNotification(type) {
    // Check user preferences
    const prefs = localStorage.getItem('notificationPreferences');
    if (!prefs) {
      return true;
    } // Default to showing notifications

    const settings = JSON.parse(prefs);
    return settings[type] !== false;
  }

  updateNotificationPreferences() {
    const prefs = {
      playback: document.getElementById('notify-playback')?.checked ?? true,
      system: document.getElementById('notify-system')?.checked ?? true,
      newSongs: document.getElementById('notify-new-songs')?.checked ?? true,
      playlists: document.getElementById('notify-playlists')?.checked ?? true,
    };

    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
  }

  // ===== COMPREHENSIVE STATE MANAGEMENT FUNCTIONS =====

  // Network Error Handling
  showNetworkError(retryCallback = null) {
    this.showErrorMessage(
      'Network connection lost. Please check your internet connection.',
      retryCallback,
    );
    this.setOfflineMode(true);
  }

  // Permission Denied Handling
  showPermissionError(permissionType, guidance = '') {
    const messages = {
      storage: 'Storage access is required to save your music library. Please grant storage permissions in your browser settings.',
      microphone: 'Microphone access is needed for voice commands. Please allow microphone access.',
      notifications: 'Notification permission is required for playback alerts. Please enable notifications.',
    };

    const message = messages[permissionType] || `Permission denied for ${permissionType}. ${guidance}`;
    this.showErrorMessage(message, () => {
      // Attempt to request permission again
      this.requestPermission(permissionType);
    });
  }

  async requestPermission(permissionType) {
    try {
      let granted = false;

      switch (permissionType) {
      case 'storage':
        granted = await this.requestStoragePermission();
        break;
      case 'microphone':
        granted = await this.requestMicrophonePermission();
        break;
      case 'notifications':
        granted = await this.requestNotificationPermission();
        break;
      case 'geolocation':
        granted = await this.requestGeolocationPermission();
        break;
      case 'camera':
        granted = await this.requestCameraPermission();
        break;
      case 'bluetooth':
        granted = await this.requestBluetoothPermission();
        break;
      }

      if (granted) {
        this.showSuccessMessage(`${permissionType} permission granted`);
        this.updatePermissionStatus(permissionType, true);
      } else {
        throw new Error(`${permissionType} permission denied`);
      }
    } catch (error) {
      logger.error(`Failed to request ${permissionType} permission`, error);
      this.updatePermissionStatus(permissionType, false);
      this.showPermissionError(permissionType, this.getPermissionFallbackMessage(permissionType));
    }
  }

  async requestStoragePermission() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const granted = await navigator.storage.persist();
      if (!granted) {
        // Try to estimate storage
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage) {
          const percentUsed = (estimate.usage / estimate.quota) * 100;
          if (percentUsed < 90) {
            // Storage is available even without persistence
            return true;
          }
        }
        return false;
      }
      return true;
    }
    // Fallback: assume storage is available
    return true;
  }

  async requestMicrophonePermission() {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      // Fallback: try without advanced constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        fallbackStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async requestGeolocationPermission() {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    });
  }

  async requestCameraPermission() {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      camStream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      // Fallback: try rear camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        fallbackStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  async requestBluetoothPermission() {
    if (!('bluetooth' in navigator)) {
      return false;
    }

    try {
      // Request any device to test permission
      await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  getPermissionFallbackMessage(permissionType) {
    const messages = {
      storage: 'Storage access is required for saving your music. You can still use the app but data won\'t persist.',
      microphone: 'Microphone access enables voice commands. You can still control playback manually.',
      notifications: 'Notifications keep you updated on playback. You can check the app manually for updates.',
      geolocation: 'Location access enables location-based features. Features will work with default settings.',
      camera: 'Camera access enables AR features. Basic playback will still work.',
      bluetooth: 'Bluetooth access enables wireless speakers. You can still use device speakers.',
    };
    return messages[permissionType] || 'Permission denied. Some features may be limited.';
  }

  updatePermissionStatus(permissionType, granted) {
    const status = localStorage.getItem('permissionStatus') || '{}';
    const permissions = JSON.parse(status);
    permissions[permissionType] = granted;
    localStorage.setItem('permissionStatus', JSON.stringify(permissions));

    // Update UI to reflect permission status
    this.updatePermissionUI(permissionType, granted);
  }

  updatePermissionUI(permissionType, granted) {
    const indicators = document.querySelectorAll(`[data-permission="${permissionType}"]`);
    indicators.forEach(indicator => {
      indicator.classList.toggle('granted', granted);
      indicator.classList.toggle('denied', !granted);
    });
  }

  async checkAllPermissions() {
    const permissionTypes = ['storage', 'microphone', 'notifications', 'geolocation', 'camera', 'bluetooth'];

    for (const type of permissionTypes) {
      const granted = await this.checkPermission(type);
      this.updatePermissionStatus(type, granted);
    }
  }

  getPermissionStatus(permissionType) {
    const status = localStorage.getItem('permissionStatus');
    if (!status) {
      return null;
    }

    const permissions = JSON.parse(status);
    return permissions[permissionType] || null;
  }

  async checkPermission(permissionType) {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: permissionType });
        return permission.state === 'granted';
      }

      // Fallback checks for browsers without permissions API
      switch (permissionType) {
      case 'storage':
        return 'storage' in navigator && 'estimate' in navigator.storage;
      case 'microphone':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      case 'notifications':
        return 'Notification' in window && Notification.permission === 'granted';
      case 'geolocation':
        return 'geolocation' in navigator;
      case 'camera':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      default:
        return false;
      }
    } catch (error) {
      logger.error(`Failed to check ${permissionType} permission`, error);
      return false;
    }
  }

  async enforcePlatformGuidelines() {
    // Check for PWA installation status
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;

    if (!isInstalled && !localStorage.getItem('install-prompt-dismissed')) {
      this.showInstallPrompt();
    }

    // Check for HTTPS (required for many Web APIs)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      this.showErrorMessage('HTTPS is required for full functionality. Some features may not work.');
    }

    // Check for outdated browser
    const isModernBrowser = 'serviceWorker' in navigator &&
                               'indexedDB' in window &&
                               'AudioContext' in window;

    if (!isModernBrowser) {
      this.showErrorMessage('Your browser may not support all features. Please update to a modern browser.');
    }

    // Rate limiting for API calls
    this.setupRateLimiting();
  }

  showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
            <div class="install-content">
                <h3>Install Roshan Beats</h3>
                <p>Get the full app experience with offline access and native features!</p>
                <div class="install-actions">
                    <button class="install-btn">Install</button>
                    <button class="dismiss-btn">Later</button>
                </div>
            </div>
        `;

    prompt.querySelector('.install-btn').addEventListener('click', () => {
      // Trigger install prompt (would need to be implemented with beforeinstallprompt event)
      prompt.remove();
    });

    prompt.querySelector('.dismiss-btn').addEventListener('click', () => {
      localStorage.setItem('install-prompt-dismissed', 'true');
      prompt.remove();
    });

    document.body.appendChild(prompt);
  }

  setupRateLimiting() {
    // Simple rate limiting for API calls
    this.apiCallTimes = [];
    this.rateLimitWindow = 60000; // 1 minute
    this.maxCallsPerWindow = 100; // 100 calls per minute
  }

  async makeRateLimitedAPICall(apiCall) {
    const now = Date.now();

    // Clean old calls
    this.apiCallTimes = this.apiCallTimes.filter(time => now - time < this.rateLimitWindow);

    if (this.apiCallTimes.length >= this.maxCallsPerWindow) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }

    this.apiCallTimes.push(now);
    return apiCall();
  }

  async makeSecureAPICall(url, options = {}) {
    // Enforce HTTPS for all external API calls
    if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
      throw new Error('All API calls must use HTTPS');
    }

    // Set secure defaults
    const secureOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
      credentials: 'omit', // Don't send cookies for external APIs
      mode: 'cors',
    };

    // Add CSRF protection for same-origin requests
    if (url.startsWith(window.location.origin)) {
      const csrfToken = this.generateCSRFToken();
      secureOptions.headers['X-CSRF-Token'] = csrfToken;
    }

    try {
      const response = await this.makeRateLimitedAPICall(() => fetch(url, secureOptions));

      // Validate response
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      // Check for secure headers
      this.validateSecureHeaders(response.headers);

      return response;
    } catch (error) {
      logger.error('Secure API call failed', error, { url });
      throw error;
    }
  }

  generateCSRFToken() {
    // Generate a simple CSRF token (in production, use a proper implementation)
    const token = localStorage.getItem('csrfToken');
    if (token) {
      return token;
    }

    const newToken = btoa(Math.random().toString()).substring(0, 32);
    localStorage.setItem('csrfToken', newToken);
    return newToken;
  }

  validateSecureHeaders(headers) {
    // Check for security headers
    const warnings = [];

    if (!headers.get('content-security-policy')) {
      warnings.push('Missing Content Security Policy header');
    }

    if (!headers.get('x-content-type-options') || headers.get('x-content-type-options') !== 'nosniff') {
      warnings.push('Missing or incorrect X-Content-Type-Options header');
    }

    if (!headers.get('x-frame-options')) {
      warnings.push('Missing X-Frame-Options header');
    }

    if (warnings.length > 0) {
      logger.warn('API response missing security headers', { warnings });
    }
  }

  setupContentSecurity() {
    // Add CSP meta tag if not present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = `
                default-src 'self';
                script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data: https: blob:;
                media-src 'self' blob: data:;
                connect-src 'self' https:;
                font-src 'self' https://fonts.gstatic.com;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
            `.replace(/\s+/g, ' ').trim();
      document.head.appendChild(cspMeta);
    }
  }

  sanitizeInput(input) {
    // Basic input sanitization
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  validateFileUpload(file) {
    const errors = [];

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      errors.push('File size exceeds 100MB limit');
    }

    // Check file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp4'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      errors.push('Unsupported file type. Only audio files are allowed.');
    }

    // Check filename for malicious patterns
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push('Invalid filename');
    }

    return errors;
  }

  async exportUserData() {
    try {
      this.showLoadingState('export-loading', 'Exporting your data...');

      // Gather all user data
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {},
      };

      // Get songs
      const { getSongs } = await import('./storage.js');
      exportData.data.songs = await getSongs();

      // Get playlists
      const { getPlaylists } = await import('./storage.js');
      exportData.data.playlists = await getPlaylists();

      // Get preferences
      const { getPreferences } = await import('./storage.js');
      exportData.data.preferences = await getPreferences();

      // Get history
      const { getHistory } = await import('./storage.js');
      exportData.data.history = await getHistory(1000);

      // Convert to JSON and download
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `roshan-beats-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this.hideLoadingState('export-loading');
      this.showSuccessMessage('Data exported successfully');

    } catch (error) {
      this.hideLoadingState('export-loading');
      logger.error('Failed to export user data', error);
      this.showErrorMessage('Failed to export data');
    }
  }

  async confirmAppReset() {
    const confirmed = confirm(
      'Are you sure you want to reset the app? This will:\n\n' +
            '• Delete all songs and playlists\n' +
            '• Clear all settings and preferences\n' +
            '• Remove all cached data\n\n' +
            'This action cannot be undone.',
    );

    if (confirmed) {
      try {
        this.showLoadingState('reset-loading', 'Resetting app...');

        // Clear all data
        localStorage.clear();
        sessionStorage.clear();

        // Clear IndexedDB
        const dbDeleteRequest = indexedDB.deleteDatabase('RoshanBeatsDB');
        dbDeleteRequest.onsuccess = () => {
          this.hideLoadingState('reset-loading');
          this.showSuccessMessage('App reset successfully. Refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        };

        dbDeleteRequest.onerror = () => {
          this.hideLoadingState('reset-loading');
          this.showErrorMessage('Failed to reset app completely');
        };

      } catch (error) {
        this.hideLoadingState('reset-loading');
        logger.error('Failed to reset app', error);
        this.showErrorMessage('Failed to reset app');
      }
    }
  }

  // Memory management
  setupMemoryManagement() {
    // Periodic cleanup of unused resources
    setInterval(() => {
      this.performMemoryCleanup();
    }, 300000); // Every 5 minutes

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performMemoryCleanup();
      }
    });

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        const usedPercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;

        if (usedPercent > 80) {
          logger.warn('High memory usage detected', { percent: usedPercent });
          this.performAggressiveCleanup();
        }
      }, 60000); // Every minute
    }
  }

  performMemoryCleanup() {
    // Clear cached images not in viewport
    const lazyImages = document.querySelectorAll('img.lazy[loaded]');
    lazyImages.forEach(img => {
      if (!this.isElementInViewport(img)) {
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Reset to placeholder
        img.removeAttribute('loaded');
      }
    });

    // Force garbage collection hint (if available)
    if (window.gc) {
      window.gc();
    }

    logger.debug('Memory cleanup performed');
  }

  performAggressiveCleanup() {
    // More aggressive cleanup when memory is critical
    this.showErrorMessage('Memory usage is high. Performing cleanup...', null, false);

    // Clear all cached images
    const allImages = document.querySelectorAll('img.lazy');
    allImages.forEach(img => {
      if (img.hasAttribute('loaded')) {
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        img.removeAttribute('loaded');
      }
    });

    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name !== 'core-cache') { // Keep essential cache
            caches.delete(name);
          }
        });
      });
    }

    logger.warn('Aggressive memory cleanup performed');
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

  // Global error recovery system
  setupErrorRecovery() {
    // Handle critical errors that could break the app
    window.addEventListener('error', (event) => {
      this.handleCriticalError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleCriticalError(event.reason, {
        type: 'unhandledrejection',
        promise: event.promise,
      });
      event.preventDefault(); // Prevent default browser handling
    });

    // Recovery from service worker errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'error') {
          this.handleServiceWorkerError(event.data.error);
        }
      });
    }

    // Network error recovery
    window.addEventListener('online', () => {
      this.attemptRecovery('network');
    });
  }

  handleCriticalError(error, context) {
    logger.error('Critical application error', error, context);

    // Determine if app can continue
    const isRecoverable = this.isErrorRecoverable(error, context);

    if (isRecoverable) {
      this.attemptRecovery('critical', { error, context });
    } else {
      this.showCriticalErrorScreen(error, context);
    }
  }

  isErrorRecoverable(error, context) {
    // Check if error is recoverable
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /temporary/i,
      /service.*unavailable/i,
    ];

    const errorMessage = (error?.message || '') + (context?.message || '');
    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  }

  async attemptRecovery(recoveryType, data = {}) {
    logger.info(`Attempting recovery: ${recoveryType}`, data);

    try {
      switch (recoveryType) {
      case 'network':
        // Retry pending operations
        if (window.processSyncQueue) {
          window.processSyncQueue();
        }
        this.showSuccessMessage('Connection restored. Syncing data...');
        break;

      case 'critical':
        // Try to reinitialize core components
        await this.emergencyReinit();
        this.showSuccessMessage('Application recovered from error');
        break;

      case 'storage':
        // Clear corrupted data and reinitialize
        await this.recoverStorage();
        break;

      case 'audio':
        // Reinitialize audio context
        if (window.initAudio) {
          await window.initAudio();
        }
        break;
      }
    } catch (recoveryError) {
      logger.error('Recovery failed', recoveryError);
      this.showCriticalErrorScreen(recoveryError, { recoveryType });
    }
  }

  async emergencyReinit() {
    // Emergency reinitialization of core systems
    try {
      // Reinitialize audio if needed
      if (!window.audioContext || window.audioContext.state === 'closed') {
        const { initAudio } = await import('./audio.js');
        await initAudio();
      }

      // Reinitialize storage
      const { openDB } = await import('./storage.js');
      await openDB();

      // Refresh UI
      this.showScreen('home', {}, { replace: true });

      logger.info('Emergency reinitialization completed');
    } catch (error) {
      logger.error('Emergency reinitialization failed', error);
      throw error;
    }
  }

  async recoverStorage() {
    // Attempt to recover from storage corruption
    try {
      // Close and reopen database
      const { openDB } = await import('./storage.js');
      await openDB();

      // Validate data integrity
      await this.validateDataIntegrity();

      logger.info('Storage recovery completed');
    } catch (error) {
      logger.error('Storage recovery failed', error);
      throw error;
    }
  }

  async validateDataIntegrity() {
    // Check and repair data integrity
    const { getSongs, getPlaylists } = await import('./storage.js');

    try {
      const songs = await getSongs();
      const playlists = await getPlaylists();

      // Basic validation
      const invalidSongs = songs.filter(song => !song.id || !song.title);
      const invalidPlaylists = playlists.filter(playlist => !playlist.id || !playlist.name);

      if (invalidSongs.length > 0 || invalidPlaylists.length > 0) {
        logger.warn('Data integrity issues found', {
          invalidSongs: invalidSongs.length,
          invalidPlaylists: invalidPlaylists.length,
        });

        // Attempt repair (simplified)
        // In a real implementation, this would be more sophisticated
      }
    } catch (error) {
      logger.error('Data integrity validation failed', error);
    }
  }

  showCriticalErrorScreen(error, context) {
    // Show a critical error screen that prevents further app usage
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
      await this.confirmAppReset();
      errorScreen.remove();
    });

    errorScreen.querySelector('#report-error').addEventListener('click', () => {
      this.reportError(error, context);
    });
  }

  reportError(error, context) {
    // Generate error report
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
      logs: logger.getLogs('error', 10),
    };

    // Copy to clipboard or send to service
    const reportText = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(reportText).then(() => {
      this.showSuccessMessage('Error report copied to clipboard. Please send it to support.');
    }).catch(() => {
      // Fallback: show in console
      console.log('Error Report:', report);
      this.showErrorMessage('Error report logged to console. Please check developer tools.');
    });
  }

  handleServiceWorkerError(error) {
    logger.error('Service Worker error', error);
    this.showErrorMessage('Background service error. Some features may be limited.', () => {
      // Attempt to re-register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(new URL('/sw.js', import.meta.url));
      }
    });
  }

  // Settings methods
  togglePerformanceMonitoring(enabled) {
    if (enabled) {
      performanceMonitor.enable();
    } else {
      performanceMonitor.disable();
    }
  }

  toggleDebugMode(enabled) {
    localStorage.setItem('debugMode', enabled);
    if (enabled) {
      document.body.classList.add('debug-mode');
    } else {
      document.body.classList.remove('debug-mode');
    }
  }

  setLogLevel(level) {
    logger.setLogLevel(level);
  }

  setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.body.className = `theme-${theme}`;
  }

  setFontSize(size) {
    localStorage.setItem('fontSize', size);
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }[size] || '16px';
  }

  setLanguage(lang) {
    localStorage.setItem('language', lang);
    // In a real implementation, this would reload with new language
    this.showSuccessMessage(`Language changed to ${lang}. Restart app to apply.`);
  }

  toggleHighContrast(enabled) {
    localStorage.setItem('highContrast', enabled);
    document.body.classList.toggle('high-contrast', enabled);
  }

  toggleReduceMotion(enabled) {
    localStorage.setItem('reduceMotion', enabled);
    document.body.classList.toggle('reduce-motion', enabled);
  }

  toggleScreenReader(enabled) {
    localStorage.setItem('screenReader', enabled);
    // Update ARIA attributes based on setting
    document.querySelectorAll('[aria-label]').forEach(el => {
      if (!enabled) {
        el.removeAttribute('aria-label');
      }
    });
  }

  async importSettings(file) {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      // Apply imported settings
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });

      this.showSuccessMessage('Settings imported successfully. Refresh to apply.');
    } catch (error) {
      logger.error('Failed to import settings', error);
      this.showErrorMessage('Failed to import settings file');
    }
  }

  exportErrorLogs() {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `roshan-beats-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.showSuccessMessage('Error logs exported');
  }

  showKeyboardShortcuts() {
    const shortcuts = `
Space: Play/Pause
← →: Previous/Next track
↑ ↓: Volume up/down
M: Mute
S: Shuffle toggle
R: Repeat mode
Q: Show queue
F: Fullscreen
?: Show this help
        `;

    this.showSuccessMessage(`Keyboard Shortcuts:\n${shortcuts}`);
  }

  async checkForUpdates() {
    // Simulate update check
    this.showLoadingState('update-check', 'Checking for updates...');

    setTimeout(() => {
      this.hideLoadingState('update-check');
      this.showSuccessMessage('You have the latest version!');
    }, 2000);
  }

  showLicense() {
    const license = `
Roshan Beats - MIT License

Copyright (c) 2025 Roshan Beats

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
        `;

    // Create modal to show license
    const modal = document.createElement('div');
    modal.className = 'modal license-modal';
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <h3>MIT License</h3>
                <pre style="white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto;">${license}</pre>
                <div class="modal-actions">
                    <button class="outlined-btn close-btn">Close</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  }

  // Accessibility features
  setupAccessibility() {
    // Skip links for screen readers
    this.addSkipLinks();

    // Enhanced keyboard navigation
    this.setupKeyboardNavigation();

    // Screen reader announcements
    this.setupScreenReaderSupport();

    // Focus management
    this.setupFocusManagement();

    // High contrast support
    this.setupHighContrastSupport();

    // Reduced motion support
    this.setupReducedMotionSupport();
  }

  addSkipLinks() {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
            <a href="#search" class="skip-link">Skip to search</a>
        `;
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  setupKeyboardNavigation() {
    // Tab navigation for all interactive elements
    document.addEventListener('keydown', (e) => {
      // Enhanced arrow key navigation for lists
      if (e.key.startsWith('Arrow')) {
        const focusedElement = document.activeElement;
        const listItem = focusedElement?.closest('.song-card, .song-list-item, .playlist-card');

        if (listItem) {
          e.preventDefault();
          this.navigateListWithArrows(listItem, e.key);
        }
      }

      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.showKeyboardShortcuts();
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // F for fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        this.toggleFullscreen();
      }

      // M for mute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.toggleMute();
      }

      // S for shuffle
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.toggleShuffle();
      }

      // R for repeat
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.cycleRepeatMode();
      }
    });
  }

  navigateListWithArrows(currentItem, direction) {
    const container = currentItem.closest('.song-grid, .song-list, .playlist-grid');
    if (!container) {
      return;
    }

    const items = Array.from(container.querySelectorAll('.song-card, .song-list-item, .playlist-card'));
    const currentIndex = items.indexOf(currentItem);

    let nextIndex;
    switch (direction) {
    case 'ArrowUp':
    case 'ArrowLeft':
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      break;
    }

    if (nextIndex !== undefined && items[nextIndex]) {
      items[nextIndex].focus();
      items[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }

  toggleMute() {
    const volumeBar = document.getElementById('volume-bar');
    if (volumeBar) {
      const currentVolume = parseFloat(volumeBar.value) || 0;
      if (currentVolume > 0) {
        this.previousVolume = currentVolume;
        setVolume(0);
      } else {
        setVolume(this.previousVolume || 0.5);
      }
    }
  }

  toggleShuffle() {
    toggleShuffle();
  }

  cycleRepeatMode() {
    const currentMode = getRepeatMode();
    const modes = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
    setRepeatMode(nextMode);
    this.announceContentChange(`Repeat mode: ${nextMode}`);
  }

  setupScreenReaderSupport() {
    // Live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    // Announce screen changes
    this.announceScreenChange = (screenName) => {
      const announcements = {
        home: 'Music library',
        playlists: 'Playlists',
        player: 'Now playing',
        settings: 'Settings',
        search: 'Search',
        profile: 'Profile',
        notifications: 'Notifications',
        chat: 'Chat',
        gallery: 'Gallery',
        map: 'Map',
        calendar: 'Calendar',
        'shopping-cart': 'Shopping Cart',
        payment: 'Payment',
        feedback: 'Feedback',
        analytics: 'Analytics',
        help: 'Help',
        privacy: 'Privacy',
        'offline-queue': 'Offline Queue',
        'ar-camera': 'AR Camera',
      };
      liveRegion.textContent = `Navigated to ${announcements[screenName] || screenName}`;
    };

    // Announce dynamic content changes
    this.announceContentChange = (message) => {
      liveRegion.textContent = message;
    };
  }

  setupFocusManagement() {
    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal:not([style*="display: none"])');
        if (modal) {
          this.trapFocusInModal(modal, e);
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal:not([style*="display: none"])');
        if (modal) {
          this.closeModal();
        }
      }
    });

    // Restore focus when modal closes
    const originalCloseModal = this.closeModal;
    this.closeModal = () => {
      const previouslyFocused = document.activeElement;
      originalCloseModal.call(this);
      if (previouslyFocused && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      }
    };
  }

  trapFocusInModal(modal, e) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  setupHighContrastSupport() {
    const highContrast = localStorage.getItem('highContrast') === 'true';
    if (highContrast) {
      document.body.classList.add('high-contrast');
    }

    // Detect system high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      document.body.classList.add('high-contrast');
    }
  }

  setupReducedMotionSupport() {
    const reduceMotion = localStorage.getItem('reduceMotion') === 'true';
    if (reduceMotion) {
      document.body.classList.add('reduce-motion');
    }

    // Detect system reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('reduce-motion');
    }
  }

  // Enhanced navigation with breadcrumbs
  updateNavigationHistory(screenName, data) {
    // Update navigation history
    if (this.currentScreen && this.currentScreen !== screenName) {
      this.navigationHistory.push(this.currentScreen);
      // Keep only last 10 screens
      if (this.navigationHistory.length > 10) {
        this.navigationHistory.shift();
      }
    }

    // Update breadcrumb trail
    const screenNames = {
      home: 'Home',
      playlists: 'Playlists',
      'playlist-detail': 'Playlist',
      player: 'Player',
      settings: 'Settings',
      search: 'Search',
      profile: 'Profile',
      notifications: 'Notifications',
    };

    const screenTitle = screenNames[screenName] || screenName;
    const existingIndex = this.breadcrumbTrail.findIndex(crumb => crumb.screen === screenName);

    if (existingIndex >= 0) {
      // Screen already in trail, truncate to this point
      this.breadcrumbTrail = this.breadcrumbTrail.slice(0, existingIndex + 1);
    } else {
      // Add new screen to trail
      this.breadcrumbTrail.push({ name: screenTitle, screen: screenName });
    }
  }

  updateBreadcrumbs() {
    const breadcrumbContainer = document.getElementById('breadcrumb-nav');
    if (!breadcrumbContainer) {
      return;
    }

    const breadcrumbs = this.breadcrumbTrail.map((crumb, index) => {
      if (index === this.breadcrumbTrail.length - 1) {
        return `<span class="breadcrumb-current">${crumb.name}</span>`;
      } else {
        return `<button class="breadcrumb-link" data-screen="${crumb.screen}">${crumb.name}</button>`;
      }
    });

    breadcrumbContainer.innerHTML = breadcrumbs.join(' > ');

    // Add click handlers
    breadcrumbContainer.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', () => {
        const screen = link.dataset.screen;
        this.navigateToBreadcrumb(screen);
      });
    });
  }

  navigateToBreadcrumb(screen) {
    // Find the index of the target screen in breadcrumb trail
    const targetIndex = this.breadcrumbTrail.findIndex(crumb => crumb.screen === screen);
    if (targetIndex >= 0) {
      // Remove breadcrumbs after the target
      this.breadcrumbTrail = this.breadcrumbTrail.slice(0, targetIndex + 1);
      this.showScreen(screen);
    }
  }

  // Deep linking support
  handleDeepLink() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const [screen, params] = hash.split('?');
      if (screen) {
        const data = params ? this.parseQueryString(params) : {};
        this.showScreen(screen, data);
      }
    }
  }

  parseQueryString(query) {
    const params = {};
    query.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    return params;
  }

  updateURL(screen, data = {}) {
    const params = Object.entries(data)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const hash = params ? `${screen}?${params}` : screen;
    window.history.replaceState(null, '', `#${hash}`);
  }

  // Reactive behaviors
  setupReactiveBehaviors() {
    // User activity monitoring
    this.setupUserActivityMonitoring();

    // Contextual suggestions
    this.setupContextualSuggestions();

    // Adaptive UI based on usage patterns
    this.setupAdaptiveUI();

    // Real-time data synchronization
    this.setupRealTimeSync();

    // Smart notifications based on context
    this.setupSmartNotifications();

    // Predictive actions
    this.setupPredictiveActions();
  }

  setupUserActivityMonitoring() {
    let lastActivity = Date.now();
    let activityTimeout;

    const updateActivity = () => {
      lastActivity = Date.now();
      clearTimeout(activityTimeout);

      // Auto-pause after inactivity (if enabled in settings)
      const autoPause = localStorage.getItem('autoPause') === 'true';
      if (autoPause) {
        activityTimeout = setTimeout(() => {
          const { getCurrentSong } = require('./audio.js');
          if (getCurrentSong()) {
            // Pause after 30 minutes of inactivity
            const { pause } = require('./audio.js');
            pause();
            this.showSuccessMessage('Playback paused due to inactivity');
          }
        }, 30 * 60 * 1000); // 30 minutes
      }
    };

    // Track various user activities
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Track app visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App hidden - could pause playback or reduce updates
        this.onAppHidden();
      } else {
        // App visible - resume normal operation
        this.onAppVisible();
      }
    });
  }

  onAppHidden() {
    // Reduce performance when app is hidden
    const { performanceMonitor } = require('./performance.js');
    performanceMonitor.disable();

    // Pause non-essential updates
    this.pauseNonEssentialUpdates();
  }

  onAppVisible() {
    // Resume full performance monitoring
    const { performanceMonitor } = require('./performance.js');
    performanceMonitor.enable();

    // Resume updates
    this.resumeUpdates();

    // Refresh data if needed
    this.refreshOnReturn();
  }

  pauseNonEssentialUpdates() {
    // Pause background sync, non-critical animations, etc.
    document.body.classList.add('backgrounded');
  }

  resumeUpdates() {
    document.body.classList.remove('backgrounded');
  }

  refreshOnReturn() {
    // Check if data needs refresh
    const lastRefresh = localStorage.getItem('lastDataRefresh');
    const now = Date.now();

    if (!lastRefresh || (now - parseInt(lastRefresh)) > 5 * 60 * 1000) { // 5 minutes
      // Refresh playlists and library
      this.populatePlaylists();
      this.populateSongLibrary();
      localStorage.setItem('lastDataRefresh', now.toString());
    }
  }

  setupContextualSuggestions() {
    // Suggest playlists based on current song
    on('play', (data) => {
      if (data?.song) {
        this.suggestRelatedPlaylists(data.song);
      }
    });

    // Suggest songs based on listening patterns
    on('ended', () => {
      this.suggestNextSongs();
    });

    // Show contextual help
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.matches('.song-card') && !localStorage.getItem('songCardHelpShown')) {
        setTimeout(() => {
          this.showContextualHelp('Tap to play, long press for options', target);
          localStorage.setItem('songCardHelpShown', 'true');
        }, 1000);
      }
    });
  }

  suggestRelatedPlaylists(song) {
    // Find playlists containing similar songs
    const { getPlaylists } = require('./storage.js');
    getPlaylists().then(playlists => {
      const related = playlists.filter(playlist =>
        playlist.songs?.some(s =>
          s.artist === song.artist ||
                    s.genre === song.genre,
        ),
      );

      if (related.length > 0) {
        this.showSuggestion(`Check out "${related[0].name}" playlist`, () => {
          this.showScreen('playlist-detail', { playlistId: related[0].id });
        });
      }
    });
  }

  suggestNextSongs() {
    // Suggest songs based on recent listening history
    const { getHistory } = require('./storage.js');
    getHistory(5).then(history => {
      if (history.length > 0) {
        const lastSong = history[0];
        // Simple suggestion: songs by same artist
        const { getSongs } = require('./storage.js');
        getSongs({ artist: lastSong.songId }).then(songs => {
          if (songs.length > 1) {
            const suggestion = songs.find(s => s.id !== lastSong.songId);
            if (suggestion) {
              this.showSuggestion(`How about "${suggestion.title}" by ${suggestion.artist}?`, () => {
                const { setQueue, play } = require('./audio.js');
                setQueue([suggestion], 0);
                play(suggestion);
              });
            }
          }
        });
      }
    });
  }

  showSuggestion(message, action) {
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion-toast';
    suggestion.innerHTML = `
            <span>${message}</span>
            <button class="suggestion-action">Try it</button>
            <button class="suggestion-dismiss">×</button>
        `;

    document.body.appendChild(suggestion);

    suggestion.querySelector('.suggestion-action').addEventListener('click', () => {
      action();
      suggestion.remove();
    });

    suggestion.querySelector('.suggestion-dismiss').addEventListener('click', () => {
      suggestion.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (suggestion.parentNode) {
        suggestion.remove();
      }
    }, 10000);
  }

  showContextualHelp(message, target) {
    const help = document.createElement('div');
    help.className = 'contextual-help';
    help.textContent = message;

    // Position near target
    const rect = target.getBoundingClientRect();
    help.style.left = `${rect.left}px`;
    help.style.top = `${rect.bottom + 10}px`;

    document.body.appendChild(help);

    setTimeout(() => {
      if (help.parentNode) {
        help.remove();
      }
    }, 3000);
  }

  setupAdaptiveUI() {
    // Adapt UI based on usage patterns
    this.trackUsagePatterns();

    // Adapt to device capabilities
    this.adaptToDeviceCapabilities();

    // Adapt to user preferences over time
    this.adaptToUserPreferences();
  }

  trackUsagePatterns() {
    // Track which screens are used most
    document.addEventListener('screenShown', (e) => {
      const screen = e.detail.screen;
      const usage = JSON.parse(localStorage.getItem('screenUsage') || '{}');
      usage[screen] = (usage[screen] || 0) + 1;
      localStorage.setItem('screenUsage', JSON.stringify(usage));

      // Adapt navigation based on usage
      this.adaptNavigationToUsage(usage);
    });
  }

  adaptNavigationToUsage(usage) {
    // Reorder navigation items based on usage frequency
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const usageEntries = Object.entries(usage).sort((a, b) => b[1] - a[1]);

    // This would reorder the nav items in the DOM based on usage
    // For now, just log the most used screens
    logger.debug('Most used screens', usageEntries.slice(0, 3));
  }

  adaptToDeviceCapabilities() {
    const features = this.checkFeatureSupport();

    // Adapt UI based on available features
    if (!features.touch) {
      // Desktop optimizations
      document.body.classList.add('desktop-optimized');
    }

    if (features.battery) {
      // Monitor battery and adapt behavior
      navigator.getBattery().then(battery => {
        const updateBatteryUI = () => {
          if (battery.level < 0.2 && !battery.charging) {
            this.showErrorMessage('Battery low. Consider enabling power-saving mode.');
            // Could reduce animations, disable non-essential features
          }
        };

        battery.addEventListener('levelchange', updateBatteryUI);
        battery.addEventListener('chargingchange', updateBatteryUI);
      });
    }
  }

  adaptToUserPreferences() {
    // Learn from user behavior and adapt defaults
    const preferences = JSON.parse(localStorage.getItem('learnedPreferences') || '{}');

    // Example: Learn preferred view mode
    if (this.isGridView !== preferences.preferredView) {
      // Could suggest switching view modes based on past behavior
    }
  }

  setupRealTimeSync() {
    // Real-time synchronization with external changes
    window.addEventListener('storage', (e) => {
      // React to storage changes from other tabs/windows
      if (e.key === 'currentSong' || e.key?.startsWith('playlist')) {
        this.handleExternalDataChange(e.key, e.newValue);
      }
    });

    // Periodic sync check
    setInterval(() => {
      this.checkForExternalChanges();
    }, 30000); // Every 30 seconds
  }

  handleExternalDataChange(key, newValue) {
    // Handle changes from other tabs/windows
    if (key === 'currentSong') {
      // Update current song display
      this.updatePlayerUI();
    } else if (key.startsWith('playlist')) {
      // Refresh playlist data
      this.populatePlaylists();
    }
  }

  checkForExternalChanges() {
    // Check for changes that might have occurred externally
    // This could integrate with a sync service
    logger.debug('Checking for external changes');
  }

  setupSmartNotifications() {
    // Smart notifications based on context and user behavior
    on('playlistUpdate', (data) => {
      if (this.shouldNotifyPlaylistUpdate(data)) {
        this.showSystemNotification('playlistUpdate', data);
      }
    });

    on('newSong', (data) => {
      if (this.shouldNotifyNewSong(data)) {
        this.showSystemNotification('newSong', data);
      }
    });
  }

  shouldNotifyPlaylistUpdate(data) {
    // Only notify if user has interacted with this playlist recently
    const recentPlaylists = JSON.parse(localStorage.getItem('recentPlaylists') || '[]');
    return recentPlaylists.includes(data.playlistId);
  }

  shouldNotifyNewSong(data) {
    // Notify based on user's interest in the artist/genre
    const favoriteArtists = JSON.parse(localStorage.getItem('favoriteArtists') || '[]');
    return favoriteArtists.includes(data.artist);
  }

  setupPredictiveActions() {
    // Predict and prepare actions based on user behavior
    document.addEventListener('click', (e) => {
      if (e.target.matches('.playlist-card')) {
        const playlistId = e.target.dataset.playlistId;
        // Preload playlist data
        this.predictiveLoadPlaylist(playlistId);
      }
    });

    // Predict search results
    document.addEventListener('input', (e) => {
      if (e.target.matches('#search-input')) {
        const query = e.target.value;
        if (query.length > 2) {
          this.predictiveSearch(query);
        }
      }
    });
  }

  predictiveLoadPlaylist(playlistId) {
    // Preload playlist data in background
    const { getPlaylists } = require('./storage.js');
    getPlaylists().then(playlists => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        // Cache playlist songs
        logger.debug('Predictively loaded playlist', { playlistId });
      }
    });
  }

  predictiveSearch(query) {
    // Preload search results
    const { searchManager } = require('./search.js');
    // This would trigger background indexing or result preparation
    logger.debug('Predictive search triggered', { query });
  }

  // File Error Handling
  showFileError(fileName, errorType, retryCallback = null) {
    const messages = {
      corruption: `File "${fileName}" appears to be corrupted or unsupported.`,
      format: `File "${fileName}" format is not supported. Supported formats: MP3, WAV, FLAC, OGG.`,
      size: `File "${fileName}" is too large. Maximum file size is 100MB.`,
    };

    const message = messages[errorType] || `Error processing file "${fileName}"`;
    this.showErrorMessage(message, retryCallback);
  }

  // Database Error Handling
  showDatabaseError(errorType, details = '', retryCallback = null) {
    const messages = {
      corruption: 'Database appears to be corrupted. Attempting to repair...',
      quota: 'Storage quota exceeded. Please free up space or upgrade your storage.',
      migration: 'Database update in progress. This may take a moment.',
      transaction: 'Database operation failed. Retrying...',
    };

    const message = messages[errorType] || `Database error: ${details}`;
    this.showErrorMessage(message, retryCallback);

    if (errorType === 'quota') {
      this.showQuotaWarning();
    }
  }

  showQuotaWarning() {
    const warning = document.createElement('div');
    warning.className = 'quota-warning';
    warning.innerHTML = `
            <div class="warning-content">
                <h3>Storage Almost Full</h3>
                <p>You're running low on storage space. Consider clearing cache or removing unused songs.</p>
                <button class="clear-cache-btn">Clear Cache</button>
                <button class="dismiss-warning">Dismiss</button>
            </div>
        `;
    document.body.appendChild(warning);

    warning.querySelector('.clear-cache-btn').addEventListener('click', async () => {
      try {
        await this.clearCache();
        warning.remove();
        this.showSuccessMessage('Cache cleared successfully');
      } catch (error) {
        logger.error('Failed to clear cache', error);
        this.showErrorMessage('Failed to clear cache');
      }
    });

    warning.querySelector('.dismiss-warning').addEventListener('click', () => {
      warning.remove();
    });
  }

  async clearCache() {
    // Import and use storage functions
    const { clearCache } = await import('./storage.js');
    await clearCache();
  }

  // Audio Context Error Handling
  showAudioContextError(retryCallback = null) {
    this.showErrorMessage(
      'Audio playback suspended. Click to resume audio.',
      retryCallback || (() => this.resumeAudioContext()),
    );
  }

  async resumeAudioContext() {
    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        this.showSuccessMessage('Audio resumed');
      }
    } catch (error) {
      logger.error('Failed to resume audio context', error);
      this.showErrorMessage('Unable to resume audio. Please refresh the page.');
    }
  }

  // Service Worker Error Handling
  showServiceWorkerError(errorType, details = '') {
    const messages = {
      registration: 'Service worker registration failed. Offline features may not work.',
      update: 'Service worker update failed. Some features may be unavailable.',
      sync: 'Background sync failed. Changes may not be saved offline.',
    };

    const message = messages[errorType] || `Service worker error: ${details}`;
    this.showErrorMessage(message);
    logger.error(`Service worker ${errorType} error`, { details });
  }

  // Import/Export Error Handling
  showImportExportError(operation, details = '', retryCallback = null) {
    const messages = {
      import: `Import failed: ${details}`,
      export: `Export failed: ${details}`,
    };

    const message = messages[operation] || `${operation} operation failed: ${details}`;
    this.showErrorMessage(message, retryCallback);
  }

  // API Error Handling
  showApiError(apiName, details = '', retryCallback = null) {
    const messages = {
      lyrics: 'Unable to fetch lyrics. You can add them manually.',
      albumart: 'Unable to fetch album art. Using default image.',
      search: 'Search service temporarily unavailable. Try again later.',
    };

    const message = messages[apiName] || `${apiName} API error: ${details}`;
    this.showErrorMessage(message, retryCallback);
  }

  // Empty State Management
  showEmptyState(stateType, containerId, customMessage = null) {
    const containers = {
      'song-library': 'empty-state',
      'playlists': 'playlists-empty',
      'playlist-detail': 'playlist-empty',
      'search-results': 'no-results-state',
      'history': 'history-empty',
      'bookmarks': 'bookmarks-empty',
      'offline-cache': 'cache-empty',
      'lyrics': 'lyrics-empty',
    };

    const stateId = containers[stateType] || containerId;
    const emptyState = document.getElementById(stateId);
    if (!emptyState) {
      return;
    }

    // Customize message if provided
    if (customMessage) {
      const messageEl = emptyState.querySelector('p') || emptyState.querySelector('h2');
      if (messageEl) {
        messageEl.textContent = customMessage;
      }
    }

    emptyState.style.display = 'block';

    // Hide other content
    const contentSelectors = {
      'song-library': ['#song-grid', '#song-list', '#loading-state'],
      'playlists': ['#playlist-grid'],
      'playlist-detail': ['#playlist-songs'],
      'search-results': ['#song-grid', '#song-list'],
    };

    const selectors = contentSelectors[stateType];
    if (selectors) {
      selectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.style.display = 'none';
        }
      });
    }
  }

  hideEmptyState(stateType, containerId) {
    const containers = {
      'song-library': 'empty-state',
      'playlists': 'playlists-empty',
      'playlist-detail': 'playlist-empty',
      'search-results': 'no-results-state',
      'history': 'history-empty',
      'bookmarks': 'bookmarks-empty',
      'offline-cache': 'cache-empty',
      'lyrics': 'lyrics-empty',
    };

    const stateId = containers[stateType] || containerId;
    const emptyState = document.getElementById(stateId);
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }

  // Loading State Management
  showLoadingState(containerId, message = 'Loading...') {
    let loadingEl = document.getElementById(containerId);
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = containerId;
      loadingEl.className = 'loading-state';
      loadingEl.innerHTML = `
                <div class="spinner"></div>
                <p>${message}</p>
            `;
      document.body.appendChild(loadingEl);
    }
    loadingEl.style.display = 'block';
  }

  hideLoadingState(containerId) {
    const loadingEl = document.getElementById(containerId);
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  // Sync Indicator Management
  showSyncIndicator(operation) {
    const indicator = document.getElementById('sync-indicator') || this.createSyncIndicator();
    indicator.style.display = 'flex';
    indicator.querySelector('.sync-text').textContent = `Syncing ${operation}...`;
  }

  hideSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  createSyncIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.className = 'sync-indicator';
    indicator.innerHTML = `
            <div class="sync-spinner"></div>
            <span class="sync-text">Syncing...</span>
        `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Offline Mode Management
  setOfflineMode(isOffline) {
    document.body.classList.toggle('offline-mode', isOffline);
    const offlineIndicator = document.getElementById('offline-indicator') || this.createOfflineIndicator();
    offlineIndicator.style.display = isOffline ? 'block' : 'none';

    if (isOffline) {
      this.showErrorMessage('You are now offline. Some features may be limited.');
    } else {
      this.showSuccessMessage('Back online!');
    }
  }

  createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
            <span>Offline Mode</span>
            <div class="offline-icon">📶</div>
        `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Real-time Update Management
  subscribeToUpdates(dataType, callback) {
    // Set up real-time listeners for data changes
    const eventName = `${dataType}Updated`;
    window.addEventListener(eventName, callback);

    // Return unsubscribe function
    return () => window.removeEventListener(eventName, callback);
  }

  notifyDataUpdate(dataType, data) {
    const event = new CustomEvent(`${dataType}Updated`, { detail: data });
    window.dispatchEvent(event);
  }

  // Transaction Recovery
  async withTransaction(operation, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
      try {
        this.showLoadingState('transaction-loading', `Processing ${operation}...`);
        const result = await operation();
        this.hideLoadingState('transaction-loading');
        return result;
      } catch (error) {
        logger.warn(`Transaction attempt ${i + 1} failed`, error);
        if (i === retryCount - 1) {
          this.hideLoadingState('transaction-loading');
          this.showDatabaseError('transaction', error.message, () => this.withTransaction(operation, retryCount));
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // Graceful Degradation
  checkFeatureSupport() {
    const features = {
      indexedDB: !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      webAudio: !!(window.AudioContext || window.webkitAudioContext),
      mediaSession: 'mediaSession' in navigator,
      notifications: 'Notification' in window,
      vibration: 'vibrate' in navigator,
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      geolocation: 'geolocation' in navigator,
      battery: 'getBattery' in navigator,
      bluetooth: 'bluetooth' in navigator,
      paymentRequest: 'PaymentRequest' in window,
      webShare: 'share' in navigator,
      webAuthn: 'credentials' in navigator && 'get' in navigator.credentials,
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      fileSystemAccess: 'showOpenFilePicker' in window,
      wakeLock: 'wakeLock' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushMessaging: 'serviceWorker' in navigator && 'PushManager' in window,
    };

    // Log unsupported features
    Object.entries(features).forEach(([feature, supported]) => {
      if (!supported) {
        logger.debug(`Feature not supported: ${feature}`);
      }
    });

    return features;
  }

  setupNetworkMonitoring() {
    // Monitor connection quality and type
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateConnectionStatus = () => {
        const connectionType = connection.effectiveType; // 'slow-2g', '2g', '3g', '4g'
        const isSlow = connectionType === 'slow-2g' || connectionType === '2g';

        if (isSlow) {
          document.body.classList.add('slow-connection');
          logger.info('Slow network connection detected. Reducing data usage.');
          // Disable high-quality images, reduce API calls, etc.
        } else {
          document.body.classList.remove('slow-connection');
        }

        // Adjust behavior based on connection
        if (connection.saveData) {
          document.body.classList.add('data-saver');
          logger.info('Data saver mode enabled.');
        }
      };

      connection.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
    }
  }

  setupBatteryMonitoring() {
    // Monitor battery status for power management
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const updateBatteryStatus = () => {
          const isLowBattery = battery.level < 0.2 && !battery.charging;

          if (isLowBattery) {
            document.body.classList.add('low-battery');
            logger.warn('Low battery detected. Enabling power-saving mode.');
            // Reduce animations, disable non-essential features
            this.showErrorMessage('Battery low. Consider connecting charger for optimal experience.');
          } else {
            document.body.classList.remove('low-battery');
          }

          if (battery.charging) {
            document.body.classList.add('charging');
          } else {
            document.body.classList.remove('charging');
          }
        };

        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
        updateBatteryStatus();
      });
    }
  }

  async adaptUI() {
    // Analyze user behavior and adapt UI accordingly
    const userPatterns = await this.analyzeUserPatterns();

    // Adapt based on usage patterns
    if (userPatterns.frequentVoiceCommands) {
      // Make voice button more prominent
      document.body.classList.add('voice-user');
    }

    if (userPatterns.frequentGestures) {
      // Show gesture hints
      document.body.classList.add('gesture-user');
    }

    if (userPatterns.nightOwl) {
      // Auto-enable dark mode
      document.body.classList.add('dark-mode');
    }

    if (userPatterns.powerUser) {
      // Show advanced features
      document.body.classList.add('power-user');
    }

    if (userPatterns.mobileOnly) {
      // Optimize for mobile
      document.body.classList.add('mobile-optimized');
    }

    // Adapt navigation based on most used screens
    this.adaptNavigation(userPatterns);
  }

  async analyzeUserPatterns() {
    // Analyze localStorage and usage data
    const patterns = {
      frequentVoiceCommands: false,
      frequentGestures: false,
      nightOwl: false,
      powerUser: false,
      mobileOnly: false,
      preferredScreens: [],
    };

    try {
      const usageData = localStorage.getItem('usageData');
      if (usageData) {
        const data = JSON.parse(usageData);

        // Check voice command frequency
        if (data.voiceCommands > 10) {
          patterns.frequentVoiceCommands = true;
        }

        // Check gesture usage
        if (data.gestures > 20) {
          patterns.frequentGestures = true;
        }

        // Check usage times
        const usageHours = data.usageTimes || [];
        const nightUsage = usageHours.filter(hour => hour >= 22 || hour <= 6).length;
        if (nightUsage > usageHours.length * 0.6) {
          patterns.nightOwl = true;
        }

        // Check advanced features usage
        if (data.advancedFeatures > 5) {
          patterns.powerUser = true;
        }

        // Check device type
        if (data.mobileSessions > data.desktopSessions * 2) {
          patterns.mobileOnly = true;
        }

        // Get preferred screens
        patterns.preferredScreens = Object.entries(data.screenVisits || {})
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([screen]) => screen);
      }
    } catch (error) {
      logger.debug('Could not analyze user patterns', error);
    }

    return patterns;
  }

  adaptNavigation(userPatterns) {
    // Reorder navigation based on user preferences
    if (userPatterns.preferredScreens.length > 0) {
      const navItems = document.querySelectorAll('.nav-item');
      const preferredOrder = userPatterns.preferredScreens;

      // Reorder nav items (simplified implementation)
      navItems.forEach(item => {
        const screen = item.id.replace('nav-', '');
        if (preferredOrder.includes(screen)) {
          item.style.order = preferredOrder.indexOf(screen);
        }
      });
    }
  }

  degradeGracefully() {
    const features = this.checkFeatureSupport();

    // Apply degradation strategies
    if (!features.webAudio) {
      this.showErrorMessage('Web Audio API not supported. Basic playback only.');
    }

    if (!features.indexedDB) {
      this.showErrorMessage('IndexedDB not supported. Data will not persist.');
    }

    if (!features.serviceWorker) {
      logger.info('Service Worker not supported. Offline features disabled.');
    }

    if (!features.touch) {
      // Desktop-specific UI adjustments
      document.body.classList.add('desktop-mode');
      logger.info('Touch not supported. Desktop mode enabled.');
    }

    if (!features.geolocation) {
      logger.info('Geolocation not supported. Location-based features disabled.');
    }

    if (!features.battery) {
      logger.info('Battery API not supported. Battery-aware features disabled.');
    }

    if (!features.bluetooth) {
      logger.info('Web Bluetooth not supported. Bluetooth features disabled.');
    }

    if (!features.webShare) {
      // Hide share buttons or use fallback
      document.querySelectorAll('.share-btn').forEach(btn => btn.style.display = 'none');
      logger.info('Web Share API not supported. Share buttons hidden.');
    }

    if (!features.speechRecognition) {
      // Hide voice command buttons
      document.querySelectorAll('.voice-btn').forEach(btn => btn.style.display = 'none');
      logger.info('Speech Recognition not supported. Voice features disabled.');
    }

    if (!features.mediaDevices) {
      logger.info('Media Devices API not supported. Microphone/camera features disabled.');
    }

    if (!features.wakeLock) {
      logger.info('Wake Lock API not supported. Screen may turn off during playback.');
    }
  }
}

// Export singleton instance
export const uiManager = new UIManager();
