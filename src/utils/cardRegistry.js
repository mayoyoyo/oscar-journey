import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

// Registry key format: "movieId-RARITY"
function registryKey(movieId, rarity) {
  return `${movieId}-${rarity}`;
}

// Check if a specific movie+rarity combo is taken
export async function isCardTaken(movieId, rarity) {
  const key = registryKey(movieId, rarity);
  const snap = await getDoc(doc(db, 'cardRegistry', key));
  return snap.exists();
}

// Register a card as owned
export async function registerCard(movieId, rarity, profileId) {
  const key = registryKey(movieId, rarity);
  await setDoc(doc(db, 'cardRegistry', key), {
    profileId,
    movieId,
    rarity,
    claimedAt: Date.now(),
  });
}

// Release a card back to the pool
export async function releaseCard(movieId, rarity) {
  const key = registryKey(movieId, rarity);
  await deleteDoc(doc(db, 'cardRegistry', key));
}

// Get all taken cards (for filtering during generation)
export async function getTakenCards() {
  try {
    const snap = await getDocs(collection(db, 'cardRegistry'));
    return new Set(snap.docs.map(d => d.id));
  } catch {
    return new Set();
  }
}
