import React from 'react';
import { GENRE_LABELS } from '../data/movies';
import TierPips from './TierPips';
import OscarIcon, { getOscarStatus, getOscarBadges } from './OscarIcon';
import LanguagePill from './LanguagePill';
import { isAnimated, isDocumentary, isSilent, isBlackAndWhite } from '../utils/filmAttributes';

// Category pill definitions. International is intentionally absent —
// the LanguagePill's flag already conveys that signal. A film can carry
// multiple pills (City Lights is Silent + B&W; Shoah is Doc + non-English).
// The Animated pill renders even when the Anim-Winner speech pill is
// present — winner and category convey different facts (ceremony result
// vs. film attribute), so we don't dedupe across them.
const CATEGORY_LIST = [
  { key: 'DOC',    label: 'Documentary', test: isDocumentary,   cls: 'badge-cat-doc' },
  { key: 'SILENT', label: 'Silent',      test: isSilent,         cls: 'badge-cat-silent' },
  { key: 'BW',     label: 'B&W',         test: isBlackAndWhite,  cls: 'badge-cat-bw' },
  { key: 'ANIM',   label: 'Animated',    test: isAnimated,       cls: 'badge-cat-anim' },
];

function activeCategories(movie) {
  return CATEGORY_LIST.filter(c => c.test(movie));
}

export function BadgeCategorySm({ movie }) {
  const active = activeCategories(movie);
  if (!active.length) return null;
  return active.map(c => (
    <span key={c.key} className={`badge-category-sm ${c.cls}`}>{c.label}</span>
  ));
}

export function BadgeCategory({ movie }) {
  const active = activeCategories(movie);
  if (!active.length) return null;
  return active.map(c => (
    <span key={c.key} className={`badge-category ${c.cls}`}>{c.label}</span>
  ));
}

function speechUrl(title, year, kind = 'best picture') {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + year + ' oscar acceptance speech ' + kind)}`;
}

// Full-size winner pill. `kind` drives both the label and the color scheme:
//   'bp'   (default) → gold  "Winner"
//   'int'            → blue  "Intl Winner"
//   'anim'           → purple "Anim Winner"
// Replaces the old standalone BadgeInt / BadgeAnim chips — the winner pill
// carries both the category and the speech link (via tooltip + ↗ icon).
export function BadgeWinner({ movie, kind = 'bp' }) {
  const meta = {
    bp:   { label: 'Winner',      query: 'best picture',              cls: 'badge-winner-bp' },
    int:  { label: 'Intl Winner', query: 'best international feature',cls: 'badge-winner-int' },
    anim: { label: 'Anim Winner', query: 'best animated feature',     cls: 'badge-winner-anim' },
  }[kind] || { label: 'Winner', query: 'best picture', cls: 'badge-winner-bp' };
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

export function BadgeGenreAlt({ genre }) {
  return <span className="badge-genre badge-genre-alt">{GENRE_LABELS[genre] || genre}</span>;
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
//
// Genre is no longer rendered in the A-Z list row (the small variant shows
// category pills — Doc/Silent/B&W/Animated — which carry more signal than
// the broad genre grouping). Genre still renders in the non-small variant
// alongside winner + category pills.
export function MovieBadges({ movie, small = false, excludeOscars = false }) {
  const alsoWon = movie.alsoWon || [];
  const oscarStatus = getOscarStatus(movie);

  if (small) {
    // A-Z list row: genre + category pills + tier pips (+ Oscar statuettes
    // unless excludeOscars — used by Option A layout where statuettes live
    // in a dedicated left column). The language flag moved out of this
    // row and now sits inline with the Oscar statuette via LanguageFlag.
    return (
      <span style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'nowrap' }}>
        <BadgeGenreSm genre={movie.genre} />
        <BadgeCategorySm movie={movie} />
        <TierPips movie={movie} variant="compact" />
        {!excludeOscars && getOscarBadges(movie).map(k => (
          <OscarIcon key={k} movie={movie} kind={k} size="sm" />
        ))}
      </span>
    );
  }

  // Modal / card row: winner speech pill(s) + category pill(s) + genre.
  // LanguagePill lives next to the film title (FilmDetailModal) rather
  // than in this badges row.
  const wonBP   = movie.won === true && movie.category === 'BP';
  const wonINT  = movie.category === 'INT' || alsoWon.includes('INT');
  const wonANIM = movie.category === 'ANIM' || alsoWon.includes('ANIM');
  const hasWinnerPill = wonBP || wonINT || wonANIM;
  const categoryPills = activeCategories(movie);
  const altGenres = movie.altGenres || [];
  if (!hasWinnerPill && !categoryPills.length && !movie.genre) return null;
  // Two-row layout for modal / card:
  //   Row 1 — winner speech pill(s) alone (only when the film won something).
  //   Row 2 — language → category pills → primary genre → altGenres.
  // altGenres render with reduced visual weight (see .badge-genre-alt) so the
  // primary still leads the descriptor row.
  return (
    <>
      {hasWinnerPill && (
        <div className="badges badges-winners">
          {wonBP   && <BadgeWinner movie={movie} kind="bp"   />}
          {wonINT  && <BadgeWinner movie={movie} kind="int"  />}
          {wonANIM && <BadgeWinner movie={movie} kind="anim" />}
        </div>
      )}
      <div className="badges">
        <LanguagePill movie={movie} />
        {categoryPills.map(c => (
          <span key={c.key} className={`badge-category ${c.cls}`}>{c.label}</span>
        ))}
        {movie.genre && <BadgeGenre genre={movie.genre} />}
        {altGenres.map(g => <BadgeGenreAlt key={g} genre={g} />)}
      </div>
    </>
  );
}
