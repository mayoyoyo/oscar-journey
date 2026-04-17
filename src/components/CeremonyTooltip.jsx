import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MOVIES } from '../data/movies';
import TierPips from './TierPips';

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const CATEGORY_ORDER = [
  { key: 'BP', label: 'Best Picture' },
  { key: 'INT', label: 'Best International Feature Film' },
  { key: 'ANIM', label: 'Best Animated Feature' },
  { key: 'ESSENTIAL', label: 'Essential — non-Oscar canon' },
];

export default function CeremonyTooltip({ ceremony, year, currentMovieId, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);

  // Two modes:
  //  - Oscar film (ceremony provided): modal groups films from that specific Academy Awards
  //    ceremony.
  //  - Essential film (ceremony is null): modal groups all films released in the same year,
  //    spanning Oscar categories AND essentials. Same UX either way.
  const isCeremonyMode = ceremony != null;

  // Pick the sibling set: either films that shared the ceremony, or all films from the same year.
  const siblings = isCeremonyMode
    ? MOVIES.filter(m => m.ceremony === ceremony)
    : MOVIES.filter(m => m.year === year);

  // Group by category (including alsoWon cross-listings for Oscar films).
  const grouped = {};
  for (const m of siblings) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push({ ...m, wonInCategory: m.won });

    if (m.alsoWon) {
      for (const cat of m.alsoWon) {
        if (!grouped[cat]) grouped[cat] = [];
        if (m.category !== cat) {
          grouped[cat].push({ ...m, wonInCategory: true });
        }
      }
    }
  }

  // Sort each group: winners first (for Oscar cats), then tier descending (for Essentials),
  // then alphabetical fallback.
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => {
      if (a.wonInCategory && !b.wonInCategory) return -1;
      if (!a.wonInCategory && b.wonInCategory) return 1;
      const tDiff = (b.tier || 0) - (a.tier || 0);
      if (tDiff !== 0) return tDiff;
      return a.title.localeCompare(b.title);
    });
  }

  const lineText = isCeremonyMode
    ? `${ordinal(ceremony)} Academy Awards · ${year}`
    : `Canon film · ${year} — see films of this year`;

  const modalTitle = isCeremonyMode
    ? `${ordinal(ceremony)} Academy Awards`
    : `Films of ${year}`;

  const modalSubtitle = isCeremonyMode
    ? `Honoring films of ${year}`
    : `Every Oscar nominee and canon film from ${year}`;

  return (
    <>
      <div className="ceremony-line ceremony-line-clickable"
        onClick={() => setShowModal(true)}
      >
        {lineText}
      </div>

      {showModal && createPortal(
        <div className="modal-overlay open"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="modal ceremony-modal" onClick={(e) => e.stopPropagation()}>
            <button className="film-detail-close" onClick={(e) => { e.stopPropagation(); setShowModal(false); }}>✕</button>
            <h2 className="ceremony-modal-title">
              {modalTitle}
            </h2>
            <p className="ceremony-modal-year">{modalSubtitle}</p>

            {CATEGORY_ORDER.map(({ key, label }) => {
              const films = grouped[key];
              if (!films || films.length === 0) return null;
              return (
                <div key={key} className="ceremony-modal-section">
                  <h3 className="ceremony-modal-category">{label}</h3>
                  {films.map(m => (
                    <div key={m.id}
                      className={`ceremony-modal-film ${m.id === currentMovieId ? 'is-current' : ''}`}
                      onClick={() => {
                        if (onOpenDetail) {
                          setShowModal(false);
                          onOpenDetail(m);
                        }
                      }}
                    >
                      <span className="ceremony-modal-film-title">
                        {m.wonInCategory && m.category !== 'ESSENTIAL' && <span className="ceremony-modal-trophy">🏆</span>}
                        {m.title}
                      </span>
                      {m.category === 'ESSENTIAL' ? (
                        <TierPips movie={m} variant="compact" />
                      ) : m.awards ? (
                        <span className="ceremony-modal-award-count">
                          🏆{m.awards.length + (m.wonInCategory ? 1 : 0)}
                        </span>
                      ) : null}
                      <span className="ceremony-modal-film-year">{m.year}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
