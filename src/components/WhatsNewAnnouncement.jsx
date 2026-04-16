import React, { useState } from 'react';
import { RARITIES } from '../utils/cards';

const LS_KEY = 'oscars_whats_new_v2_seen';

export default function WhatsNewAnnouncement({ onGoToBattle, onPlayDaily }) {
  const [visible, setVisible] = useState(() => !localStorage.getItem(LS_KEY));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(LS_KEY, 'true');
    // Also mark the individual announcements as seen so they don't show separately
    localStorage.setItem('oscars_cards_announcement_seen', 'true');
    localStorage.setItem('oscars_daily_announcement_seen', 'true');
    setVisible(false);
  };

  return (
    <div className="wn-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="wn-modal">
        <div className="wn-glow" />
        <button className="wn-close" onClick={dismiss}>✕</button>

        <div className="wn-badge">NEW FEATURES</div>
        <h2 className="wn-title">What's New</h2>

        {/* Essential Canon Section */}
        <div className="wn-section">
          <div className="wn-section-header">
            <span className="wn-section-icon">✦</span>
            <div>
              <div className="wn-section-title">438 Essential Films Added</div>
              <div className="wn-section-sub">Beyond the Oscars — the films the Academy missed</div>
            </div>
          </div>
          <div className="wn-card-row" style={{ justifyContent: 'center', gap: 14 }}>
            <span className="tier-pips tier-8" style={{ padding: '5px 10px' }}>
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="tier-pip filled" />)}
              <span className="tier-pip-label">8</span>
            </span>
            <span className="tier-pips tier-4" style={{ padding: '5px 10px' }}>
              {Array.from({ length: 4 }, (_, i) => <span key={i} className="tier-pip filled" />)}
              <span className="tier-pip-label">4</span>
            </span>
            <span className="tier-pips tier-2" style={{ padding: '5px 10px' }}>
              {Array.from({ length: 2 }, (_, i) => <span key={i} className="tier-pip filled" />)}
              <span className="tier-pip-label">2</span>
            </span>
          </div>
          <p className="wn-section-desc">Fight Club, The Matrix, Mulholland Drive, Do the Right Thing — films every great list agrees on but the Academy overlooked. Each film scored against 7 independent canon lists (Sight & Sound, AFI, Criterion, IMDb, Letterboxd, festival grand prizes, National Film Registry). Gold pips show how many lists a film appears on. Track your Canon Score in the Stats tab.</p>
        </div>

        <div className="wn-divider" />

        {/* Battle Cards Section */}
        <div className="wn-section">
          <div className="wn-section-header">
            <span className="wn-section-icon">⚔️</span>
            <div>
              <div className="wn-section-title">Collectible Cards</div>
              <div className="wn-section-sub">Battle movies and earn cards</div>
            </div>
          </div>
          <div className="wn-card-row">
            <div className="wn-card" style={{ borderColor: RARITIES.COMMON.color }}>
              <span style={{ color: RARITIES.COMMON.color }}>Common</span>
            </div>
            <div className="wn-card" style={{ borderColor: RARITIES.RARE.color, boxShadow: `0 0 8px ${RARITIES.RARE.glow}` }}>
              <span style={{ color: RARITIES.RARE.color }}>Rare</span>
            </div>
            <div className="wn-card" style={{ borderColor: RARITIES.EPIC.color, boxShadow: `0 0 8px ${RARITIES.EPIC.glow}` }}>
              <span style={{ color: RARITIES.EPIC.color }}>Epic</span>
            </div>
            <div className="wn-card wn-card-legendary" style={{ borderColor: RARITIES.LEGENDARY.color, boxShadow: `0 0 12px ${RARITIES.LEGENDARY.glow}` }}>
              <span style={{ color: RARITIES.LEGENDARY.color }}>Legendary</span>
            </div>
          </div>
          <p className="wn-section-desc">Vote in head-to-head battles to earn random movie cards. Hold up to 3 in your wallet and feature your best on your profile.</p>
        </div>

        <div className="wn-divider" />

        {/* Daily Oscar Section */}
        <div className="wn-section">
          <div className="wn-section-header">
            <span className="wn-section-icon">🎬</span>
            <div>
              <div className="wn-section-title">Daily Oscar</div>
              <div className="wn-section-sub">One puzzle every day</div>
            </div>
          </div>
          <p className="wn-section-desc">Guess the movie from a blurred poster and a quote. 5 guesses, progressive hints. Correct answers earn a card — fewer guesses, rarer the pull. Build your streak.</p>
        </div>

        <div className="wn-buttons">
          <button className="wn-btn-primary" onClick={() => { dismiss(); if (onGoToBattle) onGoToBattle(); }}>
            Start Battling
          </button>
          <button className="wn-btn-secondary" onClick={() => { dismiss(); if (onPlayDaily) onPlayDaily(); }}>
            Play Daily Oscar
          </button>
        </div>

        <button className="wn-dismiss" onClick={dismiss}>I'll explore later</button>
      </div>
    </div>
  );
}
