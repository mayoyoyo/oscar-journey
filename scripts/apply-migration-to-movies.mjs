// Apply the multi-genre migration to src/data/movies.js:
//   1. Rewrite GENRE_LABELS with the new 14-code taxonomy (C=Comedy, S=Sci-Fi,
//      T=Thriller, H=Historical; add F=Fantasy, Ho=Horror, Fa=Family; remove A).
//   2. For each of the 787 films, update `genre: 'X'` to the new primary and
//      insert `altGenres: [...]` on the same line (omit when empty).
//
// Reads: scripts/genre-review-final.json (the merged, pruned, user-approved review).
// Writes: src/data/movies.js in place.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REVIEW_PATH = path.resolve(__dirname, 'genre-review-final.json');

const NEW_LABELS_BLOCK = `// Genre code labels
export const GENRE_LABELS = {
  D: 'Drama',
  C: 'Comedy',
  R: 'Romance',
  T: 'Thriller',
  Ho: 'Horror',
  H: 'Historical',
  W: 'War',
  B: 'Biopic',
  X: 'Crime / Noir',
  N: 'Action / Adventure',
  S: 'Sci-Fi',
  F: 'Fantasy',
  M: 'Musical',
  I: 'Indie / Arthouse',
  Fa: 'Family',
};`;

const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const reviewById = new Map(review.map(r => [r.id, r]));

let src = fs.readFileSync(MOVIES_PATH, 'utf8');

// 1) Replace the GENRE_LABELS block.
const labelsRegex = /\/\/ Genre code labels\nexport const GENRE_LABELS = \{[\s\S]*?\n\};/;
if (!labelsRegex.test(src)) {
  console.error('Could not locate GENRE_LABELS block. Abort.');
  process.exit(1);
}
src = src.replace(labelsRegex, NEW_LABELS_BLOCK);
console.log('Updated GENRE_LABELS.');

// 2) Per-film updates.
// A film row looks like: `{ id: 'slug-1970', title: "...", ..., genre: 'D', ... }`
// We locate by `id: 'slug'` then rewrite `genre: 'OLD'` → `genre: 'NEW'` and
// insert `, altGenres: [...]` immediately after it (only if non-empty).
let updated = 0, missing = 0, unchanged = 0;
for (const r of review) {
  const idMarker = `id: '${r.id}'`;
  const idIdx = src.indexOf(idMarker);
  if (idIdx === -1) { missing++; continue; }
  // Find line bounds
  const lineStart = src.lastIndexOf('\n', idIdx) + 1;
  const lineEnd = src.indexOf('\n', idIdx);
  const line = src.slice(lineStart, lineEnd);

  // The line must have a `genre: 'X'` token. Replace + insert altGenres.
  const altStr = r.altGenres && r.altGenres.length
    ? `, altGenres: [${r.altGenres.map(g => `'${g}'`).join(', ')}]`
    : '';

  // Strip any pre-existing altGenres: [...] (for idempotency on re-run).
  let stripped = line.replace(/,\s*altGenres:\s*\[[^\]]*\]/, '');

  const newLine = stripped.replace(
    /genre:\s*'[^']+'/,
    `genre: '${r.primary}'${altStr}`
  );

  if (newLine === line) { unchanged++; continue; }
  src = src.slice(0, lineStart) + newLine + src.slice(lineEnd);
  updated++;
}

fs.writeFileSync(MOVIES_PATH, src);
console.log(`Per-film updates: ${updated} rewritten, ${unchanged} unchanged, ${missing} not found.`);
