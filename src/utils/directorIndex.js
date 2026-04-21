import DIRECTORS from '../data/directors.json';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';

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
    .map((id) => MOVIES_BY_ID[id])
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
