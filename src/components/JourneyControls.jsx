import React, { useState } from 'react';
import { DEFAULT_FILTERS, ERA_LABELS, CATEGORY_LABELS, TONE_LABELS } from './SettingsModal';

export default function JourneyControls({ filters, onFiltersChange, onReshuffle, eligibleCount, totalCount, profiles, currentProfileId, onSyncJourney }) {
  const [syncTarget, setSyncTarget] = useState('');
  const currentFilters = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters?.eras || {}) },
    categories: { ...DEFAULT_FILTERS.categories, ...(filters?.categories || {}) },
    tones: { ...DEFAULT_FILTERS.tones, ...(filters?.tones || {}) },
  };

  const toggleFilter = (section, key) => {
    const updated = {
      ...currentFilters,
      [section]: { ...currentFilters[section], [key]: !currentFilters[section][key] },
    };
    onFiltersChange(updated);
  };

  const handleReshuffle = () => {
    if (window.confirm('Reshuffle your journey order? Your watched films and ratings will be kept, but you\'ll get a completely new random order.')) {
      onReshuffle();
    }
  };

  const renderChecklist = (section, labels) => (
    <div className="filter-checklist">
      {Object.entries(labels).map(([key, label]) => {
        const active = currentFilters[section][key];
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''}`}
            onClick={() => toggleFilter(section, key)}>
            <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
            <span className="filter-check-label">{label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="journey-controls">
      <div className="journey-controls-header">
        Filters
        {eligibleCount < totalCount && (
          <span style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontFamily: 'system-ui', marginLeft: '8px', fontWeight: 'normal' }}>
            {eligibleCount} of {totalCount} films
          </span>
        )}
      </div>

      <div className="filter-section">
        <div className="filter-section-label">Eras</div>
        {renderChecklist('eras', ERA_LABELS)}
      </div>

      <div className="filter-section">
        <div className="filter-section-label">Categories</div>
        {renderChecklist('categories', CATEGORY_LABELS)}
      </div>

      <div className="filter-section">
        <div className="filter-section-label">Genres</div>
        {renderChecklist('tones', TONE_LABELS)}
      </div>

      <button className="journey-reshuffle-btn" onClick={handleReshuffle}>
        Reshuffle Journey Order
      </button>

      {profiles && profiles.length > 0 && onSyncJourney && (
        <div className="journey-sync-section">
          <div className="filter-section-label" style={{ marginTop: '16px' }}>Sync Journey</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', marginBottom: '8px' }}>
            Follow another person's journey order
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="battle-profile-select" style={{ flex: 1 }} value={syncTarget} onChange={e => setSyncTarget(e.target.value)}>
              <option value="">Select a profile...</option>
              {profiles.filter(p => p.id !== currentProfileId).map(p => (
                <option key={p.id} value={p.id}>{p.avatar} {p.displayName}</option>
              ))}
            </select>
            <button
              className="journey-reshuffle-btn"
              style={{ width: 'auto', marginTop: 0 }}
              disabled={!syncTarget}
              onClick={() => {
                const target = profiles.find(p => p.id === syncTarget);
                if (target && window.confirm(`Copy ${target.displayName}'s journey order? Your watched films and ratings will be kept.`)) {
                  onSyncJourney(syncTarget);
                  setSyncTarget('');
                }
              }}
            >
              Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
