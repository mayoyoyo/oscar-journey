import React from 'react';
import { MOVIES_BY_ID } from '../data/movies';

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed({ activities, currentProfileId, onOpenDetail }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="activity-feed">
      <div className="activity-feed-title">Recent Activity</div>
      {activities.map(a => (
        <div key={a.id} className="activity-item">
          <span className="activity-avatar">{a.avatar || '\u{1F464}'}</span>
          <span className="activity-text">
            <strong>{a.profileId === currentProfileId ? 'You' : a.displayName}</strong>
            {' watched '}
            <span className="activity-movie-link" onClick={() => {
              if (onOpenDetail) {
                const movie = MOVIES_BY_ID[a.movieId];
                if (movie) onOpenDetail(movie);
              }
            }}>
              {a.movieTitle}
            </span>
            <span className="activity-year"> ({a.movieYear})</span>
          </span>
          <span className="activity-time">{timeAgo(a.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}
