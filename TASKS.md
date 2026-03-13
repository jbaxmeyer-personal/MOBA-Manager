# Rift Manager — Task Backlog

> Tasks are worked on by Claude Code. Update status when starting (`🔄 In Progress`) or finishing (`✅ Done`).

---

## 🔄 In Progress

### Task #2 — Rebuild Player Pool (FM-Style Attributes)
Replace the current TFT-style player pool with a large FM-style player database with Technical and Mental attributes.

**Goals:**
- Significantly expand player count (target: 200+ players across all regions)
- Remove TFT-style traits/synergies from player definitions
- Add **Technical attributes** (determine execution quality):
  - Mechanics, CS Accuracy, Teamfight Positioning, Map Movement, Objective Execution, Champion Pool Depth
- Add **Mental attributes** (determine decision quality):
  - Decision Making, Game Sense, Communication, Leadership, Adaptability, Composure Under Pressure
- Attributes rated 1–20 (FM standard)
- Players have a primary role and can have secondary roles with reduced effectiveness
- Players have age (affects development arc: young players improve, veterans decline)
- Players have a "champion pool" list — sim engine uses this to pick champion in draft
- Players have contract info: salary, contract length, expiry season
- Retain region (LCS, LEC, LCK, LPL, LLA, etc.) for scouting/transfer system

**Key files to evaluate first:** `js/data/players.js`, `js/game/economy.js`, `js/data/config.js`

---

## 📋 Pending

---

## ✅ Done

### Task #1 — Rewrite Game Sim Engine (FM-Grade)
Complete rewrite of `js/game/simulation.js` as a 1,737-line FM-quality LoL match simulator.

**Delivered:**
- `CHAMPION_DATA` — 65+ champions with archetypes (ENGAGE, ASSASSIN, POKE, ENCHANTER, etc.) and ultimate descriptions for PBP commentary
- `POS_PRESETS` — named formation tables for every game state (laning, dragon, baron, teamfight, push, nexus, gank, tower sieges)
- Position tracking system: `makePosMap`, `clonePosMap`, `applyPreset`, `moveRole`, `killPlayers` — every event carries `ev.positions`
- LoL-accurate rules: dragon stacks → soul (×1.12), baron buff (×1.25), death timers scaling with game time, item scaling, comeback mechanics
- Role archetypes: SPLITPUSH top split-pushes, ENGAGE supports initiate, ASSASSIN junglers dive, ENCHANTER supports protect carries
- Rich PBP commentary: `dragonPBP`, `baronPBP`, `tfPBP` referencing champion names and ultimate abilities
- Three-phase sim: `simulateLaning` (0-14), `simulateMidGame` (14-26), `simulateLateGame` (26+)
- Speed controls in `js/ui.js`: Pause / 1× / 2× / 4× / Skip (same as FM)
- `js/ui/map.js` rewritten to consume `ev.positions` directly — all dots driven by real sim data
