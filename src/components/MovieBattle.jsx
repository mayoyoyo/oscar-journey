import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { recordVote, getEloLeaderboard, updatePersonalElo } from '../utils/firebaseStorage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { fetchOmdbData } from '../utils/omdb';
import { ratingKey } from '../utils/storage';

export default function MovieBattle({ profile, playlist, watchedSet, onOpenDetail }) {
  const [movieA, setMovieA] = useState(null);
  const [movieB, setMovieB] = useState(null);
  const [posterA, setPosterA] = useState(null);
  const [posterB, setPosterB] = useState(null);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [eloChange, setEloChange] = useState(null); // { a: number, b: number, winner: 'a'|'b' }
  const [voting, setVoting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastPairKey, setLastPairKey] = useState('');
  const [personalElo, setPersonalElo] = useState(profile?.personalElo || {});
  const [allProfiles, setAllProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(profile?.id || '');
  const [viewingElo, setViewingElo] = useState(profile?.personalElo || {});

  // Get list of watched movies from profile's watched set (movie IDs)
  const watchedMovies = useMemo(() => {
    const movies = [];
    for (let i = 0; i < playlist.length; i++) {
      const m = playlist[i];
      if (watchedSet.has(m.id)) {
        movies.push({ ...m, playlistIdx: i });
      }
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

  // Load all profiles for the personal rankings dropdown
  useEffect(() => {
    async function loadProfiles() {
      try {
        const snap = await getDocs(collection(db, 'profiles'));
        const profs = snap.docs.map(d => ({
          id: d.id,
          displayName: d.data().displayName || d.id,
          avatar: d.data().avatar || '',
          personalElo: d.data().personalElo || {},
        }));
        setAllProfiles(profs);
      } catch (e) { /* silently fail */ }
    }
    loadProfiles();
  }, []);

  // When selected profile changes, update the viewing ELO
  useEffect(() => {
    if (selectedProfileId === profile?.id) {
      setViewingElo(personalElo);
    } else {
      const p = allProfiles.find(p => p.id === selectedProfileId);
      setViewingElo(p?.personalElo || {});
    }
  }, [selectedProfileId, personalElo, allProfiles, profile]);

  // Build personal leaderboard from the selected profile's ELO
  const personalLeaderboard = useMemo(() => {
    return Object.entries(viewingElo)
      .map(([key, data]) => {
        // Key is a movie ID (or legacy "Title|year" format)
        const movie = MOVIES_BY_ID[key];
        let title, year;
        if (movie) {
          title = movie.title;
          year = movie.year;
        } else {
          // Legacy "Title|year" format fallback
          const sepIdx = key.lastIndexOf('|');
          title = sepIdx > 0 ? key.substring(0, sepIdx) : key;
          year = sepIdx > 0 ? key.substring(sepIdx + 1) : '';
        }
        return {
          id: key,
          title,
          year,
          elo: data.elo,
          matchCount: data.matchCount,
        };
      })
      .sort((a, b) => b.elo - a.elo);
  }, [viewingElo]);

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
      setEloChange({
        a: winner === 'a' ? '+' : '-',
        b: winner === 'b' ? '+' : '-',
        winner,
      });

      // Update personal ELO
      const updatedPersonal = await updatePersonalElo(profile.id, keyA, keyB, winnerKey);
      if (updatedPersonal) setPersonalElo(updatedPersonal);

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

      {/* Rankings — both shown side by side */}
      <div className="battle-rankings-grid">
        {/* Global Leaderboard */}
        <div className="battle-rankings-col">
          <div className="leaderboard-title">🌍 Global Rankings</div>
          {leaderboard.length === 0 ? (
            <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No rankings yet. Cast some votes!
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
                {leaderboard.map((entry, i) => {
                  const movie = MOVIES_BY_ID[entry.id];
                  return (
                    <tr key={entry.id} onClick={() => movie && onOpenDetail && onOpenDetail(movie)}
                      style={{ cursor: movie ? 'pointer' : 'default' }}>
                      <td className="leaderboard-rank">{i + 1}</td>
                      <td>{entry.title}</td>
                      <td>{entry.year}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{entry.elo}</td>
                      <td>{entry.matchCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Personal Leaderboard */}
        <div className="battle-rankings-col">
          <div className="battle-rankings-header">
            <span className="leaderboard-title" style={{ marginBottom: 0 }}>👤</span>
            <select
              className="battle-profile-select"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              {profile && <option value={profile.id}>My Rankings</option>}
              {allProfiles
                .filter(p => p.id !== profile?.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.avatar} {p.displayName}
                  </option>
                ))
              }
            </select>
          </div>
          {personalLeaderboard.length === 0 ? (
            <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No personal rankings yet. Cast some votes!
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
                {personalLeaderboard.map((entry, i) => {
                  const movie = MOVIES_BY_ID[entry.id];
                  return (
                    <tr key={entry.id} onClick={() => movie && onOpenDetail && onOpenDetail(movie)}
                      style={{ cursor: movie ? 'pointer' : 'default' }}>
                      <td className="leaderboard-rank">{i + 1}</td>
                      <td>{entry.title}</td>
                      <td>{entry.year}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{entry.elo}</td>
                      <td>{entry.matchCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
