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

export default function FilmCard({ movie, isWatched, onToggleWatched, fading, ratings, onRatingChange, raters }) {
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
    <div className={`film-card ${fading ? 'fading' : ''}`}>
      {/* Poster column */}
      <div className="poster-col">
        {loading ? (
          <div className="poster-loading"><div className="spinner" /></div>
        ) : omdbData?.poster ? (
          <img
            className="poster-img"
            src={omdbData.poster}
            alt={`${movie.title} poster`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = `
                <div class="poster-placeholder">
                  <div class="ph-icon">🎬</div>
                  <div class="ph-title">${movie.title}</div>
                </div>
              `;
            }}
          />
        ) : (
          <div className="poster-placeholder">
            <div className="ph-icon">🎬</div>
            <div className="ph-title">{movie.title}</div>
          </div>
        )}
      </div>

      {/* Info column */}
      <div className="info-col">
        <div className="ceremony-line">
          {ordinal(movie.ceremony)} Academy Awards · {movie.year}
        </div>
        <div className="film-title">{movie.title}</div>
        <div className="film-year">{movie.year}</div>
        <MovieBadges movie={movie} />

        {omdbData?.rating && (
          <div className="film-imdb-rating">★ {omdbData.rating}</div>
        )}
        {omdbData?.plot && (
          <div className="film-plot">{omdbData.plot}</div>
        )}
        {omdbData?.director && (
          <div className="film-director">Dir. {omdbData.director}</div>
        )}

        {/* Rating pickers */}
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

        <button
          className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
          onClick={onToggleWatched}
        >
          <span className="check-anim">{isWatched ? '✓' : '○'}</span>
          <span>{isWatched ? 'Watched!' : 'Mark as Watched'}</span>
        </button>
      </div>
    </div>
  );
}
