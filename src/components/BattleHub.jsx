import React, { useState } from 'react';
import MovieBattle from './MovieBattle';
import QuoteBattle from './QuoteBattle';
import QuoteTrivia from './QuoteTrivia';
import PeopleBattle from './PeopleBattle';

const MODES = [
  { id: 'movie', icon: '⚔️', label: 'Movie Battle', sub: 'Which film is better? Click to vote.' },
  { id: 'people', icon: '🎭', label: 'People Battle', sub: 'Who had the better career?' },
  { id: 'quote', icon: '💬', label: 'Quote Battle', sub: 'Which quote hits harder?' },
  { id: 'trivia', icon: '🧩', label: 'Quote Trivia', sub: 'Which movie is this quote from?' },
];

export default function BattleHub({ profile, playlist, watchedSet, onOpenDetail, simpleBattle, onSaveProfile }) {
  const [mode, setMode] = useState('movie');
  const current = MODES.find(m => m.id === mode);

  return (
    <div className="battle-hub">
      {/* Mode selector pills */}
      <div className="battle-mode-selector">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`battle-mode-btn ${mode === m.id ? 'battle-mode-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="battle-mode-label">{m.icon} {m.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Title + subtitle */}
      <h2 className="battle-mode-title">{current.label}</h2>
      <p className="battle-mode-sub">{current.sub}</p>

      {mode === 'movie' && (
        <MovieBattle
          profile={profile}
          playlist={playlist}
          watchedSet={watchedSet}
          onOpenDetail={onOpenDetail}
          simpleBattle={simpleBattle}
          onSaveProfile={onSaveProfile}
        />
      )}

      {mode === 'quote' && (
        <QuoteBattle profile={profile} onSaveProfile={onSaveProfile} />
      )}

      {mode === 'trivia' && (
        <QuoteTrivia profile={profile} onSaveProfile={onSaveProfile} />
      )}

      {mode === 'people' && (
        <PeopleBattle profile={profile} onSaveProfile={onSaveProfile} />
      )}
    </div>
  );
}
