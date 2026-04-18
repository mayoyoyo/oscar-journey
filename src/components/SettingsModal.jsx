import React, { useState } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';
import { GENRE_LABELS } from '../data/movies';

const DEFAULT_FILTERS = {
  // Pre-1970 eras default OFF — most users want the modern era by default.
  // All 12 buckets are present so existing profiles with saved state merge cleanly;
  // users can opt into earlier decades via the filter panel.
  eras: {
    '1910s': false, '1920s': false, '1930s': false, '1940s': false, '1950s': false, '1960s': false,
    '70s': true, '80s': true, '90s': true, '00s': true, '10s': true, '20s': true,
  },
  // Categories only governs Oscar-eligible films (BP nominees, INT/ANIM
  // broadly defined). Essentials bypass Categories entirely — they're gated
  // by Canon depth (tier + oscarsOnly / essentialsOnly).
  categories: { BP: true, INT: true, ANIM: true },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  runtimes: { short: true, medium: true, long: true },
  // Unified canon-tier floor applied to ALL films via getTier() — OSCAR /
  // OSCAR_NOM counts as a canon list for BP / INT / ANIM, so one knob gates
  // the whole catalog. 1 = everything, 2 = canon threshold, up to
  // 7 = all-time masterpieces. Matches the Film tab's stepper exactly.
  minTier: 1,
  // Focus mode: when true, hide ESSENTIAL (non-Oscar) films — leaving just
  // BP nominees + Int/Anim winners. Mirrors the Film tab's "Oscars only".
  oscarsOnly: false,
  // Inverse focus mode: when true, hide Oscar-eligible films — leaving just
  // the non-Oscar canon. Mutually exclusive with oscarsOnly in the UI.
  essentialsOnly: false,
  smart: {
    skipWatched: false,
    unwatchedByAll: false,
  },
};

const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  unwatchedByAll: 'Unwatched by everyone',
};

const ERA_LABELS = {
  '1910s': '1910s',
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

// Note: ESSENTIAL is intentionally absent. Essentials are governed by Canon
// depth (tier + oscarsOnly / essentialsOnly), not Categories. INT and ANIM
// use broad predicates (any non-English / any animated) in FilmList.
const CATEGORY_LABELS = {
  BP: 'Best Picture',
  INT: 'International',
  ANIM: 'Animated',
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
            <span className="settings-version-num">v3.1.0</span>
          </div>
          <details className="settings-changelog">
            <summary>Changelog</summary>
            <div className="settings-changelog-content">
              <p><strong>v3.1.0</strong> — Oscar statuette redesign + unified filters (thanks mayo)</p>
              <ul>
                <li><strong>Profiles get a Canon Score drill-down</strong> — click any tier row in the Canon Score table ("14 films at tier 6") to jump to the Films tab pre-filtered to that tier. Pairs with a <strong>Daily Oscar streak pill</strong> on every profile card (replaces the old Collector score pill; streak now persists across devices)</li>
                <li><strong>Oscar statuette icons</strong> replace the "✦ Essential" text badge everywhere — gold (BP winner), bronze (BP nominee), blue (Intl winner), purple (Anim winner). Multi-statuette films like Parasite and Amour render all their medals in a consistent left→right order. BP winner is full-size; other statuettes scale to 0.85× so the winner stays dominant</li>
                <li><strong>Unified canon depth</strong> — one 1–7 tier stepper that applies to ALL films (Oscar + essential). OSCAR / OSCAR_NOM now counts as a canon list, so BP winners tier to 8 and nominees to 1+. Per-level descriptions: Everything → Canon threshold → Strong consensus → Iron-clad → Near-universal → Universal → All-time masterpieces</li>
                <li><strong>Oscars only / Essentials only</strong> — two mutually-exclusive toggles in Canon depth. "Oscars only" hides the non-Oscar canon; "Essentials only" hides BP/Intl/Anim to show just the canon. Replaces the old 4-button radio</li>
                <li><strong>Categories cleanup</strong> — ESSENTIAL row removed (duplicated Canon depth). Categories now only governs Oscar-eligible films: Best Picture · International · Animated. International and Animated use <em>broad</em> predicates (any non-English / any animated), catching ~20% of the catalog including essentials like Seven Samurai and Toy Story</li>
                <li><strong>Oscars Won filter</strong> — filter films by the specific category they won: Best Picture, Best Director, Best Actor/Actress, Supporting, Screenplay (Orig/Adapt), Cinematography, Score, Song, Editing, VFX, Costume, Production Design, Makeup, Sound. 96 essentials had their per-category wins backfilled (Wikipedia Accolades + Wikidata SPARQL + 17 hand-patched); The Dark Knight now renders "Sound Editing + Supporting Actor — Heath Ledger"</li>
                <li><strong>Full-catalog search</strong> across title + director + full Wikidata cast (OMDb top-billed fallback). Type any actor's name and find every film they're in on the list</li>
                <li><strong>Detail modal restructure</strong> — runtime inline with year (<code>1972 · 2h 55m</code>), tier pill moved to the year row, "Directed by" bold label above the synopsis, new "Starring" line (top-billed cast with · separators), per-Oscar-category speech-search pills, dropped redundant Canon-list block. Colored BP/Intl/Anim chips replaced by the tinted statuettes</li>
                <li><strong>Journey card matches the modal</strong> — year + runtime inline, tier pips alongside, "Directed by" + "Starring" lines, winner pill text trimmed (no more "· Speech" — the ↗ icon + tooltip already signal the link)</li>
                <li><strong>Journey filters match the Film tab</strong> — same 1–7 tier stepper, same Oscars-only / Essentials-only toggles, inline Reset chip when any filter is active, per-row "only" shortcut buttons, chip-summary of narrowed state when collapsed</li>
                <li><strong>Sticky filter bar</strong> in Films with match count promoted into the header (<code>509 films · 77 watched</code>, or <code>509 · 77✓</code> on mobile)</li>
                <li><strong>Language pill</strong> for non-English films — shows the primary-language flag (French, Spanish, Korean, etc.) based on <code>languages.json</code> (201 films). Now language-based, not country-based — one film, one flag that reflects what you actually hear</li>
                <li><strong>Unwatched-only toggle</strong> alongside Watched-only in the Film tab, three-way mutually-exclusive (All · Watched · Unwatched)</li>
                <li>New data files: <code>languages.json</code>, <code>directors.json</code> (835 films, 20 hand-trims to remove OMDb over-credits like Bambi → David Hand, Wizard of Oz → Fleming), <code>actors.json</code> (top-billed), <code>cast.json</code> (full Wikidata cast)</li>
                <li><code>docs/METHODOLOGY.md</code> — the 2-of-N canon triangulation rule written up in full</li>
                <li><code>apple-touch-icon</code> for iOS homescreen install</li>
              </ul>
              <p><strong>v3.0.0</strong> — Essentials expansion: 438 non-Oscar canon films</p>
              <ul>
                <li>New <strong>Essential</strong> category — 438 must-watch films the Academy overlooked, curated by triangulating 7 independent canon lists (Sight &amp; Sound, Criterion, IMDb Top 250, Letterboxd Top 250, AFI, festival grand prizes, National Film Registry). A film qualifies if it appears on ≥ 2 lists</li>
                <li>Catalog grows from 399 → <strong>837 films</strong>, covering decades 1910s–2020s. Journey defaults to 1970+; pre-1970 decades one click away in filters</li>
                <li><strong>Tier pips</strong> — every film shows gold dots for the canon lists it appears on (1–8). Tap the pips to see which specific lists. BP nominees get 1 pip for Academy recognition; winners count the Academy as their 8th list</li>
                <li><strong>Canon depth filter</strong> — Oscars only (399) · Tier ≥ 4 (iron-clad, 57) · ≥ 3 (strong consensus, 143) · ≥ 2 (all 438, default). Separate <em>Essentials only</em> toggle hides Oscar films for a pure canon view</li>
                <li><strong>Canon Score</strong> in Stats — weighted completion metric (tier × watched) + per-tier breakdown + "Next up" recommendations for highest-signal unwatched films</li>
                <li>Click "Canon film · YYYY" or any Oscar ceremony to open a <strong>"Films of YYYY"</strong> modal — every Oscar nominee + essential released that year, grouped by category</li>
                <li>Filter panel rebuilt: Canon depth first, per-option counts, auto-hide 0-match rows, "only" shortcut per row in Films, summary chips on the collapsed Journey header (e.g. "Canon ≥ 4 · Essentials only"), unchecking the last item auto-restores defaults</li>
                <li>Search in Films bypasses canon depth — find any film by title regardless of curation</li>
                <li>Number-titled films (8½, 12 Angry Men, 2001) sort to the bottom of the A-Z list</li>
                <li>Shuffle algorithm tuned for the bigger catalog — granular decade buckets, broader diversity spacing, gentle front-loading of high-tier canon in the first ~150 positions so you see heavy-hitters early (most users won't reach film 800)</li>
                <li>Automatic one-time migration on first v3 load: every profile gets a fresh front-loaded playlist, resets to position 0, preserves all watched films + ratings. Stale filter keys from old versions are sanitized out</li>
                <li>All 438 essentials genre-classified via OMDb (Drama dropped from 62% to 19% of catalog); 71 Wikiquote-verified quotes added for iron-clad essentials so they appear in Daily Oscar; 7 manual posters sourced for films OMDb couldn't serve</li>
                <li>Removed legacy "Oscar winners only" smart filter — superseded by Canon depth's Oscars-only option</li>
                <li>Various copy updates: InfoModal, StartScreen, JOURNEY_TAGLINES and SKIP_MESSAGES all rewritten to reflect the expanded catalog (skip messages now pick category-appropriate zingers)</li>
              </ul>
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
