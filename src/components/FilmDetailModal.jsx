import React, { useEffect, useState } from 'react';
import { fetchOmdbData } from '../utils/omdb';
import { MovieBadges } from './Badges';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    setOmdbData(null);
    fetchOmdbData(movie).then(data => {
      setOmdbData(data);
      setLoading(false);
    });
  }, [movie?.title, movie?.year]);

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};

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

            {omdbData?.rating && (
              <div className="film-detail-rating">★ {omdbData.rating} / 10</div>
            )}
            {omdbData?.plot && (
              <div className="film-detail-plot">{omdbData.plot}</div>
            )}
            {omdbData?.director && (
              <div className="film-detail-director">Dir. {omdbData.director}</div>
            )}

            {/* Rating pickers — only shown when film is marked as watched */}
            {isWatched ? (
              <div className="rating-pickers">
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
