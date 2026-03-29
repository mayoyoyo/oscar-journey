// localStorage key constants
const LS_INDEX   = 'oscars_index';
const LS_WATCHED = 'oscars_watched';
const LS_ORDER   = 'oscars_order_v2';
const LS_SEED    = 'oscars_seed';
const LS_RATINGS = 'oscars_ratings';
const CACHE_PREFIX = 'oscars_';

// --- Seed ---
export function loadSeed() {
  let seed = parseInt(localStorage.getItem(LS_SEED) || '0');
  if (!seed) {
    seed = Math.floor(Math.random() * 0xFFFFFFFF);
    localStorage.setItem(LS_SEED, seed.toString());
  }
  return seed;
}

// --- Playlist order ---
export function loadOrder() {
  const saved = localStorage.getItem(LS_ORDER);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveOrder(orderIndices) {
  localStorage.setItem(LS_ORDER, JSON.stringify(orderIndices));
}

// --- Current index ---
export function loadIndex() {
  return parseInt(localStorage.getItem(LS_INDEX) || '0');
}

export function saveIndex(idx) {
  localStorage.setItem(LS_INDEX, idx.toString());
}

// --- Watched set ---
export function loadWatched() {
  try {
    const w = JSON.parse(localStorage.getItem(LS_WATCHED) || '[]');
    return new Set(w);
  } catch {
    return new Set();
  }
}

export function saveWatched(watchedSet) {
  localStorage.setItem(LS_WATCHED, JSON.stringify([...watchedSet]));
}

// --- Raters (configurable list of people rating films) ---
const LS_RATERS = 'oscars_raters';

export function loadRaters() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_RATERS));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return ['Chris', 'Yvonne']; // defaults
}

export function saveRaters(raters) {
  localStorage.setItem(LS_RATERS, JSON.stringify(raters));
}

// --- Ratings (keyed by person name) ---
// Format: { "Title|year": { "Chris": 8.5, "Yvonne": 7.0 }, ... }
export function loadRatings() {
  try {
    return JSON.parse(localStorage.getItem(LS_RATINGS) || '{}');
  } catch {
    return {};
  }
}

export function saveRatings(ratings) {
  localStorage.setItem(LS_RATINGS, JSON.stringify(ratings));
}

export function ratingKey(movie) {
  return `${movie.title}|${movie.year}`;
}

// --- Reset & clear ---
export function resetProgress() {
  localStorage.removeItem(LS_INDEX);
  localStorage.removeItem(LS_WATCHED);
  localStorage.removeItem(LS_ORDER);
  localStorage.removeItem(LS_SEED);
  localStorage.removeItem(LS_RATINGS);
}

export function clearCache() {
  const keysToRemove = [];
  const progressKeys = [LS_INDEX, LS_WATCHED, LS_ORDER, LS_SEED, LS_RATINGS];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX) && !progressKeys.includes(k)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  return keysToRemove.length;
}
