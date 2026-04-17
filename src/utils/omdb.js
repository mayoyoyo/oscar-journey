import { RUNTIME_OVERRIDES } from './runtimeOverrides';

const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0'];
let currentKeyIndex = 0;
const CACHE_PREFIX = 'oscars_';
const NOT_FOUND = 'NOT_FOUND';

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '_');
}

function omdbCacheKey(prefix, movie) {
  return CACHE_PREFIX + prefix + '_' + sanitizeTitle(movie.title) + '_' + movie.year;
}

// Manual poster overrides — used when OMDB has wrong or no poster
const POSTER_OVERRIDES = {
  'birdman-2014': '/posters/birdman-2014.jpg',
  'il-postino-1995': '/posters/il-postino-1995.jpg',
  'cries-and-whispers-1973': '/posters/cries-and-whispers-1973.webp',
  // Essentials where OMDb's poster URL 404s on Amazon CDN — local images needed.
  'les-cousins-1959': '/posters/les-cousins-1959.jpg',
  'the-color-of-pomegranates-1969': '/posters/the-color-of-pomegranates-1969.jpg',
  'adoption-1975': '/posters/adoption-1975.jpg',
  'the-ballad-of-gregorio-cortez-1982': '/posters/the-ballad-of-gregorio-cortez-1982.jpg',
  'au-revoir-les-enfants-1987': '/posters/au-revoir-les-enfants-1987.jpg',
  'thelonious-monk-straight-no-chaser-1988': '/posters/thelonious-monk-straight-no-chaser-1988.jpg',
  'la-cienaga-2001': '/posters/la-cienaga-2001.jpg',
};

// Title overrides for movies that don't match OMDB's naming
const OMDB_TITLE_OVERRIDES = {
  'Birdman': 'Birdman or The Unexpected Virtue of Ignorance',
  'Cries and Whispers': 'Cries & Whispers',
  'Sunrise: A Song of Two Humans': 'Sunrise',
  'Apur Sansar': 'The World of Apu',
};

// Year overrides for movies where our year doesn't match OMDB
const OMDB_YEAR_OVERRIDES = {
  'Il Postino': 1994,
  'The Emigrants': 1971,
  'Cries and Whispers': 1972,
  'Tess': 1979,
  'A Room with a View': 1985,
  'Life Is Beautiful': 1997,
  'Spirited Away': 2001,
  'The Hurt Locker': 2008,
  'Judas and the Black Messiah': 2021,
  'Sound of Metal': 2019,
  // Our 2005 refers to wide release; OMDb indexes Paul Haggis's Crash as 2004.
  // Without this, OMDb returns a different 2005 "Crash" by Christopher Jarvis.
  'Crash': 2004,
};

function applyRuntimeOverride(movie, runtime) {
  const o = RUNTIME_OVERRIDES[movie.id];
  if (runtime || o == null) return runtime;
  return `${o} min`;
}

// Clean title for better OMDb matching
function cleanTitle(title) {
  return (OMDB_TITLE_OVERRIDES[title] || title)
    .replace(/[''']/g, "'")
    .replace(/[""]/g, '"');
}

function getOmdbYear(movie) {
  return OMDB_YEAR_OVERRIDES[movie.title] || movie.year;
}

// Synchronous cache read — returns the same shape as fetchOmdbData if all fields are
// cached and valid, or null otherwise. Used to skip the loading flash when navigating
// between films whose data is already cached in localStorage.
export function readCachedOmdbData(movie) {
  if (!movie) return null;
  const manualPoster = POSTER_OVERRIDES[movie.id] || null;
  const posterKey   = omdbCacheKey('poster',   movie);
  const plotKey     = omdbCacheKey('plot',     movie);
  const ratingKey   = omdbCacheKey('rating',   movie);
  const directorKey = omdbCacheKey('director', movie);
  const runtimeKey  = omdbCacheKey('runtime',  movie);
  const allKeys = [posterKey, plotKey, ratingKey, directorKey, runtimeKey];
  if (!allKeys.every(k => localStorage.getItem(k) !== null)) return null;
  if (allKeys.some(k => localStorage.getItem(k) === 'RATE_LIMITED')) return null;
  const posterCached = localStorage.getItem(posterKey);
  if (!manualPoster && posterCached === NOT_FOUND) return null;
  const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
  return {
    poster:   manualPoster || posterCached,
    plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
    rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
    director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
    runtime:  applyRuntimeOverride(movie, cachedRuntime),
  };
}

export async function fetchOmdbData(movie) {
  const manualPoster = POSTER_OVERRIDES[movie.id] || null;
  const posterKey   = omdbCacheKey('poster',   movie);
  const plotKey     = omdbCacheKey('plot',     movie);
  const ratingKey   = omdbCacheKey('rating',   movie);
  const directorKey = omdbCacheKey('director', movie);
  const runtimeKey  = omdbCacheKey('runtime',  movie);
  // Return cached data if we have real results (not rate-limit failures or missing posters)
  const allKeys = [posterKey, plotKey, ratingKey, directorKey, runtimeKey];
  const allCached = allKeys.every(k => localStorage.getItem(k) !== null);
  if (allCached) {
    const anyRateLimited = allKeys.some(k => localStorage.getItem(k) === 'RATE_LIMITED');
    const posterMissing = localStorage.getItem(posterKey) === NOT_FOUND;
    if (!anyRateLimited && !posterMissing) {
      const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
      return {
        poster:   manualPoster || localStorage.getItem(posterKey),
        plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
        runtime:  applyRuntimeOverride(movie, cachedRuntime),
      };
    }
  }

  try {
    const titleEnc = encodeURIComponent(cleanTitle(movie.title));

    // Try with current key, rotate on rate limit
    const tryWithKey = async (titleEnc, year) => {
      for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
        const key = OMDB_KEYS[currentKeyIndex];
        let url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${key}`;
        if (year) url += `&y=${year}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.Error && data.Error.includes('limit')) {
          // This key is exhausted — rotate to next
          currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
          if (attempt < OMDB_KEYS.length - 1) continue; // try next key
          return { rateLimited: true }; // all keys exhausted
        }
        return data;
      }
      return { rateLimited: true };
    };

    let data = await tryWithKey(titleEnc, getOmdbYear(movie));

    // All keys rate limited — return existing cache without saving failures
    if (data.rateLimited) {
      const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
      return {
        poster:   manualPoster || (localStorage.getItem(posterKey) === NOT_FOUND ? null : localStorage.getItem(posterKey)),
        plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
        runtime:  applyRuntimeOverride(movie, cachedRuntime),
      };
    }

    // Not found with year, OR found but no poster — retry without year
    const hasPoster = data && data.Poster && data.Poster !== 'N/A';
    if (!data || data.Response === 'False' || !hasPoster) {
      data = await tryWithKey(titleEnc, null);

      if (data.rateLimited) {
        return { poster: manualPoster || null, plot: null, rating: null, director: null, runtime: null };
      }

      if (data && data.Response !== 'False') {
        return storeAndReturn(movie, data, posterKey, plotKey, ratingKey, directorKey, runtimeKey, manualPoster);
      }

      storeNotFound(posterKey, plotKey, ratingKey, directorKey, runtimeKey);
      return { poster: manualPoster || null, plot: null, rating: null, director: null, runtime: applyRuntimeOverride(movie, null) };
    }

    return storeAndReturn(movie, data, posterKey, plotKey, ratingKey, directorKey, runtimeKey);
  } catch (e) {
    // Network error — don't cache, will retry next time
    return { poster: manualPoster || null, plot: null, rating: null, director: null, runtime: applyRuntimeOverride(movie, null) };
  }
}

function storeAndReturn(movie, data, posterKey, plotKey, ratingKey, directorKey, runtimeKey, manualPoster) {
  const poster   = manualPoster || (data.Poster && data.Poster !== 'N/A' ? data.Poster : null);
  const plot     = data.Plot   && data.Plot   !== 'N/A' ? data.Plot   : null;
  const rating   = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null;
  const director = data.Director && data.Director !== 'N/A' ? data.Director : null;
  const runtime  = data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : null;
  localStorage.setItem(posterKey,   poster   || NOT_FOUND);
  localStorage.setItem(plotKey,     plot     || NOT_FOUND);
  localStorage.setItem(ratingKey,   rating   || NOT_FOUND);
  localStorage.setItem(directorKey, director || NOT_FOUND);
  localStorage.setItem(runtimeKey,  runtime  || NOT_FOUND);

  return { poster, plot, rating, director, runtime: applyRuntimeOverride(movie, runtime) };
}

function storeNotFound(posterKey, plotKey, ratingKey, directorKey, runtimeKey) {
  localStorage.setItem(posterKey,   NOT_FOUND);
  localStorage.setItem(plotKey,     NOT_FOUND);
  localStorage.setItem(ratingKey,   NOT_FOUND);
  localStorage.setItem(directorKey, NOT_FOUND);
  localStorage.setItem(runtimeKey,  NOT_FOUND);
}
