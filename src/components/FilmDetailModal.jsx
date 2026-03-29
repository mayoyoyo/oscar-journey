import React, { useEffect, useState } from 'react';
import { fetchOmdbData } from '../utils/omdb';
import { MovieBadges } from './Badges';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalElo, setGlobalElo] = useState(null);
  const [aggregateRating, setAggregateRating] = useState(null);

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

    // Fetch all profiles to compute aggregate star rating
    getDocs(collection(db, 'profiles')).then(snap => {
      const allRatings = [];
      for (const d of snap.docs) {
        const profileRatings = d.data().ratings || {};
        const r = profileRatings[key];
        if (r) {
          for (const [name, val] of Object.entries(r)) {
            if (val != null) allRatings.push({ profile: d.data().displayName || d.id, name, value: val });
          }
        }
      }
      if (allRatings.length > 0) {
        const avg = allRatings.reduce((s, r) => s + r.value, 0) / allRatings.length;
        setAggregateRating({ avg: avg.toFixed(1), count: allRatings.length, ratings: allRatings });
      } else {
        setAggregateRating(null);
      }
    }).catch(() => {});
  }, [movie?.title, movie?.year, movie?.id]);

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};
  const pElo = personalElo?.[movie.id];

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
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
            <div className="ceremony-line">
              {ordinal(movie.ceremony)} Academy Awards · {movie.year}
            </div>
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
            </div>

            {omdbData?.plot && (
              <div className="film-detail-plot">{omdbData.plot}</div>
            )}
            {omdbData?.director && (
              <div className="film-detail-director">Dir. {omdbData.director}</div>
            )}

            {/* Individual ratings from all profiles */}
            {aggregateRating && aggregateRating.ratings.length > 0 && (
              <div className="film-detail-all-ratings">
                {aggregateRating.ratings.map((r, i) => (
                  <span key={i} className="all-rating-chip">
                    {r.profile} ({r.name}): {r.value}★
                  </span>
                ))}
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
              style={{ marginTop: 'auto' }}
            >
              <span>{isWatched ? '✓' : '○'}</span>
              <span>{isWatched ? 'Watched!' : 'Mark as Watched'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
