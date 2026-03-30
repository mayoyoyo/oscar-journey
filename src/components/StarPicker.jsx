import React, { useState } from 'react';

// Beautiful half-star rating widget (0.5 increments, 10 stars)
export default function StarPicker({ label, value, onChange, disabled }) {
  const [hoverVal, setHoverVal] = useState(null);
  const displayVal = hoverVal !== null ? hoverVal : value;

  const handleClick = (starNum, isLeftHalf) => {
    const newVal = isLeftHalf ? starNum - 0.5 : starNum;
    onChange(newVal === value ? null : newVal);
  };

  const handleHover = (starNum, isLeftHalf) => {
    setHoverVal(isLeftHalf ? starNum - 0.5 : starNum);
  };

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
    value !== null && value !== undefined ? `${value} / 10` : 'Tap to rate';

  return (
    <div className={`star-picker ${disabled ? 'star-picker-disabled' : ''}`}>
      <div className="star-picker-label">{label}</div>
      <div className="star-picker-row">
        <div className="star-picker-stars">{stars}</div>
        <div className={`star-picker-value ${value != null ? 'has-value' : ''}`}>
          {displayText}
        </div>
      </div>
    </div>
  );
}
