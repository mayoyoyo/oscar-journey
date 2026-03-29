import React from 'react';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-poster skeleton-shimmer" />
      <div className="skeleton-info">
        <div className="skeleton-line skeleton-shimmer" style={{ width: '60%' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '80%' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return <div className="skeleton-row skeleton-shimmer" />;
}
