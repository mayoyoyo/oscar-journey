import React, { useState, useMemo } from 'react';
import { MOVIES } from '../data/movies';
import { DEFAULT_FILTERS, CATEGORY_LABELS, GENRE_LABELS, SMART_LABELS,
         JOURNEY_YEAR_MIN, JOURNEY_YEAR_MAX, JOURNEY_RUNTIME_MIN, JOURNEY_RUNTIME_MAX } from './SettingsModal';
import { readCachedRuntime } from '../utils/runtime';
import { getTier } from '../utils/tierInfo';
import { isInternational, isAnimated, isDocumentary, isSilent, isBlackAndWhite } from '../utils/filmAttributes';

const YEAR_STEP = 1;
const RUNTIME_STEP = 5;

function formatRuntimeLabel(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Per-tier copy shown in the Canon depth stepper. Mirrors the Film tab's
// TIER_LEVELS so both surfaces describe the canon threshold identically.
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

export default function JourneyControls({ filters, onFiltersChange, onReshuffle, eligibleCount, totalCount, profiles, currentProfileId, onSyncJourney, syncedWith, onUnsync }) {
  const [syncTarget, setSyncTarget] = useState('');
  const [openSections, setOpenSections] = useState({ smart: false, years: false, categories: false, canon: false, genres: false, runtimes: false });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Migrate legacy shape (minEssentialTier / old essentialsOnly-hides-Oscars semantic)
  // into the unified tier + oscarsOnly / essentialsOnly shape. Done at read time so
  // existing profiles display correctly before their next save overwrites the keys.
  const legacyTier = filters?.minEssentialTier;
  const migratedMinTier = filters?.minTier
    ?? (legacyTier === 99 ? 1 : legacyTier ?? DEFAULT_FILTERS.minTier);
  const migratedOscarsOnly = filters?.oscarsOnly ?? (legacyTier === 99) ?? DEFAULT_FILTERS.oscarsOnly;

  const currentFilters = {
    yearRange: { ...DEFAULT_FILTERS.yearRange, ...(filters?.yearRange || {}) },
    // Drop stale ESSENTIAL key from saved profiles — Categories no longer governs it.
    categories: (() => {
      const merged = { ...DEFAULT_FILTERS.categories, ...(filters?.categories || {}) };
      delete merged.ESSENTIAL;
      return merged;
    })(),
    categoriesExcluded: { ...DEFAULT_FILTERS.categoriesExcluded, ...(filters?.categoriesExcluded || {}) },
    genres: { ...DEFAULT_FILTERS.genres, ...(filters?.genres || {}) },
    genresExcluded: { ...DEFAULT_FILTERS.genresExcluded, ...(filters?.genresExcluded || {}) },
    runtimeRange: { ...DEFAULT_FILTERS.runtimeRange, ...(filters?.runtimeRange || {}) },
    minTier: migratedMinTier,
    oscarsOnly: migratedOscarsOnly,
    essentialsOnly: filters?.essentialsOnly ?? DEFAULT_FILTERS.essentialsOnly,
    smart: { ...DEFAULT_FILTERS.smart, ...(filters?.smart || {}) },
  };

  // Range helpers — one "active" count per slider when it diverges from default.
  const yearRangeActive =
    currentFilters.yearRange.min !== DEFAULT_FILTERS.yearRange.min ||
    currentFilters.yearRange.max !== DEFAULT_FILTERS.yearRange.max;
  const runtimeRangeActive =
    currentFilters.runtimeRange.min !== DEFAULT_FILTERS.runtimeRange.min ||
    currentFilters.runtimeRange.max !== DEFAULT_FILTERS.runtimeRange.max;

  // Total count of "non-default" filter selections — shown in the collapsed header.
  // Only count deviations from DEFAULT_FILTERS. Includes both the include and
  // exclude maps so excluded rows count toward the active-filter badge.
  const activeFilterCount = (() => {
    let n = 0;
    for (const section of ['categories', 'genres', 'categoriesExcluded', 'genresExcluded']) {
      const def = DEFAULT_FILTERS[section] || {};
      for (const [k, v] of Object.entries(currentFilters[section])) {
        if (v !== def[k]) n++;
      }
    }
    if (yearRangeActive) n++;
    if (runtimeRangeActive) n++;
    for (const [k, v] of Object.entries(currentFilters.smart)) {
      if (v !== (DEFAULT_FILTERS.smart[k] ?? false)) n++;
    }
    if (currentFilters.minTier !== DEFAULT_FILTERS.minTier) n++;
    if (currentFilters.oscarsOnly !== DEFAULT_FILTERS.oscarsOnly) n++;
    if (currentFilters.essentialsOnly !== DEFAULT_FILTERS.essentialsOnly) n++;
    return n;
  })();

  // Section name -> its paired exclude-map key. Toggling an exclude on a row
  // also clears that row's include entry, so a row is always in exactly one
  // of {included, neutral, excluded}. The two maps are mutually exclusive
  // per row by construction.
  const EXCLUDE_KEY = { categories: 'categoriesExcluded', genres: 'genresExcluded' };

  const toggleFilter = (section, key) => {
    const nextSection = { ...currentFilters[section], [key]: !currentFilters[section][key] };
    // "smart" filters default all OFF (each is an opt-in flag), so empty is valid there.
    // For categories: empty = "no restriction" (pass-all), so do NOT auto-restore.
    // For genres: empty = nothing matches — auto-restore all keys to true when
    // the user unchecks the last active one.
    if (section === 'genres' && !Object.values(nextSection).some(Boolean)) {
      for (const k of Object.keys(nextSection)) nextSection[k] = true;
    }
    // Toggling include also clears any exclusion on the same row — the two
    // maps are mutually exclusive per row.
    const excludeSection = EXCLUDE_KEY[section];
    const patch = { ...currentFilters, [section]: nextSection };
    if (excludeSection && currentFilters[excludeSection][key]) {
      patch[excludeSection] = { ...currentFilters[excludeSection], [key]: false };
    }
    onFiltersChange(patch);
  };

  const toggleExclude = (section, key) => {
    const excludeSection = EXCLUDE_KEY[section];
    if (!excludeSection) return;
    const wasExcluded = !!currentFilters[excludeSection][key];
    const nextExcluded = { ...currentFilters[excludeSection], [key]: !wasExcluded };
    const nextInclude = { ...currentFilters[section] };
    if (!wasExcluded) {
      // Flipping ON exclude — drop any include on the same row.
      // For Genres (default = all true), unchecking the include row is the
      // natural pair. For Categories (default = all false), it's a no-op.
      nextInclude[key] = false;
      // Categories empty-restore safety: do nothing here (empty = pass-all).
      // Genres empty-restore safety: if user excludes everything, leave the
      // include map alone so any non-excluded film still passes through.
    }
    onFiltersChange({
      ...currentFilters,
      [section]: nextInclude,
      [excludeSection]: nextExcluded,
    });
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetFilters = () => {
    onFiltersChange({ ...DEFAULT_FILTERS });
  };

  const handleReshuffle = () => {
    if (window.confirm('Reshuffle your journey order? Your watched films and ratings will be kept, but you\'ll get a completely new random order.' + (syncedWith ? ' This will also unsync you from the profile you\'re following.' : ''))) {
      onReshuffle();
    }
  };

  const sectionCount = (section) => {
    const cur = currentFilters[section];
    const def = DEFAULT_FILTERS[section] || {};
    const entries = Object.entries(cur);
    const active = entries.filter(([, v]) => v).length;
    if (section === 'smart') {
      // For smart filters, show count of enabled ones (they're off by default)
      return active > 0 ? `${active} on` : null;
    }
    // Append `· N excl` when any rows in this section are excluded so a
    // collapsed section telegraphs the exclusion state.
    const excludeSection = EXCLUDE_KEY[section];
    const excludedCount = excludeSection
      ? Object.values(currentFilters[excludeSection] || {}).filter(Boolean).length
      : 0;
    const matchesDefault = entries.every(([k, v]) => v === def[k]);
    if (matchesDefault && excludedCount === 0) return null;
    const main = matchesDefault ? null : `${active}/${entries.length}`;
    if (excludedCount === 0) return main;
    const excl = `${excludedCount} excl`;
    return main ? `${main} · ${excl}` : excl;
  };

  // Per-option eligibility pool based on unified tier + focus mode. Used to hide
  // rows that would match zero films (e.g. 1910s when tier ≥ 5).
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (getTier(m) < (currentFilters.minTier ?? 0)) return false;
    if (currentFilters.oscarsOnly && m.category === 'ESSENTIAL') return false;
    if (currentFilters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [currentFilters.minTier, currentFilters.oscarsOnly, currentFilters.essentialsOnly]);

  // Use the predicate functions (same as FilmList) so DOC/SILENT/BW rows show
  // counts > 0 — those keys never appear in m.category or m.alsoWon, so a
  // raw category-field count would render them as 0 and `renderChecklist`
  // would hide the rows entirely.
  const categoryCounts = useMemo(() => {
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
    // Count primary + altGenres to stay consistent with the OR-semantics of
    // the genre filter.
    const c = {};
    for (const m of eligiblePool) {
      c[m.genre] = (c[m.genre] || 0) + 1;
      for (const g of (m.altGenres || [])) c[g] = (c[g] || 0) + 1;
    }
    return c;
  }, [eligiblePool]);

  const renderChecklist = (section, labels, counts) => {
    const excludeSection = EXCLUDE_KEY[section];
    return (
      <div className="filter-checklist">
        {Object.entries(labels).map(([key, label]) => {
          // Hide rows that have zero matching films at the current canon settings.
          if (counts && (counts[key] || 0) === 0) return null;
          const active = currentFilters[section][key];
          const excluded = excludeSection ? !!currentFilters[excludeSection][key] : false;
          return (
            <div key={key}
              className={`filter-check-item ${active ? 'active' : ''} ${excluded ? 'excluded' : ''}`}
              onClick={() => toggleFilter(section, key)}>
              <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
              <span className="filter-check-label">{label}</span>
              {/* "excl" toggle — only on sections that support exclusion (categories, genres).
                  Smart filters are independent opt-in flags so exclusion is meaningless there. */}
              {excludeSection && (
                <button
                  type="button"
                  className={`filter-excl-btn ${excluded ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleExclude(section, key); }}
                  title={excluded ? `Stop excluding ${label}` : `Exclude ${label}`}
                  aria-pressed={excluded}
                >
                  excl
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (key, label, section, labels, counts) => {
    const count = sectionCount(section);
    const isOpen = openSections[section];
    return (
      <div className="filter-section" key={key}>
        <button className="filter-section-toggle" onClick={() => toggleSection(section)}>
          <span className="filter-section-arrow">{isOpen ? '▾' : '▸'}</span>
          <span className="filter-section-label">{label}</span>
          {count && <span className="filter-section-count">{count}</span>}
        </button>
        {isOpen && renderChecklist(section, labels, counts)}
      </div>
    );
  };

  // Compact summary chips of what's been narrowed — shown next to the collapsed Filters header.
  // Each chip describes one customized facet (era subset, genre subset, canon mode, etc.).
  const filterChips = useMemo(() => {
    const chips = [];

    // Smart filters (each enabled flag becomes its own chip)
    for (const [k, v] of Object.entries(currentFilters.smart)) {
      if (v) chips.push(SMART_LABELS[k] || k);
    }

    // Generic helper for set-based filters (eras / categories / genres / runtimes).
    // Skips the chip when the user hasn't diverged from DEFAULT_FILTERS — otherwise
    // partially-default filters (like pre-1970s off by default) would always chip.
    const summarize = (key, labelMap, sectionLabel) => {
      const entries = Object.entries(currentFilters[key]);
      const def = DEFAULT_FILTERS[key] || {};
      const matchesDefault = entries.every(([k, v]) => v === def[k]);
      if (matchesDefault) return;
      const active = entries.filter(([, v]) => v);
      const inactive = entries.filter(([, v]) => !v);
      if (active.length === 0) return;
      if (active.length <= 3) {
        chips.push(`${sectionLabel}: ${active.map(([k]) => labelMap[k] || k).join(', ')}`);
      } else if (inactive.length <= 2) {
        chips.push(`${sectionLabel}: not ${inactive.map(([k]) => labelMap[k] || k).join(', ')}`);
      } else {
        chips.push(`${sectionLabel}: ${active.length}/${entries.length}`);
      }
    };
    if (yearRangeActive) {
      chips.push(`Years: ${currentFilters.yearRange.min}–${currentFilters.yearRange.max}`);
    }
    summarize('categories', CATEGORY_LABELS, 'Categories');
    summarize('genres', GENRE_LABELS, 'Genres');

    // Exclusion chips — one per section that has any excluded rows.
    const summarizeExcluded = (excludeKey, labelMap, sectionLabel) => {
      const excluded = Object.entries(currentFilters[excludeKey] || {})
        .filter(([, v]) => v)
        .map(([k]) => labelMap[k] || k);
      if (excluded.length === 0) return;
      chips.push(`${sectionLabel} excl: ${excluded.join(', ')}`);
    };
    summarizeExcluded('categoriesExcluded', CATEGORY_LABELS, 'Categories');
    summarizeExcluded('genresExcluded', GENRE_LABELS, 'Genres');

    if (runtimeRangeActive) {
      const lo = formatRuntimeLabel(currentFilters.runtimeRange.min);
      const hi = currentFilters.runtimeRange.max >= JOURNEY_RUNTIME_MAX
        ? `${formatRuntimeLabel(JOURNEY_RUNTIME_MAX)}+`
        : formatRuntimeLabel(currentFilters.runtimeRange.max);
      chips.push(`Runtime: ${lo}–${hi}`);
    }

    if (currentFilters.oscarsOnly) chips.push('Oscars only');
    if (currentFilters.essentialsOnly) chips.push('Essentials only');
    if (currentFilters.minTier > 0) chips.push(`Tier ≥${currentFilters.minTier}`);

    return chips;
  }, [currentFilters]);

  // Find synced profile name
  const syncedProfile = syncedWith ? profiles?.find(p => p.id === syncedWith) : null;

  return (
    <>
    <div className="journey-controls">
      {/* Sync banner */}
      {syncedProfile && (
        <div className="sync-banner">
          <span>🔗 Following <strong>{syncedProfile.avatar} {syncedProfile.displayName}</strong>'s order{eligibleCount < totalCount ? ' (filtered)' : ''}</span>
          <button className="sync-unsync-btn" onClick={() => {
            if (window.confirm('Stop following this journey? Your current position and progress will be kept, but you\'ll no longer sync with them.')) {
              onUnsync();
            }
          }}>Unsync</button>
        </div>
      )}

      <div className="journey-controls-row">
        <div className={`journey-filters-collapsible ${filtersOpen ? 'is-open' : 'is-closed'}`} style={{ flex: 1, minWidth: 0 }}>
          <button className="journey-filters-header" onClick={() => setFiltersOpen(o => !o)}>
            <span className="journey-filters-arrow">{filtersOpen ? '▾' : '▸'}</span>
            <span className="journey-controls-header" style={{ margin: 0 }}>Filters</span>
            {eligibleCount > 0 && (
              <span className="journey-filter-count" title={`${eligibleCount} of ${totalCount} films in your catalog`}>
                {eligibleCount} film{eligibleCount === 1 ? '' : 's'}
              </span>
            )}
            {!filtersOpen && filterChips.length > 0 && (
              <span className="journey-filter-chips">
                {filterChips.map((c, i) => (
                  <span key={i} className="journey-filter-chip">{c}</span>
                ))}
              </span>
            )}
            {/* Compact count badge: shown when filters are open (any width) OR
                when closed on narrow mobile where the verbose chips would wrap
                and bleed. Desktop keeps chips-only when closed. */}
            {!filtersOpen && activeFilterCount > 0 && (
              <span className="journey-filters-active journey-filters-active-mobile">{activeFilterCount} active</span>
            )}
            {filtersOpen && activeFilterCount > 0 && (
              <span className="journey-filters-active">{activeFilterCount} active</span>
            )}
            {/* Reset chip — inline in header whenever any filter is customized,
                matching the Film tab's behavior. Stop propagation so it doesn't
                toggle the collapsible. */}
            {activeFilterCount > 0 && (
              <span
                className="film-list-filter-reset"
                role="button"
                onClick={(e) => { e.stopPropagation(); resetFilters(); }}
              >Reset</span>
            )}
          </button>
          {filtersOpen && (
            <div className="journey-filters-body">
              {/* Canon depth — two independent controls mirroring the Film tab:
                    (1) Oscars-only toggle: hide ESSENTIAL canon films
                    (2) Minimum tier +/- stepper (1..7) applied to ALL films
                        via getTier() (OSCAR / OSCAR_NOM counts as a canon list). */}
              <div className="filter-section">
                <button className="filter-section-toggle" onClick={() => toggleSection('canon')}>
                  <span className="filter-section-arrow">{openSections.canon ? '▾' : '▸'}</span>
                  <span className="filter-section-label">Canon depth</span>
                  {(() => {
                    const parts = [];
                    if (currentFilters.oscarsOnly) parts.push('Oscars only');
                    if (currentFilters.essentialsOnly) parts.push('Essentials only');
                    if (currentFilters.minTier > 0) parts.push(`tier ≥${currentFilters.minTier}`);
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
                      className={`essentials-only-toggle ${currentFilters.oscarsOnly ? 'active' : ''}`}
                      onClick={() => onFiltersChange({
                        ...currentFilters,
                        oscarsOnly: !currentFilters.oscarsOnly,
                        essentialsOnly: false,
                      })}
                      aria-pressed={currentFilters.oscarsOnly}
                    >
                      <span className="essentials-only-checkbox">{currentFilters.oscarsOnly ? '\u2713' : ''}</span>
                      <span className="essentials-only-label">
                        <strong>Oscars only</strong>
                        <span className="essentials-only-sub">
                          Hide canon-only essentials — show just BP nominees and Int/Anim winners.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`essentials-only-toggle ${currentFilters.essentialsOnly ? 'active' : ''}`}
                      onClick={() => onFiltersChange({
                        ...currentFilters,
                        essentialsOnly: !currentFilters.essentialsOnly,
                        oscarsOnly: false,
                      })}
                      aria-pressed={currentFilters.essentialsOnly}
                    >
                      <span className="essentials-only-checkbox">{currentFilters.essentialsOnly ? '\u2713' : ''}</span>
                      <span className="essentials-only-label">
                        <strong>Essentials only</strong>
                        <span className="essentials-only-sub">
                          Hide Oscar-eligible films — show just the non-Oscar canon.
                        </span>
                      </span>
                    </button>

                    {/* Minimum tier +/- stepper */}
                    <div className={`tier-stepper ${
                      currentFilters.minTier === 5 ? 'tier-stepper-apex'
                      : currentFilters.minTier === 4 ? 'tier-stepper-masterwork'
                      : currentFilters.minTier === 3 ? 'tier-stepper-landmark'
                      : ''
                    }`}>
                      <div className="tier-stepper-header">
                        <span className="tier-stepper-title">Minimum tier</span>
                        <div className="tier-stepper-controls">
                          <button
                            type="button"
                            className="tier-stepper-btn"
                            onClick={() => onFiltersChange({ ...currentFilters, minTier: Math.max(MIN_SLIDER_TIER, (currentFilters.minTier ?? 0) - 1) })}
                            disabled={currentFilters.minTier <= MIN_SLIDER_TIER}
                            aria-label="Lower minimum tier"
                          >−</button>
                          <span className="tier-stepper-value">
                            {currentFilters.minTier === MAX_SLIDER_TIER ? currentFilters.minTier : currentFilters.minTier === 0 ? '—' : `≥ ${currentFilters.minTier}`}
                          </span>
                          <button
                            type="button"
                            className="tier-stepper-btn"
                            onClick={() => onFiltersChange({ ...currentFilters, minTier: Math.min(MAX_SLIDER_TIER, (currentFilters.minTier ?? 0) + 1) })}
                            disabled={currentFilters.minTier >= MAX_SLIDER_TIER}
                            aria-label="Raise minimum tier"
                          >+</button>
                        </div>
                      </div>
                      <div className="tier-stepper-desc">
                        <strong>{TIER_LEVELS[currentFilters.minTier]?.label}</strong>
                        <span>{TIER_LEVELS[currentFilters.minTier]?.sub}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {renderSection('cats', 'Categories', 'categories', CATEGORY_LABELS, categoryCounts)}

              {/* Years — dual-thumb range slider (JOURNEY_YEAR_MIN..current).
                  Mirrors the Film tab's Years slider for UI parity. */}
              <div className="filter-section">
                <button className="filter-section-toggle" onClick={() => toggleSection('years')}>
                  <span className="filter-section-arrow">{openSections.years ? '▾' : '▸'}</span>
                  <span className="filter-section-label">Years</span>
                  {yearRangeActive && (
                    <span className="filter-section-count">
                      {currentFilters.yearRange.min}–{currentFilters.yearRange.max}
                    </span>
                  )}
                </button>
                {openSections.years && (
                  <div className="runtime-slider">
                    <div className="runtime-slider-values">
                      <span className="runtime-slider-value">{currentFilters.yearRange.min}</span>
                      <span className="runtime-slider-sep">–</span>
                      <span className="runtime-slider-value">{currentFilters.yearRange.max}</span>
                    </div>
                    <div className="runtime-slider-track-wrap">
                      <div className="runtime-slider-track" />
                      <div
                        className="runtime-slider-range"
                        style={{
                          left: `${((currentFilters.yearRange.min - JOURNEY_YEAR_MIN) / (JOURNEY_YEAR_MAX - JOURNEY_YEAR_MIN)) * 100}%`,
                          right: `${((JOURNEY_YEAR_MAX - currentFilters.yearRange.max) / (JOURNEY_YEAR_MAX - JOURNEY_YEAR_MIN)) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        className="runtime-slider-input runtime-slider-input-min"
                        min={JOURNEY_YEAR_MIN}
                        max={JOURNEY_YEAR_MAX}
                        step={YEAR_STEP}
                        value={currentFilters.yearRange.min}
                        onChange={e => {
                          const v = Math.min(Number(e.target.value), currentFilters.yearRange.max - YEAR_STEP);
                          onFiltersChange({ ...currentFilters, yearRange: { ...currentFilters.yearRange, min: v } });
                        }}
                        aria-label="Earliest year"
                      />
                      <input
                        type="range"
                        className="runtime-slider-input runtime-slider-input-max"
                        min={JOURNEY_YEAR_MIN}
                        max={JOURNEY_YEAR_MAX}
                        step={YEAR_STEP}
                        value={currentFilters.yearRange.max}
                        onChange={e => {
                          const v = Math.max(Number(e.target.value), currentFilters.yearRange.min + YEAR_STEP);
                          onFiltersChange({ ...currentFilters, yearRange: { ...currentFilters.yearRange, max: v } });
                        }}
                        aria-label="Latest year"
                      />
                    </div>
                    <div className="runtime-slider-axis">
                      <span>{JOURNEY_YEAR_MIN}</span>
                      <span>{JOURNEY_YEAR_MAX}</span>
                    </div>
                  </div>
                )}
              </div>

              {renderSection('genres', 'Genres', 'genres', GENRE_LABELS, genreCounts)}

              {/* Runtime — dual-thumb range slider. Open-ended at upper bound. */}
              <div className="filter-section">
                <button className="filter-section-toggle" onClick={() => toggleSection('runtimes')}>
                  <span className="filter-section-arrow">{openSections.runtimes ? '▾' : '▸'}</span>
                  <span className="filter-section-label">Runtime</span>
                  {runtimeRangeActive && (
                    <span className="filter-section-count">
                      {formatRuntimeLabel(currentFilters.runtimeRange.min)}–
                      {currentFilters.runtimeRange.max >= JOURNEY_RUNTIME_MAX ? '∞' : formatRuntimeLabel(currentFilters.runtimeRange.max)}
                    </span>
                  )}
                </button>
                {openSections.runtimes && (
                  <div className="runtime-slider">
                    <div className="runtime-slider-values">
                      <span className="runtime-slider-value">{formatRuntimeLabel(currentFilters.runtimeRange.min)}</span>
                      <span className="runtime-slider-sep">–</span>
                      <span className="runtime-slider-value">
                        {currentFilters.runtimeRange.max >= JOURNEY_RUNTIME_MAX
                          ? `${formatRuntimeLabel(JOURNEY_RUNTIME_MAX)}+`
                          : formatRuntimeLabel(currentFilters.runtimeRange.max)}
                      </span>
                    </div>
                    <div className="runtime-slider-track-wrap">
                      <div className="runtime-slider-track" />
                      <div
                        className="runtime-slider-range"
                        style={{
                          left: `${((currentFilters.runtimeRange.min - JOURNEY_RUNTIME_MIN) / (JOURNEY_RUNTIME_MAX - JOURNEY_RUNTIME_MIN)) * 100}%`,
                          right: `${((JOURNEY_RUNTIME_MAX - currentFilters.runtimeRange.max) / (JOURNEY_RUNTIME_MAX - JOURNEY_RUNTIME_MIN)) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        className="runtime-slider-input runtime-slider-input-min"
                        min={JOURNEY_RUNTIME_MIN}
                        max={JOURNEY_RUNTIME_MAX}
                        step={RUNTIME_STEP}
                        value={currentFilters.runtimeRange.min}
                        onChange={e => {
                          const v = Math.min(Number(e.target.value), currentFilters.runtimeRange.max - RUNTIME_STEP);
                          onFiltersChange({ ...currentFilters, runtimeRange: { ...currentFilters.runtimeRange, min: v } });
                        }}
                        aria-label="Minimum runtime"
                      />
                      <input
                        type="range"
                        className="runtime-slider-input runtime-slider-input-max"
                        min={JOURNEY_RUNTIME_MIN}
                        max={JOURNEY_RUNTIME_MAX}
                        step={RUNTIME_STEP}
                        value={currentFilters.runtimeRange.max}
                        onChange={e => {
                          const v = Math.max(Number(e.target.value), currentFilters.runtimeRange.min + RUNTIME_STEP);
                          onFiltersChange({ ...currentFilters, runtimeRange: { ...currentFilters.runtimeRange, max: v } });
                        }}
                        aria-label="Maximum runtime"
                      />
                    </div>
                    <div className="runtime-slider-axis">
                      <span>{formatRuntimeLabel(JOURNEY_RUNTIME_MIN)}</span>
                      <span>{formatRuntimeLabel(JOURNEY_RUNTIME_MAX)}+</span>
                    </div>
                  </div>
                )}
              </div>

              {renderSection('smart', 'Smart Filters', 'smart', SMART_LABELS)}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Permanent action row OUTSIDE the Filters box: Sync dropdown → Sync btn →
        Reshuffle. Rendered as a sibling of .journey-controls so the background
        box ends at Filters and these controls sit on the page surface below. */}
    <div className="journey-controls-actions">
      {profiles && profiles.length > 0 && onSyncJourney && !syncedWith && (
        <>
          <select
            className="journey-sync-select"
            value={syncTarget}
            onChange={e => setSyncTarget(e.target.value)}
          >
            <option value="">Sync with...</option>
            {profiles.filter(p => p.id !== currentProfileId).map(p => (
              <option key={p.id} value={p.id}>{p.avatar} {p.displayName}</option>
            ))}
          </select>
          <button
            className="journey-sync-btn"
            disabled={!syncTarget}
            onClick={() => {
              const target = profiles.find(p => p.id === syncTarget);
              if (target && window.confirm(
                `Sync with ${target.displayName}'s journey?\n\n` +
                `• You'll follow their exact movie order\n` +
                `• Your watched films and ratings are kept\n` +
                `• Your journey will stay linked — refreshing won't break it\n` +
                `• You can unsync anytime to go back to your own path`
              )) {
                onSyncJourney(syncTarget);
                setSyncTarget('');
              }
            }}
          >
            Sync
          </button>
        </>
      )}
      <button className="journey-reshuffle-btn" onClick={handleReshuffle}>
        🔀 Reshuffle
      </button>
    </div>
    </>
  );
}
