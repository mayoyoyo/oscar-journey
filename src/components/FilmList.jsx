import React, { useState, useMemo } from 'react';
import { MOVIES } from '../data/movies';
import { MovieBadges } from './Badges';
import { ratingKey } from '../utils/storage';

function sortKeyFn(title) {
  return title.replace(/^(The|A|An)\s+/i, '').toLowerCase();
}

export default function FilmList({ watchedTitleSet, onOpenDetail, onToggleWatched, ratings, raters }) {
  const [query, setQuery] = useState('');
  const [hideWatched, setHideWatched] = useState(false);
  const [checklistMode, setChecklistMode] = useState(false);

  const { filtered, groups, watchedCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MOVIES
      .filter(m => !q || m.title.toLowerCase().includes(q))
      .filter(m => !hideWatched || !watchedTitleSet.has(m.id))
      .slice()
      .sort((a, b) => sortKeyFn(a.title).localeCompare(sortKeyFn(b.title)));

    const watchedCount = filtered.filter(m => watchedTitleSet.has(m.id)).length;

    const groups = {};
    for (const m of filtered) {
      const letter = sortKeyFn(m.title)[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(m);
    }

    return { filtered, groups, watchedCount };
  }, [query, watchedTitleSet, hideWatched]);

  return (
    <div className="film-list-section">
      <p className="film-list-hint">
        Browse all {MOVIES.length} Oscar-nominated films. Tap a title to see details.
      </p>
      <div className="film-list-toggles">
        <button
          className={`film-list-toggle ${hideWatched ? 'active' : ''}`}
          onClick={() => setHideWatched(h => !h)}
        >
          {hideWatched ? 'Show watched' : 'Hide watched'}
        </button>
        <button
          className={`film-list-toggle ${checklistMode ? 'active' : ''}`}
          onClick={() => setChecklistMode(c => !c)}
        >
          {checklistMode ? 'Exit checklist' : 'Checklist mode'}
        </button>
      </div>
      {checklistMode && (
        <p className="film-list-hint" style={{ marginTop: 0 }}>
          Quickly mark off films you've already seen.
        </p>
      )}
      <input
        className="list-search"
        type="search"
        placeholder="Search films..."
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="list-count">
        {filtered.length} film{filtered.length !== 1 ? 's' : ''} · {watchedCount} watched
      </div>
      <div>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--cream-dim)', padding: '20px 0' }}>No films match your search.</p>
        ) : (
          Object.keys(groups).sort().map(letter => (
            <div className="letter-group" key={letter}>
              <div className="letter-header">{letter}</div>
              {groups[letter].map(m => {
                const isWatched = watchedTitleSet.has(m.id);
                const key = ratingKey(m);
                const r = ratings[key] || {};
                return (
                  <div
                    className={`film-row ${isWatched ? 'is-watched' : ''}`}
                    key={m.id}
                    onClick={() => checklistMode ? onToggleWatched(m) : onOpenDetail(m, filtered)}
                  >
                    {checklistMode && (
                      <span
                        className={`film-row-check ${isWatched ? 'checked' : ''}`}
                      >{isWatched ? '✓' : ''}</span>
                    )}
                    {!checklistMode && isWatched && (
                      <span className="film-row-check checked">✓</span>
                    )}
                    <span className="film-row-title">{m.title}</span>
                    <span className="film-row-year">{m.year}</span>
                    <MovieBadges movie={m} small />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
