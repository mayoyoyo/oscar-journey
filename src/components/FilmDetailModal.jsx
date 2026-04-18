import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { fetchOmdbData, readCachedOmdbData, parseOscarWins, tidyPlot } from '../utils/omdb';
import { MovieBadges, BadgeGenreSm } from './Badges';
import OscarIcon, { getOscarBadges } from './OscarIcon';
import TierPips from './TierPips';
import LanguagePill from './LanguagePill';
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

export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate, onOpenProfile, wallet, onOpenSeriesPreview, watchedSet, seriesSiblings, onSeriesNavigate, openInstant, initialScrollTop }) {
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

  const goPrev = useCallback(() => {
    if (movieList && onNavigate) {
      const idx = movieList.findIndex(m => m.id === movie?.id);
      if (idx > 0) onNavigate(movieList[idx - 1]);
      return;
    }
    if (seriesSiblings && onSeriesNavigate) {
      const idx = seriesSiblings.findIndex((s) => s.catalogId === movie?.id);
      if (idx > 0) {
        // Hand current scrollTop up so if the sibling is out-of-canon and
        // swaps FilmDetailModal → SeriesFilmPreview, the new modal mounts
        // scrolled to the same position. In-canon siblings ignore it
        // (same modal instance, scroll is preserved naturally).
        const scrollTop = modalRef.current?.scrollTop ?? 0;
        onSeriesNavigate(seriesSiblings[idx - 1], scrollTop);
      }
    }
  }, [movie?.id, movieList, onNavigate, seriesSiblings, onSeriesNavigate]);

  const goNext = useCallback(() => {
    if (movieList && onNavigate) {
      const idx = movieList.findIndex(m => m.id === movie?.id);
      if (idx >= 0 && idx < movieList.length - 1) onNavigate(movieList[idx + 1]);
      return;
    }
    if (seriesSiblings && onSeriesNavigate) {
      const idx = seriesSiblings.findIndex((s) => s.catalogId === movie?.id);
      if (idx >= 0 && idx < seriesSiblings.length - 1) {
        const scrollTop = modalRef.current?.scrollTop ?? 0;
        onSeriesNavigate(seriesSiblings[idx + 1], scrollTop);
      }
    }
  }, [movie?.id, movieList, onNavigate, seriesSiblings, onSeriesNavigate]);

  // Animated variants — slide the current content out, call the navigate
  // handler (which swaps the movie prop), slide the new content in from
  // the opposite side. Keeps the eye tracking from film → film.
  const animatedGo = useCallback((direction) => {
    const el = modalRef.current;
    const go = direction > 0 ? goNext : goPrev;
    if (!el) { go(); return; }
    // If a resetTransform is pending (horizontal swipe path calls it right
    // before us), cancel its stale clear-transition timer or it will fire
    // mid-animation and snap the modal instead of gliding it.
    if (transitionClearTimer.current != null) {
      clearTimeout(transitionClearTimer.current);
      transitionClearTimer.current = null;
    }
    const offset = direction > 0 ? '-40%' : '40%';
    const opposite = direction > 0 ? '40%' : '-40%';
    el.style.transition = 'transform 170ms ease-out, opacity 170ms ease-out';
    el.style.transform = `translateX(${offset})`;
    el.style.opacity = '0';
    setTimeout(() => {
      go();
      // Pre-position the new content on the opposite side with no
      // transition, then animate it back to center on the next frame.
      if (!modalRef.current) return;
      modalRef.current.style.transition = 'none';
      modalRef.current.style.transform = `translateX(${opposite})`;
      modalRef.current.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!modalRef.current) return;
          modalRef.current.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease-out';
          modalRef.current.style.transform = 'translateX(0)';
          modalRef.current.style.opacity = '1';
          // Route this trailing transition-clear through the same ref so a
          // rapid subsequent swipe can cancel it before it kills the next
          // animation's transition.
          transitionClearTimer.current = setTimeout(() => {
            transitionClearTimer.current = null;
            if (modalRef.current) modalRef.current.style.transition = '';
          }, 240);
        });
      });
    }, 170);
  }, [goNext, goPrev]);

  // Keyboard navigation (works for both movieList and series-sibling modes)
  const hasNavList = !!movieList || !!seriesSiblings;
  useEffect(() => {
    if (!hasNavList) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hasNavList, goPrev, goNext]);

  // Swipe gestures:
  //  - horizontal swipe → prev/next film navigation (requires movieList)
  //  - vertical drag DOWN when modal is scrolled to the top → the modal
  //    visually follows the finger, and releasing past 120px closes it.
  //    Mid-scroll swipes are ignored so reading long films (Alien) works.
  //  Imperative transform updates (via ref) avoid re-rendering on every
  //  touchmove, keeping the drag silky-smooth on mobile.
  const modalRef = useRef(null);
  const touchStart = useRef(null);
  const currentDragY = useRef(0);
  // Tracks the pending setTimeout from resetTransform so animatedGo can
  // cancel it. Without this, a horizontal swipe at touchend triggers
  // resetTransform (schedules clear at T=240ms) and then animatedGo
  // (starts its return-slide at ~T=186ms with a 220ms transition) — the
  // stale timeout wipes the transition mid-animation and the incoming
  // film snaps into place instead of sliding in.
  const transitionClearTimer = useRef(null);

  const cancelTransitionClear = useCallback(() => {
    if (transitionClearTimer.current != null) {
      clearTimeout(transitionClearTimer.current);
      transitionClearTimer.current = null;
    }
  }, []);

  const resetTransform = useCallback(() => {
    const el = modalRef.current;
    if (!el) return;
    cancelTransitionClear();
    el.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = '';
    transitionClearTimer.current = setTimeout(() => {
      transitionClearTimer.current = null;
      if (modalRef.current) modalRef.current.style.transition = '';
    }, 240);
    currentDragY.current = 0;
  }, [cancelTransitionClear]);

  // Clear any pending transition-clear timer on unmount so it can't fire
  // against a stale DOM reference.
  useEffect(() => () => cancelTransitionClear(), [cancelTransitionClear]);

  // When opening as a replacement for SeriesFilmPreview (in-canon sibling
  // click/swipe from a sequel preview), mount already-scrolled to the
  // outgoing modal's position so the swap feels continuous.
  useLayoutEffect(() => {
    if (initialScrollTop && modalRef.current) {
      modalRef.current.scrollTop = initialScrollTop;
    }
    // Mount-only — subsequent swaps within the same modal instance
    // preserve scroll naturally via React keeping the scroll container.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchStart = useCallback((e) => {
    const el = modalRef.current;
    // Let inner horizontal scrollers (series strip) own horizontal swipes
    // so scrolling through sequel posters doesn't also navigate films.
    const startedInStrip = !!e.target.closest?.('.series-strip');
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      scrollTop: el ? el.scrollTop : 0,
      startedInStrip,
    };
    // Cancel any in-flight snap-back transition so the new drag starts
    // from the current position, not a stale one.
    if (el) el.style.transition = '';
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const dy = e.touches[0].clientY - touchStart.current.y;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const atTop = touchStart.current.scrollTop <= 1;
    // Only engage vertical drag when at top AND pulling down AND vertical
    // is clearly dominant over horizontal (so diagonal swipes don't get
    // half a card-drag and half a navigation).
    if (atTop && dy > 6 && dy > Math.abs(dx)) {
      // Rubber-band past 150px so it feels grippy, not infinite.
      const resisted = dy > 150 ? 150 + (dy - 150) * 0.5 : dy;
      currentDragY.current = resisted;
      if (modalRef.current) {
        modalRef.current.style.transform = `translateY(${resisted}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Horizontal — animate prev/next navigation (works for both an explicit
    // movieList and series-sibling fallback). Skip if the touch started
    // inside the series strip — that's a native-scroll gesture, not a
    // modal-level swipe.
    if (!touchStart.current.startedInStrip && hasNavList && absDx > 60 && absDx > absDy * 1.5) {
      const dir = dx < 0 ? 1 : -1;
      // Don't start an animation if we're at the end of the list — just
      // snap back so the user gets tactile "nothing past here" feedback.
      if ((dir > 0 && !hasNext) || (dir < 0 && !hasPrev)) {
        resetTransform();
        touchStart.current = null;
        return;
      }
      resetTransform();
      animatedGo(dir);
      touchStart.current = null;
      return;
    }

    // Vertical — close with a smooth slide-off-bottom if user dragged far
    // enough; otherwise snap back. Fade the overlay backdrop out alongside
    // the card so the card doesn't visually detach from a static dark
    // rectangle as it leaves the screen.
    if (currentDragY.current > 120) {
      const el = modalRef.current;
      const overlay = el?.parentElement;
      if (el) {
        el.style.transition = 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms ease-out';
        el.style.transform = 'translateY(100vh)';
        el.style.opacity = '0';
      }
      if (overlay) {
        overlay.style.transition = 'background-color 200ms ease-out, opacity 200ms ease-out';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      }
      setTimeout(() => onClose(), 200);
    } else {
      resetTransform();
    }
    touchStart.current = null;
  }, [animatedGo, hasNavList, hasNext, hasPrev, onClose, resetTransform]);

  if (!movie) return null;

  const key = ratingKey(movie);
  const movieRatings = ratings[key] || {};
  const pElo = personalElo?.[movie.id];
  const walletCard = wallet?.find(c => c.movieId === movie.id);
  const cardRarity = walletCard ? RARITIES[walletCard.rarity] : null;

  return (
    <div className={`modal-overlay open${openInstant ? ' modal-overlay-instant' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      {hasNavList && hasPrev && <button className="modal-nav-btn modal-nav-prev" onClick={goPrev}>‹</button>}
      {hasNavList && hasNext && <button className="modal-nav-btn modal-nav-next" onClick={goNext}>›</button>}
      <div
        ref={modalRef}
        className="modal film-detail-modal"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
              {getOscarBadges(movie).map(k => (
                <OscarIcon key={k} movie={movie} kind={k} size="sm" />
              ))}
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
              <LanguagePill movie={movie} />
              <BadgeGenreSm genre={movie.genre} />
            </div>
            <MovieBadges movie={movie} excludeGenre />

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
