# Rift Manager — Game Design Document

## Vision
Football Manager meets League of Legends esports. You are a first-time head coach joining the LCS. Pick a team, manage your roster, win matches, climb the standings, and compete for Worlds.

## Game Loop
1. Pick an LCS team from the intro screen
2. Main game shell appears (FM-style layout)
3. Each "turn" is one week — click Advance to progress
4. Each week has one match (round-robin schedule)
5. You can Play Match (watch PBP) or let it auto-simulate
6. After 9 weeks = end of regular season
7. Top 6 teams enter playoffs
8. Spring Split → offseason transfers → Summer Split → Worlds

## Layout (FM-Style)
```
[ TOP BAR: Team Name | Week | Budget | Wages/wk | Fans | Record | [Advance ▶] ]
[ SIDEBAR ] [ MAIN CONTENT PANEL ]
  Dashboard
  Squad
  Tactics
  Training
  Transfers
  Scouting
  Finances
  ─────────
  League
  Schedule
```

## Player Attributes (FM 1-20 scale)

**Technical** (execution quality):
- Mechanics — mechanical skill, outplay potential
- CS Accuracy — farming consistency
- TF Positioning — teamfight positioning
- Map Movement — macro movement, roaming
- Objective Execution — drake/baron/tower decisions
- Champion Pool Depth — range of viable champions

**Mental** (decision quality):
- Decision Making — in-fight decisions
- Game Sense — reading the game state
- Communication — shotcalling, pings
- Leadership — morale effect on teammates
- Adaptability — adjusting to meta/opponent
- Composure — performance under pressure

Overall = average of all 12 attributes (mapped to 1-99 display scale)
CA = Overall / 99 * 200 (FM-style Current Ability 1-200)

## Teams (LCS 2025)
- Cloud9 (C9) — prestige 9, budget $3.5M
- Team Liquid (TL) — prestige 10, budget $4.0M
- 100 Thieves (100T) — prestige 8, budget $3.0M
- FlyQuest (FLY) — prestige 6, budget $2.2M
- Evil Geniuses (EG) — prestige 7, budget $2.8M
- Dignitas (DIG) — prestige 5, budget $1.8M
- NRG Esports (NRG) — prestige 6, budget $2.4M
- Shopify Rebellion (SR) — prestige 5, budget $2.0M
- Golden Guardians (GG) — prestige 4, budget $1.6M
- Immortals (IMT) — prestige 4, budget $1.5M

## Season Structure
- Spring Split: 9 weeks, each team plays every other team once (round-robin)
- Top 6 → playoffs bracket
- Summer Split follows after offseason
- MSI: top 2 from Spring
- Worlds: top 3 overall

## Match Simulation
Uses simulation.js v4 engine:
- Draft phase: draftChampions() assigns champions based on player champion pool + team playstyle
- Simulation: 3 phases (laning 0-14min, midgame 14-26min, lategame 26+min)
- PBP events: kills, dragons, barons, towers, teamfights — each with champion names and ult descriptions
- Map visualization: 10 dots (5 per team) move based on ev.positions from sim events
- Gold chart: shows gold lead over time

## Tactics (Playstyles)
- Engage: frontload fights, hard engage, teamfight focused
- Poke: chip down before committing
- Pick: isolate and eliminate single targets
- Protect: shield the carry, peel
- Splitpush: side lane pressure, force decisions
- Scaling: survive early, dominate late

## Finances
- Budget = total cash available for transfers
- Weekly wages bill = sum of all player salaries
- Sponsor income = fans / 8 (per week)
- Net per week = sponsor income - wages bill
- Budget changes each week by net

## File Architecture
```
index.html
css/
  style.css
js/
  data/
    teams.js      — TEAMS_DATA array
    players.js    — PLAYER_DB array + calcOverall, calcCA helpers
    champions.js  — champion pool data
  game/
    state.js      — G state object, initGame, advanceWeek, getStandings
    simulation.js — simulateMatch, quickSimulate, draftChampions
  ui/
    map.js        — LoL map visualization (DO NOT MODIFY)
  ui.js           — all render functions
  main.js         — game loop event handlers
```

## Key Global Variables
- `G` — declared in state.js as `let G = null`, set by initGame()
- `TEAMS_DATA` — array from teams.js
- `PLAYER_DB` — array from players.js
- `POSITIONS` — ['top','jungle','mid','adc','support']
- `PLAYSTYLES` — object in state.js

## Notes for Claude
- Do NOT redeclare G in main.js (old TFT main.js had `const G = {...}` — that must be deleted)
- Old TFT files (shop.js, economy.js, config.js, tournament.js) are NOT referenced in new index.html
- map.js is wrapped in IIFE and exposes initMapVisualization(), updateMap(ev), setMapSkipMode(bool)
- simulateMatch returns an object with: winner, events[], blueKills, redKills, etc.
- getActiveRoster(teamId) returns array of 5 player objects (can be null for empty slots)
