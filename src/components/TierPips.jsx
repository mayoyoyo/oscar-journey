import React from 'react';
import { getTierInfo, LIST_SHORT_LABELS, MAX_TIER } from '../utils/tierInfo';

// Visual signal of how many canon lists a film appears on.
//  - `full`  (default): all MAX_TIER dots shown, filled up to tier
//  - `compact`: only filled dots shown (no empties)
// Hover/tap shows the list names.

export default function TierPips({ movie, variant = 'full', showLabel = false }) {
  const { tier, lists } = getTierInfo(movie);
  if (tier === 0) return null;

  const dots = variant === 'compact'
    ? Array.from({ length: tier }, () => true)
    : Array.from({ length: MAX_TIER }, (_, i) => i < tier);

  const title = lists.map(l => LIST_SHORT_LABELS[l] || l).join(' · ');
  const ariaLabel = `Tier ${tier} of ${MAX_TIER}. On ${lists.length} canon ${lists.length === 1 ? 'list' : 'lists'}: ${title}`;

  return (
    <span
      className={`tier-pips tier-pips-${variant} tier-${tier}`}
      title={title}
      aria-label={ariaLabel}
    >
      {dots.map((filled, i) => (
        <span key={i} className={`tier-pip ${filled ? 'filled' : 'empty'}`} />
      ))}
      {showLabel && <span className="tier-pip-label">{tier}</span>}
    </span>
  );
}
