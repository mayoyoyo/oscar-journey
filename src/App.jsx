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
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import MovieBattle from './components/MovieBattle';
import Leaderboard from './components/Leaderboard';

const LS_PROFILE_KEY = 'oscars_profile_id';
const LS_THEME_KEY = 'oscars_theme';

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
  const [activeTab, setActiveTab] = useState('journey');
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

  // --- Navigation ---
  const goNext = useCallback(() => {
    if (currentIdx >= playlist.length - 1) {
      setScreen('complete');
      return;
    }
    setFading(true);
    setTimeout(() => {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      firebaseSave('currentIdx', next);
      setFading(false);
    }, 280);
  }, [currentIdx, playlist.length, firebaseSave]);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0) return;
    setFading(true);
    setTimeout(() => {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      firebaseSave('currentIdx', prev);
      setFading(false);
    }, 280);
  }, [currentIdx, firebaseSave]);

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
  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all progress and start from the beginning? This cannot be undone.')) return;
    // Reset Firestore profile fields
    if (profile) {
      saveProfileField(profile.id, 'currentIdx', 0).catch(() => {});
      saveProfileField(profile.id, 'watched', []).catch(() => {});
      saveProfileField(profile.id, 'ratings', {}).catch(() => {});
      saveProfileField(profile.id, 'playlistOrder', null).catch(() => {});
      saveProfileField(profile.id, 'seed', null).catch(() => {});
    }
    // Reload the page to reinitialize
    window.location.reload();
  }, [profile]);

  const handleClearCache = useCallback(() => {
    const count = clearCache();
    window.alert(`Cleared ${count} cached film info entries.`);
    setSettingsOpen(false);
  }, []);

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
          currentIdx={currentIdx}
          total={playlist.length}
          watchedCount={watchedSet.size}
        />
      )}

      {/* Journey tab */}
      {activeTab === 'journey' && (
        <main>
          {screen === 'start' && (
            <StartScreen onStart={handleStart} />
          )}
          {screen === 'card' && currentMovie && (
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
                currentIdx={currentIdx}
                total={playlist.length}
                onPrev={goPrev}
                onNext={goNext}
                canAdvance={canAdvance}
              />
            </>
          )}
          {screen === 'complete' && (
            <CompletionScreen total={playlist.length} onRestart={handleRestart} />
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
          onReset={handleReset}
          onClearCache={handleClearCache}
        />
      )}
    </>
  );
}
