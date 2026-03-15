// js/ui/map.js — Grove Manager map visualization
// Driven by real champion positions from simulation events (ev.positions).
// Positions are live (x,y) coordinates in 0-300 space from the tick engine.
// Exposes three globals: initMapVisualization(), updateMap(ev), setMapSkipMode(bool)

(function () {
  'use strict';

  const POSITIONS = ['vanguard', 'ranger', 'arcanist', 'hunter', 'warden'];

  // ── Module state ─────────────────────────────────────────────────────────────

  let _skipMode      = false;
  let _wanderInterval = null;
  let _ringRaf        = null;

  // Spawn positions matching simulation.js SPAWN constants (for init and reset)
  const _SPAWN_POS = {
    blue: { vanguard:{x:18,y:270}, ranger:{x:24,y:276}, arcanist:{x:22,y:278},
            hunter:{x:28,y:274},   warden:{x:22,y:283} },
    red:  { vanguard:{x:282,y:30}, ranger:{x:276,y:24}, arcanist:{x:278,y:22},
            hunter:{x:272,y:26},   warden:{x:278,y:17} },
  };

  // Base anchor per dot — wander drifts around the last received real position
  const _base = {
    blue: { ...Object.fromEntries(POSITIONS.map(p => [p, {..._SPAWN_POS.blue[p]}])) },
    red:  { ...Object.fromEntries(POSITIONS.map(p => [p, {..._SPAWN_POS.red[p]}])) },
  };

  // Wander radius per role (tight — real positions are the truth)
  const _wRadius = { vanguard:4, ranger:5, arcanist:4, hunter:3, warden:3 };

  // Dead status (used to suppress wander for dead dots)
  const _dead = {
    blue: { vanguard:false, ranger:false, arcanist:false, hunter:false, warden:false },
    red:  { vanguard:false, ranger:false, arcanist:false, hunter:false, warden:false },
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  window.initMapVisualization = function () {
    _skipMode = false;
    POSITIONS.forEach(pos => {
      _dead.blue[pos] = false;
      _dead.red[pos]  = false;
      reviveDot('blue', pos);
      reviveDot('red',  pos);
    });
    // Reset all dots to spawn positions — real positions arrive with first event
    const initPos = { blue:{}, red:{} };
    POSITIONS.forEach(pos => {
      initPos.blue[pos] = { ..._SPAWN_POS.blue[pos], alive: true };
      initPos.red[pos]  = { ..._SPAWN_POS.red[pos],  alive: true };
    });
    applyPositions(initPos);
    startWander();
  };

  window.updateMap = function (ev) {
    if (!ev || ev.type === 'header') return;

    // Apply real champion positions from simulation
    if (ev.positions) {
      applyPositions(ev.positions);
    }

    // Flash ring at the event's focal point
    if (!_skipMode) {
      flashForEvent(ev);
    }
  };

  window.setMapSkipMode = function (skip) {
    _skipMode = skip;
    const svg = document.getElementById('pbp-map-svg');
    if (svg) svg.classList.toggle('map-skip', skip);
    if (skip) stopWander();
    else      startWander();
  };

  // ── Position Application ─────────────────────────────────────────────────────

  function applyPositions(positions) {
    ['blue', 'red'].forEach(side => {
      if (!positions[side]) return;
      POSITIONS.forEach(pos => {
        const data = positions[side][pos];
        if (!data) return;
        const x = Math.round(data.x);
        const y = Math.round(data.y);
        moveDot(side, pos, x, y);
        _base[side][pos] = { x, y };
        if (data.alive === false) {
          _dead[side][pos] = true;
          markDead(side, pos);
        } else {
          _dead[side][pos] = false;
          reviveDot(side, pos);
        }
      });
    });
  }

  // ── Flash Ring ───────────────────────────────────────────────────────────────

  function flashForEvent(ev) {
    let cx, cy, color;

    if (ev.wardenBlue !== undefined || ev.wardenRed !== undefined) {
      // Warden positions from OBJ_DEFS: warden_b(80,80) warden_r(220,220)
      cx = ev.wardenBlue ? 80 : 220; cy = ev.wardenBlue ? 80 : 220; color = '#9b59b6';
    } else if (ev.shrineBlue !== undefined || ev.shrineRed !== undefined) {
      // Shrine positions: shrine_a(80,80) shrine_b(220,220)
      cx = ev.shrineBlue ? 80 : 220; cy = ev.shrineBlue ? 80 : 220; color = '#c89b3c';
    } else if (ev.type === 'result') {
      const blueWon = (ev.advAfter || 50) >= 50;
      cx = blueWon ? 35  : 265;
      cy = blueWon ? 265 : 35;
      color = blueWon ? '#4fc3f7' : '#ff7b7b';
    } else if (ev.type === 'teamfight' || ev.type === 'kill' || ev.type === 'objective') {
      // Flash at the centroid of all champion positions in this event
      const c = getCentroid(ev.positions);
      cx = c.x; cy = c.y;
      color = (ev.killBlue === true || ev.towerBlue === true || ev.tfBlueKills > (ev.tfRedKills || 0))
        ? '#4fc3f7' : '#ff7b7b';
    } else {
      return; // commentary — no flash
    }

    flashRing(cx, cy, color);
  }

  function getCentroid(positions) {
    if (!positions) return { x:150, y:150 };
    let tx = 0, ty = 0, n = 0;
    ['blue', 'red'].forEach(side => {
      POSITIONS.forEach(pos => {
        const p = positions[side]?.[pos];
        if (p && p.alive !== false) { tx += p.x; ty += p.y; n++; }
      });
    });
    return n > 0 ? { x: Math.round(tx / n), y: Math.round(ty / n) } : { x:150, y:150 };
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

  // ── Dot Helpers ──────────────────────────────────────────────────────────────

  function moveDot(side, pos, x, y) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) { dot.setAttribute('cx', x); dot.setAttribute('cy', y); }
    if (lbl) { lbl.setAttribute('x', x); lbl.setAttribute('y', y + 4); }
  }

  function markDead(side, pos) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.add('map-dot-dead');
    if (lbl) lbl.classList.add('map-dot-dead');
  }

  function reviveDot(side, pos) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.remove('map-dot-dead');
    if (lbl) lbl.classList.remove('map-dot-dead');
  }

  // ── Wander Animation ─────────────────────────────────────────────────────────
  // Alive dots drift slightly around their last base position between events,
  // giving the FM-style "always moving" feel.

  function startWander() {
    stopWander();
    _wanderInterval = setInterval(wanderTick, 300);
  }

  function stopWander() {
    if (_wanderInterval) { clearInterval(_wanderInterval); _wanderInterval = null; }
  }

  function wanderTick() {
    if (_skipMode) return;
    ['blue', 'red'].forEach(side => {
      POSITIONS.forEach(pos => {
        if (_dead[side][pos]) return;
        const base = _base[side][pos];
        const r    = _wRadius[pos] || 8;
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * r;
        const nx = Math.round(base.x + Math.cos(angle) * dist);
        const ny = Math.round(base.y + Math.sin(angle) * dist);
        moveDot(side, pos, nx, ny);
      });
    });
  }

})();
