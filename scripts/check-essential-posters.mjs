// Check which ESSENTIAL films are missing posters on OMDb.
// Reports each film whose poster is 'N/A' or that OMDb can't find at all.
// Candidates for manual override in src/utils/omdb.js POSTER_OVERRIDES.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'poster-report.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238'];
let currentKeyIndex = 0;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPoster(title, year) {
  const titleEnc = encodeURIComponent(title.replace(/[''']/g, "'").replace(/[""]/g, '"'));
  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const key = OMDB_KEYS[currentKeyIndex];
    for (const yearParam of [`&y=${year}`, '']) {
      const url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${key}${yearParam}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.Error && /limit/i.test(data.Error)) {
        currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
        break; // try next key
      }
      if (data.Response === 'True') {
        return { found: true, poster: data.Poster, title: data.Title, year: data.Year };
      }
    }
  }
  return { found: false };
}

async function main() {
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
  const essentials = moviesModule.MOVIES.filter(m => m.category === 'ESSENTIAL');

  console.log(`Checking posters for ${essentials.length} essential films…`);
  const missing = [];
  const notFound = [];
  const ok = [];

  for (let i = 0; i < essentials.length; i++) {
    const m = essentials[i];
    const r = await fetchPoster(m.title, m.year);
    if (!r.found) {
      notFound.push({ id: m.id, title: m.title, year: m.year });
    } else if (!r.poster || r.poster === 'N/A') {
      missing.push({ id: m.id, title: m.title, year: m.year, omdbTitle: r.title, omdbYear: r.year });
    } else {
      ok.push(m.id);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${essentials.length} — missing ${missing.length}, not found ${notFound.length}`);
    await sleep(40);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({ missing, notFound, okCount: ok.length }, null, 2));

  console.log(`\nDone.`);
  console.log(`  Poster OK: ${ok.length}`);
  console.log(`  Missing poster (N/A): ${missing.length}`);
  console.log(`  Not found on OMDb: ${notFound.length}`);

  if (missing.length > 0) {
    console.log(`\nEssentials with missing posters on OMDb:`);
    for (const m of missing) console.log(`  ${m.id}  —  ${m.title} (${m.year})`);
  }
  if (notFound.length > 0) {
    console.log(`\nEssentials OMDb couldn't find at all:`);
    for (const m of notFound) console.log(`  ${m.id}  —  ${m.title} (${m.year})`);
  }
  console.log(`\nFull report: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
