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

// Multi-dimensional diversity shuffle
// Guarantees variety across genre, decade, and category dimensions
export function diversityShuffle(movies, rng) {

  // Fisher-Yates in-place shuffle using our seeded RNG
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Genre-interleave a list of films (round-robin through genre buckets)
  function genreInterleave(films) {
    const buckets = {};
    for (const m of films) {
      if (!buckets[m.genre]) buckets[m.genre] = [];
      buckets[m.genre].push(m);
    }
    for (const g of Object.keys(buckets)) shuffle(buckets[g]);
    const keys = shuffle(Object.keys(buckets));
    const out = [];
    while (keys.some(g => buckets[g].length > 0)) {
      for (const g of keys) {
        if (buckets[g].length > 0) out.push(buckets[g].shift());
      }
    }
    return out;
  }

  // Step 1: Separate by category
  const bp   = movies.filter(m => m.category === 'BP');
  const intl = shuffle(movies.filter(m => m.category === 'INT'));
  const anim = shuffle(movies.filter(m => m.category === 'ANIM'));

  // Step 2: Split BP into decade buckets, genre-interleave each
  const decBuckets = { '70s80s': [], '90s': [], '00s': [], '10s': [], '20s': [] };
  for (const m of bp) {
    if      (m.year < 1991) decBuckets['70s80s'].push(m);
    else if (m.year < 2000) decBuckets['90s'].push(m);
    else if (m.year < 2010) decBuckets['00s'].push(m);
    else if (m.year < 2020) decBuckets['10s'].push(m);
    else                    decBuckets['20s'].push(m);
  }
  const decQueues = {
    '70s80s': genreInterleave(decBuckets['70s80s']),
    '90s': genreInterleave(decBuckets['90s']),
    '00s': genreInterleave(decBuckets['00s']),
    '10s': genreInterleave(decBuckets['10s']),
    '20s': genreInterleave(decBuckets['20s']),
  };

  // Step 3: Round-robin through decades to build the BP sequence
  const decOrder = shuffle(['70s80s', '90s', '00s', '10s', '20s']);
  const bpSeq = [];
  while (decOrder.some(d => decQueues[d].length > 0)) {
    for (const d of decOrder) {
      if (decQueues[d].length > 0) bpSeq.push(decQueues[d].shift());
    }
  }

  // Step 4: Splice INT every 10 BP films, ANIM every 12 BP films
  const result = [];
  let intIdx = 0, animIdx = 0;

  for (let i = 0; i < bpSeq.length; i++) {
    result.push(bpSeq[i]);
    if ((i + 1) % 10 === 0 && intIdx  < intl.length) result.push(intl[intIdx++]);
    if ((i + 1) % 12 === 0 && animIdx < anim.length) result.push(anim[animIdx++]);
  }

  // Append any leftover INT/ANIM films
  while (intIdx < intl.length || animIdx < anim.length) {
    if (intIdx  < intl.length) result.push(intl[intIdx++]);
    if (animIdx < anim.length) result.push(anim[animIdx++]);
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
