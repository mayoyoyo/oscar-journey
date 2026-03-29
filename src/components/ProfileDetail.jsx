import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import { fetchOmdbData } from '../utils/omdb';

// Small component to lazily load a poster for a movie tile
function FilmTilePoster({ movie }) {
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchOmdbData(movie).then(data => {
      if (!cancelled) {
        if (data?.poster) setPoster(data.poster);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [movie.title, movie.year]);

  if (loading) {
    return <div className="film-tile-poster-placeholder"><div className="spinner" style={{ width: 24, height: 24 }} /></div>;
  }
  if (poster) {
    return <img className="film-tile-poster" src={poster} alt={movie.title} onError={(e) => { e.target.style.display = 'none'; }} />;
  }
  return <div className="film-tile-poster-placeholder">🎬</div>;
}

// Renders the full detail view for a single profile
export default function ProfileDetail({ profileData, onBack, currentProfile, currentRatings, onOpenDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnwatched, setShowUnwatched] = useState(false);
  const [sortMode, setSortMode] = useState('az'); // 'az' | 'rating'

  // Resolve watched movies from the profile's playlistOrder + watched indices
  const watchedMovies = useMemo(() => {
    if (!profileData || !Array.isArray(profileData.watched)) return [];
    const order = profileData.playlistOrder;
    if (!Array.isArray(order)) return [];
    return profileData.watched
      .filter(idx => idx >= 0 && idx < order.length)
      .map(idx => {
        const moviesIdx = order[idx];
        return MOVIES[moviesIdx];
      })
      .filter(Boolean);
  }, [profileData]);

  // Unwatched movies: all MOVIES not in watchedMovies
  const unwatchedMovies = useMemo(() => {
    const watchedKeys = new Set(watchedMovies.map(m => m.title + '|' + m.year));
    return MOVIES.filter(m => !watchedKeys.has(m.title + '|' + m.year))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [watchedMovies]);

  // Sort watched movies based on current sort mode
  const sortedWatched = useMemo(() => {
    const movies = [...watchedMovies];
    if (sortMode === 'rating') {
      // Sort by highest average rating from this profile's raters (descending)
      const ratings = profileData.ratings || {};
      const profileRatersList = profileData.raters || [];
      return movies.sort((a, b) => {
        const aKey = ratingKey(a);
        const bKey = ratingKey(b);
        const aRatings = ratings[aKey] || {};
        const bRatings = ratings[bKey] || {};
        const avgOf = (r) => {
          const vals = profileRatersList.map(name => r[name]).filter(v => v != null);
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        };
        return avgOf(bRatings) - avgOf(aRatings);
      });
    }
    return movies.sort((a, b) => a.title.localeCompare(b.title));
  }, [watchedMovies, sortMode, profileData]);

  // Filter watched movies by search query
  const filteredWatched = useMemo(() => {
    if (!searchQuery.trim()) return sortedWatched;
    const q = searchQuery.toLowerCase().trim();
    return sortedWatched.filter(m =>
      m.title.toLowerCase().includes(q) ||
      String(m.year).includes(q) ||
      (GENRE_LABELS[m.genre] || '').toLowerCase().includes(q)
    );
  }, [sortedWatched, searchQuery]);

  // Compute summary stats
  const stats = useMemo(() => {
    const ratings = profileData.ratings || {};
    let totalRating = 0;
    let ratingCount = 0;
    const genreRatings = {};

    for (const m of MOVIES) {
      const key = ratingKey(m);
      const r = ratings[key];
      if (!r) continue;
      for (const val of Object.values(r)) {
        if (val != null) {
          totalRating += val;
          ratingCount++;
          if (!genreRatings[m.genre]) genreRatings[m.genre] = { total: 0, count: 0 };
          genreRatings[m.genre].total += val;
          genreRatings[m.genre].count++;
        }
      }
    }

    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '--';

    // Favorite genre: highest avg with min 3 ratings
    let favGenre = '--';
    let favGenreAvg = 0;
    for (const [code, data] of Object.entries(genreRatings)) {
      if (data.count >= 3) {
        const avg = data.total / data.count;
        if (avg > favGenreAvg) {
          favGenreAvg = avg;
          favGenre = GENRE_LABELS[code] || code;
        }
      }
    }

    return {
      watchedCount: watchedMovies.length,
      avgRating,
      ratingCount,
      favGenre,
    };
  }, [profileData, watchedMovies]);

  // Member since
  const memberSince = useMemo(() => {
    if (!profileData.createdAt) return null;
    const d = profileData.createdAt.toDate
      ? profileData.createdAt.toDate()
      : new Date(profileData.createdAt);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [profileData]);

  // Get the ratings object for a specific movie from this profile
  const getProfileRatings = (movie) => {
    const key = ratingKey(movie);
    return profileData.ratings?.[key] || {};
  };

  // Get the current viewer's ratings for a specific movie
  const getViewerRating = (movie) => {
    if (!currentProfile || !currentRatings) return null;
    const key = ratingKey(movie);
    const movieRatings = currentRatings[key];
    if (!movieRatings) return null;
    // Find the viewer's own rating (first rater entry that matches the viewer's display name)
    const viewerName = currentProfile.displayName || currentProfile.id;
    if (movieRatings[viewerName] != null) return { name: viewerName, value: movieRatings[viewerName] };
    // Also check all entries - the viewer might have a single rating
    return null;
  };

  // Check if this is the viewer's own profile
  const isOwnProfile = currentProfile && currentProfile.id === profileData.id;

  // Profile raters list
  const profileRaters = profileData.raters || [];

  return (
    <div className="profile-detail">
      <button className="profile-detail-back" onClick={onBack}>
        &larr; Back to Leaderboard
      </button>

      {/* Header */}
      <div className="profile-detail-header">
        <div className="profile-detail-name">
          {profileData.avatar && <span className="profile-detail-avatar">{profileData.avatar}</span>}
          {profileData.displayName || profileData.id}
        </div>
        {memberSince && (
          <div className="profile-detail-joined">Member since {memberSince}</div>
        )}

        <div className="profile-detail-summary">
          <div className="profile-summary-item">
            <div className="profile-summary-value">{stats.watchedCount}</div>
            <div className="profile-summary-label">Films Watched</div>
          </div>
          <div className="profile-summary-item">
            <div className="profile-summary-value">{stats.avgRating}</div>
            <div className="profile-summary-label">Avg Rating</div>
          </div>
          <div className="profile-summary-item">
            <div className="profile-summary-value">{stats.ratingCount}</div>
            <div className="profile-summary-label">Total Ratings</div>
          </div>
          <div className="profile-summary-item">
            <div className="profile-summary-value" style={{ fontSize: stats.favGenre.length > 12 ? '1rem' : undefined }}>
              {stats.favGenre}
            </div>
            <div className="profile-summary-label">Fav Genre</div>
          </div>
        </div>
      </div>

      {/* Watched Films */}
      <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--gold)', marginBottom: '16px' }}>
        Watched Films ({stats.watchedCount})
      </h2>

      <input
        className="profile-films-search"
        type="text"
        placeholder="Search films..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {/* Sort bar */}
      <div className="profile-sort-bar">
        <button
          className={`sort-btn ${sortMode === 'az' ? 'active' : ''}`}
          onClick={() => setSortMode('az')}
        >
          A-Z
        </button>
        <button
          className={`sort-btn ${sortMode === 'rating' ? 'active' : ''}`}
          onClick={() => setSortMode('rating')}
        >
          Highest Rated
        </button>
      </div>

      {filteredWatched.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic', fontSize: '0.9rem', padding: '12px 0' }}>
          {searchQuery ? 'No films match your search.' : 'No films watched yet.'}
        </p>
      ) : (
        <div className="film-tiles">
          {filteredWatched.map(movie => {
            const movieRatings = getProfileRatings(movie);
            const viewerRating = !isOwnProfile ? getViewerRating(movie) : null;

            return (
              <div className="film-tile" key={movie.title + '|' + movie.year}
                style={{ cursor: onOpenDetail ? 'pointer' : 'default' }}
                onClick={() => onOpenDetail && onOpenDetail(movie)}>
                <div className="film-tile-poster-wrap">
                  <FilmTilePoster movie={movie} />
                  {movie.won && <span className="film-tile-winner">Winner</span>}
                </div>
                <div className="film-tile-info">
                  <div className="film-tile-title">{movie.title}</div>
                  <div className="film-tile-year">{movie.year}</div>
                  <div className="film-tile-ratings">
                    {profileRaters.map(rater => {
                      const val = movieRatings[rater];
                      if (val == null) return null;
                      return (
                        <span className="film-tile-rating" key={rater}>
                          {rater}: <span className="rating-value">{val.toFixed(1)}</span>
                        </span>
                      );
                    })}
                    {viewerRating && (
                      <span className="film-tile-rating viewer-rating">
                        You: <span className="rating-value">{viewerRating.value.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Not Yet Watched (collapsed by default) */}
      <button
        className="profile-unwatched-toggle"
        onClick={() => setShowUnwatched(prev => !prev)}
      >
        {showUnwatched ? 'Hide' : 'Show'} Not Yet Watched ({unwatchedMovies.length} films remaining)
      </button>

      {showUnwatched && (
        <div>
          {unwatchedMovies.map(movie => (
            <div className="profile-unwatched-row" key={movie.title + '|' + movie.year}>
              <span>{movie.title}</span>
              <span style={{ marginLeft: 'auto' }}>{movie.year}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
