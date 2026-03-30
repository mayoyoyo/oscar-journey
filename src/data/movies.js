// Genre code labels
export const GENRE_LABELS = {
  T: 'Thriller / Suspense',
  D: 'Drama',
  H: 'Historical / Period',
  W: 'War',
  C: 'Comedy / Light Drama',
  S: 'Sci-Fi / Fantasy',
  B: 'Biopic',
  X: 'Crime / Noir',
  R: 'Romance',
  M: 'Musical',
  N: 'Action / Adventure',
  A: 'Animation / Family',
  I: 'Indie / Arthouse',
};

// Series that must maintain release order after shuffle (uses movie IDs)
export const SERIES = [
  ['the-godfather-1972', 'the-godfather-part-ii-1974', 'the-godfather-part-iii-1990'],
  ['the-lord-of-the-rings-the-fellowship-of-the-ring-2001', 'the-lord-of-the-rings-the-two-towers-2002', 'the-lord-of-the-rings-the-return-of-the-king-2003'],
  ['avatar-2009', 'avatar-the-way-of-water-2022'],
  ['dune-2021', 'dune-part-two-2024'],
  ['toy-story-3-2010', 'toy-story-4-2019'],
];

// All movies: { title, year, won, genre, ceremony, category }
// category: "BP" = Best Picture nominee, "INT" = International Feature winner, "ANIM" = Animated Feature winner
export const MOVIES = [
  // =====================================================
  // BEST PICTURE NOMINEES
  // =====================================================

  // 1970 films - 43rd Academy Awards
  { id: 'patton-1970', title: "Patton",                                          year: 1970, won: true,  genre: 'W', ceremony: 43, category: 'BP' },
  { id: 'airport-1970', title: "Airport",                                         year: 1970, won: false, genre: 'T', ceremony: 43, category: 'BP' },
  { id: 'five-easy-pieces-1970', title: "Five Easy Pieces",                                year: 1970, won: false, genre: 'D', ceremony: 43, category: 'BP' },
  { id: 'love-story-1970', title: "Love Story",                                      year: 1970, won: false, genre: 'R', ceremony: 43, category: 'BP' },
  { id: 'm-a-s-h-1970', title: "M*A*S*H",                                         year: 1970, won: false, genre: 'W', ceremony: 43, category: 'BP' },

  // 1971 films - 44th Academy Awards
  { id: 'the-french-connection-1971', title: "The French Connection",                           year: 1971, won: true,  genre: 'X', ceremony: 44, category: 'BP' },
  { id: 'a-clockwork-orange-1971', title: "A Clockwork Orange",                              year: 1971, won: false, genre: 'S', ceremony: 44, category: 'BP' },
  { id: 'fiddler-on-the-roof-1971', title: "Fiddler on the Roof",                             year: 1971, won: false, genre: 'M', ceremony: 44, category: 'BP' },
  { id: 'the-last-picture-show-1971', title: "The Last Picture Show",                           year: 1971, won: false, genre: 'D', ceremony: 44, category: 'BP' },
  { id: 'nicholas-and-alexandra-1971', title: "Nicholas and Alexandra",                          year: 1971, won: false, genre: 'H', ceremony: 44, category: 'BP' },

  // 1972 films - 45th Academy Awards
  { id: 'the-godfather-1972', title: "The Godfather",                                   year: 1972, won: true,  genre: 'X', ceremony: 45, category: 'BP' },
  { id: 'cabaret-1972', title: "Cabaret",                                         year: 1972, won: false, genre: 'M', ceremony: 45, category: 'BP' },
  { id: 'deliverance-1972', title: "Deliverance",                                     year: 1972, won: false, genre: 'T', ceremony: 45, category: 'BP' },
  { id: 'the-emigrants-1972', title: "The Emigrants",                                   year: 1972, won: false, genre: 'H', ceremony: 45, category: 'BP' },
  { id: 'sounder-1972', title: "Sounder",                                         year: 1972, won: false, genre: 'D', ceremony: 45, category: 'BP' },

  // 1973 films - 46th Academy Awards
  { id: 'the-sting-1973', title: "The Sting",                                       year: 1973, won: true,  genre: 'X', ceremony: 46, category: 'BP' },
  { id: 'american-graffiti-1973', title: "American Graffiti",                               year: 1973, won: false, genre: 'C', ceremony: 46, category: 'BP' },
  { id: 'cries-and-whispers-1973', title: "Cries and Whispers",                              year: 1973, won: false, genre: 'I', ceremony: 46, category: 'BP' },
  { id: 'the-exorcist-1973', title: "The Exorcist",                                    year: 1973, won: false, genre: 'T', ceremony: 46, category: 'BP' },
  { id: 'a-touch-of-class-1973', title: "A Touch of Class",                                year: 1973, won: false, genre: 'C', ceremony: 46, category: 'BP' },

  // 1974 films - 47th Academy Awards
  { id: 'the-godfather-part-ii-1974', title: "The Godfather Part II",                           year: 1974, won: true,  genre: 'X', ceremony: 47, category: 'BP' },
  { id: 'chinatown-1974', title: "Chinatown",                                       year: 1974, won: false, genre: 'X', ceremony: 47, category: 'BP' },
  { id: 'the-conversation-1974', title: "The Conversation",                                year: 1974, won: false, genre: 'T', ceremony: 47, category: 'BP' },
  { id: 'lenny-1974', title: "Lenny",                                           year: 1974, won: false, genre: 'B', ceremony: 47, category: 'BP' },
  { id: 'the-towering-inferno-1974', title: "The Towering Inferno",                            year: 1974, won: false, genre: 'N', ceremony: 47, category: 'BP' },

  // 1975 films - 48th Academy Awards
  { id: 'one-flew-over-the-cuckoos-nest-1975', title: "One Flew Over the Cuckoo's Nest",                year: 1975, won: true,  genre: 'D', ceremony: 48, category: 'BP' },
  { id: 'barry-lyndon-1975', title: "Barry Lyndon",                                    year: 1975, won: false, genre: 'H', ceremony: 48, category: 'BP' },
  { id: 'dog-day-afternoon-1975', title: "Dog Day Afternoon",                               year: 1975, won: false, genre: 'X', ceremony: 48, category: 'BP' },
  { id: 'jaws-1975', title: "Jaws",                                            year: 1975, won: false, genre: 'T', ceremony: 48, category: 'BP' },
  { id: 'nashville-1975', title: "Nashville",                                       year: 1975, won: false, genre: 'C', ceremony: 48, category: 'BP' },

  // 1976 films - 49th Academy Awards
  { id: 'rocky-1976', title: "Rocky",                                           year: 1976, won: true,  genre: 'D', ceremony: 49, category: 'BP' },
  { id: 'all-the-presidents-men-1976', title: "All the President's Men",                         year: 1976, won: false, genre: 'T', ceremony: 49, category: 'BP' },
  { id: 'bound-for-glory-1976', title: "Bound for Glory",                                 year: 1976, won: false, genre: 'B', ceremony: 49, category: 'BP' },
  { id: 'network-1976', title: "Network",                                         year: 1976, won: false, genre: 'D', ceremony: 49, category: 'BP' },
  { id: 'taxi-driver-1976', title: "Taxi Driver",                                     year: 1976, won: false, genre: 'X', ceremony: 49, category: 'BP' },

  // 1977 films - 50th Academy Awards
  { id: 'annie-hall-1977', title: "Annie Hall",                                      year: 1977, won: true,  genre: 'C', ceremony: 50, category: 'BP' },
  { id: 'the-goodbye-girl-1977', title: "The Goodbye Girl",                                year: 1977, won: false, genre: 'C', ceremony: 50, category: 'BP' },
  { id: 'julia-1977', title: "Julia",                                           year: 1977, won: false, genre: 'D', ceremony: 50, category: 'BP' },
  { id: 'star-wars-1977', title: "Star Wars",                                       year: 1977, won: false, genre: 'S', ceremony: 50, category: 'BP' },
  { id: 'the-turning-point-1977', title: "The Turning Point",                               year: 1977, won: false, genre: 'D', ceremony: 50, category: 'BP' },

  // 1978 films - 51st Academy Awards
  { id: 'the-deer-hunter-1978', title: "The Deer Hunter",                                 year: 1978, won: true,  genre: 'W', ceremony: 51, category: 'BP' },
  { id: 'coming-home-1978', title: "Coming Home",                                     year: 1978, won: false, genre: 'W', ceremony: 51, category: 'BP' },
  { id: 'heaven-can-wait-1978', title: "Heaven Can Wait",                                 year: 1978, won: false, genre: 'C', ceremony: 51, category: 'BP' },
  { id: 'midnight-express-1978', title: "Midnight Express",                                year: 1978, won: false, genre: 'T', ceremony: 51, category: 'BP' },
  { id: 'an-unmarried-woman-1978', title: "An Unmarried Woman",                              year: 1978, won: false, genre: 'D', ceremony: 51, category: 'BP' },

  // 1979 films - 52nd Academy Awards
  { id: 'kramer-vs-kramer-1979', title: "Kramer vs. Kramer",                               year: 1979, won: true,  genre: 'D', ceremony: 52, category: 'BP' },
  { id: 'all-that-jazz-1979', title: "All That Jazz",                                   year: 1979, won: false, genre: 'M', ceremony: 52, category: 'BP' },
  { id: 'apocalypse-now-1979', title: "Apocalypse Now",                                  year: 1979, won: false, genre: 'W', ceremony: 52, category: 'BP' },
  { id: 'breaking-away-1979', title: "Breaking Away",                                   year: 1979, won: false, genre: 'C', ceremony: 52, category: 'BP' },
  { id: 'norma-rae-1979', title: "Norma Rae",                                       year: 1979, won: false, genre: 'D', ceremony: 52, category: 'BP' },

  // 1980 films - 53rd Academy Awards
  { id: 'ordinary-people-1980', title: "Ordinary People",                                 year: 1980, won: true,  genre: 'D', ceremony: 53, category: 'BP' },
  { id: 'coal-miners-daughter-1980', title: "Coal Miner's Daughter",                           year: 1980, won: false, genre: 'B', ceremony: 53, category: 'BP' },
  { id: 'the-elephant-man-1980', title: "The Elephant Man",                                year: 1980, won: false, genre: 'D', ceremony: 53, category: 'BP' },
  { id: 'raging-bull-1980', title: "Raging Bull",                                     year: 1980, won: false, genre: 'B', ceremony: 53, category: 'BP' },
  { id: 'tess-1980', title: "Tess",                                            year: 1980, won: false, genre: 'H', ceremony: 53, category: 'BP' },

  // 1981 films - 54th Academy Awards
  { id: 'chariots-of-fire-1981', title: "Chariots of Fire",                                year: 1981, won: true,  genre: 'H', ceremony: 54, category: 'BP' },
  { id: 'atlantic-city-1981', title: "Atlantic City",                                   year: 1981, won: false, genre: 'X', ceremony: 54, category: 'BP' },
  { id: 'on-golden-pond-1981', title: "On Golden Pond",                                  year: 1981, won: false, genre: 'D', ceremony: 54, category: 'BP' },
  { id: 'raiders-of-the-lost-ark-1981', title: "Raiders of the Lost Ark",                         year: 1981, won: false, genre: 'N', ceremony: 54, category: 'BP' },
  { id: 'reds-1981', title: "Reds",                                            year: 1981, won: false, genre: 'H', ceremony: 54, category: 'BP' },

  // 1982 films - 55th Academy Awards
  { id: 'gandhi-1982', title: "Gandhi",                                          year: 1982, won: true,  genre: 'B', ceremony: 55, category: 'BP' },
  { id: 'e-t-the-extra-terrestrial-1982', title: "E.T. the Extra-Terrestrial",                      year: 1982, won: false, genre: 'S', ceremony: 55, category: 'BP' },
  { id: 'missing-1982', title: "Missing",                                         year: 1982, won: false, genre: 'T', ceremony: 55, category: 'BP' },
  { id: 'tootsie-1982', title: "Tootsie",                                         year: 1982, won: false, genre: 'C', ceremony: 55, category: 'BP' },
  { id: 'the-verdict-1982', title: "The Verdict",                                     year: 1982, won: false, genre: 'D', ceremony: 55, category: 'BP' },

  // 1983 films - 56th Academy Awards
  { id: 'terms-of-endearment-1983', title: "Terms of Endearment",                             year: 1983, won: true,  genre: 'D', ceremony: 56, category: 'BP' },
  { id: 'the-big-chill-1983', title: "The Big Chill",                                   year: 1983, won: false, genre: 'C', ceremony: 56, category: 'BP' },
  { id: 'the-dresser-1983', title: "The Dresser",                                     year: 1983, won: false, genre: 'D', ceremony: 56, category: 'BP' },
  { id: 'the-right-stuff-1983', title: "The Right Stuff",                                 year: 1983, won: false, genre: 'H', ceremony: 56, category: 'BP' },
  { id: 'tender-mercies-1983', title: "Tender Mercies",                                  year: 1983, won: false, genre: 'D', ceremony: 56, category: 'BP' },

  // 1984 films - 57th Academy Awards
  { id: 'amadeus-1984', title: "Amadeus",                                         year: 1984, won: true,  genre: 'B', ceremony: 57, category: 'BP' },
  { id: 'the-killing-fields-1984', title: "The Killing Fields",                              year: 1984, won: false, genre: 'W', ceremony: 57, category: 'BP' },
  { id: 'a-passage-to-india-1984', title: "A Passage to India",                              year: 1984, won: false, genre: 'H', ceremony: 57, category: 'BP' },
  { id: 'places-in-the-heart-1984', title: "Places in the Heart",                             year: 1984, won: false, genre: 'D', ceremony: 57, category: 'BP' },
  { id: 'a-soldiers-story-1984', title: "A Soldier's Story",                               year: 1984, won: false, genre: 'D', ceremony: 57, category: 'BP' },

  // 1985 films - 58th Academy Awards
  { id: 'out-of-africa-1985', title: "Out of Africa",                                   year: 1985, won: true,  genre: 'R', ceremony: 58, category: 'BP' },
  { id: 'the-color-purple-1985', title: "The Color Purple",                                year: 1985, won: false, genre: 'D', ceremony: 58, category: 'BP' },
  { id: 'kiss-of-the-spider-woman-1985', title: "Kiss of the Spider Woman",                        year: 1985, won: false, genre: 'D', ceremony: 58, category: 'BP' },
  { id: 'prizzis-honor-1985', title: "Prizzi's Honor",                                  year: 1985, won: false, genre: 'X', ceremony: 58, category: 'BP' },
  { id: 'witness-1985', title: "Witness",                                         year: 1985, won: false, genre: 'T', ceremony: 58, category: 'BP' },

  // 1986 films - 59th Academy Awards
  { id: 'platoon-1986', title: "Platoon",                                         year: 1986, won: true,  genre: 'W', ceremony: 59, category: 'BP' },
  { id: 'children-of-a-lesser-god-1986', title: "Children of a Lesser God",                        year: 1986, won: false, genre: 'R', ceremony: 59, category: 'BP' },
  { id: 'hannah-and-her-sisters-1986', title: "Hannah and Her Sisters",                          year: 1986, won: false, genre: 'C', ceremony: 59, category: 'BP' },
  { id: 'the-mission-1986', title: "The Mission",                                     year: 1986, won: false, genre: 'H', ceremony: 59, category: 'BP' },
  { id: 'a-room-with-a-view-1986', title: "A Room with a View",                              year: 1986, won: false, genre: 'R', ceremony: 59, category: 'BP' },

  // 1987 films - 60th Academy Awards
  { id: 'the-last-emperor-1987', title: "The Last Emperor",                                year: 1987, won: true,  genre: 'H', ceremony: 60, category: 'BP' },
  { id: 'broadcast-news-1987', title: "Broadcast News",                                  year: 1987, won: false, genre: 'C', ceremony: 60, category: 'BP' },
  { id: 'fatal-attraction-1987', title: "Fatal Attraction",                                year: 1987, won: false, genre: 'T', ceremony: 60, category: 'BP' },
  { id: 'hope-and-glory-1987', title: "Hope and Glory",                                  year: 1987, won: false, genre: 'W', ceremony: 60, category: 'BP' },
  { id: 'moonstruck-1987', title: "Moonstruck",                                      year: 1987, won: false, genre: 'R', ceremony: 60, category: 'BP' },

  // 1988 films - 61st Academy Awards
  { id: 'rain-man-1988', title: "Rain Man",                                        year: 1988, won: true,  genre: 'D', ceremony: 61, category: 'BP' },
  { id: 'the-accidental-tourist-1988', title: "The Accidental Tourist",                          year: 1988, won: false, genre: 'D', ceremony: 61, category: 'BP' },
  { id: 'dangerous-liaisons-1988', title: "Dangerous Liaisons",                              year: 1988, won: false, genre: 'H', ceremony: 61, category: 'BP' },
  { id: 'mississippi-burning-1988', title: "Mississippi Burning",                             year: 1988, won: false, genre: 'T', ceremony: 61, category: 'BP' },
  { id: 'working-girl-1988', title: "Working Girl",                                    year: 1988, won: false, genre: 'C', ceremony: 61, category: 'BP' },

  // 1989 films - 62nd Academy Awards
  { id: 'driving-miss-daisy-1989', title: "Driving Miss Daisy",                              year: 1989, won: true,  genre: 'D', ceremony: 62, category: 'BP' },
  { id: 'born-on-the-fourth-of-july-1989', title: "Born on the Fourth of July",                      year: 1989, won: false, genre: 'W', ceremony: 62, category: 'BP' },
  { id: 'dead-poets-society-1989', title: "Dead Poets Society",                              year: 1989, won: false, genre: 'D', ceremony: 62, category: 'BP' },
  { id: 'field-of-dreams-1989', title: "Field of Dreams",                                 year: 1989, won: false, genre: 'S', ceremony: 62, category: 'BP' },
  { id: 'my-left-foot-1989', title: "My Left Foot",                                    year: 1989, won: false, genre: 'B', ceremony: 62, category: 'BP' },

  // 1990 films - 63rd Academy Awards
  { id: 'dances-with-wolves-1990', title: "Dances with Wolves",                              year: 1990, won: true,  genre: 'H', ceremony: 63, category: 'BP' },
  { id: 'awakenings-1990', title: "Awakenings",                                      year: 1990, won: false, genre: 'B', ceremony: 63, category: 'BP' },
  { id: 'ghost-1990', title: "Ghost",                                           year: 1990, won: false, genre: 'R', ceremony: 63, category: 'BP' },
  { id: 'the-godfather-part-iii-1990', title: "The Godfather Part III",                          year: 1990, won: false, genre: 'X', ceremony: 63, category: 'BP' },
  { id: 'goodfellas-1990', title: "Goodfellas",                                      year: 1990, won: false, genre: 'X', ceremony: 63, category: 'BP' },

  // 1991 films - 64th Academy Awards
  { id: 'the-silence-of-the-lambs-1991', title: "The Silence of the Lambs",                     year: 1991, won: true,  genre: 'T', ceremony: 64, category: 'BP' },
  { id: 'beauty-and-the-beast-1991', title: "Beauty and the Beast",                          year: 1991, won: false, genre: 'A', ceremony: 64, category: 'BP' },
  { id: 'bugsy-1991', title: "Bugsy",                                         year: 1991, won: false, genre: 'X', ceremony: 64, category: 'BP' },
  { id: 'jfk-1991', title: "JFK",                                           year: 1991, won: false, genre: 'T', ceremony: 64, category: 'BP' },
  { id: 'the-fisher-king-1991', title: "The Fisher King",                               year: 1991, won: false, genre: 'D', ceremony: 64, category: 'BP' },

  // 1992 films - 65th Academy Awards
  { id: 'unforgiven-1992', title: "Unforgiven",                                    year: 1992, won: true,  genre: 'H', ceremony: 65, category: 'BP' },
  { id: 'the-crying-game-1992', title: "The Crying Game",                               year: 1992, won: false, genre: 'T', ceremony: 65, category: 'BP' },
  { id: 'a-few-good-men-1992', title: "A Few Good Men",                                year: 1992, won: false, genre: 'T', ceremony: 65, category: 'BP' },
  { id: 'howards-end-1992', title: "Howards End",                                   year: 1992, won: false, genre: 'H', ceremony: 65, category: 'BP' },
  { id: 'scent-of-a-woman-1992', title: "Scent of a Woman",                              year: 1992, won: false, genre: 'D', ceremony: 65, category: 'BP' },

  // 1993 films - 66th Academy Awards
  { id: 'schindlers-list-1993', title: "Schindler's List",                              year: 1993, won: true,  genre: 'W', ceremony: 66, category: 'BP' },
  { id: 'the-fugitive-1993', title: "The Fugitive",                                  year: 1993, won: false, genre: 'T', ceremony: 66, category: 'BP' },
  { id: 'in-the-name-of-the-father-1993', title: "In the Name of the Father",                     year: 1993, won: false, genre: 'D', ceremony: 66, category: 'BP' },
  { id: 'the-piano-1993', title: "The Piano",                                     year: 1993, won: false, genre: 'R', ceremony: 66, category: 'BP' },
  { id: 'the-remains-of-the-day-1993', title: "The Remains of the Day",                        year: 1993, won: false, genre: 'H', ceremony: 66, category: 'BP' },

  // 1994 films - 67th Academy Awards
  { id: 'forrest-gump-1994', title: "Forrest Gump",                                  year: 1994, won: true,  genre: 'D', ceremony: 67, category: 'BP' },
  { id: 'four-weddings-and-a-funeral-1994', title: "Four Weddings and a Funeral",                   year: 1994, won: false, genre: 'C', ceremony: 67, category: 'BP' },
  { id: 'pulp-fiction-1994', title: "Pulp Fiction",                                  year: 1994, won: false, genre: 'X', ceremony: 67, category: 'BP' },
  { id: 'quiz-show-1994', title: "Quiz Show",                                     year: 1994, won: false, genre: 'D', ceremony: 67, category: 'BP' },
  { id: 'the-shawshank-redemption-1994', title: "The Shawshank Redemption",                      year: 1994, won: false, genre: 'D', ceremony: 67, category: 'BP' },

  // 1995 films - 68th Academy Awards
  { id: 'braveheart-1995', title: "Braveheart",                                    year: 1995, won: true,  genre: 'H', ceremony: 68, category: 'BP' },
  { id: 'apollo-13-1995', title: "Apollo 13",                                     year: 1995, won: false, genre: 'H', ceremony: 68, category: 'BP' },
  { id: 'babe-1995', title: "Babe",                                          year: 1995, won: false, genre: 'A', ceremony: 68, category: 'BP' },
  { id: 'il-postino-1995', title: "Il Postino",                                    year: 1995, won: false, genre: 'R', ceremony: 68, category: 'BP' },
  { id: 'sense-and-sensibility-1995', title: "Sense and Sensibility",                         year: 1995, won: false, genre: 'R', ceremony: 68, category: 'BP' },

  // 1996 films - 69th Academy Awards
  { id: 'the-english-patient-1996', title: "The English Patient",                           year: 1996, won: true,  genre: 'R', ceremony: 69, category: 'BP' },
  { id: 'fargo-1996', title: "Fargo",                                         year: 1996, won: false, genre: 'X', ceremony: 69, category: 'BP' },
  { id: 'jerry-maguire-1996', title: "Jerry Maguire",                                 year: 1996, won: false, genre: 'C', ceremony: 69, category: 'BP' },
  { id: 'secrets-lies-1996', title: "Secrets & Lies",                                year: 1996, won: false, genre: 'I', ceremony: 69, category: 'BP' },
  { id: 'shine-1996', title: "Shine",                                         year: 1996, won: false, genre: 'B', ceremony: 69, category: 'BP' },

  // 1997 films - 70th Academy Awards
  { id: 'titanic-1997', title: "Titanic",                                       year: 1997, won: true,  genre: 'R', ceremony: 70, category: 'BP' },
  { id: 'as-good-as-it-gets-1997', title: "As Good as It Gets",                            year: 1997, won: false, genre: 'C', ceremony: 70, category: 'BP' },
  { id: 'the-full-monty-1997', title: "The Full Monty",                                year: 1997, won: false, genre: 'C', ceremony: 70, category: 'BP' },
  { id: 'good-will-hunting-1997', title: "Good Will Hunting",                             year: 1997, won: false, genre: 'D', ceremony: 70, category: 'BP' },
  { id: 'l-a-confidential-1997', title: "L.A. Confidential",                             year: 1997, won: false, genre: 'X', ceremony: 70, category: 'BP' },

  // 1998 films - 71st Academy Awards
  { id: 'shakespeare-in-love-1998', title: "Shakespeare in Love",                           year: 1998, won: true,  genre: 'R', ceremony: 71, category: 'BP' },
  { id: 'elizabeth-1998', title: "Elizabeth",                                     year: 1998, won: false, genre: 'H', ceremony: 71, category: 'BP' },
  { id: 'life-is-beautiful-1998', title: "Life Is Beautiful",                             year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP', alsoWon: ['INT'] },
  { id: 'saving-private-ryan-1998', title: "Saving Private Ryan",                           year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP' },
  { id: 'the-thin-red-line-1998', title: "The Thin Red Line",                             year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP' },

  // 1999 films - 72nd Academy Awards
  { id: 'american-beauty-1999', title: "American Beauty",                               year: 1999, won: true,  genre: 'D', ceremony: 72, category: 'BP' },
  { id: 'the-cider-house-rules-1999', title: "The Cider House Rules",                         year: 1999, won: false, genre: 'D', ceremony: 72, category: 'BP' },
  { id: 'the-green-mile-1999', title: "The Green Mile",                                year: 1999, won: false, genre: 'D', ceremony: 72, category: 'BP' },
  { id: 'the-insider-1999', title: "The Insider",                                   year: 1999, won: false, genre: 'T', ceremony: 72, category: 'BP' },
  { id: 'the-sixth-sense-1999', title: "The Sixth Sense",                               year: 1999, won: false, genre: 'T', ceremony: 72, category: 'BP' },

  // 2000 films - 73rd Academy Awards
  { id: 'gladiator-2000', title: "Gladiator",                                     year: 2000, won: true,  genre: 'H', ceremony: 73, category: 'BP' },
  { id: 'chocolat-2000', title: "Chocolat",                                      year: 2000, won: false, genre: 'C', ceremony: 73, category: 'BP' },
  { id: 'crouching-tiger-hidden-dragon-2000', title: "Crouching Tiger, Hidden Dragon",                year: 2000, won: false, genre: 'N', ceremony: 73, category: 'BP', alsoWon: ['INT'] },
  { id: 'erin-brockovich-2000', title: "Erin Brockovich",                               year: 2000, won: false, genre: 'D', ceremony: 73, category: 'BP' },
  { id: 'traffic-2000', title: "Traffic",                                       year: 2000, won: false, genre: 'X', ceremony: 73, category: 'BP' },

  // 2001 films - 74th Academy Awards
  { id: 'a-beautiful-mind-2001', title: "A Beautiful Mind",                              year: 2001, won: true,  genre: 'B', ceremony: 74, category: 'BP' },
  { id: 'gosford-park-2001', title: "Gosford Park",                                  year: 2001, won: false, genre: 'X', ceremony: 74, category: 'BP' },
  { id: 'in-the-bedroom-2001', title: "In the Bedroom",                                year: 2001, won: false, genre: 'T', ceremony: 74, category: 'BP' },
  { id: 'the-lord-of-the-rings-the-fellowship-of-the-ring-2001', title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, won: false, genre: 'S', ceremony: 74, category: 'BP' },
  { id: 'moulin-rouge-2001', title: "Moulin Rouge!",                                 year: 2001, won: false, genre: 'M', ceremony: 74, category: 'BP' },

  // 2002 films - 75th Academy Awards
  { id: 'chicago-2002', title: "Chicago",                                       year: 2002, won: true,  genre: 'M', ceremony: 75, category: 'BP' },
  { id: 'gangs-of-new-york-2002', title: "Gangs of New York",                             year: 2002, won: false, genre: 'X', ceremony: 75, category: 'BP' },
  { id: 'the-hours-2002', title: "The Hours",                                     year: 2002, won: false, genre: 'D', ceremony: 75, category: 'BP' },
  { id: 'the-lord-of-the-rings-the-two-towers-2002', title: "The Lord of the Rings: The Two Towers",         year: 2002, won: false, genre: 'S', ceremony: 75, category: 'BP' },
  { id: 'the-pianist-2002', title: "The Pianist",                                   year: 2002, won: false, genre: 'B', ceremony: 75, category: 'BP' },

  // 2003 films - 76th Academy Awards
  { id: 'the-lord-of-the-rings-the-return-of-the-king-2003', title: "The Lord of the Rings: The Return of the King", year: 2003, won: true,  genre: 'S', ceremony: 76, category: 'BP' },
  { id: 'lost-in-translation-2003', title: "Lost in Translation",                           year: 2003, won: false, genre: 'D', ceremony: 76, category: 'BP' },
  { id: 'master-and-commander-the-far-side-of-the-world-2003', title: "Master and Commander: The Far Side of the World", year: 2003, won: false, genre: 'W', ceremony: 76, category: 'BP' },
  { id: 'mystic-river-2003', title: "Mystic River",                                  year: 2003, won: false, genre: 'T', ceremony: 76, category: 'BP' },
  { id: 'seabiscuit-2003', title: "Seabiscuit",                                    year: 2003, won: false, genre: 'H', ceremony: 76, category: 'BP' },

  // 2004 films - 77th Academy Awards
  { id: 'million-dollar-baby-2004', title: "Million Dollar Baby",                           year: 2004, won: true,  genre: 'D', ceremony: 77, category: 'BP' },
  { id: 'the-aviator-2004', title: "The Aviator",                                   year: 2004, won: false, genre: 'B', ceremony: 77, category: 'BP' },
  { id: 'finding-neverland-2004', title: "Finding Neverland",                             year: 2004, won: false, genre: 'D', ceremony: 77, category: 'BP' },
  { id: 'ray-2004', title: "Ray",                                           year: 2004, won: false, genre: 'B', ceremony: 77, category: 'BP' },
  { id: 'sideways-2004', title: "Sideways",                                      year: 2004, won: false, genre: 'C', ceremony: 77, category: 'BP' },

  // 2005 films - 78th Academy Awards
  { id: 'crash-2005', title: "Crash",                                         year: 2005, won: true,  genre: 'D', ceremony: 78, category: 'BP' },
  { id: 'brokeback-mountain-2005', title: "Brokeback Mountain",                            year: 2005, won: false, genre: 'R', ceremony: 78, category: 'BP' },
  { id: 'capote-2005', title: "Capote",                                        year: 2005, won: false, genre: 'B', ceremony: 78, category: 'BP' },
  { id: 'good-night-and-good-luck-2005', title: "Good Night, and Good Luck.",                    year: 2005, won: false, genre: 'H', ceremony: 78, category: 'BP' },
  { id: 'munich-2005', title: "Munich",                                        year: 2005, won: false, genre: 'T', ceremony: 78, category: 'BP' },

  // 2006 films - 79th Academy Awards
  { id: 'the-departed-2006', title: "The Departed",                                  year: 2006, won: true,  genre: 'X', ceremony: 79, category: 'BP' },
  { id: 'babel-2006', title: "Babel",                                         year: 2006, won: false, genre: 'D', ceremony: 79, category: 'BP' },
  { id: 'letters-from-iwo-jima-2006', title: "Letters from Iwo Jima",                         year: 2006, won: false, genre: 'W', ceremony: 79, category: 'BP' },
  { id: 'little-miss-sunshine-2006', title: "Little Miss Sunshine",                          year: 2006, won: false, genre: 'C', ceremony: 79, category: 'BP' },
  { id: 'the-queen-2006', title: "The Queen",                                     year: 2006, won: false, genre: 'H', ceremony: 79, category: 'BP' },

  // 2007 films - 80th Academy Awards
  { id: 'no-country-for-old-men-2007', title: "No Country for Old Men",                        year: 2007, won: true,  genre: 'T', ceremony: 80, category: 'BP' },
  { id: 'atonement-2007', title: "Atonement",                                     year: 2007, won: false, genre: 'R', ceremony: 80, category: 'BP' },
  { id: 'juno-2007', title: "Juno",                                          year: 2007, won: false, genre: 'C', ceremony: 80, category: 'BP' },
  { id: 'michael-clayton-2007', title: "Michael Clayton",                               year: 2007, won: false, genre: 'T', ceremony: 80, category: 'BP' },
  { id: 'there-will-be-blood-2007', title: "There Will Be Blood",                           year: 2007, won: false, genre: 'D', ceremony: 80, category: 'BP' },

  // 2008 films - 81st Academy Awards
  { id: 'slumdog-millionaire-2008', title: "Slumdog Millionaire",                           year: 2008, won: true,  genre: 'D', ceremony: 81, category: 'BP' },
  { id: 'the-curious-case-of-benjamin-button-2008', title: "The Curious Case of Benjamin Button",           year: 2008, won: false, genre: 'D', ceremony: 81, category: 'BP' },
  { id: 'frost-nixon-2008', title: "Frost/Nixon",                                   year: 2008, won: false, genre: 'H', ceremony: 81, category: 'BP' },
  { id: 'milk-2008', title: "Milk",                                          year: 2008, won: false, genre: 'B', ceremony: 81, category: 'BP' },
  { id: 'the-reader-2008', title: "The Reader",                                    year: 2008, won: false, genre: 'H', ceremony: 81, category: 'BP' },

  // 2009 films - 82nd Academy Awards (10 nominees)
  { id: 'the-hurt-locker-2009', title: "The Hurt Locker",                               year: 2009, won: true,  genre: 'W', ceremony: 82, category: 'BP' },
  { id: 'avatar-2009', title: "Avatar",                                        year: 2009, won: false, genre: 'S', ceremony: 82, category: 'BP' },
  { id: 'the-blind-side-2009', title: "The Blind Side",                                year: 2009, won: false, genre: 'D', ceremony: 82, category: 'BP' },
  { id: 'district-9-2009', title: "District 9",                                    year: 2009, won: false, genre: 'S', ceremony: 82, category: 'BP' },
  { id: 'an-education-2009', title: "An Education",                                  year: 2009, won: false, genre: 'R', ceremony: 82, category: 'BP' },
  { id: 'inglourious-basterds-2009', title: "Inglourious Basterds",                          year: 2009, won: false, genre: 'W', ceremony: 82, category: 'BP' },
  { id: 'precious-2009', title: "Precious",                                      year: 2009, won: false, genre: 'D', ceremony: 82, category: 'BP' },
  { id: 'a-serious-man-2009', title: "A Serious Man",                                 year: 2009, won: false, genre: 'I', ceremony: 82, category: 'BP' },
  { id: 'up-2009', title: "Up",                                            year: 2009, won: false, genre: 'A', ceremony: 82, category: 'BP', alsoWon: ['ANIM'] },
  { id: 'up-in-the-air-2009', title: "Up in the Air",                                 year: 2009, won: false, genre: 'C', ceremony: 82, category: 'BP' },

  // 2010 films - 83rd Academy Awards (10 nominees)
  { id: 'the-kings-speech-2010', title: "The King's Speech",                             year: 2010, won: true,  genre: 'B', ceremony: 83, category: 'BP' },
  { id: '127-hours-2010', title: "127 Hours",                                     year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },
  { id: 'black-swan-2010', title: "Black Swan",                                    year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },
  { id: 'the-fighter-2010', title: "The Fighter",                                   year: 2010, won: false, genre: 'B', ceremony: 83, category: 'BP' },
  { id: 'inception-2010', title: "Inception",                                     year: 2010, won: false, genre: 'S', ceremony: 83, category: 'BP' },
  { id: 'the-kids-are-all-right-2010', title: "The Kids Are All Right",                        year: 2010, won: false, genre: 'C', ceremony: 83, category: 'BP' },
  { id: 'the-social-network-2010', title: "The Social Network",                            year: 2010, won: false, genre: 'D', ceremony: 83, category: 'BP' },
  { id: 'toy-story-3-2010', title: "Toy Story 3",                                   year: 2010, won: false, genre: 'A', ceremony: 83, category: 'BP', alsoWon: ['ANIM'] },
  { id: 'true-grit-2010', title: "True Grit",                                     year: 2010, won: false, genre: 'H', ceremony: 83, category: 'BP' },
  { id: 'winters-bone-2010', title: "Winter's Bone",                                 year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },

  // 2011 films - 84th Academy Awards (9 nominees)
  { id: 'the-artist-2011', title: "The Artist",                                    year: 2011, won: true,  genre: 'H', ceremony: 84, category: 'BP' },
  { id: 'the-descendants-2011', title: "The Descendants",                               year: 2011, won: false, genre: 'C', ceremony: 84, category: 'BP' },
  { id: 'extremely-loud-incredibly-close-2011', title: "Extremely Loud & Incredibly Close",             year: 2011, won: false, genre: 'D', ceremony: 84, category: 'BP' },
  { id: 'the-help-2011', title: "The Help",                                      year: 2011, won: false, genre: 'H', ceremony: 84, category: 'BP' },
  { id: 'hugo-2011', title: "Hugo",                                          year: 2011, won: false, genre: 'S', ceremony: 84, category: 'BP' },
  { id: 'midnight-in-paris-2011', title: "Midnight in Paris",                             year: 2011, won: false, genre: 'C', ceremony: 84, category: 'BP' },
  { id: 'moneyball-2011', title: "Moneyball",                                     year: 2011, won: false, genre: 'B', ceremony: 84, category: 'BP' },
  { id: 'the-tree-of-life-2011', title: "The Tree of Life",                              year: 2011, won: false, genre: 'I', ceremony: 84, category: 'BP' },
  { id: 'war-horse-2011', title: "War Horse",                                     year: 2011, won: false, genre: 'W', ceremony: 84, category: 'BP' },

  // 2012 films - 85th Academy Awards (9 nominees)
  { id: 'argo-2012', title: "Argo",                                          year: 2012, won: true,  genre: 'T', ceremony: 85, category: 'BP' },
  { id: 'amour-2012', title: "Amour",                                         year: 2012, won: false, genre: 'I', ceremony: 85, category: 'BP', alsoWon: ['INT'] },
  { id: 'beasts-of-the-southern-wild-2012', title: "Beasts of the Southern Wild",                   year: 2012, won: false, genre: 'I', ceremony: 85, category: 'BP' },
  { id: 'django-unchained-2012', title: "Django Unchained",                              year: 2012, won: false, genre: 'H', ceremony: 85, category: 'BP' },
  { id: 'les-mis-rables-2012', title: "Les Mis\u00e9rables",                                year: 2012, won: false, genre: 'M', ceremony: 85, category: 'BP' },
  { id: 'life-of-pi-2012', title: "Life of Pi",                                    year: 2012, won: false, genre: 'N', ceremony: 85, category: 'BP' },
  { id: 'lincoln-2012', title: "Lincoln",                                       year: 2012, won: false, genre: 'H', ceremony: 85, category: 'BP' },
  { id: 'silver-linings-playbook-2012', title: "Silver Linings Playbook",                       year: 2012, won: false, genre: 'C', ceremony: 85, category: 'BP' },
  { id: 'zero-dark-thirty-2012', title: "Zero Dark Thirty",                              year: 2012, won: false, genre: 'T', ceremony: 85, category: 'BP' },

  // 2013 films - 86th Academy Awards (9 nominees)
  { id: '12-years-a-slave-2013', title: "12 Years a Slave",                              year: 2013, won: true,  genre: 'H', ceremony: 86, category: 'BP' },
  { id: 'american-hustle-2013', title: "American Hustle",                               year: 2013, won: false, genre: 'X', ceremony: 86, category: 'BP' },
  { id: 'captain-phillips-2013', title: "Captain Phillips",                              year: 2013, won: false, genre: 'T', ceremony: 86, category: 'BP' },
  { id: 'dallas-buyers-club-2013', title: "Dallas Buyers Club",                            year: 2013, won: false, genre: 'D', ceremony: 86, category: 'BP' },
  { id: 'gravity-2013', title: "Gravity",                                       year: 2013, won: false, genre: 'S', ceremony: 86, category: 'BP' },
  { id: 'her-2013', title: "Her",                                           year: 2013, won: false, genre: 'S', ceremony: 86, category: 'BP' },
  { id: 'nebraska-2013', title: "Nebraska",                                      year: 2013, won: false, genre: 'C', ceremony: 86, category: 'BP' },
  { id: 'philomena-2013', title: "Philomena",                                     year: 2013, won: false, genre: 'C', ceremony: 86, category: 'BP' },
  { id: 'the-wolf-of-wall-street-2013', title: "The Wolf of Wall Street",                       year: 2013, won: false, genre: 'X', ceremony: 86, category: 'BP' },

  // 2014 films - 87th Academy Awards (8 nominees)
  { id: 'birdman-2014', title: "Birdman",                                       year: 2014, won: true,  genre: 'C', ceremony: 87, category: 'BP' },
  { id: 'american-sniper-2014', title: "American Sniper",                               year: 2014, won: false, genre: 'W', ceremony: 87, category: 'BP' },
  { id: 'boyhood-2014', title: "Boyhood",                                       year: 2014, won: false, genre: 'D', ceremony: 87, category: 'BP' },
  { id: 'the-grand-budapest-hotel-2014', title: "The Grand Budapest Hotel",                      year: 2014, won: false, genre: 'C', ceremony: 87, category: 'BP' },
  { id: 'the-imitation-game-2014', title: "The Imitation Game",                            year: 2014, won: false, genre: 'H', ceremony: 87, category: 'BP' },
  { id: 'selma-2014', title: "Selma",                                         year: 2014, won: false, genre: 'H', ceremony: 87, category: 'BP' },
  { id: 'the-theory-of-everything-2014', title: "The Theory of Everything",                      year: 2014, won: false, genre: 'B', ceremony: 87, category: 'BP' },
  { id: 'whiplash-2014', title: "Whiplash",                                      year: 2014, won: false, genre: 'D', ceremony: 87, category: 'BP' },

  // 2015 films - 88th Academy Awards (8 nominees)
  { id: 'spotlight-2015', title: "Spotlight",                                     year: 2015, won: true,  genre: 'T', ceremony: 88, category: 'BP' },
  { id: 'the-big-short-2015', title: "The Big Short",                                 year: 2015, won: false, genre: 'C', ceremony: 88, category: 'BP' },
  { id: 'bridge-of-spies-2015', title: "Bridge of Spies",                               year: 2015, won: false, genre: 'T', ceremony: 88, category: 'BP' },
  { id: 'brooklyn-2015', title: "Brooklyn",                                      year: 2015, won: false, genre: 'R', ceremony: 88, category: 'BP' },
  { id: 'mad-max-fury-road-2015', title: "Mad Max: Fury Road",                            year: 2015, won: false, genre: 'N', ceremony: 88, category: 'BP' },
  { id: 'the-martian-2015', title: "The Martian",                                   year: 2015, won: false, genre: 'S', ceremony: 88, category: 'BP' },
  { id: 'the-revenant-2015', title: "The Revenant",                                  year: 2015, won: false, genre: 'H', ceremony: 88, category: 'BP' },
  { id: 'room-2015', title: "Room",                                          year: 2015, won: false, genre: 'T', ceremony: 88, category: 'BP' },

  // 2016 films - 89th Academy Awards (9 nominees)
  { id: 'moonlight-2016', title: "Moonlight",                                     year: 2016, won: true,  genre: 'D', ceremony: 89, category: 'BP' },
  { id: 'arrival-2016', title: "Arrival",                                       year: 2016, won: false, genre: 'S', ceremony: 89, category: 'BP' },
  { id: 'fences-2016', title: "Fences",                                        year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },
  { id: 'hacksaw-ridge-2016', title: "Hacksaw Ridge",                                 year: 2016, won: false, genre: 'W', ceremony: 89, category: 'BP' },
  { id: 'hell-or-high-water-2016', title: "Hell or High Water",                            year: 2016, won: false, genre: 'X', ceremony: 89, category: 'BP' },
  { id: 'hidden-figures-2016', title: "Hidden Figures",                                year: 2016, won: false, genre: 'H', ceremony: 89, category: 'BP' },
  { id: 'la-la-land-2016', title: "La La Land",                                    year: 2016, won: false, genre: 'M', ceremony: 89, category: 'BP' },
  { id: 'lion-2016', title: "Lion",                                          year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },
  { id: 'manchester-by-the-sea-2016', title: "Manchester by the Sea",                         year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },

  // 2017 films - 90th Academy Awards (9 nominees)
  { id: 'the-shape-of-water-2017', title: "The Shape of Water",                            year: 2017, won: true,  genre: 'S', ceremony: 90, category: 'BP' },
  { id: 'call-me-by-your-name-2017', title: "Call Me by Your Name",                          year: 2017, won: false, genre: 'R', ceremony: 90, category: 'BP' },
  { id: 'darkest-hour-2017', title: "Darkest Hour",                                  year: 2017, won: false, genre: 'H', ceremony: 90, category: 'BP' },
  { id: 'dunkirk-2017', title: "Dunkirk",                                       year: 2017, won: false, genre: 'W', ceremony: 90, category: 'BP' },
  { id: 'get-out-2017', title: "Get Out",                                       year: 2017, won: false, genre: 'T', ceremony: 90, category: 'BP' },
  { id: 'lady-bird-2017', title: "Lady Bird",                                     year: 2017, won: false, genre: 'C', ceremony: 90, category: 'BP' },
  { id: 'phantom-thread-2017', title: "Phantom Thread",                                year: 2017, won: false, genre: 'D', ceremony: 90, category: 'BP' },
  { id: 'the-post-2017', title: "The Post",                                      year: 2017, won: false, genre: 'H', ceremony: 90, category: 'BP' },
  { id: 'three-billboards-outside-ebbing-missouri-2017', title: "Three Billboards Outside Ebbing, Missouri",     year: 2017, won: false, genre: 'X', ceremony: 90, category: 'BP' },

  // 2018 films - 91st Academy Awards (8 nominees)
  { id: 'green-book-2018', title: "Green Book",                                    year: 2018, won: true,  genre: 'B', ceremony: 91, category: 'BP' },
  { id: 'black-panther-2018', title: "Black Panther",                                 year: 2018, won: false, genre: 'N', ceremony: 91, category: 'BP' },
  { id: 'blackkklansman-2018', title: "BlacKkKlansman",                                year: 2018, won: false, genre: 'H', ceremony: 91, category: 'BP' },
  { id: 'bohemian-rhapsody-2018', title: "Bohemian Rhapsody",                             year: 2018, won: false, genre: 'B', ceremony: 91, category: 'BP' },
  { id: 'the-favourite-2018', title: "The Favourite",                                 year: 2018, won: false, genre: 'H', ceremony: 91, category: 'BP' },
  { id: 'roma-2018', title: "Roma",                                          year: 2018, won: false, genre: 'I', ceremony: 91, category: 'BP' },
  { id: 'a-star-is-born-2018', title: "A Star Is Born",                                year: 2018, won: false, genre: 'M', ceremony: 91, category: 'BP' },
  { id: 'vice-2018', title: "Vice",                                          year: 2018, won: false, genre: 'B', ceremony: 91, category: 'BP' },

  // 2019 films - 92nd Academy Awards (9 nominees)
  { id: 'parasite-2019', title: "Parasite",                                      year: 2019, won: true,  genre: 'T', ceremony: 92, category: 'BP', alsoWon: ['INT'] },
  { id: 'ford-v-ferrari-2019', title: "Ford v Ferrari",                                year: 2019, won: false, genre: 'D', ceremony: 92, category: 'BP' },
  { id: 'the-irishman-2019', title: "The Irishman",                                  year: 2019, won: false, genre: 'X', ceremony: 92, category: 'BP' },
  { id: 'jojo-rabbit-2019', title: "Jojo Rabbit",                                   year: 2019, won: false, genre: 'C', ceremony: 92, category: 'BP' },
  { id: 'joker-2019', title: "Joker",                                         year: 2019, won: false, genre: 'X', ceremony: 92, category: 'BP' },
  { id: 'little-women-2019', title: "Little Women",                                  year: 2019, won: false, genre: 'H', ceremony: 92, category: 'BP' },
  { id: 'marriage-story-2019', title: "Marriage Story",                                year: 2019, won: false, genre: 'D', ceremony: 92, category: 'BP' },
  { id: '1917-2019', title: "1917",                                          year: 2019, won: false, genre: 'W', ceremony: 92, category: 'BP' },
  { id: 'once-upon-a-time-in-hollywood-2019', title: "Once Upon a Time... in Hollywood",              year: 2019, won: false, genre: 'C', ceremony: 92, category: 'BP' },

  // 2020 films - 93rd Academy Awards (8 nominees)
  { id: 'nomadland-2020', title: "Nomadland",                                     year: 2020, won: true,  genre: 'I', ceremony: 93, category: 'BP' },
  { id: 'the-father-2020', title: "The Father",                                    year: 2020, won: false, genre: 'D', ceremony: 93, category: 'BP' },
  { id: 'judas-and-the-black-messiah-2020', title: "Judas and the Black Messiah",                   year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },
  { id: 'mank-2020', title: "Mank",                                          year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },
  { id: 'minari-2020', title: "Minari",                                        year: 2020, won: false, genre: 'I', ceremony: 93, category: 'BP' },
  { id: 'promising-young-woman-2020', title: "Promising Young Woman",                         year: 2020, won: false, genre: 'T', ceremony: 93, category: 'BP' },
  { id: 'sound-of-metal-2020', title: "Sound of Metal",                                year: 2020, won: false, genre: 'D', ceremony: 93, category: 'BP' },
  { id: 'the-trial-of-the-chicago-7-2020', title: "The Trial of the Chicago 7",                    year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },

  // 2021 films - 94th Academy Awards (10 nominees)
  { id: 'coda-2021', title: "CODA",                                          year: 2021, won: true,  genre: 'D', ceremony: 94, category: 'BP' },
  { id: 'belfast-2021', title: "Belfast",                                       year: 2021, won: false, genre: 'H', ceremony: 94, category: 'BP' },
  { id: 'dont-look-up-2021', title: "Don't Look Up",                                 year: 2021, won: false, genre: 'C', ceremony: 94, category: 'BP' },
  { id: 'drive-my-car-2021', title: "Drive My Car",                                  year: 2021, won: false, genre: 'I', ceremony: 94, category: 'BP', alsoWon: ['INT'] },
  { id: 'dune-2021', title: "Dune",                                          year: 2021, won: false, genre: 'S', ceremony: 94, category: 'BP' },
  { id: 'king-richard-2021', title: "King Richard",                                  year: 2021, won: false, genre: 'B', ceremony: 94, category: 'BP' },
  { id: 'licorice-pizza-2021', title: "Licorice Pizza",                                year: 2021, won: false, genre: 'C', ceremony: 94, category: 'BP' },
  { id: 'nightmare-alley-2021', title: "Nightmare Alley",                               year: 2021, won: false, genre: 'T', ceremony: 94, category: 'BP' },
  { id: 'the-power-of-the-dog-2021', title: "The Power of the Dog",                          year: 2021, won: false, genre: 'D', ceremony: 94, category: 'BP' },
  { id: 'west-side-story-2021', title: "West Side Story",                               year: 2021, won: false, genre: 'M', ceremony: 94, category: 'BP' },

  // 2022 films - 95th Academy Awards (10 nominees)
  { id: 'everything-everywhere-all-at-once-2022', title: "Everything Everywhere All at Once",             year: 2022, won: true,  genre: 'S', ceremony: 95, category: 'BP' },
  { id: 'all-quiet-on-the-western-front-2022', title: "All Quiet on the Western Front",                year: 2022, won: false, genre: 'W', ceremony: 95, category: 'BP', alsoWon: ['INT'] },
  { id: 'the-banshees-of-inisherin-2022', title: "The Banshees of Inisherin",                     year: 2022, won: false, genre: 'I', ceremony: 95, category: 'BP' },
  { id: 'elvis-2022', title: "Elvis",                                         year: 2022, won: false, genre: 'B', ceremony: 95, category: 'BP' },
  { id: 'the-fabelmans-2022', title: "The Fabelmans",                                 year: 2022, won: false, genre: 'B', ceremony: 95, category: 'BP' },
  { id: 't-r-2022', title: "T\u00e1r",                                           year: 2022, won: false, genre: 'D', ceremony: 95, category: 'BP' },
  { id: 'top-gun-maverick-2022', title: "Top Gun: Maverick",                             year: 2022, won: false, genre: 'N', ceremony: 95, category: 'BP' },
  { id: 'triangle-of-sadness-2022', title: "Triangle of Sadness",                           year: 2022, won: false, genre: 'C', ceremony: 95, category: 'BP' },
  { id: 'women-talking-2022', title: "Women Talking",                                 year: 2022, won: false, genre: 'D', ceremony: 95, category: 'BP' },
  { id: 'avatar-the-way-of-water-2022', title: "Avatar: The Way of Water",                      year: 2022, won: false, genre: 'S', ceremony: 95, category: 'BP' },

  // 2023 films - 96th Academy Awards (10 nominees)
  { id: 'oppenheimer-2023', title: "Oppenheimer",                                   year: 2023, won: true,  genre: 'H', ceremony: 96, category: 'BP' },
  { id: 'american-fiction-2023', title: "American Fiction",                              year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { id: 'anatomy-of-a-fall-2023', title: "Anatomy of a Fall",                             year: 2023, won: false, genre: 'T', ceremony: 96, category: 'BP' },
  { id: 'barbie-2023', title: "Barbie",                                        year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { id: 'the-holdovers-2023', title: "The Holdovers",                                 year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { id: 'maestro-2023', title: "Maestro",                                       year: 2023, won: false, genre: 'B', ceremony: 96, category: 'BP' },
  { id: 'past-lives-2023', title: "Past Lives",                                    year: 2023, won: false, genre: 'R', ceremony: 96, category: 'BP' },
  { id: 'poor-things-2023', title: "Poor Things",                                   year: 2023, won: false, genre: 'S', ceremony: 96, category: 'BP' },
  { id: 'the-zone-of-interest-2023', title: "The Zone of Interest",                          year: 2023, won: false, genre: 'W', ceremony: 96, category: 'BP', alsoWon: ['INT'] },
  { id: 'killers-of-the-flower-moon-2023', title: "Killers of the Flower Moon",                    year: 2023, won: false, genre: 'H', ceremony: 96, category: 'BP' },

  // 2024 films - 97th Academy Awards (10 nominees)
  { id: 'anora-2024', title: "Anora",                                         year: 2024, won: true,  genre: 'C', ceremony: 97, category: 'BP' },
  { id: 'the-brutalist-2024', title: "The Brutalist",                                 year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP' },
  { id: 'a-complete-unknown-2024', title: "A Complete Unknown",                            year: 2024, won: false, genre: 'B', ceremony: 97, category: 'BP' },
  { id: 'conclave-2024', title: "Conclave",                                      year: 2024, won: false, genre: 'T', ceremony: 97, category: 'BP' },
  { id: 'dune-part-two-2024', title: "Dune: Part Two",                                year: 2024, won: false, genre: 'S', ceremony: 97, category: 'BP' },
  { id: 'emilia-p-rez-2024', title: "Emilia P\u00e9rez",                                  year: 2024, won: false, genre: 'M', ceremony: 97, category: 'BP' },
  { id: 'im-still-here-2024', title: "I'm Still Here",                                year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP', alsoWon: ['INT'] },
  { id: 'nickel-boys-2024', title: "Nickel Boys",                                   year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP' },
  { id: 'the-substance-2024', title: "The Substance",                                 year: 2024, won: false, genre: 'T', ceremony: 97, category: 'BP' },
  { id: 'wicked-2024', title: "Wicked",                                        year: 2024, won: false, genre: 'M', ceremony: 97, category: 'BP' },

  // 2025 films — 98th Academy Awards (10 nominees)
  { id: 'one-battle-after-another-2025', title: "One Battle After Another",                       year: 2025, won: true,  genre: 'D', ceremony: 98, category: 'BP' },
  { id: 'bugonia-2025', title: "Bugonia",                                        year: 2025, won: false, genre: 'S', ceremony: 98, category: 'BP' },
  { id: 'f1-2025', title: "F1",                                             year: 2025, won: false, genre: 'N', ceremony: 98, category: 'BP' },
  { id: 'frankenstein-2025', title: "Frankenstein",                                   year: 2025, won: false, genre: 'D', ceremony: 98, category: 'BP' },
  { id: 'hamnet-2025', title: "Hamnet",                                         year: 2025, won: false, genre: 'H', ceremony: 98, category: 'BP' },
  { id: 'marty-supreme-2025', title: "Marty Supreme",                                  year: 2025, won: false, genre: 'B', ceremony: 98, category: 'BP' },
  { id: 'the-secret-agent-2025', title: "The Secret Agent",                               year: 2025, won: false, genre: 'T', ceremony: 98, category: 'BP' },
  { id: 'sentimental-value-2025', title: "Sentimental Value",                              year: 2025, won: false, genre: 'D', ceremony: 98, category: 'BP', alsoWon: ['INT'] },
  { id: 'sinners-2025', title: "Sinners",                                        year: 2025, won: false, genre: 'T', ceremony: 98, category: 'BP' },
  { id: 'train-dreams-2025', title: "Train Dreams",                                   year: 2025, won: false, genre: 'H', ceremony: 98, category: 'BP' },

  // =====================================================
  // BEST INTERNATIONAL FEATURE FILM WINNERS
  // =====================================================
  { id: 'mediterraneo-1991', title: "Mediterraneo",              year: 1991, won: true, genre: 'C', ceremony: 64, category: 'INT' },
  { id: 'indochine-1992', title: "Indochine",                 year: 1992, won: true, genre: 'H', ceremony: 65, category: 'INT' },
  { id: 'belle-epoque-1992', title: "Belle Epoque",              year: 1992, won: true, genre: 'C', ceremony: 66, category: 'INT' },
  { id: 'burnt-by-the-sun-1994', title: "Burnt by the Sun",          year: 1994, won: true, genre: 'D', ceremony: 67, category: 'INT' },
  { id: 'antonias-line-1995', title: "Antonia's Line",            year: 1995, won: true, genre: 'D', ceremony: 68, category: 'INT' },
  { id: 'kolya-1996', title: "Kolya",                     year: 1996, won: true, genre: 'D', ceremony: 69, category: 'INT' },
  { id: 'character-1997', title: "Character",                 year: 1997, won: true, genre: 'D', ceremony: 70, category: 'INT' },
  { id: 'all-about-my-mother-1999', title: "All About My Mother",       year: 1999, won: true, genre: 'D', ceremony: 72, category: 'INT' },
  { id: 'no-mans-land-2001', title: "No Man's Land",             year: 2001, won: true, genre: 'W', ceremony: 74, category: 'INT' },
  { id: 'nowhere-in-africa-2001', title: "Nowhere in Africa",         year: 2001, won: true, genre: 'H', ceremony: 75, category: 'INT' },
  { id: 'the-barbarian-invasions-2003', title: "The Barbarian Invasions",   year: 2003, won: true, genre: 'D', ceremony: 76, category: 'INT' },
  { id: 'the-sea-inside-2004', title: "The Sea Inside",            year: 2004, won: true, genre: 'D', ceremony: 77, category: 'INT' },
  { id: 'tsotsi-2005', title: "Tsotsi",                    year: 2005, won: true, genre: 'D', ceremony: 78, category: 'INT' },
  { id: 'the-lives-of-others-2006', title: "The Lives of Others",       year: 2006, won: true, genre: 'T', ceremony: 79, category: 'INT' },
  { id: 'the-counterfeiters-2007', title: "The Counterfeiters",        year: 2007, won: true, genre: 'W', ceremony: 80, category: 'INT' },
  { id: 'departures-2008', title: "Departures",                year: 2008, won: true, genre: 'D', ceremony: 81, category: 'INT' },
  { id: 'the-secret-in-their-eyes-2009', title: "The Secret in Their Eyes",  year: 2009, won: true, genre: 'T', ceremony: 82, category: 'INT' },
  { id: 'in-a-better-world-2010', title: "In a Better World",         year: 2010, won: true, genre: 'D', ceremony: 83, category: 'INT' },
  { id: 'a-separation-2011', title: "A Separation",              year: 2011, won: true, genre: 'D', ceremony: 84, category: 'INT' },
  { id: 'the-great-beauty-2013', title: "The Great Beauty",          year: 2013, won: true, genre: 'I', ceremony: 86, category: 'INT' },
  { id: 'ida-2013', title: "Ida",                       year: 2013, won: true, genre: 'H', ceremony: 87, category: 'INT' },
  { id: 'son-of-saul-2015', title: "Son of Saul",               year: 2015, won: true, genre: 'W', ceremony: 88, category: 'INT' },
  { id: 'the-salesman-2016', title: "The Salesman",              year: 2016, won: true, genre: 'D', ceremony: 89, category: 'INT' },
  { id: 'a-fantastic-woman-2017', title: "A Fantastic Woman",         year: 2017, won: true, genre: 'D', ceremony: 90, category: 'INT' },
  { id: 'another-round-2020', title: "Another Round",             year: 2020, won: true, genre: 'D', ceremony: 93, category: 'INT' },
  // Note: Sentimental Value (2025 INT winner) is already in BP nominees above

  // =====================================================
  // BEST ANIMATED FEATURE WINNERS
  // =====================================================
  { id: 'shrek-2001', title: "Shrek",                                          year: 2001, won: true, genre: 'A', ceremony: 74, category: 'ANIM' },
  { id: 'spirited-away-2002', title: "Spirited Away",                                  year: 2002, won: true, genre: 'A', ceremony: 75, category: 'ANIM' },
  { id: 'finding-nemo-2003', title: "Finding Nemo",                                   year: 2003, won: true, genre: 'A', ceremony: 76, category: 'ANIM' },
  { id: 'the-incredibles-2004', title: "The Incredibles",                                year: 2004, won: true, genre: 'A', ceremony: 77, category: 'ANIM' },
  { id: 'wallace-and-gromit-the-curse-of-the-were-rabbit-2005', title: "Wallace and Gromit The Curse of the Were-Rabbit", year: 2005, won: true, genre: 'A', ceremony: 78, category: 'ANIM' },
  { id: 'happy-feet-2006', title: "Happy Feet",                                     year: 2006, won: true, genre: 'A', ceremony: 79, category: 'ANIM' },
  { id: 'ratatouille-2007', title: "Ratatouille",                                    year: 2007, won: true, genre: 'A', ceremony: 80, category: 'ANIM' },
  { id: 'wall-e-2008', title: "WALL-E",                                         year: 2008, won: true, genre: 'A', ceremony: 81, category: 'ANIM' },
  { id: 'rango-2011', title: "Rango",                                          year: 2011, won: true, genre: 'A', ceremony: 84, category: 'ANIM' },
  { id: 'brave-2012', title: "Brave",                                          year: 2012, won: true, genre: 'A', ceremony: 85, category: 'ANIM' },
  { id: 'frozen-2013', title: "Frozen",                                         year: 2013, won: true, genre: 'A', ceremony: 86, category: 'ANIM' },
  { id: 'big-hero-6-2014', title: "Big Hero 6",                                     year: 2014, won: true, genre: 'A', ceremony: 87, category: 'ANIM' },
  { id: 'inside-out-2015', title: "Inside Out",                                     year: 2015, won: true, genre: 'A', ceremony: 88, category: 'ANIM' },
  { id: 'zootopia-2016', title: "Zootopia",                                       year: 2016, won: true, genre: 'A', ceremony: 89, category: 'ANIM' },
  { id: 'coco-2017', title: "Coco",                                           year: 2017, won: true, genre: 'A', ceremony: 90, category: 'ANIM' },
  { id: 'spider-man-into-the-spider-verse-2018', title: "Spider-Man Into the Spider-Verse",               year: 2018, won: true, genre: 'A', ceremony: 91, category: 'ANIM' },
  { id: 'toy-story-4-2019', title: "Toy Story 4",                                    year: 2019, won: true, genre: 'A', ceremony: 92, category: 'ANIM' },
  { id: 'soul-2020', title: "Soul",                                           year: 2020, won: true, genre: 'A', ceremony: 93, category: 'ANIM' },
  { id: 'encanto-2021', title: "Encanto",                                        year: 2021, won: true, genre: 'A', ceremony: 94, category: 'ANIM' },
  { id: 'guillermo-del-toros-pinocchio-2022', title: "Guillermo del Toro's Pinocchio",                 year: 2022, won: true, genre: 'A', ceremony: 95, category: 'ANIM' },
  { id: 'the-boy-and-the-heron-2023', title: "The Boy and the Heron",                          year: 2023, won: true, genre: 'A', ceremony: 96, category: 'ANIM' },
  { id: 'flow-2024', title: "Flow",                                           year: 2024, won: true, genre: 'A', ceremony: 97, category: 'ANIM' },
  { id: 'kpop-demon-hunters-2025', title: "KPop Demon Hunters",                              year: 2025, won: true, genre: 'A', ceremony: 98, category: 'ANIM' },
];

// Lookup map: movie ID -> movie object
export const MOVIES_BY_ID = {};
for (const m of MOVIES) {
  MOVIES_BY_ID[m.id] = m;
}
