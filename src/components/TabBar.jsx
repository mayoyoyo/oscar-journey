import React from 'react';

const tabs = [
  { id: 'journey', label: '🎬 My Journey' },
  { id: 'list', label: '📋 All Films A-Z' },
  { id: 'stats', label: '📊 Stats' },
  { id: 'battle', label: '⚔️ Battle' },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
