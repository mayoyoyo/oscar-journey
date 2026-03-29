import React from 'react';

export default function ProgressBar({ currentIdx, total, watchedCount, totalMovies }) {
  const pct = (currentIdx / total) * 100;
  const showTotal = totalMovies && totalMovies !== total;
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        Film {currentIdx + 1} of {total} · {watchedCount} of {showTotal ? totalMovies : total} watched
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
