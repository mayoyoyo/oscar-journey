import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, MOVIES_BY_ID, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import { fetchOmdbData } from '../utils/omdb';
import { RARITIES, getCollectorScore, getMaxWallet } from '../utils/cards';
import StatsTab from './StatsTab';

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
export default function ProfileDetail({ profileData, onBack, currentProfile, currentRatings, onOpenDetail, onSaveProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnwatched, setShowUnwatched] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [sortMode, setSortMode] = useState('az'); // 'az' | 'rating'

  // If focusRater is set, we only show that single rater's data
  const focusRater = profileData.focusRater || null;

  // Resolve watched movies from the profile's watched array (movie IDs)
  const watchedMovies = useMemo(() => {
    if (!profileData || !Array.isArray(profileData.watched)) return [];
    const watched = profileData.watched;
    if (watched.length === 0) return [];
    const first = watched[0];

    if (typeof first === 'number') {
      // OLD FORMAT: numeric indices into playlistOrder
      const order = profileData.playlistOrder;
      if (!Array.isArray(order)) return [];
      return watched
        .filter(idx => idx >= 0 && idx < order.length)
        .map(idx => {
          const moviesIdx = order[idx];
          return MOVIES[moviesIdx];
        })
        .filter(Boolean);
    } else if (typeof first === 'string' && first.includes('|')) {
      // INTERMEDIATE FORMAT: "Title|year" strings
      return watched.map(key => {
        const sepIdx = key.lastIndexOf('|');
        const title = key.substring(0, sepIdx);
        const yearStr = key.substring(sepIdx + 1);
        return MOVIES.find(m => m.title === title && String(m.year) === yearStr);
      }).filter(Boolean);
    } else {
      // NEW FORMAT: movie IDs
      return watched.map(id => MOVIES_BY_ID[id]).filter(Boolean);
    }
  }, [profileData]);

  // Skipped films
  const skippedMovies = useMemo(() => {
    const skippedIds = profileData.skippedFilms || [];
    return skippedIds.map(id => MOVIES_BY_ID[id]).filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [profileData]);

  // Unwatched movies: all MOVIES not in watchedMovies
  const unwatchedMovies = useMemo(() => {
    const watchedIds = new Set(watchedMovies.map(m => m.id));
    return MOVIES.filter(m => !watchedIds.has(m.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [watchedMovies]);

  // Sort watched movies based on current sort mode
  const sortedWatched = useMemo(() => {
    const movies = [...watchedMovies];
    if (sortMode === 'rating') {
      // Sort by highest average rating from this profile's raters (descending)
      // Use live ratings for own profile
      const isOwn = currentProfile && currentProfile.id === profileData.id;
      const ratings = (isOwn && currentRatings) ? currentRatings : (profileData.ratings || {});
      const profileRatersList = focusRater ? [focusRater] : (profileData.raters || []);
      return movies.sort((a, b) => {
        const aKey = ratingKey(a);
        const bKey = ratingKey(b);
        const aLegacy = `${a.title}|${a.year}`;
        const bLegacy = `${b.title}|${b.year}`;
        const aRatings = ratings[aKey] || ratings[aLegacy] || {};
        const bRatings = ratings[bKey] || ratings[bLegacy] || {};
        const avgOf = (r) => {
          const vals = profileRatersList.map(name => r[name]).filter(v => v != null);
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        };
        return avgOf(bRatings) - avgOf(aRatings);
      });
    }
    return movies.sort((a, b) => a.title.localeCompare(b.title));
  }, [watchedMovies, sortMode, profileData, currentProfile, currentRatings]);

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

  // Compute summary stats (respects focusRater when set)
  const stats = useMemo(() => {
    // Use live ratings for own profile
    const isOwn = currentProfile && currentProfile.id === profileData.id;
    const ratings = (isOwn && currentRatings) ? currentRatings : (profileData.ratings || {});
    let totalRating = 0;
    let ratingCount = 0;
    const genreRatings = {};

    for (const m of MOVIES) {
      const key = ratingKey(m);
      const legacyKey = `${m.title}|${m.year}`;
      const r = ratings[key] || ratings[legacyKey];
      if (!r) continue;
      if (focusRater) {
        // Only count the focused rater's ratings
        const val = r[focusRater];
        if (val != null) {
          totalRating += val;
          ratingCount++;
          if (!genreRatings[m.genre]) genreRatings[m.genre] = { total: 0, count: 0 };
          genreRatings[m.genre].total += val;
          genreRatings[m.genre].count++;
        }
      } else {
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
  }, [profileData, watchedMovies, currentProfile, currentRatings, focusRater]);

  // Current journey movie
  const currentJourneyMovie = useMemo(() => {
    const idx = profileData.currentIdx;
    const order = profileData.playlistOrder;
    if (idx == null || !Array.isArray(order) || order.length === 0) return null;
    const entry = order[idx];
    if (entry == null) return null;
    // New format: string movie ID
    if (typeof entry === 'string' && !entry.includes('|') && isNaN(Number(entry))) {
      return MOVIES_BY_ID[entry] || null;
    }
    // Old numeric format — can't resolve reliably
    return null;
  }, [profileData]);

  // Member since
  const memberSince = useMemo(() => {
    if (!profileData.createdAt) return null;
    const d = profileData.createdAt.toDate
      ? profileData.createdAt.toDate()
      : new Date(profileData.createdAt);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [profileData]);

  // Check if this is the viewer's own profile
  const isOwnProfile = currentProfile && currentProfile.id === profileData.id;

  // Get the ratings object for a specific movie from this profile
  // When viewing own profile, use live React state (currentRatings) for instant updates
  // When focusRater is set, only return that rater's rating
  const getProfileRatings = (movie) => {
    const key = ratingKey(movie);
    const legacyKey = `${movie.title}|${movie.year}`;
    let r;
    if (isOwnProfile && currentRatings) {
      r = currentRatings[key] || currentRatings[legacyKey] || {};
    } else {
      r = profileData.ratings?.[key] || profileData.ratings?.[legacyKey] || {};
    }
    if (focusRater) {
      // Only return this specific rater's rating
      return r[focusRater] != null ? { [focusRater]: r[focusRater] } : {};
    }
    return r;
  };

  // Get the current viewer's ratings for a specific movie
  const getViewerRating = (movie) => {
    if (!currentProfile || !currentRatings) return null;
    const key = ratingKey(movie);
    const legacyKey = `${movie.title}|${movie.year}`;
    const movieRatings = currentRatings[key] || currentRatings[legacyKey];
    if (!movieRatings) return null;
    // Find the viewer's own rating (first rater entry that matches the viewer's display name)
    const viewerName = currentProfile.displayName || currentProfile.id;
    if (movieRatings[viewerName] != null) return { name: viewerName, value: movieRatings[viewerName] };
    // Also check all entries - the viewer might have a single rating
    return null;
  };

  // Profile raters list — when focusRater is set, only show that rater
  const profileRaters = focusRater ? [focusRater] : (profileData.raters || []);

  return (
    <div className="profile-detail">
      <button className="profile-detail-back" onClick={onBack}>
        &larr; Back to Leaderboard
      </button>

      {/* Header */}
      <div className="profile-detail-header">
        <div className="profile-detail-name">
          {!focusRater && profileData.avatar && <span className="profile-detail-avatar">{profileData.avatar}</span>}
          {focusRater && <span className="profile-detail-avatar">👥</span>}
          {focusRater || profileData.displayName || profileData.id}
        </div>
        {focusRater && (
          <div className="profile-detail-joined" style={{ fontStyle: 'italic' }}>
            Co-watching with {profileData.displayName || profileData.id}
          </div>
        )}
        {memberSince && (
          <div className="profile-detail-joined">Member since {memberSince}</div>
        )}
        {currentJourneyMovie && (
          <div className="profile-detail-current"
            onClick={() => onOpenDetail && onOpenDetail(currentJourneyMovie)}
            style={{ cursor: 'pointer' }}
          >
            🎬 Currently on: <strong>{currentJourneyMovie.title}</strong> ({currentJourneyMovie.year})
          </div>
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
          <div className="profile-summary-item">
            <div className="profile-summary-value">{profileData.battleCount || 0}</div>
            <div className="profile-summary-label">Battles</div>
          </div>
        </div>
      </div>

      {/* Cards Section — featured + wallet combined */}
      {(profileData.showcase?.length > 0 || (isOwnProfile && profileData.wallet?.length > 0)) && (
        <div className="pd-cards-section">
          <div className="pd-cards-header">
            <span className="pd-section-label">Cards</span>
            {profileData.wallet?.length > 0 && (
              <span className="pd-collector-score" title="Points from your wallet cards. Rarer cards = more points.">
                Collector Score: <strong>{getCollectorScore(profileData.wallet)}</strong>
              </span>
            )}
          </div>

          <div className="pd-cards-layout">
            {/* Featured card — large */}
            {profileData.showcase?.length > 0 && (() => {
              const card = profileData.showcase[0];
              const movie = MOVIES_BY_ID[card.movieId];
              if (!movie) return null;
              const rarity = RARITIES[card.rarity || 'COMMON'];
              return (
                <div
                  className={`pd-featured-card pd-featured-${(card.rarity || 'COMMON').toLowerCase()}`}
                  style={{ '--rarity-border': rarity.border, '--rarity-glow': rarity.glow }}
                  onClick={() => onOpenDetail && onOpenDetail(movie)}
                >
                  <FilmTilePoster movie={movie} />
                  <div className="pd-featured-overlay">
                    <div className="pd-featured-title">{movie.title}</div>
                    <div className="pd-featured-rarity" style={{ color: rarity.color }}>{rarity.name}</div>
                  </div>
                  <div className="pd-featured-shine" />
                </div>
              );
            })()}

            {/* Wallet — visible to everyone, tap-to-feature only on own profile */}
            {profileData.wallet?.length > 0 && (
              <div className="pd-wallet">
                <div className="pd-wallet-label">{isOwnProfile ? 'Your ' : ''}Wallet ({profileData.wallet.length}/{getMaxWallet(watchedMovies.length)})</div>
                <div className="pd-wallet-cards">
                  {profileData.wallet.map((card, i) => {
                    const movie = MOVIES_BY_ID[card.movieId];
                    if (!movie) return null;
                    const rarity = RARITIES[card.rarity || 'COMMON'];
                    const isShowcased = profileData.showcase?.some(s => s.movieId === card.movieId);
                    return (
                      <div
                        key={i}
                        className={`pd-wallet-card ${isShowcased ? 'pd-wallet-active' : ''}`}
                        style={{ '--rarity-border': rarity.border, '--rarity-glow': rarity.glow }}
                        onClick={() => {
                          if (isOwnProfile && onSaveProfile) {
                            onSaveProfile('showcase', isShowcased ? [] : [card]);
                          } else {
                            onOpenDetail && onOpenDetail(movie);
                          }
                        }}
                      >
                        <FilmTilePoster movie={movie} />
                        <div className="pd-wallet-info">
                          <span style={{ color: rarity.color, fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rarity.name}</span>
                        </div>
                        {isShowcased && <div className="pd-wallet-star">★</div>}
                      </div>
                    );
                  })}
                </div>
                {isOwnProfile && <div className="pd-wallet-hint">Tap to feature</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {watchedMovies.length > 0 && (
        <div className="pd-stats-section">
          <StatsTab
            watchedTitleSet={new Set(watchedMovies.map(m => m.id))}
            ratings={isOwnProfile && currentRatings ? currentRatings : (profileData.ratings || {})}
            raters={profileData.raters || []}
            profileName={profileData.displayName || profileData.id}
            embedded
          />
        </div>
      )}

      {/* Watched Films */}
      <h2 className="pd-section-heading">
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
              <div className="film-tile" key={movie.id}
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
                          {rater}: <span className="rating-value">{val.toFixed(1)}{'\u2605'}</span>
                        </span>
                      );
                    })}
                    {viewerRating && (
                      <span className="film-tile-rating viewer-rating">
                        You: <span className="rating-value">{viewerRating.value.toFixed(1)}{'\u2605'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skipped Films */}
      {skippedMovies.length > 0 && (
        <>
          <button
            className="profile-unwatched-toggle"
            onClick={() => setShowSkipped(prev => !prev)}
            style={{ marginTop: '24px' }}
          >
            {showSkipped ? 'Hide' : 'Show'} Skipped Films 😤 ({skippedMovies.length})
          </button>
          {showSkipped && (
            <div>
              {skippedMovies.map(movie => (
                <div className="profile-unwatched-row" key={movie.id}
                  onClick={() => onOpenDetail && onOpenDetail(movie)}
                  style={{ cursor: 'pointer' }}>
                  <span>{movie.title}</span>
                  <span style={{ marginLeft: 'auto' }}>{movie.year}</span>
                </div>
              ))}
            </div>
          )}
        </>
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
            <div className="profile-unwatched-row" key={movie.id}>
              <span>{movie.title}</span>
              <span style={{ marginLeft: 'auto' }}>{movie.year}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
