// Letterboxd ratings are fetched offline and baked into src/data/letterboxdRatings.json
// (see scripts/fetch-letterboxd.mjs). Runtime-scraping from the browser isn't viable
// because letterboxd.com doesn't set permissive CORS headers — any direct fetch gets
// blocked. The baked snapshot is a pragmatic compromise: a periodic script refreshes
// ratings on the developer's machine and the app ships with the latest values.
import LETTERBOXD_RATINGS from '../data/letterboxdRatings.json';

// Returns { rating, votes, slug, fetchedAt } or null.
// `rating` is Letterboxd's 0–5 weighted average (e.g. 4.24). `votes` is the count
// of ratings contributing to that average. `slug` is the canonical vanity URL
// segment (e.g. "parasite-2019") so consumers can link to the film page.
export function getLetterboxdRating(movie) {
  if (!movie?.id) return null;
  const entry = LETTERBOXD_RATINGS[movie.id];
  if (!entry || entry.rating == null) return null;
  return entry;
}
