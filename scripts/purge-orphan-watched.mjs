// Purge orphan watched IDs from Firestore profiles.
//
// A user's `watched` array can drift from the catalog when a film gets
// renamed or removed between releases — e.g. `pinocchio-1940` lingering in
// a profile when the catalog only has `guillermo-del-toros-pinocchio-2022`.
// The profile UI silently hides orphans (MOVIES_BY_ID lookup misses), but
// the underlying array keeps growing them. This script cleans them up.
//
// TMDB-prefixed IDs (`tmdb:<num>`) are always preserved — those are legit
// out-of-canon watched entries from SeriesFilmPreview.
//
// Usage:
//   node scripts/purge-orphan-watched.mjs              # dry run — report only
//   node scripts/purge-orphan-watched.mjs --apply      # write back changes
//   node scripts/purge-orphan-watched.mjs --profile mayo [--apply]

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const profileIdx = args.indexOf('--profile');
const targetProfileId = profileIdx >= 0 ? args[profileIdx + 1] : null;

// Load the current catalog so we know which IDs are valid.
const { MOVIES } = await import(pathToFileURL(path.resolve(__dirname, '../src/data/movies.js')).href);
const catalogIds = new Set(MOVIES.map(m => m.id));
console.log(`Catalog has ${catalogIds.size} films.`);

const app = initializeApp({
  apiKey: 'AIzaSyBbJhYf0RZfptRjkyBoGDXp_uOw_CF2HUg',
  projectId: 'oscar-journey',
});
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'profiles'));
console.log(`Scanning ${snap.docs.length} profile(s)${apply ? ' — APPLY MODE' : ' — DRY RUN'}.`);

let totalOrphans = 0;
let touchedProfiles = 0;

for (const docSnap of snap.docs) {
  const id = docSnap.id;
  if (targetProfileId && id !== targetProfileId) continue;
  const data = docSnap.data();
  const watched = Array.isArray(data.watched) ? data.watched : [];
  if (watched.length === 0) continue;

  const orphans = watched.filter(w => {
    if (typeof w !== 'string') return true;       // non-string entries are malformed
    if (w.startsWith('tmdb:')) return false;      // TMDB entries always pass
    return !catalogIds.has(w);
  });
  if (orphans.length === 0) continue;

  touchedProfiles++;
  totalOrphans += orphans.length;
  console.log(`\nProfile ${id} (${data.displayName || '—'}): ${orphans.length} orphan(s)`);
  for (const o of orphans) console.log(`  - ${o}`);

  if (apply) {
    const cleaned = watched.filter(w => !orphans.includes(w));
    await updateDoc(doc(db, 'profiles', id), { watched: cleaned });
    console.log(`  ✓ Wrote ${cleaned.length} entries (was ${watched.length}).`);
  }
}

console.log(`\nSummary: ${totalOrphans} orphan(s) across ${touchedProfiles} profile(s).`);
if (!apply && totalOrphans > 0) {
  console.log('Re-run with --apply to write the cleaned lists back to Firestore.');
}
process.exit(0);
