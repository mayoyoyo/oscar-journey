// Unified tier / list-membership helper.
//
// ESSENTIAL films have `tier` and `lists` baked into the data.
// Oscar films (BP/INT/ANIM) get OSCAR list contribution computed on the fly:
//   - BP winner / INT winner / ANIM winner → contributes to OSCAR list
//   - BP nominee (won: false) → no contribution
//
// This lets the whole 837-film catalog share one tier scale.

export const LIST_LABELS = {
  OSCAR: 'Academy Award (Best Picture / Intl. / Animated)',
  SS: 'Sight & Sound 2022 (critics + directors)',
  AFI: 'AFI 100 + 10 Top 10',
  IMDB: 'IMDb Top 250',
  LBXD: 'Letterboxd Top 250',
  FEST: 'Cannes / Venice / Berlin grand prize',
  NFR: 'National Film Registry',
  CRIT: 'Criterion Collection',
};

export const LIST_SHORT_LABELS = {
  OSCAR: 'Oscar',
  SS: 'Sight & Sound',
  AFI: 'AFI',
  IMDB: 'IMDb',
  LBXD: 'Letterboxd',
  FEST: 'Festival',
  NFR: 'Nat. Film Reg.',
  CRIT: 'Criterion',
};

export const MAX_TIER = 8; // 7 canon lists + OSCAR

export function getTierInfo(movie) {
  // Essential films: baked-in tier + lists
  if (movie.lists && Array.isArray(movie.lists)) {
    return { tier: movie.tier ?? movie.lists.length, lists: movie.lists };
  }

  // Oscar films: derive OSCAR contribution from won state
  const lists = [];
  if (movie.won) {
    // Any film with won=true won a major Academy Award category
    lists.push('OSCAR');
  }
  return { tier: lists.length, lists };
}

export function getTier(movie) {
  return getTierInfo(movie).tier;
}
