/**
 * UI Module for Roshan Beats PWA
 * Handles screen switching, event delegation, and responsive layout management
 */

import { getSongs, getPlaylists, savePlaylist, createPlaylist, updatePlaylist, deletePlaylist, getPreferences, savePreferences } from './storage.js';
import { searchManager } from './search.js';
import {
  play, pause, stop, seek, setVolume, setPlaybackSpeed, setRepeatMode, toggleShuffle, getRepeatMode,
  setQueue, addToQueue, removeFromQueue, moveInQueue, clearQueue, getQueue,
  playNext, playPrevious, toggleBookmark, isBookmarked, getBookmarks,
  setSleepTimer, cancelSleepTimer, getSleepTimerRemaining,
  setLyrics, getLyrics, setCrossfade, setFadeIn, setNormalization,
  setPitchShift, setTempoShift, setAutoPlaySimilar,
  getCurrentSong, getCurrentTime, getDuration, on
} from './audio.js';

class UIManager {
    constructor() {
        this.currentScreen = 'home';
        this.screens = {};
        this.components = {};
        this.eventListeners = {};
        this.isGridView = true;
        this.init();
    }

    async init() {
        await this.loadComponents();
        await this.loadScreens();
        this.setupEventDelegation();
        this.setupResponsiveLayout();
        this.setupAudioEventListeners();
        await this.loadAudioSettings();
        this.showScreen('home');
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

    showScreen(screenName, data = {}) {
        if (!this.screens[screenName]) {
            console.error(`Screen ${screenName} not found`);
            return;
        }

        // Hide current screen
        const currentScreenEl = document.querySelector('.screen.active');
        if (currentScreenEl) {
            currentScreenEl.classList.remove('active');
        }

        // Remove existing screen content
        const appContainer = document.getElementById('app-container') || document.body;
        const existingScreen = appContainer.querySelector('.screen');
        if (existingScreen) {
            existingScreen.remove();
        }

        // Insert new screen
        appContainer.insertAdjacentHTML('afterbegin', this.screens[screenName]);
        const newScreen = appContainer.querySelector('.screen');
        newScreen.classList.add('active');

        this.currentScreen = screenName;
        this.updateNav();

        // Populate screen with data
        this.populateScreen(screenName, data);

        // Trigger screen-specific logic
        this.onScreenShow(screenName, data);
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
        try {
            // Show loading state
            this.showLoadingState('loading-state', 'Loading your music library...');

            let songs = await getSongs();

            // Index songs for search
            await searchManager.updateIndex(songs);

            // Apply search and filters
            const searchQuery = document.getElementById('search-input')?.value?.trim() || '';
            const genreFilter = document.getElementById('genre-filter')?.value || '';
            const artistFilter = document.getElementById('artist-filter')?.value || '';
            const albumFilter = document.getElementById('album-filter')?.value || '';

            if (searchQuery) {
                songs = await searchManager.searchSongs(searchQuery, {
                    genre: genreFilter,
                    artist: artistFilter,
                    album: albumFilter
                });
            } else {
                // Apply filters without search
                if (genreFilter) {
                    songs = searchManager.filterByGenre(genreFilter);
                }
                if (artistFilter) {
                    songs = searchManager.filterByArtist(artistFilter);
                }
                if (albumFilter) {
                    songs = searchManager.filterByAlbum(albumFilter);
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
                if (el) el.style.display = 'none';
            });

            // Get all songs to check if library is empty
            const allSongs = await getSongs();

            if (!allSongs || allSongs.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            if (!songs || songs.length === 0) {
                noResultsState.style.display = 'block';
                return;
            }

            // Show content
            if (this.isGridView) {
                songGrid.style.display = 'grid';
                this.renderSongGrid(songs, songGrid);
            } else {
                songList.style.display = 'block';
                this.renderSongList(songs, songList);
            }

            // Populate filter dropdowns
            this.populateFilterDropdowns();

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
                    notifications: 'Enable notifications for playback alerts'
                };
                messageEl.textContent = messages[permissionType] || messages.storage;
            }
        }
    }

    showDatabaseError(message = 'Database error occurred') {
        const dbState = document.getElementById('database-error-state');
        if (dbState) {
            const messageEl = dbState.querySelector('p');
            if (messageEl) messageEl.textContent = message;
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
        if (!playlist) return;

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
                this.showScreen('playlists');
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
                if (playPauseBtn) playPauseBtn.click();
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
        // Show loading state
        const loadingState = document.getElementById('loading-state');
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress-fill" id="import-progress"></div>';
        loadingState.appendChild(progressBar);

        loadingState.style.display = 'block';

        let imported = 0;
        const total = files.length;
        const progressFill = document.getElementById('import-progress');

        // Process files (this would integrate with storage module)
        for (const file of files) {
            try {
                // Extract metadata and save to storage
                console.log('Importing:', file.name);
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 100));
                imported++;
                if (progressFill) {
                    progressFill.style.width = `${(imported / total) * 100}%`;
                }
            } catch (error) {
                console.error('Error importing file:', file.name, error);
                // Show error message with retry
                this.showErrorMessage(`Failed to import ${file.name}`, () => {
                    // Retry import for this file
                    this.handleFileImport([file]);
                });
            }
        }

        // Hide loading state
        loadingState.style.display = 'none';
        if (progressBar.parentNode) {
            progressBar.remove();
        }

        // Refresh library
        await this.populateSongLibrary();

        // Show success message
        if (imported > 0) {
            this.showSuccessMessage(`Imported ${imported} songs successfully`);
            this.vibrate([100, 50, 100]);
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
        // Set up queue with this song and play it
        setQueue([song], 0);
        play(song);
        // Show mini player
        document.getElementById('mini-player').style.display = 'flex';
        // Haptic feedback
        this.vibrate([30]);
    }

    onScreenShow(screenName, data) {
        // Screen-specific initialization
        switch (screenName) {
            case 'home':
                // Focus search if needed
                break;
            case 'player':
                // Initialize player controls
                break;
            case 'playlist-detail':
                this.setupPlaylistDragAndDrop(data.playlistId);
                break;
            case 'onboarding':
                this.initOnboarding();
                break;
        }
    }

    setupPlaylistDragAndDrop(playlistId) {
        const songList = document.getElementById('playlist-songs');
        if (!songList) return;

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

            if (!draggedElement || !placeholder) return;

            const draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
            const placeholderIndex = Array.from(songList.children).indexOf(placeholder);

            // Remove placeholder
            placeholder.remove();
            placeholder = null;

            // If position didn't change, do nothing
            if (draggedIndex === placeholderIndex) return;

            // Get current playlist
            const playlists = await getPlaylists();
            const playlist = playlists.find(p => p.id === playlistId);
            if (!playlist || !playlist.songs) return;

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

        if (genreFilter) genreFilter.value = '';
        if (artistFilter) artistFilter.value = '';
        if (albumFilter) albumFilter.value = '';

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
            'Try partial words or phrases'
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
            userAgent: navigator.userAgent
        };
        logger.error('User reported playback issue', null, issue);
        this.showSuccessMessage('Issue reported. Thank you for helping improve the app!');
    }

    async searchLyrics() {
        const currentSong = getCurrentSong();
        if (!currentSong) return;

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
        if (errorEl) errorEl.style.display = 'none';
        const contentEl = document.getElementById('player-content');
        if (contentEl) contentEl.style.display = 'block';
    }

    hidePlaybackError() {
        const errorEl = document.getElementById('network-playback-error');
        if (errorEl) errorEl.style.display = 'none';
        const contentEl = document.getElementById('player-content');
        if (contentEl) contentEl.style.display = 'block';
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
                if (el) el.style.display = 'none';
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
            if (errorState) errorState.style.display = 'block';
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
                if (el) el.style.display = 'none';
            });

            if (titleEl) titleEl.textContent = playlist.name;

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
            if (errorState) errorState.style.display = 'block';
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

        if (nameInput) nameInput.focus();

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
                if (nameInput) nameInput.value = '';
                if (descInput) descInput.value = '';
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

        if (nameInput) nameInput.value = playlist.name || '';
        if (descInput) descInput.value = playlist.description || '';

        modal.style.display = 'block';
        if (nameInput) nameInput.focus();

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
                playlist.songs?.find(song => song.id === songId)
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

    vibrate(pattern = [50]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    setupAudioEventListeners() {
        // Audio event listeners
        on('play', () => this.updatePlayerUI());
        on('pause', () => this.updatePlayerUI());
        on('ended', () => this.updatePlayerUI());
        on('timeupdate', () => this.updateProgress());
        on('loaded', () => this.updatePlayerUI());
        on('queueChanged', (data) => this.updateQueueDisplay(data));
        on('repeatModeChanged', (mode) => this.updateRepeatButton(mode));
        on('shuffleChanged', (enabled) => this.updateShuffleButton(enabled));
        on('bookmarksChanged', (bookmarks) => this.updateBookmarks(bookmarks));
        on('sleepTimerSet', (minutes) => this.showSleepTimer(minutes));
        on('sleepTimerCancelled', () => this.hideSleepTimer());
        on('lyricsLoaded', (lyrics) => this.displayLyrics(lyrics));
        on('lyricsSync', (data) => this.syncLyrics(data));

        // Error event listeners
        on('audioContextSuspended', () => this.showAudioContextError());
        on('fileCorrupted', (data) => this.showFileCorruptionError(data));
        on('networkError', () => this.showNetworkPlaybackError());
        on('playbackError', (error) => this.handlePlaybackError(error));

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
        if (currentTimeEl) currentTimeEl.textContent = this.formatDuration(currentTime);
        if (durationEl) durationEl.textContent = this.formatDuration(duration);
    }

    updateQueueDisplay(data) {
        const queueList = document.getElementById('queue-list');
        if (!queueList) return;

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
        if (!lyricsContent) return;

        if (!lyrics || lyrics.length === 0) {
            lyricsContent.innerHTML = '<div class="no-lyrics">No lyrics available</div>';
            return;
        }

        lyricsContent.innerHTML = lyrics.map((line, index) =>
            `<div class="lyrics-line" data-index="${index}">${line.text}</div>`
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
                if (prefs.repeatMode) setRepeatMode(prefs.repeatMode);
                if (prefs.crossfadeEnabled !== undefined) setCrossfade(prefs.crossfadeEnabled, prefs.crossfadeDuration || 3);
                if (prefs.fadeInEnabled !== undefined) setFadeIn(prefs.fadeInEnabled, prefs.fadeInDuration || 1);
                if (prefs.normalizationEnabled !== undefined) setNormalization(prefs.normalizationEnabled);
                if (prefs.pitchShift !== undefined) setPitchShift(prefs.pitchShift);
                if (prefs.tempoShift !== undefined) setTempoShift(prefs.tempoShift);
                if (prefs.autoPlaySimilar !== undefined) setAutoPlaySimilar(prefs.autoPlaySimilar);

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
                autoPlaySimilar: document.getElementById('autoplay-similar')?.checked || false
            };

            await savePreferences(prefs);
        } catch (error) {
            console.error('Failed to save audio settings:', error);
        }
    }

    initOnboarding() {
        let currentStep = 1;
        const totalSteps = 6;

        const showStep = (step) => {
            document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
            document.getElementById(`step${step}`).classList.add('active');
            document.querySelectorAll('.indicator').forEach(i => i.classList.remove('active'));
            document.querySelector(`.indicator[data-step="${step}"]`).classList.add('active');
            currentStep = step;
        };

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
            // Save preferences
            const theme = document.getElementById('onboard-theme').value;
            const eq = document.getElementById('onboard-eq').value;
            // Apply theme
            document.body.className = `theme-${theme}`;
            // TODO: Apply EQ preset
            showStep(6);
        });
        document.getElementById('prev-step6').addEventListener('click', () => showStep(5));
        document.getElementById('finish-onboarding').addEventListener('click', () => {
            // Mark onboarding as complete
            localStorage.setItem('onboardingComplete', 'true');
            this.vibrate([200]);
            this.showScreen('home');
        });
    }

    // ===== COMPREHENSIVE STATE MANAGEMENT FUNCTIONS =====

    // Network Error Handling
    showNetworkError(retryCallback = null) {
        this.showErrorMessage(
            'Network connection lost. Please check your internet connection.',
            retryCallback
        );
        this.setOfflineMode(true);
    }

    // Permission Denied Handling
    showPermissionError(permissionType, guidance = '') {
        const messages = {
            storage: 'Storage access is required to save your music library. Please grant storage permissions in your browser settings.',
            microphone: 'Microphone access is needed for voice commands. Please allow microphone access.',
            notifications: 'Notification permission is required for playback alerts. Please enable notifications.'
        };

        const message = messages[permissionType] || `Permission denied for ${permissionType}. ${guidance}`;
        this.showErrorMessage(message, () => {
            // Attempt to request permission again
            this.requestPermission(permissionType);
        });
    }

    async requestPermission(permissionType) {
        try {
            switch (permissionType) {
                case 'storage':
                    if ('storage' in navigator && 'persist' in navigator.storage) {
                        await navigator.storage.persist();
                    }
                    break;
                case 'microphone':
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    break;
                case 'notifications':
                    await Notification.requestPermission();
                    break;
            }
            this.showSuccessMessage(`${permissionType} permission granted`);
        } catch (error) {
            logger.error(`Failed to request ${permissionType} permission`, error);
            this.showPermissionError(permissionType, 'Please check your browser settings.');
        }
    }

    // File Error Handling
    showFileError(fileName, errorType, retryCallback = null) {
        const messages = {
            corruption: `File "${fileName}" appears to be corrupted or unsupported.`,
            format: `File "${fileName}" format is not supported. Supported formats: MP3, WAV, FLAC, OGG.`,
            size: `File "${fileName}" is too large. Maximum file size is 100MB.`
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
            transaction: 'Database operation failed. Retrying...'
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
            retryCallback || (() => this.resumeAudioContext())
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
            sync: 'Background sync failed. Changes may not be saved offline.'
        };

        const message = messages[errorType] || `Service worker error: ${details}`;
        this.showErrorMessage(message);
        logger.error(`Service worker ${errorType} error`, { details });
    }

    // Import/Export Error Handling
    showImportExportError(operation, details = '', retryCallback = null) {
        const messages = {
            import: `Import failed: ${details}`,
            export: `Export failed: ${details}`
        };

        const message = messages[operation] || `${operation} operation failed: ${details}`;
        this.showErrorMessage(message, retryCallback);
    }

    // API Error Handling
    showApiError(apiName, details = '', retryCallback = null) {
        const messages = {
            lyrics: 'Unable to fetch lyrics. You can add them manually.',
            albumart: 'Unable to fetch album art. Using default image.',
            search: 'Search service temporarily unavailable. Try again later.'
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
            'lyrics': 'lyrics-empty'
        };

        const stateId = containers[stateType] || containerId;
        const emptyState = document.getElementById(stateId);
        if (!emptyState) return;

        // Customize message if provided
        if (customMessage) {
            const messageEl = emptyState.querySelector('p') || emptyState.querySelector('h2');
            if (messageEl) messageEl.textContent = customMessage;
        }

        emptyState.style.display = 'block';

        // Hide other content
        const contentSelectors = {
            'song-library': ['#song-grid', '#song-list', '#loading-state'],
            'playlists': ['#playlist-grid'],
            'playlist-detail': ['#playlist-songs'],
            'search-results': ['#song-grid', '#song-list']
        };

        const selectors = contentSelectors[stateType];
        if (selectors) {
            selectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.style.display = 'none';
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
            'lyrics': 'lyrics-empty'
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
            vibration: 'vibrate' in navigator
        };

        // Log unsupported features
        Object.entries(features).forEach(([feature, supported]) => {
            if (!supported) {
                logger.warn(`Feature not supported: ${feature}`);
            }
        });

        return features;
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
    }
}

// Export singleton instance
export const uiManager = new UIManager();