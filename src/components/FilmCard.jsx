import React, { useEffect, useState } from 'react';
import { fetchOmdbData } from '../utils/omdb';
import { MovieBadges } from './Badges';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { justWatchUrl } from '../utils/justwatch';
import CeremonyTooltip from './CeremonyTooltip';

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
  "The director put years of their life into this and you can't give it 2 hours?",
  "Skipping is temporary. Regret is forever.",
  "This film has more awards than you have excuses. Watch it.",
  "You're one skip away from becoming the person who 'doesn't watch movies.'",
  "Bold of you to skip a film you know nothing about.",
  "You miss 100% of the films you skip. — Wayne Gretzky — Michael Scott",
  "Wow. The skip button. How original. 🙄",
  "This movie survived Oscar campaigning, studio politics, and critics. But sure, skip it.",
  "The algorithm specifically chose this for you and you're gonna do it like that?",
  "Every great film collection started with someone NOT pressing skip.",
  "Skipping a film is like leaving a restaurant before the food arrives.",
  "You'll watch a 45-second reel 300 times but not a 2-hour masterpiece?",
  "This is the movie equivalent of skipping leg day.",
  "The Academy voters watched 300+ films to pick this one. You can't do one?",
  "Skip now, see it trending later, feel silly. Classic.",
  "Your watchlist is crying. It thought today was the day.",
  "Just so you know, this counts as a fumble on your profile.",
  "That skip button should come with a therapist.",
  "This film was literally nominated for BEST PICTURE and you're hitting skip??",
  "Quitters never win Oscars. Neither do skippers.",
  "Imagine explaining to your friends why you skipped this one.",
  "The skip button exists for emergencies. This is not an emergency.",
  "Fine, skip it. But know that the movie poster is judging you right now.",
  "If you skip this, you have to watch two next time. Those are the rules.",
  "The universe aligned to show you this film today. And you want to skip. Okay.",
  "Plot twist: this was going to be your new favorite movie.",
  "Skipping films is how you end up rewatching the same 5 movies forever.",
  "One day you'll run out of films and wish you hadn't skipped this one.",
  "Are you skipping because it looks boring, or because you're scared it's actually good?",
  "This is cinema, not a Netflix queue. Show some commitment.",
];

export default function FilmCard({ movie, isWatched, onToggleWatched, fading, ratings, onRatingChange, raters, personalElo, allowSkip, onSkip, allProfiles, currentProfileId, onOpenDetail }) {
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
        <CeremonyTooltip ceremony={movie.ceremony} year={movie.year} currentMovieId={movie.id} onOpenDetail={onOpenDetail} />
        <div className="film-title">{movie.title}</div>
        <div className="film-year">{movie.year}</div>
        <MovieBadges movie={movie} />

        <div className="film-pills-row">
          {omdbData?.rating && (
            <div className="film-imdb-rating">★ {omdbData.rating} <span className="rating-source">IMDb</span></div>
          )}
          <a className="film-trailer-btn"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' ' + movie.year + ' official trailer')}`}
            target="_blank" rel="noopener noreferrer"
          >
            <svg className="film-trailer-icon" viewBox="0 0 28 20" width="14" height="10">
              <rect rx="4" ry="4" width="28" height="20" fill="#FF0000"/>
              <polygon points="11,4 11,16 21,10" fill="#FFF"/>
            </svg>
            Trailer
          </a>
          <a className="film-justwatch-btn"
            href={justWatchUrl(movie.title)}
            target="_blank" rel="noopener noreferrer"
          >
            📺 Where to Watch
          </a>
        </div>
        {personalElo?.[movie.id] && (
          <div className="film-elo-rating">⚔️ {personalElo[movie.id].elo} <span className="rating-source">Your Battle ELO</span></div>
        )}
        {omdbData?.plot && (
          <div className="film-plot">{omdbData.plot}</div>
        )}
        {omdbData?.director && (
          <div className="film-director">Dir. {omdbData.director}</div>
        )}
        {omdbData?.runtime && (
          <div className="film-runtime">🕐 {omdbData.runtime}</div>
        )}

        {/* Watched by others + their ratings after user rates */}
        {allProfiles && (() => {
          const others = allProfiles.filter(p =>
            p.id !== currentProfileId &&
            Array.isArray(p.watched) &&
            p.watched.includes(movie.id)
          );
          if (others.length === 0) return null;
          const userHasRated = Object.values(movieRatings).some(v => v != null);
          return (
            <div className="watched-by">
              <span className="watched-by-label">{userHasRated ? 'Others\' ratings' : 'Watched by'}</span>
              {others.map(p => {
                const pRatings = p.ratings?.[key] || {};
                const pRaters = p.raters || [p.displayName];
                const primaryRating = pRatings[pRaters[0]];
                return (
                  <span key={p.id} className="watched-by-chip">
                    {p.avatar || '👤'} {p.displayName}
                    {userHasRated && primaryRating != null && (
                      <span className="watched-by-rating"> {primaryRating}/10</span>
                    )}
                  </span>
                );
              })}
            </div>
          );
        })()}

        {/* Rating pickers — only shown when film is marked as watched */}
        {isWatched ? (
          <div className="rating-pickers">
            <div className="rating-pickers-label">Rate this film to continue</div>
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
            {isWatched && <span className="watched-icon">✓</span>}
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
