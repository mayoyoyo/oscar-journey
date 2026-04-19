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
  { key: 'ESSENTIAL', label: (year) => `${year} Essentials (non-Oscar canon)` },
];

export default function CeremonyTooltip({ ceremony, year, currentMovieId, onOpenDetail, movie }) {
  const [showModal, setShowModal] = useState(false);

  // Derive ceremony for films whose primary category is ESSENTIAL but
  // that still won Oscars via alsoWon / awards (e.g. Fanny and Alexander
  // — an essential that also won Best International Feature). Ceremony
  // number = year - 1927 holds from 1929 onward; before that the schedule
  // was irregular, but ESSENTIALS with Oscars in the 1927–28 era are
  // effectively nonexistent in the catalog.
  const hasOscarContent = !!movie && (
    (Array.isArray(movie.awards) && movie.awards.length > 0) ||
    (Array.isArray(movie.alsoWon) && movie.alsoWon.length > 0) ||
    movie.won === true
  );
  const derivedCeremony = (ceremony == null && hasOscarContent && year >= 1929)
    ? year - 1927
    : null;
  const effectiveCeremony = ceremony ?? derivedCeremony;

  // Two modes:
  //  - Oscar film or essential-with-Oscars: modal groups films from that
  //    specific Academy Awards ceremony.
  //  - Pure canon film (no Oscars): modal groups films from the same year.
  const isCeremonyMode = effectiveCeremony != null;

  // Pick the sibling set. In ceremony mode we include all films that shared the ceremony
  // PLUS any ESSENTIAL canon films released the same year — so viewing a 1994 Oscar film's
  // ceremony surfaces Pulp Fiction alongside Forrest Gump. In year mode we just grab
  // everything from that year.
  const siblings = isCeremonyMode
    ? [
        ...MOVIES.filter(m => m.ceremony === effectiveCeremony),
        ...MOVIES.filter(m => m.category === 'ESSENTIAL' && m.year === year),
      ]
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

  // Canon-only films don't get a ceremony line — the year is already shown
  // below the title and "Canon film" carries no distinguishing info
  // (absence of Academy-Awards line already signals canon).
  if (!isCeremonyMode) return null;
  // For Oscar films: ceremony name only, drop the year (also redundant with
  // the year under the title).
  const lineText = `${ordinal(effectiveCeremony)} Academy Awards`;

  const modalTitle = isCeremonyMode
    ? `${ordinal(effectiveCeremony)} Academy Awards`
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
              const resolvedLabel = typeof label === 'function' ? label(year) : label;
              return (
                <div key={key} className="ceremony-modal-section">
                  <h3 className="ceremony-modal-category">{resolvedLabel}</h3>
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
                      {/* Year removed from each row — every film in this modal is
                          from the same year, so the column was pure visual noise. */}
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
