// Verify the newly added ESSENTIAL quotes against cached Wikiquote HTML.
// Unlike the primary verifier, this uses the local cache (scripts/wq-cache/*.html).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, 'wq-cache');
const QUOTES_PATH = path.resolve(__dirname, '../src/data/quotes.js');

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(html) {
  return normalize(html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/&#\d+;/g, ' '));
}

function quoteFound(pageText, quote) {
  const nq = normalize(quote);
  if (nq.length === 0) return false;
  if (pageText.includes(nq)) return true;
  if (nq.length > 80) {
    const head = nq.slice(0, 50);
    if (pageText.includes(head)) return true;
  }
  const first8 = nq.split(' ').slice(0, 8).join(' ');
  if (first8.length >= 15 && pageText.includes(first8)) return true;
  return false;
}

async function main() {
  const ids = process.argv.slice(2);
  const mod = await import(pathToFileURL(QUOTES_PATH).href + '?t=' + Date.now());
  const targets = ids.length ? ids : Object.keys(mod.QUOTES);
  let checked = 0;
  let failed = [];
  for (const id of targets) {
    const htmlPath = path.join(CACHE_DIR, `${id}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    const text = htmlToText(fs.readFileSync(htmlPath, 'utf8'));
    const quotes = mod.QUOTES[id] || [];
    for (const q of quotes) {
      checked++;
      const ok = quoteFound(text, q);
      if (!ok) {
        failed.push({ id, q });
        console.log('FAIL', id, '::', q);
      }
    }
  }
  console.log(`\n${checked} quotes checked, ${failed.length} failed.`);
}

main();
