import { useEffect, useRef, useState } from 'react';

// Small "?" affordance that reveals a short explanation on hover (desktop)
// or tap (touch). Tap-to-toggle + click-away-to-dismiss is the pattern most
// users expect from "info" chips on mobile — we implement both so the same
// component works everywhere without sniffing pointer types.
export default function InfoTooltip({ text, label = 'More info' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside tap. Runs only while open so we don't attach listeners
  // for every tooltip on screen (there can be several per page).
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`info-tooltip${open ? ' is-open' : ''}`}
      // Stop propagation so tapping the "?" inside a clickable card/tile
      // doesn't trigger the parent's click handler.
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-expanded={open}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
      >?</button>
      <span className="info-tooltip-bubble" role="tooltip">{text}</span>
    </span>
  );
}
