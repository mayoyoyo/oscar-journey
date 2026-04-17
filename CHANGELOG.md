# Changelog

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
