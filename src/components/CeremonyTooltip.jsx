import React, { useState, useEffect, useRef } from 'react';
import { MOVIES } from '../data/movies';

export default function CeremonyTooltip({ ceremony, year, currentMovieId, onOpenDetail }) {
  const [show, setShow] = useState(false);
  const wrapRef = useRef(null);

  const sameYear = MOVIES.filter(m => m.ceremony === ceremony && m.id !== currentMovieId);

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  return (
    <div className="ceremony-tooltip-wrap" ref={wrapRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="ceremony-line ceremony-line-hoverable"
        onClick={() => setShow(prev => !prev)}
      >
        {ordinal(ceremony)} Academy Awards · {year}
      </div>
      {show && sameYear.length > 0 && (
        <div className="ceremony-tooltip">
          <div className="ceremony-tooltip-title">
            Also nominated — {ordinal(ceremony)} Academy Awards
          </div>
          {sameYear.map(m => (
            <div key={m.id} className="ceremony-tooltip-film"
              onClick={() => {
                if (onOpenDetail) {
                  setShow(false);
                  onOpenDetail(m);
                }
              }}
              style={{ cursor: onOpenDetail ? 'pointer' : 'default' }}
            >
              <span className="ceremony-tooltip-name">{m.title}</span>
              {m.won && <span className="ceremony-tooltip-winner">★</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
