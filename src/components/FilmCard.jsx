import React, { useEffect, useState, useRef } from 'react';
import { fetchOmdbData, readCachedOmdbData, tidyPlot } from '../utils/omdb';
import { getConsensusScore, CONSENSUS_TOOLTIP_TEXT } from '../utils/ratings';
import InfoTooltip from './InfoTooltip';
import { extractDominantColor } from '../utils/colorExtract';
import { MovieBadges } from './Badges';
import OscarIcon, { getOscarBadges } from './OscarIcon';
import TierPips from './TierPips';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { justWatchUrl } from '../utils/justwatch';
import CeremonyTooltip from './CeremonyTooltip';
import ACTORS from '../data/actors.json';
import DIRECTORS from '../data/directors.json';
import SeriesSection from './SeriesSection';

// Universal skip messages — safe for any film (Oscar or canon).
const SKIP_MESSAGES_UNIVERSAL = [
  "You'd skip this but watch 3 hours of TikTok? Bold choice.",
  "Somewhere, a film critic just felt a disturbance in the force.",
  "Fine. But don't come crying when everyone's talking about this movie.",
  "Your future self who watched it: 'That was actually great.' You right now: skip. 🤡",
  "Even the popcorn is disappointed. 🍿",
  "The director put years of their life into this and you can't give it 2 hours?",
  "Skipping is temporary. Regret is forever.",
  "You're one skip away from becoming the person who 'doesn't watch movies.'",
  "Bold of you to skip a film you know nothing about.",
  "You miss 100% of the films you skip. — Wayne Gretzky — Michael Scott",
  "Wow. The skip button. How original. 🙄",
  "The algorithm specifically chose this for you and you're gonna do it like that?",
  "Every great film collection started with someone NOT pressing skip.",
  "Skipping a film is like leaving a restaurant before the food arrives.",
  "You'll watch a 45-second reel 300 times but not a 2-hour masterpiece?",
  "This is the movie equivalent of skipping leg day.",
  "Skip now, see it trending later, feel silly. Classic.",
  "Your watchlist is crying. It thought today was the day.",
  "Just so you know, this counts as a fumble on your profile.",
  "That skip button should come with a therapist.",
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

// Oscar-specific zingers — only used when the film is an Academy-recognized title.
const SKIP_MESSAGES_OSCAR = [
  "Really? This is an Oscar nominee. Have some respect. 😤",
  "The Academy didn't nominate this for you to hit 'skip'...",
  "Skipping Oscar nominees? What's next, skipping vegetables? 🥦",
  "This movie didn't get nominated just to be disrespected like this.",
  "You sure? This one's a banger according to literally the Academy.",
  "This film has more awards than you have excuses. Watch it.",
  "This movie survived Oscar campaigning, studio politics, and critics. But sure, skip it.",
  "The Academy voters watched 300+ films to pick this one. You can't do one?",
  "Quitters never win Oscars. Neither do skippers.",
];

// Canon-specific zingers — only used when the film is ESSENTIAL (non-Oscar canon).
const SKIP_MESSAGES_CANON = [
  "Really? This film is on multiple canon lists. Have some respect. 😤",
  "Critics, festivals, and cinephiles all agreed. You're gonna skip??",
  "You're about to skip a film the Academy already missed. Don't make their mistake.",
  "This film didn't crack Sight & Sound for you to hit 'skip.'",
  "Criterion put this in their collection for a reason. Maybe find out why?",
  "IMDb users, Letterboxd, the AFI, and the Library of Congress all disagree with your skip.",
  "This is the exact kind of film people regret not watching sooner.",
  "Every cinephile you admire has seen this. Just saying.",
  "Hot take: the best films of all time don't always win Oscars. This is one of them.",
];

function pickSkipMessage(movie) {
  const category = movie?.category;
  const pool = [...SKIP_MESSAGES_UNIVERSAL];
  if (category === 'ESSENTIAL') pool.push(...SKIP_MESSAGES_CANON);
  else pool.push(...SKIP_MESSAGES_OSCAR);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function FilmCard({ movie, isWatched, onToggleWatched, fading, ratings, onRatingChange, raters, allowSkip, onSkip, allProfiles, currentProfileId, onOpenDetail, onOpenProfile, onOpenSeriesPreview, watchedSet }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movie) return;
    let cancelled = false;
    // Sync cache read first — avoids a loading-spinner flash when navigating
    // between films whose data is already cached in localStorage.
    const cached = readCachedOmdbData(movie);
    if (cached) {
      setOmdbData(cached);
      setLoading(false);
    } else {
      setOmdbData(null);
      setLoading(true);
    }
    // Always fire fetchOmdbData — it decides internally whether to hit the
    // network (stale / incomplete cache) or just return the cached shape.
    // This lets fields added in later revisions (e.g. Metacritic) backfill
    // naturally on the next visit without forcing a cache wipe.
    fetchOmdbData(movie).then(data => {
      if (cancelled) return;
      setOmdbData(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [movie?.title, movie?.year]);

  const [ambientColor, setAmbientColor] = useState(null);

  useEffect(() => {
    if (omdbData?.poster) {
      extractDominantColor(omdbData.poster, (color) => {
        if (color) setAmbientColor(color);
      });
    }
  }, [omdbData?.poster]);

  const posterRef = useRef(null);
  const isTouch = 'ontouchstart' in window;
  const handlePosterMove = (e) => {
    if (isTouch) return;
    const el = posterRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
  };
  const handlePosterLeave = () => {
    if (posterRef.current) posterRef.current.style.transform = '';
  };

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};

  return (
    <div className={`film-card ${fading ? 'fading' : ''} ${isWatched ? 'film-card-watched' : ''}`} style={ambientColor ? { '--ambient': ambientColor } : undefined}>
      {/* Poster column */}
      <div className="poster-col">
        {loading ? (
          <div className="poster-loading"><div className="spinner" /></div>
        ) : omdbData?.poster ? (
          <img
            className="poster-img"
            src={omdbData.poster}
            alt={`${movie.title} poster`}
            ref={posterRef}
            onMouseMove={handlePosterMove}
            onMouseLeave={handlePosterLeave}
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
        <div className="film-detail-ceremony-row">
          {getOscarBadges(movie).map(k => (
            <OscarIcon key={k} movie={movie} kind={k} size="sm" />
          ))}
          <CeremonyTooltip ceremony={movie.ceremony} year={movie.year} currentMovieId={movie.id} onOpenDetail={onOpenDetail} movie={movie} />
        </div>
        <div className="film-title">{movie.title}</div>
        <div className="film-year">
          <span>{movie.year}</span>
          {omdbData?.runtime && (() => {
            // Match the detail modal: pretty-print OMDb's "138 min" to "2h 18m"
            // (or "18m" for sub-hour) and keep it inline with the year.
            const m = parseInt(String(omdbData.runtime).match(/\d+/)?.[0], 10);
            if (!m) return null;
            const h = Math.floor(m / 60);
            const mm = m % 60;
            const pretty = h > 0 ? `${h}h${mm ? ` ${mm}m` : ''}` : `${mm}m`;
            return <span className="film-year-runtime"> · {pretty}</span>;
          })()}
          <TierPips movie={movie} variant="compact" />
        </div>
        <MovieBadges movie={movie} />

        {/* Metrics row — same tile style as FilmDetailModal so the Journey
            card and the modal read identically. User-Avg and Clash Rank are
            kept on the modal only (both need extra data the card doesn't
            already have). The `metric-divider` visually separates rating
            tiles from the action tiles (Trailer / Watch). */}
        <div className="film-detail-metrics">
          {omdbData?.metacritic && (
            <a
              className="metric-item metric-metacritic"
              href={`https://www.metacritic.com/search/${encodeURIComponent(movie.title)}/?category=13`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="metric-value">{omdbData.metacritic}<span className="metric-value-sub">/100</span></span>
              <span className="metric-label">Metacritic</span>
            </a>
          )}
          {(() => {
            const consensus = getConsensusScore(movie, omdbData);
            if (consensus == null) return null;
            return (
              <div className="metric-item metric-consensus">
                <span className="metric-value">
                  {consensus.toFixed(1)}<span className="metric-value-sub">/10</span>
                  <InfoTooltip text={CONSENSUS_TOOLTIP_TEXT} label="How Consensus is calculated" />
                </span>
                <span className="metric-label">Consensus</span>
              </div>
            );
          })()}
          <span className="metric-divider" aria-hidden="true" />
          <a className="metric-item metric-trailer"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' ' + movie.year + ' official trailer')}`}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="metric-value"><svg viewBox="0 0 28 20" width="22" height="16" style={{flexShrink:0}}>
              <rect rx="4" ry="4" width="28" height="20" fill="#FF0000"/>
              <polygon points="11,4 11,16 21,10" fill="#FFF"/>
            </svg></span>
            <span className="metric-label">Trailer</span>
          </a>
          <a className="metric-item metric-justwatch"
            href={justWatchUrl(movie.title)}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="metric-value">📺</span>
            <span className="metric-label">Watch</span>
          </a>
        </div>
        {(() => {
          // Directed by — prefer hand-curated directors.json over OMDb (which
          // over-credits committees on some older / animated films).
          const director = DIRECTORS[movie.id] || omdbData?.director;
          if (!director) return null;
          return <div className="film-director"><strong>Directed by</strong> {director}</div>;
        })()}
        {(() => {
          // Starring — top-billed from actors.json, fallback to OMDb. Middle
          // dots between names to match the detail modal's credits-line feel.
          const actors = ACTORS[movie.id] || omdbData?.actors;
          if (!actors) return null;
          const pretty = actors.split(',').map(s => s.trim()).filter(Boolean).join(' · ');
          return <div className="film-starring"><strong>Starring</strong> {pretty}</div>;
        })()}
        {omdbData?.plot && (
          <div className="film-plot">{tidyPlot(omdbData.plot)}</div>
        )}

        <SeriesSection
          filmId={movie.id}
          onNavigate={onOpenDetail}
          onClickOutOfCatalog={onOpenSeriesPreview
            ? (sibling, collectionName) => onOpenSeriesPreview(sibling, collectionName)
            : undefined}
          watchedSet={watchedSet}
        />

        {/* Oscars Won / Nominations moved to the ceremony modal (click the
            "Xth Academy Awards" line above the title). See
            CeremonyTooltip.jsx. */}

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
                  <span key={p.id} className="watched-by-chip profile-name-link"
                    onClick={(e) => { e.stopPropagation(); onOpenProfile && onOpenProfile(p.id); }}
                  >
                    {p.avatar || '👤'} {p.displayName}
                    {userHasRated && primaryRating != null && (
                      <span className="watched-by-rating">: {primaryRating}★</span>
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
                const msg = pickSkipMessage(movie);
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
