// Bake OMDb's Director field for every film into src/data/directors.json so
// the search bar can match director names without hitting localStorage
// (which only exists client-side) or OMDb on every keystroke.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OUT_PATH    = path.resolve(__dirname, '../src/data/directors.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let keyIdx = 0;

const TITLE_OVERRIDES = {
  'Birdman': 'Birdman or The Unexpected Virtue of Ignorance',
  'Cries and Whispers': 'Cries & Whispers',
  'Sunrise: A Song of Two Humans': 'Sunrise',
  'Apur Sansar': 'The World of Apu',
  'Il Postino': 'The Postman',
};
const YEAR_OVERRIDES = {
  'Il Postino': 1994, 'The Emigrants': 1971, 'Cries and Whispers': 1972,
  'Tess': 1979, 'A Room with a View': 1985, 'Life Is Beautiful': 1997,
  'Spirited Away': 2001, 'The Hurt Locker': 2008, 'Judas and the Black Messiah': 2021,
  'Sound of Metal': 2019, 'Crash': 2004,
};

async function omdbFetch(title, year) {
  const t = encodeURIComponent(TITLE_OVERRIDES[title] || title);
  const y = YEAR_OVERRIDES[title] || year;
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[keyIdx];
    const url = `https://www.omdbapi.com/?t=${t}&y=${y}&type=movie&apikey=${key}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.Error && data.Error.includes('limit')) {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }
    if (data.Response === 'False') {
      const url2 = `https://www.omdbapi.com/?t=${t}&type=movie&apikey=${OMDB_KEYS[keyIdx]}`;
      const resp2 = await fetch(url2);
      const data2 = await resp2.json();
      if (data2.Error && data2.Error.includes('limit')) {
        keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
        continue;
      }
      return data2;
    }
    return data;
  }
  return null;
}

async function main() {
  const mod = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mod.MOVIES;
  console.log(`Fetching Director from OMDb for ${MOVIES.length} films...`);
  const out = {};
  for (let i = 0; i < MOVIES.length; i++) {
    const m = MOVIES[i];
    if (i % 50 === 0) process.stdout.write(`  ${i}/${MOVIES.length}\r`);
    const data = await omdbFetch(m.title, m.year);
    const director = data?.Director && data.Director !== 'N/A' ? data.Director : null;
    if (director) out[m.id] = director;
    await new Promise(r => setTimeout(r, 50));
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n${Object.keys(out).length} films with director data → ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
