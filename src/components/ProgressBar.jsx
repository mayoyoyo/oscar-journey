import React from 'react';

export default function ProgressBar({ currentIdx, total, watchedCount }) {
  const pct = (currentIdx / total) * 100;
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        Film {currentIdx + 1} of {total} · {watchedCount} watched
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
