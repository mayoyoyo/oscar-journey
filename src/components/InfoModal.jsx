import React from 'react';
import { MOVIES } from '../data/movies';

export default function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal" style={{ maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>What is The Oscars Journey?</h2>

        <div className="info-section">
          <h3>The Problem</h3>
          <p>You spend 45 minutes scrolling Netflix, pick nothing, and rewatch The Office. Meanwhile, decades of incredible cinema sit unwatched. Sound familiar?</p>
        </div>

        <div className="info-section">
          <h3>The Solution</h3>
          <p>We took <strong>{MOVIES.length} Oscar-nominated films</strong> from 1970 to 2025 and shuffled them into a randomized journey. The order mixes genres, decades, and categories so you never watch two similar films back-to-back. No more choosing. Just press play.</p>
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul className="info-list">
            <li><strong>Journey</strong> — Your randomized film queue. Watch, rate, move on. Genre-balanced so you never get two dramas in a row. Skip exists (with shame). Sync with a friend to watch in the same order. Smart filters let you show only winners, unwatched, or specific eras.</li>
            <li><strong>Films</strong> — Browse all {MOVIES.length} films A-Z. Search by title, quick-toggle watched, and click any film for details including poster, plot, IMDb rating, director, runtime, and Oscar awards won.</li>
            <li><strong>Battle</strong> — Head-to-head voting between films you've watched. Every vote updates ELO rankings (global + personal). Smart matchmaking keeps it interesting. Unlocks after 10 films. Card drops happen randomly after voting.</li>
            <li><strong>Profiles</strong> — See everyone's progress, watched tiles, ratings, and battle stats. Click any name to view their profile. Co-rater support for watching with a partner.</li>
            <li><strong>Daily Oscar</strong> — A daily quote guessing game. Guess which film the quote is from.</li>
            <li><strong>Cards</strong> — Collectible cards earned from battles. Different rarities to collect.</li>
          </ul>
        </div>

        <div className="info-section">
          <h3>Hidden Features</h3>
          <ul className="info-list">
            <li>Click the ceremony text (e.g., "67TH ACADEMY AWARDS") to see all nominees from that year</li>
            <li>Click the "Winner / Speech" badge to watch the acceptance speech on YouTube</li>
            <li>Click the Trailer button to find the trailer</li>
            <li>Click "Where to Watch" to find streaming availability via JustWatch</li>
            <li>Click anyone's name to view their profile</li>
            <li>Click your avatar emoji to quickly change it</li>
            <li>Arrow keys navigate between films in the Films tab modal</li>
            <li>Award details shown for every film that won Oscars</li>
            <li>Sync your journey with a friend to watch in the same order</li>
            <li>Battle card drops happen randomly after voting</li>
            <li>Download your data as backup from Settings</li>
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
