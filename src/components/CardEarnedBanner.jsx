import React from 'react';
import { RARITIES } from '../utils/cards';

export default function CardEarnedBanner({ onOpen, onDismiss }) {
  return (
    <div className="card-earned-banner">
      <div className="card-earned-glow" />
      <div className="card-earned-content">
        <div className="card-earned-icon">🎬</div>
        <div className="card-earned-text">
          <div className="card-earned-title">You earned a card!</div>
          <div className="card-earned-sub">
            Could be <span style={{ color: RARITIES.RARE.color }}>Rare</span>,{' '}
            <span style={{ color: RARITIES.EPIC.color }}>Epic</span>, or even{' '}
            <span style={{ color: RARITIES.LEGENDARY.color }}>Legendary</span>
          </div>
        </div>
      </div>
      <div className="card-earned-actions">
        <button className="card-earned-open" onClick={onOpen}>Open Now</button>
        <button className="card-earned-later" onClick={onDismiss}>Later</button>
      </div>
    </div>
  );
}
