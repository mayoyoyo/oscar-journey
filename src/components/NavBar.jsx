import React from 'react';

const tabs = [
  { id: 'journey', label: '🎬 Journey', icon: '🎬', shortLabel: 'Journey' },
  { id: 'list', label: '📋 Films', icon: '📋', shortLabel: 'Films' },
  { id: 'battle', label: '⚔️ Battle', icon: '⚔️', shortLabel: 'Battle' },
  { id: 'leaderboard', label: '👥 Profiles', icon: '👥', shortLabel: 'Profiles' },
];

export default function NavBar({ activeTab, onTabChange, profile, onToggleTheme, isDark, onOpenSettings, onOpenInfo, onLogout, saving }) {
  return (
    <>
      <nav className="main-nav">
        <div className="nav-left">
          <span className="nav-logo">🏆</span>
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
            <span className="nav-user">
              {profile.avatar && <span className="nav-user-avatar">{profile.avatar}</span>}
              {profile.displayName}
            </span>
          )}
          <button className="nav-icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="nav-icon-btn" onClick={onOpenInfo} title="What is this?">?</button>
        <button className="nav-icon-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
          {profile && <button className="nav-icon-btn" onClick={onLogout} title="Log out">↩</button>}
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
