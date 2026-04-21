# Journey Filter as a "Side Trip" — Design

**Date:** 2026-04-21
**Scope:** Journey mode filter behavior (`src/App.jsx`)
**Type:** Bug fix + small persistence addition

## Problem

A journey filter is meant to act like a temporary detour. Concretely: the user is walking through the line of films, tonight they don't feel like watching the random film at their current position, so they flip on the watchlist-only filter ("just show me the ones I bookmarked") and the app walks them over to a bookmarked film. They watch it. When they remove the filter — whether minutes later or days later on a different device — they expect to land back on the film they were on before applying the filter.

Today that doesn't happen. After the filter is removed, the journey stays on the filtered film (e.g. position 355) instead of returning to the pre-filter position (e.g. position 5). The "saved spot" memory also dies on page refresh.

This applies to every Journey filter, not just watchlist — but watchlist is the paradigm case because it's the one users actively curate. (Watchlist feature landed in PRs #22 / #23 as `smart.watchlistOnly`.)

## Root Cause

`App.jsx` already has scaffolding for this: a `preFilterIdx` React ref and an auto-skip `useEffect`. The snap-back branch has a logic flaw. Simplified:

```js
} else if (preFilterIdx.current !== null) {
  if (idxPassesFilter(preFilterIdx.current) && preFilterIdx.current !== currentIdx) {
    setCurrentIdx(preFilterIdx.current);
    firebaseSave('currentIdx', preFilterIdx.current);
  }
  preFilterIdx.current = null;  // ← clears on every else-branch pass
}
```

Trace — user at idx 5, applies watchlist-only:

1. Effect fires. `idxPassesFilter(5)` false → save `preFilterIdx = 5`, auto-skip to the nearest bookmarked film at idx 355, persist `currentIdx = 355`.
2. Effect fires again because `currentIdx` changed. `idxPassesFilter(355)` is true → enters else branch. Inner condition checks `idxPassesFilter(preFilterIdx = 5)`, which is **false** because the filter is still active. Snap-back body skipped — but `preFilterIdx.current = null` runs unconditionally at the end of the else, wiping the memory.
3. User removes filter. Effect fires. `preFilterIdx` is already null. Nothing happens. Journey stays on 355.

Separately, `preFilterIdx` is a `useRef`, so even without the logic bug, the memory dies on page refresh and does not cross devices.

## Design

### State model

- Replace the `preFilterIdx` React ref with a persisted profile field: **`preFilterFilmId: string | null`**, stored on the Firestore profile doc alongside `currentIdx`. Default `null`.
- Store the **film ID**, not the playlist index. Indices shift on reshuffle and catalog churn; film IDs are stable. Resolve ID → index at read time. This mirrors the existing pattern used for `currentIdx` recovery after reshuffles in the profile-load path.

### Filter-skip effect behavior

Rewrite the auto-skip `useEffect` in `App.jsx` (the block beginning `// --- Auto-skip to next eligible film when current is filtered out ---`) to match this table:

| Situation | Action |
|---|---|
| Current film is filtered out, `preFilterFilmId` is null | Set `preFilterFilmId = playlist[currentIdx].id`. Persist. Auto-skip to next eligible film forward (backward if none forward). Persist new `currentIdx`. |
| Current film is filtered out, `preFilterFilmId` already set | Auto-skip. **Do not overwrite** `preFilterFilmId`. (Preserves the original pre-filter spot through filter A → filter B swaps or forward navigation within a filter.) |
| Current film passes filter, `preFilterFilmId` set, that film is in the playlist AND passes the current filter AND its resolved index ≠ `currentIdx` | **Snap back:** set `currentIdx` to the resolved index. Clear `preFilterFilmId`. Persist both. |
| `preFilterFilmId` set but the saved film is no longer in the playlist (removed from catalog, etc.) | Clear `preFilterFilmId` as stale. Persist. |
| `preFilterFilmId` set and its resolved index equals `currentIdx` | Clear `preFilterFilmId` (we're home). Persist. |
| None of the above | No change. |

Key property: **`preFilterFilmId` clears only in the explicit cases above** — not as a side effect of entering the else branch. That is the core fix.

### Load / migration

Add `preFilterFilmId` to the existing profile-sanitization block in the profile-load path. Treat missing / non-string values as `null`. No backfill needed — old profiles start with `null` and acquire a value the first time they trigger an auto-skip.

### Persistence

Use the existing `firebaseSave('preFilterFilmId', value)` pattern (same pattern `currentIdx` uses). The profile-state setter should update this field alongside the ref-replacement read path.

## Out of Scope

- No change to which filters exist or how `moviePassesFilter` computes them.
- No new UI. No "commit to this detour" / "forget saved spot" button. Removing the filter is the one and only way to return.
- No behavior change to the Films-tab filter or to battle/quiz filters. Journey-mode only.

## Testing

Manual QA. The story covers:

1. **Basic side trip:** start at idx 5 with no filter. Apply watchlist-only → journey jumps to the nearest bookmarked film. Remove the filter → journey returns to idx 5.
2. **Refresh persistence:** same as 1, but refresh the page while the filter is still on. Verify `preFilterFilmId` persisted on the profile doc. Remove filter → still snaps back to idx 5.
3. **Filter swap preserves origin:** apply filter A → jump to film X. Apply filter B without removing A first → jump to film Y. Remove all filters → snap back to idx 5, not X or Y.
4. **Forward nav under filter:** apply filter → jump to X. Press "next" a few times, landing on X+N. Remove filter → snap back to idx 5 (not X+N).
5. **Stale saved film:** apply filter → jump to X. Contrived: the original-position film gets removed from the catalog. Remove filter → no crash, `preFilterFilmId` clears gracefully, journey stays put.
6. **Cross-device:** apply filter on device A, open app on device B → B loads the already-skipped position with `preFilterFilmId` on the profile. Remove filter on B → snaps back on B. Device A will also snap back on its next activeFilters recompute.

No unit tests. The logic lives in a single `useEffect` tightly coupled to React state and Firestore. Manual QA against the list above is sufficient, to be run on `bun dev` locally before merging.
