import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { MOVIES, MOVIES_BY_ID, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import ProfileDetail from './ProfileDetail';
import StatsTab from './StatsTab';
import { getCollectorScore, RARITIES } from '../utils/cards';
import { fetchOmdbData } from '../utils/omdb';

// Mini featured card for profile grid
function MiniShowcase({ card }) {
  const [poster, setPoster] = React.useState(null);
  const movie = MOVIES_BY_ID[card.movieId];
  const rarity = RARITIES[card.rarity || 'COMMON'];
  React.useEffect(() => {
    if (movie) fetchOmdbData(movie).then(d => { if (d?.poster) setPoster(d.poster); });
  }, [movie?.id]);
  if (!movie) return null;
  return (
    <div className="profile-card-showcase" style={{ '--rarity-border': rarity.border, '--rarity-glow': rarity.glow }}>
      {poster ? <img src={poster} alt={movie.title} /> : <span style={{ fontSize: '1.5rem' }}>🎬</span>}
      <div className="profile-card-showcase-label">
        <span className="profile-card-showcase-movie">{movie.title}</span>
        <span className="profile-card-showcase-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
      </div>
    </div>
  );
}

// Fetch all profiles from Firestore
async function getAllProfiles() {
  const snap = await getDocs(collection(db, 'profiles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export default function Leaderboard({ currentProfile, currentRatings, onOpenDetail, watchedTitleSet, ratings, raters, onSaveProfile, autoSelectProfileId, onClearAutoSelect }) {
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

  // Auto-select a profile when navigated from profile modal
  useEffect(() => {
    if (autoSelectProfileId && profiles.length > 0 && !loading) {
      const target = profiles.find(p => p.id === autoSelectProfileId);
      if (target) setSelectedProfile(target);
      if (onClearAutoSelect) onClearAutoSelect();
    }
  }, [autoSelectProfileId, profiles, loading]);

  // Compute profile stats (real profiles + virtual co-rater profiles)
  const profileStats = useMemo(() => {
    const realStats = [];
    const virtualStats = [];

    for (const p of profiles) {
      const watchedCount = Array.isArray(p.watched) ? p.watched.length : 0;
      const profileRatings = p.ratings || {};
      const profileRaters = p.raters || [];

      // Count all ratings and compute average (for the real profile card)
      let totalRating = 0;
      let ratingCount = 0;
      const genreRatings = {};

      for (const m of MOVIES) {
        const key = ratingKey(m);
        const legacyKey = `${m.title}|${m.year}`;
        const r = profileRatings[key] || profileRatings[legacyKey];
        if (!r) continue;
        // Sum all raters' ratings for this profile
        for (const val of Object.values(r)) {
          if (val != null) {
            totalRating += val;
            ratingCount++;
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

      realStats.push({
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
        showcase: p.showcase || [],
        wallet: p.wallet || [],
      });

      // Generate virtual profile cards for secondary raters (raters[1], raters[2], etc.)
      const primaryRater = profileRaters[0] || (p.displayName || p.id);
      const secondaryRaters = profileRaters.slice(1);

      for (const raterName of secondaryRaters) {
        let vTotal = 0;
        let vCount = 0;
        const vGenreRatings = {};

        for (const m of MOVIES) {
          const key = ratingKey(m);
          const legacyKey = `${m.title}|${m.year}`;
          const r = profileRatings[key] || profileRatings[legacyKey];
          if (!r) continue;
          const val = r[raterName];
          if (val != null) {
            vTotal += val;
            vCount++;
            if (!vGenreRatings[m.genre]) vGenreRatings[m.genre] = { total: 0, count: 0 };
            vGenreRatings[m.genre].total += val;
            vGenreRatings[m.genre].count++;
          }
        }

        let vFavGenre = null;
        let vFavGenreAvg = 0;
        for (const [code, data] of Object.entries(vGenreRatings)) {
          if (data.count >= 3) {
            const avg = data.total / data.count;
            if (avg > vFavGenreAvg) {
              vFavGenreAvg = avg;
              vFavGenre = GENRE_LABELS[code] || code;
            }
          }
        }

        virtualStats.push({
          id: `${p.id}__${raterName}`,
          displayName: raterName,
          avatar: null,
          isVirtualRater: true,
          parentProfileId: p.id,
          parentDisplayName: p.displayName || p.id,
          watchedCount,
          avgRating: vCount > 0 ? (vTotal / vCount).toFixed(1) : null,
          ratingCount: vCount,
          favGenre: vFavGenre,
          memberSince,
          currentMovie,
          skipCount: 0,
        });
      }
    }

    return [...realStats, ...virtualStats]
      .filter(p => p.watchedCount > 0)
      .sort((a, b) => b.watchedCount - a.watchedCount);
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
        profileData={currentProfile && selectedProfile.id === currentProfile.id ? { ...selectedProfile, ...currentProfile } : selectedProfile}
        onBack={() => setSelectedProfile(null)}
        currentProfile={currentProfile}
        currentRatings={currentRatings}
        onOpenDetail={onOpenDetail}
        onSaveProfile={onSaveProfile}
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
            // For virtual raters, find parent profile and pass focusRater
            // For real profiles, use the full profile data directly
            const handleClick = () => {
              if (p.isVirtualRater) {
                const parent = profiles.find(prof => prof.id === p.parentProfileId);
                if (parent) setSelectedProfile({ ...parent, focusRater: p.displayName });
              } else {
                const fullProfile = profiles.find(prof => prof.id === p.id);
                if (fullProfile) setSelectedProfile(fullProfile);
              }
            };

            return (
              <div
                className="profile-card profile-card-clickable"
                key={p.id}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                  }
                }}
              >
                <div className="profile-card-name">
                  {p.avatar && <span className="profile-card-avatar">{p.avatar}</span>}
                  {!p.avatar && p.isVirtualRater && <span className="profile-card-avatar">👥</span>}
                  {p.displayName}
                </div>
                {p.isVirtualRater && (
                  <div className="profile-card-co-rater">
                    Co-watching with {p.parentDisplayName}
                  </div>
                )}
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
                {!p.isVirtualRater && (
                  <div className="profile-card-stat profile-card-skip">
                    <span className="stat-label">Films Skipped {p.skipCount > 0 ? '😤' : ''}</span>
                    <span className={`stat-value ${p.skipCount > 0 ? 'has-skips' : ''}`}>{p.skipCount}</span>
                  </div>
                )}
                {getCollectorScore(p.wallet) > 0 && (
                  <div className="profile-card-stat">
                    <span className="stat-label">Collector Score</span>
                    <span className="stat-value" style={{ color: 'var(--gold)' }}>{getCollectorScore(p.wallet)}</span>
                  </div>
                )}
                {p.showcase?.length > 0 && (
                  <MiniShowcase card={p.showcase[0]} />
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
