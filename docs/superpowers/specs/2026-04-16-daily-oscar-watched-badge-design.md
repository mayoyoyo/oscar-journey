# Daily Oscar — "Watched" Badge

## Goal
Show a subtle indicator on the Daily Oscar modal when the daily mystery movie is one the user has already watched.

## Behavior
- If the daily movie's `id` is in `profile.watched`, render a small green "✓ Watched" pill on the poster.
- If not watched (or `profile` is null / logged out), render nothing.
- Visible from the start of the puzzle and remains after solve/fail.
- Applies in both daily mode and random/practice mode (uses the live `movie.id`).

## UX Trade-off (already accepted)
Showing the badge from the start gives a meaningful hint — knowing it's in your watched list reduces the candidate pool. User chose this over a post-reveal-only indicator.

## Implementation
**`src/components/DailyOscar.jsx`**
- Compute `watched = profile?.watched?.includes(movieId)` near the other derived values.
- Inside `.daily-poster-wrap`, after the `<img>`, conditionally render `<div className="daily-watched-badge">✓ Watched</div>`.

**`src/App.css`**
- Add `.daily-watched-badge` rule: absolute top-right of the poster wrap, green pill, white text, ~0.7rem, rounded, subtle shadow, `z-index` above the poster.

## Test Plan (local)
1. `bun run dev` from `C:\Users\Chris\oscar-journey\`.
2. Log in with a profile that has `watched` entries.
3. Open Daily Oscar:
   - If today's movie is watched → green "✓ Watched" pill on the poster.
   - If not watched → no pill.
4. Click randomize until both states are observed.
5. Solve / fail the puzzle → pill remains, doesn't conflict with the title overlay.
6. Log out → no pill renders.

## Out of scope
- "Mark as watched" quick-action button (deferred).
- Persisting badge preference / hide toggle.
- Stats showing how many daily oscars you'd already seen.
