import React from 'react';

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      <button
        className={`tab-btn ${activeTab === 'journey' ? 'active' : ''}`}
        onClick={() => onTabChange('journey')}
      >
        🎬 My Journey
      </button>
      <button
        className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
        onClick={() => onTabChange('list')}
      >
        📋 All Films A-Z
      </button>
      <button
        className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
        onClick={() => onTabChange('stats')}
      >
        📊 Stats
      </button>
    </div>
  );
}
