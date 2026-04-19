// Second pass for films the first run couldn't parse. Key improvements:
//   - Also try the unprefixed title (TITLE_OVERRIDES sometimes hurts the
//     accolades-page lookup — e.g. "Birdman" → real accolades page is
//     "List of accolades received by Birdman (film)" but the override
//     names the film "Birdman or The Unexpected Virtue of Ignorance").
//   - If the main article has {{main|List of accolades received by X}},
//     follow that link. Authoritative path to the awards table, no
//     guessing needed.
//   - Widen the candidate list for redirected titles.
//
// Reads existing report, targets rows with nominations.length === 0,
// merges back into the report. Does NOT re-fetch already-populated rows.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'nominations-backfill.json');

const UA = 'oscars-journey-nominations/1.0 (mailto:iswhat444@gmail.com)';

// Full AWARD_MAP mirrored from backfill-nominations.mjs. Kept in sync by
// hand — if the main script's map changes, bring this one along.
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

// Extract the target of a {{main|...}} or {{further|...}} template sitting
// inside an Accolades / Awards section. This is the canonical way Wikipedia
// links to a film's full accolades page.
function findAccoladesPageLink(wt) {
  if (!wt) return null;
  const section = wt.match(/==\s*Accolades\s*==[\s\S]{0,1500}|==\s*Awards\s*and\s*nominations\s*==[\s\S]{0,1500}|==\s*Awards\s*==[\s\S]{0,1500}/i);
  if (!section) return null;
  const m = section[0].match(/\{\{\s*main\s*\|([^|}]+)(?:\|[^}]*)?\}\}/i);
  return m ? m[1].trim() : null;
}

async function getNominationsForFilm(title, rawTitle, year) {
  const names = new Set([title, rawTitle].filter(Boolean));
  const candidates = [];
  for (const n of names) {
    candidates.push(n, `${n} (film)`, `${n} (${year} film)`,
      `List of accolades received by ${n}`,
      `List of accolades received by ${n} (film)`,
      `List of awards and nominations received by ${n}`,
      `List of awards and nominations received by ${n} (film)`);
  }
  // First pass — direct candidates.
  for (const t of candidates) {
    const wt = await fetchWikitext(t);
    const noms = parseNominationsFromWikitext(wt);
    if (noms.length > 0) return { source: t, noms };
    // If this looked like the main film page (didn't reach accolades yet),
    // inspect it for a {{main|...}} link to the accolades page.
    if (wt && !noms.length) {
      const link = findAccoladesPageLink(wt);
      if (link && !candidates.includes(link)) {
        const wt2 = await fetchWikitext(link);
        const noms2 = parseNominationsFromWikitext(wt2);
        if (noms2.length > 0) return { source: link, noms: noms2 };
      }
    }
  }
  return { source: null, noms: [] };
}

function mapToSchema(raw) {
  const byKey = new Map();
  for (const r of raw) {
    const def = AWARD_MAP[r.award];
    if (!def || def.skip) continue;
    const key = `${def.category}||${r.won ? 'W' : 'L'}`;
    if (byKey.has(key)) {
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

const ORDER = [
  'Best Picture', 'Director', 'Actor', 'Actress',
  'Supporting Actor', 'Supporting Actress',
  'Original Screenplay', 'Adapted Screenplay',
  'Animated Feature', 'International Feature', 'Documentary Feature',
  'Cinematography', 'Film Editing', 'Production Design', 'Art Direction',
  'Costume Design', 'Makeup', 'Sound', 'Sound Editing', 'Sound Mixing',
  'Sound Effects Editing', 'Original Score', 'Original Song', 'Visual Effects',
];
const orderKey = (c) => { const i = ORDER.indexOf(c); return i === -1 ? 999 : i; };

const TITLE_OVERRIDES = {
  'Birdman': 'Birdman or The Unexpected Virtue of Ignorance',
  'Sunrise: A Song of Two Humans': 'Sunrise',
  'Apur Sansar': 'The World of Apu',
  'Il Postino': 'Il Postino: The Postman',
};

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const missing = report.filter(r => !r.nominations || r.nominations.length === 0);
  console.log(`Re-running on ${missing.length} films with no data from first pass...`);
  let found = 0, stillEmpty = 0;
  let i = 0;
  for (const r of missing) {
    i++;
    if (i % 10 === 0) process.stdout.write(`  ${i}/${missing.length}  (found ${found})\r`);
    const rawTitle = r.title;
    const titleForQuery = TITLE_OVERRIDES[rawTitle] || rawTitle;
    const { source, noms } = await getNominationsForFilm(titleForQuery, rawTitle, r.year);
    const mapped = mapToSchema(noms);
    mapped.sort((a, b) => orderKey(a.category) - orderKey(b.category));
    if (mapped.length > 0) {
      r.source = source;
      r.rawCount = noms.length;
      r.nominations = mapped;
      found++;
    } else {
      stillEmpty++;
    }
    await new Promise(res => setTimeout(res, 400));
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nRecovered: ${found} films. Still empty: ${stillEmpty}.`);
  // Final coverage
  const totalWithNoms = report.filter(r => r.nominations?.length > 0).length;
  console.log(`Total coverage: ${totalWithNoms}/${report.length} films.`);
  console.log(`\nStill empty (first 20):`);
  report.filter(r => !r.nominations || r.nominations.length === 0).slice(0, 20).forEach(r => {
    console.log(`  - ${r.title} (${r.year}) [${r.category}]`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
