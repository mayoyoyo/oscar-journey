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

const SKIP_MESSAGES = [
  "Really? This is an Oscar nominee. Have some respect. 😤",
  "You'd skip this but watch 3 hours of TikTok? Bold choice.",
  "The Academy didn't nominate this for you to hit 'skip'...",
  "Somewhere, a film critic just felt a disturbance in the force.",
  "Fine. But don't come crying when everyone's talking about this movie.",
  "Skipping Oscar nominees? What's next, skipping vegetables? 🥦",
  "This movie didn't get nominated just to be disrespected like this.",
  "Your future self who watched it: 'That was actually great.' You right now: skip. 🤡",
  "Even the popcorn is disappointed. 🍿",
  "You sure? This one's a banger according to literally the Academy.",
];

export default function FilmCard({ movie, isWatched, onToggleWatched, fading, ratings, onRatingChange, raters, personalElo, allowSkip, onSkip, allProfiles, currentProfileId }) {
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
          <div className="film-imdb-rating">★ {omdbData.rating} <span className="rating-source">IMDb</span></div>
        )}
        {personalElo?.[movie.id] && (
          <div className="film-elo-rating">⚔️ {personalElo[movie.id].elo} <span className="rating-source">Your Battle ELO</span></div>
        )}
        {omdbData?.plot && (
          <div className="film-plot">{omdbData.plot}</div>
        )}
        {omdbData?.director && (
          <div className="film-director">Dir. {omdbData.director}</div>
        )}

        {/* Watched by others */}
        {allProfiles && (() => {
          const others = allProfiles.filter(p =>
            p.id !== currentProfileId &&
            Array.isArray(p.watched) &&
            p.watched.includes(movie.id)
          );
          if (others.length === 0) return null;
          return (
            <div className="watched-by">
              <span className="watched-by-label">Watched by</span>
              {others.map(p => (
                <span key={p.id} className="watched-by-chip">
                  {p.avatar || '👤'} {p.displayName}
                </span>
              ))}
            </div>
          );
        })()}

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

        <div className="film-card-actions">
          <button
            className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
            onClick={onToggleWatched}
          >
            <span className="watched-icon">{isWatched ? '✓' : ''}</span>
            <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
          </button>
          {allowSkip && !isWatched && (
            <button
              className="skip-btn"
              onClick={() => {
                const msg = SKIP_MESSAGES[Math.floor(Math.random() * SKIP_MESSAGES.length)];
                if (window.confirm(msg + '\n\nSkip this film?')) {
                  onSkip();
                }
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
