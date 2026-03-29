const OMDB_KEY = 'ab8cbc12';
const CACHE_PREFIX = 'oscars_';
const NOT_FOUND = 'NOT_FOUND';

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '_');
}

function omdbCacheKey(prefix, movie) {
  return CACHE_PREFIX + prefix + '_' + sanitizeTitle(movie.title) + '_' + movie.year;
}

// Fetch all OMDb fields for a movie in one API call; cache each field separately.
export async function fetchOmdbData(movie) {
  const posterKey   = omdbCacheKey('poster',   movie);
  const plotKey     = omdbCacheKey('plot',     movie);
  const ratingKey   = omdbCacheKey('rating',   movie);
  const directorKey = omdbCacheKey('director', movie);

  // If we already have every field cached, return without hitting the API
  const allCached = [posterKey, plotKey, ratingKey, directorKey].every(
    k => localStorage.getItem(k) !== null
  );
  if (allCached) {
    return {
      poster:   localStorage.getItem(posterKey)   === NOT_FOUND ? null : localStorage.getItem(posterKey),
      plot:     localStorage.getItem(plotKey)     === NOT_FOUND ? null : localStorage.getItem(plotKey),
      rating:   localStorage.getItem(ratingKey)   === NOT_FOUND ? null : localStorage.getItem(ratingKey),
      director: localStorage.getItem(directorKey) === NOT_FOUND ? null : localStorage.getItem(directorKey),
    };
  }

  const tryFetch = async (year) => {
    const titleEnc = encodeURIComponent(movie.title);
    let url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${OMDB_KEY}`;
    if (year) url += `&y=${year}`;
    const resp = await fetch(url);
    return resp.json();
  };

  try {
    let data = await tryFetch(movie.year);
    // Retry without year if not found
    if (!data || data.Response === 'False') {
      data = await tryFetch(null);
    }

    const store = (key, val) => localStorage.setItem(key, val || NOT_FOUND);

    if (data && data.Response !== 'False') {
      const poster   = data.Poster && data.Poster !== 'N/A' ? data.Poster : null;
      const plot     = data.Plot   && data.Plot   !== 'N/A' ? data.Plot   : null;
      const rating   = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null;
      const director = data.Director && data.Director !== 'N/A' ? data.Director : null;

      store(posterKey,   poster);
      store(plotKey,     plot);
      store(ratingKey,   rating);
      store(directorKey, director);

      return { poster, plot, rating, director };
    } else {
      store(posterKey,   null);
      store(plotKey,     null);
      store(ratingKey,   null);
      store(directorKey, null);
      return { poster: null, plot: null, rating: null, director: null };
    }
  } catch (e) {
    // Network error - don't cache so it can retry
    return { poster: null, plot: null, rating: null, director: null };
  }
}
