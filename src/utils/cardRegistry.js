import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

// Build a set of taken movie+rarity combos from all profiles' wallets
export async function getTakenCards() {
  try {
    const snap = await getDocs(collection(db, 'profiles'));
    const taken = new Set();
    for (const d of snap.docs) {
      const wallet = d.data().wallet || [];
      for (const card of wallet) {
        taken.add(`${card.movieId}-${card.rarity}`);
      }
    }
    return taken;
  } catch {
    return new Set();
  }
}

// Find the highest rarity card owner for a movie from all profiles
export async function getCardOwner(movieId) {
  try {
    const snap = await getDocs(collection(db, 'profiles'));
    for (const rarity of ['LEGENDARY', 'EPIC', 'RARE']) {
      for (const d of snap.docs) {
        const wallet = d.data().wallet || [];
        const match = wallet.find(c => c.movieId === movieId && c.rarity === rarity);
        if (match) {
          return {
            name: d.data().displayName || d.id,
            avatar: d.data().avatar || '',
            id: d.id,
            rarity,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// These are no-ops now since we don't use a separate collection
export async function registerCard() {}
export async function releaseCard() {}
