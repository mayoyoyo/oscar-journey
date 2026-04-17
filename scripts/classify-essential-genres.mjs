// Auto-classify genres for ESSENTIAL films by querying OMDb and mapping to our 13 codes.
//
// OMDb returns a comma-separated genre string like "Drama, Romance" or "Action, Adventure,
// Sci-Fi". We pick the most distinctive genre by priority so films land in the most
// meaningful bucket (e.g. "Thriller" beats "Drama", "Sci-Fi" beats "Drama", etc.).
//
// Writes: updated movies.js in place (modifies the `genre: 'D'` of essentials only).
// Keeps a report of what changed in genre-classification-report.json for review.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'genre-classification-report.json');

// Same key pool the app uses — rotate on rate-limit.
const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238'];
let currentKeyIndex = 0;

// Priority-ordered mapping from OMDb Genre tokens → our single-char codes.
// First match wins, so put the most distinctive categories first.
const GENRE_PRIORITY = [
  ['Animation', 'A'],
  ['Musical', 'M'],
  ['War', 'W'],
  ['Biography', 'B'],
  ['Sci-Fi', 'S'],
  ['Fantasy', 'S'],
  ['Horror', 'T'],
  ['Film-Noir', 'X'],
  ['Crime', 'X'],
  ['Mystery', 'T'],
  ['Thriller', 'T'],
  ['Western', 'N'],
  ['Action', 'N'],
  ['Adventure', 'N'],
  ['Romance', 'R'],
  ['Comedy', 'C'],
  ['History', 'H'],
  ['Drama', 'D'],
];

function pickGenreCode(omdbGenreString) {
  if (!omdbGenreString || omdbGenreString === 'N/A') return null;
  const tokens = omdbGenreString.split(',').map(s => s.trim());
  for (const [needle, code] of GENRE_PRIORITY) {
    if (tokens.includes(needle)) return code;
  }
  return null;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchGenre(title, year) {
  const titleEnc = encodeURIComponent(title.replace(/[''']/g, "'").replace(/[""]/g, '"'));
  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const key = OMDB_KEYS[currentKeyIndex];
    // Try with year first
    let url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&y=${year}&apikey=${key}`;
    let resp = await fetch(url);
    let data = await resp.json();

    if (data.Error && /limit/i.test(data.Error)) {
      currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
      continue;
    }

    if (data.Response === 'True' && data.Genre && data.Genre !== 'N/A') {
      return { genre: data.Genre, title: data.Title, year: data.Year };
    }

    // Retry without year — OMDb often disagrees on release year
    url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${key}`;
    resp = await fetch(url);
    data = await resp.json();
    if (data.Response === 'True' && data.Genre && data.Genre !== 'N/A') {
      return { genre: data.Genre, title: data.Title, year: data.Year };
    }
    return null; // not found on this key, no point trying others for not-found
  }
  return null;
}

async function main() {
  // Dynamically import movies.js via file:// URL (Windows needs this)
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
  const MOVIES = moviesModule.MOVIES;
  const essentials = MOVIES.filter(m => m.category === 'ESSENTIAL');

  console.log(`Classifying ${essentials.length} essential films via OMDb…`);

  const results = [];
  let ok = 0, notFound = 0, unmapped = 0;

  for (let i = 0; i < essentials.length; i++) {
    const m = essentials[i];
    try {
      const info = await fetchGenre(m.title, m.year);
      if (!info) {
        notFound++;
        results.push({ id: m.id, title: m.title, year: m.year, oldGenre: m.genre, newGenre: null, raw: null, note: 'not found' });
      } else {
        const code = pickGenreCode(info.genre);
        if (!code) {
          unmapped++;
          results.push({ id: m.id, title: m.title, year: m.year, oldGenre: m.genre, newGenre: null, raw: info.genre, note: 'no mapping' });
        } else {
          ok++;
          results.push({ id: m.id, title: m.title, year: m.year, oldGenre: m.genre, newGenre: code, raw: info.genre, note: null });
        }
      }
    } catch (e) {
      results.push({ id: m.id, title: m.title, year: m.year, oldGenre: m.genre, newGenre: null, raw: null, note: `error: ${e.message}` });
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${essentials.length}  (ok ${ok}, not-found ${notFound}, unmapped ${unmapped})`);
    await sleep(50); // light pacing to be polite
  }

  // Apply: rewrite movies.js with the new genre codes for essentials that got a mapping.
  const moviesRaw = fs.readFileSync(MOVIES_PATH, 'utf8');
  const changes = results.filter(r => r.newGenre && r.newGenre !== r.oldGenre);
  let updated = moviesRaw;
  for (const c of changes) {
    // Find the line containing the id — movies.js has one film per line with this ID format
    const idMarker = `id: '${c.id}'`;
    const idx = updated.indexOf(idMarker);
    if (idx === -1) continue;
    // Find the end of the line (next `\n`)
    const eol = updated.indexOf('\n', idx);
    const line = updated.slice(idx, eol);
    // Replace `genre: 'X'` in that line with the new code — only first occurrence in the line
    const newLine = line.replace(/genre:\s*'[A-Z]'/, `genre: '${c.newGenre}'`);
    if (newLine !== line) {
      updated = updated.slice(0, idx) + newLine + updated.slice(eol);
    }
  }
  fs.writeFileSync(MOVIES_PATH, updated);
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ changes, results, summary: { ok, notFound, unmapped } }, null, 2));

  console.log(`\nDone.`);
  console.log(`  Successfully classified: ${ok}`);
  console.log(`  Applied changes: ${changes.length}`);
  console.log(`  OMDb not found: ${notFound}`);
  console.log(`  Unmapped (genre string with no match): ${unmapped}`);
  console.log(`  Report: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
