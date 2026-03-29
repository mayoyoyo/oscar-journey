import React, { useState, useEffect } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';

const tabs = [
  { id: 'journey', label: '🎬 Journey', icon: '🎬', shortLabel: 'Journey' },
  { id: 'list', label: '📋 Films', icon: '📋', shortLabel: 'Films' },
  { id: 'battle', label: '⚔️ Battle', icon: '⚔️', shortLabel: 'Battle' },
  { id: 'leaderboard', label: '👥 Profiles', icon: '👥', shortLabel: 'Profiles' },
];

export default function NavBar({ activeTab, onTabChange, profile, onToggleTheme, isDark, onOpenSettings, onOpenInfo, onAvatarChange, saving }) {
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
          <svg className="nav-logo-svg" viewBox="0 0 64 64" width="20" height="20">
            <defs>
              <linearGradient id="navGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0d060"/>
                <stop offset="50%" stopColor="#c9a84c"/>
                <stop offset="100%" stopColor="#8b6914"/>
              </linearGradient>
            </defs>
            <rect x="18" y="56" width="28" height="4" rx="2" fill="url(#navGold)"/>
            <rect x="24" y="50" width="16" height="6" rx="1" fill="url(#navGold)"/>
            <rect x="29" y="38" width="6" height="12" rx="1" fill="url(#navGold)"/>
            <ellipse cx="32" cy="24" rx="12" ry="16" fill="url(#navGold)"/>
            <circle cx="32" cy="10" r="6" fill="url(#navGold)"/>
            <rect x="16" y="18" width="10" height="3" rx="1.5" fill="url(#navGold)" transform="rotate(-20 21 19.5)"/>
            <rect x="38" y="18" width="10" height="3" rx="1.5" fill="url(#navGold)" transform="rotate(20 43 19.5)"/>
          </svg>
          <span className="nav-brand">Oscar Journey</span>
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
            <span className="nav-user" style={{ position: 'relative' }}>
              {profile.avatar && (
                <span className="nav-user-avatar nav-avatar-clickable"
                  onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(prev => !prev); }}
                  title="Change avatar"
                >
                  {profile.avatar}
                </span>
              )}
              {profile.displayName}
              {showEmojiPicker && (
                <div className="nav-emoji-picker">
                  {AVATAR_EMOJIS.map((emoji, i) => (
                    <button key={i} className={`nav-emoji-option ${profile.avatar === emoji ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAvatarChange(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >{emoji}</button>
                  ))}
                </div>
              )}
            </span>
          )}
          <button className="nav-icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="nav-icon-btn" onClick={onOpenInfo} title="What is this?">?</button>
          <button className="nav-icon-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
        </div>
      </nav>

      {/* Bottom tab bar for mobile */}
      <div className="mobile-tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="mobile-tab-icon">{tab.icon}</span>
            <span className="mobile-tab-label">{tab.shortLabel}</span>
          </button>
        ))}
      </div>
    </>
  );
}
