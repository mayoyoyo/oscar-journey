import React, { useState, useCallback, useEffect } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { QUOTES } from '../data/quotes';
import { fetchOmdbData } from '../utils/omdb';
import { generatePack, getMaxWallet } from '../utils/cards';
import { getTakenCards, registerCard, releaseCard } from '../utils/cardRegistry';
import PackOpening from './PackOpening';

// Build pool of all quotes with movie info
const ALL_QUOTES = [];
for (const [movieId, quotes] of Object.entries(QUOTES)) {
  const movie = MOVIES_BY_ID[movieId];
  if (!movie) continue;
  for (const quote of quotes) {
    ALL_QUOTES.push({ movieId, movie, quote });
  }
}

function QuotePoster({ movie }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    fetchOmdbData(movie).then(d => { if (d?.poster) setPoster(d.poster); });
  }, [movie.id]);
  if (!poster) return null;
  return <img className="quote-battle-poster" src={poster} alt={movie.title} />;
}

export default function QuoteBattle({ profile, onSaveProfile }) {
  const [quoteA, setQuoteA] = useState(null);
  const [quoteB, setQuoteB] = useState(null);
  const [voted, setVoted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [score, setScore] = useState(profile?.quoteBattleCount || 0);
  const [pendingPack, setPendingPack] = useState(null);

  const pickPair = useCallback(() => {
    let a, b;
    do {
      a = ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];
      b = ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];
    } while (a.quote === b.quote || a.movieId === b.movieId);
    setQuoteA(a);
    setQuoteB(b);
    setVoted(false);
    setWinner(null);
  }, []);

  useState(() => { pickPair(); });

  const handleVote = async (choice) => {
    if (voted) return;
    setVoted(true);
    setWinner(choice);
    const newScore = score + 1;
    setScore(newScore);

    const sinceDrop = (profile?.quoteBattlesSinceDrop || 0) + 1;
    if (onSaveProfile) {
      onSaveProfile('quoteBattleCount', newScore);
      onSaveProfile('quoteBattlesSinceDrop', sinceDrop);
    }

    if (sinceDrop >= 15) {
      try {
        const taken = await getTakenCards();
        const pack = generatePack([], [], taken);
        if (pack && pack.length > 0) {
          setPendingPack(pack);
          if (onSaveProfile) onSaveProfile('quoteBattlesSinceDrop', 0);
        }
      } catch { /* silent */ }
    }

    setTimeout(() => pickPair(), 1500);
  };

  if (!quoteA || !quoteB) return null;

  return (
    <div className="quote-battle-section">
      <p className="battle-mode-sub">Which quote hits harder?</p>

      <div className="quote-battle-arena">
        <div
          className={`quote-battle-card ${voted && winner === 'a' ? 'quote-card-winner' : ''} ${voted && winner === 'b' ? 'quote-card-loser' : ''}`}
          onClick={() => handleVote('a')}
        >
          <div className="quote-battle-text">"{quoteA.quote}"</div>
          {voted && (
            <div className="quote-battle-reveal">
              <QuotePoster movie={quoteA.movie} />
              <div>
                <span className="quote-battle-movie">{quoteA.movie.title}</span>
                <span className="quote-battle-year">{quoteA.movie.year}</span>
              </div>
            </div>
          )}
        </div>

        <div className="quote-battle-vs">VS</div>

        <div
          className={`quote-battle-card ${voted && winner === 'b' ? 'quote-card-winner' : ''} ${voted && winner === 'a' ? 'quote-card-loser' : ''}`}
          onClick={() => handleVote('b')}
        >
          <div className="quote-battle-text">"{quoteB.quote}"</div>
          {voted && (
            <div className="quote-battle-reveal">
              <QuotePoster movie={quoteB.movie} />
              <div>
                <span className="quote-battle-movie">{quoteB.movie.title}</span>
                <span className="quote-battle-year">{quoteB.movie.year}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="quote-battle-score">
        {score} vote{score !== 1 ? 's' : ''} cast
      </div>

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
