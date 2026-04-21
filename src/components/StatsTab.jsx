import React, { useMemo, useState } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import { getTierInfo, MAX_TIER, TIER_LABELS, tierScore, normalizeCanonScore, CANON_SCORE_MAX } from '../utils/tierInfo';
import TierPips from './TierPips';
import ExpandableCaption from './ExpandableCaption';

export default function StatsTab({ watchedTitleSet, ratings, raters, embedded, profileName, onNavigateToTier }) {
  const [genreSort, setGenreSort] = useState({ key: 'genre', dir: 'asc' });
  const stats = useMemo(() => {
    const totalFilms = MOVIES.length;
    const watchedCount = MOVIES.filter(m => watchedTitleSet.has(m.id)).length;

    // Per-rater stats
    const perRater = {};
    for (const name of raters) {
      perRater[name] = { ratings: [], avg: null, top5: [] };
    }

    // Collect all-rated films (where every rater has rated)
    const allRated = [];

    for (const m of MOVIES) {
      const key = ratingKey(m);
      const r = ratings[key];
      if (!r) continue;

      const allHaveRated = raters.every(name => r[name] != null);

      for (const name of raters) {
        if (r[name] != null) {
          perRater[name].ratings.push({ movie: m, rating: r[name] });
        }
      }

      if (allHaveRated && raters.length >= 2) {
        const vals = raters.map(name => r[name]);
        const maxDiff = Math.max(...vals) - Math.min(...vals);
        allRated.push({ movie: m, ratings: { ...r }, diff: maxDiff });
      }
    }

    // Compute averages and top 5 per rater
    for (const name of raters) {
      const rr = perRater[name].ratings;
      perRater[name].avg = rr.length > 0
        ? (rr.reduce((s, r) => s + r.rating, 0) / rr.length).toFixed(1)
        : null;
      perRater[name].top5 = [...rr].sort((a, b) => b.rating - a.rating).slice(0, 5);
    }

    // Agreement (all raters within 1.0 of each other)
    const agreeCount = allRated.filter(r => r.diff <= 1.0).length;
    const agreePct = allRated.length > 0 ? Math.round((agreeCount / allRated.length) * 100) : null;

    // Biggest disagreements
    const biggestDisagreements = [...allRated].sort((a, b) => b.diff - a.diff).slice(0, 5);

    // Ratings by genre
    const genreStats = {};
    for (const code of Object.keys(GENRE_LABELS)) {
      const genreFilms = MOVIES.filter(m => m.genre === code);
      const perRaterGenre = {};
      for (const name of raters) {
        let total = 0, count = 0;
        for (const m of genreFilms) {
          const r = ratings[ratingKey(m)];
          if (r?.[name] != null) { total += r[name]; count++; }
        }
        perRaterGenre[name] = count > 0 ? { avg: (total / count).toFixed(1), count } : null;
      }
      const anyRated = raters.some(name => perRaterGenre[name]);
      if (anyRated) {
        genreStats[code] = { label: GENRE_LABELS[code], perRater: perRaterGenre };
      }
    }

    // Progress by decade — last bucket auto-extends to the current year so
    // a new ceremony year never silently falls outside the table.
    const currentYear = new Date().getFullYear();
    const decades = [];
    for (let d = 1910; d <= currentYear; d += 10) {
      const max = Math.min(d + 9, currentYear);
      const label = max === d + 9 ? `${d}-${d + 9}` : `${d}-${max}`;
      decades.push({ label, min: d, max });
    }
    const visibleDecades = decades.filter(d => MOVIES.some(m => m.year >= d.min && m.year <= d.max));
    const decadeProgress = visibleDecades.map(d => {
      const total = MOVIES.filter(m => m.year >= d.min && m.year <= d.max).length;
      const watched = MOVIES.filter(m => m.year >= d.min && m.year <= d.max && watchedTitleSet.has(m.id)).length;
      return { ...d, total, watched };
    });

    // Progress by category.
    //
    // For INT and ANIM we count both primary-category films AND BP-nominee
    // films whose `alsoWon` includes that award — e.g. Parasite is
    // category:'BP' with alsoWon:['INT'], so it counts toward the
    // International Feature tally. Without this, the row reads "0/38" for
    // a user who has watched Parasite + Amour + Crouching Tiger, which is
    // confusing — those films DID win Best International Feature.
    //
    // BP and ESSENTIAL are primary-category-only: no non-BP film alsoWon BP,
    // and essentials aren't layered on other categories.
    const categories = [
      { label: 'Best Picture', cat: 'BP', matchAlsoWon: false },
      { label: 'International Feature', cat: 'INT', matchAlsoWon: true },
      { label: 'Animated Feature', cat: 'ANIM', matchAlsoWon: true },
      { label: 'Essential (non-Oscar)', cat: 'ESSENTIAL', matchAlsoWon: false },
    ];
    const categoryProgress = categories.map(c => {
      const matches = m =>
        m.category === c.cat ||
        (c.matchAlsoWon && (m.alsoWon || []).includes(c.cat));
      const total = MOVIES.filter(matches).length;
      const watched = MOVIES.filter(m => matches(m) && watchedTitleSet.has(m.id)).length;
      return { ...c, total, watched };
    });

    // ---- Canon score + per-tier breakdown ----
    // Every film gets a tier 0–8. Score = sum of tier for each watched film.
    // "Iron-clad" canon (tier 5+) matters most — reward watching them.
    const tierBreakdown = {};
    for (let t = 1; t <= MAX_TIER; t++) {
      tierBreakdown[t] = { total: 0, watched: 0 };
    }
    let canonScore = 0;
    let canonScoreMax = 0;
    const unwatchedByTier = {};

    for (const m of MOVIES) {
      const { tier } = getTierInfo(m);
      if (tier === 0) continue;
      const weight = tierScore(tier);
      canonScoreMax += weight;
      tierBreakdown[tier].total++;
      if (watchedTitleSet.has(m.id)) {
        canonScore += weight;
        tierBreakdown[tier].watched++;
      } else {
        if (!unwatchedByTier[tier]) unwatchedByTier[tier] = [];
        unwatchedByTier[tier].push(m);
      }
    }

    // Top 6 recommendations: highest-tier unwatched films, preferring recent/accessible
    const nextUp = [];
    for (let t = MAX_TIER; t >= 1 && nextUp.length < 6; t--) {
      const pool = unwatchedByTier[t] || [];
      for (const m of pool) {
        if (nextUp.length >= 6) break;
        nextUp.push(m);
      }
    }

    return {
      totalFilms, watchedCount, perRater, agreePct, allRated,
      biggestDisagreements, genreStats, decadeProgress, categoryProgress,
      canonScore: normalizeCanonScore(canonScore, canonScoreMax),
      canonScoreMax: CANON_SCORE_MAX,
      tierBreakdown, nextUp,
    };
  }, [watchedTitleSet, ratings, raters]);

  return (
    <div className={embedded ? '' : 'film-list-section'}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: '20px', fontSize: '1.1rem' }}>
        {profileName ? `${profileName}'s Statistics` : 'Statistics'}
      </h2>

      {/* Summary cards — Films Watched + per-rater averages moved to the
          profile header cards. Keep Agreement here since it's a
          multi-rater-only stat that doesn't fit the per-profile header. */}
      {raters.length >= 2 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-value">
              {stats.agreePct !== null ? `${stats.agreePct}%` : '—'}
            </div>
            <div className="stat-card-label">
              Agreement{stats.allRated.length > 0 ? ` (${stats.allRated.length} films)` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Canon Score — weighted by tier */}
      <div className="stats-section canon-score-section">
        <h3>Canon Score</h3>
        <div className="canon-score-header">
          <div className="canon-score-big">
            <span className="canon-score-num">{stats.canonScore}</span>
            <span className="canon-score-denom"> / {stats.canonScoreMax}</span>
          </div>
          <div className="canon-score-bar">
            <div
              className="canon-score-fill"
              style={{ width: `${stats.canonScoreMax > 0 ? (stats.canonScore / stats.canonScoreMax) * 100 : 0}%` }}
            />
          </div>
          <ExpandableCaption className="canon-score-caption">
            Score is calculated via a proprietary tier-weighted ratio that rewards higher-tier films progressively more than lower-tier ones.
          </ExpandableCaption>
        </div>

        <table className="stats-table canon-tier-table">
          <thead>
            <tr><th>Tier</th><th>Watched</th><th>Total</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_TIER }, (_, i) => MAX_TIER - i).map(t => {
              const row = stats.tierBreakdown[t];
              if (!row || row.total === 0) return null;
              // Rows become clickable when onNavigateToTier is wired up —
              // drops the user on the Films tab with minTier preset to this
              // row's tier, so "14 films at tier 6" is one click away.
              const canDrill = typeof onNavigateToTier === 'function';
              return (
                <tr
                  key={t}
                  className={canDrill ? 'canon-tier-row-interactive' : ''}
                  onClick={canDrill ? () => onNavigateToTier(t) : undefined}
                  title={canDrill ? `View all ${row.total} tier-${t} films` : undefined}
                >
                  <td>
                    {/* In a table column every row needs the same pill width
                        so the column reads cleanly. Render all MAX_TIER dots —
                        filled up to `t`, empty after — instead of only the
                        filled ones (which leaves each row a different width). */}
                    <span className={`tier-pips tier-${t}`} style={{ padding: '3px 7px' }}>
                      {Array.from({ length: MAX_TIER }, (_, i) => (
                        <span key={i} className={`tier-pip ${i < t ? 'filled' : 'empty'}`} />
                      ))}
                    </span>
                    <span className="canon-tier-label">
                      {TIER_LABELS[t]}
                    </span>
                  </td>
                  <td>{row.watched}</td>
                  <td>{row.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Top rated per rater */}
      {raters.map(name => (
        <div className="stats-section" key={name}>
          <h3>Top 5 — {name}</h3>
          {stats.perRater[name]?.top5.length === 0 ? (
            <p className="stats-empty">No ratings yet</p>
          ) : (
            <ol className="stats-top-list">
              {stats.perRater[name].top5.map((r, i) => (
                <li key={i}>{r.movie.title} <span className="stats-rating">{r.rating}★</span></li>
              ))}
            </ol>
          )}
        </div>
      ))}

      {/* Biggest disagreements (only if 2+ raters) */}
      {raters.length >= 2 && (
        <div className="stats-section">
          <h3>Biggest Disagreements</h3>
          {stats.biggestDisagreements.length === 0 ? (
            <p className="stats-empty">No films rated by everyone yet</p>
          ) : (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Film</th>
                  {raters.map(name => <th key={name}>{name}</th>)}
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {stats.biggestDisagreements.map((r, i) => (
                  <tr key={i}>
                    <td>{r.movie.title}</td>
                    {raters.map(name => <td key={name}>{r.ratings[name]}★</td>)}
                    <td>{r.diff.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ratings by genre */}
      <div className="stats-section">
        <h3>Ratings by Genre</h3>
        {Object.keys(stats.genreStats).length === 0 ? (
          <p className="stats-empty">No ratings yet</p>
        ) : (() => {
          const toggleSort = (key) => {
            setGenreSort(prev => prev.key === key
              ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
              : { key, dir: key === 'genre' ? 'asc' : 'desc' });
          };
          const arrow = (key) => genreSort.key === key ? (genreSort.dir === 'asc' ? ' ↑' : ' ↓') : '';
          const avgFor = (g, name) => g.perRater[name]?.avg ? parseFloat(g.perRater[name].avg) : null;
          const rowAvg = (g) => {
            const vals = raters.map(n => avgFor(g, n)).filter(v => v != null);
            return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
          };
          const filmsFor = (g) => Math.max(...raters.map(name => g.perRater[name]?.count || 0));
          const rows = Object.values(stats.genreStats).slice().sort((a, b) => {
            const dir = genreSort.dir === 'asc' ? 1 : -1;
            if (genreSort.key === 'genre') return a.label.localeCompare(b.label) * dir;
            if (genreSort.key === 'avg') {
              const av = rowAvg(a), bv = rowAvg(b);
              if (av == null && bv == null) return 0;
              if (av == null) return 1;
              if (bv == null) return -1;
              return (av - bv) * dir;
            }
            if (genreSort.key === 'films') return (filmsFor(a) - filmsFor(b)) * dir;
            return 0;
          });
          return (
            <table className="stats-table stats-table-sortable">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('genre')}>Genre{arrow('genre')}</th>
                  {raters.map(name => (
                    <th key={name} className="sortable" onClick={() => toggleSort('avg')}>Avg{arrow('avg')}</th>
                  ))}
                  <th className="sortable" onClick={() => toggleSort('films')}>Films{arrow('films')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g, i) => (
                  <tr key={i}>
                    <td>{g.label}</td>
                    {raters.map(name => (
                      <td key={name}>{g.perRater[name]?.avg ? `${g.perRater[name].avg}★` : '—'}</td>
                    ))}
                    <td>{filmsFor(g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* Progress by decade */}
      <div className="stats-section">
        <h3>Progress by Decade</h3>
        <table className="stats-table">
          <thead><tr><th>Decade</th><th>Watched</th><th>Total</th></tr></thead>
          <tbody>
            {stats.decadeProgress.map((d, i) => (
              <tr key={i}><td>{d.label}</td><td>{d.watched}</td><td>{d.total}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress by category */}
      <div className="stats-section">
        <h3>Progress by Category</h3>
        <table className="stats-table">
          <thead><tr><th>Category</th><th>Watched</th><th>Total</th></tr></thead>
          <tbody>
            {stats.categoryProgress.map((c, i) => (
              <tr key={i}><td>{c.label}</td><td>{c.watched}</td><td>{c.total}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
