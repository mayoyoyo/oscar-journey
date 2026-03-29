const OMDB_KEY = 'ab8cbc12';
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
    let url = `https://www.omdbapi.com/?t=${titleEnc}&y=${movie.year}&type=movie&apikey=${OMDB_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    // Rate limited — don't cache anything, just return what we have
    if (data.Error && data.Error.includes('limit')) {
      return {
        poster:   localStorage.getItem(posterKey)   === NOT_FOUND ? null : localStorage.getItem(posterKey),
        plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
        rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
        director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
      };
    }

    // Not found with year — retry without year
    if (!data || data.Response === 'False') {
      const url2 = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${OMDB_KEY}`;
      const resp2 = await fetch(url2);
      const data2 = await resp2.json();

      if (data2.Error && data2.Error.includes('limit')) {
        return { poster: null, plot: null, rating: null, director: null };
      }

      if (data2 && data2.Response !== 'False') {
        return storeAndReturn(data2, posterKey, plotKey, ratingKey, directorKey);
      }

      // Genuinely not found
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
