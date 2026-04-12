import { SERIES } from '../data/movies';

// Seeded RNG (mulberry32) - simple, reproducible
export function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Map a release year to a decade bucket label
function getDecade(year) {
  if (year < 1991) return '70s80s';
  if (year < 2000) return '90s';
  if (year < 2010) return '00s';
  if (year < 2020) return '10s';
  return '20s';
}

// Greedy diversity shuffle — builds the playlist one film at a time,
// scoring each candidate by how different it is from recently placed films.
// This prevents back-to-back same-genre or same-decade films globally
// (not just within buckets) and produces noticeably different results
// with each new seed.
export function diversityShuffle(movies, rng) {
  // Fisher-Yates shuffle the pool for base randomization
  const pool = [...movies];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const total = pool.length;
  // Count INT/ANIM totals so we can pace their insertion evenly
  const intTotal = movies.filter(m => m.category === 'INT').length;
  const animTotal = movies.filter(m => m.category === 'ANIM').length;

  const result = [];
  const lastGenreAt = {};   // genre code -> last playlist position it appeared
  const lastDecadeAt = {};  // decade label -> last playlist position it appeared
  let intPlaced = 0;
  let animPlaced = 0;

  while (pool.length > 0) {
    const pos = result.length;

    // Score every remaining candidate
    let totalScore = 0;
    const scores = new Float64Array(pool.length);

    for (let k = 0; k < pool.length; k++) {
      const m = pool[k];
      let score = 1;

      // --- Genre spacing (strongest constraint) ---
      // Heavily penalize placing the same genre adjacent or near-adjacent
      const genreGap = pos - (lastGenreAt[m.genre] ?? -10);
      if      (genreGap <= 1) score *= 0.02;
      else if (genreGap === 2) score *= 0.15;
      else if (genreGap === 3) score *= 0.4;

      // --- Decade spacing ---
      const dec = getDecade(m.year);
      const decGap = pos - (lastDecadeAt[dec] ?? -10);
      if      (decGap <= 1) score *= 0.1;
      else if (decGap === 2) score *= 0.35;

      // --- Category pacing (keep INT / ANIM evenly sprinkled) ---
      // Compare how many we've placed vs how many we should have by now
      if (m.category === 'INT') {
        const expected = intTotal * (pos + 1) / total;
        const deficit = expected - intPlaced;
        if      (deficit > 1)    score *= 3;
        else if (deficit > 0.3)  score *= 1.5;
        else if (deficit < -0.5) score *= 0.15;
      } else if (m.category === 'ANIM') {
        const expected = animTotal * (pos + 1) / total;
        const deficit = expected - animPlaced;
        if      (deficit > 1)    score *= 3;
        else if (deficit > 0.3)  score *= 1.5;
        else if (deficit < -0.5) score *= 0.15;
      }

      scores[k] = Math.max(score, 0.001);
      totalScore += scores[k];
    }

    // Weighted random pick — higher-scoring candidates are more likely
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

// After the diversity shuffle, ensure series films appear in release order
// while keeping them at the same positions in the playlist
export function enforceSeriesOrder(playlist) {
  for (const series of SERIES) {
    const positions = [];
    const films = [];
    series.forEach(id => {
      const idx = playlist.findIndex(m => m.id === id);
      if (idx >= 0) { positions.push(idx); films.push(playlist[idx]); }
    });
    if (positions.length < 2) continue;
    positions.sort((a, b) => a - b);
    positions.forEach((pos, i) => { playlist[pos] = films[i]; });
  }
  return playlist;
}
