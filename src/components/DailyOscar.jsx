import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { QUOTES } from '../data/quotes';
import { GENRE_LABELS } from '../data/movies';
import { fetchOmdbData } from '../utils/omdb';
import { RARITIES, getMaxWallet } from '../utils/cards';
import PackOpening from './PackOpening';

// Stable movie pool — uses MOVIES array (fixed order, fixed size) filtered to those with quotes
const DAILY_POOL = MOVIES.filter(m => QUOTES[m.id]).map(m => m.id);

function getDailyMovieId() {
  const today = new Date();
  const days = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  // Murmur3-style bit mixer — sequential days produce uncorrelated outputs
  let x = days >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return DAILY_POOL[x % DAILY_POOL.length];
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LS_KEY = 'oscars_daily_';
const MAX_GUESSES = 5;

const REWARD_ODDS = {
  1: { LEGENDARY: 0.02, EPIC: 0.06, RARE: 0.17, COMMON: 0.75 },
  2: { LEGENDARY: 0.01, EPIC: 0.04, RARE: 0.13, COMMON: 0.82 },
  3: { LEGENDARY: 0.005, EPIC: 0.02, RARE: 0.10, COMMON: 0.865 },
  4: { LEGENDARY: 0.002, EPIC: 0.01, RARE: 0.07, COMMON: 0.918 },
  5: { LEGENDARY: 0.001, EPIC: 0.005, RARE: 0.04, COMMON: 0.954 },
};

function rollDailyRarity(n) {
  const odds = REWARD_ODDS[n] || REWARD_ODDS[5];
  const r = Math.random();
  if (r < odds.LEGENDARY) return 'LEGENDARY';
  if (r < odds.LEGENDARY + odds.EPIC) return 'EPIC';
  if (r < odds.LEGENDARY + odds.EPIC + odds.RARE) return 'RARE';
  return 'COMMON';
}

// Load saved state from localStorage
function loadSaved(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function getDailyStatus() {
  return loadSaved(LS_KEY + getTodayKey());
}

export function getDailyStreak() {
  return parseInt(localStorage.getItem('oscars_daily_streak') || '0', 10);
}

export default function DailyOscar({ onClose, onSaveProfile, profile }) {
  const todayKey = getTodayKey();
  const savedKey = LS_KEY + todayKey;

  // Initialize state — check Firebase profile first, then localStorage
  const saved = useMemo(() => loadSaved(savedKey), []);
  const profileDaily = profile?.dailyOscar?.[todayKey];
  const initialSolved = profileDaily?.solved || saved?.solved || false;
  const initialFailed = profileDaily?.failed || saved?.failed || false;
  const initialGuesses = profileDaily?.guesses || saved?.guesses || [];
  const initialClaimed = profileDaily?.rewardClaimed || saved?.rewardClaimed || false;
  const initialKept = profileDaily?.rewardKept || saved?.rewardKept || false;
  const initialReward = profileDaily?.rewardCard || saved?.rewardCard || null;

  const [movieId, setMovieId] = useState(() => getDailyMovieId());
  const [isRandom, setIsRandom] = useState(false);
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState(initialGuesses);
  const [solved, setSolved] = useState(initialSolved);
  const [failed, setFailed] = useState(initialFailed);
  const [suggestions, setSuggestions] = useState([]);
  const [omdbData, setOmdbData] = useState(null);
  const [rewardCard, setRewardCard] = useState(initialReward);
  const [showPack, setShowPack] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(initialClaimed);
  const [rewardKept, setRewardKept] = useState(initialKept);

  const movie = MOVIES_BY_ID[movieId];
  const quotes = QUOTES[movieId] || [];

  const randomize = () => {
    const ids = Object.keys(QUOTES);
    let newId;
    do { newId = ids[Math.floor(Math.random() * ids.length)]; } while (newId === movieId);
    setMovieId(newId);
    setIsRandom(true);
    setGuess(''); setGuesses([]); setSolved(false); setFailed(false);
    setRewardCard(null); setShowPack(false); setRewardClaimed(false); setRewardKept(false);
    setOmdbData(null); setSuggestions([]);
  };

  // Fetch OMDB
  useEffect(() => {
    setOmdbData(null);
    if (movie) fetchOmdbData(movie).then(d => setOmdbData(d));
  }, [movie?.id]);

  // Save state to both localStorage and Firebase
  useEffect(() => {
    if (isRandom) return;
    if (guesses.length > 0 || solved || failed) {
      const state = { guesses, solved, failed, rewardCard, rewardClaimed, rewardKept };
      localStorage.setItem(savedKey, JSON.stringify(state));
      // Save to Firebase so it syncs across devices
      if (onSaveProfile && (solved || failed)) {
        const dailyOscar = { ...(profile?.dailyOscar || {}), [todayKey]: state };
        onSaveProfile('dailyOscar', dailyOscar);
      }
    }
  }, [guesses, solved, failed, rewardCard, rewardClaimed, rewardKept, savedKey, isRandom]);

  // Prevent mobile keyboard from auto-opening
  useEffect(() => {
    if (document.activeElement?.tagName === 'INPUT') document.activeElement.blur();
  }, []);

  const wrongCount = guesses.filter(g => g.toLowerCase() !== movie?.title.toLowerCase()).length;

  const hints = useMemo(() => {
    const h = [];
    if (quotes.length > 0) h.push({ type: 'quote', text: `"${quotes[0]}"` });
    if (wrongCount >= 1) h.push({ type: 'info', text: `${movie?.year} · ${GENRE_LABELS[movie?.genre] || movie?.genre}` });
    if (wrongCount >= 2 && omdbData?.director) h.push({ type: 'info', text: `Dir. ${omdbData.director}` });
    if (wrongCount >= 3 && omdbData?.plot) h.push({ type: 'plot', text: omdbData.plot });
    if (wrongCount >= 4 && movie?.title) {
      const words = movie.title.split(' ').map(w =>
        w.split('').map((ch, j) => j === 0 ? ch.toUpperCase() : /[a-zA-Z]/.test(ch) ? '_' : ch).join('')
      );
      h.push({ type: 'initials', words });
    }
    return h;
  }, [wrongCount, movie, omdbData, quotes]);

  const poster = omdbData?.poster;
  const streak = getDailyStreak();

  // Countdown
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow - now;
      setCountdown(`${String(Math.floor(diff / 3600000)).padStart(2, '0')}:${String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleGuess = (movieTitle) => {
    const title = movieTitle || guess.trim();
    if (!title) return;
    if (guesses.some(g => g.toLowerCase() === title.toLowerCase())) { setGuess(''); setSuggestions([]); return; }
    const newGuesses = [...guesses, title];
    setGuesses(newGuesses);
    setGuess(''); setSuggestions([]);
    if (title.toLowerCase() === movie.title.toLowerCase()) {
      setSolved(true);
      const s = getDailyStreak() + 1;
      localStorage.setItem('oscars_daily_streak', String(s));
      const rarity = rollDailyRarity(newGuesses.length);
      const card = { movieId: MOVIES[Math.floor(Math.random() * MOVIES.length)].id, rarity, pulledAt: Date.now(), source: 'daily' };
      setRewardCard(card);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setFailed(true);
      localStorage.setItem('oscars_daily_streak', '0');
    }
  };

  const handleInput = (val) => {
    setGuess(val);
    const minChars = wrongCount >= 4 ? 6 : 2;
    if (val.trim().length < minChars) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const guessedSet = new Set(guesses.map(g => g.toLowerCase()));
    setSuggestions(MOVIES.filter(m => m.title.toLowerCase().includes(q) && !guessedSet.has(m.title.toLowerCase())).slice(0, 5));
  };

  if (!movie) return null;

  // Pack opening
  if (showPack && rewardCard) {
    return (
      <PackOpening
        cards={[rewardCard]}
        wallet={profile?.wallet || []}
        maxWallet={getMaxWallet(profile?.watched?.length || 0)}
        currentShowcase={profile?.showcase || []}
        onSaveShowcase={(s) => { if (onSaveProfile) onSaveProfile('showcase', s); }}
        onClose={() => { setShowPack(false); setRewardClaimed(true); }}
        onKeep={(card) => {
          if (onSaveProfile && profile) onSaveProfile('wallet', [...(profile.wallet || []), card]);
          setShowPack(false); setRewardClaimed(true); setRewardKept(true);
        }}
        onReplace={(card, idx) => {
          if (onSaveProfile && profile) {
            const w = [...(profile.wallet || [])]; const old = w[idx]; w[idx] = card;
            onSaveProfile('wallet', w);
            const sc = profile.showcase || [];
            if (sc.some(s => s.movieId === old.movieId)) onSaveProfile('showcase', sc.filter(s => s.movieId !== old.movieId));
          }
          setShowPack(false); setRewardClaimed(true); setRewardKept(true);
        }}
      />
    );
  }

  const gameActive = !solved && !failed;

  return (
    <div className="daily-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="daily-modal">
        <button className="daily-close" onClick={onClose}>✕</button>

        <h2 className="daily-title">Daily Oscar</h2>
        {gameActive && <p className="daily-subtitle">Name the movie from the poster and quote</p>}

        {/* Poster */}
        {poster && (
          <div className="daily-poster-wrap">
            <img className="daily-poster" src={poster} alt="Mystery movie"
              style={{ filter: gameActive ? `blur(${20 - (wrongCount * 4)}px)` : 'none', transition: 'filter 0.5s' }} />
            {!gameActive && <div className="daily-poster-label">{movie.title} ({movie.year})</div>}
          </div>
        )}

        {/* Hints */}
        {hints.length > 0 && gameActive && (
          <div className="daily-hints">
            {hints.map((h, i) => (
              <div key={i} className={`daily-hint ${h.type === 'quote' ? 'daily-hint-quote' : ''} ${h.type === 'initials' ? 'daily-hint-initials' : ''} ${i === hints.length - 1 && i > 0 ? 'daily-hint-new' : ''}`}>
                {h.type === 'initials' ? (
                  <div className="daily-blanks">
                    {h.words.map((word, wi) => (
                      <span key={wi} className="daily-blanks-word">
                        {word.split('').map((ch, ci) => (
                          <span key={ci} className={ch === '_' ? 'daily-blank' : 'daily-letter'}>{ch === '_' ? '\u00A0' : ch}</span>
                        ))}
                      </span>
                    ))}
                  </div>
                ) : h.text}
              </div>
            ))}
          </div>
        )}

        {/* Previous guesses */}
        {guesses.length > 0 && (
          <div className="daily-guesses">
            {guesses.map((g, i) => (
              <div key={i} className={`daily-guess-row ${g.toLowerCase() === movie.title.toLowerCase() ? 'daily-guess-correct' : 'daily-guess-wrong'}`}>
                <span>{g}</span>
                <span>{g.toLowerCase() === movie.title.toLowerCase() ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {gameActive && (
          <form className="daily-input-form" autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleGuess(); }}>
            <input className="daily-input" type="search" value={guess}
              onChange={(e) => handleInput(e.target.value)}
              placeholder={`Guess ${guesses.length + 1} of ${MAX_GUESSES}...`}
              autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false"
              name={`xmovie_${Date.now()}`} data-form-type="other" data-lpignore="true" />
            {suggestions.length > 0 && (
              <div className="daily-suggestions">
                {suggestions.map(m => (
                  <button key={m.id} className="daily-suggestion" onClick={() => handleGuess(m.title)}>{m.title}</button>
                ))}
              </div>
            )}
            <div className="daily-remaining">{MAX_GUESSES - guesses.length} guess{MAX_GUESSES - guesses.length !== 1 ? 'es' : ''} left</div>
          </form>
        )}

        {/* Results */}
        {solved && (
          <div className="daily-result">
            <div className="daily-result-text daily-result-win">Got it in {guesses.length}!</div>
            {streak > 0 && <div className="daily-streak">{streak} day streak</div>}
            {rewardCard && !rewardClaimed && (
              <button className="daily-reward-btn" onClick={() => setShowPack(true)}>Open your reward card</button>
            )}
            {rewardCard && rewardClaimed && (
              <div className="daily-reward-claimed">{rewardKept ? 'Card collected!' : 'Card revealed'}</div>
            )}
          </div>
        )}
        {failed && (
          <div className="daily-result">
            <div className="daily-result-text daily-result-lose">It was {movie.title} ({movie.year})</div>
            <p style={{ fontSize: '0.82rem', color: '#999' }}>Better luck tomorrow!</p>
          </div>
        )}
        {!gameActive && (
          <div className="daily-timer">Next Daily Oscar in <strong>{countdown}</strong></div>
        )}
      </div>
    </div>
  );
}
