import { MOVIES, MOVIES_BY_ID } from '../data/movies';

// Rarity tiers
export const RARITIES = {
  COMMON:    { name: 'Common',    color: '#8a8a8a', glow: 'rgba(138,138,138,0.3)', border: '#666' },
  RARE:      { name: 'Rare',      color: '#4a9ade', glow: 'rgba(74,154,222,0.4)',  border: '#4a9ade' },
  EPIC:      { name: 'Epic',      color: '#a855f7', glow: 'rgba(168,85,247,0.4)',  border: '#a855f7' },
  LEGENDARY: { name: 'Legendary', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  border: '#f59e0b' },
};

// Collector score values
export const RARITY_SCORES = { COMMON: 1, RARE: 5, EPIC: 15, LEGENDARY: 50 };

// Drop rates
const RARITY_ODDS = [
  { rarity: 'LEGENDARY', threshold: 0.04 },  // 4%
  { rarity: 'EPIC',      threshold: 0.15 },  // 11%
  { rarity: 'RARE',      threshold: 0.40 },  // 25%
  { rarity: 'COMMON',    threshold: 1.00 },  // 60%
];

function rollRarity() {
  const roll = Math.random();
  for (const { rarity, threshold } of RARITY_ODDS) {
    if (roll < threshold) return rarity;
  }
  return 'COMMON';
}

// Near-miss messages (shown ~15% of common pulls)
export const NEAR_MISS_MESSAGES = [
  'So close to a Rare!',
  'Almost had something special...',
  'A Rare was right there!',
  'Just barely missed an upgrade!',
  'Next one could be the one...',
];

export function getNearMiss(rarity) {
  if (rarity !== 'COMMON') return null;
  if (Math.random() > 0.15) return null;
  return NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)];
}

// Pack config
export const HARD_PITY = 25;
export const CARDS_PER_PACK = 1;
export const MAX_WALLET = 3;
export const MAX_SHOWCASE = 1;

// Variable reward schedule — returns true if a card should drop
export function shouldDropCard(battlesSinceLast) {
  if (battlesSinceLast >= HARD_PITY) return true;
  if (battlesSinceLast < 10) return Math.random() < 0.01;       // 1% per battle
  if (battlesSinceLast < 16) return Math.random() < 0.03;       // 3%
  if (battlesSinceLast < 21) return Math.random() < 0.08;       // 8%
  return Math.random() < 0.20;                                   // 20% soft pity
}

// Get progress label for UI
export function getDropProgressLabel(battlesSinceLast) {
  if (battlesSinceLast < 10) return 'Warming up...';
  if (battlesSinceLast < 16) return 'Getting closer...';
  if (battlesSinceLast < 21) return 'Almost there!';
  return `Guaranteed in ${HARD_PITY - battlesSinceLast}!`;
}

// Generate a single card, avoiding taken combos
export function generatePack(watchedMovieIds, existingCardIds = [], takenCards = new Set()) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pick = MOVIES[Math.floor(Math.random() * MOVIES.length)];
    const rarity = rollRarity();
    const key = `${pick.id}-${rarity}`;

    if (!takenCards.has(key)) {
      return [{
        movieId: pick.id,
        rarity,
        pulledAt: Date.now(),
      }];
    }
  }

  // Fallback if everything is taken (unlikely) — just give a card
  const pick = MOVIES[Math.floor(Math.random() * MOVIES.length)];
  return [{
    movieId: pick.id,
    rarity: rollRarity(),
    pulledAt: Date.now(),
  }];
}

// Calculate collector score from wallet
export function getCollectorScore(wallet) {
  if (!wallet || !wallet.length) return 0;
  return wallet.reduce((sum, card) => sum + (RARITY_SCORES[card.rarity] || 0), 0);
}
