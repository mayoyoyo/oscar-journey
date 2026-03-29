import { db } from './firebase';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, query, orderBy,
  serverTimestamp, addDoc
} from 'firebase/firestore';

// --- Profile CRUD ---

export async function createProfile(username, passcode, displayName, avatar) {
  const id = username.toLowerCase().trim();
  const ref = doc(db, 'profiles', id);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error('Username already taken');
  await setDoc(ref, {
    displayName: displayName.trim(),
    passcode,
    avatar: avatar || '🍿',
    watched: [],
    ratings: {},
    playlistOrder: null,
    seed: null,
    currentIdx: 0,
    raters: [displayName.trim()],
    createdAt: serverTimestamp(),
  });
  return { id, displayName: displayName.trim(), avatar: avatar || '🍿' };
}

export async function loginProfile(username, passcode) {
  const id = username.toLowerCase().trim();
  const ref = doc(db, 'profiles', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Profile not found');
  const data = snap.data();
  if (data.passcode !== passcode) throw new Error('Wrong passcode');
  return { id: snap.id, ...data };
}

export async function saveProfileField(username, field, value) {
  const ref = doc(db, 'profiles', username.toLowerCase().trim());
  await updateDoc(ref, { [field]: value });
}

export async function loadProfile(username) {
  const ref = doc(db, 'profiles', username.toLowerCase().trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- ELO ---

const K = 32; // ELO K-factor

export async function getOrCreateElo(movieKey, movieData) {
  const ref = doc(db, 'elo', movieKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  const newDoc = {
    title: movieData.title,
    year: movieData.year,
    elo: 1500,
    matchCount: 0,
    won: movieData.won,
    genre: movieData.genre,
    category: movieData.category,
  };
  await setDoc(ref, newDoc);
  return { id: movieKey, ...newDoc };
}

export async function recordVote(voter, movieAKey, movieBKey, winnerKey, movieAData, movieBData) {
  // Get or create ELO docs
  const eloA = await getOrCreateElo(movieAKey, movieAData);
  const eloB = await getOrCreateElo(movieBKey, movieBData);

  // Calculate new ELOs
  const expectedA = 1 / (1 + Math.pow(10, (eloB.elo - eloA.elo) / 400));
  const expectedB = 1 - expectedA;
  const scoreA = winnerKey === movieAKey ? 1 : 0;
  const scoreB = 1 - scoreA;
  const newEloA = Math.round(eloA.elo + K * (scoreA - expectedA));
  const newEloB = Math.round(eloB.elo + K * (scoreB - expectedB));

  // Update ELO docs
  await updateDoc(doc(db, 'elo', movieAKey), { elo: newEloA, matchCount: (eloA.matchCount || 0) + 1 });
  await updateDoc(doc(db, 'elo', movieBKey), { elo: newEloB, matchCount: (eloB.matchCount || 0) + 1 });

  // Record vote
  await addDoc(collection(db, 'votes'), {
    voter,
    movieA: movieAKey,
    movieB: movieBKey,
    winner: winnerKey,
    timestamp: serverTimestamp(),
  });

  return { newEloA, newEloB };
}

export async function getEloLeaderboard() {
  const snap = await getDocs(query(collection(db, 'elo'), orderBy('elo', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllElo() {
  const snap = await getDocs(collection(db, 'elo'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- Personal ELO ---

export async function updatePersonalElo(profileId, movieAKey, movieBKey, winnerKey) {
  const ref = doc(db, 'profiles', profileId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const personalElo = data.personalElo || {};

  const eloA = personalElo[movieAKey]?.elo || 1500;
  const eloB = personalElo[movieBKey]?.elo || 1500;
  const countA = personalElo[movieAKey]?.matchCount || 0;
  const countB = personalElo[movieBKey]?.matchCount || 0;

  const K = 32;
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const scoreA = winnerKey === movieAKey ? 1 : 0;
  const scoreB = 1 - scoreA;
  const newEloA = Math.round(eloA + K * (scoreA - expectedA));
  const newEloB = Math.round(eloB + K * (scoreB - (1 - expectedA)));

  personalElo[movieAKey] = { elo: newEloA, matchCount: countA + 1 };
  personalElo[movieBKey] = { elo: newEloB, matchCount: countB + 1 };

  await updateDoc(ref, { personalElo });
  return personalElo;
}
