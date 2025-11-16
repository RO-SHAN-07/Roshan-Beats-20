// Search Indexing Web Worker for Roshan Beats PWA
// Handles heavy search indexing operations off the main thread

// In-memory search index
let searchIndex = {
    songs: [],
    artists: new Set(),
    albums: new Set(),
    genres: new Set(),
    playlists: []
};

// Fuzzy search utilities
function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function fuzzyMatch(query, text, threshold = 0.6) {
    if (!query || !text) return 0;

    query = query.toLowerCase();
    text = text.toLowerCase();

    // Exact match gets highest score
    if (text.includes(query)) return 1;

    // Prefix match gets high score
    if (text.startsWith(query)) return 0.9;

    // Calculate Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(query, text);
    const maxLength = Math.max(query.length, text.length);
    const similarity = 1 - (distance / maxLength);

    return similarity >= threshold ? similarity : 0;
}

// Build search index from songs data
function buildSearchIndex(songs) {
    console.log('Building search index for', songs.length, 'songs');

    searchIndex = {
        songs: [],
        artists: new Set(),
        albums: new Set(),
        genres: new Set(),
        playlists: []
    };

    songs.forEach(song => {
        // Index song data
        const songIndex = {
            id: song.id,
            title: song.title || '',
            artist: song.artist || '',
            album: song.album || '',
            genre: song.genre || '',
            searchableText: `${song.title} ${song.artist} ${song.album} ${song.genre}`.toLowerCase(),
            score: 0 // Will be calculated during search
        };

        searchIndex.songs.push(songIndex);

        // Collect unique values for filters
        if (song.artist) searchIndex.artists.add(song.artist);
        if (song.album) searchIndex.albums.add(song.album);
        if (song.genre) searchIndex.genres.add(song.genre);
    });

    // Convert sets to sorted arrays
    searchIndex.artists = Array.from(searchIndex.artists).sort();
    searchIndex.albums = Array.from(searchIndex.albums).sort();
    searchIndex.genres = Array.from(searchIndex.genres).sort();

    console.log('Search index built successfully');
    return { success: true, indexSize: searchIndex.songs.length };
}

// Perform search with scoring
function performSearch(query, filters = {}) {
    if (!query || query.trim().length === 0) {
        return { results: [], total: 0 };
    }

    const searchTerm = query.trim().toLowerCase();
    const results = [];

    // Search through songs
    searchIndex.songs.forEach(song => {
        let score = 0;
        let matches = [];

        // Title match (highest weight)
        const titleScore = fuzzyMatch(searchTerm, song.title);
        if (titleScore > 0) {
            score += titleScore * 3;
            matches.push('title');
        }

        // Artist match (high weight)
        const artistScore = fuzzyMatch(searchTerm, song.artist);
        if (artistScore > 0) {
            score += artistScore * 2;
            matches.push('artist');
        }

        // Album match (medium weight)
        const albumScore = fuzzyMatch(searchTerm, song.album);
        if (albumScore > 0) {
            score += albumScore * 1.5;
            matches.push('album');
        }

        // Genre match (low weight)
        const genreScore = fuzzyMatch(searchTerm, song.genre);
        if (genreScore > 0) {
            score += genreScore * 1;
            matches.push('genre');
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
            results.push({
                ...song,
                score,
                matches,
                highlight: generateHighlight(song, searchTerm)
            });
        }
    });

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Limit results for performance
    const limitedResults = results.slice(0, 100);

    return {
        results: limitedResults,
        total: results.length,
        query,
        filters
    };
}

// Generate highlight text for search results
function generateHighlight(song, searchTerm) {
    const text = song.searchableText;
    const index = text.indexOf(searchTerm);

    if (index === -1) return song.title;

    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + searchTerm.length + 20);
    let highlight = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) highlight = '...' + highlight;
    if (end < text.length) highlight = highlight + '...';

    return highlight;
}

// Get filter options
function getFilterOptions() {
    return {
        artists: searchIndex.artists,
        albums: searchIndex.albums,
        genres: searchIndex.genres
    };
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'BUILD_INDEX':
                const result = buildSearchIndex(data.songs);
                self.postMessage({ type: 'INDEX_BUILT', data: result });
                break;

            case 'SEARCH':
                const searchResults = performSearch(data.query, data.filters);
                self.postMessage({ type: 'SEARCH_RESULTS', data: searchResults });
                break;

            case 'GET_FILTERS':
                const filters = getFilterOptions();
                self.postMessage({ type: 'FILTER_OPTIONS', data: filters });
                break;

            case 'UPDATE_SONG':
                // Update specific song in index
                const songIndex = searchIndex.songs.findIndex(s => s.id === data.song.id);
                if (songIndex !== -1) {
                    searchIndex.songs[songIndex] = {
                        ...searchIndex.songs[songIndex],
                        ...data.song,
                        searchableText: `${data.song.title} ${data.song.artist} ${data.song.album} ${data.song.genre}`.toLowerCase()
                    };
                }
                self.postMessage({ type: 'SONG_UPDATED', data: { success: true } });
                break;

            case 'ADD_SONG':
                // Add new song to index
                const newSongIndex = {
                    id: data.song.id,
                    title: data.song.title || '',
                    artist: data.song.artist || '',
                    album: data.song.album || '',
                    genre: data.song.genre || '',
                    searchableText: `${data.song.title} ${data.song.artist} ${data.song.album} ${data.song.genre}`.toLowerCase(),
                    score: 0
                };

                searchIndex.songs.push(newSongIndex);

                // Update filter sets
                if (data.song.artist) searchIndex.artists.add(data.song.artist);
                if (data.song.album) searchIndex.albums.add(data.song.album);
                if (data.song.genre) searchIndex.genres.add(data.song.genre);

                self.postMessage({ type: 'SONG_ADDED', data: { success: true } });
                break;

            case 'REMOVE_SONG':
                // Remove song from index
                searchIndex.songs = searchIndex.songs.filter(s => s.id !== data.songId);
                self.postMessage({ type: 'SONG_REMOVED', data: { success: true } });
                break;

            default:
                self.postMessage({ type: 'ERROR', data: { message: 'Unknown message type: ' + type } });
        }
    } catch (error) {
        console.error('Search worker error:', error);
        self.postMessage({
            type: 'ERROR',
            data: {
                message: error.message,
                stack: error.stack
            }
        });
    }
};

// Performance monitoring
let searchCount = 0;
let totalSearchTime = 0;

function recordSearchPerformance(startTime) {
    const duration = Date.now() - startTime;
    searchCount++;
    totalSearchTime += duration;

    // Log average search time every 10 searches
    if (searchCount % 10 === 0) {
        console.log(`Average search time: ${totalSearchTime / searchCount}ms over ${searchCount} searches`);
    }
}