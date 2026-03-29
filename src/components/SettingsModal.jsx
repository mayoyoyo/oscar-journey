import React, { useState } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';

const DEFAULT_FILTERS = {
  eras: { '70s80s': true, '90s': true, '00s': true, '10s': true, '20s': true },
  categories: { BP: true, INT: true, ANIM: true },
  tones: {
    drama: true, thriller: true, comedy: true, scifi: true,
    war: true, biopic: true, musical: true, action: true, animation: true,
  },
  smart: {
    skipWatched: true,
    winnersOnly: false,
    unwatchedByAll: false,
  },
};

const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  winnersOnly: 'Winners only',
  unwatchedByAll: 'Unwatched by everyone',
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

export { DEFAULT_FILTERS, ERA_LABELS, TONE_LABELS, CATEGORY_LABELS, SMART_LABELS };

export default function SettingsModal({ raters, onRatersChange, avatar, onAvatarChange, allowSkip, onAllowSkipChange, onClose, onClearCache, profile, onLogout }) {
  const [editRaters, setEditRaters] = useState(raters);
  const [newName, setNewName] = useState('');

  const handleExportData = () => {
    if (!profile) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        avatar: profile.avatar,
        watched: profile.watched || [],
        ratings: profile.ratings || {},
        personalElo: profile.personalElo || {},
        raters: profile.raters || [],
        seed: profile.seed,
        currentIdx: profile.currentIdx,
        filters: profile.filters,
        syncedWith: profile.syncedWith,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oscar-journey-${profile.id}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
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

        <div className="modal-section">
          <label>Journey</label>
          <div
            className={`settings-toggle-row ${allowSkip ? 'active' : ''}`}
            onClick={() => onAllowSkipChange(!allowSkip)}
          >
            <span className="settings-toggle-switch">
              <span className="settings-toggle-knob" />
            </span>
            <span className="settings-toggle-label">Allow skipping films</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: '4px' }}>
            Shows a skip button on the journey card. We don't recommend it though. 😤
          </p>
        </div>

        {/* Download My Data */}
        {profile && (
          <div className="modal-section">
            <button
              onClick={handleExportData}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Download My Data
            </button>
            <p style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: '2px' }}>
              Export your watched films, ratings, and all profile data as a backup.
            </p>
          </div>
        )}

        {/* Clear Poster Cache */}
        <div className="modal-section">
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

        {profile && onLogout && (
          <div className="modal-section" style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => {
                if (window.confirm('Log out? Your data is saved.')) onLogout();
              }}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--cream-dim)',
                fontSize: '0.85rem',
                padding: '8px 20px',
                borderRadius: '50px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Log Out
            </button>
          </div>
        )}

        <div className="modal-btns">
          <button className="btn-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
