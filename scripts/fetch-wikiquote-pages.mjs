// Fetch Wikiquote pages for essential films without quotes and save raw HTML.
// Run as: node scripts/fetch-wikiquote-pages.mjs [tier]
//
// Output: scripts/wq-cache/<id>.html  (or <id>.NOTFOUND)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, 'wq-cache');
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const QUOTES_PATH = path.resolve(__dirname, '../src/data/quotes.js');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function urlVariants(title, year) {
  const withColon = title.replace(/ /g, '_');
  const noColon = withColon.replace(/:/g, '');
  const noPunct = noColon.replace(/[,!?]/g, '');
  // Year-specific first (most disambiguated), then (film), then bare title.
  // Bare title is last because it may hit a person or disambig page.
  const variants = [
    `${withColon}_(${year}_film)`,
    `${noColon}_(${year}_film)`,
    `${noPunct}_(${year}_film)`,
    `${withColon}_(film)`,
    `${noColon}_(film)`,
    `${noPunct}_(film)`,
    `${withColon}_(${year})`,
    `${noColon}_(${year})`,
    withColon,
    noColon,
    noPunct,
  ];
  const seen = new Set();
  const dedup = [];
  for (const v of variants) {
    if (!seen.has(v)) { seen.add(v); dedup.push(v); }
  }
  return dedup;
}

async function fetchPage(slug) {
  const url = `https://en.wikiquote.org/api/rest_v1/page/html/${encodeURIComponent(slug)}`;
  // Retry with backoff on transient errors
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      if (resp.status === 404) return null;
      if (!resp.ok) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      const html = await resp.text();
      // Detect disambiguation/stub/redlink pages — very short HTML likely means "page does not exist"
      if (html.length < 800) return null;
      return { html, slug, url };
    } catch (e) {
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

// Fallback: use Wikiquote opensearch to find likely slug when variants fail.
// Only returns results whose title STARTS with the exact film title (case-insensitive)
// to avoid false positives (e.g., "Sherlock Jr." -> "Sherlock Holmes").
async function searchSlug(title, year) {
  try {
    const resp = await fetch(`https://en.wikiquote.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=10&format=json`);
    if (!resp.ok) return [];
    const data = await resp.json();
    const titles = data[1] || [];
    // Filter to titles that start with our title exactly
    const lower = title.toLowerCase();
    const filtered = titles.filter(t => {
      const tl = t.toLowerCase();
      if (tl === lower) return true;
      if (tl.startsWith(lower + ' (')) return true;
      return false;
    });
    const slugs = filtered.map(t => t.replace(/ /g, '_'));
    // Prefer ones with year or "film"
    const yearSlug = slugs.find(s => s.includes(String(year)));
    const filmSlug = slugs.find(s => s.toLowerCase().includes('film'));
    const ordered = [];
    if (yearSlug) ordered.push(yearSlug);
    if (filmSlug && filmSlug !== yearSlug) ordered.push(filmSlug);
    for (const s of slugs) if (!ordered.includes(s)) ordered.push(s);
    return ordered;
  } catch (e) {
    return [];
  }
}

async function main() {
  const tierArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());
  const quotesModule = await import(pathToFileURL(QUOTES_PATH).href + '?t=' + Date.now());
  const quoted = new Set(Object.keys(quotesModule.QUOTES));
  let targets = moviesModule.MOVIES.filter(m => m.category === 'ESSENTIAL' && !quoted.has(m.id));
  if (tierArg !== null) targets = targets.filter(m => m.tier === tierArg);
  // Sort by tier desc, then year
  targets.sort((a, b) => (b.tier - a.tier) || (a.year - b.year));

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log(`Fetching ${targets.length} Wikiquote pages...`);
  let found = 0, missing = 0, cached = 0;
  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const foundPath = path.join(CACHE_DIR, `${m.id}.html`);
    const missPath = path.join(CACHE_DIR, `${m.id}.NOTFOUND`);
    if (fs.existsSync(foundPath) || fs.existsSync(missPath)) {
      cached++;
      continue;
    }
    const variants = urlVariants(m.title, m.year);
    let page = null;
    for (const slug of variants) {
      page = await fetchPage(slug);
      if (page) break;
      await sleep(60);
    }
    if (!page) {
      // Try opensearch-based fallback
      const searched = await searchSlug(m.title, m.year);
      for (const slug of searched) {
        if (variants.includes(slug)) continue;
        page = await fetchPage(slug);
        if (page) break;
        await sleep(60);
      }
    }
    if (page) {
      fs.writeFileSync(foundPath, `<!-- slug: ${page.slug} -->\n<!-- url: ${page.url} -->\n` + page.html);
      found++;
      console.log(`  [${i + 1}/${targets.length}] ${m.title} (${m.year}) tier ${m.tier} -> ${page.slug}`);
    } else {
      fs.writeFileSync(missPath, `No page found. Tried: ${variants.join(', ')}\n`);
      missing++;
      console.log(`  [${i + 1}/${targets.length}] ${m.title} (${m.year}) tier ${m.tier} -> NOT FOUND`);
    }
    await sleep(250);
  }
  console.log(`\nDone. Found: ${found}, Not found: ${missing}, Cached: ${cached}`);
}

main().catch(e => { console.error(e); process.exit(1); });
