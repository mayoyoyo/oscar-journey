// Audits scripts/series-report.json for TMDB collection films that are marked
// out-of-catalog but look like they might match a catalog film (normalized
// title similarity, year within ±2). Prints suspects for manual review.
//
// Run:  node scripts/audit-series-matches.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const report = JSON.parse(readFileSync(join(__dirname, 'series-report.json'), 'utf8'));
const moviesModule = await import(`file://${join(REPO_ROOT, 'src/data/movies.js')}`);
const CATALOG = moviesModule.MOVIES;

function normalize(t) {
  return (t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Index catalog by normalized title
const catNormToFilm = new Map();
for (const f of CATALOG) catNormToFilm.set(normalize(f.title), f);

const catalogNormTitles = [...catNormToFilm.keys()];

// Levenshtein for near-matches
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 4) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

const suspects = [];
for (const col of report.collections) {
  for (const f of col.films) {
    if (f.inCatalog) continue;
    const nt = normalize(f.title);
    // Check for exact normalized match (would be a same-title-different-year case)
    if (catNormToFilm.has(nt)) {
      const hit = catNormToFilm.get(nt);
      suspects.push({
        collection: col.name,
        tmdbTitle: f.title, tmdbYear: f.year,
        catalogTitle: hit.title, catalogYear: hit.year,
        catalogId: hit.id,
        reason: `exact normalized title match, year diff ${f.year - hit.year}`,
      });
      continue;
    }
    // Check for near-match (edit distance 1-2)
    for (const cnt of catalogNormTitles) {
      if (Math.abs(cnt.length - nt.length) > 4) continue;
      const d = editDistance(nt, cnt);
      if (d <= 2 && d > 0) {
        const hit = catNormToFilm.get(cnt);
        if (Math.abs(f.year - hit.year) <= 3) {
          suspects.push({
            collection: col.name,
            tmdbTitle: f.title, tmdbYear: f.year,
            catalogTitle: hit.title, catalogYear: hit.year,
            catalogId: hit.id,
            reason: `title dist ${d}, year diff ${f.year - hit.year}`,
          });
        }
      }
    }
  }
}

console.log(`Found ${suspects.length} potential missed matches:\n`);
for (const s of suspects) {
  console.log(`  [${s.collection}]`);
  console.log(`    TMDB:    "${s.tmdbTitle}" (${s.tmdbYear})`);
  console.log(`    Catalog: "${s.catalogTitle}" (${s.catalogYear})  id=${s.catalogId}`);
  console.log(`    Why:     ${s.reason}\n`);
}
