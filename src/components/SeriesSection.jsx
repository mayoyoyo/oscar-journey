import React, { useRef } from 'react';
import { getSeriesForFilm, getSeriesForTmdbId, tmdbPoster } from '../data/seriesCollections';
import { MOVIES } from '../data/movies';

// TMDB collection names often end in " Collection" — strip for display.
function displayCollectionName(name) {
  return (name || '').replace(/\s+Collection$/, '');
}

// SeriesSection shows a film's series membership as a horizontal strip of
// poster thumbnails in chronological order. Current film is outlined in gold.
// Clicking a poster navigates (in-catalog) or opens the preview (out-of-canon).
//
// Caller must provide exactly one of:
//   filmId         — the catalog id of the current film (in-catalog case)
//   currentTmdbId  — the tmdb id of the current film (out-of-catalog case)
//
// Callbacks (both required for clicks to do anything):
//   onNavigate(movie)                         — in-catalog sibling click
//   onClickOutOfCatalog(film, collectionName) — out-of-catalog sibling click;
//                                               caller is responsible for
//                                               opening SeriesFilmPreview with
//                                               the appropriate watched/rating
//                                               props threaded through.
export default function SeriesSection({ filmId, currentTmdbId, onNavigate, onClickOutOfCatalog, watchedSet }) {
  // Desktop click-drag scrolling. Tracks mouse deltas and translates them
  // into scrollLeft; also flags when a drag moved far enough to suppress
  // the click that fires on mouseup (otherwise a drag-to-scroll would
  // accidentally navigate into the poster the user released over).
  const stripRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onStripMouseDown = (e) => {
    if (e.button !== 0) return; // left-click only
    const el = stripRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false };
    el.classList.add('is-dragging');
  };
  const onStripMouseMove = (e) => {
    if (!drag.current.active) return;
    const el = stripRef.current;
    if (!el) return;
    const dx = e.pageX - drag.current.startX;
    // Always apply scroll 1:1 with mouse movement so the strip tracks
    // under the cursor without a dead zone. The 4px threshold only gates
    // whether to *suppress* the subsequent click, not whether to scroll.
    el.scrollLeft = drag.current.startScroll - dx;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    e.preventDefault();
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (stripRef.current) stripRef.current.classList.remove('is-dragging');
  };
  const onStripClickCapture = (e) => {
    // Suppress the click if the user just dragged — prevents clicks that
    // follow a swipe from treating the release target as an intentional tap.
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const result = filmId
    ? getSeriesForFilm(filmId)
    : getSeriesForTmdbId(currentTmdbId);
  if (!result) return null;

  const { collection, film, siblings } = result;
  const name = displayCollectionName(collection.name);
  const inCatalogCount = siblings.filter((s) => s.inCatalog).length;
  const allInCatalog = inCatalogCount === siblings.length;

  const isCurrentSibling = (s) =>
    (filmId && s.catalogId === filmId) ||
    (currentTmdbId && s.tmdbId === currentTmdbId);

  return (
    <div className="series-section">
      <div className="series-heading">
        <span className="series-name">{name}</span>
        <span className="series-sep">·</span>
        <span className="series-meta-inline">Film {film.order} of {siblings.length}</span>
        {!allInCatalog && (
          <>
            <span className="series-sep">·</span>
            <span className="series-meta-inline">{inCatalogCount} in canon</span>
          </>
        )}
      </div>

      <ol
        ref={stripRef}
        className="series-strip"
        onMouseDown={onStripMouseDown}
        onMouseMove={onStripMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={onStripClickCapture}
      >
        {siblings.map((s) => {
          const isCurrent = isCurrentSibling(s);
          const poster = tmdbPoster(s.poster, 'w154');
          const clickable = !isCurrent;
          const onClick = !clickable
            ? undefined
            : s.inCatalog
              ? () => {
                  const movie = MOVIES.find((m) => m.id === s.catalogId);
                  if (movie && onNavigate) onNavigate(movie);
                }
              : () => {
                  if (onClickOutOfCatalog) onClickOutOfCatalog(s, collection.name);
                };
          // Watched state checks whichever ID convention applies: catalog
          // films use their catalog id; out-of-canon films use `tmdb:<id>`
          // (the same key SeriesFilmPreview writes when marking as watched).
          const watchKey = s.inCatalog ? s.catalogId : `tmdb:${s.tmdbId}`;
          const isWatched = !!(watchedSet && watchedSet.has(watchKey));
          const classes = [
            'series-strip-item',
            clickable && 'is-clickable',
            !s.inCatalog && 'is-out-of-canon',
            isCurrent && 'is-current',
            isWatched && 'is-watched',
          ].filter(Boolean).join(' ');

          return (
            <li
              key={s.tmdbId}
              className={classes}
              onClick={onClick}
              title={`${s.order}. ${s.title} (${s.year})${isCurrent ? ' — this film' : s.inCatalog ? '' : ' — not in canon'}`}
            >
              {poster ? (
                <img
                  src={poster}
                  alt={s.title}
                  className="series-strip-poster"
                  loading="lazy"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              ) : (
                <div className="series-strip-poster series-strip-poster-empty">🎬</div>
              )}
              {isCurrent && (
                <span className="series-strip-order">{s.order}</span>
              )}
              {isWatched && (
                <span className="series-strip-watched" aria-label="Watched">✓</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
