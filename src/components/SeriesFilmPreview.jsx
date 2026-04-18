import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSeriesForTmdbId, tmdbPoster } from '../data/seriesCollections';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { justWatchUrl } from '../utils/justwatch';
import SeriesSection from './SeriesSection';
import StarPicker from './StarPicker';

// Synthesize a stable id for an out-of-canon film so watched/ratings can
// store it alongside catalog films without key collisions. Catalog IDs are
// strings like "star-wars-1977"; TMDB ids are positive integers, so the
// "tmdb:" prefix makes the source unambiguous.
function tmdbWatchId(tmdbId) {
  return `tmdb:${tmdbId}`;
}

// Modal for films in a series collection that aren't in the Oscar Journey
// catalog. Mirrors FilmDetailModal's layout and metric row as closely as the
// IMDb + TMDB data allows (no personal ratings, no site ELO, no awards).
//
// Portaled to document.body so it escapes any ancestor stacking context
// (e.g. FilmCard's 3-D poster perspective transform), which would otherwise
// keep the site's sticky nav bar visible above the overlay.
//
// The preview manages its own "which film is showing" state so clicking
// another out-of-canon sibling in the embedded SeriesSection swaps the
// preview in place. Clicking an in-catalog sibling closes the preview and
// delegates to the parent's onNavigate so the main FilmDetailModal takes
// over for that film.
export default function SeriesFilmPreview({
  film: initialFilm,
  collectionName,
  initialScrollTop,
  onClose,
  onNavigate,
  watchedSet,
  onToggleWatched,
  ratings,
  onRatingChange,
  raters,
}) {
  const [currentFilm, setCurrentFilm] = useState(initialFilm);

  // Reset internal state when the parent opens a different preview
  useEffect(() => { setCurrentFilm(initialFilm); }, [initialFilm?.tmdbId]);

  useEffect(() => {
    if (!currentFilm) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // ArrowLeft/Right handled below — they need access to animatedGo, so
      // the sibling nav listener is attached in its own effect after refs
      // + callbacks are declared.
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentFilm, onClose]);

  // Sibling navigation: look up the current film's series so horizontal
  // swipes can move between siblings (in-canon → swap to FilmDetailModal via
  // onNavigate; out-of-canon → swap currentFilm in place).
  const seriesLookup = currentFilm ? getSeriesForTmdbId(currentFilm.tmdbId) : null;
  const siblings = seriesLookup?.siblings ?? null;
  const siblingIdx = siblings
    ? siblings.findIndex((s) => s.tmdbId === currentFilm?.tmdbId)
    : -1;
  const hasPrevSibling = siblings && siblingIdx > 0;
  const hasNextSibling = siblings && siblingIdx >= 0 && siblingIdx < siblings.length - 1;

  const navigateToSibling = useCallback((sibling) => {
    if (!sibling) return;
    if (sibling.inCatalog) {
      // In-canon → delegate to parent (closes preview, opens FilmDetailModal).
      // Hand scrollTop over so the destination modal mounts at the same
      // position and the open animation is skipped (parent sets instant).
      const movie = MOVIES_BY_ID[sibling.catalogId] || MOVIES.find((m) => m.id === sibling.catalogId);
      if (movie) {
        const scrollTop = modalRef.current?.scrollTop ?? 0;
        onClose();
        if (onNavigate) onNavigate(movie, scrollTop);
      }
    } else {
      // Out-of-canon → swap internal state, preview re-renders
      setCurrentFilm(sibling);
    }
  }, [onClose, onNavigate]);

  // Desktop-style navigation — instant swap, no slide animation. Used by
  // the overlay arrow buttons and ArrowLeft/ArrowRight keys. Mirrors
  // FilmDetailModal's goPrev/goNext behavior (also non-animated on desktop).
  const goPrevSibling = useCallback(() => {
    if (hasPrevSibling) navigateToSibling(siblings[siblingIdx - 1]);
  }, [hasPrevSibling, siblings, siblingIdx, navigateToSibling]);

  const goNextSibling = useCallback(() => {
    if (hasNextSibling) navigateToSibling(siblings[siblingIdx + 1]);
  }, [hasNextSibling, siblings, siblingIdx, navigateToSibling]);

  // Drag-to-close + horizontal swipe. Mirrors FilmDetailModal's gesture set.
  const modalRef = useRef(null);
  const touchStart = useRef(null);
  const currentDragY = useRef(0);

  // When opening as a replacement for FilmDetailModal (sibling click on a
  // non-canon poster), the parent hands us the outgoing modal's scrollTop
  // so we can mount already-scrolled to the same position. Without this,
  // clicking a non-canon sibling resets the scroll to 0 while the in-canon
  // click path preserves it — an inconsistency the user feels as a "jump
  // to top" on non-canon clicks.
  useLayoutEffect(() => {
    if (initialScrollTop && modalRef.current) {
      modalRef.current.scrollTop = initialScrollTop;
    }
    // Intentionally run only on mount — subsequent swaps inside the preview
    // (out-of-canon → out-of-canon via swipe) should scroll-to-top naturally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // See FilmDetailModal for the full story — without tracking this timer,
  // resetTransform's 240ms clear fires mid-animation and the incoming film
  // snaps instead of sliding in on horizontal swipes.
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

  useEffect(() => () => cancelTransitionClear(), [cancelTransitionClear]);

  const animatedGo = useCallback((direction) => {
    const el = modalRef.current;
    const target = direction > 0
      ? (hasNextSibling ? siblings[siblingIdx + 1] : null)
      : (hasPrevSibling ? siblings[siblingIdx - 1] : null);
    if (!target) { resetTransform(); return; }
    // Cancel any pending resetTransform clear from the same gesture —
    // otherwise its 240ms timer wipes our transition mid-slide.
    if (transitionClearTimer.current != null) {
      clearTimeout(transitionClearTimer.current);
      transitionClearTimer.current = null;
    }

    // If the target is in-canon, we're about to unmount this component —
    // don't bother with the return-slide-in animation, just slide out and let
    // FilmDetailModal mount fresh.
    if (target.inCatalog) {
      if (el) {
        el.style.transition = 'transform 170ms ease-out, opacity 170ms ease-out';
        el.style.transform = `translateX(${direction > 0 ? '-40%' : '40%'})`;
        el.style.opacity = '0';
      }
      setTimeout(() => navigateToSibling(target), 170);
      return;
    }

    // Out-of-canon → swap currentFilm in place, slide in from opposite side.
    if (!el) { navigateToSibling(target); return; }
    const offset = direction > 0 ? '-40%' : '40%';
    const opposite = direction > 0 ? '40%' : '-40%';
    el.style.transition = 'transform 170ms ease-out, opacity 170ms ease-out';
    el.style.transform = `translateX(${offset})`;
    el.style.opacity = '0';
    setTimeout(() => {
      navigateToSibling(target);
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
          // Same cancel-on-next-swipe pattern as the outer reset, so rapid
          // successive swipes don't get their transitions stomped.
          transitionClearTimer.current = setTimeout(() => {
            transitionClearTimer.current = null;
            if (modalRef.current) modalRef.current.style.transition = '';
          }, 240);
        });
      });
    }, 170);
  }, [hasNextSibling, hasPrevSibling, siblings, siblingIdx, navigateToSibling, resetTransform]);

  // Desktop keyboard nav — instant swap (no slide), matches FilmDetailModal.
  // The slide animation is reserved for touch swipes via animatedGo.
  useEffect(() => {
    if (!siblings) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevSibling(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNextSibling(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [siblings, goPrevSibling, goNextSibling]);

  const handleTouchStart = useCallback((e) => {
    const el = modalRef.current;
    // Let the series strip own horizontal swipes so scrolling through
    // sequel posters doesn't also swap the current film.
    const startedInStrip = !!e.target.closest?.('.series-strip');
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      scrollTop: el ? el.scrollTop : 0,
      startedInStrip,
    };
    if (el) el.style.transition = '';
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const dy = e.touches[0].clientY - touchStart.current.y;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const atTop = touchStart.current.scrollTop <= 1;
    // Same guard as FilmDetailModal: only engage vertical drag when clearly
    // dominant over horizontal, so diagonal swipes don't fight the swipe-nav.
    if (atTop && dy > 6 && dy > Math.abs(dx)) {
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

    // Horizontal swipe → sibling nav (left-swipe = next, right-swipe = prev).
    // Skip if the touch started in the series strip — that's the strip's own
    // horizontal scroll, not a modal-level swipe.
    if (!touchStart.current.startedInStrip && siblings && absDx > 60 && absDx > absDy * 1.5) {
      const dir = dx < 0 ? 1 : -1;
      if ((dir > 0 && !hasNextSibling) || (dir < 0 && !hasPrevSibling)) {
        resetTransform();
        touchStart.current = null;
        return;
      }
      resetTransform();
      animatedGo(dir);
      touchStart.current = null;
      return;
    }

    // Vertical drag-to-close
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
  }, [siblings, hasNextSibling, hasPrevSibling, animatedGo, onClose, resetTransform]);

  if (!currentFilm) return null;

  const film = currentFilm;
  const poster = tmdbPoster(film.poster, 'w500');
  const runtime = film.runtime ? formatRuntime(film.runtime) : null;
  const seriesName = collectionName ? collectionName.replace(/\s+Collection$/, '') : null;
  const imdbUrl = film.imdbId
    ? `https://www.imdb.com/title/${film.imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(film.title + ' ' + film.year)}`;
  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(film.title + ' ' + film.year + ' official trailer')}`;

  // Dedupe mapped genres — TMDB may return both "Action" and "Adventure",
  // both of which fold to the catalog's "Action / Adventure" pill; same for
  // "Science Fiction" + "Fantasy" → "Sci-Fi / Fantasy".
  const genrePills = film.genres?.length
    ? [...new Set(film.genres.map((g) => matchCatalogGenre(g) || g))]
    : [];

  const handleInCatalogClick = (movie) => {
    // Hand scrollTop to the parent so the incoming FilmDetailModal mounts
    // at the same position with no open-animation flash (same treatment
    // as the swipe path via navigateToSibling).
    const scrollTop = modalRef.current?.scrollTop ?? 0;
    onClose();
    if (onNavigate) onNavigate(movie, scrollTop);
  };

  return createPortal(
    <div
      className="modal-overlay modal-overlay-instant open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {hasPrevSibling && (
        <button className="modal-nav-btn modal-nav-prev" onClick={goPrevSibling} aria-label="Previous in series">‹</button>
      )}
      {hasNextSibling && (
        <button className="modal-nav-btn modal-nav-next" onClick={goNextSibling} aria-label="Next in series">›</button>
      )}
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
            {poster ? (
              <img src={poster} alt={`${film.title} poster`} />
            ) : (
              <div className="poster-placeholder" style={{ minHeight: '280px', height: '100%' }}>
                <div className="ph-icon">🎬</div>
                <div className="ph-title">{film.title}</div>
              </div>
            )}
          </div>

          <div className="film-detail-body">
            <div className="series-preview-tag">
              Not in the Oscar Journey canon
              {seriesName && <span> · {seriesName}</span>}
            </div>

            <div className="film-title">{film.title}</div>

            <div className="film-year">
              <span>{film.year}</span>
              {runtime && <span className="film-year-runtime"> · {runtime}</span>}
            </div>

            {genrePills.length > 0 && (
              <div className="badges">
                {genrePills.map((g) => (
                  <span key={g} className="badge-genre">{g}</span>
                ))}
              </div>
            )}

            <div className="film-detail-metrics">
              {film.imdbRating != null && (
                <a className="metric-item metric-imdb-link" href={imdbUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <span className="metric-value">★ {film.imdbRating}</span>
                  <span className="metric-label">IMDb</span>
                </a>
              )}
              {film.imdbRating == null && (
                <a className="metric-item metric-imdb-link" href={imdbUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <span className="metric-value metric-value-label">IMDb</span>
                  <span className="metric-label">Open page</span>
                </a>
              )}
              <a className="metric-item metric-trailer"
                href={trailerUrl}
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
                href={justWatchUrl(film.title)}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="metric-value">📺</span>
                <span className="metric-label">Watch</span>
              </a>
            </div>

            {film.director && (
              <div className="film-detail-director"><strong>Directed by</strong> {film.director}</div>
            )}

            {film.cast?.length > 0 && (
              <div className="film-detail-starring">
                <strong>Starring</strong> {film.cast.join(' · ')}
              </div>
            )}

            {film.overview && (
              <div className="film-detail-plot">{film.overview}</div>
            )}

            <SeriesSection
              currentTmdbId={film.tmdbId}
              onNavigate={handleInCatalogClick}
              onClickOutOfCatalog={(sibling) => setCurrentFilm(sibling)}
              watchedSet={watchedSet}
            />

            {onToggleWatched && raters && (() => {
              const watchId = tmdbWatchId(film.tmdbId);
              const isWatched = !!(watchedSet && watchedSet.has(watchId));
              const filmRatings = (ratings && ratings[watchId]) || {};
              // Build a minimal movie-like object the app's watched/ratings
              // handlers can consume (they only read .id, .title, .year).
              const watchMovie = { id: watchId, title: film.title, year: film.year };
              return (
                <>
                  {isWatched ? (
                    <div className="rating-pickers">
                      <div className="rating-pickers-label">Your Ratings</div>
                      {raters.map((name) => (
                        <StarPicker
                          key={name}
                          label={name}
                          value={filmRatings[name] ?? null}
                          onChange={(val) => onRatingChange && onRatingChange(watchId, name, val)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rating-locked">Mark as watched to rate this film</div>
                  )}
                  <button
                    className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
                    onClick={() => onToggleWatched(watchMovie)}
                    style={{ marginTop: 'auto', justifyContent: 'center' }}
                  >
                    {isWatched && <span className="watched-icon">✓</span>}
                    <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function formatRuntime(mins) {
  const m = Number(mins);
  if (!Number.isFinite(m) || m <= 0) return null;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h${rem ? ` ${rem}m` : ''}` : `${rem}m`;
}

// Map a TMDB genre name onto the catalog's condensed GENRE_LABELS form
// ("Sci-Fi / Fantasy", "Action / Adventure") so the pill reads like the ones
// in FilmDetailModal. Returns null for genres we don't want to fold, so the
// raw TMDB name is used.
const TMDB_TO_CATALOG_GENRE = {
  'Science Fiction': 'Sci-Fi / Fantasy',
  'Fantasy': 'Sci-Fi / Fantasy',
  'Action': 'Action / Adventure',
  'Adventure': 'Action / Adventure',
  'Thriller': 'Thriller / Suspense',
  'Mystery': 'Thriller / Suspense',
  'Crime': 'Crime / Noir',
  'War': 'War',
  'History': 'Historical / Period',
  'Drama': 'Drama',
  'Romance': 'Romance',
  'Comedy': 'Comedy / Light Drama',
  'Music': 'Musical',
  'Animation': 'Animation / Family',
  'Family': 'Animation / Family',
  'Documentary': 'Indie / Arthouse',
};

function matchCatalogGenre(tmdbGenre) {
  return TMDB_TO_CATALOG_GENRE[tmdbGenre] || null;
}
