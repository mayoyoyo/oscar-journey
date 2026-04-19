import React, { useState, useMemo, useEffect } from 'react';
import { MOVIES, GENRE_LABELS } from '../data/movies';
import { MovieBadges } from './Badges';
import OscarIcon, { getOscarBadges } from './OscarIcon';
import { LanguageFlag } from './LanguagePill';

// Prototype flag: Option A layout moves Oscar statuettes to a fixed-width
// left column before the title. Flip to false to revert to the inline layout.
const OPTION_A_LAYOUT = true;
import { ratingKey } from '../utils/storage';
import { readCachedRuntime, prefetchRuntimes } from '../utils/runtime';
import { CATEGORY_LABELS } from './SettingsModal';
import { getTier } from '../utils/tierInfo';
import { isInternational, isAnimated, isDocumentary, isSilent, isBlackAndWhite, matchesCategoryFilter } from '../utils/filmAttributes';
import DIRECTORS from '../data/directors.json';
import ACTORS from '../data/actors.json';
import CAST from '../data/cast.json';

// Normalize a string for search: lowercase, strip accents (é→e, ñ→n), and
// collapse all punctuation/whitespace to single spaces. Applied to both the
// query and each indexed field, so "je tu il elle" matches "Je, Tu, Il, Elle"
// and "la cienaga" matches "La Ciénaga".
function normalizeForSearch(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Build the normalized search index once at module load. Each entry holds
// pre-normalized title / director / people strings so the per-keystroke
// search reduces to three `String.includes` checks per film. Cast.json
// (full Wikidata cast) and actors.json (OMDb top-billed fallback) are
// flattened into the `people` field — an average of ~50 names per film
// across 787 films is ~40K names, which would be too expensive to normalize
// on every keystroke without this.
const SEARCH_INDEX = (() => {
  const idx = new Map();
  for (const m of MOVIES) {
    const fullCast = CAST[m.id] || [];
    const actorsStr = ACTORS[m.id] || '';
    const people = [...fullCast, actorsStr].filter(Boolean).map(normalizeForSearch).join(' ');
    idx.set(m.id, {
      title: normalizeForSearch(m.title),
      director: normalizeForSearch(DIRECTORS[m.id]),
      people,
    });
  }
  return idx;
})();

// A film is "International" if its primary language isn't English — sourced
// from the baked-in languages.json. Also matches legacy category tags so
// Predicates imported from utils/filmAttributes so the Journey filter and
// the Film tab filter stay in sync.

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

// Runtime slider bounds in minutes. Default range = no restriction;
// films whose runtime hasn't been fetched yet always pass.
// Min 30 is below the catalog's shortest film (~44m) so default = no cutoff.
// Max 300 is treated as open-ended ("and up") so films > 5h still pass by default.
const RUNTIME_MIN = 30;
const RUNTIME_MAX = 300;
const RUNTIME_STEP = 5;

// Year slider bounds. 1920 covers the full catalog (earliest is 1923);
// upper bound is the current year so it doesn't need a yearly bump.
// Step 1 so users can pick a specific year if they want. Default = full range.
const YEAR_MIN = 1920;
const YEAR_MAX = new Date().getFullYear();
const YEAR_STEP = 1;

const DEFAULT_FILM_FILTERS = {
  yearRange: { min: YEAR_MIN, max: YEAR_MAX },
  // Additive attribute filter — any combination. Unchecked = no restriction.
  categories: { INT: false, ANIM: false, DOC: false, SILENT: false, BW: false },
  genres: Object.fromEntries(Object.keys(GENRE_LABELS).map(k => [k, true])),
  runtimeRange: { min: RUNTIME_MIN, max: RUNTIME_MAX },
  wins: Object.fromEntries(Object.keys(WIN_CATEGORIES).map(k => [k, false])),
  // Unified tier floor — applies to ALL films (not just essentials).
  // Tier uses the getTierInfo count, which folds OSCAR/OSCAR_NOM into the
  // canon-list count so Oscar films are part of the same ranking.
  minTier: 0,
  // Canon focus — mutually exclusive in the UI:
  //   oscarsOnly      → hide ESSENTIAL canon, leave BP / INT / ANIM
  //   essentialsOnly  → hide Oscar-eligible films, leave just non-Oscar canon
  oscarsOnly: false,
  essentialsOnly: false,
};

// Per-tier copy shown in the Canon depth section. Keys map to the 5-tier
// bucketed score (R2: NFR+AFI merged, OSCAR pip included, + curated overrides).
// Tier 0 is the "no canon floor" position — shows every film in the catalog.
const TIER_LEVELS = {
  0: { label: 'All films',  sub: 'No canon floor — every film in the catalog, including Oscar nominees with no canon-list endorsement.' },
  1: { label: 'Canonical',  sub: 'Present in the canon — at least one curated endorsement.' },
  2: { label: 'Acclaimed',  sub: 'Meets our multi-list entry threshold — validated by 2+ sources.' },
  3: { label: 'Landmark',   sub: 'Broad recognition across critics, institutions, and audience lists.' },
  4: { label: 'Masterwork', sub: 'Near-universal consensus across critical, institutional, and popular canon.' },
  5: { label: 'Apex',       sub: 'Summit canon — curated top tier whose inclusion on any serious must-watch list is essentially unavoidable.' },
};
const MIN_SLIDER_TIER = 0;
const MAX_SLIDER_TIER = 5;

function sortKeyFn(title) {
  return title.replace(/^(The|A|An)\s+/i, '').toLowerCase();
}

function formatRuntimeLabel(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}


export default function FilmList({ watchedTitleSet, onOpenDetail, onToggleWatched, ratings, raters, filterPreset, onFilterPresetApplied, checklistMode = false }) {
  const [query, setQuery] = useState('');
  // `watchMode` is a three-way enum: 'all' | 'watched' | 'unwatched'.
  // Watched-only and Unwatched-only are mutually exclusive — clicking one
  // deselects the other. Clicking the active pill again returns to 'all'.
  const [watchMode, setWatchMode] = useState('all');
  const watchedOnly   = watchMode === 'watched';
  const unwatchedOnly = watchMode === 'unwatched';
  // Sort controls: primary is mutually exclusive (name OR year), tier is an
  // independent outer dimension. When tier is on, films group by tier first,
  // then use primary as the in-tier tiebreak. Within name-primary the year is
  // the secondary tiebreak, and vice versa. Tapping the active chip flips
  // direction (asc ⇄ desc); switching chips resets to asc.
  const [sortPrimary, setSortPrimary] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [sortByTier, setSortByTier] = useState(false);

  const selectSortPrimary = (next) => {
    if (next === sortPrimary) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortPrimary(next);
      setSortDir('asc');
    }
  };
  const [filters, setFilters] = useState(DEFAULT_FILM_FILTERS);
  const [openSections, setOpenSections] = useState({ years: false, categories: false, canon: false, genres: false, runtimes: false, wins: false });
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

  const runtimeRangeActive = (
    filters.runtimeRange.min !== RUNTIME_MIN ||
    filters.runtimeRange.max !== RUNTIME_MAX
  );
  const yearRangeActive = (
    filters.yearRange.min !== YEAR_MIN ||
    filters.yearRange.max !== YEAR_MAX
  );

  const activeFilterCount = (() => {
    let n = 0;
    for (const section of ['categories', 'genres']) {
      const def = DEFAULT_FILM_FILTERS[section] || {};
      for (const [k, v] of Object.entries(filters[section])) {
        if (v !== def[k]) n++;
      }
    }
    // Wins defaults all OFF; each ON one counts as a user-applied filter.
    n += Object.values(filters.wins).filter(v => v).length;
    if (watchMode !== 'all') n++;
    if (runtimeRangeActive) n++;
    if (yearRangeActive) n++;
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
    const q = normalizeForSearch(query);
    // Search matches across title, director, and cast (baked into
    // directors.json / actors.json / cast.json) against a pre-normalized
    // index so punctuation, accents, and whitespace all collapse away —
    // "je tu il elle" finds "Je, Tu, Il, Elle".
    const matchesQuery = (m) => {
      if (!q) return true;
      const entry = SEARCH_INDEX.get(m.id);
      if (!entry) return false;
      return entry.title.includes(q) || entry.director.includes(q) || entry.people.includes(q);
    };
    const filtered = MOVIES
      .filter(matchesQuery)
      .filter(m => {
        if (watchedOnly) return watchedTitleSet.has(m.id);
        if (unwatchedOnly) return !watchedTitleSet.has(m.id);
        return true;
      })
      .filter(m => m.year >= filters.yearRange.min && m.year <= filters.yearRange.max)
      .filter(m => matchesCategoryFilter(m, filters.categories))
      // Canon depth + focus mode are bypassed when there's an active search — if you know
      // the film you want (e.g. "Matrix"), you shouldn't have to widen your curation to find it.
      // Tier applies UNIFORMLY to all films via the unified getTier helper, which counts
      // OSCAR / OSCAR_NOM as a canon-list entry for BP / INT / ANIM films.
      .filter(m => !!q || getTier(m) >= (filters.minTier ?? 0))
      .filter(m => !!q || !filters.oscarsOnly || m.category !== 'ESSENTIAL')
      .filter(m => !!q || !filters.essentialsOnly || m.category === 'ESSENTIAL')
      // OR-semantics over primary + altGenres: a film passes if ANY of its
      // genres is checked. Matches the multi-label reality — ticking "Comedy"
      // should surface The Great Dictator even when War stays unchecked.
      .filter(m => {
        const allGenres = [m.genre, ...(m.altGenres || [])];
        return allGenres.some(g => filters.genres[g] !== false);
      })
      .filter(m => {
        const mins = runtimeMap.get(m.id);
        // Films with no fetched runtime always pass — avoids hiding the long
        // tail while the OMDb prefetch is still in flight.
        if (mins == null) return true;
        const { min, max } = filters.runtimeRange;
        // Open-ended upper bound: at RUNTIME_MAX the slider means "and up".
        const passesUpper = max >= RUNTIME_MAX ? true : mins <= max;
        return mins >= min && passesUpper;
      })
      .filter(m => {
        if (activeWinKeys.length === 0) return true;
        return activeWinKeys.some(k => filmWonAward(m, k));
      });

    const nameTiebreak = (a, b) => {
      const r = sortKeyFn(a.title).localeCompare(sortKeyFn(b.title));
      return r !== 0 ? r : (a.year - b.year);
    };
    const yearTiebreak = (a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return sortKeyFn(a.title).localeCompare(sortKeyFn(b.title));
    };
    const basePrimary = sortPrimary === 'year' ? yearTiebreak : nameTiebreak;
    const dirMul = sortDir === 'desc' ? -1 : 1;
    const primaryCompare = (a, b) => basePrimary(a, b) * dirMul;
    const sorted = filtered.slice().sort((a, b) => {
      if (sortByTier) {
        const ta = getTier(a), tb = getTier(b);
        if (ta !== tb) return tb - ta;
      }
      return primaryCompare(a, b);
    });

    const watchedCount = sorted.filter(m => watchedTitleSet.has(m.id)).length;

    // Group headers follow the dominant sort: tier label when tier is on,
    // individual year when sorting by year, otherwise first-letter buckets.
    const groupKey = (m) => {
      if (sortByTier) return `tier-${getTier(m)}`;
      if (sortPrimary === 'year') return String(m.year);
      return sortKeyFn(m.title)[0].toUpperCase();
    };
    const groups = {};
    for (const m of sorted) {
      const k = groupKey(m);
      if (!groups[k]) groups[k] = [];
      groups[k].push(m);
    }

    return { filtered: sorted, groups, watchedCount };
  }, [query, watchedTitleSet, watchMode, filters, runtimeMap, activeWinKeys, sortPrimary, sortDir, sortByTier]);


  const setOnlyKey = (section, labels, onlyKey) => {
    const next = {};
    for (const k of Object.keys(labels)) next[k] = (k === onlyKey);
    setFilters(f => ({ ...f, [section]: next }));
  };

  // Per-option eligibility pool — used to hide rows where 0 films qualify
  // (e.g. the 1910s era when canon depth is set to ≥3). Counts are no longer
  // shown as suffixes per mayo's request; we only use this to drop empty rows.
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (getTier(m) < (filters.minTier ?? 0)) return false;
    if (filters.oscarsOnly && m.category === 'ESSENTIAL') return false;
    if (filters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [filters.minTier, filters.oscarsOnly, filters.essentialsOnly]);

  const categoryCounts = useMemo(() => {
    // Broad attribute predicates spanning ALL films (including essentials).
    const c = { INT: 0, ANIM: 0, DOC: 0, SILENT: 0, BW: 0 };
    for (const m of eligiblePool) {
      if (isInternational(m)) c.INT++;
      if (isAnimated(m)) c.ANIM++;
      if (isDocumentary(m)) c.DOC++;
      if (isSilent(m)) c.SILENT++;
      if (isBlackAndWhite(m)) c.BW++;
    }
    return c;
  }, [eligiblePool]);

  const genreCounts = useMemo(() => {
    // Count primary + altGenres — the sidebar number reads as "films tagged X,"
    // which exceeds the film total on a multi-label catalog (that's truthful,
    // not a bug).
    const c = {};
    for (const m of eligiblePool) {
      c[m.genre] = (c[m.genre] || 0) + 1;
      for (const g of (m.altGenres || [])) c[g] = (c[g] || 0) + 1;
    }
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
          : `Browse all ${MOVIES.length} films — every Best Picture nominee (1970+), every International Feature winner (1956+), every Animated Feature winner, plus 330 essential non-Oscar canon films.`}
      </p>

      <input
        className="list-search"
        type="search"
        placeholder="Search films, directors, cast..."
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Sort row — sits between search and filters.
          Primary sort (Name ⇄ Year) is mutually exclusive; Tier is an
          independent outer grouping modifier. */}
      <div className="film-list-sort-row">
        <div className="film-list-sort-group">
          <span className="film-list-sort-label">Sort by</span>
          <div className="film-list-sort-chips">
            <button
              type="button"
              className={`film-list-sort-chip ${sortPrimary === 'name' ? 'active' : ''}`}
              onClick={() => selectSortPrimary('name')}
              aria-pressed={sortPrimary === 'name'}
              title={sortPrimary === 'name' ? 'Tap again to reverse (Z → A)' : 'Sort A → Z'}
            >
              Name
              {sortPrimary === 'name' && (
                <span className="film-list-sort-dir" aria-hidden="true">
                  {sortDir === 'asc' ? '↓' : '↑'}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`film-list-sort-chip ${sortPrimary === 'year' ? 'active' : ''}`}
              onClick={() => selectSortPrimary('year')}
              aria-pressed={sortPrimary === 'year'}
              title={sortPrimary === 'year' ? 'Tap again to reverse (newest first)' : 'Sort oldest → newest'}
            >
              Year
              {sortPrimary === 'year' && (
                <span className="film-list-sort-dir" aria-hidden="true">
                  {sortDir === 'asc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            className={`film-list-tier-toggle ${sortByTier ? 'active' : ''}`}
            onClick={() => setSortByTier(v => !v)}
            aria-pressed={sortByTier}
            title="Group results by tier (Apex → Canonical). Combines with Name/Year as the in-tier tiebreak."
          >
            <span className="film-list-tier-toggle-check">{sortByTier ? '✓' : '+'}</span>
            <span>Tier</span>
          </button>
        </div>
      </div>

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
                  if (filters.minTier > 0) parts.push(`tier ≥${filters.minTier}`);
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
                  <div className={`tier-stepper ${
                    filters.minTier === 5 ? 'tier-stepper-apex'
                    : filters.minTier === 4 ? 'tier-stepper-masterwork'
                    : filters.minTier === 3 ? 'tier-stepper-landmark'
                    : ''
                  }`}>
                    <div className="tier-stepper-header">
                      <span className="tier-stepper-title">Minimum tier</span>
                      <div className="tier-stepper-controls">
                        <button
                          type="button"
                          className="tier-stepper-btn"
                          onClick={() => setFilters(f => ({ ...f, minTier: Math.max(MIN_SLIDER_TIER, (f.minTier ?? 0) - 1) }))}
                          disabled={filters.minTier <= MIN_SLIDER_TIER}
                          aria-label="Lower minimum tier"
                        >−</button>
                        <span className="tier-stepper-value">
                          {filters.minTier === MAX_SLIDER_TIER ? filters.minTier : filters.minTier === 0 ? '—' : `≥ ${filters.minTier}`}
                        </span>
                        <button
                          type="button"
                          className="tier-stepper-btn"
                          onClick={() => setFilters(f => ({ ...f, minTier: Math.min(MAX_SLIDER_TIER, (f.minTier ?? 0) + 1) }))}
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

            {/* Year range — dual-thumb slider (1920..2025). Mirrors the Length
                slider pattern: two overlapping native ranges for mobile touch. */}
            <div className="filter-section">
              <button className="filter-section-toggle" onClick={() => toggleSection('years')}>
                <span className="filter-section-arrow">{openSections.years ? '▾' : '▸'}</span>
                <span className="filter-section-label">Years</span>
                {yearRangeActive && (
                  <span className="filter-section-count">
                    {filters.yearRange.min}–{filters.yearRange.max}
                  </span>
                )}
              </button>
              {openSections.years && (
                <div className="runtime-slider">
                  <div className="runtime-slider-values">
                    <span className="runtime-slider-value">{filters.yearRange.min}</span>
                    <span className="runtime-slider-sep">–</span>
                    <span className="runtime-slider-value">{filters.yearRange.max}</span>
                  </div>
                  <div className="runtime-slider-track-wrap">
                    <div className="runtime-slider-track" />
                    <div
                      className="runtime-slider-range"
                      style={{
                        left: `${((filters.yearRange.min - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%`,
                        right: `${((YEAR_MAX - filters.yearRange.max) / (YEAR_MAX - YEAR_MIN)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      className="runtime-slider-input runtime-slider-input-min"
                      min={YEAR_MIN}
                      max={YEAR_MAX}
                      step={YEAR_STEP}
                      value={filters.yearRange.min}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value), filters.yearRange.max - YEAR_STEP);
                        setFilters(f => ({ ...f, yearRange: { ...f.yearRange, min: v } }));
                      }}
                      aria-label="Earliest year"
                    />
                    <input
                      type="range"
                      className="runtime-slider-input runtime-slider-input-max"
                      min={YEAR_MIN}
                      max={YEAR_MAX}
                      step={YEAR_STEP}
                      value={filters.yearRange.max}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value), filters.yearRange.min + YEAR_STEP);
                        setFilters(f => ({ ...f, yearRange: { ...f.yearRange, max: v } }));
                      }}
                      aria-label="Latest year"
                    />
                  </div>
                  <div className="runtime-slider-axis">
                    <span>{YEAR_MIN}</span>
                    <span>{YEAR_MAX}</span>
                  </div>
                </div>
              )}
            </div>

            {renderSection('Genres', 'genres', GENRE_LABELS, genreCounts)}

            {/* Length — dual-thumb range slider (min, max) in minutes.
                Two overlaid native <input type="range"> for mobile touch support.
                At RUNTIME_MAX the upper bound is open-ended ("and up"). */}
            <div className="filter-section">
              <button className="filter-section-toggle" onClick={() => toggleSection('runtimes')}>
                <span className="filter-section-arrow">{openSections.runtimes ? '▾' : '▸'}</span>
                <span className="filter-section-label">Length</span>
                {runtimeRangeActive && (
                  <span className="filter-section-count">
                    {formatRuntimeLabel(filters.runtimeRange.min)}–
                    {filters.runtimeRange.max >= RUNTIME_MAX ? '∞' : formatRuntimeLabel(filters.runtimeRange.max)}
                  </span>
                )}
              </button>
              {openSections.runtimes && (
                <div className="runtime-slider">
                  <div className="runtime-slider-values">
                    <span className="runtime-slider-value">{formatRuntimeLabel(filters.runtimeRange.min)}</span>
                    <span className="runtime-slider-sep">–</span>
                    <span className="runtime-slider-value">
                      {filters.runtimeRange.max >= RUNTIME_MAX ? `${formatRuntimeLabel(RUNTIME_MAX)}+` : formatRuntimeLabel(filters.runtimeRange.max)}
                    </span>
                  </div>
                  <div className="runtime-slider-track-wrap">
                    <div className="runtime-slider-track" />
                    <div
                      className="runtime-slider-range"
                      style={{
                        left: `${((filters.runtimeRange.min - RUNTIME_MIN) / (RUNTIME_MAX - RUNTIME_MIN)) * 100}%`,
                        right: `${((RUNTIME_MAX - filters.runtimeRange.max) / (RUNTIME_MAX - RUNTIME_MIN)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      className="runtime-slider-input runtime-slider-input-min"
                      min={RUNTIME_MIN}
                      max={RUNTIME_MAX}
                      step={RUNTIME_STEP}
                      value={filters.runtimeRange.min}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value), filters.runtimeRange.max - RUNTIME_STEP);
                        setFilters(f => ({ ...f, runtimeRange: { ...f.runtimeRange, min: v } }));
                      }}
                      aria-label="Minimum runtime"
                    />
                    <input
                      type="range"
                      className="runtime-slider-input runtime-slider-input-max"
                      min={RUNTIME_MIN}
                      max={RUNTIME_MAX}
                      step={RUNTIME_STEP}
                      value={filters.runtimeRange.max}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value), filters.runtimeRange.min + RUNTIME_STEP);
                        setFilters(f => ({ ...f, runtimeRange: { ...f.runtimeRange, max: v } }));
                      }}
                      aria-label="Maximum runtime"
                    />
                  </div>
                  <div className="runtime-slider-axis">
                    <span>{formatRuntimeLabel(RUNTIME_MIN)}</span>
                    <span>{formatRuntimeLabel(RUNTIME_MAX)}+</span>
                  </div>
                </div>
              )}
            </div>

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
            // Sort depends on the active grouping mode. Tier grouping is
            // always high-to-low regardless of sortDir (tier is its own axis);
            // name/year group order honors sortDir so a Z→A sort shows the Z
            // group at the top.
            if (sortByTier) {
              const ta = Number(a.replace('tier-', ''));
              const tb = Number(b.replace('tier-', ''));
              return tb - ta;
            }
            const dirMul = sortDir === 'desc' ? -1 : 1;
            if (sortPrimary === 'year') {
              return (Number(a) - Number(b)) * dirMul;
            }
            // Letter groups: A-Z before digits (so "2001" lands at the bottom).
            const aIsDigit = /^[0-9]/.test(a);
            const bIsDigit = /^[0-9]/.test(b);
            if (aIsDigit !== bIsDigit) return (aIsDigit ? 1 : -1) * dirMul;
            return a.localeCompare(b) * dirMul;
          }).map(groupId => {
            const headerLabel = sortByTier
              ? (TIER_LEVELS[Number(groupId.replace('tier-', ''))]?.label || groupId)
              : groupId;
            return (
            <div className="letter-group" key={groupId}>
              <div className="letter-header">{headerLabel}</div>
              {groups[groupId].map(m => {
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
                    {OPTION_A_LAYOUT ? (
                      <span className="film-row-title-group">
                        <span className="film-row-title film-row-title-inline">{m.title}</span>
                        <span className="film-row-awards">
                          {getOscarBadges(m).map(k => (
                            <OscarIcon key={k} movie={m} kind={k} size="sm" />
                          ))}
                          <LanguageFlag movie={m} />
                        </span>
                      </span>
                    ) : (
                      <span className="film-row-title">{m.title}</span>
                    )}
                    <MovieBadges movie={m} small excludeOscars={OPTION_A_LAYOUT} />
                    <span className="film-row-year">{m.year}</span>
                  </div>
                );
              })}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
