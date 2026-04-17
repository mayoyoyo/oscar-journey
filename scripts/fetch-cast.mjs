// Bake FULL cast (not just top-billed) into src/data/cast.json for
// search purposes. Pulled from Wikidata's P161 "cast member" property,
// which exposes the complete cast for most well-known films.
//
// OMDb's Actors field is only 3-4 top-billed — search against just that
// misses supporting/character actors. This script broadens the search
// index without changing the modal display (which still uses actors.json).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OUT_PATH    = path.resolve(__dirname, '../src/data/cast.json');

const UA = 'oscars-journey-cast-backfill/1.0 (mailto:iswhat444@gmail.com)';

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return await resp.json();
}

async function getQID(title, year) {
  const candidates = [title, `${title} (film)`, `${title} (${year} film)`];
  for (const t of candidates) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(t)}&format=json&redirects=1&origin=*`;
    try {
      const data = await fetchJson(url);
      const pages = Object.values(data.query.pages || {});
      const qid = pages[0]?.pageprops?.wikibase_item;
      if (qid) return qid;
    } catch {}
  }
  return null;
}

async function getCast(qid) {
  const q = `
    SELECT DISTINCT ?castLabel WHERE {
      wd:${qid} wdt:P161 ?cast .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}&format=json`;
  try {
    const data = await fetchJson(url, { headers: { Accept: 'application/sparql-results+json' } });
    return (data.results?.bindings || [])
      .map(b => b.castLabel?.value)
      .filter(Boolean)
      // Wikidata sometimes returns raw QIDs when label is missing — skip those
      .filter(s => !/^Q\d+$/.test(s));
  } catch {
    return [];
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const mod = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mod.MOVIES;
  console.log(`Fetching full cast from Wikidata for ${MOVIES.length} films...`);
  const out = {};
  let withCast = 0;
  let totalNames = 0;
  for (let i = 0; i < MOVIES.length; i++) {
    const m = MOVIES[i];
    if (i % 25 === 0) process.stdout.write(`  ${i}/${MOVIES.length}\r`);
    try {
      const qid = await getQID(m.title, m.year);
      if (!qid) { await sleep(150); continue; }
      const cast = await getCast(qid);
      if (cast.length > 0) {
        out[m.id] = cast;
        withCast++;
        totalNames += cast.length;
      }
    } catch (e) {
      // Network hiccup — skip this film, continue
    }
    await sleep(250);
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n${withCast}/${MOVIES.length} films with cast data`);
  console.log(`${totalNames} total cast entries → ${OUT_PATH}`);
  console.log(`Avg cast size: ${(totalNames / withCast).toFixed(1)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
