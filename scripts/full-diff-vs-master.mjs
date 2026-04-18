// Full diff analysis vs master (836 baseline).
// Produces:
//  1. Full CSV diff vs master with rich "reason" column
//  2. Tier analysis comparing multiple candidate rules
//  3. Top-tier MD under chosen rule
//
// Every film in master is classified: KEEP / CUT / (plus new ADDs).
// "Reason" column explains exactly why.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LISTS_PATH = path.resolve(__dirname, 'canon-lists/lists.json');
const ALIASES_PATH = path.resolve(__dirname, 'canon-lists/title-aliases.json');
const CSV_PATH = path.join(os.homedir(), 'Downloads', 'oj-diff-vs-master.csv');
const TIER_ANALYSIS = path.join(os.homedir(), 'Downloads', 'oj-tier-analysis.md');

// === Load master baseline (836 films) ===
const masterSrc = execSync('git show master:src/data/movies.js', { encoding: 'utf8' });
const masterTmp = '/tmp/oj-movies-master-' + Date.now() + '.mjs';
fs.writeFileSync(masterTmp, masterSrc);
const masterMod = await import(pathToFileURL(masterTmp).href);
const MASTER = masterMod.MOVIES;
fs.unlinkSync(masterTmp);
console.log(`master baseline: ${MASTER.length} films`);

// === Normalization + aliases ===
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
function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// === Load new canon lists ===
const lists = JSON.parse(fs.readFileSync(LISTS_PATH, 'utf8'));
function parseE(s) { const m = s.match(/^(.*)\s*\((\d{4})\)\s*$/); return m ? { title: m[1].trim(), year: parseInt(m[2]) } : null; }
const parsed = {};
for (const code of Object.keys(lists)) {
  if (code.startsWith('_')) continue;
  parsed[code] = lists[code].map(parseE).filter(Boolean);
}
// Scrape gap patches — films missing from list scrapes that should be there.
// These are verified by hand (e.g., Vertigo is #2 on SS 2022 and is clearly on RT
// Top 300; our scrape missed it). Adding them avoids R2 under-counting.
const SCRAPE_GAP_PATCHES = [
  // [title, year, listCode]
  ['Vertigo', 1958, 'RT'],
  ['2001: A Space Odyssey', 1968, 'RT'],
  // IMDB scraped 2001: A Space Odyssey with wrong year (2001 instead of 1968).
  // Explicitly place it at correct year.
  ['2001: A Space Odyssey', 1968, 'IMDB'],
  // Rashomon FEST: Venice Golden Lion 1951 for 1950 film — year mismatch handled
  // by the year-merge below, but explicit entry ensures correctness
  ['Rashomon', 1950, 'FEST'],
];

// filmMap: aliased-norm-title|year → { title, year, lists:Set }
const filmMap = new Map();
for (const [code, entries] of Object.entries(parsed)) {
  for (const e of entries) {
    const key = `${aliasedNorm(e.title)}|${e.year}`;
    if (!filmMap.has(key)) filmMap.set(key, { title: e.title, year: e.year, lists: new Set() });
    filmMap.get(key).lists.add(code);
  }
}
// Apply scrape gap patches
for (const [title, year, code] of SCRAPE_GAP_PATCHES) {
  const key = `${aliasedNorm(title)}|${year}`;
  if (!filmMap.has(key)) filmMap.set(key, { title, year, lists: new Set() });
  filmMap.get(key).lists.add(code);
}
// Merge ±1 year duplicates for same aliased title. Important for films whose
// festival year differs from release year (e.g. Rashomon 1950 film, 1951 FEST).
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
    // Merge adjacent entries within 1 year
    for (let i = 0; i < list.length - 1; i++) {
      const cur = list[i], next = list[i + 1];
      if (next.entry.year - cur.entry.year <= 1) {
        for (const c of next.entry.lists) cur.entry.lists.add(c);
        filmMap.delete(next.key);
        list[i + 1] = cur; // so chains continue merging
      }
    }
  }
}

// Master catalog lookup
const masterByKey = new Map(), masterByTitle = new Map();
for (const m of MASTER) {
  masterByKey.set(`${aliasedNorm(m.title)}|${m.year}`, m);
  const tk = aliasedNorm(m.title);
  if (!masterByTitle.has(tk)) masterByTitle.set(tk, []);
  masterByTitle.get(tk).push(m);
}
function findInMaster(title, year) {
  const k = `${aliasedNorm(title)}|${year}`;
  if (masterByKey.has(k)) return masterByKey.get(k);
  for (let dy = -1; dy <= 1; dy++) {
    const alt = `${aliasedNorm(title)}|${year + dy}`;
    if (masterByKey.has(alt)) return masterByKey.get(alt);
  }
  const cs = masterByTitle.get(aliasedNorm(title));
  if (cs && cs.length === 1) return cs[0];
  return null;
}

// === Compute new canon lists for each master film ===
function newListsFor(m) {
  const key = `${aliasedNorm(m.title)}|${m.year}`;
  let entry = filmMap.get(key);
  if (!entry) {
    for (let dy = -1; dy <= 1; dy++) {
      const alt = `${aliasedNorm(m.title)}|${m.year + dy}`;
      if (filmMap.has(alt)) { entry = filmMap.get(alt); break; }
    }
  }
  return entry ? [...entry.lists].sort() : [];
}

// === Decision lists (from prior handoff + user adjustments) ===
// Manual skip adds — don't add these even if they qualify
const MANUAL_SKIP_ADDS_NORM = new Set([
  // Adjusted: added Butch Cassidy (user flagged weak)
  aliasedNorm('Butch Cassidy and the Sundance Kid'),
  // post-1930s borderline bloat
  aliasedNorm('Morocco'),
  aliasedNorm('The Awful Truth'),
  aliasedNorm('Now Voyager'),
  aliasedNorm('Woman of the Year'),
  aliasedNorm('A Raisin in the Sun'),
  aliasedNorm('An Autumn Afternoon'),
  aliasedNorm('Red Desert'),
  aliasedNorm('Woman in the Dunes'),
  aliasedNorm('I Am Cuba'),
  aliasedNorm('The Young Girls of Rochefort'),
  aliasedNorm('Funny Girl'),
  aliasedNorm('Salesman'),
  // pre-1930s strict
  aliasedNorm('Intolerance'),
  aliasedNorm('The Kid'),
  aliasedNorm('The Freshman'),
  aliasedNorm('The Cameraman'),
]);

// Approved bloat skips — folded into MANUAL_SKIP_ADDS_NORM. No longer rendered separately.
const APPROVED_BLOAT_SKIPS = [
  'Hamilton','Spider-Man: No Way Home','Catch Me If You Can','Monsters Inc',
  'Harry Potter and the Deathly Hallows Part 2','Stand and Deliver','Fame',
  'Dirty Dancing','Karate Kid','Beverly Hills Cop','Grease','Philadelphia',
  'Soleil O','Sambizanga','News From Home','India Song','Tongues Untied',
  'Lost in America','Hotel Rwanda',
];
for (const t of APPROVED_BLOAT_SKIPS) MANUAL_SKIP_ADDS_NORM.add(aliasedNorm(t));

// Additional trims — per user: only Shampoo, rest reverted to keep.
const EXTRA_ADD_TRIMS = [
  ['Shampoo', 'AFI+CRIT only; minor Ashby, narrow canon reach'],
];
const EXTRA_TRIMS_NORM = new Map(EXTRA_ADD_TRIMS.map(([t,r])=>[aliasedNorm(t),r]));
// Spare essentials from rule-C drop (data-bug saves + user keeps)
const MANUAL_SPARE_IDS = new Set([
  'rome-open-city-1945',
  'the-earrings-of-madame-de-1953',
  'kagemusha-1980',
  'my-neighbor-totoro-1988',
  'le-samourai-1967',
  'se7en-1995',
  'return-of-the-jedi-1983',
]);
// Extra hand-curated essential cuts
const MANUAL_EXTRA_CUT_IDS = new Map([
  ['the-passion-of-joan-of-arc-1928', 'hand-curated cut (pre-1930s strict stance)'],
  // Pre-1970 additional cuts (AFI+NFR-only weak canon signal)
  ['little-caesar-1931', 'early gangster film; only AFI+NFR, duplicated by Public Enemy era'],
  ['the-public-enemy-1931', 'early gangster film; only AFI+NFR, weak canon footprint'],
  ['a-night-at-the-opera-1935', 'Marx Bros; only AFI+NFR, weak critical canon'],
  ['the-pride-of-the-yankees-1942', 'sports biopic; only AFI+NFR, narrow canon'],
  ['national-velvet-1944', 'family melodrama; only AFI+NFR, narrow canon'],
  ['adams-rib-1949', 'minor Tracy/Hepburn rom-com; only AFI+NFR'],
  // User's original skip list — films that should not be in catalog per handoff,
  // but were silently kept because they already existed in master and either passed
  // rule C under new scrape OR were protected by AFI/SS/CRIT membership.
  ['intolerance-1916', 'user skip list: pre-1930s strict stance'],
  ['the-kid-1921', 'user skip list: pre-1930s strict stance'],
  ['the-freshman-1925', 'user skip list: pre-1930s strict stance'],
  ['the-cameraman-1928', 'user skip list: pre-1930s strict stance'],
  ['morocco-1930', 'user skip list: borderline bloat'],
  ['the-awful-truth-1937', 'user skip list: borderline bloat'],
  ['now-voyager-1942', 'user skip list: borderline bloat'],
  ['woman-of-the-year-1942', 'user skip list: borderline bloat'],
  ['a-raisin-in-the-sun-1961', 'user skip list: borderline bloat'],
  ['red-desert-1964', 'user skip list: borderline bloat'],
  ['woman-in-the-dunes-1964', 'user skip list: borderline bloat'],
  ['i-am-cuba-1964', 'user skip list: borderline bloat'],
  ['the-young-girls-of-rochefort-1967', 'user skip list: borderline bloat'],
  ['funny-girl-1968', 'user skip list: borderline bloat'],
  ['salesman-1969', 'user skip list: borderline bloat'],
]);
// Pre-1970 BP films user decided to CUT (C-split: cut weaker AFI-only films)
// KEEP: West Side Story, Lost Weekend (winners), Bonnie and Clyde, Streetcar,
//       High Noon, Roman Holiday, Shane (per C-split minus Butch)
// CUT: Yankee Doodle Dandy, Mildred Pierce, Miracle on 34th Street, The Heiress,
//      The Ten Commandments, Butch Cassidy
const PRE70_BP_CUT_IDS = new Set([
  'yankee-doodle-dandy-1942',
  'mildred-pierce-1945',
  'miracle-on-34th-street-1947',
  'the-heiress-1949',
  'the-ten-commandments-1956',
  'butch-cassidy-and-the-sundance-kid-1969',
]);

const SS_SET = new Set(parsed.SS.map(e => aliasedNorm(e.title)));
const AFI_ORIG_SET = new Set(parsed.AFI.map(e => aliasedNorm(e.title)));

// === Classify every master film ===
const decisions = []; // { change, id, title, year, oldCategory, newLists, tier, reason }

for (const m of MASTER) {
  const nLists = newListsFor(m);
  const tier = nLists.length + oscarPip(m);
  const base = { id: m.id, title: m.title, year: m.year, oldCategory: m.category, won: m.won, newLists: nLists, tier, alsoWon: m.alsoWon };

  // Pre-1970 BP films user decided to CUT — these are ESSENTIAL on master but
  // were promoted to BP on this branch. User wants them removed entirely.
  // Override AFI/NFR protection that would otherwise keep them.
  if (PRE70_BP_CUT_IDS.has(m.id)) {
    decisions.push({ ...base, change: 'CUT', reason: `pre-1970 BP nominee cut: only on ${nLists.join('+')||'(none)'}; user decided BP nominees need 3+ canon lists OR be BP winners` });
    continue;
  }

  // Essentials promoted to BP on this branch — category change, still in catalog
  const PRE70_BP_KEEP_IDS = new Set([
    'west-side-story-1961','the-lost-weekend-1945','bonnie-and-clyde-1967',
    'a-streetcar-named-desire-1951','high-noon-1952','roman-holiday-1953','shane-1953',
  ]);
  if (PRE70_BP_KEEP_IDS.has(m.id)) {
    decisions.push({ ...base, change: 'RECLASSIFY', reason: `essential → BP nominee (pre-1970 BP promotion; Oscar status + ${nLists.join('+')||'no canon'} retained)` });
    continue;
  }

  // BP winner essentials promoted to BP category (18 pre-1970 BP winners per commit 5962569)
  // Detect via: has Oscar awards and is an actual BP winner (we'll check by name)
  const PRE70_BP_WINNERS_PROMOTED = new Set([
    'wings-1927','the-broadway-melody-1929','all-quiet-on-the-western-front-1930',
    'cimarron-1931','grand-hotel-1932','cavalcade-1933','it-happened-one-night-1934',
    'mutiny-on-the-bounty-1935','the-great-ziegfeld-1936','the-life-of-emile-zola-1937',
    'you-cant-take-it-with-you-1938','gone-with-the-wind-1939','rebecca-1940',
    'how-green-was-my-valley-1941','mrs-miniver-1942','casablanca-1942',
    'going-my-way-1944','the-best-years-of-our-lives-1946','gentlemans-agreement-1947',
    'hamlet-1948','all-the-kings-men-1949',
  ]);
  if (PRE70_BP_WINNERS_PROMOTED.has(m.id)) {
    decisions.push({ ...base, change: 'RECLASSIFY', reason: `essential → BP winner (pre-1970 BP winner promotion, retains ${nLists.join('+')||'no canon lists'})` });
    continue;
  }

  // BP/INT/ANIM films: always kept
  if (m.category !== 'ESSENTIAL') {
    decisions.push({ ...base, change: 'KEEP', reason: `${m.category}${m.won?' winner':' nom'} — Oscar-category films retained` });
    continue;
  }

  // Essentials: apply rule C
  if (MANUAL_EXTRA_CUT_IDS.has(m.id)) {
    decisions.push({ ...base, change: 'CUT', reason: MANUAL_EXTRA_CUT_IDS.get(m.id) });
    continue;
  }
  if (MANUAL_SPARE_IDS.has(m.id)) {
    decisions.push({ ...base, change: 'KEEP', reason: `manual spare (${m.id==='se7en-1995'||m.id==='return-of-the-jedi-1983'?'user explicit keep':'data-bug save / matching miss'})` });
    continue;
  }
  const threshold = m.year < 1970 ? 3 : 2;
  if (nLists.length >= threshold) {
    decisions.push({ ...base, change: 'KEEP', reason: `passes rule C: ${nLists.length}-of-8 lists (${nLists.join('+')}), threshold ${threshold} for year ${m.year}` });
    continue;
  }
  // Doesn't pass rule — check protections
  const isIntAnim = (m.alsoWon || []).some(x => x === 'INT' || x === 'ANIM');
  const isOnSS = nLists.includes('SS') || SS_SET.has(aliasedNorm(m.title));
  const isOnAfi = nLists.includes('AFI') || AFI_ORIG_SET.has(aliasedNorm(m.title));
  if (isIntAnim) {
    decisions.push({ ...base, change: 'KEEP', reason: `protected: INT/ANIM alsoWon` });
    continue;
  }
  if (isOnSS) {
    decisions.push({ ...base, change: 'KEEP', reason: `protected: on Sight & Sound 2022` });
    continue;
  }
  if (isOnAfi) {
    decisions.push({ ...base, change: 'KEEP', reason: `protected: on AFI 100` });
    continue;
  }
  // Dropped
  decisions.push({ ...base, change: 'CUT', reason: `rule-C drop: only ${nLists.length} list(s) (${nLists.join('+')||'none'}), threshold ${threshold} for year ${m.year}; not on SS/AFI/INT/ANIM` });
}

function oscarPip(m) {
  const isWin = (m.category==='BP'||m.category==='INT'||m.category==='ANIM') && m.won;
  const isBPnom = m.category==='BP' && !m.won;
  const isAlso = (m.alsoWon||[]).length > 0;
  return (isWin || isAlso || isBPnom) ? 1 : 0;
}

// === ADDs: films in canon not in master AND not already in current branch ===
// Current branch has INT adds (13) + BP promotions that aren't in master.
// We load it to prevent duplicate ADDs.
const currentModForDedup = await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href + '?t=' + Date.now() + 'a');
const CURRENT_DEDUP = currentModForDedup.MOVIES;
const currentByKey = new Map(), currentByTitle = new Map();
for (const m of CURRENT_DEDUP) {
  currentByKey.set(`${aliasedNorm(m.title)}|${m.year}`, m);
  const tk = aliasedNorm(m.title);
  if (!currentByTitle.has(tk)) currentByTitle.set(tk, []);
  currentByTitle.get(tk).push(m);
}
function findInCurrent(title, year) {
  const k = `${aliasedNorm(title)}|${year}`;
  if (currentByKey.has(k)) return currentByKey.get(k);
  for (let dy = -1; dy <= 1; dy++) {
    const alt = `${aliasedNorm(title)}|${year + dy}`;
    if (currentByKey.has(alt)) return currentByKey.get(alt);
  }
  const cs = currentByTitle.get(aliasedNorm(title));
  if (cs && cs.length === 1) return cs[0];
  return null;
}

const adds = [];
const bloatProposals = [];
const seen = new Set();
for (const f of filmMap.values()) {
  if (findInMaster(f.title, f.year)) continue;
  if (findInCurrent(f.title, f.year)) continue; // dedup against current branch
  const threshold = f.year < 1970 ? 3 : 2;
  if (f.lists.size < threshold) continue;
  const nTitle = aliasedNorm(f.title);
  if (MANUAL_SKIP_ADDS_NORM.has(nTitle)) continue;
  const k = `${nTitle}|${f.year}`;
  if (seen.has(k)) continue;
  seen.add(k);
  const listArr = [...f.lists].sort();
  const isTrim = EXTRA_TRIMS_NORM.has(nTitle);
  const bucket = isTrim ? bloatProposals : adds;
  bucket.push({
    change: isTrim ? 'ADD_TRIM_PROPOSED' : 'ADD',
    id: `${slug(f.title)}-${f.year}`,
    title: f.title,
    year: f.year,
    oldCategory: '-',
    newLists: listArr,
    tier: listArr.length,
    reason: isTrim
      ? `PROPOSED EXTRA TRIM (${listArr.join('+')}): ${EXTRA_TRIMS_NORM.get(nTitle)}`
      : `new essential: qualifies ${listArr.length}-of-8 lists (${listArr.join('+')}), threshold ${threshold} for year ${f.year}`,
  });
}

// === INT films added on this branch (in current branch but not in master) ===
// Load current branch for INT comparison
const currentMod = await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href + '?t=' + Date.now());
const CURRENT = currentMod.MOVIES;
const masterIds = new Set(MASTER.map(m => m.id));
const intAddsFromBranch = CURRENT.filter(m => m.category === 'INT' && !masterIds.has(m.id));
console.log(`\nINT films added on branch (not in master): ${intAddsFromBranch.length}`);
for (const f of intAddsFromBranch.sort((a,b)=>a.year-b.year)) {
  console.log(`  ${f.year} ${f.title}`);
}
// These become RECLASSIFY/ADD rows
const intAddRows = intAddsFromBranch.map(m => {
  const nLists = newListsFor(m);
  return {
    change: 'ADD_INT',
    id: m.id, title: m.title, year: m.year, oldCategory: '-',
    newLists: nLists, tier: nLists.length + 1,
    reason: `International Feature winner backfill (ceremony ${m.ceremony}); canon lists: ${nLists.join('+')||'none'}`
  };
});

// === Summary by bucket ===
const cuts = decisions.filter(d => d.change === 'CUT');
const keeps = decisions.filter(d => d.change === 'KEEP');
console.log(`\nDecisions vs master (836):`);
console.log(`  KEEP: ${keeps.length}`);
console.log(`  CUT:  ${cuts.length}`);
console.log(`  ADD:  ${adds.length}`);
console.log(`  Projected final: ${keeps.length + adds.length}`);

// Cut breakdown
const cutByCategory = {};
for (const c of cuts) {
  const key = c.oldCategory === 'BP' ? (c.year < 1970 ? 'BP pre-1970 (user cut)' : 'BP')
    : c.oldCategory;
  cutByCategory[key] = (cutByCategory[key]||0)+1;
}
console.log('\nCuts by origin category:', cutByCategory);

// Pre-1970 BP cuts detail
const pre70BPcuts = cuts.filter(c => c.oldCategory === 'BP' && c.year < 1970);
console.log(`\nPre-1970 BP cuts (${pre70BPcuts.length}):`);
for (const c of pre70BPcuts.sort((a,b)=>a.year-b.year)) {
  console.log(`  ${c.year} ${c.title} — ${c.newLists.join('+')||'(no canon lists)'}`);
}

// INT films in adds
const intAdds = adds.filter(a => {
  // INT films that come from festival winners lists — detect by presence of FEST + non-US lists
  // but this is ADDs, not INT category. Show foreign-language additions via SS/FEST heuristic.
  return false; // will list separately below
});

// Non-English additions (films from festival scrapes or SS non-anglo entries) — rough heuristic by list
const festHeavy = adds.filter(a => a.newLists.includes('FEST') && !a.newLists.includes('AFI') && !a.newLists.includes('NFR'));
console.log(`\nLikely international-flavored adds (FEST without AFI/NFR, n=${festHeavy.length}):`);
for (const a of festHeavy.sort((x,y)=>x.year-y.year).slice(0,40)) {
  console.log(`  ${a.year} ${a.title} [${a.newLists.join('+')}]`);
}

// === Write combined CSV ===
const csvRows = [['Change','Year','Title','OldCategory','NewLists','NewTier','Reason']];
const reclassifies = decisions.filter(d => d.change === 'RECLASSIFY');
const allChanges = [...cuts, ...reclassifies, ...intAddRows, ...adds, ...bloatProposals]
  .sort((a,b) => {
    const order = { CUT: 0, RECLASSIFY: 1, ADD_INT: 2, ADD: 3, ADD_TRIM_PROPOSED: 4 };
    return order[a.change] - order[b.change] || a.year - b.year || a.title.localeCompare(b.title);
  });
for (const d of allChanges) {
  csvRows.push([d.change, d.year, d.title, d.oldCategory, (d.newLists||[]).join('+'), d.tier || '', d.reason]);
}
// Also write keeps summary to a separate section? No — just cuts/adds per user request.
function csvEscape(s) {
  s = String(s);
  if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
fs.writeFileSync(CSV_PATH, csvRows.map(r => r.map(csvEscape).join(',')).join('\n'));
console.log(`\nCSV: ${CSV_PATH} (${allChanges.length} rows)`);

// === TIER ANALYSIS: multiple candidate rules ===
// All projected films = kept + reclassified-to-BP + adds
const projected = [];
for (const d of keeps) {
  const m = MASTER.find(x => x.id === d.id);
  projected.push({
    title: m.title, year: m.year, category: m.category, won: m.won, alsoWon: m.alsoWon,
    newLists: d.newLists,
    oscarPip: oscarPip(m),
  });
}
// RECLASSIFY films: get new BP category + OSCAR pip.
// The 20 BP-winner promotions get oscarPip=1 (winner); the 7 BP-nominee promotions get oscarPip=1 (BP nom).
// Need to detect which — use the ID sets used in classification.
const BP_WINNER_IDS_PROMOTED = new Set([
  'wings-1927','the-broadway-melody-1929','all-quiet-on-the-western-front-1930',
  'cimarron-1931','grand-hotel-1932','cavalcade-1933','it-happened-one-night-1934',
  'mutiny-on-the-bounty-1935','the-great-ziegfeld-1936','the-life-of-emile-zola-1937',
  'you-cant-take-it-with-you-1938','gone-with-the-wind-1939','rebecca-1940',
  'how-green-was-my-valley-1941','mrs-miniver-1942','casablanca-1942',
  'going-my-way-1944','the-best-years-of-our-lives-1946','gentlemans-agreement-1947',
  'hamlet-1948','all-the-kings-men-1949',
]);
for (const d of reclassifies) {
  const m = MASTER.find(x => x.id === d.id);
  const isWinner = BP_WINNER_IDS_PROMOTED.has(d.id);
  projected.push({
    title: m.title, year: m.year,
    category: 'BP', won: isWinner, alsoWon: m.alsoWon,
    newLists: d.newLists,
    oscarPip: 1, // BP winner OR BP nominee both contribute 1 to tier
  });
}
// Add the 13 INT backfill films
for (const r of intAddRows) {
  projected.push({
    title: r.title, year: r.year,
    category: 'INT', won: true, alsoWon: [],
    newLists: r.newLists,
    oscarPip: 1,
  });
}
for (const a of adds) {
  projected.push({
    title: a.title, year: a.year, category: 'ESSENTIAL_new', won: false, alsoWon: [],
    newLists: a.newLists, oscarPip: 0,
  });
}

// Rule R1: current — raw = listCount + oscarPip; tier5 = raw ≥ 6
function r1(f) { return f.newLists.length + f.oscarPip; }
// Rule R2: merge NFR+AFI into "US-canon" = 1 point combined
function r2(f) {
  const ls = new Set(f.newLists);
  let count = f.oscarPip;
  const hasUS = ls.has('NFR') || ls.has('AFI');
  if (hasUS) count += 1;
  for (const code of ls) if (code !== 'NFR' && code !== 'AFI') count += 1;
  return count;
}
// Rule R3: require modern peer review for tier 5 — weighted scoring
//   SS=2, LBXD=1.5, IMDB=1, RT=1, AFI=1, NFR=0.5, CRIT=0.5, FEST=1, OSCAR=1
function r3(f) {
  const w = { SS: 2, LBXD: 1.5, IMDB: 1, RT: 1, AFI: 1, NFR: 0.5, CRIT: 0.5, FEST: 1 };
  let s = f.oscarPip;
  for (const c of f.newLists) s += (w[c] || 0);
  return s;
}
// Rule R4: R2 + require at least one "modern peer" list (SS/LBXD/IMDB/RT) for tier 5
function r4(f) {
  const raw = r2(f);
  const hasPeer = f.newLists.some(c => c === 'SS' || c === 'LBXD' || c === 'IMDB' || c === 'RT');
  return { raw, eligible5: hasPeer };
}
// Rule R5: raw score uses "source-type buckets" — each bucket counts once
//   US-canon (AFI, NFR) → 1
//   Popular/audience (IMDB, LBXD, RT) → 1 each (max 3)... actually let's keep IMDB+LBXD+RT separate
//   Critical (SS) → 1
//   Curation (CRIT) → 1
//   Festival (FEST) → 1
//   Oscar pip → 1
// So raw max = 1 (US) + 3 (pop) + 1 (SS) + 1 (CRIT) + 1 (FEST) + 1 (OSCAR) = 8
// Same as R2. Tier 5 threshold: raw ≥ 6 AND has at least one of {SS, FEST, CRIT}
// (i.e. prestige-validated, not just popular + American-institutional).
function r5(f) {
  const raw = r2(f);
  const hasPrestige = f.newLists.some(c => c === 'SS' || c === 'FEST' || c === 'CRIT');
  return { raw, eligible5: hasPrestige };
}
// Rule R6: R2 with tier 5 at raw ≥ 5 (lower threshold since merging NFR+AFI tightens already)
// This gets a broader tier 5 than R2 but still excludes pure-NFR+AFI films.

function bucket15(raw) {
  if (raw < 2) return 1; if (raw === 2) return 2; if (raw === 3) return 3;
  if (raw <= 5) return 4; return 5;
}
// Bucketing for R6: raw 5+ = tier 5
function bucket15_r6(raw) {
  if (raw < 2) return 1; if (raw === 2) return 2; if (raw === 3) return 3;
  if (raw === 4) return 4; return 5;
}
// 7-tier bucketing under R2 raw scores (0-8)
//   tier 1: raw 0-1    (no / single-list)
//   tier 2: raw 2      (below essential threshold for post-1970)
//   tier 3: raw 3      (canonical)
//   tier 4: raw 4      (strong)
//   tier 5: raw 5      (elite — first "universally guaranteed good" tier)
//   tier 6: raw 6      (masterwork)
//   tier 7: raw 7+     (legendary)
function bucket17_R2(raw) {
  if (raw <= 1) return 1;
  if (raw === 2) return 2;
  if (raw === 3) return 3;
  if (raw === 4) return 4;
  if (raw === 5) return 5;
  if (raw === 6) return 6;
  return 7;
}

const stats = { R1: {}, R2: {}, R5: {}, R6: {} };
for (const f of projected) {
  const r1v = bucket15(r1(f));
  const r2v = bucket15(r2(f));
  const r5res = r5(f);
  const r5v = (bucket15(r5res.raw) === 5 && !r5res.eligible5) ? 4 : bucket15(r5res.raw);
  const r6v = bucket15_r6(r2(f)); // lower threshold on same R2 score
  stats.R1[r1v] = (stats.R1[r1v]||0)+1;
  stats.R2[r2v] = (stats.R2[r2v]||0)+1;
  stats.R5[r5v] = (stats.R5[r5v]||0)+1;
  stats.R6[r6v] = (stats.R6[r6v]||0)+1;
}
console.log('\nTier distributions (1-5 bucket):');
for (const r of ['R1','R2','R5','R6']) console.log(`  ${r}:`, stats[r]);

// Tier 5 lists under each rule (for comparison)
const t5_R1 = projected.filter(f => bucket15(r1(f)) === 5).sort((a,b) => r1(b)-r1(a) || a.year-b.year);
const t5_R2 = projected.filter(f => bucket15(r2(f)) === 5).sort((a,b) => r2(b)-r2(a) || a.year-b.year);
const t5_R5 = projected.filter(f => { const res = r5(f); return bucket15(res.raw) === 5 && res.eligible5; }).sort((a,b) => r5(b).raw - r5(a).raw || a.year - b.year);
const t5_R6 = projected.filter(f => bucket15_r6(r2(f)) === 5).sort((a,b) => r2(b)-r2(a) || a.year-b.year);

function preCount(list) { return list.filter(f => f.year < 1970).length; }
console.log(`\nPre-1970 share of tier 5:`);
console.log(`  R1 (current, ${t5_R1.length}): ${preCount(t5_R1)} (${(100*preCount(t5_R1)/t5_R1.length).toFixed(0)}%)`);
console.log(`  R2 (NFR+AFI merged, ${t5_R2.length}): ${preCount(t5_R2)} (${(100*preCount(t5_R2)/t5_R2.length).toFixed(0)}%)`);
console.log(`  R5 (R2 + prestige req, ${t5_R5.length}): ${preCount(t5_R5)} (${(100*preCount(t5_R5)/t5_R5.length).toFixed(0)}%)`);
console.log(`  R6 (R2 threshold 5, ${t5_R6.length}): ${preCount(t5_R6)} (${(100*preCount(t5_R6)/t5_R6.length).toFixed(0)}%)`);

// === Write tier analysis MD — ONLY top 3 tiers under R2 ===
// Overwrites any prior content.
let md = ``;
// R5/R4 scaffolding retained in script but not rendered to MD.

// === 7-TIER SYSTEM UNDER R2 ===
const tier7Dist = {};
const byTier7 = { 1:[],2:[],3:[],4:[],5:[],6:[],7:[] };
for (const f of projected) {
  const t = bucket17_R2(r2(f));
  tier7Dist[t] = (tier7Dist[t]||0)+1;
  byTier7[t].push(f);
}

md += `# Oscars Journey — Top 3 tiers (R2, 7-tier system)\n\n`;
md += `Projected catalog: **${projected.length}** films. Top echelon: T5+T6+T7.\n\n`;
md += `Scoring rule (R2): 1 point per canon list, with AFI+NFR merged to a single "US institutional" point, plus 1 for Oscar winner / BP nominee / INT / ANIM winner.\n\n`;
md += `## Tier distribution (full 1-7)\n\n`;
md += `| Tier | Raw score | Meaning | Count | Pre-1970 share |\n|---|---|---|---|---|\n`;
const tierDescs = {
  1: 'minimal canon / not on lists',
  2: 'below-threshold essentials, on one list',
  3: 'canonical — meets entry threshold',
  4: 'strong — broad recognition',
  5: 'elite — universally validated',
  6: 'masterwork — near-consensus across all sources',
  7: 'legendary — consensus across every dimension',
};
const rawRanges = { 1:'0-1', 2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7+' };
for (let t=1;t<=7;t++) {
  const list = byTier7[t];
  const pre70 = list.filter(f => f.year < 1970).length;
  md += `| **${t}** | ${rawRanges[t]} | ${tierDescs[t]} | ${tier7Dist[t]||0} | ${pre70}/${tier7Dist[t]||0} (${list.length?(100*pre70/list.length).toFixed(0):0}%) |\n`;
}

md += `\nTotal tier 5 + 6 + 7 = **${(tier7Dist[5]||0)+(tier7Dist[6]||0)+(tier7Dist[7]||0)} films** — the "universally guaranteed good" top echelon.\n`;

function renderTier(n) {
  const list = byTier7[n].sort((a,b) => r2(b)-r2(a) || a.year-b.year);
  let s = `\n## Tier ${n} (${list.length} films, ${tierDescs[n]})\n\n`;
  const pre70 = list.filter(f=>f.year<1970).length;
  s += `Pre-1970: ${pre70} (${list.length?(100*pre70/list.length).toFixed(0):0}%). `;
  s += `Post-1970: ${list.length-pre70}.\n\n`;
  s += `| Year | Title | R2 raw | Lists | Category |\n|---|---|---|---|---|\n`;
  for (const f of list) {
    s += `| ${f.year} | ${f.title} | ${r2(f)} | ${f.newLists.join('+')}${f.oscarPip?'+OSCAR':''} | ${f.category} |\n`;
  }
  return s;
}
md += renderTier(7);
md += renderTier(6);
md += renderTier(5);
md += renderTier(4);
md += renderTier(3);

fs.writeFileSync(TIER_ANALYSIS, md);
console.log(`\nTier analysis MD: ${TIER_ANALYSIS}`);
