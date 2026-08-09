# Design Document: Family Feud Game

## Overview

A fully offline, single-player-hosted Family Feud game implemented as a three-page static web application — no server, no build tools, no network dependencies. The host opens `index.html` to configure sessions, clicks "Start Game" to navigate to `game.html` where the live game is played, and after the final session the game automatically navigates to `results.html` which displays both teams' final scores and the winner. All data is persisted in `localStorage` under the keys `familyFeudSessions` and `familyFeudResults`. The application works correctly when served from the `file://` protocol in any modern desktop browser.

The game targets a TV-show style presentation: a dark, high-contrast board visible from a distance, keyboard-driven controls so the host never needs a mouse during play, and cumulative team scores that persist across rounds.

---

## Architecture

The application is a **single-module vanilla JavaScript** design. There is no framework, no bundler, and no external dependencies. All JavaScript lives in one file (`js/main.js`) that runs in `index.html`, `game.html`, and `results.html` — a small `init()` dispatch at the bottom of the file detects which page is loaded via the `data-page` attribute on `<body>` and calls the corresponding initialiser.

```
Fam-fued-stuff/
├── index.html          ← Setup Page   (Stage 1)
├── game.html           ← Game Page    (Stage 2)
├── results.html        ← Results Page (Stage 3)
├── css/
│   └── style.css       ← All styles (all three pages share this file)
└── js/
    └── main.js         ← All logic  (all three pages share this file)
```

### Data Flow

```
index.html
  └─ setupInit()
       ├─ reads  localStorage["familyFeudSessions"]
       ├─ renders session panels
       ├─ on every input change: debounce(500ms) → saveToStorage()
       └─ "Start Game" click → validate → saveToStorage() → window.location = "game.html"

game.html
  └─ gameInit()
       ├─ reads  localStorage["familyFeudSessions"]
       ├─ builds in-memory state object
       ├─ renders board for session[0]
       ├─ document.addEventListener("keydown", handleKey)
       └─ on last session "Next Session" → saveResults() → window.location = "results.html"
            └─ saveResults() writes localStorage["familyFeudResults"] = { team1, team2 }

results.html
  └─ resultsInit()
       ├─ reads  localStorage["familyFeudResults"]
       ├─ validates data; on error → renders error message, returns
       └─ renderResults(data) → displays scores + winner announcement
```

### State Ownership

- **Setup Page**: state is derived from the DOM on every save. No separate in-memory object; the DOM is the source of truth.
- **Game Page**: a single plain-object `gameState` holds all runtime state. The DOM is a pure projection of `gameState`. LocalStorage is read once on load and never written during gameplay (except for the final `saveResults()` call when leaving the last session).
- **Results Page**: stateless — data is read once from `localStorage["familyFeudResults"]` on load and rendered immediately. No in-memory state object is maintained.

### Page Detection and `init()` Dispatch

Each HTML page sets a `data-page` attribute on its `<body>` element:

- `index.html` → `<body data-page="setup">`
- `game.html` → `<body data-page="game">`
- `results.html` → `<body data-page="results">`

`main.js` reads this attribute at the bottom of the file and dispatches accordingly:

```js
(function init() {
  const page = document.body.dataset.page;
  if (page === "setup")   setupInit();
  if (page === "game")    gameInit();
  if (page === "results") resultsInit();
})();
```

---

## Components and Interfaces

### Setup Page (`index.html`)

```
┌─────────────────────────────────────────┐
│  Family Feud — Setup                    │
│  [Add Session]         [Start Game]▼    │
│ ┌──────────────────────────────────┐    │
│ │ Session 1              [Delete]  │    │
│ │ Question: [________________________]  │
│ │  1. [answer input]     [Delete]  │    │
│ │  [Add Answer]                    │    │
│ └──────────────────────────────────┘    │
│ ┌──────────────────────────────────┐    │
│ │ Session 2              [Delete]  │    │
│ │ ...                              │    │
│ └──────────────────────────────────┘    │
│  ⚠ Validation message (if any)         │
│  [Start Game] ← sticky footer button   │
└─────────────────────────────────────────┘
```

**Key functions in `main.js` (Setup scope):**

| Function | Responsibility |
|---|---|
| `setupInit()` | Entry point — reads storage, renders sessions, binds global events |
| `renderSessions(sessions)` | Builds all session panel HTML from data array |
| `createSessionPanel(session, index)` | Creates one session panel DOM node |
| `addSession()` | Appends new empty session, re-renders, saves |
| `deleteSession(index)` | Removes session at index, re-renders, saves |
| `addAnswer(sessionIndex)` | Adds an answer field to a session |
| `deleteAnswer(sessionIndex, answerIndex)` | Removes an answer field, re-sequences labels |
| `collectState()` | Reads DOM → returns sessions array |
| `saveToStorage()` | JSON-stringifies sessions → `localStorage["familyFeudSessions"]` |
| `debouncedSave` | `debounce(saveToStorage, 500)` |
| `validateSessions(sessions)` | Returns array of error strings (empty = valid) |
| `handleStartGame()` | Validates, saves, navigates |

### Game Page (`game.html`)

```
┌─────────────────────────────────────────┐
│  [◀ Prev]  Question text …   [Next ▶]   │
│ ┌──────────┐  ┌──────────┐             │
│ │  1. [  ] │  │  6. [  ] │  ← hidden   │
│ │  2. [  ] │  │  7. [  ] │             │
│ │  3. [  ] │  │  8. [  ] │             │
│ │  4. [  ] │  │  9. [  ] │             │
│ │  5. [  ] │  │ 10. [  ] │             │
│ └──────────┘  └──────────┘             │
│ ┌─────────────────────────────────────┐ │
│ │ TEAM 1: 0  [X][X][X]  00:00  TEAM 2: 0│
│ │ Shortcuts: 1-9/0=Reveal X=Strike …  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key functions in `main.js` (Game scope):**

| Function | Responsibility |
|---|---|
| `gameInit()` | Entry point — loads storage, builds `gameState`, renders, binds keyboard |
| `loadSessions()` | Reads + validates localStorage; returns sessions array or null |
| `buildGameState(sessions)` | Constructs initial `gameState` object |
| `renderBoard(sessionIndex)` | Renders question + answer slots for current session |
| `renderAnswerSlots(session)` | Builds answer slot DOM; determines 1- or 2-column layout |
| `revealSlot(slotNumber)` | Reveals slot, awards point, updates DOM |
| `handleKey(event)` | Master keyboard dispatcher |
| `addStrike()` | Increments strike count (max 3), updates UI |
| `resetStrikes()` | Resets strike count to 0, updates UI |
| `toggleTeam()` | Flips `activeTeam` between 1 and 2, updates UI |
| `startTimer()` | Starts `setInterval` counting upward |
| `pauseTimer()` | Clears interval, retains elapsed time |
| `resetTimer()` | Clears interval, sets elapsed = 0, updates display |
| `formatTime(seconds)` | Returns `"MM:SS"` string from elapsed seconds |
| `navigateSession(direction)` | Moves to next/previous session, resets per-session state; on last session + direction +1, calls `saveResults()` then navigates to `results.html` |
| `updateScoreDisplay()` | Updates score DOM for both teams |
| `updateStrikeDisplay()` | Updates all 3 strike slot states |
| `updateActiveTeamDisplay()` | Adds/removes `active` class on team panels |
| `updateNavButtons()` | Disables Prev/Next at session boundaries |
| `saveResults()` | Writes `{ team1: scores[0], team2: scores[1] }` to `localStorage["familyFeudResults"]`; called just before navigating to `results.html` |

### Results Page (`results.html`)

```
┌─────────────────────────────────────────┐
│                                         │
│     ████  TEAM 1 WINS!  ████            │
│     (winner banner — gold, centered)    │
│                                         │
│  ┌───────────────┐  ┌───────────────┐   │
│  │   TEAM 1      │  │   TEAM 2      │   │
│  │     42        │  │     37        │   │
│  │  (≥48px)      │  │  (≥48px)      │   │
│  └───────────────┘  └───────────────┘   │
│                                         │
│          [  Play Again  ]               │
│                                         │
└─────────────────────────────────────────┘
```

Layout: dark background consistent with the existing palette, two large score panels displayed side by side (Team 1 left, Team 2 right), a winner announcement banner centered above the score panels, and a "Play Again" button below. Score values use `font-size: 3rem` (≥48px). The winner banner uses gold (`#f5c518`) to maintain visual consistency with the active-team highlight colour used on the Game Page.

**Key functions in `main.js` (Results scope):**

| Function | Responsibility |
|---|---|
| `resultsInit()` | Entry point — calls `loadResults()`, renders or shows error |
| `loadResults()` | Reads and validates `localStorage["familyFeudResults"]`; returns `{team1, team2}` or `null` on failure |
| `renderResults(data)` | Populates score panels and winner banner from `data.team1` / `data.team2` |
| `determineWinner(team1, team2)` | Returns `"TEAM 1 WINS!"` if `team1 > team2`, `"TEAM 2 WINS!"` if `team2 > team1`, `"IT'S A TIE!"` if equal |
| `handlePlayAgain()` | Removes `familyFeudResults` from localStorage, preserves `familyFeudSessions`, navigates to `index.html` |

---

## Data Models

### LocalStorage Schema

**Key:** `familyFeudSessions`  
**Type:** JSON string  
**Schema:**

```json
[
  {
    "question": "string (max 200 chars)",
    "answers": [
      "string",
      "string"
    ]
  }
]
```

- The array must contain 1–10 session objects.
- `answers` is an array of 1–10 non-empty strings (empty strings are stripped on save).
- Answer order is the canonical slot order (index 0 = slot 1, index 9 = slot 10).

**Example:**

```json
[
  {
    "question": "Name something you find in a kitchen.",
    "answers": ["Refrigerator", "Stove", "Sink", "Microwave", "Toaster"]
  },
  {
    "question": "Name a sport played with a ball.",
    "answers": ["Football", "Basketball", "Soccer", "Tennis", "Baseball", "Golf"]
  }
]
```

---

**Key:** `familyFeudResults`  
**Type:** JSON string  
**Schema:**

```json
{ "team1": number, "team2": number }
```

Written by `game.html` (via `saveResults()`) immediately before navigating to `results.html` when the host advances past the final session. Read by `results.html` on load inside `loadResults()`. Both fields are required non-negative integers. If either field is absent or non-numeric, `results.html` treats the data as invalid and displays an error.

**Example:**

```json
{ "team1": 7, "team2": 4 }
```

### In-Memory Game State Object

```js
const gameState = {
  sessions: [],          // Array of session objects from localStorage (read-only after init)
  currentSession: 0,     // Index into sessions[]
  revealedSlots: [],     // boolean[] — one entry per answer in current session
  scores: [0, 0],        // [team1Score, team2Score]
  activeTeam: 0,         // 0 = Team 1, 1 = Team 2
  strikes: 0,            // 0–3
  timer: {
    elapsed: 0,          // Seconds elapsed
    running: false,      // true while setInterval is active
    intervalId: null     // Handle from setInterval, or null
  },
  navigating: false      // true during session transition (blocks duplicate nav)
};
```

### Setup Page DOM ↔ Data Mapping

The Setup Page reads its state directly from the DOM at save time via `collectState()`. Each session panel has a `data-session-index` attribute; each answer input has a `data-answer-index` attribute. This avoids keeping a separate in-memory copy of setup data.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Session Creation Invariant

*For any* existing number of sessions n (where 1 ≤ n < 10), after the host clicks "Add Session", the Setup Page shall contain exactly n+1 session panels, and the newly created session panel shall contain exactly one empty answer input box with label "1".

**Validates: Requirements 2.2, 2.5**

---

### Property 2: Answer Label Re-sequencing

*For any* session containing n answer input boxes (2 ≤ n ≤ 10), after deleting the answer at any position i (1 ≤ i ≤ n), the remaining n-1 answer boxes shall be labelled sequentially from 1 to n-1 with no gaps.

**Validates: Requirements 2.11, 2.14**

---

### Property 3: LocalStorage Round-Trip

*For any* valid session configuration (1–10 sessions, each with a question and 1–10 answers), saving to localStorage and then reloading the Setup Page shall restore the exact session configuration — preserving question texts, answer texts, answer count per session, and session order.

**Validates: Requirements 3.1, 3.2**

---

### Property 4: Malformed Data Resilience

*For any* string stored under `familyFeudSessions` in localStorage that is not valid JSON or does not conform to the expected session array schema, both the Setup Page and Game Page shall discard that value, display an error/warning message to the host, and initialize to a known-good default state — never rendering a partial or broken game board.

**Validates: Requirements 3.6, 5.3**

---

### Property 5: Start Game Validation

*For any* session configuration that includes at least one invalid session (empty question field, or all answer inputs empty), clicking "Start Game" shall display a validation error message and shall NOT navigate to `game.html`.

**Validates: Requirements 4.3**

---

### Property 6: Answer Slot Count and Layout

*For any* session with n non-empty answers (1 ≤ n ≤ 10), the Game Page shall render exactly n answer slots. If n > 5, slots 1–5 appear in the left column and slots 6–n appear in the right column. If n ≤ 5, all slots appear in the left column only. This layout shall not change when slots are revealed or hidden.

**Validates: Requirements 5.4, 5.5, 5.6, 5.7**

---

### Property 7: Answer Slot Initial Hidden State

*For any* session displayed on the Game Page (whether on first load or after session navigation), all n answer slots shall be hidden — displaying only their slot number and no answer text.

**Validates: Requirements 5.8**

---

### Property 8: Reveal Key Shows Correct Answer Text

*For any* session with n answers and any key press corresponding to slot k (where 1 ≤ k ≤ n and slot k is currently hidden), after the key press, slot k shall transition to the revealed state, displaying exactly the answer text defined for that slot.

**Validates: Requirements 6.1, 6.4**

---

### Property 9: Reveal Awards Exactly One Point to Active Team

*For any* active team (Team 1 or Team 2) and any hidden answer slot, revealing that slot shall increase the active team's score by exactly 1 and leave the other team's score unchanged.

**Validates: Requirements 6.5, 8.4**

---

### Property 10: Reveal Idempotence

*For any* answer slot that is already in the revealed state, pressing its corresponding key again shall produce no change — the score shall not increase, the slot shall remain revealed, and no visual toggle shall occur.

**Validates: Requirements 6.6**

---

### Property 11: Strike Increment and Boundary

*For any* current strike count c (0 ≤ c ≤ 2), pressing the "X" key shall increase the strike count to c+1. When the strike count is already 3, pressing "X" shall leave the count at 3 (no overflow).

**Validates: Requirements 7.1, 7.3**

---

### Property 12: Strike Reset

*For any* current strike count c (0 ≤ c ≤ 3), pressing the "/" key shall reset the strike count to 0 and update all three strike indicator slots to their inactive state.

**Validates: Requirements 7.4**

---

### Property 13: Active Team Toggle and Mutual Exclusion

*For any* active team state, pressing the "\" key shall toggle the active team to the other team. After the toggle, exactly one team panel shall have the `active` CSS class and the previously active team's panel shall not. Pressing "\" twice in succession shall restore the original active team.

**Validates: Requirements 9.2, 9.3**

---

### Property 14: Score Preservation Across Session Navigation

*For any* score state (team 1 score s1, team 2 score s2) accumulated over any number of revealed answers, navigating to a different session and then back shall preserve s1 and s2 exactly — scores shall not reset on session change.

**Validates: Requirements 8.6**

---

### Property 15: Timer Format

*For any* elapsed time in seconds t (0 ≤ t ≤ 5999), `formatTime(t)` shall return a string matching the pattern `MM:SS` where MM = Math.floor(t / 60) zero-padded to 2 digits and SS = (t % 60) zero-padded to 2 digits.

**Validates: Requirements 10.5**

---

### Property 16: Timer Toggle

*For any* timer state (running or paused), pressing "T" shall toggle to the opposite state — a running timer is paused and a paused timer starts running. The elapsed value shall be preserved across the toggle.

**Validates: Requirements 10.2, 10.3**

---

### Property 17: Timer Reset

*For any* timer state (running or paused, at any elapsed value), pressing "R" shall stop the timer, set elapsed to 0, and display "00:00".

**Validates: Requirements 10.4**

---

### Property 18: Session Navigation Resets Per-Session State

*For any* session transition (next or previous), the target session shall display its question text, all of its answer slots shall be in the hidden state, and the strike count shall be reset to 0.

**Validates: Requirements 11.3, 11.4, 11.8**

---

### Property 19: Results Page Score Display and Winner Announcement

*For any* valid `familyFeudResults` object `{ team1: s1, team2: s2 }` (where `s1` and `s2` are non-negative integers) stored in `localStorage`, when `results.html` loads, it shall display `s1` as Team 1's score, `s2` as Team 2's score, and the winner announcement shall satisfy exactly: `"TEAM 1 WINS!"` if `s1 > s2`, `"TEAM 2 WINS!"` if `s2 > s1`, and `"IT'S A TIE!"` if `s1 === s2`.

**Validates: Requirements 13.3, 13.4, 13.5, 13.6**

---

### Property 20: Results Page Error Handling for Invalid Data

*For any* value stored under `familyFeudResults` that is absent (key not present), not parseable as valid JSON, or a parsed object that is missing a numeric `team1` or `team2` field, `results.html` shall display an error message, shall NOT render any score values, and shall NOT render any winner announcement.

**Validates: Requirement 13.2**

---

## Error Handling

### LocalStorage Unavailable

`localStorage` access is wrapped in a try/catch. If it throws (e.g., private browsing with storage blocked, or storage quota exceeded):

- **Setup Page**: renders a persistent banner — "⚠ Storage unavailable. Your setup will not be saved." — and continues to operate in-memory for the current session.
- **Game Page**: attempts to read `localStorage` once; if it fails, falls back to an empty sessions array and shows the "no session data" prompt.

### Malformed Data on Load

Both pages wrap `JSON.parse(localStorage.getItem("familyFeudSessions"))` in try/catch and additionally validate the parsed structure:

```js
function isValidSessions(data) {
  return Array.isArray(data)
    && data.length >= 1
    && data.every(s =>
        typeof s.question === "string"
        && Array.isArray(s.answers)
        && s.answers.length >= 1
        && s.answers.every(a => typeof a === "string")
    );
}
```

If validation fails, `localStorage` is cleared for that key and the page initialises to its default state with an error banner shown to the host.

### Navigation Without Data

If `game.html` is opened directly with no `familyFeudSessions` data, a centered message is shown:

> "No game data found. Please return to the [Setup Page](index.html) to configure your sessions."

No game board is rendered, and keyboard listeners are not attached.

### Session Navigation Boundary Guards

`navigateSession(direction)` checks:
- `gameState.navigating === true` → returns immediately (prevents double-click race).
- Attempting to go below index 0 → returns immediately (previous session boundary).
- Attempting to go above `sessions.length - 1` with direction `-1` → returns immediately.
- Attempting to go above `sessions.length - 1` with direction `+1` (i.e., on the last session pressing Next) → calls `saveResults()` to persist scores, then navigates to `results.html` instead of returning immediately.

The `navigating` flag is set to `true` on entry and cleared after the DOM render is complete (or, for the results navigation, it is set and never cleared since a page navigation follows).

### Results Page Data Errors

`loadResults()` on `results.html` wraps `localStorage.getItem("familyFeudResults")` and `JSON.parse` in a try/catch and additionally validates the parsed value:

```js
function loadResults() {
  try {
    const raw = localStorage.getItem("familyFeudResults");
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (typeof data.team1 !== "number" || typeof data.team2 !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
```

If `loadResults()` returns `null`, `resultsInit()` hides the score/winner elements and displays:

> "Scores could not be retrieved. [Return to Setup Page](index.html)"

No score values or winner announcement are rendered in this error state.

---

## Layout and Visual Design

### Color Palette (Dark Theme)

| Role | Value | Notes |
|---|---|---|
| Page background | `#0d0d0d` | ~5% luminance — all three pages |
| Panel background | `#1a1a2e` | Session panels, game board, score panels |
| Hidden slot fill | `#16213e` | Dark navy |
| Revealed slot fill | `#e94560` | Bright red-pink |
| Text (primary) | `#f5f5f5` | Passes 4.5:1 on `#0d0d0d` |
| Text (secondary) | `#cccccc` | Labels, subtitles |
| Active team border | `#f5c518` | Gold highlight — also used for Results winner banner |
| Strike active | `#e94560` | Red X |
| Strike inactive | `#444` | Grey outline |

All foreground/background pairs achieve a minimum **4.5:1 contrast ratio** for text < 24px and **3:1** for text ≥ 24px (WCAG AA).

### Game Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [◀ Prev Session]    QUESTION TEXT (≥24px)    [Next Session ▶]  │
│                                                                │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  1              │    │  6              │  ← 2-col if >5  │
│  │  2              │    │  7              │                   │
│  │  3              │    │  8              │                   │
│  │  4              │    │  9              │                   │
│  │  5              │    │  10             │                   │
│  └──────────────────┘    └──────────────────┘                 │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ TEAM 1: 42    ✗ ✗ ○    00:47    TEAM 2: 37              │   │
│ │ Shortcuts: 1-9/0=Reveal  X=Strike  /=Reset  \=Team      │   │
│ │            T=Timer  R=Reset Timer  ◀▶=Session            │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Results Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│              ██  TEAM 1 WINS!  ██   ← gold #f5c518, centered  │
│                                                                │
│   ┌────────────────────────┐   ┌────────────────────────┐     │
│   │       TEAM 1           │   │       TEAM 2           │     │
│   │         42             │   │         37             │     │
│   │    (font-size: 3rem)   │   │    (font-size: 3rem)   │     │
│   └────────────────────────┘   └────────────────────────┘     │
│                                                                │
│                  [  Play Again  ]                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Score panels use `font-size: 3rem` (≥48px per Requirement 13.3). The winner banner uses `color: #f5c518` (gold) on the dark background, consistent with the active-team highlight already defined in the palette. Both score panels sit side by side using CSS Flexbox or Grid (`display: flex; justify-content: center; gap: 2rem`). The "Play Again" button sits below the panels, centred. Slots are `min-height: 60px` with answer text at `font-size: 1.25rem` (≥20px).

The bottom bar is `position: sticky; bottom: 0` so it remains visible without scrolling. The "Start Game" button on the Setup Page is likewise `position: sticky; bottom: 1rem`.

### Keyboard Event Architecture

All keyboard handling on the Game Page uses a single `document.addEventListener("keydown", handleKey)`. The dispatcher uses a `switch` on `event.key`:

```js
function handleKey(event) {
  if (event.repeat) return;           // ignore key-hold repeats
  if (event.ctrlKey || event.metaKey) return;  // don't hijack browser shortcuts

  switch (event.key) {
    case "1": case "2": case "3": case "4": case "5":
    case "6": case "7": case "8": case "9":
      revealSlot(parseInt(event.key)); break;
    case "0": revealSlot(10); break;
    case "X": case "x": addStrike(); break;
    case "/": resetStrikes(); break;
    case "\\": toggleTeam(); break;
    case "T": case "t": toggleTimer(); break;
    case "R": case "r": resetTimer(); break;
    case "ArrowRight": navigateSession(+1); break;
    case "ArrowLeft":  navigateSession(-1); break;
  }
}
```

Using `event.key` (not `event.keyCode`) for forward compatibility. The `event.repeat` guard prevents strike-spamming from a held key.

`navigateSession(+1)` has special behaviour on the last session: instead of advancing to a non-existent session, it calls `saveResults()` — which writes `{ team1: gameState.scores[0], team2: gameState.scores[1] }` to `localStorage["familyFeudResults"]` — and then sets `window.location = "results.html"`. The `navigating` flag is set before this call to prevent a double-trigger race.

### Timer Implementation

```js
function startTimer() {
  if (gameState.timer.running) return;
  gameState.timer.running = true;
  gameState.timer.intervalId = setInterval(() => {
    gameState.timer.elapsed++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  clearInterval(gameState.timer.intervalId);
  gameState.timer.intervalId = null;
  gameState.timer.running = false;
}

function resetTimer() {
  pauseTimer();
  gameState.timer.elapsed = 0;
  updateTimerDisplay();
}

function toggleTimer() {
  gameState.timer.running ? pauseTimer() : startTimer();
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
```

`setInterval` with a 1-second interval is accurate enough for a game-show timer. Drift over a typical 2-minute round is negligible (< 1 second). The timer is deliberately not persisted to `localStorage` — it resets with the page.

---

## Testing Strategy

This application is vanilla JavaScript with no build pipeline. Testing uses **[QUnit](https://qunitjs.com/)** loaded from a local CDN-free copy (a single `qunit.js` + `qunit.css` dropped into a `test/` folder) so it works under `file://`. Property-based tests use **[fast-check](https://fast-check.io/)** loaded the same way.

### Unit Tests (Example-Based)

Focus: specific behaviors, edge cases, UI state checks.

- `formatTime(0)` → `"00:00"`, `formatTime(65)` → `"01:05"`, `formatTime(3599)` → `"59:59"`
- `isValidSessions([])` → `false`; `isValidSessions([{question:"Q", answers:["A"]}])` → `true`
- Initial game state has `activeTeam = 0`, `scores = [0, 0]`, `strikes = 0`
- `collectState()` reads DOM correctly for 1 and 10 sessions
- Setup validation: empty question → error; all-blank answers → error; valid session → no error
- LocalStorage key is exactly `familyFeudSessions`
- Strike indicator DOM: always 3 slots present; 0 active at start

### Property-Based Tests (fast-check)

Each property runs a minimum of **100 iterations**. Each test is tagged with the design property it validates.

```
Feature: family-feud-game, Property N: <property text>
```

**Property 2 — Answer Label Re-sequencing**
```js
// Feature: family-feud-game, Property 2: Answer label re-sequencing
fc.assert(fc.property(
  fc.integer({ min: 2, max: 10 }),  // n answers
  fc.integer({ min: 0, max: 9 }),   // delete index (bounded in test)
  (n, rawIdx) => {
    const deleteIdx = rawIdx % n;
    const labels = buildLabels(n); // [1..n]
    labels.splice(deleteIdx, 1);
    const resequenced = resequenceLabels(labels);
    return resequenced.every((l, i) => l === i + 1)
      && resequenced.length === n - 1;
  }
), { numRuns: 100 });
```

**Property 3 — LocalStorage Round-Trip**
```js
// Feature: family-feud-game, Property 3: LocalStorage round-trip
fc.assert(fc.property(
  fc.array(fc.record({
    question: fc.string({ minLength: 1, maxLength: 200 }),
    answers: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 })
  }), { minLength: 1, maxLength: 10 }),
  (sessions) => {
    localStorage.setItem("familyFeudSessions", JSON.stringify(sessions));
    const restored = JSON.parse(localStorage.getItem("familyFeudSessions"));
    return JSON.stringify(restored) === JSON.stringify(sessions);
  }
), { numRuns: 100 });
```

**Property 6 — Answer Slot Count and Layout**
```js
// Feature: family-feud-game, Property 6: Answer slot count and layout
fc.assert(fc.property(
  fc.integer({ min: 1, max: 10 }),
  (n) => {
    const session = makeSession(n);
    renderBoard(session);
    const slots = document.querySelectorAll(".answer-slot");
    const leftCol = document.querySelectorAll(".col-left .answer-slot");
    const rightCol = document.querySelectorAll(".col-right .answer-slot");
    if (slots.length !== n) return false;
    if (n <= 5) return rightCol.length === 0 && leftCol.length === n;
    return leftCol.length === 5 && rightCol.length === n - 5;
  }
), { numRuns: 100 });
```

**Property 9 — Reveal Awards Exactly One Point**
```js
// Feature: family-feud-game, Property 9: Reveal awards exactly one point to active team
fc.assert(fc.property(
  fc.integer({ min: 0, max: 1 }),   // activeTeam
  fc.integer({ min: 1, max: 10 }),  // slotNumber
  (team, slot) => {
    const state = freshGameState(10);
    state.activeTeam = team;
    const before = [...state.scores];
    revealSlot(slot, state);
    return state.scores[team] === before[team] + 1
      && state.scores[1 - team] === before[1 - team];
  }
), { numRuns: 200 });
```

**Property 15 — Timer Format**
```js
// Feature: family-feud-game, Property 15: Timer format
fc.assert(fc.property(
  fc.integer({ min: 0, max: 5999 }),
  (t) => {
    const result = formatTime(t);
    const parts = result.split(":");
    if (parts.length !== 2) return false;
    const mm = parseInt(parts[0], 10);
    const ss = parseInt(parts[1], 10);
    return result.length === 5
      && mm === Math.floor(t / 60)
      && ss === t % 60
      && parts[0].length === 2
      && parts[1].length === 2;
  }
), { numRuns: 500 });
```

**Property 13 — Active Team Toggle and Mutual Exclusion**
```js
// Feature: family-feud-game, Property 13: Active team toggle and mutual exclusion
fc.assert(fc.property(
  fc.integer({ min: 0, max: 1 }),
  (initialTeam) => {
    const state = { activeTeam: initialTeam };
    const before = state.activeTeam;
    toggleTeam(state);
    const mid = state.activeTeam;
    toggleTeam(state);
    const after = state.activeTeam;
    return mid !== before && after === before;
  }
), { numRuns: 100 });
```

**Property 19 — Results Page Score Display and Winner Announcement**
```js
// Feature: family-feud-game, Property 19: Results page score display and winner announcement
fc.assert(fc.property(
  fc.integer({ min: 0, max: 999 }),  // s1: Team 1 score
  fc.integer({ min: 0, max: 999 }),  // s2: Team 2 score
  (s1, s2) => {
    const winner = determineWinner(s1, s2);
    if (s1 > s2) return winner === "TEAM 1 WINS!";
    if (s2 > s1) return winner === "TEAM 2 WINS!";
    return winner === "IT'S A TIE!";
  }
), { numRuns: 200 });
```

Additional property tests cover Properties 4, 5, 7, 8, 10, 11, 12, 14, 16, 17, and 18 following the same pattern. Each test file is `test/test-setup.html` and `test/test-game.html`, opening in the browser directly via `file://`.

### Accessibility

Manual checks required (automated testing cannot replace assistive technology verification):
- Screen reader traversal of Setup Page form fields
- Keyboard-only navigation of Setup Page (Tab order, form submission)
- High-contrast mode compatibility of color tokens
- Color is not the sole conveyor of information (strike slots show both color and "X" glyph)
