import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MOVIES, MOVIES_BY_ID } from '../data/movies';
import { recordVote, getEloLeaderboard, updatePersonalElo } from '../utils/firebaseStorage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { fetchOmdbData } from '../utils/omdb';
import { ratingKey } from '../utils/storage';
import { HARD_PITY, RARITIES, generatePack, getMaxWallet, shouldDropCard, getDropProgressLabel } from '../utils/cards';
import { recordActivity } from '../utils/firebaseStorage';
import { getTakenCards, registerCard, releaseCard } from '../utils/cardRegistry';
import PackOpening from './PackOpening';

// --- Smart Matchmaking ---

function getPairingWeights(numWatched) {
  if (numWatched <= 20) return { swiss: 0.80, uncertainty: 0.15, spicy: 0.05 };
  if (numWatched <= 50) return { swiss: 0.70, uncertainty: 0.20, spicy: 0.10 };
  if (numWatched <= 150) return { swiss: 0.60, uncertainty: 0.25, spicy: 0.15 };
  return { swiss: 0.50, uncertainty: 0.30, spicy: 0.20 };
}

function diversityScore(a, b) {
  let score = 0;
  if (a.genre !== b.genre) score += 1;
  if (Math.abs(a.year - b.year) > 15) score += 1;
  if (a.won !== b.won) score += 0.5;
  return score;
}

function makePairKey(a, b) {
  const ka = ratingKey(a), kb = ratingKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function swissPair(pool, elo, pairHistory) {
  // Sort by ELO
  const sorted = [...pool].sort((a, b) => {
    return (elo[ratingKey(b)]?.elo || 1500) - (elo[ratingKey(a)]?.elo || 1500);
  });

  // Pick a random movie, find closest-rated opponent with diversity preference
  const idx = Math.floor(Math.random() * sorted.length);
  const movieA = sorted[idx];
  const eloA = elo[ratingKey(movieA)]?.elo || 1500;

  let bestB = null;
  let bestScore = Infinity;

  for (let i = 0; i < sorted.length; i++) {
    if (i === idx) continue;
    const candidate = sorted[i];
    const eloB = elo[ratingKey(candidate)]?.elo || 1500;
    const eloDiff = Math.abs(eloA - eloB);
    const pairCount = pairHistory[makePairKey(movieA, candidate)] || 0;
    // Lower score = better match: close ELO, fewer repeats, more diversity
    const score = eloDiff + pairCount * 200 - diversityScore(movieA, candidate) * 30;
    if (score < bestScore) {
      bestScore = score;
      bestB = candidate;
    }
  }

  return [movieA, bestB || sorted[(idx + 1) % sorted.length]];
}

function uncertaintyPair(pool, elo, pairHistory) {
  // Find least-compared movies
  const byMatchCount = [...pool].sort((a, b) => {
    return (elo[ratingKey(a)]?.matchCount || 0) - (elo[ratingKey(b)]?.matchCount || 0);
  });

  // Pick from top 3 least compared
  const leastCompared = byMatchCount[Math.floor(Math.random() * Math.min(3, byMatchCount.length))];

  // Pair against a movie near the median ELO
  const sorted = [...pool].sort((a, b) => {
    return (elo[ratingKey(a)]?.elo || 1500) - (elo[ratingKey(b)]?.elo || 1500);
  });
  const medianIdx = Math.floor(sorted.length / 2);
  const windowSize = Math.max(3, Math.floor(sorted.length * 0.1));

  let calibrator = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const offset = Math.floor(Math.random() * windowSize) - Math.floor(windowSize / 2);
    const idx = Math.max(0, Math.min(sorted.length - 1, medianIdx + offset));
    if (ratingKey(sorted[idx]) !== ratingKey(leastCompared)) {
      calibrator = sorted[idx];
      break;
    }
  }
  if (!calibrator) {
    calibrator = sorted[medianIdx === 0 ? 1 : medianIdx - 1];
  }

  return [leastCompared, calibrator];
}

function spicyPair(pool, elo) {
  // Pick one from top tier, one from bottom tier
  const sorted = [...pool].sort((a, b) => {
    return (elo[ratingKey(b)]?.elo || 1500) - (elo[ratingKey(a)]?.elo || 1500);
  });

  const q1 = Math.max(1, Math.floor(sorted.length * 0.25));
  const q3 = Math.floor(sorted.length * 0.75);
  const bottomLen = sorted.length - q3;

  const top = sorted[Math.floor(Math.random() * q1)];
  const bottom = sorted[q3 + Math.floor(Math.random() * bottomLen)];

  if (ratingKey(top) === ratingKey(bottom)) {
    return [sorted[0], sorted[sorted.length - 1]];
  }
  return [top, bottom];
}

function selectPair(watchedMovies, personalElo, recentMovies, pairHistory) {
  const weights = getPairingWeights(watchedMovies.length);

  // Filter out recently shown movies (cooldown of last 4 movies = last 2 rounds)
  const recentSet = new Set(recentMovies.slice(-4));
  const eligible = watchedMovies.filter(m => !recentSet.has(ratingKey(m)));
  const pool = eligible.length >= 2 ? eligible : watchedMovies;

  const roll = Math.random();
  let pair;

  if (roll < weights.swiss) {
    pair = swissPair(pool, personalElo, pairHistory);
  } else if (roll < weights.swiss + weights.uncertainty) {
    pair = uncertaintyPair(pool, personalElo, pairHistory);
  } else {
    pair = spicyPair(pool, personalElo);
  }

  return pair;
}

function getMatchupLabel(movieA, movieB) {
  if (movieA.genre !== movieB.genre && Math.abs(movieA.year - movieB.year) > 20) return 'Cross-Era Clash';
  if (movieA.genre !== movieB.genre) return 'Genre Clash';
  if (Math.abs(movieA.year - movieB.year) > 20) return 'Decade Duel';
  if (movieA.won && movieB.won) return 'Winner vs Winner';
  if (movieA.won !== movieB.won) return 'Winner vs Nominee';
  return null;
}

function getConfidenceLabel(matchCount) {
  if (matchCount <= 2) return { label: 'New', color: 'var(--cream-dim)' };
  if (matchCount <= 8) return { label: 'Settling', color: 'var(--gold)' };
  if (matchCount <= 20) return { label: 'Confident', color: '#5a9a5a' };
  return { label: 'Locked In', color: '#4a9ade' };
}

// --- Component ---

export default function MovieBattle({ profile, playlist, watchedSet, onOpenDetail, onSaveProfile }) {
  const [movieA, setMovieA] = useState(null);
  const [movieB, setMovieB] = useState(null);
  const [posterA, setPosterA] = useState(null);
  const [posterB, setPosterB] = useState(null);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [eloChange, setEloChange] = useState(null);
  const [voting, setVoting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [personalElo, setPersonalElo] = useState(profile?.personalElo || {});
  const [allProfiles, setAllProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(profile?.id || '');
  const [viewingElo, setViewingElo] = useState(profile?.personalElo || {});
  const [matchupLabel, setMatchupLabel] = useState(null);
  const [rankingsTab, setRankingsTab] = useState('personal');
  const [pendingPack, setPendingPack] = useState(null);
  const [battleCount, setBattleCount] = useState(profile?.battleCount || 0);

  // Session tracking
  const recentMovies = useRef([]);
  const pairHistory = useRef({});
  const sessionVotes = useRef(0);

  // Get list of watched movies
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

  const MIN_FILMS = 10;
  const hasEnough = watchedMovies.length >= MIN_FILMS;

  // Smart pair selection
  const pickPair = useCallback(() => {
    if (!hasEnough) return;
    const [a, b] = selectPair(watchedMovies, personalElo, recentMovies.current, pairHistory.current);
    setMovieA(a);
    setMovieB(b);
    setEloChange(null);
    setMatchupLabel(getMatchupLabel(a, b));

    // Track recent movies and pair history
    recentMovies.current.push(ratingKey(a), ratingKey(b));
    if (recentMovies.current.length > 10) recentMovies.current = recentMovies.current.slice(-10);
    const pk = makePairKey(a, b);
    pairHistory.current[pk] = (pairHistory.current[pk] || 0) + 1;

    // Fetch posters
    setLoadingPosters(true);
    setPosterA(null);
    setPosterB(null);
    Promise.all([fetchOmdbData(a), fetchOmdbData(b)]).then(([dataA, dataB]) => {
      setPosterA(dataA?.poster || null);
      setPosterB(dataB?.poster || null);
      setLoadingPosters(false);
    });
  }, [watchedMovies, hasEnough, personalElo]);

  // Pick initial pair
  useEffect(() => {
    if (hasEnough && !movieA) pickPair();
  }, [hasEnough, movieA, pickPair]);

  // Load leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      const lb = await getEloLeaderboard();
      setLeaderboard(lb);
    } catch (e) { /* silently fail */ }
  }, []);

  useEffect(() => { refreshLeaderboard(); }, [refreshLeaderboard]);

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
        const movie = MOVIES_BY_ID[key];
        let title, year;
        if (movie) {
          title = movie.title;
          year = movie.year;
        } else {
          const sepIdx = key.lastIndexOf('|');
          title = sepIdx > 0 ? key.substring(0, sepIdx) : key;
          year = sepIdx > 0 ? key.substring(sepIdx + 1) : '';
        }
        const confidence = getConfidenceLabel(data.matchCount || 0);
        return {
          id: key,
          title,
          year,
          elo: data.elo,
          matchCount: data.matchCount,
          confidence,
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
        profile.id, keyA, keyB, winnerKey, movieA, movieB
      );

      // Show actual ELO point changes
      setEloChange({
        a: result.deltaA,
        b: result.deltaB,
        winner,
      });

      // Update personal ELO
      const updatedPersonal = await updatePersonalElo(profile.id, keyA, keyB, winnerKey);
      if (updatedPersonal) setPersonalElo(updatedPersonal);

      await refreshLeaderboard();
      sessionVotes.current++;

      // Track battle count and check for card drop (variable schedule)
      const newCount = battleCount + 1;
      const battlesSinceLast = (profile?.battlesSinceDrop || 0) + 1;
      setBattleCount(newCount);
      if (onSaveProfile) {
        onSaveProfile('battleCount', newCount);
        onSaveProfile('battlesSinceDrop', battlesSinceLast);
      }

      if (shouldDropCard(battlesSinceLast)) {
        try {
          const taken = await getTakenCards();
          const pack = generatePack([], [], taken);
          if (pack && pack.length > 0) {
            setPendingPack(pack);
            if (onSaveProfile) onSaveProfile('battlesSinceDrop', 0);
          }
        } catch { /* silent */ }
      }

      setTimeout(() => {
        pickPair();
        setVoting(false);
      }, 800);
    } catch (e) {
      console.error('Vote failed:', e);
      setVoting(false);
    }
  }, [movieA, movieB, voting, profile, pickPair, refreshLeaderboard]);

  const lockedCount = !hasEnough ? watchedMovies.length : 0;
  const lockedRemaining = MIN_FILMS - lockedCount;

  return (
    <div className="battle-section">
      <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--gold)', marginBottom: '4px', textAlign: 'center' }}>
        Movie Battle
      </h2>
      <p style={{ color: 'var(--cream-dim)', fontSize: '0.88rem', textAlign: 'center', marginBottom: '24px' }}>
        Which film is better? Click to vote.
      </p>

      {!hasEnough && (
        <div className="battle-empty" style={{ marginBottom: '32px' }}>
          <h3>Almost There</h3>
          <p>Watch <strong>{lockedRemaining} more film{lockedRemaining !== 1 ? 's' : ''}</strong> to unlock voting.</p>
          <div style={{ margin: '20px auto', maxWidth: '240px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.78rem', color: 'var(--cream-dim)', marginBottom: '6px'
            }}>
              <span>{lockedCount} watched</span>
              <span>{MIN_FILMS} needed</span>
            </div>
            <div style={{
              height: '6px', background: 'var(--bg3)',
              borderRadius: '3px', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', width: `${(lockedCount / MIN_FILMS) * 100}%`,
                background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                borderRadius: '3px', transition: 'width 0.3s'
              }} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', fontStyle: 'italic' }}>
            You need to see enough films before you can judge them. Fair's fair.
          </p>
        </div>
      )}

      {movieA && movieB && (
        <>
          {matchupLabel && (
            <div className="battle-matchup-label">{matchupLabel}</div>
          )}
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
                    {eloChange.a > 0 ? '+' : ''}{eloChange.a}
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
                    {eloChange.b > 0 ? '+' : ''}{eloChange.b}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <button className="battle-skip" onClick={() => !voting && pickPair()} disabled={voting}>
        Skip (different pair)
      </button>

      {/* Card drop progress */}
      {hasEnough && (
        <div className="pack-progress">
          <div className="pack-progress-label">
            {getDropProgressLabel(profile?.battlesSinceDrop || 0)}
          </div>
          <div className="pack-progress-bar">
            <div className="pack-progress-fill" style={{ width: `${Math.min(100, ((profile?.battlesSinceDrop || 0) / HARD_PITY) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Pack opening modal */}
      {pendingPack && (
        <PackOpening
          cards={pendingPack}
          wallet={profile?.wallet || []}
          maxWallet={getMaxWallet(watchedMovies.length)}
          onClose={() => setPendingPack(null)}
          currentShowcase={profile?.showcase || []}
          onSaveShowcase={(showcase) => {
            if (onSaveProfile) onSaveProfile('showcase', showcase);
          }}
          onKeep={async (card) => {
            const wallet = [...(profile?.wallet || []), card];
            if (onSaveProfile) onSaveProfile('wallet', wallet);
            try { await registerCard(card.movieId, card.rarity, profile.id); } catch {}
            if (card.rarity !== 'COMMON' && profile) {
              const movie = MOVIES_BY_ID[card.movieId];
              if (movie) {
                recordActivity(
                  { ...profile, cardPull: true },
                  { ...movie, id: movie.id, cardRarity: card.rarity }
                ).catch(() => {});
              }
            }
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

      <details className="battle-explainer"
        open={!localStorage.getItem('oscars_battle_explainer_closed')}
        onToggle={(e) => {
          if (!e.target.open) localStorage.setItem('oscars_battle_explainer_closed', 'true');
          else localStorage.removeItem('oscars_battle_explainer_closed');
        }}>
        <summary>How does this work?</summary>
        <p>
          Pick the film you think is better. Each movie has an <strong>ELO rating</strong> (like chess rankings) that starts at 1500. When you vote, the winner gains points and the loser drops — but beating a highly-rated film earns more points than beating a low-rated one.
        </p>
        <p>
          Matchups are chosen smartly — similar-rated films face off for tough choices, under-ranked films get more exposure, and the occasional wildcard keeps things interesting.
        </p>
        <p>
          <strong>Global Rankings</strong> combine everyone's votes. <strong>Personal Rankings</strong> are yours alone — your own taste, your own ladder. You can only vote on films you've watched.
        </p>
        <p>
          <strong>Cards</strong> — as you battle, you'll earn random movie cards. The more you battle, the higher your chances (guaranteed within {HARD_PITY}). Cards come in four rarities: <span style={{ color: RARITIES.COMMON.color }}>Common</span> (60%), <span style={{ color: RARITIES.RARE.color }}>Rare</span> (25%), <span style={{ color: RARITIES.EPIC.color }}>Epic</span> (11%), and <span style={{ color: RARITIES.LEGENDARY.color }}>Legendary</span> (4%). Your wallet holds up to 3 cards — feature your best pull on your profile.
        </p>
      </details>

      {/* Rankings tabs for mobile, side-by-side on desktop */}
      <div className="battle-rankings-tabs">
        <button
          className={`battle-rankings-tab ${rankingsTab === 'personal' ? 'active' : ''}`}
          onClick={() => setRankingsTab('personal')}
        >My Rankings</button>
        <button
          className={`battle-rankings-tab ${rankingsTab === 'global' ? 'active' : ''}`}
          onClick={() => setRankingsTab('global')}
        >Global Rankings</button>
      </div>

      <div className="battle-rankings-grid">
        {/* Global Leaderboard */}
        <div className={`battle-rankings-col battle-rankings-global ${rankingsTab !== 'global' ? 'battle-rankings-hidden' : ''}`}>
          <div className="leaderboard-title battle-rankings-desktop-title">🌍 Global Rankings</div>
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
        <div className={`battle-rankings-col battle-rankings-personal ${rankingsTab !== 'personal' ? 'battle-rankings-hidden' : ''}`}>
          <div className="battle-rankings-header battle-rankings-desktop-title">
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
          {/* Mobile profile select — visible only on mobile */}
          <div className="battle-rankings-mobile-select">
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
                  <th style={{ minWidth: '60px' }}>Status</th>
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
                      <td style={{ color: entry.confidence.color, fontSize: '0.75rem' }}>{entry.confidence.label}</td>
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
