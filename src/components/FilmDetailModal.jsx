import React, { useEffect, useState, useCallback } from 'react';
import { useFilmModalGestures } from './useFilmModalGestures';
import { fetchOmdbData, readCachedOmdbData, parseOscarWins, tidyPlot } from '../utils/omdb';
import { MovieBadges } from './Badges';
import OscarIcon, { getOscarBadges } from './OscarIcon';
import TierPips from './TierPips';
import ACTORS from '../data/actors.json';
import DIRECTORS from '../data/directors.json';
import IMDB_IDS from '../data/imdbIds.json';
import StarPicker from './StarPicker';
import { ratingKey } from '../utils/storage';
import { justWatchUrl } from '../utils/justwatch';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CeremonyTooltip from './CeremonyTooltip';
import { getAwardLink } from '../utils/awardLinks';
import SeriesSection from './SeriesSection';

import { RARITIES } from '../utils/cards';
import { getCardOwner } from '../utils/cardRegistry';
import { getGlobalRank, getPersonalRank } from '../utils/eloRanks';

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate, onOpenProfile, wallet, onOpenSeriesPreview, watchedSet, seriesSiblings, onSeriesNavigate, openInstant, initialScrollTop }) {
  const [omdbData, setOmdbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalElo, setGlobalElo] = useState(null);
  const [globalRank, setGlobalRank] = useState(null);
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

    // Fetch global ELO for this movie + the global rank (shared cached
    // fetch of the full ELO leaderboard — one round-trip per session).
    const key = movie.id;
    getDoc(doc(db, 'elo', key)).then(snap => {
      if (cancelled) return;
      setGlobalElo(snap.exists() ? snap.data() : null);
    }).catch(() => {});
    getGlobalRank(key).then(r => {
      if (cancelled) return;
      setGlobalRank(r);
    });

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

  // Navigation within movie list. If no explicit movieList is provided but
  // the film is part of a series, we fall back to sibling navigation —
  // siblings can include out-of-canon films, which the parent swaps over
  // to SeriesFilmPreview via onSeriesNavigate.
  const currentListIdx = movie && movieList ? movieList.findIndex(m => m.id === movie.id) : -1;
  const currentSeriesIdx = !movieList && movie && seriesSiblings
    ? seriesSiblings.findIndex((s) => s.catalogId === movie.id)
    : -1;
  const hasPrev = movieList
    ? currentListIdx > 0
    : currentSeriesIdx > 0;
  const hasNext = movieList
    ? currentListIdx >= 0 && currentListIdx < movieList.length - 1
    : currentSeriesIdx >= 0 && currentSeriesIdx < (seriesSiblings?.length ?? 0) - 1;
  const hasNavList = !!movieList || !!seriesSiblings;

  // Single nav handler used by the shared gestures hook (touch swipe + ← →
  // arrow keys) AND the on-screen ‹ › buttons. Reads scrollTop imperatively
  // so cross-boundary swaps (in-canon → out-of-canon) hand it to the parent
  // for restoration in the incoming SeriesFilmPreview.
  const handleHorizontalNav = useCallback((direction) => {
    if (movieList && onNavigate) {
      const idx = movieList.findIndex(m => m.id === movie?.id);
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < movieList.length) onNavigate(movieList[nextIdx]);
      return;
    }
    if (seriesSiblings && onSeriesNavigate) {
      const idx = seriesSiblings.findIndex((s) => s.catalogId === movie?.id);
      const nextIdx = idx + direction;
      if (nextIdx >= 0 && nextIdx < seriesSiblings.length) {
        const scrollTop = modalRef.current?.scrollTop ?? 0;
        onSeriesNavigate(seriesSiblings[nextIdx], scrollTop);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id, movieList, onNavigate, seriesSiblings, onSeriesNavigate]);

  const {
    modalRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useFilmModalGestures({
    onClose,
    onHorizontalNav: handleHorizontalNav,
    hasNav: hasNavList,
    hasPrev,
    hasNext,
    initialScrollTop,
  });

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};
  const pElo = personalElo?.[movie.id];
  const personalRank = pElo ? getPersonalRank(personalElo, movie.id) : null;
  const hasAnyRank = personalRank != null || globalRank != null;
  const walletCard = wallet?.find(c => c.movieId === movie.id);
  const cardRarity = walletCard ? RARITIES[walletCard.rarity] : null;

  return (
    <div className={`modal-overlay open${openInstant ? ' modal-overlay-instant' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      {hasNavList && hasPrev && <button className="modal-nav-btn modal-nav-prev" onClick={() => handleHorizontalNav(-1)}>‹</button>}
      {hasNavList && hasNext && <button className="modal-nav-btn modal-nav-next" onClick={() => handleHorizontalNav(1)}>›</button>}
      <div
        ref={modalRef}
        className="modal film-detail-modal"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="film-detail-close" onClick={onClose} aria-label="Close">✕</button>
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
              {getOscarBadges(movie).map(k => (
                <OscarIcon key={k} movie={movie} kind={k} size="sm" />
              ))}
              <CeremonyTooltip ceremony={movie.ceremony} year={movie.year} currentMovieId={movie.id} onOpenDetail={onNavigate} movie={movie} />
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
              {omdbData?.rating && (() => {
                const imdbId = IMDB_IDS[movie.id];
                const imdbUrl = imdbId
                  ? `https://www.imdb.com/title/${imdbId}/`
                  : `https://www.imdb.com/find/?q=${encodeURIComponent(movie.title + ' ' + movie.year)}`;
                return (
                  <a className="metric-item metric-imdb-link" href={imdbUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <span className="metric-value">★ {omdbData.rating}</span>
                    <span className="metric-label">IMDb</span>
                  </a>
                );
              })()}
              {aggregateRating && (
                <div className="metric-item">
                  <span className="metric-value">★ {aggregateRating.avg}<span className="metric-value-sub"> ({aggregateRating.count})</span></span>
                  <span className="metric-label">User Avg</span>
                </div>
              )}
              {hasAnyRank && (
                <div className="metric-item">
                  <span className="metric-value">
                    ⚔️ {personalRank != null ? `#${personalRank}` : '—'}
                    <span className="metric-value-sub"> ({globalRank != null ? `#${globalRank}` : '—'})</span>
                  </span>
                  <span className="metric-label">My Rank <span className="metric-label-sub">(Global)</span></span>
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
              <div className="film-detail-plot">{tidyPlot(omdbData.plot)}</div>
            )}

            <SeriesSection
              filmId={movie.id}
              onNavigate={onNavigate}
              onClickOutOfCatalog={onOpenSeriesPreview
                ? (sibling, collectionName) => {
                    // Hand the current scrollTop to the parent so the
                    // incoming SeriesFilmPreview can mount already scrolled
                    // to the same position — same "stays where I was"
                    // behavior the in-canon click path gets for free.
                    const scrollTop = modalRef.current?.scrollTop ?? 0;
                    onOpenSeriesPreview(sibling, collectionName, scrollTop);
                  }
                : undefined}
              watchedSet={watchedSet}
            />

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

            {/* Who watched + their ratings. Unrated watches render as a
                dim chip (avatar + name only) — no "(watched, not rated)"
                suffix; the disabled visual cue carries the same meaning.
                Rated watches show the score in gold to match the Journey
                card's watched-by-rating styling. */}
            {watchedBy.length > 0 && (
              <div className="film-detail-all-ratings">
                {watchedBy.map((w, i) => {
                  const profileRatings = aggregateRating?.ratings.filter(r => r.profile === w.displayName) || [];
                  return (
                    <span key={i} className={`all-rating-chip profile-name-link ${w.hasRated ? '' : 'no-rating'}`}
                      onClick={() => onOpenProfile && onOpenProfile(w.id)}
                    >
                      {w.avatar} {w.displayName}
                      {profileRatings.length > 0 && (
                        <span className="all-rating-chip-score">
                          : {profileRatings.map(r => `${r.value}★`).join(', ')}
                        </span>
                      )}
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
