import React, { useState, useEffect } from 'react';
import { MOVIES_BY_ID } from '../data/movies';
import { RARITIES, getNearMiss } from '../utils/cards';
import { fetchOmdbData } from '../utils/omdb';

function CardBackDesign() {
  return (
    <div className="pack-card-back">
      <div className="pack-card-back-pattern" />
      <div className="pack-card-back-inner">
        <div className="pack-card-back-star">★</div>
        <div className="pack-card-back-brand">THE OSCARS</div>
        <div className="pack-card-back-sub">JOURNEY</div>
        <div className="pack-card-back-star pack-card-back-star-bottom">★</div>
      </div>
    </div>
  );
}

function MiniCard({ card, onClick, label, animClass }) {
  const [poster, setPoster] = useState(null);
  const movie = MOVIES_BY_ID[card.movieId];
  const rarity = RARITIES[card.rarity];

  useEffect(() => {
    if (movie) {
      fetchOmdbData(movie).then(data => {
        if (data?.poster) setPoster(data.poster);
      });
    }
  }, [movie?.id]);

  if (!movie) return null;

  return (
    <div
      className={`pack-swap-card ${animClass || ''}`}
      style={{ '--rarity-border': rarity.border, '--rarity-glow': rarity.glow }}
      onClick={onClick}
    >
      {poster ? (
        <img className="pack-swap-poster" src={poster} alt={movie.title} />
      ) : (
        <div className="pack-swap-poster pack-swap-no-poster">🎬</div>
      )}
      <div className="pack-swap-info">
        <div className="pack-swap-title">{movie.title}</div>
        <div className="pack-swap-rarity" style={{ color: rarity.color }}>{rarity.name}</div>
      </div>
      {label && <div className="pack-swap-label">{label}</div>}
    </div>
  );
}

export default function PackOpening({ cards, wallet, onClose, onKeep, onReplace, onSaveShowcase, currentShowcase, maxWallet = 3 }) {
  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [phase, setPhase] = useState('reveal'); // 'reveal' | 'keep' | 'replace' | 'done'
  const [swapping, setSwapping] = useState(null);
  const [finalWallet, setFinalWallet] = useState(wallet);

  const card = cards[0];
  const [nearMiss] = useState(() => getNearMiss(card.rarity));
  const movie = MOVIES_BY_ID[card.movieId];
  const rarity = RARITIES[card.rarity];
  const walletFull = wallet.length >= maxWallet;

  const handleReveal = () => {
    if (revealed || shaking) return;
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setRevealed(true);
      // Show keep/replace options after reveal
      setTimeout(() => setPhase('keep'), 800);
    }, 900);
  };

  const handleKeep = () => {
    if (walletFull) return;
    const newWallet = [...wallet, card];
    onKeep(card);
    setFinalWallet(newWallet);
    setPhase('done');
  };

  const handleSwap = (replaceIdx) => {
    setSwapping(replaceIdx);
    setTimeout(() => {
      onReplace(card, replaceIdx);
      const newWallet = [...wallet];
      newWallet[replaceIdx] = card;
      setFinalWallet(newWallet);
      setSwapping(null);
      setPhase('done');
    }, 1200);
  };

  return (
    <div className="pack-overlay" onClick={(e) => {
      // Only allow clicking away during reveal or done phases
      if (e.target === e.currentTarget && phase !== 'replace') onClose();
    }}>
      <div className="pack-modal">
        {phase === 'reveal' && (
          <>
            <h2 className="pack-title">New Card!</h2>
            <p className="pack-subtitle">Tap to reveal</p>
          </>
        )}
        {phase === 'keep' && (
          <>
            <h2 className="pack-title">
              {movie?.title}
            </h2>
            <p className="pack-subtitle" style={{ color: rarity.color }}>{rarity.name}</p>
            {nearMiss && <p className="pack-near-miss">{nearMiss}</p>}
          </>
        )}
        {phase === 'replace' && (
          <>
            <h2 className="pack-title">Swap a Card</h2>
            <p className="pack-subtitle">Tap a card in your wallet to replace it</p>
          </>
        )}
        {phase === 'done' && (
          <>
            <h2 className="pack-title">Card Added!</h2>
            <p className="pack-subtitle">{movie?.title} is now in your wallet</p>
          </>
        )}

        {/* Card reveal */}
        {(phase === 'reveal' || phase === 'keep') && (
          <div className="pack-cards-row">
            <div
              className={`pack-card ${shaking ? 'pack-card-shaking' : ''} ${revealed ? 'pack-card-revealed' : ''}`}
              style={{ '--rarity-color': rarity.color, '--rarity-glow': rarity.glow, '--rarity-border': rarity.border }}
              onClick={() => {
                if (phase === 'keep') {
                  if (walletFull) setPhase('replace');
                  else handleKeep();
                } else {
                  handleReveal();
                }
              }}
            >
              {!revealed ? (
                <div className={shaking ? 'pack-card-back-glow' : ''}>
                  <CardBackDesign />
                </div>
              ) : (
                <div className={`pack-card-front ${card.rarity === 'LEGENDARY' ? 'pack-card-legendary-front' : ''} ${card.rarity === 'EPIC' ? 'pack-card-epic-front' : ''}`}>
                  <div className="pack-card-shine" />
                  <div className="pack-card-rarity-stripe" style={{ background: rarity.color }} />
                  <PosterImg movie={movie} />
                  <div className="pack-card-info">
                    <div className="pack-card-title">{movie?.title}</div>
                    <div className="pack-card-year">{movie?.year}</div>
                    <div className="pack-card-rarity" style={{ color: rarity.color }}>{rarity.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keep or replace buttons */}
        {phase === 'keep' && (
          <div className="pack-actions">
            {!walletFull ? (
              <button className="pack-close-btn" onClick={handleKeep}>
                Add to Wallet ({wallet.length}/{maxWallet})
              </button>
            ) : (
              <button className="pack-close-btn" onClick={() => setPhase('replace')}>
                Swap into Wallet (Full)
              </button>
            )}
            <button className="pack-discard-btn" onClick={onClose}>Discard</button>
          </div>
        )}

        {/* Replace screen */}
        {phase === 'replace' && (
          <div className="pack-swap-section">
            <div className={`pack-swap-incoming ${swapping !== null ? 'pack-swap-dropping' : ''}`}>
              <MiniCard card={card} label="NEW" />
              {swapping === null && (
                <button className="pack-swap-discard-x" onClick={() => onClose()} title="Discard">✕</button>
              )}
            </div>
            <div className="pack-swap-arrow">⇅</div>
            <div className="pack-done-wallet-label">Your Wallet ({wallet.length}/{maxWallet})</div>
            <div className="pack-swap-wallet">
              {wallet.map((existingCard, i) => (
                <MiniCard
                  key={i}
                  card={existingCard}
                  onClick={() => { if (swapping === null) handleSwap(i); }}
                  animClass={swapping === i ? 'pack-swap-out' : ''}
                />
              ))}
            </div>
            <button className="pack-discard-btn" style={{ marginTop: '16px' }} onClick={() => setPhase('keep')}>
              Cancel
            </button>
          </div>
        )}

        {/* Done — show wallet, tap to feature */}
        {phase === 'done' && (
          <>
            <div className="pack-done-wallet">
              <div className="pack-done-wallet-label">Your Wallet ({finalWallet.length}/{maxWallet})</div>
              <p className="pack-done-hint">Tap a card to feature it on your profile</p>
              <div className="pack-swap-wallet">
                {finalWallet.map((wCard, i) => {
                  const isFeatured = currentShowcase?.some(s => s.movieId === wCard.movieId);
                  return (
                    <div key={i} style={{ position: 'relative' }}>
                      <MiniCard
                        card={wCard}
                        onClick={() => {
                          if (isFeatured) {
                            onSaveShowcase([]);
                          } else {
                            onSaveShowcase([wCard]);
                          }
                        }}
                        animClass={isFeatured ? 'pack-swap-featured' : ''}
                      />
                      {isFeatured && <div className="pack-featured-badge">Featured</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pack-actions">
              <button className="pack-close-btn" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PosterImg({ movie }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    if (movie) {
      fetchOmdbData(movie).then(data => {
        if (data?.poster) setPoster(data.poster);
      });
    }
  }, [movie?.id]);

  if (poster) return <img className="pack-card-poster" src={poster} alt={movie?.title} />;
  return <div className="pack-card-poster pack-card-no-poster">🎬</div>;
}
