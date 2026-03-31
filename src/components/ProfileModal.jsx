import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { MOVIES_BY_ID } from '../data/movies';
import { RARITIES, getCollectorScore } from '../utils/cards';
import { fetchOmdbData } from '../utils/omdb';

function FeaturedCard({ card }) {
  const [poster, setPoster] = useState(null);
  const cardRef = useRef(null);
  const movie = MOVIES_BY_ID[card.movieId];
  const rarity = RARITIES[card.rarity || 'COMMON'];

  useEffect(() => {
    if (movie) fetchOmdbData(movie).then(d => { if (d?.poster) setPoster(d.poster); });
  }, [movie?.id]);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100);
    const y = ((e.clientY - rect.top) / rect.height * 100);
    el.style.setProperty('--mouse-x', x + '%');
    el.style.setProperty('--mouse-y', y + '%');
    const rotY = ((x - 50) / 50) * 8;
    const rotX = ((y - 50) / 50) * -8;
    el.style.transform = `perspective(600px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(1.03)`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = '';
  };

  if (!movie) return null;

  return (
    <div
      ref={cardRef}
      className={`pm-featured-card pm-featured-${(card.rarity || 'COMMON').toLowerCase()}`}
      style={{ '--rarity-color': rarity.color, '--rarity-glow': rarity.glow, '--rarity-border': rarity.border }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pm-featured-shine" />
      <div className="pm-featured-spotlight" />
      {poster ? (
        <img className="pm-featured-poster" src={poster} alt={movie.title} />
      ) : (
        <div className="pm-featured-poster pm-featured-no-poster">🎬</div>
      )}
      <div className="pm-featured-info">
        <div className="pm-featured-title">{movie.title}</div>
        <div className="pm-featured-rarity" style={{ color: rarity.color }}>{rarity.name}</div>
      </div>
    </div>
  );
}

export default function ProfileModal({ profileId, onClose, currentProfile, currentRatings, onOpenDetail, onSaveProfile, onOpenProfile }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    if (currentProfile && currentProfile.id === profileId) {
      setProfileData(currentProfile);
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'profiles', profileId));
        if (snap.exists()) setProfileData({ id: snap.id, ...snap.data() });
      } catch (e) { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, [profileId, currentProfile]);

  useEffect(() => {
    if (currentProfile && profileId === currentProfile.id) setProfileData(currentProfile);
  }, [currentProfile, profileId]);

  if (!profileId) return null;

  const p = profileData;
  const watchedCount = p?.watched?.length || 0;
  const ratingCount = p?.ratings ? Object.values(p.ratings).reduce((sum, r) => sum + Object.values(r).filter(v => v != null).length, 0) : 0;
  const collectorScore = getCollectorScore(p?.wallet);
  const showcase = p?.showcase?.[0];
  const isOwn = currentProfile?.id === profileId;

  return (
    <div className="pm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pm-modal">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : !p ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Profile not found</div>
        ) : (
          <>
            {/* Header banner */}
            <div className="pm-header">
              <div className="pm-header-glow" />
              <button className="pm-close" onClick={onClose}>✕</button>
            </div>

            {/* Avatar + identity */}
            <div className="pm-identity">
              <div className="pm-avatar">{p.avatar || '👤'}</div>
              <div>
                <div className="pm-name">{p.displayName || p.id}</div>
              </div>
            </div>

            <div className="pm-body">
              {/* Stats row */}
              <div className="pm-stats">
                <div className="pm-stat">
                  <div className="pm-stat-value">{watchedCount}</div>
                  <div className="pm-stat-label">Films</div>
                </div>
                <div className="pm-stat">
                  <div className="pm-stat-value">{ratingCount}</div>
                  <div className="pm-stat-label">Ratings</div>
                </div>
                <div className="pm-stat">
                  <div className="pm-stat-value">{p.battleCount || 0}</div>
                  <div className="pm-stat-label">Battles</div>
                </div>
                {collectorScore > 0 && (
                  <div className="pm-stat pm-stat-featured">
                    <div className="pm-stat-value">{collectorScore}</div>
                    <div className="pm-stat-label">Collector</div>
                  </div>
                )}
              </div>

              {/* Featured card showcase */}
              {showcase && (
                <div className="pm-showcase-section">
                  <div className="pm-section-label">Featured Card</div>
                  <div className="pm-showcase-wrapper">
                    <FeaturedCard card={showcase} />
                  </div>
                </div>
              )}

              {/* Wallet — own profile only */}
              {isOwn && p.wallet?.length > 0 && (
                <div className="pm-wallet-section">
                  <div className="pm-section-label">Wallet ({p.wallet.length}/3)</div>
                  <div className="pm-wallet-row">
                    {p.wallet.map((card, i) => {
                      const movie = MOVIES_BY_ID[card.movieId];
                      const rarity = RARITIES[card.rarity || 'COMMON'];
                      const isFeatured = p.showcase?.some(s => s.movieId === card.movieId);
                      if (!movie) return null;
                      return (
                        <WalletCard
                          key={i}
                          card={card}
                          movie={movie}
                          rarity={rarity}
                          isFeatured={isFeatured}
                          onClick={() => {
                            if (!onSaveProfile) return;
                            onSaveProfile('showcase', isFeatured ? [] : [card]);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View full profile link */}
              <div className="pm-footer">
                <button className="pm-view-full" onClick={() => {
                  onClose();
                  // Navigate to profiles tab — handled by parent
                }}>
                  View full profile →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WalletCard({ card, movie, rarity, isFeatured, onClick }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    fetchOmdbData(movie).then(d => { if (d?.poster) setPoster(d.poster); });
  }, [movie.id]);

  return (
    <div
      className={`pm-wallet-card ${isFeatured ? 'pm-wallet-featured' : ''}`}
      style={{ '--rarity-border': rarity.border }}
      onClick={onClick}
    >
      {poster ? (
        <img src={poster} alt={movie.title} className="pm-wallet-poster" />
      ) : (
        <div className="pm-wallet-poster pm-wallet-no-poster">🎬</div>
      )}
      <div className="pm-wallet-info">
        <span className="pm-wallet-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
      </div>
      {isFeatured && <div className="pm-wallet-badge">★</div>}
    </div>
  );
}
