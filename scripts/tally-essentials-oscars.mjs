// Hit OMDb for every ESSENTIAL film and parse the Awards string to find out
// how many actually won Oscars. The 438-film essentials expansion focused on
// canon-list membership; it didn't backfill per-category Oscar awards. This
// script gives us coverage stats to know whether OMDb-based fallback alone is
// enough, or whether we still need manual backfill.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'essentials-oscar-tally.json');

// Same keys the app rotates through
const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
let keyIdx = 0;

// Mirror the app's title/year overrides so look-ups match what the user sees
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

function parseOscarWins(awardsText) {
  if (!awardsText || awardsText === 'N/A') return 0;
  const m = awardsText.match(/Won\s+(\d+)\s+Oscar/i);
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
    if (data.Error && data.Error.includes('limit')) {
      keyIdx = (keyIdx + 1) % OMDB_KEYS.length;
      continue;
    }
    if (data.Response === 'False') {
      // Retry without year
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
  // Dynamic import so we get the MOVIES array
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = moviesModule.MOVIES;
  const essentials = MOVIES.filter(m => m.category === 'ESSENTIAL');

  console.log(`Scanning ${essentials.length} essential films against OMDb...`);

  const results = [];
  let i = 0;
  for (const m of essentials) {
    i++;
    if (i % 25 === 0) process.stdout.write(`  ${i}/${essentials.length}\r`);
    const data = await omdbFetch(m.title, m.year);
    const awardsText = data?.Awards && data.Awards !== 'N/A' ? data.Awards : null;
    const wins = parseOscarWins(awardsText);
    results.push({ id: m.id, title: m.title, year: m.year, awards: awardsText, oscarWins: wins });
    // tiny pacing so we don't hammer the API
    await new Promise(r => setTimeout(r, 60));
  }

  // Stats
  const withWins = results.filter(r => r.oscarWins > 0);
  const noMatch = results.filter(r => r.awards === null);
  const byCount = {};
  for (const r of results) {
    byCount[r.oscarWins] = (byCount[r.oscarWins] || 0) + 1;
  }

  console.log(`\n\nResults\n========`);
  console.log(`Total essentials scanned : ${results.length}`);
  console.log(`With >=1 Oscar win       : ${withWins.length}  (${((withWins.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`Zero Oscar wins          : ${results.length - withWins.length - noMatch.length}`);
  console.log(`OMDb had no awards data  : ${noMatch.length}`);
  console.log(`\nDistribution by win count:`);
  Object.keys(byCount).sort((a, b) => +a - +b).forEach(k => {
    console.log(`  ${k.padStart(2)} Oscar${k === '1' ? ' ' : 's'}: ${byCount[k]}`);
  });

  console.log(`\nTop 15 winners:`);
  withWins.sort((a, b) => b.oscarWins - a.oscarWins).slice(0, 15).forEach(r => {
    console.log(`  ${String(r.oscarWins).padStart(2)}× ${r.title} (${r.year})`);
  });

  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    scannedAt: new Date().toISOString(),
    totalEssentials: results.length,
    withOscarWins: withWins.length,
    noOmdbMatch: noMatch.length,
    distribution: byCount,
    films: results,
  }, null, 2));
  console.log(`\nFull report → ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
