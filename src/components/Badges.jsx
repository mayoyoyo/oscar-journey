import React from 'react';
import { GENRE_LABELS } from '../data/movies';
import TierPips from './TierPips';
import OscarIcon, { getOscarStatus } from './OscarIcon';
import LanguagePill from './LanguagePill';

function speechUrl(title, year) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + year + ' oscar acceptance speech best picture')}`;
}

// Full-size badges for film cards and detail modal
export function BadgeWinner({ movie }) {
  if (movie) {
    return (
      <a className="badge-winner badge-winner-link"
        href={speechUrl(movie.title, movie.year)}
        target="_blank" rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Watch acceptance speech"
      >
        🏆 Winner · Speech ↗
      </a>
    );
  }
  return <span className="badge-winner">★ Winner</span>;
}

export function BadgeGenre({ genre }) {
  return <span className="badge-genre">{GENRE_LABELS[genre] || genre}</span>;
}

export function BadgeInt() {
  return <span className="badge-int">🌍 International Feature</span>;
}

export function BadgeAnim() {
  return <span className="badge-anim">🎨 Animated Feature</span>;
}

export function BadgeEssential() {
  return <span className="badge-essential">✦ Essential</span>;
}

export function BadgeEssentialSm() {
  return <span className="badge-essential-sm">✦ Essential</span>;
}

// Small badges for A-Z list rows
export function BadgeWinnerSm() {
  return <span className="badge-winner-sm">★ Winner</span>;
}

export function BadgeGenreSm({ genre }) {
  return <span className="badge-genre-sm">{GENRE_LABELS[genre] || genre}</span>;
}

export function BadgeIntSm() {
  return <span className="badge-int-sm">🌍 International</span>;
}

export function BadgeAnimSm() {
  return <span className="badge-anim-sm">🎨 Animated</span>;
}

export function BadgeBpSm() {
  return <span className="badge-bp-sm">Best Picture</span>;
}

// Renders the full set of badges for a movie.
//
// As of the Oscar-icon redesign: "Essential" is no longer a text tag. The Oscar
// statuette icon (gold=winner, gray=nominee, none=essential/canon-only) carries
// the Oscars-vs-Essentials demarcation; absence of an icon implies canon-only.
// Tier pips sit inline so every A-Z row stays on a single line.
export function MovieBadges({ movie, small = false }) {
  const alsoWon = movie.alsoWon || [];
  const oscarStatus = getOscarStatus(movie);

  if (small) {
    // Desktop row: genre + INT/ANIM + language + pips + Oscar icon.
    // Mobile strips the TEXT chips via the @media rule in App.css so rows
    // stay single-line; the language pill collapses to flag-only. BP /
    // Winner / Essential chips are intentionally NOT rendered — the Oscar
    // icon (gold / silver / absent) carries all of that.
    return (
      <span style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'nowrap' }}>
        <BadgeGenreSm genre={movie.genre} />
        {movie.category === 'INT' && <BadgeIntSm />}
        {movie.category === 'ANIM' && <BadgeAnimSm />}
        {alsoWon.includes('INT') && <BadgeIntSm />}
        {alsoWon.includes('ANIM') && <BadgeAnimSm />}
        <LanguagePill movie={movie} />
        <TierPips movie={movie} variant="compact" />
        <OscarIcon movie={movie} size="sm" />
      </span>
    );
  }

  return (
    <div className="badges">
      {oscarStatus === 'winner' && movie.category === 'BP' && <BadgeWinner movie={movie} />}
      <BadgeGenre genre={movie.genre} />
      {movie.category === 'INT' && <BadgeInt />}
      {movie.category === 'ANIM' && <BadgeAnim />}
      {alsoWon.includes('INT') && <BadgeInt />}
      {alsoWon.includes('ANIM') && <BadgeAnim />}
      <TierPips movie={movie} variant="full" />
    </div>
  );
}
