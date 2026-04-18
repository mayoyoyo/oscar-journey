# Expanding the Oscar Journey Catalog — Methodology

## The problem

The current catalog (~399 films) is tethered to the Oscars: all Best Picture nominees since 1970, plus International Feature and Animated Feature winners. This misses films that are clearly "must-watch" but never made the Oscar cut — Fight Club, The Matrix, Blade Runner, Do the Right Thing, Mulholland Drive, Seven Samurai.

Expanding the catalog has two failure modes:

1. **Balloon to thousands.** If we pull in every "top 1000 films of all time" list, the catalog drowns in films nobody actually needs to see.
2. **Pick the wrong metric.** Any single source has a known skew:
   - **Rotten Tomatoes** — optimistic on recent prestige films (Black Panther 96% vs. Fight Club 79%).
   - **Oscars** — politically cautious, genre-averse, US-centric, recency-weighted.
   - **IMDb Top 250** — audience-driven, skews male/genre (more sci-fi, action, thrillers).
   - **Sight & Sound** — arthouse/foreign/old, minimal blockbusters.
   - **Letterboxd** — cinephile-millennial, foreign-friendly, recent-friendly.

"Must-watch" is inherently subjective, but we can approximate it *objectively enough* by triangulating across multiple canonical lists whose biases are orthogonal.

---

## The method: 2-of-N triangulation

**A film qualifies for inclusion if it appears on at least 2 of 7 independent "canon" lists.**

Each list has a known skew. Requiring overlap between two lists acts as a consensus filter — films that survive are ones that pass muster under more than one worldview.

### The 7 lists

| Source | Approx. size | Skew | What it catches that Oscars miss |
|---|---|---|---|
| **Sight & Sound 2022** (Critics + Directors Top 100 merged) | ~130 films | Arthouse, foreign, old | Jeanne Dielman, Tokyo Story, In the Mood for Love, Beau Travail |
| **AFI 100 + AFI 10 Top 10** (2007 + 2008 genre lists) | ~160 films | US mainstream, 20th-century canon | Raiders of the Lost Ark, The Shining, Blade Runner |
| **IMDb Top 250** (current snapshot) | 250 films | Audience, genre-friendly | **Fight Club, The Matrix, Se7en, Prestige, Memento** |
| **Letterboxd Top 250 Narrative Features** | 250 films | Cinephile-millennial | Portrait of a Lady on Fire, Perfect Blue, Yi Yi |
| **Cannes / Venice / Berlin Grand Prizes** (Palme d'Or, Golden Lion, Golden Bear) | ~220 unique | Euro-arthouse | Paris Texas, Taste of Cherry, Uncle Boonmee, Titane |
| **National Film Registry** (Library of Congress, feature films only) | ~700 films | US canon, preservation | Do the Right Thing, Night of the Living Dead, Killer of Sheep |
| **Criterion Collection** (theatrical feature films by spine number) | ~1,200 films | Arthouse, world cinema | Seven Samurai, La Haine, Stalker, Tokyo Story |

### Why these 7

Each list is authored by a different institution with a different worldview:
- **Sight & Sound** = professional critics and directors (BFI).
- **AFI** = Hollywood industry retrospective (American Film Institute).
- **IMDb** = millions of casual viewers voting.
- **Letterboxd** = self-identified cinephiles.
- **Festival juries** = international art-film establishment.
- **National Film Registry** = Library of Congress film preservation board.
- **Criterion** = curated theatrical/arthouse publisher.

A film that appears on **any two** of these has been blessed by at least two disjoint cultural authorities. That's meaningful signal.

### Why 2-of-N, not 3-of-N

- **3-of-N** is too strict: it eliminates obvious must-watches (The Matrix only makes IMDb + NFR, Fight Club only makes IMDb + Letterboxd). These films are worth keeping.
- **1-of-N** is the current Oscar-only model — we know that misses too much.
- **2-of-N** is the sweet spot where a film has to be recognized by two different cultural worldviews to qualify.

---

## Results

Running the 2-of-N rule across all 7 lists and deduplicating against the existing 399-title catalog:

| Tier | # Films | Description |
|---|---|---|
| **6 of 7 lists** | 4 | Iron-clad universal canon. City Lights, Modern Times, The Third Man, Some Like It Hot. |
| **5 of 7 lists** | 9 | Near-universal canon. Rashomon, Vertigo, 2001: A Space Odyssey, Do the Right Thing. |
| **4 of 7 lists** | 27 | Strong consensus. Seven Samurai, Tokyo Story, Alien, Blade Runner, The Shining, Come and See, Terminator 2. |
| **3 of 7 lists** | 64 | Clear must-watches. Metropolis, Stalker, 8½, Harakiri, Jeanne Dielman, Ran, Eraserhead, The Empire Strikes Back. |
| **2 of 7 lists** | 182 | Passes the bar. Fight Club, The Matrix, Mulholland Drive, Portrait of a Lady on Fire. |
| **Total** | **286** | Essentials in catalog |

The 2-of-7 rule originally produced ~438 essentials. A later curation pass
removed pre-1970 tier-2/3 bloat (redundant directors, faded mid-century
melodrama, niche festival artifacts) and promoted BP winners + nominees from
ESSENTIAL into the BP section — so tier counts above reflect the final
catalog, not the raw rule output.

**Final catalog size: 463 Oscar films + 286 Essentials = 749 films.** Well short of "thousands."

### Decade distribution

The rule produces a natural coverage pattern heavy in the golden age of cinema and thin in the last decade (because consensus canon takes time to form):

```
1910s:  1      1970s:  45
1920s: 16      1980s:  48
1930s: 32      1990s:  48
1940s: 50      2000s:  23
1950s: 74      2010s:  11
1960s: 87      2020s:   3
```

### Validation — does it produce the right answers?

| Film | Expected | Result |
|---|---|---|
| Fight Club (1999) | Should be IN (the user's benchmark case) | ✓ IN (IMDb + Letterboxd) |
| The Matrix (1999) | Should be IN (never got BP nom) | ✓ IN (IMDb + NFR) |
| Mulholland Drive (2001) | Should be IN | ✓ IN (S&S + Letterboxd + Criterion) |
| Blade Runner (1982) | Should be IN | ✓ IN (AFI + IMDb + NFR + S&S) |
| Do the Right Thing (1989) | Should be IN — glaring Oscar snub | ✓ IN (5 lists) |
| Portrait of a Lady on Fire (2019) | Should be IN | ✓ IN (3 lists) |
| **White Chicks (2004)** | Should be OUT — cult but not canon | ✗ OUT (0 lists) |

The rule correctly separates "cult classic with cultural reach" (Fight Club) from "cult classic without it" (White Chicks).

---

## Known gaps — where the rule breaks

### 1. Recency lag

Only 3 films from the 2020s qualify under the rule: Anora, Flow, All the Beauty and the Bloodshed. This isn't a bug — it's the lists themselves lagging. NFR requires 10 years since release, Sight & Sound is decennial, Criterion is slow to pick up recent films.

**Fix:** Add a **modern canon side-rule** for films under 8 years old:
- Metacritic ≥ 85 **AND**
- Letterboxd average rating ≥ 4.0 **AND**
- At least one of: major festival grand prize, critic top-10 of year (NYT, Sight & Sound, Cahiers), or top 3 of Letterboxd's year-end list.

### 2. Single-list cult classics

Films that dominate one audience list without crossing over will be missed. Perfect Blue (only on Letterboxd Top 250) is the clearest example. Others: Donnie Darko, Primer, Synecdoche New York.

**Fix:** Manual override tier. This is rare enough that curation is cheaper than loosening the rule.

### 3. The margin of Tier 2 (2-of-7) is noisy

Tier 2 is 182 films (after the 2026 curation pass). Some are unambiguous (Fight Club, The Matrix). Some are borderline — bottom-of-Criterion + bottom-of-NFR entries. If 749 feels too big, cut at Tier 3 for 567 total films. That's the cleanest break.

### 4. Genre representation

NFR and AFI over-represent American mainstream. Sight & Sound and Criterion over-represent arthouse. Festival winners over-represent European auteurs. Animation and horror are consistently underweighted across all seven.

**Fix:** If desired, supplement with genre-specific canons (BFI best horror, TIFF essential 100, etc.) as an 8th list. Note that doing this might bring in maybe +30 films, not hundreds.

### 5. Is this actually "objective"?

No — it's **objective-ish**. The method doesn't eliminate subjectivity; it distributes it across seven authorities with different biases and requires consensus. A film that passes the rule has been endorsed by at least two different cultural establishments. That's a weaker claim than "objectively great," but it's a much stronger claim than "one critic liked it."

---

## Recommended rollout

1. **Ship Tiers 3–6 first** (143 films, all on ≥3 lists). These are unambiguously canon. No one will argue.
2. **Review Tier 2 (295 films) with a pass of human judgment.** Most are solid; a handful at the margins may not fit the site's vibe.
3. **Decide on a modern canon side-rule** for 2020s films later, once the static canon is in place.
4. **Optional: add an 8th list** (genre-specific or regional) if coverage gaps are apparent after shipping.

---

## Deliverables

Three files accompany this methodology:

- **`additions.md`** — Human-readable list of all 438 additions, grouped by tier, with which lists qualified each film.
- **`additions.js`** — Drop-in block for the existing `src/data/movies.js`. Matches the current schema (`id`, `title`, `year`, `genre`, `category: 'CANON'`) and adds two new fields: `tier` (number of lists) and `lists` (which ones). Genre codes default to `'D'` (Drama) and need manual review — genre should probably be hand-set since the rule doesn't know what each film is.
- **`additions.json`** — Raw data, same information in machine-readable form.

---

## One-line summary

**Require any new film to appear on ≥2 of 7 independent canonical lists. After a 2026 curation pass (cut pre-1970 bloat, promote BP winners + nominees, add pre-1991 International Feature winners), final catalog is 463 Oscar films + 286 Essentials = 749 total. Fight Club in, White Chicks out.**
