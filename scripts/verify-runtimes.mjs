// Full-catalog runtime verification.
// For each film in movies.js, fetch OMDb's Runtime field and flag:
//  - missing / N/A runtimes
//  - suspiciously short (< 60 min) or long (> 300 min) runtimes
//  - films already in RUNTIME_OVERRIDES are skipped (assumed hand-curated)
//
// Uses the same OMDb key rotation + year/title override logic as omdb.js so
// the results match what the app will actually display.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OMDB_PATH = path.resolve(__dirname, '../src/utils/omdb.js');
const OVERRIDES_PATH = path.resolve(__dirname, '../src/utils/runtimeOverrides.js');
const REPORT_PATH = path.resolve(__dirname, 'runtime-report.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let k = 0;

// Read OMDb overrides directly from source so script and app stay in sync.
const omdbSrc = fs.readFileSync(OMDB_PATH, 'utf8');

function parseMap(src, name) {
  const block = src.match(new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  const out = {};
  if (!block) return out;
  const re = /['"]([^'"]+)['"]\s*:\s*(?:(\d+)|['"]([^'"]+)['"])/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    out[m[1]] = m[2] !== undefined ? Number(m[2]) : m[3];
  }
  return out;
}

const TITLE_OVERRIDES = parseMap(omdbSrc, 'OMDB_TITLE_OVERRIDES');
const YEAR_OVERRIDES = parseMap(omdbSrc, 'OMDB_YEAR_OVERRIDES');

// Parse existing runtime overrides
const overridesSrc = fs.readFileSync(OVERRIDES_PATH, 'utf8');
const existingOverrides = parseMap(overridesSrc, 'RUNTIME_OVERRIDES');

function cleanTitle(title) {
  return (TITLE_OVERRIDES[title] || title)
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function getYear(movie) {
  return YEAR_OVERRIDES[movie.title] || movie.year;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function omdbFetch(title, year) {
  const t = encodeURIComponent(cleanTitle(title));
  // Try with year first, then without. Prefer result with a valid runtime.
  const results = [];
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[k];
    let rateLimited = false;
    for (const y of [`&y=${year}`, '']) {
      const url = `https://www.omdbapi.com/?t=${t}&type=movie&apikey=${key}${y}`;
      let d;
      try {
        const r = await fetch(url);
        d = await r.json();
      } catch {
        await sleep(300);
        continue;
      }
      if (d.Error && /limit/i.test(d.Error)) { rateLimited = true; break; }
      if (d.Response === 'True') results.push({ query: y ? 'with-year' : 'no-year', data: d });
    }
    if (rateLimited) { k = (k + 1) % OMDB_KEYS.length; continue; }
    break;
  }
  if (results.length === 0) return null;
  // Prefer the one with a valid runtime
  const withRt = results.find(r => r.data.Runtime && r.data.Runtime !== 'N/A');
  return withRt ? withRt.data : results[0].data;
}

function parseRuntime(r) {
  if (!r || r === 'N/A') return null;
  const m = String(r).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const movies = (await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now())).MOVIES;
  // --all flag bypasses the skip so we can verify every film including overridden ones.
  const includeOverridden = process.argv.includes('--all');
  console.log(`Checking runtimes across ${movies.length} films...`);
  if (!includeOverridden) {
    console.log(`Skipping ${Object.keys(existingOverrides).length} already overridden (pass --all to include).`);
  }

  const flagged = [];
  const ok = [];
  let overriddenCount = 0;
  let notFound = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    if (!includeOverridden && existingOverrides[m.id] != null) { overriddenCount++; continue; }

    const data = await omdbFetch(m.title, getYear(m));
    if (!data) {
      notFound++;
      flagged.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'omdb-not-found', runtime: null });
    } else {
      const rt = parseRuntime(data.Runtime);
      if (rt == null) {
        flagged.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'runtime-na', runtime: null, omdbTitle: data.Title, omdbYear: data.Year });
      } else if (rt < 60) {
        flagged.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'too-short', runtime: rt, omdbTitle: data.Title, omdbYear: data.Year });
      } else if (rt > 300) {
        flagged.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'too-long', runtime: rt, omdbTitle: data.Title, omdbYear: data.Year });
      } else {
        ok.push({ id: m.id, title: m.title, runtime: rt });
      }
    }

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${movies.length} - ok ${ok.length}, flagged ${flagged.length}`);
    await sleep(25);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    total: movies.length,
    overriddenCount,
    okCount: ok.length,
    flaggedCount: flagged.length,
    notFound,
    flagged,
  }, null, 2));

  console.log(`\nDone.`);
  console.log(`  Total: ${movies.length}`);
  console.log(`  Already overridden: ${overriddenCount}`);
  console.log(`  OK: ${ok.length}`);
  console.log(`  Flagged: ${flagged.length}`);
  if (flagged.length) {
    console.log('\nFlagged films:');
    for (const f of flagged) {
      const rtStr = f.runtime == null ? 'null' : `${f.runtime}min`;
      const omdbStr = f.omdbTitle ? ` [omdb: "${f.omdbTitle}" (${f.omdbYear})]` : '';
      console.log(`  [${f.reason}] ${f.title} (${f.year}) ${rtStr}${omdbStr} - ${f.id}`);
    }
  }
  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
