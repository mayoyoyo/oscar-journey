// Verify the ESSENTIAL-film quotes we added against Wikiquote pages.
//
// Strategy: for each film with quotes in src/data/quotes.js, fetch the Wikiquote
// page and check whether each quote (as a normalized substring or distinctive
// fingerprint) actually appears. Unverified quotes are removed. Verified ones stay.
//
// Normalize aggressively: lowercase, strip all non-alphanumeric chars except spaces,
// collapse whitespace. This makes "Here's looking at you, kid." match
// "heres looking at you kid" regardless of punctuation, curly quotes, em-dashes, etc.
//
// For long quotes (>80 chars normalized), we check if the first ~50 chars appear —
// partial match is fine since the page may quote it differently than our transcription.
//
// Outputs:
//  - scripts/quote-verification-report.json (all results)
//  - rewrites src/data/quotes.js keeping only verified quotes for ESSENTIAL films.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUOTES_PATH = path.resolve(__dirname, '../src/data/quotes.js');
const MOVIES_PATH = path.resolve(__dirname, '../src/data/movies.js');
const REPORT_PATH = path.resolve(__dirname, 'quote-verification-report.json');

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[''']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fetch Wikiquote page HTML → plain text. Tries "(film)" disambiguation first.
async function fetchWikiquote(title, year) {
  // Keep the colon (Wikiquote URLs often preserve it) AND also try stripped variant.
  const withColon = title.replace(/ /g, '_');
  const noColon = withColon.replace(/:/g, '');
  const variants = [
    withColon,
    `${withColon}_(film)`,
    `${withColon}_(${year}_film)`,
    `${withColon}_(${year})`,
    noColon,
    `${noColon}_(film)`,
    `${noColon}_(${year}_film)`,
  ];
  // Deduplicate while preserving order
  const seen = new Set();
  const dedup = [];
  for (const v of variants) {
    if (!seen.has(v)) { seen.add(v); dedup.push(v); }
  }
  for (const slug of dedup) {
    const url = `https://en.wikiquote.org/api/rest_v1/page/html/${encodeURIComponent(slug)}`;
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      if (!resp.ok) continue;
      const html = await resp.text();
      // Strip tags crudely — we only need text for substring matching
      const text = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/&#\d+;/g, ' ');
      return normalize(text);
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Is `quote` present (fuzzy) in `pageText`?
function quoteFound(pageText, quote) {
  const nq = normalize(quote);
  if (nq.length === 0) return false;
  // Direct substring — covers most short iconic quotes
  if (pageText.includes(nq)) return true;
  // Long quote: check the most distinctive ~50-char window (start)
  if (nq.length > 80) {
    const head = nq.slice(0, 50);
    const mid = nq.slice(Math.floor(nq.length / 2) - 25, Math.floor(nq.length / 2) + 25);
    if (pageText.includes(head)) return true;
    if (pageText.includes(mid)) return true;
  }
  // Multi-phrase quote joined by punctuation — try first distinctive phrase
  const firstChunk = nq.split(' ').slice(0, 8).join(' ');
  if (firstChunk.length >= 20 && pageText.includes(firstChunk)) return true;
  return false;
}

async function main() {
  const quotesModule = await import(pathToFileURL(QUOTES_PATH).href + '?t=' + Date.now());
  const moviesModule = await import(pathToFileURL(MOVIES_PATH).href + '?t=' + Date.now());

  const essentials = new Map();
  for (const m of moviesModule.MOVIES) {
    if (m.category === 'ESSENTIAL') essentials.set(m.id, m);
  }

  const targets = [];
  for (const [id, quotes] of Object.entries(quotesModule.QUOTES)) {
    if (essentials.has(id)) targets.push({ id, movie: essentials.get(id), quotes });
  }
  console.log(`Verifying ${targets.length} essential films' quotes against Wikiquote…`);

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const { id, movie, quotes } = targets[i];
    const pageText = await fetchWikiquote(movie.title, movie.year);
    if (!pageText) {
      console.log(`  [${i + 1}/${targets.length}] ${movie.title} — WIKIQUOTE PAGE NOT FOUND`);
      results.push({ id, title: movie.title, pageFound: false, quotes: quotes.map(q => ({ text: q, verified: false, reason: 'page-not-found' })) });
      await sleep(100);
      continue;
    }
    const qResults = quotes.map(q => ({ text: q, verified: quoteFound(pageText, q) }));
    const okCount = qResults.filter(r => r.verified).length;
    console.log(`  [${i + 1}/${targets.length}] ${movie.title} — ${okCount}/${quotes.length} verified`);
    results.push({ id, title: movie.title, pageFound: true, quotes: qResults });
    await sleep(100);
  }

  // Apply: rewrite quotes.js keeping only verified quotes for ESSENTIAL films.
  // If all quotes for a film fail, drop the film entirely (Daily Oscar will exclude it).
  const newQuotesMap = new Map(Object.entries(quotesModule.QUOTES));
  for (const r of results) {
    const verified = r.quotes.filter(q => q.verified).map(q => q.text);
    if (verified.length > 0) newQuotesMap.set(r.id, verified);
    else newQuotesMap.delete(r.id);
  }

  // Regenerate quotes.js preserving original order for non-ESSENTIAL films
  const quotesRaw = fs.readFileSync(QUOTES_PATH, 'utf8');
  // Strip the existing ESSENTIAL section (our marker comment onwards)
  const markerIdx = quotesRaw.indexOf('// ESSENTIAL (non-Oscar canon)');
  if (markerIdx === -1) {
    console.error('Could not find ESSENTIAL section marker in quotes.js — aborting to be safe');
    process.exit(1);
  }
  // Find the closing `};` after the marker
  const closeIdx = quotesRaw.indexOf('};', markerIdx);
  const prefix = quotesRaw.slice(0, markerIdx).replace(/\n+\s*$/, '\n\n');
  // Rebuild ESSENTIAL section with only verified quotes
  let section = `  // ====================================================================\n`;
  section += `  // ESSENTIAL (non-Oscar canon) — verified against Wikiquote.\n`;
  section += `  // ====================================================================\n\n`;
  const keptEssentialEntries = results
    .map(r => ({ id: r.id, kept: r.quotes.filter(q => q.verified).map(q => q.text) }))
    .filter(r => r.kept.length > 0);
  for (const { id, kept } of keptEssentialEntries) {
    const quotesStr = kept.map(q => JSON.stringify(q)).join(', ');
    section += `  '${id}': [${quotesStr}],\n`;
  }
  section += `};\n`;
  const out = prefix + section;
  fs.writeFileSync(QUOTES_PATH, out);
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ results }, null, 2));

  const totalStart = results.reduce((n, r) => n + r.quotes.length, 0);
  const totalVerified = results.reduce((n, r) => n + r.quotes.filter(q => q.verified).length, 0);
  const filmsKept = keptEssentialEntries.length;
  console.log(`\nDone.`);
  console.log(`  Total quotes attempted: ${totalStart}`);
  console.log(`  Verified & kept: ${totalVerified}`);
  console.log(`  Films with ≥1 verified quote: ${filmsKept} (of ${results.length})`);
  console.log(`  Report: ${REPORT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
