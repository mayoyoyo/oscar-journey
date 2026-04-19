// Find films where the modal would show "Won N Oscars" from OMDb fallback
// but we have no per-category `awards` data coded. These render a lonely
// trophy count with no specific award entries beneath it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');

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

function parseOscarWins(t) {
  if (!t || t === 'N/A') return 0;
  const m = t.match(/Won\s+(\d+)\s+Oscar/i);
  return m ? parseInt(m[1], 10) : 0;
}

async function omdbFetch(title, year) {
  const t = encodeURIComponent(TITLE_OVERRIDES[title] || title);
  const y = YEAR_OVERRIDES[title] || year;
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[keyIdx];
    const url = `https://www.omdbapi.com/?t=${t}&y=${y}&type=movie&apikey=${key}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.Error && data.Error.includes('limit')) { keyIdx = (keyIdx + 1) % OMDB_KEYS.length; continue; }
    if (data.Response === 'False') {
      const url2 = `https://www.omdbapi.com/?t=${t}&type=movie&apikey=${OMDB_KEYS[keyIdx]}`;
      const r2 = await fetch(url2);
      const d2 = await r2.json();
      if (d2.Error && d2.Error.includes('limit')) { keyIdx = (keyIdx + 1) % OMDB_KEYS.length; continue; }
      return d2;
    }
    return data;
  }
  return null;
}

// Mirror the FilmDetailModal/FilmCard formula for codedOscars.
function codedOscars(m) {
  return (m.awards?.length || 0)
       + (m.won && m.category === 'BP' ? 1 : 0)
       + (m.alsoWon?.length || 0)
       + (m.category === 'ANIM' || m.category === 'INT' ? 1 : 0);
}

const mm = await import(pathToFileURL(MOVIES_PATH).href);
const MOVIES = mm.MOVIES;

// Candidates: codedOscars === 0 — these are the ones that fall through to
// OMDb string parsing.
const candidates = MOVIES.filter(m => codedOscars(m) === 0);
console.log(`Catalog: ${MOVIES.length} films, ${candidates.length} with zero coded awards`);

const bugs = [];
let i = 0;
for (const m of candidates) {
  i++;
  if (i % 25 === 0) process.stdout.write(`  ${i}/${candidates.length}\r`);
  const data = await omdbFetch(m.title, m.year);
  const wins = parseOscarWins(data?.Awards);
  if (wins > 0) {
    bugs.push({ id: m.id, title: m.title, year: m.year, category: m.category, omdbWins: wins, omdbAwards: data.Awards });
  }
  await new Promise(r => setTimeout(r, 60));
}

bugs.sort((a, b) => b.omdbWins - a.omdbWins || a.year - b.year);
console.log(`\n\nFound ${bugs.length} films with OMDb oscar wins but no coded awards:\n`);
bugs.forEach(b => {
  console.log(`  ${String(b.omdbWins).padStart(2)}× ${b.title} (${b.year}) [${b.category}]  — ${b.omdbAwards}`);
});

fs.writeFileSync(path.resolve(__dirname, 'missing-award-data.json'),
  JSON.stringify({ scannedAt: new Date().toISOString(), count: bugs.length, films: bugs }, null, 2));
console.log(`\nReport → scripts/missing-award-data.json`);
