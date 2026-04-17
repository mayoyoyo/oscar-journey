import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Tier 1 is always Oscar-only (essentials start at tier 2). The Oscar
  // statuette icon already signals "this is an Oscar film" — a lone pip next
  // to it is noise, not signal. Hide pips for tier < 2.
  if (tier < 2) return null;

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

      {open && createPortal(
        <div className="modal-overlay open tier-pip-modal-overlay"
          onClick={(e) => {
            // Prevent clicks inside the modal from bubbling up to cards / rows beneath.
            e.stopPropagation();
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div
            className="modal tier-pip-modal"
            role="dialog"
            aria-labelledby="tier-pip-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="film-detail-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close">✕</button>

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

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
