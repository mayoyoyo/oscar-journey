// For each essential whose OMDb poster URL 404s, try alternate searches:
// year ± 1, and a few title variants (apostrophes, accents). Reports any that
// get a working URL via an alternate path — user can then add them as
// OMDB_YEAR_OVERRIDES or OMDB_TITLE_OVERRIDES in src/utils/omdb.js.

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238'];
let k = 0;

const targets = [
  { id: 'the-umbrellas-of-cherbourg-1964', title: 'The Umbrellas of Cherbourg', year: 1964 },
  { id: 'the-color-of-pomegranates-1969', title: 'The Color of Pomegranates', year: 1969 },
  { id: 'adoption-1975', title: 'Adoption', year: 1975 },
  { id: 'the-ballad-of-gregorio-cortez-1982', title: 'The Ballad of Gregorio Cortez', year: 1982 },
  { id: 'au-revoir-les-enfants-1987', title: 'Au revoir les enfants', year: 1987 },
  { id: 'thelonious-monk-straight-no-chaser-1988', title: 'Thelonious Monk: Straight, No Chaser', year: 1988 },
  { id: 'la-cienaga-2001', title: 'La Ciénaga', year: 2001 },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function omdb(title, year) {
  const t = encodeURIComponent(title);
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const key = OMDB_KEYS[k];
    const url = `https://www.omdbapi.com/?t=${t}&type=movie${year ? `&y=${year}` : ''}&apikey=${key}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.Error && /limit/i.test(d.Error)) { k = (k + 1) % OMDB_KEYS.length; continue; }
    return d;
  }
  return null;
}

async function urlOk(u) {
  try { const r = await fetch(u, { method: 'HEAD' }); return r.ok; } catch { return false; }
}

async function tryVariant(title, year) {
  const d = await omdb(title, year);
  if (!d || d.Response !== 'True' || !d.Poster || d.Poster === 'N/A') return null;
  const ok = await urlOk(d.Poster);
  return ok ? { ...d, matched: { title, year } } : null;
}

console.log(`Retrying ${targets.length} broken posters with year/title variants...\n`);

for (const t of targets) {
  const variants = [
    [t.title, t.year],
    [t.title, t.year + 1],
    [t.title, t.year - 1],
    [t.title, null],
    // Title variants (drop colons, ASCII fold common accents)
    [t.title.replace(/:/g, ''), t.year],
    [t.title.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), t.year],
    [t.title.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), null],
  ];
  let found = null;
  for (const [title, year] of variants) {
    const r = await tryVariant(title, year);
    await sleep(30);
    if (r) { found = r; break; }
  }
  if (found) {
    console.log(`  ✓ ${t.title} — matched with "${found.matched.title}" (${found.matched.year ?? 'no year'}) → ${found.Title} (${found.Year})`);
    console.log(`      ${found.Poster}`);
  } else {
    console.log(`  ✗ ${t.title} (${t.year}) — no working variant found`);
  }
}
