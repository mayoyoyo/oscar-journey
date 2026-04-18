// Manual metadata patches for films OMDb couldn't find cleanly.
// Applied after backfill-new-adds-metadata.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_PATH  = path.resolve(__dirname, '../src/data/directors.json');
const ACT_PATH  = path.resolve(__dirname, '../src/data/actors.json');
const LANG_PATH = path.resolve(__dirname, '../src/data/languages.json');

const PATCHES = {
  'grand-illusion-1937': {
    director: 'Jean Renoir',
    actors: ['Jean Gabin', 'Pierre Fresnay', 'Erich von Stroheim', 'Marcel Dalio'],
    language: { lang: { name: 'French', code: 'fr' }, country: 'France' },
  },
  'je-tu-il-elle-1974': {
    director: 'Chantal Akerman',
    actors: ['Chantal Akerman', 'Niels Arestrup', 'Claire Wauthion'],
    language: { lang: { name: 'French', code: 'fr' }, country: 'Belgium' },
  },
  'sans-soleil-1982': {
    director: 'Chris Marker',
    actors: ['Alexandra Stewart', 'Florence Delay'],
    language: { lang: { name: 'French', code: 'fr' }, country: 'France' },
  },
  'once-upon-a-time-in-america-1983': {
    director: 'Sergio Leone',
    actors: ['Robert De Niro', 'James Woods', 'Elizabeth McGovern', 'Joe Pesci'],
  },
  'the-green-ray-1986': {
    director: 'Éric Rohmer',
    actors: ['Marie Rivière', 'Amira Chemakhi', 'Sylvie Richez'],
    language: { lang: { name: 'French', code: 'fr' }, country: 'France' },
  },
  'the-fog-of-war-2003': {
    director: 'Errol Morris',
    actors: ['Robert S. McNamara'],
  },
  'blue-is-the-warmest-colour-2013': {
    director: 'Abdellatif Kechiche',
    actors: ['Léa Seydoux', 'Adèle Exarchopoulos', 'Salim Kechiouche'],
    language: { lang: { name: 'French', code: 'fr' }, country: 'France' },
  },
  'tess-1980': {
    director: 'Roman Polanski',
    actors: ['Nastassja Kinski', 'Peter Firth', 'Leigh Lawson', 'John Collin'],
  },
  'atlantic-city-1981': {
    director: 'Louis Malle',
    actors: ['Burt Lancaster', 'Susan Sarandon', 'Kate Reid', 'Michel Piccoli'],
  },
  'a-room-with-a-view-1986': {
    director: 'James Ivory',
    actors: ['Helena Bonham Carter', 'Julian Sands', 'Maggie Smith', 'Daniel Day-Lewis'],
  },
  'the-hurt-locker-2009': {
    director: 'Kathryn Bigelow',
    actors: ['Jeremy Renner', 'Anthony Mackie', 'Brian Geraghty', 'Guy Pearce'],
  },
  'judas-and-the-black-messiah-2020': {
    director: 'Shaka King',
    actors: ['Daniel Kaluuya', 'LaKeith Stanfield', 'Jesse Plemons', 'Dominique Fishback'],
  },
  'sound-of-metal-2020': {
    director: 'Darius Marder',
    actors: ['Riz Ahmed', 'Olivia Cooke', 'Paul Raci', 'Lauren Ridloff'],
  },
  'sunrise-a-song-of-two-humans-1927': {
    director: 'F.W. Murnau',
    actors: ['George O\'Brien', 'Janet Gaynor', 'Margaret Livingston'],
  },
  'killer-of-sheep-1977': {
    director: 'Charles Burnett',
    actors: ['Henry G. Sanders', 'Kaycee Moore', 'Charles Bracy'],
  },
};

const directors = JSON.parse(fs.readFileSync(DIR_PATH, 'utf8'));
const actors = JSON.parse(fs.readFileSync(ACT_PATH, 'utf8'));
const languages = JSON.parse(fs.readFileSync(LANG_PATH, 'utf8'));

let patched = 0;
for (const [id, p] of Object.entries(PATCHES)) {
  if (p.director && !directors[id]) { directors[id] = p.director; patched++; }
  if (p.actors && !actors[id]) { actors[id] = p.actors; patched++; }
  if (p.language && !languages[id]) { languages[id] = p.language; patched++; }
}

fs.writeFileSync(DIR_PATH, JSON.stringify(directors, null, 2));
fs.writeFileSync(ACT_PATH, JSON.stringify(actors, null, 2));
fs.writeFileSync(LANG_PATH, JSON.stringify(languages, null, 2));

console.log(`Applied ${patched} field patches across ${Object.keys(PATCHES).length} films.`);
console.log(`directors.json: ${Object.keys(directors).length} entries`);
console.log(`actors.json: ${Object.keys(actors).length} entries`);
console.log(`languages.json: ${Object.keys(languages).length} entries`);
