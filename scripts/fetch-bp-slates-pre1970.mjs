// Fetch pre-1970 Best Picture nominee slates from the Wikipedia "Xth
// Academy Awards" page. Targets only ceremonies that already have a
// BP-nominated catalog film (so the modal's BP section gets its full
// slate); skip ceremonies with no catalog representation since the
// modal never opens for those anyway.
//
// Writes src/data/oscar-ceremonies.json:
//   { "24": { "bpNominees": [{title, year, id, won}] } }
//
// The `id` field is populated when a catalog film matches (allowing
// clickable rows) and null otherwise (dimmed phantom rows).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const OUT_PATH = path.resolve(__dirname, '../src/data/oscar-ceremonies.json');

const UA = 'oscars-journey-ceremonies/1.0 (mailto:iswhat444@gmail.com)';

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return await resp.json();
}

async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1&origin=*`;
  const data = await fetchJson(url);
  return data.parse?.wikitext?.['*'] || null;
}

// Extract Best Picture nominees from a ceremony's wikitext.
//
// Pre-1970 ceremonies use the {{Award category|…|[[Academy Award for
// Best Picture|...]]}} marker followed by a bulleted list: winner is the
// first item wrapped in '''bold''' with a leading `*`, other nominees
// are `**`-indented italicized film links. Newer ceremonies use bigger
// nominee tables; we don't need them here (post-1970 slate is already
// fully represented in the catalog).
function parseBP(wt) {
  if (!wt) return [];
  const markerRe = /\{\{\s*Award category\|[^|}]*\|\s*\[\[\s*Academy Award for Best Picture[^}]*\}\}/i;
  const marker = wt.match(markerRe);
  if (!marker) return [];
  const start = marker.index + marker[0].length;
  // Next Award category marker ends the BP block.
  const rest = wt.slice(start);
  const nextMarker = rest.search(/\{\{\s*Award category/i);
  const section = nextMarker > -1 ? rest.slice(0, nextMarker) : rest.slice(0, 2000);
  // Parse the bulleted list. The winner line starts with `*` (single
  // bullet) and wraps the film in '''...'''. Other nominees start with
  // `**` and use plain italic formatting.
  const films = [];
  for (const raw of section.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('*')) continue;
    const bulletDepth = line.match(/^\*+/)[0].length;
    // Find first italicized wikilink in this line — that's the film.
    const fm = line.match(/''\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]''/)
            || line.match(/\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/);
    if (!fm) continue;
    const title = fm[1].replace(/\s*\(\d{4} film\)$/, '').replace(/\s*\(film\)$/, '').trim();
    // Winner: single-bullet line wrapped in '''...''' or containing
    // {{double dagger}}.
    const won = bulletDepth === 1 && (/'''/.test(line) || /\{\{double dagger\}\}/i.test(line));
    films.push({ title, won });
  }
  // Deduplicate (a winning nominee may appear in both the bulleted list
  // and later summary paragraphs).
  const seen = new Map();
  for (const f of films) {
    const k = f.title.toLowerCase();
    if (!seen.has(k)) seen.set(k, f);
    else if (f.won) seen.get(k).won = true;
  }
  return Array.from(seen.values());
}

function slugify(title, year) {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + year;
}

async function main() {
  const mm = await import(pathToFileURL(MOVIES_PATH).href);
  const MOVIES = mm.MOVIES;
  // Ceremonies we need to cover: any pre-1970 ceremony where a catalog
  // film was BP-nominated. Two sources:
  //   (a) catalog films with category='BP' and ceremony set
  //   (b) any catalog film (often ESSENTIAL) whose `nominations` array
  //       includes Best Picture — ceremony derived from year-1927 when
  //       not explicitly tagged (e.g. Adventures of Robin Hood is an
  //       ESSENTIAL in our catalog but was BP-nominated at 11th AA).
  const ceremonies = new Set();
  for (const m of MOVIES) {
    const cer = m.ceremony ?? (m.year >= 1929 ? m.year - 1927 : null);
    if (cer == null || cer >= 43) continue;
    if (m.category === 'BP') { ceremonies.add(cer); continue; }
    if (Array.isArray(m.nominations)
        && m.nominations.some(n => n.category === 'Best Picture')) {
      ceremonies.add(cer);
    }
  }
  const sorted = [...ceremonies].sort((a, b) => a - b);
  console.log(`Fetching BP slates for ${sorted.length} pre-1970 ceremonies...`);

  const out = {};
  for (const c of sorted) {
    const ord = (n) => {
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const page = `${ord(c)} Academy Awards`;
    process.stdout.write(`  ${page}... `);
    const wt = await fetchWikitext(page);
    const slate = parseBP(wt);
    const year = c + 1927; // 1st AA honored 1927 films, held 1929 — ceremony year = catalog year + 1927
    // For each nominee, check whether a catalog film with matching title+year exists.
    const nominees = slate.map(f => {
      const expectedId = slugify(f.title, year);
      const catalogMatch = MOVIES.find(m => m.id === expectedId)
        || MOVIES.find(m => m.title.toLowerCase() === f.title.toLowerCase() && m.year === year);
      return {
        title: f.title,
        year,
        id: catalogMatch?.id || null,
        won: f.won,
      };
    });
    out[String(c)] = { bpNominees: nominees };
    console.log(`${nominees.length} nominees`);
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
  const totalPhantom = Object.values(out).flatMap(x => x.bpNominees).filter(n => !n.id).length;
  const totalMatched = Object.values(out).flatMap(x => x.bpNominees).filter(n => n.id).length;
  console.log(`Catalog matches: ${totalMatched}   Phantom (not in catalog): ${totalPhantom}`);
}

main().catch(e => { console.error(e); process.exit(1); });
