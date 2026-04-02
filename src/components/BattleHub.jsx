import React, { useState, useRef, useEffect } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current = MODES.find(m => m.id === mode);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <div className="battle-hub">
      {/* Title doubles as mode selector */}
      <div className="battle-title-selector" ref={menuRef}>
        <button className="battle-title-btn" onClick={() => setMenuOpen(p => !p)}>
          <h2 className="battle-title-text">{current.label}</h2>
          <span className="battle-title-arrow">{menuOpen ? '▴' : '▾'}</span>
        </button>
        <p className="battle-title-sub">{current.sub}</p>

        {menuOpen && (
          <div className="battle-title-menu">
            {MODES.filter(m => m.id !== mode).map(m => (
              <button key={m.id} className="battle-title-menu-item" onClick={() => { setMode(m.id); setMenuOpen(false); }}>
                <span className="battle-title-menu-icon">{m.icon}</span>
                <span className="battle-title-menu-label">{m.label}</span>
              </button>
            ))}
          </div>
        )}
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

      {mode === 'people' && (
        <PeopleBattle profile={profile} onSaveProfile={onSaveProfile} />
      )}
    </div>
  );
}
