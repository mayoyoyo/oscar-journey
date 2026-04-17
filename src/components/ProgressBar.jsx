import React from 'react';

export default function ProgressBar({ currentIdx, total, watchedCount }) {
  const pct = total > 0 ? (currentIdx / total) * 100 : 0;
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        Film {currentIdx + 1} of {total} · {watchedCount} of {total} watched
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
