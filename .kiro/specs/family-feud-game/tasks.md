# Implementation Plan: Family Feud Game

## Overview

Implement a two-page offline Family Feud game using pure HTML, CSS, and Vanilla JavaScript. All logic lives in `js/main.js`, all styles in `css/style.css`, and data persists via `localStorage`. The implementation proceeds from scaffolding → shared utilities → Setup Page → Game Page → testing → polish.

---

## Tasks

- [x] 1. Scaffold project file and folder structure
  - Create `css/style.css` (empty shell with comment sections)
  - Create `js/main.js` (empty shell with `init()` page-dispatch at bottom)
  - Update `index.html`: add `<link>` to `css/style.css`, `<script>` to `js/main.js`, and semantic placeholder sections
  - Update `game.html`: add `<link>` to `css/style.css`, `<script>` to `js/main.js`, add `<title>Family Feud — Game</title>`
  - Create `results.html`: add `<link>` to `css/style.css`, `<script>` to `js/main.js`, add `<title>Family Feud — Results</title>`, and `data-page="results"` on `<body>`
  - Create `test/` folder with empty `test-setup.html` and `test-game.html` shells (QUnit + fast-check script tags, no logic yet)
  - _Requirements: 1.1_

- [ ] 2. Implement shared CSS (dark theme, layout primitives)
  - [x] 2.1 Define CSS custom properties and reset
    - Add CSS variables for the full color palette: `--bg`, `--panel-bg`, `--slot-hidden`, `--slot-revealed`, `--text-primary`, `--text-secondary`, `--active-border`, `--strike-active`, `--strike-inactive`
    - Add box-sizing reset and base `body` styles (`background: var(--bg)`, `color: var(--text-primary)`, `font-family`)
    - _Requirements: 12.1_

  - [x] 2.2 Add layout primitives and session panel styles
    - Style `.session-panel` with visible border/distinct background, padding, margin
    - Style `.sticky-footer` / sticky Start Game button area (`position: sticky; bottom: 1rem`)
    - Add `.validation-message` error text styles
    - _Requirements: 12.2, 4.1_

  - [x] 2.3 Add answer slot styles (hidden and revealed states)
    - Style `.answer-slot` with `min-height: 60px`, `font-size: 1.25rem` (≥20px), hidden fill color
    - Style `.answer-slot.revealed` with revealed fill color and visible answer text
    - Style `.col-left` and `.col-right` grid containers (`display: grid`, `auto-fill`, `minmax(180px, 1fr)`)
    - _Requirements: 5.5, 5.9, 12.4, 12.5_

  - [x] 2.4 Add bottom bar, team panel, strike indicator, and shortcut reference styles
    - Style `#bottom-bar` as `position: sticky; bottom: 0`, flex row
    - Style `.team-panel` with default border and `.team-panel.active` with `--active-border` gold highlight
    - Style `.strike-slot` (inactive) and `.strike-slot.active` (red X)
    - Style `#shortcut-ref` text area inside bottom bar
    - Style `#timer-display` centered in bottom bar
    - _Requirements: 8.1, 8.2, 7.2, 7.5, 9.3, 10.1, 12.6_

  - [x] 2.5 Add question heading and nav button styles
    - Style `#question-text` with `font-size: 1.5rem` (≥24px)
    - Style `#nav-prev` and `#nav-next` buttons; add `:disabled` dimmed state
    - _Requirements: 12.3, 11.6, 11.7_

- [x] 3. Implement LocalStorage utilities in `js/main.js`
  - [x] 3.1 Write `isValidSessions(data)` validation function
    - Return `false` for non-array, empty array, or sessions missing `question`/`answers` fields
    - Return `false` if any answer is not a string or answers array is empty
    - Return `true` only for a conforming array of 1–10 sessions
    - _Requirements: 3.6, 5.3_


  - [x] 3.3 Write `saveToStorage(sessions)` and `loadFromStorage()` functions
    - `saveToStorage`: wraps `localStorage.setItem("familyFeudSessions", JSON.stringify(sessions))` in try/catch; returns `{ok: true}` or `{ok: false, error}`
    - `loadFromStorage`: wraps `JSON.parse(localStorage.getItem(...))` in try/catch; calls `isValidSessions`; returns parsed data or `null`
    - _Requirements: 3.1, 3.3, 3.5, 3.6_


- [ ] 4. Implement Setup Page logic (`setupInit`) in `js/main.js`
  - [x] 4.1 Implement `collectState()`, `renderSessions()`, and `createSessionPanel()`
    - `collectState()`: queries all `[data-session-index]` panels, reads question input and `[data-answer-index]` inputs, returns sessions array
    - `createSessionPanel(session, index)`: returns a DOM node for one session panel with question input, answer list, Add Answer button, Delete Session button
    - `renderSessions(sessions)`: clears container, calls `createSessionPanel` for each, enforces Add Session button disabled state at 10 sessions
    - _Requirements: 2.1, 2.3, 2.5, 2.8, 2.9_

  - [x] 4.2 Implement `addSession()`, `deleteSession(index)`, boundary guards
    - `addSession()`: appends new `{question:"", answers:[""]}`, calls `renderSessions`, calls `saveToStorage`; no-op if sessions.length === 10
    - `deleteSession(index)`: removes session at index; no-op (and keeps button disabled) if only 1 session remains; re-renders and saves
    - _Requirements: 2.2, 2.3, 2.4, 2.9, 2.10_

  - [x] 4.3 Implement `addAnswer(sessionIndex)`, `deleteAnswer(sessionIndex, answerIndex)`, label re-sequencing
    - `addAnswer`: appends empty answer to session; no-op if 10 answers already exist; re-renders and saves
    - `deleteAnswer`: removes answer at index; no-op if only 1 answer remains; re-sequences labels so they are sequential 1-based; re-renders and saves
    - _Requirements: 2.6, 2.7, 2.11, 2.12, 2.13, 2.14_


  - [x] 4.5 Implement `validateSessions(sessions)` and debounced auto-save
    - `validateSessions`: returns array of error strings; empty question → error; all answers empty → error; empty array = valid
    - Create `debounce(fn, delay)` utility; assign `debouncedSave = debounce(saveToStorage, 500)`
    - Bind `input` event on session container to call `debouncedSave` with `collectState()`
    - _Requirements: 3.1, 4.3, 4.4_



  - [x] 4.7 Implement `handleStartGame()` and `setupInit()` entry point
    - `handleStartGame()`: calls `collectState()`, `validateSessions()`, shows errors if any; on valid, calls `saveToStorage()` then `window.location = "game.html"`
    - `setupInit()`: calls `loadFromStorage()`, shows storage-unavailable banner if load fails, calls `renderSessions()`, binds "Add Session" click, "Start Game" click, and `input` delegation
    - _Requirements: 3.2, 3.4, 3.5, 4.1, 4.2, 4.3_



- [ ] 6. Implement Game Page data loading and state in `js/main.js`
  - [x] 6.1 Implement `loadSessions()` and `buildGameState(sessions)`
    - `loadSessions()`: calls `loadFromStorage()`; returns sessions array or `null` on failure
    - `buildGameState(sessions)`: returns initial `gameState` object — `sessions`, `currentSession: 0`, `revealedSlots: []`, `scores: [0, 0]`, `activeTeam: 0`, `strikes: 0`, `timer: {elapsed:0, running:false, intervalId:null}`, `navigating: false`
    - _Requirements: 5.1, 5.2, 5.3, 8.3, 9.1_

  - [x] 6.2 Write `game.html` structure
    - Add `<header>` with `#nav-prev`, `#question-text`, `#nav-next`
    - Add `#board` container (to hold answer slot columns)
    - Add `#bottom-bar` with `#team1-panel`, `#strike-display` (3 `.strike-slot` divs), `#timer-display`, `#team2-panel`, `#shortcut-ref`
    - Add `#no-data-msg` hidden element for the "no data" error state
    - _Requirements: 5.2, 5.3, 7.2, 8.1, 8.2, 10.1, 11.1, 11.2, 12.6_

- [ ] 7. Implement Game Page rendering functions
  - [x] 7.1 Implement `renderAnswerSlots(session)` and `renderBoard(sessionIndex)`
    - `renderAnswerSlots`: creates `.answer-slot` elements (hidden state); if answers > 5, split into `.col-left` (1–5) and `.col-right` (6–n); always 1-column if ≤5 answers
    - `renderBoard(sessionIndex)`: sets `#question-text`, clears `#board`, resets `revealedSlots` array to all `false`, calls `renderAnswerSlots`, calls `updateNavButtons`
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_


- [ ] 8. Implement answer reveal, scoring, and strike system
  - [x] 8.1 Implement `revealSlot(slotNumber)` and `updateScoreDisplay()`
    - `revealSlot(n)`: bounds-check (slot must exist and be hidden); sets `revealedSlots[n-1] = true`; updates slot DOM to revealed state with answer text; increments `scores[activeTeam]`; calls `updateScoreDisplay()`
    - `updateScoreDisplay()`: writes score values to `#team1-score` and `#team2-score` within 100ms
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.4, 8.5_

  -

  - [x] 8.5 Implement `addStrike()`, `resetStrikes()`, `updateStrikeDisplay()`
    - `addStrike()`: increments `gameState.strikes` up to max 3; calls `updateStrikeDisplay()`
    - `resetStrikes()`: sets `gameState.strikes = 0`; calls `updateStrikeDisplay()`
    - `updateStrikeDisplay()`: sets `.active` class on the first `strikes` slots, removes it from the rest
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  -

- [ ] 9. Implement active team toggle and score preservation
  - [x] 9.1 Implement `toggleTeam()` and `updateActiveTeamDisplay()`
    - `toggleTeam()`: flips `gameState.activeTeam` between 0 and 1; calls `updateActiveTeamDisplay()`
    - `updateActiveTeamDisplay()`: adds `.active` to the active team panel, removes it from the other; completes within 200ms
    - _Requirements: 9.2, 9.3, 9.4, 9.5_



- [ ] 10. Implement timer
  - [x] 10.1 Implement `startTimer()`, `pauseTimer()`, `resetTimer()`, `toggleTimer()`, `formatTime()`, `updateTimerDisplay()`
    - Implement all five timer functions exactly as specified in the design
    - `formatTime(seconds)`: returns `MM:SS` string with zero-padding for both parts
    - `updateTimerDisplay()`: writes `formatTime(elapsed)` to `#timer-display`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

 

- [ ] 11. Implement session navigation
  - [x] 11.1 Implement `navigateSession(direction)`, `updateNavButtons()`
    - `navigateSession(+1/-1)`: guard `navigating` flag; guard boundary (0 to sessions.length-1); set `navigating = true`; update `currentSession`; call `renderBoard`; reset strikes; set `navigating = false`
    - When navigating forward from the last session: call `saveResults()` (writes `{team1: scores[0], team2: scores[1]}` as JSON to `localStorage["familyFeudResults"]`), then `window.location = "results.html"` instead of blocking navigation
    - `updateNavButtons()`: disables `#nav-prev` at index 0; disables `#nav-next` at last index
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 12. Implement keyboard handler
  - [x] 12.1 Implement `handleKey(event)` dispatcher and bind it in `gameInit()`
    - Implement the `switch(event.key)` dispatcher as specified in the design, with `event.repeat` guard and ctrl/meta guard
    - Map keys: 1–9 → `revealSlot`, 0 → `revealSlot(10)`, X/x → `addStrike`, / → `resetStrikes`, \\ → `toggleTeam`, T/t → `toggleTimer`, R/r → `resetTimer`, ArrowRight → `navigateSession(+1)`, ArrowLeft → `navigateSession(-1)`
    - Bind via `document.addEventListener("keydown", handleKey)` inside `gameInit()`
    - _Requirements: 6.1, 6.2, 7.1, 7.4, 9.2, 10.2, 10.3, 10.4, 11.1, 11.2_

- [ ] 13. Implement `gameInit()` entry point and `init()` dispatcher
  - [x] 13.1 Implement `gameInit()` — no-data and error states
    - Call `loadSessions()`; if null, show `#no-data-msg` and return without binding keyboard or rendering board
    - On valid data: call `buildGameState(sessions)`, call `renderBoard(0)`, call `updateActiveTeamDisplay()`, call `updateStrikeDisplay()`, call `updateTimerDisplay()`, bind keyboard handler
    - _Requirements: 5.2, 5.3, 8.3, 9.1_

  - [x] 13.2 Implement `init()` page dispatcher at bottom of `js/main.js`
    - Check `document.body.dataset.page` (or `window.location.pathname`) to detect which page is loaded
    - Call `setupInit()` if on `index.html`; call `gameInit()` if on `game.html`
    - Add `data-page="setup"` to `index.html` `<body>` and `data-page="game"` to `game.html` `<body>`
    - _Requirements: 1.1, 1.2_

- [ ] 14. Implement Results Page
  - [x] 14.1 Write `results.html` structure
    - Add `#scores-container` with two `.score-panel` divs (one for Team 1, one for Team 2), each labelled with its team name
    - Add `#winner-banner` for the winner/tie announcement
    - Add `#error-msg` (hidden by default) for the error state when scores cannot be loaded
    - Add `#play-again-btn` button
    - _Requirements: 13.1, 13.3_

  - [ ] 14.2 Add Results Page CSS
    - Style `.score-panel` with `font-size: 3rem` (≥48px) to satisfy minimum size requirement
    - Style `.winner-banner` with gold color `#f5c518` and large font for the winner announcement
    - Style `#error-msg` as `display: none` by default
    - Apply consistent dark theme (dark background, WCAG-compliant contrast ratios) matching the Game Page palette
    - _Requirements: 13.3, 13.8_

  - [x] 14.3 Implement `saveResults()` in `js/main.js`
    - Write `JSON.stringify({team1: gameState.scores[0], team2: gameState.scores[1]})` to `localStorage["familyFeudResults"]`
    - Called by `navigateSession` when the host moves past the last session
    - _Requirements: 11.6_

  - [ ] 14.4 Implement `loadResults()` in `js/main.js`
    - Read `localStorage["familyFeudResults"]` and parse as JSON in a try/catch
    - Validate that the parsed object has numeric `team1` and `team2` fields
    - Return the data object on success, or `null` on any failure (missing key, parse error, missing/non-numeric fields)
    - _Requirements: 13.1, 13.2_

  - [ ] 14.5 Implement `determineWinner(team1, team2)` and `renderResults(data)`
    - `determineWinner(team1, team2)`: returns `"TEAM 1 WINS!"` when `team1 > team2`, `"TEAM 2 WINS!"` when `team2 > team1`, or `"IT'S A TIE!"` when equal
    - `renderResults(data)`: populates the two `.score-panel` elements with final scores and sets `#winner-banner` text using `determineWinner`
    - _Requirements: 13.3, 13.4, 13.5, 13.6_

  - [x] 14.6.pbt Write property test for `determineWinner` (Property 19)
    - **Property 19: determineWinner correctness**
    - For all integer pairs `(s1, s2)`: `s1 > s2` → returns `"TEAM 1 WINS!"`; `s2 > s1` → returns `"TEAM 2 WINS!"`; `s1 === s2` → returns `"IT'S A TIE!"`
    - **Validates: Requirements 13.4, 13.5, 13.6**

  - [ ] 14.7 Implement `handlePlayAgain()` and `resultsInit()`
    - `handlePlayAgain()`: removes `familyFeudResults` from localStorage (preserves `familyFeudSessions`); navigates to `index.html`
    - `resultsInit()`: calls `loadResults()`; if `null`, shows `#error-msg` and does NOT display scores or winner; if valid, calls `renderResults(data)` and binds the play-again button click to `handlePlayAgain()`
    - _Requirements: 13.1, 13.2, 13.7_

  - [ ] 14.8 Update `init()` dispatcher to call `resultsInit()` when `document.body.dataset.page === "results"`
    - _Requirements: 1.1_

- [ ] 15. Checkpoint — Game Page complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Set up QUnit + fast-check test harnesses
  - [x] 16.1 Download `qunit.js` and `qunit.css` into the `test/` folder
    - Copy QUnit 2.x standalone files (no CDN) into `test/qunit.js` and `test/qunit.css`
    - Copy fast-check standalone `fast-check.min.js` into `test/`
    - _Requirements: 1.2_

  - [x] 16.2 Wire up `test/test-setup.html` with QUnit + fast-check
    - Add `<link>` to `test/qunit.css`, `<script>` for `test/qunit.js` and `test/fast-check.min.js`
    - Add `<script src="../js/main.js">` so utility functions are accessible
    - Add `<div id="qunit">` and `<div id="qunit-fixture">` in body
    - _Requirements: 1.2_

  - [x] 16.3 Wire up `test/test-game.html` with QUnit + fast-check
    - Same structure as `test-setup.html` but include a minimal game board DOM fixture matching what `gameInit()` expects
    - _Requirements: 1.2_

- [ ] 17. Accessibility and visual polish
  - [ ] 17.1 Add ARIA attributes and semantic markup to `index.html` and `game.html`
    - Add `role="form"` / `aria-label` to session panels on setup
    - Add `aria-label` to nav buttons, strike slots, score panels, and timer display
    - Add `aria-live="polite"` to score displays and timer so screen readers announce updates
    - Ensure all interactive elements are reachable via Tab key with visible focus styles
    - _Requirements: 12.1_

  - [ ] 17.2 Apply final visual polish to `css/style.css`
    - Add `:focus-visible` ring for keyboard navigation
    - Add CSS transitions for answer slot reveal (background color transition ~300ms)
    - Verify all contrast pairs meet WCAG AA ratios as defined in the design color table
    - Add responsive `@media` query to shrink font sizes slightly on viewports < 768px
    - _Requirements: 12.1, 12.3, 12.4, 6.7_

- [ ] 18. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests are placed close to the implementation tasks they verify so bugs are caught early
- The design document's Correctness Properties section (Properties 1–18) maps 1-to-1 with `*`-marked test sub-tasks; Property 19 covers `determineWinner` on the Results Page
- `js/main.js` is the single shared module for all pages; the `init()` dispatcher at the bottom determines which page context is active
- QUnit and fast-check must be local files in `test/` so the app works under `file://` with no network requests
- Unit tests (example-based) should also be added to the test files for `formatTime`, `isValidSessions`, `collectState`, and initial game state — these are not marked optional

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "16.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.3", "16.2", "16.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "3.2", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.5", "6.1", "6.2"] },
    { "id": 5, "tasks": ["4.4", "4.6", "4.7", "7.1", "10.1"] },
    { "id": 6, "tasks": ["4.8", "7.2", "7.3", "8.1", "8.5", "9.1", "11.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "8.4", "8.6", "8.7", "9.2", "10.2", "10.3", "10.4", "11.2", "11.3", "12.1"] },
    { "id": 8, "tasks": ["13.1", "13.2", "14.1", "14.3", "14.4"] },
    { "id": 9, "tasks": ["14.2", "14.5", "14.6.pbt"] },
    { "id": 10, "tasks": ["14.7", "14.8"] },
    { "id": 11, "tasks": ["17.1", "17.2"] }
  ]
}
```
