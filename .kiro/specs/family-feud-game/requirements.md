# Requirements Document

## Introduction

A custom, offline-capable Family Feud web game built with only HTML, CSS, and Vanilla JavaScript.
The game consists of two pages: a Setup Page (Stage 1) where a host configures questions and answers for multiple sessions, and a Game Page (Stage 2) where the game is played live. All data is persisted in the browser's LocalStorage so the game works fully offline with no backend.

## Glossary

- **Session**: A single round of play, containing one question and one to ten answers.
- **Answer Slot**: A UI tile representing one answer entry. It displays the slot number when hidden, and the answer text when revealed.
- **Setup_Page**: The HTML page (`index.html`, Stage 1) where the host creates and manages sessions before starting the game.
- **Game_Page**: The HTML page (`game.html`, Stage 2) where the game is displayed and played.
- **Results_Page**: The HTML page (`results.html`, Stage 3) displayed after the final session is completed, showing both teams' final scores and the winner.
- **Active_Team**: The team that is currently selected to receive points from newly revealed answers.
- **Strike**: A visual indicator of a wrong answer. Up to three strikes may be accumulated.
- **LocalStorage**: The browser's built-in key-value storage mechanism used to persist all session data.
- **Host**: The person operating the setup and controlling the game.
- **Player**: A participant in the game, belonging to Team 1 or Team 2.
- **Timer**: A count-up stopwatch display shown on the Game Page during play.
- **Results_Page**: The HTML page (`results.html`, Stage 3) displayed after the final session is completed, showing both teams' final scores and the winner.

---

## Requirements

### Requirement 1: Project File Structure

**User Story:** As a host, I want the game to be delivered as a clean set of static files, so that I can open it directly in a browser without any server setup.

#### Acceptance Criteria

1. THE Game SHALL be structured as a single `index.html` file for the Setup Page, a single `game.html` file for the Game Page, a single `results.html` file for the Results Page, exactly one CSS file inside a `css/` folder, and exactly one JavaScript file inside a `js/` folder.
2. THE Game SHALL function correctly when opened via the `file://` protocol in Chrome, Firefox, Edge, and Safari (versions released within the last 3 years), rendering all UI elements without errors and making no network requests for any assets (scripts, styles, fonts, or images).
3. WHEN the Setup Page is opened via the `file://` protocol, THE Setup_Page SHALL render all UI elements and accept host input within 2 seconds on a modern desktop browser.

---

### Requirement 2: Session Creation on Setup Page

**User Story:** As a host, I want to create multiple sessions with a question and answers, so that I can prepare all rounds of the game in advance.

#### Acceptance Criteria

1. THE Setup_Page SHALL display exactly one session panel on initial load (when no saved data exists in LocalStorage), and SHALL allow multiple sessions to be added after the initial load.
2. WHEN the host clicks the "Add Session" button, THE Setup_Page SHALL append a new empty session panel below the existing sessions.
3. THE Setup_Page SHALL allow up to 10 sessions in total.
4. IF the Setup_Page already contains 10 session panels AND the host clicks "Add Session", THEN THE Setup_Page SHALL disable the "Add Session" button and SHALL NOT add a new session panel.
5. IF a new session panel is created, THEN THE Setup_Page SHALL display exactly one empty answer input box in that session by default.
6. WHEN the host clicks the "Add Answer" button within a session, THE Setup_Page SHALL append a new empty answer input box to that session, up to a maximum of 10.
7. IF the session already contains 10 answer input boxes AND the host clicks "Add Answer", THEN THE Setup_Page SHALL disable the "Add Answer" button for that session and SHALL NOT add a new input box.
8. THE Setup_Page SHALL display a text input box limited to 200 characters for the session's question within each session panel.
9. THE Setup_Page SHALL display a delete/remove button for each session panel, allowing the host to remove a session.
10. IF only one session panel remains AND the host attempts to delete it, THEN THE Setup_Page SHALL disable the delete button for that session and SHALL NOT remove it.
11. THE Setup_Page SHALL label each answer input box with a sequential 1-based integer (e.g., "1", "2", ... "10") in the order they were added.
12. THE Setup_Page SHALL display a delete button for each individual answer input box.
13. IF a session contains only one answer input box AND the host attempts to delete it, THEN THE Setup_Page SHALL disable the delete button for that answer and SHALL NOT remove it.
14. WHEN the host deletes an answer input box, THE Setup_Page SHALL re-sequence the remaining answer labels so they remain sequential and 1-based with no gaps.

---

### Requirement 3: Data Persistence

**User Story:** As a host, I want the session data to be saved automatically, so that I do not lose my setup if I accidentally close or refresh the browser.

#### Acceptance Criteria

1. WHEN the host changes the value of any question or answer input field on the Setup Page, THE Setup_Page SHALL initiate a save of all session data — including all session question texts, answer texts, and the count of answer fields — to LocalStorage within 500 milliseconds of the last change, and SHALL allow the save operation to complete even if it exceeds 500 milliseconds.
2. WHEN the Setup_Page is loaded or refreshed, THE Setup_Page SHALL read all previously saved session data from LocalStorage and restore all session panels together with their question and answer values to match the saved state.
3. THE LocalStorage SHALL store session data under the key `familyFeudSessions`.
4. WHEN the host clicks "Start Game", THE Setup_Page SHALL perform a final save of all session data to LocalStorage before navigating to the Game Page.
5. IF LocalStorage is unavailable in the current browser context, THEN THE Setup_Page SHALL display a warning message to the host indicating that data will not be persisted, and SHALL continue to allow the host to use the Setup Page without persistence, including proceeding to start the game.
6. IF the session data read from LocalStorage on page load is missing, malformed, or unreadable, THEN THE Setup_Page SHALL discard the corrupted data, initialize the Setup Page to its default empty state (one empty session), and display a message to the host indicating that previously saved data could not be restored.

---

### Requirement 4: Starting the Game

**User Story:** As a host, I want to start the game with a single click, so that I can transition from setup to the game view without friction.

#### Acceptance Criteria

1. THE Setup_Page SHALL display a "Start Game" button that is always visible without scrolling (e.g., fixed/sticky positioning).
2. WHEN the host clicks "Start Game", THE Setup_Page SHALL navigate the browser to the Game Page (`game.html`).
3. IF any session has an empty question field OR has no non-empty answer inputs AND the host clicks "Start Game", THEN THE Setup_Page SHALL display a validation error message above the "Start Game" button and SHALL NOT navigate to the Game Page.
4. A session is considered valid WHEN its question field is non-empty AND it has at least one non-empty answer input.

---

### Requirement 5: Game Page — Question and Answer Display

**User Story:** As a host, I want the game page to display the current session's question and answer slots, so that players can see the board clearly.

#### Acceptance Criteria

1. WHEN the Game_Page loads, THE Game_Page SHALL read the session data from LocalStorage and display the first session's question text at the top of the board.
2. IF no session data exists in LocalStorage when the Game_Page loads, THEN THE Game_Page SHALL display a message prompting the host to return to the Setup Page.
3. IF the session data read from LocalStorage is malformed or unreadable, THEN THE Game_Page SHALL display an error message and SHALL NOT attempt to render a game board from the corrupted data.
4. THE Game_Page SHALL render exactly as many answer slots as there are non-empty answers defined for the current session.
5. IF the current session has more than 5 answers, THEN THE Game_Page SHALL display answer slots in a 2-column grid layout: answers 1–5 in the left column and answers 6–10 in the right column.
6. IF the current session has 5 or fewer answers, THEN THE Game_Page SHALL display all answer slots in a single left column.
7. THE Game_Page SHALL determine the column layout based on the total answer count for the session at load time, and SHALL NOT change the layout based on which slots are currently revealed or hidden.
8. THE Game_Page SHALL display each answer slot as hidden by default, showing only the slot number (e.g., "1", "2") when the session is first displayed.
9. WHILE an answer slot is hidden, THE Game_Page SHALL NOT display the answer text for that slot.

---

### Requirement 6: Revealing Answers via Keyboard

**User Story:** As a host, I want to reveal answers using keyboard shortcuts, so that I can control the game board without using a mouse.

#### Acceptance Criteria

1. WHEN the host presses number key "1" through "9" on the keyboard while the Game_Page is active, THE Game_Page SHALL reveal the corresponding answer slot (slot 1 through slot 9 respectively) if that slot exists and is currently hidden.
2. WHEN the host presses number key "0" on the keyboard while the Game_Page is active, THE Game_Page SHALL reveal answer slot 10 if that slot exists and is currently hidden.
3. IF the target answer slot does not exist for the current session (e.g., pressing "8" on a 5-answer session), THEN THE Game_Page SHALL take no action.
4. WHEN an answer slot is revealed, THE Game_Page SHALL display the answer text on that slot.
5. WHEN an answer slot is revealed, THE Game_Page SHALL add 1 point to the Active_Team's score.
6. IF an answer slot is already revealed AND the host presses the corresponding key, THEN THE Game_Page SHALL NOT change the score or toggle the slot back to hidden.
7. WHEN an answer slot is revealed, THE Game_Page SHALL apply a visual state change to that slot (e.g., background color change or text transition) to indicate it has been revealed.

---

### Requirement 7: Strike System

**User Story:** As a host, I want to track wrong answers with a strike indicator, so that the game rules around three strikes can be visually enforced.

#### Acceptance Criteria

1. WHEN the host presses the "X" key on the keyboard AND the current strike count is less than 3, THE Game_Page SHALL increment the strike count by 1 and update the visual strike indicator.
2. THE Game_Page SHALL display exactly 3 strike indicator slots at all times, each slot independently showing an active (struck) or inactive state.
3. IF the current strike count is already 3 AND the host presses the "X" key, THEN THE Game_Page SHALL NOT increment the strike count beyond 3.
4. WHEN the host presses the "/" key on the keyboard, THE Game_Page SHALL atomically reset the strike count to 0 and update all strike indicator slots to inactive in the same operation, with no intermediate state where the count and display are out of sync.
5. THE Game_Page SHALL display the current strike count by showing the corresponding number of strike indicator slots in their active state (e.g., filled "X" icons in red) and the remainder in their inactive state.

---

### Requirement 8: Team Score Tracking

**User Story:** As a host, I want two team scores displayed and updated in real time, so that players can track who is winning throughout the game.

#### Acceptance Criteria

1. THE Game_Page SHALL display a "TEAM 1" label and Team 1's score on the bottom-left of the screen.
2. THE Game_Page SHALL display a "TEAM 2" label and Team 2's score on the bottom-right of the screen.
3. WHEN the Game_Page loads, THE Game_Page SHALL initialise both Team 1's and Team 2's scores to 0 and SHALL complete that initialisation before processing any input that could trigger a score change.
4. WHEN an answer slot is revealed after initialisation is complete, THE Game_Page SHALL add 1 point to the Active_Team's score.
5. WHEN the Active_Team's score changes, THE Game_Page SHALL update the corresponding score display within 100 milliseconds.
6. THE Game_Page SHALL preserve each team's cumulative score across session navigation (scores SHALL NOT reset when moving to a new session).

---

### Requirement 9: Active Team Toggle

**User Story:** As a host, I want to switch which team is currently active, so that points from revealed answers are assigned to the correct team.

#### Acceptance Criteria

1. THE Game_Page SHALL designate Team 1 as the Active_Team on initial load.
2. WHEN the host presses the "\" (backslash) key on the keyboard, THE Game_Page SHALL toggle the Active_Team from Team 1 to Team 2, or from Team 2 to Team 1.
3. THE Game_Page SHALL apply a distinct CSS class or attribute (e.g., `active` class or `aria-selected="true"`) to the Active_Team's score panel that visually differentiates it (e.g., highlighted border or background) from the inactive team's panel.
4. WHEN the Active_Team changes, THE Game_Page SHALL first remove the visual indicator from the previously Active_Team's panel, and only after that removal succeeds SHALL apply the visual indicator to the new Active_Team's panel, completing the full update within 200 milliseconds.
5. IF removal of the visual indicator from the previously Active_Team's panel fails, THEN THE Game_Page SHALL NOT apply the visual indicator to the new Active_Team's panel.

---

### Requirement 10: Timer

**User Story:** As a host, I want a timer displayed in the centre of the bottom bar, so that I can enforce time limits during a round.

#### Acceptance Criteria

1. THE Game_Page SHALL display a timer in the centre of the bottom navigation/status bar, initialised to 00:00 on page load.
2. WHEN the host presses the "T" key while the timer is paused or at 00:00, THE Game_Page SHALL start or resume the timer counting upward from its current value in one-second increments.
3. WHEN the host presses the "T" key while the timer is running, THE Game_Page SHALL pause the timer, retaining its current displayed value.
4. WHEN the host presses the "R" key, THE Game_Page SHALL stop the timer if it is running and reset the displayed value to 00:00.
5. THE Game_Page SHALL display the timer in MM:SS format, where MM is 00–99 and SS is 00–59, continuing to count upward until manually paused or reset.

---

### Requirement 11: Session Navigation on Game Page

**User Story:** As a host, I want to navigate between sessions during the game, so that I can move from one round to the next without returning to the setup screen.

#### Acceptance Criteria

1. THE Game_Page SHALL display a "Next Session" control (button or keyboard shortcut) to advance to the next session.
2. THE Game_Page SHALL display a "Previous Session" control (button or keyboard shortcut) to go back to the previous session.
3. WHEN the host navigates to a new session, THE Game_Page SHALL update the displayed question and answer slots to reflect the new session's data.
4. WHEN the host navigates to a new session, THE Game_Page SHALL reset all answer slots to hidden for that session.
5. WHEN the host navigates to a new session, THE Game_Page SHALL disable both navigation controls for the duration of the transition to prevent simultaneous navigation inputs.
6. WHEN the host is on the last session AND activates the "Next Session" control, THE Game_Page SHALL save both teams' current scores to LocalStorage under the key `familyFeudResults` and SHALL navigate the browser to the Results Page (`results.html`).
7. IF the host is on the first session AND attempts to navigate to the previous session, THEN THE Game_Page SHALL NOT go back and SHALL disable or visually dim the "Previous Session" control.
8. IF there is only one session in total, THEN THE Game_Page SHALL hide both the "Next Session" and "Previous Session" navigation controls entirely.
9. WHEN the host navigates to a new session, THE Game_Page SHALL reset the strike count to 0.

---

### Requirement 12: Visual Design and Usability

**User Story:** As a host, I want a clean and visually clear interface, so that the game is easy to present and players can read the board from a distance.

#### Acceptance Criteria

1. THE Game_Page SHALL use a dark background color (luminance ≤ 20%) with text and answer tile colors that achieve a WCAG contrast ratio of at least 4.5:1 for text smaller than 24px and at least 3:1 for text 24px or larger.
2. THE Setup_Page SHALL visually separate each session panel using a visible border or a distinct background fill that differs from the page background.
3. THE Game_Page SHALL display the question text in a font size of at least 24px.
4. THE Game_Page SHALL display answer slot text in a font size of at least 20px.
5. THE Game_Page SHALL use different background fill colors for hidden and revealed answer slots, and SHALL show answer text only on revealed slots.
6. THE Game_Page SHALL display a keyboard shortcut reference area that is always visible without scrolling, listing the shortcuts for: answer reveal (1–9, 0), strike (X), strike reset (/), team toggle (\), timer start/pause (T), and timer reset (R).


---

### Requirement 13: Results Page

**User Story:** As a host, I want a dedicated Results Page shown after the final session, so that players can clearly see both teams' final scores and who won the game.

#### Acceptance Criteria

1. WHEN the Results_Page loads, THE Results_Page SHALL read both teams' final scores from LocalStorage under the key `familyFeudResults`, where the stored value is a JSON object with numeric fields `team1` and `team2` (e.g., `{"team1": 5, "team2": 3}`).
2. IF the `familyFeudResults` key is absent from LocalStorage, OR the stored value is not parseable as JSON, OR the parsed object is missing a numeric `team1` or `team2` field, THEN THE Results_Page SHALL display an error message indicating scores could not be retrieved, SHALL NOT display any score values or winner announcement, and SHALL provide a link to return to the Setup Page (`index.html`).
3. WHEN the Results_Page has successfully loaded valid scores from LocalStorage, THE Results_Page SHALL display Team 1's final score and Team 2's final score side by side, each labelled with its team name, in a font size of at least 48px.
4. WHEN Team 1's score is greater than Team 2's score, THE Results_Page SHALL display "TEAM 1 WINS!" as the winner announcement.
5. WHEN Team 2's score is greater than Team 1's score, THE Results_Page SHALL display "TEAM 2 WINS!" as the winner announcement.
6. WHEN both teams' scores are equal, THE Results_Page SHALL display "IT'S A TIE!" as the outcome announcement.
7. THE Results_Page SHALL display a "Play Again" button that, when clicked, removes the `familyFeudResults` key from LocalStorage (while preserving `familyFeudSessions`) and navigates the browser to the Setup Page (`index.html`).
8. THE Results_Page SHALL use a dark background color (luminance ≤ 20%) with text and element colors that achieve a WCAG contrast ratio of at least 4.5:1 for text smaller than 24px and at least 3:1 for text 24px or larger.
