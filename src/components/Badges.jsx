import React from 'react';
import { GENRE_LABELS } from '../data/movies';

// Full-size badges for film cards and detail modal
export function BadgeWinner() {
  return <span className="badge-winner">★ Winner</span>;
}

export function BadgeGenre({ genre }) {
  return <span className="badge-genre">{GENRE_LABELS[genre] || genre}</span>;
}

export function BadgeInt() {
  return <span className="badge-int">🌍 International Feature</span>;
}

export function BadgeAnim() {
  return <span className="badge-anim">🎨 Animated Feature</span>;
}

// Small badges for A-Z list rows
export function BadgeWinnerSm() {
  return <span className="badge-winner-sm">★ Winner</span>;
}

export function BadgeGenreSm({ genre }) {
  return <span className="badge-genre-sm">{GENRE_LABELS[genre] || genre}</span>;
}

export function BadgeIntSm() {
  return <span className="badge-int-sm">🌍 International</span>;
}

export function BadgeAnimSm() {
  return <span className="badge-anim-sm">🎨 Animated</span>;
}

export function BadgeBpSm() {
  return <span className="badge-bp-sm">Best Picture</span>;
}

// Renders the full set of badges for a movie
export function MovieBadges({ movie, small = false }) {
  const alsoWon = movie.alsoWon || [];

  if (small) {
    return (
      <span style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
        {movie.won && <BadgeWinnerSm />}
        {movie.category === 'INT' && <BadgeIntSm />}
        {movie.category === 'ANIM' && <BadgeAnimSm />}
        {movie.category === 'BP' && <BadgeBpSm />}
        {alsoWon.includes('INT') && <BadgeIntSm />}
        {alsoWon.includes('ANIM') && <BadgeAnimSm />}
        <BadgeGenreSm genre={movie.genre} />
      </span>
    );
  }

  return (
    <div className="badges">
      {movie.won && <BadgeWinner />}
      <BadgeGenre genre={movie.genre} />
      {movie.category === 'INT' && <BadgeInt />}
      {movie.category === 'ANIM' && <BadgeAnim />}
      {alsoWon.includes('INT') && <BadgeInt />}
      {alsoWon.includes('ANIM') && <BadgeAnim />}
    </div>
  );
}
