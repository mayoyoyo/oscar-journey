import React, { useState } from 'react';
import { DEFAULT_FILTERS, ERA_LABELS, CATEGORY_LABELS, TONE_LABELS } from './SettingsModal';

export default function JourneyControls({ filters, onFiltersChange, onReshuffle, eligibleCount, totalCount, profiles, currentProfileId, onSyncJourney }) {
  const [syncTarget, setSyncTarget] = useState('');
  const [openSections, setOpenSections] = useState({ eras: false, categories: false, tones: false });

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

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleReshuffle = () => {
    if (window.confirm('Reshuffle your journey order? Your watched films and ratings will be kept, but you\'ll get a completely new random order.')) {
      onReshuffle();
    }
  };

  // Count active filters per section
  const sectionCount = (section) => {
    const vals = Object.values(currentFilters[section]);
    const active = vals.filter(Boolean).length;
    return active < vals.length ? `${active}/${vals.length}` : null;
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

  const renderSection = (key, label, section, labels) => {
    const count = sectionCount(section);
    const isOpen = openSections[section];
    return (
      <div className="filter-section" key={key}>
        <button className="filter-section-toggle" onClick={() => toggleSection(section)}>
          <span className="filter-section-arrow">{isOpen ? '▾' : '▸'}</span>
          <span className="filter-section-label">{label}</span>
          {count && <span className="filter-section-count">{count}</span>}
        </button>
        {isOpen && renderChecklist(section, labels)}
      </div>
    );
  };

  return (
    <div className="journey-controls">
      <div className="journey-controls-row">
        <div className="journey-controls-left">
          <span className="journey-controls-header">
            Filters
            {eligibleCount < totalCount && (
              <span className="journey-filter-count">{eligibleCount}/{totalCount}</span>
            )}
          </span>
          {renderSection('eras', 'Eras', 'eras', ERA_LABELS)}
          {renderSection('cats', 'Categories', 'categories', CATEGORY_LABELS)}
          {renderSection('tones', 'Genres', 'tones', TONE_LABELS)}
        </div>

        <div className="journey-controls-right">
          <button className="journey-reshuffle-btn" onClick={handleReshuffle}>
            🔀 Reshuffle
          </button>

          {profiles && profiles.length > 0 && onSyncJourney && (
            <div className="journey-sync">
              <div style={{ display: 'flex', gap: '6px' }}>
                <select className="journey-sync-select" value={syncTarget} onChange={e => setSyncTarget(e.target.value)}>
                  <option value="">Sync with...</option>
                  {profiles.filter(p => p.id !== currentProfileId).map(p => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.displayName}</option>
                  ))}
                </select>
                <button
                  className="journey-sync-btn"
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
      </div>
    </div>
  );
}
