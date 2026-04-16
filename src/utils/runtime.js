import { fetchOmdbData } from './omdb';

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '_');
}

export function readCachedRuntime(movie) {
  const key = 'oscars_runtime_' + sanitizeTitle(movie.title) + '_' + movie.year;
  const val = localStorage.getItem(key);
  if (!val || val === 'NOT_FOUND' || val === 'RATE_LIMITED') return null;
  const match = val.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function runtimeBucket(minutes) {
  if (minutes == null) return null;
  if (minutes < 100) return 'short';
  if (minutes < 150) return 'medium';
  return 'long';
}

export const RUNTIME_LABELS = {
  short: 'Short (under 100 min)',
  medium: 'Medium (100\u2013149 min)',
  long: 'Long (150+ min)',
};

// Module-level guard so we don't double-prefetch when both Films and Journey mount.
let prefetchStarted = false;

export async function prefetchRuntimes(movies, onTick) {
  if (prefetchStarted) return;
  prefetchStarted = true;
  const concurrency = 4;
  const queue = movies.filter(m => readCachedRuntime(m) == null);
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < queue.length) {
      const movie = queue[i++];
      try { await fetchOmdbData(movie); } catch {}
      done++;
      if (done % 8 === 0 || done === queue.length) onTick && onTick();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  onTick && onTick();
}
