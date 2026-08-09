/* ==========================================================================
   Family Feud Game — Main JavaScript
   Shared by index.html (Setup Page), game.html (Game Page), results.html (Results Page)
   ========================================================================== */

/* ==========================================================================
   1. LocalStorage Utilities
   ========================================================================== */

/**
 * Validates that `data` is a conforming sessions array.
 *
 * Returns true only when:
 *  - data is an Array with 1–10 elements
 *  - every element has a string `question` field
 *  - every element has an `answers` array with at least 1 element
 *  - every answer in every `answers` array is a string
 *
 * Requirements: 3.6, 5.3
 *
 * @param {*} data - The value to validate (typically parsed from localStorage).
 * @returns {boolean}
 */
function isValidSessions(data) {
  return Array.isArray(data)
    && data.length >= 1
    && data.length <= 10
    && data.every(s =>
        typeof s.question === "string"
        && Array.isArray(s.answers)
        && s.answers.length >= 1
        && s.answers.every(a => typeof a === "string")
    );
}

/**
 * Saves the sessions array to localStorage under the key "familyFeudSessions".
 *
 * Requirements: 3.1, 3.3, 3.5
 *
 * @param {Array} sessions - The sessions array to persist.
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
function saveToStorage(sessions) {
  try {
    localStorage.setItem("familyFeudSessions", JSON.stringify(sessions));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error };
  }
}

/**
 * Loads and validates sessions from localStorage.
 *
 * Reads "familyFeudSessions", parses the JSON, and passes the result through
 * `isValidSessions`. Returns the parsed array on success, or `null` if the
 * key is absent, the JSON is malformed, or the data fails validation.
 *
 * Requirements: 3.1, 3.3, 3.6
 *
 * @returns {Array|null}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem("familyFeudSessions");
    if (raw === null) return null;
    const data = JSON.parse(raw);
    return isValidSessions(data) ? data : null;
  } catch (error) {
    return null;
  }
}

/* ==========================================================================
   2. Setup Page — State & Rendering
   ========================================================================== */

/**
 * Reads the current DOM state of all session panels and returns a sessions array.
 *
 * Queries all `[data-session-index]` panels, reads each panel's question input
 * (`.session-question-input`) and answer inputs (`[data-answer-index]`), and
 * returns a sessions array in index order.
 *
 * Requirements: 3.1, 3.3
 *
 * @returns {Array<{ question: string, answers: string[] }>}
 */
function collectState() {
  const panels = document.querySelectorAll("[data-session-index]");
  const sessions = [];

  panels.forEach(function (panel) {
    const questionInput = panel.querySelector(".session-question-input");
    const question = questionInput ? questionInput.value : "";

    const answerInputs = panel.querySelectorAll("[data-answer-index]");
    const answers = [];
    answerInputs.forEach(function (input) {
      answers.push(input.value);
    });

    sessions.push({ question: question, answers: answers });
  });

  return sessions;
}

/**
 * Creates and returns a DOM node for one session panel.
 *
 * The panel includes:
 *  - A header with the session title and a Delete Session button
 *  - A question text input (max 200 chars)
 *  - An answer list with each answer row containing a 1-based label,
 *    an input, and a Delete Answer button
 *  - An Add Answer button
 *
 * Requirements: 2.5, 2.8, 2.9
 *
 * @param {{ question: string, answers: string[] }} session - Session data.
 * @param {number} index - 0-based session index.
 * @returns {HTMLElement}
 */
function createSessionPanel(session, index) {
  // Root panel element
  const panel = document.createElement("div");
  panel.className = "session-panel";
  panel.dataset.sessionIndex = index;

  // --- Header ---
  const header = document.createElement("div");
  header.className = "session-panel__header";

  const title = document.createElement("h2");
  title.className = "session-panel__title";
  title.textContent = "Session " + (index + 1);

  const deleteSessionBtn = document.createElement("button");
  deleteSessionBtn.type = "button";
  deleteSessionBtn.className = "session-delete-btn";
  deleteSessionBtn.textContent = "Delete Session";
  deleteSessionBtn.addEventListener("click", function () {
    deleteSession(index);
  });

  header.appendChild(title);
  header.appendChild(deleteSessionBtn);
  panel.appendChild(header);

  // --- Question input ---
  const questionWrapper = document.createElement("div");
  questionWrapper.className = "session-panel__question";

  const questionLabel = document.createElement("label");
  questionLabel.textContent = "Question:";
  questionLabel.htmlFor = "session-question-" + index;

  const questionInput = document.createElement("input");
  questionInput.type = "text";
  questionInput.className = "session-question-input";
  questionInput.id = "session-question-" + index;
  questionInput.maxLength = 200;
  questionInput.value = session.question || "";
  questionInput.placeholder = "Enter your question…";
  questionInput.addEventListener("input", function () {
    debouncedSave();
  });

  questionWrapper.appendChild(questionLabel);
  questionWrapper.appendChild(questionInput);
  panel.appendChild(questionWrapper);

  // --- Answers list ---
  const answersList = document.createElement("div");
  answersList.className = "session-panel__answers";

  const answers = session.answers && session.answers.length > 0
    ? session.answers
    : [""];

  answers.forEach(function (answerText, answerIndex) {
    const row = createAnswerRow(answerText, answerIndex, index);
    answersList.appendChild(row);
  });

  panel.appendChild(answersList);

  // --- Add Answer button ---
  const addAnswerBtn = document.createElement("button");
  addAnswerBtn.type = "button";
  addAnswerBtn.className = "add-answer-btn";
  addAnswerBtn.textContent = "Add Answer";
  addAnswerBtn.addEventListener("click", function () {
    addAnswer(index);
  });

  // Disable if already at 10 answers
  if (answers.length >= 10) {
    addAnswerBtn.disabled = true;
  }

  panel.appendChild(addAnswerBtn);

  return panel;
}

/**
 * Creates and returns a single answer row DOM node.
 *
 * Each row contains a 1-based label, a text input with `data-answer-index`,
 * and a Delete Answer button.
 *
 * @param {string} answerText - Initial value for the answer input.
 * @param {number} answerIndex - 0-based answer index.
 * @param {number} sessionIndex - 0-based session index (for event handlers).
 * @returns {HTMLElement}
 */
function createAnswerRow(answerText, answerIndex, sessionIndex) {
  const row = document.createElement("div");
  row.className = "answer-row";

  const label = document.createElement("span");
  label.className = "answer-row__label";
  label.textContent = (answerIndex + 1) + ".";

  const input = document.createElement("input");
  input.type = "text";
  input.dataset.answerIndex = answerIndex;
  input.value = answerText || "";
  input.placeholder = "Answer " + (answerIndex + 1);
  input.addEventListener("input", function () {
    debouncedSave();
  });

  const deleteAnswerBtn = document.createElement("button");
  deleteAnswerBtn.type = "button";
  deleteAnswerBtn.className = "answer-delete-btn";
  deleteAnswerBtn.textContent = "Delete";
  deleteAnswerBtn.addEventListener("click", function () {
    deleteAnswer(sessionIndex, answerIndex);
  });

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(deleteAnswerBtn);

  return row;
}

/**
 * Clears `#sessions-container` and re-renders all session panels from the
 * provided sessions array. Also enforces the disabled state of `#add-session-btn`
 * when the session count reaches 10.
 *
 * Requirements: 2.1, 2.3
 *
 * @param {Array<{ question: string, answers: string[] }>} sessions
 */
function renderSessions(sessions) {
  const container = document.getElementById("sessions-container");
  if (!container) return;

  // Clear existing panels
  container.innerHTML = "";

  // Render a panel for each session
  sessions.forEach(function (session, index) {
    const panel = createSessionPanel(session, index);
    container.appendChild(panel);
  });

  // Enforce Add Session button disabled state at 10 sessions (Req 2.3, 2.4)
  const addSessionBtn = document.getElementById("add-session-btn");
  if (addSessionBtn) {
    addSessionBtn.disabled = sessions.length >= 10;
  }

  // Disable delete buttons when only one session remains (Req 2.10)
  if (sessions.length === 1) {
    const deleteBtn = container.querySelector(".session-delete-btn");
    if (deleteBtn) deleteBtn.disabled = true;
  }
}

/* ==========================================================================
   3. Setup Page — Session CRUD
   ========================================================================== */

/**
 * Appends a new empty session to the sessions array and re-renders.
 *
 * Calls `collectState()` to sync DOM → state first, then pushes a new
 * `{question:"", answers:[""]}` entry. No-op if the current session count
 * is already at the maximum of 10.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */
function addSession() {
  var sessions = collectState();
  if (sessions.length >= 10) return;

  sessions.push({ question: "", answers: [""] });
  renderSessions(sessions);
  saveToStorage(sessions);
}

/**
 * Removes the session at the given 0-based index and re-renders.
 *
 * Calls `collectState()` to sync DOM → state first, then splices out the
 * session at `index`. No-op if only one session remains, keeping the delete
 * button disabled (enforced by renderSessions → createSessionPanel).
 *
 * Requirements: 2.9, 2.10
 *
 * @param {number} index - 0-based index of the session to remove.
 */
function deleteSession(index) {
  var sessions = collectState();
  if (sessions.length <= 1) return;

  sessions.splice(index, 1);
  renderSessions(sessions);
  saveToStorage(sessions);
}

/* ==========================================================================
   4. Setup Page — Answer CRUD
   ========================================================================== */

/**
 * Appends a new empty answer to the session at the given 0-based index and
 * re-renders and saves.
 *
 * Calls `collectState()` to sync DOM → state first, then pushes an empty
 * string to the session's answers array. No-op if the session already has 10
 * answers (the "Add Answer" button will also be disabled in that case).
 *
 * Requirements: 2.6, 2.7, 2.11
 *
 * @param {number} sessionIndex - 0-based index of the session to update.
 */
function addAnswer(sessionIndex) {
  var sessions = collectState();
  if (sessions[sessionIndex].answers.length >= 10) return;

  sessions[sessionIndex].answers.push("");
  renderSessions(sessions);
  saveToStorage(sessions);
}

/**
 * Removes the answer at the given 0-based `answerIndex` from the session at
 * the given 0-based `sessionIndex`, then re-renders and saves.
 *
 * Calls `collectState()` to sync DOM → state first, then splices out the
 * answer. No-op if the session has only 1 answer remaining.
 *
 * Label re-sequencing is automatic: `renderSessions` → `createSessionPanel`
 * → `createAnswerRow` always rebuilds labels sequentially from 0, so after
 * the splice the labels will be 1-based with no gaps.
 *
 * Requirements: 2.12, 2.13, 2.14
 *
 * @param {number} sessionIndex - 0-based index of the session to update.
 * @param {number} answerIndex  - 0-based index of the answer to remove.
 */
function deleteAnswer(sessionIndex, answerIndex) {
  var sessions = collectState();
  if (sessions[sessionIndex].answers.length <= 1) return;

  sessions[sessionIndex].answers.splice(answerIndex, 1);
  renderSessions(sessions);
  saveToStorage(sessions);
}

/* ==========================================================================
   5. Setup Page — Validation & Debounce
   ========================================================================== */

/**
 * Validates an array of session objects and returns a list of error strings.
 *
 * Rules:
 *  - If a session's question is empty (after trimming) → push an error.
 *  - If all of a session's answers are empty strings (after trimming) → push an error.
 *  - An empty sessions array is considered valid (returns []).
 *
 * Requirements: 4.3, 4.4
 *
 * @param {Array<{ question: string, answers: string[] }>} sessions
 * @returns {string[]} Array of error strings; empty array means all sessions are valid.
 */
function validateSessions(sessions) {
  var errors = [];

  sessions.forEach(function (session, index) {
    var sessionNum = index + 1;

    if (session.question.trim() === "") {
      errors.push("Session " + sessionNum + ": question is required");
    }

    if (session.answers.every(function (a) { return a.trim() === ""; })) {
      errors.push("Session " + sessionNum + ": at least one answer is required");
    }
  });

  return errors;
}

/**
 * Returns a debounced version of `fn` that delays invoking `fn` until `delay`
 * milliseconds have elapsed since the last call.
 *
 * Requirements: 3.1
 *
 * @param {Function} fn    - The function to debounce.
 * @param {number}   delay - Delay in milliseconds.
 * @returns {Function}
 */
function debounce(fn, delay) {
  var timeoutId = null;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function () {
      fn.apply(ctx, args);
    }, delay);
  };
}

/**
 * Debounced save: collects current DOM state and persists it to localStorage
 * within 500 ms of the last input change.
 *
 * Requirements: 3.1
 */
var debouncedSave = debounce(function () {
  saveToStorage(collectState());
}, 500);

/* ==========================================================================
   6. Setup Page — Entry Point (setupInit)
   ========================================================================== */

/**
 * Handles the "Start Game" button click on the Setup Page.
 *
 * Reads current DOM state, validates all sessions, and either:
 *  - Renders per-session error messages in `#validation-area` and returns early, or
 *  - Saves to localStorage and navigates to game.html.
 *
 * Requirements: 3.4, 4.2, 4.3
 */
function handleStartGame() {
  var sessions = collectState();
  var errors = validateSessions(sessions);
  var validationArea = document.getElementById("validation-area");

  if (!validationArea) return;

  // Clear previous validation messages
  validationArea.innerHTML = "";

  if (errors.length > 0) {
    // Render one .validation-message div per error — do NOT navigate
    errors.forEach(function (errorText) {
      var msg = document.createElement("div");
      msg.className = "validation-message";
      msg.textContent = errorText;
      validationArea.appendChild(msg);
    });
    return;
  }

  // No errors: save then navigate
  saveToStorage(sessions);
  window.location = "game.html";
}

/**
 * Entry point for the Setup Page (index.html).
 *
 * - Attempts to load saved sessions from localStorage.
 *   If localStorage itself is unavailable, shows a storage-warning banner.
 *   If data is absent or invalid, initialises with one empty default session.
 * - Renders the session list.
 * - Injects "Add Session" and "Start Game" buttons and binds their click handlers.
 * - Binds an `input` delegation listener on `#sessions-container` for debounced saves.
 *
 * Requirements: 3.2, 3.4, 3.5, 4.1, 4.2, 4.3
 */
function setupInit() {
  var sessions;
  var storageAvailable = true;

  // Detect whether localStorage itself is accessible (Req 3.5)
  try {
    localStorage.getItem("__test__");
  } catch (e) {
    storageAvailable = false;
  }

  if (!storageAvailable) {
    // Show storage-unavailable banner prepended to <main>
    var main = document.querySelector("main");
    if (main) {
      var banner = document.createElement("div");
      banner.className = "storage-warning";
      banner.textContent = "⚠ Storage unavailable. Your setup will not be saved.";
      main.insertBefore(banner, main.firstChild);
    }
    sessions = [{ question: "", answers: [""] }];
  } else {
    // Attempt to load saved sessions (Req 3.2)
    sessions = loadFromStorage();
    if (sessions === null) {
      sessions = [{ question: "", answers: [""] }];
    }
  }

  // Render sessions panels (Req 3.2, 2.1)
  renderSessions(sessions);

  // Inject "Add Session" button into #controls-bar (Req 2.2)
  var controlsBar = document.getElementById("controls-bar");
  if (controlsBar && !document.getElementById("add-session-btn")) {
    var addSessionBtn = document.createElement("button");
    addSessionBtn.type = "button";
    addSessionBtn.id = "add-session-btn";
    addSessionBtn.textContent = "Add Session";
    addSessionBtn.addEventListener("click", function () {
      addSession();
    });
    controlsBar.appendChild(addSessionBtn);
  }

  // Inject "Start Game" button into #sticky-footer (Req 4.1)
  var stickyFooter = document.getElementById("sticky-footer");
  if (stickyFooter && !document.getElementById("start-game-btn")) {
    var startGameBtn = document.createElement("button");
    startGameBtn.type = "button";
    startGameBtn.id = "start-game-btn";
    startGameBtn.textContent = "Start Game";
    startGameBtn.addEventListener("click", function () {
      handleStartGame();
    });
    stickyFooter.appendChild(startGameBtn);
  }

  // Enforce disabled state of Add Session button after initial render
  var addBtn = document.getElementById("add-session-btn");
  if (addBtn) {
    addBtn.disabled = sessions.length >= 10;
  }
}

/* ==========================================================================
   7. Game Page — State
   ========================================================================== */

/** Module-level game state — populated by gameInit() via buildGameState(). */
var gameState;

/**
 * Reads and validates sessions from localStorage for the Game Page.
 *
 * Delegates to `loadFromStorage()` and returns its result directly:
 * the parsed sessions array on success, or `null` if the key is absent,
 * the JSON is malformed, or the data fails schema validation.
 *
 * Requirements: 5.1, 5.2, 5.3
 *
 * @returns {Array|null}
 */
function loadSessions() {
  try {
    return loadFromStorage();
  } catch (e) {
    return null;
  }
}

/**
 * Constructs and returns the initial game state object from a sessions array.
 *
 * The returned object is the single source of truth for all runtime state on
 * the Game Page. The caller (gameInit) assigns the return value to `gameState`.
 *
 * Shape of the returned object:
 * {
 *   sessions       : Array   — session objects loaded from localStorage (read-only after init)
 *   currentSession : number  — 0-based index of the session currently on the board
 *   revealedSlots  : boolean[] — one entry per answer in the current session; all false initially
 *   scores         : [number, number] — [team1Score, team2Score], both 0 on init
 *   activeTeam     : number  — 0 = Team 1, 1 = Team 2; Team 1 is active on load
 *   strikes        : number  — 0–3; 0 on init
 *   timer          : { elapsed: number, running: boolean, intervalId: number|null }
 *   navigating     : boolean — true while a session transition is in progress
 * }
 *
 * Requirements: 5.1, 8.3, 9.1
 *
 * @param {Array} sessions - Validated sessions array from loadSessions().
 * @returns {Object} Initial game state.
 */
function buildGameState(sessions) {
  return {
    sessions: sessions,
    currentSession: 0,
    revealedSlots: sessions[0].answers.map(function () { return false; }),
    scores: [0, 0],
    activeTeam: 0,
    strikes: 0,
    timer: {
      elapsed: 0,
      running: false,
      intervalId: null
    },
    navigating: false
  };
}

/* ==========================================================================
   8. Game Page — Rendering
   ========================================================================== */

/**
 * Builds and returns the answer slot DOM for a session.
 *
 * Layout rules (Req 5.5, 5.6, 5.7):
 *  - If session.answers.length > 5: returns a DocumentFragment containing
 *    a `.col-left` div (slots 1–5) and a `.col-right` div (slots 6–n).
 *  - If session.answers.length ≤ 5: returns a DocumentFragment containing
 *    the slot elements directly (no column wrappers).
 *
 * Each `.answer-slot` element (Req 5.8, 5.9):
 *  - Has `data-slot` attribute set to the 1-based slot number.
 *  - Displays only the slot number as its text content (answer text is hidden).
 *  - Does NOT display the answer text.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 *
 * @param {{ question: string, answers: string[] }} session
 * @returns {DocumentFragment}
 */
function renderAnswerSlots(session) {
  var fragment = document.createDocumentFragment();
  var answers = session.answers;
  var total = answers.length;

  /**
   * Creates a single hidden answer slot element.
   * @param {number} slotNumber - 1-based slot number.
   * @returns {HTMLElement}
   */
  function createSlot(slotNumber) {
    var slot = document.createElement("div");
    slot.className = "answer-slot";
    slot.dataset.slot = slotNumber;
    slot.textContent = String(slotNumber);
    return slot;
  }

  if (total > 5) {
    // 2-column layout: left = slots 1–5, right = slots 6–n
    var colLeft = document.createElement("div");
    colLeft.className = "col-left";

    var colRight = document.createElement("div");
    colRight.className = "col-right";

    for (var i = 1; i <= total; i++) {
      var slot = createSlot(i);
      if (i <= 5) {
        colLeft.appendChild(slot);
      } else {
        colRight.appendChild(slot);
      }
    }

    fragment.appendChild(colLeft);
    fragment.appendChild(colRight);
  } else {
    // Single-column layout: append slots directly, no wrappers
    for (var j = 1; j <= total; j++) {
      fragment.appendChild(createSlot(j));
    }
  }

  return fragment;
}

/**
 * Renders the game board for the session at the given index.
 *
 * Steps performed (Req 5.1, 5.4–5.9):
 *  1. Sets `gameState.currentSession` to `sessionIndex`.
 *  2. Sets `#question-text` content to the session's question.
 *  3. Resets `gameState.revealedSlots` to an array of `false` (one per answer).
 *  4. Clears `#board` innerHTML.
 *  5. Calls `renderAnswerSlots` and appends the result to `#board`.
 *  6. Calls `updateNavButtons()` to update Prev/Next button states.
 *
 * Requirements: 5.1, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 *
 * @param {number} sessionIndex - 0-based index into `gameState.sessions`.
 */
function renderBoard(sessionIndex) {
  gameState.currentSession = sessionIndex;

  var session = gameState.sessions[sessionIndex];

  // Update question text
  var questionEl = document.getElementById("question-text");
  if (questionEl) {
    questionEl.textContent = session.question;
  }

  // Reset revealed slots — one false per answer
  gameState.revealedSlots = session.answers.map(function () { return false; });

  // Clear the board and render fresh answer slots
  var board = document.getElementById("board");
  if (board) {
    board.innerHTML = "";
    board.appendChild(renderAnswerSlots(session));
  }

  // Update navigation button states
  updateNavButtons();
}

/**
 * Updates the Prev/Next navigation button states based on `gameState.currentSession`.
 *
 * Rules:
 *  - If there is only 1 session, both buttons are hidden entirely (Req 11.8).
 *  - Otherwise both buttons are shown:
 *    - `#nav-prev` is disabled when `currentSession === 0` (Req 11.7).
 *    - `#nav-next` is never disabled — on the last session it triggers results
 *      navigation instead of blocking the host (Req 11.6).
 *
 * Requirements: 11.7, 11.8
 */
function updateNavButtons() {
  var prevBtn = document.getElementById("nav-prev");
  var nextBtn = document.getElementById("nav-next");

  if (!prevBtn || !nextBtn) return;

  if (gameState.sessions.length === 1) {
    // Hide both controls when there is only one session (Req 11.8)
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  } else {
    // Ensure both buttons are visible
    prevBtn.style.display = "";
    nextBtn.style.display = "";

    // Disable Prev at the first session boundary (Req 11.7)
    prevBtn.disabled = gameState.currentSession === 0;

    // Next is never disabled — on the last session it goes to results (Req 11.6)
    nextBtn.disabled = false;
  }
}

/* ==========================================================================
   9. Game Page — Answer Reveal & Scoring
   ========================================================================== */

/**
 * Reveals the answer slot with the given 1-based slot number.
 *
 * Guards:
 *  - If `n` is out of bounds (< 1 or > answers.length) → no-op (Req 6.3)
 *  - If the slot is already revealed → no-op / idempotent (Req 6.6)
 *
 * On a valid, hidden slot:
 *  1. Sets `gameState.revealedSlots[n-1]` to `true`.
 *  2. Finds `[data-slot="${n}"]` in the DOM, adds the "revealed" class, and
 *     sets its `textContent` to the answer text (Req 6.4, 6.7).
 *  3. Increments `gameState.scores[gameState.activeTeam]` by 1 (Req 6.5, 8.4).
 *  4. Calls `updateScoreDisplay()` (Req 8.5).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.4, 8.5
 *
 * @param {number} n - 1-based slot number to reveal.
 */
function revealSlot(n) {
  var session = gameState.sessions[gameState.currentSession];
  var answers = session.answers;

  // Bounds check — slot must exist (Req 6.3)
  if (n < 1 || n > answers.length) return;

  // Idempotency — already revealed (Req 6.6)
  if (gameState.revealedSlots[n - 1] === true) return;

  // Mark as revealed in state
  gameState.revealedSlots[n - 1] = true;

  // Update DOM: find the slot element, apply revealed class and answer text (Req 6.4, 6.7)
  var slotEl = document.querySelector('[data-slot="' + n + '"]');
  if (slotEl) {
    slotEl.classList.add("revealed");
    slotEl.textContent = answers[n - 1];
  }

  // Award 1 point to the active team (Req 6.5, 8.4)
  gameState.scores[gameState.activeTeam] += 1;

  // Refresh score display (Req 8.5)
  updateScoreDisplay();
}

/**
 * Updates both team score displays in the DOM.
 *
 * Writes `gameState.scores[0]` to `#team1-score` and `gameState.scores[1]`
 * to `#team2-score`. This is a synchronous DOM write, so it always completes
 * well within the 100ms requirement (Req 8.5).
 *
 * Requirements: 8.4, 8.5
 */
function updateScoreDisplay() {
  var team1ScoreEl = document.getElementById("team1-score");
  var team2ScoreEl = document.getElementById("team2-score");

  if (team1ScoreEl) {
    team1ScoreEl.textContent = gameState.scores[0];
  }
  if (team2ScoreEl) {
    team2ScoreEl.textContent = gameState.scores[1];
  }
}

/* ==========================================================================
   10. Game Page — Strike System
   ========================================================================== */

/**
 * Increments `gameState.strikes` by 1 (up to a maximum of 3) and updates
 * the visual strike display.
 *
 * No-op if the strike count is already at 3.
 *
 * Requirements: 7.1, 7.3
 */
function addStrike() {
  if (gameState.strikes < 3) {
    gameState.strikes++;
  }
  updateStrikeDisplay();
}

/**
 * Resets `gameState.strikes` to 0 and atomically updates the visual strike
 * display so the count and display are never out of sync.
 *
 * Requirements: 7.4
 */
function resetStrikes() {
  gameState.strikes = 0;
  updateStrikeDisplay();
}

/**
 * Syncs the `.strike-slot` elements in `#strike-display` with the current
 * `gameState.strikes` count.
 *
 * For each of the 3 slots:
 *  - Adds the `active` class if its 0-based index is less than `gameState.strikes`.
 *  - Removes the `active` class otherwise.
 *
 * Requirements: 7.2, 7.5
 */
function updateStrikeDisplay() {
  var slots = document.querySelectorAll(".strike-slot");
  slots.forEach(function (slot, index) {
    if (index < gameState.strikes) {
      slot.classList.add("active");
    } else {
      slot.classList.remove("active");
    }
  });
}

/* ==========================================================================
   11. Game Page — Team Toggle
   ========================================================================== */

/**
 * Toggles the active team between Team 1 (0) and Team 2 (1), then updates
 * the team panel highlight to reflect the new active team.
 *
 * Requirements: 9.2
 */
function toggleTeam() {
  gameState.activeTeam = gameState.activeTeam === 0 ? 1 : 0;
  updateActiveTeamDisplay();
}

/**
 * Reflects the current `gameState.activeTeam` value in the DOM by adding the
 * `.active` CSS class to the active team's panel and removing it from the
 * other panel.
 *
 * Steps (per Req 9.4, 9.5):
 *  1. Remove `.active` from the currently inactive team's panel first.
 *  2. Only after that removal succeeds, add `.active` to the active team's panel.
 *
 * The two DOM operations are synchronous, so the full update completes well
 * within the 200 ms requirement (Req 9.4).
 *
 * Requirements: 9.3, 9.4, 9.5
 */
function updateActiveTeamDisplay() {
  var team1Panel = document.getElementById("team1-panel");
  var team2Panel = document.getElementById("team2-panel");

  if (!team1Panel || !team2Panel) return;

  if (gameState.activeTeam === 0) {
    // Team 1 is active: remove from team2 first, then add to team1
    team2Panel.classList.remove("active");
    team1Panel.classList.add("active");
  } else {
    // Team 2 is active: remove from team1 first, then add to team2
    team1Panel.classList.remove("active");
    team2Panel.classList.add("active");
  }
}

/* ==========================================================================
   12. Game Page — Timer
   ========================================================================== */

/**
 * Starts the timer if it is not already running.
 *
 * Sets `gameState.timer.running` to true and creates a `setInterval` that
 * increments `gameState.timer.elapsed` by 1 every second and calls
 * `updateTimerDisplay()` to keep the DOM in sync.
 *
 * Requirements: 10.2
 */
function startTimer() {
  if (gameState.timer.running) return;
  gameState.timer.running = true;
  gameState.timer.intervalId = setInterval(function() {
    gameState.timer.elapsed++;
    updateTimerDisplay();
  }, 1000);
}

/**
 * Pauses the timer, retaining its current elapsed value.
 *
 * Clears the interval, nulls the handle, and sets `running` to false.
 *
 * Requirements: 10.3
 */
function pauseTimer() {
  clearInterval(gameState.timer.intervalId);
  gameState.timer.intervalId = null;
  gameState.timer.running = false;
}

/**
 * Stops the timer and resets elapsed time to 0, then updates the display.
 *
 * Requirements: 10.4
 */
function resetTimer() {
  pauseTimer();
  gameState.timer.elapsed = 0;
  updateTimerDisplay();
}

/**
 * Toggles the timer between running and paused states.
 *
 * Requirements: 10.2, 10.3
 */
function toggleTimer() {
  if (gameState.timer.running) { pauseTimer(); } else { startTimer(); }
}

/**
 * Converts a number of seconds into a zero-padded "MM:SS" string.
 *
 * Requirements: 10.5
 *
 * @param {number} seconds - Non-negative integer number of seconds.
 * @returns {string} Formatted time string, e.g. "01:05" for 65 seconds.
 */
function formatTime(seconds) {
  var mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  var ss = String(seconds % 60).padStart(2, "0");
  return mm + ":" + ss;
}

/**
 * Writes the current elapsed time (formatted as MM:SS) to `#timer-display`.
 *
 * Requirements: 10.1, 10.5
 */
function updateTimerDisplay() {
  var el = document.getElementById("timer-display");
  if (el) el.textContent = formatTime(gameState.timer.elapsed);
}

/* ==========================================================================
   13. Game Page — Session Navigation
   ========================================================================== */

/**
 * Navigates to the adjacent session in the given direction.
 *
 * Direction values:
 *  - `+1` advances to the next session
 *  - `-1` goes back to the previous session
 *
 * Special case — advancing past the last session:
 *  When `direction === +1` and the host is already on the last session,
 *  `saveResults()` is called to persist scores and the browser is redirected to
 *  `results.html` instead of blocking navigation.
 *
 * Guards (executed in order):
 *  1. `gameState.navigating === true` → return immediately (prevents double-nav, Req 11.5).
 *  2. `direction === -1` and `nextIndex < 0` → return immediately (prev boundary, Req 11.7).
 *  3. `direction === +1` and already on last session → save + redirect to results (Req 11.6).
 *  4. Otherwise advance / retreat to `nextIndex`, re-render, reset strikes (Req 11.3, 11.4, 11.8).
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 *
 * @param {number} direction - `+1` for next session, `-1` for previous session.
 */
function navigateSession(direction) {
  // Guard: prevent double-navigation (Req 11.5)
  if (gameState.navigating) return;

  var nextIndex = gameState.currentSession + direction;

  // Guard: previous boundary — do not go below index 0 (Req 11.7)
  if (direction === -1 && nextIndex < 0) return;

  // Special case: advancing past the last session → go to results (Req 11.6)
  if (direction === +1 && gameState.currentSession === gameState.sessions.length - 1) {
    gameState.navigating = true;
    saveResults();
    window.location = "results.html";
    return;
  }

  // Normal navigation
  gameState.navigating = true;
  gameState.currentSession = nextIndex;
  renderBoard(nextIndex);   // resets revealedSlots and calls updateNavButtons (Req 11.3, 11.4)
  resetStrikes();            // Req 11.8 (via Req 11.9)
  gameState.navigating = false;
}

/* ==========================================================================
   14. Game Page — Keyboard Handler
   ========================================================================== */

/**
 * Master keyboard dispatcher for the Game Page.
 *
 * Guards:
 *  - `event.repeat` → return immediately (ignores key-hold repeats, prevents
 *    strike-spamming from a held key).
 *  - `event.ctrlKey || event.metaKey` → return immediately (preserves browser
 *    shortcuts such as Ctrl+R, Cmd+R).
 *
 * Key mappings:
 *  - 1–9        → revealSlot(1)–revealSlot(9)
 *  - 0          → revealSlot(10)
 *  - X / x      → addStrike()
 *  - /          → resetStrikes()
 *  - \          → toggleTeam()
 *  - T / t      → toggleTimer()
 *  - R / r      → resetTimer()
 *  - ArrowRight → navigateSession(+1)
 *  - ArrowLeft  → navigateSession(-1)
 *
 * Requirements: 6.1, 6.2, 7.1, 7.4, 9.2, 10.2, 10.3, 10.4, 11.1, 11.2
 *
 * @param {KeyboardEvent} event
 */
function handleKey(event) {
  if (event.repeat) return;
  if (event.ctrlKey || event.metaKey) return;

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

/* ==========================================================================
   15. Game Page — Entry Point (gameInit)
   ========================================================================== */

/**
 * Entry point for the Game Page (game.html).
 *
 * Steps:
 *  1. Calls `loadSessions()` to read and validate session data from localStorage.
 *  2. If null (absent, malformed, or invalid), reveals `#no-data-msg` and returns
 *     without binding keyboard or attempting to render the board (Req 5.2, 5.3).
 *  3. On valid data: builds initial game state, renders the board for session 0,
 *     initialises all display widgets, and binds the keyboard handler.
 *
 * Requirements: 5.2, 5.3, 8.3, 9.1
 */
function gameInit() {
  var sessions = loadSessions();

  if (sessions === null) {
    // No valid data — show error message, do not bind keyboard (Req 5.2, 5.3)
    var noDataMsg = document.getElementById("no-data-msg");
    if (noDataMsg) noDataMsg.removeAttribute("hidden");
    return;
  }

  // Build initial state (Req 8.3, 9.1)
  gameState = buildGameState(sessions);

  // Render the board and initialise all displays
  renderBoard(0);                // renders session 0 board + nav buttons
  updateActiveTeamDisplay();     // highlights Team 1 as active (Req 9.1)
  updateStrikeDisplay();         // shows 0 strikes (Req 8.3)
  updateTimerDisplay();          // shows 00:00

  // Bind keyboard handler (Req 6.1, 9.2, 10.2, 11.1)
  document.addEventListener("keydown", handleKey);
}

/* ==========================================================================
   16. Results Page — Data & Rendering
   ========================================================================== */

/**
 * Persists both teams' current scores to localStorage under the key
 * `familyFeudResults` just before navigating to `results.html`.
 *
 * Written value: `{ team1: gameState.scores[0], team2: gameState.scores[1] }`
 *
 * Any localStorage error is swallowed silently — the navigation to
 * `results.html` proceeds regardless, where `loadResults()` will detect the
 * missing data and show an error message.
 *
 * Requirements: 11.6, 13.1
 */
function saveResults() {
  try {
    localStorage.setItem(
      "familyFeudResults",
      JSON.stringify({ team1: gameState.scores[0], team2: gameState.scores[1] })
    );
  } catch (e) {
    // Storage unavailable — results.html will handle the missing data gracefully
  }
}

/**
 * Loads and validates the results object from localStorage.
 *
 * Reads `localStorage["familyFeudResults"]`, parses it as JSON, and confirms
 * that both `team1` and `team2` fields are numeric. Returns the data object on
 * success, or `null` on any failure (missing key, parse error, or
 * missing/non-numeric fields).
 *
 * Requirements: 13.1, 13.2
 *
 * @returns {{ team1: number, team2: number }|null}
 */
function loadResults() {
  try {
    var raw = localStorage.getItem("familyFeudResults");
    if (raw === null) return null;
    var data = JSON.parse(raw);
    if (typeof data.team1 !== "number" || typeof data.team2 !== "number") return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Compares two team scores and returns the winner announcement string.
 *
 * Requirements: 13.4, 13.5, 13.6
 *
 * @param {number} team1 - Team 1's final score.
 * @param {number} team2 - Team 2's final score.
 * @returns {string} "TEAM 1 WINS!", "TEAM 2 WINS!", or "IT'S A TIE!"
 */
function determineWinner(team1, team2) {
  if (team1 > team2) return "TEAM 1 WINS!";
  if (team2 > team1) return "TEAM 2 WINS!";
  return "IT'S A TIE!";
}

/**
 * Populates the Results Page with final scores and the winner announcement.
 *
 * Steps:
 *  1. Writes `data.team1` to `#team1-final-score` (Req 13.3).
 *  2. Writes `data.team2` to `#team2-final-score` (Req 13.3).
 *  3. Sets `#winner-banner` text to `determineWinner(data.team1, data.team2)` (Req 13.4, 13.5, 13.6).
 *
 * Requirements: 13.3, 13.4, 13.5, 13.6
 *
 * @param {{ team1: number, team2: number }} data - Validated results data.
 */
function renderResults(data) {
  // Populate score panels (Req 13.3)
  var team1Score = document.getElementById("team1-final-score");
  var team2Score = document.getElementById("team2-final-score");
  if (team1Score) team1Score.textContent = data.team1;
  if (team2Score) team2Score.textContent = data.team2;

  // Set winner announcement (Req 13.4, 13.5, 13.6)
  var banner = document.getElementById("winner-banner");
  if (banner) banner.textContent = determineWinner(data.team1, data.team2);
}

/* ==========================================================================
   17. Results Page — Entry Point (resultsInit)
   ========================================================================== */

/* ==========================================================================
   18. Page Dispatcher — init()
   ========================================================================== */

(function init() {
  const page = document.body.dataset.page;
  if (page === "setup")   setupInit();
  if (page === "game")    gameInit();
  if (page === "results") resultsInit();
})();
