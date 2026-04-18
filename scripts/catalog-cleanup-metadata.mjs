// Companion migration: add director/cast/language metadata for the 13 INT
// winners inserted by catalog-cleanup-2026.mjs. Runs against the three JSON
// metadata files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_PATH = path.resolve(__dirname, '../src/data/directors.json');
const CAST_PATH = path.resolve(__dirname, '../src/data/cast.json');
const LANG_PATH = path.resolve(__dirname, '../src/data/languages.json');

const META = {
  'the-virgin-spring-1960': {
    director: 'Ingmar Bergman',
    cast: ['Max von Sydow', 'Birgitta Valberg', 'Gunnel Lindblom', 'Birgitta Pettersson', 'Axel Düberg'],
    lang: 'Swedish', country: 'Sweden',
  },
  'through-a-glass-darkly-1961': {
    director: 'Ingmar Bergman',
    cast: ['Harriet Andersson', 'Gunnar Björnstrand', 'Max von Sydow', 'Lars Passgård'],
    lang: 'Swedish', country: 'Sweden',
  },
  'the-shop-on-main-street-1965': {
    director: 'Ján Kadár and Elmar Klos',
    cast: ['Ida Kamińska', 'Jozef Kroner', 'Hana Slivková', 'František Zvarík'],
    lang: 'Slovak', country: 'Czechoslovakia',
  },
  'closely-watched-trains-1966': {
    director: 'Jiří Menzel',
    cast: ['Václav Neckář', 'Josef Somr', 'Vlastimil Brodský', 'Vladimír Valenta'],
    lang: 'Czech', country: 'Czechoslovakia',
  },
  'investigation-of-a-citizen-above-suspicion-1970': {
    director: 'Elio Petri',
    cast: ['Gian Maria Volonté', 'Florinda Bolkan', 'Salvo Randone'],
    lang: 'Italian', country: 'Italy',
  },
  'the-garden-of-the-finzi-continis-1970': {
    director: 'Vittorio De Sica',
    cast: ['Lino Capolicchio', 'Dominique Sanda', 'Helmut Berger', 'Fabio Testi'],
    lang: 'Italian', country: 'Italy',
  },
  'the-discreet-charm-of-the-bourgeoisie-1972': {
    director: 'Luis Buñuel',
    cast: ['Fernando Rey', 'Delphine Seyrig', 'Paul Frankeur', 'Stéphane Audran', 'Bulle Ogier'],
    lang: 'French', country: 'France',
  },
  'day-for-night-1973': {
    director: 'François Truffaut',
    cast: ['Jacqueline Bisset', 'Valentina Cortese', 'Dani', 'Alexandra Stewart', 'Jean-Pierre Aumont', 'François Truffaut'],
    lang: 'French', country: 'France',
  },
  'amarcord-1973': {
    director: 'Federico Fellini',
    cast: ['Magali Noël', 'Bruno Zanin', 'Pupella Maggio', 'Armando Brancia'],
    lang: 'Italian', country: 'Italy',
  },
  'dersu-uzala-1975': {
    director: 'Akira Kurosawa',
    cast: ['Maksim Munzuk', 'Yuri Solomin', 'Svetlana Danilchenko'],
    lang: 'Russian', country: 'Soviet Union',
  },
  'mephisto-1981': {
    director: 'István Szabó',
    cast: ['Klaus Maria Brandauer', 'Krystyna Janda', 'Ildikó Bánsági', 'Rolf Hoppe'],
    lang: 'German', country: 'Hungary',
  },
  'babettes-feast-1987': {
    director: 'Gabriel Axel',
    cast: ['Stéphane Audran', 'Birgitte Federspiel', 'Bodil Kjer', 'Jarl Kulle'],
    lang: 'Danish', country: 'Denmark',
  },
  'pelle-the-conqueror-1987': {
    director: 'Bille August',
    cast: ['Max von Sydow', 'Pelle Hvenegaard', 'Erik Paaske', 'Kristina Törnqvist'],
    lang: 'Danish', country: 'Denmark',
  },
};

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const directors = loadJson(DIR_PATH);
const cast = loadJson(CAST_PATH);
const langs = loadJson(LANG_PATH);

let dNew = 0, cNew = 0, lNew = 0;
for (const [id, m] of Object.entries(META)) {
  if (!directors[id]) { directors[id] = m.director; dNew++; }
  if (!cast[id])      { cast[id] = m.cast;           cNew++; }
  if (!langs[id])     { langs[id] = { lang: m.lang, country: m.country }; lNew++; }
}

saveJson(DIR_PATH, directors);
saveJson(CAST_PATH, cast);
saveJson(LANG_PATH, langs);
console.log(`✓ directors: +${dNew}, cast: +${cNew}, languages: +${lNew}`);
