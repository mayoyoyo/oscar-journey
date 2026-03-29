import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MOVIES } from '../data/movies';
import { recordVote, getEloLeaderboard } from '../utils/firebaseStorage';
import { fetchOmdbData } from '../utils/omdb';
import { ratingKey } from '../utils/storage';

export default function MovieBattle({ profile, playlist, watchedSet }) {
  const [movieA, setMovieA] = useState(null);
  const [movieB, setMovieB] = useState(null);
  const [posterA, setPosterA] = useState(null);
  const [posterB, setPosterB] = useState(null);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [eloChange, setEloChange] = useState(null); // { a: number, b: number, winner: 'a'|'b' }
  const [voting, setVoting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastPairKey, setLastPairKey] = useState('');

  // Get list of watched movies from profile's watched set mapped through playlist
  const watchedMovies = useMemo(() => {
    const movies = [];
    for (const idx of watchedSet) {
      if (playlist[idx]) movies.push({ ...playlist[idx], playlistIdx: idx });
    }
    return movies;
  }, [watchedSet, playlist]);

  const hasEnough = watchedMovies.length >= 2;

  // Pick two random movies from watched list
  const pickPair = useCallback(() => {
    if (!hasEnough) return;
    let a, b, attempts = 0;
    do {
      a = watchedMovies[Math.floor(Math.random() * watchedMovies.length)];
      b = watchedMovies[Math.floor(Math.random() * watchedMovies.length)];
      attempts++;
    } while (
      (a.title === b.title && a.year === b.year ||
       ratingKey(a) + '|' + ratingKey(b) === lastPairKey ||
       ratingKey(b) + '|' + ratingKey(a) === lastPairKey) &&
      attempts < 50
    );
    setMovieA(a);
    setMovieB(b);
    setEloChange(null);
    setLastPairKey(ratingKey(a) + '|' + ratingKey(b));

    // Fetch posters
    setLoadingPosters(true);
    setPosterA(null);
    setPosterB(null);
    Promise.all([fetchOmdbData(a), fetchOmdbData(b)]).then(([dataA, dataB]) => {
      setPosterA(dataA?.poster || null);
      setPosterB(dataB?.poster || null);
      setLoadingPosters(false);
    });
  }, [watchedMovies, hasEnough, lastPairKey]);

  // Pick initial pair
  useEffect(() => {
    if (hasEnough && !movieA) pickPair();
  }, [hasEnough, movieA, pickPair]);

  // Load leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      const lb = await getEloLeaderboard();
      setLeaderboard(lb);
    } catch (e) {
      // Silently fail on leaderboard load
    }
  }, []);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  // Handle vote
  const handleVote = useCallback(async (winner) => {
    if (!movieA || !movieB || voting) return;
    setVoting(true);
    const keyA = ratingKey(movieA);
    const keyB = ratingKey(movieB);
    const winnerKey = winner === 'a' ? keyA : keyB;

    try {
      const result = await recordVote(
        profile.id,
        keyA,
        keyB,
        winnerKey,
        movieA,
        movieB
      );
      // Show ELO change animation
      const changeA = result.newEloA - 1500; // approximate, just show the delta
      const changeB = result.newEloB - 1500;
      // Calculate actual delta from what we know
      // We need to figure out the delta - simplest approach: show new ELOs
      setEloChange({
        a: winner === 'a' ? '+' : '-',
        b: winner === 'b' ? '+' : '-',
        winner,
      });

      // Refresh leaderboard
      await refreshLeaderboard();

      // After delay, load next pair
      setTimeout(() => {
        pickPair();
        setVoting(false);
      }, 800);
    } catch (e) {
      console.error('Vote failed:', e);
      setVoting(false);
    }
  }, [movieA, movieB, voting, profile, pickPair, refreshLeaderboard]);

  if (!hasEnough) {
    return (
      <div className="battle-section">
        <div className="battle-empty">
          <h3>Not Enough Films Watched</h3>
          <p>Watch at least 2 movies to start battling!</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Head to the Journey tab and mark films as watched.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-section">
      <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--gold)', marginBottom: '4px', textAlign: 'center' }}>
        Movie Battle
      </h2>
      <p style={{ color: 'var(--cream-dim)', fontSize: '0.88rem', textAlign: 'center', marginBottom: '24px' }}>
        Which film is better? Click to vote.
      </p>

      {movieA && movieB && (
        <div className="battle-arena">
          {/* Movie A */}
          <div
            className="battle-card"
            onClick={() => !voting && handleVote('a')}
            style={{ opacity: voting ? 0.7 : 1 }}
          >
            {loadingPosters ? (
              <div className="battle-card-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : posterA ? (
              <img className="battle-card-poster" src={posterA} alt={movieA.title} />
            ) : (
              <div className="battle-card-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                🎬
              </div>
            )}
            <div className="battle-card-info">
              <div className="battle-card-title">{movieA.title}</div>
              <div className="battle-card-year">{movieA.year}</div>
              {eloChange && (
                <div className={`battle-elo-change ${eloChange.winner === 'a' ? 'positive' : 'negative'}`}>
                  {eloChange.winner === 'a' ? 'Winner!' : ''}
                </div>
              )}
            </div>
          </div>

          {/* VS divider */}
          <div className="battle-vs">VS</div>

          {/* Movie B */}
          <div
            className="battle-card"
            onClick={() => !voting && handleVote('b')}
            style={{ opacity: voting ? 0.7 : 1 }}
          >
            {loadingPosters ? (
              <div className="battle-card-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : posterB ? (
              <img className="battle-card-poster" src={posterB} alt={movieB.title} />
            ) : (
              <div className="battle-card-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                🎬
              </div>
            )}
            <div className="battle-card-info">
              <div className="battle-card-title">{movieB.title}</div>
              <div className="battle-card-year">{movieB.year}</div>
              {eloChange && (
                <div className={`battle-elo-change ${eloChange.winner === 'b' ? 'positive' : 'negative'}`}>
                  {eloChange.winner === 'b' ? 'Winner!' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button className="battle-skip" onClick={() => !voting && pickPair()} disabled={voting}>
        Skip (different pair)
      </button>

      {/* Leaderboard */}
      <div className="leaderboard-title">Current Rankings</div>
      {leaderboard.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No rankings yet. Cast some votes to see the leaderboard!
        </p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Year</th>
              <th>ELO</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.slice(0, 20).map((entry, i) => (
              <tr key={entry.id}>
                <td className="leaderboard-rank">{i + 1}</td>
                <td>{entry.title}</td>
                <td>{entry.year}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{entry.elo}</td>
                <td>{entry.matchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
