import React from 'react';
import { GENRE_LABELS } from '../data/movies';
import TierPips from './TierPips';
import OscarIcon, { getOscarStatus, getOscarBadges } from './OscarIcon';
import LanguagePill from './LanguagePill';

function speechUrl(title, year, kind = 'best picture') {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + year + ' oscar acceptance speech ' + kind)}`;
}

// Full-size winner pill. `kind` drives both the label and the color scheme:
//   'bp'   (default) → gold  "Winner · Speech"
//   'int'            → blue  "Intl Winner · Speech"
//   'anim'           → purple "Anim Winner · Speech"
// Replaces the old standalone BadgeInt / BadgeAnim chips — the winner pill
// carries both the category and the speech link, cleaner than two pills.
export function BadgeWinner({ movie, kind = 'bp' }) {
  const meta = {
    bp:   { label: 'Winner · Speech',      query: 'best picture',              cls: 'badge-winner-bp' },
    int:  { label: 'Intl Winner · Speech', query: 'best international feature',cls: 'badge-winner-int' },
    anim: { label: 'Anim Winner · Speech', query: 'best animated feature',     cls: 'badge-winner-anim' },
  }[kind] || { label: 'Winner · Speech', query: 'best picture', cls: 'badge-winner-bp' };
  if (movie) {
    return (
      <a className={`badge-winner badge-winner-link ${meta.cls}`}
        href={speechUrl(movie.title, movie.year, meta.query)}
        target="_blank" rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Watch acceptance speech"
      >
        🏆 {meta.label} ↗
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
        {getOscarBadges(movie).map(k => (
          <OscarIcon key={k} movie={movie} kind={k} size="sm" />
        ))}
      </span>
    );
  }

  // Colored INT/ANIM winner pills have been replaced by blue/purple tinted
  // statuettes in the ceremony-row above the title. Only the gold BP winner
  // pill stays here — BP is the primary Oscar and the speech link deserves
  // a full chip, not just an icon.
  const wonBP = movie.won === true && movie.category === 'BP';
  return (
    <div className="badges">
      {wonBP && <BadgeWinner movie={movie} kind="bp" />}
      <LanguagePill movie={movie} />
      <BadgeGenre genre={movie.genre} />
    </div>
  );
}
