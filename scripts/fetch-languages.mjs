// Hit OMDb for every film's Language + Country and bake the non-English
// films into src/data/languages.json. Ships as static lookup so the
// language-flag pill renders instantly without requiring the user's
// local OMDb cache to have been hydrated first.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OUT_PATH    = path.resolve(__dirname, '../src/data/languages.json');

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

// First listed language — usually the production/primary language.
function primaryLanguage(lang) {
  if (!lang) return null;
  return lang.split(',')[0].trim();
}
function primaryCountry(c) {
  if (!c) return null;
  return c.split(',')[0].trim();
}

async function main() {
  const mod = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mod.MOVIES;
  console.log(`Fetching Language + Country from OMDb for ${MOVIES.length} films...`);

  const out = {};
  let nonEnglish = 0;
  for (let i = 0; i < MOVIES.length; i++) {
    const m = MOVIES[i];
    if (i % 50 === 0) process.stdout.write(`  ${i}/${MOVIES.length}\r`);
    const data = await omdbFetch(m.title, m.year);
    const lang = primaryLanguage(data?.Language);
    const country = primaryCountry(data?.Country);
    if (lang && lang !== 'English' && lang !== 'None' && lang !== 'N/A') {
      out[m.id] = { lang, country: country || null };
      nonEnglish++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n\n${nonEnglish} non-English films → ${OUT_PATH}`);
  // Show country distribution
  const byCountry = {};
  for (const { country } of Object.values(out)) {
    byCountry[country || '(unknown)'] = (byCountry[country || '(unknown)'] || 0) + 1;
  }
  console.log('\nTop countries:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([c, n]) => {
    console.log(`  ${String(n).padStart(3)}  ${c}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
