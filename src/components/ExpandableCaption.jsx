import { useState } from 'react';

// Single-line caption with a "…" affordance that expands to the full text
// on click. Used for score-explainer blurbs (Canon Score, Cards) where we
// want the card to stay compact by default but still offer transparency
// on demand. `children` is the full caption content — can include JSX.
export default function ExpandableCaption({ children, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`expandable-caption ${expanded ? 'is-expanded' : ''} ${className}`}>
      <div className="expandable-caption-text">{children}</div>
      <button
        type="button"
        className="expandable-caption-toggle"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'less' : 'more'}
      </button>
    </div>
  );
}
