// Apply the catalog migration to src/data/movies.js:
//  1. Cut 94 films (by id)
//  2. Add 58 new ESSENTIAL entries
//  3. Update `lists` and `tier` fields on all remaining films using R2 + memo overrides
//
// Strategy: in-place regex edits on the file, preserving awards/won/ceremony/etc.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const LISTS_PATH = path.resolve(__dirname, 'canon-lists/lists.json');
const ALIASES_PATH = path.resolve(__dirname, 'canon-lists/title-aliases.json');

// === Aliases/normalize (same as diff script) ===
function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/^(the|a|an) /i, '')
    .replace(/&/g, 'and').replace(/:/g, '').replace(/colou?r/g, 'color')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const aliasesRaw = JSON.parse(fs.readFileSync(ALIASES_PATH, 'utf8'));
const ALIASES = new Map();
for (const [from, to] of Object.entries(aliasesRaw)) {
  if (from.startsWith('_')) continue;
  ALIASES.set(normalize(from), normalize(to));
}
function aliasedNorm(t) { const n = normalize(t); return ALIASES.get(n) || n; }

// === Load lists + build filmMap (with same scrape-gap patches) ===
const lists = JSON.parse(fs.readFileSync(LISTS_PATH, 'utf8'));
function parseE(s) { const m = s.match(/^(.*)\s*\((\d{4})\)\s*$/); return m ? { title: m[1].trim(), year: parseInt(m[2]) } : null; }
const parsed = {};
for (const code of Object.keys(lists)) {
  if (code.startsWith('_')) continue;
  parsed[code] = lists[code].map(parseE).filter(Boolean);
}
const SCRAPE_GAP_PATCHES = [
  ['Vertigo', 1958, 'RT'],
  ['2001: A Space Odyssey', 1968, 'RT'],
  ['2001: A Space Odyssey', 1968, 'IMDB'],
  ['Rashomon', 1950, 'FEST'],
];
const filmMap = new Map();
for (const [code, entries] of Object.entries(parsed)) {
  for (const e of entries) {
    const key = `${aliasedNorm(e.title)}|${e.year}`;
    if (!filmMap.has(key)) filmMap.set(key, { title: e.title, year: e.year, lists: new Set() });
    filmMap.get(key).lists.add(code);
  }
}
for (const [title, year, code] of SCRAPE_GAP_PATCHES) {
  const key = `${aliasedNorm(title)}|${year}`;
  if (!filmMap.has(key)) filmMap.set(key, { title, year, lists: new Set() });
  filmMap.get(key).lists.add(code);
}
// ±1 year merge for same title
{
  const byTitle = new Map();
  for (const [key, entry] of filmMap) {
    const t = aliasedNorm(entry.title);
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t).push({ key, entry });
  }
  for (const [t, list] of byTitle) {
    if (list.length <= 1) continue;
    list.sort((a, b) => a.entry.year - b.entry.year);
    for (let i = 0; i < list.length - 1; i++) {
      const cur = list[i], next = list[i + 1];
      if (next.entry.year - cur.entry.year <= 1) {
        for (const c of next.entry.lists) cur.entry.lists.add(c);
        filmMap.delete(next.key);
        list[i + 1] = cur;
      }
    }
  }
}

function listsForFilm(title, year) {
  const key = `${aliasedNorm(title)}|${year}`;
  let entry = filmMap.get(key);
  if (!entry) {
    for (let dy = -1; dy <= 1; dy++) {
      const alt = `${aliasedNorm(title)}|${year + dy}`;
      if (filmMap.has(alt)) { entry = filmMap.get(alt); break; }
    }
  }
  return entry ? [...entry.lists].sort() : [];
}

// === R2 raw score + 5-tier bucket ===
function r2raw(lists, oscarPip) {
  const ls = new Set(lists);
  let count = oscarPip;
  const hasUS = ls.has('NFR') || ls.has('AFI');
  if (hasUS) count += 1;
  for (const c of ls) if (c !== 'NFR' && c !== 'AFI') count += 1;
  return count;
}
function bucket5(raw) {
  if (raw <= 2) return 1;     // Canonical
  if (raw === 3) return 2;    // Acclaimed
  if (raw === 4) return 3;    // Landmark
  if (raw === 5) return 4;    // Masterwork
  return 5;                    // Apex (raw 6+)
}

// === Manual overrides (from memo, user-approved) ===
// Promotions to Apex (tier 5)
const APEX_IDS = new Set([
  'casablanca-1942','12-angry-men-1957','dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb-1964',
  'the-godfather-1972','the-godfather-part-ii-1974','apocalypse-now-1979','raging-bull-1980',
  'goodfellas-1990','pulp-fiction-1994','parasite-2019',
  'citizen-kane-1941','seven-samurai-1954','vertigo-1958','2001-a-space-odyssey-1968',
  'the-third-man-1949','the-silence-of-the-lambs-1991',
]);
// Promotions from T4 to T5 (Masterwork)
const PROMOTE_TO_MASTERWORK = new Set([
  'sunset-boulevard-1950','north-by-northwest-1959','the-apartment-1960',
  'lawrence-of-arabia-1962','do-the-right-thing-1989','come-and-see-1985',
]);
// Demotions from T5 to T4
const DEMOTE_FROM_MASTERWORK = new Set([
  'the-grand-budapest-hotel-2014','the-pianist-2002','before-sunrise-1995',
  'the-ascent-1977','ordet-1955','all-that-jazz-1979',
]);
// Promotions from T3 to T4 (Landmark)
const PROMOTE_TO_LANDMARK = new Set([
  'notorious-1946','persona-1966','the-exorcist-1973','the-shining-1980',
  'blade-runner-1982','toy-story-1995','fargo-1996','the-matrix-1999',
  'in-the-mood-for-love-2000','mulholland-drive-2001',
]);
// Demotions from T4 to T3
const DEMOTE_FROM_LANDMARK = new Set([
  'the-father-2020','good-will-hunting-1997','dead-poets-society-1989',
  'the-lord-of-the-rings-the-two-towers-2002','finding-nemo-2003','whiplash-2014',
]);
// Demotions from Apex to Masterwork — films with R2 raw 6 that memo moved to T5 (Masterwork)
// Explicitly: Modern Times, Double Indemnity, All About Eve, Battle of Algiers, Chinatown
// (Third Man and Silence of the Lambs stay in Apex per user)
const DEMOTE_FROM_APEX = new Set([
  'modern-times-1936','double-indemnity-1944','all-about-eve-1950',
  'the-battle-of-algiers-1966','chinatown-1974',
]);

function computeTier(id, baseListsCount, oscarPip) {
  if (APEX_IDS.has(id)) return 5;
  const raw = r2raw(baseListsCount.lists || baseListsCount, oscarPip);
  let tier = bucket5(raw);
  if (DEMOTE_FROM_APEX.has(id)) tier = Math.min(tier, 4);
  if (PROMOTE_TO_MASTERWORK.has(id)) tier = Math.max(tier, 4);
  if (DEMOTE_FROM_MASTERWORK.has(id)) tier = Math.min(tier, 3);
  if (PROMOTE_TO_LANDMARK.has(id)) tier = Math.max(tier, 3);
  if (DEMOTE_FROM_LANDMARK.has(id)) tier = Math.min(tier, 2);
  return tier;
}

// === Cuts (by master id) ===
const CUT_IDS = new Set([
  // Rule-C essential drops + manual extras + pre-1970 BP cuts + user-skip-list
]);
// Load from the diff CSV — simpler
const csv = fs.readFileSync(path.join(process.env.HOME, 'Downloads/oj-diff-vs-master.csv'), 'utf8');
const csvLines = csv.split('\n').slice(1);
for (const line of csvLines) {
  if (!line.startsWith('CUT,')) continue;
  // parse: CUT,year,title,oldCategory,lists,tier,reason
  // Title may contain quoted commas - robust parse
  const parts = [];
  let cur = '', inQuote = false;
  for (const c of line) {
    if (c === '"') inQuote = !inQuote;
    else if (c === ',' && !inQuote) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  const [_change, year, title, _oldCat] = parts;
  const slug = title.trim().replace(/^"|"$/g, '')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  CUT_IDS.add(`${slug}-${year}`);
}
// Pre-1970 BP cuts not in CSV as BP (they're ESSENTIAL on master; CSV has them with ESSENTIAL)
// Already covered by above.
console.log(`Cut IDs from CSV: ${CUT_IDS.size}`);

// === New adds metadata (genre assignments) ===
// From the 58 ADDs in CSV. Manual genre mapping.
const NEW_ADDS = [
  { title: "L'Atalante", year: 1934, genre: 'R', lists: ['CRIT','RT','SS'] },
  { title: "The Thin Man", year: 1934, genre: 'X', lists: ['AFI','NFR','RT'] },
  { title: "Grand Illusion", year: 1937, genre: 'W', lists: ['CRIT','RT','SS'] },
  { title: "The Adventures of Robin Hood", year: 1938, genre: 'N', lists: ['AFI','NFR','RT'] },
  { title: "The Shop Around the Corner", year: 1940, genre: 'R', lists: ['AFI','NFR','RT'] },
  { title: "The Killers", year: 1946, genre: 'X', lists: ['CRIT','NFR','RT'] },
  { title: "Black Narcissus", year: 1947, genre: 'D', lists: ['CRIT','RT','SS'] },
  { title: "Strangers on a Train", year: 1951, genre: 'T', lists: ['AFI','NFR','RT'] },
  { title: "Touch of Evil", year: 1958, genre: 'X', lists: ['AFI','NFR','RT','SS'] },
  { title: "The Birds", year: 1963, genre: 'T', lists: ['AFI','NFR','SS'] },
  { title: "Cool Hand Luke", year: 1967, genre: 'D', lists: ['AFI','NFR','RT'] },
  { title: "The Conformist", year: 1970, genre: 'D', lists: ['RT','SS'] },
  { title: "The Red Circle", year: 1970, genre: 'X', lists: ['CRIT','RT'] },
  { title: "Woodstock", year: 1970, genre: 'D', lists: ['NFR','RT'] },
  { title: "Dirty Harry", year: 1971, genre: 'X', lists: ['AFI','NFR'] },
  { title: "Enter the Dragon", year: 1973, genre: 'N', lists: ['CRIT','NFR'] },
  { title: "Blazing Saddles", year: 1974, genre: 'C', lists: ['AFI','NFR'] },
  { title: "Je, Tu, Il, Elle", year: 1974, genre: 'I', lists: ['CRIT','SS'] },
  { title: "The Texas Chain Saw Massacre", year: 1974, genre: 'T', lists: ['NFR','SS'] },
  { title: "Young Frankenstein", year: 1974, genre: 'C', lists: ['AFI','NFR'] },
  { title: "Carrie", year: 1976, genre: 'T', lists: ['AFI','NFR'] },
  { title: "Close Encounters of the Third Kind", year: 1977, genre: 'S', lists: ['AFI','NFR'] },
  { title: "Halloween", year: 1978, genre: 'T', lists: ['AFI','NFR','RT'] },
  { title: "Manhattan", year: 1979, genre: 'C', lists: ['AFI','NFR'] },
  { title: "Airplane!", year: 1980, genre: 'C', lists: ['AFI','NFR'] },
  { title: "Sans Soleil", year: 1982, genre: 'I', lists: ['CRIT','SS'] },
  { title: "Local Hero", year: 1983, genre: 'C', lists: ['CRIT','RT'] },
  { title: "Once Upon a Time in America", year: 1983, genre: 'X', lists: ['IMDB','SS'] },
  { title: "Videodrome", year: 1983, genre: 'T', lists: ['CRIT','SS'] },
  { title: "Blood Simple", year: 1984, genre: 'X', lists: ['AFI','CRIT'] },
  { title: "Ghostbusters", year: 1984, genre: 'C', lists: ['AFI','NFR'] },
  { title: "Stop Making Sense", year: 1984, genre: 'D', lists: ['NFR','RT'] },
  { title: "Brazil", year: 1985, genre: 'S', lists: ['CRIT','RT'] },
  { title: "Aliens", year: 1986, genre: 'S', lists: ['IMDB','RT'] },
  { title: "The Green Ray", year: 1986, genre: 'R', lists: ['FEST','SS'] },
  { title: "Full Metal Jacket", year: 1987, genre: 'W', lists: ['AFI','IMDB'] },
  { title: "The Unbearable Lightness of Being", year: 1988, genre: 'D', lists: ['AFI','CRIT'] },
  { title: "A City of Sadness", year: 1989, genre: 'H', lists: ['FEST','SS'] },
  { title: "Glory", year: 1989, genre: 'W', lists: ['AFI','NFR'] },
  { title: "Twin Peaks: Fire Walk with Me", year: 1992, genre: 'T', lists: ['CRIT','LBXD','SS'] },
  { title: "Three Colours: Red", year: 1994, genre: 'D', lists: ['CRIT','LBXD','RT'] },
  { title: "When We Were Kings", year: 1996, genre: 'D', lists: ['CRIT','RT'] },
  { title: "Happy Together", year: 1997, genre: 'R', lists: ['CRIT','SS'] },
  { title: "Flowers of Shanghai", year: 1998, genre: 'H', lists: ['CRIT','SS'] },
  { title: "The Gleaners and I", year: 2000, genre: 'D', lists: ['CRIT','SS'] },
  { title: "In Vanda's Room", year: 2000, genre: 'D', lists: ['CRIT','SS'] },
  { title: "The Fog of War", year: 2003, genre: 'D', lists: ['NFR','RT'] },
  { title: "The Wrestler", year: 2008, genre: 'D', lists: ['FEST','RT'] },
  { title: "How to Train Your Dragon", year: 2010, genre: 'A', lists: ['IMDB','RT'] },
  { title: "Uncle Boonmee Who Can Recall His Past Lives", year: 2010, genre: 'I', lists: ['FEST','SS'] },
  { title: "Blue Is the Warmest Colour", year: 2013, genre: 'R', lists: ['CRIT','FEST'] },
  { title: "Faces Places", year: 2017, genre: 'D', lists: ['CRIT','RT'] },
  { title: "Minding the Gap", year: 2018, genre: 'D', lists: ['CRIT','RT'] },
  { title: "Marcel the Shell with Shoes On", year: 2021, genre: 'A', lists: ['LBXD','RT'] },
  { title: "Petite Maman", year: 2021, genre: 'D', lists: ['CRIT','SS'] },
  { title: "Monster", year: 2023, genre: 'D', lists: ['LBXD','RT'] },
  { title: "Sing Sing", year: 2023, genre: 'D', lists: ['LBXD','RT'] },
  { title: "The Wild Robot", year: 2024, genre: 'A', lists: ['IMDB','RT'] },
];

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// === Load current MOVIES via dynamic import ===
const mod = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
const CURRENT = mod.MOVIES;
console.log(`Current branch: ${CURRENT.length} films`);

// Determine cut films actually present
const presentCutIds = new Set();
for (const m of CURRENT) if (CUT_IDS.has(m.id)) presentCutIds.add(m.id);
console.log(`Cuts present in current branch: ${presentCutIds.size}`);
const notFoundCuts = [...CUT_IDS].filter(id => !presentCutIds.has(id));
if (notFoundCuts.length > 0) console.log(`  Not found (probably different id on branch): ${notFoundCuts.join(', ')}`);

// === Now: regex-based in-place edits on the raw file ===
let src = fs.readFileSync(MOVIES_PATH, 'utf8');

// 1. Remove cut lines: find `{ id: 'X-YYYY', ... }` lines where X-YYYY in presentCutIds
let cutsRemoved = 0;
for (const id of presentCutIds) {
  // Match the whole line(s) containing this id entry, through the closing `},`
  // Simple approach: find line with `id: 'ID'` and remove that entire line
  const re = new RegExp(`^\\s*\\{\\s*id:\\s*'${id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}'[^\\n]*\\n`, 'm');
  if (re.test(src)) {
    src = src.replace(re, '');
    cutsRemoved++;
  }
}
console.log(`Cut lines removed: ${cutsRemoved}`);

// 2. Update `lists` and `tier` fields on every remaining movie line
//    Also update tier-section count headers
let listsUpdated = 0, tierUpdated = 0;
const ENTRY_RE = /^(\s*\{\s*id:\s*'([^']+)',[^\n]*\})/gm;
src = src.replace(ENTRY_RE, (match, prefix, id) => {
  const m = CURRENT.find(x => x.id === id);
  if (!m) return match; // shouldn't happen
  const newLists = listsForFilm(m.title, m.year);
  const oscarPip = (m.category==='BP'||m.category==='INT'||m.category==='ANIM')
    ? ((m.won || (m.alsoWon||[]).length>0) ? 1 : (m.category==='BP' ? 1 : 0))
    : 0;
  let edited = match;
  // Replace lists: [...]
  const listsStr = `['${newLists.join("', '")}']`;
  if (/lists:\s*\[[^\]]*\]/.test(edited)) {
    edited = edited.replace(/lists:\s*\[[^\]]*\]/, `lists: ${newLists.length ? listsStr : '[]'}`);
  } else {
    // Insert lists before closing `}`: find the last `}` and insert before it
    if (newLists.length > 0) {
      edited = edited.replace(/\s*\}\s*$/, `, lists: ${listsStr} }`);
    }
  }
  if (newLists.length > 0) listsUpdated++;
  // Replace tier: N (only on ESSENTIAL)
  if (m.category === 'ESSENTIAL' || m.category === 'ESSENTIAL_new') {
    const tier = computeTier(id, newLists, 0);
    if (/tier:\s*\d+/.test(edited)) {
      edited = edited.replace(/tier:\s*\d+/, `tier: ${tier}`);
    } else {
      // Insert tier after category: 'ESSENTIAL'
      edited = edited.replace(/category:\s*'ESSENTIAL'/, `category: 'ESSENTIAL', tier: ${tier}`);
    }
    tierUpdated++;
  }
  return edited;
});
console.log(`Lists updated: ${listsUpdated}, tier updated: ${tierUpdated}`);

// 3. Insert new adds into ESSENTIAL section.
//    Simplest placement: just before the closing `];` of MOVIES.
const newAddLines = NEW_ADDS.map(f => {
  const id = slugify(f.title) + '-' + f.year;
  const tier = computeTier(id, f.lists, 0);
  const listsStr = `['${f.lists.join("', '")}']`;
  const titleEsc = f.title.replace(/"/g, '\\"');
  return `  { id: '${id}', title: "${titleEsc}", year: ${f.year}, genre: '${f.genre}', category: 'ESSENTIAL', tier: ${tier}, lists: ${listsStr} },`;
}).join('\n');

// Insert before the `];` that closes MOVIES array (the last `];` before `export const MOVIES_BY_ID`)
const addMarker = '// ========== NEW ADDS (catalog refresh 2026) ==========';
const moviesClose = src.lastIndexOf('\n];\n\n// Lookup map');
if (moviesClose === -1) {
  // fallback: look for any `^];` before the MOVIES_BY_ID block
  const before = src.indexOf('\n];\nexport const MOVIES_BY_ID');
  if (before === -1) {
    console.error('Could not locate MOVIES array close. Aborting add insertion.');
    process.exit(1);
  }
  src = src.slice(0, before) + `\n${addMarker}\n${newAddLines}` + src.slice(before);
} else {
  src = src.slice(0, moviesClose) + `\n${addMarker}\n${newAddLines}` + src.slice(moviesClose);
}

// 4. Update the ".. 5 films .." / ".. 16 films .." headers — no longer accurate
//    Just strip their counts since they're wrong now
src = src.replace(/\/\/ ========== TIER (\d+) \(\d+ films\) ==========/g, '// ========== TIER $1 ==========');

fs.writeFileSync(MOVIES_PATH, src);
console.log(`Wrote ${MOVIES_PATH}`);

// Verify syntax
try {
  execSync(`node --check ${MOVIES_PATH}`);
  console.log('✓ Syntax check passed');
} catch (e) {
  console.log('✗ Syntax check FAILED:');
  console.log(e.stdout?.toString(), e.stderr?.toString());
  process.exit(1);
}

// Verify count
const mod2 = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + (Date.now()+1));
console.log(`Final catalog: ${mod2.MOVIES.length} films`);
const byCategory = {};
for (const m of mod2.MOVIES) byCategory[m.category] = (byCategory[m.category]||0)+1;
console.log('By category:', byCategory);

// Tier distribution for essentials
const tierDist = {};
for (const m of mod2.MOVIES) if (m.category === 'ESSENTIAL' && m.tier != null) {
  tierDist[m.tier] = (tierDist[m.tier]||0)+1;
}
console.log('Essential tier distribution:', tierDist);
