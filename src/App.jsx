import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MOVIES } from './data/movies';
import { mulberry32, diversityShuffle, enforceSeriesOrder } from './utils/shuffle';
import {
  ratingKey, clearCache,
} from './utils/storage';
import { loadProfile, saveProfileField } from './utils/firebaseStorage';
import NavBar from './components/NavBar';
import ProgressBar from './components/ProgressBar';
import StartScreen from './components/StartScreen';
import FilmCard from './components/FilmCard';
import NavButtons from './components/NavButtons';
import CompletionScreen from './components/CompletionScreen';
import FilmList from './components/FilmList';
import FilmDetailModal from './components/FilmDetailModal';
import StatsTab from './components/StatsTab';
import SettingsModal, { DEFAULT_FILTERS } from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import MovieBattle from './components/MovieBattle';
import Leaderboard from './components/Leaderboard';

// Map genre codes to tone filter keys
const GENRE_TO_TONE = {
  D: 'drama', H: 'drama', I: 'drama',
  T: 'thriller', X: 'thriller',
  C: 'comedy', R: 'comedy',
  S: 'scifi',
  W: 'war',
  B: 'biopic',
  M: 'musical',
  N: 'action',
  A: 'animation',
};

// Check if a movie passes the current filters
function moviePassesFilter(movie, filters) {
  if (!filters) return true;
  const f = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters.eras || {}) },
    categories: { ...DEFAULT_FILTERS.categories, ...(filters.categories || {}) },
    tones: { ...DEFAULT_FILTERS.tones, ...(filters.tones || {}) },
  };

  // Era check
  const year = movie.year;
  if (year < 1991 && !f.eras['70s80s']) return false;
  if (year >= 1991 && year < 2000 && !f.eras['90s']) return false;
  if (year >= 2000 && year < 2010 && !f.eras['00s']) return false;
  if (year >= 2010 && year < 2020 && !f.eras['10s']) return false;
  if (year >= 2020 && !f.eras['20s']) return false;

  // Category check
  if (!f.categories[movie.category]) return false;

  // Tone/genre check
  const toneKey = GENRE_TO_TONE[movie.genre];
  if (toneKey && !f.tones[toneKey]) return false;

  return true;
}

const LS_PROFILE_KEY = 'oscars_profile_id';
const LS_THEME_KEY = 'oscars_theme';
const LS_TAB_KEY = 'oscars_active_tab';

export default function App() {
  // --- Auth state ---
  const [profile, setProfile] = useState(null); // null = not logged in
  const [loading, setLoading] = useState(true); // initial profile load

  // --- Theme state ---
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(LS_THEME_KEY);
    return saved === 'dark';
  });

  // Apply theme to <html> element whenever isDark changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(LS_THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      // Also save to Firestore if logged in
      if (profile) {
        saveProfileField(profile.id, 'theme', next ? 'dark' : 'light').catch(() => {});
      }
      return next;
    });
  }, [profile]);

  // --- Core state ---
  const [playlist, setPlaylist] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [watchedSet, setWatchedSet] = useState(new Set());
  const [ratings, setRatings] = useState({});
  const [raters, setRaters] = useState(['Chris', 'Yvonne']);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(LS_TAB_KEY) || 'journey';
  });
  const [screen, setScreen] = useState('start'); // 'start' | 'card' | 'complete'
  const [fading, setFading] = useState(false);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailMovie, setDetailMovie] = useState(null);

  // --- Helper: generate playlist from seed ---
  const generatePlaylist = useCallback((seed) => {
    const rng = mulberry32(seed);
    const pl = enforceSeriesOrder(diversityShuffle([...MOVIES], rng));
    return pl;
  }, []);

  // --- Helper: save to Firestore without blocking UI ---
  const firebaseSave = useCallback((field, value) => {
    if (!profile) return;
    saveProfileField(profile.id, field, value).catch(() => {
      // Silently ignore write errors to avoid blocking the UI
    });
  }, [profile]);

  // --- On mount: check for saved profile ID and auto-login ---
  useEffect(() => {
    const savedId = localStorage.getItem(LS_PROFILE_KEY);
    if (!savedId) {
      setLoading(false);
      return;
    }
    // Try to load profile from Firestore
    loadProfile(savedId)
      .then((data) => {
        if (data) {
          initializeFromProfile(data);
        } else {
          // Profile not found in Firestore, clear saved ID
          localStorage.removeItem(LS_PROFILE_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(LS_PROFILE_KEY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Initialize all state from a loaded profile ---
  const initializeFromProfile = useCallback((data) => {
    setProfile(data);
    localStorage.setItem(LS_PROFILE_KEY, data.id);

    // Determine seed and playlist order
    let seed = data.seed;
    let pl;
    let needsSeedSave = false;
    let needsOrderSave = false;

    if (data.playlistOrder && data.playlistOrder.every(i => i >= 0 && i < MOVIES.length)) {
      // Use saved playlist order
      pl = data.playlistOrder.map(i => MOVIES[i]);
    } else {
      // Generate new seed if needed
      if (!seed) {
        seed = Math.floor(Math.random() * 0xFFFFFFFF);
        needsSeedSave = true;
      }
      pl = generatePlaylist(seed);
      const orderIndices = pl.map(m => MOVIES.indexOf(m));
      needsOrderSave = true;

      // Save seed and order to Firestore (fire-and-forget)
      if (needsSeedSave) {
        saveProfileField(data.id, 'seed', seed).catch(() => {});
      }
      saveProfileField(data.id, 'playlistOrder', orderIndices).catch(() => {});
    }

    // Set watched from profile's array of playlist indices
    const watched = new Set(data.watched || []);

    // Set ratings
    const rats = data.ratings || {};

    // Set raters
    const ratersList = data.raters || ['Chris', 'Yvonne'];

    // Set current index
    const idx = data.currentIdx || 0;

    setPlaylist(pl);
    setCurrentIdx(Math.min(idx, pl.length - 1));
    setWatchedSet(watched);
    setRatings(rats);
    setRaters(ratersList);

    // Load theme preference from profile if available
    if (data.theme) {
      const profileDark = data.theme === 'dark';
      setIsDark(profileDark);
      localStorage.setItem(LS_THEME_KEY, data.theme);
    }

    // Determine screen state
    if (idx > 0 || watched.size > 0) {
      setScreen('card');
    } else {
      setScreen('start');
    }
  }, [generatePlaylist]);

  // --- Login handler ---
  const handleLogin = useCallback((profileData) => {
    initializeFromProfile(profileData);
  }, [initializeFromProfile]);

  // --- Logout handler ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem(LS_PROFILE_KEY);
    localStorage.removeItem(LS_TAB_KEY);
    setProfile(null);
    setPlaylist([]);
    setCurrentIdx(0);
    setWatchedSet(new Set());
    setRatings({});
    setRaters(['Chris', 'Yvonne']);
    setActiveTab('journey');
    setScreen('start');
    setSettingsOpen(false);
    setDetailMovie(null);
  }, []);

  // --- Derived state ---
  const currentMovie = playlist[currentIdx] || null;
  const isCurrentWatched = watchedSet.has(currentIdx);

  // Can advance if current film is watched AND at least one rater has rated it
  const currentRatingKeyVal = currentMovie ? ratingKey(currentMovie) : null;
  const currentRatings = currentRatingKeyVal ? ratings[currentRatingKeyVal] : null;
  const hasAnyRating = currentRatings && Object.values(currentRatings).some(v => v != null);
  const canAdvance = isCurrentWatched && hasAnyRating;

  // Build watched title set for list/stats views
  const watchedTitleSet = useMemo(() => {
    const set = new Set();
    for (const idx of watchedSet) {
      const m = playlist[idx];
      if (m) set.add(m.title + '|' + m.year);
    }
    return set;
  }, [watchedSet, playlist]);

  // --- Filter helpers ---
  const activeFilters = profile?.filters || null;

  // Check if a playlist index passes the current filters
  const idxPassesFilter = useCallback((idx) => {
    const movie = playlist[idx];
    if (!movie) return false;
    return moviePassesFilter(movie, activeFilters);
  }, [playlist, activeFilters]);

  // Compute filtered eligible film counts for progress
  const eligibleStats = useMemo(() => {
    let total = 0;
    let watched = 0;
    for (let i = 0; i < playlist.length; i++) {
      if (idxPassesFilter(i)) {
        total++;
        if (watchedSet.has(i)) watched++;
      }
    }
    return { total, watched };
  }, [playlist, watchedSet, idxPassesFilter]);

  // Find the eligible position of currentIdx among eligible films (for progress bar)
  const eligiblePosition = useMemo(() => {
    let pos = 0;
    for (let i = 0; i < currentIdx; i++) {
      if (idxPassesFilter(i)) pos++;
    }
    return pos;
  }, [currentIdx, idxPassesFilter]);

  // --- Navigation ---
  const goNext = useCallback(() => {
    // Find next eligible film after currentIdx
    let next = currentIdx + 1;
    while (next < playlist.length && !idxPassesFilter(next)) {
      next++;
    }
    if (next >= playlist.length) {
      setScreen('complete');
      return;
    }
    setFading(true);
    setTimeout(() => {
      setCurrentIdx(next);
      firebaseSave('currentIdx', next);
      setFading(false);
    }, 280);
  }, [currentIdx, playlist.length, firebaseSave, idxPassesFilter]);

  const goPrev = useCallback(() => {
    // Find previous eligible film before currentIdx
    let prev = currentIdx - 1;
    while (prev >= 0 && !idxPassesFilter(prev)) {
      prev--;
    }
    if (prev < 0) return;
    setFading(true);
    setTimeout(() => {
      setCurrentIdx(prev);
      firebaseSave('currentIdx', prev);
      setFading(false);
    }, 280);
  }, [currentIdx, firebaseSave, idxPassesFilter]);

  // --- Watched toggle ---
  const toggleWatched = useCallback(() => {
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      firebaseSave('watched', [...next]);
      return next;
    });
  }, [currentIdx, firebaseSave]);

  const toggleWatchedForMovie = useCallback((movie) => {
    const playlistIdx = playlist.findIndex(p => p.title === movie.title && p.year === movie.year);
    if (playlistIdx < 0) return;
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(playlistIdx)) next.delete(playlistIdx);
      else next.add(playlistIdx);
      firebaseSave('watched', [...next]);
      return next;
    });
  }, [playlist, firebaseSave]);

  // --- Rating change ---
  const handleRatingChange = useCallback((key, person, value) => {
    setRatings(prev => {
      const next = { ...prev };
      if (!next[key]) next[key] = {};
      next[key] = { ...next[key], [person]: value };
      // Clean up null values
      if (value === null) delete next[key][person];
      if (Object.keys(next[key]).length === 0) delete next[key];
      firebaseSave('ratings', next);
      return next;
    });
  }, [firebaseSave]);

  // --- Detail modal watched state ---
  const isDetailWatched = useMemo(() => {
    if (!detailMovie) return false;
    const idx = playlist.findIndex(p => p.title === detailMovie.title && p.year === detailMovie.year);
    return idx >= 0 && watchedSet.has(idx);
  }, [detailMovie, playlist, watchedSet]);

  // --- Start journey ---
  const handleStart = useCallback(() => {
    setScreen('card');
  }, []);

  // --- Restart ---
  const handleRestart = useCallback(() => {
    if (!window.confirm('Start from the beginning? Your watched list will be preserved.')) return;
    setCurrentIdx(0);
    firebaseSave('currentIdx', 0);
    setScreen('card');
    setActiveTab('journey');
  }, [firebaseSave]);

  // --- Settings actions ---
  const handleReshuffle = useCallback(() => {
    if (!window.confirm('Reshuffle your journey? This generates a new random order for unwatched films. Your watched films and ratings are preserved.')) return;
    // Generate new seed and playlist
    const newSeed = Math.floor(Math.random() * 0xFFFFFFFF);
    const newPlaylist = generatePlaylist(newSeed);
    const orderIndices = newPlaylist.map(m => MOVIES.indexOf(m));

    setPlaylist(newPlaylist);
    setCurrentIdx(0);

    // Save new seed, order, and reset currentIdx in Firestore
    if (profile) {
      saveProfileField(profile.id, 'seed', newSeed).catch(() => {});
      saveProfileField(profile.id, 'playlistOrder', orderIndices).catch(() => {});
      saveProfileField(profile.id, 'currentIdx', 0).catch(() => {});
    }

    setScreen('card');
    setSettingsOpen(false);
  }, [profile, generatePlaylist]);

  const handleClearCache = useCallback(() => {
    const count = clearCache();
    window.alert(`Cleared ${count} cached poster/info entries.`);
    setSettingsOpen(false);
  }, []);

  // --- Auto-skip to next eligible film when current is filtered out ---
  useEffect(() => {
    if (screen !== 'card' || !playlist.length || eligibleStats.total === 0) return;
    if (!idxPassesFilter(currentIdx)) {
      // Find next eligible film forward, or backward if none ahead
      let next = currentIdx + 1;
      while (next < playlist.length && !idxPassesFilter(next)) next++;
      if (next >= playlist.length) {
        // Try backward
        next = currentIdx - 1;
        while (next >= 0 && !idxPassesFilter(next)) next--;
      }
      if (next >= 0 && next < playlist.length) {
        setCurrentIdx(next);
        firebaseSave('currentIdx', next);
      }
    }
  }, [currentIdx, screen, playlist, idxPassesFilter, eligibleStats.total, firebaseSave]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    if (!profile) return; // No keyboard shortcuts when not logged in
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (detailMovie) { setDetailMovie(null); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        return;
      }
      if (settingsOpen || detailMovie) return;
      if (activeTab !== 'journey') return;
      if (screen !== 'card') return;

      if ((e.key === 'ArrowRight' || e.key === 'Enter') && canAdvance) goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'w' || e.key === 'W') toggleWatched();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [profile, activeTab, screen, settingsOpen, detailMovie, goNext, goPrev, toggleWatched, canAdvance]);

  // --- Raters change ---
  const handleRatersChange = useCallback((newRaters) => {
    setRaters(newRaters);
    firebaseSave('raters', newRaters);
  }, [firebaseSave]);

  // --- Avatar change ---
  const handleAvatarChange = useCallback((emoji) => {
    setProfile(prev => prev ? { ...prev, avatar: emoji } : prev);
    firebaseSave('avatar', emoji);
  }, [firebaseSave]);

  // --- Tab change ---
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem(LS_TAB_KEY, tab);
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // --- Not logged in: show login screen ---
  if (!profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // --- Render ---
  const showProgress = activeTab === 'journey' && screen === 'card' && playlist.length > 0;

  return (
    <>
      <NavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        profile={profile}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {showProgress && (
        <ProgressBar
          currentIdx={eligiblePosition}
          total={eligibleStats.total}
          watchedCount={eligibleStats.watched}
        />
      )}

      {/* Journey tab */}
      {activeTab === 'journey' && (
        <main>
          {screen === 'start' && (
            <StartScreen onStart={handleStart} />
          )}
          {screen === 'card' && eligibleStats.total === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: 'var(--cream-dim)', fontSize: '1.1rem', marginBottom: '12px' }}>
                All films are filtered out.
              </p>
              <p style={{ color: 'var(--cream-dim)', fontSize: '0.9rem' }}>
                Open Settings to adjust your journey filters.
              </p>
            </div>
          )}
          {screen === 'card' && currentMovie && eligibleStats.total > 0 && (
            <>
              <FilmCard
                movie={currentMovie}
                isWatched={isCurrentWatched}
                onToggleWatched={toggleWatched}
                fading={fading}
                ratings={ratings}
                onRatingChange={handleRatingChange}
                raters={raters}
              />
              <NavButtons
                currentIdx={eligiblePosition}
                total={eligibleStats.total}
                onPrev={goPrev}
                onNext={goNext}
                canAdvance={canAdvance}
              />
            </>
          )}
          {screen === 'complete' && (
            <CompletionScreen total={eligibleStats.total} onRestart={handleRestart} />
          )}
        </main>
      )}

      {/* A-Z list tab */}
      {activeTab === 'list' && (
        <FilmList
          watchedTitleSet={watchedTitleSet}
          onOpenDetail={setDetailMovie}
          ratings={ratings}
          raters={raters}
        />
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <StatsTab watchedTitleSet={watchedTitleSet} ratings={ratings} raters={raters} />
      )}

      {/* Battle tab */}
      {activeTab === 'battle' && (
        <MovieBattle
          profile={profile}
          playlist={playlist}
          watchedSet={watchedSet}
        />
      )}

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <Leaderboard
          currentProfile={profile}
          currentRatings={ratings}
          onOpenDetail={setDetailMovie}
        />
      )}

      {/* Film detail modal */}
      {detailMovie && (
        <FilmDetailModal
          movie={detailMovie}
          isWatched={isDetailWatched}
          onToggleWatched={() => toggleWatchedForMovie(detailMovie)}
          onClose={() => setDetailMovie(null)}
          ratings={ratings}
          onRatingChange={handleRatingChange}
          raters={raters}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          raters={raters}
          onRatersChange={handleRatersChange}
          avatar={profile?.avatar || '🍿'}
          onAvatarChange={handleAvatarChange}
          onClose={() => setSettingsOpen(false)}
          onReshuffle={handleReshuffle}
          onClearCache={handleClearCache}
          profile={profile}
          filters={profile?.filters || null}
          onFiltersChange={(newFilters) => {
            setProfile(prev => prev ? { ...prev, filters: newFilters } : prev);
            firebaseSave('filters', newFilters);
          }}
        />
      )}
    </>
  );
}
