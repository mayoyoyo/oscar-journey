import React, { useState, useEffect } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';

export const tabs = [
  { id: 'journey', label: '🎬 Journey', icon: '🎬', shortLabel: 'Journey' },
  { id: 'list', label: '📋 Films', icon: '📋', shortLabel: 'Films' },
  { id: 'battle', label: '⚔️ Battle', icon: '⚔️', shortLabel: 'Battle' },
  { id: 'leaderboard', label: '👥 Profiles', icon: '👥', shortLabel: 'Profiles' },
];

export default function NavBar({ activeTab, onTabChange, profile, onToggleTheme, isDark, onOpenSettings, onOpenInfo, onAvatarChange, saving, onOpenProfile }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const close = () => setShowEmojiPicker(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showEmojiPicker]);

  return (
    <>
      <nav className="main-nav">
        <div className="nav-left">
          <div className="nav-brand-group">
            <svg className="nav-logo-oscar" viewBox="0 0 100 200" width="14" height="26">
              <defs>
                <linearGradient id="oscarGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5d442"/>
                  <stop offset="25%" stopColor="#d4af37"/>
                  <stop offset="60%" stopColor="#c9a227"/>
                  <stop offset="100%" stopColor="#8b6914"/>
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="192" rx="30" ry="6" fill="url(#oscarGold)"/>
              <rect x="28" y="180" width="44" height="12" rx="3" fill="url(#oscarGold)"/>
              <ellipse cx="50" cy="180" rx="22" ry="5" fill="url(#oscarGold)"/>
              <ellipse cx="50" cy="175" rx="16" ry="3" fill="url(#oscarGold)"/>
              <rect x="36" y="168" width="28" height="7" rx="2" fill="url(#oscarGold)"/>
              <rect x="42" y="145" width="16" height="23" rx="2" fill="url(#oscarGold)"/>
              <ellipse cx="50" cy="110" rx="18" ry="38" fill="url(#oscarGold)"/>
              <circle cx="50" cy="62" r="12" fill="url(#oscarGold)"/>
              <rect x="45" y="72" width="10" height="8" fill="url(#oscarGold)"/>
              <path d="M32,95 Q28,85 34,78 L38,82 Q34,88 36,95 Z" fill="url(#oscarGold)"/>
              <path d="M68,95 Q72,85 66,78 L62,82 Q66,88 64,95 Z" fill="url(#oscarGold)"/>
              <rect x="48" y="42" width="4" height="50" rx="1" fill="url(#oscarGold)"/>
              <rect x="40" y="82" width="20" height="4" rx="2" fill="url(#oscarGold)"/>
              <circle cx="50" cy="40" r="4" fill="url(#oscarGold)"/>
            </svg>
            <span className="nav-brand">
              <span className="nav-brand-top">THE OSCARS</span>
              <span className="nav-brand-bottom">JOURNEY</span>
            </span>
          </div>
        </div>
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          {profile && (
            <span className="nav-user profile-name-link" onClick={() => onOpenProfile && onOpenProfile(profile.id)}>
              {profile.avatar && (
                <span className="nav-user-avatar">{profile.avatar}</span>
              )}
              {profile.displayName}
            </span>
          )}
          <button className="nav-icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="nav-icon-btn" onClick={onOpenInfo} title="What is this?">?</button>
          <button className="nav-icon-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
        </div>
      </nav>

    </>
  );
}
