// Self-contained shuffle test — duplicates the shuffle logic so plain Node
// can run it without Vite's extensionless-import resolution.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const moviesModule = await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href);
const movies = moviesModule.MOVIES;
const SERIES = moviesModule.SERIES;

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Mirrors qualityWeight in shuffle.js — counts canon lists + OSCAR/OSCAR_NOM for Oscar films.
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

function summarize(label, slice) {
  const counts = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const f of slice) counts[quality(f)]++;
  const avg = slice.reduce((s, f) => s + quality(f), 0) / slice.length;
  console.log(`${label}`);
  console.log(`  tier 6: ${counts[6]}   tier 5: ${counts[5]}   tier 4: ${counts[4]}   tier 3: ${counts[3]}   q=2 (BP winner / INT / ANIM / tier-2): ${counts[2]}   BP nominee: ${counts[1]}`);
  console.log(`  avg quality: ${avg.toFixed(2)}`);
}

for (const seed of [1, 42]) {
  console.log(`\n============ seed ${seed} ============`);
  const out = diversityShuffle(movies, mulberry32(seed));
  summarize('  First 20 (pos 0-19):', out.slice(0, 20));
  console.log();
  summarize('  Mid (pos 400-419):', out.slice(400, 420));
  console.log();
  summarize('  Tail (pos 700-719):', out.slice(700, 720));
  console.log('\n  First 15:');
  for (let i = 0; i < 15; i++) {
    const f = out[i];
    console.log(`    ${String(i).padStart(2)}. [q${quality(f)}] ${f.title} (${f.year}) — ${f.category}/${f.genre}`);
  }
}
