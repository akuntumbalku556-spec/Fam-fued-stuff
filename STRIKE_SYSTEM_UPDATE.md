# Strike System & Game Mechanics Update

## Overview
Updated the Family Feud game with a persistent strike display system and two new game mechanics: Steal and Reveal All.

---

## ✅ Changes Implemented

### 1. **CSS Variable Rename**
- Renamed `--panel-bg` to `--loading` throughout the entire CSS file
- Updated all references from `var(--panel-bg)` to `var(--loading)`
- **Locations updated**: `.session-panel`, `#timer-config-panel`, `#game-block`

### 2. **Strike Display System**

#### HTML (game.html)
- Added strike display container with 3 strike slots
- Positioned between Team 1 and Timer in the bottom bar
- Structure:
  ```html
  <div id="strike-display" aria-label="Strike counter">
    <div class="strike-slot" data-strike="1"></div>
    <div class="strike-slot" data-strike="2"></div>
    <div class="strike-slot" data-strike="3"></div>
  </div>
  ```

#### CSS (style.css)
- Added `#strike-display` container styles
- Added `.strike-slot` for inactive state (gray circles)
- Added `.strike-slot.active` for active state (red circles with "✗")
- Features:
  - Circular strike indicators
  - Smooth transitions
  - Scale effect when active
  - Red glow shadow on active strikes

#### JavaScript (main.js)
- **Modified `addStrike()`**: Now updates strike display, no auto-reset after 3
- **Modified `resetStrikes()`**: Calls `updateStrikeDisplay()` to clear visuals
- **Implemented `updateStrikeDisplay()`**: Shows/hides X marks based on current strike count

### 3. **New Game Mechanic: Steal Points**

#### Functionality
- **Trigger**: Press [S] key
- **Condition**: Only works when strikes === 3
- **Effect**: 
  - Counts all revealed answers in current round
  - Subtracts those points from active team
  - Adds those points to opposing team
  - Resets strikes to 0
  - Updates displays

#### JavaScript Implementation
```javascript
function stealPoints() {
  if (gameState.strikes !== 3) return;
  // Transfer points from active team to other team
  // Reset strikes
  // Update displays
}
```

### 4. **New Game Mechanic: Reveal All Answers**

#### Functionality
- **Trigger**: Press [D] key
- **Effect**:
  - Reveals all remaining hidden answers
  - Does NOT award points to any team
  - Useful for showing all answers at round end

#### JavaScript Implementation
```javascript
function revealAllAnswers() {
  // Loop through all answers
  // Reveal hidden slots without scoring
  // Update DOM
}
```

### 5. **Keyboard Shortcuts Updated**

#### New Shortcuts
- **S**: Steal points (after 3 strikes)
- **D**: Reveal all remaining answers

#### Updated Shortcut Reference (game.html)
```
1–9 / 0 = Reveal | X = Strike | / = Reset | 
S = Steal (after 3 strikes) | D = Reveal All | 
\ = Switch team | T = Timer | R = Reset timer | 
F = Fullscreen | ◀ ▶ = Session
```

---

## 🎮 Game Flow Changes

### Before:
1. Press X to add strike
2. After 3 strikes → auto-reset, continue playing
3. No visible strike counter

### After:
1. Press X to add strike → **See X indicator appear**
2. After 3 strikes → **Strikes stay at 3**
3. Host chooses:
   - Press **S** to steal points to other team
   - Press **/** to reset strikes manually
   - Press **D** to reveal all answers
4. Visible strike counter shows current strikes (0-3)

---

## 📋 Technical Details

### Strike Display Behavior
- **0 strikes**: All 3 circles gray/inactive
- **1 strike**: First circle shows red "✗"
- **2 strikes**: First two circles show red "✗"
- **3 strikes**: All three circles show red "✗" (steal available)

### Steal Points Logic
```
Points to steal = Number of revealed answers in current round
Active team score -= Points to steal
Other team score += Points to steal
Strikes reset to 0
```

### Reveal All Logic
```
For each hidden answer:
  - Mark as revealed
  - Update DOM to show answer text
  - Do NOT add to any team's score
```

---

## 🧪 Testing Checklist

- [ ] Strike indicators appear correctly (1-3 strikes)
- [ ] Strike indicators reset when / is pressed
- [ ] Strike indicators reset after steal (S key)
- [ ] Steal only works when strikes === 3
- [ ] Steal correctly transfers points
- [ ] Reveal All (D key) shows all answers
- [ ] Reveal All does NOT award points
- [ ] Keyboard shortcuts work as documented
- [ ] Strike display is visible in bottom bar layout
- [ ] Strikes persist across answer reveals
- [ ] Strikes reset when navigating to new session

---

## 🎨 Visual Design

### Strike Indicators
- **Size**: 3rem diameter circles
- **Color (inactive)**: Light gray (#cbd5e0)
- **Color (active)**: Bright red (#ff4757)
- **Icon**: White "✗" when active
- **Effect**: Scale up 1.1x + red glow shadow

### Layout
```
[TEAM 1: Score] [X][X][X] [Timer] [TEAM 2: Score]
```

---

## 📝 Notes

### Design Decisions
1. **No auto-reset after 3 strikes**: Gives host control over when to steal or reset
2. **Visible strike counter**: Provides clear feedback to players
3. **Steal mechanic**: Traditional Family Feud rule implementation
4. **Reveal All**: Quality of life feature for showing remaining answers

### Future Enhancements
- Add sound effect for steal
- Add visual animation for point transfer
- Add confirmation prompt for steal action
- Add strike count to keyboard shortcut reference

---

*Last Updated: 2026-08-12*
*Version: 2.0.0*
