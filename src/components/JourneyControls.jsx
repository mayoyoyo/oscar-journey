import React, { useState, useMemo } from 'react';
import { MOVIES } from '../data/movies';
import { DEFAULT_FILTERS, ERA_LABELS, CATEGORY_LABELS, GENRE_LABELS, SMART_LABELS } from './SettingsModal';
import { RUNTIME_LABELS } from '../utils/runtime';

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

  const currentFilters = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters?.eras || {}) },
    categories: { ...DEFAULT_FILTERS.categories, ...(filters?.categories || {}) },
    genres: { ...DEFAULT_FILTERS.genres, ...(filters?.genres || {}) },
    runtimes: { ...DEFAULT_FILTERS.runtimes, ...(filters?.runtimes || {}) },
    minEssentialTier: filters?.minEssentialTier ?? DEFAULT_FILTERS.minEssentialTier,
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
    if (currentFilters.minEssentialTier !== DEFAULT_FILTERS.minEssentialTier) n++;
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
    onFiltersChange({ ...currentFilters, [section]: nextSection });
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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

  // Per-option counts based on canon depth + essentialsOnly. Used to hide rows that would
  // match zero films (e.g. 1910s when canon depth is set to ≥3).
  const eligiblePool = useMemo(() => MOVIES.filter(m => {
    if (m.category === 'ESSENTIAL' && (m.tier || 0) < (currentFilters.minEssentialTier ?? 2)) return false;
    if (currentFilters.essentialsOnly && m.category !== 'ESSENTIAL') return false;
    return true;
  }), [currentFilters.minEssentialTier, currentFilters.essentialsOnly]);

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
        if (counts && (counts[key] || 0) === 0) return null;
        const active = currentFilters[section][key];
        const suffix = counts ? `(${counts[key] || 0})` : null;
        return (
          <div key={key} className={`filter-check-item ${active ? 'active' : ''}`}
            onClick={() => toggleFilter(section, key)}>
            <span className="filter-checkbox">{active ? '\u2713' : ''}</span>
            <span className="filter-check-label">
              {label}
              {suffix && <span className="filter-check-suffix"> {suffix}</span>}
            </span>
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

    // Canon depth + essentials-only
    if (currentFilters.minEssentialTier !== DEFAULT_FILTERS.minEssentialTier) {
      if (currentFilters.minEssentialTier === 99) chips.push('Oscars only');
      else chips.push(`Canon ≥${currentFilters.minEssentialTier}`);
    }
    if (currentFilters.essentialsOnly) chips.push('Essentials only');

    return chips;
  }, [currentFilters]);

  // Find synced profile name
  const syncedProfile = syncedWith ? profiles?.find(p => p.id === syncedWith) : null;

  return (
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
        <div className={`journey-controls-left journey-filters-collapsible ${filtersOpen ? 'is-open' : 'is-closed'}`}>
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
            {filtersOpen && activeFilterCount > 0 && (
              <span className="journey-filters-active">{activeFilterCount} active</span>
            )}
          </button>
          {filtersOpen && (
            <div className="journey-filters-body">
              {/* Canon depth — collapsible section matching the other filter styles */}
              <div className="filter-section">
                <button className="filter-section-toggle" onClick={() => toggleSection('canon')}>
                  <span className="filter-section-arrow">{openSections.canon ? '▾' : '▸'}</span>
                  <span className="filter-section-label">Canon depth</span>
                  {(() => {
                    const parts = [];
                    if (currentFilters.essentialsOnly) parts.push('only');
                    if (currentFilters.minEssentialTier === 99) parts.push('Oscars');
                    else if (currentFilters.minEssentialTier !== DEFAULT_FILTERS.minEssentialTier) parts.push(`≥${currentFilters.minEssentialTier}`);
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
                          className={`canon-depth-btn ${currentFilters.minEssentialTier === opt.tier ? 'active' : ''}`}
                          role="radio"
                          aria-checked={currentFilters.minEssentialTier === opt.tier}
                          onClick={() => onFiltersChange({
                            ...currentFilters,
                            minEssentialTier: opt.tier,
                            essentialsOnly: opt.tier === 99 ? false : currentFilters.essentialsOnly,
                          })}
                        >
                          <span className="canon-depth-label">{opt.label}</span>
                          <span className="canon-depth-sub">{opt.sub}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={`essentials-only-toggle ${currentFilters.essentialsOnly ? 'active' : ''} ${currentFilters.minEssentialTier === 99 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (currentFilters.minEssentialTier === 99) return;
                        onFiltersChange({ ...currentFilters, essentialsOnly: !currentFilters.essentialsOnly });
                      }}
                      aria-pressed={currentFilters.essentialsOnly}
                      disabled={currentFilters.minEssentialTier === 99}
                    >
                      <span className="essentials-only-checkbox">{currentFilters.essentialsOnly ? '\u2713' : ''}</span>
                      <span className="essentials-only-label">
                        <strong>Essentials only</strong>
                        <span className="essentials-only-sub">
                          {currentFilters.minEssentialTier === 99
                            ? 'n/a — Oscars-only mode is on'
                            : 'hide Oscar films — show just the canon at the chosen tier'}
                        </span>
                      </span>
                    </button>
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

        <div className="journey-controls-right">
          <button className="journey-reshuffle-btn" onClick={handleReshuffle}>
            🔀 Reshuffle
          </button>

          {profiles && profiles.length > 0 && onSyncJourney && !syncedWith && (
            <div className="journey-sync">
              <div style={{ display: 'flex', gap: '6px' }}>
                <select className="journey-sync-select" value={syncTarget} onChange={e => setSyncTarget(e.target.value)}>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
