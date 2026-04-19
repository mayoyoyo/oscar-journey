import { RUNTIME_OVERRIDES } from './runtimeOverrides';
import IMDB_IDS from '../data/imdbIds.json';

// 'ab8cbc12' removed — returns 401 (key disabled/invalid). 9 keys remain.
const OMDB_KEYS = ['84fee249', '398cefbb', '2bcfc5d9', '4c4c2593', 'fcfc8238', '5f47a8f8', 'fbe9d009', '8a3c9a0', 'b76841fa'];
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
  // OMDb indexes Il Postino (1994) as "The Postman" — querying 'Il Postino' returns
  // a 31-min behind-the-scenes short instead of the 108-min Michael Radford film.
  'Il Postino': 'The Postman',
  // OMDb uses American spellings for these films; catalog keeps the British
  // titles from the original prints.
  'Three Colours: Red': 'Three Colors: Red',
  'Blue Is the Warmest Colour': 'Blue Is the Warmest Color',
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

// Full manual data for films OMDb has no correct entry for at all (rare — use
// sparingly). When present, skips the OMDb fetch entirely and serves this data.
// POSTER_OVERRIDES still applies to the `poster` field on top.
const MANUAL_OVERRIDES = {
  'la-cienaga-2001': {
    plot: 'Two middle-class women, their families, and their servants spend a sweltering summer at a decaying country estate in northern Argentina. Lucrecia Martel\'s debut depicts a torpor-stricken household where small tensions and accidents hint at larger fractures — class, generation, and a country in slow-motion collapse.',
    director: 'Lucrecia Martel',
    rating: '7.0',
    runtime: '103 min',
  },
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
// OMDb's short plot is hard-truncated at ~200 chars and ends in "..." mid-
// sentence (e.g. "...Adèle grows, seeks herself, loses herself, and..."). This
// trims back to the last complete sentence so the plot reads cleanly. If no
// sentence break is recoverable, strips the ellipsis and closes with a period.
export function tidyPlot(plot) {
  if (!plot) return plot;
  const trimmed = plot.trimEnd();
  if (!/(\.{3}|…)$/.test(trimmed)) return plot;
  const base = trimmed.replace(/[\s,;:\-–—]*(\.{3}|…)\s*$/, '');
  const lastTerminator = Math.max(
    base.lastIndexOf('.'),
    base.lastIndexOf('!'),
    base.lastIndexOf('?'),
  );
  if (lastTerminator >= Math.max(30, Math.floor(base.length * 0.25))) {
    return base.slice(0, lastTerminator + 1);
  }
  return base.replace(/[,;:\-–—]+$/, '') + '.';
}

export function readCachedOmdbData(movie) {
  if (!movie) return null;
  const manualPoster = POSTER_OVERRIDES[movie.id] || null;
  const manualData = MANUAL_OVERRIDES[movie.id] || null;

  // Films OMDb has no entry for — serve manual data synchronously, skip cache/OMDb.
  if (manualData) {
    return {
      poster:     manualPoster,
      plot:       manualData.plot     || null,
      rating:     manualData.rating   || null,
      director:   manualData.director || null,
      runtime:    manualData.runtime  || null,
      metacritic: manualData.metacritic || null,
    };
  }

  const posterKey     = omdbCacheKey('poster',   movie);
  const plotKey       = omdbCacheKey('plot',     movie);
  const ratingKey     = omdbCacheKey('rating',   movie);
  const directorKey   = omdbCacheKey('director', movie);
  const runtimeKey    = omdbCacheKey('runtime',  movie);
  const metacriticKey = omdbCacheKey('metacritic', movie);
  const allKeys = [posterKey, plotKey, ratingKey, directorKey, runtimeKey];
  if (!allKeys.every(k => localStorage.getItem(k) !== null)) return null;
  if (allKeys.some(k => localStorage.getItem(k) === 'RATE_LIMITED')) return null;
  const posterCached = localStorage.getItem(posterKey);
  if (!manualPoster && posterCached === NOT_FOUND) return null;
  const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
  const cachedMeta    = localStorage.getItem(metacriticKey);
  return {
    poster:     manualPoster || posterCached,
    plot:       localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
    rating:     localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
    director:   localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
    runtime:    applyRuntimeOverride(movie, cachedRuntime),
    // Metacritic was added after OMDb's original cache shape. Older cache
    // entries predate this key, so missing (null) reads as "not yet fetched"
    // while NOT_FOUND marks an OMDb response that had no Metascore.
    metacritic: cachedMeta && cachedMeta !== NOT_FOUND ? cachedMeta : null,
    awards:     readCachedAwards(movie),
    actors:     readCachedActors(movie),
  };
}

export async function fetchOmdbData(movie) {
  const manualPoster = POSTER_OVERRIDES[movie.id] || null;
  const manualData = MANUAL_OVERRIDES[movie.id] || null;

  // Films OMDb has no entry for — serve manual data, skip the API call.
  if (manualData) {
    return {
      poster:     manualPoster,
      plot:       manualData.plot     || null,
      rating:     manualData.rating   || null,
      director:   manualData.director || null,
      runtime:    manualData.runtime  || null,
      metacritic: manualData.metacritic || null,
    };
  }

  const posterKey     = omdbCacheKey('poster',   movie);
  const plotKey       = omdbCacheKey('plot',     movie);
  const ratingKey     = omdbCacheKey('rating',   movie);
  const directorKey   = omdbCacheKey('director', movie);
  const runtimeKey    = omdbCacheKey('runtime',  movie);
  const metacriticKey = omdbCacheKey('metacritic', movie);
  // Return cached data if we have real results (not rate-limit failures or missing posters).
  // When we have a known imdb_id for this film, an all-NOT_FOUND cache entry
  // is almost certainly stale — it was written before the imdb_id backfill
  // landed, when OMDb's title-based search couldn't find the film. Force a
  // re-fetch in that case so the imdb_id lookup below actually runs.
  const imdbId = IMDB_IDS[movie.id] || null;
  const allKeys = [posterKey, plotKey, ratingKey, directorKey, runtimeKey];
  const allCached = allKeys.every(k => localStorage.getItem(k) !== null);
  const cacheIsStaleNotFound = imdbId && allKeys.every(k => localStorage.getItem(k) === NOT_FOUND);
  if (allCached && !cacheIsStaleNotFound) {
    const anyRateLimited = allKeys.some(k => localStorage.getItem(k) === 'RATE_LIMITED');
    const posterMissing = localStorage.getItem(posterKey) === NOT_FOUND;
    if (!anyRateLimited && !posterMissing) {
      const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
      const cachedMeta    = localStorage.getItem(metacriticKey);
      // Metacritic key is newer than the other OMDb fields. For cache entries
      // written before this key existed, fall through to the network path so
      // we backfill metascore without invalidating everything else.
      const metaNotCached = cachedMeta === null;
      if (!metaNotCached) {
        return {
          poster:     manualPoster || localStorage.getItem(posterKey),
          plot:       localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
          rating:     localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
          director:   localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
          runtime:    applyRuntimeOverride(movie, cachedRuntime),
          metacritic: cachedMeta !== NOT_FOUND ? cachedMeta : null,
          awards:     readCachedAwards(movie),
          actors:     readCachedActors(movie),
        };
      }
    }
  }

  try {
    const titleEnc = encodeURIComponent(cleanTitle(movie.title));

    // Try with current key, rotate on rate limit OR 401 (invalid/expired key).
    // Prefer imdb_id lookups when available — OMDb's title-based search
    // fails on punctuation-heavy and foreign-language titles ("Je, Tu, Il,
    // Elle", "La Ciénaga") where the imdb_id query always resolves.
    const tryWithKey = async (titleEnc, year) => {
      for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
        const key = OMDB_KEYS[currentKeyIndex];
        let url;
        if (imdbId) {
          url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`;
        } else {
          url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${key}`;
          if (year) url += `&y=${year}`;
        }
        let resp;
        try {
          resp = await fetch(url);
        } catch (e) {
          return { rateLimited: true };
        }

        // 401 = invalid/expired key. Rotate and retry with next key.
        if (resp.status === 401 || resp.status === 403) {
          currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
          if (attempt < OMDB_KEYS.length - 1) continue;
          return { rateLimited: true };
        }

        let data;
        try {
          data = await resp.json();
        } catch (e) {
          return { rateLimited: true };
        }

        if (data.Error && data.Error.includes('limit')) {
          currentKeyIndex = (currentKeyIndex + 1) % OMDB_KEYS.length;
          if (attempt < OMDB_KEYS.length - 1) continue;
          return { rateLimited: true };
        }
        return data;
      }
      return { rateLimited: true };
    };

    let data = await tryWithKey(titleEnc, getOmdbYear(movie));

    // All keys rate limited — return existing cache without saving failures
    if (data.rateLimited) {
      const cachedRuntime = localStorage.getItem(runtimeKey) === NOT_FOUND ? null : localStorage.getItem(runtimeKey);
      const cachedMeta    = localStorage.getItem(metacriticKey);
      return {
        poster:     manualPoster || (localStorage.getItem(posterKey) === NOT_FOUND ? null : localStorage.getItem(posterKey)),
        plot:       localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:     localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director:   localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
        runtime:    applyRuntimeOverride(movie, cachedRuntime),
        metacritic: cachedMeta && cachedMeta !== NOT_FOUND ? cachedMeta : null,
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

      storeNotFound(movie, posterKey, plotKey, ratingKey, directorKey, runtimeKey);
      return { poster: manualPoster || null, plot: null, rating: null, director: null, runtime: applyRuntimeOverride(movie, null), metacritic: null };
    }

    return storeAndReturn(movie, data, posterKey, plotKey, ratingKey, directorKey, runtimeKey);
  } catch (e) {
    // Network error — don't cache, will retry next time
    return { poster: manualPoster || null, plot: null, rating: null, director: null, runtime: applyRuntimeOverride(movie, null), metacritic: null };
  }
}

function storeAndReturn(movie, data, posterKey, plotKey, ratingKey, directorKey, runtimeKey, manualPoster) {
  const poster   = manualPoster || (data.Poster && data.Poster !== 'N/A' ? data.Poster : null);
  const plot     = data.Plot   && data.Plot   !== 'N/A' ? data.Plot   : null;
  const rating   = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null;
  const director = data.Director && data.Director !== 'N/A' ? data.Director : null;
  const runtime  = data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : null;
  const awards   = data.Awards && data.Awards !== 'N/A' ? data.Awards : null;
  const language = data.Language && data.Language !== 'N/A' ? data.Language : null;
  const country  = data.Country  && data.Country  !== 'N/A' ? data.Country  : null;
  const actors   = data.Actors   && data.Actors   !== 'N/A' ? data.Actors   : null;
  // Metacritic: OMDb returns both a top-level `Metascore` string and a
  // `Ratings` array entry for "Metacritic". Prefer Metascore (simpler integer
  // like "90"). Fall through to the array parse for resilience.
  let metacritic = data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : null;
  if (!metacritic && Array.isArray(data.Ratings)) {
    const mc = data.Ratings.find(r => r?.Source === 'Metacritic');
    if (mc?.Value) metacritic = String(mc.Value).split('/')[0]; // "90/100" → "90"
  }
  localStorage.setItem(posterKey,     poster     || NOT_FOUND);
  localStorage.setItem(plotKey,       plot       || NOT_FOUND);
  localStorage.setItem(ratingKey,     rating     || NOT_FOUND);
  localStorage.setItem(directorKey,   director   || NOT_FOUND);
  localStorage.setItem(runtimeKey,    runtime    || NOT_FOUND);
  localStorage.setItem(omdbCacheKey('metacritic', movie), metacritic || NOT_FOUND);
  localStorage.setItem(omdbCacheKey('awards', movie),   awards   || NOT_FOUND);
  localStorage.setItem(omdbCacheKey('language', movie), language || NOT_FOUND);
  localStorage.setItem(omdbCacheKey('country', movie),  country  || NOT_FOUND);
  localStorage.setItem(omdbCacheKey('actors', movie),   actors   || NOT_FOUND);

  return { poster, plot, rating, director, runtime: applyRuntimeOverride(movie, runtime), metacritic, awards, language, country, actors };
}

// Parse "Won 2 Oscars. Another 159 wins & 164 nominations." → 2
// "Nominated for 5 Oscars. ..." → 0 (only nominated)
// null / NOT_FOUND / non-Oscar strings → 0
export function parseOscarWins(awardsText) {
  if (!awardsText || awardsText === NOT_FOUND) return 0;
  const m = awardsText.match(/Won\s+(\d+)\s+Oscar/i);
  return m ? parseInt(m[1], 10) : 0;
}

// Small accessor so FilmDetailModal can use cached awards-string as a fallback
// for films that don't have hand-coded `awards` data (most of the essentials).
export function readCachedAwards(movie) {
  if (!movie) return null;
  const v = localStorage.getItem(omdbCacheKey('awards', movie));
  if (!v || v === NOT_FOUND || v === 'RATE_LIMITED') return null;
  return v;
}

// Language / country accessors used by the language-flag pill.
export function readCachedLanguage(movie) {
  if (!movie) return null;
  const v = localStorage.getItem(omdbCacheKey('language', movie));
  if (!v || v === NOT_FOUND || v === 'RATE_LIMITED') return null;
  return v;
}
export function readCachedCountry(movie) {
  if (!movie) return null;
  const v = localStorage.getItem(omdbCacheKey('country', movie));
  if (!v || v === NOT_FOUND || v === 'RATE_LIMITED') return null;
  return v;
}
export function readCachedActors(movie) {
  if (!movie) return null;
  const v = localStorage.getItem(omdbCacheKey('actors', movie));
  if (!v || v === NOT_FOUND || v === 'RATE_LIMITED') return null;
  return v;
}

function storeNotFound(movie, posterKey, plotKey, ratingKey, directorKey, runtimeKey) {
  localStorage.setItem(posterKey,   NOT_FOUND);
  localStorage.setItem(plotKey,     NOT_FOUND);
  localStorage.setItem(ratingKey,   NOT_FOUND);
  localStorage.setItem(directorKey, NOT_FOUND);
  localStorage.setItem(runtimeKey,  NOT_FOUND);
  localStorage.setItem(omdbCacheKey('metacritic', movie), NOT_FOUND);
}
