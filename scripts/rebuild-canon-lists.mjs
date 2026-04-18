// Rebuild scripts/canon-lists/lists.json from fresh scrapes + apply alias
// map so foreign-title entries collapse into catalog English titles.
// Also filter out obvious non-film noise (lifetime achievement names, etc.).
//
// Writes back to canon-lists/lists.json in the same string-array format the
// rest of the pipeline already consumes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LISTS_PATH = path.resolve(__dirname, 'canon-lists/lists.json');
const ALIASES_PATH = path.resolve(__dirname, 'canon-lists/title-aliases.json');

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
function aliasedNorm(title) {
  const n = normalize(title);
  return ALIASES.get(n) || n;
}

function loadJsonArr(p) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8'));
}

// Canonicalize a list entry (array-of-objects) into "Title (Year)" strings.
// Also apply title aliases so SS's "La Règle du jeu" becomes "Rules of the
// Game (1939)". This keeps downstream tier calculation simple.
function canonicalize(entries) {
  const out = new Set();
  for (const e of entries) {
    if (!e.year) continue; // IMDb 250 now has years, otherwise skip
    const norm = aliasedNorm(e.title);
    // Try to round-trip back to a human-readable form. If alias resolved,
    // it's already mapped to our catalog title. Use that.
    // For the string representation, use Title Case of the aliased norm.
    const readable = norm
      .split(' ')
      .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : '')
      .join(' ');
    out.add(`${readable} (${e.year})`);
  }
  return [...out].sort();
}

// Existing sources kept: LBXD stays (complete)
const existing = JSON.parse(fs.readFileSync(LISTS_PATH, 'utf8'));
const lists = {
  _note: "Regenerated from fresh scrapes + title alias normalization. See canon-lists/ raw HTMLs and title-aliases.json for provenance.",
  _regenerated: new Date().toISOString().slice(0, 10),
};

// SS 2022 (critics top poll, 263 films with ties)
lists.SS = canonicalize(loadJsonArr('.playwright-mcp/ss-2022.json'));

// AFI: union of 1998 + 2007 + 10 Top 10 + Thrills + Laughs + Cheers + Passions
const afiAll = [
  ...loadJsonArr('.playwright-mcp/afi-1998.json'),
  ...loadJsonArr('.playwright-mcp/afi-2007.json'),
  ...loadJsonArr('.playwright-mcp/afi-10top10.json'),
  ...loadJsonArr('.playwright-mcp/afi-thrills.json'),
  ...loadJsonArr('.playwright-mcp/afi-laughs.json'),
  ...loadJsonArr('.playwright-mcp/afi-cheers.json'),
  ...loadJsonArr('.playwright-mcp/afi-passions.json'),
];
lists.AFI = canonicalize(afiAll);

// FEST = Cannes + Venice + Berlin grand prize winners, with noise filter
const fest = [
  ...loadJsonArr('.playwright-mcp/cannes-winners.json'),
  ...loadJsonArr('.playwright-mcp/venice-winners.json'),
  ...loadJsonArr('.playwright-mcp/berlin-winners.json'),
];
const festFiltered = fest.filter(f => {
  if (!f.year || !f.title) return false;
  // Filter lifetime achievement entries — people's names like "Pedro Almodóvar and Julie Andrews"
  if (/^(Pedro|Julie|Werner|Roberto|Jamie|Peter|Sigourney|David|Vanessa) /i.test(f.title)) return false;
  if (/ and \w+ \w+$/i.test(f.title) && f.title.split(' ').length <= 7) return false;
  if (f.title === 'Festival cancelled') return false;
  return true;
});
lists.FEST = canonicalize(festFiltered);

// IMDB Top 250 — need to backfill years from other lists since scrape has null years
const imdbRaw = loadJsonArr('.playwright-mcp/imdb-top250.json');
// Build a lookup of title → year from all other sources
const titleYearLookup = new Map();
for (const e of [...afiAll, ...festFiltered, ...loadJsonArr('.playwright-mcp/ss-2022.json'),
                  ...loadJsonArr('.playwright-mcp/criterion-full.json'),
                  ...loadJsonArr('.playwright-mcp/rt-top300.json')]) {
  if (e.year && !titleYearLookup.has(aliasedNorm(e.title))) {
    titleYearLookup.set(aliasedNorm(e.title), e.year);
  }
}
const imdbWithYears = imdbRaw.map(r => {
  if (r.year) return r;
  const guess = titleYearLookup.get(aliasedNorm(r.title));
  return { ...r, year: guess };
}).filter(r => r.year);
lists.IMDB = canonicalize(imdbWithYears);

// LBXD stays unchanged
lists.LBXD = existing.LBXD;

// NFR: features only (710 entries from our parse)
lists.NFR = canonicalize(loadJsonArr('.playwright-mcp/nfr-features.json'));

// CRIT: full Criterion spine
lists.CRIT = canonicalize(loadJsonArr('.playwright-mcp/criterion-full.json'));

// RT Top 300 (new 8th list)
lists.RT = canonicalize(loadJsonArr('.playwright-mcp/rt-top300.json'));

// Write back
fs.writeFileSync(LISTS_PATH, JSON.stringify(lists, null, 2));
console.log('Rebuilt canon-lists/lists.json:');
for (const [k, v] of Object.entries(lists)) {
  if (k.startsWith('_')) continue;
  console.log(`  ${k}: ${v.length} entries`);
}
