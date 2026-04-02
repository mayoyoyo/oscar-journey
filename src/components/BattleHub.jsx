import React, { useState, useRef, useEffect } from 'react';
import MovieBattle from './MovieBattle';
import QuoteBattle from './QuoteBattle';
import QuoteTrivia from './QuoteTrivia';

const MODES = [
  { id: 'movie', icon: '⚔️', label: 'Movie Battle', desc: 'Head-to-head films' },
  { id: 'quote', icon: '💬', label: 'Quote Battle', desc: 'Best quote wins' },
  { id: 'trivia', icon: '🧩', label: 'Quote Trivia', desc: 'Name that movie' },
];

export default function BattleHub({ profile, playlist, watchedSet, onOpenDetail, simpleBattle, onSaveProfile }) {
  const [mode, setMode] = useState('movie');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentMode = MODES.find(m => m.id === mode);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  return (
    <div className="battle-hub">
      {/* Desktop dropdown */}
      <div className="battle-mode-dropdown" ref={dropdownRef}>
        <button className="battle-mode-current" onClick={() => setDropdownOpen(p => !p)}>
          <span>{currentMode.icon} {currentMode.label}</span>
          <span className="battle-mode-arrow">{dropdownOpen ? '▴' : '▾'}</span>
        </button>
        {dropdownOpen && (
          <div className="battle-mode-menu">
            {MODES.filter(m => m.id !== mode).map(m => (
              <button key={m.id} className="battle-mode-menu-item" onClick={() => { setMode(m.id); setDropdownOpen(false); }}>
                <span className="battle-mode-menu-icon">{m.icon}</span>
                <div>
                  <div className="battle-mode-menu-label">{m.label}</div>
                  <div className="battle-mode-menu-desc">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile pills (hidden on desktop) */}
      <div className="battle-mode-pills">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`battle-mode-pill ${mode === m.id ? 'battle-mode-pill-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.icon} {m.label.split(' ')[0]}
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
