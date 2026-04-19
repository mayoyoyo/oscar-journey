// Shared film-attribute predicates used by both the Journey filter (App.jsx)
// and the Film tab filter (FilmList.jsx). A film can have multiple attributes
// simultaneously (Parasite is International AND Best Picture winner). These
// helpers let a single checkbox "International" / "Animated" / "Documentary"
// / "Silent" / "Black & White" catch every film with that property across
// all Oscar categories and Essentials.

import LANGUAGES from '../data/languages.json';

// International = non-English spoken language. Covers Oscar INT winners, any
// film with a non-English entry in languages.json (which is populated only
// for non-English films), and any film whose alsoWon includes 'INT'.
export function isInternational(movie) {
  if (movie.category === 'INT') return true;
  if ((movie.alsoWon || []).includes('INT')) return true;
  return LANGUAGES[movie.id] != null;
}

// Animated — Oscar ANIM category, alsoWon ANIM, or curated ID set for films
// that predate the Animated Feature Oscar (introduced in 2001) or are
// otherwise outside the ANIM winner pool. Mirrors the DOC_IDS pattern —
// animation is a medium, not a genre, so we enumerate.
// Note: Babe (1995) is intentionally excluded — live-action with
// animatronic/CGI animals, not an animated film.
const ANIM_IDS = new Set([
  'snow-white-and-the-seven-dwarfs-1937',
  'fantasia-1940',
  'grave-of-the-fireflies-1988',
  'my-neighbor-totoro-1988',
  'beauty-and-the-beast-1991',
  'the-lion-king-1994',
  'toy-story-1995',
  'princess-mononoke-1997',
  'the-iron-giant-1999',
  'shrek-2001',
  'spirited-away-2002',
  'finding-nemo-2003',
  'the-incredibles-2004',
  'howls-moving-castle-2004',
  'wallace-and-gromit-the-curse-of-the-were-rabbit-2005',
  'happy-feet-2006',
  'ratatouille-2007',
  'wall-e-2008',
  'up-2009',
  'fantastic-mr-fox-2009',
  'mary-and-max-2009',
  'how-to-train-your-dragon-2010',
  'toy-story-3-2010',
  'rango-2011',
  'brave-2012',
  'frozen-2013',
  'big-hero-6-2014',
  'inside-out-2015',
  'zootopia-2016',
  'your-name-2016',
  'coco-2017',
  'spider-man-into-the-spider-verse-2018',
  'toy-story-4-2019',
  'soul-2020',
  'encanto-2021',
  'marcel-the-shell-with-shoes-on-2021',
  'guillermo-del-toros-pinocchio-2022',
  'the-boy-and-the-heron-2023',
  'spider-man-across-the-spider-verse-2023',
  'flow-2024',
  'the-wild-robot-2024',
  'kpop-demon-hunters-2025',
]);
export function isAnimated(movie) {
  if (movie.category === 'ANIM') return true;
  if ((movie.alsoWon || []).includes('ANIM')) return true;
  return ANIM_IDS.has(movie.id);
}

// Documentary — curated list. Docs don't have a distinguishing genre code,
// so we enumerate. Additions welcome as the catalog grows.
const DOC_IDS = new Set([
  'woodstock-1970',
  'hearts-and-minds-1974',
  'grey-gardens-1975',
  'harlan-county-usa-1976',
  'the-last-waltz-1978',
  'koyaanisqatsi-1982',
  'sans-soleil-1982',
  'the-times-of-harvey-milk-1984',
  'stop-making-sense-1984',
  'shoah-1985',
  'the-thin-blue-line-1988',
  'thelonious-monk-straight-no-chaser-1988',
  'paris-is-burning-1990',
  'hoop-dreams-1994',
  'when-we-were-kings-1996',
  'buena-vista-social-club-1999',
  'the-gleaners-and-i-2000',
  'in-vanda-s-room-2000',
  'the-fog-of-war-2003',
  'faces-places-2017',
  'minding-the-gap-2018',
]);
export function isDocumentary(movie) {
  return DOC_IDS.has(movie.id);
}

// Silent — pre-1928 is nearly all silent (sound synchronized pictures started
// with The Jazz Singer 1927 but didn't dominate until ~1930). Include a few
// famous post-1928 silent or mostly-silent films.
const SILENT_POST_1928_IDS = new Set([
  'city-lights-1931',         // Chaplin's holdout — score + effects but no dialogue
  'modern-times-1936',        // Chaplin again, partial dialogue but mostly silent
  'the-artist-2011',          // intentional silent-film revival
  'flow-2024',                // dialogue-less animated feature
]);
export function isSilent(movie) {
  if (movie.year < 1928) return true;
  return SILENT_POST_1928_IDS.has(movie.id);
}

// Black & White — color photography dominated from ~1955 onward. Pre-1955
// defaults to B&W except for known color films (Wizard of Oz, GWTW, etc.).
// Post-1955, enumerate known B&W films (Hitchcock's Psycho, Schindler's List,
// etc.).
const COLOR_PRE_1955_IDS = new Set([
  'the-wizard-of-oz-1939',      // mostly Technicolor
  'gone-with-the-wind-1939',
  'the-adventures-of-robin-hood-1938',
  'fantasia-1940',
  'pinocchio-1940',
  'bambi-1942',
  'snow-white-and-the-seven-dwarfs-1937',
  'black-narcissus-1947',
  'the-red-shoes-1948',
  'cinderella-1950',
  'singin-in-the-rain-1952',
  'an-american-in-paris-1951',
  'a-matter-of-life-and-death-1946', // Technicolor + B&W mix, leaning color
]);
const BW_POST_1955_IDS = new Set([
  'psycho-1960',
  '12-angry-men-1957',
  'paths-of-glory-1957',
  'witness-for-the-prosecution-1957',
  'sweet-smell-of-success-1957',
  'touch-of-evil-1958',
  'anatomy-of-a-murder-1959',
  'some-like-it-hot-1959',
  'the-apartment-1960',
  'the-hustler-1961',
  'a-raisin-in-the-sun-1961',
  'judgment-at-nuremberg-1961',
  'the-man-who-shot-liberty-valance-1962',
  'to-kill-a-mockingbird-1962',
  'the-manchurian-candidate-1962',
  'dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb-1964',
  'harakiri-1962',
  'the-shop-on-main-street-1965',
  'persona-1966',
  'whos-afraid-of-virginia-woolf-1966',
  'closely-watched-trains-1966',
  'night-of-the-living-dead-1968',
  'the-last-picture-show-1971',
  'paper-moon-1973',
  'young-frankenstein-1974',
  'eraserhead-1977',
  'manhattan-1979',
  'raging-bull-1980',
  'the-elephant-man-1980',
  'stranger-than-paradise-1984',
  'schindlers-list-1993',
  'the-artist-2011',
  'nebraska-2013',
  'ida-2013',
  'roma-2018',
  'marty-1955',
  'ordet-1955',
  'pather-panchali-1955',
  'the-night-of-the-hunter-1955',
  'a-man-escaped-1956',
  'invasion-of-the-body-snatchers-1956',
  'nights-of-cabiria-1957',
  'the-cranes-are-flying-1957',
  'the-seventh-seal-1957',
  'wild-strawberries-1957',
  'the-400-blows-1959',
  'breathless-1960',
  'lavventura-1960',
  'la-dolce-vita-1960',
  'the-virgin-spring-1960',
  'la-notte-1961',
  'last-year-at-marienbad-1961',
  'through-a-glass-darkly-1961',
  'yojimbo-1961',
  '8-and-a-half-1963',
  'high-and-low-1963',
  'andrei-rublev-1966',
  'the-battle-of-algiers-1966',
  'lenny-1974',
  'killer-of-sheep-1977',
  'satantango-1994',
  'werckmeister-harmonies-2000',
  'mank-2020',
  'belfast-2021',
]);
export function isBlackAndWhite(movie) {
  if (BW_POST_1955_IDS.has(movie.id)) return true;
  if (COLOR_PRE_1955_IDS.has(movie.id)) return false;
  return movie.year < 1955;
}

// Category filter (additive): returns true if the film matches the current
// attribute selection. If nothing is checked, the filter is a no-op (passes
// everything). Otherwise a film passes if it matches ANY checked attribute.
export function matchesCategoryFilter(movie, categories) {
  const c = categories || {};
  const anyChecked = c.INT || c.ANIM || c.DOC || c.SILENT || c.BW;
  if (!anyChecked) return true;
  if (c.INT && isInternational(movie)) return true;
  if (c.ANIM && isAnimated(movie)) return true;
  if (c.DOC && isDocumentary(movie)) return true;
  if (c.SILENT && isSilent(movie)) return true;
  if (c.BW && isBlackAndWhite(movie)) return true;
  return false;
}
