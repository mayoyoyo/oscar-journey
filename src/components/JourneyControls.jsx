import React, { useState } from 'react';
import { DEFAULT_FILTERS, ERA_LABELS, CATEGORY_LABELS, TONE_LABELS } from './SettingsModal';

export default function JourneyControls({ filters, onFiltersChange, onReshuffle }) {
  const [expanded, setExpanded] = useState(false);

  const currentFilters = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters?.eras || {}) },
    categories: { ...DEFAULT_FILTERS.categories, ...(filters?.categories || {}) },
    tones: { ...DEFAULT_FILTERS.tones, ...(filters?.tones || {}) },
  };

  const toggleFilter = (section, key) => {
    const updated = {
      ...currentFilters,
      [section]: {
        ...currentFilters[section],
        [key]: !currentFilters[section][key],
      },
    };
    onFiltersChange(updated);
  };

  // Count how many filters are OFF
  const totalFilters = Object.values(currentFilters.eras).length +
    Object.values(currentFilters.categories).length +
    Object.values(currentFilters.tones).length;
  const activeCount = [...Object.values(currentFilters.eras),
    ...Object.values(currentFilters.categories),
    ...Object.values(currentFilters.tones)].filter(Boolean).length;
  const filtersModified = activeCount < totalFilters;

  return (
    <div className="journey-controls">
      <div className="journey-controls-bar">
        <button
          className={`journey-controls-toggle ${filtersModified ? 'has-filters' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '\u25BE' : '\u25B8'} Filters {filtersModified && `(${activeCount}/${totalFilters})`}
        </button>
        <button className="journey-reshuffle-btn" onClick={onReshuffle}>
          🔀 Reshuffle
        </button>
      </div>

      {expanded && (
        <div className="journey-filters-panel">
          <div className="filter-section">
            <div className="filter-section-label">Eras</div>
            <div className="filter-grid">
              {Object.entries(ERA_LABELS).map(([key, label]) => (
                <button key={key}
                  className={`filter-toggle ${currentFilters.eras[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('eras', key)}
                >{label}</button>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-section-label">Categories</div>
            <div className="filter-grid">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button key={key}
                  className={`filter-toggle ${currentFilters.categories[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('categories', key)}
                >{label}</button>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-section-label">Genres</div>
            <div className="filter-grid">
              {Object.entries(TONE_LABELS).map(([key, label]) => (
                <button key={key}
                  className={`filter-toggle ${currentFilters.tones[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('tones', key)}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
