/* ==========================================================================
   Family Feud Game — Main JavaScript
   Shared by index.html (Setup Page), game.html (Game Page), results.html (Results Page)
   ========================================================================== */

/* ==========================================================================
   1. LocalStorage Utilities
   ========================================================================== */

/**
 * Validates that `data` is a conforming packs array.
 *
 * Returns true only when:
 *  - data is an Array with 1–10 elements
 *  - every element has a string `id` field
 *  - every element has `team1` and `team2` string fields
 *  - every element has a `sessions` array with 1-10 sessions
 *  - every session has a string `question` field
 *  - every session has an `answers` array with at least 1 element
 *  - every answer in every `answers` array is a string
 *
 * @param {*} data - The value to validate (typically parsed from localStorage).
 * @returns {boolean}
 */
function isValidPacks(data) {
  return Array.isArray(data)
    && data.length >= 1
    && data.length <= 10
    && data.every(pack =>
        typeof pack.id === "string"
        && typeof pack.team1 === "string"
        && typeof pack.team2 === "string"
        && Array.isArray(pack.sessions)
        && pack.sessions.length >= 1
        && pack.sessions.length <= 10
        && pack.sessions.every(s =>
            typeof s.question === "string"
            && Array.isArray(s.answers)
            && s.answers.length >= 1
            && s.answers.every(a => typeof a === "string")
        )
        && (typeof pack.expanded === "undefined" || typeof pack.expanded === "boolean")
    );
}

/**
 * Validates that `data` is a conforming sessions array (legacy format).
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
 * Saves the packs array to localStorage under the key "familyFeudPacks".
 *
 * Requirements: 3.1, 3.3, 3.5
 *
 * @param {Array} packs - The packs array to persist.
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
function saveToStorage(packs) {
  try {
    localStorage.setItem("familyFeudPacks", JSON.stringify({ schemaVersion: "1.0", packs: packs }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error };
  }
}

/* --------------------------------------------------------------------------
   Timer Config Persistence
   Key: "familyFeudTimerConfig"
   Shape: { mode: "up"|"down", duration: number }
     mode     — "up" = count up freely, "down" = countdown from `duration`
     duration — total seconds for countdown (0 means no limit for count-up)
   -------------------------------------------------------------------------- */

/**
 * Reads the timer config inputs and saves them to localStorage.
 */
function saveTimerConfig() {
  try {
    var mode = document.querySelector('input[name="timer-mode"]:checked');
    var modeVal = mode ? mode.value : "up";
    var mins = parseInt(document.getElementById("timer-minutes").value, 10) || 0;
    var secs = parseInt(document.getElementById("timer-seconds").value, 10) || 0;
    // Clamp to valid ranges
    mins = Math.max(0, Math.min(99, mins));
    secs = Math.max(0, Math.min(59, secs));
    var duration = mins * 60 + secs;
    localStorage.setItem("familyFeudTimerConfig", JSON.stringify({ mode: modeVal, duration: duration }));
  } catch (e) { /* ignore */ }
}

/**
 * Loads the timer config from localStorage.
 * Returns { mode: "up"|"down", duration: number } or a safe default.
 */
function loadTimerConfig() {
  try {
    var raw = localStorage.getItem("familyFeudTimerConfig");
    if (!raw) return { mode: "up", duration: 60 };
    var data = JSON.parse(raw);
    if (data.mode !== "up" && data.mode !== "down") data.mode = "up";
    if (typeof data.duration !== "number" || data.duration < 0) data.duration = 60;
    return data;
  } catch (e) {
    return { mode: "up", duration: 60 };
  }
}

/**
 * Loads and validates packs from localStorage with migration support.
 *
 * Reads "familyFeudPacks", parses the JSON, and passes the result through
 * `isValidPacks`. Returns the parsed array on success, or `null` if the
 * key is absent, the JSON is malformed, or the data fails validation.
 *
 * If legacy "familyFeudSessions" data is found, migrates it to pack format.
 *
 * Requirements: 3.1, 3.3, 3.6
 *
 * @returns {Array|null}
 */
function loadFromStorage() {
  try {
    // Try loading new pack format
    const packRaw = localStorage.getItem("familyFeudPacks");
    if (packRaw !== null) {
      const packData = JSON.parse(packRaw);
      if (packData.schemaVersion === "1.0" && isValidPacks(packData.packs)) {
        return packData.packs;
      }
    }

    // Try loading legacy session format and migrate
    const sessionRaw = localStorage.getItem("familyFeudSessions");
    if (sessionRaw !== null) {
      const sessions = JSON.parse(sessionRaw);
      if (isValidSessions(sessions)) {
        // Migrate to pack format
        const migratedPacks = [{
          id: "pack-" + Date.now(),
          team1: "Team 1",
          team2: "Team 2",
          sessions: sessions,
          expanded: true
        }];
        saveToStorage(migratedPacks);
        return migratedPacks;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/* ==========================================================================
   2. Setup Page — State & Rendering
   ========================================================================== */

/**
 * Reads the current DOM state of all pack and session panels and returns a packs array.
 *
 * Queries all `[data-pack-index]` panels, reads team names, expanded state,
 * and all session data within each pack.
 *
 * IMPORTANT: Only reads existing pack IDs, never generates new ones.
 *
 * Requirements: 3.1, 3.3
 *
 * @returns {Array<{ id: string, team1: string, team2: string, sessions: Array, expanded: boolean }>}
 */
function collectState() {
  const packPanels = document.querySelectorAll("[data-pack-index]");
  const packs = [];

  packPanels.forEach(function (packPanel) {
    // CRITICAL: Only use existing pack IDs, never generate new ones
    const packId = packPanel.dataset.packId;
    if (!packId) {
      console.error("Pack panel missing data-pack-id attribute!");
      return; // Skip this pack if it doesn't have an ID
    }
    
    const team1Input = packPanel.querySelector(".pack-team1-input");
    const team2Input = packPanel.querySelector(".pack-team2-input");
    const team1 = team1Input ? team1Input.value.trim() : "Team 1";
    const team2 = team2Input ? team2Input.value.trim() : "Team 2";
    const expanded = packPanel.classList.contains("expanded");

    const sessionPanels = packPanel.querySelectorAll("[data-session-index]");
    const sessions = [];

    sessionPanels.forEach(function (panel) {
      const questionInput = panel.querySelector(".session-question-input");
      const question = questionInput ? questionInput.value : "";

      const answerInputs = panel.querySelectorAll("[data-answer-index]");
      const answers = [];
      answerInputs.forEach(function (input) {
        answers.push(input.value);
      });

      sessions.push({ question: question, answers: answers });
    });

    packs.push({
      id: packId,
      team1: team1,
      team2: team2,
      sessions: sessions,
      expanded: expanded
    });
  });

  return packs;
}

/**
 * Creates and returns a DOM node for one pack panel.
 *
 * The panel includes:
 *  - A header with pack number, team name inputs, and Delete Pack button
 *  - A collapsible body containing session panels
 *  - An "Add Session" button
 *  - A "Start Pack" button to play this pack individually
 *
 * @param {{ id: string, team1: string, team2: string, sessions: Array, expanded: boolean }} pack - Pack data.
 * @param {number} packIndex - 0-based pack index.
 * @returns {HTMLElement}
 */
function createPackPanel(pack, packIndex) {
  const panel = document.createElement("div");
  panel.className = "pack-panel" + (pack.expanded ? " expanded" : "");
  panel.dataset.packIndex = packIndex;
  panel.dataset.packId = pack.id;

  // --- Header ---
  const header = document.createElement("div");
  header.className = "pack-panel__header";
  header.addEventListener("click", function(e) {
    // Only toggle if clicking on the header itself or the title, not on inputs or buttons
    if (e.target === header || e.target === title || e.target.closest('.pack-panel__title')) {
      togglePack(packIndex);
    }
  });

  const title = document.createElement("h2");
  title.className = "pack-panel__title";
  title.textContent = "Pack " + (packIndex + 1);

  const teamInputs = document.createElement("div");
  teamInputs.className = "pack-panel__team-inputs";

  const team1Label = document.createElement("label");
  team1Label.textContent = "Team 1: ";
  const team1Input = document.createElement("input");
  team1Input.type = "text";
  team1Input.className = "pack-team1-input";
  team1Input.maxLength = 50;
  team1Input.value = pack.team1 || "Team 1";
  team1Input.placeholder = "Team 1 name";
  team1Input.addEventListener("input", debouncedSave);
  team1Label.appendChild(team1Input);

  const team2Label = document.createElement("label");
  team2Label.textContent = "Team 2: ";
  const team2Input = document.createElement("input");
  team2Input.type = "text";
  team2Input.className = "pack-team2-input";
  team2Input.maxLength = 50;
  team2Input.value = pack.team2 || "Team 2";
  team2Input.placeholder = "Team 2 name";
  team2Input.addEventListener("input", debouncedSave);
  team2Label.appendChild(team2Input);

  teamInputs.appendChild(team1Label);
  teamInputs.appendChild(team2Label);

  const deletePackBtn = document.createElement("button");
  deletePackBtn.type = "button";
  deletePackBtn.className = "pack-delete-btn";
  deletePackBtn.textContent = "Delete Pack";
  deletePackBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
    deletePack(packIndex);
  });

  header.appendChild(title);
  header.appendChild(teamInputs);
  header.appendChild(deletePackBtn);
  panel.appendChild(header);

  // --- Body (collapsible) ---
  const body = document.createElement("div");
  body.className = "pack-panel__body";

  // Show stored score if exists
  if (pack.lastScore) {
    const scoreDisplay = document.createElement("div");
    scoreDisplay.className = "pack-score-display";
    scoreDisplay.innerHTML = "<strong>Last Score:</strong> " + 
                            pack.team1 + ": " + pack.lastScore.team1 + " | " + 
                            pack.team2 + ": " + pack.lastScore.team2;
    body.appendChild(scoreDisplay);
  }

  const sessionsContainer = document.createElement("div");
  sessionsContainer.className = "pack-sessions-container";

  pack.sessions.forEach(function(session, sessionIndex) {
    const sessionPanel = createSessionPanel(session, sessionIndex, packIndex);
    sessionsContainer.appendChild(sessionPanel);
  });

  body.appendChild(sessionsContainer);

  // Button container for Add Session and Start Pack
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "pack-button-container";

  // Add Session button
  const addSessionBtn = document.createElement("button");
  addSessionBtn.type = "button";
  addSessionBtn.className = "add-session-btn";
  addSessionBtn.textContent = "Add Session";
  addSessionBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
    addSession(packIndex);
  });
  if (pack.sessions.length >= 10) {
    addSessionBtn.disabled = true;
  }
  buttonContainer.appendChild(addSessionBtn);

  // Start Pack button
  const startPackBtn = document.createElement("button");
  startPackBtn.type = "button";
  startPackBtn.className = "start-pack-btn";
  startPackBtn.textContent = "Start This Pack";
  startPackBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
    startPack(packIndex);
  });
  buttonContainer.appendChild(startPackBtn);

  body.appendChild(buttonContainer);

  panel.appendChild(body);

  return panel;
}

/**
 * Toggles the expanded/collapsed state of a pack.
 *
 * @param {number} packIndex - 0-based pack index.
 */
function togglePack(packIndex) {
  const packs = collectState();
  packs[packIndex].expanded = !packs[packIndex].expanded;
  renderPacks(packs);
  saveToStorage(packs);
}

/**
 * Creates and returns a DOM node for one session panel within a pack.
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
 * @param {number} sessionIndex - 0-based session index within the pack.
 * @param {number} packIndex - 0-based pack index.
 * @returns {HTMLElement}
 */
function createSessionPanel(session, sessionIndex, packIndex) {
  // Root panel element
  const panel = document.createElement("div");
  panel.className = "session-panel";
  panel.dataset.sessionIndex = sessionIndex;
  panel.dataset.packIndex = packIndex;

  // --- Header ---
  const header = document.createElement("div");
  header.className = "session-panel__header";

  const title = document.createElement("h3");
  title.className = "session-panel__title";
  title.textContent = "Session " + (sessionIndex + 1);

  const deleteSessionBtn = document.createElement("button");
  deleteSessionBtn.type = "button";
  deleteSessionBtn.className = "session-delete-btn";
  deleteSessionBtn.textContent = "Delete Session";
  deleteSessionBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    deleteSession(packIndex, sessionIndex);
  });

  header.appendChild(title);
  header.appendChild(deleteSessionBtn);
  panel.appendChild(header);

  // --- Question input ---
  const questionWrapper = document.createElement("div");
  questionWrapper.className = "session-panel__question";

  const questionLabel = document.createElement("label");
  questionLabel.textContent = "Question:";
  questionLabel.htmlFor = "session-question-" + packIndex + "-" + sessionIndex;

  const questionInput = document.createElement("input");
  questionInput.type = "text";
  questionInput.className = "session-question-input";
  questionInput.id = "session-question-" + packIndex + "-" + sessionIndex;
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
    const row = createAnswerRow(answerText, answerIndex, sessionIndex, packIndex);
    answersList.appendChild(row);
  });

  panel.appendChild(answersList);

  // --- Add Answer button ---
  const addAnswerBtn = document.createElement("button");
  addAnswerBtn.type = "button";
  addAnswerBtn.className = "add-answer-btn";
  addAnswerBtn.textContent = "Add Answer";
  addAnswerBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    addAnswer(packIndex, sessionIndex);
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
 * @param {number} sessionIndex - 0-based session index.
 * @param {number} packIndex - 0-based pack index.
 * @returns {HTMLElement}
 */
function createAnswerRow(answerText, answerIndex, sessionIndex, packIndex) {
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
  deleteAnswerBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    deleteAnswer(packIndex, sessionIndex, answerIndex);
  });

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(deleteAnswerBtn);

  return row;
}

/**
 * Clears `#sessions-container` and re-renders all pack panels from the
 * provided packs array. Also enforces the disabled state of buttons.
 *
 * Requirements: 2.1, 2.3
 *
 * @param {Array} packs
 */
function renderPacks(packs) {
  const container = document.getElementById("sessions-container");
  if (!container) return;

  // Clear existing panels
  container.innerHTML = "";

  // Render a panel for each pack
  packs.forEach(function (pack, index) {
    const panel = createPackPanel(pack, index);
    container.appendChild(panel);
  });

  // Enforce Add Pack button disabled state at 10 packs
  const addPackBtn = document.getElementById("add-pack-btn");
  if (addPackBtn) {
    addPackBtn.disabled = packs.length >= 10;
  }

  // Disable delete pack buttons when only one pack remains
  if (packs.length === 1) {
    const deleteBtn = container.querySelector(".pack-delete-btn");
    if (deleteBtn) deleteBtn.disabled = true;
  }
}

/**
 * Legacy function name kept for compatibility
 */
function renderSessions(sessions) {
  // This shouldn't be called anymore, but kept for safety
  console.warn("renderSessions called - migrating to pack format");
  const packs = [{
    id: "pack-" + Date.now(),
    team1: "Team 1",
    team2: "Team 2",
    sessions: sessions,
    expanded: true
  }];
  renderPacks(packs);
}

/* ==========================================================================
   3. Setup Page — Pack & Session CRUD
   ========================================================================== */

/**
 * Appends a new empty pack to the packs array and re-renders.
 */
var addPackInProgress = false;
function addPack() {
  // Prevent rapid multiple calls
  if (addPackInProgress) return;
  addPackInProgress = true;
  
  var packs = collectState();
  if (packs.length >= 10) {
    addPackInProgress = false;
    return;
  }

  var newPack = {
    id: "pack-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
    team1: "Team 1",
    team2: "Team 2",
    sessions: [{ question: "", answers: [""] }],
    expanded: true
  };
  
  packs.push(newPack);
  renderPacks(packs);
  saveToStorage(packs);
  
  // Reset flag after a short delay
  setTimeout(function() {
    addPackInProgress = false;
  }, 300);
}

/**
 * Starts a specific pack by storing its ID and navigating to game.html
 * 
 * @param {number} packIndex - 0-based index of the pack to start
 */
function startPack(packIndex) {
  var packs = collectState();
  var pack = packs[packIndex];
  
  // Validate the pack
  var errors = validateSinglePack(pack, packIndex);
  var validationArea = document.getElementById("validation-area");
  
  if (validationArea) {
    validationArea.innerHTML = "";
    
    if (errors.length > 0) {
      errors.forEach(function (errorText) {
        var msg = document.createElement("div");
        msg.className = "validation-message";
        msg.textContent = errorText;
        validationArea.appendChild(msg);
      });
      return;
    }
  }
  
  // Save packs, select this pack, and navigate
  saveToStorage(packs);
  saveTimerConfig();
  sessionStorage.setItem("familyFeudSelectedPack", pack.id);
  window.location = "game.html";
}

/**
 * Validates a single pack and returns error messages
 * 
 * @param {Object} pack - Pack to validate
 * @param {number} packIndex - Pack index for error messages
 * @returns {string[]} Array of error strings
 */
function validateSinglePack(pack, packIndex) {
  var errors = [];
  var packNum = packIndex + 1;
  
  // Validate team names
  if (!pack.team1 || pack.team1.trim() === "") {
    errors.push("Pack " + packNum + ": Team 1 name is required");
  }
  if (!pack.team2 || pack.team2.trim() === "") {
    errors.push("Pack " + packNum + ": Team 2 name is required");
  }
  
  // Validate sessions within pack
  pack.sessions.forEach(function (session, sessionIndex) {
    var sessionNum = sessionIndex + 1;
    
    if (session.question.trim() === "") {
      errors.push("Pack " + packNum + ", Session " + sessionNum + ": question is required");
    }
    
    if (session.answers.every(function (a) { return a.trim() === ""; })) {
      errors.push("Pack " + packNum + ", Session " + sessionNum + ": at least one answer is required");
    }
  });
  
  return errors;
}

/**
 * Removes the pack at the given 0-based index and re-renders.
 *
 * @param {number} packIndex - 0-based index of the pack to remove.
 */
function deletePack(packIndex) {
  var packs = collectState();
  if (packs.length <= 1) return;

  // Check if pack has configured data
  var pack = packs[packIndex];
  var hasData = pack.sessions.length > 1 || 
                pack.sessions.some(s => s.question.trim() !== "" || s.answers.some(a => a.trim() !== ""));

  if (hasData) {
    var confirmed = confirm("Delete Pack " + (packIndex + 1) + " with " + pack.sessions.length + " session(s)?");
    if (!confirmed) return;
  }

  packs.splice(packIndex, 1);
  renderPacks(packs);
  saveToStorage(packs);
}

/**
 * Appends a new empty session to the pack at the given 0-based index and re-renders.
 *
 * @param {number} packIndex - 0-based index of the pack to update.
 */
function addSession(packIndex) {
  var packs = collectState();
  if (packs[packIndex].sessions.length >= 10) return;

  packs[packIndex].sessions.push({ question: "", answers: [""] });
  renderPacks(packs);
  saveToStorage(packs);
}

/**
 * Removes the session at the given 0-based indices and re-renders.
 *
 * @param {number} packIndex - 0-based index of the pack.
 * @param {number} sessionIndex - 0-based index of the session to remove.
 */
function deleteSession(packIndex, sessionIndex) {
  var packs = collectState();
  if (packs[packIndex].sessions.length <= 1) return;

  packs[packIndex].sessions.splice(sessionIndex, 1);
  renderPacks(packs);
  saveToStorage(packs);
}

/* ==========================================================================
   4. Setup Page — Answer CRUD
   ========================================================================== */

/**
 * Appends a new empty answer to the session at the given indices and
 * re-renders and saves.
 *
 * @param {number} packIndex - 0-based index of the pack.
 * @param {number} sessionIndex - 0-based index of the session to update.
 */
function addAnswer(packIndex, sessionIndex) {
  var packs = collectState();
  if (packs[packIndex].sessions[sessionIndex].answers.length >= 10) return;

  packs[packIndex].sessions[sessionIndex].answers.push("");
  renderPacks(packs);
  saveToStorage(packs);
}

/**
 * Removes the answer at the given indices, then re-renders and saves.
 *
 * @param {number} packIndex - 0-based index of the pack.
 * @param {number} sessionIndex - 0-based index of the session to update.
 * @param {number} answerIndex  - 0-based index of the answer to remove.
 */
function deleteAnswer(packIndex, sessionIndex, answerIndex) {
  var packs = collectState();
  if (packs[packIndex].sessions[sessionIndex].answers.length <= 1) return;

  packs[packIndex].sessions[sessionIndex].answers.splice(answerIndex, 1);
  renderPacks(packs);
  saveToStorage(packs);
}

/* ==========================================================================
   5. Setup Page — Validation & Debounce
   ========================================================================== */

/**
 * Validates an array of pack objects and returns a list of error strings.
 *
 * @param {Array} packs
 * @returns {string[]} Array of error strings; empty array means all packs are valid.
 */
function validatePacks(packs) {
  var errors = [];

  packs.forEach(function (pack, packIndex) {
    var packNum = packIndex + 1;

    // Validate team names
    if (!pack.team1 || pack.team1.trim() === "") {
      errors.push("Pack " + packNum + ": Team 1 name is required");
    }
    if (!pack.team2 || pack.team2.trim() === "") {
      errors.push("Pack " + packNum + ": Team 2 name is required");
    }

    // Validate sessions within pack
    pack.sessions.forEach(function (session, sessionIndex) {
      var sessionNum = sessionIndex + 1;

      if (session.question.trim() === "") {
        errors.push("Pack " + packNum + ", Session " + sessionNum + ": question is required");
      }

      if (session.answers.every(function (a) { return a.trim() === ""; })) {
        errors.push("Pack " + packNum + ", Session " + sessionNum + ": at least one answer is required");
      }
    });
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
 * Reads current DOM state, validates all packs, and either:
 *  - Renders per-pack error messages in `#validation-area` and returns early, or
 *  - Saves to localStorage and navigates to game.html.
 *
 * Requirements: 3.4, 4.2, 4.3
 */
function handleStartGame() {
  var packs = collectState();
  var errors = validatePacks(packs);
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
  saveToStorage(packs);
  saveTimerConfig();
  window.location = "game.html";
}

/**
 * Entry point for the Setup Page (index.html).
 *
 * - Attempts to load saved packs from localStorage.
 *   If localStorage itself is unavailable, shows a storage-warning banner.
 *   If data is absent or invalid, initialises with one empty default pack.
 * - Renders the pack list.
 * - Injects "Add Pack" and "Start Game" buttons and binds their click handlers.
 *
 * Requirements: 3.2, 3.4, 3.5, 4.1, 4.2, 4.3
 */
function setupInit() {
  var packs;
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
    packs = [{
      id: "pack-" + Date.now(),
      team1: "Team 1",
      team2: "Team 2",
      sessions: [{ question: "", answers: [""] }],
      expanded: true
    }];
  } else {
    // Attempt to load saved packs (Req 3.2)
    packs = loadFromStorage();
    if (packs === null) {
      packs = [{
        id: "pack-" + Date.now(),
        team1: "Team 1",
        team2: "Team 2",
        sessions: [{ question: "", answers: [""] }],
        expanded: true
      }];
    }
  }

  // Render packs panels (Req 3.2, 2.1)
  renderPacks(packs);

  // Inject "Add Pack" button into #controls-bar
  var controlsBar = document.getElementById("controls-bar");
  if (controlsBar) {
    // Remove any existing button first to prevent duplicates
    var existingBtn = document.getElementById("add-pack-btn");
    if (existingBtn) {
      existingBtn.remove();
    }
    
    var addPackBtn = document.createElement("button");
    addPackBtn.type = "button";
    addPackBtn.id = "add-pack-btn";
    addPackBtn.textContent = "Add Pack";
    addPackBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      addPack();
    });
    controlsBar.appendChild(addPackBtn);
  }

  // Inject "Start Game" button into #sticky-footer (Req 4.1)
  var stickyFooter = document.getElementById("sticky-footer");
  if (stickyFooter) {
    // Remove any existing button first to prevent duplicates
    var existingBtn = document.getElementById("start-game-btn");
    if (existingBtn) {
      existingBtn.remove();
    }
    
    var startGameBtn = document.createElement("button");
    startGameBtn.type = "button";
    startGameBtn.id = "start-game-btn";
    startGameBtn.textContent = "Start Game";
    startGameBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleStartGame();
    });
    stickyFooter.appendChild(startGameBtn);
  }

  // Enforce disabled state of Add Pack button after initial render
  var addBtn = document.getElementById("add-pack-btn");
  if (addBtn) {
    addBtn.disabled = packs.length >= 10;
  }

  // --- Timer Config ---
  // Restore saved timer config into the panel inputs
  var savedTimer = loadTimerConfig();
  var modeUpEl   = document.getElementById("timer-mode-up");
  var modeDownEl = document.getElementById("timer-mode-down");
  var minsEl     = document.getElementById("timer-minutes");
  var secsEl     = document.getElementById("timer-seconds");
  var durationRow = document.getElementById("timer-duration-row");

  if (modeUpEl && modeDownEl) {
    if (savedTimer.mode === "down") {
      modeDownEl.checked = true;
    } else {
      modeUpEl.checked = true;
    }
  }

  if (minsEl && secsEl) {
    minsEl.value = Math.floor(savedTimer.duration / 60);
    secsEl.value = savedTimer.duration % 60;
  }

  // Show/hide duration row based on current mode
  function updateDurationRowVisibility() {
    var checked = document.querySelector('input[name="timer-mode"]:checked');
    if (durationRow) {
      durationRow.classList.toggle("hidden", checked && checked.value === "up");
    }
  }
  updateDurationRowVisibility();

  // Save on any change to the timer config inputs
  var timerConfigPanel = document.getElementById("timer-config-panel");
  if (timerConfigPanel) {
    timerConfigPanel.addEventListener("change", function () {
      updateDurationRowVisibility();
      saveTimerConfig();
    });
    timerConfigPanel.addEventListener("input", function () {
      saveTimerConfig();
    });
  }
}

/* ==========================================================================
   7. Game Page — State
   ========================================================================== */

/** Module-level game state — populated by gameInit() via buildGameState(). */
var gameState;

/** Cached DOM elements for better performance */
var DOM = {
  // Game page elements
  board: null,
  questionText: null,
  team1Panel: null,
  team2Panel: null,
  team1Score: null,
  team2Score: null,
  timerDisplay: null,
  navPrev: null,
  navNext: null,
  strikeOverlay: null,
  
  // Initialized on gameInit
  init: function() {
    this.board = document.getElementById("board");
    this.questionText = document.getElementById("question-text");
    this.team1Panel = document.getElementById("team1-panel");
    this.team2Panel = document.getElementById("team2-panel");
    this.team1Score = document.getElementById("team1-score");
    this.team2Score = document.getElementById("team2-score");
    this.timerDisplay = document.getElementById("timer-display");
    this.navPrev = document.getElementById("nav-prev");
    this.navNext = document.getElementById("nav-next");
    this.strikeOverlay = document.getElementById("strike-overlay");
  }
};

/* --------------------------------------------------------------------------
   Sound Effects
   -------------------------------------------------------------------------- */

/**
 * Plays the correct answer sound effect.
 */
function playCorrectSound() {
  try {
    var audio = new Audio('sfx/Correct.wav');
    audio.play().catch(function(error) {
      console.log('Could not play correct sound:', error);
    });
  } catch (e) {
    console.log('Error loading correct sound:', e);
  }
}

/**
 * Plays the wrong answer sound effect.
 */
function playWrongSound() {
  try {
    var audio = new Audio('sfx/Wrong.mp3');
    audio.play().catch(function(error) {
      console.log('Could not play wrong sound:', error);
    });
  } catch (e) {
    console.log('Error loading wrong sound:', e);
  }
}

/**
 * Reads and validates packs from localStorage for the Game Page.
 *
 * Returns an object with packs array and team names if successful.
 *
 * Requirements: 5.1, 5.2, 5.3
 *
 * @returns {{packs: Array, selectedPack: Object}|null}
 */
function loadPacks() {
  try {
    var packs = loadFromStorage();
    if (!packs || packs.length === 0) return null;
    
    // Check if pack ID is stored in sessionStorage for this session
    var selectedPackId = sessionStorage.getItem("familyFeudSelectedPack");
    var selectedPack = null;
    
    if (selectedPackId) {
      selectedPack = packs.find(function(p) { return p.id === selectedPackId; });
    }
    
    // If only one pack or already selected, return it
    if (packs.length === 1 || selectedPack) {
      return {
        packs: packs,
        selectedPack: selectedPack || packs[0]
      };
    }
    
    // Multiple packs and none selected - need selection screen
    return {
      packs: packs,
      selectedPack: null
    };
  } catch (e) {
    return null;
  }
}

/**
 * Shows pack selection screen when multiple packs exist.
 *
 * @param {Array} packs - Array of pack objects
 */
function showPackSelection(packs) {
  var main = document.getElementById("game-main");
  if (!main) return;
  
  // Hide game elements
  document.getElementById("game-block").style.display = "none";
  document.getElementById("bottom-bar").style.display = "none";
  document.getElementById("shortcut-ref").style.display = "none";
  
  // Create selection screen
  var selectionScreen = document.createElement("div");
  selectionScreen.id = "pack-selection-screen";
  selectionScreen.style.cssText = "max-width: 600px; margin: 50px auto; text-align: center;";
  
  var title = document.createElement("h1");
  title.textContent = "Select a Pack to Play";
  title.style.marginBottom = "30px";
  selectionScreen.appendChild(title);
  
  var packList = document.createElement("div");
  packList.style.cssText = "display: flex; flex-direction: column; gap: 15px;";
  
  packs.forEach(function(pack, index) {
    var packButton = document.createElement("button");
    packButton.type = "button";
    packButton.style.cssText = "padding: 20px; font-size: 18px; cursor: pointer; border: 2px solid #ccc; border-radius: 8px; background: white;";
    packButton.innerHTML = "<strong>Pack " + (index + 1) + "</strong><br>" +
                           pack.team1 + " vs " + pack.team2 + "<br>" +
                           "<small>" + pack.sessions.length + " session(s)</small>";
    
    packButton.addEventListener("click", function() {
      sessionStorage.setItem("familyFeudSelectedPack", pack.id);
      window.location.reload();
    });
    
    packButton.addEventListener("mouseenter", function() {
      this.style.background = "#f0f4ff";
      this.style.borderColor = "#4a90e2";
    });
    
    packButton.addEventListener("mouseleave", function() {
      this.style.background = "white";
      this.style.borderColor = "#ccc";
    });
    
    packList.appendChild(packButton);
  });
  
  selectionScreen.appendChild(packList);
  main.insertBefore(selectionScreen, main.firstChild);
}

/**
 * Legacy function for backward compatibility
 */
function loadSessions() {
  var result = loadPacks();
  if (!result || !result.selectedPack) return null;
  return result.selectedPack.sessions;
}

/**
 * Constructs and returns the initial game state object from a pack.
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
 *   team1Name      : string  — Display name for team 1
 *   team2Name      : string  — Display name for team 2
 * }
 *
 * Requirements: 5.1, 8.3, 9.1
 *
 * @param {Object} pack - Pack object with sessions and team names
 * @returns {Object} Initial game state.
 */
function buildGameState(pack) {
  var sessions = pack.sessions;
  var timerConfig = loadTimerConfig();
  return {
    sessions: sessions,
    currentSession: 0,
    revealedSlots: sessions[0].answers.map(function () { return false; }),
    scores: [0, 0],
    activeTeam: 0,
    strikes: 0,
    timer: {
      elapsed: 0,
      // For countdown, we count down from duration; elapsed tracks seconds used
      duration: timerConfig.duration,   // total seconds (0 = unlimited count-up)
      mode: timerConfig.mode,           // "up" | "down"
      running: false,
      intervalId: null
    },
    navigating: false,
    team1Name: pack.team1 || "TEAM 1",
    team2Name: pack.team2 || "TEAM 2"
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
    // Single-column layout: wrap slots in centered container
    var centerCol = document.createElement("div");
    centerCol.className = "col-center";
    
    for (var j = 1; j <= total; j++) {
      centerCol.appendChild(createSlot(j));
    }
    
    fragment.appendChild(centerCol);
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

  // Play correct answer sound effect
  playCorrectSound();
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
  if (DOM.team1Score) {
    DOM.team1Score.textContent = gameState.scores[0];
  }
  if (DOM.team2Score) {
    DOM.team2Score.textContent = gameState.scores[1];
  }
}

/* ==========================================================================
   10. Game Page — Strike System
   ========================================================================== */

/**
 * Increments `gameState.strikes` by 1 (up to a maximum of 3), flashes the
 * full-screen wrong-answer overlay, and resets strikes to 0 once the cap is hit.
 *
 * Instead of 3 persistent indicator boxes, the wrong buzz is a big "✗" overlay
 * that flashes on screen and fades automatically. After 3 strikes the count
 * resets to 0 so the overlay can fire again.
 *
 * Requirements: 7.1, 7.3
 */
function addStrike() {
  if (gameState.strikes < 3) {
    gameState.strikes++;
    updateStrikeDisplay();
  }
  // Flash the full-screen overlay
  showStrikeOverlay();
  // Play wrong answer sound effect
  playWrongSound();
}

/**
 * Manually resets `gameState.strikes` to 0 (/ key).
 *
 * Requirements: 7.4
 */
function resetStrikes() {
  gameState.strikes = 0;
  updateStrikeDisplay();
}

/**
 * Triggers the full-screen wrong-answer overlay ("✗") and auto-hides it
 * after the CSS animation completes (~800 ms).
 */
function showStrikeOverlay() {
  var overlay = document.getElementById("strike-overlay");
  if (!overlay) return;
  // Remove any in-progress animation so it restarts cleanly
  overlay.classList.remove("visible", "flashing");
  // Force reflow so the browser registers the class removal
  void overlay.offsetWidth;
  overlay.classList.add("flashing");
  // Clean up after animation ends
  overlay.addEventListener("animationend", function handler() {
    overlay.classList.remove("flashing");
    overlay.removeEventListener("animationend", handler);
  });
}

/**
 * updateStrikeDisplay updates the visual strike indicators.
 * Shows X marks based on current strike count (0-3).
 */
function updateStrikeDisplay() {
  var strikeSlots = document.querySelectorAll(".strike-slot");
  strikeSlots.forEach(function(slot, index) {
    if (index < gameState.strikes) {
      slot.classList.add("active");
    } else {
      slot.classList.remove("active");
    }
  });
}

/**
 * Steal function - transfers all points from current round to the opposing team.
 * Only works when strikes === 3.
 * Resets strikes after steal.
 */
function stealPoints() {
  if (gameState.strikes !== 3) return;
  
  // Count revealed slots to get points to steal
  var pointsToSteal = gameState.revealedSlots.filter(function(revealed) {
    return revealed;
  }).length;
  
  // Transfer points from active team to other team
  var otherTeam = gameState.activeTeam === 0 ? 1 : 0;
  gameState.scores[gameState.activeTeam] -= pointsToSteal;
  gameState.scores[otherTeam] += pointsToSteal;
  
  // Ensure scores don't go negative
  if (gameState.scores[gameState.activeTeam] < 0) {
    gameState.scores[gameState.activeTeam] = 0;
  }
  
  // Reset strikes and update displays
  gameState.strikes = 0;
  updateStrikeDisplay();
  updateScoreDisplay();
}

/**
 * Reveal all remaining answers without awarding points.
 * Reveals one answer per second for dramatic effect.
 * Used to show all answers at end of round.
 */
function revealAllAnswers() {
  var session = gameState.sessions[gameState.currentSession];
  var hiddenIndexes = [];
  
  // Collect all hidden slot indexes
  for (var i = 0; i < session.answers.length; i++) {
    if (!gameState.revealedSlots[i]) {
      hiddenIndexes.push(i);
    }
  }
  
  // Reveal each hidden slot one by one with 1 second interval
  hiddenIndexes.forEach(function(index, arrIndex) {
    setTimeout(function() {
      gameState.revealedSlots[index] = true;
      
      // Update DOM
      var slot = document.querySelector('.answer-slot[data-slot="' + (index + 1) + '"]');
      if (slot && !slot.classList.contains("revealed")) {
        slot.classList.add("revealed");
        slot.textContent = session.answers[index];
      }
    }, arrIndex * 1000); // 1000ms = 1 second per reveal
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
 * In count-up mode (timer.mode === "up"): increments elapsed each second.
 * In countdown mode (timer.mode === "down"): decrements remaining time each
 * second and stops automatically at 00:00, flashing the display red.
 *
 * Requirements: 10.2
 */
function startTimer() {
  if (gameState.timer.running) return;
  gameState.timer.running = true;
  gameState.timer.intervalId = setInterval(function() {
    if (gameState.timer.mode === "down") {
      var remaining = gameState.timer.duration - gameState.timer.elapsed;
      if (remaining <= 0) {
        // Already at zero — stop and signal time-up
        pauseTimer();
        timerTimeUp();
        return;
      }
      gameState.timer.elapsed++;
      remaining--;
      updateTimerDisplay();
      if (remaining <= 0) {
        pauseTimer();
        timerTimeUp();
      }
    } else {
      // Count-up mode
      gameState.timer.elapsed++;
      updateTimerDisplay();
    }
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
 * Also removes any time-up styling from the display.
 *
 * Requirements: 10.4
 */
function resetTimer() {
  pauseTimer();
  gameState.timer.elapsed = 0;
  updateTimerDisplay();
  var el = document.getElementById("timer-display");
  if (el) el.classList.remove("timer-up");
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
 * Called when countdown reaches zero. Flashes the timer display red,
 * then automatically saves results and navigates to the results page.
 */
function timerTimeUp() {
  var el = document.getElementById("timer-display");
  if (el) {
    el.classList.add("timer-up");
  }
  
  // Wait 2 seconds for the visual flash, then auto-navigate to results
  setTimeout(function() {
    saveResults();
    window.location = "results.html";
  }, 2000);
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
 * Writes the current timer value (formatted as MM:SS) to `#timer-display`.
 * In countdown mode, shows the remaining time; in count-up mode, shows elapsed.
 *
 * Requirements: 10.1, 10.5
 */
function updateTimerDisplay() {
  var el = document.getElementById("timer-display");
  if (!el) return;
  var displaySeconds;
  if (gameState.timer.mode === "down") {
    displaySeconds = Math.max(0, gameState.timer.duration - gameState.timer.elapsed);
  } else {
    displaySeconds = gameState.timer.elapsed;
  }
  el.textContent = formatTime(displaySeconds);
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
    case "S": case "s": stealPoints(); break;
    case "D": case "d": revealAllAnswers(); break;
    case "T": case "t": toggleTimer(); break;
    case "R": case "r": resetTimer(); break;
    case "ArrowRight": navigateSession(+1); break;
    case "ArrowLeft":  navigateSession(-1); break;
    case "F": case "f": toggleFullscreen(); break;
  }
}

/* ==========================================================================
   15. Game Page — Fullscreen
   ========================================================================== */

/**
 * Toggles fullscreen mode for the document.
 * Uses the Fullscreen API to enter or exit fullscreen.
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch(function(err) {
      console.warn("Could not enter fullscreen:", err);
    });
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

/* ==========================================================================
   16. Game Page — Entry Point (gameInit)
   ========================================================================== */

/**
 * Entry point for the Game Page (game.html).
 *
 * Steps:
 *  1. Calls `loadPacks()` to read and validate pack data from localStorage.
 *  2. If null (absent, malformed, or invalid), reveals `#no-data-msg` and returns
 *     without binding keyboard or attempting to render the board (Req 5.2, 5.3).
 *  3. If multiple packs and none selected, shows pack selection screen.
 *  4. On valid data: builds initial game state, renders the board for session 0,
 *     initialises all display widgets, and binds the keyboard handler.
 *
 * Requirements: 5.2, 5.3, 8.3, 9.1
 */
function gameInit() {
  var packData = loadPacks();

  if (packData === null) {
    // No valid data — show error message, do not bind keyboard (Req 5.2, 5.3)
    var noDataMsg = document.getElementById("no-data-msg");
    if (noDataMsg) noDataMsg.removeAttribute("hidden");
    return;
  }

  // If no pack selected (multiple packs), show selection screen
  if (!packData.selectedPack) {
    showPackSelection(packData.packs);
    return;
  }

  // Initialize DOM cache for better performance
  DOM.init();

  // Build initial state (Req 8.3, 9.1)
  gameState = buildGameState(packData.selectedPack);

  // Update team labels with custom names
  var team1Label = document.querySelector("#team1-panel .team-label");
  var team2Label = document.querySelector("#team2-panel .team-label");
  if (team1Label) team1Label.textContent = gameState.team1Name;
  if (team2Label) team2Label.textContent = gameState.team2Name;

  // Render the board and initialise all displays
  renderBoard(0);                // renders session 0 board + nav buttons
  updateActiveTeamDisplay();     // highlights Team 1 as active (Req 9.1)
  updateStrikeDisplay();         // shows 0 strikes (Req 8.3)
  updateTimerDisplay();          // shows 00:00

  // Bind keyboard handler (Req 6.1, 9.2, 10.2, 11.1)
  document.addEventListener("keydown", handleKey);
  
  // Bind fullscreen button click handler
  var fullscreenBtn = document.getElementById("fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }
}

/* ==========================================================================
   16. Results Page — Data & Rendering
   ========================================================================== */

/**
 * Persists both teams' current scores to localStorage under the key
 * `familyFeudResults` just before navigating to `results.html`.
 * Also saves the score to the pack's lastScore field.
 *
 * Written value: `{ team1: gameState.scores[0], team2: gameState.scores[1], team1Name, team2Name }`
 *
 * Any localStorage error is swallowed silently — the navigation to
 * `results.html` proceeds regardless, where `loadResults()` will detect the
 * missing data and show an error message.
 *
 * Requirements: 11.6, 13.1
 */
function saveResults() {
  try {
    // Save results for results page
    localStorage.setItem(
      "familyFeudResults",
      JSON.stringify({ 
        team1: gameState.scores[0], 
        team2: gameState.scores[1],
        team1Name: gameState.team1Name,
        team2Name: gameState.team2Name
      })
    );
    
    // Save score to the pack
    var selectedPackId = sessionStorage.getItem("familyFeudSelectedPack");
    if (selectedPackId) {
      var packs = loadFromStorage();
      if (packs) {
        var packIndex = packs.findIndex(function(p) { return p.id === selectedPackId; });
        if (packIndex !== -1) {
          packs[packIndex].lastScore = {
            team1: gameState.scores[0],
            team2: gameState.scores[1],
            timestamp: Date.now()
          };
          saveToStorage(packs);
        }
      }
    }
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
 * @param {string} team1Name - Team 1's name.
 * @param {string} team2Name - Team 2's name.
 * @returns {string} Winner announcement text
 */
function determineWinner(team1, team2, team1Name, team2Name) {
  team1Name = team1Name || "TEAM 1";
  team2Name = team2Name || "TEAM 2";
  
  if (team1 > team2) return team1Name.toUpperCase() + " WINS!";
  if (team2 > team1) return team2Name.toUpperCase() + " WINS!";
  return "IT'S A TIE!";
}

/**
 * Populates the Results Page with final scores and the winner announcement.
 *
 * Steps:
 *  1. Writes `data.team1` to `#team1-final-score` (Req 13.3).
 *  2. Writes `data.team2` to `#team2-final-score` (Req 13.3).
 *  3. Updates team labels if custom names provided.
 *  4. Sets `#winner-banner` text to `determineWinner(...)` (Req 13.4, 13.5, 13.6).
 *
 * Requirements: 13.3, 13.4, 13.5, 13.6
 *
 * @param {{ team1: number, team2: number, team1Name?: string, team2Name?: string }} data - Validated results data.
 */
function renderResults(data) {
  // Update team labels if custom names provided
  if (data.team1Name) {
    var team1Label = document.querySelector("#team1-result-panel .score-team-label");
    if (team1Label) team1Label.textContent = data.team1Name;
  }
  
  if (data.team2Name) {
    var team2Label = document.querySelector("#team2-result-panel .score-team-label");
    if (team2Label) team2Label.textContent = data.team2Name;
  }
  
  // Populate score panels (Req 13.3)
  var team1Score = document.getElementById("team1-final-score");
  var team2Score = document.getElementById("team2-final-score");
  if (team1Score) team1Score.textContent = data.team1;
  if (team2Score) team2Score.textContent = data.team2;

  // Set winner announcement (Req 13.4, 13.5, 13.6)
  var banner = document.getElementById("winner-banner");
  if (banner) banner.textContent = determineWinner(data.team1, data.team2, data.team1Name, data.team2Name);
}

/* ==========================================================================
   17. Results Page — Entry Point (resultsInit)
   ========================================================================== */

/**
 * Removes `familyFeudResults` from localStorage (preserving `familyFeudSessions`)
 * and navigates back to the Setup Page.
 *
 * Requirements: 13.7
 */
function handlePlayAgain() {
  try {
    localStorage.removeItem("familyFeudResults");
  } catch (e) { /* ignore */ }
  window.location = "index.html";
}

/**
 * Entry point for the Results Page (results.html).
 *
 * - Calls `loadResults()`; on null shows `#error-msg` and returns without
 *   rendering scores or winner announcement (Req 13.2).
 * - On valid data: calls `renderResults(data)`, reveals and binds `#play-again-btn`.
 *
 * Requirements: 13.1, 13.2, 13.7
 */
function resultsInit() {
  var data = loadResults();

  if (data === null) {
    var errorMsg = document.getElementById("error-msg");
    if (errorMsg) errorMsg.removeAttribute("hidden");
    return;
  }

  renderResults(data);

  var playAgainBtn = document.getElementById("play-again-btn");
  if (playAgainBtn) {
    playAgainBtn.removeAttribute("hidden");
    playAgainBtn.addEventListener("click", handlePlayAgain);
  }
}

/* ==========================================================================
   18. Page Dispatcher — init()
   ========================================================================== */

(function init() {
  const page = document.body.dataset.page;
  if (page === "setup")   setupInit();
  if (page === "game")    gameInit();
  if (page === "results") resultsInit();
})();
