const OMDB_KEY = 'ab8cbc12';
const CACHE_PREFIX = 'oscars_';
const NOT_FOUND = 'NOT_FOUND';
const RATE_LIMITED = 'RATE_LIMITED';

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '_');
}

function omdbCacheKey(prefix, movie) {
  return CACHE_PREFIX + prefix + '_' + sanitizeTitle(movie.title) + '_' + movie.year;
}

// Check if a cached value is a real result (not a failure marker)
function getCached(key) {
  const val = localStorage.getItem(key);
  if (val === null || val === NOT_FOUND || val === RATE_LIMITED) return null;
  return val;
}

// Check if all fields have real cached values
function allFieldsCached(keys) {
  return keys.every(k => {
    const v = localStorage.getItem(k);
    return v !== null && v !== RATE_LIMITED; // NOT_FOUND is a valid cached "no data" state, but RATE_LIMITED should retry
  });
}

// Clean title for better OMDb matching
function cleanTitle(title) {
  return title
    .replace(/[''']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s*:\s*/g, ': '); // normalize colons
}

// Try OMDb API
async function tryOmdb(title, year) {
  const titleEnc = encodeURIComponent(cleanTitle(title));
  let url = `https://www.omdbapi.com/?t=${titleEnc}&type=movie&apikey=${OMDB_KEY}`;
  if (year) url += `&y=${year}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.Error && data.Error.includes('limit')) {
    return { rateLimited: true };
  }
  return data;
}

// Try TMDB API as fallback (free, high limit, no key needed for image search via Wikipedia approach)
// Actually TMDB needs a key. Use their free search + image CDN.
// Alternative: use Wikipedia pageimages API as poster fallback
async function tryWikipediaPoster(title, year) {
  try {
    const query = encodeURIComponent(title + ' ' + year + ' film');
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=3&prop=pageimages&pithumbsize=600&format=json&origin=*`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.query && data.query.pages) {
      for (const page of Object.values(data.query.pages)) {
        if (page.thumbnail && page.thumbnail.source) {
          return page.thumbnail.source.replace(/\/\d+px-/, '/600px-');
        }
      }
    }
  } catch (e) { /* silently fail */ }
  return null;
}

export async function fetchOmdbData(movie) {
  const posterKey   = omdbCacheKey('poster',   movie);
  const plotKey     = omdbCacheKey('plot',     movie);
  const ratingKey   = omdbCacheKey('rating',   movie);
  const directorKey = omdbCacheKey('director', movie);

  // If we have all fields cached (and none are rate-limited), return cached
  if (allFieldsCached([posterKey, plotKey, ratingKey, directorKey])) {
    return {
      poster:   getCached(posterKey),
      plot:     getCached(plotKey),
      rating:   getCached(ratingKey),
      director: getCached(directorKey),
    };
  }

  try {
    // Try OMDb with year first
    let data = await tryOmdb(movie.title, movie.year);

    // If rate limited, try Wikipedia for poster at least
    if (data.rateLimited) {
      // Check if we have partial cache (maybe poster was cached before)
      const cachedPoster = getCached(posterKey);
      const wikiPoster = cachedPoster || await tryWikipediaPoster(movie.title, movie.year);

      if (wikiPoster) {
        localStorage.setItem(posterKey, wikiPoster);
      } else {
        localStorage.setItem(posterKey, RATE_LIMITED); // Will retry next time
      }
      // Mark other fields as rate limited so they retry
      if (!getCached(plotKey)) localStorage.setItem(plotKey, RATE_LIMITED);
      if (!getCached(ratingKey)) localStorage.setItem(ratingKey, RATE_LIMITED);
      if (!getCached(directorKey)) localStorage.setItem(directorKey, RATE_LIMITED);

      return {
        poster: wikiPoster || getCached(posterKey),
        plot: getCached(plotKey),
        rating: getCached(ratingKey),
        director: getCached(directorKey),
      };
    }

    // Retry without year if not found
    if (!data || data.Response === 'False') {
      data = await tryOmdb(movie.title, null);
      if (data.rateLimited) {
        const wikiPoster = await tryWikipediaPoster(movie.title, movie.year);
        if (wikiPoster) localStorage.setItem(posterKey, wikiPoster);
        return { poster: wikiPoster, plot: null, rating: null, director: null };
      }
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

      // If OMDb had no poster, try Wikipedia
      const finalPoster = poster || await tryWikipediaPoster(movie.title, movie.year);
      if (finalPoster && !poster) {
        localStorage.setItem(posterKey, finalPoster);
      }

      return { poster: finalPoster || poster, plot, rating, director };
    } else {
      // OMDb found nothing — try Wikipedia for poster
      const wikiPoster = await tryWikipediaPoster(movie.title, movie.year);
      store(posterKey, wikiPoster);
      store(plotKey, null);
      store(ratingKey, null);
      store(directorKey, null);
      return { poster: wikiPoster, plot: null, rating: null, director: null };
    }
  } catch (e) {
    // Network error — don't cache, try Wikipedia for poster
    try {
      const wikiPoster = await tryWikipediaPoster(movie.title, movie.year);
      return { poster: wikiPoster, plot: null, rating: null, director: null };
    } catch {
      return { poster: null, plot: null, rating: null, director: null };
    }
  }
}
