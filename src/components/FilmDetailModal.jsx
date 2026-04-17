import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchOmdbData, readCachedOmdbData, parseOscarWins } from '../utils/omdb';
import { MovieBadges } from './Badges';
import OscarIcon from './OscarIcon';
import TierPips from './TierPips';
import ACTORS from '../data/actors.json';
import DIRECTORS from '../data/directors.json';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { justWatchUrl } from '../utils/justwatch';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CeremonyTooltip from './CeremonyTooltip';
import { getAwardLink } from '../utils/awardLinks';

import { RARITIES } from '../utils/cards';
import { getCardOwner } from '../utils/cardRegistry';

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate, onOpenProfile, wallet }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalElo, setGlobalElo] = useState(null);
  const [aggregateRating, setAggregateRating] = useState(null);
  const [watchedBy, setWatchedBy] = useState([]);
  const [posterError, setPosterError] = useState(false);
  const [legendaryOwner, setLegendaryOwner] = useState(null);

  useEffect(() => {
    if (!movie) return;
    let cancelled = false;

    setPosterError(false);
    setLegendaryOwner(null);

    // Sync cache check — if OMDb data for this film is already in localStorage, paint it
    // immediately instead of clearing to a loading state. This kills the "flashbang" when
    // navigating between films in the ceremony/year modal or via arrow keys.
    const cached = readCachedOmdbData(movie);
    if (cached) {
      setOmdbData(cached);
      setLoading(false);
    } else {
      setOmdbData(null);
      setLoading(true);
    }

    // Secondary data (ELO, aggregate rating, watchedBy) — leave previous values in place
    // until the new data arrives, then overwrite atomically. Stale-while-revalidate.

    // Card owner
    getCardOwner(movie.id).then(owner => {
      if (cancelled) return;
      setLegendaryOwner(owner || null);
    });

    // OMDb refresh (no-op beyond the cache if it was just served)
    fetchOmdbData(movie).then(data => {
      if (cancelled) return;
      setOmdbData(data);
      setLoading(false);
    });

    // Fetch global ELO for this movie
    const key = movie.id;
    getDoc(doc(db, 'elo', key)).then(snap => {
      if (cancelled) return;
      setGlobalElo(snap.exists() ? snap.data() : null);
    }).catch(() => {});

    // Fetch all profiles to compute aggregate star rating + who watched
    getDocs(collection(db, 'profiles')).then(snap => {
      if (cancelled) return;
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

    return () => { cancelled = true; };
  }, [movie?.title, movie?.year, movie?.id]);

  // Navigation within movie list
  const currentListIdx = movie && movieList ? movieList.findIndex(m => m.id === movie.id) : -1;
  const hasPrev = movieList && currentListIdx > 0;
  const hasNext = movieList && currentListIdx >= 0 && currentListIdx < movieList.length - 1;

  const goPrev = useCallback(() => {
    if (!movieList || !onNavigate) return;
    const idx = movieList.findIndex(m => m.id === movie?.id);
    if (idx > 0) onNavigate(movieList[idx - 1]);
  }, [movie?.id, movieList, onNavigate]);

  const goNext = useCallback(() => {
    if (!movieList || !onNavigate) return;
    const idx = movieList.findIndex(m => m.id === movie?.id);
    if (idx >= 0 && idx < movieList.length - 1) onNavigate(movieList[idx + 1]);
  }, [movie?.id, movieList, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!movieList) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [movieList, goPrev, goNext]);

  // Swipe gestures for mobile navigation
  const touchStart = useRef(null);
  const handleTouchStart = useCallback((e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current || !movieList) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    // Only trigger if horizontal swipe is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  }, [goNext, goPrev, movieList]);

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};
  const pElo = personalElo?.[movie.id];
  const walletCard = wallet?.find(c => c.movieId === movie.id);
  const cardRarity = walletCard ? RARITIES[walletCard.rarity] : null;

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      {movieList && hasPrev && <button className="modal-nav-btn modal-nav-prev" onClick={goPrev}>‹</button>}
      {movieList && hasNext && <button className="modal-nav-btn modal-nav-next" onClick={goNext}>›</button>}
      <div className="modal film-detail-modal" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <button className="film-detail-close" onClick={onClose}>✕</button>
        <div className="film-detail-inner">
          <div className="film-detail-poster">
            {loading ? (
              <div className="poster-loading"><div className="spinner" /></div>
            ) : omdbData?.poster && !posterError ? (
              <img
                src={omdbData.poster}
                alt={`${movie.title} poster`}
                onError={() => setPosterError(true)}
                className={cardRarity ? 'film-detail-poster-card' : ''}
                style={cardRarity ? { '--rarity-border': cardRarity.border, '--rarity-glow': cardRarity.glow } : undefined}
              />
            ) : (
              <div className="poster-placeholder" style={{ minHeight: '280px', height: '100%' }}>
                <div className="ph-icon">🎬</div>
                <div className="ph-title">{movie.title}</div>
              </div>
            )}
          </div>
          {legendaryOwner && (
            <div
              className="card-owner-badge profile-name-link"
              style={{ color: RARITIES[legendaryOwner.rarity]?.color }}
              onClick={() => onOpenProfile && onOpenProfile(legendaryOwner.id)}
            >
              <span className="card-owner-icon">✦</span>
              {RARITIES[legendaryOwner.rarity]?.name} held by {legendaryOwner.avatar} {legendaryOwner.name}
            </div>
          )}
          <div className="film-detail-body">
            <div className="film-detail-ceremony-row">
              <OscarIcon movie={movie} size="sm" />
              <CeremonyTooltip ceremony={movie.ceremony} year={movie.year} currentMovieId={movie.id} onOpenDetail={onNavigate} />
            </div>
            <div className="film-title">{movie.title}</div>
            <div className="film-year">
              <span>{movie.year}</span>
              {omdbData?.runtime && (() => {
                // OMDb returns runtime as "138 min". Reformat to "2h 18m"
                // (or just "18m" for sub-hour shorts) and show inline with year.
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

            {/* Ratings summary row */}
            <div className="film-detail-metrics">
              {omdbData?.rating && (
                <a className="metric-item metric-imdb-link" href={`https://www.imdb.com/find/?q=${encodeURIComponent(movie.title + ' ' + movie.year)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <span className="metric-value">★ {omdbData.rating}</span>
                  <span className="metric-label">IMDb</span>
                </a>
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
              // Static directors.json is the primary source (hand-curated to
              // trim over-credited committees like Bambi, OMDb is the
              // fallback for anything missing from the bake).
              const director = DIRECTORS[movie.id] || omdbData?.director;
              if (!director) return null;
              return <div className="film-detail-director"><strong>Directed by</strong> {director}</div>;
            })()}
            {(() => {
              // Static actors.json is the primary source (always hydrated);
              // OMDb cache field is a fallback for profiles that refreshed
              // after actors data was added to the live cache.
              const actors = ACTORS[movie.id] || omdbData?.actors;
              if (!actors) return null;
              // OMDb returns "Actor 1, Actor 2, Actor 3" — convert commas to
              // middle dots so it reads like a credits line.
              const pretty = actors.split(',').map(s => s.trim()).filter(Boolean).join(' · ');
              return <div className="film-detail-starring"><strong>Starring</strong> {pretty}</div>;
            })()}
            {omdbData?.plot && (
              <div className="film-detail-plot">{omdbData.plot}</div>
            )}

            {(() => {
              const codedOscars = (movie.awards?.length || 0) + (movie.won && movie.category === 'BP' ? 1 : 0) + (movie.alsoWon?.length || 0) + (movie.category === 'ANIM' || movie.category === 'INT' ? 1 : 0);
              // Fallback for essentials / canon films with no hand-coded awards
              // data: parse OMDb's "Awards" string, which tells us the Oscar
              // win count even if we don't know which categories. Only used when
              // codedOscars is 0 so we never double-count.
              const omdbOscars = codedOscars === 0 ? parseOscarWins(omdbData?.awards) : 0;
              const totalOscars = codedOscars + omdbOscars;
              if (totalOscars === 0) return null;
              return (
              <div className="film-detail-awards">
                <div className="film-detail-awards-title">
                  🏆 {totalOscars} Oscar{totalOscars !== 1 ? 's' : ''} Won
                </div>
                <div className="film-detail-awards-list">
                  {(() => {
                    const speechSearch = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year} oscar acceptance speech ${q}`)}`;
                    const SpeechAward = ({ label, query }) => (
                      <a className="award-item award-item-link award-item-major"
                        href={speechSearch(query)} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Watch acceptance speech"
                      >
                        <span className="award-category">{label}</span>
                        <span className="award-link-icon">{"\u2197"}</span>
                      </a>
                    );
                    return (
                      <>
                        {movie.won && movie.category === 'BP' && <SpeechAward label="Best Picture" query="best picture" />}
                        {movie.category === 'ANIM' && <SpeechAward label="Best Animated Feature" query="best animated feature" />}
                        {movie.category === 'INT' && <SpeechAward label="Best International Feature Film" query="best international feature" />}
                        {movie.alsoWon && movie.alsoWon.map((cat, i) => {
                          const label = cat === 'INT' ? 'Best International Feature Film' : cat === 'ANIM' ? 'Best Animated Feature' : cat;
                          const query = cat === 'INT' ? 'best international feature' : cat === 'ANIM' ? 'best animated feature' : cat.toLowerCase();
                          return <SpeechAward key={`also-${i}`} label={label} query={query} />;
                        })}
                      </>
                    );
                  })()}
                  {(movie.awards || []).map((a, i) => {
                    const link = getAwardLink(a, movie);
                    const content = (
                      <>
                        <span className="award-category">{a.category}</span>
                        {a.winner && <span className="award-winner">{a.winner}</span>}
                        {a.detail && <span className="award-detail">"{a.detail}"</span>}
                        {link && <span className="award-link-icon">{"\u2197"}</span>}
                      </>
                    );
                    return link ? (
                      <a key={i} className={`award-item award-item-link ${a.winner ? 'award-item-major' : ''}`}
                        href={link} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {content}
                      </a>
                    ) : (
                      <div key={i} className={`award-item ${a.winner ? 'award-item-major' : ''}`}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}

            {/* Who watched + their ratings */}
            {watchedBy.length > 0 && (
              <div className="film-detail-all-ratings">
                {watchedBy.map((w, i) => {
                  const profileRatings = aggregateRating?.ratings.filter(r => r.profile === w.displayName) || [];
                  return (
                    <span key={i} className={`all-rating-chip profile-name-link ${w.hasRated ? '' : 'no-rating'}`}
                      onClick={() => onOpenProfile && onOpenProfile(w.id)}
                    >
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
