# Simple Battle Graphics Toggle

## Summary

Add a toggle in Settings to disable battle mode animations. When enabled, all visual states (winner green border, loser dimming, ELO changes) still appear but snap instantly instead of animating. The 800ms delay between battle pairs is unaffected. Pack opening animations are unaffected.

## Motivation

The v2.2.0 design overhaul added polished battle animations (winner bounce, loser shrink/dim, hover transforms, ELO fade-in). These look great but add perceptible latency when rapidly battling. A "simple battle graphics" toggle lets users who prioritize speed opt out of the animation delay while keeping all visual feedback.

## Approach

**CSS class toggle.** A `.simple-battle` class on the battle container overrides animation durations to zero. Visual end-states are preserved. No changes to battle logic or timing.

## Design

### 1. Setting storage & state

- **Firebase field:** `profile.simpleBattle` (boolean, default `false`)
- **App.jsx:** New `handleSimpleBattleChange` callback following the same pattern as `handleAllowSkipChange` — updates local state with `setProfile` and persists via `firebaseSave('simpleBattle', value)`
- **Prop drilling:** `simpleBattle` and `onSimpleBattleChange` passed to `SettingsModal` and `MovieBattle`

### 2. Settings UI (SettingsModal.jsx)

- New toggle in the settings list, near the existing "Allow Skipping" toggle
- Label: **"Simple Battle Graphics"**
- Description: "Removes animations for faster battles"
- Same toggle switch component style as the skip toggle
- Calls `onSimpleBattleChange(boolean)` on toggle

### 3. MovieBattle.jsx wiring

Minimal change — conditionally add the class to the battle container:

```jsx
<div className={`battle-arena${simpleBattle ? ' simple-battle' : ''}`}>
```

No other JS changes. The 800ms `setTimeout` between pairs is untouched.

### 4. CSS overrides (App.css)

A single scoped block under `.simple-battle`:

| Selector | Override | Preserved visual state |
|----------|----------|----------------------|
| `.simple-battle .battle-card` | `transition: none` | — |
| `.simple-battle .battle-card:hover` | `transform: none; transition: none` | Border-color highlight (instant) |
| `.simple-battle .battle-card-winner` | `animation: none` | Green border color |
| `.simple-battle .battle-card-loser` | `transition: none` | `opacity: 0.5`, `scale(0.96)`, `grayscale(0.3)` (instant) |
| `.simple-battle .elo-change` | `transition: none` | ELO number visible immediately |

### 5. Scope boundaries

- **In scope:** Battle card hover, winner animation, loser transition, ELO change fade-in
- **Out of scope:** 800ms pair delay, pack opening animations, journey card animations, any non-battle UI

## Files changed

| File | Change |
|------|--------|
| `src/App.jsx` | Add `handleSimpleBattleChange`, pass props |
| `src/components/SettingsModal.jsx` | Add "Simple Battle Graphics" toggle |
| `src/components/MovieBattle.jsx` | Add conditional `simple-battle` class |
| `src/App.css` | Add `.simple-battle` override block |
