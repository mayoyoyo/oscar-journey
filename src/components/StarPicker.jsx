import React, { useState, useRef, useCallback } from 'react';

// Beautiful half-star rating widget (0.5 increments, 10 stars) with touch-swipe support
export default function StarPicker({ label, value, onChange, disabled }) {
  const [hoverVal, setHoverVal] = useState(null);
  const starsRef = useRef(null);
  const displayVal = hoverVal !== null ? hoverVal : value;

  const handleClick = (starNum, isLeftHalf) => {
    if (disabled) return;
    const newVal = isLeftHalf ? starNum - 0.5 : starNum;
    onChange(newVal === value ? null : newVal);
  };

  const handleHover = (starNum, isLeftHalf) => {
    if (disabled) return;
    setHoverVal(isLeftHalf ? starNum - 0.5 : starNum);
  };

  // Touch rating: any tap or drag on the row picks the value from X coordinate.
  // Avoids the 11px-wide half-star hit-target precision problem on mobile.
  const getValFromTouch = useCallback((touchX) => {
    const el = starsRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = touchX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const raw = pct * 10;
    return Math.max(0.5, Math.round(raw * 2) / 2);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    e.preventDefault(); // suppress the synthesized click on the underlying half-star spans
    const val = getValFromTouch(e.touches[0].clientX);
    if (val !== null) {
      setHoverVal(val);
      // Light haptic feedback on devices that support it (Android Chrome, etc.)
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }, [disabled, getValFromTouch]);

  const handleTouchMove = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const val = getValFromTouch(e.touches[0].clientX);
    if (val !== null && val !== hoverVal) {
      setHoverVal(val);
      if (navigator.vibrate) navigator.vibrate(4);
    }
  }, [disabled, getValFromTouch, hoverVal]);

  const handleTouchEnd = useCallback((e) => {
    if (disabled) return;
    const val = hoverVal;
    setHoverVal(null);
    if (val !== null) onChange(val === value ? null : val);
  }, [disabled, hoverVal, onChange, value]);

  const stars = [];
  for (let i = 1; i <= 10; i++) {
    const fillAmount =
      displayVal === null || displayVal === undefined
        ? 0
        : displayVal >= i
          ? 1
          : displayVal >= i - 0.5
            ? 0.5
            : 0;

    stars.push(
      <span key={i} className="star-container" onMouseLeave={() => setHoverVal(null)}>
        <span
          className="star-hit-left"
          onClick={() => handleClick(i, true)}
          onMouseEnter={() => handleHover(i, true)}
        />
        <span
          className="star-hit-right"
          onClick={() => handleClick(i, false)}
          onMouseEnter={() => handleHover(i, false)}
        />
        <svg className="star-svg" viewBox="0 0 24 24" width="22" height="22">
          <defs>
            <linearGradient id={`starGrad-${label}-${i}`}>
              <stop offset={fillAmount === 1 ? '100%' : fillAmount === 0.5 ? '50%' : '0%'} stopColor="var(--gold)" />
              <stop offset={fillAmount === 1 ? '100%' : fillAmount === 0.5 ? '50%' : '0%'} stopColor="var(--bg3)" />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={`url(#starGrad-${label}-${i})`}
            stroke="var(--gold)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  const displayText =
    value !== null && value !== undefined ? `${value} / 10` : 'Slide to rate';

  return (
    <div className={`star-picker ${disabled ? 'star-picker-disabled' : ''}`}>
      <div className="star-picker-label">{label}</div>
      <div className="star-picker-row">
        <div
          className="star-picker-stars"
          ref={starsRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {stars}
        </div>
        <div className={`star-picker-value ${value != null ? 'has-value' : ''}`}>
          {displayText}
        </div>
      </div>
    </div>
  );
}
