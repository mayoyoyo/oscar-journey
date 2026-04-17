// Apply the awards backfill report to src/data/movies.js.
// For each essential film with parsed awards, splice `awards: [...]` and
// optionally `alsoWon: [...]` into its entry. Best Picture wins go into
// `awards` as `{ category: 'Best Picture' }` (we don't flip the film's
// category from ESSENTIAL to BP — the tier/list logic depends on that).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'essentials-awards-backfill.json');

function serializeAwards(awards) {
  return '[' + awards.map(a => {
    const parts = [`category: ${JSON.stringify(a.category)}`];
    if (a.winner) parts.push(`winner: ${JSON.stringify(a.winner)}`);
    return `{ ${parts.join(', ')} }`;
  }).join(', ') + ']';
}

function serializeAlsoWon(arr) {
  return '[' + arr.map(s => `'${s}'`).join(', ') + ']';
}

function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  let source = fs.readFileSync(MOVIES_PATH, 'utf-8');
  let applied = 0;
  let skipped = 0;

  for (const f of report) {
    if (!f.mapped) { skipped++; continue; }
    const awards = [...(f.mapped.awards || [])];
    if (f.mapped.bestPicture) awards.unshift({ category: 'Best Picture' });
    const alsoWon = f.mapped.alsoWon || [];
    if (awards.length === 0 && alsoWon.length === 0) { skipped++; continue; }

    // Find the film's entry in movies.js by id.
    // Entries are single-line JS objects — easy to regex-match.
    const idRe = new RegExp(`\\{\\s*id:\\s*'${f.id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}'[^}]*\\}`);
    const m = source.match(idRe);
    if (!m) {
      console.warn(`  [skip] ${f.title} (${f.year}) — id ${f.id} not found in movies.js`);
      skipped++;
      continue;
    }
    const original = m[0];
    // Skip if the entry already has an `awards:` field — we don't want to
    // overwrite hand-curated data that predated this backfill.
    if (/awards\s*:/.test(original)) {
      skipped++;
      continue;
    }

    // Build the new entry: append `awards: [...]` (and alsoWon if any)
    // just before the closing brace.
    const insertions = [];
    if (awards.length > 0) insertions.push(`awards: ${serializeAwards(awards)}`);
    if (alsoWon.length > 0) insertions.push(`alsoWon: ${serializeAlsoWon(alsoWon)}`);
    const replacement = original.replace(/\s*\}$/, `, ${insertions.join(', ')} }`);
    source = source.replace(original, replacement);
    applied++;
  }

  fs.writeFileSync(MOVIES_PATH, source);
  console.log(`Applied awards to ${applied} films, skipped ${skipped}`);
}

main();
