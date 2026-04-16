import React, { useState, useEffect } from 'react';
import { getTierInfo, LIST_LABELS, LIST_SHORT_LABELS, MAX_TIER } from '../utils/tierInfo';

// Visual signal of how many canon lists a film appears on.
//  - `full`  (default): all MAX_TIER dots shown, filled up to tier
//  - `compact`: only filled dots shown (no empties)
// Click opens a modal with the full list names and a "Focus on Tier ≥ N" shortcut.
// `interactive={false}` disables the click (use for decorative pips in announcements).

export default function TierPips({ movie, variant = 'full', showLabel = false, interactive = true }) {
  const { tier, lists } = getTierInfo(movie);
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (tier === 0) return null;

  const dots = variant === 'compact'
    ? Array.from({ length: tier }, () => true)
    : Array.from({ length: MAX_TIER }, (_, i) => i < tier);

  const titleForHover = lists.map(l => LIST_SHORT_LABELS[l] || l).join(' · ');
  const ariaLabel = `Tier ${tier} of ${MAX_TIER}. On ${lists.length} canon ${lists.length === 1 ? 'list' : 'lists'}: ${titleForHover}`;

  const handleClick = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    setOpen(true);
  };

  const focusTier = () => {
    // Dispatch a global event so App can update filters without prop-drilling.
    // Sets canon focus active and minimum tier to the clicked film's tier.
    window.dispatchEvent(new CustomEvent('canon-focus-tier', { detail: { tier: Math.max(2, Math.min(4, tier)) } }));
    setOpen(false);
  };

  return (
    <>
      <span
        className={`tier-pips tier-pips-${variant} tier-${tier} ${interactive ? 'tier-pips-interactive' : ''}`}
        title={titleForHover}
        aria-label={ariaLabel}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {dots.map((filled, i) => (
          <span key={i} className={`tier-pip ${filled ? 'filled' : 'empty'}`} />
        ))}
        {showLabel && <span className="tier-pip-label">{tier}</span>}
      </span>

      {open && (
        <div className="modal-overlay open tier-pip-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="modal tier-pip-modal" role="dialog" aria-labelledby="tier-pip-modal-title">
            <button className="film-detail-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>

            <div className="tier-pip-modal-header">
              <span className={`tier-pips tier-${tier}`} style={{ padding: '5px 10px' }}>
                {Array.from({ length: tier }, (_, i) => (
                  <span key={i} className="tier-pip filled" />
                ))}
                <span className="tier-pip-label">{tier}</span>
              </span>
              <h2 id="tier-pip-modal-title" className="tier-pip-modal-title">
                Tier {tier} of {MAX_TIER}
              </h2>
            </div>
            <p className="tier-pip-modal-sub">
              <strong>{movie.title}</strong> appears on {lists.length} canon {lists.length === 1 ? 'list' : 'lists'}
            </p>

            <ul className="tier-pip-modal-lists">
              {lists.map(l => (
                <li key={l} className={`tier-pip-list-item ${l === 'OSCAR' ? 'is-oscar' : ''}`}>
                  <span className="tier-pip-list-short">{LIST_SHORT_LABELS[l] || l}</span>
                  <span className="tier-pip-list-full">{LIST_LABELS[l]}</span>
                </li>
              ))}
            </ul>

            {tier >= 2 && tier <= 4 && movie.category === 'ESSENTIAL' && (
              <button className="tier-pip-focus-btn" onClick={focusTier}>
                Focus on Tier ≥ {tier} essentials
                <span className="tier-pip-focus-sub">show only canon films this strong</span>
              </button>
            )}
            {tier > 4 && movie.category === 'ESSENTIAL' && (
              <button className="tier-pip-focus-btn" onClick={() => {
                window.dispatchEvent(new CustomEvent('canon-focus-tier', { detail: { tier: 4 } }));
                setOpen(false);
              }}>
                Focus on Tier ≥ 4 essentials
                <span className="tier-pip-focus-sub">show the iron-clad canon (57 films)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
