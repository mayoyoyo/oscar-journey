import React, { useState } from 'react';
import { AVATAR_EMOJIS } from '../data/avatars';
import { GENRE_LABELS } from '../data/movies';

// Dual-thumb slider bounds for Journey filters — mirrors the Film tab's
// ranges. Current year is recomputed at module load so the upper bound keeps
// up with new ceremonies without a code change.
const JOURNEY_YEAR_MIN = 1920;
const JOURNEY_YEAR_MAX = new Date().getFullYear();
const JOURNEY_RUNTIME_MIN = 30;
const JOURNEY_RUNTIME_MAX = 300;

const DEFAULT_FILTERS = {
  // Modern-era default: 1970 → present. Mirrors the old decade-checkbox
  // default where pre-1970 was unchecked. Users can widen via the slider.
  yearRange: { min: 1970, max: JOURNEY_YEAR_MAX },
  // Categories only governs Oscar-eligible films (BP nominees, INT/ANIM
  // broadly defined). Essentials bypass Categories entirely — they're gated
  // by Canon depth (tier + oscarsOnly / essentialsOnly).
  // Additive attribute filter — any combination. Unchecked = no restriction.
  categories: { INT: false, ANIM: false, DOC: false, SILENT: false, BW: false },
  // Exclude map for categories — exclude-wins semantics. Default all-false.
  // A row is in exactly one of: included (categories=true), excluded
  // (categoriesExcluded=true), or neutral (both false).
  categoriesExcluded: { INT: false, ANIM: false, DOC: false, SILENT: false, BW: false },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  // Exclude map for genres — same shape, all-false default. A film with any
  // excluded genre is hidden regardless of which include rows are checked.
  genresExcluded: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, false])),
  // Runtime in minutes. min 30 / max 300 matches the Film tab. At the upper
  // bound the slider means "and up" (open-ended).
  runtimeRange: { min: JOURNEY_RUNTIME_MIN, max: JOURNEY_RUNTIME_MAX },
  // Unified canon-tier floor applied to ALL films via getTier() — OSCAR /
  // OSCAR_NOM counts as a canon list for BP / INT / ANIM, so one knob gates
  // the whole catalog. 1 = everything, 2 = canon threshold, up to
  // 7 = all-time masterpieces. Matches the Film tab's stepper exactly.
  minTier: 0,
  // Focus mode: when true, hide ESSENTIAL (non-Oscar) films — leaving just
  // BP nominees + Int/Anim winners. Mirrors the Film tab's "Oscars only".
  oscarsOnly: false,
  // Inverse focus mode: when true, hide Oscar-eligible films — leaving just
  // the non-Oscar canon. Mutually exclusive with oscarsOnly in the UI.
  essentialsOnly: false,
  smart: {
    skipWatched: false,
    unwatchedByAll: false,
    watchlistOnly: false,
  },
};

const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  unwatchedByAll: 'Unwatched by everyone',
  watchlistOnly: 'Only saved films',
};

// Note: ESSENTIAL is intentionally absent. Essentials are governed by Canon
// depth (tier + oscarsOnly / essentialsOnly), not Categories. INT and ANIM
// use broad predicates (any non-English / any animated) in FilmList.
const CATEGORY_LABELS = {
  INT: 'International',
  ANIM: 'Animated',
  DOC: 'Documentary',
  SILENT: 'Silent',
  BW: 'Black & White',
};

export { DEFAULT_FILTERS, GENRE_LABELS, CATEGORY_LABELS, SMART_LABELS };
export { JOURNEY_YEAR_MIN, JOURNEY_YEAR_MAX, JOURNEY_RUNTIME_MIN, JOURNEY_RUNTIME_MAX };

export default function SettingsModal({ raters, onRatersChange, avatar, onAvatarChange, allowSkip, onAllowSkipChange, simpleBattle, onSimpleBattleChange, checklistMode, onChecklistModeChange, hideDailyOscar, onHideDailyOscarChange, privateProfile, onPrivateProfileChange, onClose, onClearCache, profile, onLogout }) {
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

  // Toggle rows are all the same shape — label text + active flag + handler +
  // hint. Rendering them inline keeps the JSX compact and signals visually
  // that they're a set (rather than unrelated one-offs with their own headers).
  const Toggle = ({ active, onChange, label, hint }) => (
    <div className="settings-item">
      <div className={`settings-toggle-row ${active ? 'active' : ''}`} onClick={() => onChange(!active)}>
        <span className="settings-toggle-switch"><span className="settings-toggle-knob" /></span>
        <span className="settings-toggle-label">{label}</span>
      </div>
      {hint && <p className="settings-hint">{hint}</p>}
    </div>
  );

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal settings-modal">
        <button className="settings-close" onClick={onClose}>✕</button>
        <h2 className="settings-title">Settings</h2>

        {/* ── Profile ── */}
        <div className="settings-group">
          <div className="settings-group-heading">Profile</div>

          <div className="settings-item">
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

          <div className="settings-item">
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
        </div>

        {/* ── Preferences ── */}
        <div className="settings-group">
          <div className="settings-group-heading">Preferences</div>

          <Toggle
            active={allowSkip}
            onChange={onAllowSkipChange}
            label="Allow skipping films"
            hint="Shows a skip button on the journey card. We don't recommend it. 😤"
          />
          <Toggle
            active={hideDailyOscar}
            onChange={onHideDailyOscarChange}
            label="Auto-hide Daily Oscar when done"
            hint="Hides the Daily Oscar banner after you've played today's quiz (solved or failed). The banner still appears until the day's quiz is played, so you don't miss it."
          />
          <Toggle
            active={simpleBattle}
            onChange={onSimpleBattleChange}
            label="Simple battle graphics"
            hint="Removes animations for faster battles. Visual feedback still shown."
          />
          <Toggle
            active={checklistMode}
            onChange={onChecklistModeChange}
            label="Film tab checklist mode"
            hint="Tap any film in the A–Z list to mark it watched — great for first-timers catching up."
          />
          <Toggle
            active={privateProfile}
            onChange={onPrivateProfileChange}
            label="Private profile"
            hint="Hide your profile from the Profiles page. Others won't see your stats, watched films, or cards."
          />
        </div>

        {/* ── Data ── */}
        <div className="settings-group">
          <div className="settings-group-heading">Data</div>
          <div className="settings-actions">
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
        </div>

        {/* ── About ── */}
        <div className="settings-group">
          <div className="settings-group-heading">About</div>
          <div className="settings-version">
            <div className="settings-version-row">
              <span className="settings-version-label">Version</span>
              <span className="settings-version-num">v3.4.0</span>
            </div>
            <details className="settings-changelog">
              <summary>Changelog</summary>
              <div className="settings-changelog-content">
              <p><strong>v3.4.0</strong> — Watchlist, multi-source ratings, authoritative Oscars, filter side-trip</p>
              <ul>
                <li><strong>Personal watchlist.</strong> Bookmark films with the new ribbon on any card, then filter your journey to "saved films only" to pivot from the random shuffle to your own picks.</li>
                <li><strong>Filter side-trip.</strong> Flipping on a filter (like the watchlist) is now a temporary detour — removing it snaps you back to where you were before, even across refreshes and devices.</li>
                <li><strong>Multi-source ratings</strong> on detail modals — Letterboxd, Metacritic, and a blended Consensus score alongside the existing sources. Series preview tiles get the same treatment.</li>
                <li><strong>Authoritative Oscar nominations</strong> in the ceremony modal — per-film wins AND losses across every category, not just Best Picture. Malformed awards data cleaned up on 5 films.</li>
                <li><strong>Multi-genre taxonomy</strong> — films can carry multiple genres (Sci-Fi / Fantasy + Action / Adventure, etc.). 29 catalog films tagged Black &amp; White; silent films no longer render a language pill or pass the International filter.</li>
                <li><strong>Director filmography links</strong> — click a director's name in any detail modal to see every film by them already in the catalog.</li>
                <li><strong>Unsaved-only filter pill</strong> in the Films tab, rounding out the watched/unwatched/unsaved three-way.</li>
                <li><strong>Light-mode readability pass</strong> across several screens — cleaner contrast and hover states.</li>
                <li><strong>Profile cards tidy up.</strong> Sync-with dropdown now hides dormant accounts (matches the leaderboard rule); the "X skipped" pill is removed from profile cards so active users' footers fit on one row.</li>
                <li>Smaller polish: snap-back counter no longer flickers on filter-off; filter panel stays open when filters cross the "all filtered out" boundary; Metacritic search links land on Movies (not Games); "Also nominated for" heading drops the "Also" when there's no prior context.</li>
              </ul>
              <p><strong>v3.3.5</strong> — Settings modal polish</p>
              <ul>
                <li>Wider on desktop (460px → 640px) so Preferences/Data/About sections have more breathing room. Mobile unchanged.</li>
                <li>Themed scrollbar — thin + gold-tinted, replacing the chunky default (especially noticeable on Windows).</li>
              </ul>
              <p><strong>v3.3.4</strong> — Modal visual parity</p>
              <ul>
                <li>Genre pill in the sequel/out-of-canon modal is now small + inline with the year · runtime row, matching the canonical detail modal. Multiple TMDB genres still render side-by-side.</li>
                <li>Minor accessibility + resilience fixes (close-button aria-label on the canonical modal, defensive trim on the sequel's Starring row).</li>
              </ul>
              <p><strong>v3.3.3</strong> — Internal refactor (no user-visible change)</p>
              <ul>
                <li>Shared modal-gesture logic (drag-to-close, swipe, arrow keys, scroll preservation) is now factored into one <code>useFilmModalGestures</code> hook so the canonical and out-of-canon modal components no longer duplicate ~200 lines of plumbing. Future gesture work happens once, in one file.</li>
                <li>Minor parity win: Escape-to-close now works on the canonical detail modal (it already worked on the sequel preview)</li>
              </ul>
              <p><strong>v3.3.2</strong> — Watched list fix + instant theme toggle</p>
              <ul>
                <li><strong>Sequel/prequel films marked as watched now show up in your profile's Watched list.</strong> Previously the count would increment but the film never appeared below — now they render as dimmed tiles with a "Not in canon" tag. Your Avg Rating stat also includes these ratings</li>
                <li><strong>Light/dark mode swap is instant</strong> instead of fading through the old theme over ~200ms. Suppresses all CSS transitions for a single frame during the theme flip, then lifts — hover and interaction animations still work as normal</li>
              </ul>
              <p><strong>v3.3.1</strong> — Series navigation polish</p>
              <ul>
                <li><strong>Seamless canon-boundary crossings.</strong> Walking a series from a canonical film into a sequel/prequel (or back) no longer flashes the modal or jumps the scroll to the top — the new modal mounts at the outgoing modal's scroll position with the open animation suppressed, so the swap feels like a content swap in one modal</li>
                <li><strong>Desktop keyboard + <code>‹ ›</code> buttons now work inside sequel modals.</strong> Previously the arrows disappeared the moment you landed on a non-canon film, leaving desktop users unable to continue walking the series with ← →</li>
                <li><strong>Desktop nav is instant, not sliding.</strong> The 40% slide animation is reserved for touch swipes where it provides gesture feedback; arrow-key and click nav on desktop just swap content like every other modal</li>
                <li><strong>Series strip scrolling no longer hijacks sibling nav.</strong> Horizontal-scrolling the poster strip inside a modal was also being read as a sibling swipe, triggering a film swap mid-scroll. Touches that start in the strip are now ignored by the modal-level swipe handler</li>
                <li><strong>Animation-timing race fixed</strong> on rapid-succession swipes — a trailing <code>setTimeout</code> from the prior gesture could clear the next animation's transition mid-flight and snap the incoming film into place</li>
              </ul>
              <p><strong>v3.3.0</strong> — Series navigation + mobile modal polish</p>
              <ul>
                <li><strong>Series navigation.</strong> Every film in a franchise (Star Wars, Godfather, LOTR, Alien, Before trilogy, etc.) now shows its full series as a horizontal poster strip inside the detail modal — current film outlined in gold, watched siblings get a gold ✓, non-canon sequels/prequels dimmed. Tap any sibling to jump; swipe left/right to walk the series chronologically across the canon/non-canon boundary</li>
                <li><strong>Out-of-canon preview modal.</strong> New full-fidelity modal for TMDB-only films (Phantom Menace, Alien 3, etc.) with poster, runtime, genres, director, cast, overview, IMDb link, trailer, JustWatch. Mark-as-watched and rate works the same as canon films — ratings persist to your profile under a <code>tmdb:&lt;id&gt;</code> key</li>
                <li><strong>Mobile modal pop-out look.</strong> Modal now reads as a rounded card on a dim backdrop (20px corners, 84dvh max height), matching the Journey card's visual language. Fixes an override that was forcing edge-to-edge on mobile</li>
                <li><strong>Drag-to-close.</strong> Drag the modal downward and it follows your finger (rubber-bands past 150px), releases past 120px with a synchronized slide-off + backdrop fade. Mid-scroll drags are ignored so long plot summaries still scroll normally</li>
                <li><strong>Swipe between films.</strong> Horizontal swipe navigates prev/next film with a 40% slide-out / opposite-side slide-in animation. Swipe past the end snap-backs. Keyboard ← → also works on desktop</li>
                <li><strong>iOS Safari rubber-band fix.</strong> <code>overscroll-behavior-y: none</code> on the modal kills the native bounce that was detaching the poster from the modal's top edge mid-drag</li>
                <li><strong>"Part of" prefix dropped</strong> from the series heading and non-canon preview tag — the series name speaks for itself in context</li>
              </ul>
              <p><strong>v3.2.0</strong> — Catalog refresh + 5-tier canon + UI polish</p>
              <ul>
                <li><strong>Refreshed canon-list data</strong> — all source lists rescraped from scratch (Sight &amp; Sound 2022, AFI 100+10 Top 10, Criterion spine, IMDb Top 250, Letterboxd Top 250, National Film Registry, Cannes/Venice/Berlin grand prizes), plus a new 8th list: <strong>Rotten Tomatoes Top 300</strong>. Title-alias map added for foreign-language / variant titles (La Règle du jeu → Rules of the Game, Tokyo Monogatari → Tokyo Story, Star Wars Episode IV → Star Wars, etc.) so triangulation actually matches across lists. Scrape-gap patches for Vertigo (missing from RT), 2001 (bad year on IMDb scrape), Rashomon (festival year 1951 for 1950 film), and a ±1-year merge for all films so festival years don't fragment the canon lookup</li>
                <li><strong>Catalog refresh</strong> — 94 essentials cut (pre-1970 AFI+NFR-only weak canon, the Passion of Joan of Arc, 15 user-skip-list films including Intolerance, Morocco, The Cameraman, Red Desert, I Am Cuba, Funny Girl that were previously kept by rule protections), 58 new essentials added under the refreshed rule, 13 International Feature winners backfilled (1956–1987), 27 essentials reclassified to proper BP winner/nominee category, 6 pre-1970 BP nominees with only AFI+NFR coverage cut. Final catalog: <strong>787 films</strong> (457 Oscar + 330 Essentials)</li>
                <li><strong>Rule C</strong> — stricter entry threshold for older films: pre-1970 needs 3+ canon lists, 1970+ needs 2+. Addresses over-representation of old Hollywood classics that coasted in on AFI+NFR alone</li>
                <li><strong>New 5-tier system</strong> — replaces the old 1–7 scale. Tiers are <strong>Canonical · Acclaimed · Landmark · Masterwork · Apex</strong>. Scoring uses R2: 1 point per canon list with AFI+NFR merged to a single "US institutional" point, plus 1 for Oscar winner / BP nominee / Intl / Anim. A hand-curated 16-film <strong>Apex</strong> tier represents summit canon whose inclusion feels unavoidable (Godfather I/II, Pulp Fiction, Parasite, Citizen Kane, Seven Samurai, Vertigo, 2001, Third Man, Silence of the Lambs, etc.). 27 curated promotion/demotion overrides compensate for cases where raw score diverges from consensus (Persona, Blade Runner, Shining, Matrix, Mulholland Drive promoted to Landmark; LOTR Two Towers, Finding Nemo, Whiplash demoted)</li>
                <li><strong>Tier 0 "All films" floor</strong> — new bottom position on the canon-depth stepper. Tier 0 = no canon endorsement (includes BP nominees with no canon-list coverage). Tier 1+ = has at least one canon pip. Lets you filter "only films that earned their spot" vs "everything in the catalog"</li>
                <li><strong>Graduated tier styling</strong> — pips and filter stepper now render with graduated sheens: Landmark (tier 3) muted silver, Masterwork (tier 4) platinum, Apex (tier 5) gold. At the Apex floor the whole filter container glows gold; at tier-5 cap the stepper reads "5" (gold) instead of "≥ 5". Elevates the top 136 films visually without new colors</li>
                <li><strong>Tier popup rewrite</strong> — click any film's pips to see its canon lists, now with the tier label (Landmark, Masterwork, etc.) and a short description explaining what the tier means. All essentials show pips now (previously tier-1 essentials had no pip + no statuette, looking orphaned)</li>
                <li><strong>Film row layout</strong> — Oscar statuettes moved from the floating right rail (where they competed with pips and genre chip for position) to sit immediately after the film title. Right rail now always reads <code>genre · language · pips · year</code>, predictable width. Statuette order reversed: BP winner (gold) leftmost adjacent to title, then Anim, Intl, BP nominee rightmost</li>
                <li><strong>What's New banner</strong> rewritten for v3.2 so returning users see the catalog + tier-system changes on next load</li>
                <li><strong>Metadata backfill</strong> — director / top-billed cast / language fetched via OMDb for 58 new adds + ~550 existing gap films; 15 films OMDb couldn't resolve cleanly (Grand Illusion, Je Tu Il Elle, Sans Soleil, Once Upon a Time in America, Green Ray, Fog of War, Blue Is the Warmest Colour, Tess, Atlantic City, Room with a View, Hurt Locker, Judas and the Black Messiah, Sound of Metal, Sunrise 1927, Killer of Sheep) got hand-patched. Language pill correctly hides for English-only films</li>
                <li><strong>Copy refreshed</strong> across InfoModal, StartScreen, App.jsx journey taglines, SettingsModal, README, METHODOLOGY for the new catalog size and 8th canon list</li>
                <li><strong>Robustness</strong> — OMDb frontend calls now handle 401 / network failures gracefully (rotates keys on HTTP 401/403, not just on rate-limit error strings); removed one permanently-dead OMDb key from the rotation; title-matching ±1-year tolerance; dedup check prevents ADDs from duplicating current-branch INT additions (Star Wars / Empire Strikes Back / Sunrise / Discreet Charm / Amarcord)</li>
              </ul>
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
    </div>
  );
}
