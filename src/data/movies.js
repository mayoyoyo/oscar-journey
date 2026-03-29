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

// Series that must maintain release order after shuffle
export const SERIES = [
  ["The Lord of the Rings: The Fellowship of the Ring", "The Lord of the Rings: The Two Towers", "The Lord of the Rings: The Return of the King"],
  ["Avatar", "Avatar: The Way of Water"],
  ["Dune", "Dune: Part Two"],
  ["Toy Story 3", "Toy Story 4"],
];

// All movies: { title, year, won, genre, ceremony, category }
// category: "BP" = Best Picture nominee, "INT" = International Feature winner, "ANIM" = Animated Feature winner
export const MOVIES = [
  // =====================================================
  // BEST PICTURE NOMINEES
  // =====================================================

  // 1991 films - 64th Academy Awards
  { title: "The Silence of the Lambs",                     year: 1991, won: true,  genre: 'T', ceremony: 64, category: 'BP' },
  { title: "Beauty and the Beast",                          year: 1991, won: false, genre: 'A', ceremony: 64, category: 'BP' },
  { title: "Bugsy",                                         year: 1991, won: false, genre: 'X', ceremony: 64, category: 'BP' },
  { title: "JFK",                                           year: 1991, won: false, genre: 'T', ceremony: 64, category: 'BP' },
  { title: "The Fisher King",                               year: 1991, won: false, genre: 'D', ceremony: 64, category: 'BP' },

  // 1992 films - 65th Academy Awards
  { title: "Unforgiven",                                    year: 1992, won: true,  genre: 'H', ceremony: 65, category: 'BP' },
  { title: "The Crying Game",                               year: 1992, won: false, genre: 'T', ceremony: 65, category: 'BP' },
  { title: "A Few Good Men",                                year: 1992, won: false, genre: 'T', ceremony: 65, category: 'BP' },
  { title: "Howards End",                                   year: 1992, won: false, genre: 'H', ceremony: 65, category: 'BP' },
  { title: "Scent of a Woman",                              year: 1992, won: false, genre: 'D', ceremony: 65, category: 'BP' },

  // 1993 films - 66th Academy Awards
  { title: "Schindler's List",                              year: 1993, won: true,  genre: 'W', ceremony: 66, category: 'BP' },
  { title: "The Fugitive",                                  year: 1993, won: false, genre: 'T', ceremony: 66, category: 'BP' },
  { title: "In the Name of the Father",                     year: 1993, won: false, genre: 'D', ceremony: 66, category: 'BP' },
  { title: "The Piano",                                     year: 1993, won: false, genre: 'R', ceremony: 66, category: 'BP' },
  { title: "The Remains of the Day",                        year: 1993, won: false, genre: 'H', ceremony: 66, category: 'BP' },

  // 1994 films - 67th Academy Awards
  { title: "Forrest Gump",                                  year: 1994, won: true,  genre: 'D', ceremony: 67, category: 'BP' },
  { title: "Four Weddings and a Funeral",                   year: 1994, won: false, genre: 'C', ceremony: 67, category: 'BP' },
  { title: "Pulp Fiction",                                  year: 1994, won: false, genre: 'X', ceremony: 67, category: 'BP' },
  { title: "Quiz Show",                                     year: 1994, won: false, genre: 'D', ceremony: 67, category: 'BP' },
  { title: "The Shawshank Redemption",                      year: 1994, won: false, genre: 'D', ceremony: 67, category: 'BP' },

  // 1995 films - 68th Academy Awards
  { title: "Braveheart",                                    year: 1995, won: true,  genre: 'H', ceremony: 68, category: 'BP' },
  { title: "Apollo 13",                                     year: 1995, won: false, genre: 'H', ceremony: 68, category: 'BP' },
  { title: "Babe",                                          year: 1995, won: false, genre: 'A', ceremony: 68, category: 'BP' },
  { title: "Il Postino",                                    year: 1995, won: false, genre: 'R', ceremony: 68, category: 'BP' },
  { title: "Sense and Sensibility",                         year: 1995, won: false, genre: 'R', ceremony: 68, category: 'BP' },

  // 1996 films - 69th Academy Awards
  { title: "The English Patient",                           year: 1996, won: true,  genre: 'R', ceremony: 69, category: 'BP' },
  { title: "Fargo",                                         year: 1996, won: false, genre: 'X', ceremony: 69, category: 'BP' },
  { title: "Jerry Maguire",                                 year: 1996, won: false, genre: 'C', ceremony: 69, category: 'BP' },
  { title: "Secrets & Lies",                                year: 1996, won: false, genre: 'I', ceremony: 69, category: 'BP' },
  { title: "Shine",                                         year: 1996, won: false, genre: 'B', ceremony: 69, category: 'BP' },

  // 1997 films - 70th Academy Awards
  { title: "Titanic",                                       year: 1997, won: true,  genre: 'R', ceremony: 70, category: 'BP' },
  { title: "As Good as It Gets",                            year: 1997, won: false, genre: 'C', ceremony: 70, category: 'BP' },
  { title: "The Full Monty",                                year: 1997, won: false, genre: 'C', ceremony: 70, category: 'BP' },
  { title: "Good Will Hunting",                             year: 1997, won: false, genre: 'D', ceremony: 70, category: 'BP' },
  { title: "L.A. Confidential",                             year: 1997, won: false, genre: 'X', ceremony: 70, category: 'BP' },

  // 1998 films - 71st Academy Awards
  { title: "Shakespeare in Love",                           year: 1998, won: true,  genre: 'R', ceremony: 71, category: 'BP' },
  { title: "Elizabeth",                                     year: 1998, won: false, genre: 'H', ceremony: 71, category: 'BP' },
  { title: "Life Is Beautiful",                             year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP' },
  { title: "Saving Private Ryan",                           year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP' },
  { title: "The Thin Red Line",                             year: 1998, won: false, genre: 'W', ceremony: 71, category: 'BP' },

  // 1999 films - 72nd Academy Awards
  { title: "American Beauty",                               year: 1999, won: true,  genre: 'D', ceremony: 72, category: 'BP' },
  { title: "The Cider House Rules",                         year: 1999, won: false, genre: 'D', ceremony: 72, category: 'BP' },
  { title: "The Green Mile",                                year: 1999, won: false, genre: 'D', ceremony: 72, category: 'BP' },
  { title: "The Insider",                                   year: 1999, won: false, genre: 'T', ceremony: 72, category: 'BP' },
  { title: "The Sixth Sense",                               year: 1999, won: false, genre: 'T', ceremony: 72, category: 'BP' },

  // 2000 films - 73rd Academy Awards
  { title: "Gladiator",                                     year: 2000, won: true,  genre: 'H', ceremony: 73, category: 'BP' },
  { title: "Chocolat",                                      year: 2000, won: false, genre: 'C', ceremony: 73, category: 'BP' },
  { title: "Crouching Tiger, Hidden Dragon",                year: 2000, won: false, genre: 'N', ceremony: 73, category: 'BP' },
  { title: "Erin Brockovich",                               year: 2000, won: false, genre: 'D', ceremony: 73, category: 'BP' },
  { title: "Traffic",                                       year: 2000, won: false, genre: 'X', ceremony: 73, category: 'BP' },

  // 2001 films - 74th Academy Awards
  { title: "A Beautiful Mind",                              year: 2001, won: true,  genre: 'B', ceremony: 74, category: 'BP' },
  { title: "Gosford Park",                                  year: 2001, won: false, genre: 'X', ceremony: 74, category: 'BP' },
  { title: "In the Bedroom",                                year: 2001, won: false, genre: 'T', ceremony: 74, category: 'BP' },
  { title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001, won: false, genre: 'S', ceremony: 74, category: 'BP' },
  { title: "Moulin Rouge!",                                 year: 2001, won: false, genre: 'M', ceremony: 74, category: 'BP' },

  // 2002 films - 75th Academy Awards
  { title: "Chicago",                                       year: 2002, won: true,  genre: 'M', ceremony: 75, category: 'BP' },
  { title: "Gangs of New York",                             year: 2002, won: false, genre: 'X', ceremony: 75, category: 'BP' },
  { title: "The Hours",                                     year: 2002, won: false, genre: 'D', ceremony: 75, category: 'BP' },
  { title: "The Lord of the Rings: The Two Towers",         year: 2002, won: false, genre: 'S', ceremony: 75, category: 'BP' },
  { title: "The Pianist",                                   year: 2002, won: false, genre: 'B', ceremony: 75, category: 'BP' },

  // 2003 films - 76th Academy Awards
  { title: "The Lord of the Rings: The Return of the King", year: 2003, won: true,  genre: 'S', ceremony: 76, category: 'BP' },
  { title: "Lost in Translation",                           year: 2003, won: false, genre: 'D', ceremony: 76, category: 'BP' },
  { title: "Master and Commander: The Far Side of the World", year: 2003, won: false, genre: 'W', ceremony: 76, category: 'BP' },
  { title: "Mystic River",                                  year: 2003, won: false, genre: 'T', ceremony: 76, category: 'BP' },
  { title: "Seabiscuit",                                    year: 2003, won: false, genre: 'H', ceremony: 76, category: 'BP' },

  // 2004 films - 77th Academy Awards
  { title: "Million Dollar Baby",                           year: 2004, won: true,  genre: 'D', ceremony: 77, category: 'BP' },
  { title: "The Aviator",                                   year: 2004, won: false, genre: 'B', ceremony: 77, category: 'BP' },
  { title: "Finding Neverland",                             year: 2004, won: false, genre: 'D', ceremony: 77, category: 'BP' },
  { title: "Ray",                                           year: 2004, won: false, genre: 'B', ceremony: 77, category: 'BP' },
  { title: "Sideways",                                      year: 2004, won: false, genre: 'C', ceremony: 77, category: 'BP' },

  // 2005 films - 78th Academy Awards
  { title: "Crash",                                         year: 2005, won: true,  genre: 'D', ceremony: 78, category: 'BP' },
  { title: "Brokeback Mountain",                            year: 2005, won: false, genre: 'R', ceremony: 78, category: 'BP' },
  { title: "Capote",                                        year: 2005, won: false, genre: 'B', ceremony: 78, category: 'BP' },
  { title: "Good Night, and Good Luck.",                    year: 2005, won: false, genre: 'H', ceremony: 78, category: 'BP' },
  { title: "Munich",                                        year: 2005, won: false, genre: 'T', ceremony: 78, category: 'BP' },

  // 2006 films - 79th Academy Awards
  { title: "The Departed",                                  year: 2006, won: true,  genre: 'X', ceremony: 79, category: 'BP' },
  { title: "Babel",                                         year: 2006, won: false, genre: 'D', ceremony: 79, category: 'BP' },
  { title: "Letters from Iwo Jima",                         year: 2006, won: false, genre: 'W', ceremony: 79, category: 'BP' },
  { title: "Little Miss Sunshine",                          year: 2006, won: false, genre: 'C', ceremony: 79, category: 'BP' },
  { title: "The Queen",                                     year: 2006, won: false, genre: 'H', ceremony: 79, category: 'BP' },

  // 2007 films - 80th Academy Awards
  { title: "No Country for Old Men",                        year: 2007, won: true,  genre: 'T', ceremony: 80, category: 'BP' },
  { title: "Atonement",                                     year: 2007, won: false, genre: 'R', ceremony: 80, category: 'BP' },
  { title: "Juno",                                          year: 2007, won: false, genre: 'C', ceremony: 80, category: 'BP' },
  { title: "Michael Clayton",                               year: 2007, won: false, genre: 'T', ceremony: 80, category: 'BP' },
  { title: "There Will Be Blood",                           year: 2007, won: false, genre: 'D', ceremony: 80, category: 'BP' },

  // 2008 films - 81st Academy Awards
  { title: "Slumdog Millionaire",                           year: 2008, won: true,  genre: 'D', ceremony: 81, category: 'BP' },
  { title: "The Curious Case of Benjamin Button",           year: 2008, won: false, genre: 'D', ceremony: 81, category: 'BP' },
  { title: "Frost/Nixon",                                   year: 2008, won: false, genre: 'H', ceremony: 81, category: 'BP' },
  { title: "Milk",                                          year: 2008, won: false, genre: 'B', ceremony: 81, category: 'BP' },
  { title: "The Reader",                                    year: 2008, won: false, genre: 'H', ceremony: 81, category: 'BP' },

  // 2009 films - 82nd Academy Awards (10 nominees)
  { title: "The Hurt Locker",                               year: 2009, won: true,  genre: 'W', ceremony: 82, category: 'BP' },
  { title: "Avatar",                                        year: 2009, won: false, genre: 'S', ceremony: 82, category: 'BP' },
  { title: "The Blind Side",                                year: 2009, won: false, genre: 'D', ceremony: 82, category: 'BP' },
  { title: "District 9",                                    year: 2009, won: false, genre: 'S', ceremony: 82, category: 'BP' },
  { title: "An Education",                                  year: 2009, won: false, genre: 'R', ceremony: 82, category: 'BP' },
  { title: "Inglourious Basterds",                          year: 2009, won: false, genre: 'W', ceremony: 82, category: 'BP' },
  { title: "Precious",                                      year: 2009, won: false, genre: 'D', ceremony: 82, category: 'BP' },
  { title: "A Serious Man",                                 year: 2009, won: false, genre: 'I', ceremony: 82, category: 'BP' },
  { title: "Up",                                            year: 2009, won: false, genre: 'A', ceremony: 82, category: 'BP' },
  { title: "Up in the Air",                                 year: 2009, won: false, genre: 'C', ceremony: 82, category: 'BP' },

  // 2010 films - 83rd Academy Awards (10 nominees)
  { title: "The King's Speech",                             year: 2010, won: true,  genre: 'B', ceremony: 83, category: 'BP' },
  { title: "127 Hours",                                     year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },
  { title: "Black Swan",                                    year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },
  { title: "The Fighter",                                   year: 2010, won: false, genre: 'B', ceremony: 83, category: 'BP' },
  { title: "Inception",                                     year: 2010, won: false, genre: 'S', ceremony: 83, category: 'BP' },
  { title: "The Kids Are All Right",                        year: 2010, won: false, genre: 'C', ceremony: 83, category: 'BP' },
  { title: "The Social Network",                            year: 2010, won: false, genre: 'D', ceremony: 83, category: 'BP' },
  { title: "Toy Story 3",                                   year: 2010, won: false, genre: 'A', ceremony: 83, category: 'BP' },
  { title: "True Grit",                                     year: 2010, won: false, genre: 'H', ceremony: 83, category: 'BP' },
  { title: "Winter's Bone",                                 year: 2010, won: false, genre: 'T', ceremony: 83, category: 'BP' },

  // 2011 films - 84th Academy Awards (9 nominees)
  { title: "The Artist",                                    year: 2011, won: true,  genre: 'H', ceremony: 84, category: 'BP' },
  { title: "The Descendants",                               year: 2011, won: false, genre: 'C', ceremony: 84, category: 'BP' },
  { title: "Extremely Loud & Incredibly Close",             year: 2011, won: false, genre: 'D', ceremony: 84, category: 'BP' },
  { title: "The Help",                                      year: 2011, won: false, genre: 'H', ceremony: 84, category: 'BP' },
  { title: "Hugo",                                          year: 2011, won: false, genre: 'S', ceremony: 84, category: 'BP' },
  { title: "Midnight in Paris",                             year: 2011, won: false, genre: 'C', ceremony: 84, category: 'BP' },
  { title: "Moneyball",                                     year: 2011, won: false, genre: 'B', ceremony: 84, category: 'BP' },
  { title: "The Tree of Life",                              year: 2011, won: false, genre: 'I', ceremony: 84, category: 'BP' },
  { title: "War Horse",                                     year: 2011, won: false, genre: 'W', ceremony: 84, category: 'BP' },

  // 2012 films - 85th Academy Awards (9 nominees)
  { title: "Argo",                                          year: 2012, won: true,  genre: 'T', ceremony: 85, category: 'BP' },
  { title: "Amour",                                         year: 2012, won: false, genre: 'I', ceremony: 85, category: 'BP' },
  { title: "Beasts of the Southern Wild",                   year: 2012, won: false, genre: 'I', ceremony: 85, category: 'BP' },
  { title: "Django Unchained",                              year: 2012, won: false, genre: 'H', ceremony: 85, category: 'BP' },
  { title: "Les Mis\u00e9rables",                                year: 2012, won: false, genre: 'M', ceremony: 85, category: 'BP' },
  { title: "Life of Pi",                                    year: 2012, won: false, genre: 'N', ceremony: 85, category: 'BP' },
  { title: "Lincoln",                                       year: 2012, won: false, genre: 'H', ceremony: 85, category: 'BP' },
  { title: "Silver Linings Playbook",                       year: 2012, won: false, genre: 'C', ceremony: 85, category: 'BP' },
  { title: "Zero Dark Thirty",                              year: 2012, won: false, genre: 'T', ceremony: 85, category: 'BP' },

  // 2013 films - 86th Academy Awards (9 nominees)
  { title: "12 Years a Slave",                              year: 2013, won: true,  genre: 'H', ceremony: 86, category: 'BP' },
  { title: "American Hustle",                               year: 2013, won: false, genre: 'X', ceremony: 86, category: 'BP' },
  { title: "Captain Phillips",                              year: 2013, won: false, genre: 'T', ceremony: 86, category: 'BP' },
  { title: "Dallas Buyers Club",                            year: 2013, won: false, genre: 'D', ceremony: 86, category: 'BP' },
  { title: "Gravity",                                       year: 2013, won: false, genre: 'S', ceremony: 86, category: 'BP' },
  { title: "Her",                                           year: 2013, won: false, genre: 'S', ceremony: 86, category: 'BP' },
  { title: "Nebraska",                                      year: 2013, won: false, genre: 'C', ceremony: 86, category: 'BP' },
  { title: "Philomena",                                     year: 2013, won: false, genre: 'C', ceremony: 86, category: 'BP' },
  { title: "The Wolf of Wall Street",                       year: 2013, won: false, genre: 'X', ceremony: 86, category: 'BP' },

  // 2014 films - 87th Academy Awards (8 nominees)
  { title: "Birdman",                                       year: 2014, won: true,  genre: 'C', ceremony: 87, category: 'BP' },
  { title: "American Sniper",                               year: 2014, won: false, genre: 'W', ceremony: 87, category: 'BP' },
  { title: "Boyhood",                                       year: 2014, won: false, genre: 'D', ceremony: 87, category: 'BP' },
  { title: "The Grand Budapest Hotel",                      year: 2014, won: false, genre: 'C', ceremony: 87, category: 'BP' },
  { title: "The Imitation Game",                            year: 2014, won: false, genre: 'H', ceremony: 87, category: 'BP' },
  { title: "Selma",                                         year: 2014, won: false, genre: 'H', ceremony: 87, category: 'BP' },
  { title: "The Theory of Everything",                      year: 2014, won: false, genre: 'B', ceremony: 87, category: 'BP' },
  { title: "Whiplash",                                      year: 2014, won: false, genre: 'D', ceremony: 87, category: 'BP' },

  // 2015 films - 88th Academy Awards (8 nominees)
  { title: "Spotlight",                                     year: 2015, won: true,  genre: 'T', ceremony: 88, category: 'BP' },
  { title: "The Big Short",                                 year: 2015, won: false, genre: 'C', ceremony: 88, category: 'BP' },
  { title: "Bridge of Spies",                               year: 2015, won: false, genre: 'T', ceremony: 88, category: 'BP' },
  { title: "Brooklyn",                                      year: 2015, won: false, genre: 'R', ceremony: 88, category: 'BP' },
  { title: "Mad Max: Fury Road",                            year: 2015, won: false, genre: 'N', ceremony: 88, category: 'BP' },
  { title: "The Martian",                                   year: 2015, won: false, genre: 'S', ceremony: 88, category: 'BP' },
  { title: "The Revenant",                                  year: 2015, won: false, genre: 'H', ceremony: 88, category: 'BP' },
  { title: "Room",                                          year: 2015, won: false, genre: 'T', ceremony: 88, category: 'BP' },

  // 2016 films - 89th Academy Awards (9 nominees)
  { title: "Moonlight",                                     year: 2016, won: true,  genre: 'D', ceremony: 89, category: 'BP' },
  { title: "Arrival",                                       year: 2016, won: false, genre: 'S', ceremony: 89, category: 'BP' },
  { title: "Fences",                                        year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },
  { title: "Hacksaw Ridge",                                 year: 2016, won: false, genre: 'W', ceremony: 89, category: 'BP' },
  { title: "Hell or High Water",                            year: 2016, won: false, genre: 'X', ceremony: 89, category: 'BP' },
  { title: "Hidden Figures",                                year: 2016, won: false, genre: 'H', ceremony: 89, category: 'BP' },
  { title: "La La Land",                                    year: 2016, won: false, genre: 'M', ceremony: 89, category: 'BP' },
  { title: "Lion",                                          year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },
  { title: "Manchester by the Sea",                         year: 2016, won: false, genre: 'D', ceremony: 89, category: 'BP' },

  // 2017 films - 90th Academy Awards (9 nominees)
  { title: "The Shape of Water",                            year: 2017, won: true,  genre: 'S', ceremony: 90, category: 'BP' },
  { title: "Call Me by Your Name",                          year: 2017, won: false, genre: 'R', ceremony: 90, category: 'BP' },
  { title: "Darkest Hour",                                  year: 2017, won: false, genre: 'H', ceremony: 90, category: 'BP' },
  { title: "Dunkirk",                                       year: 2017, won: false, genre: 'W', ceremony: 90, category: 'BP' },
  { title: "Get Out",                                       year: 2017, won: false, genre: 'T', ceremony: 90, category: 'BP' },
  { title: "Lady Bird",                                     year: 2017, won: false, genre: 'C', ceremony: 90, category: 'BP' },
  { title: "Phantom Thread",                                year: 2017, won: false, genre: 'D', ceremony: 90, category: 'BP' },
  { title: "The Post",                                      year: 2017, won: false, genre: 'H', ceremony: 90, category: 'BP' },
  { title: "Three Billboards Outside Ebbing, Missouri",     year: 2017, won: false, genre: 'X', ceremony: 90, category: 'BP' },

  // 2018 films - 91st Academy Awards (8 nominees)
  { title: "Green Book",                                    year: 2018, won: true,  genre: 'B', ceremony: 91, category: 'BP' },
  { title: "Black Panther",                                 year: 2018, won: false, genre: 'N', ceremony: 91, category: 'BP' },
  { title: "BlacKkKlansman",                                year: 2018, won: false, genre: 'H', ceremony: 91, category: 'BP' },
  { title: "Bohemian Rhapsody",                             year: 2018, won: false, genre: 'B', ceremony: 91, category: 'BP' },
  { title: "The Favourite",                                 year: 2018, won: false, genre: 'H', ceremony: 91, category: 'BP' },
  { title: "Roma",                                          year: 2018, won: false, genre: 'I', ceremony: 91, category: 'BP' },
  { title: "A Star Is Born",                                year: 2018, won: false, genre: 'M', ceremony: 91, category: 'BP' },
  { title: "Vice",                                          year: 2018, won: false, genre: 'B', ceremony: 91, category: 'BP' },

  // 2019 films - 92nd Academy Awards (9 nominees)
  { title: "Parasite",                                      year: 2019, won: true,  genre: 'T', ceremony: 92, category: 'BP' },
  { title: "Ford v Ferrari",                                year: 2019, won: false, genre: 'D', ceremony: 92, category: 'BP' },
  { title: "The Irishman",                                  year: 2019, won: false, genre: 'X', ceremony: 92, category: 'BP' },
  { title: "Jojo Rabbit",                                   year: 2019, won: false, genre: 'C', ceremony: 92, category: 'BP' },
  { title: "Joker",                                         year: 2019, won: false, genre: 'X', ceremony: 92, category: 'BP' },
  { title: "Little Women",                                  year: 2019, won: false, genre: 'H', ceremony: 92, category: 'BP' },
  { title: "Marriage Story",                                year: 2019, won: false, genre: 'D', ceremony: 92, category: 'BP' },
  { title: "1917",                                          year: 2019, won: false, genre: 'W', ceremony: 92, category: 'BP' },
  { title: "Once Upon a Time... in Hollywood",              year: 2019, won: false, genre: 'C', ceremony: 92, category: 'BP' },

  // 2020 films - 93rd Academy Awards (8 nominees)
  { title: "Nomadland",                                     year: 2020, won: true,  genre: 'I', ceremony: 93, category: 'BP' },
  { title: "The Father",                                    year: 2020, won: false, genre: 'D', ceremony: 93, category: 'BP' },
  { title: "Judas and the Black Messiah",                   year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },
  { title: "Mank",                                          year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },
  { title: "Minari",                                        year: 2020, won: false, genre: 'I', ceremony: 93, category: 'BP' },
  { title: "Promising Young Woman",                         year: 2020, won: false, genre: 'T', ceremony: 93, category: 'BP' },
  { title: "Sound of Metal",                                year: 2020, won: false, genre: 'D', ceremony: 93, category: 'BP' },
  { title: "The Trial of the Chicago 7",                    year: 2020, won: false, genre: 'H', ceremony: 93, category: 'BP' },

  // 2021 films - 94th Academy Awards (10 nominees)
  { title: "CODA",                                          year: 2021, won: true,  genre: 'D', ceremony: 94, category: 'BP' },
  { title: "Belfast",                                       year: 2021, won: false, genre: 'H', ceremony: 94, category: 'BP' },
  { title: "Don't Look Up",                                 year: 2021, won: false, genre: 'C', ceremony: 94, category: 'BP' },
  { title: "Drive My Car",                                  year: 2021, won: false, genre: 'I', ceremony: 94, category: 'BP' },
  { title: "Dune",                                          year: 2021, won: false, genre: 'S', ceremony: 94, category: 'BP' },
  { title: "King Richard",                                  year: 2021, won: false, genre: 'B', ceremony: 94, category: 'BP' },
  { title: "Licorice Pizza",                                year: 2021, won: false, genre: 'C', ceremony: 94, category: 'BP' },
  { title: "Nightmare Alley",                               year: 2021, won: false, genre: 'T', ceremony: 94, category: 'BP' },
  { title: "The Power of the Dog",                          year: 2021, won: false, genre: 'D', ceremony: 94, category: 'BP' },
  { title: "West Side Story",                               year: 2021, won: false, genre: 'M', ceremony: 94, category: 'BP' },

  // 2022 films - 95th Academy Awards (10 nominees)
  { title: "Everything Everywhere All at Once",             year: 2022, won: true,  genre: 'S', ceremony: 95, category: 'BP' },
  { title: "All Quiet on the Western Front",                year: 2022, won: false, genre: 'W', ceremony: 95, category: 'BP' },
  { title: "The Banshees of Inisherin",                     year: 2022, won: false, genre: 'I', ceremony: 95, category: 'BP' },
  { title: "Elvis",                                         year: 2022, won: false, genre: 'B', ceremony: 95, category: 'BP' },
  { title: "The Fabelmans",                                 year: 2022, won: false, genre: 'B', ceremony: 95, category: 'BP' },
  { title: "T\u00e1r",                                           year: 2022, won: false, genre: 'D', ceremony: 95, category: 'BP' },
  { title: "Top Gun: Maverick",                             year: 2022, won: false, genre: 'N', ceremony: 95, category: 'BP' },
  { title: "Triangle of Sadness",                           year: 2022, won: false, genre: 'C', ceremony: 95, category: 'BP' },
  { title: "Women Talking",                                 year: 2022, won: false, genre: 'D', ceremony: 95, category: 'BP' },
  { title: "Avatar: The Way of Water",                      year: 2022, won: false, genre: 'S', ceremony: 95, category: 'BP' },

  // 2023 films - 96th Academy Awards (10 nominees)
  { title: "Oppenheimer",                                   year: 2023, won: true,  genre: 'H', ceremony: 96, category: 'BP' },
  { title: "American Fiction",                              year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { title: "Anatomy of a Fall",                             year: 2023, won: false, genre: 'T', ceremony: 96, category: 'BP' },
  { title: "Barbie",                                        year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { title: "The Holdovers",                                 year: 2023, won: false, genre: 'C', ceremony: 96, category: 'BP' },
  { title: "Maestro",                                       year: 2023, won: false, genre: 'B', ceremony: 96, category: 'BP' },
  { title: "Past Lives",                                    year: 2023, won: false, genre: 'R', ceremony: 96, category: 'BP' },
  { title: "Poor Things",                                   year: 2023, won: false, genre: 'S', ceremony: 96, category: 'BP' },
  { title: "The Zone of Interest",                          year: 2023, won: false, genre: 'W', ceremony: 96, category: 'BP' },
  { title: "Killers of the Flower Moon",                    year: 2023, won: false, genre: 'H', ceremony: 96, category: 'BP' },

  // 2024 films - 97th Academy Awards (10 nominees)
  { title: "Anora",                                         year: 2024, won: true,  genre: 'C', ceremony: 97, category: 'BP' },
  { title: "The Brutalist",                                 year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP' },
  { title: "A Complete Unknown",                            year: 2024, won: false, genre: 'B', ceremony: 97, category: 'BP' },
  { title: "Conclave",                                      year: 2024, won: false, genre: 'T', ceremony: 97, category: 'BP' },
  { title: "Dune: Part Two",                                year: 2024, won: false, genre: 'S', ceremony: 97, category: 'BP' },
  { title: "Emilia P\u00e9rez",                                  year: 2024, won: false, genre: 'M', ceremony: 97, category: 'BP' },
  { title: "I'm Still Here",                                year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP' },
  { title: "Nickel Boys",                                   year: 2024, won: false, genre: 'H', ceremony: 97, category: 'BP' },
  { title: "The Substance",                                 year: 2024, won: false, genre: 'T', ceremony: 97, category: 'BP' },
  { title: "Wicked",                                        year: 2024, won: false, genre: 'M', ceremony: 97, category: 'BP' },

  // =====================================================
  // BEST INTERNATIONAL FEATURE FILM WINNERS
  // =====================================================
  { title: "Mediterraneo",              year: 1991, won: true, genre: 'C', ceremony: 64, category: 'INT' },
  { title: "Indochine",                 year: 1992, won: true, genre: 'H', ceremony: 65, category: 'INT' },
  { title: "Belle Epoque",              year: 1992, won: true, genre: 'C', ceremony: 66, category: 'INT' },
  { title: "Burnt by the Sun",          year: 1994, won: true, genre: 'D', ceremony: 67, category: 'INT' },
  { title: "Antonia's Line",            year: 1995, won: true, genre: 'D', ceremony: 68, category: 'INT' },
  { title: "Kolya",                     year: 1996, won: true, genre: 'D', ceremony: 69, category: 'INT' },
  { title: "Character",                 year: 1997, won: true, genre: 'D', ceremony: 70, category: 'INT' },
  { title: "All About My Mother",       year: 1999, won: true, genre: 'D', ceremony: 72, category: 'INT' },
  { title: "No Man's Land",             year: 2001, won: true, genre: 'W', ceremony: 74, category: 'INT' },
  { title: "Nowhere in Africa",         year: 2001, won: true, genre: 'H', ceremony: 75, category: 'INT' },
  { title: "The Barbarian Invasions",   year: 2003, won: true, genre: 'D', ceremony: 76, category: 'INT' },
  { title: "The Sea Inside",            year: 2004, won: true, genre: 'D', ceremony: 77, category: 'INT' },
  { title: "Tsotsi",                    year: 2005, won: true, genre: 'D', ceremony: 78, category: 'INT' },
  { title: "The Lives of Others",       year: 2006, won: true, genre: 'T', ceremony: 79, category: 'INT' },
  { title: "The Counterfeiters",        year: 2007, won: true, genre: 'W', ceremony: 80, category: 'INT' },
  { title: "Departures",                year: 2008, won: true, genre: 'D', ceremony: 81, category: 'INT' },
  { title: "The Secret in Their Eyes",  year: 2009, won: true, genre: 'T', ceremony: 82, category: 'INT' },
  { title: "In a Better World",         year: 2010, won: true, genre: 'D', ceremony: 83, category: 'INT' },
  { title: "A Separation",              year: 2011, won: true, genre: 'D', ceremony: 84, category: 'INT' },
  { title: "The Great Beauty",          year: 2013, won: true, genre: 'I', ceremony: 86, category: 'INT' },
  { title: "Ida",                       year: 2013, won: true, genre: 'H', ceremony: 87, category: 'INT' },
  { title: "Son of Saul",               year: 2015, won: true, genre: 'W', ceremony: 88, category: 'INT' },
  { title: "The Salesman",              year: 2016, won: true, genre: 'D', ceremony: 89, category: 'INT' },
  { title: "A Fantastic Woman",         year: 2017, won: true, genre: 'D', ceremony: 90, category: 'INT' },
  { title: "Another Round",             year: 2020, won: true, genre: 'D', ceremony: 93, category: 'INT' },

  // =====================================================
  // BEST ANIMATED FEATURE WINNERS
  // =====================================================
  { title: "Shrek",                                          year: 2001, won: true, genre: 'A', ceremony: 74, category: 'ANIM' },
  { title: "Spirited Away",                                  year: 2002, won: true, genre: 'A', ceremony: 75, category: 'ANIM' },
  { title: "Finding Nemo",                                   year: 2003, won: true, genre: 'A', ceremony: 76, category: 'ANIM' },
  { title: "The Incredibles",                                year: 2004, won: true, genre: 'A', ceremony: 77, category: 'ANIM' },
  { title: "Wallace and Gromit The Curse of the Were-Rabbit", year: 2005, won: true, genre: 'A', ceremony: 78, category: 'ANIM' },
  { title: "Happy Feet",                                     year: 2006, won: true, genre: 'A', ceremony: 79, category: 'ANIM' },
  { title: "Ratatouille",                                    year: 2007, won: true, genre: 'A', ceremony: 80, category: 'ANIM' },
  { title: "WALL-E",                                         year: 2008, won: true, genre: 'A', ceremony: 81, category: 'ANIM' },
  { title: "Rango",                                          year: 2011, won: true, genre: 'A', ceremony: 84, category: 'ANIM' },
  { title: "Brave",                                          year: 2012, won: true, genre: 'A', ceremony: 85, category: 'ANIM' },
  { title: "Frozen",                                         year: 2013, won: true, genre: 'A', ceremony: 86, category: 'ANIM' },
  { title: "Big Hero 6",                                     year: 2014, won: true, genre: 'A', ceremony: 87, category: 'ANIM' },
  { title: "Inside Out",                                     year: 2015, won: true, genre: 'A', ceremony: 88, category: 'ANIM' },
  { title: "Zootopia",                                       year: 2016, won: true, genre: 'A', ceremony: 89, category: 'ANIM' },
  { title: "Coco",                                           year: 2017, won: true, genre: 'A', ceremony: 90, category: 'ANIM' },
  { title: "Spider-Man Into the Spider-Verse",               year: 2018, won: true, genre: 'A', ceremony: 91, category: 'ANIM' },
  { title: "Toy Story 4",                                    year: 2019, won: true, genre: 'A', ceremony: 92, category: 'ANIM' },
  { title: "Soul",                                           year: 2020, won: true, genre: 'A', ceremony: 93, category: 'ANIM' },
  { title: "Encanto",                                        year: 2021, won: true, genre: 'A', ceremony: 94, category: 'ANIM' },
  { title: "Guillermo del Toro's Pinocchio",                 year: 2022, won: true, genre: 'A', ceremony: 95, category: 'ANIM' },
  { title: "The Boy and the Heron",                          year: 2023, won: true, genre: 'A', ceremony: 96, category: 'ANIM' },
  { title: "Flow",                                           year: 2024, won: true, genre: 'A', ceremony: 97, category: 'ANIM' },
];
