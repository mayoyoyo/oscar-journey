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
  OSCAR_NOM: 'Best Picture nominee',
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
  OSCAR_NOM: 'BP nominee',
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
  // Start with any baked-in canon lists (AFI, IMDb, SS, NFR, etc.)
  const lists = (movie.lists && Array.isArray(movie.lists)) ? [...movie.lists] : [];

  // For Oscar films (BP/INT/ANIM), also append the OSCAR or OSCAR_NOM pip.
  // Essentials don't get OSCAR — their tier is purely their canon-list count.
  if (movie.category !== 'ESSENTIAL') {
    if (movie.won && !lists.includes('OSCAR')) {
      lists.push('OSCAR');
    } else if (movie.category === 'BP' && !movie.won && !lists.includes('OSCAR_NOM')) {
      lists.push('OSCAR_NOM');
    }
  }

  // For essentials, prefer the baked-in tier field if present (same value either way).
  const tier = (movie.category === 'ESSENTIAL' && movie.tier != null) ? movie.tier : lists.length;
  return { tier, lists };
}

export function getTier(movie) {
  return getTierInfo(movie).tier;
}
