import React, { useMemo } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';
import { getTierInfo, MAX_TIER } from '../utils/tierInfo';
import TierPips from './TierPips';

export default function StatsTab({ watchedTitleSet, ratings, raters, embedded, profileName }) {
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

    // Progress by decade
    const decades = [
      { label: '1970-1979', min: 1970, max: 1979 },
      { label: '1980-1989', min: 1980, max: 1989 },
      { label: '1990-1999', min: 1990, max: 1999 },
      { label: '2000-2009', min: 2000, max: 2009 },
      { label: '2010-2019', min: 2010, max: 2019 },
      { label: '2020-2025', min: 2020, max: 2025 },
    ];
    const decadeProgress = decades.map(d => {
      const total = MOVIES.filter(m => m.year >= d.min && m.year <= d.max).length;
      const watched = MOVIES.filter(m => m.year >= d.min && m.year <= d.max && watchedTitleSet.has(m.id)).length;
      return { ...d, total, watched };
    });

    // Progress by category
    const categories = [
      { label: 'Best Picture', cat: 'BP' },
      { label: 'International Feature', cat: 'INT' },
      { label: 'Animated Feature', cat: 'ANIM' },
      { label: 'Essential (non-Oscar)', cat: 'ESSENTIAL' },
    ];
    const categoryProgress = categories.map(c => {
      const total = MOVIES.filter(m => m.category === c.cat).length;
      const watched = MOVIES.filter(m => m.category === c.cat && watchedTitleSet.has(m.id)).length;
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
      canonScoreMax += tier;
      tierBreakdown[tier].total++;
      if (watchedTitleSet.has(m.id)) {
        canonScore += tier;
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
      canonScore, canonScoreMax, tierBreakdown, nextUp,
    };
  }, [watchedTitleSet, ratings, raters]);

  return (
    <div className={embedded ? '' : 'film-list-section'}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: '20px', fontSize: '1.1rem' }}>
        {profileName ? `${profileName}'s Statistics` : 'Statistics'}
      </h2>

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.watchedCount} / {stats.totalFilms}</div>
          <div className="stat-card-label">Films Watched</div>
        </div>
        {raters.map(name => (
          <div className="stat-card" key={name}>
            <div className="stat-card-value">
              {stats.perRater[name]?.avg ? `${stats.perRater[name].avg}★` : '—'}
            </div>
            <div className="stat-card-label">
              {name} Average{stats.perRater[name]?.ratings.length > 0 ? ` (${stats.perRater[name].ratings.length} films)` : ''}
            </div>
          </div>
        ))}
        {raters.length >= 2 && (
          <div className="stat-card">
            <div className="stat-card-value">
              {stats.agreePct !== null ? `${stats.agreePct}%` : '—'}
            </div>
            <div className="stat-card-label">
              Agreement{stats.allRated.length > 0 ? ` (${stats.allRated.length} films)` : ''}
            </div>
          </div>
        )}
      </div>

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
          <div className="canon-score-caption">
            Each film scores points equal to the number of canon lists it appears on (1–{MAX_TIER}). Watch the hardest-to-ignore films to climb fastest.
          </div>
        </div>

        <table className="stats-table canon-tier-table">
          <thead>
            <tr><th>Tier</th><th>Watched</th><th>Total</th><th>%</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_TIER }, (_, i) => MAX_TIER - i).map(t => {
              const row = stats.tierBreakdown[t];
              if (!row || row.total === 0) return null;
              const pct = row.total > 0 ? Math.round((row.watched / row.total) * 100) : 0;
              return (
                <tr key={t}>
                  <td>
                    <span className={`tier-pips tier-${t}`} style={{ padding: '3px 7px' }}>
                      {Array.from({ length: t }, (_, i) => (
                        <span key={i} className="tier-pip filled" />
                      ))}
                    </span>
                    <span style={{ marginLeft: 8, color: 'var(--cream-dim)', fontSize: '0.85rem' }}>
                      {t === MAX_TIER ? 'all lists' : `${t} of ${MAX_TIER}`}
                    </span>
                  </td>
                  <td>{row.watched}</td>
                  <td>{row.total}</td>
                  <td>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {stats.nextUp.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '0.95rem', marginBottom: 10 }}>
              Next up — highest-signal unwatched
            </h4>
            <ul className="canon-next-up">
              {stats.nextUp.map(m => (
                <li key={m.id}>
                  <span className="canon-next-title">{m.title}</span>
                  <span className="canon-next-year">· {m.year}</span>
                  <TierPips movie={m} variant="compact" />
                </li>
              ))}
            </ul>
          </div>
        )}
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
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Genre</th>
                {raters.map(name => <th key={name}>{name} Avg</th>)}
                <th>Films</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(stats.genreStats).map((g, i) => (
                <tr key={i}>
                  <td>{g.label}</td>
                  {raters.map(name => (
                    <td key={name}>{g.perRater[name]?.avg ? `${g.perRater[name].avg}★` : '—'}</td>
                  ))}
                  <td>{Math.max(...raters.map(name => g.perRater[name]?.count || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
