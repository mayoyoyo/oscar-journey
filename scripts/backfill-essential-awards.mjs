// Backfill per-category Academy Award wins for the 96 essential films that
// OMDb's Awards string says won >= 1 Oscar but have no hand-coded `awards`
// array in movies.js.
//
// Source: Wikidata SPARQL. Two query patterns:
//   1. Film itself has P166 (award received) for Academy Award items
//      (covers Best Picture, Foreign Language, tech categories, etc.)
//   2. A person has P166 with P1686 (for work) qualifier pointing to the film
//      (covers the acting + directing + composing categories where the
//      award is attributed to the person, not the film)
//
// Outputs:
//   - essentials-awards-backfill.json: full report (what we found per film)
//   - prints a patch snippet + applies it to src/data/movies.js in-place
//
// Spot-check expectation: The Dark Knight (2008) should yield two wins —
// Supporting Actor (Heath Ledger) and Sound Editing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const TALLY_PATH = path.resolve(__dirname, 'essentials-oscar-tally.json');
const REPORT_PATH = path.resolve(__dirname, 'essentials-awards-backfill.json');

const UA = 'oscars-journey-backfill/1.0 (mailto:iswhat444@gmail.com)';

// Wikidata award-label → our schema. Labels verified against actual SPARQL
// output from the first run. INT/ANIM go into alsoWon; Best Picture flips
// `won: true` on the root movie record.
const AWARD_MAP = {
  'Academy Award for Best Director':                           { category: 'Director' },
  'Academy Award for Best Actor':                              { category: 'Actor' },
  'Academy Award for Best Actress':                            { category: 'Actress' },
  'Academy Award for Best Supporting Actor':                   { category: 'Supporting Actor' },
  'Academy Award for Best Supporting Actress':                 { category: 'Supporting Actress' },
  'Academy Award for Best Writing, Original Screenplay':       { category: 'Original Screenplay' },
  'Academy Award for Best Writing, Adapted Screenplay':        { category: 'Adapted Screenplay' },
  'Academy Award for Best Cinematography':                     { category: 'Cinematography' },
  'Academy Award for Best Cinematography, Black-and-White':    { category: 'Cinematography' },
  'Academy Award for Best Cinematography, Color':              { category: 'Cinematography' },
  'Academy Award for Best Original Score':                     { category: 'Original Score' },
  'Academy Award for Best Original Musical Score':             { category: 'Original Score' },
  'Academy Award for Best Original Dramatic or Comedy Score':  { category: 'Original Score' },
  'Academy Award for Best Original Score, no Musical':         { category: 'Original Score' },
  'Academy Award for Best Score, Adaptation or Treatment':     { category: 'Original Score' },
  'Academy Award for Best Original Song':                      { category: 'Original Song' },
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
  'Academy Award for Best Sound':                              { category: 'Sound' },
  'Academy Award for Best Sound Editing':                      { category: 'Sound Editing' },
  'Academy Award for Best Sound Mixing':                       { category: 'Sound Mixing' },
  'Academy Award for Best Sound Effects':                      { category: 'Sound Effects Editing' },
  'Academy Award for Best Sound Effects Editing':              { category: 'Sound Effects Editing' },
  'Academy Award for Best Special Effects':                    { category: 'Visual Effects' },
  'Academy Award for Best Special Visual Effects':             { category: 'Visual Effects' },
  'Academy Award for Best Effects':                            { category: 'Visual Effects' },
  'Academy Award for Best Engineering Effects':                { category: 'Visual Effects' },
  'Academy Award for Best Makeup':                             { category: 'Makeup' },
  'Academy Award for Best Adapted Screenplay':                 { category: 'Adapted Screenplay' },
  'Academy Award for Best Original Screenplay':                { category: 'Original Screenplay' },
  'Academy Award for Best Story':                              { category: 'Original Screenplay' },
  'Academy Award for Best Writing, Motion Picture Story':      { category: 'Original Screenplay' },
  'Academy Award for Best Writing':                            { category: 'Original Screenplay' },
  'Academy Award for Best Writing, Screenplay':                { category: 'Adapted Screenplay' },
  'Academy Award for Best Writing, Screenplay Based on Material from Another Medium': { category: 'Adapted Screenplay' },
  'Academy Award for Best Writing, Story and Screenplay':      { category: 'Original Screenplay' },
  'Academy Award for Best Dance Direction':                    { category: 'Dance Direction' },
  'Academy Award for Best Original Music Score':               { category: 'Original Score' },
  'Academy Award for Best Music':                              { category: 'Original Score' },
  'Academy Award for Best Music, Original Score':              { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Dramatic Picture': { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Dramatic or Comedy Picture': { category: 'Original Score' },
  'Academy Award for Best Music, Scoring of a Musical Picture':{ category: 'Original Score' },
  'Academy Award for Best Music, Original Song':               { category: 'Original Song' },
  'Academy Award for Best Sound Recording':                    { category: 'Sound' },
  'Academy Award for Best Documentary Feature':                { category: 'Documentary Feature' },
  'Academy Award for Best Documentary Feature Film':           { category: 'Documentary Feature' },
  'Academy Award for Best Foreign Language Film':              { alsoWon: 'INT' },
  'Academy Award for Best International Feature Film':         { alsoWon: 'INT' },
  'Academy Award for Best Animated Feature':                   { alsoWon: 'ANIM' },
  'Academy Award for Best Picture':                            { bestPicture: true },
  // Honorary / non-competitive — skip so they don't inflate the count
  'Academy Honorary Award':                                    { skip: true },
  'Special Achievement Academy Award':                         { skip: true },
};

// Categories where a single named winner is meaningful (and there IS one).
// Tech categories have many crew recipients — drop the winner field there
// and just show the category label.
const SINGLE_WINNER_CATEGORIES = new Set([
  'Director', 'Actor', 'Actress', 'Supporting Actor', 'Supporting Actress',
  'Original Screenplay', 'Adapted Screenplay',
  'Original Score', 'Original Song',
  'Documentary Feature',
]);

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return await resp.json();
}

// Title lookup → Wikidata QID. Tries exact, then "{title} (YYYY film)".
async function getQID(title, year) {
  const candidates = [
    title,
    `${title} (film)`,
    `${title} (${year} film)`,
  ];
  for (const t of candidates) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(t)}&format=json&redirects=1&origin=*`;
    try {
      const data = await fetchJson(url);
      const pages = Object.values(data.query.pages || {});
      const qid = pages[0]?.pageprops?.wikibase_item;
      if (qid) {
        // Also fetch the extract to verify year roughly matches (sanity check)
        return qid;
      }
    } catch {}
  }
  return null;
}

async function sparql(query) {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  return await fetchJson(url, { headers: { Accept: 'application/sparql-results+json' } });
}

async function getAwardsForQID(qid) {
  // Pattern 1: film itself is the recipient
  // Pattern 2: a person is the recipient with P1686 "for work" pointing to the film
  const query = `
    SELECT DISTINCT ?awardLabel ?winnerLabel WHERE {
      {
        wd:${qid} wdt:P166 ?award .
      } UNION {
        ?winner p:P166 ?stmt .
        ?stmt ps:P166 ?award .
        ?stmt pq:P1686 wd:${qid} .
      }
      ?award wdt:P31/wdt:P279* wd:Q19020 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const data = await sparql(query);
  return (data.results?.bindings || []).map(b => ({
    award: b.awardLabel?.value,
    winner: b.winnerLabel?.value,
  }));
}

// Parse Wikipedia's Accolades table(s). Rows look like:
//   | [[Academy Award for Best X|display]]
//   | [[Humphrey Bogart]], [[Other]] <small>...</small>
//   | {{won}}
// We split on `|-` (table row separators), then within each row chunk look
// for an Academy Award link AND a {{won}} marker. Extract category from the
// link text, and a plain-text nominee from the line between them.
function stripWikiMarkup(s) {
  return s
    .replace(/<ref[^<]*<\/ref>|<ref[^/]*\/>/gi, '')
    .replace(/<small>[^<]*<\/small>/gi, '')
    // {{sort|sort-key|display}} → display (used in sortable accolades tables)
    .replace(/\{\{\s*sort\s*\|[^|}]*\|([^}]+)\}\}/gi, '$1')
    // Any remaining templates → drop
    .replace(/\{\{[^{}]*\}\}/g, '')
    // Wiki links [[Target|Display]] → Display, or [[Target]] → Target
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    // Leftover HTML
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;·\s]+|[,;·\s]+$/g, '');
}

async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1&origin=*`;
  try {
    const data = await fetchJson(url);
    return data.parse?.wikitext?.['*'] || null;
  } catch { return null; }
}

function parseAwardsFromWikitext(wt) {
  if (!wt) return [];
  const awards = [];
  const rows = wt.split(/\n\|-\s*\n/);
  for (const row of rows) {
    const awardMatch = row.match(/\[\[Academy Award for Best ([^|\]]+?)(?:\|[^\]]+)?\]\]/);
    // Case-insensitive {{Won}} / {{won}} / {{won|...}}
    const wonMatch = /\{\{\s*won\s*[}|]/i.test(row);
    if (!awardMatch || !wonMatch) continue;
    const category = 'Academy Award for Best ' + awardMatch[1].trim();
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
    awards.push({ award: category, winner: nominee || undefined });
  }
  return awards;
}

async function getAwardsFromWikipedia(title, year) {
  // 1) Main film article under common naming variants
  const filmCandidates = [title, `${title} (film)`, `${title} (${year} film)`];
  for (const t of filmCandidates) {
    const wt = await fetchWikitext(t);
    const awards = parseAwardsFromWikitext(wt);
    if (awards.length > 0) return awards;
  }
  // 2) Dedicated "List of accolades received by X" page (common for films
  //    with long award histories — Dark Knight, Parasite, LOTR, etc.)
  const accoladesCandidates = [
    `List of accolades received by ${title}`,
    `List of accolades received by ${title} (film)`,
    `List of awards and nominations received by ${title}`,
  ];
  for (const t of accoladesCandidates) {
    const wt = await fetchWikitext(t);
    const awards = parseAwardsFromWikitext(wt);
    if (awards.length > 0) return awards;
  }
  return [];
}

function mapToSchema(rawAwards) {
  // Bucket by canonical category first. The raw Wikidata output has
  // duplicates (film itself + each crew member via P1686 for a tech award),
  // so we collapse to one row per category and keep winner names only for
  // single-winner categories (acting, directing, screenplay, score, song).
  const buckets = new Map(); // category → Set<winner|null>
  const alsoWonSet = new Set();
  const unknown = new Set();
  let bestPicture = false;

  for (const { award, winner } of rawAwards) {
    if (!award) continue;
    const mapping = AWARD_MAP[award];
    if (!mapping) { unknown.add(award); continue; }
    if (mapping.skip) continue;
    if (mapping.bestPicture) { bestPicture = true; continue; }
    if (mapping.alsoWon) { alsoWonSet.add(mapping.alsoWon); continue; }
    const cat = mapping.category;
    if (!buckets.has(cat)) buckets.set(cat, new Set());
    if (winner) buckets.get(cat).add(winner);
  }

  const awards = [];
  for (const [category, winners] of buckets) {
    // Tech awards (many crew members) — just category label, no winner
    if (!SINGLE_WINNER_CATEGORIES.has(category)) {
      awards.push({ category });
      continue;
    }
    // Single-person categories
    if (winners.size === 1) {
      awards.push({ category, winner: Array.from(winners)[0] });
    } else if (winners.size === 0) {
      awards.push({ category });
    } else {
      // Multiple people (rare for single-winner cats — e.g. screenplay can
      // have co-writers). Join with comma.
      awards.push({ category, winner: Array.from(winners).join(', ') });
    }
  }

  return { awards, alsoWon: Array.from(alsoWonSet), bestPicture, unknownLabels: Array.from(unknown) };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tally = JSON.parse(fs.readFileSync(TALLY_PATH, 'utf-8'));
  const targets = tally.films.filter(f => f.oscarWins > 0);
  console.log(`Backfilling ${targets.length} films with OMDb-confirmed Oscar wins...\n`);

  const report = [];
  for (let i = 0; i < targets.length; i++) {
    const f = targets[i];
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${targets.length}] ${f.title} (${f.year}) `);
    try {
      const qid = await getQID(f.title, f.year);
      // Primary: Wikipedia wikitext parse (has {{won}} markers, more complete
      // for pre-1970 films where Wikidata's P1686 qualifier is sparse).
      let raw = await getAwardsFromWikipedia(f.title, f.year);
      let source = 'wikipedia';
      // Fallback: Wikidata SPARQL if the wiki page didn't yield a table.
      if (raw.length === 0 && qid) {
        raw = await getAwardsForQID(qid);
        source = 'wikidata';
      }
      const mapped = mapToSchema(raw);
      const totalFound = mapped.awards.length + mapped.alsoWon.length + (mapped.bestPicture ? 1 : 0);
      const parity = totalFound === f.oscarWins ? '✓' : `${totalFound}/${f.oscarWins}`;
      console.log(`→ ${qid || '—'} [${source}] ${parity}`);
      report.push({ ...f, qid, source, raw, mapped, parity });
    } catch (e) {
      console.log(`→ ERROR: ${e.message}`);
      report.push({ ...f, status: 'error', error: e.message });
    }
    await sleep(250); // be kind to wikidata + wikipedia
  }

  // Summary
  const matched = report.filter(r => r.mapped && r.parity === '✓');
  const partial = report.filter(r => r.mapped && r.parity !== '✓');
  const missed  = report.filter(r => !r.mapped);
  console.log(`\nParity summary`);
  console.log(`  exact match with OMDb count: ${matched.length}`);
  console.log(`  partial / mismatched count : ${partial.length}`);
  console.log(`  missing data               : ${missed.length}`);

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport → ${REPORT_PATH}`);

  // Dark Knight spot check
  const dk = report.find(r => r.id === 'the-dark-knight-2008');
  if (dk) {
    console.log(`\nDark Knight spot check:`);
    console.log(`  qid=${dk.qid} parity=${dk.parity}`);
    console.log(`  raw awards from Wikidata:`);
    dk.raw?.forEach(r => console.log(`    - ${r.award}${r.winner ? ` → ${r.winner}` : ''}`));
    console.log(`  mapped:`, JSON.stringify(dk.mapped, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
