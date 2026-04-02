import React, { useState, useCallback, useEffect } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { QUOTES } from '../data/quotes';
import { fetchOmdbData } from '../utils/omdb';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { generatePack, getMaxWallet } from '../utils/cards';
import { getTakenCards, registerCard, releaseCard } from '../utils/cardRegistry';
import PackOpening from './PackOpening';

// Build pool
const ALL_QUOTES = [];
for (const [movieId, quotes] of Object.entries(QUOTES)) {
  const movie = MOVIES_BY_ID[movieId];
  if (!movie) continue;
  for (const quote of quotes) {
    ALL_QUOTES.push({ movieId, movie, quote });
  }
}

function TriviaPoster({ movie }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    fetchOmdbData(movie).then(d => { if (d?.poster) setPoster(d.poster); });
  }, [movie.id]);
  if (!poster) return null;
  return (
    <div className="trivia-poster-reveal">
      <img src={poster} alt={movie.title} />
      <span>{movie.title} ({movie.year})</span>
    </div>
  );
}

export default function QuoteTrivia({ profile, onSaveProfile }) {
  const [currentQuote, setCurrentQuote] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(profile?.triviaStreak || 0);
  const [totalCorrect, setTotalCorrect] = useState(profile?.triviaCorrect || 0);
  const [totalPlayed, setTotalPlayed] = useState(profile?.triviaPlayed || 0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingPack, setPendingPack] = useState(null);

  // Load leaderboard
  useEffect(() => {
    getDocs(collection(db, 'profiles')).then(snap => {
      const entries = snap.docs
        .map(d => {
          const data = d.data();
          if (!data.triviaPlayed || data.triviaPlayed < 5) return null;
          return {
            id: d.id,
            name: data.displayName || d.id,
            avatar: data.avatar || '',
            streak: data.triviaStreak || 0,
            correct: data.triviaCorrect || 0,
            played: data.triviaPlayed || 0,
            accuracy: Math.round(((data.triviaCorrect || 0) / (data.triviaPlayed || 1)) * 100),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.streak - a.streak || b.accuracy - a.accuracy);
      setLeaderboard(entries);
    }).catch(() => {});
  }, [totalPlayed]);

  const pickRound = useCallback(() => {
    const correct = ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];

    // Pick 3 wrong options from different movies
    const wrongs = [];
    const usedIds = new Set([correct.movieId]);
    while (wrongs.length < 3) {
      const m = MOVIES[Math.floor(Math.random() * MOVIES.length)];
      if (!usedIds.has(m.id)) {
        usedIds.add(m.id);
        wrongs.push(m);
      }
    }

    // Shuffle options
    const opts = [correct.movie, ...wrongs].sort(() => Math.random() - 0.5);

    setCurrentQuote(correct);
    setOptions(opts);
    setSelected(null);
  }, []);

  // Pick initial round
  useState(() => { pickRound(); });

  const handleSelect = async (movie) => {
    if (selected) return;
    setSelected(movie.id);

    const isCorrect = movie.id === currentQuote.movieId;
    const newPlayed = totalPlayed + 1;
    setTotalPlayed(newPlayed);

    if (isCorrect) {
      const newCorrect = totalCorrect + 1;
      const newStreak = streak + 1;
      setTotalCorrect(newCorrect);
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        if (onSaveProfile) onSaveProfile('triviaStreak', newStreak);
      }

      const sinceDrop = (profile?.triviaSinceDrop || 0) + 1;
      if (onSaveProfile) {
        onSaveProfile('triviaCorrect', newCorrect);
        onSaveProfile('triviaPlayed', newPlayed);
        onSaveProfile('triviaSinceDrop', sinceDrop);
      }

      if (sinceDrop >= 10) {
        try {
          const taken = await getTakenCards();
          const pack = generatePack([], [], taken);
          if (pack && pack.length > 0) {
            setPendingPack(pack);
            if (onSaveProfile) onSaveProfile('triviaSinceDrop', 0);
          }
        } catch { /* silent */ }
      }
    } else {
      setStreak(0);
      if (onSaveProfile) onSaveProfile('triviaPlayed', newPlayed);
    }

    setTimeout(() => pickRound(), 1500);
  };

  if (!currentQuote) return null;

  const accuracy = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;

  return (
    <div className="quote-trivia-section">
      <p className="battle-mode-sub">Which movie is this quote from?</p>

      <div className="trivia-quote-card">
        <div className="trivia-quote-mark">"</div>
        <div className="trivia-quote-text">{currentQuote.quote}</div>
        <div className="trivia-quote-mark trivia-quote-mark-end">"</div>
        {selected && <TriviaPoster movie={currentQuote.movie} />}
      </div>

      <div className="trivia-options">
        {options.map((movie) => {
          const isCorrect = movie.id === currentQuote.movieId;
          const isSelected = selected === movie.id;
          const showResult = selected !== null;

          return (
            <button
              key={movie.id}
              className={`trivia-option ${showResult && isCorrect ? 'trivia-correct' : ''} ${showResult && isSelected && !isCorrect ? 'trivia-wrong' : ''} ${showResult && !isSelected && !isCorrect ? 'trivia-dimmed' : ''}`}
              onClick={() => handleSelect(movie)}
              disabled={selected !== null}
            >
              <span className="trivia-option-title">{movie.title}</span>
              <span className="trivia-option-year">{movie.year}</span>
            </button>
          );
        })}
      </div>

      <div className="trivia-stats">
        <div className="trivia-stat">
          <span className="trivia-stat-value">{streak}</span>
          <span className="trivia-stat-label">Streak</span>
        </div>
        <div className="trivia-stat">
          <span className="trivia-stat-value">{bestStreak}</span>
          <span className="trivia-stat-label">Best</span>
        </div>
        <div className="trivia-stat">
          <span className="trivia-stat-value">{accuracy}%</span>
          <span className="trivia-stat-label">Accuracy</span>
        </div>
        <div className="trivia-stat">
          <span className="trivia-stat-value">{totalPlayed}</span>
          <span className="trivia-stat-label">Played</span>
        </div>
      </div>

      {/* Leaderboard */}
      <button className="trivia-lb-toggle" onClick={() => setShowLeaderboard(p => !p)}>
        {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
      </button>
      {showLeaderboard && leaderboard.length > 0 && (
        <div className="trivia-leaderboard">
          <table className="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Best Streak</th>
                <th>Accuracy</th>
                <th>Played</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{i + 1}</td>
                  <td>{e.avatar} {e.name}</td>
                  <td>{e.streak}</td>
                  <td>{e.accuracy}%</td>
                  <td>{e.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showLeaderboard && leaderboard.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--cream-dim)', fontSize: '0.82rem', marginTop: '8px' }}>
          Play at least 5 rounds to appear on the leaderboard.
        </p>
      )}

      {pendingPack && (
        <PackOpening
          cards={pendingPack}
          wallet={profile?.wallet || []}
          maxWallet={getMaxWallet(0)}
          onClose={() => setPendingPack(null)}
          currentShowcase={profile?.showcase || []}
          onSaveShowcase={(showcase) => {
            if (onSaveProfile) onSaveProfile('showcase', showcase);
          }}
          onKeep={async (card) => {
            const wallet = [...(profile?.wallet || []), card];
            if (onSaveProfile) onSaveProfile('wallet', wallet);
            try { await registerCard(card.movieId, card.rarity, profile.id); } catch {}
          }}
          onReplace={async (card, replaceIdx) => {
            const wallet = [...(profile?.wallet || [])];
            const replaced = wallet[replaceIdx];
            wallet[replaceIdx] = card;
            if (onSaveProfile) {
              onSaveProfile('wallet', wallet);
              const showcase = profile?.showcase || [];
              if (showcase.some(s => s.movieId === replaced.movieId)) {
                onSaveProfile('showcase', showcase.filter(s => s.movieId !== replaced.movieId));
              }
            }
            try {
              await releaseCard(replaced.movieId, replaced.rarity);
              await registerCard(card.movieId, card.rarity, profile.id);
            } catch {}
          }}
        />
      )}
    </div>
  );
}
