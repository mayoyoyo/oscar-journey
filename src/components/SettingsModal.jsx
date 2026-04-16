import React, { useState } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';
import { GENRE_LABELS } from '../data/movies';

const DEFAULT_FILTERS = {
  eras: {
    '1910s': true, '1920s': true, '1930s': true, '1940s': true, '1950s': true, '1960s': true,
    '70s': true, '80s': true, '90s': true, '00s': true, '10s': true, '20s': true,
  },
  categories: { BP: true, INT: true, ANIM: true, ESSENTIAL: true },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  runtimes: { short: true, medium: true, long: true },
  // Minimum tier required for ESSENTIAL films. 3 = strong consensus (143 films);
  // 2 = lenient consensus (438 films). Oscar films (BP/INT/ANIM) ignore this.
  minEssentialTier: 3,
  smart: {
    skipWatched: false,
    winnersOnly: false,
    unwatchedByAll: false,
  },
};

const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  winnersOnly: 'Oscar winners only',
  unwatchedByAll: 'Unwatched by everyone',
};

const ERA_LABELS = {
  '1910s': '1910s (silent era)',
  '1920s': '1920s',
  '1930s': '1930s',
  '1940s': '1940s',
  '1950s': '1950s',
  '1960s': '1960s',
  '70s': '1970s',
  '80s': '1980s',
  '90s': '1990s',
  '00s': '2000s',
  '10s': '2010s',
  '20s': '2020s',
};

const CATEGORY_LABELS = {
  BP: 'Best Picture',
  INT: 'International',
  ANIM: 'Animated',
  ESSENTIAL: 'Essential (must-watch)',
};

export { DEFAULT_FILTERS, ERA_LABELS, GENRE_LABELS, CATEGORY_LABELS, SMART_LABELS };

export default function SettingsModal({ raters, onRatersChange, avatar, onAvatarChange, allowSkip, onAllowSkipChange, simpleBattle, onSimpleBattleChange, privateProfile, onPrivateProfileChange, onClose, onClearCache, profile, onLogout }) {
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
        watched: profile.watched,
        ratings: profile.ratings,
        raters: profile.raters,
        skipCount: profile.skipCount,
        personalElo: profile.personalElo,
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
    if (!name || editRaters.includes(name)) return;
    const updated = [...editRaters, name];
    setEditRaters(updated);
    setNewName('');
    onRatersChange(updated);
  };

  const removeRater = (idx) => {
    if (editRaters.length <= 1) return;
    const updated = editRaters.filter((_, i) => i !== idx);
    setEditRaters(updated);
    onRatersChange(updated);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal settings-modal">
        <button className="settings-close" onClick={onClose}>✕</button>
        <h2 className="settings-title">Settings</h2>

        {/* Avatar */}
        <div className="settings-section">
          <label className="settings-label">Avatar</label>
          <div className="login-avatar-selected" onClick={() => setShowAvatarPicker(p => !p)}>
            <span className="login-avatar-emoji">{avatar}</span>
            <span className="login-avatar-change">{showAvatarPicker ? 'Close' : 'Tap to change'}</span>
          </div>
          {showAvatarPicker && (
            <div className="login-avatar-grid" style={{ marginTop: '8px' }}>
              {AVATAR_EMOJIS.map((emoji, i) => (
                <button key={i} className={`login-avatar-option ${avatar === emoji ? 'selected' : ''}`}
                  onClick={() => { onAvatarChange(emoji); setShowAvatarPicker(false); }} type="button"
                >{emoji}</button>
              ))}
            </div>
          )}
        </div>

        {/* Raters */}
        <div className="settings-section">
          <label className="settings-label">Raters</label>
          <p className="settings-hint">Add people who rate films with you. Each gets their own star rating.</p>
          <div className="settings-raters">
            {editRaters.map((name, i) => (
              <div key={i} className="settings-rater">
                <span className="settings-rater-name">{name}</span>
                <button className="settings-rater-remove" onClick={() => removeRater(i)}
                  disabled={editRaters.length <= 1}>✕</button>
              </div>
            ))}
            <div className="settings-rater-add">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRater()} placeholder="Add a name..."
                className="settings-rater-input" />
              <button className="settings-rater-btn" onClick={addRater} disabled={!newName.trim()}>Add</button>
            </div>
          </div>
        </div>

        {/* Journey toggle */}
        <div className="settings-section">
          <label className="settings-label">Journey</label>
          <div className={`settings-toggle-row ${allowSkip ? 'active' : ''}`} onClick={() => onAllowSkipChange(!allowSkip)}>
            <span className="settings-toggle-switch"><span className="settings-toggle-knob" /></span>
            <span className="settings-toggle-label">Allow skipping films</span>
          </div>
          <p className="settings-hint">Shows a skip button on the journey card. We don't recommend it. 😤</p>
        </div>

        {/* Battle toggle */}
        <div className="settings-section">
          <label className="settings-label">Battle</label>
          <div className={`settings-toggle-row ${simpleBattle ? 'active' : ''}`} onClick={() => onSimpleBattleChange(!simpleBattle)}>
            <span className="settings-toggle-switch"><span className="settings-toggle-knob" /></span>
            <span className="settings-toggle-label">Simple battle graphics</span>
          </div>
          <p className="settings-hint">Removes animations for faster battles. Visual feedback still shown.</p>
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <label className="settings-label">Privacy</label>
          <div className={`settings-toggle-row ${privateProfile ? 'active' : ''}`} onClick={() => onPrivateProfileChange(!privateProfile)}>
            <span className="settings-toggle-switch"><span className="settings-toggle-knob" /></span>
            <span className="settings-toggle-label">Private profile</span>
          </div>
          <p className="settings-hint">Hide your profile from the Profiles page. Others won't see your stats, watched films, or cards.</p>
        </div>

        {/* Actions */}
        <div className="settings-section settings-actions">
          {profile && (
            <button className="settings-action-btn" onClick={handleExportData}>
              <span>📥</span> Download My Data
            </button>
          )}
          <button className="settings-action-btn" onClick={onClearCache}>
            <span>🔄</span> Clear Poster Cache
          </button>
          {profile && onLogout && (
            <button className="settings-action-btn settings-logout" onClick={() => {
              if (window.confirm('Log out? Your data is saved.')) onLogout();
            }}>
              Log Out
            </button>
          )}
        </div>

        {/* Version */}
        <div className="settings-version">
          <div className="settings-version-row">
            <span className="settings-version-label">Version</span>
            <span className="settings-version-num">v2.4.5</span>
          </div>
          <details className="settings-changelog">
            <summary>Changelog</summary>
            <div className="settings-changelog-content">
              <p><strong>v2.4.5</strong> — Daily Oscar watched badge & winner-label fixes</p>
              <ul>
                <li>Daily Oscar — green "✓ Watched" pill on the poster when the mystery movie is already in your watched list</li>
                <li>Fixed International and Animated Feature winners being labeled "Best Picture" everywhere (film cards, detail modal, profile tiles, badges)</li>
                <li>Fixed Oscar count being inflated by 1 for International and Animated winners (e.g. A Separation now shows 1 Oscar instead of 2)</li>
                <li>Films filtered by International or Animated now also include Best Picture nominees that won in those categories (e.g. Parasite, Life Is Beautiful, Drive My Car)</li>
              </ul>
              <p><strong>v2.4.4</strong> — Journey polish round 2</p>
              <ul>
                <li>Refined typography across journey action buttons (Mark as Watched, Watched, Skip, Next Film) — uppercase with wider tracking, no more mixed-case generic feel</li>
                <li>Smoother next-film transition — no more spinner flash when navigating between films</li>
                <li>Quirky tagline at the bottom no longer re-rolls every time you interact with the page; only changes per film</li>
                <li>Clicking the same star rating no longer clears it (was causing accidental resets)</li>
                <li>Journey filter panel now matches the Films page styling</li>
              </ul>
              <p><strong>v2.4.3</strong> — Journey polish</p>
              <ul>
                <li>Smoother film-to-film transition in Journey — fade animation no longer interpolates layout/colors mid-swap</li>
                <li>Next Film button — refined typography (uppercase with wider tracking) and the button no longer morphs when toggling between "Next Film" and "Watch & Rate to Continue"</li>
                <li>Fixed Journey filter panel sizing on mobile — no longer horizontally cramped</li>
              </ul>
              <p><strong>v2.4.2</strong> — Collapsible filter panels</p>
              <ul>
                <li>Filter panels in both Films and Journey now collapse by default — active filter count shown in the header so you can see at a glance whether anything's narrowing your view</li>
                <li>Renamed "Wins" filter to "Oscars Won" for clarity</li>
              </ul>
              <p><strong>v2.4.1</strong> — Modal polish & runtime fixes</p>
              <ul>
                <li>Best Picture, Animated Feature, and International Feature wins in the film modal now link to acceptance speech searches (matching the other major awards)</li>
                <li>Fixed missing runtime data for 10 films where OMDB had a year mismatch or N/A runtime (Birdman, The Hurt Locker, Spirited Away, etc.)</li>
              </ul>
              <p><strong>v2.4.0</strong> — Filters & Daily Oscar fix</p>
              <ul>
                <li>Films tab — new filter panel: Eras, Categories, Genres, Runtime, and Wins (filter by what Oscars a film won)</li>
                <li>Runtime filter added to Journey</li>
                <li>Daily Oscar fix — picks no longer cluster on the same year</li>
              </ul>
              <p><strong>v2.3.3</strong> — Smarter journey shuffle</p>
              <ul>
                <li>New diversity algorithm — no more back-to-back films with the same genre or decade</li>
                <li>International and Animated films now sprinkled evenly throughout instead of at fixed intervals</li>
                <li>Reshuffling produces noticeably different journeys each time</li>
                <li>Hit Reshuffle for the new algorithm to take effect</li>
              </ul>
              <p><strong>v2.3.2</strong> — Sync fix</p>
              <ul>
                <li>Syncing now jumps to the other person's current film instead of your first unwatched</li>
                <li>Skip-watched filter temporarily disabled during sync so you stay on their film</li>
                <li>Unsyncing restores your original filters and position</li>
              </ul>
              <p><strong>v2.3.1</strong> — Private profiles</p>
              <ul>
                <li>Private profile toggle — hide from Profiles page</li>
              </ul>
              <p><strong>v2.3.0</strong> — Card rarity tuning, quote expansion, battle polish</p>
              <ul>
                <li>Harder card rarities — 80% Common, 15% Rare, 4% Epic, 1% Legendary</li>
                <li>902 movie quotes (up from 555) — every movie has 2+ quotes</li>
                <li>ELO changes overlay instead of resizing cards</li>
                <li>Card swap fixed on mobile — fits 3-5 cards</li>
                <li>IMDb ratings link to IMDb</li>
                <li>Decade progress includes all eras (1970-2025)</li>
                <li>Collector Score label with tooltip</li>
                <li>Redesigned settings modal</li>
                <li>Stats tables aligned consistently</li>
                <li>Profile scroll to top when clicking a user</li>
              </ul>
              <p><strong>v2.2.0</strong> — Visual refresh, new logo, mobile polish</p>
              <ul>
                <li>New Oscar statuette logo and favicon</li>
                <li>Typography upgrade — Playfair Display headings, DM Sans body</li>
                <li>3D poster tilt on hover in Journey</li>
                <li>Battle mode overhaul — dramatic hover, winner/loser animations</li>
                <li>Earn a card every time you advance in Journey</li>
                <li>Unique cards — each movie+rarity combo held by one person</li>
                <li>Card owner shown on film detail modals</li>
                <li>Dynamic wallet size — grows as you watch more films</li>
                <li>Statistics visible on all profiles</li>
                <li>Redesigned info page and journey filters</li>
                <li>Mobile optimized — compact journey card, swipe-to-rate, better modals</li>
                <li>Daily Oscar syncs across devices</li>
              </ul>
              <p><strong>v2.1.0</strong> — Card uniqueness, journey rewards</p>
              <ul>
                <li>Card registry — unique movie+rarity combos per user</li>
                <li>Card earned banner after journey films</li>
                <li>Holographic sheen on wallet cards</li>
                <li>Ambient poster color extraction</li>
                <li>Profile deep linking (/profiles/username)</li>
                <li>Poster fixes for Birdman, Il Postino, Cries and Whispers</li>
              </ul>
              <p><strong>v2.0.0</strong> — Custom domain, Daily Oscar, card packs</p>
              <ul>
                <li>Live at theoscarsjourney.com</li>
                <li>Daily Oscar quiz — guess movies from quotes & blurred posters</li>
                <li>Collectible card system with 4 rarities</li>
                <li>Smart battle matchmaking</li>
                <li>Profile modal with featured card</li>
                <li>Clean URL routing</li>
                <li>SEO meta tags, sitemap</li>
              </ul>
              <p><strong>v1.0.0</strong> — Initial release</p>
              <ul>
                <li>Journey mode with randomized film queue</li>
                <li>Films A-Z with checklist mode</li>
                <li>Battle mode with ELO rankings</li>
                <li>Profiles with stats and leaderboard</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
