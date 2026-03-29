const OMDB_KEYS = ['ab8cbc12', '84fee249', '398cefbb'];
let currentKeyIndex = 0;
const CACHE_PREFIX = 'oscars_';
const NOT_FOUND = 'NOT_FOUND';

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '_');
}

function omdbCacheKey(prefix, movie) {
  return CACHE_PREFIX + prefix + '_' + sanitizeTitle(movie.title) + '_' + movie.year;
}

// Clean title for better OMDb matching
function cleanTitle(title) {
  return title
    .replace(/[''']/g, "'")
    .replace(/[""]/g, '"');
}

export async function fetchOmdbData(movie) {
  const posterKey   = omdbCacheKey('poster',   movie);
  const plotKey     = omdbCacheKey('plot',     movie);
  const ratingKey   = omdbCacheKey('rating',   movie);
  const directorKey = omdbCacheKey('director', movie);

  // Return cached data if we have real results (not rate-limit failures)
  const allKeys = [posterKey, plotKey, ratingKey, directorKey];
  const allCached = allKeys.every(k => localStorage.getItem(k) !== null);
  if (allCached) {
    // Check none are "RATE_LIMITED" — those should retry
    const anyRateLimited = allKeys.some(k => localStorage.getItem(k) === 'RATE_LIMITED');
    if (!anyRateLimited) {
      return {
        poster:   localStorage.getItem(posterKey)   === NOT_FOUND ? null : localStorage.getItem(posterKey),
        plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
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

    let data = await tryWithKey(titleEnc, movie.year);

    // All keys rate limited — return existing cache without saving failures
    if (data.rateLimited) {
      return {
        poster:   localStorage.getItem(posterKey)   === NOT_FOUND ? null : localStorage.getItem(posterKey),
        plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
      };
    }

    // Not found with year — retry without year
    if (!data || data.Response === 'False') {
      data = await tryWithKey(titleEnc, null);

      if (data.rateLimited) {
        return { poster: null, plot: null, rating: null, director: null };
      }

      if (data && data.Response !== 'False') {
        return storeAndReturn(data, posterKey, plotKey, ratingKey, directorKey);
      }

      storeNotFound(posterKey, plotKey, ratingKey, directorKey);
      return { poster: null, plot: null, rating: null, director: null };
    }

    return storeAndReturn(data, posterKey, plotKey, ratingKey, directorKey);
  } catch (e) {
    // Network error — don't cache, will retry next time
    return { poster: null, plot: null, rating: null, director: null };
  }
}

function storeAndReturn(data, posterKey, plotKey, ratingKey, directorKey) {
  const poster   = data.Poster && data.Poster !== 'N/A' ? data.Poster : null;
  const plot     = data.Plot   && data.Plot   !== 'N/A' ? data.Plot   : null;
  const rating   = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null;
  const director = data.Director && data.Director !== 'N/A' ? data.Director : null;

  localStorage.setItem(posterKey,   poster   || NOT_FOUND);
  localStorage.setItem(plotKey,     plot     || NOT_FOUND);
  localStorage.setItem(ratingKey,   rating   || NOT_FOUND);
  localStorage.setItem(directorKey, director || NOT_FOUND);

  return { poster, plot, rating, director };
}

function storeNotFound(posterKey, plotKey, ratingKey, directorKey) {
  localStorage.setItem(posterKey,   NOT_FOUND);
  localStorage.setItem(plotKey,     NOT_FOUND);
  localStorage.setItem(ratingKey,   NOT_FOUND);
  localStorage.setItem(directorKey, NOT_FOUND);
}
