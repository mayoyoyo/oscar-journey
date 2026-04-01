import React, { useMemo } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { ratingKey } from '../utils/storage';

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
    ];
    const categoryProgress = categories.map(c => {
      const total = MOVIES.filter(m => m.category === c.cat).length;
      const watched = MOVIES.filter(m => m.category === c.cat && watchedTitleSet.has(m.id)).length;
      return { ...c, total, watched };
    });

    return {
      totalFilms, watchedCount, perRater, agreePct, allRated,
      biggestDisagreements, genreStats, decadeProgress, categoryProgress,
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
