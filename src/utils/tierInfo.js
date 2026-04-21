// Unified tier helper — R2 scoring (NFR+AFI merged) + 5-tier bucketing.
//
// Raw score: 1 point per canon list, with AFI+NFR counted once as "US institutional"
// canon, plus 1 for BP/INT/ANIM winner or BP nominee.
//
// Buckets (1-5):
//   1 Canonical  — raw 0-2
//   2 Acclaimed  — raw 3
//   3 Landmark   — raw 4
//   4 Masterwork — raw 5
//   5 Apex       — raw 6+
//
// Manual overrides (curated) promote/demote specific films to reflect canonical
// consensus vs pure-score bucketing.

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
  RT: 'Rotten Tomatoes Top 300',
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
  RT: 'Rotten Tomatoes',
};

export const MAX_TIER = 5;

// Canon Score weight per tier. Progressive (not linear) so Apex-chasers
// clearly beat Canonical-only grinders in aggregate — see
// `scripts/tier-curves.mjs` for the spot-check that chose this curve
// (Apex-chaser 27.5% vs T1-grinder 21.4% at these weights, vs 20.2 / 27.5
// under linear 1..5 which inverts the intended signal).
export const TIER_SCORE_WEIGHTS = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 11,
};

export function tierScore(tier) {
  return TIER_SCORE_WEIGHTS[tier] ?? 0;
}

export const TIER_LABELS = {
  0: 'All films',
  1: 'Canonical',
  2: 'Acclaimed',
  3: 'Landmark',
  4: 'Masterwork',
  5: 'Apex',
};

export const TIER_DESCRIPTIONS = {
  0: 'No canon endorsement — films in the catalog via Academy recognition alone (BP nominees that didn\'t hit any canon list).',
  1: 'Present in the canon: recognized on at least one curated list.',
  2: 'Acclaimed: meets our multi-list entry threshold for the essentials canon.',
  3: 'Landmark: broadly recognized across critics, institutions, and audience lists.',
  4: 'Masterwork: near-universal consensus across critical, institutional, and popular canon.',
  5: 'Apex: summit canon — films whose inclusion in a serious must-watch list is essentially unavoidable.',
};

// Apex (tier 5) — 16 films curated by hand; inclusion is a judgment call, not pure score.
const APEX_IDS = new Set([
  'casablanca-1942',
  '12-angry-men-1957',
  'dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb-1964',
  'the-godfather-1972',
  'the-godfather-part-ii-1974',
  'apocalypse-now-1979',
  'raging-bull-1980',
  'goodfellas-1990',
  'pulp-fiction-1994',
  'parasite-2019',
  'citizen-kane-1941',
  'seven-samurai-1954',
  'vertigo-1958',
  '2001-a-space-odyssey-1968',
  'the-third-man-1949',
  'the-silence-of-the-lambs-1991',
]);

// Films whose raw score would put them in Apex but curation moves them down.
const DEMOTE_FROM_APEX = new Set([
  'modern-times-1936',
  'double-indemnity-1944',
  'all-about-eve-1950',
  'the-battle-of-algiers-1966',
  'chinatown-1974',
]);

// Raw score would put them below Masterwork but curation moves them up.
const PROMOTE_TO_MASTERWORK = new Set([
  'sunset-boulevard-1950',
  'north-by-northwest-1959',
  'the-apartment-1960',
  'lawrence-of-arabia-1962',
  'do-the-right-thing-1989',
  'come-and-see-1985',
]);
const DEMOTE_FROM_MASTERWORK = new Set([
  'the-grand-budapest-hotel-2014',
  'the-pianist-2002',
  'before-sunrise-1995',
  'the-ascent-1977',
  'ordet-1955',
  'all-that-jazz-1979',
]);

const PROMOTE_TO_LANDMARK = new Set([
  'notorious-1946','persona-1966','the-exorcist-1973','the-shining-1980',
  'blade-runner-1982','toy-story-1995','fargo-1996','the-matrix-1999',
  'in-the-mood-for-love-2000','mulholland-drive-2001',
]);
const DEMOTE_FROM_LANDMARK = new Set([
  'the-father-2020','good-will-hunting-1997','dead-poets-society-1989',
  'the-lord-of-the-rings-the-two-towers-2002','finding-nemo-2003','whiplash-2014',
]);

// R2 raw score broken into canon-list points + Oscar pip.
// Returns { canonRaw, totalRaw } so we can distinguish "no canon endorsement"
// from "has canon endorsement" at the tier-0 boundary.
function r2Raw(lists, oscarPip) {
  const set = new Set(lists);
  let canonRaw = 0;
  if (set.has('NFR') || set.has('AFI')) canonRaw += 1;
  for (const c of set) if (c !== 'NFR' && c !== 'AFI') canonRaw += 1;
  return { canonRaw, totalRaw: canonRaw + oscarPip };
}

function bucket(canonRaw, totalRaw) {
  // Tier 0: no canon-list endorsement. Oscar-only films (e.g. a BP nominee
  // that never made a canon list) land here.
  if (canonRaw === 0) return 0;
  if (totalRaw <= 2) return 1;
  if (totalRaw === 3) return 2;
  if (totalRaw === 4) return 3;
  if (totalRaw === 5) return 4;
  return 5;
}

function applyOverrides(id, tier) {
  if (APEX_IDS.has(id)) return 5;
  if (DEMOTE_FROM_APEX.has(id)) tier = Math.min(tier, 4);
  if (PROMOTE_TO_MASTERWORK.has(id)) tier = Math.max(tier, 4);
  if (DEMOTE_FROM_MASTERWORK.has(id)) tier = Math.min(tier, 3);
  if (PROMOTE_TO_LANDMARK.has(id)) tier = Math.max(tier, 3);
  if (DEMOTE_FROM_LANDMARK.has(id)) tier = Math.min(tier, 2);
  return tier;
}

export function getTierInfo(movie) {
  // Start with baked-in canon lists
  const lists = (movie.lists && Array.isArray(movie.lists)) ? [...movie.lists] : [];

  // For Oscar films, append OSCAR or OSCAR_NOM pip
  let oscarPip = 0;
  if (movie.category !== 'ESSENTIAL') {
    if (movie.won && !lists.includes('OSCAR')) {
      lists.push('OSCAR');
      oscarPip = 1;
    } else if (movie.category === 'BP' && !movie.won && !lists.includes('OSCAR_NOM')) {
      lists.push('OSCAR_NOM');
      oscarPip = 1;
    } else if (movie.won) {
      oscarPip = 1;
    } else if (movie.category === 'BP' && !movie.won) {
      oscarPip = 1;
    }
  }

  // For essentials with a baked-in tier, use it (already includes overrides).
  // Otherwise compute from raw score + overrides.
  let tier;
  if (movie.category === 'ESSENTIAL' && movie.tier != null) {
    tier = movie.tier;
  } else {
    const canonLists = lists.filter(c => c !== 'OSCAR' && c !== 'OSCAR_NOM');
    const { canonRaw, totalRaw } = r2Raw(canonLists, oscarPip);
    tier = applyOverrides(movie.id, bucket(canonRaw, totalRaw));
  }
  return { tier, lists };
}

export function getTier(movie) {
  return getTierInfo(movie).tier;
}

export function getTierLabel(tier) {
  return TIER_LABELS[tier] || '';
}

export function getTierDescription(tier) {
  return TIER_DESCRIPTIONS[tier] || '';
}
