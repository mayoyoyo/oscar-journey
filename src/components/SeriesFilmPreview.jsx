import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSeriesForTmdbId, tmdbPoster } from '../data/seriesCollections';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { justWatchUrl } from '../utils/justwatch';
import SeriesSection from './SeriesSection';
import StarPicker from './StarPicker';
import { useFilmModalGestures } from './useFilmModalGestures';

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

  // Sibling navigation: look up the current film's series so horizontal
  // swipes can move between siblings (in-canon → swap to FilmDetailModal via
  // onNavigate; out-of-canon → swap currentFilm in place).
  const seriesLookup = currentFilm ? getSeriesForTmdbId(currentFilm.tmdbId) : null;
  const siblings = seriesLookup?.siblings ?? null;
  const siblingIdx = siblings
    ? siblings.findIndex((s) => s.tmdbId === currentFilm?.tmdbId)
    : -1;
  const hasPrevSibling = !!siblings && siblingIdx > 0;
  const hasNextSibling = !!siblings && siblingIdx >= 0 && siblingIdx < siblings.length - 1;

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
      // Out-of-canon → swap internal state, preview re-renders in place
      setCurrentFilm(sibling);
    }
    // modalRef is provided by useFilmModalGestures below — this callback
    // is defined before the hook runs, but only invoked later when nav
    // fires, so the ref is bound by the time it matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onNavigate]);

  const handleHorizontalNav = useCallback((direction) => {
    const target = direction > 0
      ? (hasNextSibling ? siblings[siblingIdx + 1] : null)
      : (hasPrevSibling ? siblings[siblingIdx - 1] : null);
    if (target) navigateToSibling(target);
  }, [hasNextSibling, hasPrevSibling, siblings, siblingIdx, navigateToSibling]);

  const {
    modalRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useFilmModalGestures({
    onClose,
    onHorizontalNav: handleHorizontalNav,
    hasNav: !!siblings,
    hasPrev: hasPrevSibling,
    hasNext: hasNextSibling,
    initialScrollTop,
  });

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
  // which both fold to the catalog's "Action" pill. Fantasy and Sci-Fi are
  // now separate catalog pills, so "Science Fiction" + "Fantasy" yield two
  // distinct pills (reflects the multi-genre split).
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
        <button className="modal-nav-btn modal-nav-prev" onClick={() => handleHorizontalNav(-1)} aria-label="Previous in series">‹</button>
      )}
      {hasNextSibling && (
        <button className="modal-nav-btn modal-nav-next" onClick={() => handleHorizontalNav(1)} aria-label="Next in series">›</button>
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
              {genrePills.map((g) => (
                <span key={g} className="badge-genre-sm">{g}</span>
              ))}
            </div>

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
                <strong>Starring</strong> {film.cast.map(s => String(s).trim()).filter(Boolean).join(' · ')}
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

// Map a TMDB genre name onto the catalog's GENRE_LABELS form so the pill
// reads like the ones in FilmDetailModal. Returns null for genres we don't
// want to fold, so the raw TMDB name is used.
const TMDB_TO_CATALOG_GENRE = {
  'Science Fiction': 'Sci-Fi',
  'Fantasy': 'Fantasy',
  'Action': 'Action',
  'Adventure': 'Action',
  'Thriller': 'Thriller',
  'Mystery': 'Thriller',
  'Horror': 'Horror',
  'Crime': 'Crime / Noir',
  'War': 'War',
  'History': 'Historical',
  'Drama': 'Drama',
  'Romance': 'Romance',
  'Comedy': 'Comedy',
  'Music': 'Musical',
  'Family': 'Family',
  // Animation and Documentary are intentionally unmapped — they're modes,
  // not catalog genres. TMDB "Animation" / "Documentary" tokens fall through
  // matchCatalogGenre() and render as raw pills for out-of-catalog series
  // members (accurate labeling over a stretched fit).
};

function matchCatalogGenre(tmdbGenre) {
  return TMDB_TO_CATALOG_GENRE[tmdbGenre] || null;
}
