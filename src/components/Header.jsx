import React from 'react';

export default function Header({ onOpenSettings, profile, onLogout, onOpenProfile }) {
  return (
    <header>
      <div className="header-title">
        <span className="trophy">🏆</span>
        The Oscars Journey
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {profile && (
          <>
            <span
              className="profile-name-link"
              style={{ fontSize: '0.82rem', color: 'var(--cream-dim)' }}
              onClick={() => onOpenProfile && onOpenProfile(profile.id)}
            >
              {profile.displayName}
            </span>
            <button className="settings-btn" onClick={onLogout} title="Log out"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              Log out
            </button>
          </>
        )}
        <button className="settings-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
      </div>
    </header>
  );
}
