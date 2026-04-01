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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
    a.download = `the-oscars-journey-${profile.id}-backup.json`;
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
          <div className="login-avatar-selected" style={{ marginTop: '8px' }} onClick={() => setShowAvatarPicker(p => !p)}>
            <span className="login-avatar-emoji">{avatar}</span>
            <span className="login-avatar-change">{showAvatarPicker ? 'Close' : 'Tap to change'}</span>
          </div>
          {showAvatarPicker && (
            <div className="login-avatar-grid" style={{ marginTop: '8px' }}>
              {AVATAR_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  className={`login-avatar-option ${avatar === emoji ? 'selected' : ''}`}
                  onClick={() => { onAvatarChange(emoji); setShowAvatarPicker(false); }}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
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

        <div className="modal-section" style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Version</label>
            <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600 }}>v2.0.0</span>
          </div>
          <details style={{ marginTop: '8px' }}>
            <summary style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', cursor: 'pointer' }}>Changelog</summary>
            <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', lineHeight: 1.6, marginTop: '8px' }}>
              <p><strong>v2.0.0</strong> — Custom domain, Daily Oscar, card packs</p>
              <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>
                <li>Live at theoscarsjourney.com</li>
                <li>Daily Oscar quiz — guess movies from quotes & blurred posters</li>
                <li>Collectible card system with 4 rarities</li>
                <li>Card registry — unique movie+rarity combos per user</li>
                <li>Earn cards from Journey, Battle, and Daily Oscar</li>
                <li>Featured card on profile with animated rarity borders</li>
                <li>Card owner badge on film detail modals</li>
                <li>Smart battle matchmaking (Swiss/discovery/wildcard)</li>
                <li>Dynamic ELO K-factor</li>
                <li>Profile modal with 3D tilt featured card</li>
                <li>Clean URL routing (/films, /battle, /profiles)</li>
                <li>Swipe-to-rate stars on mobile</li>
                <li>Mobile-optimized film detail modal</li>
                <li>SEO meta tags, sitemap, structured data</li>
                <li>399 movie quotes for Daily Oscar</li>
                <li>5 OMDB API keys with rotation</li>
                <li>Automated daily backups</li>
              </ul>
              <p><strong>v1.0.0</strong> — Initial release</p>
              <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>
                <li>Journey mode with randomized film queue</li>
                <li>Films A-Z with checklist mode</li>
                <li>Battle mode with ELO rankings</li>
                <li>Profiles with stats and leaderboard</li>
                <li>Multi-rater support</li>
                <li>JustWatch integration</li>
              </ul>
            </div>
          </details>
        </div>

        <div className="modal-btns">
          <button className="btn-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
