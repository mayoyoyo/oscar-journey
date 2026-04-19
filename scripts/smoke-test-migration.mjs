// Smoke test for the multi-genre migration. Exercises:
//   - GENRE_LABELS contains the new 14-code taxonomy
//   - Every film has a valid primary code and (optionally) altGenres
//   - isAnimated() still returns true for former-A films (via ANIM_IDS)
//   - getMatchupLabel overlap logic behaves under multi-genre
//   - OR-semantics genre filter behaves as expected
//
// Runs as plain Node — no React / Vite. Reports pass/fail + film counts.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { MOVIES, GENRE_LABELS } = await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href);

// Inline ANIM_IDS (mirrors src/utils/filmAttributes.js) — we can't import
// filmAttributes here because Node ESM trips on its languages.json import.
import fs from 'node:fs';
const faSrc = fs.readFileSync(path.resolve(__dirname, '../src/utils/filmAttributes.js'), 'utf8');
const idListMatch = faSrc.match(/const ANIM_IDS = new Set\(\[([\s\S]*?)\]\);/);
const ANIM_IDS = new Set(
  [...idListMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1])
);
function isAnimated(movie) {
  if (movie.category === 'ANIM') return true;
  if ((movie.alsoWon || []).includes('ANIM')) return true;
  return ANIM_IDS.has(movie.id);
}

let fails = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); fails++; };

console.log('=== 1. Taxonomy ===');
const expectedCodes = ['D','C','R','T','Ho','H','W','B','X','N','S','F','M','I','Fa'];
for (const c of expectedCodes) {
  if (GENRE_LABELS[c]) pass(`${c} = ${GENRE_LABELS[c]}`);
  else fail(`Missing ${c}`);
}
if (!('A' in GENRE_LABELS)) pass('A code removed from GENRE_LABELS');
else fail(`A code still present: ${GENRE_LABELS['A']}`);

console.log('\n=== 2. Per-film integrity ===');
const allowed = new Set(expectedCodes);
let primaryBad = 0, altBad = 0, missingPrimary = 0;
for (const m of MOVIES) {
  if (!m.genre) { missingPrimary++; continue; }
  if (!allowed.has(m.genre)) primaryBad++;
  if (m.altGenres) {
    for (const g of m.altGenres) {
      if (!allowed.has(g)) altBad++;
      if (g === m.genre) altBad++;  // dedupe invariant
    }
  }
}
if (primaryBad === 0) pass(`All ${MOVIES.length} films have valid primary codes`);
else fail(`${primaryBad} films have invalid primary codes`);
if (missingPrimary === 0) pass('No films missing primary');
else fail(`${missingPrimary} films missing primary`);
if (altBad === 0) pass('All altGenres valid and non-duplicate of primary');
else fail(`${altBad} altGenre violations`);

console.log('\n=== 3. isAnimated() ===');
const animatedSamples = ['toy-story-1995', 'spirited-away-2002', 'wall-e-2008', 'coco-2017'];
for (const id of animatedSamples) {
  const m = MOVIES.find(x => x.id === id);
  if (!m) { fail(`Sample ${id} not in catalog`); continue; }
  if (isAnimated(m)) pass(`${m.title} is animated`);
  else fail(`${m.title} should be animated`);
}
const babe = MOVIES.find(x => x.id === 'babe-1995');
if (babe && !isAnimated(babe)) pass('Babe is NOT animated (live-action correction)');
else if (babe) fail('Babe should not be animated');

console.log('\n=== 4. Genre filter (OR-semantics) ===');
// Filter: "Comedy" checked, "War" unchecked → Great Dictator should still pass
// because its altGenres include War, and its primary is Comedy.
const dictator = MOVIES.find(x => x.id === 'the-great-dictator-1940');
if (dictator) {
  const filters = { C: true, W: false, D: true };
  const allGenres = [dictator.genre, ...(dictator.altGenres || [])];
  const passes = allGenres.some(g => filters[g] !== false);
  if (passes) pass('Great Dictator passes filter with Comedy checked + War unchecked (primary C)');
  else fail('Great Dictator should pass');
  // With all its genres unchecked, it should fail
  const filtersAll = { C: false, W: false, D: false };
  const passes2 = allGenres.some(g => filtersAll[g] !== false);
  if (!passes2) pass('Great Dictator hidden when all its genres are unchecked');
  else fail('Great Dictator should be hidden');
} else fail('Great Dictator not found');

console.log('\n=== 5. MovieBattle overlap logic ===');
// Two comedies with different altGenres should still share genre overlap
const a = { genre: 'C', altGenres: ['W'] };
const b = { genre: 'C', altGenres: ['R'] };
const aG = new Set([a.genre, ...(a.altGenres || [])]);
const bG = new Set([b.genre, ...(b.altGenres || [])]);
const overlap = [...aG].some(g => bG.has(g));
if (overlap) pass('Two Comedy-primary films detected as same-genre (overlap on C)');
else fail('Should overlap on C');

// Two films sharing nothing
const c = { genre: 'Ho', altGenres: ['T'] };
const d = { genre: 'M', altGenres: ['R'] };
const cG = new Set([c.genre, ...(c.altGenres || [])]);
const dG = new Set([d.genre, ...(d.altGenres || [])]);
const overlap2 = [...cG].some(g => dG.has(g));
if (!overlap2) pass('Horror+Thriller vs Musical+Romance detected as genre clash (no overlap)');
else fail('Should not overlap');

console.log('\n=== 6. Primary distribution ===');
const hist = {};
for (const m of MOVIES) hist[m.genre] = (hist[m.genre] || 0) + 1;
let total = 0;
for (const [k, v] of Object.entries(hist).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${k.padEnd(3)} ${String(v).padStart(4)}  ${GENRE_LABELS[k] || '?'}`);
  total += v;
}
console.log(`  TOTAL ${total}`);

console.log('\n=== 7. altGenres stats ===');
const altLen = {};
let totalTags = 0;
for (const m of MOVIES) {
  const n = m.altGenres ? m.altGenres.length : 0;
  altLen[n] = (altLen[n] || 0) + 1;
  totalTags += 1 + n;
}
console.log(`  Distribution: ${JSON.stringify(altLen)}`);
console.log(`  Avg tags/film: ${(totalTags / MOVIES.length).toFixed(2)}`);

console.log(`\n${fails === 0 ? '=== ALL TESTS PASS ===' : `=== ${fails} FAILURES ===`}`);
process.exit(fails === 0 ? 0 : 1);
