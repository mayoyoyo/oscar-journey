// Trim OMDb's over-credited multi-director listings to the primary
// director for films where the canonical credit is one person.
// Keeps true co-director partnerships (Coens, Wachowskis, Dardennes,
// modern animation teams, Powell+Pressburger, etc.) untouched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRECTORS_PATH = path.resolve(__dirname, '../src/data/directors.json');

// id → canonical primary director. Film history rationale in the notes.
const OVERRIDES = {
  'bambi-1942':                          'David Hand',
  'snow-white-and-the-seven-dwarfs-1937':'David Hand',
  'pinocchio-1940':                      'Ben Sharpsteen',
  'cinderella-1950':                     'Wilfred Jackson',
  'the-wizard-of-oz-1939':               'Victor Fleming',
  'laura-1944':                          'Otto Preminger',
  'the-magnificent-ambersons-1942':      'Orson Welles',
  'one-eyed-jacks-1961':                 'Marlon Brando',
  'airport-1970':                        'George Seaton',
  'heaven-can-wait-1978':                'Warren Beatty',
  'a-night-at-the-opera-1935':           'Sam Wood',
  'dance-girl-dance-1940':               'Dorothy Arzner',
  'scarface-1932':                       'Howard Hawks',
  'red-river-1948':                      'Howard Hawks',
  'my-darling-clementine-1946':          'John Ford',
  'the-cameraman-1928':                  'Edward Sedgwick',
  'king-of-jazz-1930':                   'John Murray Anderson',
  'the-emperor-jones-1933':              'Dudley Murphy',
  'ivans-childhood-1962':                'Andrei Tarkovsky',
  // OMDb has bogus names entirely for this film; Martel is the director.
  'la-cienaga-2001':                     'Lucrecia Martel',
};

function main() {
  const data = JSON.parse(fs.readFileSync(DIRECTORS_PATH, 'utf-8'));
  let applied = 0;
  for (const [id, name] of Object.entries(OVERRIDES)) {
    if (data[id] !== name) {
      data[id] = name;
      applied++;
    }
  }
  fs.writeFileSync(DIRECTORS_PATH, JSON.stringify(data, null, 2));
  console.log(`Patched ${applied} director entries`);
}

main();
