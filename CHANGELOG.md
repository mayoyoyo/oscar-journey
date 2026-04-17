# Changelog

## Unreleased

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

### `feat/oscar-icon-declutter` — thanks @mayo
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
