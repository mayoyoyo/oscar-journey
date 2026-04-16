import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MOVIES, MOVIES_BY_ID } from './data/movies';
import { mulberry32, diversityShuffle, enforceSeriesOrder } from './utils/shuffle';
import {
  ratingKey, clearCache,
} from './utils/storage';
import { loadProfile, saveProfileField, recordActivity, getRecentActivity } from './utils/firebaseStorage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './utils/firebase';
import NavBar, { tabs } from './components/NavBar';
import ProgressBar from './components/ProgressBar';
import StartScreen from './components/StartScreen';
import FilmCard from './components/FilmCard';
import NavButtons from './components/NavButtons';
import CompletionScreen from './components/CompletionScreen';
import FilmList from './components/FilmList';
import FilmDetailModal from './components/FilmDetailModal';
import SettingsModal, { DEFAULT_FILTERS } from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import MovieBattle from './components/MovieBattle';
import Leaderboard from './components/Leaderboard';
import JourneyControls from './components/JourneyControls';
import ActivityFeed from './components/ActivityFeed';
import { SkeletonCard } from './components/Skeleton';
import InfoModal from './components/InfoModal';
import ProfileModal from './components/ProfileModal';
import DailyOscar, { getDailyStatus, getDailyStreak } from './components/DailyOscar';
import CardEarnedBanner from './components/CardEarnedBanner';
import PackOpening from './components/PackOpening';
import { getTakenCards, registerCard, releaseCard } from './utils/cardRegistry';
import { generatePack, getMaxWallet } from './utils/cards';
import { readCachedRuntime, runtimeBucket } from './utils/runtime';
import WhatsNewAnnouncement from './components/WhatsNewAnnouncement';

// Helper: generate a stable identity key for a movie (immune to playlist reordering)
function movieKey(movie) {
  return movie.id;
}

// Check if a movie passes the current filters
// smartContext: { watchedSet, allProfiles, currentProfileId }
// isCurrentFilm: if true, exempt from skipWatched so user can rate before advancing
function moviePassesFilter(movie, filters, smartContext, isCurrentFilm) {
  if (!filters) return true;
  const f = {
    eras: { ...DEFAULT_FILTERS.eras, ...(filters.eras || {}) },
    categories: { ...DEFAULT_FILTERS.categories, ...(filters.categories || {}) },
    genres: { ...DEFAULT_FILTERS.genres, ...(filters.genres || {}) },
    runtimes: { ...DEFAULT_FILTERS.runtimes, ...(filters.runtimes || {}) },
    smart: { ...DEFAULT_FILTERS.smart, ...(filters.smart || {}) },
  };

  // Era check
  const year = movie.year;
  if (year < 1980 && !f.eras['70s']) return false;
  if (year >= 1980 && year < 1991 && !f.eras['80s']) return false;
  if (year >= 1991 && year < 2000 && !f.eras['90s']) return false;
  if (year >= 2000 && year < 2010 && !f.eras['00s']) return false;
  if (year >= 2010 && year < 2020 && !f.eras['10s']) return false;
  if (year >= 2020 && !f.eras['20s']) return false;

  // Category check — also match if any alsoWon category is active (e.g. Parasite is BP + INT)
  const matchesCategory = f.categories[movie.category] || (movie.alsoWon || []).some(c => f.categories[c]);
  if (!matchesCategory) return false;

  // Genre check
  if (f.genres[movie.genre] === false) return false;

  // Runtime check — only filter when runtime is known. Unknown runtimes always pass so the
  // filter is non-destructive while OMDB data is still being fetched in the background.
  const rb = runtimeBucket(readCachedRuntime(movie));
  if (rb && !f.runtimes[rb]) return false;

  // Smart filters
  if (smartContext) {
    const mid = movie.id;

    // Skip watched films — BUT exempt the current film so user can rate it
    if (f.smart.skipWatched && smartContext.watchedSet && smartContext.watchedSet.has(mid) && !isCurrentFilm) {
      return false;
    }

    // Winners only
    if (f.smart.winnersOnly && !movie.won) {
      return false;
    }

    // Unwatched by everyone
    if (f.smart.unwatchedByAll && smartContext.allProfiles) {
      const watchedBySomeone = smartContext.allProfiles.some(p =>
        p.id !== smartContext.currentProfileId &&
        Array.isArray(p.watched) &&
        p.watched.includes(mid)
      );
      if (watchedBySomeone) return false;
    }
  }

  return true;
}

const JOURNEY_TAGLINES = [
  "The point is watching films you wouldn't normally pick. Skip button? We don't know her.",
  "You didn't come this far to watch another Marvel movie. Commit.",
  "Your comfort zone called. It wants you back. Don't answer.",
  "Every Oscar winner was someone's 'I'd never watch that.' Look how that turned out.",
  "The algorithm picked this for you. The algorithm is smarter than you. Trust it.",
  "Somewhere, a film student is crying that you haven't seen this yet.",
  "This is cheaper than therapy and almost as life-changing.",
  "You're not 'not a movie person.' You just haven't found the right one yet.",
  "If you can binge 8 episodes of reality TV, you can watch one Oscar nominee.",
  "Fun fact: every film on this list was better than whatever you watched last Tuesday.",
  "The skip button is for the weak. You are not weak. Probably.",
  "Imagine telling someone you watched every Oscar nominee. That's the energy we're going for.",
  "This film won't watch itself. Although that would be a great Black Mirror episode.",
  "You're building taste. Taste takes time. This is the time.",
  "Your future self will thank you. Your current self might complain. Ignore them.",
  "One film at a time. That's literally all we're asking.",
  "The Oscars have been picking films since 1929. They've had some practice.",
  "If this film is bad, at least you'll have a strong opinion at dinner parties.",
  "Cinema is the only place where crying in public is considered sophisticated.",
  "Popcorn is optional. Watching the film is not.",
  "This isn't homework. Okay, it's a little like homework. But fun homework.",
  "Every masterpiece was once a film someone almost skipped.",
  "You're not watching a movie. You're having a cultural experience.",
  "The remote control has a play button. It does not have a 'scroll endlessly' button.",
  "Commitment issues? In this economy? Just watch the film.",
  "This site has 399 films. You have one job.",
  "Think of this as a gym membership for your brain. Except you'll actually use it.",
  "Your watchlist on Netflix has 200 films. You've watched 3. We're fixing that.",
  "Award-winning cinema > doomscrolling. This is not up for debate.",
  "You pressed 'Begin Your Journey.' The journey includes this film. Keep going.",
  "Some people climb mountains. You watch Oscar films. Both are valid.",
  "The Academy spent millions deciding these are the best films. Who are you to argue?",
  "No one ever said 'I regret watching that Oscar-winning film.' Literally no one.",
  "If you skip this, the popcorn emoji in your avatar will judge you. 🍿",
  "You've spent more time picking a film than it takes to watch one. Just press play.",
  "Plot twist: the film you least want to watch becomes your favorite. Every time.",
  "Your attention span called. It said it's ready for a comeback.",
  "This is the opposite of doom scrolling. This is bloom scrolling.",
  "Each film you watch makes you 0.3% more interesting at parties. Science.",
  "You're not watching movies. You're collecting opinions. Very important opinions.",
  "The skip button exists, but so does regret. Choose wisely.",
  "Remember when you said you wanted to watch more 'good' movies? This is that.",
  "A journey of 399 films begins with a single play button.",
  "This film has been waiting since its Oscar nomination for you specifically.",
  "You can't spell 'Oscar' without... actually you can't rearrange those letters into anything. Just watch it.",
  "Your film taste is about to get an upgrade. You're welcome in advance.",
  "Quitting is for people who don't have a cool movie tracking site.",
  "Every film you finish is a flex. Every skip is a fumble.",
  "Behind every great film opinion is someone who actually watched the film.",
  "The couch is ready. The film is ready. Are you ready?",
  "This is what your screen was made for. Not group chats. Cinema.",
  "Film critics watch 300+ films a year. You can handle one today.",
  "Skipping films is like skipping leg day. Everyone notices.",
  "The next 2 hours could change your perspective. Or at least your dinner conversation.",
  "Oscar nominees are like vegetables. You won't always love them, but they're good for you.",
  "This film has more awards than your entire DVD collection. Respect.",
  "Entertainment without effort is TikTok. Entertainment with effort is cinema. Choose up.",
  "Fun fact: watching this film counts as personality development.",
  "The people who voted for this film have seen more movies than you. Humble yourself.",
  "Not every film will be your favorite. But every film teaches you something about what is.",
  "You're on a journey. Journeys have boring parts. Push through.",
  "Someone made this film over years of their life. You can give it 2 hours of yours.",
  "Your watch history is your autobiography. Make it a good one.",
  "The best films are the ones you almost didn't watch.",
  "Skip now, FOMO later. It's a tale as old as cinema.",
  "If you finish all 399 films, absolutely nothing happens. But you'll feel incredible.",
  "Rome wasn't built in a day. Your film taste won't be either.",
  "The only bad movie night is the one where you didn't press play.",
  "Grab a snack. Dim the lights. Pretend you're at a film festival. You basically are.",
  "You've already read this far. Might as well watch the movie too.",
  "This isn't just a film. It's a conversation starter you haven't unlocked yet.",
  "Every great director started by watching films they didn't choose. So did you. Just now.",
  "The algorithm mixed genres so you don't get bored. You're welcome.",
  "Your brain after this film: expanded. Your couch: still comfy. Win-win.",
  "Watching Oscar films is a personality trait. A good one.",
];

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
  const preFilterIdx = useRef(null); // Saved position before filter auto-skip
  const [watchedSet, setWatchedSet] = useState(new Set());
  const [ratings, setRatings] = useState({});
  const [raters, setRaters] = useState(['Chris', 'Yvonne']);
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    const hash = window.location.hash.replace('#', '');
    const tabMap = { journey: 'journey', films: 'list', list: 'list', battle: 'battle', profiles: 'leaderboard', leaderboard: 'leaderboard' };
    const firstSegment = path.split('/')[0];
    if (tabMap[firstSegment]) return tabMap[firstSegment];
    if (tabMap[path]) return tabMap[path];
    if (tabMap[hash]) return tabMap[hash];
    return localStorage.getItem(LS_TAB_KEY) || 'journey';
  });
  const [screen, setScreen] = useState('start'); // 'start' | 'card' | 'complete'
  const [fading, setFading] = useState(false);
  // Stable tagline that only changes when the current film changes — not on every
  // render (e.g., when rating changes), which previously made the page feel jumpy.
  const [currentTaglineIdx, setCurrentTaglineIdx] = useState(() => Math.floor(Math.random() * JOURNEY_TAGLINES.length));
  const currentTagline = JOURNEY_TAGLINES[currentTaglineIdx];

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailMovie, setDetailMovie] = useState(null);
  const [detailMovieList, setDetailMovieList] = useState(null); // ordered list for prev/next navigation
  const [infoOpen, setInfoOpen] = useState(false);
  const [profileModalId, setProfileModalId] = useState(null);
  const [autoSelectProfileId, setAutoSelectProfileId] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    const parts = path.split('/');
    if (parts[0] === 'profiles' && parts[1]) return parts[1];
    return null;
  });
  const [dailyOpen, setDailyOpen] = useState(false);
  const [journeyCard, setJourneyCard] = useState(null);
  const [showJourneyPack, setShowJourneyPack] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('oscars_banner_dismissed') === 'true';
  });

  // Sync journey
  const [allProfilesForSync, setAllProfilesForSync] = useState([]);

  // Activity feed
  const [activityFeed, setActivityFeed] = useState([]);

  // --- Helper: generate playlist from seed ---
  const generatePlaylist = useCallback((seed) => {
    const rng = mulberry32(seed);
    const pl = enforceSeriesOrder(diversityShuffle([...MOVIES], rng));
    return pl;
  }, []);

  // --- Save indicator state ---
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef(null);

  // --- Helper: save to Firestore with retry logic ---
  const firebaseSave = useCallback((field, value) => {
    if (!profile) return;
    setSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    const doSave = (attempt = 1) => {
      saveProfileField(profile.id, field, value)
        .then(() => {
          saveTimeout.current = setTimeout(() => setSaving(false), 800);
        })
        .catch((err) => {
          console.error(`Save failed (attempt ${attempt}):`, field, err);
          if (attempt < 3) {
            setTimeout(() => doSave(attempt + 1), 1000 * attempt);
          } else {
            setSaving(false);
          }
        });
    };
    doSave();
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

  // --- Fetch all profiles for sync dropdown ---
  useEffect(() => {
    getDocs(collection(db, 'profiles')).then(snap => {
      setAllProfilesForSync(snap.docs.map(d => ({
        id: d.id,
        displayName: d.data().displayName || d.id,
        avatar: d.data().avatar || '',
        watched: d.data().watched || [],
        ratings: d.data().ratings || {},
        raters: d.data().raters || [],
      })));
    }).catch(() => {});
  }, []);

  // --- Load activity feed on mount and refresh periodically ---
  useEffect(() => {
    const loadActivity = () => {
      getRecentActivity(15).then(setActivityFeed).catch(() => {});
    };
    loadActivity();
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Initialize all state from a loaded profile ---
  const initializeFromProfile = useCallback((data) => {
    setProfile(data);
    localStorage.setItem(LS_PROFILE_KEY, data.id);

    // Determine seed and playlist order
    let seed = data.seed;
    let pl;
    let needsNewPlaylist = false;

    if (data.playlistOrder && data.playlistOrder.length > 0) {
      if (typeof data.playlistOrder[0] === 'number') {
        // OLD FORMAT: numeric indices — regenerate playlist instead of trying to migrate
        needsNewPlaylist = true;
      } else {
        // NEW FORMAT: movie IDs
        pl = data.playlistOrder
          .map(id => MOVIES_BY_ID[id])
          .filter(Boolean);
        // Add any new movies not in the saved order (newly added films)
        const savedIds = new Set(data.playlistOrder);
        const newMovies = MOVIES.filter(m => !savedIds.has(m.id));
        if (newMovies.length > 0) {
          // Shuffle new movies and append them
          const rng = mulberry32(seed || 12345);
          for (let i = newMovies.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [newMovies[i], newMovies[j]] = [newMovies[j], newMovies[i]];
          }
          pl = [...pl, ...newMovies];
          // Save updated order
          saveProfileField(data.id, 'playlistOrder', pl.map(m => m.id)).catch(() => {});
        }
      }
    } else {
      needsNewPlaylist = true;
    }

    if (needsNewPlaylist) {
      // Generate new seed if needed
      if (!seed) {
        seed = Math.floor(Math.random() * 0xFFFFFFFF);
        saveProfileField(data.id, 'seed', seed).catch(() => {});
      }
      pl = generatePlaylist(seed);
      const orderIds = pl.map(m => m.id);
      saveProfileField(data.id, 'playlistOrder', orderIds).catch(() => {});
    }

    // Migrate watched to movie ID format
    let watchedKeys;
    if (Array.isArray(data.watched) && data.watched.length > 0) {
      const first = data.watched[0];
      if (typeof first === 'number') {
        // OLD FORMAT: numeric indices — try to migrate via old playlistOrder
        watchedKeys = new Set();
        if (data.playlistOrder && typeof data.playlistOrder[0] === 'number') {
          for (const idx of data.watched) {
            const moviesIdx = data.playlistOrder[idx];
            if (moviesIdx != null && moviesIdx < MOVIES.length) {
              const m = MOVIES[moviesIdx];
              if (m) watchedKeys.add(m.id);
            }
          }
        }
        saveProfileField(data.id, 'watched', [...watchedKeys]).catch(() => {});
      } else if (typeof first === 'string' && first.includes('|')) {
        // INTERMEDIATE FORMAT: "Title|year" strings — migrate to IDs
        watchedKeys = new Set();
        for (const key of data.watched) {
          const sepIdx = key.lastIndexOf('|');
          const title = key.substring(0, sepIdx);
          const yearStr = key.substring(sepIdx + 1);
          const movie = MOVIES.find(m => m.title === title && String(m.year) === yearStr);
          if (movie) watchedKeys.add(movie.id);
        }
        saveProfileField(data.id, 'watched', [...watchedKeys]).catch(() => {});
      } else {
        // NEW FORMAT: movie IDs (strings without |)
        watchedKeys = new Set(data.watched);
      }
    } else {
      watchedKeys = new Set();
    }

    // Migrate ratings to use movie IDs as keys
    const rawRatings = data.ratings || {};
    const migratedRatings = {};
    let needsRatingMigration = false;

    for (const [key, value] of Object.entries(rawRatings)) {
      if (key.includes('|')) {
        // OLD FORMAT: "Title|year" — migrate to movie ID
        const sepIdx = key.lastIndexOf('|');
        const title = key.substring(0, sepIdx);
        const yearStr = key.substring(sepIdx + 1);
        const movie = MOVIES.find(m => m.title === title && String(m.year) === yearStr);
        if (movie) {
          migratedRatings[movie.id] = value;
          needsRatingMigration = true;
        }
      } else {
        // Already a movie ID
        migratedRatings[key] = value;
      }
    }

    if (needsRatingMigration) {
      saveProfileField(data.id, 'ratings', migratedRatings).catch(() => {});
    }

    // Set raters
    const ratersList = data.raters || ['Chris', 'Yvonne'];

    // Set current index
    const idx = data.currentIdx || 0;

    setPlaylist(pl);
    setCurrentIdx(Math.min(idx, pl.length - 1));
    setWatchedSet(watchedKeys);
    setRatings(migratedRatings);
    setRaters(ratersList);

    // Load theme preference from profile if available
    if (data.theme) {
      const profileDark = data.theme === 'dark';
      setIsDark(profileDark);
      localStorage.setItem(LS_THEME_KEY, data.theme);
    }

    // Determine screen state
    if (idx > 0 || watchedKeys.size > 0) {
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
  const isCurrentWatched = currentMovie ? watchedSet.has(movieKey(currentMovie)) : false;

  // Re-roll the tagline only when the film changes
  useEffect(() => {
    setCurrentTaglineIdx(Math.floor(Math.random() * JOURNEY_TAGLINES.length));
  }, [currentIdx]);

  // Can advance if current film is watched AND at least one rater has rated it
  const currentRatingKeyVal = currentMovie ? ratingKey(currentMovie) : null;
  const currentRatings = currentRatingKeyVal ? ratings[currentRatingKeyVal] : null;
  const hasAnyRating = currentRatings && Object.values(currentRatings).some(v => v != null);
  const canAdvance = isCurrentWatched && hasAnyRating;

  // watchedSet contains movie IDs; pass directly to components
  const watchedTitleSet = watchedSet;

  // --- Filter helpers ---
  const activeFilters = profile?.filters || null;

  // Smart filter context
  const smartContext = useMemo(() => ({
    watchedSet,
    allProfiles: allProfilesForSync,
    currentProfileId: profile?.id,
  }), [watchedSet, allProfilesForSync, profile?.id]);

  // Check if a playlist index passes the current filters
  const idxPassesFilter = useCallback((idx) => {
    const movie = playlist[idx];
    if (!movie) return false;
    return moviePassesFilter(movie, activeFilters, smartContext, idx === currentIdx);
  }, [playlist, activeFilters, smartContext, currentIdx]);

  // Compute filtered eligible film counts for progress
  const eligibleStats = useMemo(() => {
    let total = 0;
    let watched = 0;
    for (let i = 0; i < playlist.length; i++) {
      if (idxPassesFilter(i)) {
        total++;
        if (watchedSet.has(movieKey(playlist[i]))) watched++;
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
  const goNext = useCallback(async () => {
    // Find next eligible film after currentIdx
    let next = currentIdx + 1;
    while (next < playlist.length && !idxPassesFilter(next)) {
      next++;
    }
    if (next >= playlist.length) {
      setScreen('complete');
      return;
    }

    // Award a card for completing this film (anti-cheat: only if not already earned)
    const currentMovie = playlist[currentIdx];
    if (currentMovie && profile) {
      const earnedCards = profile.earnedCardFilms || [];
      if (!earnedCards.includes(currentMovie.id)) {
        try {
          const taken = await getTakenCards();
          const pack = generatePack([], [], taken);
          if (pack && pack.length > 0) {
            setJourneyCard(pack[0]);
            // Mark this film as having earned a card
            const newEarned = [...earnedCards, currentMovie.id];
            firebaseSave('earnedCardFilms', newEarned);
            setProfile(prev => prev ? { ...prev, earnedCardFilms: newEarned } : prev);
          }
        } catch { /* silent — don't block navigation */ }
      }
    }

    setFading(true);
    setTimeout(() => {
      setCurrentIdx(next);
      firebaseSave('currentIdx', next);
      setFading(false);
    }, 220);
  }, [currentIdx, playlist, profile, firebaseSave, idxPassesFilter]);

  const goPrev = useCallback(() => {
    // Previous always goes back one step — no filter skipping
    // User is revisiting films they've already passed
    let prev = currentIdx - 1;
    if (prev < 0) return;
    setFading(true);
    setTimeout(() => {
      setCurrentIdx(prev);
      firebaseSave('currentIdx', prev);
      setFading(false);
    }, 220);
  }, [currentIdx, firebaseSave, idxPassesFilter]);

  // --- Watched toggle ---
  const clearRatingsForMovie = useCallback((movie) => {
    const rKey = ratingKey(movie);
    setRatings(prev => {
      const next = { ...prev };
      delete next[rKey];
      firebaseSave('ratings', next);
      setProfile(prev => prev ? { ...prev, ratings: next } : prev);
      return next;
    });
  }, [firebaseSave]);

  const toggleWatched = useCallback(() => {
    if (!currentMovie) return;
    const key = movieKey(currentMovie);
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        clearRatingsForMovie(currentMovie);
      } else {
        next.add(key);
        // Record activity — this is a journey watch
        if (profile) {
          recordActivity(profile, currentMovie).catch(() => {});
          // Refresh activity feed after a short delay
          setTimeout(() => {
            getRecentActivity(15).then(setActivityFeed).catch(() => {});
          }, 1000);
        }
      }
      const nextArr = [...next];
      firebaseSave('watched', nextArr);
      setProfile(prev => prev ? { ...prev, watched: nextArr } : prev);
      return next;
    });
  }, [currentMovie, firebaseSave, profile, clearRatingsForMovie]);

  const toggleWatchedForMovie = useCallback((movie) => {
    const key = movieKey(movie);
    setWatchedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        clearRatingsForMovie(movie);
      } else {
        next.add(key);
      }
      const nextArr = [...next];
      firebaseSave('watched', nextArr);
      setProfile(prev => prev ? { ...prev, watched: nextArr } : prev);
      return next;
    });
  }, [firebaseSave, clearRatingsForMovie]);

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
      setProfile(prev => prev ? { ...prev, ratings: next } : prev);
      return next;
    });
  }, [firebaseSave]);

  // --- Detail modal watched state ---
  const isDetailWatched = useMemo(() => {
    if (!detailMovie) return false;
    return watchedSet.has(movieKey(detailMovie));
  }, [detailMovie, watchedSet]);

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
    const newSeed = Math.floor(Math.random() * 0xFFFFFFFF);
    const newPlaylist = generatePlaylist(newSeed);
    const orderIds = newPlaylist.map(m => m.id);

    setPlaylist(newPlaylist);
    setCurrentIdx(0);
    setProfile(prev => prev ? { ...prev, syncedWith: null } : prev);

    if (profile) {
      saveProfileField(profile.id, 'seed', newSeed).catch(() => {});
      saveProfileField(profile.id, 'playlistOrder', orderIds).catch(() => {});
      saveProfileField(profile.id, 'currentIdx', 0).catch(() => {});
      saveProfileField(profile.id, 'syncedWith', null).catch(() => {});
    }

    setScreen('card');
    setSettingsOpen(false);
  }, [profile, generatePlaylist]);

  // --- Sync journey from another profile ---
  const handleSyncJourney = useCallback(async (targetProfileId) => {
    try {
      const targetData = await loadProfile(targetProfileId);
      if (!targetData || !targetData.playlistOrder) {
        alert('Could not load that profile\'s journey.');
        return;
      }
      // Save current state so we can restore on unsync
      const currentFilters = profile?.filters || null;
      const preSyncData = {
        seed: profile?.seed,
        playlistOrder: playlist.map(m => m.id),
        currentIdx,
        skipWatched: currentFilters?.smart?.skipWatched || false,
      };

      const newOrder = targetData.playlistOrder;
      const newSeed = targetData.seed;
      const newPlaylist = newOrder.map(id => MOVIES_BY_ID[id]).filter(Boolean);
      // Jump to where the target profile actually is, not the beginning
      const targetIdx = targetData.currentIdx || 0;

      // Temporarily disable skipWatched so we land on their film
      // even if we haven't seen the ones before it
      if (currentFilters?.smart?.skipWatched) {
        const newFilters = {
          ...currentFilters,
          smart: { ...currentFilters.smart, skipWatched: false },
        };
        setProfile(prev => prev ? { ...prev, filters: newFilters } : prev);
        firebaseSave('filters', newFilters);
      }

      setPlaylist(newPlaylist);
      setCurrentIdx(targetIdx);
      setProfile(prev => prev ? { ...prev, syncedWith: targetProfileId, preSyncData } : prev);

      firebaseSave('playlistOrder', newOrder);
      firebaseSave('seed', newSeed);
      firebaseSave('currentIdx', targetIdx);
      firebaseSave('syncedWith', targetProfileId);
      firebaseSave('preSyncData', preSyncData);
    } catch (e) {
      console.error('Sync failed:', e);
      alert('Sync failed. Try again.');
    }
  }, [firebaseSave, profile, playlist, currentIdx]);

  // --- Unsync journey — restore original seed and order ---
  const handleUnsync = useCallback(() => {
    const saved = profile?.preSyncData;

    if (saved && saved.playlistOrder && saved.seed != null) {
      // Restore original journey
      const restoredPlaylist = saved.playlistOrder.map(id => MOVIES_BY_ID[id]).filter(Boolean);
      const restoredIdx = saved.currentIdx || 0;

      // Restore skipWatched if it was on before sync
      if (saved.skipWatched) {
        const currentFilters = profile?.filters || {};
        const restoredFilters = {
          ...currentFilters,
          smart: { ...(currentFilters.smart || {}), skipWatched: true },
        };
        setProfile(prev => prev ? { ...prev, filters: restoredFilters } : prev);
        firebaseSave('filters', restoredFilters);
      }

      setPlaylist(restoredPlaylist);
      setCurrentIdx(restoredIdx);
      setProfile(prev => prev ? { ...prev, syncedWith: null, preSyncData: null } : prev);

      firebaseSave('syncedWith', null);
      firebaseSave('preSyncData', null);
      firebaseSave('seed', saved.seed);
      firebaseSave('playlistOrder', saved.playlistOrder);
      firebaseSave('currentIdx', restoredIdx);
    } else {
      // No saved data — generate fresh
      const newSeed = Math.floor(Math.random() * 0xFFFFFFFF);
      const newPlaylist = generatePlaylist(newSeed);
      const orderIds = newPlaylist.map(m => m.id);

      setPlaylist(newPlaylist);
      setCurrentIdx(0);
      setProfile(prev => prev ? { ...prev, syncedWith: null, preSyncData: null } : prev);

      firebaseSave('syncedWith', null);
      firebaseSave('preSyncData', null);
      firebaseSave('seed', newSeed);
      firebaseSave('playlistOrder', orderIds);
      firebaseSave('currentIdx', 0);
    }
  }, [firebaseSave, profile, generatePlaylist]);

  const handleClearCache = useCallback(() => {
    const count = clearCache();
    window.alert(`Cleared ${count} cached poster/info entries.`);
    setSettingsOpen(false);
  }, []);

  // --- Auto-skip to next eligible film when current is filtered out ---
  // Saves position before skipping so we can snap back when filters are removed
  useEffect(() => {
    if (screen !== 'card' || !playlist.length || eligibleStats.total === 0) return;
    if (!idxPassesFilter(currentIdx)) {
      // Save the original position if we haven't already
      if (preFilterIdx.current === null) {
        preFilterIdx.current = currentIdx;
      }
      // Find next eligible film forward, or backward if none ahead
      let next = currentIdx + 1;
      while (next < playlist.length && !idxPassesFilter(next)) next++;
      if (next >= playlist.length) {
        next = currentIdx - 1;
        while (next >= 0 && !idxPassesFilter(next)) next--;
      }
      if (next >= 0 && next < playlist.length) {
        setCurrentIdx(next);
        // Don't save to Firestore — this is a temporary filter skip
      }
    } else if (preFilterIdx.current !== null) {
      // Filters changed and the saved position is now valid — snap back
      if (idxPassesFilter(preFilterIdx.current)) {
        setCurrentIdx(preFilterIdx.current);
        preFilterIdx.current = null;
      }
    }
  }, [currentIdx, screen, playlist, idxPassesFilter, eligibleStats.total]);

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

  // --- Allow skip toggle ---
  const handleAllowSkipChange = useCallback((val) => {
    setProfile(prev => prev ? { ...prev, allowSkip: val } : prev);
    firebaseSave('allowSkip', val);
  }, [firebaseSave]);

  // --- Simple battle graphics toggle ---
  const handleSimpleBattleChange = useCallback((val) => {
    setProfile(prev => prev ? { ...prev, simpleBattle: val } : prev);
    firebaseSave('simpleBattle', val);
  }, [firebaseSave]);

  // --- Private profile toggle ---
  const handlePrivateProfileChange = useCallback((val) => {
    setProfile(prev => prev ? { ...prev, privateProfile: val } : prev);
    firebaseSave('privateProfile', val);
  }, [firebaseSave]);

  // --- Skip film ---
  const handleSkip = useCallback(() => {
    if (!currentMovie || playlist.length === 0) return;

    // Track skip
    const newSkipCount = (profile?.skipCount || 0) + 1;
    const skippedFilms = [...(profile?.skippedFilms || [])];
    if (!skippedFilms.includes(currentMovie.id)) skippedFilms.push(currentMovie.id);
    setProfile(prev => prev ? { ...prev, skipCount: newSkipCount, skippedFilms } : prev);
    firebaseSave('skipCount', newSkipCount);
    firebaseSave('skippedFilms', skippedFilms);

    // Remove current film from its position and insert it later
    const newPlaylist = [...playlist];
    const skippedMovie = newPlaylist.splice(currentIdx, 1)[0];

    // Insert at a random position 10-30 films ahead (or near end if not enough films left)
    const minOffset = Math.min(10, newPlaylist.length - currentIdx);
    const maxOffset = Math.min(30, newPlaylist.length - currentIdx);
    const insertOffset = minOffset + Math.floor(Math.random() * (maxOffset - minOffset + 1));
    const insertIdx = currentIdx + insertOffset;

    newPlaylist.splice(insertIdx, 0, skippedMovie);

    setPlaylist(newPlaylist);
    // Save new order
    firebaseSave('playlistOrder', newPlaylist.map(m => m.id));

    // Don't change currentIdx — the next film naturally slides into the current position
    // But trigger a re-render of the card
    setFading(true);
    setTimeout(() => setFading(false), 220);
  }, [currentMovie, currentIdx, playlist, firebaseSave]);

  // --- Tab change ---
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem(LS_TAB_KEY, tab);
    const pathNames = { journey: '/', list: '/films', battle: '/battle', leaderboard: '/profiles' };
    window.history.pushState(null, '', pathNames[tab] || '/');
  }, []);

  // --- Path routing: handle browser back/forward ---
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
      const tabMap = { '': 'journey', journey: 'journey', films: 'list', battle: 'battle', profiles: 'leaderboard' };
      const tab = tabMap[path];
      if (tab) {
        setActiveTab(tab);
        localStorage.setItem(LS_TAB_KEY, tab);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <main style={{ width: '100%', maxWidth: '760px', padding: '24px', margin: '0 auto' }}>
        <SkeletonCard />
      </main>
    );
  }

  // --- Not logged in: show login screen ---
  if (!profile) {
    return <div className="login-scroll-wrap"><LoginScreen onLogin={handleLogin} /></div>;
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
        onOpenInfo={() => setInfoOpen(true)}
        onAvatarChange={handleAvatarChange}
        saving={saving}
        onOpenProfile={(id) => setProfileModalId(id)}
      />

      <div className="app-scroll-area cinematic-enter">
      {showProgress && (
        <ProgressBar
          currentIdx={currentIdx}
          total={playlist.length}
          watchedCount={watchedSet.size}
          totalMovies={playlist.length}
        />
      )}

      {/* Journey tab */}
      {activeTab === 'journey' && (
        <main>
          {screen === 'start' && (
            <StartScreen onStart={handleStart} />
          )}
          {screen === 'card' && eligibleStats.total === 0 && (
            <>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: 'var(--cream-dim)', fontSize: '1.1rem', marginBottom: '12px' }}>
                  All films are filtered out.
                </p>
                <p style={{ color: 'var(--cream-dim)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Turn some filters back on below.
                </p>
              </div>
              <JourneyControls
                filters={profile?.filters}
                onFiltersChange={(newFilters) => {
                  setProfile(prev => prev ? { ...prev, filters: newFilters } : prev);
                  firebaseSave('filters', newFilters);
                }}
                onReshuffle={handleReshuffle}
                eligibleCount={eligibleStats.total}
                totalCount={playlist.length}
                profiles={allProfilesForSync}
                currentProfileId={profile?.id}
                onSyncJourney={handleSyncJourney}
                syncedWith={profile?.syncedWith}
                onUnsync={handleUnsync}
              />
            </>
          )}
          {screen === 'card' && currentMovie && eligibleStats.total > 0 && (
            <>
              {eligiblePosition < 1 && !bannerDismissed && (
                <div className="journey-welcome-banner">
                  <button className="journey-welcome-close" onClick={() => { setBannerDismissed(true); localStorage.setItem('oscars_banner_dismissed', 'true'); }}>✕</button>
                  <div className="journey-welcome-title">🏆 The Oscars Journey</div>
                  <div className="journey-welcome-text">
                    We picked {MOVIES.length} Oscar-nominated films and shuffled them so you never watch two similar films back-to-back. Watch each one, rate it, and move on. No overthinking — just press play.
                  </div>
                </div>
              )}
              {/* Daily Oscar banner */}
              {(() => {
                const status = getDailyStatus();
                const streak = getDailyStreak();
                return (
                  <div className="daily-banner" onClick={() => setDailyOpen(true)}>
                    <div className="daily-banner-left">
                      <span className="daily-banner-icon">🎬</span>
                      <div>
                        <div className="daily-banner-text">Daily Oscar</div>
                        <div className="daily-banner-sub">
                          {status?.solved ? 'Completed!' : status?.failed ? 'Try again tomorrow' : 'Guess today\'s movie from a quote'}
                        </div>
                      </div>
                    </div>
                    {streak > 0 && <div className="daily-banner-streak">{streak} day streak</div>}
                  </div>
                );
              })()}

              {/* Card earned banner */}
              {journeyCard && !showJourneyPack && (
                <CardEarnedBanner
                  onOpen={() => setShowJourneyPack(true)}
                  onDismiss={() => setJourneyCard(null)}
                />
              )}

              <FilmCard
                movie={currentMovie}
                isWatched={isCurrentWatched}
                onToggleWatched={toggleWatched}
                fading={fading}
                ratings={ratings}
                onRatingChange={handleRatingChange}
                raters={raters}
                personalElo={profile?.personalElo}
                allowSkip={profile?.allowSkip !== false}
                onSkip={handleSkip}
                allProfiles={allProfilesForSync}
                currentProfileId={profile?.id}
                onOpenDetail={setDetailMovie}
                onOpenProfile={(id) => setProfileModalId(id)}
              />
              <NavButtons
                currentIdx={currentIdx}
                total={playlist.length}
                onPrev={goPrev}
                onNext={goNext}
                canAdvance={canAdvance}
              />
              <div className="journey-tagline">
                {currentTagline}
              </div>
              <ActivityFeed activities={activityFeed} currentProfileId={profile?.id} onOpenDetail={setDetailMovie} />
              <JourneyControls
                filters={profile?.filters}
                onFiltersChange={(newFilters) => {
                  setProfile(prev => prev ? { ...prev, filters: newFilters } : prev);
                  firebaseSave('filters', newFilters);
                }}
                onReshuffle={handleReshuffle}
                eligibleCount={eligibleStats.total}
                totalCount={playlist.length}
                profiles={allProfilesForSync}
                currentProfileId={profile?.id}
                onSyncJourney={handleSyncJourney}
                syncedWith={profile?.syncedWith}
                onUnsync={handleUnsync}
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
          onOpenDetail={(movie, movieList) => {
            setDetailMovie(movie);
            if (movieList) setDetailMovieList(movieList);
          }}
          onToggleWatched={toggleWatchedForMovie}
          ratings={ratings}
          raters={raters}
        />
      )}

      {/* Battle tab */}
      {activeTab === 'battle' && (
        <MovieBattle
          profile={profile}
          playlist={playlist}
          watchedSet={watchedSet}
          onOpenDetail={setDetailMovie}
          simpleBattle={profile?.simpleBattle || false}
          onSaveProfile={(field, value) => {
            firebaseSave(field, value);
            setProfile(prev => prev ? { ...prev, [field]: value } : prev);
          }}
        />
      )}

      {/* Profiles tab (includes stats) */}
      {activeTab === 'leaderboard' && (
        <Leaderboard
          currentProfile={profile}
          currentRatings={ratings}
          onOpenDetail={setDetailMovie}
          watchedTitleSet={watchedTitleSet}
          ratings={ratings}
          raters={raters}
          onSaveProfile={(field, value) => {
            firebaseSave(field, value);
            setProfile(prev => prev ? { ...prev, [field]: value } : prev);
          }}
          autoSelectProfileId={autoSelectProfileId}
          onClearAutoSelect={() => setAutoSelectProfileId(null)}
        />
      )}
      </div>{/* end app-scroll-area */}

      {/* Mobile bottom tab bar — sits at bottom of flex layout */}
      <div className="mobile-tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="mobile-tab-icon">{tab.icon}</span>
            <span className="mobile-tab-label">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Film detail modal */}
      {detailMovie && (
        <FilmDetailModal
          movie={detailMovie}
          isWatched={isDetailWatched}
          onToggleWatched={() => toggleWatchedForMovie(detailMovie)}
          onClose={() => { setDetailMovie(null); setDetailMovieList(null); }}
          ratings={ratings}
          personalElo={profile?.personalElo}
          onRatingChange={handleRatingChange}
          raters={raters}
          movieList={detailMovieList}
          onNavigate={(movie) => setDetailMovie(movie)}
          onOpenProfile={(id) => setProfileModalId(id)}
          wallet={profile?.wallet}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          raters={raters}
          onRatersChange={handleRatersChange}
          avatar={profile?.avatar || '🍿'}
          onAvatarChange={handleAvatarChange}
          allowSkip={profile?.allowSkip !== false}
          onAllowSkipChange={handleAllowSkipChange}
          simpleBattle={profile?.simpleBattle || false}
          onSimpleBattleChange={handleSimpleBattleChange}
          privateProfile={profile?.privateProfile || false}
          onPrivateProfileChange={handlePrivateProfileChange}
          onClose={() => setSettingsOpen(false)}
          onClearCache={handleClearCache}
          profile={profile}
          onLogout={handleLogout}
        />
      )}

      {/* Info modal */}
      {infoOpen && (
        <InfoModal onClose={() => setInfoOpen(false)} />
      )}

      {/* Journey card pack opening */}
      {showJourneyPack && journeyCard && (
        <PackOpening
          cards={[journeyCard]}
          wallet={profile?.wallet || []}
          maxWallet={getMaxWallet(watchedSet.size)}
          currentShowcase={profile?.showcase || []}
          onSaveShowcase={(s) => { firebaseSave('showcase', s); setProfile(prev => prev ? { ...prev, showcase: s } : prev); }}
          onClose={() => { setShowJourneyPack(false); setJourneyCard(null); }}
          onKeep={async (card) => {
            const wallet = [...(profile?.wallet || []), card];
            firebaseSave('wallet', wallet);
            setProfile(prev => prev ? { ...prev, wallet } : prev);
            try { await registerCard(card.movieId, card.rarity, profile.id); } catch {}
            setShowJourneyPack(false);
            setJourneyCard(null);
          }}
          onReplace={async (card, replaceIdx) => {
            const wallet = [...(profile?.wallet || [])];
            const replaced = wallet[replaceIdx];
            wallet[replaceIdx] = card;
            firebaseSave('wallet', wallet);
            setProfile(prev => prev ? { ...prev, wallet } : prev);
            const showcase = profile?.showcase || [];
            if (showcase.some(s => s.movieId === replaced.movieId)) {
              const newShowcase = showcase.filter(s => s.movieId !== replaced.movieId);
              firebaseSave('showcase', newShowcase);
              setProfile(prev => prev ? { ...prev, showcase: newShowcase } : prev);
            }
            try {
              await releaseCard(replaced.movieId, replaced.rarity);
              await registerCard(card.movieId, card.rarity, profile.id);
            } catch {}
            setShowJourneyPack(false);
            setJourneyCard(null);
          }}
        />
      )}

      {/* Daily Oscar game */}
      {dailyOpen && (
        <DailyOscar
          onClose={() => setDailyOpen(false)}
          profile={profile}
          onSaveProfile={(field, value) => {
            firebaseSave(field, value);
            setProfile(prev => prev ? { ...prev, [field]: value } : prev);
          }}
        />
      )}

      {/* What's New announcement — one time only */}
      {profile && (
        <WhatsNewAnnouncement
          onGoToBattle={() => handleTabChange('battle')}
          onPlayDaily={() => setDailyOpen(true)}
        />
      )}

      {/* Profile modal */}
      {profileModalId && (
        <ProfileModal
          profileId={profileModalId}
          onClose={() => setProfileModalId(null)}
          currentProfile={profile}
          currentRatings={ratings}
          onOpenDetail={(movie) => { setProfileModalId(null); setDetailMovie(movie); }}
          onOpenProfile={(id) => setProfileModalId(id)}
          onAvatarChange={handleAvatarChange}
          onViewFullProfile={(id) => {
            setProfileModalId(null);
            setAutoSelectProfileId(id);
            handleTabChange('leaderboard');
          }}
          onSaveProfile={(field, value) => {
            firebaseSave(field, value);
            setProfile(prev => prev ? { ...prev, [field]: value } : prev);
          }}
        />
      )}
    </>
  );
}
