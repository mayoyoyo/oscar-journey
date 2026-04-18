import React from 'react';
import { MOVIES } from '../data/movies';

export default function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal info-modal">
        <button className="info-modal-close" onClick={onClose}>✕</button>

        <div className="info-hero">
          <span className="info-hero-icon">🏆</span>
          <h2 className="info-hero-title">The Oscars Journey</h2>
          <p className="info-hero-sub">Your guide to {MOVIES.length} must-watch films — every major Oscar + the canon the Academy overlooked</p>
        </div>

        <div className="info-section">
          <div className="info-section-icon">🎬</div>
          <div>
            <h3>The Problem</h3>
            <p>You spend 45 minutes scrolling Netflix, pick nothing, and rewatch The Office. Meanwhile, decades of incredible cinema sit unwatched.</p>
          </div>
        </div>

        <div className="info-section">
          <div className="info-section-icon">✨</div>
          <div>
            <h3>The Solution</h3>
            <p>We took every <strong>Best Picture nominee (1939+)</strong>, every <strong>International Feature winner (1956+)</strong> and <strong>Animated Feature winner</strong>, and <strong>304 essential non-Oscar films</strong> curated across 7 canon lists (Sight &amp; Sound, Criterion, IMDb, Letterboxd, AFI, festival grand prizes, National Film Registry) — <strong>{MOVIES.length} films</strong> total — and shuffled them into a randomized journey. No more choosing, just press play.</p>
          </div>
        </div>

        <div className="info-divider" />

        <div className="info-features">
          <h3 className="info-features-title">What You Can Do</h3>

          <div className="info-feature">
            <span className="info-feature-emoji">🎬</span>
            <div>
              <strong>Journey</strong>
              <p>Your randomized film queue. Watch, rate, advance. Smart filters, genre-balanced order, sync with friends. Skip exists — with shame.</p>
            </div>
          </div>

          <div className="info-feature">
            <span className="info-feature-emoji">📋</span>
            <div>
              <strong>Films</strong>
              <p>Browse all {MOVIES.length} films A-Z. Checklist mode for quick marking. Every film has poster, plot, IMDb rating, director, runtime, and awards or canon list appearances.</p>
            </div>
          </div>

          <div className="info-feature">
            <span className="info-feature-emoji">⚔️</span>
            <div>
              <strong>Battle</strong>
              <p>Head-to-head voting with ELO rankings. Smart matchmaking keeps it interesting. Earn collectible cards as you vote.</p>
            </div>
          </div>

          <div className="info-feature">
            <span className="info-feature-emoji">🃏</span>
            <div>
              <strong>Cards</strong>
              <p>Earn random movie cards from battles, journey progress, and Daily Oscar. Four rarities: Common, Rare, Epic, and Legendary. Each movie+rarity combo is unique — only one person can hold it. Feature your best pull on your profile.</p>
            </div>
          </div>

          <div className="info-feature">
            <span className="info-feature-emoji">🧩</span>
            <div>
              <strong>Daily Oscar</strong>
              <p>One puzzle every day. Guess the movie from a blurred poster and a quote. Fewer guesses = rarer card reward. Build your streak.</p>
            </div>
          </div>

          <div className="info-feature">
            <span className="info-feature-emoji">👥</span>
            <div>
              <strong>Profiles</strong>
              <p>Everyone's stats, watched films, ratings, and card collections are public. Click any name anywhere to see their profile.</p>
            </div>
          </div>
        </div>

        <div className="info-divider" />

        <details className="info-hidden">
          <summary>Hidden Features</summary>
          <ul>
            <li>Click the ceremony or "Canon film · YYYY" line to see every film from that year across categories</li>
            <li>Click "Winner / Speech" to watch the acceptance speech</li>
            <li>Tap the gold pips on any film to see which canon lists it's on</li>
            <li>Swipe left/right on film detail modals (mobile)</li>
            <li>Click anyone's name anywhere to view their profile</li>
            <li>Arrow keys navigate between films in modals</li>
            <li>Sync your journey with a friend's watch order</li>
            <li>Download your data from Settings</li>
          </ul>
        </details>

        <div className="info-footer">
          <p>The goal is simple: watch great films you'd never pick yourself, and have opinions about them.</p>
        </div>
      </div>
    </div>
  );
}
