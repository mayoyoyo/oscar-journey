import React, { useEffect, useState } from 'react';
import { fetchOmdbData } from '../utils/omdb';
import { MovieBadges } from './Badges';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CeremonyTooltip from './CeremonyTooltip';

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalElo, setGlobalElo] = useState(null);
  const [aggregateRating, setAggregateRating] = useState(null);
  const [watchedBy, setWatchedBy] = useState([]);

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    setOmdbData(null);
    fetchOmdbData(movie).then(data => {
      setOmdbData(data);
      setLoading(false);
    });

    // Fetch global ELO for this movie
    const key = movie.id;
    getDoc(doc(db, 'elo', key)).then(snap => {
      if (snap.exists()) setGlobalElo(snap.data());
      else setGlobalElo(null);
    }).catch(() => {});

    // Fetch all profiles to compute aggregate star rating + who watched
    getDocs(collection(db, 'profiles')).then(snap => {
      const allRatings = [];
      const watchers = [];
      for (const d of snap.docs) {
        const data = d.data();
        const profileWatched = data.watched || [];
        const hasWatched = profileWatched.includes(key);
        const profileRatings = data.ratings || {};
        const r = profileRatings[key];
        const hasRated = r && Object.values(r).some(v => v != null);

        if (hasWatched) {
          watchers.push({
            id: d.id,
            displayName: data.displayName || d.id,
            avatar: data.avatar || '',
            hasRated,
          });
        }

        if (r) {
          for (const [name, val] of Object.entries(r)) {
            if (val != null) allRatings.push({ profile: data.displayName || d.id, name, value: val });
          }
        }
      }
      setWatchedBy(watchers);
      if (allRatings.length > 0) {
        const avg = allRatings.reduce((s, r) => s + r.value, 0) / allRatings.length;
        setAggregateRating({ avg: avg.toFixed(1), count: allRatings.length, ratings: allRatings });
      } else {
        setAggregateRating(null);
      }
    }).catch(() => {});
  }, [movie?.title, movie?.year, movie?.id]);

  // Navigation within movie list
  const currentListIdx = movieList ? movieList.findIndex(m => m.id === movie.id) : -1;
  const hasPrev = movieList && currentListIdx > 0;
  const hasNext = movieList && currentListIdx >= 0 && currentListIdx < movieList.length - 1;

  const goPrev = () => {
    if (hasPrev && onNavigate) onNavigate(movieList[currentListIdx - 1]);
  };
  const goNext = () => {
    if (hasNext && onNavigate) onNavigate(movieList[currentListIdx + 1]);
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!movieList) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};
  const pElo = personalElo?.[movie.id];

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      {movieList && hasPrev && <button className="modal-nav-btn modal-nav-prev" onClick={goPrev}>‹</button>}
      {movieList && hasNext && <button className="modal-nav-btn modal-nav-next" onClick={goNext}>›</button>}
      <div className="modal" style={{ maxWidth: '640px', padding: 0, overflow: 'hidden', position: 'relative' }}>
        <button className="film-detail-close" onClick={onClose}>✕</button>
        <div className="film-detail-inner">
          <div className="film-detail-poster">
            {loading ? (
              <div className="poster-loading"><div className="spinner" /></div>
            ) : omdbData?.poster ? (
              <img
                src={omdbData.poster}
                alt={`${movie.title} poster`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `
                    <div class="poster-placeholder" style="min-height:280px;height:100%;">
                      <div class="ph-icon">🎬</div>
                      <div class="ph-title">${movie.title}</div>
                    </div>
                  `;
                }}
              />
            ) : (
              <div className="poster-placeholder" style={{ minHeight: '280px', height: '100%' }}>
                <div className="ph-icon">🎬</div>
                <div className="ph-title">{movie.title}</div>
              </div>
            )}
          </div>
          <div className="film-detail-body">
            <CeremonyTooltip ceremony={movie.ceremony} year={movie.year} currentMovieId={movie.id} onOpenDetail={onNavigate} />
            <div className="film-title" style={{ fontSize: '1.4rem' }}>{movie.title}</div>
            <div className="film-year">{movie.year}</div>
            <MovieBadges movie={movie} />

            {/* Ratings summary row */}
            <div className="film-detail-metrics">
              {omdbData?.rating && (
                <div className="metric-item">
                  <span className="metric-value">★ {omdbData.rating}</span>
                  <span className="metric-label">IMDb</span>
                </div>
              )}
              {aggregateRating && (
                <div className="metric-item">
                  <span className="metric-value">★ {aggregateRating.avg}</span>
                  <span className="metric-label">Site Avg ({aggregateRating.count} {aggregateRating.count === 1 ? 'rating' : 'ratings'})</span>
                </div>
              )}
              {pElo && (
                <div className="metric-item">
                  <span className="metric-value">⚔️ {pElo.elo}</span>
                  <span className="metric-label">Your ELO ({pElo.matchCount})</span>
                </div>
              )}
              {globalElo && (
                <div className="metric-item">
                  <span className="metric-value">⚔️ {globalElo.elo}</span>
                  <span className="metric-label">Global ELO ({globalElo.matchCount})</span>
                </div>
              )}
              <a className="metric-item metric-trailer"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' ' + movie.year + ' official trailer')}`}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="metric-value">▶</span>
                <span className="metric-label">Trailer</span>
              </a>
            </div>

            {omdbData?.plot && (
              <div className="film-detail-plot">{omdbData.plot}</div>
            )}
            {omdbData?.director && (
              <div className="film-detail-director">Dir. {omdbData.director}</div>
            )}
            {omdbData?.runtime && (
              <div className="film-detail-runtime">🕐 {omdbData.runtime}</div>
            )}

            {/* Who watched + their ratings */}
            {watchedBy.length > 0 && (
              <div className="film-detail-all-ratings">
                {watchedBy.map((w, i) => {
                  const profileRatings = aggregateRating?.ratings.filter(r => r.profile === w.displayName) || [];
                  return (
                    <span key={i} className={`all-rating-chip ${w.hasRated ? '' : 'no-rating'}`}>
                      {w.avatar} {w.displayName}{profileRatings.length > 0
                        ? ': ' + profileRatings.map(r => `${r.value}★`).join(', ')
                        : ' (watched, not rated)'}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Rating pickers — only shown when film is marked as watched */}
            {isWatched ? (
              <div className="rating-pickers">
                <div className="rating-pickers-label">Your Ratings</div>
                {raters.map(name => (
                  <StarPicker
                    key={name}
                    label={name}
                    value={movieRatings[name] ?? null}
                    onChange={(val) => onRatingChange(key, name, val)}
                  />
                ))}
              </div>
            ) : (
              <div className="rating-locked">Mark as watched to rate this film</div>
            )}

            <button
              className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
              onClick={onToggleWatched}
              style={{ marginTop: 'auto', justifyContent: 'center' }}
            >
              {isWatched && <span className="watched-icon">✓</span>}
              <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
