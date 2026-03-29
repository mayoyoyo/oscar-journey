import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBbJhYf0RZfptRjkyBoGDXp_uOw_CF2HUg",
  authDomain: "oscar-journey.firebaseapp.com",
  projectId: "oscar-journey",
  storageBucket: "oscar-journey.firebasestorage.app",
  messagingSenderId: "1085019870379",
  appId: "1:1085019870379:web:1c28a1050da8c1545ed3ee"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
