// js/game/state.js — Core game state for Grove Manager FM-style career mode

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = ['vanguard', 'ranger', 'arcanist', 'hunter', 'warden'];

const PLAYSTYLES = {
  engage:    { name: 'Engage',     desc: 'Frontload team fights, contest Ley Shrines aggressively' },
  poke:      { name: 'Poke',       desc: 'Chip enemies before committing; pressure Ancient Roots safely' },
  pick:      { name: 'Pick',       desc: 'Isolate and eliminate single targets near shrines' },
  protect:   { name: 'Protect',   desc: 'Shield the Hunter, peel and survive the boss fight' },
  splitpush: { name: 'Splitpush', desc: 'Apply side-lane Root pressure while contesting shrines' },
  scaling:   { name: 'Scaling',   desc: 'Survive early, stack Verdant Blessings, dominate late' },
};

// ─── Game State ───────────────────────────────────────────────────────────────

let G = null; // global game state — set by initGame()

function initGame(humanTeamId) {
  const season = buildSeason(2025, 'spring');

  // Build team objects from TEAMS_DATA
  const teams = {};
  TEAMS_DATA.forEach(td => {
    const roster  = PLAYER_DB.filter(p => p.teamId === td.id && !isAcademy(p, td.id));
    const academy = PLAYER_DB.filter(p => p.teamId === td.id &&  isAcademy(p, td.id));

    teams[td.id] = {
      ...td,
      isHuman: td.id === humanTeamId,
      wins: 0, losses: 0, points: 0,
      // Starting roster: best player at each position
      roster:  buildStartingLineup(td.id),
      academy: academy.map(p => p.id),
      tactics: {
        playstyle: td.id === humanTeamId ? 'engage' : randomPlaystyle(),
      },
      weeklyWages: calcWagesBill(td.id),
      sponsorIncome: Math.round(td.fans / 8),  // rough sponsor income per week
      news: [],
    };
  });

  // Build player instance map (id → player with live morale/form/career)
  const players = {};
  PLAYER_DB.forEach(p => {
    players[p.id] = {
      ...p,
      stats:     { ...p.stats },
      champions: [...p.champions],
      contract:  { ...p.contract },
      morale: 7,
      form:   [6, 6, 6],
      injured: false,
      onTransferList: false,
      // Career stats — accumulated across all matches this player appears in
      career: {
        gamesPlayed: 0,
        wins:        0,
        losses:      0,
        kills:       0,
        deaths:      0,
        assists:     0,
        cs:          0,
        damageDealt: 0,
        // Per-champion breakdown: { [champName]: { games, kills, deaths, assists } }
        championStats: {},
      },
    };
  });

  // World stats — aggregate tracking across every simulated match (AI vs AI + human)
  const stats = {
    totalMatches: 0,
    // All-time leaderboards (sorted arrays rebuilt on demand)
    leaderboards: {
      kills:       [],   // { playerId, name, value }
      assists:     [],
      cs:          [],
      kda:         [],   // (kills+assists)/deaths
      damageDealt: [],
      winRate:     [],   // wins / gamesPlayed (min 5 games)
    },
  };

  G = {
    humanTeamId,
    teams,
    players,
    freeAgents: PLAYER_DB.filter(p => !p.teamId).map(p => p.id),
    season,
    stats,
    news:           [],
    selectedPlayerId: null,
    weeklyTraining: 'rest',    // human's training choice for the current week
    trainingLog:    [],        // [{ week, teamId, choice }]
    financeLog:     [],        // [{ week, wages, income, net, balance }]
  };

  addNews(`Welcome to Grove Manager! You are now the manager of ${teams[humanTeamId].name}. Good luck!`, 'info');
  addNews(`The ${G.season.split === 'spring' ? 'Spring' : 'Summer'} Split ${G.season.year} is about to begin. Your first match is in Week 1.`, 'info');

  return G;
}

// ─── Roster helpers ───────────────────────────────────────────────────────────

function isAcademy(player, teamId) {
  // Academy players are the 2nd player at any position for a team
  const teamPlayers = PLAYER_DB.filter(p => p.teamId === teamId);
  const pos = player.position;
  const samePos = teamPlayers.filter(p => p.position === pos);
  // Sort by overall: first is starter, rest are academy
  samePos.sort((a, b) => calcOverall(b) - calcOverall(a));
  return samePos.indexOf(player) > 0;
}

function buildStartingLineup(teamId) {
  const lineup = {};
  POSITIONS.forEach(pos => {
    const candidates = PLAYER_DB.filter(p => p.teamId === teamId && p.position === pos);
    candidates.sort((a, b) => calcOverall(b) - calcOverall(a));
    lineup[pos] = candidates.length ? candidates[0].id : null;
  });
  return lineup;
}

function calcWagesBill(teamId) {
  return PLAYER_DB
    .filter(p => p.teamId === teamId)
    .reduce((sum, p) => sum + (p.contract.salary || 0), 0);
}

// ─── Season builder ───────────────────────────────────────────────────────────

function buildSeason(year, split) {
  const teamIds = TEAMS_DATA.map(t => t.id);
  const schedule = generateRoundRobin(teamIds, year, split);
  return {
    year,
    split,           // 'spring' | 'summer'
    week:  1,
    phase: 'regular',  // 'regular' | 'playoffs' | 'offseason'
    schedule,         // array of { week, matchday, homeId, awayId, played, result }
    totalWeeks: 7,    // 7-week regular season (8 teams, each plays every other once)
  };
}

// Generate a round-robin schedule (each team plays every other team once)
function generateRoundRobin(teamIds, year, split) {
  const n    = teamIds.length;         // 10 teams
  const matches = [];
  // Standard round-robin rotation algorithm
  const teams = [...teamIds];
  const fixed = teams.shift();          // fix first team, rotate the rest
  const weeks = teams.length;           // 9 weeks
  for (let w = 0; w < weeks; w++) {
    const pairs = [[fixed, teams[w]]];
    for (let i = 1; i < Math.floor(n / 2); i++) {
      const a = (w + i)     % teams.length;
      const b = (w + teams.length - i) % teams.length;
      pairs.push([teams[a], teams[b]]);
    }
    pairs.forEach(([a, b]) => {
      matches.push({
        week:    w + 1,
        homeId:  a,
        awayId:  b,
        played:  false,
        result:  null,   // { winnerId, blueScore, redScore, events }
      });
    });
  }
  return matches;
}

// ─── Week advancement ─────────────────────────────────────────────────────────

function advanceWeek() {
  const { season } = G;
  if (season.phase === 'offseason') return { type: 'offseason' };

  const week      = season.week;
  const matchWeek = getWeekMatches(week);
  const humanMatch = matchWeek.find(m => m.homeId === G.humanTeamId || m.awayId === G.humanTeamId);

  // Simulate all AI vs AI matches
  matchWeek.forEach(m => {
    if (!m.played && !(m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)) {
      simulateAIMatch(m);
    }
  });

  // Weekly finances: wages out, sponsor income in (all teams)
  Object.values(G.teams).forEach(t => {
    const wages  = t.weeklyWages;
    const income = t.sponsorIncome;
    t.budget = (t.budget || 0) - wages + income;
    if (t.id === G.humanTeamId) {
      G.financeLog.push({
        week, wages, income, net: income - wages, balance: t.budget,
      });
      if (t.budget < 0)
        addNews(`Financial warning: budget is ${fmtMoneySafe(t.budget)}. Consider releasing high earners.`, 'alert');
    }
  });

  // Fan changes based on results this week
  matchWeek.filter(m => m.played && m.result).forEach(m => {
    _applyFanChange(m.homeId, m.result.winnerId === m.homeId);
    _applyFanChange(m.awayId, m.result.winnerId === m.awayId);
  });

  // Process training for human team
  processTraining(G.humanTeamId, G.weeklyTraining || 'rest');

  // Player development tick (every week, minor)
  processPlayerDevelopment();

  // Advance week counter
  season.week++;

  // Check for playoffs / offseason
  if (season.week > season.totalWeeks && season.phase === 'regular') {
    season.phase = 'playoffs';
    addNews('The regular season is over! The top 4 teams advance to the playoffs.', 'info');
  }

  // Reset weekly training choice
  G.weeklyTraining = 'rest';

  return { type: 'week_advanced', week, humanMatch };
}

// ─── Fan change from match result ────────────────────────────────────────────

function _applyFanChange(teamId, won) {
  const t = G.teams[teamId];
  if (!t) return;
  const pct = won
    ? 0.02 + Math.random() * 0.02   // +2–4%
    : -(0.005 + Math.random() * 0.005); // −0.5–1%
  t.fans = Math.round(t.fans * (1 + pct));
}

// ─── Training system ──────────────────────────────────────────────────────────
// Choices: rest | scrimmage | soloqueue | filmstudy | streaming

const TRAINING_DEFS = {
  rest: {
    label: 'Rest',
    icon: '😴',
    desc: 'Players recover. Morale +1 for all. No attribute gains.',
    effect(players) {
      players.forEach(p => { if (p) p.morale = Math.min(10, p.morale + 1); });
    },
  },
  scrimmage: {
    label: 'Scrimmage',
    icon: '⚔️',
    desc: 'Internal practice match. Small chance to improve a combat stat for each player.',
    effect(players) {
      const combatStats = ['mechanics','teamfightPositioning','mapMovement'];
      players.forEach(p => {
        if (!p) return;
        const moraleBonus = p.morale > 7 ? 1.5 : p.morale < 4 ? 0.5 : 1;
        if (Math.random() < 0.18 * moraleBonus) {
          const stat = combatStats[Math.floor(Math.random()*combatStats.length)];
          p.stats[stat] = Math.min(20, p.stats[stat] + 1);
        }
      });
    },
  },
  soloqueue: {
    label: 'Solo Queue',
    icon: '🎮',
    desc: 'Individual ranked grind. One player gains +1 to Mechanics or Decision Making.',
    effect(players) {
      const eligible = players.filter(p => p && p.age < 27);
      if (!eligible.length) return;
      const p = eligible[Math.floor(Math.random()*eligible.length)];
      const stat = Math.random() < 0.6 ? 'mechanics' : 'decisionMaking';
      const moraleBonus = p.morale > 7 ? 1.5 : 1;
      if (Math.random() < 0.35 * moraleBonus)
        p.stats[stat] = Math.min(20, p.stats[stat] + 1);
    },
  },
  filmstudy: {
    label: 'Film Study',
    icon: '📹',
    desc: 'Review opponent footage. Small boost to Game Sense and Adaptability for all.',
    effect(players) {
      players.forEach(p => {
        if (!p) return;
        if (Math.random() < 0.15) p.stats.gameSense      = Math.min(20, p.stats.gameSense + 1);
        if (Math.random() < 0.12) p.stats.adaptability   = Math.min(20, p.stats.adaptability + 1);
      });
    },
  },
  streaming: {
    label: 'Streaming',
    icon: '📡',
    desc: 'Players stream online. Fans +1.5%, morale +0.5 each.',
    effect(players, teamId) {
      const t = G.teams[teamId];
      if (t) t.fans = Math.round(t.fans * 1.015);
      players.forEach(p => {
        if (p) p.morale = Math.min(10, p.morale + 0.5);
      });
    },
  },
};

function processTraining(teamId, choice) {
  const def = TRAINING_DEFS[choice] || TRAINING_DEFS.rest;
  const team = G.teams[teamId];
  if (!team) return;
  const players = POSITIONS.map(pos => {
    const pid = team.roster[pos];
    return pid ? G.players[pid] : null;
  });
  def.effect(players, teamId);

  // Record in finance log
  if (!G.trainingLog) G.trainingLog = [];
  G.trainingLog.push({ week: G.season.week, teamId, choice });
}

// ─── Player development ───────────────────────────────────────────────────────

function processPlayerDevelopment() {
  Object.values(G.players).forEach(p => {
    if (!p) return;
    const moraleBonus = p.morale > 7 ? 1.5 : p.morale < 4 ? 0.5 : 1;

    // Young players (<22): chance to improve
    if (p.age < 22) {
      const allStats = Object.keys(p.stats);
      if (Math.random() < 0.08 * moraleBonus) {
        const stat = allStats[Math.floor(Math.random()*allStats.length)];
        p.stats[stat] = Math.min(20, p.stats[stat] + 1);
      }
    }

    // Veterans (>28): slight chance to decline
    if (p.age > 28) {
      const allStats = Object.keys(p.stats);
      if (Math.random() < 0.04) {
        const stat = allStats[Math.floor(Math.random()*allStats.length)];
        p.stats[stat] = Math.max(1, p.stats[stat] - 1);
      }
    }
  });
}

function getWeekMatches(week) {
  return G.season.schedule.filter(m => m.week === week);
}

function simulateAIMatch(match) {
  const home = G.teams[match.homeId];
  const away = G.teams[match.awayId];
  if (!home || !away) return;

  const homePlayers = getActiveRoster(match.homeId);
  const awayPlayers = getActiveRoster(match.awayId);
  const result      = quickSimulateMatch(homePlayers, awayPlayers);
  const homeWon     = result === 'blue';

  match.played = true;
  match.result = { winnerId: homeWon ? match.homeId : match.awayId };

  if (homeWon) { home.wins++; home.points += 3; away.losses++; }
  else         { away.wins++; away.points += 3; home.losses++; }
}

function getActiveRoster(teamId) {
  const team = G.teams[teamId];
  if (!team) return [];
  return POSITIONS.map(pos => {
    const pid = team.roster[pos];
    return pid ? G.players[pid] : null;
  });
}

// Quick sim for AI matches (no PBP needed)
function quickSimulateMatch(homePlayers, awayPlayers) {
  const homeScore = homePlayers.reduce((s, p) => s + (p ? calcOverall(p) : 50), 0);
  const awayScore = awayPlayers.reduce((s, p) => s + (p ? calcOverall(p) : 50), 0);
  const diff      = homeScore - awayScore;
  const homeWinPct = Math.min(85, Math.max(15, 50 + diff * 0.5));
  return Math.random() * 100 < homeWinPct ? 'blue' : 'red';
}

// ─── Standings ────────────────────────────────────────────────────────────────

function getStandings() {
  return Object.values(G.teams)
    .map(t => ({ id: t.id, name: t.name, shortName: t.shortName, color: t.color,
                 isHuman: t.isHuman, wins: t.wins, losses: t.losses, points: t.points }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

// ─── News ─────────────────────────────────────────────────────────────────────

function addNews(text, type = 'info') {
  G.news.unshift({ text, type, week: G.season.week, timestamp: Date.now() });
  if (G.news.length > 50) G.news.pop();
}

// ─── Internal format helpers ──────────────────────────────────────────────────

function fmtMoneySafe(n) {
  const abs = Math.abs(n || 0), sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs/1e3)}K`;
  return `${sign}$${abs}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomPlaystyle() {
  const keys = Object.keys(PLAYSTYLES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function getHumanTeam()   { return G.teams[G.humanTeamId]; }
function getHumanRoster() { return getActiveRoster(G.humanTeamId); }

function getWeekLabel() {
  const { week, split, year, phase } = G.season;
  if (phase === 'playoffs')  return `Playoffs — ${year}`;
  if (phase === 'offseason') return `Offseason — ${year}`;
  return `Week ${week} — ${split === 'spring' ? 'Spring' : 'Summer'} Split ${year}`;
}
