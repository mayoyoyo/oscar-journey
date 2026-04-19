// Audits OMDb for Metacritic coverage across the full film catalog.
// Answers: "for films that show no Metacritic tile in the app, is OMDb
// actually missing the score, or is my localStorage cache just stale?"
//
// Queries OMDb via imdb_id (most reliable), collects Metascore, classifies.
// Rotates through the 9 public keys on rate-limit — total cost is ~800 reqs,
// comfortably under the shared daily budget.
//
// Output: scripts/metacritic-audit.json (full list) + console summary.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const IMDB_IDS = JSON.parse(readFileSync(join(REPO_ROOT, 'src/data/imdbIds.json'), 'utf8'));
const OUT_PATH = join(__dirname, 'metacritic-audit.json');

const KEYS = ['84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let keyIdx = 0;

const { MOVIES } = await import(`file://${join(REPO_ROOT, 'src/data/movies.js')}`);
console.log(`Loaded ${MOVIES.length} films. ${Object.keys(IMDB_IDS).length} have IMDb ids.`);

async function queryOmdb(imdbId) {
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${KEYS[keyIdx]}`;
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
      keyIdx = (keyIdx + 1) % KEYS.length;
      continue;
    }
    const json = await res.json();
    if (json.Error && json.Error.includes('limit')) {
      keyIdx = (keyIdx + 1) % KEYS.length;
      continue;
    }
    return json;
  }
  return null;
}

const results = [];
let processed = 0;

for (const m of MOVIES) {
  const imdbId = IMDB_IDS[m.id];
  if (!imdbId) {
    results.push({ id: m.id, title: m.title, year: m.year, imdbId: null, metascore: null, status: 'no_imdb_id' });
    continue;
  }
  const data = await queryOmdb(imdbId);
  processed++;
  if (!data || data.Response === 'False') {
    results.push({ id: m.id, title: m.title, year: m.year, imdbId, metascore: null, status: 'omdb_error' });
  } else {
    const ms = data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : null;
    results.push({ id: m.id, title: m.title, year: m.year, imdbId, metascore: ms, status: ms ? 'has_metacritic' : 'omdb_na' });
  }
  if (processed % 50 === 0) {
    console.log(`  ... ${processed} films probed`);
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  }
  // Tiny pause so bursts don't trip the shared OMDb ceiling.
  await new Promise((r) => setTimeout(r, 60));
}

writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

const has  = results.filter(r => r.status === 'has_metacritic').length;
const naOmdb = results.filter(r => r.status === 'omdb_na').length;
const noImdb = results.filter(r => r.status === 'no_imdb_id').length;
const err = results.filter(r => r.status === 'omdb_error').length;

console.log('\n=== Metacritic coverage audit ===');
console.log(`has metascore : ${has}`);
console.log(`OMDb N/A      : ${naOmdb}`);
console.log(`no imdb id    : ${noImdb}`);
console.log(`omdb error    : ${err}`);
console.log(`total         : ${results.length}`);
console.log(`\nFull list → ${OUT_PATH}`);
