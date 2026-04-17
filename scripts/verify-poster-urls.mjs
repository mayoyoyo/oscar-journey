// More rigorous poster check — fetches OMDb for each essential AND verifies the
// poster URL actually resolves (HEAD check, looking for 2xx). Catches cases where
// OMDb returns a stale/broken Amazon image URL.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'poster-verify-report.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238'];
let currentKeyIndex = 0;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function omdbFetch(title, year) {
  const titleEnc = encodeURIComponent(title.replace(/[''']/g, "'").replace(/[""]/g, '"'));
  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const key = OMDB_KEYS[currentKeyIndex];
    for (const yearParam of [`&y=${year}`, '']) {
      const url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${key}${yearParam}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.Error && /limit/i.test(data.Error)) {
        currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
        break;
      }
      if (data.Response === 'True') return data;
    }
  }
  return null;
}

async function verifyUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function main() {
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
  const essentials = moviesModule.MOVIES.filter(m => m.category === 'ESSENTIAL');

  console.log(`Verifying posters for ${essentials.length} essentials (OMDb + HEAD check)...`);
  const problems = [];
  let ok = 0;

  for (let i = 0; i < essentials.length; i++) {
    const m = essentials[i];
    const data = await omdbFetch(m.title, m.year);
    if (!data) {
      problems.push({ id: m.id, title: m.title, year: m.year, reason: 'omdb-not-found' });
    } else if (!data.Poster || data.Poster === 'N/A') {
      problems.push({ id: m.id, title: m.title, year: m.year, reason: 'omdb-no-poster' });
    } else {
      const check = await verifyUrl(data.Poster);
      if (!check.ok) {
        problems.push({ id: m.id, title: m.title, year: m.year, reason: `url-failed-${check.status}`, url: data.Poster });
      } else {
        ok++;
      }
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${essentials.length} — problems so far: ${problems.length}`);
    await sleep(30);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify({ problems, okCount: ok }, null, 2));
  console.log(`\nDone. ${ok} OK, ${problems.length} problems.`);
  if (problems.length > 0) {
    console.log('\nProblems:');
    for (const p of problems) {
      console.log(`  [${p.reason}] ${p.title} (${p.year}) — ${p.id}${p.url ? ' — ' + p.url : ''}`);
    }
  }
  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
