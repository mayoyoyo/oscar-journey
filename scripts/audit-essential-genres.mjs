// Audit the auto-classified genre codes for ESSENTIAL films.
//
// Reads current movies.js + the classification report to build a side-by-side
// table: title / year / current-code / OMDb raw genres. Dumps as JSON and a
// human-readable list, so we can scan for misclassifications.
//
// Output:
//   - scripts/essential-genre-audit.json  (full table)
//   - scripts/essential-genre-audit.txt   (one line per film, easy to scan)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'genre-classification-report.json');
const OUT_JSON = path.resolve(__dirname, 'essential-genre-audit.json');
const OUT_TXT = path.resolve(__dirname, 'essential-genre-audit.txt');

const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
const { MOVIES, GENRE_LABELS } = moviesModule;
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

// Build a lookup: id → raw OMDb genre string (from report.results which contains ALL films, not just changes)
const rawById = {};
for (const r of report.results || []) {
  rawById[r.id] = { raw: r.raw, note: r.note };
}

const essentials = MOVIES.filter(m => m.category === 'ESSENTIAL');
console.log(`Auditing ${essentials.length} essentials.`);

const rows = essentials.map(m => ({
  id: m.id,
  title: m.title,
  year: m.year,
  currentCode: m.genre,
  currentLabel: GENRE_LABELS[m.genre] || '?',
  omdbRaw: rawById[m.id]?.raw || null,
  note: rawById[m.id]?.note || null,
}));

// Sort by current code then year
rows.sort((a, b) => {
  if (a.currentCode !== b.currentCode) return a.currentCode.localeCompare(b.currentCode);
  return a.year - b.year;
});

fs.writeFileSync(OUT_JSON, JSON.stringify(rows, null, 2));

// Text report grouped by current genre code
const lines = [];
const codes = [...new Set(rows.map(r => r.currentCode))].sort();
for (const code of codes) {
  const label = GENRE_LABELS[code] || '?';
  const group = rows.filter(r => r.currentCode === code);
  lines.push(`\n=== ${code} — ${label} (${group.length}) ===`);
  for (const r of group) {
    const raw = r.omdbRaw || (r.note ? `[${r.note}]` : '—');
    lines.push(`  ${r.year}  ${r.title.padEnd(48)}  OMDb: ${raw}`);
  }
}
fs.writeFileSync(OUT_TXT, lines.join('\n'));

console.log(`Wrote ${OUT_JSON}`);
console.log(`Wrote ${OUT_TXT}`);

// Summary
const byCode = {};
for (const r of rows) byCode[r.currentCode] = (byCode[r.currentCode] || 0) + 1;
console.log('\nCount by current code:');
for (const [code, count] of Object.entries(byCode).sort()) {
  console.log(`  ${code} (${GENRE_LABELS[code]}): ${count}`);
}
