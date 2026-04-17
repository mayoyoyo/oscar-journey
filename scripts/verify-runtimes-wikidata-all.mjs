// Full-catalog Wikidata runtime cross-check. Looks up every film (not just
// those flagged by OMDb) so we can sanity-check OMDb's data once quota is back.
// Writes runtime-wikidata-all.json with every film's Wikidata runtime.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_OUT = path.resolve(__dirname, 'runtime-wikidata-all.json');

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
  return raw;
}

function pickBest(bindings, targetYear) {
  const candidates = [];
  for (const b of bindings) {
    if (!b.duration || !b.duration.value) continue;
    const raw = Number(b.duration.value);
    const unit = b.unitLabel && b.unitLabel.value;
    const minutes = normUnit(raw, unit);
    if (!minutes || minutes < 4) continue;
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
  candidates.sort((a, b) => {
    if (a.yearDiff !== b.yearDiff) return a.yearDiff - b.yearDiff;
    return a.minutes - b.minutes;
  });
  return candidates[0];
}

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
        wikidataId: best.wikidataId,
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

  // Resume support
  let existing = {};
  if (fs.existsSync(REPORT_OUT)) {
    try { existing = JSON.parse(fs.readFileSync(REPORT_OUT, 'utf8')).results || {}; } catch {}
  }

  console.log(`Looking up ${movies.length} films on Wikidata (resuming with ${Object.keys(existing).length} already done)...`);

  const results = { ...existing };
  let done = 0, found = 0, missing = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    if (results[m.id]) { done++; continue; }

    const wd = await wikidataRuntime(m.title, m.year);
    if (wd && wd.duration) {
      found++;
      results[m.id] = { title: m.title, year: m.year, wikidataRuntime: wd.duration, wikidataId: wd.wikidataId };
    } else if (wd) {
      results[m.id] = { title: m.title, year: m.year, wikidataRuntime: null, wikidataId: wd.wikidataId };
      missing++;
    } else {
      results[m.id] = { title: m.title, year: m.year, wikidataRuntime: null, wikidataId: null };
      missing++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${movies.length} - found ${found}, missing ${missing}, resumed ${done}`);
      // Write periodic snapshot so we can resume after crash/kill
      fs.writeFileSync(REPORT_OUT, JSON.stringify({ results }, null, 2));
    }
    await sleep(200);
  }

  fs.writeFileSync(REPORT_OUT, JSON.stringify({ results }, null, 2));
  console.log(`\nDone. Found: ${found}. Missing: ${missing}. Total stored: ${Object.keys(results).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
