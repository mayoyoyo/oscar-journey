import React, { useState } from 'react';
import { RARITIES } from '../utils/cards';

const LS_KEY = 'oscars_cards_announcement_seen';

export default function CardsAnnouncement() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(LS_KEY));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(LS_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="cards-announce-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="cards-announce-modal">
        <div className="cards-announce-glow" />

        <h2 className="cards-announce-title">Collect Movie Cards</h2>
        <p className="cards-announce-sub">A new way to show off your taste</p>

        <div className="cards-announce-preview">
          <div className="cards-announce-card cards-announce-common">
            <div className="cards-announce-card-inner">
              <span className="cards-announce-card-rarity" style={{ color: RARITIES.COMMON.color }}>Common</span>
            </div>
          </div>
          <div className="cards-announce-card cards-announce-rare">
            <div className="cards-announce-card-inner">
              <span className="cards-announce-card-rarity" style={{ color: RARITIES.RARE.color }}>Rare</span>
            </div>
          </div>
          <div className="cards-announce-card cards-announce-epic">
            <div className="cards-announce-card-inner">
              <span className="cards-announce-card-rarity" style={{ color: RARITIES.EPIC.color }}>Epic</span>
            </div>
          </div>
          <div className="cards-announce-card cards-announce-legendary">
            <div className="cards-announce-card-inner">
              <span className="cards-announce-card-rarity" style={{ color: RARITIES.LEGENDARY.color }}>Legendary</span>
            </div>
          </div>
        </div>

        <div className="cards-announce-details">
          <p>Battle movies head-to-head and earn random cards.</p>
          <p>Collect <span style={{ color: RARITIES.RARE.color }}>Rare</span>, <span style={{ color: RARITIES.EPIC.color }}>Epic</span>, and the elusive <span style={{ color: RARITIES.LEGENDARY.color }}>Legendary</span> cards.</p>
          <p>Feature your best pull on your profile.</p>
        </div>

        <button className="cards-announce-btn" onClick={dismiss}>
          Start Collecting
        </button>
      </div>
    </div>
  );
}
