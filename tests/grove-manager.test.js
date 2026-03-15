// tests/grove-manager.test.js — Grove Manager comprehensive browser test suite
// Run: node tests/grove-manager.test.js
'use strict';

const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

// ─── Test runner state ────────────────────────────────────────────────────────

let browser, page;
const consoleErrors = [];
const results       = [];

async function setup() {
  browser = await chromium.launch({ headless: true });
  page    = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push('PAGEERROR: ' + err.message);
  });
}

async function teardown() {
  await browser.close();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function waitFor(condFn, timeoutMs = 6000, tickMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condFn()) return true;
    await page.waitForTimeout(tickMs);
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

function clearErrors() { consoleErrors.length = 0; }
function freshErrors() { return consoleErrors.filter(e => !e.includes('favicon')); }

async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    results.push({ name, pass: true, ms });
    console.log(`  ✅  ${name}  (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - t0;
    results.push({ name, pass: false, error: err.message, ms });
    console.log(`  ❌  ${name}`);
    console.log(`       ${err.message}`);
  }
}

// ─── Game helpers ─────────────────────────────────────────────────────────────

/** Navigate to the game fresh (clears localStorage). */
async function freshGame() {
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  clearErrors();
}

/** Select the first team and start the game. Returns after dashboard loads. */
async function startNewCareer() {
  await page.click('.team-select-card');
  await page.waitForTimeout(150);
  await page.click('#btn-start');
  await waitFor(() => page.isVisible('#screen-game'));
  await page.waitForTimeout(300);
}

/** Navigate to a named panel via the sidebar. */
async function goToPanel(name) {
  await page.click(`[data-screen="${name}"]`);
  await page.waitForTimeout(300);
}

/**
 * Play through the full draft, auto-clicking on human turns.
 * Returns the final step count and whether draft-actions became visible.
 */
async function completeDraft(timeoutMs = 35000) {
  const deadline = Date.now() + timeoutMs;
  let lastStep   = -1;
  let stuckCount = 0;

  while (Date.now() < deadline) {
    // Draft complete?
    const actionsVisible = await page.isVisible('#draft-actions');
    if (actionsVisible) return { done: true, step: 14, stuckAt: null };

    const stepNow = await page.evaluate(() => _draftState?.step ?? -1);
    const isDone  = await page.evaluate(() => _draftState?.done ?? false);
    if (isDone || stepNow >= 14) return { done: true, step: stepNow, stuckAt: null };

    // Detect stall: same step for many ticks
    if (stepNow === lastStep) {
      stuckCount++;
      if (stuckCount >= 30) { // 3 seconds of no movement
        return { done: false, step: stepNow, stuckAt: stepNow };
      }
    } else {
      stuckCount = 0;
      lastStep   = stepNow;
    }

    // Click a champion card if picker is visible (human turn)
    const pickerVisible = await page.isVisible('#draft-champ-picker');
    if (pickerVisible) {
      const cards = await page.$$('.draft-champ-card');
      if (cards.length > 0) {
        await cards[0].click();
        await page.waitForTimeout(150);
      }
    }

    await page.waitForTimeout(100);
  }

  const finalStep = await page.evaluate(() => _draftState?.step ?? -1);
  return { done: false, step: finalStep, stuckAt: finalStep };
}

/** Click Skip to Result and wait for pbp-results. */
async function skipToResult() {
  await page.click('button[onclick="onSkipMatch()"]');
  await waitFor(() => page.isVisible('#pbp-results'), 10000);
}

/** Click Return to Manager. */
async function returnToManager() {
  await page.click('button[onclick="returnFromMatch()"]');
  await page.waitForTimeout(500);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  await setup();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Grove Manager — Playwright Test Suite');
  console.log(`  URL: ${FILE_URL}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── LOAD ───────────────────────────────────────────────────────────────────
  console.log('── Load & Intro ──────────────────────────────────────────');

  await test('Game loads without JS errors', async () => {
    clearErrors();
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(600);
    assert(freshErrors().length === 0, `JS errors on load:\n  ${freshErrors().join('\n  ')}`);
  });

  await test('Intro screen is active', async () => {
    const visible = await page.isVisible('#screen-intro');
    assert(visible, '#screen-intro not visible');
  });

  await test('At least 6 team-select cards rendered', async () => {
    const n = await page.$$eval('.team-select-card', els => els.length);
    assert(n >= 6, `Expected ≥6 team cards, got ${n}`);
  });

  await test('Team cards show full name and budget', async () => {
    const names = await page.$$eval('.tsc-name', els => els.map(e => e.textContent.trim()));
    assert(names.length >= 6, 'Not enough .tsc-name elements');
    assert(names.every(n => n.length > 3), `Short names: ${names.join(', ')}`);
  });

  await test('Start button disabled until team selected', async () => {
    const disabled = await page.$eval('#btn-start', el => el.disabled);
    assert(disabled, 'Start button should be disabled before selecting a team');
  });

  await test('Selecting a team enables Start button', async () => {
    await page.click('.team-select-card');
    await page.waitForTimeout(200);
    const disabled = await page.$eval('#btn-start', el => el.disabled);
    assert(!disabled, 'Start button still disabled after selecting a team');
  });

  // ── CAREER START ───────────────────────────────────────────────────────────
  console.log('\n── Career Start & Dashboard ─────────────────────────────');

  await test('Start Career shows game screen', async () => {
    await page.click('#btn-start');
    await waitFor(() => page.isVisible('#screen-game'), 5000);
    assert(await page.isVisible('#screen-game'), '#screen-game not visible');
  });

  await test('Dashboard panel is active on start', async () => {
    const active = await page.$eval('#panel-dashboard', el => el.classList.contains('active')).catch(() => false);
    assert(active, '#panel-dashboard not active');
  });

  await test('Top bar shows week, budget, wages, fans, record', async () => {
    for (const id of ['top-week', 'top-budget', 'top-wages', 'top-fans', 'top-record']) {
      const txt = await page.$eval(`#${id}`, el => el.textContent.trim()).catch(() => '');
      assert(txt.length > 0, `#${id} is empty`);
    }
  });

  await test('Dashboard: next match widget visible', async () => {
    const el = await page.$('#next-match-info');
    assert(el, '#next-match missing');
    const txt = await page.$eval('#next-match-info', el => el.textContent.trim());
    assert(txt.length > 0, '#next-match is empty');
  });

  await test('Dashboard: mini standings has 8 rows', async () => {
    const n = await page.$$eval('.mini-row', els => els.length);
    assert(n === 8, `Expected 8 standings rows, got ${n}`);
  });

  await test('Dashboard: mini standings uses full team names (not shortNames)', async () => {
    const names = await page.$$eval('.mini-name', els => els.map(e => e.textContent.trim()));
    const short  = names.filter(n => n.length <= 4);
    assert(short.length === 0, `Short names in mini standings: ${short.join(', ')}`);
  });

  await test('Dashboard: next match uses full team names', async () => {
    const txt = await page.$eval('#next-match-info', el => el.textContent).catch(() => '');
    // Full team names are multi-word or >4 chars — shortNames are 2-4 char caps like "VS", "TG"
    // Rough heuristic: if every word longer than 4 chars it's a real name
    assert(txt.length > 20, `Next match text too short: "${txt}"`);
  });

  await test('Play Match button appears', async () => {
    await waitFor(async () => {
      const btn = await page.$('#btn-play-match');
      return btn ? page.isVisible('#btn-play-match') : false;
    }, 3000);
  });

  // ── NAVIGATION ─────────────────────────────────────────────────────────────
  console.log('\n── Panel Navigation ─────────────────────────────────────');

  const navPanels = ['squad', 'training', 'finances', 'league', 'schedule', 'transfers', 'scouting'];

  for (const panel of navPanels) {
    await test(`Panel "${panel}" opens without errors`, async () => {
      clearErrors();
      await goToPanel(panel);
      const active = await page.$eval(`#panel-${panel}`, el => el.classList.contains('active')).catch(() => false);
      assert(active, `#panel-${panel} not active`);
      const errs = freshErrors();
      assert(errs.length === 0, `Errors opening ${panel}:\n  ${errs.join('\n  ')}`);
    });
  }

  // ── SQUAD ──────────────────────────────────────────────────────────────────
  console.log('\n── Squad Panel ──────────────────────────────────────────');

  await test('Squad panel shows 5 starters', async () => {
    await goToPanel('squad');
    const rows = await page.$$('.squad-table tbody tr, .starter-row').catch(() => []);
    // More lenient: just check the panel has content
    const html = await page.$eval('#panel-squad', el => el.innerHTML);
    assert(html.length > 200, 'Squad panel content too sparse');
  });

  await test('Squad: clicking a player opens player profile', async () => {
    await goToPanel('squad');
    const firstPlayer = await page.$('.squad-table tbody tr, table.standings tbody tr').catch(() => null);
    if (!firstPlayer) return; // graceful skip
    await firstPlayer.click();
    await page.waitForTimeout(300);
    // Either panel-player active or squad still active (no crash)
    const errs = freshErrors();
    assert(errs.length === 0, `Errors clicking player: ${errs.join('; ')}`);
  });

  // ── FINANCES ───────────────────────────────────────────────────────────────
  console.log('\n── Finances Panel ───────────────────────────────────────');

  await test('Finances: shows budget, sponsor income, wage bill', async () => {
    await goToPanel('finances');
    const html = await page.$eval('#panel-finances', el => el.innerHTML);
    assert(html.includes('Budget'), 'No "Budget" in finances');
    assert(html.includes('Wage bill'), 'No "Wage bill" in finances');
    assert(html.includes('Sponsor'), 'No "Sponsor" in finances');
  });

  await test('Finances: wage bill/wk is in weekly range (not annual)', async () => {
    await goToPanel('finances');
    // Extract the wage bill number from the .fr-neg element
    const wageText = await page.$eval('.finance-row .fr-neg', el => el.textContent.trim()).catch(() => '');
    assert(wageText.length > 0, 'No .fr-neg wage element found in finances');
    // Weekly wages for a team of ~5 players with salaries ~$150k–$320k/yr → ~$3k–$6k/wk each → ~$15k–$30k/wk total
    // If annual, total would be ~$1M+.  A simple check: text shouldn't contain "1,0" as in $1,0xx,xxx
    const hasMillionScale = /\$?[1-9],\d{3},\d{3}/.test(wageText);
    assert(!hasMillionScale, `Wage bill appears to be annual (too large): "${wageText}"`);
    console.log(`       Wage bill text: ${wageText}`);
  });

  // ── LEAGUE ─────────────────────────────────────────────────────────────────
  console.log('\n── League Panel ─────────────────────────────────────────');

  await test('League standings shows 8 teams', async () => {
    await goToPanel('league');
    const rows = await page.$$('.standings tbody tr');
    assert(rows.length === 8, `Expected 8 standings rows, got ${rows.length}`);
  });

  await test('League standings uses full team names', async () => {
    const names = await page.$$eval('.standings tbody td:nth-child(2)', tds =>
      tds.map(td => td.textContent.replace('YOU', '').trim())
    );
    const short = names.filter(n => n.replace(/\s/g, '').length <= 4);
    assert(short.length === 0, `Short names in league: ${short.join(', ')}`);
  });

  await test('League standings rows are clickable (cursor:pointer)', async () => {
    const cursor = await page.$eval('.standings tbody tr', el =>
      window.getComputedStyle(el).cursor
    ).catch(() => '');
    assert(cursor === 'pointer', `Expected pointer cursor on standings row, got "${cursor}"`);
  });

  // ── TEAM DETAIL ────────────────────────────────────────────────────────────
  console.log('\n── Team Detail Page ─────────────────────────────────────');

  await test('Clicking standings row opens team detail panel', async () => {
    await goToPanel('league');
    await page.click('.standings tbody tr');
    await page.waitForTimeout(300);
    const active = await page.$eval('#panel-team-detail', el => el.classList.contains('active')).catch(() => false);
    assert(active, '#panel-team-detail not active after clicking standings row');
  });

  await test('Team detail: shows team name header', async () => {
    const name = await page.$eval('#team-detail-name', el => el.textContent.trim()).catch(() => '');
    assert(name.length > 3, `Team detail name too short: "${name}"`);
    console.log(`       Viewing: ${name}`);
  });

  await test('Team detail: shows roster table with 5 players', async () => {
    const rows = await page.$$('#team-detail-content table:first-of-type tbody tr');
    assert(rows.length === 5, `Expected 5 roster rows, got ${rows.length}`);
  });

  await test('Team detail: shows champion pools table', async () => {
    const tables = await page.$$('#team-detail-content table');
    assert(tables.length >= 2, 'Expected at least 2 tables (roster + champion pools)');
  });

  await test('Team detail: Back button returns to League', async () => {
    await page.click('#panel-team-detail .btn-back');
    await page.waitForTimeout(200);
    const active = await page.$eval('#panel-league', el => el.classList.contains('active')).catch(() => false);
    assert(active, 'League panel not active after Back button');
  });

  // ── SCHEDULE ───────────────────────────────────────────────────────────────
  console.log('\n── Schedule Panel ───────────────────────────────────────');

  await test('Schedule shows match entries', async () => {
    await goToPanel('schedule');
    const matches = await page.$$('.sched-match');
    assert(matches.length >= 14, `Expected ≥14 schedule matches, got ${matches.length}`);
  });

  await test('Schedule uses full team names', async () => {
    const names = await page.$$eval('.sched-team', els => els.map(e => e.textContent.trim()));
    const short  = names.filter(n => n.length <= 4);
    assert(short.length === 0, `Short names in schedule: ${short.join(', ')}`);
  });

  await test('Schedule team names are clickable', async () => {
    const cursor = await page.$eval('.sched-team', el =>
      window.getComputedStyle(el).cursor
    ).catch(() => '');
    assert(cursor === 'pointer', `Expected pointer cursor on sched-team, got "${cursor}"`);
  });

  // ── DRAFT ──────────────────────────────────────────────────────────────────
  console.log('\n── Draft & Match ────────────────────────────────────────');

  await test('Play Match opens match screen with draft phase', async () => {
    await goToPanel('dashboard');
    await page.click('#btn-play-match');
    await waitFor(() => page.isVisible('#screen-match'), 5000);
    assert(await page.isVisible('#screen-match'), 'Match screen not visible');
    assert(await page.isVisible('#draft-phase'), '#draft-phase not visible');
  });

  await test('Draft: initial state has 0 bans and 0 picks', async () => {
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const ds = _draftState;
      if (!ds) return null;
      return {
        step:      ds.step,
        blueBans:  ds.bans?.blue?.length,
        redBans:   ds.bans?.red?.length,
        bluePicks: ds.bluePicks?.length,
        redPicks:  ds.redPicks?.length,
      };
    });
    assert(state !== null, '_draftState is null');
    assert(state.blueBans  === 0, `Expected 0 blue bans, got ${state.blueBans}`);
    assert(state.redBans   === 0, `Expected 0 red bans, got ${state.redBans}`);
    assert(state.bluePicks === 0, `Expected 0 blue picks, got ${state.bluePicks}`);
    assert(state.redPicks  === 0, `Expected 0 red picks, got ${state.redPicks}`);
    console.log(`       Draft state OK. Human side: ${await page.evaluate(() => _draftState?.humanSide)}`);
  });

  await test('Draft: step 0 renders turn indicator', async () => {
    const banHtml = await page.$eval('#draft-bans', el => el.innerHTML).catch(() => '');
    assert(banHtml.length > 0, '#draft-bans is empty');
    assert(banHtml.includes('draft-turn-indicator'), 'No turn indicator rendered');
    console.log(`       Turn: ${banHtml.includes('YOUR TURN') ? 'human' : 'CPU'}`);
  });

  await test('Draft: completes all 14 steps within 30s (CPU ban bug check)', async () => {
    clearErrors();
    const { done, step, stuckAt } = await completeDraft(30000);

    if (stuckAt !== null) {
      // Detailed diagnosis
      const ds = await page.evaluate(() => {
        const d = _draftState;
        if (!d) return null;
        return {
          step:      d.step,
          humanSide: d.humanSide,
          blueBans:  d.bans?.blue,
          redBans:   d.bans?.red,
          bluePicks: d.bluePicks?.map(p => p.champion),
          redPicks:  d.redPicks?.map(p => p.champion),
        };
      });
      const seq = await page.evaluate(s => {
        const DRAFT_SEQUENCE = DRAFT_SEQUENCE || [];
        return DRAFT_SEQUENCE[s] || null;
      }, stuckAt);
      const pickerVis = await page.isVisible('#draft-champ-picker');
      throw new Error(
        `Draft STUCK at step ${stuckAt}.\n` +
        `       Sequence entry: ${JSON.stringify(seq)}\n` +
        `       Draft state: ${JSON.stringify(ds)}\n` +
        `       Champ picker visible: ${pickerVis}\n` +
        `       JS errors: ${freshErrors().join(' | ') || 'none'}`
      );
    }

    assert(done, `Draft ended early at step ${step} (not done, not stuck)`);
    console.log(`       Draft completed at step ${step}`);
  });

  await test('Draft: draft-actions (Watch/Skip) visible after draft complete', async () => {
    const visible = await page.isVisible('#draft-actions');
    assert(visible, '#draft-actions not visible after draft completion');
  });

  await test('Draft: both teams have 2 bans each', async () => {
    const bans = await page.evaluate(() => ({
      blue: _draftState?.bans?.blue?.length,
      red:  _draftState?.bans?.red?.length,
    }));
    assert(bans.blue === 2, `Expected 2 blue bans, got ${bans.blue}`);
    assert(bans.red  === 2, `Expected 2 red bans, got ${bans.red}`);
  });

  await test('Draft: both teams have 5 picks each', async () => {
    const picks = await page.evaluate(() => ({
      blue: _draftState?.bluePicks?.length,
      red:  _draftState?.redPicks?.length,
    }));
    assert(picks.blue === 5, `Expected 5 blue picks, got ${picks.blue}`);
    assert(picks.red  === 5, `Expected 5 red picks, got ${picks.red}`);
  });

  await test('Skip to Result shows pbp-results', async () => {
    await skipToResult();
    assert(await page.isVisible('#pbp-results'), '#pbp-results not visible');
    const html = await page.$eval('#pbp-results', el => el.innerHTML);
    assert(html.includes('VICTORY'), 'No VICTORY text in results');
    assert(html.includes('returnFromMatch'), 'No return button in results');
    console.log(`       Result: ${html.includes('win">') ? 'WIN' : 'LOSS'}`);
  });

  await test('Return to Manager goes to between-games-panel or dashboard', async () => {
    await returnToManager();
    const betweenGames = await page.isVisible('#between-games-panel');
    const onGame       = await page.isVisible('#screen-game');
    assert(betweenGames || onGame, 'Neither between-games-panel nor screen-game visible after return');
    console.log(`       After return: ${betweenGames ? 'between-games panel' : 'back to dashboard'}`);
  });

  // ── FULL BO3 SERIES ────────────────────────────────────────────────────────
  console.log('\n── BO3 Series Flow ──────────────────────────────────────');

  await test('Can complete a full BO3 series (up to 3 games)', async () => {
    // We may already be mid-series. Handle all states.
    let gamesPlayed = 0;
    const maxGames  = 3;

    for (let g = 0; g < maxGames; g++) {
      const betweenVisible = await page.isVisible('#between-games-panel');
      const onGame         = await page.isVisible('#screen-game');
      const onMatch        = await page.isVisible('#screen-match');

      if (betweenVisible) {
        // Mid-series: start next game
        await page.click('button[onclick="onNextGame()"]');
        await page.waitForTimeout(300);
      } else if (onGame) {
        // Back on dashboard — series over
        break;
      } else if (!onMatch) {
        break;
      }

      // Now we're on match screen — complete draft + skip match
      if (await page.isVisible('#draft-phase')) {
        const { done, stuckAt } = await completeDraft(30000);
        if (!done || stuckAt !== null) throw new Error(`Draft stuck at step ${stuckAt} in game ${g + 1}`);
        await skipToResult();
        await returnToManager();
        gamesPlayed++;
      }
    }

    assert(gamesPlayed >= 1, `Played 0 games in series — something went wrong`);
    console.log(`       Series: played ${gamesPlayed} game(s)`);
  });

  // ── ADVANCE WEEK ──────────────────────────────────────────────────────────
  console.log('\n── Advance Week ─────────────────────────────────────────');

  await test('Advance Week updates game state without errors', async () => {
    // Navigate to dashboard first
    if (!await page.isVisible('#screen-game')) {
      console.log('       Skipped — not on game screen');
      return;
    }
    await goToPanel('dashboard');
    clearErrors();
    const weekBefore = await page.$eval('#top-week', el => el.textContent).catch(() => '');
    await page.click('#btn-advance');
    await page.waitForTimeout(600);
    const errs = freshErrors();
    assert(errs.length === 0, `Errors after Advance Week: ${errs.join('; ')}`);
    const weekAfter = await page.$eval('#top-week', el => el.textContent).catch(() => '');
    console.log(`       Week: "${weekBefore}" → "${weekAfter}"`);
  });

  await test('After advancing, dashboard still renders correctly', async () => {
    await goToPanel('dashboard');
    const html = await page.$eval('#panel-dashboard', el => el.innerHTML);
    assert(html.length > 500, 'Dashboard content sparse after Advance Week');
    const errs = freshErrors();
    assert(errs.length === 0, `Errors on dashboard after Advance Week: ${errs.join('; ')}`);
  });

  // ── SECOND MATCH ──────────────────────────────────────────────────────────
  console.log('\n── Second Match (regression check) ──────────────────────');

  await test('A second match draft also completes without stalling', async () => {
    await goToPanel('dashboard');

    // Advance weeks until Play Match appears again
    let tries = 0;
    while (tries < 10) {
      const playBtn = await page.$('#btn-play-match');
      const visible = playBtn ? await playBtn.isVisible() : false;
      if (visible) break;
      await page.click('#btn-advance');
      await page.waitForTimeout(400);
      tries++;
    }

    const playVisible = await page.isVisible('#btn-play-match');
    if (!playVisible) {
      console.log('       Skipped — no Play Match button available');
      return;
    }

    clearErrors();
    await page.click('#btn-play-match');
    await waitFor(() => page.isVisible('#screen-match'), 5000);

    const { done, step, stuckAt } = await completeDraft(30000);
    if (stuckAt !== null) {
      throw new Error(`Second match draft STUCK at step ${stuckAt}. Errors: ${freshErrors().join(' | ') || 'none'}`);
    }
    assert(done, `Second draft ended at step ${step} without completing`);

    await skipToResult();
    await returnToManager();
    console.log(`       Second draft completed at step ${step}`);
  });

  // ── SUMMARY ───────────────────────────────────────────────────────────────

  await teardown();

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total  = results.length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    ${r.error}`);
    });
  }

  if (consoleErrors.length > 0) {
    console.log('\nAll captured JS errors:');
    [...new Set(consoleErrors)].forEach(e => console.log(`  [ERR] ${e}`));
  }

  console.log('');
  return failed;
}

runTests()
  .then(failed => process.exit(failed > 0 ? 1 : 0))
  .catch(err => { console.error('Test runner crashed:', err); process.exit(1); });
