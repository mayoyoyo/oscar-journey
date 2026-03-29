import React from 'react';

export default function NavButtons({ currentIdx, total, onPrev, onNext, canAdvance }) {
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === total - 1;

  return (
    <div className="nav-row">
      <button className="btn-prev" onClick={onPrev} disabled={isFirst}>
        ← Previous
      </button>
      <button className="btn-next" onClick={onNext} disabled={!canAdvance}>
        {!canAdvance ? '\uD83D\uDD12 Watch & Rate to Continue' : isLast ? '\u2605 Complete Journey' : 'Next Film \u2192'}
      </button>
    </div>
  );
}
