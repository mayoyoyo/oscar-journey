import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { MovieBadges } from './Badges';
import { ratingKey } from '../utils/storage';
import { readCachedRuntime, runtimeBucket, prefetchRuntimes, RUNTIME_LABELS } from '../utils/runtime';
import { ERA_LABELS, CATEGORY_LABELS } from './SettingsModal';

// "Wins" filter — default all OFF, OR semantic. A film passes if it won at least one checked award.
// Some Oscar categories were renamed/split across years; we group equivalents under one label.
// `match` is used for awards not present in the m.awards array (Best Picture is encoded as m.won).
const WIN_CATEGORIES = {
  bestPicture:    { label: 'Best Picture',              match: (m) => m.category === 'BP' && m.won },
  director:       { label: 'Best Director',              cats: ['Director'] },
  actor:          { label: 'Best Actor',                 cats: ['Actor'] },
  actress:        { label: 'Best Actress',               cats: ['Actress'] },
  suppActor:      { label: 'Best Supporting Actor',      cats: ['Supporting Actor'] },
  suppActress:    { label: 'Best Supporting Actress',    cats: ['Supporting Actress'] },
  origScreen:     { label: 'Best Original Screenplay',   cats: ['Original Screenplay'] },
  adaptScreen:    { label: 'Best Adapted Screenplay',    cats: ['Adapted Screenplay'] },
  cinematography: { label: 'Best Cinematography',        cats: ['Cinematography'] },
  score:          { label: 'Best Original Score',        cats: ['Original Score'] },
  song:           { label: 'Best Original Song',         cats: ['Original Song'] },
  editing:        { label: 'Best Film Editing',          cats: ['Film Editing'] },
  vfx:            { label: 'Best Visual Effects',        cats: ['Visual Effects'] },
  costume:        { label: 'Best Costume Design',        cats: ['Costume Design'] },
  prodDesign:     { label: 'Best Production Design',     cats: ['Production Design', 'Art Direction'] },
  makeup:         { label: 'Best Makeup',                cats: ['Makeup'] },
  sound:          { label: 'Best Sound',                 cats: ['Sound', 'Sound Editing', 'Sound Mixing', 'Sound Effects Editing'] },
};
const WIN_LABELS = Object.fromEntries(Object.entries(WIN_CATEGORIES).map(([k, v]) => [k, v.label]));

function filmWonAward(movie, key) {
  const def = WIN_CATEGORIES[key];
  if (def.match) return def.match(movie);
  if (!Array.isArray(movie.awards)) return false;
  const won = new Set(movie.awards.map(a => a.category));
  return def.cats.some(c => won.has(c));
}

const DEFAULT_FILM_FILTERS = {
  eras: {
    '1910s': true, '1920s': true, '1930s': true, '1940s': true, '1950s': true, '1960s': true,
    '70s': true, '80s': true, '90s': true, '00s': true, '10s': true, '20s': true,
  },
  categories: { BP: true, INT: true, ANIM: true, ESSENTIAL: true },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  runtimes: { short: true, medium: true, long: true },
  wins: Object.fromEntries(Object.keys(WIN_CATEGORIES).map(k => [k, false])),
  minEssentialTier: 2,
  essentialsOnly: false,
};

function sortKeyFn(title) {
  return title.replace(/^(The|A|An)\s+/i, '').toLowerCase();
}

function eraBucket(year) {
  if (year < 1920) return '1910s';
  if (year < 1930) return '1920s';
  if (year < 1940) return '1930s';
  if (year < 1950) return '1940s';
  if (year < 1960) return '1950s';
  if (year < 1970) return '1960s';
  if (year < 1980) return '70s';
  if (year < 1991) return '80s';
  if (year < 2000) return '90s';
  if (year < 2010) return '00s';
  if (year < 2020) return '10s';
  return '20s';
}

export default function FilmList({ watchedTitleSet, onOpenDetail, onToggleWatched, ratings, raters }) {
  const [query, setQuery] = useState('');
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [checklistMode, setChecklistMode] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILM_FILTERS);
  const [openSections, setOpenSections] = useState({ eras: false, categories: false, canon: false, genres: false, runtimes: false, wins: false });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [runtimeTick, setRuntimeTick] = useState(0);
  const [prefetchDone, setPrefetchDone] = useState(false);

  // Kick off background prefetch of runtime data on mount (no-op if already started elsewhere)
  useEffect(() => {
    prefetchRuntimes(MOVIES, () => setRuntimeTick(t => t + 1))
      .then(() => setPrefetchDone(true));
  }, []);

  // Build a runtime map; recomputes as prefetch completes batches
  const runtimeMap = useMemo(() => {
    const map = new Map();
    for (const m of MOVIES) map.set(m.id, readCachedRuntime(m));
    return map;
  }, [runtimeTick]);

  const totalKnownRuntime = useMemo(
    () => Array.from(runtimeMap.values()).filter(v => v != null).length,
    [runtimeMap]
  );

  const toggleFilter = (section, key) => {
    setFilters(prev => {
      const nextSection = { ...prev[section], [key]: !prev[section][key] };
      // "Wins" has inverted semantics (default all OFF = show all), so empty is valid.
      // For every other section, empty means "nothing matches" which is never what the
      // user wants. If toggling would leave it empty, auto-restore all keys to true so
      // unchecking the lone active item cleanly reverts the filter.
      if (section !== 'wins' && !Object.values(nextSection).some(Boolean)) {
        for (const k of Object.keys(nextSection)) nextSection[k] = true;
      }
      return { ...prev, [section]: nextSection };
    });
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILM_FILTERS);
    setWatchedOnly(false);
  };

  const sectionCount = (section) => {
    const cur = filters[section];
    const def = DEFAULT_FILM_FILTERS[section] || {};
    const entries = Object.entries(cur);
    const active = entries.filter(([, v]) => v).length;
    if (section === 'wins') {
      // Inverted: default all-off = no filter. Show count of ON.
      return active > 0 ? `${active} on` : null;
    }
    // Hide the badge at the default state so partial-default filters (eras default
    // to 1970s+, pre-1970 off) don't read as "filter applied" when user hasn't changed anything.
    const matchesDefault = entries.every(([k, v]) => v === def[k]);
    if (matchesDefault) return null;
    return `${active}/${entries.length}`;
  };

  const activeFilterCount = (() => {
    let n = 0;
    for (const section of ['eras', 'categories', 'genres', 'runtimes']) {
      const def = DEFAULT_FILM_FILTERS[section] || {};
      for (const [k, v] of Object.entries(filters[section])) {
        if (v !== def[k]) n++;
      }
    }
    // Wins defaults all OFF; each ON one counts as a user-applied filter.
    n += Object.values(filters.wins).filter(v => v).length;
    if (watchedOnly) n++;
    // Canon-depth / essentials-only counted if different from default
    if (filters.minEssentialTier !== DEFAULT_FILM_FILTERS.minEssentialTier) n++;
    if (filters.essentialsOnly !== DEFAULT_FILM_FILTERS.essentialsOnly) n++;
    return n;
  })();

  const activeWinKeys = useMemo(
    () => Object.entries(filters.wins).filter(([, v]) => v).map(([k]) => k),
    [filters.wins]
  );

  const { filtered, groups, watchedCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MOVIES
      .filter(m => !q || m.title.toLowerCase().includes(q))
      .filter(m => !watchedOnly || watchedTitleSet.has(m.id))
      .filter(m => filters.eras[eraBucket(m.year)])
      .filter(m => filters.categories[m.category] || (m.alsoWon || []).some(c => filters.categories[c]))
      // Canon depth + essentials-only are bypassed when there's an active search — if you know
      // the film you want (e.g. "Matrix"), you shouldn't have to widen your curation to find it.
      .filter(m => !!q || m.category !== 'ESSENTIAL' || (m.tier || 0) >= (filters.minEssentialTier ?? 2))
      .filter(m => !!q || !filters.essentialsOnly || m.category === 'ESSENTIAL')
      .filter(m => filters.genres[m.genre] !== false)
      .filter(m => {
        const bucket = runtimeBucket(runtimeMap.get(m.id));
        return bucket == null || filters.runtimes[bucket];
      })
      .filter(m => {
        if (activeWinKeys.length === 0) return true;
        return activeWinKeys.some(k => filmWonAward(m, k));
      })
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
  }, [query, watchedTitleSet, watchedOnly, filters, runtimeMap, activeWinKeys]);

  // Pre-compute how many films won each award category — used as suffix counts in the menu
  const winCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(WIN_CATEGORIES).map(k => [k, 0]));
    for (const m of MOVIES) {
      for (const k of Object.keys(WIN_CATEGORIES)) {
        if (filmWonAward(m, k)) counts[k]++;
      }
    }
    return counts;
  }, []);
  const winSuffixes = Object.fromEntries(Object.entries(winCounts).map(([k, n]) => [k, `(${n})`]));

  const setOnlyKey = (section, labels, onlyKey) => {
    const next = {};
    for (const k of Object.keys(labels)) next[k] = (k === onlyKey);
    setFilters(f => ({ ...f, [section]: next }));
  };

  // Per-option counts based on the current canon depth + essentials-only setting.
  // Used to (a) show counts as suffixes and (b) hide rows where 0 films would qualify
  // — e.g. the 1910s era when the canon depth is set to ≥3.
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (m.category === 'ESSENTIAL' && (m.tier || 0) < (filters.minEssentialTier ?? 2)) return false;
    if (filters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [filters.minEssentialTier, filters.essentialsOnly]);

  const eraCounts = useMemo(() => {
    const c = {};
    for (const m of eligiblePool) {
      const b = eraBucket(m.year);
      c[b] = (c[b] || 0) + 1;
    }
    return c;
  }, [eligiblePool]);

  const categoryCounts = useMemo(() => {
    const c = {};
    for (const m of eligiblePool) {
      c[m.category] = (c[m.category] || 0) + 1;
      for (const cat of m.alsoWon || []) c[cat] = (c[cat] || 0) + 1;
    }
    return c;
  }, [eligiblePool]);

  const genreCounts = useMemo(() => {
    const c = {};
    for (const m of eligiblePool) c[m.genre] = (c[m.genre] || 0) + 1;
    return c;
  }, [eligiblePool]);

  const renderChecklist = (section, labels, suffixes, counts) => (
    <div className="filter-checklist">
      {Object.entries(labels).map(([key, label]) => {
        // Hide rows that have zero matching films at the current canon settings.
        if (counts && (counts[key] || 0) === 0) return null;
        const active = filters[section][key];
        // Auto-derive suffix from counts when explicit suffixes weren't passed.
        const suffix = suffixes ? suffixes[key] : (counts ? `(${counts[key] || 0})` : null);
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''}`}
            onClick={() => toggleFilter(section, key)}>
            <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
            <span className="filter-check-label">
              {label}
              {suffix && <span className="filter-check-suffix"> {suffix}</span>}
            </span>
            <button
              type="button"
              className="filter-only-btn"
              onClick={(e) => { e.stopPropagation(); setOnlyKey(section, labels, key); }}
              title={`Show only ${label}`}
            >
              only
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderSection = (label, section, labels, suffixes, counts) => {
    const count = sectionCount(section);
    const isOpen = openSections[section];
    return (
      <div className="filter-section" key={section}>
        <button className="filter-section-toggle" onClick={() => toggleSection(section)}>
          <span className="filter-section-arrow">{isOpen ? '▾' : '▸'}</span>
          <span className="filter-section-label">{label}</span>
          {count && <span className="filter-section-count">{count}</span>}
        </button>
        {isOpen && renderChecklist(section, labels, suffixes, counts)}
      </div>
    );
  };

  const runtimeCounts = useMemo(() => {
    const counts = { short: 0, medium: 0, long: 0 };
    for (const m of MOVIES) {
      const b = runtimeBucket(runtimeMap.get(m.id));
      if (b) counts[b]++;
    }
    return counts;
  }, [runtimeMap]);

  const runtimeSuffixes = {
    short: `(${runtimeCounts.short})`,
    medium: `(${runtimeCounts.medium})`,
    long: `(${runtimeCounts.long})`,
  };

  const runtimeLoading = !prefetchDone;

  return (
    <div className="film-list-section">
      <p className="film-list-hint">
        {checklistMode
          ? 'Tap any film to mark it as watched. Great for first-timers catching up on what they\'ve already seen.'
          : `Browse all ${MOVIES.length} films — every Best Picture nominee since 1970, every International and Animated Feature winner, plus 438 essential non-Oscar canon films. Use the filters to narrow down.`}
      </p>

      <input
        className="list-search"
        type="search"
        placeholder="Search films..."
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={`film-list-filters ${filtersOpen ? 'is-open' : 'is-closed'}`}>
        <button className="film-list-filters-header" onClick={() => setFiltersOpen(o => !o)}>
          <span className="film-list-filters-arrow">{filtersOpen ? '▾' : '▸'}</span>
          <span className="journey-controls-header">Filters</span>
          {activeFilterCount > 0 && (
            <span className="film-list-filters-count">{activeFilterCount} active</span>
          )}
          {filtersOpen && activeFilterCount > 0 && (
            <span
              className="film-list-filter-reset"
              role="button"
              onClick={(e) => { e.stopPropagation(); resetFilters(); }}
            >Reset</span>
          )}
        </button>

        {filtersOpen && (
          <div className="film-list-filters-body">
            <div className="film-list-mode-toggles">
              <button
                className={`film-list-toggle ${watchedOnly ? 'active' : ''}`}
                onClick={() => setWatchedOnly(w => !w)}
              >
                {watchedOnly ? '✓ Watched only' : 'Watched only'}
              </button>
              <button
                className={`film-list-toggle ${checklistMode ? 'active' : ''}`}
                onClick={() => setChecklistMode(c => !c)}
              >
                {checklistMode ? '✓ Checklist mode' : 'Checklist mode'}
              </button>
            </div>

            {/* Canon depth — styled like a regular collapsible filter section for visual parity */}
            <div className="filter-section">
              <button className="filter-section-toggle" onClick={() => toggleSection('canon')}>
                <span className="filter-section-arrow">{openSections.canon ? '▾' : '▸'}</span>
                <span className="filter-section-label">Canon depth</span>
                {(() => {
                  const parts = [];
                  if (filters.essentialsOnly) parts.push('only');
                  if (filters.minEssentialTier === 99) parts.push('Oscars');
                  else if (filters.minEssentialTier !== DEFAULT_FILM_FILTERS.minEssentialTier) parts.push(`≥${filters.minEssentialTier}`);
                  if (parts.length === 0) return null;
                  return <span className="filter-section-count">{parts.join(' · ')}</span>;
                })()}
              </button>
              {openSections.canon && (
                <div className="filter-checklist canon-depth-body">
                  <p className="canon-depth-caption">
                    Minimum number of canon lists a non-Oscar film must appear on.
                  </p>
                  <div className="canon-depth-toggle" role="radiogroup" aria-label="Canon depth">
                    {[
                      { tier: 99, label: 'Oscars only', sub: 'no essentials · 399 films' },
                      { tier: 4, label: 'Tier ≥ 4', sub: 'iron-clad · 57 essentials' },
                      { tier: 3, label: 'Tier ≥ 3', sub: 'strong consensus · 143 essentials' },
                      { tier: 2, label: 'Tier ≥ 2', sub: 'all canon · 438 essentials' },
                    ].map(opt => (
                      <button
                        key={opt.tier}
                        className={`canon-depth-btn ${filters.minEssentialTier === opt.tier ? 'active' : ''}`}
                        role="radio"
                        aria-checked={filters.minEssentialTier === opt.tier}
                        onClick={() => setFilters(f => ({
                          ...f,
                          minEssentialTier: opt.tier,
                          // Flip off essentials-only if the user picks "Oscars only" — the two combined
                          // would produce an empty set.
                          essentialsOnly: opt.tier === 99 ? false : f.essentialsOnly,
                        }))}
                      >
                        <span className="canon-depth-label">{opt.label}</span>
                        <span className="canon-depth-sub">{opt.sub}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`essentials-only-toggle ${filters.essentialsOnly ? 'active' : ''} ${filters.minEssentialTier === 99 ? 'disabled' : ''}`}
                    onClick={() => {
                      if (filters.minEssentialTier === 99) return;
                      setFilters(f => ({ ...f, essentialsOnly: !f.essentialsOnly }));
                    }}
                    aria-pressed={filters.essentialsOnly}
                    disabled={filters.minEssentialTier === 99}
                  >
                    <span className="essentials-only-checkbox">{filters.essentialsOnly ? '\u2713' : ''}</span>
                    <span className="essentials-only-label">
                      <strong>Essentials only</strong>
                      <span className="essentials-only-sub">
                        {filters.minEssentialTier === 99
                          ? 'n/a — Oscars-only mode is on'
                          : 'hide Oscar films — show just the canon at the chosen tier'}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {renderSection('Categories', 'categories', CATEGORY_LABELS, undefined, categoryCounts)}
            {renderSection('Eras', 'eras', ERA_LABELS, undefined, eraCounts)}
            {renderSection('Genres', 'genres', GENRE_LABELS, undefined, genreCounts)}
            {renderSection('Runtime', 'runtimes', RUNTIME_LABELS, runtimeSuffixes)}
            {renderSection('Oscars Won', 'wins', WIN_LABELS, winSuffixes)}

            {runtimeLoading && (
              <div className="film-list-runtime-status">
                Loading runtimes… {totalKnownRuntime}/{MOVIES.length} films
              </div>
            )}
          </div>
        )}
      </div>

      <div className="list-count">
        {filtered.length} film{filtered.length !== 1 ? 's' : ''} · {watchedCount} watched
      </div>
      <div>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--cream-dim)', padding: '20px 0' }}>No films match your search.</p>
        ) : (
          Object.keys(groups).sort((a, b) => {
            // Put letter groups (A-Z) before digit groups (0-9) so films like
            // "12 Angry Men" and "2001: A Space Odyssey" land at the bottom of the list.
            const aIsDigit = /^[0-9]/.test(a);
            const bIsDigit = /^[0-9]/.test(b);
            if (aIsDigit !== bIsDigit) return aIsDigit ? 1 : -1;
            return a.localeCompare(b);
          }).map(letter => (
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
                    {!checklistMode && (
                      <span className={`film-row-dot ${isWatched ? 'watched' : ''}`} />
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
