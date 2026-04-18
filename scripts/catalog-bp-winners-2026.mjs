// Follow-up migration: promote 18 pre-1970 Best Picture WINNERS from the
// ESSENTIALS section to category: 'BP', won: true, with ceremony number.
// Without this, the app's getOscarBadges() returns nothing for them because
// the gold statuette requires `category === 'BP' && won === true`. The
// decorative `awards: [{ category: "Best Picture" }]` marker they currently
// carry is a leftover from an earlier script — the actual source of truth
// is the category/won pair.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');

let src = fs.readFileSync(MOVIES_PATH, 'utf8');

// Each entry gets its ceremony number. The `awards` field in the current
// data often has a broken nested shape (`awards: [{ category: "Best Picture",
// awards: [...] }, ...]`) caused by an old pipeline — we clean it by taking
// only the OUTER award entries (dropping the nested `awards:` wrapper) and
// removing the decorative `{ category: "Best Picture" }` marker since that
// is now expressed via `won: true` itself. We keep Director / Actor / etc.
// wins.

const WINNERS = [
  { id: 'all-quiet-on-the-western-front-1930',  ceremony: 3  },
  { id: 'it-happened-one-night-1934',           ceremony: 7  },
  { id: 'gone-with-the-wind-1939',              ceremony: 12 },
  { id: 'rebecca-1940',                         ceremony: 13 },
  { id: 'casablanca-1942',                      ceremony: 16 },
  { id: 'the-lost-weekend-1945',                ceremony: 18 },
  { id: 'the-best-years-of-our-lives-1946',     ceremony: 19 },
  { id: 'all-about-eve-1950',                   ceremony: 23 },
  { id: 'on-the-waterfront-1954',               ceremony: 27 },
  { id: 'marty-1955',                           ceremony: 28 },
  { id: 'the-bridge-on-the-river-kwai-1957',    ceremony: 30 },
  { id: 'ben-hur-1959',                         ceremony: 32 },
  { id: 'the-apartment-1960',                   ceremony: 33 },
  { id: 'west-side-story-1961',                 ceremony: 34 },
  { id: 'lawrence-of-arabia-1962',              ceremony: 35 },
  { id: 'the-sound-of-music-1965',              ceremony: 38 },
  { id: 'in-the-heat-of-the-night-1967',        ceremony: 40 },
  { id: 'midnight-cowboy-1969',                 ceremony: 42 },
];

// Helper: balanced-bracket extraction of the `awards: [...]` value
function extractAwardsArray(line) {
  const i = line.indexOf('awards: [');
  if (i === -1) return { start: -1, end: -1, body: null };
  let depth = 0;
  for (let j = i + 'awards: '.length; j < line.length; j++) {
    const c = line[j];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return { start: i, end: j + 1, body: line.slice(i + 'awards: '.length, j + 1) };
    }
  }
  return { start: -1, end: -1, body: null };
}

// Parse and clean the awards array. Strategy: drop any `awards: [...]` found
// INSIDE an individual award entry (the broken nested shape), and drop any
// entry whose category is "Best Picture" (now encoded by won: true).
function cleanAwards(body) {
  // body is "[...]" — strip surrounding brackets
  const inner = body.slice(1, -1);
  const entries = [];
  let depth = 0;
  let cur = '';
  for (const c of inner) {
    if (c === '{') { depth++; cur += c; continue; }
    if (c === '}') { depth--; cur += c; if (depth === 0) { entries.push(cur.trim().replace(/^,/, '').trim()); cur = ''; } continue; }
    if (depth > 0) cur += c;
  }
  const cleaned = [];
  for (let e of entries) {
    // Strip nested `, awards: [...]` inside the entry
    const nested = e.indexOf(', awards: [');
    if (nested !== -1) {
      let d = 0;
      let k;
      for (k = nested + ', awards: '.length; k < e.length; k++) {
        if (e[k] === '[') d++;
        else if (e[k] === ']') { d--; if (d === 0) { k++; break; } }
      }
      e = e.slice(0, nested) + e.slice(k);
    }
    // Drop the "Best Picture" decorative entry
    if (/category:\s*"Best Picture"\s*}$/.test(e) || /^\{\s*category:\s*"Best Picture"\s*}$/.test(e.trim())) continue;
    cleaned.push(e);
  }
  return '[' + cleaned.join(', ') + ']';
}

function promoteWinner(src, id, ceremony) {
  const re = new RegExp(`^(  \\{ id: '${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',[^\\n]*)\\n`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`PROMOTE: no line for id='${id}'`);
  const line = m[1];

  const titleM = line.match(/title: "([^"]+)"/);
  const yearM = line.match(/year: (\d+)/);
  const genreM = line.match(/genre: '([A-Z])'/);
  const listsM = line.match(/lists: (\[[^\]]*\])/);
  const alsoM = line.match(/alsoWon: (\[[^\]]*\])/);

  if (!titleM || !yearM || !genreM) throw new Error(`PROMOTE: missing fields in ${line}`);

  const { body: awardsRaw } = extractAwardsArray(line);
  const awards = awardsRaw ? cleanAwards(awardsRaw) : null;

  const parts = [
    `  { id: '${id}'`,
    `title: "${titleM[1]}"`,
    `year: ${yearM[1]}`,
    `won: true`,
    `genre: '${genreM[1]}'`,
    `ceremony: ${ceremony}`,
    `category: 'BP'`,
  ];
  if (awards && awards !== '[]') parts.push(`awards: ${awards}`);
  if (alsoM) parts.push(`alsoWon: ${alsoM[1]}`);
  if (listsM) parts.push(`lists: ${listsM[1]}`);

  return src.replace(re, parts.join(', ') + ' },\n');
}

console.log(`Promoting ${WINNERS.length} pre-1970 BP winners...`);
for (const { id, ceremony } of WINNERS) {
  src = promoteWinner(src, id, ceremony);
}

fs.writeFileSync(MOVIES_PATH, src, 'utf8');
console.log('✓ movies.js updated');
