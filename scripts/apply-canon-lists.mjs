// Cross-reference every Oscar film (BP/INT/ANIM) in movies.js against the 7
// canon lists harvested in scripts/canon-lists/lists.json. Add `lists` field
// entries for any list the film appears on (in addition to the OSCAR or
// OSCAR_NOM pip the film already earns from getTierInfo).
//
// Matching: normalized titles (lowercase, strip The/A/An, strip punctuation,
// handle unicode folds) + exact year (tolerates ±1 for festival/wide-release
// mismatches).
//
// Writes back to src/data/movies.js adding `tier: N, lists: [...]` fields to
// any Oscar film that matched at least one canon list.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const LISTS_PATH = path.resolve(__dirname, 'canon-lists/lists.json');
const REPORT_PATH = path.resolve(__dirname, 'oscar-list-crossref-report.json');

function normalize(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/^(the|a|an) /i, '')                        // strip leading article
    .replace(/&/g, 'and')
    .replace(/:/g, '')
    .replace(/colou?r/g, 'color')                        // UK/US spelling
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEntry(entry) {
  const m = entry.match(/^(.*)\s*\((\d{4})\)\s*$/);
  if (!m) return null;
  return { title: m[1].trim(), year: parseInt(m[2], 10), norm: normalize(m[1]) };
}

async function main() {
  const lists = JSON.parse(fs.readFileSync(LISTS_PATH, 'utf8'));
  const listCodes = Object.keys(lists).filter(k => !k.startsWith('_'));

  // Build parsed list entries per code
  const parsed = {};
  for (const code of listCodes) {
    parsed[code] = lists[code].map(parseEntry).filter(Boolean);
  }

  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
  const movies = moviesModule.MOVIES;

  const report = { changes: [], totalMatched: 0, byList: {} };
  for (const c of listCodes) report.byList[c] = 0;

  // For each Oscar film, compute which lists it appears on
  const updates = new Map(); // id -> { lists: string[] }
  for (const m of movies) {
    if (m.category === 'ESSENTIAL') continue; // only Oscar films get updated
    const normTitle = normalize(m.title);
    const hits = new Set();
    for (const code of listCodes) {
      for (const entry of parsed[code]) {
        if (entry.norm !== normTitle) continue;
        if (Math.abs(entry.year - m.year) <= 1) {
          hits.add(code);
          break;
        }
      }
    }
    if (hits.size > 0) {
      updates.set(m.id, [...hits]);
      report.changes.push({ id: m.id, title: m.title, year: m.year, lists: [...hits] });
      report.totalMatched++;
      for (const c of hits) report.byList[c]++;
    }
  }

  // Rewrite movies.js — inject `lists: [...]` into each matched Oscar film's entry.
  let src = fs.readFileSync(MOVIES_PATH, 'utf8');
  let applied = 0;
  for (const [id, lists] of updates) {
    const idMarker = `id: '${id}'`;
    const idx = src.indexOf(idMarker);
    if (idx === -1) continue;
    // Find the closing `}` of the object (on the same line — all entries are one-liners)
    const eol = src.indexOf('\n', idx);
    const line = src.slice(idx, eol);
    // Remove any existing `lists: [...]` to make re-runs idempotent
    let cleaned = line.replace(/,\s*lists:\s*\[[^\]]*\]/, '');
    // Insert `, lists: [...]` just before the closing `}` (leading comma since
    // every entry has at least id/title/year before this point, so we always
    // need the separator)
    const closeBrace = cleaned.lastIndexOf('}');
    if (closeBrace === -1) continue;
    const listsStr = lists.sort().map(l => `'${l}'`).join(', ');
    const newLine = cleaned.slice(0, closeBrace).trimEnd() + `, lists: [${listsStr}] ` + cleaned.slice(closeBrace);
    src = src.slice(0, idx) + newLine + src.slice(eol);
    applied++;
  }

  fs.writeFileSync(MOVIES_PATH, src);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\nCross-reference applied.`);
  console.log(`  Matched Oscar films: ${report.totalMatched}`);
  console.log(`  File updates written: ${applied}`);
  console.log(`  Per-list hits:`);
  for (const c of listCodes) console.log(`    ${c}: ${report.byList[c]}`);

  // Sample: top tier upgrades
  const sortedChanges = [...report.changes].sort((a, b) => b.lists.length - a.lists.length);
  console.log(`\nTop 20 tier upgrades:`);
  for (const c of sortedChanges.slice(0, 20)) {
    console.log(`  ${c.title.padEnd(36)} (${c.year}) — ${c.lists.join(', ')}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
