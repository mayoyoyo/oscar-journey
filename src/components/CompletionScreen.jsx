import React from 'react';

export default function CompletionScreen({ total, onRestart }) {
  return (
    <div className="screen active">
      <div className="complete-screen">
        <span className="big-icon">🎬</span>
        <h1>Journey Complete!</h1>
        <p>
          You've revealed all {total} films in your journey. Incredible dedication to cinema!
        </p>
        <button className="btn-primary" onClick={onRestart}>
          Start Again from Beginning
        </button>
      </div>
    </div>
  );
}
