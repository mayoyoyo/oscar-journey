// Fetch every Academy Award nomination (wins + losses) for each catalog film.
//
// Source: Wikipedia article + "List of accolades received by X" pages.
// Accolades tables use {{won}} and {{nom}} templates on an AMPAS row — we
// parse both. Stores a unified `nominations: [{category, won, nominee?, detail?}]`
// array on each movie record, intended to be the new single source of truth
// for the Ceremony Tooltip modal's wins/losses sections.
//
// Existing `awards` / `won` / `alsoWon` fields are NOT touched — they stay
// as catalog-organization metadata. Display code migrates to reading
// `nominations` for richness (nominee names, lost-nom detail).
//
// Output: writes scripts/nominations-backfill.json (report) and prints a
// summary. Patch application is a separate step (apply-nominations.mjs)
// so a human can review before writing into movies.js.
//
// Rate-limited: ~1 s / film page fetched, so full 787-film run is ~15 min.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'nominations-backfill.json');

const UA = 'oscars-journey-nominations/1.0 (mailto:iswhat444@gmail.com)';

// Same Wikipedia → schema category map as backfill-essential-awards.mjs.
// Any Wikipedia label that resolves to a blank category here means
// "AMPAS gave a nomination but we're discarding it" — currently only
// honorary / achievement awards, which don't count toward nomination stats.
const AWARD_MAP = {
  'Academy Award for Best Director':                           { category: 'Director', personAward: true },
  'Academy Award for Best Actor':                              { category: 'Actor', personAward: true },
  'Academy Award for Best Actress':                            { category: 'Actress', personAward: true },
  'Academy Award for Best Actor in a Leading Role':            { category: 'Actor', personAward: true },
  'Academy Award for Best Actress in a Leading Role':          { category: 'Actress', personAward: true },
  'Academy Award for Best Supporting Actor':                   { category: 'Supporting Actor', personAward: true },
  'Academy Award for Best Supporting Actress':                 { category: 'Supporting Actress', personAward: true },
  'Academy Award for Best Actor in a Supporting Role':         { category: 'Supporting Actor', personAward: true },
  'Academy Award for Best Actress in a Supporting Role':       { category: 'Supporting Actress', personAward: true },
  'Academy Award for Best Writing, Original Screenplay':       { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Writing, Adapted Screenplay':        { category: 'Adapted Screenplay', personAward: true },
  'Academy Award for Best Adapted Screenplay':                 { category: 'Adapted Screenplay', personAward: true },
  'Academy Award for Best Original Screenplay':                { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Story':                              { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Writing, Motion Picture Story':      { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Writing':                            { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Writing, Screenplay':                { category: 'Adapted Screenplay', personAward: true },
  'Academy Award for Best Writing, Screenplay Based on Material from Another Medium': { category: 'Adapted Screenplay', personAward: true },
  'Academy Award for Best Writing, Story and Screenplay':      { category: 'Original Screenplay', personAward: true },
  'Academy Award for Best Cinematography':                     { category: 'Cinematography' },
  'Academy Award for Best Cinematography, Black-and-White':    { category: 'Cinematography' },
  'Academy Award for Best Cinematography, Color':              { category: 'Cinematography' },
  'Academy Award for Best Original Score':                     { category: 'Original Score' },
  'Academy Award for Best Original Musical Score':             { category: 'Original Score' },
  'Academy Award for Best Original Music Score':               { category: 'Original Score' },
  'Academy Award for Best Music':                              { category: 'Original Score' },
  'Academy Award for Best Music, Original Score':              { category: 'Original Score' },
  'Academy Award for Best Music, Scoring':                     { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Dramatic Picture': { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Dramatic or Comedy Picture': { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Musical Picture': { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Motion Picture':  { category: 'Original Score' },
  'Academy Award for Best Music, Adaptation Score':             { category: 'Original Score' },
  'Academy Award for Best Music, Original Dramatic Score':      { category: 'Original Score' },
  'Academy Award for Best Music, Original Musical or Comedy Score': { category: 'Original Score' },
  'Academy Award for Best Original Dramatic Score':            { category: 'Original Score' },
  'Academy Award for Best Original Musical or Comedy Score':   { category: 'Original Score' },
  'Academy Award for Best Score, Adaptation or Treatment':     { category: 'Original Score' },
  'Academy Award for Best Original Score, no Musical':         { category: 'Original Score' },
  'Academy Award for Best Original Song':                      { category: 'Original Song', keepDetail: true },
  'Academy Award for Best Music, Original Song':               { category: 'Original Song', keepDetail: true },
  'Academy Award for Best Film Editing':                       { category: 'Film Editing' },
  'Academy Award for Best Visual Effects':                     { category: 'Visual Effects' },
  'Academy Award for Best Costume Design':                     { category: 'Costume Design' },
  'Academy Award for Best Costume Design, Black-and-White':    { category: 'Costume Design' },
  'Academy Award for Best Costume Design, Color':              { category: 'Costume Design' },
  'Academy Award for Best Production Design':                  { category: 'Production Design' },
  'Academy Award for Best Art Direction':                      { category: 'Art Direction' },
  'Academy Award for Best Art Direction, Black and White':     { category: 'Art Direction' },
  'Academy Award for Best Art Direction, Black-and-White':     { category: 'Art Direction' },
  'Academy Award for Best Art Direction, Color':               { category: 'Art Direction' },
  'Academy Award for Best Makeup and Hairstyling':             { category: 'Makeup' },
  'Academy Award for Best Makeup':                             { category: 'Makeup' },
  'Academy Award for Best Sound':                              { category: 'Sound' },
  'Academy Award for Best Sound Editing':                      { category: 'Sound Editing' },
  'Academy Award for Best Sound Mixing':                       { category: 'Sound Mixing' },
  'Academy Award for Best Sound Effects':                      { category: 'Sound Effects Editing' },
  'Academy Award for Best Sound Effects Editing':              { category: 'Sound Effects Editing' },
  'Academy Award for Best Special Effects':                    { category: 'Visual Effects' },
  'Academy Award for Best Special Visual Effects':             { category: 'Visual Effects' },
  'Academy Award for Best Effects':                            { category: 'Visual Effects' },
  'Academy Award for Best Engineering Effects':                { category: 'Visual Effects' },
  'Academy Award for Best Sound Recording':                    { category: 'Sound' },
  'Academy Award for Best Documentary Feature':                { category: 'Documentary Feature' },
  'Academy Award for Best Documentary Feature Film':           { category: 'Documentary Feature' },
  'Academy Award for Best Foreign Language Film':              { category: 'International Feature' },
  'Academy Award for Best International Feature Film':         { category: 'International Feature' },
  'Academy Award for Best Animated Feature':                   { category: 'Animated Feature' },
  'Academy Award for Best Picture':                            { category: 'Best Picture' },
  // Honorary / short-form awards we don't surface
  'Academy Honorary Award':                                    { skip: true },
  'Special Achievement Academy Award':                         { skip: true },
  'Academy Juvenile Award':                                    { skip: true },
  'Academy Award for Best Dance Direction':                    { skip: true },
  'Academy Award for Best Assistant Director':                 { skip: true },
  'Academy Award for Best Live Action Short Film':             { skip: true },
  'Academy Award for Best Animated Short Film':                { skip: true },
  'Academy Award for Best Documentary Short Film':             { skip: true },
  'Academy Award for Best Documentary Short Subject':          { skip: true },
  'Academy Award for Best Short Subject, Cartoon':             { skip: true },
  'Academy Award for Best Short Subject, One-Reel':            { skip: true },
  'Academy Award for Best Short Subject, Two-Reel':            { skip: true },
  'Academy Award for Best Short Film, Live Action':            { skip: true },
};

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return await resp.json();
}

async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1&origin=*`;
  try {
    const data = await fetchJson(url);
    return data.parse?.wikitext?.['*'] || null;
  } catch { return null; }
}

function stripWikiMarkup(s) {
  return s
    .replace(/<ref[^<]*<\/ref>|<ref[^/]*\/>/gi, '')
    .replace(/<small>[^<]*<\/small>/gi, '')
    .replace(/\{\{\s*sort\s*\|[^|}]*\|([^}]+)\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;·\s]+|[,;·\s]+$/g, '');
}

// Parse a film's wikitext for every AMPAS row. A row is a {{won}} or {{nom}}
// chunk with a [[Academy Award for Best X]] link. We split on table-row
// separators, then per-row inspect whether it's a win or a nomination.
function parseNominationsFromWikitext(wt) {
  if (!wt) return [];
  const noms = [];
  const rows = wt.split(/\n\|-\s*\n/);
  for (const row of rows) {
    const awardMatch = row.match(/\[\[(Academy Award[^|\]]+?)(?:\|[^\]]+)?\]\]/);
    if (!awardMatch) continue;
    const wonMatch = /\{\{\s*won\s*[}|]/i.test(row);
    const nomMatch = /\{\{\s*nom\s*[}|]/i.test(row);
    if (!wonMatch && !nomMatch) continue;
    const category = awardMatch[1].trim();
    // Look for nominee/detail line (the cell right after the award link).
    const parts = row.split('\n').map(s => s.trim()).filter(s => s.startsWith('|'));
    let nominee = null;
    for (let i = 0; i < parts.length; i++) {
      if (/Academy Award for Best/i.test(parts[i])) {
        const nxt = parts[i + 1];
        if (nxt && !/\{\{\s*won|\{\{\s*nom/i.test(nxt)) {
          nominee = stripWikiMarkup(nxt.replace(/^\|\s*/, ''));
        }
        break;
      }
    }
    noms.push({ award: category, won: wonMatch, nominee: nominee || undefined });
  }
  return noms;
}

async function getNominationsForFilm(title, year) {
  // Try main article first, then dedicated accolades page.
  const candidates = [
    title,
    `${title} (film)`,
    `${title} (${year} film)`,
    `List of accolades received by ${title}`,
    `List of accolades received by ${title} (film)`,
    `List of awards and nominations received by ${title}`,
    `List of awards and nominations received by ${title} (film)`,
  ];
  for (const t of candidates) {
    const wt = await fetchWikitext(t);
    const noms = parseNominationsFromWikitext(wt);
    if (noms.length > 0) return { source: t, noms };
  }
  return { source: null, noms: [] };
}

// Collapse duplicates (Wikidata-style multi-recipient rows) and map
// Wikipedia labels → our schema categories. Keep the `won` flag intact.
function mapToSchema(raw) {
  const byKey = new Map(); // key = `${category}||${won ? 'W' : 'L'}` (same cat can appear won + nom historically)
  for (const r of raw) {
    const def = AWARD_MAP[r.award];
    if (!def || def.skip) continue;
    const key = `${def.category}||${r.won ? 'W' : 'L'}`;
    if (byKey.has(key)) {
      // Prefer an entry with a nominee name over one without.
      const prev = byKey.get(key);
      if (!prev.nominee && r.nominee) prev.nominee = r.nominee;
      continue;
    }
    const entry = { category: def.category, won: r.won };
    if (def.personAward && r.nominee) entry.nominee = r.nominee;
    if (def.keepDetail && r.nominee) entry.detail = r.nominee;
    byKey.set(key, entry);
  }
  return Array.from(byKey.values());
}

// Standard Academy order — applied to display, stored in this canonical order.
const ORDER = [
  'Best Picture', 'Director', 'Actor', 'Actress',
  'Supporting Actor', 'Supporting Actress',
  'Original Screenplay', 'Adapted Screenplay',
  'Animated Feature', 'International Feature', 'Documentary Feature',
  'Cinematography', 'Film Editing', 'Production Design', 'Art Direction',
  'Costume Design', 'Makeup', 'Sound', 'Sound Editing', 'Sound Mixing',
  'Sound Effects Editing', 'Original Score', 'Original Song', 'Visual Effects',
];
function orderKey(cat) {
  const i = ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}

// Title/year overrides mirror the live app's OMDb lookups.
const TITLE_OVERRIDES = {
  'Birdman': 'Birdman or The Unexpected Virtue of Ignorance',
  'Sunrise: A Song of Two Humans': 'Sunrise',
  'Apur Sansar': 'The World of Apu',
  'Il Postino': 'Il Postino: The Postman',
};

async function main() {
  const mm = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mm.MOVIES;
  console.log(`Scanning ${MOVIES.length} films for nominations...`);

  const results = [];
  let i = 0;
  for (const m of MOVIES) {
    i++;
    if (i % 10 === 0) process.stdout.write(`  ${i}/${MOVIES.length}\r`);
    const title = TITLE_OVERRIDES[m.title] || m.title;
    const { source, noms } = await getNominationsForFilm(title, m.year);
    const mapped = mapToSchema(noms);
    mapped.sort((a, b) => orderKey(a.category) - orderKey(b.category));
    results.push({
      id: m.id,
      title: m.title,
      year: m.year,
      category: m.category,
      source,
      rawCount: noms.length,
      nominations: mapped,
    });
    // Pacing: Wikipedia asks for ~1 req/s. Our fetch does up to 7 page
    // lookups per film; cap the post-success delay at 400 ms so total run
    // time ≈ 15-20 min.
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));

  // Stats
  const withNoms = results.filter(r => r.nominations.length > 0);
  const noData = results.filter(r => r.nominations.length === 0);
  const byCount = {};
  for (const r of results) {
    const k = r.nominations.length;
    byCount[k] = (byCount[k] || 0) + 1;
  }
  console.log(`\n\nResults:`);
  console.log(`  Total films:       ${results.length}`);
  console.log(`  With nominations:  ${withNoms.length}  (${((withNoms.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`  No data found:     ${noData.length}`);
  console.log(`\nTop 10 by nomination count:`);
  withNoms.sort((a, b) => b.nominations.length - a.nominations.length).slice(0, 10).forEach(r => {
    const wins = r.nominations.filter(n => n.won).length;
    console.log(`  ${String(r.nominations.length).padStart(2)} (${wins}W) — ${r.title} (${r.year})`);
  });
  console.log(`\nFilms with no nominations found (first 20):`);
  noData.slice(0, 20).forEach(r => console.log(`  - ${r.title} (${r.year}) [${r.category}]`));
  console.log(`\nReport written to ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
