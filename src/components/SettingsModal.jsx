import React, { useState } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';

const DEFAULT_FILTERS = {
  eras: { '70s80s': true, '90s': true, '00s': true, '10s': true, '20s': true },
  categories: { BP: true, INT: true, ANIM: true },
  tones: {
    drama: true, thriller: true, comedy: true, scifi: true,
    war: true, biopic: true, musical: true, action: true, animation: true,
  },
};

const ERA_LABELS = {
  '70s80s': '1970s\u20131980s',
  '90s': '1990s',
  '00s': '2000s',
  '10s': '2010s',
  '20s': '2020s',
};

const CATEGORY_LABELS = {
  BP: 'Best Picture',
  INT: 'International',
  ANIM: 'Animated',
};

const TONE_LABELS = {
  drama: 'Drama & Historical',
  thriller: 'Thriller & Crime',
  comedy: 'Comedy & Romance',
  scifi: 'Sci-Fi & Fantasy',
  war: 'War',
  biopic: 'Biopic',
  musical: 'Musical',
  action: 'Action & Adventure',
  animation: 'Animation',
};

export { DEFAULT_FILTERS, ERA_LABELS, TONE_LABELS, CATEGORY_LABELS };

export default function SettingsModal({ raters, onRatersChange, avatar, onAvatarChange, onClose, onReshuffle, onClearCache, profile, filters, onFiltersChange }) {
  const [editRaters, setEditRaters] = useState(raters);
  const [newName, setNewName] = useState('');

  // Merge saved filters with defaults so new keys are always present
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

  const addRater = () => {
    const name = newName.trim();
    if (!name || editRaters.some(r => r.toLowerCase() === name.toLowerCase())) return;
    const updated = [...editRaters, name];
    setEditRaters(updated);
    onRatersChange(updated);
    setNewName('');
  };

  const removeRater = (idx) => {
    if (editRaters.length <= 1) return; // keep at least one
    const updated = editRaters.filter((_, i) => i !== idx);
    setEditRaters(updated);
    onRatersChange(updated);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <h2>Settings</h2>

        <div className="modal-section">
          <label>Avatar</label>
          <div className="avatar-grid" style={{ marginTop: '8px', marginBottom: '8px' }}>
            {AVATAR_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                className={`avatar-option ${avatar === emoji ? 'selected' : ''}`}
                onClick={() => onAvatarChange(emoji)}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <label>Raters</label>
          <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginTop: '2px', marginBottom: '12px' }}>
            Add or remove people who rate films. Each person gets their own star rating on every film.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {editRaters.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.92rem',
                  color: 'var(--cream)',
                }}>
                  {name}
                </span>
                <button
                  onClick={() => removeRater(i)}
                  disabled={editRaters.length <= 1}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: editRaters.length <= 1 ? 'var(--bg3)' : '#b05050',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: editRaters.length <= 1 ? 'default' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRater()}
                placeholder="Add a name..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--cream)',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={addRater}
                disabled={!newName.trim()}
                style={{
                  background: newName.trim() ? 'var(--gold)' : 'var(--bg3)',
                  color: newName.trim() ? '#fffaee' : 'var(--cream-dim)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  cursor: newName.trim() ? 'pointer' : 'default',
                  fontSize: '0.85rem',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Journey Filters */}
        <div className="modal-section">
          <label>Journey Filters</label>
          <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginTop: '2px', marginBottom: '12px' }}>
            Control which films appear in your journey. Disabled categories are skipped.
          </p>

          <div className="filter-section">
            <div className="filter-section-label">Eras</div>
            <div className="filter-grid">
              {Object.entries(ERA_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filter-toggle ${currentFilters.eras[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('eras', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-label">Categories</div>
            <div className="filter-grid">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filter-toggle ${currentFilters.categories[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('categories', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-label">Genres</div>
            <div className="filter-grid">
              {Object.entries(TONE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filter-toggle ${currentFilters.tones[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter('tones', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reshuffle + Cache */}
        <div className="modal-section">
          <label style={{ marginBottom: '10px', display: 'block' }}>Journey</label>
          <button className="btn-danger" onClick={onReshuffle} style={{ marginBottom: '6px' }}>
            Reshuffle Journey
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--cream-dim)', marginTop: '2px', marginBottom: '16px' }}>
            Get a new random order for unwatched films. Your watched films and ratings are preserved.
          </p>
          <button
            onClick={onClearCache}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cream-dim)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Clear Poster Cache
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: '2px' }}>
            Re-download movie posters and info from OMDb.
          </p>
        </div>

        <div className="modal-btns">
          <button className="btn-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
