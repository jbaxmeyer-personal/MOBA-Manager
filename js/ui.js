// js/ui.js — All rendering functions

// ─── Screen / Tab Management ─────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierColor(tier)  { return ['','#95a5a6','#2ecc71','#3498db','#9b59b6','#e07800'][tier]||'#aaa'; }
function tierLabel(tier)  { return ['','Iron','Silver','Gold','Platinum','Diamond'][tier]||''; }
function posIcon(pos)     { return { top:'⚔️', jungle:'🌿', mid:'🔮', adc:'🏹', support:'🛡️' }[pos]||'👤'; }
function starBadge(stars) { return stars === 3 ? '<span class="star-badge s3">★★★</span>' : stars === 2 ? '<span class="star-badge s2">★★</span>' : ''; }

// FM attribute abbreviations
function statAbbr(key) {
  return {
    mechanics:'MEC', csAccuracy:'CSA', teamfightPositioning:'TFP', mapMovement:'MAP',
    objectiveExecution:'OBJ', championPoolDepth:'CPD',
    decisionMaking:'DEC', gameSense:'GS', communication:'COM', leadership:'LDR',
    adaptability:'ADP', composure:'CMP',
  }[key] || key.slice(0,3).toUpperCase();
}

// FM attribute full names (for tooltips)
function statLabel(key) {
  return {
    mechanics:'Mechanics', csAccuracy:'CS Accuracy', teamfightPositioning:'TF Positioning',
    mapMovement:'Map Movement', objectiveExecution:'Objective Exec', championPoolDepth:'Champ Pool',
    decisionMaking:'Decision Making', gameSense:'Game Sense', communication:'Communication',
    leadership:'Leadership', adaptability:'Adaptability', composure:'Composure',
  }[key] || key;
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ─── Header ──────────────────────────────────────────────────────────────────

function renderHeader(state) {
  setText('header-team-name', state.teamName);
  setText('header-record',    `${(state.allTeams[0]||{}).wins||0}W – ${(state.allTeams[0]||{}).losses||0}L`);
  setText('header-gold',      state.gold);
  setText('header-level',     state.level);
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────

function renderXPBar(state) {
  const maxLevel = CONFIG.LEVEL_XP.length - 1;
  const curXP    = CONFIG.LEVEL_XP[state.level]     || 0;
  const nextXP   = CONFIG.LEVEL_XP[state.level + 1] || curXP;
  const inLevel  = state.xp - curXP;
  const needed   = nextXP - curXP;
  const pct      = state.level >= maxLevel ? 100 : (inLevel / needed) * 100;

  const fill  = document.getElementById('xp-fill');
  const label = document.getElementById('xp-label');
  if (fill)  fill.style.width = `${pct}%`;
  if (label) label.textContent = state.level >= maxLevel ? 'MAX LEVEL' : `${inLevel}/${needed} XP · Lv${state.level}`;
}

// ─── Player Card ─────────────────────────────────────────────────────────────

function playerCardHTML(player, ctx, extra = {}) {
  if (!player) {
    const label = extra.locked ? `🔒 Slot ${extra.slotNum}` : 'Empty';
    return `<div class="player-card empty${extra.locked?' locked':''}"><span class="empty-label">${label}</span></div>`;
  }

  const color    = tierColor(player.tier);
  const eStats   = getEffectiveStats(player);
  const top3     = Object.entries(eStats).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const isSelected = extra.selectedId && extra.selectedId === player.instanceId;

  const champList = (player.champions || []).join(' · ');
  const regionColor = (CONFIG.REGION_COLORS || {})[player.region] || '#aaa';
  const regionDisplay = player.region && player.region !== 'null' ? player.region : '';
  const ageDisplay = player.age ? `Age ${player.age}` : '';
  const secondaryDisplay = player.secondaryRole ? ` · ${posIcon(player.secondaryRole)} 2nd` : '';

  let actionRow = '';
  if (ctx === 'shop') {
    const cost = CONFIG.TIER_COST[player.tier];
    actionRow = `<button class="btn-buy" onclick="onBuyPlayer(${extra.shopIndex})">Buy <b>${cost}g</b></button>`;
  } else if (ctx === 'roster') {
    const sell = CONFIG.TIER_SELL[player.tier];
    actionRow = `
      <div class="card-btn-row">
        <button class="btn-to-bench" onclick="onMoveToBench('${player.instanceId}')">▼ Bench</button>
        <button class="btn-sell" onclick="onSellPlayer('${player.instanceId}')">Sell ${sell}g</button>
      </div>`;
  } else if (ctx === 'bench') {
    const sell = CONFIG.TIER_SELL[player.tier];
    actionRow = `
      <div class="card-btn-row">
        <button class="btn-to-roster" onclick="onMoveToRoster('${player.instanceId}')">▲ Start</button>
        <button class="btn-sell" onclick="onSellPlayer('${player.instanceId}')">Sell ${sell}g</button>
      </div>`;
  }

  // FM-style attribute bars (top 4 stats, color-coded by value)
  const attrBarColor = v => v >= 17 ? '#e67e22' : v >= 14 ? '#2ecc71' : v >= 10 ? '#3498db' : '#95a5a6';
  const statBars = top3.map(([k,v]) =>
    `<span class="stat-pip" title="${statLabel(k)}: ${v}/20" style="--bar-c:${attrBarColor(v)}">${statAbbr(k)}<b>${v}</b></span>`
  ).join('');

  return `
    <div class="player-card tier-${player.tier}${isSelected?' selected':''}${extra.owned?' owned':''}" style="border-color:${color}">
      <div class="card-top" style="background:${color}18">
        <span class="card-pos">${posIcon(player.position)}</span>
        <span class="card-name">${player.name}</span>
        <span class="card-tier" style="color:${color}">${tierLabel(player.tier)}${starBadge(player.stars)}</span>
      </div>
      <div class="card-region">
        <span style="color:${regionColor}">${regionDisplay}</span>
        <span class="card-age">${ageDisplay}${secondaryDisplay}</span>
      </div>
      <div class="card-champs" title="Champion Pool">🎮 ${champList}</div>
      <div class="card-stats">${statBars}</div>
      ${actionRow ? `<div class="card-actions">${actionRow}</div>` : ''}
    </div>`;
}

// ─── Shop Rendering ───────────────────────────────────────────────────────────

function renderShop(state) {
  // Shop slots
  const shopEl = document.getElementById('shop-slots');
  if (shopEl) {
    const ownedNames = new Set([
      ...state.roster.filter(Boolean).map(p => p.name),
      ...state.bench.filter(Boolean).map(p => p.name),
    ]);
    shopEl.innerHTML = state.shopSlots.map((p, i) =>
      p ? playerCardHTML(p, 'shop', { shopIndex: i, owned: ownedNames.has(p.name) })
        : `<div class="player-card empty"><span class="empty-label">—</span></div>`
    ).join('');
  }

  // Active roster (always 5 slots)
  const rosterEl = document.getElementById('active-roster');
  if (rosterEl) {
    rosterEl.innerHTML = Array.from({ length: CONFIG.ROSTER_MAX }, (_, i) => {
      const p = state.roster[i] || null;
      return p ? playerCardHTML(p, 'roster', { selectedId: state.selectedUnit?.instanceId })
               : `<div class="player-card empty"><span class="empty-label">Empty Slot</span></div>`;
    }).join('');
  }

  // Bench
  const benchEl = document.getElementById('bench-slots');
  if (benchEl) {
    benchEl.innerHTML = state.bench.map(p =>
      playerCardHTML(p, 'bench', { selectedId: state.selectedUnit?.instanceId })
    ).join('') || '<div class="bench-empty">No bench players</div>';
    setText('bench-count', `${state.bench.length}/${CONFIG.BENCH_MAX}`);
  }

  renderXPBar(state);
  renderSynergies(state);
  renderHeader(state);

  // Lock button text
  const lockBtn = document.getElementById('btn-lock-shop');
  if (lockBtn) lockBtn.textContent = state.shopLocked ? '🔓 Unlock Shop' : '🔒 Lock Shop';
}

// ─── Synergy Panel ───────────────────────────────────────────────────────────

function renderSynergies(state) {
  const el = document.getElementById('synergy-panel');
  if (!el) return;

  const roster = state.roster.filter(Boolean);
  if (!roster.length) { el.innerHTML = '<p class="syn-empty">Add players to activate bonuses</p>'; return; }

  const regionResult = calcRegionSynergy(roster);

  // Team average for each FM attribute (used as team overview bars)
  const FM_ATTRS = ['mechanics','csAccuracy','teamfightPositioning','mapMovement','objectiveExecution','championPoolDepth',
                    'decisionMaking','gameSense','communication','leadership','adaptability','composure'];
  const avgAttr = key => {
    const vals = roster.map(p => (getEffectiveStats(p)[key] || 0));
    return vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(1) : '—';
  };
  const barWidth = v => Math.round((parseFloat(v) / 20) * 100);
  const barColor = v => parseFloat(v) >= 15 ? '#e67e22' : parseFloat(v) >= 12 ? '#2ecc71' : parseFloat(v) >= 8 ? '#3498db' : '#95a5a6';

  const techAttrs = FM_ATTRS.slice(0,6);
  const mentAttrs = FM_ATTRS.slice(6);

  const attrRows = (attrs) => attrs.map(k => {
    const v = avgAttr(k);
    return `<div class="attr-row">
      <span class="attr-name">${statLabel(k)}</span>
      <div class="attr-bar-bg"><div class="attr-bar-fill" style="width:${barWidth(v)}%;background:${barColor(v)}"></div></div>
      <span class="attr-val">${v}</span>
    </div>`;
  }).join('');

  // Region synergy rows
  let regionRows = '';
  for (const [region, data] of Object.entries(regionResult.activeRegions || {})) {
    if (!region || region === 'null') continue;
    const color = (CONFIG.REGION_COLORS || {})[region] || '#aaa';
    regionRows += `
      <div class="syn-row syn-active syn-region">
        <span class="syn-icon" style="color:${color}">🌍</span>
        <span class="syn-name">${region}</span>
        <span class="syn-count count-active">${data.count}</span>
        <span class="syn-bonus">${data.desc}</span>
      </div>`;
  }

  el.innerHTML = `
    <div class="syn-title">Team Overview</div>
    <div class="attr-section-label">Technical</div>
    ${attrRows(techAttrs)}
    <div class="attr-section-label" style="margin-top:8px">Mental</div>
    ${attrRows(mentAttrs)}
    ${regionRows ? `<div class="syn-title" style="margin-top:10px">Region Synergies</div>${regionRows}` : ''}`;
}

// ─── Standings ────────────────────────────────────────────────────────────────

function renderStandings(state) {
  const el = document.getElementById('standings-table');
  if (!el) return;

  const standings = getStandings(state);
  const roundDone = Math.max(0, state.round - 1);

  el.innerHTML = `
    <h3 style="color:var(--gold);margin-bottom:12px">
      Season Standings — Round ${roundDone}/${CONFIG.ROUND_ROBIN_ROUNDS}
    </h3>
    <table class="standings">
      <thead><tr><th>#</th><th>Team</th><th>Strategy</th><th>W</th><th>L</th><th>K/D</th></tr></thead>
      <tbody>
        ${standings.map((t, i) => {
          const inBracket = i < CONFIG.BRACKET_SIZE;
          const diff = (t.kills||0) - (t.deaths||0);
          return `<tr class="${t.isHuman?'row-human':''} ${inBracket?'row-bracket':''}" onclick="showTeamRoster('${t.id}')" style="cursor:pointer" title="Click to view roster">
            <td>${i+1}${inBracket?' 🏆':''}</td>
            <td>${t.isHuman?'⭐ ':''}${t.name}</td>
            <td><span class="strat-badge">${t.isHuman?'You':t.strategy||'—'}</span></td>
            <td><b>${t.wins||0}</b></td>
            <td>${t.losses||0}</td>
            <td>${t.kills||0}/${t.deaths||0} <span style="color:${diff>=0?'var(--win)':'var(--loss)'}">(${diff>=0?'+':''}${diff})</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <p class="bracket-note">🏆 Top ${CONFIG.BRACKET_SIZE} advance to Playoffs</p>`;
}

// ─── Opponent Preview ─────────────────────────────────────────────────────────

function renderOpponentPreview(state) {
  const el = document.getElementById('opponent-info');
  if (!el) return;

  const opp = state._bracketOpponent || getHumanOpponent(state);
  if (!opp) { el.innerHTML = '<p style="color:var(--text-dim)">No opponent found.</p>'; return; }

  const roster = (opp.roster || []).filter(Boolean);

  el.innerHTML = `
    <div class="opp-header">
      <span class="opp-team-name">${opp.name}</span>
      <span class="opp-record">${opp.wins||0}W–${opp.losses||0}L</span>
    </div>
    <div class="opp-strategy">Strategy: <b>${opp.strategy||'Unknown'}</b></div>
    <div class="opp-roster">
      ${roster.length ? roster.map(p => `
        <div class="opp-player">
          <span>${posIcon(p.position)}</span>
          <span class="opp-name">${p.name}${p.stars>1?` ★${p.stars}`:''}</span>
          <span style="color:${tierColor(p.tier)};font-size:11px">${tierLabel(p.tier)}</span>
        </div>`).join('')
      : '<p style="color:var(--text-dim);font-size:12px">Roster building...</p>'}
    </div>`;
}

// ─── Match — Draft ────────────────────────────────────────────────────────────

function renderDraft(matchResult, blueTeamName, redTeamName) {
  setText('match-blue-name', blueTeamName);
  setText('match-red-name',  redTeamName);

  const renderPicks = (picks) => picks.filter(Boolean).map(pick => `
    <div class="draft-pick">
      <span class="pick-pos">${posIcon(pick.position)}</span>
      <span class="pick-player">${pick.player}${pick.stars > 1 ? starBadge(pick.stars) : ''}</span>
      <span class="pick-champ">→ ${pick.champion || '?'}</span>
    </div>`).join('');

  document.getElementById('draft-blue').innerHTML = renderPicks(matchResult.draft.blue.filter(Boolean));
  document.getElementById('draft-red').innerHTML  = renderPicks(matchResult.draft.red.filter(Boolean));

  const synEl = document.getElementById('comp-synergies');
  if (synEl) {
    const bSyn = matchResult.draft.blueComp ? COMP_SYNERGIES[matchResult.draft.blueComp] : null;
    const rSyn = matchResult.draft.redComp  ? COMP_SYNERGIES[matchResult.draft.redComp]  : null;
    const parts = [];
    if (bSyn) parts.push(`<span class="synergy blue-syn">🔵 ${bSyn.name}: ${bSyn.desc}</span>`);
    if (rSyn) parts.push(`<span class="synergy red-syn">🔴 ${rSyn.name}: ${rSyn.desc}</span>`);
    synEl.innerHTML = parts.join('');
  }

  // Show rating comparison
  const ratingEl = document.getElementById('rating-compare');
  if (ratingEl && matchResult.ratings) {
    const bR = matchResult.ratings.blue;
    const rR = matchResult.ratings.red;
    ratingEl.innerHTML = `
      <div class="rating-bar-group">
        ${ratingBar('Early Game', bR.earlyRating, rR.earlyRating)}
        ${ratingBar('Teamfighting', bR.tfRating, rR.tfRating)}
        ${ratingBar('Late Game', bR.lateRating, rR.lateRating)}
        ${ratingBar('Draft', bR.draftRating, rR.draftRating)}
      </div>`;
  }
}

function ratingBar(label, bVal, rVal) {
  const total = bVal + rVal || 1;
  const bPct  = Math.round((bVal / total) * 100);
  return `
    <div class="r-bar-row">
      <span class="r-label">${label}</span>
      <div class="r-bar-wrap">
        <div class="r-bar-blue" style="width:${bPct}%"></div>
        <div class="r-bar-red"  style="width:${100-bPct}%"></div>
      </div>
      <span class="r-vals">${Math.round(bVal)} | ${Math.round(rVal)}</span>
    </div>`;
}

// ─── Match — Play-by-Play ─────────────────────────────────────────────────────

let _pbpTimeouts = [];

// Speed presets: delay in ms between events (Infinity = paused)
const PBP_SPEEDS = { 0: Infinity, 1: 3000, 2: 1400, 4: 450, 99: 0 };
let _pbpCurrentDelay = 3000;
let _pbpPaused = false;
let _pbpRevealFn = null; // reference to active revealNext, for unpause

function startPlayByPlay(matchResult, blueTeamName, redTeamName) {
  _pbpTimeouts.forEach(t => clearTimeout(t));
  _pbpTimeouts = [];
  _pbpCurrentDelay = 3000;
  _pbpPaused = false;
  _pbpRevealFn = null;

  const eventsEl = document.getElementById('pbp-events');
  const resultsEl = document.getElementById('pbp-results');
  if (!eventsEl) return;

  eventsEl.innerHTML = '';
  if (resultsEl) resultsEl.style.display = 'none';
  if (typeof initMapVisualization === 'function') initMapVisualization();

  // Build speed-control bar in place of old skip button
  const ctrlEl = document.querySelector('.pbp-controls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="speed-controls">
        <span class="speed-label">Speed:</span>
        <button class="speed-btn" data-speed="0">■ Pause</button>
        <button class="speed-btn speed-active" data-speed="1">▶ 1×</button>
        <button class="speed-btn" data-speed="2">▶▶ 2×</button>
        <button class="speed-btn" data-speed="4">▶▶▶ 4×</button>
        <button class="speed-btn" data-speed="99">⏭ Skip</button>
      </div>`;
    ctrlEl.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        if (speed === 99) { skipAll(); return; }
        ctrlEl.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('speed-active'));
        btn.classList.add('speed-active');
        _pbpCurrentDelay = PBP_SPEEDS[speed] ?? 3000;
        if (speed === 0) {
          _pbpPaused = true;
          _pbpTimeouts.forEach(t => clearTimeout(t));
          _pbpTimeouts = [];
        } else if (_pbpPaused) {
          _pbpPaused = false;
          if (_pbpRevealFn) _pbpRevealFn();
        }
      });
    });
  }

  // Score bar
  setText('score-blue-kills', '0K');
  setText('score-blue-dragons', '🐉0');
  setText('score-blue-towers', '🏰0');
  setText('score-red-kills', '0K');
  setText('score-red-dragons', '🐉0');
  setText('score-red-towers', '🏰0');

  // Gold chart
  const goldSvg = document.getElementById('gold-chart-svg');
  if (goldSvg) goldSvg.innerHTML = '';
  const goldTotals = document.getElementById('gold-totals');
  if (goldTotals) goldTotals.style.display = 'none';
  const _goldPoints = [0];

  function redrawGoldChart() {
    if (!goldSvg) return;
    const W = goldSvg.clientWidth || 420;
    const H = 64;
    const cy = H / 2;
    const MAX = 4000;
    const pts = _goldPoints;
    if (pts.length < 2) { goldSvg.innerHTML = ''; return; }
    const xs = (i) => (i / (pts.length - 1)) * W;
    const ys = (v) => cy - clamp(v / MAX, -1, 1) * (cy - 4);
    let lineStr = '', blueStr = `0,${cy} `, redStr = `0,${cy} `;
    pts.forEach((v, i) => {
      const x = xs(i).toFixed(1), y = ys(v).toFixed(1);
      lineStr += `${x},${y} `;
      blueStr += `${x},${Math.min(parseFloat(y), cy).toFixed(1)} `;
      redStr  += `${x},${Math.max(parseFloat(y), cy).toFixed(1)} `;
    });
    const lastX = xs(pts.length - 1).toFixed(1);
    blueStr += `${lastX},${cy}`;
    redStr  += `${lastX},${cy}`;
    goldSvg.innerHTML = `
      <line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      <polygon points="${blueStr}" fill="rgba(79,195,247,0.22)"/>
      <polygon points="${redStr}"  fill="rgba(255,123,123,0.22)"/>
      <polyline points="${lineStr}" fill="none" stroke="${_goldPoints[_goldPoints.length-1] >= 0 ? '#4fc3f7' : '#ff7b7b'}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  const fill = document.getElementById('advantage-fill');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '50%'; }

  const PHASE_HEADERS = {
    laning:   '⚔️ Laning Phase  (0–14 min)',
    midgame:  '🐉 Mid Game  (14–26 min)',
    lategame: '🟣 Late Game  (26+ min)',
  };

  const queue = [];
  ['laning', 'midgame', 'lategame'].forEach(phase => {
    const phaseEvents = matchResult.events[phase] || [];
    if (phaseEvents.length) {
      queue.push({ type: 'header', phase, text: PHASE_HEADERS[phase] });
      phaseEvents.forEach(e => queue.push(e));
    }
  });

  const live = { blue: { kills:0, towers:0, dragons:0, barons:0 }, red: { kills:0, towers:0, dragons:0, barons:0 } };
  let idx = 0;
  let finished = false;

  function updateLiveScoreBar(ev) {
    if (ev.killBlue !== undefined)    { live[ev.killBlue?'blue':'red'].kills++; }
    if (ev.tfBlueKills !== undefined) { live.blue.kills += ev.tfBlueKills || 0; live.red.kills += ev.tfRedKills || 0; }
    if (ev.towerBlue !== undefined)   { live[ev.towerBlue?'blue':'red'].towers++; }
    if (ev.dragonBlue !== undefined)  { live[ev.dragonBlue?'blue':'red'].dragons++; }
    if (ev.baronBlue !== undefined)   { live[ev.baronBlue?'blue':'red'].barons++; }

    setText('score-blue-kills',   `${live.blue.kills}K`);
    setText('score-blue-dragons', `🐉${live.blue.dragons}`);
    setText('score-blue-towers',  `🏰${live.blue.towers}`);
    setText('score-red-kills',    `${live.red.kills}K`);
    setText('score-red-dragons',  `🐉${live.red.dragons}`);
    setText('score-red-towers',   `🏰${live.red.towers}`);

    if (ev.advAfter !== undefined) {
      const pct = ev.advAfter;
      if (fill) {
        fill.style.transition = 'width 0.8s ease';
        fill.style.width = `${pct}%`;
        fill.style.background = pct >= 50
          ? `linear-gradient(90deg, #0d2a5a ${100-pct}%, #4fc3f7 100%)`
          : `linear-gradient(90deg, #ff7b7b 0%, #5a0d0d ${pct}%)`;
      }
    }

    if (ev.goldDiff !== undefined) {
      _goldPoints.push(ev.goldDiff);
      redrawGoldChart();
    }
  }

  function addEventLine(ev) {
    const el = document.createElement('div');
    if (ev.type === 'header') {
      el.className = 'pbp-phase-header';
      el.textContent = ev.text;
    } else {
      const blueWon = ev.killBlue    !== undefined ? ev.killBlue   :
                      ev.towerBlue   !== undefined ? ev.towerBlue  :
                      ev.dragonBlue  !== undefined ? ev.dragonBlue :
                      ev.baronBlue   !== undefined ? ev.baronBlue  :
                      ev.tfBlueKills !== undefined ? (ev.tfBlueKills > (ev.tfRedKills||0)) : null;
      const sideClass = blueWon === true ? ' pbp-blue-event' : blueWon === false ? ' pbp-red-event' : '';
      el.className = `pbp-line pbp-${ev.type || 'commentary'}${sideClass}`;
      el.innerHTML = `<span class="pbp-time">${ev.time || ''}</span><span class="pbp-text">${ev.text || ''}</span>`;
      updateLiveScoreBar(ev);
      if (typeof updateMap === 'function') updateMap(ev);
    }
    eventsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add('pbp-visible'));
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function revealNext() {
    if (finished) return;
    if (_pbpPaused) { _pbpRevealFn = revealNext; return; }
    if (idx >= queue.length) {
      onPlayByPlayComplete();
      return;
    }
    addEventLine(queue[idx++]);
    if (_pbpCurrentDelay === 0) {
      // Instant: schedule on next microtask to avoid stack overflow
      _pbpRevealFn = revealNext;
      const t = setTimeout(revealNext, 0);
      _pbpTimeouts.push(t);
    } else if (_pbpCurrentDelay < Infinity) {
      _pbpRevealFn = revealNext;
      const t = setTimeout(revealNext, _pbpCurrentDelay);
      _pbpTimeouts.push(t);
    } else {
      // Paused — store for resume
      _pbpRevealFn = revealNext;
    }
  }

  function skipAll() {
    if (finished) return;
    finished = true;
    if (typeof setMapSkipMode === 'function') setMapSkipMode(true);
    _pbpTimeouts.forEach(t => clearTimeout(t));
    _pbpTimeouts = [];
    while (idx < queue.length) addEventLine(queue[idx++]);
    if (typeof setMapSkipMode === 'function') setMapSkipMode(false);
    onPlayByPlayComplete();
  }

  function onPlayByPlayComplete() {
    finished = true;
    // Hide speed controls
    if (ctrlEl) ctrlEl.innerHTML = '';
    updateScoreBar(matchResult);
    const gt  = document.getElementById('gold-totals');
    const gbt = document.getElementById('gold-blue-total');
    const grt = document.getElementById('gold-red-total');
    if (gt && gbt && grt && matchResult.stats) {
      const bg = matchResult.stats.blue.gold;
      const rg = matchResult.stats.red.gold;
      if (bg > 55000 && rg > 55000) {
        gbt.textContent = `💰 Blue: ${(bg/1000).toFixed(1)}k`;
        grt.textContent = `Red: ${(rg/1000).toFixed(1)}k 💰`;
        gt.style.display = 'flex';
      }
    }
    applyMatchResultAndShowInline();
  }

  const t0 = setTimeout(revealNext, 400);
  _pbpTimeouts.push(t0);
}

function updateScoreBar(mr) {
  const s = mr.stats;
  setText('score-blue-kills',   `${s.blue.kills}K`);
  setText('score-blue-dragons', `🐉${s.blue.dragons}`);
  setText('score-blue-towers',  `🏰${s.blue.towers}`);
  setText('score-red-kills',    `${s.red.kills}K`);
  setText('score-red-dragons',  `🐉${s.red.dragons}`);
  setText('score-red-towers',   `🏰${s.red.towers}`);

  const fill = document.getElementById('advantage-fill');
  if (fill) {
    fill.style.width = `${mr.advantage}%`;
    fill.style.background = mr.advantage >= 50
      ? `linear-gradient(90deg, #0d2a5a ${100-mr.advantage}%, #4fc3f7 100%)`
      : `linear-gradient(90deg, #ff7b7b 0%, #5a0d0d ${mr.advantage}%)`;
  }
}

// ─── Inline Results (shown after play-by-play completes) ──────────────────────

function renderInlineResults(state, matchResult, won, income) {
  const el = document.getElementById('pbp-results');
  const contentEl = document.getElementById('pbp-results-content');
  if (!el || !contentEl) return;

  const s = matchResult.stats;
  const oppName = matchResult._opponent?.name || 'Opponent';

  const kdaRow = (side, pos) => {
    const entry = s[side].kda?.[pos];
    if (!entry) return '';
    return `<tr><td class="${side}-val">${entry.name}</td><td>${entry.champion || '—'}</td><td>${entry.k}</td><td>${entry.d}</td><td>${entry.a}</td></tr>`;
  };

  contentEl.innerHTML = `
    <div class="pbp-result-banner ${won ? 'win' : 'loss'}">
      <span class="result-icon">${won ? '🏆' : '💀'}</span>
      <span class="result-text">${won ? 'VICTORY' : 'DEFEAT'}</span>
    </div>
    <div class="pbp-result-body">
      <div class="pbp-stats-table">
        <table class="match-stats-table">
          <thead><tr><th>${state.teamName}</th><th></th><th>${oppName}</th></tr></thead>
          <tbody>
            <tr><td class="blue-val">${s.blue.kills}</td><td>Kills</td><td class="red-val">${s.red.kills}</td></tr>
            <tr><td class="blue-val">${s.blue.towers}</td><td>Towers</td><td class="red-val">${s.red.towers}</td></tr>
            <tr><td class="blue-val">${s.blue.dragons}</td><td>Dragons</td><td class="red-val">${s.red.dragons}</td></tr>
            <tr><td class="blue-val">${s.blue.barons}</td><td>Barons</td><td class="red-val">${s.red.barons}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pbp-gold-earned">
        <span>💰 Gold Earned: </span>
        <span>${income.base}g base</span>
        ${income.interest > 0 ? `<span>+ ${income.interest}g interest</span>` : ''}
        ${income.streakBonus > 0 ? `<span>+ ${income.streakBonus}g streak</span>` : ''}
        <span class="gold-total-inline">= <b>${income.total}g</b></span>
      </div>
    </div>
    <div class="pbp-kda-section">
      <h4 class="kda-title">Player KDA</h4>
      <div class="kda-tables">
        <table class="kda-table">
          <colgroup><col style="width:38%"><col style="width:32%"><col style="width:10%"><col style="width:10%"><col style="width:10%"></colgroup>
          <thead><tr><th colspan="5" class="blue-header">${state.teamName} (Blue)</th></tr>
          <tr><th>Player</th><th>Champion</th><th>K</th><th>D</th><th>A</th></tr></thead>
          <tbody>
            ${CONFIG.POSITIONS.map(pos => kdaRow('blue', pos)).join('')}
          </tbody>
        </table>
        <table class="kda-table">
          <colgroup><col style="width:38%"><col style="width:32%"><col style="width:10%"><col style="width:10%"><col style="width:10%"></colgroup>
          <thead><tr><th colspan="5" class="red-header">${oppName} (Red)</th></tr>
          <tr><th>Player</th><th>Champion</th><th>K</th><th>D</th><th>A</th></tr></thead>
          <tbody>
            ${CONFIG.POSITIONS.map(pos => kdaRow('red', pos)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Bracket ──────────────────────────────────────────────────────────────────

function renderBracket(state) {
  const el = document.getElementById('bracket-view');
  if (!el || !state.bracket) return;

  const { semis, final, champion } = state.bracket;

  const matchCard = (match, label) => {
    const aW = match.winner?.id === match.teamA?.id;
    const bW = match.winner?.id === match.teamB?.id;
    return `
      <div class="bracket-match">
        <div class="bracket-label">${label}</div>
        <div class="bracket-team ${aW?'winner':''} ${match.teamA?.isHuman?'human-team':''}">
          ${match.teamA?.isHuman?'⭐ ':''}${match.teamA?.name||'TBD'}${aW?' 🏆':''}
        </div>
        <div class="vs-label">vs</div>
        <div class="bracket-team ${bW?'winner':''} ${match.teamB?.isHuman?'human-team':''}">
          ${match.teamB?.isHuman?'⭐ ':''}${match.teamB?.name||'TBD'}${bW?' 🏆':''}
        </div>
      </div>`;
  };

  el.innerHTML = `
    <div class="bracket-grid">
      <div class="bracket-col">
        <h3>Semi-Finals</h3>
        ${semis.map((m,i) => matchCard(m, m.label||`Match ${i+1}`)).join('')}
      </div>
      <div class="bracket-arrow">→</div>
      <div class="bracket-col">
        <h3>Grand Final</h3>
        ${matchCard(final, 'Final')}
        ${champion ? `<div class="champion-banner">🏆 Champion: ${champion.name}</div>` : ''}
      </div>
    </div>`;
}

// ─── Team Roster Modal ────────────────────────────────────────────────────────

function showTeamRoster(teamId) {
  const team = G.allTeams.find(t => t.id === teamId);
  if (!team) return;

  let modal = document.getElementById('team-roster-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'team-roster-modal';
    modal.className = 'team-roster-modal';
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    document.body.appendChild(modal);
  }

  const roster = (team.roster || []).filter(Boolean);
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-team-name">${team.isHuman ? '⭐ ' : ''}${team.name}</span>
        <span class="modal-record">${team.wins||0}W–${team.losses||0}L · <b>${team.isHuman ? 'You' : team.strategy || 'AI'}</b></span>
        <button class="modal-close" onclick="document.getElementById('team-roster-modal').style.display='none'">✕</button>
      </div>
      <div class="modal-roster">
        ${roster.length
          ? roster.map(p => playerCardHTML(p, 'view')).join('')
          : '<p style="color:var(--text-dim);padding:12px">No players yet.</p>'}
      </div>
    </div>`;
  modal.style.display = 'flex';
}

// ─── Game Over ────────────────────────────────────────────────────────────────

function renderGameOver(state, isChampion) {
  const el = document.getElementById('gameover-content');
  if (!el) return;

  const human    = state.allTeams[0];
  const standings = getStandings(state);
  const place    = standings.findIndex(t => t.isHuman) + 1;

  const placeText = { 1:'🥇 Champions!', 2:'🥈 Runner-Up', 3:'🥉 3rd Place', 4:'4th Place' }[place] || `${place}th`;

  el.innerHTML = isChampion ? `
    <div class="gameover-win">
      <div class="trophy-big">🏆</div>
      <h1>WORLD CHAMPIONS!</h1>
      <p>${state.teamName} defeats all challengers!</p>
      <p class="final-record">${human.wins}W – ${human.losses}L · ${human.kills}K</p>
    </div>` : `
    <div class="gameover-loss">
      <div class="trophy-big">${place <= 2 ? '🥈' : '💀'}</div>
      <h2>${placeText}</h2>
      <p>${state.teamName} ends the season with ${human.wins}W – ${human.losses}L</p>
      ${place > 4 ? '<p>Didn\'t make playoffs — rebuild for next season.</p>' : '<p>So close! Better luck next time.</p>'}
    </div>`;
}
