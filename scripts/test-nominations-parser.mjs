// Sanity check the nominations parser on a handful of known films before
// committing to a 15-minute full-catalog run. Expected outputs per film
// are based on AMPAS records.

const UA = 'oscars-journey-nominations/1.0 (mailto:iswhat444@gmail.com)';

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return await resp.json();
}

async function fetchWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1&origin=*`;
  try {
    const data = await fetchJson(url);
    return data.parse?.wikitext?.['*'] || null;
  } catch { return null; }
}

function stripWikiMarkup(s) {
  return s
    .replace(/<ref[^<]*<\/ref>|<ref[^/]*\/>/gi, '')
    .replace(/<small>[^<]*<\/small>/gi, '')
    .replace(/\{\{\s*sort\s*\|[^|}]*\|([^}]+)\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;·\s]+|[,;·\s]+$/g, '');
}

function parseNominationsFromWikitext(wt) {
  if (!wt) return [];
  const noms = [];
  const rows = wt.split(/\n\|-\s*\n/);
  for (const row of rows) {
    const awardMatch = row.match(/\[\[(Academy Award[^|\]]+?)(?:\|[^\]]+)?\]\]/);
    if (!awardMatch) continue;
    const wonMatch = /\{\{\s*won\s*[}|]/i.test(row);
    const nomMatch = /\{\{\s*nom\s*[}|]/i.test(row);
    if (!wonMatch && !nomMatch) continue;
    const category = awardMatch[1].trim();
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
    noms.push({ award: category, won: wonMatch, nominee: nominee || undefined });
  }
  return noms;
}

async function getNominationsForFilm(title, year) {
  const candidates = [
    title,
    `${title} (film)`,
    `${title} (${year} film)`,
    `List of accolades received by ${title}`,
    `List of accolades received by ${title} (film)`,
  ];
  for (const t of candidates) {
    const wt = await fetchWikitext(t);
    const noms = parseNominationsFromWikitext(wt);
    if (noms.length > 0) return { source: t, noms };
  }
  return { source: null, noms: [] };
}

const TESTS = [
  // Title,                         year, expected_wins, expected_total_noms
  ['A Streetcar Named Desire',      1951, 4, 12],
  ['The African Queen',             1951, 1, 4],
  ['Life Is Beautiful',             1998, 3, 7],
  ['Parasite',                      2019, 4, 6],
  ['Aliens',                        1986, 2, 7],
];

for (const [t, y, expW, expN] of TESTS) {
  const r = await getNominationsForFilm(t, y);
  const wins = r.noms.filter(n => n.won).length;
  const total = r.noms.length;
  const ok = wins === expW && total === expN;
  console.log(`${ok ? '✓' : '✗'} ${t} (${y}): got ${wins}W/${total}N, expected ${expW}W/${expN}N  [source: ${r.source || 'none'}]`);
  if (!ok) {
    r.noms.forEach(n => console.log(`     ${n.won ? 'W' : ' '} ${n.award}${n.nominee ? ' — ' + n.nominee : ''}`));
  }
}
