import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getDirectorFilmography } from '../utils/directorIndex';

// Inline "(N more)" link + modal listing a director's full catalog
// filmography. Returns null when the current film's director has no
// other catalog credit — callers can include it unconditionally after
// the "Directed by" line.
//
// Pattern mirrors CeremonyTooltip: controlled showModal state, portal
// into document.body, backdrop/✕ close, row click closes this modal
// and hands the clicked film to onOpenDetail for the caller to render.
export default function DirectorFilmographyLink({ movie, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);

  const filmography = movie ? getDirectorFilmography(movie.id) : null;
  if (!filmography) return null;

  const { directorsDisplay, films, otherCount } = filmography;

  return (
    <>
      <span
        className="director-more-link"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        ({otherCount} more)
      </span>

      {showModal && createPortal(
        <div
          className="modal-overlay open"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="modal ceremony-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="film-detail-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
              }}
              aria-label="Close"
            >✕</button>
            <h2 className="ceremony-modal-title">More by {directorsDisplay}</h2>

            <div className="ceremony-modal-section">
              {films.map((m) => {
                const isCurrent = m.id === movie.id;
                const className = `ceremony-modal-film${isCurrent ? ' is-current' : ''}`;
                const content = (
                  <>
                    <span className="ceremony-modal-film-title">{m.title}</span>
                    <span className="ceremony-modal-film-year">{m.year}</span>
                  </>
                );
                if (isCurrent) {
                  return (
                    <div key={m.id} className={className}>
                      {content}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className={className}
                    onClick={() => {
                      setShowModal(false);
                      if (onOpenDetail) onOpenDetail(m);
                    }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
