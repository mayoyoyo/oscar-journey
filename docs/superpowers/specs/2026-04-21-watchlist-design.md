# Watchlist — Design

> **UI naming note:** user-facing copy uses **"Save" / "Saved"** everywhere (the filter pill is labeled "Saved", the Journey smart filter is "Only saved films", the rating-locked prose is "save it for later"). The word "bookmark" never appears in the UI — it's only a description of the visual (the corner-triangle + glyph shape). Internal identifiers retain `watchlist` / `watchlistSet` / `profile.watchlist` — shorter, less ambiguous, and the Firestore field name benefits from specificity.

**Date:** 2026-04-21
**Branch:** `feat/director-filmography-link` (shared with filmography work; no new branch)
**Status:** Draft, pending implementation

## Goal

Let users flag any catalog film as "save for later" from the film detail modal or the Journey-mode card. Bookmarked films are filterable in the Films list tab and in Journey mode smart filters. Watched status and watchlist status are independent — marking a film watched does not remove it from the watchlist. Keep the feature minimal: no dedicated list view, no drag-reorder, no sort-to-top, no hover preview, no sharing.

## Non-goals

- **No auto-remove** when a film is marked watched. The two states coexist intentionally.
- **No dedicated watchlist tab.** Filtering the Films list is the only way to see watchlist as a group.
- **No sort-to-top** in the Films list (filter only).
- **No row-level bookmark glyph** in the Films list. The Watchlist filter pill is the on-demand visibility. Adding a glyph in every row would duplicate state that the filter already surfaces and bloat the row visually for information that isn't needed at a glance.
- **No click-to-toggle outside modal/Journey card.** The bookmark is set/unset only from the two places the user already spends modal-scale attention on a film.

## Color semantics

Three visual states govern every surface:

- **Bookmarked + not yet watched → gold** (the "I want to see this" signal).
- **Bookmarked + watched → green** (the "I saw this thing I wanted to see" signal — still on the list by design).
- **Not bookmarked → off** (bookmark-outlined in the action-row button; nothing shown on the poster).

One color pair, applied identically wherever the state surfaces.

## Five surfaces

### 1. Poster corner-triangle badge (film detail modal + Journey card)

A solid right-triangle fills the top-left corner of the poster, hypotenuse running diagonally from the top edge to the left edge. The triangle is gold or green per the state. A bookmark glyph sits centered inside the triangle.

- **Only rendered when bookmarked** — never shows on unbookmarked films.
- **Triangle size**: 52 px along each leg (a touch larger than the ✕ close button on the opposite corner). Same size for both modal and Journey card — the rendered poster size is in the same visual range.
- **Edge finish**: flat right-angle. A single CSS `clip-path: polygon(0 0, 100% 0, 0 100%)` draws the triangle; no extra artwork needed.
- **Bookmark glyph**: inline SVG, white stroke + fill, centered inside the triangle (absolute-positioned relative to the triangle container). Roughly 18 px so it reads clearly inside the 52 px triangle.
- **Not clickable**. The triangle is a pure status indicator; toggling happens in the action row below.

### 2. Action-row bookmark icon-button (film detail modal + Journey card)

A compact icon-only button placed to the right of the existing "Mark as Watched" / "Watched" button in the action row. In the Journey card, the Skip button (when enabled) sits between them, so the order becomes `[Mark as Watched] [Skip?] [Bookmark]`.

- **Always visible** — this is how the user toggles bookmark state.
- **Off state**: outlined bookmark glyph, dim (using `--cream-dim` + ~60% opacity), no fill.
- **Gold state** (bookmarked, not watched): filled bookmark, gold.
- **Green state** (bookmarked, watched): filled bookmark, green.
- **Compact by design** — icon-only, no label, square aspect. Tapping toggles `watchlistSet`.
- Implemented as a single component `WatchlistButton` used in both surfaces. The component reads `isWatched` + `isBookmarked` props and picks the appropriate visual.

### 3. Films list tab — Watchlist filter pill

A third toggle pill added to the filter row that currently holds Watched / Unwatched. Unlike Watched/Unwatched (which are a mutually exclusive `watchMode`), Watchlist is an **independent boolean** that AND-composes with whichever `watchMode` is active.

- **Off**: rows are filtered by `watchMode` only (existing behavior).
- **On**: rows are further filtered to those in `watchlistSet`. For example, Saved + Unwatched = films the user saved but hasn't watched; Saved alone = everything saved including already-watched ones.
- Pill visual follows the existing Watched/Unwatched toggle styling (`.film-list-toggle.active` for the on state). Label: **"Saved"**.

### 4. Journey mode — "Only saved films" smart filter

A new smart-filter checkbox inside the existing Smart Filters section. Extends `DEFAULT_FILTERS.smart` with `watchlistOnly: false` and `SMART_LABELS.watchlistOnly = "Only saved films"`. Composes with the existing `skipWatched` and `unwatchedByAll` flags the same way they compose with each other.

Filter pipeline: one new branch in `src/utils/filmAttributes.js` mirroring the existing `skipWatched` branch — when `smart.watchlistOnly` is true and `watchlistSet` doesn't have the movie id, exclude the film.

### 5. Rating-locked copy

The `rating-locked` placeholder text — shown inside the rating pickers area when the film is not yet watched — changes from:

> "Mark as watched to rate this film"

to:

> "Watch and rate this film, or save it for later"

The "save it for later" phrase does not need to be a clickable link; the bookmark button in the same action area is the affordance. This copy change ships bundled with the watchlist feature — it's semantically dependent on the bookmark button being present.

## Data model

Add `profile.watchlist: string[]` — movie IDs — parallel to the existing `profile.watched: string[]`. Persisted through the existing `saveProfileField(profileId, 'watchlist', ids)` code path. Initializes to `[]` for profiles created after this ships; older profiles treat a missing field as empty.

App state in `App.jsx`:

- `const [watchlistSet, setWatchlistSet] = useState(new Set());`
- Hydration: inside the existing profile-load `useEffect`, after `watchedKeys` is built, build `watchlistKeys` the same way and `setWatchlistSet(watchlistKeys)`.
- Toggle: a new `handleToggleWatchlist(movieId)` that (a) optimistically flips the membership in `watchlistSet`, (b) writes the new array to Firestore via `saveProfileField`. Same error-handling envelope as the existing watched-toggle — UI updates first, persistence is fire-and-forget.
- `watchlistSet` is prop-drilled to `FilmCard`, `FilmDetailModal`, `FilmList`, `JourneyControls`, and anywhere else the filter pipeline runs (mirroring how `watchedSet` is passed).

## Component organization

- `src/utils/watchlist.js` — new helper. Exports `toggleWatchlistLocal(set, id) -> newSet` and small `isOnWatchlist(set, id)`. Keeps the set-manipulation logic isolated and easy to reason about without opening `App.jsx`.
- `src/components/WatchlistButton.jsx` — new. Icon-only button used in both the modal and the Journey card action rows. Props: `isWatched: boolean`, `isBookmarked: boolean`, `onToggle: () => void`.
- `src/components/WatchlistRibbon.jsx` — new. Corner-triangle badge used in both the modal and the Journey card posters. Props: `isWatched: boolean`, `isBookmarked: boolean`. Returns `null` when `!isBookmarked`.
- `src/components/FilmCard.jsx` — wiring only: mount `WatchlistRibbon` on the poster container, mount `WatchlistButton` in `.film-card-actions`, pass `isBookmarked={watchlistSet.has(movie.id)}` and `onToggle={onToggleWatchlist}`.
- `src/components/FilmDetailModal.jsx` — wiring only: same mounts, same props; uses the existing film-detail-poster container for the ribbon.
- `src/components/FilmList.jsx` — adds a third toggle pill next to Watched/Unwatched; adds `watchlistFilter: boolean` local state; extends the `useMemo` filter predicate with an AND of `!watchlistFilter || watchlistSet.has(m.id)`.
- `src/components/JourneyControls.jsx` / `src/components/SettingsModal.jsx` — adds `watchlistOnly: false` to `DEFAULT_FILTERS.smart`, a label entry to `SMART_LABELS`. The rest is existing rendering.
- `src/utils/filmAttributes.js` — one new branch in the smart-filter block, ANDed with the existing branches.
- `src/App.jsx` — new `watchlistSet` state, new hydration, new `handleToggleWatchlist`, prop wiring to the five surfaces. `smartContext` (passed into the filter pipeline) gains a `watchlistSet` key alongside the existing `watchedSet`.

## Data flow

```
App.jsx (owns watchlistSet, onToggleWatchlist)
  ├─ FilmDetailModal
  │   ├─ WatchlistRibbon (isBookmarked, isWatched)              ← poster corner
  │   └─ WatchlistButton (isBookmarked, isWatched, onToggle)    ← action row
  │
  ├─ FilmCard (Journey)
  │   ├─ WatchlistRibbon (same)
  │   └─ WatchlistButton (same, right of Mark as Watched and Skip)
  │
  ├─ FilmList (films tab)
  │   └─ Watchlist filter pill → local watchlistFilter state
  │       → useMemo filter: AND with watchlistSet.has(m.id)
  │
  └─ Journey filter pipeline (filmAttributes.js)
      ← smart.watchlistOnly + smartContext.watchlistSet
```

## Edge cases

- **Profile created before this feature ships** — `profile.watchlist` is undefined. Treat as empty array; the first toggle creates the field.
- **Firestore write fails after optimistic UI** — same pattern as watched today: the local `watchlistSet` is the source of truth for the session; Firestore retry is implicit on the next toggle. No extra recovery logic.
- **Watched toggle and watchlist toggle are orthogonal** — toggling one never touches the other. Both flags persist independently.
- **Films list row visual** — unchanged by this feature. The existing `film-row-dot` (green when watched) stays exactly as-is. Bookmark state is only visible via the filter pill.

## Test plan

Manual verification on the branch:

1. **Toggle from modal** — open any catalog film's detail modal, tap the bookmark button. Expect: button fills gold, gold corner triangle appears on the poster top-left. Toggle off: button reverts to outlined, triangle disappears.
2. **Toggle from Journey card** — same flow on the Journey card. Verify the button sits to the right of both Mark as Watched and Skip (when Skip is enabled).
3. **Color transition on watch** — bookmark a film (gold), then mark it watched. Expect: both the action-row button and the poster corner triangle transition from gold → green. Unmark watched: back to gold. Untoggle bookmark: button outlined, triangle gone.
4. **Films list filter pill** — on the Films tab, toggle the Watchlist pill. Expect: list shrinks to bookmarked films. Combine with Unwatched: only bookmarked films not yet watched. Toggle Watchlist off: full list returns.
5. **Journey smart filter** — in the Journey Controls → Smart Filters section, enable "Only films on my watchlist". Expect: Journey advances through bookmarked films only (composes with `skipWatched` the same way `skipWatched` already composes with `unwatchedByAll`).
6. **Copy change** — on an unwatched film's modal, confirm the `rating-locked` text reads "Watch and rate this film, or save it for later". Journey card's equivalent reads the same.
7. **Persistence** — toggle bookmarks, reload the page, confirm state survives. Confirm the same across a device the profile is shared on.
