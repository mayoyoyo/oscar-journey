import React from 'react';

export default function Header({ onOpenSettings, profile, onLogout }) {
  return (
    <header>
      <div className="header-title">
        <span className="trophy">🏆</span>
        Oscar Best Picture Journey
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {profile && (
          <>
            <span style={{ fontSize: '0.82rem', color: 'var(--cream-dim)' }}>
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
