import React, { useState, useCallback, useEffect } from 'react';
import { PEOPLE } from '../data/people';
import { MOVIES_BY_ID } from '../data/movies';
import { fetchOmdbData } from '../utils/omdb';

const PEOPLE_LIST = Object.entries(PEOPLE).map(([id, p]) => ({ id, ...p }));

// Separate actors and directors
const ACTORS = PEOPLE_LIST.filter(p => p.categories.some(c => c.includes('Actor') || c.includes('Actress')));
const DIRECTORS = PEOPLE_LIST.filter(p => p.categories.includes('Director'));

export default function PeopleBattle({ profile, onSaveProfile }) {
  const [subMode, setSubMode] = useState('actors'); // 'actors' | 'directors'
  const [personA, setPersonA] = useState(null);
  const [personB, setPersonB] = useState(null);
  const [voted, setVoted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [posterCache, setPosterCache] = useState({});
  const [totalVotes, setTotalVotes] = useState(profile?.peopleBattleCount || 0);

  const pool = subMode === 'actors' ? ACTORS : DIRECTORS;

  const pickPair = useCallback(() => {
    if (pool.length < 2) return;
    let a, b;
    do {
      a = pool[Math.floor(Math.random() * pool.length)];
      b = pool[Math.floor(Math.random() * pool.length)];
    } while (a.id === b.id);
    setPersonA(a);
    setPersonB(b);
    setVoted(false);
    setWinner(null);

    // Prefetch a poster from their first movie
    [a, b].forEach(person => {
      if (person.movieIds[0] && !posterCache[person.movieIds[0]]) {
        const movie = MOVIES_BY_ID[person.movieIds[0]];
        if (movie) {
          fetchOmdbData(movie).then(d => {
            if (d?.poster) setPosterCache(prev => ({ ...prev, [person.movieIds[0]]: d.poster }));
          });
        }
      }
    });
  }, [pool, posterCache]);

  useEffect(() => { pickPair(); }, [subMode]);

  const handleVote = (choice) => {
    if (voted) return;
    setVoted(true);
    setWinner(choice);
    const newVotes = totalVotes + 1;
    setTotalVotes(newVotes);
    if (onSaveProfile) onSaveProfile('peopleBattleCount', newVotes);
    setTimeout(() => pickPair(), 1200);
  };

  if (!personA || !personB) return null;

  return (
    <div className="people-battle-section">
      <div className="people-battle-tabs">
        <button className={`people-tab ${subMode === 'actors' ? 'people-tab-active' : ''}`}
          onClick={() => setSubMode('actors')}>Actors ({ACTORS.length})</button>
        <button className={`people-tab ${subMode === 'directors' ? 'people-tab-active' : ''}`}
          onClick={() => setSubMode('directors')}>Directors ({DIRECTORS.length})</button>
      </div>

      <div className="people-battle-arena">
        <PersonCard
          person={personA}
          voted={voted}
          isWinner={winner === 'a'}
          isLoser={voted && winner !== 'a'}
          onClick={() => handleVote('a')}
          posterCache={posterCache}
        />

        <div className="people-battle-vs">VS</div>

        <PersonCard
          person={personB}
          voted={voted}
          isWinner={winner === 'b'}
          isLoser={voted && winner !== 'b'}
          onClick={() => handleVote('b')}
          posterCache={posterCache}
        />
      </div>

      <div className="people-battle-score">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
      </div>
    </div>
  );
}

function PersonCard({ person, voted, isWinner, isLoser, onClick, posterCache }) {
  const topMovie = MOVIES_BY_ID[person.movieIds[0]];
  const poster = topMovie ? posterCache[person.movieIds[0]] : null;

  return (
    <div
      className={`people-card ${isWinner ? 'people-card-winner' : ''} ${isLoser ? 'people-card-loser' : ''}`}
      onClick={onClick}
    >
      <div className="people-card-photo-wrap">
        <img className="people-card-photo" src={person.photo} alt={person.name}
          onError={(e) => { e.target.style.display = 'none'; }} />
      </div>

      <div className="people-card-info">
        <div className="people-card-name">{person.name}</div>
        <div className="people-card-categories">{person.categories.join(' · ')}</div>

        <div className="people-card-oscars">
          <span className="people-card-oscar-icon">🏆</span>
          <span className="people-card-oscar-count">{person.oscars.wins} Oscar{person.oscars.wins !== 1 ? 's' : ''}</span>
        </div>

        <div className="people-card-films">
          {person.movieIds.slice(0, 3).map(id => {
            const m = MOVIES_BY_ID[id];
            return m ? (
              <span key={id} className="people-card-film">{m.title} ({m.year})</span>
            ) : null;
          })}
          {person.movieIds.length > 3 && (
            <span className="people-card-more">+{person.movieIds.length - 3} more</span>
          )}
        </div>
      </div>

      {poster && (
        <img className="people-card-poster" src={poster} alt="" />
      )}
    </div>
  );
}
