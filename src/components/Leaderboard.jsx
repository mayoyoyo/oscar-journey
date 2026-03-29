import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { MOVIES, MOVIES_BY_ID, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import ProfileDetail from './ProfileDetail';
import StatsTab from './StatsTab';

// Fetch all profiles from Firestore
async function getAllProfiles() {
  const snap = await getDocs(collection(db, 'profiles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export default function Leaderboard({ currentProfile, currentRatings, onOpenDetail, watchedTitleSet, ratings, raters }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const profs = await getAllProfiles();
        if (!cancelled) setProfiles(profs);
      } catch (e) {
        console.error('Failed to load profiles:', e);
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
        // Also check legacy "Title|year" key for un-migrated profiles
        const legacyKey = `${m.title}|${m.year}`;
        const r = ratings[key] || ratings[legacyKey];
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

      // Currently watching
      let currentMovie = null;
      const order = p.playlistOrder;
      const idx = p.currentIdx;
      if (idx != null && Array.isArray(order) && order.length > 0) {
        const entry = order[idx];
        if (typeof entry === 'string' && !entry.includes('|') && isNaN(Number(entry))) {
          currentMovie = MOVIES_BY_ID[entry] || null;
        }
      }

      return {
        id: p.id,
        displayName: p.displayName || p.id,
        avatar: p.avatar || null,
        watchedCount,
        avgRating,
        ratingCount,
        favGenre,
        memberSince,
        currentMovie,
        skipCount: p.skipCount || 0,
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

  // If a profile is selected, show the detail view
  if (selectedProfile) {
    return (
      <ProfileDetail
        profileData={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        currentProfile={currentProfile}
        currentRatings={currentRatings}
        onOpenDetail={onOpenDetail}
      />
    );
  }

  return (
    <div className="leaderboard-section">
      {/* All Profiles */}
      <h2>Profiles</h2>
      {profileStats.length === 0 ? (
        <p style={{ color: 'var(--cream-dim)', fontStyle: 'italic' }}>No profiles found.</p>
      ) : (
        <div className="profile-grid">
          {profileStats.map(p => {
            // Find the full profile data for this card
            const fullProfile = profiles.find(prof => prof.id === p.id);
            return (
              <div
                className="profile-card profile-card-clickable"
                key={p.id}
                onClick={() => fullProfile && setSelectedProfile(fullProfile)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fullProfile && setSelectedProfile(fullProfile);
                  }
                }}
              >
                <div className="profile-card-name">
                  {p.avatar && <span className="profile-card-avatar">{p.avatar}</span>}
                  {p.displayName}
                </div>
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
                {p.skipCount > 0 && (
                  <div className="profile-card-stat profile-card-skip">
                    <span className="stat-label">Films Skipped 😤</span>
                    <span className="stat-value">{p.skipCount}</span>
                  </div>
                )}
                {p.currentMovie && (
                  <div className="profile-card-current"
                    onClick={(e) => { e.stopPropagation(); onOpenDetail(p.currentMovie); }}
                    style={{ cursor: 'pointer' }}
                  >
                    🎬 {p.currentMovie.title} ({p.currentMovie.year})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Your Stats */}
      {watchedTitleSet && ratings && raters && (
        <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
          <StatsTab watchedTitleSet={watchedTitleSet} ratings={ratings} raters={raters} embedded />
        </div>
      )}
    </div>
  );
}
