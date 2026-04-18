// Backfills OMDb's imdb_id for every film in src/data/movies.js so the main
// FilmDetailModal / FilmCard IMDb link can be a direct imdb.com/title/{id}/
// URL instead of a search URL.
//
// Outputs src/data/imdbIds.json: { [filmId]: "tt1234567" }.
// Cache: scripts/imdb-id-cache.json (gitignored, reruns are fast).
//
// Run:  node scripts/backfill-imdb-ids.mjs
// Flags: --limit=N      only process first N films (smoke-test)
//        --no-cache     ignore cache and refetch everything

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CACHE_PATH = join(__dirname, 'imdb-id-cache.json');
const OUT_PATH = join(REPO_ROOT, 'src/data/imdbIds.json');

const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const USE_CACHE = !args.has('--no-cache');

// Keep in sync with src/utils/omdb.js OMDB_KEYS. We rotate on rate-limit or
// 401 just like the app does.
const OMDB_KEYS = ['84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let keyIdx = 0;

// Mirrors of the app's title/year overrides so this script resolves titles
// exactly the way the runtime does. Keep in sync with src/utils/omdb.js.
const OMDB_TITLE_OVERRIDES = {
  'Birdman': 'Birdman or The Unexpected Virtue of Ignorance',
  'Cries and Whispers': 'Cries & Whispers',
  'Sunrise: A Song of Two Humans': 'Sunrise',
  'Apur Sansar': 'The World of Apu',
  'Il Postino': 'The Postman',
  'Three Colours: Red': 'Three Colors: Red',
  'Blue Is the Warmest Colour': 'Blue Is the Warmest Color',
};

const OMDB_YEAR_OVERRIDES = {
  'Il Postino': 1994,
  'The Emigrants': 1971,
  'Cries and Whispers': 1972,
  'Tess': 1979,
  'A Room with a View': 1985,
  'Life Is Beautiful': 1997,
  'Spirited Away': 2001,
  'The Hurt Locker': 2008,
  'Judas and the Black Messiah': 2021,
  'Sound of Metal': 2019,
  'Crash': 2004,
};

const cleanTitle = (t) => (OMDB_TITLE_OVERRIDES[t] || t)
  .replace(/[\u2018\u2019\u02BC]/g, "'")
  .replace(/[\u201C\u201D]/g, '"');
const cleanYear = (movie) => OMDB_YEAR_OVERRIDES[movie.title] || movie.year;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- load catalog ----------------------------------------------------------

const moviesModule = await import(`file://${join(REPO_ROOT, 'src/data/movies.js')}`);
const CATALOG = moviesModule.MOVIES;
console.log(`Loaded ${CATALOG.length} films from catalog.`);

// --- cache -----------------------------------------------------------------

let cache = {};
if (USE_CACHE && existsSync(CACHE_PATH)) {
  cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  console.log(`Loaded ${Object.keys(cache).length} cached lookups.`);
}
function saveCache() { writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2)); }

// --- per-film lookup -------------------------------------------------------

async function lookupImdbId(movie) {
  if (cache[movie.id] !== undefined) return cache[movie.id];

  const title = cleanTitle(movie.title);
  const year = cleanYear(movie);

  // Try up to all keys — rotate on rate limit / auth error.
  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const key = OMDB_KEYS[keyIdx];
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&type=movie&apikey=${key}`;
    let res;
    try {
      res = await fetch(url);
    } catch {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }

    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!data) {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }

    if (data.Error && /limit/i.test(data.Error)) {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }

    const imdbId = data.imdbID || null;
    cache[movie.id] = imdbId;
    return imdbId;
  }

  cache[movie.id] = null;
  return null;
}

// --- main loop -------------------------------------------------------------

const films = CATALOG.slice(0, LIMIT);
let processed = 0;
let found = 0;
let misses = 0;

for (const movie of films) {
  try {
    const id = await lookupImdbId(movie);
    processed++;
    if (id) found++;
    else { misses++; console.log(`  miss: ${movie.id} (${movie.title}, ${movie.year})`); }
    await sleep(35);
    if (processed % 50 === 0) {
      console.log(`  ${processed}/${films.length}  found ${found}  misses ${misses}`);
      saveCache();
    }
  } catch (err) {
    console.error(`  error on ${movie.id}: ${err.message}`);
  }
}
saveCache();

// --- write the shipped data file -------------------------------------------

const out = {};
for (const [filmId, imdbId] of Object.entries(cache)) {
  if (imdbId) out[filmId] = imdbId;
}
writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

console.log(`\nWrote ${OUT_PATH}: ${Object.keys(out).length} film → imdbId mappings`);
console.log(`\n=== Summary ===`);
console.log(`Films processed:  ${processed}`);
console.log(`IMDb IDs found:   ${found}`);
console.log(`Misses:           ${misses}`);
