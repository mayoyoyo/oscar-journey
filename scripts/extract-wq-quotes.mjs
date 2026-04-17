// Extract quote candidates from cached Wikiquote HTML pages.
// For each film, produces a JSON file of candidate quotes (with character names, etc.)
// We output both raw bullet text and cleaned quote text.
//
// Usage: node scripts/extract-wq-quotes.mjs [id]
//
// Heuristic: Wikiquote film pages use <ul><li> bullets, often with
// <b>CHAR:</b> QUOTE structure. We strip character names, stage directions,
// references, etc. Only extract items from "Dialogue" or top-level sections
// (skip "External links", "See also", "About <Film>", "Cast" sections).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, 'wq-cache');
const OUT_DIR = path.resolve(__dirname, 'wq-extracted');

function cleanQuote(raw) {
  let s = raw
    // Remove reference markers like [1]
    .replace(/\[\d+\]/g, '')
    // Remove stage directions in brackets and parens at start/end
    .replace(/\[[^\]]*\]/g, '')
    // Remove parenthetical stage directions only when they look like directions
    // (all lowercase or with common action words)
    // Normalize curly quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // En/em dashes → plain
    .replace(/[\u2013\u2014]/g, '-')
    // Ellipsis
    .replace(/\u2026/g, '...')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  // Strip surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function stripCharPrefix(line) {
  // Strip "CHARACTER NAME:" or "Character Name:" prefix. Accept first-capital words, all-caps, or mixed,
  // up to a colon, max ~40 chars.
  const m = line.match(/^([A-Z][A-Za-z' .\-]{0,40}):\s*(.+)$/);
  if (m) return m[2];
  // All-caps prefix like "NORMAN BATES:"
  const m2 = line.match(/^([A-Z][A-Z' .\-]{1,40}):\s*(.+)$/);
  if (m2) return m2[2];
  return line;
}

// Extract text from a node, preserving structure we need
function nodeText(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse HTML to find top-level <li> elements (not nested).
// We actually want ALL <li> that are quote candidates. But we should skip sections
// like "External links", "See also", "Cast", "About <Film>", "Taglines".
function extractQuotesFromHtml(html) {
  // Remove head/scripts
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[\s\S]*?<\/style>/gi, '')
                   .replace(/<head[\s\S]*?<\/head>/gi, '');

  // Find all section headings + their content. We'll split by <h2>/<h3>
  // A Wikiquote film page typically has sections for each character/subject,
  // plus "Dialogue", "Cast", "Taglines", "About", "External links", "See also"
  const SKIP_HEADINGS = [/^external\s*links?/i, /^see\s*also/i, /^cast\b/i, /^about\s+/i, /^references?/i, /^taglines?/i];

  // Split by <h2> or <h3> block
  const sections = [];
  const headingRegex = /<h([23])[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  let lastIdx = 0;
  let prevHeading = '';
  while ((match = headingRegex.exec(body)) !== null) {
    const sectionBody = body.slice(lastIdx, match.index);
    sections.push({ heading: prevHeading, body: sectionBody });
    prevHeading = nodeText(match[2]);
    lastIdx = match.index + match[0].length;
  }
  sections.push({ heading: prevHeading, body: body.slice(lastIdx) });

  const quotes = [];
  for (const sec of sections) {
    if (SKIP_HEADINGS.some(rx => rx.test(sec.heading))) continue;
    // Find <li> tags (film quotes) and <dd> tags (dialogue blocks).
    const tagRegex = /<(li|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let tag;
    while ((tag = tagRegex.exec(sec.body)) !== null) {
      const inner = tag[2];
      const text = nodeText(inner);
      if (!text || text.length < 5 || text.length > 500) continue;
      if (/^main article:/i.test(text)) continue;
      quotes.push({ heading: sec.heading || '(intro)', raw: text });
    }
  }
  return quotes;
}

function main() {
  const idArg = process.argv[2];
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.html'));
  const targets = idArg ? files.filter(f => f.startsWith(idArg)) : files;
  console.log(`Extracting from ${targets.length} cached pages...`);

  for (const f of targets) {
    const id = f.replace(/\.html$/, '');
    const html = fs.readFileSync(path.join(CACHE_DIR, f), 'utf8');
    const raw = extractQuotesFromHtml(html);
    const cleaned = raw.map(q => {
      const stripped = stripCharPrefix(q.raw);
      const clean = cleanQuote(stripped);
      return { heading: q.heading, raw: q.raw, clean };
    }).filter(q => q.clean.length >= 5 && q.clean.length <= 300);
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(cleaned, null, 2));
  }
  console.log(`Done. Output: ${OUT_DIR}`);
}

main();
