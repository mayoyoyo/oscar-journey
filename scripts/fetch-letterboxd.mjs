// Fetches Letterboxd ratings for every film in the catalog and writes the result
// to src/data/letterboxdRatings.json (committed, imported at runtime).
//
// Why a script instead of a live fetch? letterboxd.com doesn't set permissive
// CORS headers, so browser-side fetches get blocked. Baking the values into a
// JSON blob at build-time is the established pattern in this repo (see
// actors.json, directors.json, imdbIds.json).
//
// Pipeline per film:
//   1. IMDb id → TMDb id (via TMDB `/find`, free, aggressive cache).
//   2. TMDb id → Letterboxd film page (via their `/tmdb/<id>/` redirect).
//   3. Scrape JSON-LD for aggregateRating + ratingCount, and vanity slug.
//
// Outputs:
//   - scripts/tmdb-ids-cache.json        resumable IMDb→TMDb mapping
//   - scripts/letterboxd-cache.json      raw scrape results (debugging)
//   - src/data/letterboxdRatings.json    runtime-facing shape (committed)
//
// Run:   node --env-file=.env scripts/fetch-letterboxd.mjs
// Flags: --limit=N      only process first N films (for testing)
//        --no-cache     ignore caches, refetch everything
//        --only=<id>    refetch a single film by id (useful for fixing a miss)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TMDB_CACHE_PATH = join(__dirname, 'tmdb-ids-cache.json');
const LB_CACHE_PATH = join(__dirname, 'letterboxd-cache.json');
const OUT_PATH = join(REPO_ROOT, 'src/data/letterboxdRatings.json');
const IMDB_IDS_PATH = join(REPO_ROOT, 'src/data/imdbIds.json');

const TOKEN = process.env.TMDB_READ_TOKEN;
if (!TOKEN) {
  console.error('TMDB_READ_TOKEN missing. Run with:  node --env-file=.env scripts/fetch-letterboxd.mjs');
  process.exit(1);
}

const args = process.argv.slice(2);
const argSet = new Set(args);
const limitArg = args.find((a) => a.startsWith('--limit='));
const onlyArg  = args.find((a) => a.startsWith('--only='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const ONLY  = onlyArg  ? onlyArg.split('=')[1] : null;
const USE_CACHE = !argSet.has('--no-cache');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tmdbCache = USE_CACHE && existsSync(TMDB_CACHE_PATH) ? JSON.parse(readFileSync(TMDB_CACHE_PATH, 'utf8')) : {};
const lbCache   = USE_CACHE && existsSync(LB_CACHE_PATH)   ? JSON.parse(readFileSync(LB_CACHE_PATH,   'utf8')) : {};
const imdbIds   = JSON.parse(readFileSync(IMDB_IDS_PATH, 'utf8'));

const moviesModule = await import(`file://${join(REPO_ROOT, 'src/data/movies.js')}`);
const CATALOG = moviesModule.MOVIES;
console.log(`Loaded ${CATALOG.length} films.`);

// IMDb id → TMDb id via TMDB's `/find` endpoint. `external_source=imdb_id` is
// the canonical way to cross-reference; returns the matching movie in
// `movie_results[0]` or an empty array if nothing matches.
async function resolveTmdbId(filmId, imdbId) {
  if (tmdbCache[filmId]?.tmdbId) return tmdbCache[filmId].tmdbId;
  if (tmdbCache[filmId]?.note === 'not_found') return null;

  const url = `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } });
  if (!res.ok) {
    tmdbCache[filmId] = { imdbId, note: `http_${res.status}` };
    return null;
  }
  const json = await res.json();
  const hit = json?.movie_results?.[0];
  if (!hit?.id) {
    tmdbCache[filmId] = { imdbId, note: 'not_found' };
    return null;
  }
  tmdbCache[filmId] = { imdbId, tmdbId: hit.id, title: hit.title, year: (hit.release_date || '').slice(0, 4) };
  return hit.id;
}

// Follow the letterboxd.com/tmdb/<id>/ redirect, then parse JSON-LD on the
// resulting film page. The redirect is the one structured handle LB exposes —
// no official API, no public search, no slug catalogue.
async function fetchLetterboxd(tmdbId) {
  const url = `https://letterboxd.com/tmdb/${tmdbId}/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) return { status: res.status };
  const html = await res.text();
  const finalUrl = res.url;
  const slug = finalUrl.match(/\/film\/([^/]+)/)?.[1] || null;

  // Primary path: JSON-LD aggregateRating. Robust and machine-intended.
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let rating = null, count = null;
  if (ldMatch) {
    try {
      // LB wraps its LD+JSON in CDATA-comment markers on some pages.
      const raw = ldMatch[1].replace(/^\s*\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\/\s*$/, '').trim();
      const ld = JSON.parse(raw);
      rating = ld?.aggregateRating?.ratingValue ?? null;
      count  = ld?.aggregateRating?.ratingCount ?? null;
    } catch {}
  }

  // Redundant fallback: twitter:data2 meta tag carries the same number in case
  // JSON-LD is ever removed or restructured.
  if (rating == null) {
    const meta = html.match(/<meta name="twitter:data2" content="([0-9.]+) out of 5"/);
    if (meta) rating = parseFloat(meta[1]);
  }

  return { status: 200, slug, rating, votes: count, finalUrl };
}

// --- main loop -------------------------------------------------------------

let processed = 0, lbHits = 0, lbMiss = 0, tmdbMiss = 0;
const target = ONLY ? CATALOG.filter((f) => f.id === ONLY) : CATALOG.slice(0, LIMIT);
if (ONLY && target.length === 0) { console.error(`No film with id=${ONLY}`); process.exit(1); }

for (const film of target) {
  processed++;
  const prefix = `[${String(processed).padStart(3)}/${target.length}]`;
  const imdbId = imdbIds[film.id];
  if (!imdbId) {
    console.log(`${prefix} ${film.id} — no IMDb id, skip`);
    continue;
  }

  // Reuse a fresh LB cache entry unless --no-cache. We don't set a hard TTL;
  // the caller should re-run this script when they want newer numbers.
  if (USE_CACHE && lbCache[film.id]?.rating != null) {
    lbHits++;
    continue;
  }

  const tmdbId = await resolveTmdbId(film.id, imdbId);
  if (!tmdbId) {
    tmdbMiss++;
    console.log(`${prefix} ${film.id} — TMDb miss (${imdbId})`);
    writeFileSync(TMDB_CACHE_PATH, JSON.stringify(tmdbCache, null, 2));
    continue;
  }

  await sleep(200); // polite between TMDb and LB
  const lb = await fetchLetterboxd(tmdbId);
  if (lb.status !== 200 || lb.rating == null) {
    lbMiss++;
    lbCache[film.id] = { tmdbId, status: lb.status, note: 'no_rating', ...lb };
    console.log(`${prefix} ${film.id} — LB miss (tmdb=${tmdbId}, status=${lb.status})`);
  } else {
    lbHits++;
    lbCache[film.id] = {
      tmdbId,
      rating: lb.rating,
      votes: lb.votes,
      slug: lb.slug,
      fetchedAt: new Date().toISOString(),
    };
    console.log(`${prefix} ${film.id} — ${lb.rating} (${lb.votes} votes)  /${lb.slug}/`);
  }

  // Persist both caches every 10 films so Ctrl-C resumes cleanly.
  if (processed % 10 === 0) {
    writeFileSync(TMDB_CACHE_PATH, JSON.stringify(tmdbCache, null, 2));
    writeFileSync(LB_CACHE_PATH, JSON.stringify(lbCache, null, 2));
  }

  await sleep(1200); // polite between LB fetches
}

writeFileSync(TMDB_CACHE_PATH, JSON.stringify(tmdbCache, null, 2));
writeFileSync(LB_CACHE_PATH, JSON.stringify(lbCache, null, 2));

// Shape the runtime-facing JSON: only films with a real rating make it in.
const out = {};
for (const [filmId, entry] of Object.entries(lbCache)) {
  if (entry?.rating != null) {
    out[filmId] = {
      rating: entry.rating,
      votes: entry.votes ?? null,
      slug: entry.slug ?? null,
      fetchedAt: entry.fetchedAt ?? null,
    };
  }
}
writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');

console.log('\n=== summary ===');
console.log(`processed: ${processed}`);
console.log(`LB hits:   ${lbHits}`);
console.log(`LB miss:   ${lbMiss}`);
console.log(`TMDb miss: ${tmdbMiss}`);
console.log(`wrote:     ${OUT_PATH} (${Object.keys(out).length} films)`);
