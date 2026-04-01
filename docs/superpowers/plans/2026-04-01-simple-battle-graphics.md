# Simple Battle Graphics Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings toggle that disables battle mode animations so visual states (winner/loser/ELO) snap instantly instead of animating.

**Architecture:** CSS class toggle approach. A `.simple-battle` class on the battle container overrides all animation/transition durations to zero. The setting is stored in Firebase (`profile.simpleBattle`) and wired through the same prop-drilling pattern as the existing `allowSkip` toggle.

**Tech Stack:** React (useState/useCallback), Firebase Firestore, CSS

---

### Task 1: Add CSS overrides for simple battle mode

**Files:**
- Modify: `src/App.css` (after line 2358, after the `@keyframes fadeInUp` block)

- [ ] **Step 1: Add the `.simple-battle` override block**

Add this CSS after the `@keyframes fadeInUp` closing brace (line 2359):

```css
/* Simple battle mode — instant visual states, no animations */
.simple-battle .battle-card {
  transition: none;
}
.simple-battle .battle-card:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--gold-dim);
  transition: none;
}
.simple-battle .battle-card:active {
  transform: none;
  transition: none;
}
.simple-battle .battle-card-winner {
  animation: none;
  border-color: #5a9a5a;
}
.simple-battle .battle-card-loser {
  opacity: 0.5;
  transform: scale(0.96);
  filter: grayscale(0.3);
  transition: none;
}
.simple-battle .battle-elo-change {
  animation: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "feat: add .simple-battle CSS overrides for instant visual states"
```

---

### Task 2: Add state and callback in App.jsx

**Files:**
- Modify: `src/App.jsx:859-862` (after `handleAllowSkipChange`)

- [ ] **Step 1: Add `handleSimpleBattleChange` callback**

After the `handleAllowSkipChange` block (line 862), add:

```javascript
  // --- Simple battle graphics toggle ---
  const handleSimpleBattleChange = useCallback((val) => {
    setProfile(prev => prev ? { ...prev, simpleBattle: val } : prev);
    firebaseSave('simpleBattle', val);
  }, [firebaseSave]);
```

- [ ] **Step 2: Pass `simpleBattle` prop to MovieBattle**

In the MovieBattle JSX (around line 1101), add the `simpleBattle` prop:

```jsx
        <MovieBattle
          profile={profile}
          playlist={playlist}
          watchedSet={watchedSet}
          onOpenDetail={setDetailMovie}
          simpleBattle={profile?.simpleBattle || false}
          onSaveProfile={(field, value) => {
            firebaseSave(field, value);
            setProfile(prev => prev ? { ...prev, [field]: value } : prev);
          }}
        />
```

- [ ] **Step 3: Pass `simpleBattle` props to SettingsModal**

In the SettingsModal JSX (around line 1166), add the two new props:

```jsx
        <SettingsModal
          raters={raters}
          onRatersChange={handleRatersChange}
          avatar={profile?.avatar || '🍿'}
          onAvatarChange={handleAvatarChange}
          allowSkip={profile?.allowSkip !== false}
          onAllowSkipChange={handleAllowSkipChange}
          simpleBattle={profile?.simpleBattle || false}
          onSimpleBattleChange={handleSimpleBattleChange}
          onClose={() => setSettingsOpen(false)}
          onClearCache={handleClearCache}
          profile={profile}
          onLogout={handleLogout}
        />
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add simpleBattle state, callback, and prop wiring in App.jsx"
```

---

### Task 3: Add toggle to SettingsModal

**Files:**
- Modify: `src/components/SettingsModal.jsx:52` (props) and after line 152 (after Journey toggle section)

- [ ] **Step 1: Add props to function signature**

Update the component's destructured props (line 52):

```jsx
export default function SettingsModal({ raters, onRatersChange, avatar, onAvatarChange, allowSkip, onAllowSkipChange, simpleBattle, onSimpleBattleChange, onClose, onClearCache, profile, onLogout }) {
```

- [ ] **Step 2: Add the Battle toggle section**

After the Journey toggle `</div>` (after line 152), add:

```jsx
        {/* Battle toggle */}
        <div className="settings-section">
          <label className="settings-label">Battle</label>
          <div className={`settings-toggle-row ${simpleBattle ? 'active' : ''}`} onClick={() => onSimpleBattleChange(!simpleBattle)}>
            <span className="settings-toggle-switch"><span className="settings-toggle-knob" /></span>
            <span className="settings-toggle-label">Simple battle graphics</span>
          </div>
          <p className="settings-hint">Removes animations for faster battles. Visual feedback still shown.</p>
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.jsx
git commit -m "feat: add Simple Battle Graphics toggle to settings"
```

---

### Task 4: Wire class into MovieBattle

**Files:**
- Modify: `src/components/MovieBattle.jsx:157` (props) and line 393 (battle-arena div)

- [ ] **Step 1: Add `simpleBattle` to destructured props**

Update the component signature (line 157):

```jsx
export default function MovieBattle({ profile, playlist, watchedSet, onOpenDetail, onSaveProfile, simpleBattle }) {
```

- [ ] **Step 2: Add conditional class to battle-arena**

Change the battle-arena div (line 393):

```jsx
          <div className={`battle-arena${simpleBattle ? ' simple-battle' : ''}`}>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MovieBattle.jsx
git commit -m "feat: apply simple-battle class when toggle is active"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify default behavior**

Open the app in the browser. Go to Battle mode. Confirm animations still work normally (hover lift, winner bounce, loser dim transition, ELO fade-in).

- [ ] **Step 3: Enable the toggle**

Open Settings. Toggle "Simple battle graphics" on. Return to Battle mode.

- [ ] **Step 4: Verify simple mode**

- Hover over a battle card: no lift/rotate/scale, border-color change is instant
- Click a winner: green border appears instantly (no bounce), loser dims instantly (no transition), ELO numbers appear instantly (no fade-in)
- The 800ms delay between pairs still works normally
- Pack opening animations are unaffected

- [ ] **Step 5: Verify persistence**

Refresh the page. Confirm the toggle is still on and battle mode still uses simple graphics.

- [ ] **Step 6: Toggle off and verify**

Turn the toggle back off. Confirm all animations return to normal.
