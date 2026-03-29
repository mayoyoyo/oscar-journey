import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getEloLeaderboard } from '../utils/firebaseStorage';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';

// Fetch all profiles from Firestore
async function getAllProfiles() {
  const snap = await getDocs(collection(db, 'profiles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export default function Leaderboard() {
  const [profiles, setProfiles] = useState([]);
  const [eloLeaderboard, setEloLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profs, elo] = await Promise.all([getAllProfiles(), getEloLeaderboard()]);
        if (!cancelled) {
          setProfiles(profs);
          setEloLeaderboard(elo);
        }
      } catch (e) {
        console.error('Failed to load leaderboard data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Compute profile stats
  const profileStats = useMemo(() => {
    return profiles.map(p => {
      const watchedCount = Array.isArray(p.watched) ? p.watched.length : 0;
      const ratings = p.ratings || {};

      // Count all ratings and compute average
      let totalRating = 0;
      let ratingCount = 0;
      // Genre tracking: { genreCode: { total, count } }
      const genreRatings = {};

      for (const m of MOVIES) {
        const key = ratingKey(m);
        const r = ratings[key];
        if (!r) continue;
        // Sum all raters' ratings for this profile
        for (const val of Object.values(r)) {
          if (val != null) {
            totalRating += val;
            ratingCount++;
            // Track by genre
            if (!genreRatings[m.genre]) genreRatings[m.genre] = { total: 0, count: 0 };
            genreRatings[m.genre].total += val;
            genreRatings[m.genre].count++;
          }
        }
      }

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null;

      // Favorite genre: highest avg rating with min 3 rated
      let favGenre = null;
      let favGenreAvg = 0;
      for (const [code, data] of Object.entries(genreRatings)) {
        if (data.count >= 3) {
          const avg = data.total / data.count;
          if (avg > favGenreAvg) {
            favGenreAvg = avg;
            favGenre = GENRE_LABELS[code] || code;
          }
        }
      }

      // Member since
      let memberSince = null;
      if (p.createdAt) {
        // Firestore Timestamp has toDate(), or it might be serialized
        const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        memberSince = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      return {
        id: p.id,
        displayName: p.displayName || p.id,
        watchedCount,
        avgRating,
        ratingCount,
        favGenre,
        memberSince,
      };
    }).sort((a, b) => b.watchedCount - a.watchedCount);
  }, [profiles]);

  if (loading) {
    return (
      <div className="leaderboard-section" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div className="leaderboard-section">
      {/* All Profiles */}
      <h2>All Profiles</h2>
      {profileStats.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic' }}>No profiles found.</p>
      ) : (
        <div className="profile-grid">
          {profileStats.map(p => (
            <div className="profile-card" key={p.id}>
              <div className="profile-card-name">{p.displayName}</div>
              <div className="profile-card-stat">
                <span className="stat-label">Films Watched</span>
                <span className="stat-value">{p.watchedCount}</span>
              </div>
              <div className="profile-card-stat">
                <span className="stat-label">Avg Rating</span>
                <span className="stat-value">{p.avgRating ? `${p.avgRating} / 10` : '--'}</span>
              </div>
              <div className="profile-card-stat">
                <span className="stat-label">Total Ratings</span>
                <span className="stat-value">{p.ratingCount}</span>
              </div>
              <div className="profile-card-stat">
                <span className="stat-label">Fav Genre</span>
                <span className="stat-value">{p.favGenre || '--'}</span>
              </div>
              {p.memberSince && (
                <div className="profile-card-stat">
                  <span className="stat-label">Member Since</span>
                  <span className="stat-value">{p.memberSince}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Movie ELO Rankings */}
      <h2>Movie ELO Rankings</h2>
      {eloLeaderboard.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No rankings yet. Cast some votes in the Battle tab!
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
              <th>Category</th>
              <th>Genre</th>
            </tr>
          </thead>
          <tbody>
            {eloLeaderboard.slice(0, 50).map((entry, i) => (
              <tr key={entry.id}>
                <td className="leaderboard-rank">{i + 1}</td>
                <td>{entry.title}</td>
                <td>{entry.year}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{entry.elo}</td>
                <td>{entry.matchCount}</td>
                <td>
                  {entry.category === 'INT' && <span className="badge-int-sm">International</span>}
                  {entry.category === 'ANIM' && <span className="badge-anim-sm">Animated</span>}
                  {entry.category === 'BP' && <span className="badge-bp-sm">Best Picture</span>}
                </td>
                <td>
                  <span className="badge-genre-sm">{GENRE_LABELS[entry.genre] || entry.genre || '--'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
