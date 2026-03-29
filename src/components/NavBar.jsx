import React from 'react';

const tabs = [
  { id: 'journey', label: '🎬 Journey' },
  { id: 'list', label: '📋 Films' },
  { id: 'battle', label: '⚔️ Battle' },
  { id: 'leaderboard', label: '👥 Profiles' },
];

export default function NavBar({ activeTab, onTabChange, profile, onToggleTheme, isDark, onOpenSettings, onLogout }) {
  return (
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
        <button className="nav-icon-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
        {profile && <button className="nav-icon-btn" onClick={onLogout} title="Log out">↩</button>}
      </div>
    </nav>
  );
}
