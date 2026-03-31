import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { QUOTES } from '../data/quotes';
import { GENRE_LABELS } from '../data/movies';
import { fetchOmdbData } from '../utils/omdb';
import { RARITIES } from '../utils/cards';
import PackOpening from './PackOpening';

// Deterministic daily movie
function getDailyMovieId() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const movieIds = Object.keys(QUOTES);
  const idx = Math.abs(hash) % movieIds.length;
  return movieIds[idx];
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LS_KEY = 'oscars_daily_';
const MAX_GUESSES = 5;

// Card reward odds — still mostly common, with better chances for fewer guesses
const REWARD_ODDS = {
  1: { LEGENDARY: 0.03, EPIC: 0.10, RARE: 0.27, COMMON: 0.60 },
  2: { LEGENDARY: 0.02, EPIC: 0.07, RARE: 0.21, COMMON: 0.70 },
  3: { LEGENDARY: 0.01, EPIC: 0.04, RARE: 0.15, COMMON: 0.80 },
  4: { LEGENDARY: 0.005, EPIC: 0.02, RARE: 0.10, COMMON: 0.865 },
  5: { LEGENDARY: 0.002, EPIC: 0.01, RARE: 0.06, COMMON: 0.928 },
};

function rollDailyRarity(guessNumber) {
  const odds = REWARD_ODDS[guessNumber] || REWARD_ODDS[5];
  const roll = Math.random();
  if (roll < odds.LEGENDARY) return 'LEGENDARY';
  if (roll < odds.LEGENDARY + odds.EPIC) return 'EPIC';
  if (roll < odds.LEGENDARY + odds.EPIC + odds.RARE) return 'RARE';
  return 'COMMON';
}

export function getDailyStatus() {
  const key = LS_KEY + getTodayKey();
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  return JSON.parse(saved);
}

export function getDailyStreak() {
  return parseInt(localStorage.getItem('oscars_daily_streak') || '0', 10);
}

export default function DailyOscar({ onClose, onSaveProfile, profile }) {
  const todayKey = getTodayKey();
  const [movieId, setMovieId] = useState(() => getDailyMovieId());
  const [isRandom, setIsRandom] = useState(false);

  const movie = MOVIES_BY_ID[movieId];
  const quotes = QUOTES[movieId] || [];

  const randomize = () => {
    const movieIds = Object.keys(QUOTES);
    let newId;
    do { newId = movieIds[Math.floor(Math.random() * movieIds.length)]; } while (newId === movieId);
    setMovieId(newId);
    setIsRandom(true);
    setGuesses([]);
    setSolved(false);
    setFailed(false);
    setRewardCard(null);
    setShowPack(false);
    setOmdbData(null);
  };

  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [omdbData, setOmdbData] = useState(null);
  const [rewardCard, setRewardCard] = useState(null);
  const [showPack, setShowPack] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [rewardKept, setRewardKept] = useState(false);

  // Load saved state (only for real daily, not randomized)
  useEffect(() => {
    if (isRandom) return;
    const saved = getDailyStatus();
    if (saved) {
      setGuesses(saved.guesses || []);
      setSolved(saved.solved || false);
      setFailed(saved.failed || false);
      if (saved.rewardCard) setRewardCard(saved.rewardCard);
      if (saved.rewardClaimed) setRewardClaimed(true);
      if (saved.rewardKept) setRewardKept(true);
    }
  }, []);

  // Fetch OMDB
  useEffect(() => {
    setOmdbData(null);
    if (movie) fetchOmdbData(movie).then(d => setOmdbData(d));
  }, [movie?.id]);

  // Save state (only for real daily)
  useEffect(() => {
    if (isRandom) return;
    if (guesses.length > 0 || solved || failed) {
      localStorage.setItem(LS_KEY + todayKey, JSON.stringify({ guesses, solved, failed, rewardCard, rewardClaimed, rewardKept }));
    }
  }, [guesses, solved, failed, rewardCard, todayKey, isRandom]);

  const wrongCount = guesses.filter(g => g.toLowerCase() !== movie?.title.toLowerCase()).length;

  // Progressive hints — quote shows from the start
  const hints = useMemo(() => {
    const h = [];
    if (quotes.length > 0) h.push({ type: 'quote', text: `"${quotes[0]}"` });
    if (wrongCount >= 1) h.push({ type: 'info', text: `${movie?.year} · ${GENRE_LABELS[movie?.genre] || movie?.genre}` });
    if (wrongCount >= 2 && omdbData?.director) h.push({ type: 'info', text: `Dir. ${omdbData.director}` });
    if (wrongCount >= 3 && omdbData?.plot) h.push({ type: 'plot', text: omdbData.plot });
    if (wrongCount >= 4 && movie?.title) {
      const words = movie.title.split(' ').map(w => {
        const letters = w.split('');
        return letters.map((ch, j) => j === 0 ? ch.toUpperCase() : /[a-zA-Z]/.test(ch) ? '_' : ch).join('');
      });
      h.push({ type: 'initials', words });
    }
    return h;
  }, [wrongCount, movie, omdbData, quotes]);

  const poster = omdbData?.poster;

  const handleGuess = (movieTitle) => {
    const title = movieTitle || guess.trim();
    if (!title) return;
    if (guesses.some(g => g.toLowerCase() === title.toLowerCase())) { setGuess(''); setSuggestions([]); return; }

    const newGuesses = [...guesses, title];
    setGuesses(newGuesses);
    setGuess('');
    setSuggestions([]);

    if (title.toLowerCase() === movie.title.toLowerCase()) {
      setSolved(true);
      const streak = getDailyStreak() + 1;
      localStorage.setItem('oscars_daily_streak', String(streak));
      localStorage.setItem('oscars_daily_last', todayKey);
      // Generate reward
      const rarity = rollDailyRarity(newGuesses.length);
      const allMovieIds = MOVIES.map(m => m.id);
      const card = {
        movieId: allMovieIds[Math.floor(Math.random() * allMovieIds.length)],
        rarity,
        pulledAt: Date.now(),
        source: 'daily',
      };
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
    setSuggestions(MOVIES.filter(m => m.title.toLowerCase().includes(q) && !guessedSet.has(m.title.toLowerCase())).slice(0, 6));
  };

  const streak = getDailyStreak();

  // Prevent mobile keyboard from auto-opening
  useEffect(() => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      document.activeElement.blur();
    }
  }, []);

  // Countdown to next daily
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!movie) return null;

  // Show pack opening experience for reward
  if (showPack && rewardCard) {
    return (
      <PackOpening
        cards={[rewardCard]}
        wallet={profile?.wallet || []}
        currentShowcase={profile?.showcase || []}
        onSaveShowcase={(showcase) => { if (onSaveProfile) onSaveProfile('showcase', showcase); }}
        onClose={() => { setShowPack(false); setRewardClaimed(true); }}
        onKeep={(card) => {
          if (!onSaveProfile || !profile) return;
          const wallet = [...(profile.wallet || []), card];
          onSaveProfile('wallet', wallet);
          setShowPack(false);
          setRewardClaimed(true);
          setRewardKept(true);
        }}
        onReplace={(card, replaceIdx) => {
          if (!onSaveProfile || !profile) return;
          const wallet = [...(profile.wallet || [])];
          const replaced = wallet[replaceIdx];
          wallet[replaceIdx] = card;
          onSaveProfile('wallet', wallet);
          const showcase = profile.showcase || [];
          if (showcase.some(s => s.movieId === replaced.movieId)) {
            onSaveProfile('showcase', showcase.filter(s => s.movieId !== replaced.movieId));
          }
          setShowPack(false);
          setRewardClaimed(true);
          setRewardKept(true);
        }}
      />
    );
  }

  return (
    <div className="daily-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="daily-modal">
        <button className="daily-close" onClick={onClose}>✕</button>

        <h2 className="daily-title">Daily Oscar</h2>
        <p className="daily-subtitle">
          {solved || failed ? '' : 'Name the movie from the poster and quote'}
        </p>

        {/* Poster — always visible, revealed on solve/fail */}
        {poster && (
          <div className="daily-poster-wrap">
            <img
              className="daily-poster"
              src={poster}
              alt="Mystery movie"
              style={{ filter: (solved || failed) ? 'none' : `blur(${20 - (wrongCount * 4)}px)`, transition: 'filter 0.5s ease' }}
            />
            {(solved || failed) && (
              <div className="daily-poster-label">{movie.title} ({movie.year})</div>
            )}
          </div>
        )}
        {!poster && (solved || failed) && (
          <div className="daily-poster-wrap">
            <div className="daily-poster daily-poster-placeholder">🎬</div>
            <div className="daily-poster-label">{movie.title} ({movie.year})</div>
          </div>
        )}

        {/* Hints — quote always visible, more unlock with wrong guesses */}
        {hints.length > 0 && (
          <div className="daily-hints">
            {hints.map((h, i) => (
              <div key={i} className={`daily-hint ${h.type === 'quote' ? 'daily-hint-quote' : ''} ${h.type === 'initials' ? 'daily-hint-initials' : ''} ${!solved && !failed && i === hints.length - 1 && i > 0 ? 'daily-hint-new' : ''}`}>
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


        {/* Guesses */}
        <div className="daily-guesses">
          {guesses.map((g, i) => (
            <div key={i} className={`daily-guess-row ${g.toLowerCase() === movie.title.toLowerCase() ? 'daily-guess-correct' : 'daily-guess-wrong'}`}>
              <span>{g}</span>
              <span>{g.toLowerCase() === movie.title.toLowerCase() ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        {!solved && !failed && (
          <form className="daily-input-wrap" autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleGuess(); }}>
            <input
              className="daily-input"
              type="search"
              value={guess}
              onChange={(e) => handleInput(e.target.value)}
              placeholder={`Guess ${guesses.length + 1} of ${MAX_GUESSES}...`}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              name={`xmovie_${Date.now()}`}
              data-form-type="other"
              data-lpignore="true"
            />
            {suggestions.length > 0 && (
              <div className="daily-suggestions">
                {suggestions.map(m => (
                  <button key={m.id} className="daily-suggestion" onClick={() => handleGuess(m.title)}>
                    {m.title}
                  </button>
                ))}
              </div>
            )}
            <div className="daily-remaining">{MAX_GUESSES - guesses.length} guess{MAX_GUESSES - guesses.length !== 1 ? 'es' : ''} left</div>
          </form>
        )}

        {/* Win */}
        {solved && (
          <div className="daily-result">
            <div className="daily-result-text daily-result-win">
              Got it in {guesses.length}!
            </div>
            {streak > 0 && <div className="daily-streak">{streak} day streak</div>}
            {rewardCard && !rewardClaimed && (
              <button className="daily-reward-btn" onClick={() => setShowPack(true)}>
                Open your reward card
              </button>
            )}
            {rewardCard && rewardClaimed && (
              <div className="daily-reward-claimed">{rewardKept ? 'Card collected!' : 'Card revealed'}</div>
            )}
          </div>
        )}

        {/* Lose */}
        {failed && (
          <div className="daily-result">
            <div className="daily-result-text daily-result-lose">
              It was {movie.title} ({movie.year})
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)' }}>Better luck tomorrow!</p>
          </div>
        )}

        {/* Next reset timer */}
        {(solved || failed) && (
          <div className="daily-timer">
            Next Daily Oscar in <strong>{countdown}</strong>
          </div>
        )}

      </div>
    </div>
  );
}
