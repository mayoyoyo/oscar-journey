import React from 'react';

export default function Header({ onOpenSettings }) {
  return (
    <header>
      <div className="header-title">
        <span className="trophy">🏆</span>
        Oscar Best Picture Journey
      </div>
      <button className="settings-btn" onClick={onOpenSettings} title="Settings">⚙️</button>
    </header>
  );
}
