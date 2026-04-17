# The Oscars Journey

A film tracker for the canon of cinema — every Best Picture nominee since 1970, every International and Animated Feature winner, plus 438 essential non-Oscar canon films triangulated across 7 major lists (Sight & Sound, AFI, IMDb Top 250, Letterboxd, festival grand prizes, National Film Registry, Criterion). 837 films total.

**Live site: [theoscarsjourney.com](https://theoscarsjourney.com)**

## Features

- **Journey mode** — shuffled catalog, one film at a time. Skip is discouraged; the point is watching what the algorithm picks, not what you'd already choose.
- **Films tab** — searchable A-Z browse across title / director / full cast. Filter by canon depth (tier 1-7), era, genre, runtime, Oscar category, and more.
- **Film detail modal** — poster, ratings (IMDb + site average + ELO), director, top-billed cast, plot, Oscar wins with speech-search links, ceremony cross-references.
- **Oscar statuette icons** — gold (BP winner), bronze (BP nominee), blue (Intl winner), purple (Anim winner), absent (canon-only). Clicks go to YouTube speech searches.
- **Language flag pill** for non-English films.
- **Battle mode** — head-to-head film matchups with ELO ratings, both personal and global.
- **Daily Oscar** — guess the mystery film from a blurred poster and quote clues; fewer guesses = rarer card.
- **Collectible cards** — common / rare / epic / legendary pulls for rating and battling films. Wallet holds your top 3 to feature.
- **Profiles & ratings** — per-user star ratings across flexible dimensions; compare your taste against friends.

## Canon methodology

A film qualifies as "canon" if it appears on ≥ 2 of 7 independent canonical lists (Sight & Sound 2022, AFI 100 + 10 Top 10, IMDb Top 250, Letterboxd Top 250, Cannes/Venice/Berlin grand prizes, National Film Registry, Criterion Collection). Oscar Best Picture winners get the OSCAR list as an 8th for ranking purposes. See [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md) for the full triangulation approach.

## Stack

- React 18 + Vite
- Firebase Firestore (profiles, ratings, ELO, card wallet)
- OMDb for poster/plot/runtime/rating/language/cast
- Wikidata SPARQL for full cast + per-category Oscar awards
- Static data bakes in `src/data/` — movies, directors, actors, cast, languages, quotes
