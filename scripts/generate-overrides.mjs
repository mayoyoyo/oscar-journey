// Generate runtimeOverrides.js from the Wikidata cross-check.
// Adds an override for every film flagged by OMDb (not-found or suspicious),
// using the Wikidata-confirmed duration. Safe because the override only kicks
// in when OMDb itself returns N/A — extra entries are no-ops in production.
//
// Hand-resolved edge cases (films Wikidata couldn't find via auto-match) are
// baked in below from Wikipedia infobox lookups.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const WIKIDATA_REPORT = path.resolve(__dirname, 'runtime-wikidata-report.json');
const OVERRIDES_PATH = path.resolve(__dirname, '../src/utils/runtimeOverrides.js');

// Hand-resolved overrides for films Wikidata auto-matcher didn't find.
// Sources: direct Wikidata lookup by Q-ID, Wikipedia infobox scraping.
const MANUAL = {
  'once-upon-a-time-in-hollywood-2019': 161,
  'wallace-and-gromit-the-curse-of-the-were-rabbit-2005': 85,
  'spider-man-into-the-spider-verse-2018': 117,
  'jeanne-dielman-23-quai-du-commerce-1080-bruxelles-1975': 201,
  'where-is-the-friends-house-1987': 83,
  'hands-over-the-city-1963': 105,
  'cul-de-sac-1966': 111,
  'celine-and-julie-go-boating-1974': 193,
  'chan-is-missing-1982': 76,
  'the-ballad-of-gregorio-cortez-1982': 106,
  'beau-travail-1998': 92,
  // Il Postino: OMDb returns the wrong entry (31-min behind-the-scenes short).
  // Wikidata confirms the real film is 108 min.
  'il-postino-1995': 108,
};

// Birdman: existing override kept. Il Postino added above; its existing entry
// replaced 31 -> 108 via MANUAL.
const KEEP = {
  'birdman-2014': 119,
};

async function main() {
  const movies = (await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now())).MOVIES;
  const movieById = new Map(movies.map(m => [m.id, m]));

  const wdReport = JSON.parse(fs.readFileSync(WIKIDATA_REPORT, 'utf8'));

  // Build final overrides map
  const overrides = { ...KEEP };

  let fromWikidata = 0;
  let fromManual = 0;

  for (const r of wdReport.results) {
    if (MANUAL[r.id] != null) {
      overrides[r.id] = MANUAL[r.id];
      fromManual++;
      continue;
    }
    if (r.wikidataRuntime && r.wikidataRuntime >= 30) {
      overrides[r.id] = r.wikidataRuntime;
      fromWikidata++;
    }
  }

  // Sort by id for readable output, but group by category.
  const byCategory = { BP: [], INT: [], ANIM: [], ESSENTIAL: [] };
  for (const id of Object.keys(overrides)) {
    const m = movieById.get(id);
    const cat = m ? m.category : 'OTHER';
    (byCategory[cat] = byCategory[cat] || []).push({ id, rt: overrides[id], title: m ? m.title : id, year: m ? m.year : '' });
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => (a.year || 0) - (b.year || 0) || a.id.localeCompare(b.id));
  }

  // Emit the file
  const lines = [
    '// Manual runtime overrides (in minutes) for films where OMDB returns N/A or wrong data.',
    '// Single source of truth — used by both omdb.js (for modal display) and runtime.js (for filter).',
    '//',
    '// Auto-populated by scripts/verify-runtimes.mjs + verify-runtimes-wikidata.mjs. The override',
    '// only fires when OMDb itself returns no runtime for a given film, so having extra entries',
    '// for films OMDb handles correctly is harmless (they simply never fire).',
    '//',
    '// Key: film id from src/data/movies.js; value: runtime in minutes (integer).',
    'export const RUNTIME_OVERRIDES = {',
  ];

  const catOrder = ['BP', 'INT', 'ANIM', 'ESSENTIAL', 'OTHER'];
  const catLabels = {
    BP: 'Best Picture nominees',
    INT: 'International Feature winners',
    ANIM: 'Animated Feature winners',
    ESSENTIAL: 'Essentials',
    OTHER: 'Other',
  };
  for (const cat of catOrder) {
    const list = byCategory[cat];
    if (!list || !list.length) continue;
    lines.push('');
    lines.push(`  // ${catLabels[cat]}`);
    for (const { id, rt, title, year } of list) {
      const safe = title.replace(/\*\//g, '* /');
      lines.push(`  '${id}': ${rt}, // ${safe} (${year})`);
    }
  }

  lines.push('};', '');

  fs.writeFileSync(OVERRIDES_PATH, lines.join('\n'));
  console.log(`Wrote ${Object.keys(overrides).length} overrides to ${OVERRIDES_PATH}`);
  console.log(`  From KEEP: ${Object.keys(KEEP).length}`);
  console.log(`  From Wikidata: ${fromWikidata}`);
  console.log(`  From MANUAL: ${fromManual}`);
}

main().catch(e => { console.error(e); process.exit(1); });
