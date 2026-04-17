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

function normUnit(raw, unit) {
  if (isNaN(raw) || raw <= 0) return null;
  if (unit === 'minute') return raw;
  if (unit === 'second') return Math.round(raw / 60);
  if (unit === 'hour') return Math.round(raw * 60);
  return raw; // unknown unit, assume already minutes
}

// Pick best (film, duration) among all label-matching candidates.
// Prefers exact-year match, then among the same film prefers the SHORTEST runtime
// to avoid picking an extended/director's cut value when multiple exist.
function pickBest(bindings, targetYear) {
  const candidates = [];
  for (const b of bindings) {
    if (!b.duration || !b.duration.value) continue;
    const raw = Number(b.duration.value);
    const unit = b.unitLabel && b.unitLabel.value;
    const minutes = normUnit(raw, unit);
    if (!minutes || minutes < 4) continue; // filter trailers/shorts noise
    const yearVal = b.date && b.date.value ? Number(b.date.value.slice(0, 4)) : null;
    candidates.push({
      minutes,
      rawDuration: raw,
      unit,
      year: yearVal,
      yearDiff: yearVal == null ? 999 : Math.abs(yearVal - targetYear),
      wikidataId: b.film.value.split('/').pop(),
    });
  }
  if (!candidates.length) return null;
  // Sort: exact year first, then closest, then shortest (picks theatrical not extended)
  candidates.sort((a, b) => {
    if (a.yearDiff !== b.yearDiff) return a.yearDiff - b.yearDiff;
    return a.minutes - b.minutes;
  });
  return candidates[0];
}

// Title variants to try on match — strip ellipses and ending punctuation.
function titleVariants(title) {
  const t0 = title
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  const set = new Set([t0]);
  set.add(t0.replace(/\u2026+$/g, '').trim());
  set.add(t0.replace(/\.\.\.+$/g, '').trim());
  set.add(t0.replace(/[?.!\u2026]+$/g, '').trim());
  if (t0.includes('...')) set.add(t0.replace(/\.\.\./g, '\u2026'));
  if (t0.includes('\u2026')) set.add(t0.replace(/\u2026/g, '...'));
  // Split on colon (some films have subtitle variations)
  const colonIdx = t0.indexOf(':');
  if (colonIdx > 0) set.add(t0.slice(0, colonIdx).trim());
  return [...set].filter(Boolean);
}

async function wikidataRuntime(title, year) {
  const variants = titleVariants(title);
  const labelClauses = variants
    .map(v => `{ ?film rdfs:label "${escapeSparql(v)}"@en. } UNION { ?film skos:altLabel "${escapeSparql(v)}"@en. }`)
    .join(' UNION ');
  const query = `SELECT DISTINCT ?film ?duration ?unitLabel ?date WHERE {
  ?film wdt:P31/wdt:P279* wd:Q11424.
  ${labelClauses}
  ?film wdt:P577 ?date.
  FILTER(YEAR(?date) >= ${year - 1} && YEAR(?date) <= ${year + 1})
  OPTIONAL {
    ?film p:P2047 ?ds.
    ?ds psv:P2047 ?dsv.
    ?dsv wikibase:quantityAmount ?duration.
    ?dsv wikibase:quantityUnit ?unit.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 40`;

  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query);
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const bindings = d.results && d.results.bindings || [];
    const best = pickBest(bindings, year);
    if (best) {
      return {
        duration: best.minutes,
        rawDuration: best.rawDuration,
        unit: best.unit,
        wikidataId: best.wikidataId,
        wikidataYear: best.year,
      };
    }
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
