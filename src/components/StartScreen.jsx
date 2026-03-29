import React from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';

export default function StartScreen({ onStart }) {
  const bpCount   = MOVIES.filter(m => m.category === 'BP').length;
  const intCount  = MOVIES.filter(m => m.category === 'INT').length;
  const animCount = MOVIES.filter(m => m.category === 'ANIM').length;

  return (
    <div className="screen active">
      <div className="start-screen">
        <span className="big-trophy">🏆</span>
        <h1>Oscar Best Picture Journey</h1>
        <p>
          Watch all the Academy Award Best Picture nominees and winners, plus
          International Feature and Animated Feature winners — in a
          genre-balanced order so you never watch two similar films back-to-back.
        </p>
        <div className="stat-pills">
          <div className="stat-pill"><span>{MOVIES.length}</span> Films Total</div>
          <div className="stat-pill"><span>{bpCount}</span> Best Picture Nominees</div>
          <div className="stat-pill"><span>{intCount}</span> International Winners</div>
          <div className="stat-pill"><span>{animCount}</span> Animated Winners</div>
          <div className="stat-pill">34 Years of Cinema</div>
          <div className="stat-pill"><span>{Object.keys(GENRE_LABELS).length}</span> Genres</div>
        </div>
        <button className="btn-primary" onClick={onStart}>Begin Your Journey</button>
      </div>
    </div>
  );
}
