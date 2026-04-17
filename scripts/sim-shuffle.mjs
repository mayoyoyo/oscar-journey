// Comprehensive simulation of the front-loaded shuffle across many seeds.
// Reports: per-position quality, tier distribution in opening stretch, diversity
// (unique genres + decades in first 20), iron-clad coverage, BP-nominee dilution.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const movies = (await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href)).MOVIES;

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function quality(m) {
  const lists = m.lists ? [...m.lists] : [];
  if (m.category !== 'ESSENTIAL') {
    if (m.won && !lists.includes('OSCAR')) lists.push('OSCAR');
    else if (m.category === 'BP' && !m.won && !lists.includes('OSCAR_NOM')) lists.push('OSCAR_NOM');
  }
  return lists.length || 1;
}

function getDecade(y) {
  if (y < 1920) return '10s';
  if (y < 1930) return '20s';
  if (y < 1940) return '30s';
  if (y < 1950) return '40s';
  if (y < 1960) return '50s';
  if (y < 1970) return '60s';
  if (y < 1980) return '70s';
  if (y < 1991) return '80s';
  if (y < 2000) return '90s';
  if (y < 2010) return '00s';
  if (y < 2020) return '2010s';
  return '2020s';
}

function diversityShuffle(ms, rng) {
  const pool = [...ms];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const total = pool.length;
  const intTotal = ms.filter(m => m.category === 'INT').length;
  const animTotal = ms.filter(m => m.category === 'ANIM').length;
  const result = [];
  const lastGenreAt = {};
  const lastDecadeAt = {};
  let intPlaced = 0, animPlaced = 0;
  while (pool.length > 0) {
    const pos = result.length;
    let totalScore = 0;
    const scores = new Float64Array(pool.length);
    for (let k = 0; k < pool.length; k++) {
      const m = pool[k];
      let score = 1;
      const gGap = pos - (lastGenreAt[m.genre] ?? -10);
      if (gGap <= 1) score *= 0.02;
      else if (gGap === 2) score *= 0.15;
      else if (gGap === 3) score *= 0.4;
      const dec = getDecade(m.year);
      const dGap = pos - (lastDecadeAt[dec] ?? -10);
      if (dGap <= 1) score *= 0.1;
      else if (dGap === 2) score *= 0.35;
      if (m.category === 'INT') {
        const exp = intTotal * (pos + 1) / total;
        const def = exp - intPlaced;
        if (def > 1) score *= 3;
        else if (def > 0.3) score *= 1.5;
        else if (def < -0.5) score *= 0.15;
      } else if (m.category === 'ANIM') {
        const exp = animTotal * (pos + 1) / total;
        const def = exp - animPlaced;
        if (def > 1) score *= 3;
        else if (def > 0.3) score *= 1.5;
        else if (def < -0.5) score *= 0.15;
      }
      if (pos < 100) {
        const decay = 1 - pos / 100;
        const q = quality(m);
        score *= Math.pow(q, decay * 1.5);
      }
      scores[k] = Math.max(score, 0.001);
      totalScore += scores[k];
    }
    let r = rng() * totalScore;
    let pick = 0;
    for (let k = 0; k < scores.length; k++) {
      r -= scores[k];
      if (r <= 0) { pick = k; break; }
    }
    const chosen = pool[pick];
    result.push(chosen);
    lastGenreAt[chosen.genre] = pos;
    lastDecadeAt[getDecade(chosen.year)] = pos;
    if (chosen.category === 'INT') intPlaced++;
    if (chosen.category === 'ANIM') animPlaced++;
    pool.splice(pick, 1);
  }
  return result;
}

// Catalog composition for reference
const tierCount = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
for (const m of movies) tierCount[quality(m)] = (tierCount[quality(m)] || 0) + 1;
console.log('Catalog tier distribution (837 films):');
for (const t of [7,6,5,4,3,2,1]) if (tierCount[t]) console.log(`  tier ${t}: ${tierCount[t]}`);

// Run many seeds and aggregate
const SEEDS = 20;
const WINDOWS = [
  { label: 'First 10',  start: 0,   end: 10 },
  { label: 'First 20',  start: 0,   end: 20 },
  { label: 'First 50',  start: 0,   end: 50 },
  { label: 'First 100', start: 0,   end: 100 },
  { label: 'Pos 100-199', start: 100, end: 200 },
  { label: 'Mid 400s', start: 400, end: 500 },
  { label: 'Tail 700s', start: 700, end: 800 },
];

console.log(`\nAveraged across ${SEEDS} seeds:\n`);
console.log('Window          | AvgQ | q≥5% | q≥4% | q≥3% | UniqGenres(f20) | UniqDecades(f20)');
console.log('----------------|------|------|------|------|-----------------|----------------');

for (const w of WINDOWS) {
  let sumAvg = 0;
  let sumFiveUp = 0, sumFourUp = 0, sumThreeUp = 0;
  let sumUniqGenres = 0, sumUniqDecades = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const out = diversityShuffle(movies, mulberry32(seed));
    const slice = out.slice(w.start, w.end);
    const qs = slice.map(quality);
    sumAvg += qs.reduce((s, q) => s + q, 0) / slice.length;
    sumFiveUp += qs.filter(q => q >= 5).length / slice.length;
    sumFourUp += qs.filter(q => q >= 4).length / slice.length;
    sumThreeUp += qs.filter(q => q >= 3).length / slice.length;
    // For the first-20 window only compute diversity (don't double-count other windows)
    if (w.start === 0 && w.end === 20) {
      sumUniqGenres += new Set(slice.map(m => m.genre)).size;
      sumUniqDecades += new Set(slice.map(m => getDecade(m.year))).size;
    }
  }
  const pad = (s, n) => String(s).padEnd(n);
  const num = (n, d) => n.toFixed(d);
  const ug = (w.start === 0 && w.end === 20) ? num(sumUniqGenres / SEEDS, 1) : '';
  const ud = (w.start === 0 && w.end === 20) ? num(sumUniqDecades / SEEDS, 1) : '';
  console.log(
    `${pad(w.label, 16)}| ${num(sumAvg / SEEDS, 2)} | ${num(sumFiveUp / SEEDS * 100, 0).padStart(3)}% | ${num(sumFourUp / SEEDS * 100, 0).padStart(3)}% | ${num(sumThreeUp / SEEDS * 100, 0).padStart(3)}% | ${pad(ug, 16)}| ${ud}`
  );
}

// Iron-clad canon coverage: how much of the top tier is surfaced in early positions?
const ironClad = movies.filter(m => quality(m) >= 5);
console.log(`\nIron-clad canon (quality ≥ 5): ${ironClad.length} films total`);
let avgInFirst100 = 0, avgInFirst200 = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const out = diversityShuffle(movies, mulberry32(seed));
  const first100Ids = new Set(out.slice(0, 100).map(m => m.id));
  const first200Ids = new Set(out.slice(0, 200).map(m => m.id));
  avgInFirst100 += ironClad.filter(m => first100Ids.has(m.id)).length;
  avgInFirst200 += ironClad.filter(m => first200Ids.has(m.id)).length;
}
console.log(`  Avg in first 100: ${(avgInFirst100 / SEEDS).toFixed(1)} of ${ironClad.length} (${((avgInFirst100 / SEEDS / ironClad.length) * 100).toFixed(0)}%)`);
console.log(`  Avg in first 200: ${(avgInFirst200 / SEEDS).toFixed(1)} of ${ironClad.length} (${((avgInFirst200 / SEEDS / ironClad.length) * 100).toFixed(0)}%)`);

// Sample first 15 from 3 seeds
console.log(`\nSample first-15 from 3 seeds:`);
for (const seed of [7, 42, 123]) {
  console.log(`\n  Seed ${seed}:`);
  const out = diversityShuffle(movies, mulberry32(seed));
  for (let i = 0; i < 15; i++) {
    const f = out[i];
    console.log(`    ${String(i).padStart(2)}. [q${quality(f)}] ${f.title.padEnd(42)} ${f.year}`);
  }
}
