import React, { useState } from 'react';
import { MOVIES } from '../data/movies';

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const CATEGORY_ORDER = [
  { key: 'BP', label: 'Best Picture' },
  { key: 'INT', label: 'Best International Feature Film' },
  { key: 'ANIM', label: 'Best Animated Feature' },
];

export default function CeremonyTooltip({ ceremony, year, currentMovieId, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);

  const sameYear = MOVIES.filter(m => m.ceremony === ceremony);

  // Group by category
  const grouped = {};
  for (const m of sameYear) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  // Sort each group: winners first, then alphabetical
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => {
      if (a.won && !b.won) return -1;
      if (!a.won && b.won) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  return (
    <>
      <div className="ceremony-line ceremony-line-clickable"
        onClick={() => setShowModal(true)}
      >
        {ordinal(ceremony)} Academy Awards · {year}
      </div>

      {showModal && (
        <div className="modal-overlay open" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false);
        }}>
          <div className="modal ceremony-modal">
            <button className="film-detail-close" onClick={() => setShowModal(false)}>✕</button>
            <h2 className="ceremony-modal-title">
              {ordinal(ceremony)} Academy Awards
            </h2>
            <p className="ceremony-modal-year">Honoring films of {year}</p>

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
                        {m.won && <span className="ceremony-modal-trophy">🏆</span>}
                        {m.title}
                      </span>
                      <span className="ceremony-modal-film-year">{m.year}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
