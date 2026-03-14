# Rift Manager — Task Backlog

> Tasks are worked on by Claude Code. Update status when starting or finishing.

---

## IN PROGRESS

### Task #3 — FM Game Loop MVP (ui.js + main.js + css)

**Already done (data/game layer):**
- js/data/teams.js — 10 LCS teams (C9, TL, 100T, FLY, EG, DIG, NRG, SR, GG, IMT)
- js/data/players.js — 50+ players with FM 12-attribute schema rated 1-20
- js/game/state.js — initGame, buildSeason, advanceWeek, getStandings, addNews
- index.html — FM shell: intro, top bar, sidebar, all panels, match viewer
- js/game/simulation.js — v4 FM-quality sim engine (1737 lines)
- js/ui/map.js — 2D LoL map, works fine, do not touch

**STEP 1 — css/style.css**
Add FM-style CSS (keep all existing match/PBP/map/draft styles, just ADD):
- Intro: .intro-screen .intro-logo .intro-title .intro-sub .intro-card .team-select-grid .team-select-card .btn-start
- Top bar: .top-bar .top-bar-left/center/right .top-team-name .top-week .top-stat .ts-label .ts-val .btn-advance
- Layout: .game-shell .game-body .sidebar .nav-item .nav-divider .main-content
- Panels: .panel (display:none by default) .panel.active (display:block) .panel-header .panel-tabs .ptab .ptab.active
- Dashboard: .dashboard-grid (2x2 grid) .dash-card .dash-card-title .next-match-info .news-feed .news-item
- Squad: .squad-table .squad-row .overall-badge .morale-bar
- Player profile: .profile-grid .attr-section .attr-row .attr-bar-bg .attr-bar-fill .champ-pill
- Transfers/Finances/Schedule: basic table/grid styles
- .coming-soon .cs-icon .cs-title .cs-desc (used by Training and Scouting panels)
- .mini-standings .mini-row

**STEP 2 — js/ui.js (FULL REWRITE)**
Old file is TFT code. Replace entirely with:
- showMain(panelName) — show correct panel, highlight sidebar nav, call render fn
- renderTopBar() — populate top bar from G state using fmtMoney helper
- renderDashboard() — next match widget, team stats, mini standings, news feed
- renderSquad(tab) — starters/academy tab, player table with overall/age/salary/morale
- renderPlayerProfile(playerId) — full FM player view: 12 attrs in Technical/Mental sections with color bars
- renderTactics() — playstyle selector (engage/poke/pick/protect/splitpush/scaling)
- renderTransfers(tab) — free-agents/listed, sign/release buttons
- renderFinances() — budget, wages, sponsor income, weekly balance projection
- renderLeague() — full standings table, highlight human row
- renderSchedule() — all 9 weeks with results or upcoming
- renderIntro() — team-select grid from TEAMS_DATA
- renderMatchDraft(blueTeam, redTeam, draftResult) — champion picks display
- Keep statAbbr(), statLabel() helpers (already correct in current file top section)
- fmtMoney(n) helper: 3500000 -> "$3.5M", 420000 -> "$420K"
- overallColor(ovr) helper: green >14, yellow 10-14, red <10

**STEP 3 — js/main.js (FULL REWRITE)**
Old file is TFT code. Replace entirely with:
- On page load: renderIntro(), showScreen('screen-intro')
- onSelectTeam(teamId) — highlight card, enable #btn-start, store selectedTeamId
- onStartGame() — initGame(selectedTeamId), showScreen('screen-game'), renderAll()
- onAdvanceWeek() — advanceWeek(), check humanMatch, renderTopBar(), refresh current panel
- onPlayMatch() — show screen-match, draftChampions(), renderMatchDraft(), show #draft-phase
- onStartMatch() — simulateMatch(), hide draft, show pbp-container, startPBP(events)
- onSkipMatch() — quickSimulate(), show result immediately
- returnFromMatch() — record result in G, show screen-game, refresh dashboard
- startPBP(events) — initMapVisualization(), iterate events with setTimeout, updateMap(ev), append lines to #pbp-events
- showMain(name) — switch panel + sidebar + call render fn
- renderAll() — renderTopBar + renderDashboard

**CRITICAL: G is declared in state.js as `let G = null`. Do NOT redeclare G in main.js.**
**Old main.js starts with `const G = {...}` — DELETE that entire block.**

Script load order (already correct in index.html):
teams.js -> champions.js -> players.js -> state.js -> simulation.js -> map.js -> ui.js -> main.js

Sim API:
- simulateMatch(blueTeamArr, redTeamArr, blueName, redName) — returns { winner:'blue'/'red', events:[], blueKills, redKills, blueDragons, redDragons, blueTowers, redTowers, duration }
- quickSimulate(blueTeamArr, redTeamArr) — returns 'blue' or 'red'
- draftChampions(blueTeamArr, redTeamArr) — returns { blue:[{pos,player,champion},...], red:[...], blueSynergies:[], redSynergies:[] }
- getActiveRoster(teamId) — returns array of 5 player objects in POSITIONS order [top,jungle,mid,adc,support]

**STEP 4 — Smoke test**
Open in browser, pick team, advance weeks, play match, verify PBP + map + no console errors.

---

## BACKLOG

- Training screen: Scrimmages (+team attrs), Solo Queue (+individual), Stream (+fans)
- Player development: young players improve weekly, veterans decline
- Contract expiry: yearsLeft-- each season end
- Transfer negotiations with budget check
- Scouting: discover hidden talent from other regions
- Playoffs: top-6 bracket after 9 regular weeks
- International: MSI (Spring top-2), Worlds (top-3 overall)
- Rival match intensity bonus
- Save/Load via localStorage

---

## DONE

### Task #1 — FM-Grade Sim Engine
simulation.js v4: 1737 lines, 65+ champion archetypes, position tracking, LoL-accurate objectives

### Task #2 — Data Layer
teams.js, players.js, state.js, index.html all rewritten for FM game loop
