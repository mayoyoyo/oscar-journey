# Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform The Oscars Journey from a functional app into a visually stunning, cinema-grade experience with distinctive typography, cinematic animations, atmospheric poster treatments, and premium micro-interactions.

**Architecture:** Pure CSS/JS visual changes — no functionality changes. Typography upgrade via Google Fonts. Ambient color extraction via canvas. All animations CSS-based except poster tilt (minimal JS). Single App.css file modified throughout.

**Tech Stack:** React 18, Vite, CSS3 (animations, custom properties, backdrop-filter), Google Fonts (Playfair Display + DM Sans), Canvas API (color extraction)

---

### Task 1: Typography Upgrade

**Files:**
- Modify: `index.html:44` (font import)
- Modify: `src/App.css:6-62` (CSS variables), throughout file (font-family declarations)

- [ ] **Step 1: Add new fonts to index.html**

Replace the Cinzel-only import with Playfair Display (display serif) + DM Sans (clean body) + keep Cinzel for the logo brand:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Add font variables to :root in App.css**

After the existing color variables (around line 30), add:

```css
--font-display: 'Playfair Display', Georgia, serif;
--font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
--font-brand: 'Cinzel', Georgia, serif;
```

- [ ] **Step 3: Apply font-body to the base**

Find `#root` (around line 79) and update:

```css
#root {
  font-family: var(--font-body);
  /* ... rest unchanged */
}
```

- [ ] **Step 4: Replace Georgia serif references with --font-display**

Search for `font-family: Georgia, serif` throughout App.css and replace with `font-family: var(--font-display)`. Key locations:
- Film titles (`.film-title`)
- Section headings (h2 elements)
- Profile detail name
- Battle VS text
- Start screen h1
- Any `Georgia, serif` reference

Keep `'Cinzel'` references only for `.nav-brand-oscar`, `.nav-brand-journey`, `.pack-title`, `.daily-title`, and `.wn-title` — these are brand elements.

- [ ] **Step 5: Verify locally**

Open http://localhost:5173 and confirm:
- Headings use Playfair Display (distinctive serifs with high contrast)
- Body text uses DM Sans (clean, geometric)
- Logo still uses Cinzel
- No font fallback flashes

---

### Task 2: Cinematic Page Entrance Animations

**Files:**
- Modify: `src/App.css` (add new keyframes and classes)
- Modify: `src/App.jsx:938-960` (add entrance classes to main render)

- [ ] **Step 1: Add entrance animation keyframes to App.css**

Add after the existing `@keyframes fadeInUp` (around line 2008):

```css
/* Cinematic entrance */
@keyframes cinematicFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.cinematic-enter > * {
  opacity: 0;
  animation: cinematicFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.cinematic-enter > *:nth-child(1) { animation-delay: 0.05s; }
.cinematic-enter > *:nth-child(2) { animation-delay: 0.12s; }
.cinematic-enter > *:nth-child(3) { animation-delay: 0.2s; }
.cinematic-enter > *:nth-child(4) { animation-delay: 0.28s; }
.cinematic-enter > *:nth-child(5) { animation-delay: 0.36s; }
.cinematic-enter > *:nth-child(6) { animation-delay: 0.44s; }
```

- [ ] **Step 2: Apply entrance class to main content in App.jsx**

Around line 953, the `.app-scroll-area` div — add the class:

```jsx
<div className="app-scroll-area cinematic-enter">
```

- [ ] **Step 3: Add entrance to NavBar**

In App.css, add:

```css
.main-nav {
  animation: cinematicFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 4: Verify locally**

Refresh page — nav should fade in first, then content elements stagger in one by one. Should feel like a movie opening.

---

### Task 3: Micro-Interactions — Buttons & Tabs

**Files:**
- Modify: `src/App.css` (button styles, tab styles)

- [ ] **Step 1: Upgrade button press states**

Find `.btn-primary` (around line 969) and add active state:

```css
.btn-primary:active,
.btn-next:active,
.login-btn:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 8px rgba(139,105,20,0.2);
  transition: all 0.08s ease;
}
```

- [ ] **Step 2: Add tab switch transition**

Find `.nav-tab` styles (around line 150) and add smooth underline animation:

```css
.nav-tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  right: 50%;
  height: 2px;
  background: var(--gold);
  transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1), right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.nav-tab.active::after {
  left: 0;
  right: 0;
}
```

- [ ] **Step 3: Add watched button satisfying press**

Find `.watched-btn` and add:

```css
.watched-btn:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}
.watched-btn.is-watched {
  animation: watchedPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes watchedPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 4: Verify locally**

Click buttons — should feel springy on press. Tab switches should have smooth underline slide.

---

### Task 4: Journey Card Redesign — Cinema Marquee

**Files:**
- Modify: `src/App.css:303-400` (film-card styles)
- Modify: `src/components/FilmCard.jsx:73-99` (poster render)

- [ ] **Step 1: Redesign the film-card container**

Replace `.film-card` styles (around line 303):

```css
.film-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 20px;
  display: flex;
  min-height: 360px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 8px 32px var(--shadow), 0 0 0 1px rgba(255,255,255,0.03);
  position: relative;
}
```

- [ ] **Step 2: Upgrade poster column with atmospheric gradient**

Replace `.poster-col` styles (around line 318):

```css
.poster-col {
  width: 42%;
  min-width: 220px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg3), var(--bg2));
}

.poster-col::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(139,105,20,0.06) 0%, transparent 70%);
  z-index: 1;
  pointer-events: none;
}
```

- [ ] **Step 3: Add poster tilt effect in FilmCard.jsx**

In FilmCard.jsx, add a ref and mouse handlers to the poster image (around line 78-92). Add after the `useEffect`:

```jsx
const posterRef = useRef(null);
const handlePosterMove = (e) => {
  const el = posterRef.current;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
  const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
  el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
};
const handlePosterLeave = () => {
  if (posterRef.current) posterRef.current.style.transform = '';
};
```

Add `ref={posterRef} onMouseMove={handlePosterMove} onMouseLeave={handlePosterLeave}` to the poster `<img>` tag. Add `useRef` to imports.

- [ ] **Step 4: Add poster ambient glow in CSS**

```css
.poster-img {
  transition: transform 0.2s ease-out, box-shadow 0.3s ease;
}
.poster-col:hover .poster-img {
  box-shadow: 0 8px 30px rgba(139,105,20,0.15);
}
```

- [ ] **Step 5: Verify locally**

Hover over the journey poster — should tilt subtly in 3D following your mouse, with a warm ambient glow.

---

### Task 5: Battle Mode Visual Overhaul

**Files:**
- Modify: `src/App.css:1926-1980` (battle styles)
- Modify: `src/components/MovieBattle.jsx:388-454` (battle arena render)

- [ ] **Step 1: Dramatic battle arena background**

Replace `.battle-arena` (around line 1926):

```css
.battle-arena {
  display: flex;
  align-items: stretch;
  gap: 0;
  max-width: 700px;
  margin: 0 auto;
  position: relative;
  padding: 24px 0;
}

.battle-arena::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: radial-gradient(ellipse at 50% 50%, rgba(139,105,20,0.04) 0%, transparent 70%);
  pointer-events: none;
}
```

- [ ] **Step 2: Upgrade battle cards with dramatic hover**

Replace `.battle-card` styles:

```css
.battle-card {
  flex: 1;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.battle-card:hover {
  transform: translateY(-8px) rotate(-1deg) scale(1.03);
  box-shadow: 0 20px 50px rgba(0,0,0,0.2), 0 0 30px rgba(139,105,20,0.08);
  border-color: var(--gold-dim);
  z-index: 2;
}

.battle-card:active {
  transform: translateY(-2px) scale(0.98);
  transition: all 0.1s ease;
}
```

- [ ] **Step 3: Dramatic VS separator**

Replace `.battle-vs` styles:

```css
.battle-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  font-style: italic;
  color: var(--gold);
  min-width: 60px;
  text-shadow: 0 2px 12px rgba(139,105,20,0.3);
  position: relative;
  z-index: 3;
}
```

- [ ] **Step 4: Add vote impact animation in MovieBattle.jsx**

In MovieBattle.jsx, add a CSS class toggle when voting. Around line 397, the battle-card onClick — the `style={{ opacity: voting ? 0.7 : 1 }}` can be enhanced:

Replace inline `style={{ opacity: voting ? 0.7 : 1 }}` with:

```jsx
className={`battle-card ${voting && eloChange?.winner === 'a' ? 'battle-card-winner' : ''} ${voting && eloChange?.winner !== 'a' ? 'battle-card-loser' : ''}`}
```

Same for movie B with `'b'`.

Add CSS:

```css
.battle-card-winner {
  animation: battleWin 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  border-color: #5a9a5a;
}
.battle-card-loser {
  opacity: 0.5;
  transform: scale(0.96);
  filter: grayscale(0.3);
}
@keyframes battleWin {
  0% { transform: scale(1); }
  30% { transform: scale(1.06) rotate(-1deg); }
  60% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 5: Verify locally**

Go to Battle tab — cards should have dramatic hover tilts, VS should feel impactful, voting should show winner/loser animation.

---

### Task 6: Ambient Poster Color Extraction

**Files:**
- Create: `src/utils/colorExtract.js`
- Modify: `src/components/FilmCard.jsx` (apply ambient color)

- [ ] **Step 1: Create color extraction utility**

```javascript
// src/utils/colorExtract.js
export function extractDominantColor(imgSrc, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 4, 4);
    try {
      const data = ctx.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2];
      }
      const pixels = data.length / 4;
      callback(`${Math.round(r/pixels)}, ${Math.round(g/pixels)}, ${Math.round(b/pixels)}`);
    } catch { callback(null); }
  };
  img.onerror = () => callback(null);
  img.src = imgSrc;
}
```

- [ ] **Step 2: Apply in FilmCard.jsx**

After the OMDB fetch effect, add:

```jsx
const [ambientColor, setAmbientColor] = useState(null);

useEffect(() => {
  if (omdbData?.poster) {
    extractDominantColor(omdbData.poster, (color) => {
      if (color) setAmbientColor(color);
    });
  }
}, [omdbData?.poster]);
```

On the `.film-card` div, add:

```jsx
style={ambientColor ? { '--ambient': ambientColor } : undefined}
```

- [ ] **Step 3: Add ambient CSS**

```css
.film-card {
  background: linear-gradient(
    135deg,
    rgba(var(--ambient, 139,105,20), 0.03) 0%,
    var(--bg2) 40%
  );
}
```

- [ ] **Step 4: Verify locally**

Each film card should have a very subtle color wash matching the poster's dominant color. Blue poster = slight blue tint. Red poster = slight red warmth.

---

### Task 7: Wallet/Card Display Upgrade

**Files:**
- Modify: `src/App.css:2503-2559` (wallet styles)

- [ ] **Step 1: Premium wallet card treatment**

Replace `.pd-wallet-card` styles:

```css
.pd-wallet-card {
  width: 90px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid var(--rarity-border);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  background: var(--bg3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.pd-wallet-card:hover {
  transform: translateY(-6px) scale(1.05);
  box-shadow: 0 12px 24px rgba(0,0,0,0.2), 0 0 16px var(--rarity-glow);
}
```

- [ ] **Step 2: Add holographic sheen to wallet cards**

```css
.pd-wallet-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.pd-wallet-card:hover::after {
  opacity: 1;
  animation: holoSheen 2s ease-in-out;
}
```

- [ ] **Step 3: Verify locally**

Check profile page wallet — cards should lift dramatically on hover with holographic sheen effect.

---

### Task 8: Final Polish Pass

**Files:**
- Modify: `src/App.css` (throughout)

- [ ] **Step 1: Add smooth page transitions for tab switches**

```css
.app-scroll-area > main,
.app-scroll-area > div,
.app-scroll-area > section {
  animation: cinematicFadeIn 0.3s ease;
}
```

- [ ] **Step 2: Upgrade modal entrances**

Find `.modal-overlay.open` and add:

```css
.modal-overlay.open {
  animation: modalOverlayIn 0.25s ease;
}
@keyframes modalOverlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.modal-overlay.open .modal {
  animation: modalContentIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modalContentIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
```

- [ ] **Step 3: Add subtle scroll shadow to nav**

```css
.main-nav {
  box-shadow: 0 1px 0 var(--border), 0 4px 16px rgba(0,0,0,0.04);
}
```

- [ ] **Step 4: Verify all changes locally**

Full walkthrough of all tabs, modals, interactions. Confirm:
- Typography is distinctive (Playfair Display headings, DM Sans body)
- Entrance animations feel cinematic
- Buttons feel alive on press
- Poster tilts on hover
- Battle mode feels dramatic
- Wallet cards have premium hover
- Everything works on mobile

---
