# Watchlist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users save any catalog film for later from the film detail modal or Journey-mode card. A corner-triangle badge marks saved films on the poster (gold if unwatched, green if already watched). Saved films are filterable in the Films list tab ("Saved" pill) and in Journey mode smart filters ("Only saved films").

**Architecture:** `profile.watchlist: string[]` is persisted in Firestore alongside `profile.watched`. App state mirrors it as `watchlistSet: Set<movieId>`. Two new components (`WatchlistButton`, `WatchlistRibbon`) render the two per-film affordances; both live in the modal and the Journey card. Filter logic extends the existing smart-filter pipeline (`moviePassesFilter` in `App.jsx`) with a `watchlistOnly` flag, and the Films tab's `FilmList` gains a new independent boolean `watchlistFilter` that ANDs with its existing three-way `watchMode`.

**Tech Stack:** React 18, Vite, plain CSS, Firestore (existing `saveProfileField`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-21-watchlist-design.md`

**Do not commit anything while implementing this plan.** The user will manually test the complete feature on the running dev server before committing.

---

### Task 1: App state — `watchlistSet`, hydration, toggle handlers

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `watchlistSet` state next to `watchedSet`**

Locate (around line 253):

```jsx
  const [watchedSet, setWatchedSet] = useState(new Set());
```

Add immediately after it:

```jsx
  const [watchlistSet, setWatchlistSet] = useState(new Set());
```

- [ ] **Step 2: Hydrate `watchlistSet` on profile load**

Locate the block where `setWatchedSet(watchedKeys)` is called (around line 602). The existing hydration block looks like:

```jsx
    setProfile(data);
    setPlaylist(pl);
    setCurrentIdx(Math.min(idx, pl.length - 1));
    setWatchedSet(watchedKeys);
    setRatings(migratedRatings);
    setRaters(ratersList);
```

Before `setProfile(data)`, add a small block that builds `watchlistKeys` — older profiles may lack the field, treat as empty:

```jsx
    // Watchlist — stored as array of movie IDs on the profile. Older
    // profiles may not have the field at all; default to empty set.
    const rawWatchlist = Array.isArray(data.watchlist) ? data.watchlist : [];
    const watchlistKeys = new Set(rawWatchlist);
```

And add to the state-publishing sequence right after `setWatchedSet(watchedKeys);`:

```jsx
    setWatchlistSet(watchlistKeys);
```

- [ ] **Step 3: Reset `watchlistSet` on logout**

Locate `setWatchedSet(new Set());` (around line 633 — the logout reset path). Immediately after that line add:

```jsx
    setWatchlistSet(new Set());
```

- [ ] **Step 4: Add `toggleWatchlistForMovie` handler**

Locate the existing `toggleWatchedForMovie` (around lines 789-804):

```jsx
  const toggleWatchedForMovie = useCallback((movie) => {
    const key = movieKey(movie);
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        clearRatingsForMovie(movie);
      } else {
        next.add(key);
      }
      const nextArr = [...next];
      firebaseSave('watched', nextArr);
      setProfile(prev => prev ? { ...prev, watched: nextArr } : prev);
      return next;
    });
  }, [firebaseSave, clearRatingsForMovie]);
```

Add this immediately after it, as a parallel sibling:

```jsx
  const toggleWatchlistForMovie = useCallback((movie) => {
    const key = movieKey(movie);
    setWatchlistSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      const nextArr = [...next];
      firebaseSave('watchlist', nextArr);
      setProfile(prev => prev ? { ...prev, watchlist: nextArr } : prev);
      return next;
    });
  }, [firebaseSave]);
```

- [ ] **Step 5: Extend `smartContext` with `watchlistSet`**

Locate the `smartContext` useMemo (around lines 664-668):

```jsx
  const smartContext = useMemo(() => ({
    watchedSet,
    allProfiles: allProfilesForSync,
    currentProfileId: profile?.id,
  }), [watchedSet, allProfilesForSync, profile?.id]);
```

Change it to include `watchlistSet`:

```jsx
  const smartContext = useMemo(() => ({
    watchedSet,
    watchlistSet,
    allProfiles: allProfilesForSync,
    currentProfileId: profile?.id,
  }), [watchedSet, watchlistSet, allProfilesForSync, profile?.id]);
```

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (0 errors). The new state is declared but not yet consumed by any UI — compilation proves the wiring is syntactically correct.

---

### Task 2: Smart-filter branch — `smart.watchlistOnly`

**Files:**
- Modify: `src/App.jsx:109-127` (the smart filter block in `moviePassesFilter`)
- Modify: `src/components/SettingsModal.jsx:44-53` (DEFAULT_FILTERS.smart + SMART_LABELS)

- [ ] **Step 1: Add `watchlistOnly` to `DEFAULT_FILTERS.smart`**

In `src/components/SettingsModal.jsx`, locate:

```jsx
  smart: {
    skipWatched: false,
    unwatchedByAll: false,
  },
```

Change to:

```jsx
  smart: {
    skipWatched: false,
    unwatchedByAll: false,
    watchlistOnly: false,
  },
```

- [ ] **Step 2: Add the user-facing label**

Immediately after, locate:

```jsx
const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  unwatchedByAll: 'Unwatched by everyone',
};
```

Change to:

```jsx
const SMART_LABELS = {
  skipWatched: 'Skip films I\'ve watched',
  unwatchedByAll: 'Unwatched by everyone',
  watchlistOnly: 'Only saved films',
};
```

- [ ] **Step 3: Add the filter branch in `moviePassesFilter`**

In `src/App.jsx`, locate the smart-filter block (around lines 109-127):

```jsx
  // Smart filters
  if (smartContext) {
    const mid = movie.id;

    // Skip watched films — BUT exempt the current film so user can rate it
    if (f.smart.skipWatched && smartContext.watchedSet && smartContext.watchedSet.has(mid) && !isCurrentFilm) {
      return false;
    }

    // Unwatched by everyone
    if (f.smart.unwatchedByAll && smartContext.allProfiles) {
      const watchedBySomeone = smartContext.allProfiles.some(p =>
        p.id !== smartContext.currentProfileId &&
        Array.isArray(p.watched) &&
        p.watched.includes(mid)
      );
      if (watchedBySomeone) return false;
    }
  }
```

Add the third branch immediately after the `unwatchedByAll` block, still inside the `if (smartContext)`:

```jsx
    // Watchlist-only — hide films not on the user's saved list.
    if (f.smart.watchlistOnly && smartContext.watchlistSet && !smartContext.watchlistSet.has(mid)) {
      return false;
    }
```

The full block now reads:

```jsx
  // Smart filters
  if (smartContext) {
    const mid = movie.id;

    // Skip watched films — BUT exempt the current film so user can rate it
    if (f.smart.skipWatched && smartContext.watchedSet && smartContext.watchedSet.has(mid) && !isCurrentFilm) {
      return false;
    }

    // Unwatched by everyone
    if (f.smart.unwatchedByAll && smartContext.allProfiles) {
      const watchedBySomeone = smartContext.allProfiles.some(p =>
        p.id !== smartContext.currentProfileId &&
        Array.isArray(p.watched) &&
        p.watched.includes(mid)
      );
      if (watchedBySomeone) return false;
    }

    // Watchlist-only — hide films not on the user's saved list.
    if (f.smart.watchlistOnly && smartContext.watchlistSet && !smartContext.watchlistSet.has(mid)) {
      return false;
    }
  }
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. The Journey Controls section will now render a third "Only saved films" checkbox automatically (it iterates over `SMART_LABELS`) — but no films will be filtered out until the user enables the flag.

---

### Task 3: `WatchlistRibbon` component

**Files:**
- Create: `src/components/WatchlistRibbon.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/WatchlistRibbon.jsx`:

```jsx
import React from 'react';

// Corner-triangle badge for the top-left of a film poster. Renders null
// when the film isn't saved. When saved, renders a gold triangle (if
// not yet watched) or a green triangle (if watched). A bookmark glyph
// sits centered inside the triangle.
//
// This component does NOT toggle state — it's a pure status indicator.
// Toggling happens via the WatchlistButton in the action row.
export default function WatchlistRibbon({ isBookmarked, isWatched }) {
  if (!isBookmarked) return null;
  const cls = `watchlist-ribbon ${isWatched ? 'is-watched' : ''}`;
  return (
    <div className={cls} aria-hidden="true">
      <svg className="watchlist-ribbon-glyph" viewBox="0 0 16 20" width="14" height="17">
        <path
          d="M3 1h10a1 1 0 0 1 1 1v17l-6-3.5L2 19V2a1 1 0 0 1 1-1z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
```

---

### Task 4: `WatchlistButton` component

**Files:**
- Create: `src/components/WatchlistButton.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/WatchlistButton.jsx`:

```jsx
import React from 'react';

// Compact icon-only bookmark toggle. Sits to the right of the
// "Mark as Watched" button in the modal and Journey card action rows.
// Props:
//   isBookmarked — true when this film is in the user's saved list
//   isWatched    — true when this film is already watched (affects color)
//   onToggle     — () => void. Called when the user clicks the button.
//
// Visual states:
//   off            → outlined glyph, dim
//   saved+unwatched → filled gold glyph
//   saved+watched   → filled green glyph
export default function WatchlistButton({ isBookmarked, isWatched, onToggle }) {
  const stateClass = !isBookmarked
    ? 'is-off'
    : isWatched
      ? 'is-saved-watched'
      : 'is-saved';
  const label = isBookmarked ? 'Remove from saved' : 'Save for later';
  return (
    <button
      type="button"
      className={`watchlist-btn ${stateClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 16 20" width="16" height="20">
        <path
          d="M3 1h10a1 1 0 0 1 1 1v17l-6-3.5L2 19V2a1 1 0 0 1 1-1z"
          fill={isBookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
```

---

### Task 5: Styles for ribbon + button + films-list pill

**Files:**
- Modify: `src/App.css` — append a new block

- [ ] **Step 1: Append the watchlist CSS block**

Append to the end of `src/App.css`:

```css
/* =====================================================
   WATCHLIST ("Saved" feature)
   ===================================================== */

/* Poster corner-triangle badge. Positioned absolutely inside
   .film-detail-poster / .poster-col. The container those live in must
   be `position: relative` — both already are by virtue of their
   existing rules. Gold by default (saved + unwatched); green modifier
   when also watched. */
.watchlist-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  width: 52px;
  height: 52px;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  background: var(--gold);
  color: #1a1208;
  pointer-events: none;
  z-index: 3;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 6px 0 0 6px;
}
.watchlist-ribbon.is-watched {
  background: #3fa96a; /* green — same family as the film-row-dot watched color */
}
.watchlist-ribbon-glyph {
  display: block;
}

/* Action-row bookmark toggle button. Sits inline with the
   Mark-as-Watched / Skip buttons. Icon-only, square. */
.watchlist-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.watchlist-btn:hover {
  background: var(--bg3);
}
.watchlist-btn:active {
  transform: scale(0.94);
}
.watchlist-btn.is-off {
  color: var(--cream-dim);
  opacity: 0.75;
}
.watchlist-btn.is-saved {
  color: var(--gold);
  border-color: var(--gold);
}
.watchlist-btn.is-saved-watched {
  color: #3fa96a;
  border-color: #3fa96a;
}

/* "Saved" filter pill in the Films tab — piggybacks on the existing
   .film-list-toggle styling. No new rules required; the pill just
   renders with the same classes. */
```

---

### Task 6: Wire into FilmDetailModal

**Files:**
- Modify: `src/components/FilmDetailModal.jsx` — imports, props, ribbon on poster, button in action row

- [ ] **Step 1: Add imports**

After the existing `import DirectorFilmographyLink from './DirectorFilmographyLink';` line, add:

```jsx
import WatchlistButton from './WatchlistButton';
import WatchlistRibbon from './WatchlistRibbon';
```

- [ ] **Step 2: Add `isBookmarked` and `onToggleWatchlist` props**

Locate the component signature (around line 25):

```jsx
export default function FilmDetailModal({ movie, isWatched, onToggleWatched, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate, onOpenProfile, wallet, onOpenSeriesPreview, watchedSet, seriesSiblings, onSeriesNavigate, openInstant, initialScrollTop }) {
```

Add `isBookmarked` and `onToggleWatchlist` to the destructure (place them near `isWatched` / `onToggleWatched` to keep related props together):

```jsx
export default function FilmDetailModal({ movie, isWatched, onToggleWatched, isBookmarked, onToggleWatchlist, onClose, ratings, onRatingChange, raters, personalElo, movieList, onNavigate, onOpenProfile, wallet, onOpenSeriesPreview, watchedSet, seriesSiblings, onSeriesNavigate, openInstant, initialScrollTop }) {
```

- [ ] **Step 3: Render the ribbon on the poster**

Locate the poster block (around lines 199-216) — it looks like:

```jsx
          <div className="film-detail-poster">
            {loading ? (
              <div className="poster-loading"><div className="spinner" /></div>
            ) : omdbData?.poster && !posterError ? (
              <img
                src={omdbData.poster}
                ...
              />
            ) : (
              <div className="poster-placeholder" ...>
                ...
              </div>
            )}
          </div>
```

Inside the `<div className="film-detail-poster">` — as the FIRST child (so it stacks on top of the image), add:

```jsx
            <WatchlistRibbon isBookmarked={isBookmarked} isWatched={isWatched} />
```

Full updated block:

```jsx
          <div className="film-detail-poster">
            <WatchlistRibbon isBookmarked={isBookmarked} isWatched={isWatched} />
            {loading ? (
              <div className="poster-loading"><div className="spinner" /></div>
            ) : omdbData?.poster && !posterError ? (
              <img
                src={omdbData.poster}
                alt={`${movie.title} poster`}
                onError={() => setPosterError(true)}
                className={cardRarity ? 'film-detail-poster-card' : ''}
                style={cardRarity ? { '--rarity-border': cardRarity.border, '--rarity-glow': cardRarity.glow } : undefined}
              />
            ) : (
              <div className="poster-placeholder" style={{ minHeight: '280px', height: '100%' }}>
                <div className="ph-icon">🎬</div>
                <div className="ph-title">{movie.title}</div>
              </div>
            )}
          </div>
```

- [ ] **Step 4: Render the button in the action row**

Locate the Mark-as-Watched button (around lines 398-405):

```jsx
            <button
              className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
              onClick={onToggleWatched}
              style={{ marginTop: 'auto', justifyContent: 'center' }}
            >
              {isWatched && <span className="watched-icon">✓</span>}
              <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
            </button>
```

Wrap the button in a flex row and add the WatchlistButton as its sibling:

```jsx
            <div className="film-detail-action-row" style={{ marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <button
                className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
                onClick={onToggleWatched}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {isWatched && <span className="watched-icon">✓</span>}
                <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
              </button>
              <WatchlistButton
                isBookmarked={isBookmarked}
                isWatched={isWatched}
                onToggle={onToggleWatchlist}
              />
            </div>
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. The modal will crash at render time if opened, because `isBookmarked` / `onToggleWatchlist` aren't wired in `App.jsx` yet — Task 8 finishes that.

---

### Task 7: Wire into FilmCard (Journey mode)

**Files:**
- Modify: `src/components/FilmCard.jsx` — imports, props, ribbon on poster, button in action row

- [ ] **Step 1: Add imports**

After the existing `import DirectorFilmographyLink from './DirectorFilmographyLink';` line, add:

```jsx
import WatchlistButton from './WatchlistButton';
import WatchlistRibbon from './WatchlistRibbon';
```

- [ ] **Step 2: Add `isBookmarked` and `onToggleWatchlist` props**

Locate the component signature (around line 85):

```jsx
export default function FilmCard({ movie, isWatched, onToggleWatched, fading, ratings, onRatingChange, raters, allowSkip, onSkip, allProfiles, currentProfileId, onOpenDetail, onOpenProfile, onOpenSeriesPreview, watchedSet }) {
```

Add `isBookmarked` and `onToggleWatchlist`:

```jsx
export default function FilmCard({ movie, isWatched, onToggleWatched, isBookmarked, onToggleWatchlist, fading, ratings, onRatingChange, raters, allowSkip, onSkip, allProfiles, currentProfileId, onOpenDetail, onOpenProfile, onOpenSeriesPreview, watchedSet }) {
```

- [ ] **Step 3: Render the ribbon on the poster**

Locate the poster-column block (around lines 147-170). It looks like:

```jsx
      {/* Poster column */}
      <div className="poster-col">
        {loading ? (
          <div className="poster-loading"><div className="spinner" /></div>
        ) : omdbData?.poster ? (
          <img
            className="poster-img"
            src={omdbData.poster}
            ...
          />
        ) : (
          ...
        )}
      </div>
```

Insert the ribbon as the first child of `.poster-col`:

```jsx
      {/* Poster column */}
      <div className="poster-col">
        <WatchlistRibbon isBookmarked={isBookmarked} isWatched={isWatched} />
        {loading ? (
          <div className="poster-loading"><div className="spinner" /></div>
        ) : omdbData?.poster ? (
          <img
            className="poster-img"
            src={omdbData.poster}
            ...
          />
        ) : (
          ...
        )}
      </div>
```

*(Leave the existing content of the `img` branch and the placeholder branch unchanged — only add the ribbon line at the top.)*

- [ ] **Step 4: Render the button in `.film-card-actions`**

Locate the action row (around lines 354-385) — it looks like:

```jsx
        <div className="film-card-actions">
          <button
            className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
            onClick={onToggleWatched}
          >
            {isWatched && <span className="watched-icon">✓</span>}
            <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
          </button>
          {allowSkip && !isWatched && (
            <button
              className="skip-btn"
              onClick={() => {
                const msg = pickSkipMessage(movie);
                if (window.confirm(msg + '\n\nSkip this film?')) {
                  onSkip();
                }
              }}
            >
              Skip
            </button>
          )}
        </div>
```

Add a `WatchlistButton` as the LAST child of `.film-card-actions` — that places it to the right of Mark-as-Watched and (when present) Skip:

```jsx
        <div className="film-card-actions">
          <button
            className={`watched-btn ${isWatched ? 'is-watched' : ''}`}
            onClick={onToggleWatched}
          >
            {isWatched && <span className="watched-icon">✓</span>}
            <span>{isWatched ? 'Watched' : 'Mark as Watched'}</span>
          </button>
          {allowSkip && !isWatched && (
            <button
              className="skip-btn"
              onClick={() => {
                const msg = pickSkipMessage(movie);
                if (window.confirm(msg + '\n\nSkip this film?')) {
                  onSkip();
                }
              }}
            >
              Skip
            </button>
          )}
          <WatchlistButton
            isBookmarked={isBookmarked}
            isWatched={isWatched}
            onToggle={onToggleWatchlist}
          />
        </div>
```

- [ ] **Step 5: Ensure `.poster-col` is `position: relative`**

In `src/App.css`, check that `.poster-col` has `position: relative`. If it does not, add a minimal rule right above the new watchlist block:

```css
.poster-col {
  position: relative;
}
```

(If a rule already exists, don't add a duplicate — the watchlist-ribbon CSS from Task 5 expects the parent to be positioned.)

Verify by running:

```bash
grep -n "\.poster-col" src/App.css | head -5
```

If no `position: relative` appears in the existing `.poster-col` rule, add the rule above.

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

---

### Task 8: Wire `isBookmarked` + `onToggleWatchlist` at the App level

**Files:**
- Modify: `src/App.jsx` — pass props to `FilmCard` (Journey) and `FilmDetailModal` (detail) call sites

- [ ] **Step 1: Find the FilmCard call site and wire props**

Search for the FilmCard render in `App.jsx`:

```bash
grep -n "<FilmCard" src/App.jsx
```

At the JSX usage (around the line with `<FilmCard`), add two new props — both should sit near the existing `isWatched` / `onToggleWatched` pair:

```jsx
isBookmarked={currentMovie ? watchlistSet.has(currentMovie.id) : false}
onToggleWatchlist={() => currentMovie && toggleWatchlistForMovie(currentMovie)}
```

- [ ] **Step 2: Find the FilmDetailModal call site(s) and wire props**

Search:

```bash
grep -n "<FilmDetailModal" src/App.jsx
```

There are typically multiple call sites (list detail modal + Journey's detail view). At each `<FilmDetailModal` usage, add:

```jsx
isBookmarked={detailMovie ? watchlistSet.has(detailMovie.id) : false}
onToggleWatchlist={() => detailMovie && toggleWatchlistForMovie(detailMovie)}
```

Replace `detailMovie` with the exact name of the movie variable used by that specific call site (inspect the surrounding JSX — some instances use `currentMovie`, some use `detailMovie`, some use the prop being passed to `movie={...}`). The rule is: *whichever movie object is passed to `movie={…}` on that `<FilmDetailModal>`*.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

---

### Task 9: Films tab — "Saved" filter pill

**Files:**
- Modify: `src/components/FilmList.jsx`

- [ ] **Step 1: Accept `watchlistSet` as a prop**

Locate the component signature (around line 157):

```jsx
export default function FilmList({ watchedTitleSet, onOpenDetail, onToggleWatched, ratings, raters, filterPreset, onFilterPresetApplied, checklistMode = false }) {
```

Add `watchlistSet`:

```jsx
export default function FilmList({ watchedTitleSet, watchlistSet, onOpenDetail, onToggleWatched, ratings, raters, filterPreset, onFilterPresetApplied, checklistMode = false }) {
```

- [ ] **Step 2: Add `watchlistFilter` local state**

Right after the `watchMode` / `watchedOnly` / `unwatchedOnly` block (around line 159-163), add:

```jsx
  // Independent boolean — ANDs with whichever watchMode is active.
  // Unlike Watched/Unwatched which are mutually exclusive, Saved can
  // combine with either to show e.g. "Saved films I haven't watched".
  const [watchlistFilter, setWatchlistFilter] = useState(false);
```

- [ ] **Step 3: Extend the filter predicate**

Locate the useMemo filter block (around lines 327-342). The critical lines look like:

```jsx
        if (watchedOnly) return watchedTitleSet.has(m.id);
        if (unwatchedOnly) return !watchedTitleSet.has(m.id);
```

Change the early-return check that follows the watchMode logic. Add a watchlist AND after those lines, before the existing `return true` (or wherever the predicate currently ends):

```jsx
        if (watchedOnly && !watchedTitleSet.has(m.id)) return false;
        if (unwatchedOnly && watchedTitleSet.has(m.id)) return false;
        if (watchlistFilter && !(watchlistSet && watchlistSet.has(m.id))) return false;
```

Be careful with the existing code shape. Read lines 327-345 first, then splice in the watchlistFilter line immediately after the existing watchedOnly/unwatchedOnly checks. If the current code is `return watchedTitleSet.has(m.id)` style (early returns), refactor that small block to the falsy-and style above so the AND chain works.

If the existing lines are:

```jsx
        if (watchedOnly) return watchedTitleSet.has(m.id);
        if (unwatchedOnly) return !watchedTitleSet.has(m.id);
```

Replace with:

```jsx
        if (watchedOnly && !watchedTitleSet.has(m.id)) return false;
        if (unwatchedOnly && watchedTitleSet.has(m.id)) return false;
        if (watchlistFilter && !(watchlistSet && watchlistSet.has(m.id))) return false;
```

- [ ] **Step 4: Add `watchlistFilter` + `watchlistSet` to the useMemo deps**

Locate the dep array at the end of the filter useMemo (around line 410). It currently looks like:

```jsx
  }, [query, watchedTitleSet, watchMode, filters, runtimeMap, activeWinKeys, sortPrimary, sortDir, sortByTier]);
```

Add the two new dependencies:

```jsx
  }, [query, watchedTitleSet, watchlistSet, watchMode, watchlistFilter, filters, runtimeMap, activeWinKeys, sortPrimary, sortDir, sortByTier]);
```

- [ ] **Step 5: Add the "Saved" pill next to Watched/Unwatched**

Locate the `.film-list-mode-toggles` block (around lines 598-611):

```jsx
            <div className="film-list-mode-toggles">
              <button
                className={`film-list-toggle ${watchedOnly ? 'active' : ''}`}
                onClick={() => setWatchMode(w => w === 'watched' ? 'all' : 'watched')}
              >
                Watched
              </button>
              <button
                className={`film-list-toggle ${unwatchedOnly ? 'active' : ''}`}
                onClick={() => setWatchMode(w => w === 'unwatched' ? 'all' : 'unwatched')}
              >
                Unwatched
              </button>
            </div>
```

Add a third button inside the same container:

```jsx
            <div className="film-list-mode-toggles">
              <button
                className={`film-list-toggle ${watchedOnly ? 'active' : ''}`}
                onClick={() => setWatchMode(w => w === 'watched' ? 'all' : 'watched')}
              >
                Watched
              </button>
              <button
                className={`film-list-toggle ${unwatchedOnly ? 'active' : ''}`}
                onClick={() => setWatchMode(w => w === 'unwatched' ? 'all' : 'unwatched')}
              >
                Unwatched
              </button>
              <button
                className={`film-list-toggle ${watchlistFilter ? 'active' : ''}`}
                onClick={() => setWatchlistFilter(v => !v)}
              >
                Saved
              </button>
            </div>
```

- [ ] **Step 6: Pass `watchlistSet` to `<FilmList>` from `App.jsx`**

Search for the `<FilmList` call site:

```bash
grep -n "<FilmList" src/App.jsx
```

At each usage, add a new prop next to `watchedTitleSet`:

```jsx
watchlistSet={watchlistSet}
```

- [ ] **Step 7: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

---

### Task 10: Copy change — rating-locked text

**Files:**
- Modify: `src/components/FilmDetailModal.jsx` — single line
- Modify: `src/components/FilmCard.jsx` — single line

- [ ] **Step 1: Update the modal's rating-locked text**

In `src/components/FilmDetailModal.jsx`, find:

```jsx
              <div className="rating-locked">Mark as watched to rate this film</div>
```

Change to:

```jsx
              <div className="rating-locked">Watch and rate this film, or save it for later</div>
```

- [ ] **Step 2: Update the Journey card's rating-locked text**

In `src/components/FilmCard.jsx`, find:

```jsx
          <div className="rating-locked">Mark as watched to rate this film</div>
```

Change to:

```jsx
          <div className="rating-locked">Watch and rate this film, or save it for later</div>
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

---

### Task 11: End-to-end manual verification (do NOT commit)

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts at `https://localhost:5173/` (or the next free port).

- [ ] **Step 2: Walk through the spec's test plan**

Open a browser, sign in to a profile. For each scenario, verify visually:

1. **Toggle from modal.** Open a film's detail modal. Expect an outlined bookmark button in the action row (right of "Mark as Watched"). Tap → button fills gold, gold corner triangle appears on the poster top-left. Tap again → triangle disappears, button back to outlined.
2. **Toggle from Journey card.** On a Journey card, expect the bookmark button to sit right of "Mark as Watched" (and right of "Skip" when Skip is present). Same toggle behavior and visual.
3. **Color transition on watch.** Save a film (gold), then mark it watched. Expect both the action-row button and the poster corner triangle to transition gold → green. Unmark watched → back to gold. Unsave → outlined + no triangle.
4. **Films list "Saved" pill.** On the Films tab, open filters, expect a new "Saved" pill next to Watched/Unwatched. Toggle it on: list shrinks to saved films. Combine with Unwatched: only saved + not watched. Toggle Saved off: back to the previous filter state.
5. **Journey smart filter.** In the Journey filter panel, expand Smart Filters. Expect a new "Only saved films" checkbox. Enable it: Journey should land on a saved film (or a skip-ineligible state if the list is empty). Combine with "Skip films I've watched": Journey advances through saved films not yet watched.
6. **Copy change.** On any unwatched film's modal + Journey card, confirm the rating-locked prose reads: "Watch and rate this film, or save it for later".
7. **Persistence.** Toggle a handful of bookmarks; reload the page. Expect the saved state to survive the reload (pulled back from Firestore via the hydration path).

- [ ] **Step 3: Do not commit**

Per the user's instruction: they will test on the dev server and decide when to commit. Leave the working tree dirty. Report "implementation complete, ready for your manual test" and list the staged (unstaged) files.

---

## Self-review

**Spec coverage:** Every requirement in the spec maps to at least one task:
- Data model + persistence → Task 1
- Color semantics (gold/green/off) → applied in Tasks 3, 4, 5 (all three pieces share `isWatched` + `isBookmarked`)
- Surface 1 (poster ribbon) → Tasks 3, 5, 6, 7
- Surface 2 (action button) → Tasks 4, 5, 6, 7
- Surface 3 (Films tab pill) → Task 9
- Surface 4 (Journey smart filter) → Task 2
- Surface 5 / Copy change → Task 10
- Wiring at App level → Tasks 1, 8, 9
- Manual verification → Task 11

**Placeholder scan:** No "TBD", no "add error handling," every code step contains full code. Step 8 has a lookup-then-splice instruction because the exact variable name at the FilmDetailModal call site can vary by path — but the rule is explicit, not a placeholder.

**Type/name consistency:**
- `isBookmarked` — prop name used identically in `WatchlistButton`, `WatchlistRibbon`, `FilmCard`, `FilmDetailModal`.
- `onToggleWatchlist` — prop name used identically in `FilmCard`, `FilmDetailModal`; wired to `toggleWatchlistForMovie` at the App level.
- `watchlistSet` — state + prop name consistent across App, FilmList, smartContext.
- `watchlist` — Firestore field name + `profile.watchlist` array — consistent in hydration (Task 1), toggle (Task 1), save (Task 1).
- `watchlistOnly` — smart-filter flag consistent in `DEFAULT_FILTERS.smart`, `SMART_LABELS`, and the `moviePassesFilter` branch.
