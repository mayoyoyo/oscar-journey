// Authoritative nominations rebuild using the DLu/oscar_data dataset.
// That CSV contains every Oscar nomination from 1927 to present with
// IMDb film IDs attached — so we can match our catalog by imdbIds.json
// instead of fuzzy title lookup. Closes the prose-Wikipedia gap and
// replaces the 3 previous passes as the canonical source.
//
// Fetches oscars.csv once (~2 MB), builds {imdbId → [rows]} index,
// then produces a full nominations-backfill.json matching the schema
// the existing apply-nominations.mjs expects.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const IDS_PATH = path.resolve(__dirname, '../src/data/imdbIds.json');
const REPORT_PATH = path.resolve(__dirname, 'nominations-backfill.json');
const CSV_URL = 'https://raw.githubusercontent.com/DLu/oscar_data/main/oscars.csv';
const CSV_CACHE = path.resolve(__dirname, 'oscars-dlu.csv');

// Canonical categories in the DLu dataset → our schema. Honorary /
// short-film / committee awards are dropped (not shown in the modal).
// Years where the same category was split B&W / Color are unified.
const CANONICAL_MAP = {
  'BEST PICTURE': 'Best Picture',
  'DIRECTING': 'Director',
  'DIRECTING (Comedy Picture)': 'Director',
  'DIRECTING (Dramatic Picture)': 'Director',
  'ACTOR IN A LEADING ROLE': 'Actor',
  'ACTRESS IN A LEADING ROLE': 'Actress',
  'ACTOR IN A SUPPORTING ROLE': 'Supporting Actor',
  'ACTRESS IN A SUPPORTING ROLE': 'Supporting Actress',
  'WRITING (Original Screenplay)': 'Original Screenplay',
  'WRITING (Adapted Screenplay)': 'Adapted Screenplay',
  'WRITING (Original Story)': 'Original Screenplay',
  'WRITING (Title Writing)': 'Original Screenplay',
  'ANIMATED FEATURE FILM': 'Animated Feature',
  'INTERNATIONAL FEATURE FILM': 'International Feature',
  'DOCUMENTARY (Feature)': 'Documentary Feature',
  'CINEMATOGRAPHY': 'Cinematography',
  'CINEMATOGRAPHY (Black-and-White)': 'Cinematography',
  'CINEMATOGRAPHY (Color)': 'Cinematography',
  'FILM EDITING': 'Film Editing',
  'PRODUCTION DESIGN': 'Production Design',
  'ART DIRECTION': 'Art Direction',
  'ART DIRECTION (Black-and-White)': 'Art Direction',
  'ART DIRECTION (Color)': 'Art Direction',
  'COSTUME DESIGN': 'Costume Design',
  'COSTUME DESIGN (Black-and-White)': 'Costume Design',
  'COSTUME DESIGN (Color)': 'Costume Design',
  'MAKEUP AND HAIRSTYLING': 'Makeup',
  'MAKEUP': 'Makeup',
  'SOUND': 'Sound',
  'SOUND EDITING': 'Sound Editing',
  'SOUND MIXING': 'Sound Mixing',
  'SOUND RECORDING': 'Sound',
  'SPECIAL ACHIEVEMENT AWARD (Sound Editing)': 'Sound Editing',
  'SPECIAL ACHIEVEMENT AWARD (Sound Effects Editing)': 'Sound Effects Editing',
  'SPECIAL ACHIEVEMENT AWARD (Sound Effects)': 'Sound Effects Editing',
  'SPECIAL ACHIEVEMENT AWARD (Visual Effects)': 'Visual Effects',
  'MUSIC (Original Score)': 'Original Score',
  'MUSIC (Original Song)': 'Original Song',
  'MUSIC (Original Song Score or Adaptation Score)': 'Original Score',
  'VISUAL EFFECTS': 'Visual Effects',
  // Dropped — honorary / non-competitive / short-form:
  // HONORARY AWARD, SPECIAL AWARD, JEAN HERSHOLT HUMANITARIAN AWARD,
  // GORDON E. SAWYER AWARD, IRVING G. THALBERG MEMORIAL AWARD,
  // DANCE DIRECTION, ASSISTANT DIRECTOR, CASTING (still new), SHORT
  // SUBJECT (*), DOCUMENTARY (Short Subject), SCIENTIFIC AND
  // TECHNICAL AWARD (*), SPECIAL FOREIGN LANGUAGE FILM AWARD,
  // UNIQUE AND ARTISTIC PICTURE, SPECIAL ACHIEVEMENT AWARD (bare),
  // MEDAL OF COMMENDATION, AWARD OF COMMENDATION, JOHN A. BONNER...
};

// Categories where a named nominee/winner is meaningful to display. Tech
// awards have many crew recipients — keep just the category label.
const NOMINEE_CATEGORIES = new Set([
  'Director', 'Actor', 'Actress', 'Supporting Actor', 'Supporting Actress',
  'Original Screenplay', 'Adapted Screenplay',
]);

// Parse a tab-separated CSV row — the dataset uses tabs not commas.
function parseTSV(text) {
  const lines = text.split('\n').filter(Boolean);
  const header = lines.shift().split('\t');
  return lines.map(line => {
    const cells = line.split('\t');
    const row = {};
    header.forEach((h, i) => row[h] = cells[i] || '');
    return row;
  });
}

async function fetchCsv() {
  if (fs.existsSync(CSV_CACHE)) {
    console.log(`Using cached ${CSV_CACHE}`);
    return fs.readFileSync(CSV_CACHE, 'utf8');
  }
  console.log(`Fetching ${CSV_URL}...`);
  const resp = await fetch(CSV_URL);
  if (!resp.ok) throw new Error(`${resp.status}`);
  const text = await resp.text();
  fs.writeFileSync(CSV_CACHE, text);
  return text;
}

function main(text) {
  const rows = parseTSV(text);
  console.log(`Parsed ${rows.length} nomination rows from DLu dataset`);

  // Build index: imdbId → [row, ...]
  const byImdb = new Map();
  for (const r of rows) {
    const ids = (r.FilmId || '').split('|').filter(Boolean);
    for (const id of ids) {
      if (!byImdb.has(id)) byImdb.set(id, []);
      byImdb.get(id).push(r);
    }
  }
  console.log(`Indexed ${byImdb.size} films`);

  return byImdb;
}

async function run() {
  const text = await fetchCsv();
  const byImdb = main(text);

  const imdbIds = JSON.parse(fs.readFileSync(IDS_PATH, 'utf8'));
  const mm = await import(pathToFileURL(MOVIES_PATH).href);

  const report = [];
  let covered = 0;
  let missingImdb = 0;
  let noRows = 0;

  for (const m of mm.MOVIES) {
    const imdbId = imdbIds[m.id];
    if (!imdbId) {
      missingImdb++;
      report.push({ id: m.id, title: m.title, year: m.year, category: m.category, source: null, rawCount: 0, nominations: [] });
      continue;
    }
    const filmRows = byImdb.get(imdbId) || [];
    if (filmRows.length === 0) {
      noRows++;
      report.push({ id: m.id, title: m.title, year: m.year, category: m.category, source: 'dlu', rawCount: 0, nominations: [] });
      continue;
    }
    // Collapse per canonical category. A film may have multiple rows per
    // category historically (B&W + Color were separate years) — merge
    // under the unified label and keep the winning flag if any row won.
    const byCat = new Map();
    for (const r of filmRows) {
      const mapped = CANONICAL_MAP[r.CanonicalCategory];
      if (!mapped) continue;
      const won = r.Winner === 'True' || r.Winner === 'true' || r.Winner === '1';
      const entry = byCat.get(mapped) || { category: mapped, won: false };
      if (won) entry.won = true;
      // Nominee name — only meaningful for acting/directing/writing.
      if (NOMINEE_CATEGORIES.has(mapped) && !entry.nominee) {
        entry.nominee = r.Nominees || r.Name || undefined;
      }
      // Song title — dataset puts it in Name.
      if (mapped === 'Original Song' && !entry.detail) {
        entry.detail = r.Name || undefined;
      }
      byCat.set(mapped, entry);
    }
    const nominations = Array.from(byCat.values());
    if (nominations.length > 0) covered++;
    report.push({
      id: m.id, title: m.title, year: m.year, category: m.category,
      source: 'dlu', rawCount: filmRows.length,
      nominations,
    });
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nResults:`);
  console.log(`  Covered:          ${covered} / ${mm.MOVIES.length}`);
  console.log(`  No IMDB ID:       ${missingImdb}`);
  console.log(`  Not in DLu data:  ${noRows}`);

  // Diagnostics — top counts
  const sorted = [...report].filter(r => r.nominations.length > 0)
    .sort((a, b) => b.nominations.length - a.nominations.length);
  console.log(`\nTop 10 by nomination count:`);
  for (const r of sorted.slice(0, 10)) {
    const w = r.nominations.filter(n => n.won).length;
    console.log(`  ${String(r.nominations.length).padStart(2)}N ${w}W — ${r.title} (${r.year})`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
