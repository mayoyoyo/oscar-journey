import { getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';

// Module-level cache for the global ELO leaderboard. Firestore call fires
// once per session; every subsequent rank lookup reads from the in-memory
// rank map. The film count is bounded (~787) so the full fetch is cheap.
let globalRanksPromise = null;

function loadGlobalRanks() {
  if (!globalRanksPromise) {
    globalRanksPromise = getDocs(collection(db, 'elo'))
      .then(snap => {
        const entries = [];
        for (const d of snap.docs) {
          const data = d.data();
          if (typeof data?.elo === 'number') {
            entries.push({ id: d.id, elo: data.elo });
          }
        }
        entries.sort((a, b) => b.elo - a.elo);
        const rankMap = new Map();
        entries.forEach((e, i) => rankMap.set(e.id, i + 1));
        return rankMap;
      })
      .catch(() => new Map());
  }
  return globalRanksPromise;
}

export async function getGlobalRank(movieId) {
  const rankMap = await loadGlobalRanks();
  return rankMap.get(movieId) || null;
}

// Personal rank is derived synchronously from the in-memory personalElo
// map (it's already loaded from the user's profile). O(n log n) over the
// user's rated films — trivial for any realistic profile size.
export function getPersonalRank(personalElo, movieId) {
  if (!personalElo || !movieId) return null;
  const entries = Object.entries(personalElo)
    .filter(([, v]) => v && typeof v.elo === 'number');
  if (!entries.length) return null;
  entries.sort(([, a], [, b]) => b.elo - a.elo);
  const idx = entries.findIndex(([id]) => id === movieId);
  return idx >= 0 ? idx + 1 : null;
}
