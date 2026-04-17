// Hand-patch the 17 essential films where the automated backfill
// (Wikipedia + Wikidata) didn't capture all categories. Sources:
// Academy awards database + Wikipedia ceremony pages cross-checked.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');

// Map: movie id → full awards array (will overwrite any existing `awards`).
// Best Picture wins go in as `{ category: 'Best Picture' }`; acting /
// directing / screenplay carry winner names, techs are category-only.
const OVERRIDES = {
  'all-about-eve-1950': [
    { category: 'Best Picture' },
    { category: 'Director',              winner: 'Joseph L. Mankiewicz' },
    { category: 'Supporting Actor',      winner: 'George Sanders' },
    { category: 'Adapted Screenplay',    winner: 'Joseph L. Mankiewicz' },
    { category: 'Costume Design' },
    { category: 'Sound' },
  ],
  'alien-1979': [
    { category: 'Visual Effects' },
  ],
  'terminator-2-judgment-day-1991': [
    { category: 'Makeup' },
    { category: 'Sound' },
    { category: 'Sound Effects Editing' },
    { category: 'Visual Effects' },
  ],
  'sunrise-a-song-of-two-humans-1927': [
    { category: 'Actress', winner: 'Janet Gaynor' },
    { category: 'Unique and Artistic Picture' },
    { category: 'Cinematography' },
  ],
  'swing-time-1936': [
    { category: 'Original Song', winner: 'Dorothy Fields & Jerome Kern' },
  ],
  'gone-with-the-wind-1939': [
    { category: 'Best Picture' },
    { category: 'Director',              winner: 'Victor Fleming' },
    { category: 'Actress',               winner: 'Vivien Leigh' },
    { category: 'Supporting Actress',    winner: 'Hattie McDaniel' },
    { category: 'Adapted Screenplay',    winner: 'Sidney Howard' },
    { category: 'Cinematography' },
    { category: 'Film Editing' },
    { category: 'Art Direction' },
  ],
  'ben-hur-1959': [
    { category: 'Best Picture' },
    { category: 'Director',          winner: 'William Wyler' },
    { category: 'Actor',             winner: 'Charlton Heston' },
    { category: 'Supporting Actor',  winner: 'Hugh Griffith' },
    { category: 'Original Score',    winner: 'Miklós Rózsa' },
    { category: 'Cinematography' },
    { category: 'Costume Design' },
    { category: 'Film Editing' },
    { category: 'Art Direction' },
    { category: 'Sound' },
    { category: 'Visual Effects' },
  ],
  'back-to-the-future-1985': [
    { category: 'Sound Effects Editing' },
  ],
  'ran-1985': [
    { category: 'Costume Design' },
  ],
  'eternal-sunshine-of-the-spotless-mind-2004': [
    { category: 'Original Screenplay', winner: 'Charlie Kaufman, Michel Gondry & Pierre Bismuth' },
  ],
  'the-last-command-1928': [
    { category: 'Actor', winner: 'Emil Jannings' },
  ],
  'miracle-on-34th-street-1947': [
    { category: 'Supporting Actor',  winner: 'Edmund Gwenn' },
    { category: 'Original Screenplay', winner: 'Valentine Davies' },
    { category: 'Adapted Screenplay',  winner: 'George Seaton' },
  ],
  'gate-of-hell-1953': [
    { category: 'Costume Design' },
  ],
  'the-war-of-the-worlds-1953': [
    { category: 'Visual Effects' },
  ],
  'paper-moon-1973': [
    { category: 'Supporting Actress', winner: "Tatum O'Neal" },
  ],
  'hearts-and-minds-1974': [
    { category: 'Documentary Feature' },
  ],
  'the-matrix-1999': [
    { category: 'Visual Effects' },
    { category: 'Film Editing' },
    { category: 'Sound' },
    { category: 'Sound Effects Editing' },
  ],
};

function serializeAwards(awards) {
  return '[' + awards.map(a => {
    const parts = [`category: ${JSON.stringify(a.category)}`];
    if (a.winner) parts.push(`winner: ${JSON.stringify(a.winner)}`);
    return `{ ${parts.join(', ')} }`;
  }).join(', ') + ']';
}

function main() {
  let source = fs.readFileSync(MOVIES_PATH, 'utf-8');
  let applied = 0;

  for (const [id, awards] of Object.entries(OVERRIDES)) {
    const idRe = new RegExp(`\\{\\s*id:\\s*'${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}'[^}]*\\}`);
    const m = source.match(idRe);
    if (!m) {
      console.warn(`  [skip] ${id} — not found`);
      continue;
    }
    const original = m[0];
    const newAwardsStr = `awards: ${serializeAwards(awards)}`;
    let replacement;
    if (/awards\s*:\s*\[[^\]]*\]/.test(original)) {
      // Replace existing awards array in place
      replacement = original.replace(/awards\s*:\s*\[[^\]]*\]/, newAwardsStr);
    } else {
      // Insert before closing brace
      replacement = original.replace(/\s*\}$/, `, ${newAwardsStr} }`);
    }
    source = source.replace(original, replacement);
    applied++;
  }

  fs.writeFileSync(MOVIES_PATH, source);
  console.log(`Patched awards for ${applied} films`);
}

main();
