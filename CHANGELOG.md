# Changelog

## 3.4.0 — 2026-04-21

### Journey filter side-trip
- **Filters are a temporary detour now.** Flip on a filter (e.g. watchlist-only),
  watch the bookmarked film it jumps you to, then turn the filter off — and
  you land back on the film you were on before you applied it. Survives
  refresh and crosses devices (persisted as `preFilterFilmId` on the profile).
- Fixes the long-standing bug where removing a filter stranded you on the
  detour film with no way back except to navigate manually.
- Snap-back is now `useLayoutEffect`-driven so the "Film X of Y" counter
  doesn't flash the detour position for one frame during the transition.
- `<JourneyControls>` is hoisted to a single persistent instance — the
  filter panel no longer collapses itself when filters push you across
  the "all films filtered out" boundary.
- **Sync with… dropdown hides dormant accounts.** Applies the same
  `watched.length > 0` rule the leaderboard already uses so brand-new
  profiles don't clutter the list.

### Watchlist + director filmography
- **Bookmark films to a personal Watchlist.** Tap the new ribbon on any
  card to save it for later. Journey gains a `watchlistOnly` smart filter
  so you can pivot from the random shuffle to just your saved picks.
- **Director filmography links** on canonical detail modals — click a
  director's name to see every film by them already in the catalog.
- **Unsaved-only** filter pill in the Film tab, complementing the existing
  watched / unwatched three-way toggle.
- Rating UX refinements.

### Multi-source ratings: Letterboxd + Metacritic + Consensus
- Film detail modals now surface **Letterboxd**, **Metacritic**, and a
  site **Consensus** score alongside the existing sources, giving you a
  richer picture before hitting play.
- Out-of-canon series preview tiles (sequels / prequels) pick up the same
  treatment so the numbers are consistent across both modals.

### Authoritative Oscar nominations
- **Ceremony modal now shows per-film Oscar wins AND losses** across every
  category the film was nominated in, not just Best Picture. Data is
  backfilled from Wikipedia / AMPAS records.
- Cleanup pass on five films with malformed awards arrays.

### Multi-genre taxonomy
- Films can carry **multiple genre tags** (e.g. Sci-Fi / Fantasy + Action /
  Adventure) and profile + ceremony layouts render them correctly side
  by side.
- Journey additive category filter supports the new Doc / Silent / B&W
  attributes; silent films no longer render a language pill or pass the
  International filter.
- **29 catalog films tagged Black & White.**

### Unsaved filter pill + light-mode polish
- New **Unsaved** filter pill in the Film tab.
- Light-mode readability pass across several screens (contrast + hover
  states).

### Small fixes
- Metacritic search links land on the **Movies** tab, not Games (was
  sending people to game pages for films with shared titles).
- "Also nominated for" heading drops the "Also" when there's no prior
  context above it.

## 3.3.5 — 2026-04-18

### Settings modal polish — chris-testing
- **Wider on desktop.** Max-width bumped 460px → 640px so Preferences,
  Data, and About sections have more breathing room. Mobile is unchanged
  (still `max-width: 100%` via the existing narrow-screen media query).
- **Themed scrollbar.** Replaced the browser default (chunky gray on
  Windows) with a thin gold-tinted scrollbar that matches the app's
  colors — subtle track, gold thumb that brightens on hover. Works on
  Chrome / Safari / Edge (via `::-webkit-scrollbar`) and Firefox
  (via `scrollbar-width: thin` + `scrollbar-color`).

## 3.3.4 — 2026-04-18

### Modal visual parity — chris-testing
- **Genre pill in the out-of-canon preview modal was rendering as the large
  `badge-genre` on its own row — swapped to `badge-genre-sm` inline with the
  year · runtime row, matching the canonical detail modal's layout exactly.**
  Multiple TMDB genres still render side-by-side (Sci-Fi / Fantasy + Action
  / Adventure for, e.g., the Star Wars sequels).
- Canonical modal's close button picked up an `aria-label="Close"` to match
  the sequel preview (accessibility).
- Sequel's Starring row now trims + filters empty strings defensively in
  case TMDB returns whitespace — same behavior as the canonical modal's
  OMDb-cast handling.

## 3.3.3 — 2026-04-18

### Shared modal-gesture hook — chris-testing
- **Refactored the ~200 lines of drag-to-close / horizontal swipe /
  arrow-key / scroll-preserve logic that were duplicated across
  `FilmDetailModal` (canonical films) and `SeriesFilmPreview` (out-of-canon
  sequels) into a single `useFilmModalGestures` hook.** Behavior is
  unchanged end-user-side; the win is that future gesture work — a new
  keyboard shortcut, different swipe threshold, haptic feedback — now
  lives in one file instead of needing to be implemented twice.
- **Free feature parity:** `FilmDetailModal` picked up Escape-to-close
  while we were there (SeriesFilmPreview already had it).
- Net: **-130 lines** across the codebase (-376 from the two modal files,
  +246 in the new shared hook).

## 3.3.2 — 2026-04-18

### Watched list now includes out-of-canon films — chris-testing
- **Sequel/prequel films marked as watched now appear in your profile's
  Watched Films list** — previously the Watched count would increment but
  the film never showed in the list below, creating a "where did it go?"
  mismatch. Out-of-canon films render as a simplified tile (TMDB poster,
  dimmed border, "NOT IN CANON" tag) and open the `SeriesFilmPreview`
  modal on click instead of the canonical detail modal.
- **Avg Rating stat includes out-of-canon ratings** so your profile's
  overall rating average reflects every rating you've left, not just
  canonical films. Favorite Genre stays canon-only by design — it's a
  curated-catalog metric and out-of-canon films don't carry genre codes.
- **New helper `resolveTmdbWatchedId(id)`** in `seriesCollections.js` that
  resolves `tmdb:<n>` watched-ids back to TMDB film metadata so any
  profile-scope view can render them without special-casing.

### Instant theme toggle — chris-testing
- **Light/dark mode swap is now instant** instead of fading through the
  old theme over 150-200ms. Previously every button / card / pill with a
  generic `transition: all` was interpolating its background-color from
  the old theme's value to the new one. A one-frame `theme-switching`
  class now suppresses all transitions during the actual color swap, then
  lifts — so hover/interaction transitions keep working but the theme
  flip itself is snappy.

## 3.3.1 — 2026-04-18

### Series navigation polish — chris-testing
- **Seamless canon-boundary crossings.** Walking a series from a canonical
  film into a sequel/prequel (or back) no longer flashes the modal or jumps
  the scroll to the top. The incoming modal mounts with no open-animation
  (overlay + inner scale both suppressed via `modal-overlay-instant`) and
  at the outgoing modal's `scrollTop`, so the swap feels like a content
  swap in a single modal — same as the in-canon ↔ in-canon click path.
  Applies to both click (series strip poster) and swipe paths.
- **Desktop arrow-key and `‹ ›` button nav inside sequel modals.** The
  sequel/out-of-canon preview now renders the same prev/next overlay
  arrows as the canonical modal, and `ArrowLeft` / `ArrowRight` walk the
  series. Previously the arrows disappeared the moment you landed on a
  non-canon film, leaving desktop users stuck.
- **Desktop keyboard/click nav is instant, not sliding.** The 40% slide
  animation is now reserved for touch swipes where it provides gesture
  feedback — on desktop, arrows and clicks just swap content like every
  other modal on the site.
- **Series strip scroll no longer hijacks sibling nav.** Horizontal
  swiping the poster strip inside a modal was also being interpreted as a
  sibling swipe, triggering a film swap mid-scroll. Touches that start
  inside `.series-strip` are now ignored by the modal-level swipe handler.
- **Animation-timing race fixed** on rapid-succession swipes: a trailing
  `setTimeout` from the prior gesture could clear the next animation's
  `transition` mid-flight and snap the incoming film into place. Tracked
  via a ref so new gestures cancel the stale timer.

## 3.3.0 — 2026-04-18

### Series navigation — chris-testing
- **New series collections layer.** TMDB-sourced franchise data maps canon
  films onto their full series (Star Wars 1–9, Godfather 1–3, Alien 1–6,
  LOTR/Hobbit, Before trilogy, etc.). `seriesCollections.js` exposes
  `getSeriesForFilm(id)` + `getSeriesForTmdbId(tmdb)` returning
  `{ collection, film, siblings }` for callers.
- **Series strip inside the film modal.** `SeriesSection` renders a
  horizontal strip of chronological poster thumbnails below the film details.
  Current film is outlined in gold with a gold order badge; watched siblings
  get a gold ✓; non-canon siblings are dimmed. Drag-to-scroll on desktop with
  click suppression so a drag doesn't accidentally navigate.
- **Sequel/out-of-canon preview modal.** New `SeriesFilmPreview` mirrors the
  canonical film modal for TMDB-only films — full poster, title, year,
  runtime, genre pills, director, cast, overview, IMDb link, trailer,
  JustWatch link. Mark-as-watched + rate works via a `tmdb:<id>` key so
  out-of-canon films live alongside catalog films in `watchedSet`/`ratings`
  without collision.
- **Swipe between films in a series.** Horizontal swipe in either modal
  navigates to the next/prev sibling chronologically, crossing the
  canon/non-canon boundary transparently (canonical → `FilmDetailModal`
  swap, non-canon → `SeriesFilmPreview` swap). Falls back to series siblings
  automatically when the modal is opened without a useful cohort (Journey
  tab, Battle, Activity Feed, or a 1-result Films search).
- **Series-aware series-preview entry from FilmCard.** Clicking a non-canon
  poster in the Journey-card's own series strip opens the preview directly
  instead of routing through the detail modal first.

### Mobile modal polish — chris-testing
- **Pop-out card look.** Modal now reads as a rounded card floating on a
  dim backdrop (20px corners, 84dvh max height, 28px/14px overlay padding),
  matching the Journey card's visual language. Previous edge-to-edge
  override in `.film-detail-modal` was undoing the generic `.modal` mobile
  polish; now both stay in sync.
- **Drag-to-close.** Modal follows your finger when scrolled to the top,
  rubber-bands past 150px, and closes past 120px with a synchronized
  slide-off-bottom + backdrop-fade animation (200ms). Mid-scroll drags are
  ignored so you can read long plot summaries without accidentally closing.
- **Swipe between films.** Horizontal swipe animates a 40% slide-out + a
  opposite-side slide-in (cubic-bezier 0.16/1/0.3/1). Swiping past the end
  of the list snap-backs instead of starting a doomed animation.
- **iOS Safari rubber-band fix.** `overscroll-behavior-y: none` on the
  scroll container stops iOS from bouncing inner content while the JS drag
  is translating the modal frame — the poster no longer detaches from the
  modal's top edge mid-swipe.
- **Single scroll container.** Flattened the previously-nested
  `.film-detail-inner` overflow so `.film-detail-modal` is the only
  scroller; fixes the swipe-to-close gesture (nested scroller was keeping
  the outer `scrollTop` at 0 regardless of position).
- **"Part of" prefix dropped** from the series heading and non-canon preview
  tag — the series name speaks for itself in context.

### Post-merge polish pass — chris-testing
- Animation timing bug: `resetTransform`'s trailing 240ms `transition`-clear
  was firing mid-swipe and snapping the incoming film into place instead of
  gliding it in. Tracked via a ref so successive swipes cancel the stale
  timer. Same fix applied to `SeriesFilmPreview`.
- Dead code removed: `SeriesSection`'s internal `<SeriesFilmPreview>`
  fallback was unreachable (all callers already pass `onClickOutOfCatalog`);
  plus a block of legacy `.series-header*` / `.series-film*` /
  `.series-chevron` / `.series-preview-genres` / `.series-preview-genre-pill`
  CSS that had been orphaned by the switch from vertical list to horizontal
  strip.

## 3.1.0 — 2026-04-17

### Profiles: Canon Score drill-down + Daily Oscar streak — chris-testing
- **Canon Score tier rows are clickable.** On any profile detail page, click
  a row in the tier breakdown table ("7 of 8", "3 of 8", etc.) and land on
  the Films tab with `minTier` preset to that row's tier — "14 films at
  tier 6" is now one click away. Filter panel stays collapsed; the
  collapsed header's chip summary + shrunken film count convey the
  narrowing.
- **🃏 Collector score pill → 🎬 Daily Oscar streak** on profile cards.
  DailyOscar now persists the streak to Firestore (`dailyStreak` field) on
  solve/fail, so every profile can show its current streak.
- **Canon Score sub-card polish.** Dropped the %-won column (3-column fit
  is cleaner in the sub-card), dropped the "Next up — highest-signal
  unwatched" list, render all 8 pips per row (filled + empty) so every
  tier row is the same width, vertical-align cells to middle, restore the
  sub-card's 20px inner padding when it's nested in the profile detail
  page, 28px gap between the Top 5 / Ratings by Genre / Progress by Decade
  sections so they stop bunching.
- **Browser back/forward routing fixed.** App's popstate handler now splits
  on `/` so nested paths like `/profiles/chris` resolve to the leaderboard
  tab (previously stuck on whatever tab you were on). `autoSelectProfileId`
  stays in sync with the URL — back to `/profiles/chris` re-opens that
  profile's detail view; back to `/profiles` returns to the list instead
  of bouncing back to the last-viewed profile.
- **"Back to Leaderboard" button fixed.** Explicitly pushes `/profiles`
  instead of using `window.history.back()`, which could land on `/films`
  if you came via the Canon Score tier drill-down.

### Winner pill text trim — chris-testing
- Dropped "· Speech" from BP / Intl / Anim winner pills. Labels now read
  **Winner**, **Intl Winner**, **Anim Winner** — the `↗` icon + tooltip
  already signal the speech link.

### Merged mayo's follow-up commits
- Language pill is **language-based, not country-based** (one film's pill
  reflects its primary language, not its country of production).
- Detail modal shows **per-Oscar-category speech pills**, and the language
  pill moves onto the year / runtime line.
- Films list gains an **Unwatched-only** toggle alongside Watched-only
  (three-way `watchMode` enum — mutually exclusive, click active pill to
  return to "all").
- Merge conflict resolved in `FilmCard.jsx` year-row: keeps runtime · tier
  pips · language pill in the detail-modal's order.

### Filter cleanup — chris-testing
- Removed **ESSENTIAL** from Categories filter. Essentials now governed solely
  by Canon depth, which gained an **Essentials only** toggle (mutually
  exclusive with *Oscars only*). Applies to both Film tab and Journey.
- Journey filter panel now mirrors the Film tab: unified 1–7 tier stepper
  (via `getTier()` — OSCAR / OSCAR_NOM counts as a canon list), inline Reset
  chip in the header, per-row "only" shortcut buttons, and chip-summarized
  collapsed state.

### Journey card polish — chris-testing
- Year + runtime render inline (`1972 · 2h 18m`) with tier pips alongside,
  matching the detail modal.
- **Directed by** uses a bold label and pulls from the hand-curated
  `directors.json` (OMDb fallback).
- New **Starring** line under the director, sourced from `actors.json`.

### `feat/oscar-icon-declutter` — thanks mayo
All of the following shipped as part of mayo's PR:

- **Oscar statuette icon system** replaces the ✦ Essential text badge. Gold
  (BP winner), bronze (BP nominee, 0.85× scale), blue (Intl winner, 0.85×),
  purple (Anim winner, 0.85×), absent (canon-only). Renders in film rows,
  modal ceremony line, and FilmCard. Multi-statuette films (Parasite, Amour)
  render in a consistent left→right order.
- **Unified canon-depth filter** — redesigned UI: Oscars-only toggle +
  minimum-tier −/+ stepper (1..7) with per-level descriptions (Everything →
  Canon threshold → … → All-time masterpieces). Tier applies to ALL films,
  not just essentials.
- **Full-catalog search** across title + director + full Wikidata cast
  (OMDb top-billed fallback). New placeholder: "Search films, directors,
  cast...".
- **Per-category Oscar wins** backfilled for 96 essentials (Wikipedia
  Accolades tables, Wikidata SPARQL, 17 hand-patched). Dark Knight now
  renders "Sound Editing + Supporting Actor — Heath Ledger".
- **Detail modal restructure**: runtime inline with year, tier pill in year
  row, "Directed by" above synopsis, new "Starring" line, simplified ceremony
  line ("Nth Academy Awards"), dropped redundant canon-list block, colored
  BP/Intl/Anim chips replaced by tinted statuettes.
- **Sticky filter bar** on scroll with match count promoted into the header
  (`509 · 77✓` short form on mobile).
- **Language pill** for non-English films (powered by `languages.json` —
  201 films).
- New data files: `languages.json`, `directors.json` (835 films, 20
  hand-trims), `actors.json` (OMDb top-billed), `cast.json` (Wikidata).
- `docs/METHODOLOGY.md` — the 2-of-N canon triangulation rule.
- `apple-touch-icon` for iOS homescreen install.
