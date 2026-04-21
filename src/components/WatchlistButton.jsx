import React from 'react';

// Compact icon-only bookmark toggle. Sits to the right of the
// "Mark as Watched" button in the modal and Journey card action rows.
// Props:
//   isBookmarked — true when this film is in the user's saved list
//   isWatched    — true when this film is already watched (affects color)
//   onToggle     — () => void. Called when the user clicks the button.
//
// Visual states:
//   off             → outlined glyph, dim cream
//   saved+unwatched → filled gold glyph + gold border
//   saved+watched   → filled green glyph + green border
export default function WatchlistButton({ isBookmarked, isWatched, onToggle }) {
  const stateClass = !isBookmarked
    ? 'is-off'
    : isWatched
      ? 'is-saved-watched'
      : 'is-saved';
  const label = isBookmarked ? 'Remove from saved' : 'Save for later';
  return (
    <button
      type="button"
      className={`watchlist-btn ${stateClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 16 20" width="16" height="20">
        <path
          d="M3 1h10a1 1 0 0 1 1 1v17l-6-3.5L2 19V2a1 1 0 0 1 1-1z"
          fill={isBookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
