import React from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';

export default function StartScreen({ onStart }) {
  const bpCount   = MOVIES.filter(m => m.category === 'BP').length;
  const intCount  = MOVIES.filter(m => m.category === 'INT').length;
  const animCount = MOVIES.filter(m => m.category === 'ANIM').length;
  const decades   = Math.ceil((2025 - 1970) / 10);

  return (
    <div className="screen active">
      <div className="start-screen">
        <span className="big-trophy">🏆</span>
        <h1>The Oscars Journey</h1>
        <p>
          Stop scrolling Netflix for 45 minutes and watching nothing. We picked {MOVIES.length} Oscar-nominated films and put them in a random order so you don't have to think — just press play.
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--cream-dim)', marginBottom: '6px' }}>
          The journey mixes genres, decades, and categories so you never watch two similar films back-to-back. Rate every film, battle them head-to-head, and see how your taste compares with friends.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', fontStyle: 'italic' }}>
          Yes, there's a skip button. No, you shouldn't use it. The whole point is watching films you wouldn't normally pick. Trust the process.
        </p>
        <div className="stat-pills">
          <div className="stat-pill"><span>{MOVIES.length}</span> Films</div>
          <div className="stat-pill"><span>{bpCount}</span> Best Picture</div>
          <div className="stat-pill"><span>{intCount}</span> International</div>
          <div className="stat-pill"><span>{animCount}</span> Animated</div>
          <div className="stat-pill"><span>{decades}</span> Decades</div>
          <div className="stat-pill"><span>{Object.keys(GENRE_LABELS).length}</span> Genres</div>
        </div>
        <button className="btn-primary" onClick={onStart}>Begin Your Journey</button>
      </div>
    </div>
  );
}
