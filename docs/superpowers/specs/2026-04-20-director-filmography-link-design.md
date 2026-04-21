# Director Filmography Link — Design

**Date:** 2026-04-20
**Branch:** `feat/director-filmography-link`
**Status:** Draft, pending implementation

## Goal

Surface a director's other catalog films from the spot where their name already appears. On the Journey-mode film card and the film detail modal, the "Directed by …" line gains a small trailing `(N more)` link when the director has at least one other film in the catalog. Clicking the link opens a modal listing the director's full catalog filmography — mirroring the affordance the "Nth Academy Awards" ceremony line already provides for same-year Oscar context.

## Non-goals

- **Out-of-catalog surfaces.** `SeriesFilmPreview` renders TMDB films not present in `MOVIES`; their director strings aren't guaranteed to match curated `directors.json` entries. The feature only renders on the two in-catalog surfaces (Journey card, film detail modal).
- **OMDb fallback matching.** `directors.json` is the single source of truth. The audit confirmed 100% catalog coverage (787/787 films), so this isn't a gap in practice.
- **Per-director breakdown in the modal** for co-directed films. The modal presents a single flat list (union of all credited directors' filmographies); it does not split into "More by Joel Coen / More by Ethan Coen" sections.

## Data source & coverage

`src/data/directors.json` maps `movieId → directorString`. The string is either a single name (`"Stanley Kubrick"`) or comma-separated co-directors (`"Joel Coen, Ethan Coen"`, `"Daniel Kwan, Daniel Scheinert"`, `"Chris Buck, Jennifer Lee"`).

Audit (2026-04-20, 787-film catalog):

- 491 unique director names total.
- **169 directors with ≥2 catalog films** → drive the link.
- 322 directors with a single film → no link rendered on those films.
- **507 / 787 films (64%)** will show the `(N more)` link.
- Top filmographies: Spielberg (15), Scorsese (12), Bergman (9), Kubrick / Kurosawa / Hitchcock (8), Nolan (7), Eastwood / J. Coen / E. Coen / Cameron / B. Wilder (6).

### Co-director semantics (union matching)

For a film credited `"Joel Coen, Ethan Coen"`, the filmography is the **union** of every catalog film crediting Joel Coen *or* Ethan Coen. Data is normalized by splitting on `,` and trimming; the Coen data intentionally contains both orderings (`"Joel Coen, Ethan Coen"` on some films and `"Ethan Coen, Joel Coen"` on others), and the reverse index collapses those correctly because the keys are individual names, not the raw string.

## Architecture

Three new units, two wiring changes.

### 1. `src/utils/directorIndex.js` (new)

Pure data module. Builds a module-scoped `Map<directorName, Set<movieId>>` once at module load by iterating `MOVIES` and splitting each `DIRECTORS[movieId]` on `,`. Exposes:

```js
// Returns null when no filmography link should be shown (film has no
// directors.json entry, or is the only catalog film by its director[s]).
// Otherwise:
//   directorsDisplay: "Stanley Kubrick" | "Joel Coen or Ethan Coen"
//   films: Movie[] — union, chronological (oldest → newest), INCLUDES
//                    the current film so the modal can mark it as current.
//   otherCount: films.length - 1 — what the "(N more)" label prints.
getDirectorFilmography(movieId) -> {
  directorsDisplay: string,
  films: Movie[],
  otherCount: number,
} | null
```

Chronological sort is by `year` ascending, ties broken by `title` ascending. The index build is single-pass over 787 films; cost is negligible.

### 2. `src/components/DirectorFilmographyLink.jsx` (new)

Self-contained inline link + portal modal. Pattern mirrors `CeremonyTooltip.jsx` (controlled `showModal`, `createPortal` into `document.body`, backdrop-click close, ✕ close button, `e.stopPropagation` on the inner modal).

**Props:**
- `movie` — the current film.
- `onOpenDetail(movie)` — called when the user clicks a row in the modal; the component closes the modal immediately before invoking the callback.

**Render behavior:**
- Calls `getDirectorFilmography(movie.id)`. If `null`, renders `null` (so callers can mount it unconditionally right after the director name).
- Inline: `<span className="director-more-link" onClick={…}>({otherCount} more)</span>`.
- Modal (portal):
  - Header: `<h2>More by {directorsDisplay}</h2>` → `"More by Stanley Kubrick"` or `"More by Joel Coen or Ethan Coen"`.
  - List: each `film` as a row.
    - Current film row: `className="ceremony-modal-film is-current"`, **no** click handler.
    - Other rows: `className="ceremony-modal-film"`, click → `setShowModal(false); onOpenDetail(m);`.
    - Row content: title · year · `<TierPips movie={m} variant="compact" />`.

### 3. Wiring

Both call sites mount the component immediately after the existing "Directed by …" text. No changes to the director line itself.

**`src/components/FilmCard.jsx:252-258`** — Journey mode preview card. Wire `onOpenDetail={onOpenDetail}` (the prop already exists in this scope — it's how the card opens any film's detail).

**`src/components/FilmDetailModal.jsx:311-318`** — Film detail modal. Wire `onOpenDetail={onNavigate}` (this is the same callback `CeremonyTooltip` and `SeriesSection` use to swap the detail modal to another film).

### 4. Styling (`src/App.css`)

One new rule: `.director-more-link` matches the existing "click-for-more" look used by `.ceremony-line-clickable` — dimmer than body text, pointer cursor, hover underline. The modal shell and rows reuse `.ceremony-modal-*` classes verbatim (including `.ceremony-modal-film.is-current` for the dimmed-current styling), so no new modal CSS is required.

## Data flow

```
FilmCard / FilmDetailModal
  └─ "Directed by <name>" <DirectorFilmographyLink movie={movie} onOpenDetail={…} />
       └─ getDirectorFilmography(movie.id)   [src/utils/directorIndex.js]
            └─ reads DIRECTORS + MOVIES, returns { directorsDisplay, films, otherCount }
       └─ on click: <Portal><Modal>
            └─ rows call onOpenDetail(m) → closes this modal, opens that film's detail
```

## Edge cases

- **No directors.json entry.** Audit confirmed 0 such films. `getDirectorFilmography` still returns `null` defensively.
- **Director has only this one catalog film.** `films.length === 1` → returns `null` → no link rendered. 280 films (787 − 507) land here.
- **Click on the current-film row.** No-op — the `is-current` row has no click handler. Prevents the re-open-self glitch.
- **Key collisions in the `<Map>`.** Names are exact-match after trim; the data is hand-curated. If a future edit introduces a typo variant (`"Joel Coen "` vs `"Joel Coen"`), trimming handles it; genuinely different spellings would just split the filmography, which is acceptable degradation.

## Test plan

Manual verification on the branch:

1. **Single-director case.** Open *The Shining* → expect `(7 more)` next to "Directed by Stanley Kubrick". Click → modal titled "More by Stanley Kubrick", 8 films chronological, *The Shining* marked `is-current` and non-clickable.
2. **Co-director case.** Open *Fargo* → expect a `(N more)` next to "Directed by Joel Coen, Ethan Coen" with N equal to the union of both Coens' catalog films minus *Fargo*. Click → modal titled "More by Joel Coen or Ethan Coen", listing every film crediting either Coen.
3. **Single-film director.** Open any catalog film whose director has exactly one credit in `directors.json` → no parenthesis rendered.
4. **Journey card parity.** Same three cases open the same modal when the link is clicked from the Journey mode preview card.
5. **Row navigation.** Click a non-current row → modal closes, film detail swaps to the clicked film. The new film's own Directed-by line shows its own `(N more)` link, chained navigation works.
