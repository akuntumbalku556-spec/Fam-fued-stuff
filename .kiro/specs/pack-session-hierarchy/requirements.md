# Requirements Document

## Introduction

This document specifies requirements for adding a "Pack" hierarchical level to the Family Feud game, transforming the current Menu → Session → Question structure into Menu → Pack → Session → Question. Each pack will contain multiple sessions and have customizable team names, allowing users to organize different game sessions with different teams using local browser storage.

## Glossary

- **Pack**: A container that groups multiple sessions together with associated team names
- **Session**: A game round containing a question and multiple answers (existing concept)
- **Menu**: The setup page (index.html) where users configure game data
- **Game_Data_Store**: The browser localStorage mechanism that persists packs, sessions, and configuration
- **Pack_Panel**: A collapsible UI section representing a single pack with its sessions
- **Team_Names**: Two customizable string labels identifying the competing teams within a pack
- **Session_Panel**: A UI section representing a single session with question and answers (existing concept)

## Requirements

### Requirement 1: Pack Data Structure

**User Story:** As a game organizer, I want packs to contain multiple sessions and team names, so that I can organize different games with different teams.

#### Acceptance Criteria

1. THE Game_Data_Store SHALL store an array of pack objects where each pack contains a unique identifier, two team name strings, and an array of session objects
2. WHEN a pack is created, THE Game_Data_Store SHALL assign it a unique identifier that persists across browser sessions
3. THE Game_Data_Store SHALL validate that each pack contains at least one session object
4. THE Game_Data_Store SHALL validate that each pack contains exactly two team name strings
5. THE Game_Data_Store SHALL validate that team name strings are between 1 and 50 characters in length
6. THE Game_Data_Store SHALL reject pack data where the sessions array is empty
7. THE Game_Data_Store SHALL maintain backward compatibility by migrating existing session-only data to a single default pack on first load

### Requirement 2: Pack Creation and Management

**User Story:** As a game organizer, I want to add and manage packs from the menu, so that I can create multiple distinct game configurations.

#### Acceptance Criteria

1. THE Menu SHALL display an "Add Pack" button above the "Add Session" button
2. WHEN the "Add Pack" button is clicked, THE Menu SHALL create a new pack with default team names "Team 1" and "Team 2" and one empty session
3. THE Menu SHALL support between 1 and 10 packs in the Game_Data_Store
4. WHEN the pack count reaches 10, THE Menu SHALL disable the "Add Pack" button
5. THE Menu SHALL display a "Delete Pack" button for each pack panel
6. WHEN a pack is deleted and only one pack remains, THE Menu SHALL disable all "Delete Pack" buttons
7. THE Menu SHALL preserve the delete button disabled state when rendering with a single pack

### Requirement 3: Pack Panel Display

**User Story:** As a game organizer, I want each pack to have its own collapsible panel, so that I can focus on configuring one pack at a time.

#### Acceptance Criteria

1. THE Menu SHALL render each pack as a collapsible Pack_Panel with a header showing the pack number
2. WHEN a Pack_Panel header is clicked, THE Menu SHALL toggle the visibility of that pack's content
3. THE Menu SHALL display pack numbers sequentially starting from 1
4. THE Pack_Panel SHALL display two text input fields for team names in its header
5. THE Pack_Panel SHALL display all sessions belonging to that pack within the panel body
6. WHEN pack content is collapsed, THE Menu SHALL hide all session panels within that pack
7. WHEN pack content is expanded, THE Menu SHALL show all session panels within that pack
8. THE Menu SHALL persist the expanded or collapsed state of each pack in the Game_Data_Store

### Requirement 4: Team Name Customization

**User Story:** As a game organizer, I want to customize team names for each pack, so that the game reflects the actual team identities.

#### Acceptance Criteria

1. THE Pack_Panel SHALL display two labeled text input fields for "Team 1 Name" and "Team 2 Name"
2. THE Menu SHALL set the maximum character length for team name inputs to 50 characters
3. WHEN a team name input changes, THE Menu SHALL save the updated team names to the Game_Data_Store within 500 milliseconds
4. THE Menu SHALL validate that neither team name is empty when starting a game
5. WHEN team names are empty during game start validation, THE Menu SHALL display an error message identifying the pack number
6. THE Menu SHALL trim whitespace from team names before saving to the Game_Data_Store
7. THE Game_Data_Store SHALL initialize new packs with default team names "Team 1" and "Team 2"

### Requirement 5: Session Scope within Packs

**User Story:** As a game organizer, I want sessions to belong to specific packs, so that each pack maintains its own set of questions.

#### Acceptance Criteria

1. WHEN the "Add Session" button is clicked, THE Menu SHALL add a new session to the currently selected pack
2. THE Menu SHALL display the "Add Session" button within each Pack_Panel
3. THE Menu SHALL enforce that each pack contains between 1 and 10 sessions
4. WHEN a pack's session count reaches 10, THE Menu SHALL disable the "Add Session" button for that pack only
5. WHEN a session is deleted, THE Menu SHALL remove it from its parent pack only
6. THE Menu SHALL maintain the existing session validation rules (question required, at least one answer) within pack context
7. THE Menu SHALL re-sequence session numbers within a pack when a session is deleted

### Requirement 6: Game Page Pack Selection

**User Story:** As a game host, I want to select which pack to play on the game page, so that I can run games with the correct team names and sessions.

#### Acceptance Criteria

1. WHEN the game page loads, THE Game_Page SHALL read all packs from the Game_Data_Store
2. WHEN only one pack exists, THE Game_Page SHALL automatically load that pack's sessions and team names
3. WHEN multiple packs exist, THE Game_Page SHALL display a pack selection screen before loading the game board
4. THE Pack_Selection_Screen SHALL display each pack with its pack number and team names
5. WHEN a pack is selected, THE Game_Page SHALL load that pack's sessions and display the team names in the score panels
6. THE Game_Page SHALL replace "TEAM 1" and "TEAM 2" labels with the selected pack's team names
7. THE Game_Page SHALL maintain all existing game functionality (scoring, strikes, timer) with the selected pack's data

### Requirement 7: Pack Navigation

**User Story:** As a game organizer, I want to easily navigate between packs, so that I can quickly review and edit different game configurations.

#### Acceptance Criteria

1. THE Menu SHALL display pack panels in sequential order from Pack 1 to Pack N
2. WHEN a pack is deleted, THE Menu SHALL re-sequence remaining pack numbers without gaps
3. THE Menu SHALL support keyboard navigation with Tab key moving between team name inputs and session controls within a pack
4. THE Menu SHALL scroll the pack into view when it is expanded
5. WHEN the Menu is loaded, THE Menu SHALL expand the first pack by default
6. THE Menu SHALL collapse all other packs by default when loaded

### Requirement 8: Data Migration and Backward Compatibility

**User Story:** As an existing user, I want my current session data to continue working, so that I don't lose my configured games.

#### Acceptance Criteria

1. WHEN the Menu loads and detects session-only data format in the Game_Data_Store, THE Menu SHALL migrate the data to a single pack with default team names
2. THE Migration_Process SHALL preserve all existing session questions and answers exactly
3. THE Migration_Process SHALL set the migrated pack's team names to "Team 1" and "Team 2"
4. WHEN migration completes, THE Menu SHALL save the new pack structure to the Game_Data_Store
5. THE Migration_Process SHALL execute only once per browser storage instance
6. THE Game_Data_Store SHALL add a version marker to distinguish pack-based data from legacy session-only data
7. WHEN the Game_Data_Store contains the version marker, THE Menu SHALL skip migration

### Requirement 9: Pack Validation

**User Story:** As a game organizer, I want validation errors to identify specific packs, so that I can quickly fix configuration issues.

#### Acceptance Criteria

1. WHEN the "Start Game" button is clicked, THE Menu SHALL validate all packs before navigation
2. THE Menu SHALL display validation error messages that include the pack number for context
3. THE Validation_Error_Message SHALL identify missing team names by pack number (e.g., "Pack 2: Team names are required")
4. THE Validation_Error_Message SHALL identify missing questions by pack and session number (e.g., "Pack 1, Session 3: question is required")
5. WHEN validation fails for any pack, THE Menu SHALL prevent navigation to the game page
6. THE Menu SHALL display all validation errors simultaneously, not just the first error encountered
7. THE Menu SHALL clear validation errors when the user corrects the invalid data

### Requirement 10: Pack Deletion Confirmation

**User Story:** As a game organizer, I want to be warned before deleting a pack with configured sessions, so that I don't accidentally lose work.

#### Acceptance Criteria

1. WHEN a pack contains more than one session or any non-empty questions, THE Menu SHALL display a confirmation dialog before deletion
2. THE Confirmation_Dialog SHALL display the pack number and session count
3. WHEN the user confirms deletion, THE Menu SHALL remove the pack from the Game_Data_Store
4. WHEN the user cancels deletion, THE Menu SHALL preserve the pack and close the dialog
5. WHEN a pack contains only one empty session, THE Menu SHALL delete the pack without confirmation
6. THE Menu SHALL focus the next pack after deletion completes
