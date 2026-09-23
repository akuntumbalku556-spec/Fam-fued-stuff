# Pack Feature Documentation

## Overview

The Family Feud game now supports **Packs** - a new hierarchical level that organizes sessions with customizable team names. Each pack can be started individually and stores its last played score.

## New Structure

### Before (Legacy)
```
Menu → Session → Question
```

### After (Current)
```
Menu → Pack → Session → Question
```

## Key Features

### 1. Multiple Packs
- Create up to 10 packs per game
- Each pack can contain 1-10 sessions
- Perfect for organizing different games with different teams

### 2. Custom Team Names
- Each pack has two customizable team names (max 50 characters)
- Default names: "Team 1" and "Team 2"
- Team names appear in the pack header, during gameplay, and on results page

### 3. Individual Pack Gameplay
- **Start This Pack** button on each pack
- Play individual packs without affecting others
- Validate only the pack being started
- Each pack tracks its own score history

### 4. Score Storage
- Last played score is saved to each pack
- Score displayed in golden banner at top of pack body
- Shows: Team names and their final scores
- Persists across browser sessions

### 5. Collapsible Pack Panels
- Click on the pack header to expand/collapse
- First pack is expanded by default
- Expanded state is saved in localStorage

### 6. Pack Selection Screen (Game Page)
- When multiple packs exist, the game shows a selection screen
- Displays pack number, team names, and session count
- Selected pack is remembered for the browser session

### 7. Data Migration
- Existing session-only data is automatically migrated to a single pack
- Migration happens once on first load
- No data loss - all questions and answers are preserved

## Usage

### Setup Page (index.html)

1. **Add Pack**: Click "Add Pack" button at the top
2. **Customize Team Names**: Enter team names in the pack header inputs
3. **Expand/Collapse**: Click the pack header to toggle visibility
4. **Add Sessions**: Click "Add Session" within each pack
5. **Delete Pack**: Click "Delete Pack" (disabled when only 1 pack remains)
6. **Start Individual Pack**: Click "Start This Pack" to play just that pack
7. **View Last Score**: See the golden score banner if pack has been played
8. **Start All**: Click "Start Game" at bottom to choose from all packs

### Game Page (game.html)

1. **Direct Start**: Loads immediately if started from individual pack button
2. **Selection Screen**: Shows when "Start Game" clicked with multiple packs
3. **Team Names**: Custom team names appear on score panels
4. **All Features Work**: Timer, scoring, strikes work as before
5. **Score Saved**: Final scores automatically saved to pack on game end

### Results Page (results.html)

1. **Custom Team Names**: Shows your pack's team names
2. **Winner Announcement**: Uses actual team names
3. **Final Scores**: Displays both teams' scores
4. **Play Again**: Returns to setup page

## Data Structure

### localStorage Keys

- **`familyFeudPacks`**: Main storage (new format with schema version)
- **`familyFeudSessions`**: Legacy format (auto-migrated)
- **`familyFeudTimerConfig`**: Timer settings
- **`familyFeudResults`**: Temporary game results (for results page)

### sessionStorage Keys

- **`familyFeudSelectedPack`**: Currently selected pack ID (cleared on browser close)

### Pack Object Structure

```javascript
{
  id: "pack-1234567890",           // Unique identifier
  team1: "Team Lazarus",           // Team 1 name
  team2: "Team Fishcake",          // Team 2 name
  expanded: true,                  // UI state
  lastScore: {                     // Last played score (optional)
    team1: 150,
    team2: 200,
    timestamp: 1234567890
  },
  sessions: [                      // Array of session objects
    {
      question: "Question text",
      answers: ["Answer 1", "Answer 2", ...]
    },
    ...
  ]
}
```

### Storage Format

```javascript
{
  schemaVersion: "1.0",
  packs: [ /* array of pack objects */ ]
}
```

## Workflow Examples

### Scenario 1: Tournament with Multiple Rounds

**Pack A - Round 1: Morning Session**
- Team 1: "Red Dragons"
- Team 2: "Blue Phoenixes"
- Sessions: 3 questions
- Last Score: Red Dragons 120, Blue Phoenixes 150 ✅

**Pack B - Round 2: Afternoon Session**
- Team 1: "Red Dragons"
- Team 2: "Blue Phoenixes"  
- Sessions: 3 questions
- Last Score: Red Dragons 180, Blue Phoenixes 140 ✅

**Result**: Each round's score is tracked separately!

### Scenario 2: Different Teams Each Week

**Pack A: Week 1 - School Tournament**
- Team 1: "Class 10A"
- Team 2: "Class 10B"
- Last Score: Class 10A 200, Class 10B 180

**Pack B: Week 2 - Family Game Night**
- Team 1: "Team Lazarus"
- Team 2: "Team Fishcake"
- Last Score: Not played yet

### Scenario 3: Practice vs Competition

**Pack A: Practice Round**
- Team 1: "Practice Team 1"
- Team 2: "Practice Team 2"
- Last Score: 100, 95

**Pack B: Competition Round**
- Team 1: "Team Alpha"
- Team 2: "Team Beta"
- Last Score: 250, 230

## Limits

- **Packs**: 1-10 per game
- **Sessions per Pack**: 1-10
- **Answers per Session**: 1-10
- **Team Name Length**: 1-50 characters
- **Question Length**: 200 characters (unchanged)

## Technical Notes

- Pack IDs are generated using `Date.now()` plus random suffix
- Expanded state persists in localStorage
- Selected pack ID stored in sessionStorage (cleared on browser close)
- Scores saved to pack on game completion (via saveResults)
- All existing game mechanics (scoring, timer, strikes) unchanged
- CSS uses gradient headers and collapsible panels for better UX
- Score display uses golden gradient to stand out
- Individual pack validation before starting

## New Features Summary

✅ **Individual Pack Start** - Play any pack directly  
✅ **Score Storage** - Each pack remembers its last score  
✅ **Score Display** - Golden banner shows last played results  
✅ **Custom Team Names** - Shown throughout the game flow  
✅ **Validation** - Only validates the pack being played  
✅ **Results Page** - Shows custom team names in winner announcement
