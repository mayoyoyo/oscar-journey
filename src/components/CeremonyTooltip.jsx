import React, { useState } from 'react';
import { MOVIES } from '../data/movies';

export default function CeremonyTooltip({ ceremony, year, currentMovieId }) {
  const [show, setShow] = useState(false);

  // Get other movies from same ceremony
  const sameYear = MOVIES.filter(m => m.ceremony === ceremony && m.id !== currentMovieId);

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  return (
    <div className="ceremony-tooltip-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="ceremony-line ceremony-line-hoverable">
        {ordinal(ceremony)} Academy Awards · {year}
      </div>
      {show && sameYear.length > 0 && (
        <div className="ceremony-tooltip">
          <div className="ceremony-tooltip-title">
            Also nominated — {ordinal(ceremony)} Academy Awards
          </div>
          {sameYear.map(m => (
            <div key={m.id} className="ceremony-tooltip-film">
              <span className="ceremony-tooltip-name">{m.title}</span>
              {m.won && <span className="ceremony-tooltip-winner">★</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
