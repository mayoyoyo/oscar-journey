// Full-catalog poster verification — all 837 films, not just essentials.
// Uses GET with a Range header (bytes=0-0) to avoid Amazon CDN's flaky HEAD
// responses, and retries once on failure to filter out transient network blips.
// Skips films whose ID is already in POSTER_OVERRIDES (those are known-good local files).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OMDB_PATH = path.resolve(__dirname, '../src/utils/omdb.js');
const REPORT_PATH = path.resolve(__dirname, 'all-posters-report.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238'];
let k = 0;

// Extract POSTER_OVERRIDES IDs from omdb.js source so we skip films already overridden
const omdbSrc = fs.readFileSync(OMDB_PATH, 'utf8');
const overrideBlock = omdbSrc.match(/POSTER_OVERRIDES\s*=\s*\{([\s\S]*?)\};/);
const overriddenIds = new Set();
if (overrideBlock) {
  for (const m of overrideBlock[1].matchAll(/['"]([a-z0-9-]+)['"]\s*:/g)) {
    overriddenIds.add(m[1]);
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function omdbFetch(title, year) {
  const t = encodeURIComponent(title.replace(/[''']/g, "'").replace(/[""]/g, '"'));
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[k];
    for (const y of [`&y=${year}`, '']) {
      const url = `https://www.omdbapi.com/?t=${t}&type=movie&apikey=${key}${y}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.Error && /limit/i.test(d.Error)) { k = (k + 1) % OMDB_KEYS.length; break; }
      if (d.Response === 'True') return d;
    }
  }
  return null;
}

async function urlOk(u) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(u, { method: 'GET', headers: { range: 'bytes=0-0' } });
      if (r.ok || r.status === 206) return true;
      if (r.status === 429) { await sleep(500); continue; }
      return false;
    } catch {
      await sleep(200);
    }
  }
  return false;
}

async function main() {
  const movies = (await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now())).MOVIES;
  console.log(`Checking posters across ${movies.length} films (GET+retry)…`);
  console.log(`Skipping ${overriddenIds.size} already-overridden.`);

  const problems = [];
  let ok = 0, overridden = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    if (overriddenIds.has(m.id)) { overridden++; continue; }
    const data = await omdbFetch(m.title, m.year);
    if (!data) {
      problems.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'omdb-not-found' });
    } else if (!data.Poster || data.Poster === 'N/A') {
      problems.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'omdb-no-poster' });
    } else if (!(await urlOk(data.Poster))) {
      problems.push({ id: m.id, title: m.title, year: m.year, category: m.category, reason: 'url-404', url: data.Poster });
    } else {
      ok++;
    }
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${movies.length} — ok ${ok}, problems ${problems.length}`);
    await sleep(25);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({ problems, okCount: ok, overriddenCount: overridden }, null, 2));
  console.log(`\nDone. ${ok} OK, ${overridden} already overridden, ${problems.length} problems.`);
  if (problems.length > 0) {
    console.log('\nProblems by category:');
    const byCat = {};
    for (const p of problems) (byCat[p.category] = byCat[p.category] || []).push(p);
    for (const [cat, list] of Object.entries(byCat)) {
      console.log(`  ${cat}: ${list.length}`);
      for (const p of list) console.log(`    [${p.reason}] ${p.title} (${p.year}) — ${p.id}`);
    }
  }
  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
