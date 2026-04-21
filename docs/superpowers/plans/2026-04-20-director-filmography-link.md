# Director Filmography Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable `(N more)` affordance to the "Directed by …" line on the Journey-mode film card and the film detail modal, opening a modal that lists the director's full catalog filmography (current film included, marked as current).

**Architecture:** One new pure-data util (`directorIndex.js`) builds a reverse index over `DIRECTORS` + `MOVIES` once at module load. One new React component (`DirectorFilmographyLink.jsx`) renders an inline span that, on click, mounts a portal modal mirroring the existing `CeremonyTooltip` pattern (backdrop-dismiss, `✕` close, rows call back to the caller's `onOpenDetail` to swap content). Two call sites (`FilmCard.jsx`, `FilmDetailModal.jsx`) add the component after their existing director line. CSS reuses `.ceremony-modal-*` classes; one new rule for the inline link.

**Tech Stack:** React 18, Vite, plain CSS (no CSS modules), vanilla JS utility (no TypeScript). No test framework in the project — verification is via `npm run dev` in a browser.

**Spec:** `docs/superpowers/specs/2026-04-20-director-filmography-link-design.md`

---

### Task 1: Reverse index utility

**Files:**
- Create: `src/utils/directorIndex.js`

- [ ] **Step 1: Create the utility module**

Create `src/utils/directorIndex.js` with this exact content:

```js
import DIRECTORS from '../data/directors.json';
import { MOVIES } from '../data/movies';

// Reverse index: director name → Set<movieId>.
//
// Built once at module load. Each movie's directors.json entry is split
// on comma, trimmed, and each resulting name indexed separately — so
// co-directed films like "Joel Coen, Ethan Coen" surface under BOTH
// "Joel Coen" and "Ethan Coen". Union semantics at lookup time fall
// out naturally: "films crediting any of these names."
const NAME_TO_IDS = (() => {
  const idx = new Map();
  for (const m of MOVIES) {
    const raw = DIRECTORS[m.id];
    if (!raw) continue;
    const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
    for (const name of names) {
      if (!idx.has(name)) idx.set(name, new Set());
      idx.get(name).add(m.id);
    }
  }
  return idx;
})();

// Movies indexed by id for O(1) lookup when materializing the filmography.
const MOVIES_BY_ID = new Map(MOVIES.map((m) => [m.id, m]));

// Format a directors display string for modal titles.
//   1 name:       "Stanley Kubrick"
//   2 names:      "Joel Coen or Ethan Coen"
//   3+ names:     "A, B or C"   (Oxford-less)
function joinWithOr(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

// Public API — returns null when no filmography link should be rendered.
// Otherwise returns { directorsDisplay, films, otherCount }.
//   films: catalog movies crediting any of the movie's directors, sorted
//          chronologically (year asc, title asc), INCLUDING the current
//          movie so the modal can mark its row as current.
//   otherCount: films.length - 1 — what the "(N more)" label prints.
export function getDirectorFilmography(movieId) {
  const raw = DIRECTORS[movieId];
  if (!raw) return null;
  const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) return null;

  const union = new Set();
  for (const name of names) {
    const ids = NAME_TO_IDS.get(name);
    if (!ids) continue;
    for (const id of ids) union.add(id);
  }

  if (union.size <= 1) return null;

  const films = [...union]
    .map((id) => MOVIES_BY_ID.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const y = (a.year ?? 0) - (b.year ?? 0);
      if (y !== 0) return y;
      return String(a.title).localeCompare(String(b.title));
    });

  return {
    directorsDisplay: joinWithOr(names),
    films,
    otherCount: films.length - 1,
  };
}
```

- [ ] **Step 2: Verify the module parses and returns sane data**

Run a one-off node probe from the project root:

```bash
node -e "
import('./src/utils/directorIndex.js').then(({ getDirectorFilmography }) => {
  console.log('Kubrick probe (the-shining-1980):');
  console.log(getDirectorFilmography('the-shining-1980'));
  console.log('');
  console.log('Coen probe (fargo-1996):');
  const r = getDirectorFilmography('fargo-1996');
  console.log({ directorsDisplay: r.directorsDisplay, otherCount: r.otherCount, count: r.films.length });
  console.log('First 3 films:', r.films.slice(0, 3).map(m => m.id));
  console.log('');
  console.log('Single-film director probe (should be null):');
  console.log(getDirectorFilmography('a-touch-of-class-1973'));
});
"
```

Expected output: Kubrick probe shows a `films` array of length 8 (*The Shining* included), `otherCount: 7`, `directorsDisplay: "Stanley Kubrick"`. Coen probe shows `directorsDisplay: "Joel Coen or Ethan Coen"` and a count ≥ 8 (union of Joel + Ethan credits). The *Touch of Class* probe prints `null` (Melvin Frank has no other catalog credit). If any probe throws or returns differently, stop and debug — the component depends on this shape.

- [ ] **Step 3: Commit**

```bash
git add src/utils/directorIndex.js
git commit -m "feat: add director reverse-index utility

Builds a Map<name, Set<movieId>> over directors.json at module load.
Public getDirectorFilmography(id) returns the union-of-directors
filmography chronologically, or null when the link shouldn't render.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `DirectorFilmographyLink` component

**Files:**
- Create: `src/components/DirectorFilmographyLink.jsx`

- [ ] **Step 1: Create the component file**

Create `src/components/DirectorFilmographyLink.jsx` with this exact content:

```jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getDirectorFilmography } from '../utils/directorIndex';
import TierPips from './TierPips';

// Inline "(N more)" link + modal listing a director's full catalog
// filmography. Mounts null when the current film's director has no other
// catalog credit — callers can include it unconditionally after the
// "Directed by" line.
//
// Pattern mirrors CeremonyTooltip: controlled showModal state, portal
// into document.body, backdrop/✕ close, row click closes this modal
// and hands the clicked film to onOpenDetail for the caller to render.
export default function DirectorFilmographyLink({ movie, onOpenDetail }) {
  const [showModal, setShowModal] = useState(false);

  const filmography = movie ? getDirectorFilmography(movie.id) : null;
  if (!filmography) return null;

  const { directorsDisplay, films, otherCount } = filmography;

  return (
    <>
      <span
        className="director-more-link"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        ({otherCount} more)
      </span>

      {showModal && createPortal(
        <div
          className="modal-overlay open"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="modal ceremony-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="film-detail-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
              }}
              aria-label="Close"
            >✕</button>
            <h2 className="ceremony-modal-title">More by {directorsDisplay}</h2>

            <div className="ceremony-modal-section">
              {films.map((m) => {
                const isCurrent = m.id === movie.id;
                const className = `ceremony-modal-film${isCurrent ? ' is-current' : ''}`;
                const content = (
                  <>
                    <span className="ceremony-modal-film-title">{m.title}</span>
                    <span className="ceremony-modal-film-year">{m.year}</span>
                    <TierPips movie={m} variant="compact" />
                  </>
                );
                if (isCurrent) {
                  return (
                    <div key={m.id} className={className}>
                      {content}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className={className}
                    onClick={() => {
                      setShowModal(false);
                      if (onOpenDetail) onOpenDetail(m);
                    }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DirectorFilmographyLink.jsx
git commit -m "feat: add DirectorFilmographyLink component

Inline '(N more)' link + portal modal listing a director's full catalog
filmography chronologically. Current film row is marked is-current and
non-clickable; other rows close this modal and call onOpenDetail to
swap the surrounding film detail.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: CSS for the inline link

**Files:**
- Modify: `src/App.css` — append new rule.

- [ ] **Step 1: Append the rule to App.css**

Append this block at the end of `src/App.css` (after the final existing rule):

```css
/* Director filmography link — subtle trailing "(N more)" affordance on
   the "Directed by" line, following the same "click-for-more" pattern
   as .ceremony-line-clickable. Slightly dimmer than the surrounding
   director text until hover; then gold + underline to match. */
.director-more-link {
  margin-left: 6px;
  color: var(--cream-dim);
  opacity: 0.75;
  font-size: 0.92em;
  cursor: pointer;
  transition: color 0.15s, opacity 0.15s;
}
.director-more-link:hover {
  color: var(--gold);
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "style: director-more-link styling

Dim trailing link by default, gold + underline on hover — mirrors the
existing ceremony-line-clickable affordance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Wire into `FilmDetailModal.jsx`

**Files:**
- Modify: `src/components/FilmDetailModal.jsx:311-318`

- [ ] **Step 1: Add the import**

In `src/components/FilmDetailModal.jsx`, add this import alongside the existing component imports (after line 19's `import SeriesSection from './SeriesSection';`):

```jsx
import DirectorFilmographyLink from './DirectorFilmographyLink';
```

- [ ] **Step 2: Mount the link after the director name**

Replace the existing director block (lines 311-318):

```jsx
            {(() => {
              // Static directors.json is the primary source (hand-curated to
              // trim over-credited committees like Bambi, OMDb is the
              // fallback for anything missing from the bake).
              const director = DIRECTORS[movie.id] || omdbData?.director;
              if (!director) return null;
              return <div className="film-detail-director"><strong>Directed by</strong> {director}</div>;
            })()}
```

with:

```jsx
            {(() => {
              // Static directors.json is the primary source (hand-curated to
              // trim over-credited committees like Bambi, OMDb is the
              // fallback for anything missing from the bake).
              const director = DIRECTORS[movie.id] || omdbData?.director;
              if (!director) return null;
              return (
                <div className="film-detail-director">
                  <strong>Directed by</strong> {director}
                  <DirectorFilmographyLink movie={movie} onOpenDetail={onNavigate} />
                </div>
              );
            })()}
```

`onNavigate` is the existing prop on `FilmDetailModal` used to swap the modal to another film (the ceremony modal uses it the same way) — no new props required.

- [ ] **Step 3: Verify by manual browser check**

Start the dev server (`npm run dev`) and open a film detail modal for a multi-film director (e.g. any Kubrick, Spielberg, or Coen catalog film). Confirm:
- "(N more)" appears after the director name, styled dim.
- Hovering turns it gold + underlined.
- Clicking opens the filmography modal with "More by …" title.
- Current film is dimmed and non-clickable.
- Clicking another row closes the filmography modal and swaps the detail modal to that film.
- Hit ✕ or backdrop → modal closes.

- [ ] **Step 4: Commit**

```bash
git add src/components/FilmDetailModal.jsx
git commit -m "feat: director filmography link in film detail modal

Adds the (N more) affordance after the director name, wired to
onNavigate so clicking a row swaps the detail modal to that film.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire into `FilmCard.jsx`

**Files:**
- Modify: `src/components/FilmCard.jsx:252-258`

- [ ] **Step 1: Add the import**

In `src/components/FilmCard.jsx`, add alongside the existing component imports (near the top of the file where other component imports live — sibling to `import DIRECTORS from '../data/directors.json';`):

```jsx
import DirectorFilmographyLink from './DirectorFilmographyLink';
```

- [ ] **Step 2: Mount the link after the director name**

Replace the existing director block (lines 252-258):

```jsx
        {(() => {
          // Directed by — prefer hand-curated directors.json over OMDb (which
          // over-credits committees on some older / animated films).
          const director = DIRECTORS[movie.id] || omdbData?.director;
          if (!director) return null;
          return <div className="film-director"><strong>Directed by</strong> {director}</div>;
        })()}
```

with:

```jsx
        {(() => {
          // Directed by — prefer hand-curated directors.json over OMDb (which
          // over-credits committees on some older / animated films).
          const director = DIRECTORS[movie.id] || omdbData?.director;
          if (!director) return null;
          return (
            <div className="film-director">
              <strong>Directed by</strong> {director}
              <DirectorFilmographyLink movie={movie} onOpenDetail={onOpenDetail} />
            </div>
          );
        })()}
```

`onOpenDetail` is the prop `FilmCard` already receives for opening a film's detail modal — same callback used by its existing interactions.

- [ ] **Step 3: Verify by manual browser check**

With the dev server running, switch to Journey mode and step to a film whose director has multiple catalog credits. Confirm:
- "(N more)" appears after the director name on the journey card.
- Clicking opens the filmography modal with "More by …".
- Clicking a row closes the filmography modal and navigates to that film's detail (the Journey-card detail click path).
- Hit ✕ or backdrop → modal closes, Journey card unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/FilmCard.jsx
git commit -m "feat: director filmography link on journey card

Adds the (N more) affordance to the Journey-mode preview card's
director line, matching the film detail modal's behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: End-to-end smoke test

**Files:** none modified.

- [ ] **Step 1: Run build to catch any regressions**

```bash
npm run build
```

Expected: build succeeds. If it fails, read the error and fix (most likely an import path typo).

- [ ] **Step 2: Manual verification checklist**

With `npm run dev` running, walk through the spec's test plan:

1. **Single-director case** — open *The Shining* detail modal. Expect `(7 more)` after "Directed by Stanley Kubrick". Click → modal shows 8 chronologically-sorted films, *The Shining* row is dimmed and non-interactive.
2. **Co-director case** — open *Fargo* detail modal. Expect `(N more)` with N = union of Joel & Ethan Coen catalog credits minus Fargo. Modal title: "More by Joel Coen or Ethan Coen".
3. **Single-film director** — open any film whose director has exactly one `directors.json` credit. No parenthesis.
4. **Journey card parity** — repeat #1–#3 from the Journey-mode preview card.
5. **Row navigation** — from any filmography modal, click a non-current row. Modal closes, the outer detail swaps to that film, and the new film's own director line shows its own `(N more)` link — chain works.
6. **Backdrop / close** — click outside the filmography modal and the ✕ button; both dismiss.

- [ ] **Step 3: Final commit if any touch-ups were needed**

If the smoke test turned up any issues, fix them inline and commit. Otherwise no commit — the feature branch is ready for merge review.

---

## Self-review

**Spec coverage:** Every numbered section of the spec maps to at least one task:
- §1 reverse index → Task 1
- §2 `DirectorFilmographyLink` → Task 2
- §3 wiring → Tasks 4 and 5
- §4 styling → Task 3
- §5 test plan → Task 6 (plus in-task verification steps)

**Type/name consistency:** The component calls `getDirectorFilmography(movie.id)` returning `{ directorsDisplay, films, otherCount }` — identical to the shape exported from Task 1. Both call sites pass `movie` and an `onOpenDetail` callback; the component destructures those exact prop names.

**Placeholder scan:** No "TBD", no "add error handling", no "similar to Task N" references. Every code step includes the full code.
