import React, { useState } from 'react';
import MovieBattle from './MovieBattle';
import QuoteBattle from './QuoteBattle';
import QuoteTrivia from './QuoteTrivia';

const MODES = [
  { id: 'movie', label: '⚔️ Movie', desc: 'Head-to-head films' },
  { id: 'quote', label: '💬 Quote', desc: 'Best quote wins' },
  { id: 'trivia', label: '🧩 Trivia', desc: 'Name that movie' },
];

export default function BattleHub({ profile, playlist, watchedSet, onOpenDetail, simpleBattle, onSaveProfile }) {
  const [mode, setMode] = useState('movie');

  return (
    <div className="battle-hub">
      <div className="battle-mode-selector">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`battle-mode-btn ${mode === m.id ? 'battle-mode-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="battle-mode-label">{m.label}</span>
            <span className="battle-mode-desc">{m.desc}</span>
          </button>
        ))}
      </div>

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
    </div>
  );
}
