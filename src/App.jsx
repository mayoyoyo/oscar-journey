import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MOVIES } from './data/movies';
import { mulberry32, diversityShuffle, enforceSeriesOrder } from './utils/shuffle';
import {
  loadSeed, loadOrder, saveOrder, loadIndex, saveIndex,
  loadWatched, saveWatched, loadRatings, saveRatings, ratingKey,
  loadRaters, saveRaters, resetProgress, clearCache,
} from './utils/storage';
import Header from './components/Header';
import TabBar from './components/TabBar';
import ProgressBar from './components/ProgressBar';
import StartScreen from './components/StartScreen';
import FilmCard from './components/FilmCard';
import NavButtons from './components/NavButtons';
import CompletionScreen from './components/CompletionScreen';
import FilmList from './components/FilmList';
import FilmDetailModal from './components/FilmDetailModal';
import StatsTab from './components/StatsTab';
import SettingsModal from './components/SettingsModal';

export default function App() {
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

  // --- Initialize ---
  useEffect(() => {
    const seed = loadSeed();
    const savedOrder = loadOrder();
    let pl;

    if (savedOrder && savedOrder.every(i => i >= 0 && i < MOVIES.length)) {
      pl = savedOrder.map(i => MOVIES[i]);
    } else {
      const rng = mulberry32(seed);
      pl = enforceSeriesOrder(diversityShuffle([...MOVIES], rng));
      const orderIndices = pl.map(m => MOVIES.indexOf(m));
      saveOrder(orderIndices);
    }

    const idx = loadIndex();
    const watched = loadWatched();
    const rats = loadRatings();
    const savedRaters = loadRaters();

    setPlaylist(pl);
    setRaters(savedRaters);
    setCurrentIdx(Math.min(idx, pl.length - 1));
    setWatchedSet(watched);
    setRatings(rats);

    // If has progress, show card screen
    if (idx > 0 || watched.size > 0) {
      setScreen('card');
    }
  }, []);

  // --- Derived state ---
  const currentMovie = playlist[currentIdx] || null;
  const isCurrentWatched = watchedSet.has(currentIdx);

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
      saveIndex(next);
      setFading(false);
    }, 280);
  }, [currentIdx, playlist.length]);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0) return;
    setFading(true);
    setTimeout(() => {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      saveIndex(prev);
      setFading(false);
    }, 280);
  }, [currentIdx]);

  // --- Watched toggle ---
  const toggleWatched = useCallback(() => {
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      saveWatched(next);
      return next;
    });
  }, [currentIdx]);

  const toggleWatchedForMovie = useCallback((movie) => {
    const playlistIdx = playlist.findIndex(p => p.title === movie.title && p.year === movie.year);
    if (playlistIdx < 0) return;
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(playlistIdx)) next.delete(playlistIdx);
      else next.add(playlistIdx);
      saveWatched(next);
      return next;
    });
  }, [playlist]);

  // --- Rating change ---
  const handleRatingChange = useCallback((key, person, value) => {
    setRatings(prev => {
      const next = { ...prev };
      if (!next[key]) next[key] = {};
      next[key] = { ...next[key], [person]: value };
      // Clean up null values
      if (value === null) delete next[key][person];
      if (Object.keys(next[key]).length === 0) delete next[key];
      saveRatings(next);
      return next;
    });
  }, []);

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
    saveIndex(0);
    setScreen('card');
    setActiveTab('journey');
  }, []);

  // --- Settings actions ---
  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all progress and start from the beginning? This cannot be undone.')) return;
    resetProgress();
    window.location.reload();
  }, []);

  const handleClearCache = useCallback(() => {
    const count = clearCache();
    window.alert(`Cleared ${count} cached film info entries.`);
    setSettingsOpen(false);
  }, []);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (detailMovie) { setDetailMovie(null); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        return;
      }
      if (settingsOpen || detailMovie) return;
      if (activeTab !== 'journey') return;
      if (screen !== 'card') return;

      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'w' || e.key === 'W') toggleWatched();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeTab, screen, settingsOpen, detailMovie, goNext, goPrev, toggleWatched]);

  // --- Raters change ---
  const handleRatersChange = useCallback((newRaters) => {
    setRaters(newRaters);
    saveRaters(newRaters);
  }, []);

  // --- Tab change ---
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // --- Render ---
  const showProgress = activeTab === 'journey' && screen === 'card' && playlist.length > 0;

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

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
          onClose={() => setSettingsOpen(false)}
          onReset={handleReset}
          onClearCache={handleClearCache}
        />
      )}
    </>
  );
}
