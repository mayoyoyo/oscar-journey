// Backfills film-series data from TMDB (The Movie Database).
//
// For every film in src/data/movies.js, asks TMDB whether the film "belongs to
// a collection" (Star Wars, Godfather, Toy Story, etc.). For each collection
// discovered, fetches the full member list so we can surface sequels/prequels
// that aren't in the Oscar Journey catalog.
//
// Outputs three files:
//   - scripts/tmdb-cache.json         raw TMDB responses keyed by film id
//                                     (gitignored; reruns are fast)
//   - scripts/series-report.json      human-reviewable summary
//   - src/data/seriesCollections.js   app-facing data module (committed)
//
// Run:   node --env-file=.env scripts/backfill-series.mjs
// Flags: --limit=N    only process first N films (for testing)
//        --no-cache   ignore cache and refetch everything

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CACHE_PATH = join(__dirname, 'tmdb-cache.json');
const REPORT_PATH = join(__dirname, 'series-report.json');
const DATA_PATH = join(REPO_ROOT, 'src/data/seriesCollections.js');

const TOKEN = process.env.TMDB_READ_TOKEN;
if (!TOKEN) {
  console.error('TMDB_READ_TOKEN missing. Run with:  node --env-file=.env scripts/backfill-series.mjs');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const USE_CACHE = !args.has('--no-cache');

// --- tiny TMDB client ------------------------------------------------------

const BASE = 'https://api.themoviedb.org/3';
const HEADERS = { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' };

async function tmdb(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`TMDB ${res.status} on ${url.pathname}: ${await res.text()}`);
  return res.json();
}

// Gentle pacing — TMDB allows ~50 req/sec, we stay well under.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- load catalog ----------------------------------------------------------

const moviesModule = await import(`file://${join(REPO_ROOT, 'src/data/movies.js')}`);
const CATALOG = moviesModule.MOVIES;
console.log(`Loaded ${CATALOG.length} films from catalog.`);

// Normalize titles so punctuation/spacing/spelling differences don't cause
// false negatives. "Spider-Man Into the Spider-Verse" (catalog) and "Spider-
// Man: Into the Spider-Verse" (TMDB) both collapse to the same normalized
// form, as do British/American spelling pairs like "Colours"/"Colors".
function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/colours/g, 'colors')
    .replace(/theatre/g, 'theater')
    .replace(/centre/g, 'center')
    .replace(/grey/g, 'gray')
    .replace(/[^a-z0-9]/g, '');
}

// Build a lookup from TMDB-plausible title+year → catalog film so we can mark
// collection members as in-catalog later.
const catalogByTitleYear = new Map();
for (const f of CATALOG) {
  const n = normalizeTitle(f.title);
  catalogByTitleYear.set(`${n}|${f.year}`, f);
  // also tolerate ±1 year since release-year disagreements are common
  catalogByTitleYear.set(`${n}|${f.year - 1}`, f);
  catalogByTitleYear.set(`${n}|${f.year + 1}`, f);
}

// --- cache -----------------------------------------------------------------

let cache = {};
if (USE_CACHE && existsSync(CACHE_PATH)) {
  cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  console.log(`Loaded ${Object.keys(cache).length} cached lookups.`);
}

function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// --- per-film lookup -------------------------------------------------------

// Returns { tmdbId, collection: {id, name, poster_path} | null } or null if not found.
async function lookupFilm(film) {
  if (cache[film.id]) return cache[film.id];

  // TMDB search by title + year. year scopes to primary release.
  const search = await tmdb('/search/movie', {
    query: film.title,
    year: film.year,
    include_adult: false,
  });
  await sleep(30);

  const best = search.results?.[0];
  if (!best) {
    cache[film.id] = { tmdbId: null, collection: null, note: 'no search result' };
    return cache[film.id];
  }

  // Fetch details to get belongs_to_collection (not returned in search).
  const details = await tmdb(`/movie/${best.id}`);
  await sleep(30);

  const result = {
    tmdbId: best.id,
    tmdbTitle: details.title,
    tmdbYear: (details.release_date || '').slice(0, 4),
    collection: details.belongs_to_collection || null,
  };
  cache[film.id] = result;
  return result;
}

// --- main loop -------------------------------------------------------------

const collections = new Map(); // collectionId -> {id, name, poster_path, members:[]}
let processed = 0;
let withCollection = 0;
let misses = 0;

const filmsToProcess = CATALOG.slice(0, LIMIT);

for (const film of filmsToProcess) {
  try {
    const result = await lookupFilm(film);
    processed++;

    if (!result.tmdbId) {
      misses++;
      console.log(`  miss: ${film.id} (no TMDB result for "${film.title}" ${film.year})`);
    } else if (result.collection) {
      withCollection++;
      const c = result.collection;
      if (!collections.has(c.id)) {
        collections.set(c.id, { id: c.id, name: c.name, poster_path: c.poster_path, members: [] });
      }
      collections.get(c.id).members.push({
        catalogId: film.id,
        catalogTitle: film.title,
        catalogYear: film.year,
        tmdbId: result.tmdbId,
      });
    }

    if (processed % 50 === 0) {
      console.log(`  ${processed}/${filmsToProcess.length}  collections so far: ${collections.size}  misses: ${misses}`);
      saveCache();
    }
  } catch (err) {
    console.error(`  error on ${film.id}: ${err.message}`);
  }
}
saveCache();

console.log(`\nFilm lookups done. ${withCollection}/${processed} films belong to a collection. Unique collections: ${collections.size}.\n`);

// --- fetch credits/runtime/genre for each collection member ---------------
//
// The /collection/{id} endpoint returns basic film info (title, year, overview,
// poster) but NOT director, cast, or runtime. For any collection film we want
// to show a preview for, we need a per-movie fetch. We scope this to every
// TMDB id referenced by any interesting collection so the preview modal has
// enough data to render.
async function fetchMovieCredits(tmdbId) {
  const cacheKey = `__credits_${tmdbId}`;
  if (cache[cacheKey]) return cache[cacheKey];
  const data = await tmdb(`/movie/${tmdbId}`, { append_to_response: 'credits' });
  await sleep(30);
  const director = (data.credits?.crew || []).find((c) => c.job === 'Director')?.name || null;
  const cast = (data.credits?.cast || []).slice(0, 4).map((c) => c.name);
  const genres = (data.genres || []).map((g) => g.name);
  const result = {
    director,
    cast,
    runtime: data.runtime || null,
    genres,
    imdbId: data.imdb_id || null,
  };
  cache[cacheKey] = result;
  return result;
}

// Fetch the real IMDb rating from OMDb using an imdb_id (tt0120915 etc.).
// Reuses one of the keys already shipped to the frontend — OMDb's free tier
// gives 1000 requests/day per key, and we're processing ~350 films once with
// persistent caching, so we stay well inside the limit.
const OMDB_KEY_FOR_BACKFILL = '84fee249';
async function fetchImdbRating(imdbId) {
  const cacheKey = `__omdb_${imdbId}`;
  if (cache[cacheKey]) return cache[cacheKey];
  let rating = null;
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY_FOR_BACKFILL}`);
    if (res.ok) {
      const data = await res.json();
      if (data.imdbRating && data.imdbRating !== 'N/A') {
        rating = parseFloat(data.imdbRating);
      }
    }
  } catch {}
  await sleep(50);
  cache[cacheKey] = { rating };
  return cache[cacheKey];
}

// --- fetch full collection details -----------------------------------------

console.log('Fetching collection details...');
let collectionsProcessed = 0;
for (const col of collections.values()) {
  try {
    const cacheKey = `__collection_${col.id}`;
    let details;
    if (cache[cacheKey]) {
      details = cache[cacheKey];
    } else {
      details = await tmdb(`/collection/${col.id}`);
      await sleep(30);
      cache[cacheKey] = details;
    }

    // Walk TMDB's parts list. Sort by release date so order is chronological.
    const parts = (details.parts || [])
      .filter((p) => p.release_date) // drop unreleased/placeholder entries
      .sort((a, b) => a.release_date.localeCompare(b.release_date));

    col.allFilms = [];
    for (const [idx, p] of parts.entries()) {
      const year = parseInt(p.release_date.slice(0, 4), 10);
      const catalogMatch = catalogByTitleYear.get(`${normalizeTitle(p.title)}|${year}`);
      // Only fetch credits for films we plan to show a preview modal for
      // (i.e. out-of-catalog films). In-catalog films already have their own
      // richer detail modal sourced from OMDb + the local catalog.
      let credits = null;
      let imdbRating = null;
      if (!catalogMatch) {
        try {
          credits = await fetchMovieCredits(p.id);
          if (credits.imdbId) {
            const omdb = await fetchImdbRating(credits.imdbId);
            imdbRating = omdb.rating;
          }
        } catch (err) {
          console.error(`  credits error for tmdb ${p.id} (${p.title}): ${err.message}`);
        }
      }
      col.allFilms.push({
        order: idx + 1,
        tmdbId: p.id,
        title: p.title,
        year,
        releaseDate: p.release_date,
        overview: p.overview || '',
        posterPath: p.poster_path,
        inCatalog: !!catalogMatch,
        catalogId: catalogMatch?.id || null,
        // Preview-modal data (only populated for out-of-catalog films)
        director: credits?.director || null,
        cast: credits?.cast || null,
        runtime: credits?.runtime || null,
        genres: credits?.genres || null,
        imdbId: credits?.imdbId || null,
        imdbRating,
      });
    }

    col.overview = details.overview || '';
    collectionsProcessed++;
    if (collectionsProcessed % 20 === 0) {
      console.log(`  ${collectionsProcessed}/${collections.size} collections fetched`);
      saveCache();
    }
  } catch (err) {
    console.error(`  collection ${col.id} (${col.name}) error: ${err.message}`);
  }
}
saveCache();

// --- write report ----------------------------------------------------------

// Drop "collections" where the only catalog member is a single film AND
// that film is the only release in the collection — not interesting.
const interesting = [...collections.values()]
  .filter((c) => (c.allFilms?.length || 0) >= 2)
  .sort((a, b) => b.members.length - a.members.length);

const report = {
  generatedAt: new Date().toISOString(),
  totalFilmsProcessed: processed,
  filmsWithCollection: withCollection,
  uniqueCollections: collections.size,
  interestingCollections: interesting.length,
  misses,
  collections: interesting.map((c) => ({
    tmdbCollectionId: c.id,
    name: c.name,
    posterPath: c.poster_path,
    overview: c.overview,
    catalogMembers: c.members.length,
    totalFilms: c.allFilms?.length || 0,
    outOfCatalog: (c.allFilms || []).filter((f) => !f.inCatalog).length,
    films: c.allFilms || [],
  })),
};

writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

// --- emit the app-facing data module ---------------------------------------

// Shrinks each collection to fields the UI actually needs. Posters are stored
// as TMDB relative paths; the UI prepends https://image.tmdb.org/t/p/w185 (or
// any size) at render time.
const shippable = {};
for (const c of interesting) {
  shippable[c.id] = {
    id: c.id,
    name: c.name,
    overview: c.overview,
    poster: c.poster_path,
    films: (c.allFilms || []).map((f) => ({
      order: f.order,
      tmdbId: f.tmdbId,
      title: f.title,
      year: f.year,
      overview: f.overview,
      poster: f.posterPath,
      inCatalog: f.inCatalog,
      catalogId: f.catalogId,
      // Extra metadata present only for out-of-catalog films
      ...(f.director ? { director: f.director } : {}),
      ...(f.cast?.length ? { cast: f.cast } : {}),
      ...(f.runtime ? { runtime: f.runtime } : {}),
      ...(f.genres?.length ? { genres: f.genres } : {}),
      ...(f.imdbId ? { imdbId: f.imdbId } : {}),
      ...(f.imdbRating != null ? { imdbRating: f.imdbRating } : {}),
    })),
  };
}

const banner = `// Auto-generated by scripts/backfill-series.mjs. Do not edit by hand.
// Regenerate: node --env-file=.env scripts/backfill-series.mjs
// Source: themoviedb.org "belongs_to_collection" data, fetched ${new Date().toISOString().slice(0, 10)}.
`;

const body = `${banner}
export const SERIES_COLLECTIONS = ${JSON.stringify(shippable, null, 2)};

// Given a catalog film id, return { collection, film, siblings } or null.
//   collection — the SERIES_COLLECTIONS entry (name, overview, poster)
//   film       — this film's entry inside the collection.films array
//   siblings   — the full collection.films array (chronological), so callers
//                can render the full series (in-catalog + out-of-catalog)
export function getSeriesForFilm(filmId) {
  for (const col of Object.values(SERIES_COLLECTIONS)) {
    const film = col.films.find((f) => f.catalogId === filmId);
    if (film) return { collection: col, film, siblings: col.films };
  }
  return null;
}

// TMDB poster path -> full URL at a given size (w92, w154, w185, w342, w500, w780, original).
export function tmdbPoster(path, size = 'w185') {
  if (!path) return null;
  return \`https://image.tmdb.org/t/p/\${size}\${path}\`;
}
`;

writeFileSync(DATA_PATH, body);

console.log(`\nReport written to ${REPORT_PATH}`);
console.log(`Data module written to ${DATA_PATH}`);
console.log(`\n=== Summary ===`);
console.log(`Films processed:          ${processed}`);
console.log(`Films in a collection:    ${withCollection}`);
console.log(`Unique collections:       ${collections.size}`);
console.log(`Interesting (2+ films):   ${interesting.length}`);
console.log(`Search misses:            ${misses}`);
console.log(`\nTop 20 collections by catalog-member count:`);
for (const c of interesting.slice(0, 20)) {
  const oot = (c.allFilms || []).filter((f) => !f.inCatalog).length;
  console.log(`  ${c.members.length}/${c.allFilms?.length || 0} in catalog  (+${oot} extras)  ${c.name}`);
}
