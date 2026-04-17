import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { MovieBadges } from './Badges';
import { ratingKey } from '../utils/storage';
import { readCachedRuntime, runtimeBucket, prefetchRuntimes, RUNTIME_LABELS } from '../utils/runtime';
import { ERA_LABELS, CATEGORY_LABELS } from './SettingsModal';
import { getTier } from '../utils/tierInfo';

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
  // Unified tier floor — applies to ALL films (not just essentials).
  // Tier uses the getTierInfo count, which folds OSCAR/OSCAR_NOM into the
  // canon-list count so Oscar films are part of the same ranking.
  minTier: 1,
  // Independent shortcut: hide ESSENTIAL films, leaving only BP/INT/ANIM.
  oscarsOnly: false,
};

// Per-tier copy shown in the Canon depth section. Keys are the minimum
// tier value for the slider; the description previews what that floor
// means editorially. Matches the methodology's "2-of-N triangulation".
const TIER_LEVELS = {
  1: { label: 'Everything',        sub: 'The whole catalog — no canon floor applied.' },
  2: { label: 'Canon threshold',   sub: 'On 2+ canonical lists. The working bar for "belongs in the canon."' },
  3: { label: 'Strong consensus',  sub: 'On 3+ lists. Backed by multiple disjoint cultural authorities.' },
  4: { label: 'Iron-clad',         sub: 'On 4+ lists. No serious critic argues against these.' },
  5: { label: 'Near-universal',    sub: 'On 5+ lists. Staples of every major canon.' },
  6: { label: 'Universal canon',   sub: 'On 6+ lists. Essentially undisputed across worldviews.' },
  7: { label: 'All-time masterpieces', sub: 'On 7 of 8 lists. In the conversation for greatest ever made.' },
  8: { label: 'Legendary',         sub: 'On every canonical list. Vanishingly rare — the GOATs.' },
};
const MAX_SLIDER_TIER = 7;

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
    // Canon-depth counters
    if (filters.minTier !== DEFAULT_FILM_FILTERS.minTier) n++;
    if (filters.oscarsOnly !== DEFAULT_FILM_FILTERS.oscarsOnly) n++;
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
      // Canon depth + oscars-only are bypassed when there's an active search — if you know
      // the film you want (e.g. "Matrix"), you shouldn't have to widen your curation to find it.
      // Tier applies UNIFORMLY to all films via the unified getTier helper, which counts
      // OSCAR / OSCAR_NOM as a canon-list entry for BP / INT / ANIM films.
      .filter(m => !!q || getTier(m) >= (filters.minTier ?? 1))
      .filter(m => !!q || !filters.oscarsOnly || m.category !== 'ESSENTIAL')
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


  const setOnlyKey = (section, labels, onlyKey) => {
    const next = {};
    for (const k of Object.keys(labels)) next[k] = (k === onlyKey);
    setFilters(f => ({ ...f, [section]: next }));
  };

  // Per-option eligibility pool — used to hide rows where 0 films qualify
  // (e.g. the 1910s era when canon depth is set to ≥3). Counts are no longer
  // shown as suffixes per mayo's request; we only use this to drop empty rows.
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (getTier(m) < (filters.minTier ?? 1)) return false;
    if (filters.oscarsOnly && m.category === 'ESSENTIAL') return false;
    return true;
  }), [filters.minTier, filters.oscarsOnly]);

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

  const renderChecklist = (section, labels, counts) => (
    <div className="filter-checklist">
      {Object.entries(labels).map(([key, label]) => {
        // Hide rows that have zero matching films at the current canon settings.
        if (counts && (counts[key] || 0) === 0) return null;
        const active = filters[section][key];
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''}`}
            onClick={() => toggleFilter(section, key)}>
            <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
            <span className="filter-check-label">{label}</span>
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

  const renderSection = (label, section, labels, counts) => {
    const count = sectionCount(section);
    const isOpen = openSections[section];
    return (
      <div className="filter-section" key={section}>
        <button className="filter-section-toggle" onClick={() => toggleSection(section)}>
          <span className="filter-section-arrow">{isOpen ? '▾' : '▸'}</span>
          <span className="filter-section-label">{label}</span>
          {count && <span className="filter-section-count">{count}</span>}
        </button>
        {isOpen && renderChecklist(section, labels, counts)}
      </div>
    );
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
        <div className="film-list-filters-bar">
          <button className="film-list-filters-header" onClick={() => setFiltersOpen(o => !o)}>
            <span className="film-list-filters-arrow">{filtersOpen ? '▾' : '▸'}</span>
            <span className="journey-controls-header">Filters</span>
            <span className="film-list-filters-match">
              {filtered.length} film{filtered.length !== 1 ? 's' : ''}
              {watchedCount > 0 && <span className="film-list-filters-watched"> · {watchedCount} watched</span>}
            </span>
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
          {/* Mode toggles live on the always-visible filter bar — they're
              the most common interactions and don't need the dropdown. */}
          <div className="film-list-mode-toggles film-list-mode-toggles-inline">
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
        </div>

        {filtersOpen && (
          <div className="film-list-filters-body">

            {/* Canon depth — two independent controls:
                  (1) Oscars-only toggle: hides non-Oscar films
                  (2) Minimum tier slider (1..MAX_SLIDER_TIER, +/- stepper)
                Tier applies UNIFORMLY across BP, INT, ANIM, ESSENTIAL via the
                unified getTier() helper (OSCAR / OSCAR_NOM count as a list). */}
            <div className="filter-section">
              <button className="filter-section-toggle" onClick={() => toggleSection('canon')}>
                <span className="filter-section-arrow">{openSections.canon ? '▾' : '▸'}</span>
                <span className="filter-section-label">Canon depth</span>
                {(() => {
                  const parts = [];
                  if (filters.oscarsOnly) parts.push('Oscars only');
                  if (filters.minTier > 1) parts.push(`tier ≥${filters.minTier}`);
                  if (parts.length === 0) return null;
                  return <span className="filter-section-count">{parts.join(' · ')}</span>;
                })()}
              </button>
              {openSections.canon && (
                <div className="filter-checklist canon-depth-body">
                  {/* Oscars-only toggle — independent of tier slider */}
                  <button
                    type="button"
                    className={`essentials-only-toggle ${filters.oscarsOnly ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, oscarsOnly: !f.oscarsOnly }))}
                    aria-pressed={filters.oscarsOnly}
                  >
                    <span className="essentials-only-checkbox">{filters.oscarsOnly ? '\u2713' : ''}</span>
                    <span className="essentials-only-label">
                      <strong>Oscars only</strong>
                      <span className="essentials-only-sub">
                        Hide canon-only essentials — show just BP nominees and Int/Anim winners.
                      </span>
                    </span>
                  </button>

                  {/* Minimum tier +/- stepper */}
                  <div className="tier-stepper">
                    <div className="tier-stepper-header">
                      <span className="tier-stepper-title">Minimum tier</span>
                      <div className="tier-stepper-controls">
                        <button
                          type="button"
                          className="tier-stepper-btn"
                          onClick={() => setFilters(f => ({ ...f, minTier: Math.max(1, (f.minTier ?? 1) - 1) }))}
                          disabled={filters.minTier <= 1}
                          aria-label="Lower minimum tier"
                        >−</button>
                        <span className="tier-stepper-value">≥ {filters.minTier}</span>
                        <button
                          type="button"
                          className="tier-stepper-btn"
                          onClick={() => setFilters(f => ({ ...f, minTier: Math.min(MAX_SLIDER_TIER, (f.minTier ?? 1) + 1) }))}
                          disabled={filters.minTier >= MAX_SLIDER_TIER}
                          aria-label="Raise minimum tier"
                        >+</button>
                      </div>
                    </div>
                    <div className="tier-stepper-desc">
                      <strong>{TIER_LEVELS[filters.minTier]?.label}</strong>
                      <span>{TIER_LEVELS[filters.minTier]?.sub}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {renderSection('Categories', 'categories', CATEGORY_LABELS, categoryCounts)}
            {renderSection('Eras', 'eras', ERA_LABELS, eraCounts)}
            {renderSection('Genres', 'genres', GENRE_LABELS, genreCounts)}
            {renderSection('Runtime', 'runtimes', RUNTIME_LABELS)}
            {renderSection('Oscars Won', 'wins', WIN_LABELS)}

            {runtimeLoading && (
              <div className="film-list-runtime-status">
                Loading runtimes… {totalKnownRuntime}/{MOVIES.length} films
              </div>
            )}
          </div>
        )}
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
                    <MovieBadges movie={m} small />
                    <span className="film-row-year">{m.year}</span>
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
