import React from 'react';
import { MOVIES } from '../data/movies';

export default function InfoModal({ onClose }) {
  const bpCount = MOVIES.filter(m => m.category === 'BP').length;
  const intCount = MOVIES.filter(m => m.category === 'INT').length;
  const animCount = MOVIES.filter(m => m.category === 'ANIM').length;

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal" style={{ maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>🏆 What is Oscar Journey?</h2>

        <div className="info-section">
          <h3>The Problem</h3>
          <p>You spend 45 minutes scrolling Netflix, pick nothing, and rewatch The Office. Meanwhile, decades of incredible cinema sit unwatched. Sound familiar?</p>
        </div>

        <div className="info-section">
          <h3>The Solution</h3>
          <p>We took <strong>{MOVIES.length} Oscar-nominated films</strong> — {bpCount} Best Picture nominees, {intCount} International Feature winners, and {animCount} Animated Feature winners — from 1970 to 2025 and shuffled them into a randomized journey for you.</p>
          <p>The order mixes genres, decades, and categories so you never watch two similar films back-to-back. No more choosing. Just press play.</p>
        </div>

        <div className="info-section">
          <h3>How It Works</h3>
          <ul className="info-list">
            <li><strong>🎬 Journey</strong> — Your randomized film queue. Watch, rate, move on. The skip button exists but we judge you for using it.</li>
            <li><strong>📋 Films</strong> — Browse all {MOVIES.length} films alphabetically. Search, filter, click into any film for details.</li>
            <li><strong>⚔️ Battle</strong> — Pick the better film between two you've watched. Every vote updates an ELO ranking (like chess ratings). See how your taste compares globally.</li>
            <li><strong>👥 Profiles</strong> — See what everyone's watching, their ratings, stats, and progress. Follow someone's journey to watch in the same order.</li>
          </ul>
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul className="info-list">
            <li><strong>Star ratings</strong> — Rate every film out of 10 (half-stars allowed). Add multiple raters if you watch with someone.</li>
            <li><strong>Sync journeys</strong> — Follow a friend's exact film order so you can watch together and compare notes.</li>
            <li><strong>Filters</strong> — Only want winners? Skip films you've seen? Filter by era, genre, or category.</li>
            <li><strong>Works everywhere</strong> — Phone, tablet, desktop. Your data syncs across all devices.</li>
          </ul>
        </div>

        <div className="info-section" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--cream-dim)', fontSize: '0.88rem' }}>
          <p>The goal is simple: watch great films you'd never pick yourself, and have opinions about them. That's it. That's the whole app.</p>
        </div>

        <div className="modal-btns">
          <button className="btn-primary" onClick={onClose} style={{ width: '100%', borderRadius: '50px' }}>Got it</button>
        </div>
      </div>
    </div>
  );
}
