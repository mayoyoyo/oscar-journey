// Wikidata fallback: for each film flagged in runtime-report.json (OMDb not-found
// or suspicious), query Wikidata's SPARQL endpoint for the film's duration (P2047).
// This is used when OMDb's daily quota is exhausted.
//
// Wikidata has no hard rate limit, but we throttle to 1 req/250ms to be polite.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_IN = path.resolve(__dirname, 'runtime-report.json');
const REPORT_OUT = path.resolve(__dirname, 'runtime-wikidata-report.json');

const USER_AGENT = 'OscarJourneyBot/1.0 (https://theoscarsjourney.com; christopheraidank@gmail.com)';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeSparql(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Query Wikidata for a film by (title, year). Tries a few strategies:
//   1. Exact English label match with release-year filter
//   2. Exact alias match with release-year filter
// Returns { duration: number } or null.
async function wikidataRuntime(title, year) {
  const clean = title
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  const t = escapeSparql(clean);
  // Match films/animated films/documentary films etc (all subclasses of film Q11424)
  // Some are animated films (Q202866) which are subclass. Use wdt:P31/wdt:P279*.
  // Pull duration WITH its unit so we can distinguish minutes vs seconds vs hours.
  // Some Wikidata entries store duration in seconds (e.g. Oppenheimer = 10809 s).
  const query = `SELECT DISTINCT ?film ?duration ?unitLabel WHERE {
  ?film wdt:P31/wdt:P279* wd:Q11424.
  { ?film rdfs:label "${t}"@en. } UNION { ?film skos:altLabel "${t}"@en. }
  ?film wdt:P577 ?date.
  FILTER(YEAR(?date) >= ${year - 1} && YEAR(?date) <= ${year + 1})
  OPTIONAL {
    ?film p:P2047 ?ds.
    ?ds psv:P2047 ?dsv.
    ?dsv wikibase:quantityAmount ?duration.
    ?dsv wikibase:quantityUnit ?unit.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 15`;

  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query);
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const bindings = d.results && d.results.bindings || [];
    // Pick first one that has a duration. Normalize unit to minutes.
    for (const b of bindings) {
      if (!b.duration || !b.duration.value) continue;
      const raw = Number(b.duration.value);
      if (isNaN(raw) || raw <= 0) continue;
      const unit = b.unitLabel && b.unitLabel.value;
      let minutes;
      if (unit === 'minute') minutes = raw;
      else if (unit === 'second') minutes = Math.round(raw / 60);
      else if (unit === 'hour') minutes = Math.round(raw * 60);
      else minutes = raw; // unknown unit, assume already minutes
      return {
        duration: minutes,
        rawDuration: raw,
        unit,
        wikidataId: b.film.value.split('/').pop(),
      };
    }
    // No duration but found film
    if (bindings.length) {
      return { duration: null, wikidataId: bindings[0].film.value.split('/').pop() };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const movies = (await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now())).MOVIES;
  const report = JSON.parse(fs.readFileSync(REPORT_IN, 'utf8'));

  // Build film lookup
  const byId = new Map();
  for (const m of movies) byId.set(m.id, m);

  const flagged = report.flagged;
  console.log(`Looking up ${flagged.length} flagged films on Wikidata...`);

  const results = [];
  let found = 0, stillMissing = 0, foundNoDuration = 0;

  for (let i = 0; i < flagged.length; i++) {
    const f = flagged[i];
    const m = byId.get(f.id);
    if (!m) continue;

    const wd = await wikidataRuntime(m.title, m.year);
    if (wd && wd.duration) {
      found++;
      results.push({
        ...f,
        wikidataRuntime: wd.duration,
        wikidataRaw: wd.rawDuration,
        wikidataUnit: wd.unit,
        wikidataId: wd.wikidataId,
      });
    } else if (wd) {
      foundNoDuration++;
      results.push({ ...f, wikidataRuntime: null, wikidataId: wd.wikidataId, note: 'found-no-duration' });
    } else {
      stillMissing++;
      results.push({ ...f, wikidataRuntime: null, wikidataId: null, note: 'not-found-on-wikidata' });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${flagged.length} - found ${found}, no-dur ${foundNoDuration}, missing ${stillMissing}`);
    }
    await sleep(250);
  }

  fs.writeFileSync(REPORT_OUT, JSON.stringify({
    total: flagged.length,
    foundWithDuration: found,
    foundNoDuration,
    stillMissing,
    results,
  }, null, 2));

  console.log(`\nDone. Found with duration: ${found}. No duration: ${foundNoDuration}. Missing: ${stillMissing}`);
  console.log(`Report: ${REPORT_OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
