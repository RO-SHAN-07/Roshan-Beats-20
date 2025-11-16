class RecommendationEngine {
  constructor() {
    this.playHistory = [];
    this.userPreferences = {};
  }

  async init() {
    // Load play history from storage
    this.playHistory = JSON.parse(localStorage.getItem('playHistory') || '[]');
    this.userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
  }

  recordPlay(song) {
    const playRecord = {
      songId: song.id,
      artist: song.artist,
      genre: song.genre,
      timestamp: Date.now(),
      duration: song.duration,
    };

    this.playHistory.push(playRecord);

    // Keep only last 100 plays
    if (this.playHistory.length > 100) {
      this.playHistory = this.playHistory.slice(-100);
    }

    localStorage.setItem('playHistory', JSON.stringify(this.playHistory));
  }

  getRecommendations(songs, limit = 10) {
    if (this.playHistory.length === 0) {
      // Return popular songs if no history
      return songs.slice(0, limit);
    }

    // Simple recommendation algorithm
    const artistScores = {};
    const genreScores = {};

    // Calculate scores based on play history
    this.playHistory.forEach(play => {
      // Artist preference
      artistScores[play.artist] = (artistScores[play.artist] || 0) + 1;

      // Genre preference
      genreScores[play.genre] = (genreScores[play.genre] || 0) + 1;
    });

    // Score songs based on preferences
    const scoredSongs = songs.map(song => {
      let score = 0;

      // Boost score for preferred artists
      if (artistScores[song.artist]) {
        score += artistScores[song.artist] * 2;
      }

      // Boost score for preferred genres
      if (genreScores[song.genre]) {
        score += genreScores[song.genre];
      }

      // Boost score for recently played songs (variety)
      const recentlyPlayed = this.playHistory.slice(-10).some(play => play.songId === song.id);
      if (!recentlyPlayed) {
        score += 0.5;
      }

      return { ...song, recommendationScore: score };
    });

    // Sort by score and return top recommendations
    return scoredSongs
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  getSimilarSongs(currentSong, songs, limit = 5) {
    return songs
      .filter(song => song.id !== currentSong.id)
      .map(song => {
        let similarity = 0;

        // Same artist
        if (song.artist === currentSong.artist) {
          similarity += 3;
        }

        // Same genre
        if (song.genre === currentSong.genre) {
          similarity += 2;
        }

        // Same album (if available)
        if (song.album === currentSong.album) {
          similarity += 1;
        }

        return { ...song, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  updatePreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
  }
}

export default new RecommendationEngine();
