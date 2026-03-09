# Rift Manager — Task Backlog

> Tasks are worked on by Claude Code. Update status when starting (`🔄 In Progress`) or finishing (`✅ Done`).

---

## 🔄 In Progress

### Task #1 — Playwright Playtest + Balance Loop
**Status:** Pending (scheduled to auto-run when tokens reset)

Replace the fake `playtest.js` with a real browser-driven Playwright test. Run 10 full playthroughs × 10 balance iterations (100 total), adjusting `config.js` / `simulation.js` toward targets after each batch, then commit and push.

**Balance targets:** Human avg wins 6.5–7.5/14, playoff rate 45–60%, AI WR all 45–55%, kills ~21, towers ~9, drakes ~3, barons ~1.

**Steps:**
1. `npm install playwright && npx playwright install chromium`
2. Serve locally (`npx serve .` or `python -m http.server 8080`)
3. Write `playwright-playtest.js` — drives real browser, makes AI shop decisions via DOM clicks, collects results from DOM after each of 14 rounds
4. Loop: run 10 playthroughs → analyze stats → adjust constants → repeat × 10
5. `git commit` and `git push` with full summary of changes

**Key files:** `index.html`, `js/ui.js`, `js/main.js`, `js/game/simulation.js`, `js/data/config.js`

**DO NOT edit `playtest.js`** — it is a known-bad approximation.

---

## 📋 Pending

### Task #2 — LoL Map Visualization in Play-by-Play
Animated SVG/Canvas LoL map silhouette with blue and red champion dots that move and react to each PBP event as it fires.

- Dots at correct lane positions (top/jungle/mid/adc/support)
- Disappear on death, respawn at base after ~5s
- Objectives (dragon pit, baron pit, towers) light up when taken
- Responsive, no external libraries, pure CSS/JS animation

**Key files:** `js/ui.js` (startPlayByPlay, addEventLine), `index.html` (pbp-container), `css/style.css`

---

### Task #3 — Team Planner / Roster Builder
TFT-style planning board as a new tab where the player can slot in hypothetical rosters and see live synergy previews without affecting game state.

- Filter players by position, tier, region, trait, name search
- 5-slot planner board with live trait/region synergy calculation
- Projected team rating bars
- Clear/reset button

**Key files:** `index.html` (new tab), `js/ui.js` (renderPlanner), `js/data/players.js`, `js/game/economy.js` (calcTraitSynergies/calcRegionSynergy), `css/style.css`

---


### Task #6 — Champion-Specific Ult Callouts in PBP
Make PBP commentary reference champion ultimates by name ~40% of the time for kill/teamfight events, 100% for clutch comebacks.

- New `CHAMPION_ULTS` map: champion → { ult: 'Name', ultDesc: 'impact phrase' }
- Cover all champions currently in PLAYER_TEMPLATES pool
- Event text: "X uses [Dragon's Rage] to kick Y into their team!"

**Key files:** `js/data/champions.js` (add CHAMPION_ULTS), `js/game/simulation.js` (simulateLaning, simulateMidGame, simulateLateGame)

---

## ✅ Done

- T0 Rookie starter pack + roster lock enforcement
- Play-by-play with line-by-line reveal + skip button
- T1 players, pool expansion, LATAM rename
- Balance pass (10 rounds × 20 iterations via playtest.js approximation)
- Owned shop player highlight (soft yellow border)
- **Major update (2026-03-08):** 30+ fixes including dragon soul→4 dragons, baron attribution, star upgrade placement, per-player trait/region bonuses, multiple region synergies, auto-replace T0 rookies, AI T1 starts, level cap 5→9, TFT tier odds, PBP event sorting, blue/red PBP coloring, Diamond color change, null region hidden, roster modal from standings, star badges in draft, page refresh warning
- **2026-03-09:** Real match sim — replaced deriveMatchStats with tally system; all stats (kills/towers/dragons/barons/gold) now derived from actual simulation events. Per-player KDA breakdown in results (Task #4 ✅). Gold lead tug-of-war bar with final totals (Task #5 ✅). Bracket screen Continue button. Mobile pull-to-refresh fix. PBP color coding flipped (team=left, event type=right).
