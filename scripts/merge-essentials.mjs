// One-shot script to merge essentials additions into src/data/movies.js
// Reads:  C:/Users/Chris/Downloads/oscar-journey-additions/additions.js
// Writes: src/data/movies.js  (in-place — idempotent, removes any prior ESSENTIAL block first)

import fs from 'node:fs';

const MOVIES_PATH = new URL('../src/data/movies.js', import.meta.url);
const ADDITIONS_PATH = 'C:/Users/Chris/Downloads/oscar-journey-additions/additions.js';

const moviesRaw = fs.readFileSync(MOVIES_PATH, 'utf8');
const additionsRaw = fs.readFileSync(ADDITIONS_PATH, 'utf8');

// Rename CANON -> ESSENTIAL in the additions text
const essentialsBlock = additionsRaw
  .replace(/category:\s*'CANON'/g, "category: 'ESSENTIAL'")
  .replace(/\/\/ category: 'CANON'/g, "// category: 'ESSENTIAL'");

// Find the closing `];` of MOVIES array. First `];` after `export const MOVIES`.
const moviesStartIdx = moviesRaw.indexOf('export const MOVIES');
if (moviesStartIdx === -1) throw new Error('MOVIES export not found');
const closingIdx = moviesRaw.indexOf('\n];', moviesStartIdx);
if (closingIdx === -1) throw new Error('MOVIES closing bracket not found');

// Remove any prior ESSENTIAL block so re-running is idempotent
const startMarker = '// ===== ESSENTIALS BEGIN =====';
const endMarker = '// ===== ESSENTIALS END =====';
let cleanedMovies = moviesRaw;
const prevStart = cleanedMovies.indexOf(startMarker);
if (prevStart !== -1) {
  const prevEnd = cleanedMovies.indexOf(endMarker);
  if (prevEnd === -1) throw new Error('ESSENTIALS BEGIN found but no END');
  cleanedMovies =
    cleanedMovies.slice(0, prevStart) +
    cleanedMovies.slice(prevEnd + endMarker.length + 1);
}

// Re-find closing bracket after cleanup
const cleanedMoviesStart = cleanedMovies.indexOf('export const MOVIES');
const cleanedClosingIdx = cleanedMovies.indexOf('\n];', cleanedMoviesStart);

const wrapped =
  `\n\n  ${startMarker}\n` +
  `  // 438 essential non-Oscar films. Curated via 2-of-N across 7 canon lists:\n` +
  `  // SS (Sight & Sound '22), AFI (AFI 100+10Top10), FEST (Cannes/Venice/Berlin),\n` +
  `  // IMDB (IMDb Top 250), LBXD (Letterboxd Top 250), NFR (National Film Registry),\n` +
  `  // CRIT (Criterion Collection). 'tier' = number of lists (2–6).\n` +
  essentialsBlock +
  `\n  ${endMarker}\n`;

const result =
  cleanedMovies.slice(0, cleanedClosingIdx) +
  wrapped +
  cleanedMovies.slice(cleanedClosingIdx);

fs.writeFileSync(MOVIES_PATH, result);

// Quick sanity check — count ESSENTIAL entries
const count = (result.match(/category:\s*'ESSENTIAL'/g) || []).length;
console.log(`ESSENTIAL entries now in movies.js: ${count}`);
