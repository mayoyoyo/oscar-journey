// One-off migration to clean up the film catalog:
//   1. Delete 100 pre-1970 tier-2/3 ESSENTIAL bloat entries
//   2. Convert 32 pre-1970 BP-nominee ESSENTIAL entries + Citizen Kane (33
//      total) into category: 'BP' (won: false) with proper ceremony number,
//      so they render gray statuettes and count as Oscar films
//   3. Insert 13 Best International Feature Film winners (1956-1990) into the
//      existing INT section with ceremony numbers
//
// After running: delete this script. It's a snapshot-in-time migration.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');

let src = fs.readFileSync(MOVIES_PATH, 'utf8');

// ---------------------------------------------------------------------------
// CUTS — pre-1970 bloat (100 films)
// ---------------------------------------------------------------------------

const CUTS = [
  // Pre-1940 (20: includes Intolerance added per user review)
  'intolerance-1916', 'nanook-of-the-north-1922', 'the-kid-1921',
  'the-thief-of-bagdad-1924', 'body-and-soul-1925', 'the-freshman-1925',
  'lonesome-1928', 'the-cameraman-1928', 'the-docks-of-new-york-1928',
  'the-last-command-1928', 'king-of-jazz-1930', 'morocco-1930',
  'scarface-1932', 'the-emperor-jones-1933', 'imitation-of-life-1934',
  'a-night-at-the-opera-1935', 'show-boat-1936', 'make-way-for-tomorrow-1937',
  'the-awful-truth-1937', 'destry-rides-again-1939', 'midnight-1939',
  'young-mr-lincoln-1939',
  // 1940s (13)
  'the-bank-dick-1940', 'dance-girl-dance-1940', 'pinocchio-1940',
  'cat-people-1942', 'bambi-1942', 'now-voyager-1942',
  'the-pride-of-the-yankees-1942', 'woman-of-the-year-1942',
  'national-velvet-1944', 'leave-her-to-heaven-1945', 'gilda-1946',
  'the-naked-city-1948', 'adams-rib-1949',
  // 1950s (22)
  'cinderella-1950', 'winchester-73-1950', 'miracle-in-milan-1951',
  'miss-julie-1951', 'othello-1951', 'forbidden-games-1952', 'gate-of-hell-1953',
  'pickup-on-south-street-1953', 'the-war-of-the-worlds-1953',
  'dial-m-for-murder-1954', 'hobsons-choice-1954', 'journey-to-italy-1954',
  'aparajito-1956', '310-to-yuma-1957', 'a-face-in-the-crowd-1957',
  'the-incredible-shrinking-man-1957', 'witness-for-the-prosecution-1957',
  'apur-sansar-1959', 'imitation-of-life-1959', 'les-cousins-1959',
  'pickpocket-1959', 'shadows-1959',
  // 1960s (43)
  'le-trou-1960', 'a-raisin-in-the-sun-1961', 'one-eyed-jacks-1961',
  'the-hustler-1961', 'cleo-from-5-to-7-1962', 'ivans-childhood-1962',
  'charade-1963', 'contempt-1963', 'hands-over-the-city-1963',
  'shock-corridor-1963', 'the-great-escape-1963', 'winter-light-1963',
  'dry-summer-1964', 'i-am-cuba-1964', 'kwaidan-1964', 'nothing-but-a-man-1964',
  'red-desert-1964', 'woman-in-the-dunes-1964', 'alphaville-1965',
  'black-girl-1965', 'pierrot-le-fou-1965', 'red-beard-1965',
  'au-hasard-balthazar-1966', 'cul-de-sac-1966', 'daisies-1966',
  'seconds-1966', 'the-face-of-another-1966', 'war-and-peace-1966',
  'belle-de-jour-1967', 'in-cold-blood-1967', 'samurai-rebellion-1967',
  'the-young-girls-of-rochefort-1967', 'faces-1968', 'funny-girl-1968',
  'if-1968', 'monterey-pop-1968', 'the-cremator-1968',
  'army-of-shadows-1969', 'kes-1969', 'medium-cool-1969',
  'salesman-1969', 'the-color-of-pomegranates-1969', 'the-learning-tree-1969',
];

function cutLine(src, id) {
  // Match full object literal line (+ trailing newline). Anchored to start of
  // line to avoid mid-line accidents. The `id` field is required to start
  // an entry in this file.
  const re = new RegExp(`^  \\{ id: '${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',[^\\n]*\\n`, 'm');
  const before = src;
  const next = src.replace(re, '');
  if (next === before) {
    // Fallback: try without leading indent (for any odd formatting)
    const re2 = new RegExp(`^\\s*\\{ id: '${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',[^\\n]*\\n`, 'm');
    const next2 = src.replace(re2, '');
    if (next2 === before) throw new Error(`CUT FAILED: no match for id='${id}'`);
    return next2;
  }
  return next;
}

console.log(`Phase A: deleting ${CUTS.length} films...`);
for (const id of CUTS) {
  src = cutLine(src, id);
}
console.log(`  ✓ ${CUTS.length} cuts applied`);

// ---------------------------------------------------------------------------
// CONVERSIONS — ESSENTIAL -> BP nominee (32) + Citizen Kane fix (1)
// ---------------------------------------------------------------------------
// Each entry must:
//   - Insert `won: false,` (after `year: N,`)
//   - Insert `ceremony: N,` (before `category:`)
//   - Change `category: 'ESSENTIAL'` → `category: 'BP'`
//   - Drop `tier: N,`
//   - Keep `lists`, `awards`, `alsoWon` as-is
//
// Citizen Kane is already tagged `awards: [{ category: "Best Picture" }]`
// (incorrectly — Kane lost BP). Replace that award with its real win
// (Original Screenplay) and apply the standard BP-nominee transform.

const CONVERSIONS = [
  { id: 'mr-smith-goes-to-washington-1939', ceremony: 12 },
  { id: 'stagecoach-1939',                  ceremony: 12 },
  { id: 'the-wizard-of-oz-1939',            ceremony: 12 },
  { id: 'the-great-dictator-1940',          ceremony: 13 },
  { id: 'the-philadelphia-story-1940',      ceremony: 13 },
  { id: 'the-grapes-of-wrath-1940',         ceremony: 13 },
  { id: 'citizen-kane-1941',                ceremony: 14, awardsOverride: `[{ category: 'Original Screenplay', winner: 'Herman J. Mankiewicz and Orson Welles' }]` },
  { id: 'the-maltese-falcon-1941',          ceremony: 14 },
  { id: 'the-magnificent-ambersons-1942',   ceremony: 15 },
  { id: 'yankee-doodle-dandy-1942',         ceremony: 15 },
  { id: 'double-indemnity-1944',            ceremony: 17 },
  { id: 'mildred-pierce-1945',              ceremony: 18 },
  { id: 'brief-encounter-1945',             ceremony: 19 },
  { id: 'its-a-wonderful-life-1946',        ceremony: 19 },
  { id: 'miracle-on-34th-street-1947',      ceremony: 20 },
  { id: 'the-treasure-of-the-sierra-madre-1948', ceremony: 21 },
  { id: 'the-red-shoes-1948',               ceremony: 21 },
  { id: 'the-heiress-1949',                 ceremony: 22 },
  { id: 'sunset-boulevard-1950',            ceremony: 23 },
  { id: 'a-streetcar-named-desire-1951',    ceremony: 24 },
  { id: 'high-noon-1952',                   ceremony: 25 },
  { id: 'roman-holiday-1953',               ceremony: 26 },
  { id: 'shane-1953',                       ceremony: 26 },
  { id: 'the-ten-commandments-1956',        ceremony: 29 },
  { id: '12-angry-men-1957',                ceremony: 30 },
  { id: 'anatomy-of-a-murder-1959',         ceremony: 32 },
  { id: 'judgment-at-nuremberg-1961',       ceremony: 34 },
  { id: 'to-kill-a-mockingbird-1962',       ceremony: 35 },
  { id: 'dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb-1964', ceremony: 37 },
  { id: 'whos-afraid-of-virginia-woolf-1966', ceremony: 39 },
  { id: 'the-graduate-1967',                ceremony: 40 },
  { id: 'bonnie-and-clyde-1967',            ceremony: 40 },
  { id: 'butch-cassidy-and-the-sundance-kid-1969', ceremony: 42 },
];

function convertLine(src, id, ceremony, awardsOverride) {
  // Full-line match so we can rewrite precisely.
  const re = new RegExp(`^(  \\{ id: '${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',[^\\n]*)\\n`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`CONVERT FAILED: no line for id='${id}'`);
  const line = m[1];

  // Extract: title, year, genre, tier, lists (optional), awards (optional), alsoWon (optional)
  const titleM = line.match(/title: "([^"]+)"/);
  const yearM = line.match(/year: (\d+)/);
  const genreM = line.match(/genre: '([A-Z])'/);
  const listsM = line.match(/lists: (\[[^\]]*\])/);
  const alsoM = line.match(/alsoWon: (\[[^\]]*\])/);

  if (!titleM || !yearM || !genreM) {
    throw new Error(`CONVERT: missing fields in: ${line}`);
  }

  // awards: greedy-match between `awards: [` and the closing `]` that ends a top-level element.
  // Entries contain only single-level arrays of `{...}` objects so this pattern is safe:
  //   awards: [{ ... }, { ... }]
  const awardsRe = /awards: (\[[^\[\]]*(?:\{[^}]*\}[^\[\]]*)*\])/;
  const awardsM = line.match(awardsRe);
  const awards = awardsOverride ?? (awardsM ? awardsM[1] : null);

  const parts = [
    `  { id: '${id}'`,
    `title: "${titleM[1]}"`,
    `year: ${yearM[1]}`,
    `won: false`,
    `genre: '${genreM[1]}'`,
    `ceremony: ${ceremony}`,
    `category: 'BP'`,
  ];
  if (awards)  parts.push(`awards: ${awards}`);
  if (alsoM)   parts.push(`alsoWon: ${alsoM[1]}`);
  if (listsM)  parts.push(`lists: ${listsM[1]}`);
  const rebuilt = parts.join(', ') + ' },';

  return src.replace(re, rebuilt + '\n');
}

console.log(`Phase B: converting ${CONVERSIONS.length} ESSENTIAL -> BP nominees...`);
for (const { id, ceremony, awardsOverride } of CONVERSIONS) {
  src = convertLine(src, id, ceremony, awardsOverride);
}
console.log(`  ✓ ${CONVERSIONS.length} conversions applied`);

// ---------------------------------------------------------------------------
// ADDITIONS — 13 Best International Feature Film winners (1956-1990)
// ---------------------------------------------------------------------------
// Inserted in chronological order before the existing "Note: Sentimental Value"
// comment line that terminates the INT section.

const INT_ADDS = [
  { id: 'the-virgin-spring-1960',                       title: 'The Virgin Spring',                            year: 1960, genre: 'D', ceremony: 33 },
  { id: 'through-a-glass-darkly-1961',                  title: 'Through a Glass Darkly',                       year: 1961, genre: 'D', ceremony: 34 },
  { id: 'the-shop-on-main-street-1965',                 title: 'The Shop on Main Street',                      year: 1965, genre: 'W', ceremony: 38 },
  { id: 'closely-watched-trains-1966',                  title: 'Closely Watched Trains',                       year: 1966, genre: 'C', ceremony: 40 },
  { id: 'investigation-of-a-citizen-above-suspicion-1970', title: 'Investigation of a Citizen Above Suspicion', year: 1970, genre: 'T', ceremony: 43 },
  { id: 'the-garden-of-the-finzi-continis-1970',        title: 'The Garden of the Finzi-Continis',             year: 1970, genre: 'H', ceremony: 44 },
  { id: 'the-discreet-charm-of-the-bourgeoisie-1972',   title: 'The Discreet Charm of the Bourgeoisie',        year: 1972, genre: 'C', ceremony: 45 },
  { id: 'day-for-night-1973',                           title: 'Day for Night',                                year: 1973, genre: 'D', ceremony: 46 },
  { id: 'amarcord-1973',                                title: 'Amarcord',                                     year: 1973, genre: 'D', ceremony: 47 },
  { id: 'dersu-uzala-1975',                             title: 'Dersu Uzala',                                  year: 1975, genre: 'H', ceremony: 48 },
  { id: 'mephisto-1981',                                title: 'Mephisto',                                     year: 1981, genre: 'D', ceremony: 54 },
  { id: 'babettes-feast-1987',                          title: "Babette's Feast",                              year: 1987, genre: 'D', ceremony: 60 },
  { id: 'pelle-the-conqueror-1987',                     title: 'Pelle the Conqueror',                          year: 1987, genre: 'D', ceremony: 61 },
];

// Find the exact anchor: the "Note: Sentimental Value" comment inside the INT section
const INT_ANCHOR = '  // Note: Sentimental Value (2025 INT winner) is already in BP nominees above';
if (!src.includes(INT_ANCHOR)) {
  throw new Error('INT anchor line not found; INT section layout changed');
}

const intBlock = INT_ADDS
  .map(m => `  { id: '${m.id}', title: ${JSON.stringify(m.title)}, year: ${m.year}, won: true, genre: '${m.genre}', ceremony: ${m.ceremony}, category: 'INT' },`)
  .join('\n');

// Insert BEFORE the anchor so the note stays at the bottom
src = src.replace(INT_ANCHOR, intBlock + '\n' + INT_ANCHOR);
console.log(`Phase C: inserted ${INT_ADDS.length} INT winners`);

// ---------------------------------------------------------------------------
// Write back
// ---------------------------------------------------------------------------
fs.writeFileSync(MOVIES_PATH, src, 'utf8');
console.log('✓ movies.js updated');
