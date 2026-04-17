import React, { useId } from 'react';

// Returns 'winner' (BP won / INT / ANIM / alsoWon INT|ANIM),
// 'nominee' (BP nom that didn't win), or null (essential / non-Oscar).
export function getOscarStatus(movie) {
  const alsoWon = movie.alsoWon || [];
  if (movie.category === 'BP' && movie.won) return 'winner';
  if (movie.category === 'INT' || movie.category === 'ANIM') return 'winner';
  if (alsoWon.includes('INT') || alsoWon.includes('ANIM')) return 'winner';
  if (movie.category === 'BP') return 'nominee';
  return null;
}

// Returns every Oscar statuette that applies to this film. Values:
//   'winner'  (gold)   — BP win
//   'nominee' (bronze) — BP nom that lost
//   'int'     (blue)   — won INT (alone or alongside BP)
//   'anim'    (purple) — won ANIM (alone or alongside BP)
// A BP winner that also won INT (e.g. Parasite) yields ['winner', 'int'].
// An INT-only winner (Drive My Car) yields ['int']. Amour: ['nominee', 'int'].
export function getOscarBadges(movie) {
  const out = [];
  const alsoWon = movie.alsoWon || [];
  if (movie.category === 'BP') out.push(movie.won ? 'winner' : 'nominee');
  if (movie.category === 'INT' || alsoWon.includes('INT')) out.push('int');
  if (movie.category === 'ANIM' || alsoWon.includes('ANIM')) out.push('anim');
  return out;
}

// Inline statuette — mirrors /public/favicon.svg (same shapes + gold gradient)
// so the icon matches the brand / iOS homescreen icon exactly. CSS filters in
// App.css recolor it per theme + status (bright gold / muted gold / outlined).
function StatuetteSVG() {
  const gid = useId(); // unique gradient id so multiple icons render correctly
  return (
    <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d442" />
          <stop offset="25%" stopColor="#d4af37" />
          <stop offset="60%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`}>
        <ellipse cx="50" cy="192" rx="30" ry="6" />
        <rect x="28" y="180" width="44" height="12" rx="3" />
        <ellipse cx="50" cy="180" rx="22" ry="5" />
        <ellipse cx="50" cy="175" rx="16" ry="3" />
        <rect x="36" y="168" width="28" height="7" rx="2" />
        <rect x="42" y="145" width="16" height="23" rx="2" />
        <ellipse cx="50" cy="110" rx="18" ry="38" />
        <circle cx="50" cy="62" r="12" />
        <rect x="45" y="72" width="10" height="8" />
        <path d="M32,95 Q28,85 34,78 L38,82 Q34,88 36,95 Z" />
        <path d="M68,95 Q72,85 66,78 L62,82 Q66,88 64,95 Z" />
        <rect x="48" y="42" width="4" height="50" rx="1" />
        <rect x="40" y="82" width="20" height="4" rx="2" />
        <circle cx="50" cy="40" r="4" />
      </g>
    </svg>
  );
}

const TITLES = {
  'winner':  'Academy Award winner',
  'nominee': 'Best Picture nominee',
  'int':     'Best International Feature winner',
  'anim':    'Best Animated Feature winner',
};

export default function OscarIcon({ movie, kind, size = 'sm' }) {
  // Back-compat: if no kind, derive the primary status (BP winner/nominee)
  // just like before — so existing callers that render one icon keep doing
  // exactly what they did. Multi-icon callers pass `kind` explicitly.
  const k = kind ?? getOscarStatus(movie);
  if (!k) return null;
  const title = TITLES[k] || 'Academy Award';
  return (
    <span
      className={`oscar-icon oscar-icon-${size} oscar-icon-${k}`}
      title={title}
      aria-label={title}
    >
      <StatuetteSVG />
    </span>
  );
}
