# Filter revamp: Journey-mode parity, B&W/DOC/SILENT data audit, and exclude semantics

**Date:** 2026-04-19
**Scope:** Filter UI and supporting data corrections for the Journey-mode and Films-tab filter panels.

## Background

The Journey filter (`src/components/JourneyControls.jsx`) and the Films-tab filter (`src/components/FilmList.jsx`) share the same filter shape (`CATEGORY_LABELS`, `GENRE_LABELS`) and the same matching helper (`matchesCategoryFilter` from `src/utils/filmAttributes.js`). Three independent issues currently degrade the experience:

1. Journey mode silently drops three of the five Categories rows (Documentary, Silent, Black & White) because its row-counting logic doesn't match the Films tab's.
2. Modern films that should be tagged Black & White, Documentary, or post-1928 Silent are missing from the curated id-sets in `filmAttributes.js` (Belfast 2021 is the prompting example for B&W).
3. Both filter panels have no real way to exclude — Categories use OR-include and Genres use OR-include over `genre + altGenres`, so a multi-tag film survives any single uncheck. The current "only" button per row is a redundant isolate-this-row shortcut and is being repurposed.

This spec covers all three.

---

## Item 1 — Journey-mode Categories parity

### Diagnosis

`JourneyControls.jsx:147–154` builds `categoryCounts` from `m.category` and `m.alsoWon` only. None of those fields ever equal `DOC`, `SILENT`, or `BW`, so the count for those three rows is always 0. `renderChecklist` (`JourneyControls.jsx:171`) then hides any row whose count is 0, dropping the three rows entirely. Actual filtering is fine — `App.jsx:78` calls `matchesCategoryFilter(movie, f.categories)`, which uses the predicate functions correctly.

`FilmList.jsx:396–404` already counts via the predicates (`isInternational`, `isAnimated`, `isDocumentary`, `isSilent`, `isBlackAndWhite`), which is exactly what Journey needs.

### Fix

Replace the `categoryCounts` `useMemo` in `JourneyControls.jsx` with the predicate-based counter from `FilmList.jsx`. ~10-line patch. No data changes, no API changes, no behavior change to the actual filter — only the visibility of the three currently-hidden rows.

### Acceptance

- All five rows (International / Animated / Documentary / Silent / Black & White) render in the Journey-mode Categories section.
- Each row's count matches the same row's count in the Films tab when `eligiblePool` parity holds.
- Journey filter behavior is unchanged for any user who had a previously-saved filter state.

---

## Item 2 — Audit script for missing B&W / Documentary / post-1928 Silent tags

### Goal

Produce a script that finds catalog films whose B&W / Documentary / Silent status is likely incorrect, dump candidates to JSON for manual review, and ultimately update the curated id-sets in `src/utils/filmAttributes.js` (`BW_POST_1955_IDS`, `DOC_IDS`, `SILENT_POST_1928_IDS`, and the negative set `COLOR_PRE_1955_IDS`).

### Why a curated audit (not runtime API)

OMDb is unreliable for B&W (the field is often missing or wrong) and for documentary tagging in our catalog. A one-time audit-and-bake approach has been the project's pattern (see `scripts/genre-review-master.json`, `scripts/audit-baked-vs-imdb.json`, etc.). Same shape applies here.

### Source strategy

- **Documentary:** TMDB `/movie/{id}` `genres[]` is authoritative — if "Documentary" appears, flag.
- **Black & White:** Wikipedia infobox `Color process` / `Color` field. Reliably reads "Black and white", "Black-and-white", "Color (Eastmancolor)" etc. Parse to a tri-state (B&W / Color / unknown).
- **Silent (post-1928):** No good API signal. Script flags candidates by combining (a) Letterboxd's "Silent Film" tag if present in the metadata we already cache, and (b) any film where Wikipedia's lead sentence contains "silent film." Output a small candidate list for manual review. CODA (`coda-2021`) is explicitly preserved as **not** silent — script must whitelist it from any silent-tag suggestion.

### Output

`scripts/audit-bw-doc-silent.json` with one row per flagged film:

```jsonc
{
  "id": "belfast-2021",
  "title": "Belfast",
  "year": 2021,
  "currentTags": { "BW": false, "DOC": false, "SILENT": false },
  "suggestedTags": { "BW": true, "DOC": false, "SILENT": false },
  "evidence": {
    "wikipediaColorField": "Black and white",
    "tmdbGenres": ["Drama", "History"],
    "letterboxdTags": []
  },
  "reviewed": false,
  "decision": null
}
```

A separate `scripts/apply-bw-doc-silent.mjs` (parallel to existing `scripts/apply-user-overrides.mjs`) takes the reviewed JSON and patches the four id-sets in `src/utils/filmAttributes.js`.

### Scope of pass

- Walk the full `MOVIES` array.
- For each film: query TMDB by IMDb id (already cached), fetch Wikipedia page by title+year.
- Rate-limit and cache locally so reruns are cheap.
- Skip pre-1955 films for the BW check (already covered by the year-default rule plus `COLOR_PRE_1955_IDS`).
- Skip films already in the relevant curated set (no need to re-flag).

### Acceptance

- Script runs end-to-end and writes `scripts/audit-bw-doc-silent.json`.
- Belfast (2021) appears in the JSON with `suggestedTags.BW = true` and a Wikipedia evidence string.
- CODA (2021) does **not** appear with a SILENT suggestion.
- Apply step, after manual review, produces a clean diff against `src/utils/filmAttributes.js` and nothing else.

---

## Item 3 — Replace per-row "only" with per-row "excl"; add exclude semantics

### Today

- Categories filter is OR-include with empty = "no restriction." Multi-attribute films (Belfast = BW + International) survive any single uncheck.
- Genres filter is OR-include over `genre + altGenres`. A Comedy/Drama film survives unchecking "Comedy" because Drama is still checked.
- Each row has an `only` button that sets the row's section to `{thisKey: true, ...rest: false}`. Useful but redundant.
- Net effect: **there is no way to exclude.**

### Model: include + exclude as orthogonal sets

Each section (Categories, Genres) keeps its existing include map and gains a parallel exclude map.

```
filters.categories         // include map, unchanged shape
filters.categoriesExcluded // new — same keys, true means excluded
filters.genres             // include map, unchanged shape
filters.genresExcluded     // new — same keys, true means excluded
```

A row is in **exactly one** of three states: included (in include map), neutral (in neither), excluded (in exclude map). Toggling include off does not auto-exclude; toggling exclude off returns to neutral, not included. The two state maps are mutually exclusive at write time — flipping a row to excluded clears its include entry, and vice versa.

### Filter semantics — exclude wins

A film is hidden if it matches any excluded tag. Otherwise the existing include logic applies.

- **Categories.** Pass if `(no include checked OR film matches some included attribute) AND (film matches no excluded attribute)`. Implemented inside `matchesCategoryFilter` so both surfaces share it.
- **Genres.** Pass if `(any of [m.genre, ...m.altGenres] is included) AND (none of [m.genre, ...m.altGenres] is excluded)`. Extract this check into a new `matchesGenreFilter(movie, includes, excludes)` in `src/utils/filmAttributes.js` and call it from both `App.jsx` and `FilmList.jsx` so the two surfaces can never drift.

### UI

Replace the per-row `only` button with an `excl` button. No bulk control added; the existing global "Reset filters" handles the nuke case.

Per-row visual states:
- **Included** (checked): unchanged — checkbox shows ✓, label normal weight.
- **Neutral** (unchecked, not excluded): unchanged — empty checkbox, label normal weight.
- **Excluded:** label gets `text-decoration: line-through` and ~50% opacity. The `excl` button flips from outlined to filled-red to signal "active exclusion." Click `excl` again to return to neutral.

Clicking the row's checkbox area toggles include and clears any exclusion on that row. Clicking `excl` toggles exclusion and clears any include on that row. The two interactions never collide.

### Counts

- Include count badge in the section header continues to count included rows only.
- If any row in the section is excluded, append a small `· N excl` to the badge so a collapsed section telegraphs the exclusion state.

### Migration

`filters.categoriesExcluded` and `filters.genresExcluded` default to all-false. Profiles saved before the change have neither key; the read-time merge in `JourneyControls.jsx:44` and `FilmList.jsx`'s equivalent handles `?? {}` defaults — no migration script needed. New keys persist on next save.

### Acceptance

- A user can exclude "Comedy" from the Genres filter, and a Comedy/Drama film disappears from results.
- A user can exclude "Black & White" from Categories, and Belfast (once tagged) disappears even though it's still tagged International.
- Excluded rows visually strike through and the `excl` button reads as "active."
- The `only` button is removed everywhere.
- Existing saved filter profiles load and behave identically until the user explicitly excludes something.
- Reset filters clears both include and exclude state.

---

## Out of scope

- Any change to the canon-tier slider, year/runtime sliders, smart filters, or oscarsOnly / essentialsOnly toggles.
- Refactoring the filter shape beyond adding the two excluded-map keys.
- Migrating existing per-profile filter state on the server — read-time merge is sufficient.

## Implementation order

1. **Item 1** first (smallest, highest user-visible value, zero risk to data).
2. **Item 2** next, but split: write & run the audit script → manual review → apply patch. The Item 2 data update is what makes the new exclude UX in Item 3 actually useful for B&W (since Belfast etc. need to be tagged before excluding "B&W" does anything for them).
3. **Item 3** last. Touches both filter panels and the shared helper.
