// Backfill OMDb metadata (director, top-billed cast, language) for films in
// movies.js that are missing entries from any of directors.json, actors.json,
// cast.json, languages.json.
//
// Runs additively — loads existing JSONs, only fetches missing films, merges
// the results back. Applies manual title/year overrides for OMDb gaps.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const DIR_PATH    = path.resolve(__dirname, '../src/data/directors.json');
const ACT_PATH    = path.resolve(__dirname, '../src/data/actors.json');
const LANG_PATH   = path.resolve(__dirname, '../src/data/languages.json');

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let keyIdx = 0;

// Manual overrides for films OMDb can't find cleanly.
const TITLE_OVERRIDES = {
  "L'Atalante": 'L\'Atalante',
  'Grand Illusion': 'La Grande Illusion',
  'The Killers': 'The Killers',
  'The Shop Around the Corner': 'The Shop Around the Corner',
  'The Red Circle': 'Le Cercle rouge',
  'Je, Tu, Il, Elle': 'Je tu il elle',
  'Sans Soleil': 'Sans Soleil',
  'The Green Ray': 'Le Rayon Vert',
  'A City of Sadness': 'City of Sadness',
  'Three Colours: Red': 'Three Colors: Red',
  'The Gleaners and I': 'The Gleaners & I',
  'In Vanda\'s Room': 'In Vanda\'s Room',
  'The Fog of War': 'The Fog of War: Eleven Lessons from the Life of Robert S. McNamara',
  'Blue Is the Warmest Colour': 'Blue Is the Warmest Color',
};
const YEAR_OVERRIDES = {
  'The Red Circle': 1970,
};

async function omdbFetch(title, year) {
  const t = encodeURIComponent(TITLE_OVERRIDES[title] || title);
  const y = YEAR_OVERRIDES[title] || year;
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[keyIdx];
    const url = `https://www.omdbapi.com/?t=${t}&y=${y}&type=movie&apikey=${key}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.Error && data.Error.includes('limit')) {
        keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
        continue;
      }
      return data;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function normalizeLang(lang) {
  if (!lang) return null;
  const first = lang.split(',')[0].trim();
  const mapped = {
    English: 'en', French: 'fr', Italian: 'it', Spanish: 'es', German: 'de',
    Japanese: 'ja', Korean: 'ko', Mandarin: 'zh', Cantonese: 'zh', Chinese: 'zh',
    Russian: 'ru', Polish: 'pl', Czech: 'cs', Hungarian: 'hu', Swedish: 'sv',
    Danish: 'da', Norwegian: 'no', Portuguese: 'pt', Dutch: 'nl', Arabic: 'ar',
    Hindi: 'hi', Farsi: 'fa', Persian: 'fa', Hebrew: 'he', Turkish: 'tr',
    Greek: 'el', Romanian: 'ro', Thai: 'th', Vietnamese: 'vi',
  };
  return { name: first, code: mapped[first] || first.slice(0,2).toLowerCase() };
}

async function main() {
  const mod = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mod.MOVIES;
  const directors = JSON.parse(fs.readFileSync(DIR_PATH, 'utf8'));
  const actors = JSON.parse(fs.readFileSync(ACT_PATH, 'utf8'));
  const languages = JSON.parse(fs.readFileSync(LANG_PATH, 'utf8'));

  // Identify films missing from any data file
  const needsDir = MOVIES.filter(m => !directors[m.id]);
  const needsAct = MOVIES.filter(m => !actors[m.id]);
  const needsLang = MOVIES.filter(m => !languages[m.id]);
  const toFetch = new Map();
  for (const m of [...needsDir, ...needsAct, ...needsLang]) {
    toFetch.set(m.id, m);
  }
  console.log(`Films needing metadata: ${toFetch.size}`);
  console.log(`  Missing director: ${needsDir.length}`);
  console.log(`  Missing actors: ${needsAct.length}`);
  console.log(`  Missing language: ${needsLang.length}`);

  let done = 0;
  const unresolved = [];
  for (const [id, m] of toFetch) {
    done++;
    process.stdout.write(`  ${done}/${toFetch.size}: ${m.title} (${m.year})   \r`);
    const data = await omdbFetch(m.title, m.year);
    if (!data || data.Response === 'False') {
      unresolved.push({ id, title: m.title, year: m.year, error: data?.Error || 'no response' });
      await new Promise(r => setTimeout(r, 50));
      continue;
    }
    if (!directors[id] && data.Director && data.Director !== 'N/A') {
      directors[id] = data.Director;
    }
    if (!actors[id] && data.Actors && data.Actors !== 'N/A') {
      actors[id] = data.Actors.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!languages[id]) {
      const lang = normalizeLang(data.Language);
      if (lang && lang.name && lang.name !== 'English') {
        languages[id] = { lang, country: data.Country?.split(',')[0]?.trim() || null };
      } else if (lang && lang.name === 'English') {
        // Don't write English entries — the UI only shows non-English flags
      }
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log('');

  // Write all three files
  fs.writeFileSync(DIR_PATH, JSON.stringify(directors, null, 2));
  fs.writeFileSync(ACT_PATH, JSON.stringify(actors, null, 2));
  fs.writeFileSync(LANG_PATH, JSON.stringify(languages, null, 2));

  console.log(`\nResults:`);
  console.log(`  directors.json: ${Object.keys(directors).length} entries`);
  console.log(`  actors.json: ${Object.keys(actors).length} entries`);
  console.log(`  languages.json: ${Object.keys(languages).length} entries`);

  if (unresolved.length) {
    console.log(`\nUnresolved (${unresolved.length} — need manual patching):`);
    for (const u of unresolved) console.log(`  ${u.id} | ${u.title} (${u.year}) — ${u.error}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
