// js/ui/map.js — LoL map visualization for play-by-play
// Exposes three globals: initMapVisualization(matchResult), updateMap(ev), setMapSkipMode(bool)
// Loaded before ui.js. Guards (typeof updateMap === 'function') in ui.js keep it optional.

(function () {
  'use strict';

  const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

  // ── Formation tables ────────────────────────────────────────────────────────
  // All coords are cx/cy in the 300×300 SVG space.
  // Map layout: Blue base = bottom-left, Red base = top-right.
  // Top lane runs up the left edge then across the top.
  // Bot lane runs across the bottom then up the right edge.
  // Mid lane is the diagonal.
  // Baron pit ≈ (78,78), Dragon pit ≈ (222,222).

  const F = {
    // ── Laning ────────────────────────────────────────────────────────
    BLUE_LANE: [
      { cx: 28,  cy: 75  },  // top — top lane, blue side (upper-left)
      { cx: 82,  cy: 170 },  // jungle — blue jungle
      { cx: 92,  cy: 208 },  // mid — lower-left diagonal
      { cx: 72,  cy: 268 },  // adc — bot lane, blue side
      { cx: 90,  cy: 274 },  // support — near adc
    ],
    RED_LANE: [
      { cx: 272, cy: 28  },  // top — top lane, red side (upper-right)
      { cx: 218, cy: 132 },  // jungle — red jungle
      { cx: 208, cy: 92  },  // mid — upper-right diagonal
      { cx: 228, cy: 268 },  // adc — bot lane, red side
      { cx: 210, cy: 274 },  // support — near adc
    ],

    // ── Dragon pit fight (bottom-right quadrant ~222,222) ─────────────
    BLUE_DRAGON: [
      { cx: 192, cy: 218 },
      { cx: 200, cy: 230 },
      { cx: 192, cy: 238 },
      { cx: 205, cy: 214 },
      { cx: 195, cy: 210 },
    ],
    RED_DRAGON: [
      { cx: 232, cy: 218 },
      { cx: 225, cy: 230 },
      { cx: 238, cy: 235 },
      { cx: 230, cy: 212 },
      { cx: 240, cy: 224 },
    ],

    // ── Baron pit fight (top-left quadrant ~78,78) ────────────────────
    BLUE_BARON: [
      { cx: 62,  cy: 62  },
      { cx: 72,  cy: 74  },
      { cx: 62,  cy: 82  },
      { cx: 76,  cy: 58  },
      { cx: 70,  cy: 72  },
    ],
    RED_BARON: [
      { cx: 100, cy: 62  },
      { cx: 92,  cy: 74  },
      { cx: 104, cy: 80  },
      { cx: 94,  cy: 56  },
      { cx: 106, cy: 70  },
    ],

    // ── Major teamfight (river / center ~148,148) ──────────────────────
    BLUE_TF: [
      { cx: 126, cy: 135 },
      { cx: 135, cy: 148 },
      { cx: 124, cy: 156 },
      { cx: 138, cy: 142 },
      { cx: 130, cy: 160 },
    ],
    RED_TF: [
      { cx: 170, cy: 135 },
      { cx: 162, cy: 148 },
      { cx: 173, cy: 156 },
      { cx: 158, cy: 140 },
      { cx: 168, cy: 162 },
    ],

    // ── Tower fights ───────────────────────────────────────────────────
    // Blue side attacks red top tower (upper-right end of top lane)
    BLUE_TOP_TOWER: [
      { cx: 218, cy: 24  },
      { cx: 230, cy: 36  },
      { cx: 208, cy: 36  },
      { cx: 225, cy: 16  },
      { cx: 215, cy: 42  },
    ],
    // Red defends top tower
    RED_TOP_TOWER: [
      { cx: 258, cy: 22  },
      { cx: 268, cy: 34  },
      { cx: 248, cy: 34  },
      { cx: 265, cy: 14  },
      { cx: 255, cy: 42  },
    ],
    // Blue defends own top tower (lower-left end of top lane)
    BLUE_OWN_TOP: [
      { cx: 22,  cy: 88  },
      { cx: 34,  cy: 78  },
      { cx: 35,  cy: 92  },
      { cx: 18,  cy: 78  },
      { cx: 28,  cy: 100 },
    ],
    RED_OWN_TOP: [
      { cx: 55,  cy: 62  },
      { cx: 65,  cy: 50  },
      { cx: 68,  cy: 65  },
      { cx: 52,  cy: 52  },
      { cx: 60,  cy: 74  },
    ],
    // Bot tower fights
    BLUE_BOT_TOWER: [
      { cx: 82,  cy: 275 },
      { cx: 72,  cy: 265 },
      { cx: 92,  cy: 268 },
      { cx: 78,  cy: 282 },
      { cx: 65,  cy: 275 },
    ],
    RED_BOT_TOWER: [
      { cx: 240, cy: 278 },
      { cx: 250, cy: 268 },
      { cx: 230, cy: 270 },
      { cx: 245, cy: 285 },
      { cx: 258, cy: 275 },
    ],
    // Mid tower fights
    BLUE_MID_TOWER: [
      { cx: 112, cy: 190 },
      { cx: 120, cy: 202 },
      { cx: 108, cy: 202 },
      { cx: 125, cy: 194 },
      { cx: 116, cy: 210 },
    ],
    RED_MID_TOWER: [
      { cx: 188, cy: 110 },
      { cx: 178, cy: 100 },
      { cx: 195, cy: 100 },
      { cx: 182, cy: 116 },
      { cx: 172, cy: 108 },
    ],

    // ── Baron push (buffed team advances) ────────────────────────────
    BLUE_PUSH: [
      { cx: 265, cy: 25  },
      { cx: 275, cy: 38  },
      { cx: 258, cy: 40  },
      { cx: 272, cy: 15  },
      { cx: 260, cy: 50  },
    ],
    RED_PUSH: [
      { cx: 35,  cy: 275 },
      { cx: 25,  cy: 262 },
      { cx: 42,  cy: 268 },
      { cx: 28,  cy: 285 },
      { cx: 48,  cy: 278 },
    ],

    // ── Result / nexus ────────────────────────────────────────────────
    BLUE_NEXUS: [
      { cx: 14,  cy: 282 },
      { cx: 24,  cy: 292 },
      { cx: 32,  cy: 284 },
      { cx: 12,  cy: 292 },
      { cx: 26,  cy: 278 },
    ],
    RED_NEXUS: [
      { cx: 286, cy: 18  },
      { cx: 276, cy: 8   },
      { cx: 268, cy: 16  },
      { cx: 288, cy: 8   },
      { cx: 274, cy: 22  },
    ],
  };

  // Flash positions for event ring
  const FLASH_POS = {
    dragon: { cx: 222, cy: 222 },
    baron:  { cx: 78,  cy: 78  },
    tf:     { cx: 148, cy: 148 },
    top_blue: { cx: 22,  cy: 88  },
    top_red:  { cx: 238, cy: 22  },
    mid_blue: { cx: 112, cy: 190 },
    mid_red:  { cx: 188, cy: 110 },
    bot_blue: { cx: 88,  cy: 272 },
    bot_red:  { cx: 248, cy: 272 },
    blue_nexus: { cx: 20,  cy: 285 },
    red_nexus:  { cx: 280, cy: 15  },
  };

  // ── Module state ────────────────────────────────────────────────────────────

  let _skipMode = false;
  let _currentTimeSec = 0;
  const _deathExpiry = {
    blue: { top: 0, jungle: 0, mid: 0, adc: 0, support: 0 },
    red:  { top: 0, jungle: 0, mid: 0, adc: 0, support: 0 },
  };
  let _ringRaf = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  window.initMapVisualization = function () {
    _skipMode = false;
    _currentTimeSec = 0;
    POSITIONS.forEach(pos => {
      _deathExpiry.blue[pos] = 0;
      _deathExpiry.red[pos]  = 0;
    });
    POSITIONS.forEach(pos => {
      reviveDot('blue', pos);
      reviveDot('red',  pos);
    });
    moveSide('blue', 'BLUE_LANE');
    moveSide('red',  'RED_LANE');
  };

  window.updateMap = function (ev) {
    if (!ev) return;

    // Parse event time into seconds
    if (ev.time) {
      const parts = ev.time.split(':');
      if (parts.length === 2) {
        _currentTimeSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
    }

    // Revive dots whose death timers expired
    tickRespawns();

    if (ev.type === 'header') {
      handlePhaseHeader(ev);
      return;
    }

    switch (ev.type) {
      case 'kill':       handleKill(ev);      break;
      case 'objective':  handleObjective(ev); break;
      case 'teamfight':  handleTeamfight(ev); break;
      case 'result':     handleResult(ev);    break;
    }
  };

  window.setMapSkipMode = function (skip) {
    _skipMode = skip;
    const svg = document.getElementById('pbp-map-svg');
    if (svg) svg.classList.toggle('map-skip', skip);
  };

  // ── Event handlers ──────────────────────────────────────────────────────────

  function handlePhaseHeader(ev) {
    // Phase headers text like "── Laning Phase ──", "── Mid Game ──", etc.
    const text = (ev.text || '').toLowerCase();
    if (text.includes('lan') || text.includes('early')) {
      moveSide('blue', 'BLUE_LANE');
      moveSide('red',  'RED_LANE');
    }
    // mid/late: let the events position them naturally
  }

  function handleKill(ev) {
    // Solo kill or gank — one player on the losing side dies
    const loseSide = ev.killBlue ? 'red' : 'blue';
    const victims = getAlivePosns(loseSide);
    if (victims.length > 0) {
      const victim = pickRandom(victims);
      markDead(loseSide, victim, _currentTimeSec + 22);
    }
  }

  function handleObjective(ev) {
    if (ev.dragonBlue !== undefined) {
      moveSide('blue', 'BLUE_DRAGON');
      moveSide('red',  'RED_DRAGON');
      flashRing(FLASH_POS.dragon.cx, FLASH_POS.dragon.cy, '#c89b3c');
      applyKillsVisual(ev.dragonBlue ? 'blue' : 'red', ev.dragonBlue ? 'red' : 'blue', 1, 0);

    } else if (ev.baronBlue !== undefined) {
      moveSide('blue', 'BLUE_BARON');
      moveSide('red',  'RED_BARON');
      flashRing(FLASH_POS.baron.cx, FLASH_POS.baron.cy, '#9b59b6');
      applyKillsVisual(ev.baronBlue ? 'blue' : 'red', ev.baronBlue ? 'red' : 'blue', 1, 0);

    } else if (ev.towerBlue !== undefined) {
      const lane = getLaneFromText(ev.text || '');
      const winSide = ev.towerBlue ? 'blue' : 'red';

      // Move the attacking team toward that tower
      if (ev.towerBlue) {
        const blueForm = lane === 'top' ? 'BLUE_TOP_TOWER' :
                         lane === 'bot' ? 'BLUE_BOT_TOWER' : 'BLUE_MID_TOWER';
        moveSide('blue', blueForm);
      } else {
        const redForm = lane === 'top' ? 'RED_OWN_TOP' :
                        lane === 'bot' ? 'RED_BOT_TOWER' : 'RED_MID_TOWER';
        moveSide('red', redForm);
      }
      const flashKey = `${lane}_${winSide}`;
      const fp = FLASH_POS[flashKey] || FLASH_POS.tf;
      flashRing(fp.cx, fp.cy, ev.towerBlue ? '#4fc3f7' : '#ff7b7b');
    }
  }

  function handleTeamfight(ev) {
    moveSide('blue', 'BLUE_TF');
    moveSide('red',  'RED_TF');
    flashRing(FLASH_POS.tf.cx, FLASH_POS.tf.cy, '#9b59b6');

    const blueKills = ev.tfBlueKills || 0;
    const redKills  = ev.tfRedKills  || 0;
    // blue killed redKills red players; red killed blueKills blue players
    applyKillsVisual('blue', 'red', redKills,  blueKills);

    // Check for baron push text to relocate after fight
    const text = (ev.text || '').toLowerCase();
    if (text.includes('baron buff') || text.includes('baron')) {
      const pushSide = ev.tfBlueKills >= ev.tfRedKills ? 'blue' : 'red';
      if (pushSide === 'blue') moveSide('blue', 'BLUE_PUSH');
      else                     moveSide('red',  'RED_PUSH');
    }
  }

  function handleResult(ev) {
    const blueWon = (ev.advAfter !== undefined) ? ev.advAfter >= 50 :
                    (ev.text && ev.text.toLowerCase().includes('blue'));
    if (blueWon) {
      moveSide('blue', 'BLUE_PUSH');
      flashRing(FLASH_POS.red_nexus.cx, FLASH_POS.red_nexus.cy, '#4fc3f7');
      POSITIONS.forEach(pos => markDead('red', pos, _currentTimeSec + 9999));
    } else {
      moveSide('red', 'RED_PUSH');
      flashRing(FLASH_POS.blue_nexus.cx, FLASH_POS.blue_nexus.cy, '#ff7b7b');
      POSITIONS.forEach(pos => markDead('blue', pos, _currentTimeSec + 9999));
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  function moveSide(side, formationKey) {
    const formation = F[formationKey];
    if (!formation) return;
    POSITIONS.forEach((pos, i) => {
      if (formation[i]) moveDot(side, pos, formation[i].cx, formation[i].cy);
    });
  }

  function moveDot(side, pos, cx, cy) {
    const pfx = side[0]; // 'b' or 'r'
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (!dot) return;
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    if (lbl) {
      lbl.setAttribute('x', cx);
      lbl.setAttribute('y', cy + 4);
    }
  }

  function markDead(side, pos, expiryTimeSec) {
    _deathExpiry[side][pos] = expiryTimeSec;
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.add('map-dot-dead');
    if (lbl) lbl.classList.add('map-dot-dead');
  }

  function reviveDot(side, pos) {
    _deathExpiry[side][pos] = 0;
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.remove('map-dot-dead');
    if (lbl) lbl.classList.remove('map-dot-dead');
  }

  function tickRespawns() {
    ['blue', 'red'].forEach(side => {
      POSITIONS.forEach(pos => {
        const exp = _deathExpiry[side][pos];
        if (exp > 0 && _currentTimeSec >= exp) {
          reviveDot(side, pos);
        }
      });
    });
  }

  function getAlivePosns(side) {
    return POSITIONS.filter(pos => {
      const exp = _deathExpiry[side][pos];
      return exp === 0 || _currentTimeSec >= exp;
    });
  }

  function applyKillsVisual(winSide, loseSide, winnerKills, loserKills) {
    // loseSide loses winnerKills players
    const loseAlive = getAlivePosns(loseSide);
    const numKill = Math.min(winnerKills, loseAlive.length);
    shuffle(loseAlive).slice(0, numKill).forEach(pos => {
      markDead(loseSide, pos, _currentTimeSec + 26);
    });
    // winSide loses loserKills players (traded)
    if (loserKills > 0) {
      const winAlive = getAlivePosns(winSide);
      const numLoss = Math.min(loserKills, winAlive.length);
      shuffle(winAlive).slice(0, numLoss).forEach(pos => {
        markDead(winSide, pos, _currentTimeSec + 20);
      });
    }
  }

  function flashRing(cx, cy, color) {
    if (_skipMode) return;
    const ring = document.getElementById('map-event-ring');
    if (!ring) return;
    if (_ringRaf) cancelAnimationFrame(_ringRaf);
    ring.setAttribute('cx', cx);
    ring.setAttribute('cy', cy);
    ring.setAttribute('stroke', color);
    const start = Date.now();
    function step() {
      const t = Math.min(1, (Date.now() - start) / 700);
      ring.setAttribute('r',       (8 + t * 38).toFixed(1));
      ring.setAttribute('opacity', ((1 - t) * 0.85).toFixed(2));
      if (t < 1) _ringRaf = requestAnimationFrame(step);
      else        ring.setAttribute('opacity', '0');
    }
    _ringRaf = requestAnimationFrame(step);
  }

  function getLaneFromText(text) {
    const t = text.toLowerCase();
    if (t.includes(' top'))                           return 'top';
    if (t.includes('bot') || t.includes('bottom'))   return 'bot';
    return 'mid';
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

})();
