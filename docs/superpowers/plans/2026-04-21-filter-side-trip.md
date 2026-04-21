# Filter Side-Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix journey-mode filter "side trip" behavior — removing a filter should return the user to the film they were on before they applied it, and that memory should survive page refreshes and cross-device use.

**Architecture:** Replace the in-memory `preFilterIdx` React ref with a Firestore-persisted `preFilterFilmId` (film ID, not index, so it survives reshuffles). Rewrite the auto-skip `useEffect` so the saved position only clears on explicit snap-back / stale / home conditions — not unconditionally on every else-branch pass.

**Tech Stack:** React 18, Firebase Firestore, Vite. No test framework — project uses manual QA on `bun dev`.

**Spec:** `docs/superpowers/specs/2026-04-21-filter-side-trip-design.md`

---

## Task 0: Sync branch with origin/master

The branch `feat/filter-side-trip` was created from local `master` which was 2 commits behind `origin/master` when this plan was written. Implementation tasks reference code that only exists on `origin/master` (watchlist feature from PRs #22/#23). Bring the branch up to date before touching any code.

**Files:**
- None (git-only operation)

- [ ] **Step 1: Verify branch and divergence**

Run: `git status && git log --oneline -3 && git log --oneline origin/master -3`

Expected: on branch `feat/filter-side-trip`; `git log HEAD` shows the spec commit on top of `cc34d78`; `origin/master` shows `01370c6` on top.

- [ ] **Step 2: Fast-forward merge origin/master into the branch**

Run: `git merge --ff-only origin/master`

Expected: success. `git log --oneline -5` now shows `01370c6` (feat: Unsaved filter pill), `a99c1a8` (Director filmography), the spec commit, then earlier history. If the merge is NOT a pure fast-forward (because someone committed to the branch in parallel), stop and ask the user.

- [ ] **Step 3: Commit** — nothing to commit, the merge is its own commit.

---

## Task 1: Add `preFilterFilmId` state and plumbing

Introduce the new state slot, load it from the profile on hydrate, and reset it on logout. The old `preFilterIdx` ref stays in place for now — this task only adds the new field without wiring it up to the effect.

**Files:**
- Modify: `src/App.jsx` (state declaration near `currentIdx` + `watchlistSet`)
- Modify: `src/App.jsx` (profile-load path — the block that ends with `setProfile(data); setPlaylist(pl); setCurrentIdx(...)` etc.)
- Modify: `src/App.jsx` (logout / sign-out handler that resets state alongside `setWatchedSet(new Set())` etc.)

- [ ] **Step 1: Add the `useState` declaration**

Locate the `const [watchlistSet, setWatchlistSet] = useState(new Set());` line in the `--- Core state ---` block. Immediately below it, add:

```jsx
const [preFilterFilmId, setPreFilterFilmId] = useState(null);
```

- [ ] **Step 2: Hydrate from profile in the load path**

In the load path, find the block that reads:

```jsx
const rawWatchlist = Array.isArray(data.watchlist) ? data.watchlist : [];
const watchlistKeys = new Set(rawWatchlist);
```

Immediately below it, add the sanitized read for the new field:

```jsx
// preFilterFilmId — the film ID the user was on before a filter auto-skip.
// null means "no saved side-trip origin". Coerce non-string values to null
// so legacy profiles (or any corruption) get a safe default.
const rawPreFilter = typeof data.preFilterFilmId === 'string' ? data.preFilterFilmId : null;
```

Then find the `setWatchlistSet(watchlistKeys);` line and add the setter directly below it:

```jsx
setPreFilterFilmId(rawPreFilter);
```

- [ ] **Step 3: Reset on logout**

Locate the logout / sign-out handler — the same block that contains:

```jsx
setPlaylist([]);
setCurrentIdx(0);
setWatchedSet(new Set());
setWatchlistSet(new Set());
```

Add directly below `setWatchlistSet(new Set());`:

```jsx
setPreFilterFilmId(null);
```

- [ ] **Step 4: Sanity-check the diff**

Run: `git diff src/App.jsx`

Expected: three small additions — the useState, the hydrate read+setter pair, the logout reset. No other changes. The old `preFilterIdx` ref declaration is still present and untouched.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add preFilterFilmId state + hydrate/reset plumbing"
```

---

## Task 2: Rewrite the filter-skip effect; remove the old ref

Replace the auto-skip `useEffect` body with logic that reads/writes `preFilterFilmId` per the spec's behavior table. Then delete the now-unused `preFilterIdx` ref.

**Files:**
- Modify: `src/App.jsx` (the `useEffect` block headed by `// --- Auto-skip to next eligible film when current is filtered out ---`)
- Modify: `src/App.jsx` (the `preFilterIdx = useRef(null)` declaration line)

- [ ] **Step 1: Rewrite the effect**

Replace the entire block from the `// --- Auto-skip to next eligible film when current is filtered out ---` comment through its closing `}, [...]);` with:

```jsx
  // --- Auto-skip to next eligible film when current is filtered out ---
  //
  // Filters act as a temporary "side trip". When a filter hides the current
  // film, we remember where the user was (by film ID, not index — indices
  // drift on reshuffle) and walk them forward to the nearest eligible film.
  // When the filter state changes such that the saved film passes again,
  // we snap the user back to it. The saved ID lives on the profile doc so
  // the side-trip memory survives refresh and crosses devices.
  //
  // We persist the auto-skipped currentIdx to Firestore too — the Profile
  // view reads profile.currentIdx and would otherwise desync from Journey's
  // playlist[currentIdx] whenever a filter hides the current film.
  useEffect(() => {
    if (screen !== 'card' || !playlist.length || eligibleStats.total === 0) return;

    // Resolve the saved film ID to an index in the current playlist.
    // -1 = saved film isn't in the playlist (stale / removed from catalog).
    const savedIdx = preFilterFilmId
      ? playlist.findIndex(m => m.id === preFilterFilmId)
      : null;

    if (!idxPassesFilter(currentIdx)) {
      // Case A: current film is filtered out. Auto-skip.
      // Save the origin if we haven't already — first time only, so filter
      // swaps (A → B) and forward nav under a filter both preserve the
      // ORIGINAL pre-filter spot.
      if (preFilterFilmId === null) {
        const originId = playlist[currentIdx]?.id;
        if (originId) {
          setPreFilterFilmId(originId);
          firebaseSave('preFilterFilmId', originId);
          setProfile(prev => prev ? { ...prev, preFilterFilmId: originId } : prev);
        }
      }
      // Walk forward to the next eligible film; if none ahead, walk backward.
      let next = currentIdx + 1;
      while (next < playlist.length && !idxPassesFilter(next)) next++;
      if (next >= playlist.length) {
        next = currentIdx - 1;
        while (next >= 0 && !idxPassesFilter(next)) next--;
      }
      if (next >= 0 && next < playlist.length && next !== currentIdx) {
        setCurrentIdx(next);
        firebaseSave('currentIdx', next);
      }
      return;
    }

    // Case B: current film passes the filter. Maybe it's time to snap back.
    if (preFilterFilmId === null) return; // Nothing saved, nothing to do.

    if (savedIdx === -1) {
      // Stale: the saved film is no longer in the playlist. Clear.
      setPreFilterFilmId(null);
      firebaseSave('preFilterFilmId', null);
      setProfile(prev => prev ? { ...prev, preFilterFilmId: null } : prev);
      return;
    }

    if (savedIdx === currentIdx) {
      // We're home. Clear the memory.
      setPreFilterFilmId(null);
      firebaseSave('preFilterFilmId', null);
      setProfile(prev => prev ? { ...prev, preFilterFilmId: null } : prev);
      return;
    }

    if (idxPassesFilter(savedIdx)) {
      // Saved spot passes current filter → snap back.
      setCurrentIdx(savedIdx);
      firebaseSave('currentIdx', savedIdx);
      setPreFilterFilmId(null);
      firebaseSave('preFilterFilmId', null);
      setProfile(prev => prev ? { ...prev, preFilterFilmId: null } : prev);
      return;
    }

    // Otherwise the saved spot is still filtered out — leave preFilterFilmId
    // in place and wait for a future filter change.
  }, [
    currentIdx,
    screen,
    playlist,
    idxPassesFilter,
    eligibleStats.total,
    firebaseSave,
    preFilterFilmId,
  ]);
```

Note the dependency array gained `preFilterFilmId` so the effect re-runs when the saved ID changes (important for snap-back timing).

- [ ] **Step 2: Delete the old ref**

Remove this line entirely from the `--- Core state ---` block:

```jsx
  const preFilterIdx = useRef(null); // Saved position before filter auto-skip
```

- [ ] **Step 3: Verify no stale references remain**

Run: `Grep for preFilterIdx in src/`

Expected: zero matches.

- [ ] **Step 4: Verify build compiles**

Run: `bun install && bun run build` (or `npm run build` if bun unavailable)

Expected: clean build, no errors. If the build complains about an unused `useRef` import, check whether `useRef` is still used elsewhere in the file; if not, remove it from the `import { ... } from 'react'` line.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: filter side-trip snap-back via persisted preFilterFilmId

Fixes the bug where removing a journey-mode filter stranded the user
on the detour film instead of returning to the pre-filter position.
Replaces the in-memory preFilterIdx ref with a Firestore-persisted
preFilterFilmId so the memory survives refresh and crosses devices.

The old clear-on-every-else-branch logic is replaced with explicit
clear conditions: successful snap-back, stale saved film, or user is
back home. See docs/superpowers/specs/2026-04-21-filter-side-trip-design.md
for the full behavior table."
```

---

## Task 3: Manual QA on localhost

No unit tests to run. Verify the six scenarios from the spec against a live dev server.

**Files:** None modified.

- [ ] **Step 1: Start the dev server**

Run: `bun dev` (or `npm run dev`)

Expected: Vite dev server on http://localhost:5173 (or whichever port Vite reports). Open it in a browser and sign in to your profile.

- [ ] **Step 2: Scenario 1 — basic side trip**

Pre-condition: journey has no filters active, currentIdx is some non-watchlisted film (call it A). A watchlisted film exists further in the playlist (call it B).

- Apply the watchlist-only smart filter.
- Expected: journey jumps from A to B.
- Remove the watchlist-only filter.
- Expected: journey returns to A.

- [ ] **Step 3: Scenario 2 — refresh persistence**

- Apply the watchlist-only filter from film A (journey jumps to B).
- Hard-refresh the browser (Cmd/Ctrl+Shift+R).
- Expected: profile loads with `preFilterFilmId` set to A's ID. Journey is still at B.
- Remove the watchlist-only filter.
- Expected: journey snaps back to A.

- [ ] **Step 4: Scenario 3 — filter swap preserves origin**

- From film A, apply filter X (say, "watchlist only") → journey jumps to film B.
- Without removing filter X, apply filter Y (say, a decade filter that excludes B) → journey jumps to film C.
- Remove all filters.
- Expected: journey snaps back to A — not B, not C.

- [ ] **Step 5: Scenario 4 — forward nav under filter**

- From film A, apply watchlist-only filter → journey jumps to film B.
- Press "next" 2–3 times, landing on filtered films B+1, B+2, etc.
- Remove the filter.
- Expected: journey snaps back to A — not to the advanced filtered position.

- [ ] **Step 6: Scenario 5 — stale saved film**

- From film A, apply watchlist-only filter → journey jumps to B.
- Manually remove film A from the playlist. Easiest way: open the Firestore console and edit `playlistOrder` to drop A's ID. (If that's inconvenient, skip this scenario — it's an edge case that shouldn't happen in practice.)
- Refresh the app.
- Remove the watchlist-only filter.
- Expected: no crash. `preFilterFilmId` clears in Firestore. Journey stays on whatever eligible film it's currently on.

- [ ] **Step 7: Scenario 6 — cross-device**

- From film A on device 1, apply watchlist-only filter → jump to B. Verify `preFilterFilmId = A.id` in Firestore.
- Open the app on device 2 (second browser window / incognito is fine if properly signed in as the same profile).
- Expected: device 2 loads at B, not A.
- Remove the watchlist-only filter on device 2.
- Expected: device 2 snaps back to A. Within a short window, device 1 also snaps back on its next activeFilters recompute or tab focus.

- [ ] **Step 8: Final sanity pass**

- Clear all filters. Journey at some position P.
- Navigate forward a few films using "next" (no filter).
- Expected: `preFilterFilmId` stays `null` throughout — only filter-induced skips set it.

- [ ] **Step 9: Open PR when all scenarios pass**

Push the branch and open a pull request targeting `master`:

```bash
git push -u origin feat/filter-side-trip
gh pr create --title "Filter side-trip: remember and restore pre-filter position" --body "$(cat <<'EOF'
## Summary
- Removing a journey filter now returns you to the film you were on before applying it, instead of stranding you on the detour
- The saved position survives page refresh and crosses devices (persisted as `preFilterFilmId` on the profile)
- Underlying fix: the old `preFilterIdx` ref was being cleared unconditionally on every else-branch pass — rewritten with explicit clear conditions

## Test plan
- [x] Basic side trip — apply watchlist-only, remove, snaps back
- [x] Refresh persistence — hard refresh under filter, remove filter, still snaps back
- [x] Filter swap — A → B → remove all → back to original
- [x] Forward nav under filter — advance, remove filter, back to original
- [x] Cross-device — apply on device 1, remove on device 2, both snap back
- [x] No regression in unfiltered navigation

Spec: `docs/superpowers/specs/2026-04-21-filter-side-trip-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Do NOT merge the PR without user confirmation.

---

## Self-Review Notes

- Spec coverage: all six spec scenarios are covered in Task 3 steps 2–7. The behavior-table rows (origin-not-null preservation, snap-back, stale clear, home clear) all map to code branches in Task 2 step 1.
- Type consistency: `preFilterFilmId` is a `string | null` throughout — state slot, profile field, sanitized read, all three setters (setState, firebaseSave, setProfile).
- Persistence pattern: every write to `preFilterFilmId` goes through all three (setState + firebaseSave + setProfile merge) to mirror how other Firestore-backed fields stay consistent.
- One deviation from default TDD: this project has no test framework, and the spec explicitly calls for manual QA. Task 3 is a manual-QA checklist instead of unit tests.
