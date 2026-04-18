import React, { useState, useMemo } from 'react';
import { MOVIES } from '../data/movies';
import { DEFAULT_FILTERS, ERA_LABELS, CATEGORY_LABELS, GENRE_LABELS, SMART_LABELS } from './SettingsModal';
import { RUNTIME_LABELS } from '../utils/runtime';
import { getTier } from '../utils/tierInfo';

// Per-tier copy shown in the Canon depth stepper. Mirrors the Film tab's
// TIER_LEVELS so both surfaces describe the canon threshold identically.
const TIER_LEVELS = {
  1: { label: 'Canonical',  sub: 'All films — present in the canon with at least one curated endorsement.' },
  2: { label: 'Acclaimed',  sub: 'Meets our multi-list entry threshold — validated by 2+ sources.' },
  3: { label: 'Landmark',   sub: 'Broad recognition across critics, institutions, and audience lists.' },
  4: { label: 'Masterwork', sub: 'Near-universal consensus across critical, institutional, and popular canon.' },
  5: { label: 'Apex',       sub: 'Summit canon — curated top tier whose inclusion on any serious must-watch list is essentially unavoidable.' },
};
const MAX_SLIDER_TIER = 5;

function eraBucketJourney(year) {
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

export default function JourneyControls({ filters, onFiltersChange, onReshuffle, eligibleCount, totalCount, profiles, currentProfileId, onSyncJourney, syncedWith, onUnsync }) {
  const [syncTarget, setSyncTarget] = useState('');
  const [openSections, setOpenSections] = useState({ smart: false, eras: false, categories: false, canon: false, genres: false, runtimes: false });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Migrate legacy shape (minEssentialTier / old essentialsOnly-hides-Oscars semantic)
  // into the unified tier + oscarsOnly / essentialsOnly shape. Done at read time so
  // existing profiles display correctly before their next save overwrites the keys.
  const legacyTier = filters?.minEssentialTier;
  const migratedMinTier = filters?.minTier
    ?? (legacyTier === 99 ? 1 : legacyTier ?? DEFAULT_FILTERS.minTier);
  const migratedOscarsOnly = filters?.oscarsOnly ?? (legacyTier === 99) ?? DEFAULT_FILTERS.oscarsOnly;

  const currentFilters = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters?.eras || {}) },
    // Drop stale ESSENTIAL key from saved profiles — Categories no longer governs it.
    categories: (() => {
      const merged = { ...DEFAULT_FILTERS.categories, ...(filters?.categories || {}) };
      delete merged.ESSENTIAL;
      return merged;
    })(),
    genres: { ...DEFAULT_FILTERS.genres, ...(filters?.genres || {}) },
    runtimes: { ...DEFAULT_FILTERS.runtimes, ...(filters?.runtimes || {}) },
    minTier: migratedMinTier,
    oscarsOnly: migratedOscarsOnly,
    essentialsOnly: filters?.essentialsOnly ?? DEFAULT_FILTERS.essentialsOnly,
    smart: { ...DEFAULT_FILTERS.smart, ...(filters?.smart || {}) },
  };

  // Total count of "non-default" filter selections — shown in the collapsed header.
  // Only count deviations from DEFAULT_FILTERS, otherwise partially-default filters
  // (pre-1970s off by default) would be counted as active.
  const activeFilterCount = (() => {
    let n = 0;
    for (const section of ['eras', 'categories', 'genres', 'runtimes']) {
      const def = DEFAULT_FILTERS[section] || {};
      for (const [k, v] of Object.entries(currentFilters[section])) {
        if (v !== def[k]) n++;
      }
    }
    for (const [k, v] of Object.entries(currentFilters.smart)) {
      if (v !== (DEFAULT_FILTERS.smart[k] ?? false)) n++;
    }
    if (currentFilters.minTier !== DEFAULT_FILTERS.minTier) n++;
    if (currentFilters.oscarsOnly !== DEFAULT_FILTERS.oscarsOnly) n++;
    if (currentFilters.essentialsOnly !== DEFAULT_FILTERS.essentialsOnly) n++;
    return n;
  })();

  const toggleFilter = (section, key) => {
    const nextSection = { ...currentFilters[section], [key]: !currentFilters[section][key] };
    // "smart" filters default all OFF (each is an opt-in flag), so empty is valid there.
    // For eras / categories / genres / runtimes, empty means nothing matches — auto-restore
    // all keys to true when the user unchecks the last active one.
    if (section !== 'smart' && !Object.values(nextSection).some(Boolean)) {
      for (const k of Object.keys(nextSection)) nextSection[k] = true;
    }
    // Write the migrated canon keys back on every save so legacy keys retire over time.
    onFiltersChange({ ...currentFilters, [section]: nextSection });
  };

  const setOnlyKey = (section, labels, onlyKey) => {
    const next = {};
    for (const k of Object.keys(labels)) next[k] = (k === onlyKey);
    onFiltersChange({ ...currentFilters, [section]: next });
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
    // Hide the badge when current state matches defaults — otherwise a
    // partially-default filter (e.g. pre-1970s off by default) would show a
    // misleading ratio even though the user hasn't customized anything.
    const matchesDefault = entries.every(([k, v]) => v === def[k]);
    if (matchesDefault) return null;
    return `${active}/${entries.length}`;
  };

  // Per-option eligibility pool based on unified tier + focus mode. Used to hide
  // rows that would match zero films (e.g. 1910s when tier ≥ 5).
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (getTier(m) < (currentFilters.minTier ?? 1)) return false;
    if (currentFilters.oscarsOnly && m.category === 'ESSENTIAL') return false;
    if (currentFilters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [currentFilters.minTier, currentFilters.oscarsOnly, currentFilters.essentialsOnly]);

  const eraCounts = useMemo(() => {
    const c = {};
    for (const m of eligiblePool) {
      const b = eraBucketJourney(m.year);
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
        const active = currentFilters[section][key];
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''}`}
            onClick={() => toggleFilter(section, key)}>
            <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
            <span className="filter-check-label">{label}</span>
            {/* "only" shortcut — skip for smart filters (each is independent opt-in). */}
            {section !== 'smart' && (
              <button
                type="button"
                className="filter-only-btn"
                onClick={(e) => { e.stopPropagation(); setOnlyKey(section, labels, key); }}
                title={`Show only ${label}`}
              >
                only
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

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
    summarize('eras', ERA_LABELS, 'Eras');
    summarize('categories', CATEGORY_LABELS, 'Categories');
    summarize('genres', GENRE_LABELS, 'Genres');
    summarize('runtimes', RUNTIME_LABELS, 'Runtime');

    if (currentFilters.oscarsOnly) chips.push('Oscars only');
    if (currentFilters.essentialsOnly) chips.push('Essentials only');
    if (currentFilters.minTier > 1) chips.push(`Tier ≥${currentFilters.minTier}`);

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
                    if (currentFilters.minTier > 1) parts.push(`tier ≥${currentFilters.minTier}`);
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
                    <div className="tier-stepper">
                      <div className="tier-stepper-header">
                        <span className="tier-stepper-title">Minimum tier</span>
                        <div className="tier-stepper-controls">
                          <button
                            type="button"
                            className="tier-stepper-btn"
                            onClick={() => onFiltersChange({ ...currentFilters, minTier: Math.max(1, (currentFilters.minTier ?? 1) - 1) })}
                            disabled={currentFilters.minTier <= 1}
                            aria-label="Lower minimum tier"
                          >−</button>
                          <span className={`tier-stepper-value ${currentFilters.minTier === MAX_SLIDER_TIER ? 'tier-stepper-value-apex' : ''}`}>
                            {currentFilters.minTier === MAX_SLIDER_TIER ? currentFilters.minTier : `≥ ${currentFilters.minTier}`}
                          </span>
                          <button
                            type="button"
                            className="tier-stepper-btn"
                            onClick={() => onFiltersChange({ ...currentFilters, minTier: Math.min(MAX_SLIDER_TIER, (currentFilters.minTier ?? 1) + 1) })}
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
              {renderSection('eras', 'Eras', 'eras', ERA_LABELS, eraCounts)}
              {renderSection('genres', 'Genres', 'genres', GENRE_LABELS, genreCounts)}
              {renderSection('runtimes', 'Runtime', 'runtimes', RUNTIME_LABELS)}
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
