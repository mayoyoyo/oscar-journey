# Multi-Genre Migration Plan

> **Scope:** Migrate the film catalog from single-genre-per-film to primary + secondary genres, with a light taxonomy refresh. Written as a no-code engineering brief — an implementer fills in the actual code per phase, but every decision, file path, and sequencing choice is locked in below so there is no guesswork.

**Goal:** Let films carry multiple genres (e.g. The Great Dictator = War + Comedy + Drama) without breaking existing UI, filters, or editorial choices.

**Approach:** Three-part migration.
1. **Taxonomy refresh** — 13 codes → 14 codes. Unglue the conflations multi-genre makes painful (`Comedy / Light Drama`, `Sci-Fi / Fantasy`, and tighten `Thriller / Suspense` → `Thriller`, `Historical / Period` → `Historical`), close the Horror gap, **remove Animation** as a genre code (it's a medium — already covered by the `ANIM` category and `isAnimated()` attribute filter), and **add Family** as a standalone genre for live-action family films (audit confirms 13 live-action Family films in the catalog that would benefit — E.T., It's a Wonderful Life, The Wizard of Oz, The Sound of Music, The Princess Bride, etc.). Documentary stays out of the genre taxonomy (already handled as an attribute via `DOC_IDS` in `filmAttributes.js`).
2. **Data model** — keep `genre` as **primary** (human-authored, never auto-overwritten). Add optional `altGenres: []` for secondaries, seeded from the existing OMDb audit report.
3. **UI + filter** — render altGenres as secondary pills, change filter predicate to OR-semantics over primary + altGenres.

**Tech Stack:** React 18, Vite, vanilla JS (no TS, no test framework). Verification is browser-based via `npm run dev`.

**Source of truth for prior research:** `.claude/research/genre-population-audit-2026-04-18.md`.

---

## Why "seamless" is achievable here

Each phase ships independently. After **Phase 1**, nothing in the UI or filter behaves differently — `altGenres` exists as unused data. After **Phase 2**, `altGenres` is populated but still unused at runtime. Phases 3 and 4 are the first points where user-visible behavior changes, and each can ship behind a feature check if desired. This means the migration can pause at any phase boundary without shipping a half-done feature.

---

## File Inventory

Files this migration will touch, with their role:

| Path | Role in migration |
|------|-------------------|
| `src/data/movies.js` | Taxonomy definition (`GENRE_LABELS`) + all 787 film records. Primary data-model change lives here. |
| `src/components/Badges.jsx` | `BadgeGenre` / `BadgeGenreSm` / `MovieBadges` — renders genre pills. Needs to render primary + altGenres. |
| `src/components/FilmList.jsx` | Genre filter predicate (line 318), genre counts (line 402–406), filter sidebar (line 718). OR-semantics change + new codes in sidebar. |
| `src/components/SeriesFilmPreview.jsx` | `TMDB_TO_CATALOG_GENRE` (line 286–303) — out-of-catalog TMDB rendering. Needs Fantasy/Horror entries updated for new codes. |
| `src/components/FilmCard.jsx` | Grid/list row. May reference `movie.genre` directly — audit for touchpoints. |
| `src/components/FilmDetailModal.jsx` | Detail view. Currently renders one `BadgeGenreSm`; after migration renders primary + altGenres. |
| `src/utils/filmAttributes.js` | `isAnimated()` currently checks `genre === 'A'`. Extend to include `altGenres.includes('A')` if we keep Animation as a genre-code. |
| `scripts/classify-essential-genres.mjs` | OMDb classification script. Needs new codes in `GENRE_PRIORITY` + ability to emit altGenres. |
| `scripts/genre-classification-report.json` | Existing audit gold — `raw` field per essential film. **Read-only input** to Phase 2 seeding. |
| `scripts/seed-alt-genres.mjs` | **New script.** Reads audit report, computes `altGenres` per essential, produces a review patch. |
| `scripts/audit-bp-genres.mjs` | **New script.** Analogue of `classify-essential-genres.mjs` but targets BP nominees, writes audit-only (no mutation). |

---

## Taxonomy Decisions (locked)

These are the exact changes to `GENRE_LABELS` in `src/data/movies.js:1-16`. No other taxonomy changes in this migration — broader Option 2/3 rewrites are explicitly out of scope.

Final taxonomy after migration is **14 codes**: D, T, H, W, C, S, F, Ho, B, X, R, M, N, I, Fa. (Net +1 from the current 13 — we add F, Ho, and Fa; remove A.)

| Code | Before | After | Rationale |
|------|--------|-------|-----------|
| C | Comedy / Light Drama | **Comedy** | "Light Drama" was a pressure-valve for dramedies. Under multi-genre, dramedies wear `[C, D]` instead. |
| S | Sci-Fi / Fantasy | **Sci-Fi** | Hard sci-fi and high fantasy are different narrative modes; multi-genre lets films like Dune wear both. |
| F | *(new)* | **Fantasy** | Split from S. |
| Ho | *(new)* | **Horror** | Currently Horror → T via classify script. Close the gap. |
| Fa | *(new)* | **Family** | Audit found 13 live-action Family films in the catalog (E.T., It's a Wonderful Life, The Wizard of Oz, Sound of Music, Princess Bride, Hugo, Babe, Fiddler on the Roof, Field of Dreams, Finding Neverland, Sounder, The Black Stallion, Where Is the Friend's House?). Worth a dedicated tag; Family is distinct from Animation. |
| A | Animation / Family | **removed** | Animation is a medium, not a genre. Already covered by `category: 'ANIM'` (for winners) and `isAnimated()` attribute filter in `filmAttributes.js`. Every film currently coded `A` gets its story-genre primary reassigned. |
| T | Thriller / Suspense | **Thriller** | "Suspense" is effectively a synonym of Thriller — drop the slash. |
| H | Historical / Period | **Historical** | "Period" is redundant with Historical for this catalog. |
| X | Crime / Noir | *(unchanged)* | Split deferred to a future migration. |
| N | Action / Adventure | *(unchanged)* | Deferred. |
| I | Indie / Arthouse | *(unchanged)* | Demotion to attribute deferred. |
| D, W, B, R, M | *(unchanged labels)* | — | No change. |

**Documentary:** never was a genre code. Stays an attribute, handled by `isDocumentary()` in `filmAttributes.js` via the hardcoded `DOC_IDS` set. Explicitly called out here so a future implementer doesn't accidentally add it to `GENRE_LABELS`.

**Migration rules for existing films:**
- Every film currently coded `S` needs a one-time editorial pass to decide if its primary stays `S` (Sci-Fi) or switches to `F` (Fantasy). E.g. LOTR → `F`; Arrival → `S`; Pan's Labyrinth → `F`; The Matrix → `S`.
- Every film currently coded `A` needs a **new primary genre** from the remaining taxonomy, based on the story: Toy Story → `C` (Comedy) with altGenre `N` (Adventure); Spirited Away → `F` (Fantasy); Grave of the Fireflies → `W` (War) or `D` (Drama); WALL·E → `S` (Sci-Fi); Ratatouille → `C` (Comedy). The `isAnimated()` attribute filter in `filmAttributes.js` already surfaces these films separately, so losing the `A` genre code does not hide them from the UI.
- Films that were stuffed into `C` purely because "Light Drama" fit are reclassified as `D` with altGenre `C` where appropriate.
- No other current codes lose meaning.

---

## Data Model (locked)

**Before** (every row in `src/data/movies.js`):
> `{ id, title, year, won, genre: 'W', ceremony, category, lists, awards, ... }`

**After:**
> `{ id, title, year, won, genre: 'W', altGenres: ['C', 'D'], ceremony, category, lists, awards, ... }`

Rules:
- `genre` stays **required**, stays a single char. It is the film's **primary** genre — the one editorially chosen, the one used for sorting and for the main pill.
- `altGenres` is **optional**. Default behavior when absent is equivalent to `[]`. Always an array of single-char codes from `GENRE_LABELS`.
- `altGenres` never contains the primary code (dedupe invariant — enforced by seeding script and any future edits).
- `altGenres` is editorial. Scripts propose; humans accept. No automated writes without review patch.

---

## Phase 0 — Prep and alignment

**Goal:** lock decisions before touching code. Output: a two-line checklist committed or pinned where the implementer can see it.

- [ ] **Confirm taxonomy.** The 13 → 15 change above is final for this migration. If the user wants Horror labeled differently (e.g., "Ho" vs "Z"), change the code letter here before anyone writes anything.
- [ ] **Confirm filter semantics.** OR over primary + altGenres — this is the recommendation from the research doc. Lock it; don't revisit mid-phase.
- [ ] **Confirm altGenre cap.** Recommended cap is 2 altGenres (max 3 total pills per film). Implementer honors this cap in the seeding script's truncation logic.
- [ ] **Snapshot current state.** `git status` should be clean before starting. Take a visual snapshot of the Film tab + Journey filter panel with the dev server running (`npm run dev`) so Phase 3/4 parity checks have a baseline.

---

## Phase 1 — Taxonomy + data-model change (invisible)

**Goal:** add the new taxonomy entries and the `altGenres` field to the data model, without any visible behavior change. This phase is pure prep — nothing renders differently yet.

**Risk:** extremely low. `altGenres` is optional; UI still reads `genre`. New codes in `GENRE_LABELS` don't appear in any film until the seeding phase.

### Tasks

- [ ] **Task 1.1 — Update `GENRE_LABELS` in `src/data/movies.js:1-16`.**
    - Change `C` label to `"Comedy"`.
    - Change `S` label to `"Sci-Fi"`.
    - Change `T` label to `"Thriller"` (drop "Suspense" — synonym).
    - Change `H` label to `"Historical"` (drop "Period" — redundant).
    - Add `F: "Fantasy"`.
    - Add `Ho: "Horror"`.
    - Add `Fa: "Family"`.
    - **Remove `A: "Animation / Family"`.**
    - **Verify:** run `npm run dev`, open the app, open Film tab filter sidebar → confirm the genre list shows the new labels, no Animation row, no crashes. Films currently coded `A` will temporarily render with the raw letter `A` as a fallback pill (since `GENRE_LABELS[movie.genre]` misses — see `Badges.jsx:39`). That's expected and resolved in Task 1.3a below.

- [ ] **Task 1.2 — Add `altGenres` field shape to the schema comment.**
    - File: `src/data/movies.js:30-31` (the `// All movies: { title, year, won, genre, ceremony, category }` comment).
    - Update to document `altGenres: string[]` as optional.
    - No rows are modified yet — this is documentation-only.

- [ ] **Task 1.3 — Reclassify existing `S` rows.**
    - Grep for `genre: 'S'` in `src/data/movies.js`. Expect ~30–50 hits.
    - For each: decide if the film is primarily sci-fi or primarily fantasy. LOTR → `F`. Arrival → `S`. Pan's Labyrinth → `F`. The Matrix → `S`.
    - This is an **editorial pass**, not automation. Implementer should present the list to the user for a one-shot review rather than guessing.
    - **Verify:** sidebar counts for S and F both non-zero and look right (Sci-Fi heavier than Fantasy in a Best-Picture-weighted catalog is expected).

- [ ] **Task 1.3a — Reclassify existing `A` rows (Animation removal).**
    - Grep for `genre: 'A'` in `src/data/movies.js`. Cross-reference with `essential-genre-audit.txt` section "A — Animation / Family" (16 essentials) plus any BP-nominee animated films.
    - Each film needs a **new primary** drawn from the remaining taxonomy, reflecting what the film is *about*, not how it's made.
    - Suggested starting point for the editorial pass (user confirms or overrides):
        - Adventure/comedy animated (Toy Story, Finding Nemo, Up, Paddington-adjacent) → `C` (Comedy) primary, with altGenre `N` (Adventure) where fitting.
        - Fantasy-driven (Spirited Away, Princess Mononoke, Howl's Moving Castle, The Iron Giant when read as fable) → `F` (Fantasy).
        - Sci-fi-driven (WALL·E, The Iron Giant when read as sci-fi) → `S` (Sci-Fi).
        - War/historical weight (Grave of the Fireflies) → `W` (War) or `D` (Drama).
        - Musicals (The Lion King if counted as one, Frozen-adjacent) → `M` (Musical).
    - Implementer presents the full list to the user before applying — same pattern as Task 1.3.
    - **Verify:** no film in `movies.js` has `genre: 'A'` after this task. `isAnimated()` in `filmAttributes.js` still returns true for the same films because the `category: 'ANIM'` check and the `alsoWon.includes('ANIM')` check cover them; the third check (`genre === 'A'`) becomes a no-op. Confirm in browser: Animated attribute filter still surfaces the right films.

- [ ] **Task 1.4 — Commit.**
    - Message: `taxonomy: split Sci-Fi/Fantasy, drop "Light Drama" from Comedy, add Horror code, remove Animation genre`
    - After this commit, nothing in the UI looks different except sidebar labels + the new empty `Ho` row (hidden by `FilmList.jsx:412` since count is zero) + no Animation row (since `A` is no longer in `GENRE_LABELS`).

**Checkpoint:** run the app. Everything should look identical to the pre-migration baseline except sidebar labels read "Comedy" and "Sci-Fi" instead of "Comedy / Light Drama" and "Sci-Fi / Fantasy." If anything else changed, stop and investigate.

---

## Phase 2 — Seed altGenres from the audit

**Goal:** populate `altGenres` for as many films as possible using the data already on disk, plus a one-shot OMDb pull for BP nominees. No UI changes yet.

**Risk:** low. Output is a mechanical patch; the human reviews before merging.

### Tasks

- [ ] **Task 2.1 — Write `scripts/seed-alt-genres.mjs`** (new file).
    - Reads `scripts/genre-classification-report.json`.
    - For each entry with a non-empty `raw`: tokenize on `", "`, map each token through the same `GENRE_PRIORITY`-style lookup used by `classify-essential-genres.mjs:24-43` (but **expanded** to emit `F` for Fantasy and `Ho` for Horror), dedupe, remove the primary code, truncate to the altGenre cap (default 2).
    - Does **not** write to `movies.js`. Instead, writes a proposed-changes file: `scripts/alt-genres-proposed.json` with shape `[{id, title, currentPrimary, proposedAltGenres, rawOmdb}]`.
    - **Verify:** spot-check 10 films in the output. The Great Dictator should land with `altGenres: ['C', 'D']` (or `['C']` if cap is 1). Casablanca should land with `['D', 'R']`. If either looks wrong, fix the mapping logic before proceeding.

- [ ] **Task 2.2 — Human review pass.**
    - User opens `scripts/alt-genres-proposed.json`, scans for obvious misses (e.g., "Singin' in the Rain" should end up with Musical as **primary** — if primary + altGenres combined doesn't include the user's ideal label set, flag for correction).
    - Corrections get made directly in `movies.js` after apply, not by modifying the script.

- [ ] **Task 2.3 — Apply the proposal.**
    - Either extend `seed-alt-genres.mjs` with an `--apply` flag that rewrites `movies.js` in place (pattern already exists in `classify-essential-genres.mjs:122-139`), or do the edits manually if the proposal is small enough.
    - Apply only to ESSENTIAL films in this task — BP nominees are handled separately in Task 2.5.
    - **Verify:** grep `altGenres: \[` in `movies.js` — count should match the number of essentials with non-empty proposed altGenres.

- [ ] **Task 2.4 — Commit the essentials seed.**
    - Message: `catalog: seed altGenres for essentials from existing OMDb audit`.

- [ ] **Task 2.5 — Write `scripts/audit-bp-genres.mjs`** (new file).
    - Clone of `classify-essential-genres.mjs` but targets `category === 'BP'` and does **not** mutate `movies.js` — output only.
    - Writes `scripts/bp-genres-proposed.json` in the same shape as `alt-genres-proposed.json`.
    - Uses the same expanded genre mapping (includes Fantasy and Horror).
    - OMDb rate-limiting: reuse the key pool at `classify-essential-genres.mjs:19`.
    - **Verify:** ~450 rows in output. Spot-check against films where the user already suspects misclassification.

- [ ] **Task 2.6 — Human review pass for BP nominees.**
    - Same process as Task 2.2. This is the more editorially sensitive pass — BP genre codes were hand-picked, so the question is only "what secondaries to add," never "what primary to change."

- [ ] **Task 2.7 — Apply BP altGenres.**
    - Same pattern as Task 2.3 but for BP rows.
    - **Verify:** The Great Dictator now has `altGenres: ['C', 'D']` (or whatever human review settled on). Visually confirm in `movies.js:614` area.

- [ ] **Task 2.8 — Commit the BP seed.**
    - Message: `catalog: seed altGenres for Best Picture nominees from OMDb audit`.

**Checkpoint:** app still looks unchanged. `altGenres` is populated but no component reads it. Primary `genre` is untouched. Single-genre UI still works identically.

---

## Phase 3 — UI renders altGenres

**Goal:** visible change #1. Detail modal, A-Z row, and any grid card that shows genre now renders primary + altGenres pills.

**Risk:** medium. Visual regression surface. Verification is manual/visual, so take screenshots liberally.

### Tasks

- [ ] **Task 3.1 — Design the secondary pill treatment.**
    - Options to pick from (the user should choose before implementation touches CSS):
      1. **Same pill style, different opacity** (primary 100%, secondary 70%) — lightest visual change.
      2. **Primary filled, secondaries outlined** — clearest hierarchy but two new CSS classes.
      3. **No distinction** — all pills identical. Simplest; loses primary hierarchy.
    - Default if user has no preference: **Option 1**.
    - Lock the choice before Task 3.2.

- [ ] **Task 3.2 — Extend `Badges.jsx` to accept a film.**
    - Current `BadgeGenre({ genre })` and `BadgeGenreSm({ genre })` (`Badges.jsx:38-40, 63-65`) take a single code.
    - Add a new component (`BadgeGenreRow` or extend `MovieBadges` directly) that accepts the full movie and renders one primary pill + zero-or-more altGenre pills.
    - Do **not** delete the old single-code components — they are used by `SeriesFilmPreview.jsx` for TMDB films and may have other callers. Leave them alone; add alongside.
    - **Verify:** storybook-style — temporarily add a test row in `FilmDetailModal.jsx` hardcoding altGenres `['C', 'D']` on one film to confirm layout before touching real data.

- [ ] **Task 3.3 — Swap the detail modal to render the multi-pill row.**
    - File: `src/components/FilmDetailModal.jsx`.
    - Find the existing `<BadgeGenreSm genre={movie.genre} />` usage (there is exactly one near the title row — grep for it).
    - Replace with the new multi-pill component passing the full movie.
    - **Verify in browser:** open The Great Dictator detail → should show `War`, `Comedy`, `Drama` pills. Open a film with no altGenres → should show exactly one pill, identical to pre-migration.

- [ ] **Task 3.4 — Swap the A-Z row (`FilmCard.jsx`) to render multi-pill.**
    - Same approach. Watch for horizontal overflow; the A-Z row is tight (`Badges.jsx:97-105`).
    - If overflow is a problem, cap rendered altGenres to 1 on the A-Z row (the cap was already applied to stored data in Task 2.1, but the row can render even fewer). Keep the full list on the detail modal.
    - **Verify in browser:** A-Z list with a film like Casablanca — pills should fit inline alongside language pill, tier pips, and Oscar icons. No line wrap.

- [ ] **Task 3.5 — Update `MovieBadges` wrapper (`Badges.jsx:88-127`).**
    - The `small` vs full branches should both route through the new multi-pill component.
    - Preserve `excludeGenre` prop behavior.

- [ ] **Task 3.6 — Commit.**
    - Message: `ui: render primary + altGenres as multi-pill row`.

**Checkpoint:** visual regression check. Open 10 films at random — each should render correctly. Specifically check: films with 0 altGenres (same as before), films with 1 altGenre, films with 2 altGenres (the cap). Compare to the Phase 0 baseline screenshots.

---

## Phase 4 — Filter uses altGenres (OR-semantics)

**Goal:** visible change #2. The genre filter sidebar now matches films on primary **or** any altGenre.

**Risk:** medium — touching `FilmList.jsx` filter logic, which is wired to Journey and Film tab both. Keep changes surgical.

### Tasks

- [ ] **Task 4.1 — Change the filter predicate.**
    - File: `src/components/FilmList.jsx:318` — currently `.filter(m => filters.genres[m.genre] !== false)`.
    - New logic: a film passes if the primary is checked **or** any altGenre is checked. Mathematically: `allGenres = [m.genre, ...(m.altGenres || [])]; pass = allGenres.some(g => filters.genres[g] !== false)`.
    - **Wait — semantic subtlety:** the current predicate defaults to true (`!== false`) so unchecked-is-checked. The array form must preserve that: a film with altGenres ['C','D'] should only be hidden when **every** bucket it touches (W, C, D in the Great-Dictator case) is unchecked. Double-check the boolean algebra matches the sidebar's mental model before committing.
    - **Verify in browser:** uncheck War only → Great Dictator still visible (Comedy/Drama buckets still checked). Uncheck War + Comedy + Drama → Great Dictator hidden. Check no other checkbox combinations produce surprising results on 3–4 sample films.

- [ ] **Task 4.2 — Update genre counts.**
    - File: `src/components/FilmList.jsx:402-406` — currently increments `c[m.genre]`.
    - New logic: increment for primary **and** each altGenre. This inflates the sum vs film count, but it's honest ("films tagged Comedy" ≥ "films whose primary is Comedy").
    - **Alternative the user may prefer:** count primary only, not altGenres. This keeps the sidebar counts equal to film count. Pick one before implementing — default recommendation is increment-all-tags (reflects the multi-label reality).
    - **Verify:** Comedy count goes up after migration (dramedies now count toward Comedy too). War count stays approximately stable (altGenres rarely promote a film *into* War). Scan for a count that looks obviously wrong.

- [ ] **Task 4.3 — Re-verify the Journey filter still works.**
    - `FilmList.jsx` is shared between Film tab and Journey per the recent commit history (`be5858f fix: category filter is additive + shared between Film tab and Journey`). Confirm the Journey flow still filters correctly with the new predicate.
    - **Verify in browser:** switch to Journey tab, apply a genre filter, confirm behavior matches Film tab.

- [ ] **Task 4.4 — Commit.**
    - Message: `filter: OR-semantics over primary + altGenres`.

**Checkpoint:** this is the last user-visible change. Do a 10-minute walkthrough: Film tab + Journey, several genre combinations, several films with and without altGenres. Screenshot compare against Phase 0 baseline to document the intentional diffs.

---

## Phase 5 — Future-proofing + cleanup

**Goal:** leave the repo in a state where future genre operations are multi-genre-aware by default.

**Risk:** very low. Touch-ups only.

### Tasks

- [ ] **Task 5.1 — Update `classify-essential-genres.mjs` to emit altGenres.**
    - File: `scripts/classify-essential-genres.mjs:24-43` (the `GENRE_PRIORITY`).
    - Add entries for `Fantasy → F`, `Horror → Ho`, `Family → Fa`.
    - **Remove the `['Animation', 'A']` entry** — Animation is no longer a genre code. Films classified by the script that come back from OMDb as "Animation, ..." should fall through to the next genre in the string (e.g. "Animation, Adventure, Comedy" → N or C primary), and the Animated attribute filter already surfaces them separately.
    - Extend `pickGenreCode()` (line 45–52) to optionally return `{ primary, altGenres }` instead of a single code — controlled by a flag so existing behavior is preserved.
    - Any future re-run of the classify script will now propose altGenres, not just a primary, will never propose `A` as a primary, and will propose `Fa` for live-action Family films.

- [ ] **Task 5.2 — Update `TMDB_TO_CATALOG_GENRE` mapping.**
    - File: `src/components/SeriesFilmPreview.jsx:286-303`.
    - Change `'Fantasy': 'Sci-Fi / Fantasy'` → `'Fantasy': 'Fantasy'`.
    - Change `'Science Fiction': 'Sci-Fi / Fantasy'` → `'Science Fiction': 'Sci-Fi'`.
    - Add `'Horror': 'Horror'`.
    - Change `'Family': 'Animation / Family'` → `'Family': 'Family'` (Family is now a standalone catalog genre).
    - **Remove `'Animation': 'Animation / Family'`** — Animation has no catalog equivalent anymore. Simplest immediate behavior: drop the mapping entry so TMDB "Animation" tokens render as a raw pill or get filtered out by a skip-list — pick one based on the user's preference (Open Decision #6).
    - This component renders out-of-catalog TMDB films as pills; keeping the mapping honest means sequels of split-genre films don't collide into the old combined label.
    - **Verify in browser:** open a film with TMDB series data (e.g. a Star Wars or LOTR sequel) and confirm the pills read correctly. For animated series (if any appear in the series list), confirm they don't render a broken "Animation / Family" pill.

- [ ] **Task 5.3 — Clean up `isAnimated()` in `filmAttributes.js`.**
    - Current check is a three-way OR: `category === 'ANIM'` OR `alsoWon.includes('ANIM')` OR `genre === 'A'`.
    - The `genre === 'A'` branch is now dead (no film has `genre: 'A'` after Task 1.3a). Leaving it is harmless but misleading.
    - Decision: **remove** the dead branch so the function's condition matches the new data reality.
    - Not strictly required for the migration to ship, but it's a 1-line cleanup that pairs naturally with Phase 5. Leave a one-line comment if the implementer wants to document why `A` is no longer checked.

- [ ] **Task 5.4 — Delete or archive obsolete scripts.**
    - `scripts/seed-alt-genres.mjs` and `scripts/audit-bp-genres.mjs` are one-shot tools. Decide whether to keep them in-tree (for future catalog additions) or move to `scripts/archive/`. Default: keep in-tree, they're small and useful.

- [ ] **Task 5.5 — Update `CHANGELOG.md`** with a migration note.
    - One or two lines. The user's changelog style is terse — match it.

- [ ] **Task 5.6 — Final commit.**
    - Message: `scripts: multi-genre-aware classify pipeline + TMDB mapping refresh`.

---

## Rollback Strategy

Each phase is a clean rollback boundary:

- **Rollback after Phase 1:** `git revert` the taxonomy commit. Nothing references `F` or `Ho` yet. `S`→`F` reclassifications are the only manual work that would need redoing.
- **Rollback after Phase 2:** revert the two seed commits. `altGenres` fields disappear; UI still reads primary only, so no regression.
- **Rollback after Phase 3:** revert the UI commit. Pills go back to single. Data stays.
- **Rollback after Phase 4:** revert the filter commit. Filter goes back to single-genre matching. Pills stay multi (minor inconsistency but not broken).
- **Rollback after Phase 5:** cleanup only. Safe to revert anytime.

No phase requires a database migration, a schema version bump, or any coordination with other systems. `movies.js` is plain JS; git is the migration tool.

---

## Open Decisions Before Starting

The implementer should not start Phase 1 until the user has signed off on each of these:

1. **altGenre cap.** Default 2 (max 3 pills total per film). Lock before Task 2.1.
2. **Secondary pill styling.** Default Option 1 (same style, reduced opacity). Lock before Task 3.1.
3. **Genre count inflation.** Default: yes, altGenres increment their buckets. Lock before Task 4.2.
4. **Horror code letter.** Proposed `Ho` (since `H` is taken by Historical). If the user prefers a different single char, lock before Phase 1.
5. **`A` → new primary mapping for currently-animated films.** Editorial pass — user should eyeball the list in Task 1.3a before anyone rewrites `movies.js` rows.
6. **TMDB animation pill behavior.** When TMDB returns "Animation" on a series member, Task 5.2 either drops the mapping (raw "Animation" pill) or adds a skip-list entry (no pill at all). Lock before Task 5.2.
7. ~~**Add `Fa: "Family"` as a standalone genre?**~~ **Resolved.** Audit confirmed 13 live-action Family films (Family without Animation). Taxonomy includes `Fa: "Family"` as decision is locked.

---

## Self-Review Notes

- **Spec coverage:** research doc identifies (1) taxonomy change, (2) data model change, (3) audit/seed path, (4) UI render, (5) filter semantics, (6) TMDB mapping refresh, (7) classify-script future-proofing. All seven appear as tasks above.
- **No placeholders:** every task names exact files, exact line numbers where known, and the concrete behavior to verify. Code blocks are intentionally omitted per the user's no-code constraint — the implementer fills in the actual JS at implementation time, guided by these instructions.
- **Naming consistency:** `altGenres` is used throughout. Never `alt_genres`, `altGenre`, or `genres2`.
- **Type consistency:** `altGenres` is always `string[]` (array of single-char codes from `GENRE_LABELS`). Never an array of labels, never objects.
- **Editorial invariant:** primary `genre` is never auto-overwritten. This is stated in the Data Model section and reinforced in Tasks 2.3, 2.5, and 2.7.
