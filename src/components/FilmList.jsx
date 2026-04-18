import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { MovieBadges } from './Badges';
import { ratingKey } from '../utils/storage';
import { readCachedRuntime, runtimeBucket, prefetchRuntimes, RUNTIME_LABELS } from '../utils/runtime';
import { ERA_LABELS, CATEGORY_LABELS } from './SettingsModal';
import { getTier } from '../utils/tierInfo';
import LANGUAGES from '../data/languages.json';
import DIRECTORS from '../data/directors.json';
import ACTORS from '../data/actors.json';
import CAST from '../data/cast.json';

// A film is "International" if its primary language isn't English — sourced
// from the baked-in languages.json. Also matches legacy category tags so
// Oscar INT winners stay in the set.
function isInternational(m) {
  if (m.category === 'INT') return true;
  if ((m.alsoWon || []).includes('INT')) return true;
  return LANGUAGES[m.id] != null;
}
// A film is "Animated" via either the Oscar ANIM category, a genre code of
// 'A' (Animation/Family), or an alsoWon entry. Catches non-Oscar animated
// films like Toy Story that are otherwise tagged ESSENTIAL.
function isAnimated(m) {
  if (m.category === 'ANIM') return true;
  if ((m.alsoWon || []).includes('ANIM')) return true;
  return m.genre === 'A';
}

// "Wins" filter — default all OFF, OR semantic. A film passes if it won at least one checked award.
// Some Oscar categories were renamed/split across years; we group equivalents under one label.
// `match` is used for awards not present in the m.awards array (Best Picture is encoded as m.won).
const WIN_CATEGORIES = {
  bestPicture:    { label: 'Best Picture',              match: (m) => m.category === 'BP' && m.won, accent: 'gold' },
  bestIntl:       { label: 'Best International Feature',match: (m) => m.category === 'INT' || (m.alsoWon || []).includes('INT'), accent: 'blue' },
  bestAnim:       { label: 'Best Animated Feature',     match: (m) => m.category === 'ANIM' || (m.alsoWon || []).includes('ANIM'), accent: 'purple' },
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
  // Categories only governs Oscar-eligible films. Essentials bypass this
  // section entirely — they're gated by Canon depth (tier + focus mode).
  categories: { BP: true, INT: true, ANIM: true },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  runtimes: { short: true, medium: true, long: true },
  wins: Object.fromEntries(Object.keys(WIN_CATEGORIES).map(k => [k, false])),
  // Unified tier floor — applies to ALL films (not just essentials).
  // Tier uses the getTierInfo count, which folds OSCAR/OSCAR_NOM into the
  // canon-list count so Oscar films are part of the same ranking.
  minTier: 1,
  // Canon focus — mutually exclusive in the UI:
  //   oscarsOnly      → hide ESSENTIAL canon, leave BP / INT / ANIM
  //   essentialsOnly  → hide Oscar-eligible films, leave just non-Oscar canon
  oscarsOnly: false,
  essentialsOnly: false,
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

export default function FilmList({ watchedTitleSet, onOpenDetail, onToggleWatched, ratings, raters, filterPreset, onFilterPresetApplied }) {
  const [query, setQuery] = useState('');
  // `watchMode` is a three-way enum: 'all' | 'watched' | 'unwatched'.
  // Watched-only and Unwatched-only are mutually exclusive — clicking one
  // deselects the other. Clicking the active pill again returns to 'all'.
  const [watchMode, setWatchMode] = useState('all');
  const watchedOnly   = watchMode === 'watched';
  const unwatchedOnly = watchMode === 'unwatched';
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

  // Consume one-shot filterPreset from parent — set when the user drills in
  // from the Canon Score tier breakdown. Merges the preset keys (minTier,
  // oscarsOnly, essentialsOnly) into the current filters and signals back to
  // the parent to clear the preset so it only fires once.
  // Filter panel stays COLLAPSED — the user came here to see the films, not
  // manage filters. The collapsed header already shows the narrowing via
  // the film count + summary chip (e.g. "Canon ≥7").
  useEffect(() => {
    if (!filterPreset) return;
    setFilters(prev => ({
      ...prev,
      ...(filterPreset.minTier != null ? { minTier: filterPreset.minTier } : {}),
      ...(filterPreset.oscarsOnly != null ? { oscarsOnly: filterPreset.oscarsOnly } : {}),
      ...(filterPreset.essentialsOnly != null ? { essentialsOnly: filterPreset.essentialsOnly } : {}),
    }));
    if (onFilterPresetApplied) onFilterPresetApplied();
  }, [filterPreset, onFilterPresetApplied]);

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
    setWatchMode('all');
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
    if (watchMode !== 'all') n++;
    // Canon-depth counters
    if (filters.minTier !== DEFAULT_FILM_FILTERS.minTier) n++;
    if (filters.oscarsOnly !== DEFAULT_FILM_FILTERS.oscarsOnly) n++;
    if (filters.essentialsOnly !== DEFAULT_FILM_FILTERS.essentialsOnly) n++;
    return n;
  })();

  const activeWinKeys = useMemo(
    () => Object.entries(filters.wins).filter(([, v]) => v).map(([k]) => k),
    [filters.wins]
  );

  const { filtered, groups, watchedCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Search matches across title, director, and cast (baked into
    // directors.json / actors.json). Director gets the whole string; cast
    // is comma-separated top-billed, checked as a substring of the whole
    // string. Case-insensitive. Once cast.json (full Wikidata cast) ships,
    // the actors lookup upgrades automatically.
    const matchesQuery = (m) => {
      if (!q) return true;
      if (m.title.toLowerCase().includes(q)) return true;
      const director = DIRECTORS[m.id];
      if (director && director.toLowerCase().includes(q)) return true;
      // Prefer Wikidata's full cast (up to ~100 names per film) when we
      // have it; fall back to OMDb's top-billed actors string otherwise.
      const fullCast = CAST[m.id];
      if (fullCast && fullCast.some(name => name.toLowerCase().includes(q))) return true;
      const actors = ACTORS[m.id];
      if (actors && actors.toLowerCase().includes(q)) return true;
      return false;
    };
    const filtered = MOVIES
      .filter(matchesQuery)
      .filter(m => {
        if (watchedOnly) return watchedTitleSet.has(m.id);
        if (unwatchedOnly) return !watchedTitleSet.has(m.id);
        return true;
      })
      .filter(m => filters.eras[eraBucket(m.year)])
      .filter(m => {
        // Essentials bypass Categories — they're governed by Canon depth.
        if (m.category === 'ESSENTIAL') return true;
        // Oscar-eligible films: OR semantics over BP / broad-INT / broad-ANIM.
        // INT and ANIM use broad predicates (non-English / genre=A / alsoWon)
        // so they catch international winners that are also BP-nominated or
        // animated films like Toy Story across the Oscar catalog.
        const c = filters.categories;
        if (c.BP && m.category === 'BP') return true;
        if (c.INT && isInternational(m)) return true;
        if (c.ANIM && isAnimated(m)) return true;
        return false;
      })
      // Canon depth + focus mode are bypassed when there's an active search — if you know
      // the film you want (e.g. "Matrix"), you shouldn't have to widen your curation to find it.
      // Tier applies UNIFORMLY to all films via the unified getTier helper, which counts
      // OSCAR / OSCAR_NOM as a canon-list entry for BP / INT / ANIM films.
      .filter(m => !!q || getTier(m) >= (filters.minTier ?? 1))
      .filter(m => !!q || !filters.oscarsOnly || m.category !== 'ESSENTIAL')
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
  }, [query, watchedTitleSet, watchMode, filters, runtimeMap, activeWinKeys]);


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
    if (filters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [filters.minTier, filters.oscarsOnly, filters.essentialsOnly]);

  const eraCounts = useMemo(() => {
    const c = {};
    for (const m of eligiblePool) {
      const b = eraBucket(m.year);
      c[b] = (c[b] || 0) + 1;
    }
    return c;
  }, [eligiblePool]);

  const categoryCounts = useMemo(() => {
    // Counts reflect Oscar-eligible films only — essentials bypass Categories,
    // so a count for ESSENTIAL would be misleading here. INT / ANIM are
    // broad predicates applied to the Oscar-eligible subset.
    const c = { BP: 0, INT: 0, ANIM: 0 };
    for (const m of eligiblePool) {
      if (m.category === 'ESSENTIAL') continue;
      if (m.category === 'BP') c.BP++;
      if (isInternational(m)) c.INT++;
      if (isAnimated(m)) c.ANIM++;
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
        // Color accent for a few special Oscar-Won rows (gold BP, blue Intl,
        // purple Anim) — comes from the `accent` field in WIN_CATEGORIES.
        const accent = section === 'wins' ? WIN_CATEGORIES[key]?.accent : null;
        const accentClass = accent ? `filter-check-item-${accent}` : '';
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''} ${accentClass}`}
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
          : `Browse all ${MOVIES.length} films — every Best Picture nominee (1939+), every International Feature winner (1956+), every Animated Feature winner, plus 304 essential non-Oscar canon films. Use the filters to narrow down.`}
      </p>

      <input
        className="list-search"
        type="search"
        placeholder="Search films, directors, cast..."
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={`film-list-filters ${filtersOpen ? 'is-open' : 'is-closed'}`}>
        <button className="film-list-filters-header" onClick={() => setFiltersOpen(o => !o)}>
          <span className="film-list-filters-arrow">{filtersOpen ? '▾' : '▸'}</span>
          <span className="journey-controls-header">Filters</span>
          <span className="film-list-filters-match">
            <span className="film-list-filters-match-full">
              {filtered.length} film{filtered.length !== 1 ? 's' : ''}
              {watchedCount > 0 && <span className="film-list-filters-watched"> · {watchedCount} watched</span>}
            </span>
            <span className="film-list-filters-match-short">
              {filtered.length}
              {watchedCount > 0 && <span className="film-list-filters-watched"> · {watchedCount}✓</span>}
            </span>
          </span>
          {activeFilterCount > 0 && (
            <span className="film-list-filters-count">{activeFilterCount} active</span>
          )}
          {activeFilterCount > 0 && (
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
                onClick={() => setWatchMode(w => w === 'watched' ? 'all' : 'watched')}
              >
                Watched
              </button>
              <button
                className={`film-list-toggle ${unwatchedOnly ? 'active' : ''}`}
                onClick={() => setWatchMode(w => w === 'unwatched' ? 'all' : 'unwatched')}
              >
                Unwatched
              </button>
              <button
                className={`film-list-toggle ${checklistMode ? 'active' : ''}`}
                onClick={() => setChecklistMode(c => !c)}
              >
                Checklist mode
              </button>
            </div>

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
                  if (filters.essentialsOnly) parts.push('Essentials only');
                  if (filters.minTier > 1) parts.push(`tier ≥${filters.minTier}`);
                  if (parts.length === 0) return null;
                  return <span className="filter-section-count">{parts.join(' · ')}</span>;
                })()}
              </button>
              {openSections.canon && (
                <div className="filter-checklist canon-depth-body">
                  {/* Oscars-only / Essentials-only toggles — mutually exclusive.
                      Turning one on turns the other off. */}
                  <button
                    type="button"
                    className={`essentials-only-toggle ${filters.oscarsOnly ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, oscarsOnly: !f.oscarsOnly, essentialsOnly: false }))}
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

                  <button
                    type="button"
                    className={`essentials-only-toggle ${filters.essentialsOnly ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, essentialsOnly: !f.essentialsOnly, oscarsOnly: false }))}
                    aria-pressed={filters.essentialsOnly}
                  >
                    <span className="essentials-only-checkbox">{filters.essentialsOnly ? '\u2713' : ''}</span>
                    <span className="essentials-only-label">
                      <strong>Essentials only</strong>
                      <span className="essentials-only-sub">
                        Hide Oscar-eligible films — show just the non-Oscar canon.
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
