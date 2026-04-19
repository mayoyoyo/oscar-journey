import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MOVIES } from '../data/movies';
import TierPips from './TierPips';
import { getAwardLink } from '../utils/awardLinks';
import CEREMONIES from '../data/oscar-ceremonies.json';

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Standard Academy order for the per-film nominations list (non-BP).
// BP is rendered in its own section above; Animated/International are
// Oscars Won leaders (when won), so they render ahead of everything else
// in the Wins list regardless of this ordering.
const ACADEMY_ORDER = [
  'Director',
  'Actor', 'Actress',
  'Supporting Actor', 'Supporting Actress',
  'Original Screenplay', 'Adapted Screenplay',
  'Animated Feature', 'International Feature', 'Documentary Feature',
  'Cinematography', 'Film Editing',
  'Production Design', 'Art Direction',
  'Costume Design', 'Makeup',
  'Sound', 'Sound Editing', 'Sound Mixing', 'Sound Effects Editing',
  'Original Score', 'Original Song',
  'Visual Effects',
];
const ORDER_IDX = Object.fromEntries(ACADEMY_ORDER.map((c, i) => [c, i]));
function academyOrderKey(category) {
  return ORDER_IDX[category] ?? 999;
}

// Migration-era fallback: derive a nominations-shaped array from the legacy
// awards/won/alsoWon/category fields. Used when movie.nominations hasn't
// been populated yet by the backfill pipeline. Loses nomination detail
// (losses) but preserves wins so at least the "Won" section renders.
function deriveLegacyNominations(movie) {
  const out = [];
  // category='BP' = Best Picture nominee (won or lost). See matching
  // comment in scripts/apply-nominations.mjs.
  if (movie.category === 'BP') {
    out.push({ category: 'Best Picture', won: !!movie.won });
  }
  for (const cat of (movie.alsoWon || [])) {
    const label = cat === 'INT' ? 'International Feature'
                : cat === 'ANIM' ? 'Animated Feature'
                : cat;
    out.push({ category: label, won: true });
  }
  if (movie.category === 'INT' && !movie.alsoWon?.includes('INT')) {
    out.push({ category: 'International Feature', won: true });
  }
  if (movie.category === 'ANIM' && !movie.alsoWon?.includes('ANIM')) {
    out.push({ category: 'Animated Feature', won: true });
  }
  for (const a of (movie.awards || [])) {
    out.push({ category: a.category, won: true, nominee: a.winner, detail: a.detail });
  }
  return out;
}

function getNominations(movie) {
  if (Array.isArray(movie?.nominations) && movie.nominations.length > 0) {
    return movie.nominations;
  }
  return deriveLegacyNominations(movie);
}

// True when we have authoritative nomination data (from the backfill
// script) — used to decide whether to show the total-nominations count
// in the ceremony line summary. Without it, the derived-from-wins
// fallback has no knowledge of losses and we'd mislead the user by
// printing "4 won / 4 nom" for a film that was actually nominated 12
// times. In that case we fall back to "4 won" alone.
function hasAuthoritativeNominations(movie) {
  return Array.isArray(movie?.nominations) && movie.nominations.length > 0;
}

// "Category — Person" or "Category — "Song Title"" display. The DLu
// dataset joins co-nominees with `|`; reformat to a human-readable list
// so readers see "Frank Galati, Lawrence Kasdan" instead of the raw
// pipe-delimited string.
function formatPeople(s) {
  if (!s) return s;
  const names = s.split('|').map(n => n.trim()).filter(Boolean);
  if (names.length === 0) return s;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
function formatLabel(n) {
  if (n.detail) return `${n.category} — "${n.detail}"`;
  if (n.nominee) return `${n.category} — ${formatPeople(n.nominee)}`;
  return n.category;
}

// Wins render as gold acceptance-speech pills (same visual as the former
// film-modal Oscars Won chips). For categories with known YouTube search
// patterns (Actor/Actress/Director/Song/etc.) the chip becomes a link.
function WinChip({ nomination, movie }) {
  const award = { category: nomination.category, winner: nomination.nominee, detail: nomination.detail };
  // BP win gets a curated query — the generic awardLinks rules key off
  // movie.awards which doesn't carry BP, so supply it directly.
  let link = null;
  if (nomination.category === 'Best Picture') {
    link = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year} best picture oscar acceptance`)}`;
  } else if (nomination.category === 'International Feature') {
    link = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year} best international feature acceptance`)}`;
  } else if (nomination.category === 'Animated Feature') {
    link = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year} best animated feature acceptance`)}`;
  } else {
    link = getAwardLink(award, movie);
  }
  const label = formatLabel(nomination);
  const content = (
    <>
      <span className="award-category">{label}</span>
      {link && <span className="award-link-icon">{"\u2197"}</span>}
    </>
  );
  return link ? (
    <a className="award-item award-item-link award-item-major"
      href={link} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >{content}</a>
  ) : (
    <div className="award-item award-item-major">{content}</div>
  );
}

function NomChip({ nomination }) {
  return <div className="award-item award-item-nomination">{formatLabel(nomination)}</div>;
}

// Wins list order: INT win first, then ANIM win, then standard Academy order.
function sortedWins(wins) {
  const bucket = (c) => c === 'International Feature' ? -2 : c === 'Animated Feature' ? -1 : academyOrderKey(c);
  return [...wins].sort((a, b) => bucket(a.category) - bucket(b.category));
}
function sortedLosses(losses) {
  return [...losses].sort((a, b) => academyOrderKey(a.category) - academyOrderKey(b.category));
}

export default function CeremonyTooltip({ ceremony, year, currentMovieId, onOpenDetail, movie }) {
  const [showModal, setShowModal] = useState(false);

  const nominations = movie ? getNominations(movie) : [];
  const winsCount = nominations.filter(n => n.won).length;
  const nomCount = nominations.length;
  const hasOscarContent = nomCount > 0;

  // Derive ceremony for ESSENTIAL-category films that still had Oscar
  // involvement (e.g. Fanny and Alexander won International Feature). The
  // ceremony index is year - 1927 from 1929 (2nd Academy Awards) onward.
  const derivedCeremony = (ceremony == null && hasOscarContent && year >= 1929)
    ? year - 1927
    : null;
  const effectiveCeremony = ceremony ?? derivedCeremony;

  if (effectiveCeremony == null) return null;

  // Split nominations into the three display buckets. BP nominations are
  // rendered inside the BP section (not in the Wins/Losses lists) to avoid
  // double-counting.
  const nonBP = nominations.filter(n => n.category !== 'Best Picture');
  const wins = sortedWins(nonBP.filter(n => n.won));
  const losses = sortedLosses(nonBP.filter(n => !n.won));
  const bpNominated = nominations.some(n => n.category === 'Best Picture');
  // When the film won Best Picture, BP is already surfaced in the BP
  // section above — so label the wins list as "Other" to make explicit
  // it excludes BP. For BP losers / non-BP films, plain "Oscars Won"
  // already unambiguously includes every win.
  const bpWon = nominations.some(n => n.category === 'Best Picture' && n.won);
  const winsHeading = bpWon ? `🏆 Other Oscars Won (${wins.length})` : `🏆 Oscars Won (${wins.length})`;

  // BP section content (only if current film was BP-nominated). Shows all
  // catalog BP films from this ceremony + any phantom nominees from
  // oscar-ceremonies.json (covers pre-1970 ceremonies where the full slate
  // isn't in the catalog).
  const catalogBP = bpNominated
    ? MOVIES.filter(m => m.ceremony === effectiveCeremony && m.category === 'BP')
    : [];
  const phantomBP = bpNominated
    ? (CEREMONIES[String(effectiveCeremony)]?.bpNominees || [])
        .filter(p => !catalogBP.some(c => c.id === p.id))
    : [];
  const bpRows = bpNominated ? [
    ...catalogBP.map(m => ({
      id: m.id, title: m.title, year: m.year, won: !!m.won,
      inCatalog: true, movie: m,
    })),
    ...phantomBP.map(p => ({
      id: p.id, title: p.title, year: p.year, won: !!p.won,
      inCatalog: false, movie: null,
    })),
  ].sort((a, b) => {
    if (a.won && !b.won) return -1;
    if (!a.won && b.won) return 1;
    return a.title.localeCompare(b.title);
  }) : [];

  // Same-year essentials bucket — unchanged from the previous modal. Gives
  // context for the year even if the current film wasn't BP-nominated.
  const essentials = MOVIES
    .filter(m => m.category === 'ESSENTIAL' && m.year === year && m.id !== movie?.id)
    .sort((a, b) => (b.tier || 0) - (a.tier || 0) || a.title.localeCompare(b.title));

  // Ceremony line summary. Format depends on data completeness:
  //   - Full nominations data   → "4 won / 12 nom" or "3 nom"
  //   - Legacy-derived only     → "4 won" (no total — we don't know it)
  //   - No Oscar content at all → no suffix
  const hasFullData = hasAuthoritativeNominations(movie);
  let summary = '';
  if (nomCount > 0) {
    if (hasFullData) {
      summary = winsCount > 0 ? ` · ${winsCount} won / ${nomCount} nom` : ` · ${nomCount} nom`;
    } else if (winsCount > 0) {
      summary = ` · ${winsCount} won`;
    }
  }
  const lineText = `${ordinal(effectiveCeremony)} Academy Awards${summary}`;

  return (
    <>
      <div className={`ceremony-line ceremony-line-clickable${winsCount > 0 ? ' ceremony-line-winner' : ''}`}
        onClick={() => setShowModal(true)}
      >
        {lineText}
      </div>

      {showModal && createPortal(
        <div className="modal-overlay open"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="modal ceremony-modal" onClick={(e) => e.stopPropagation()}>
            <button className="film-detail-close" onClick={(e) => { e.stopPropagation(); setShowModal(false); }}>✕</button>
            <h2 className="ceremony-modal-title">
              {ordinal(effectiveCeremony)} Academy Awards
            </h2>
            <p className="ceremony-modal-year">Honoring films of {year}</p>

            {/* 1. Best Picture section — shown only when the current film
                itself was BP-nominated. For pre-1970 ceremonies the catalog
                may not have the full slate; missing nominees render as
                dimmed, non-clickable rows via the `inCatalog === false`
                branch. */}
            {bpNominated && bpRows.length > 0 && (
              <div className="ceremony-modal-section">
                <h3 className="ceremony-modal-category">Best Picture</h3>
                {bpRows.map((row) => {
                  const isCurrent = row.id === currentMovieId;
                  const className = `ceremony-modal-film${isCurrent ? ' is-current' : ''}${!row.inCatalog ? ' is-phantom' : ''}`;
                  const rowContent = (
                    <>
                      <span className="ceremony-modal-film-title">
                        {row.won && <span className="ceremony-modal-trophy">🏆</span>}
                        {row.title}
                      </span>
                    </>
                  );
                  return row.inCatalog ? (
                    <div key={row.id || row.title}
                      className={className}
                      onClick={() => {
                        if (onOpenDetail && row.movie) {
                          setShowModal(false);
                          onOpenDetail(row.movie);
                        }
                      }}
                    >
                      {rowContent}
                    </div>
                  ) : (
                    <div key={row.id || row.title} className={className}>
                      {rowContent}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Oscars Won — non-BP wins for the current film, with the
                same gold acceptance-speech pills the film modal used to
                render. INT/ANIM wins are pulled to the front so they read
                as the "big" wins before tech categories. */}
            {wins.length > 0 && (
              <div className="ceremony-modal-section">
                <h3 className="ceremony-modal-category">{winsHeading}</h3>
                <div className="ceremony-modal-awards-list">
                  {wins.map((n, i) => (
                    <WinChip key={`w-${i}`} nomination={n} movie={movie} />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Also Nominated For — non-BP losses, plain chips. The
                user's call is that the winner of each lost category isn't
                surfaced; only Best Picture gets the full-slate treatment.
                The label skips the word "losing" — "Also Nominated For"
                reads as an achievement, not a ding. */}
            {losses.length > 0 && (
              <div className="ceremony-modal-section">
                <h3 className="ceremony-modal-category">{((bpNominated && bpRows.length > 0) || wins.length > 0) ? 'Also Nominated For' : 'Nominated For'} ({losses.length})</h3>
                <div className="ceremony-modal-awards-list">
                  {losses.map((n, i) => (
                    <NomChip key={`n-${i}`} nomination={n} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Year essentials — canon films from the same year, always
                shown at the bottom. Gives non-Oscar context (e.g. Once Upon
                a Time in Hollywood next to a 2019 Oscar film). */}
            {essentials.length > 0 && (
              <div className="ceremony-modal-section">
                <h3 className="ceremony-modal-category">{year} Essentials (non-Oscar canon)</h3>
                {essentials.map(m => (
                  <div key={m.id}
                    className={`ceremony-modal-film${m.id === currentMovieId ? ' is-current' : ''}`}
                    onClick={() => {
                      if (onOpenDetail) {
                        setShowModal(false);
                        onOpenDetail(m);
                      }
                    }}
                  >
                    <span className="ceremony-modal-film-title">{m.title}</span>
                    <TierPips movie={m} variant="compact" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
