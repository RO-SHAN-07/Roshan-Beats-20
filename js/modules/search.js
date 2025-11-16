/**
 * Search Module for Roshan Beats PWA
 * Provides full-text search functionality using Fuse.js
 */

import { getSongs } from './storage.js';

class SearchManager {
    constructor() {
        this.fuse = null;
        this.songs = [];
        this.indexed = false;
        this.indexingPromise = null;
    }

    /**
     * Builds searchable index from songs data with lazy loading
     * @param {Array} songs - Array of song objects
     */
    async indexSongs(songs = null) {
        if (this.indexingPromise) {
            return this.indexingPromise;
        }

        this.indexingPromise = this._buildIndex(songs);
        return this.indexingPromise;
    }

    async _buildIndex(songs = null) {
        try {
            if (!songs) {
                songs = await getSongs();
            }

            this.songs = songs || [];

            // Fuse.js options for fuzzy search
            const options = {
                keys: [
                    { name: 'title', weight: 0.4 },
                    { name: 'artist', weight: 0.3 },
                    { name: 'album', weight: 0.2 },
                    { name: 'genre', weight: 0.1 }
                ],
                threshold: 0.3, // Lower threshold for more lenient matching
                includeScore: true,
                includeMatches: true,
                useExtendedSearch: true,
                ignoreLocation: true,
                findAllMatches: true
            };

            this.fuse = new Fuse(this.songs, options);
            this.indexed = true;

            return this.fuse;
        } catch (error) {
            console.error('Error building search index:', error);
            throw error;
        } finally {
            this.indexingPromise = null;
        }
    }

    /**
     * Performs fuzzy search on songs with optional filters
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Filtered search results
     */
    async searchSongs(query, options = {}) {
        if (!this.indexed) {
            await this.indexSongs();
        }

        if (!query || query.trim() === '') {
            return this.songs;
        }

        const results = this.fuse.search(query.trim());

        // Apply additional filters if provided
        let filteredResults = results.map(result => result.item);

        if (options.genre) {
            filteredResults = filteredResults.filter(song =>
                song.genre?.toLowerCase().includes(options.genre.toLowerCase())
            );
        }

        if (options.artist) {
            filteredResults = filteredResults.filter(song =>
                song.artist?.toLowerCase().includes(options.artist.toLowerCase())
            );
        }

        if (options.album) {
            filteredResults = filteredResults.filter(song =>
                song.album?.toLowerCase().includes(options.album.toLowerCase())
            );
        }

        return filteredResults;
    }

    /**
     * Filters songs by genre
     * @param {string} genre - Genre to filter by
     * @returns {Array} Filtered songs
     */
    filterByGenre(genre) {
        if (!genre) return this.songs;
        return this.songs.filter(song =>
            song.genre?.toLowerCase().includes(genre.toLowerCase())
        );
    }

    /**
     * Filters songs by artist
     * @param {string} artist - Artist to filter by
     * @returns {Array} Filtered songs
     */
    filterByArtist(artist) {
        if (!artist) return this.songs;
        return this.songs.filter(song =>
            song.artist?.toLowerCase().includes(artist.toLowerCase())
        );
    }

    /**
     * Filters songs by album
     * @param {string} album - Album to filter by
     * @returns {Array} Filtered songs
     */
    filterByAlbum(album) {
        if (!album) return this.songs;
        return this.songs.filter(song =>
            song.album?.toLowerCase().includes(album.toLowerCase())
        );
    }

    /**
     * Advanced filtering with complex criteria
     * @param {Object} criteria - Filter criteria object
     * @returns {Array} Filtered songs
     */
    advancedFilter(criteria = {}) {
        let results = [...this.songs];

        // Text search
        if (criteria.query) {
            results = results.filter(song => {
                const searchableText = `${song.title} ${song.artist} ${song.album} ${song.genre}`.toLowerCase();
                return searchableText.includes(criteria.query.toLowerCase());
            });
        }

        // Genre filter
        if (criteria.genres && criteria.genres.length > 0) {
            results = results.filter(song =>
                criteria.genres.some(genre =>
                    song.genre?.toLowerCase().includes(genre.toLowerCase())
                )
            );
        }

        // Artist filter
        if (criteria.artists && criteria.artists.length > 0) {
            results = results.filter(song =>
                criteria.artists.some(artist =>
                    song.artist?.toLowerCase().includes(artist.toLowerCase())
                )
            );
        }

        // Album filter
        if (criteria.albums && criteria.albums.length > 0) {
            results = results.filter(song =>
                criteria.albums.some(album =>
                    song.album?.toLowerCase().includes(album.toLowerCase())
                )
            );
        }

        // Duration range
        if (criteria.minDuration !== undefined) {
            results = results.filter(song => song.duration >= criteria.minDuration);
        }
        if (criteria.maxDuration !== undefined) {
            results = results.filter(song => song.duration <= criteria.maxDuration);
        }

        // Year range
        if (criteria.minYear !== undefined) {
            results = results.filter(song => song.year >= criteria.minYear);
        }
        if (criteria.maxYear !== undefined) {
            results = results.filter(song => song.year <= criteria.maxYear);
        }

        return results;
    }

    /**
     * Updates the search index when songs are added/removed
     * @param {Array} songs - Updated songs array
     */
    async updateIndex(songs) {
        this.songs = songs || [];
        this.indexed = false;
        await this.indexSongs(this.songs);
    }

    /**
     * Gets unique values for a field (e.g., genres, artists, albums)
     * @param {string} field - Field name
     * @returns {Array} Unique values
     */
    getUniqueValues(field) {
        const values = this.songs
            .map(song => song[field])
            .filter(value => value && value.trim() !== '')
            .map(value => value.trim());

        return [...new Set(values)].sort();
    }
}

// Export singleton instance
export const searchManager = new SearchManager();