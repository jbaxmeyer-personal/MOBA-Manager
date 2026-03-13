// js/game/simulation.js — Rift Manager match simulation engine v4
//
// FM-quality tick-aware simulation with:
//   • Per-champion agents with archetypes and ultimates
//   • LoL-accurate objective timers, death timers, gold, and item scaling
//   • Role behaviors affecting event generation and positioning
//   • Full position tracking (posMap) attached to every event and snapshot
//   • Champion-name, ult-name PBP commentary
//   • Archetype fight bonuses (ENGAGE, ASSASSIN, SPLITPUSH, SCALING, PROTECT, etc.)
//   • Same public API as v3: simulateMatch, quickSimulate, calcTeamRatings, draftChampions
//
// Speed control: UI may call setPBPSpeed(multiplier) to adjust playback cadence.
// The engine itself produces all events synchronously; speed is purely a UI concern.

// ─── Speed Control (UI hook) ──────────────────────────────────────────────────

var _pbpSpeed = 1.0;
function setPBPSpeed(mult) { _pbpSpeed = Math.max(0.25, Math.min(4, mult || 1)); }

// ─── Utilities ────────────────────────────────────────────────────────────────

function rand(min, max)    { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
function chance(pct)       { return Math.random() * 100 < pct; }
function randFrom(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArr(a)     { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b; }

// Formats float minutes → "MM:SS"
function padTime(m, s) {
  if (s === undefined) {
    const min = Math.floor(m), sec = Math.floor((m - min) * 60);
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Champion Archetype Database ──────────────────────────────────────────────
// Maps champion name → archetype + ultimate info for PBP commentary.
// Archetype values: ENGAGE | POKE | ASSASSIN | PROTECT | SPLITPUSH | SCALING | BRUISER | TANK | ENCHANTER

const CHAMPION_DATA = {
  // ── Mid laners ────────────────────────────────────────────────────────────
  'Azir':          { archetype:'SCALING',   ult:'Emperor\'s Divide',    ultDesc:'erects a wall of soldiers to block the enemy team' },
  'Orianna':       { archetype:'ENGAGE',    ult:'Command: Shockwave',   ultDesc:'launches a shockwave that pulls all nearby enemies in' },
  'Viktor':        { archetype:'POKE',      ult:'Chaos Storm',          ultDesc:'unleashes a Chaos Storm that follows enemies around the map' },
  'Syndra':        { archetype:'POKE',      ult:'Unleashed Power',      ultDesc:'hurls all her dark spheres at once for massive burst damage' },
  'Cassiopeia':    { archetype:'SCALING',   ult:'Petrifying Gaze',      ultDesc:'turns the entire enemy frontline to stone' },
  'Zoe':           { archetype:'POKE',      ult:'Portal Jump',          ultDesc:'teleports to the enemy and fires a point-blank Sleepy Bubble' },
  'LeBlanc':       { archetype:'ASSASSIN',  ult:'Mimic',                ultDesc:'duplicates her last ability to chain double burst combos' },
  'Akali':         { archetype:'ASSASSIN',  ult:'Perfect Execution',    ultDesc:'dashes through the enemy carry with two devastating strikes' },
  'Zed':           { archetype:'ASSASSIN',  ult:'Death Mark',           ultDesc:'teleports to the enemy carry and marks them for lethal damage' },
  'Yasuo':         { archetype:'ENGAGE',    ult:'Last Breath',          ultDesc:'locks every airborne target in place with a deadly strike' },
  'Corki':         { archetype:'POKE',      ult:'Missile Barrage',      ultDesc:'saturates the front line with rockets from extreme range' },
  'Twisted Fate':  { archetype:'POKE',      ult:'Destiny',              ultDesc:'reveals all enemies across the map and teleports to an exposed target' },
  'Ryze':          { archetype:'SCALING',   ult:'Realm Warp',           ultDesc:'opens a portal to teleport the whole team across the map' },
  'Lux':           { archetype:'POKE',      ult:'Final Spark',          ultDesc:'fires a massive laser beam that one-shots low-health targets' },
  'Vex':           { archetype:'POKE',      ult:'Shadow Surge',         ultDesc:'launches her shadow to mark a fleeing enemy then dashes in for the kill' },
  'Annie':         { archetype:'ENGAGE',    ult:'Summon: Tibbers',      ultDesc:'summons Tibbers to stun and incinerate the entire enemy team' },

  // ── Top laners ────────────────────────────────────────────────────────────
  'Renekton':      { archetype:'BRUISER',   ult:'Dominus',              ultDesc:'enlarges to tower over the fight and drain enemies\' health' },
  'Camille':       { archetype:'SPLITPUSH', ult:'Hextech Ultimatum',    ultDesc:'traps the enemy carry in an inescapable hexagonal prison' },
  'Gnar':          { archetype:'ENGAGE',    ult:'GNAR!',                ultDesc:'transforms into Mega Gnar and hurls the entire enemy team into a wall' },
  'Jayce':         { archetype:'POKE',      ult:'Transform: Mercury Cannon', ultDesc:'switches to cannon form to bombard enemies from a safe distance' },
  'Fiora':         { archetype:'SPLITPUSH', ult:'Grand Challenge',      ultDesc:'duels the tankiest enemy and heals the entire team on completion' },
  'Irelia':        { archetype:'SPLITPUSH', ult:'Vanguard\'s Edge',     ultDesc:'slices a massive blade wave through the team to disarm them' },
  'Riven':         { archetype:'SPLITPUSH', ult:'Blade of the Exile',   ultDesc:'channels unstoppable energy and fires a devastating wind slash' },
  'Darius':        { archetype:'BRUISER',   ult:'Noxian Guillotine',    ultDesc:'executes an enemy with a fountain of resets' },
  'Malphite':      { archetype:'TANK',      ult:'Unstoppable Force',    ultDesc:'launches an unstoppable rocket punch that knocks up the entire enemy team' },
  'Ornn':          { archetype:'TANK',      ult:'Call of the Forge God', ultDesc:'summons a massive Ram to charge through the entire team' },
  'Garen':         { archetype:'BRUISER',   ult:'Demacian Justice',     ultDesc:'calls down a magical sword to execute the most wanted enemy' },
  'Wukong':        { archetype:'BRUISER',   ult:'Cyclone',              ultDesc:'spins through the entire team knocking them all into the air' },
  'Mordekaiser':   { archetype:'SCALING',   ult:'Realm of Death',       ultDesc:'banishes the enemy carry to a death realm for a 1v1 duel' },
  'Nasus':         { archetype:'SCALING',   ult:'Fury of the Sands',    ultDesc:'grows to massive size to crush everything in his path' },
  'Pantheon':      { archetype:'ENGAGE',    ult:'Grand Starfall',       ultDesc:'crashes down from the sky to intercept enemies across the map' },
  'Quinn':         { archetype:'SPLITPUSH', ult:'Behind Enemy Lines',   ultDesc:'takes flight across the map to pressure isolated side lanes' },

  // ── Junglers ──────────────────────────────────────────────────────────────
  'Lee Sin':       { archetype:'ASSASSIN',  ult:'Dragon\'s Rage',       ultDesc:'kicks a target into their own team — the ultimate caster in pro play' },
  "Rek'Sai":       { archetype:'ENGAGE',    ult:'Void Rush',            ultDesc:'burrows under the ground and erupts beneath the priority target' },
  'Nidalee':       { archetype:'POKE',      ult:'Aspect of the Cougar', ultDesc:'transforms into a cougar and pounces on wounded targets' },
  'Elise':         { archetype:'ASSASSIN',  ult:'Spider Form',          ultDesc:'transforms into a spider to rappel and web-stun the enemy carry' },
  'Evelynn':       { archetype:'ASSASSIN',  ult:'Last Caress',          ultDesc:'obliterates a low-health target then vanishes from sight' },
  'Hecarim':       { archetype:'ENGAGE',    ult:'Onslaught of Shadows',  ultDesc:'charges across the map to fear the entire enemy backline' },
  'Jarvan IV':     { archetype:'ENGAGE',    ult:'Cataclysm',            ultDesc:'traps the entire enemy team inside an arena of his own making' },
  'Vi':            { archetype:'ENGAGE',    ult:'Assault and Battery',  ultDesc:'pins down the most dangerous enemy carry and cannot be stopped' },
  'Xin Zhao':      { archetype:'ENGAGE',    ult:'Crescent Guard',       ultDesc:'knocks away all but the most dangerous target then unleashes a 1v1' },
  'Olaf':          { archetype:'BRUISER',   ult:'Ragnarok',             ultDesc:'goes berserk and cannot be stopped by any CC in the game' },
  "Kha'Zix":       { archetype:'ASSASSIN',  ult:'Void Assault',         ultDesc:'vanishes into the void to burst isolated targets repeatedly' },
  'Rengar':        { archetype:'ASSASSIN',  ult:'Thrill of the Hunt',   ultDesc:'stalks the entire enemy team before leaping on the carry' },
  'Amumu':         { archetype:'ENGAGE',    ult:'Curse of the Sad Mummy', ultDesc:'entangles all nearby enemies in bandages for a full team lockdown' },
  'Sejuani':       { archetype:'ENGAGE',    ult:'Glacial Prison',       ultDesc:'hurls a massive ice bola that stuns the entire enemy team' },
  'Zac':           { archetype:'ENGAGE',    ult:'Let\'s Bounce!',       ultDesc:'bounces across the team repeatedly knocking everyone into the air' },
  'Graves':        { archetype:'POKE',      ult:'Collateral Damage',    ultDesc:'fires an explosive shell that blasts through the entire team' },

  // ── ADC ───────────────────────────────────────────────────────────────────
  'Jinx':          { archetype:'SCALING',   ult:'Super Mega Death Rocket!', ultDesc:'fires a global rocket that detonates on the lowest-health enemy' },
  'Jhin':          { archetype:'POKE',      ult:'Curtain Call',         ultDesc:'snipes enemies across the map with four devastating shots' },
  'Caitlyn':       { archetype:'POKE',      ult:'Ace in the Hole',      ultDesc:'locks onto a target for an unavoidable long-range snipe' },
  'Aphelios':      { archetype:'SCALING',   ult:'Moonshot',             ultDesc:'fires a massive cannon shot that roots everyone in its path' },
  'Kalista':       { archetype:'ENGAGE',    ult:'Fate\'s Call',         ultDesc:'hurls her support ally into the enemy team for a devastating surprise engage' },
  "Kai'Sa":        { archetype:'SCALING',   ult:'Killer Instinct',      ultDesc:'dashes to a marked target with a protective shield' },
  'Miss Fortune':  { archetype:'ENGAGE',    ult:'Bullet Time',          ultDesc:'unleashes a barrage of bullets that rips through the entire enemy team' },
  'Tristana':      { archetype:'SPLITPUSH', ult:'Buster Shot',          ultDesc:'blasts an enemy across the map then resets to escape or re-engage' },
  'Ezreal':        { archetype:'POKE',      ult:'Trueshot Barrage',     ultDesc:'fires a massive energy wave that hits every enemy on the map' },
  'Draven':        { archetype:'ENGAGE',    ult:'Whirling Death',       ultDesc:'hurls twin spinning axes that travel across the entire map' },
  'Lucian':        { archetype:'POKE',      ult:'The Culling',          ultDesc:'fires a hail of bullets that shreds through a single lane' },
  'Xayah':         { archetype:'PROTECT',   ult:'Featherstorm',         ultDesc:'takes flight to dodge all incoming damage then rains down blades' },
  'Sivir':         { archetype:'ENGAGE',    ult:'On The Hunt',          ultDesc:'grants the entire team a massive movement speed boost for an all-in chase' },
  'Ashe':          { archetype:'POKE',      ult:'Enchanted Crystal Arrow', ultDesc:'fires a global arrow that stuns the first enemy champion it hits' },

  // ── Support ───────────────────────────────────────────────────────────────
  'Thresh':        { archetype:'ENGAGE',    ult:'The Box',              ultDesc:'creates an inescapable prison of spectral walls around the enemy team' },
  'Nautilus':      { archetype:'ENGAGE',    ult:'Depth Charge',         ultDesc:'launches a seismic shockwave that knocks up every enemy in its path' },
  'Blitzcrank':    { archetype:'ENGAGE',    ult:'Static Field',         ultDesc:'silences all nearby enemies with a massive lightning discharge' },
  'Lulu':          { archetype:'ENCHANTER', ult:'Wild Growth',          ultDesc:'supercharges an ally to knock back and slow all nearby enemies' },
  'Soraka':        { archetype:'ENCHANTER', ult:'Wish',                 ultDesc:'channels a global heal that saves dying allies across the entire map' },
  'Janna':         { archetype:'ENCHANTER', ult:'Monsoon',              ultDesc:'blows away the entire enemy team with a massive healing hurricane' },
  'Nami':          { archetype:'POKE',      ult:'Tidal Wave',           ultDesc:'launches a massive wave that knocks up and slows every enemy it touches' },
  'Karma':         { archetype:'POKE',      ult:'Mantra',               ultDesc:'empowers her next ability with Mantra for devastating extra effects' },
  'Yuumi':         { archetype:'ENCHANTER', ult:'Final Chapter',        ultDesc:'roots all nearby enemies in place while healing her attached ally' },
  'Pyke':          { archetype:'ASSASSIN',  ult:'Death from Below',     ultDesc:'executes and instantly resets on every low-health enemy in the fight' },
  'Leona':         { archetype:'ENGAGE',    ult:'Solar Flare',          ultDesc:'calls down a blinding beam that stuns and slows anyone caught in it' },
  'Braum':         { archetype:'ENCHANTER', ult:'Glacial Fissure',      ultDesc:'smashes the ground to launch an ice wave that knocks up every enemy' },
};

// Fallback data for champions not in the database
function getChampData(champion) {
  if (!champion) return { archetype:'BRUISER', ult:'Ultimate', ultDesc:'uses their ultimate ability' };
  return CHAMPION_DATA[champion] || { archetype:'BRUISER', ult:'Ultimate', ultDesc:'uses their ultimate ability' };
}

// ─── Map Position Presets ─────────────────────────────────────────────────────
// All coordinates are in 300×300 SVG space.
// Blue base = bottom-left, Red base = top-right, y=0 at TOP of screen.

const POS_PRESETS = {
  LANING_BLUE: { top:{x:28,y:75},  jungle:{x:82,y:170}, mid:{x:92,y:208},  adc:{x:72,y:268},  support:{x:90,y:274} },
  LANING_RED:  { top:{x:272,y:28}, jungle:{x:218,y:132},mid:{x:208,y:92},  adc:{x:228,y:268}, support:{x:210,y:274} },

  DRAGON_BLUE: { top:{x:192,y:218}, jungle:{x:200,y:230}, mid:{x:192,y:238}, adc:{x:205,y:214}, support:{x:195,y:210} },
  DRAGON_RED:  { top:{x:232,y:218}, jungle:{x:225,y:230}, mid:{x:238,y:235}, adc:{x:230,y:212}, support:{x:240,y:224} },

  BARON_BLUE: { top:{x:62,y:62},  jungle:{x:72,y:74},  mid:{x:62,y:82},  adc:{x:76,y:58},  support:{x:70,y:72} },
  BARON_RED:  { top:{x:100,y:62}, jungle:{x:92,y:74},  mid:{x:104,y:80}, adc:{x:94,y:56},  support:{x:106,y:70} },

  TF_BLUE: { top:{x:126,y:135}, jungle:{x:135,y:148}, mid:{x:124,y:156}, adc:{x:138,y:142}, support:{x:130,y:160} },
  TF_RED:  { top:{x:170,y:135}, jungle:{x:162,y:148}, mid:{x:173,y:156}, adc:{x:158,y:140}, support:{x:168,y:162} },

  PUSH_BLUE: { top:{x:265,y:25},  jungle:{x:275,y:38},  mid:{x:258,y:40},  adc:{x:272,y:15},  support:{x:260,y:50} },
  PUSH_RED:  { top:{x:35,y:275},  jungle:{x:25,y:262},  mid:{x:42,y:268},  adc:{x:28,y:285},  support:{x:48,y:278} },

  NEXUS_BLUE: { top:{x:14,y:282}, jungle:{x:24,y:292}, mid:{x:32,y:284}, adc:{x:12,y:292}, support:{x:26,y:278} },
  NEXUS_RED:  { top:{x:286,y:18}, jungle:{x:276,y:8},  mid:{x:268,y:16}, adc:{x:288,y:8},  support:{x:274,y:22} },

  // Gank positions
  GANK_TOP_BLUE_JG:    { x:28,  y:120 },
  GANK_BOT_BLUE_JG:    { x:140, y:268 },
  GANK_TOP_RED_JG:     { x:272, y:80  },
  GANK_BOT_RED_JG:     { x:160, y:268 },

  // Tower siege positions
  TOWER_TOP_BLUE:  { top:{x:218,y:24},  jungle:{x:230,y:36},  mid:{x:208,y:36},  adc:{x:225,y:16},  support:{x:215,y:42} },
  TOWER_TOP_RED:   { top:{x:258,y:22},  jungle:{x:268,y:34},  mid:{x:248,y:34},  adc:{x:265,y:14},  support:{x:255,y:42} },
  TOWER_BOT_BLUE:  { top:{x:82,y:275},  jungle:{x:72,y:265},  mid:{x:92,y:268},  adc:{x:78,y:282},  support:{x:65,y:275} },
  TOWER_BOT_RED:   { top:{x:240,y:278}, jungle:{x:250,y:268}, mid:{x:230,y:270}, adc:{x:245,y:285}, support:{x:258,y:275} },
  TOWER_MID_BLUE:  { top:{x:112,y:190}, jungle:{x:120,y:202}, mid:{x:108,y:202}, adc:{x:125,y:194}, support:{x:116,y:210} },
  TOWER_MID_RED:   { top:{x:188,y:110}, jungle:{x:178,y:100}, mid:{x:195,y:100}, adc:{x:182,y:116}, support:{x:172,y:108} },
};

// ─── Position Map System ──────────────────────────────────────────────────────

function makePosMap() {
  const make = (preset) => {
    const obj = {};
    for (const pos of ['top','jungle','mid','adc','support']) {
      const p = preset[pos];
      obj[pos] = { x: p.x, y: p.y, alive: true };
    }
    return obj;
  };
  return {
    blue: make(POS_PRESETS.LANING_BLUE),
    red:  make(POS_PRESETS.LANING_RED),
  };
}

function clonePosMap(pm) {
  return {
    blue: { top:{...pm.blue.top}, jungle:{...pm.blue.jungle}, mid:{...pm.blue.mid}, adc:{...pm.blue.adc}, support:{...pm.blue.support} },
    red:  { top:{...pm.red.top},  jungle:{...pm.red.jungle},  mid:{...pm.red.mid},  adc:{...pm.red.adc},  support:{...pm.red.support} },
  };
}

// Move a whole team to a preset position, preserving alive flags
function applyPreset(pm, side, preset) {
  for (const pos of ['top','jungle','mid','adc','support']) {
    const p = preset[pos];
    if (p) { pm[side][pos].x = p.x; pm[side][pos].y = p.y; }
  }
}

// Move only certain positions for a side
function moveRole(pm, side, role, x, y) {
  pm[side][role].x = x;
  pm[side][role].y = y;
}

// Mark players dead (they stay at current position visually, alive=false)
function killPlayers(pm, side, positions) {
  for (const pos of positions) {
    if (pm[side][pos]) pm[side][pos].alive = false;
  }
}

// Revive all players to base and reset positions
function reviveTeam(pm, side, basePreset) {
  for (const pos of ['top','jungle','mid','adc','support']) {
    pm[side][pos].alive = true;
    const p = basePreset[pos];
    pm[side][pos].x = p.x;
    pm[side][pos].y = p.y;
  }
}

// ─── Death Timers ─────────────────────────────────────────────────────────────

function deathTimer(minute) {
  if (minute < 15) return 0.22;
  if (minute < 25) return 0.45;
  if (minute < 33) return 0.70;
  return 0.90;
}

// ─── Player / Champion Helpers ────────────────────────────────────────────────

const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

function playerAt(team, pos) {
  const p = team.find(p => p && p.position === pos);
  return p ? p.name : { top:'the top laner', jungle:'the jungler', mid:'the mid laner', adc:'the ADC', support:'the support' }[pos] || 'a player';
}

function playerWithChamp(team, pos) {
  const p = team.find(p => p && p.position === pos);
  if (!p) return playerAt(team, pos);
  return p.champion ? `${p.name} (${p.champion})` : p.name;
}

function champOf(team, pos) {
  const p = team.find(p => p && p.position === pos);
  return p && p.champion ? p.champion : null;
}

function randPlayer(team) {
  const v = team.filter(Boolean);
  return v.length ? v[randInt(0, v.length-1)].name : 'a player';
}

function randCarry(team) {
  // Returns a carry role player preferably
  const carries = ['mid','adc','jungle'];
  const shuffled = shuffleArr(carries);
  for (const pos of shuffled) {
    const p = team.find(q => q && q.position === pos);
    if (p) return p.name;
  }
  return randPlayer(team);
}

// Build a champion + ult line for PBP, e.g. "Malphite uses Unstoppable Force"
function ultLine(team, pos) {
  const p = team.find(q => q && q.position === pos);
  if (!p || !p.champion) return null;
  const data = getChampData(p.champion);
  return `${p.champion} uses ${data.ult}`;
}

// ─── Team Ratings ─────────────────────────────────────────────────────────────

// FM-style attributes (1-20 scale)
// Technical: mechanics, csAccuracy, teamfightPositioning, mapMovement, objectiveExecution, championPoolDepth
// Mental:    decisionMaking, gameSense, communication, leadership, adaptability, composure
const FILLER = {
  mechanics:10, csAccuracy:10, teamfightPositioning:10, mapMovement:10,
  objectiveExecution:10, championPoolDepth:10,
  decisionMaking:10, gameSense:10, communication:10, leadership:10,
  adaptability:10, composure:10,
};

function getStats(player) { return player ? getEffectiveStats(player) : { ...FILLER }; }

function calcTeamRatings(team) {
  // No more trait synergies — region synergy still applies
  const region  = calcRegionSynergy(team);
  const boosted = team.map(p => {
    const base = getStats(p);
    return applyBonuses(base, { bonuses:{}, active:[] }, region, p || null);
  });
  const avg = stat => boosted.reduce((a, s) => a + (s[stat]||0), 0) / boosted.length;
  const jStats   = boosted[CONFIG.POSITIONS.indexOf('jungle')] || FILLER;
  const adcStats = boosted[CONFIG.POSITIONS.indexOf('adc')]    || FILLER;
  return {
    earlyRating:  avg('mechanics')              * 0.40 + avg('csAccuracy')             * 0.35 + avg('gameSense')         * 0.25,
    jungleRating: jStats.gameSense              * 0.35 + jStats.mechanics               * 0.35 + jStats.objectiveExecution* 0.30,
    tfRating:     avg('teamfightPositioning')   * 0.40 + avg('mechanics')               * 0.30 + avg('communication')     * 0.30,
    lateRating:   avg('decisionMaking')         * 0.35 + avg('gameSense')               * 0.35 + avg('composure')         * 0.30,
    draftRating:  avg('championPoolDepth')       * 0.50 + avg('decisionMaking')          * 0.30 + avg('adaptability')      * 0.20,
    adcRating:    adcStats.mechanics            * 0.40 + adcStats.teamfightPositioning   * 0.35 + adcStats.composure       * 0.25,
    consistency:  avg('adaptability'),
    clutchRating: avg('composure'),
  };
}

// ─── Archetype Bonus System ───────────────────────────────────────────────────
// context: 'teamfight'|'laning'|'objective'|'pick'|'splitpush'

function getTeamArchetypes(team) {
  // Returns a count of each archetype present on the team
  const counts = {};
  for (const p of team) {
    if (!p || !p.champion) continue;
    const a = getChampData(p.champion).archetype;
    counts[a] = (counts[a] || 0) + 1;
  }
  return counts;
}

function calcArchetypeBonus(team, context) {
  const arch = getTeamArchetypes(team);
  let mult = 1.0;

  const has = (a) => (arch[a] || 0) > 0;
  const count = (a) => arch[a] || 0;

  if (context === 'teamfight') {
    if (has('ENGAGE'))    mult += 0.18 * Math.min(count('ENGAGE'), 2) / 2;
    if (has('TANK'))      mult += 0.15;
    if (has('BRUISER'))   mult += 0.10 * Math.min(count('BRUISER'), 2) / 2;
    if (has('POKE'))      mult -= 0.05;
    if (has('ASSASSIN'))  mult += 0.08;
    if (has('PROTECT'))   mult += 0.10;
    if (has('ENCHANTER')) mult += 0.08;
    if (has('SPLITPUSH')) mult -= 0.10; // splitpush champs hate 5v5
    if (count('SCALING') >= 2) mult += 0.12; // scaling comp online late
  } else if (context === 'laning') {
    if (has('POKE'))      mult += 0.15;
    if (has('SPLITPUSH')) mult += 0.10;
    if (has('BRUISER'))   mult += 0.08;
    if (has('TANK'))      mult -= 0.05;
    if (has('SCALING'))   mult -= 0.08; // scaling is weak early
  } else if (context === 'pick') {
    if (has('ASSASSIN'))  mult += 0.25;
    if (has('ENGAGE'))    mult += 0.12;
    if (has('POKE'))      mult -= 0.10;
    if (has('ENCHANTER')) mult -= 0.20;
  } else if (context === 'objective') {
    if (has('ENGAGE'))    mult += 0.10;
    if (has('TANK'))      mult += 0.08;
    if (has('ASSASSIN'))  mult += 0.08; // smite steal potential
    if (has('POKE'))      mult -= 0.05;
    if (has('SPLITPUSH')) mult -= 0.08; // not around for objectives
  } else if (context === 'splitpush') {
    if (has('SPLITPUSH')) mult += 0.25;
    if (has('ASSASSIN'))  mult += 0.15;
  }

  return clamp(mult, 0.6, 1.6);
}

// ─── Game State ───────────────────────────────────────────────────────────────

function createState() {
  return {
    t: 0,
    gold:     { blue: 1500, red: 1500 },
    respawn: {
      blue: { top:0, jungle:0, mid:0, adc:0, support:0 },
      red:  { top:0, jungle:0, mid:0, adc:0, support:0 },
    },
    buffs: {
      baronBlue: 0,
      baronRed:  0,
      soulBlue:  false,
      soulRed:   false,
    },
    objectives: {
      towers:    { blue:0, red:0 },
      dragons:   { blue:0, red:0 },
      barons:    { blue:0, red:0 },
      inhibDown: { blue:[], red:[] },
    },
    nextDragon: 5.0,
    nextBaron:  20.0,
    drakePool:  [],
    dIdx:       0,
    mapAdvantage: 50,
    gameOver: false,
    winner: null,
  };
}

function addCSGold(state, fromMin, toMin) {
  const g = Math.round((toMin - fromMin) * 650);
  state.gold.blue += g;
  state.gold.red  += g;
}

// ─── Tally System ─────────────────────────────────────────────────────────────

const KILL_WEIGHT   = { top:2, jungle:2, mid:3, adc:3, support:1 };
const DEATH_WEIGHT  = { top:2, jungle:2, mid:2, adc:2, support:3 };
const ASSIST_WEIGHT = { top:1, jungle:2, mid:2, adc:1, support:3 };

function pickPos(weights) {
  let total = 0;
  for (const w of Object.values(weights)) total += w;
  let r = Math.random() * total;
  for (const [pos, w] of Object.entries(weights)) { r -= w; if (r <= 0) return pos; }
  return Object.keys(weights)[0];
}

function makeTally() {
  return {
    blue:     { kills:0, towers:0, dragons:0, barons:0, gold:0 },
    red:      { kills:0, towers:0, dragons:0, barons:0, gold:0 },
    blueKDA:  null,
    redKDA:   null,
    goldDiff: 0,
  };
}

function initKDA(tally, blue, red) {
  const kda = (team) => {
    const obj = {};
    CONFIG.POSITIONS.forEach((pos, i) => {
      const p = team[i];
      obj[pos] = { k:0, d:0, a:0, name: p?.name || '—', champion: p?.champion || '' };
    });
    return obj;
  };
  tally.blueKDA = kda(blue);
  tally.redKDA  = kda(red);
}

function recordKill(tally, attSide, defSide) {
  const aKDA = tally[attSide + 'KDA'];
  const dKDA = tally[defSide + 'KDA'];
  const killerPos = pickPos(KILL_WEIGHT);
  const victimPos = pickPos(DEATH_WEIGHT);
  if (aKDA) aKDA[killerPos].k++;
  if (dKDA) dKDA[victimPos].d++;
  tally[attSide].kills++;
  const others = CONFIG.POSITIONS.filter(p => p !== killerPos);
  const assistW = {};
  others.forEach(p => assistW[p] = ASSIST_WEIGHT[p] || 1);
  const assistCount = randInt(1, Math.min(3, others.length));
  for (let i = 0; i < assistCount; i++) {
    if (!Object.keys(assistW).length) break;
    const ap = pickPos(assistW);
    if (aKDA) aKDA[ap].a++;
    delete assistW[ap];
  }
  const g = 300 + assistCount * 50;
  tally[attSide].gold += g;
  tally.goldDiff += attSide === 'blue' ? g : -g;
}

function recordObj(tally, type, isBlue) {
  const side = isBlue ? 'blue' : 'red';
  const GOLD = { tower:175, dragon:150, baron:300 };
  tally[side][type + 's']++;
  const g = GOLD[type] || 0;
  tally[side].gold += g;
  tally.goldDiff += isBlue ? g : -g;
}

// ─── Fight Engine ─────────────────────────────────────────────────────────────

function countAlive(state, side) {
  return POSITIONS.filter(pos => state.respawn[side][pos] <= state.t).length;
}

function getAlivePosns(state, side) {
  return POSITIONS.filter(pos => state.respawn[side][pos] <= state.t);
}

// Item power multiplier based on gold accumulated
function itemMult(gold) {
  // Approximate: 1 item ≈ 3200g, 4 items ≈ 12800g
  const items = clamp(gold / 3200, 0, 4);
  return 1.0 + items * 0.12;
}

// Effective fight score incorporating all state modifiers + archetype bonuses
function effectiveScore(state, baseScore, side, team, context) {
  const alive     = countAlive(state, side);
  if (alive === 0) return 0;
  const numerical = alive / 5;
  const baron     = (side==='blue' ? state.buffs.baronBlue : state.buffs.baronRed) > state.t ? 1.25 : 1.0;
  const soul      = (side==='blue' ? state.buffs.soulBlue  : state.buffs.soulRed)  ? 1.12 : 1.0;
  const items     = itemMult(state.gold[side]);
  const archBonus = team ? calcArchetypeBonus(team, context || 'teamfight') : 1.0;
  return baseScore * numerical * baron * soul * items * archBonus;
}

// Resolve a fight. Returns { blueWins, winnerKills, loserKills, blueAlive, redAlive }
function resolveFight(state, blueScore, redScore, blue, red, context) {
  const blueAlive = countAlive(state, 'blue');
  const redAlive  = countAlive(state, 'red');

  if (blueAlive === 0 && redAlive === 0) return { blueWins:true,  winnerKills:0, loserKills:0, blueAlive, redAlive };
  if (blueAlive === 0)                   return { blueWins:false, winnerKills:0, loserKills:0, blueAlive, redAlive };
  if (redAlive  === 0)                   return { blueWins:true,  winnerKills:0, loserKills:0, blueAlive, redAlive };

  const blueEff = effectiveScore(state, blueScore, 'blue', blue, context);
  const redEff  = effectiveScore(state, redScore,  'red',  red,  context);
  const diff    = blueEff - redEff;
  const blueWinChance = clamp(50 + diff * 0.30, 12, 88);
  const blueWins = chance(blueWinChance);

  const winAlive  = blueWins ? blueAlive : redAlive;
  const loseAlive = blueWins ? redAlive  : blueAlive;
  const dominance = blueWins ? blueWinChance : (100 - blueWinChance);

  const killFrac = clamp((dominance - 50) / 38, 0, 1);
  const minWK = 1;
  const maxWK = loseAlive;
  const winnerKills = clamp(Math.round(minWK + (maxWK - minWK) * killFrac + (Math.random()-0.5)), minWK, maxWK);
  const maxLK = Math.max(0, Math.floor(winAlive * (1 - killFrac) * 0.5));
  const loserKills = clamp(randInt(0, maxLK), 0, winAlive - 1);

  return { blueWins, winnerKills, loserKills, blueAlive, redAlive };
}

// Apply fight to state: set respawn timers, record kills
function applyFight(state, result, tally) {
  const { blueWins, winnerKills, loserKills } = result;
  const winSide  = blueWins ? 'blue' : 'red';
  const loseSide = blueWins ? 'red'  : 'blue';
  const timer    = deathTimer(state.t);

  const loseAlivePosns = getAlivePosns(state, loseSide);
  const winAlivePosns  = getAlivePosns(state, winSide);

  const loseDead = shuffleArr(loseAlivePosns).slice(0, winnerKills);
  const winDead  = shuffleArr(winAlivePosns).slice(0, loserKills);

  loseDead.forEach(pos => {
    state.respawn[loseSide][pos] = state.t + timer;
    recordKill(tally, winSide, loseSide);
  });
  winDead.forEach(pos => {
    state.respawn[winSide][pos] = state.t + timer;
    recordKill(tally, loseSide, winSide);
  });

  state.gold[winSide]  += winnerKills * 350;
  state.gold[loseSide] += loserKills  * 350;
  tally.goldDiff = state.gold.blue - state.gold.red;

  return { winSide, loseSide, loseDead, winDead };
}

function fightScore(result) {
  return `${result.winnerKills}-for-${result.loserKills}`;
}

// ─── Champion Draft ───────────────────────────────────────────────────────────

function draftChampions(blueTeam, redTeam) {
  const picks = { blue: [], red: [] };
  const globalPicked = new Set();

  [blueTeam, redTeam].forEach((team, ti) => {
    const side = ti === 0 ? 'blue' : 'red';
    team.forEach(player => {
      if (!player) { picks[side].push(null); return; }
      const stats = getEffectiveStats(player);
      const pool  = player.champions || [];
      if (!pool.length) {
        picks[side].push({ player: player.name, stars: player.stars, champion: '?', position: player.position });
        return;
      }
      const available = pool.filter(c => !globalPicked.has(c));
      const pickPool  = available.length ? available : pool;
      // Use championPoolDepth (1-20) + decisionMaking: higher = always picks best champ
      const draftScore = (stats.championPoolDepth || 10) + (stats.decisionMaking || 10);
      const draftThresh = draftScore * 3; // scale to ~60-120 range
      const draftRoll = Math.random() * 120;
      const idx = draftRoll < draftThresh ? 0 : randInt(0, pickPool.length - 1);
      const champion = pickPool[idx];
      if (champion && available.includes(champion)) globalPicked.add(champion);
      player.champion = champion;
      picks[side].push({ player: player.name, stars: player.stars, champion, position: player.position });
    });
  });

  const blueComp = getCompType(blueTeam.map((p,i) => p ? {...p, champion: picks.blue[i]?.champion} : null));
  const redComp  = getCompType(redTeam.map((p,i)  => p ? {...p, champion: picks.red[i]?.champion}  : null));

  return { blue: picks.blue, red: picks.red, blueComp, redComp };
}

// ─── PBP Text Generators ─────────────────────────────────────────────────────
// Rich broadcast-style commentary referencing champions and ultimates.

const FB_LINES = [
  (k,v) => `⚔️ FIRST BLOOD! ${k} finds ${v} in the river and eliminates them!`,
  (k,v) => `⚔️ FIRST BLOOD TRIBUTE! ${k} hunts down ${v} — blood is drawn!`,
  (k,v) => `⚔️ FIRST BLOOD! ${k} makes a statement — ${v} is down!`,
  (k,v) => `⚔️ FIRST BLOOD! Early dominance — ${k} puts ${v} on ice!`,
];

const GANK_KILL_LINES = [
  (jg,l,v) => `🗺️ ${jg} invades ${l} — ${v} has no escape! Dead on arrival.`,
  (jg,l,v) => `🗺️ ${jg} dives deep into ${l} and eliminates ${v}!`,
  (jg,l,v) => `🗺️ Perfect timing! ${jg} ganks ${l} and ${v} pays the price.`,
  (jg,l,v) => `🗺️ ${jg} shows up in ${l} out of nowhere — ${v} goes down!`,
];

const GANK_ESCAPE_LINES = [
  (jg,l,v) => `🗺️ ${jg} tries ${l} but ${v} flashes away — no reward.`,
  (jg,l,v) => `🗺️ ${jg} rotates to ${l} but wards give it away — ${v} backs off.`,
  (jg,l,v) => `🗺️ ${jg} ganks ${l} but the lane has no pressure — ${v} escapes cleanly.`,
];

function dragonPBP(drakeType, winSide, result, jg, blue, red, useUlt) {
  const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
  const lLabel = winSide === 'blue' ? 'Red'  : 'Blue';
  const winTeam = winSide === 'blue' ? blue   : red;
  const fs = fightScore(result);
  const hasKills = result.winnerKills + result.loserKills > 0;

  if (!hasKills) {
    return `🐉 ${jg} secures the ${drakeType} Dragon for ${wLabel} side — uncontested.`;
  }
  if (useUlt) {
    const jgPos  = winTeam.find(p => p && p.position === 'jungle');
    const jgChamp = jgPos ? jgPos.champion : null;
    if (jgChamp) {
      const data = getChampData(jgChamp);
      return `🐉 ${drakeType} Dragon: ${jgChamp} uses ${data.ult} — ${data.ultDesc}! ${wLabel} wins the fight ${fs} and takes the drake!`;
    }
  }
  return `🐉 ${drakeType} Dragon: ${wLabel} side wins ${fs} and secures the drake!`;
}

function baronPBP(winSide, result, jg, isSteal, blue, red, useUlt) {
  const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
  const fs = fightScore(result);
  const hasKills = result.winnerKills + result.loserKills > 0;
  const killLine = hasKills ? ` Fight: ${fs}.` : '';

  if (isSteal) {
    const winTeam = winSide === 'blue' ? blue : red;
    const jgChamp = champOf(winTeam, 'jungle');
    if (jgChamp) {
      const data = getChampData(jgChamp);
      return `🟣 BARON STEAL!! ${jg} — ${jgChamp} uses ${data.ult} to ${data.ultDesc}! ${wLabel} steals Baron Nashor!${killLine} THE CROWD ERUPTS!`;
    }
    return `🟣 BARON STEAL!! ${jg} smites it away — ${wLabel} secures Baron Nashor!${killLine} THE CROWD ERUPTS!`;
  }
  if (useUlt) {
    const winTeam = winSide === 'blue' ? blue : red;
    const jgChamp = champOf(winTeam, 'jungle');
    if (jgChamp) {
      const data = getChampData(jgChamp);
      return `🟣 Baron Nashor down! ${jgChamp} uses ${data.ult} to ${data.ultDesc}!${killLine} ${wLabel} side takes the buff!`;
    }
  }
  return `🟣 Baron Nashor secured by ${wLabel} side! ${jg} lands the Smite.${killLine} Baron buff active!`;
}

function tfPBP(winSide, result, blue, red, label, useUlt) {
  const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
  const winTeam = winSide === 'blue' ? blue : red;
  const fs = fightScore(result);
  const mvp = randCarry(winTeam);

  if (useUlt) {
    // Pick a meaningful role for the ult — engage or damage carry
    const roles = ['jungle','mid','top','support'];
    for (const role of roles) {
      const champ = champOf(winTeam, role);
      if (!champ) continue;
      const data = getChampData(champ);
      if (['ENGAGE','TANK','ASSASSIN'].includes(data.archetype)) {
        return `💥 ${label || 'Teamfight'} — ${champ} uses ${data.ult}: ${data.ultDesc}! ${wLabel} side wins ${fs}! ${mvp} carries the fight!`;
      }
    }
  }
  return `💥 ${label || 'Teamfight'} — ${wLabel} side wins ${fs}! ${mvp} was absolutely massive.`;
}

// ─── Laning Phase (0–14 min) ──────────────────────────────────────────────────

function simulateLaning(blue, red, bR, rR, state, events, tally, pm, snapshots) {
  addCSGold(state, 0, 14);
  state.drakePool = shuffleArr([...CONFIG.DRAGON_TYPES]);

  // Helper to push an event with current positions
  function pushEvent(ev) {
    ev.positions = clonePosMap(pm);
    events.push(ev);
    snapshots.push({ t: Math.round(state.t * 60), positions: clonePosMap(pm) });
  }

  // ── Pre-game laning setup ────────────────────────────────────────────────
  applyPreset(pm, 'blue', POS_PRESETS.LANING_BLUE);
  applyPreset(pm, 'red',  POS_PRESETS.LANING_RED);

  // ── First Blood (3–7 min) ────────────────────────────────────────────────
  state.t = 3 + Math.random() * 4;
  {
    const fbBlue  = chance(50 + (bR.earlyRating - rR.earlyRating) * 0.4);
    const attSide = fbBlue ? 'blue' : 'red';
    const defSide = fbBlue ? 'red'  : 'blue';
    const attTeam = fbBlue ? blue   : red;
    const defTeam = fbBlue ? red    : blue;

    // Jungler or mid typically gets first blood
    const killerRole = chance(60) ? 'jungle' : 'mid';
    const victimRole = randFrom(['mid','top','jungle']);
    const killer  = playerWithChamp(attTeam, killerRole);
    const victim  = playerAt(defTeam, victimRole);

    // Move attacker toward victim's lane position
    if (killerRole === 'jungle') {
      const victimPreset = attSide === 'blue' ? POS_PRESETS.LANING_BLUE : POS_PRESETS.LANING_RED;
      // Jungler ganks mid or top
      if (victimRole === 'top') {
        moveRole(pm, attSide, 'jungle', attSide==='blue' ? POS_PRESETS.GANK_TOP_BLUE_JG.x : POS_PRESETS.GANK_TOP_RED_JG.x,
                                                           attSide==='blue' ? POS_PRESETS.GANK_TOP_BLUE_JG.y : POS_PRESETS.GANK_TOP_RED_JG.y);
      }
    }

    state.respawn[defSide][victimRole] = state.t + deathTimer(state.t);
    killPlayers(pm, defSide, [victimRole]);
    recordKill(tally, attSide, defSide);
    state.gold[attSide] += 100; // first blood bonus
    state.mapAdvantage = clamp(state.mapAdvantage + (fbBlue ? 5 : -5), 5, 95);

    const fbText = randFrom(FB_LINES)(killer, victim);
    pushEvent({
      time: padTime(state.t),
      text: fbText,
      type: 'kill', phase: 'laning', killBlue: fbBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // Respawn dead players after timer, back to laning positions
  state.t += 0.4;
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] > 0 && state.respawn[side][pos] <= state.t) {
        pm[side][pos].alive = true;
        const preset = side === 'blue' ? POS_PRESETS.LANING_BLUE : POS_PRESETS.LANING_RED;
        pm[side][pos].x = preset[pos].x;
        pm[side][pos].y = preset[pos].y;
      }
    }
  }

  // ── Jungle Gank (5–10 min) ───────────────────────────────────────────────
  state.t = 5 + Math.random() * 5;
  {
    const gankBlue = chance(50 + (bR.jungleRating - rR.jungleRating) * 0.4);
    const attSide  = gankBlue ? 'blue' : 'red';
    const defSide  = gankBlue ? 'red'  : 'blue';
    const attTeam  = gankBlue ? blue   : red;
    const defTeam  = gankBlue ? red    : blue;
    const jg       = playerWithChamp(attTeam, 'jungle');
    const gankLane = randFrom(['top','mid','bot']);
    const victimPos = gankLane === 'bot' ? 'adc' : gankLane;
    const victim   = playerAt(defTeam, victimPos);

    // Move jungler toward gank lane
    if (gankLane === 'top') {
      moveRole(pm, attSide, 'jungle', attSide==='blue' ? POS_PRESETS.GANK_TOP_BLUE_JG.x : POS_PRESETS.GANK_TOP_RED_JG.x,
                                                         attSide==='blue' ? POS_PRESETS.GANK_TOP_BLUE_JG.y : POS_PRESETS.GANK_TOP_RED_JG.y);
    } else if (gankLane === 'bot') {
      moveRole(pm, attSide, 'jungle', attSide==='blue' ? POS_PRESETS.GANK_BOT_BLUE_JG.x : POS_PRESETS.GANK_BOT_RED_JG.x,
                                                         attSide==='blue' ? POS_PRESETS.GANK_BOT_BLUE_JG.y : POS_PRESETS.GANK_BOT_RED_JG.y);
    }

    const gankSuccessChance = 65 + (gankLane === 'top' ? 5 : 0); // slightly easier top ganks
    if (chance(gankSuccessChance) && state.respawn[defSide][victimPos] <= state.t) {
      state.respawn[defSide][victimPos] = state.t + deathTimer(state.t);
      killPlayers(pm, defSide, [victimPos]);
      recordKill(tally, attSide, defSide);
      state.mapAdvantage = clamp(state.mapAdvantage + (gankBlue ? 4 : -4), 5, 95);
      const text = randFrom(GANK_KILL_LINES)(jg, gankLane, victim);
      pushEvent({
        time: padTime(state.t), text,
        type: 'kill', phase: 'laning', killBlue: gankBlue,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    } else {
      const text = randFrom(GANK_ESCAPE_LINES)(jg, gankLane, victim);
      pushEvent({
        time: padTime(state.t), text,
        type: 'commentary', phase: 'laning',
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // Reset to laning
  applyPreset(pm, 'blue', POS_PRESETS.LANING_BLUE);
  applyPreset(pm, 'red',  POS_PRESETS.LANING_RED);
  // Revive anyone whose timer has passed
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
    }
  }

  // ── Dragon 1 (≥5:00 min) ────────────────────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  {
    applyPreset(pm, 'blue', POS_PRESETS.DRAGON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.DRAGON_RED);

    const blueScore = bR.jungleRating * 0.5 + bR.earlyRating * 0.5;
    const redScore  = rR.jungleRating * 0.5 + rR.earlyRating * 0.5;
    const result    = resolveFight(state, blueScore, redScore, blue, red, 'objective');
    const d1Type    = state.drakePool[state.dIdx++];
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 4 : -4), 5, 95);

    const jg   = playerAt(result.blueWins ? blue : red, 'jungle');
    const useUlt = chance(40);
    const text = dragonPBP(d1Type, winSide, result, jg, blue, red, useUlt);
    pushEvent({
      time: padTime(state.t), text,
      type: 'objective', phase: 'laning', dragonBlue: result.blueWins,
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // Respawn and return to laning
  state.t += 0.3;
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= state.t) {
        pm[side][pos].alive = true;
        const preset = side==='blue' ? POS_PRESETS.LANING_BLUE : POS_PRESETS.LANING_RED;
        pm[side][pos].x = preset[pos].x;
        pm[side][pos].y = preset[pos].y;
      }
    }
  }

  // ── Rift Herald (8–12 min) ───────────────────────────────────────────────
  state.t = Math.max(state.t + 1, 8 + Math.random() * 4);
  {
    applyPreset(pm, 'blue', POS_PRESETS.BARON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.BARON_RED);
    // Herald is at baron pit (spawns 8:00)

    const result = resolveFight(state, bR.jungleRating, rR.jungleRating, blue, red, 'objective');
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    const rhLane = chance(55) ? 'top' : 'mid';
    const jg     = playerWithChamp(result.blueWins ? blue : red, 'jungle');
    const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', result.blueWins);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);
    const killLine = result.winnerKills > 0 ? ` Fight: ${fightScore(result)}.` : '';
    pushEvent({
      time: padTime(state.t),
      text: `🔮 ${jg} secures Rift Herald for ${wLabel} side — it crashes into ${rhLane} lane, the tower crumbles!${killLine}`,
      type: 'objective', phase: 'laning', towerBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // Revive & return to lanes
  state.t += 0.5;
  applyPreset(pm, 'blue', POS_PRESETS.LANING_BLUE);
  applyPreset(pm, 'red',  POS_PRESETS.LANING_RED);
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
    }
  }

  // ── Bot lane skirmish (8–12 min, 55% chance) ─────────────────────────────
  state.t = Math.max(state.t + 0.5, 8 + Math.random() * 4);
  if (chance(55)) {
    // Simulate a 2v2 bot lane skirmish
    const botState = {
      ...state,
      respawn: {
        blue: { top:state.t+99, jungle:state.t+99, mid:state.t+99, adc:Math.max(0,state.respawn.blue.adc), support:Math.max(0,state.respawn.blue.support) },
        red:  { top:state.t+99, jungle:state.t+99, mid:state.t+99, adc:Math.max(0,state.respawn.red.adc),  support:Math.max(0,state.respawn.red.support)  },
      },
      buffs: { ...state.buffs },
      gold:  { ...state.gold },
    };
    const blueBot = bR.adcRating;
    const redBot  = rR.adcRating;
    const result  = resolveFight(botState, blueBot, redBot, blue, red, 'laning');
    const winSide  = result.blueWins ? 'blue' : 'red';
    const loseSide = result.blueWins ? 'red'  : 'blue';
    const kills    = Math.min(2, result.winnerKills);
    const losses   = Math.min(1, result.loserKills);
    for (let i = 0; i < kills;  i++) recordKill(tally, winSide, loseSide);
    for (let i = 0; i < losses; i++) recordKill(tally, loseSide, winSide);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? kills*2 : -kills*2), 5, 95);

    // Move both bot lanes toward each other
    const bBotPos = POS_PRESETS.LANING_BLUE;
    const rBotPos = POS_PRESETS.LANING_RED;
    moveRole(pm, 'blue', 'adc', 130, 268);
    moveRole(pm, 'blue', 'support', 125, 274);
    moveRole(pm, 'red',  'adc', 170, 268);
    moveRole(pm, 'red',  'support', 175, 274);

    const adcChamp = playerWithChamp(result.blueWins ? blue : red, 'adc');
    const supChamp = playerWithChamp(result.blueWins ? blue : red, 'support');
    const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
    const supRole = result.blueWins ? blue : red;
    const supChampRaw = champOf(supRole, 'support');
    let botText;
    if (supChampRaw && kills > 0) {
      const data = getChampData(supChampRaw);
      if (data.archetype === 'ENGAGE' && chance(45)) {
        botText = `🏹 ${supChampRaw} hooks an enemy — perfect setup! ${wLabel} wins the bot skirmish ${kills}-for-${losses}! ${adcChamp} cleans up!`;
      } else {
        botText = `🏹 ${wLabel} wins the bot lane skirmish ${kills}-for-${losses}! ${adcChamp} picks up the kills.`;
      }
    } else {
      botText = `🏹 ${wLabel} side wins a ${kills}-for-${losses} skirmish in bot lane — early advantage established.`;
    }
    pushEvent({
      time: padTime(state.t), text: botText,
      type: 'kill', phase: 'laning', killBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── First Tower (10–14 min) ──────────────────────────────────────────────
  state.t = Math.max(state.t + 1, 10 + Math.random() * 4);
  {
    const blueScore = bR.earlyRating * 0.7 + bR.jungleRating * 0.3;
    const redScore  = rR.earlyRating * 0.7 + rR.jungleRating * 0.3;
    const towerBlue = chance(50 + (blueScore - redScore) * 0.5);
    const winSide   = towerBlue ? 'blue' : 'red';
    const wLabel    = towerBlue ? 'Blue' : 'Red';
    const towerLane = randFrom(['top','mid','bot']);

    // Move toward the relevant tower
    const towerPreset = towerLane === 'top'
      ? (towerBlue ? POS_PRESETS.TOWER_TOP_BLUE : POS_PRESETS.TOWER_TOP_RED)
      : towerLane === 'mid'
        ? (towerBlue ? POS_PRESETS.TOWER_MID_BLUE : POS_PRESETS.TOWER_MID_RED)
        : (towerBlue ? POS_PRESETS.TOWER_BOT_BLUE : POS_PRESETS.TOWER_BOT_RED);

    // Only move relevant laners toward tower
    applyPreset(pm, winSide, towerPreset);

    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', towerBlue);
    state.mapAdvantage = clamp(state.mapAdvantage + (towerBlue ? 6 : -6), 5, 95);

    const topChamp = playerWithChamp(towerBlue ? blue : red, towerLane === 'top' ? 'top' : towerLane === 'mid' ? 'mid' : 'adc');
    pushEvent({
      time: padTime(state.t),
      text: `🏰 ${wLabel} side secures First Tower in ${towerLane} lane! ${topChamp} gets the last hit — global gold flowing in!`,
      type: 'objective', phase: 'laning', towerBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // Final laning — reset all to laning positions
  applyPreset(pm, 'blue', POS_PRESETS.LANING_BLUE);
  applyPreset(pm, 'red',  POS_PRESETS.LANING_RED);
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= 14) pm[side][pos].alive = true;
    }
  }

  state.t = 14;
}

// ─── Mid Game (14–26 min) ─────────────────────────────────────────────────────

function simulateMidGame(blue, red, bR, rR, state, events, tally, pm, snapshots) {
  addCSGold(state, 14, 26);
  const objR = (r) => r.tfRating * 0.55 + r.jungleRating * 0.45;

  function pushEvent(ev) {
    ev.positions = clonePosMap(pm);
    events.push(ev);
    snapshots.push({ t: Math.round(state.t * 60), positions: clonePosMap(pm) });
  }

  // Revive everyone entering midgame
  applyPreset(pm, 'blue', POS_PRESETS.LANING_BLUE);
  applyPreset(pm, 'red',  POS_PRESETS.LANING_RED);
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= 14) pm[side][pos].alive = true;
    }
  }

  // ── Dragon 2 (≥nextDragon, ~14–18 min) ──────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  {
    applyPreset(pm, 'blue', POS_PRESETS.DRAGON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.DRAGON_RED);
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }

    const result = resolveFight(state, objR(bR), objR(rR), blue, red, 'objective');
    const d2Type = state.drakePool[state.dIdx++ % state.drakePool.length];
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);

    // Check soul at 4 drakes
    let soulText = '';
    if (state.objectives.dragons.blue >= 4 && !state.buffs.soulBlue) {
      state.buffs.soulBlue = true;
      soulText = ' 🔥 DRAGON SOUL claimed — Blue side is empowered for the rest of the game!';
    }
    if (state.objectives.dragons.red >= 4 && !state.buffs.soulRed) {
      state.buffs.soulRed = true;
      soulText = ' 🔥 DRAGON SOUL claimed — Red side is empowered for the rest of the game!';
    }

    const jg = playerAt(result.blueWins ? blue : red, 'jungle');
    const useUlt = chance(40);
    const baseText = dragonPBP(d2Type, winSide, result, jg, blue, red, useUlt);
    pushEvent({
      time: padTime(state.t),
      text: baseText + soulText,
      type: 'objective', phase: 'midgame', dragonBlue: result.blueWins,
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Second tower (15–19 min) ─────────────────────────────────────────────
  state.t = Math.max(state.t + 1, 15 + Math.random() * 4);
  if (Math.abs(state.mapAdvantage - 50) > 8) {
    // Revive dead players
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    const towerBlue = state.mapAdvantage > 50;
    const winSide   = towerBlue ? 'blue' : 'red';
    const wLabel    = towerBlue ? 'Blue' : 'Red';
    const towerLane = randFrom(['top','bot']);
    const preset = towerLane === 'top'
      ? (towerBlue ? POS_PRESETS.TOWER_TOP_BLUE : POS_PRESETS.TOWER_TOP_RED)
      : (towerBlue ? POS_PRESETS.TOWER_BOT_BLUE : POS_PRESETS.TOWER_BOT_RED);
    applyPreset(pm, winSide, preset);
    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', towerBlue);
    state.mapAdvantage = clamp(state.mapAdvantage + (towerBlue ? 4 : -4), 5, 95);
    const topChamp = playerWithChamp(towerBlue ? blue : red, towerLane === 'top' ? 'top' : 'adc');
    pushEvent({
      time: padTime(state.t),
      text: `🏰 ${wLabel} side rotates to ${towerLane} and destroys the outer tower — ${topChamp} leads the push!`,
      type: 'objective', phase: 'midgame', towerBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Major mid-game teamfight (17–22 min) ─────────────────────────────────
  state.t = Math.max(state.t + 1.5, 17 + Math.random() * 5);
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.TF_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.TF_RED);

    const result = resolveFight(state, bR.tfRating, rR.tfRating, blue, red, 'teamfight');
    const { winSide, loseSide, loseDead, winDead } = applyFight(state, result, tally);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills*1.5 : -result.winnerKills*1.5), 5, 95);

    killPlayers(pm, loseSide, loseDead);
    killPlayers(pm, winSide,  winDead);

    // Winners push a tower after teamfight win
    const tfTowers = result.winnerKills >= 3 ? randInt(1,2) : 1;
    for (let i = 0; i < tfTowers; i++) {
      state.objectives.towers[winSide]++;
      recordObj(tally, 'tower', result.blueWins);
    }
    const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
    const towerText = tfTowers > 1 ? ` ${tfTowers} towers crumble in the aftermath!` : ' A tower falls!';
    const useUlt = chance(45);
    const baseText = tfPBP(winSide, result, blue, red, 'Major teamfight', useUlt);
    pushEvent({
      time: padTime(state.t),
      text: baseText + towerText,
      type: 'teamfight', phase: 'midgame',
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Dragon 3 (≥nextDragon, ~19–24 min) ──────────────────────────────────
  state.t = Math.max(state.t + 1, state.nextDragon);
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.DRAGON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.DRAGON_RED);

    const result = resolveFight(state, objR(bR), objR(rR), blue, red, 'objective');
    const d3Type = state.drakePool[state.dIdx++ % state.drakePool.length];
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);

    let soulText = '';
    if (state.objectives.dragons.blue >= 4 && !state.buffs.soulBlue) {
      state.buffs.soulBlue = true; soulText = ' 🔥 DRAGON SOUL for Blue!';
    }
    if (state.objectives.dragons.red >= 4 && !state.buffs.soulRed) {
      state.buffs.soulRed = true; soulText = ' 🔥 DRAGON SOUL for Red!';
    }

    const jg = playerAt(result.blueWins ? blue : red, 'jungle');
    const useUlt = chance(35);
    const baseText = dragonPBP(d3Type, winSide, result, jg, blue, red, useUlt);
    const stacks = state.objectives.dragons[winSide];
    const stackText = stacks >= 2 ? ` (${stacks} drakes for ${winSide === 'blue' ? 'Blue' : 'Red'}!)` : '';
    pushEvent({
      time: padTime(state.t),
      text: baseText + stackText + soulText,
      type: 'objective', phase: 'midgame', dragonBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Second mid-game skirmish (23–27 min, 65% chance) ────────────────────
  state.t = Math.max(state.t + 1, 23 + Math.random() * 4);
  if (chance(65)) {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.TF_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.TF_RED);

    const result = resolveFight(state, bR.tfRating, rR.tfRating, blue, red, 'teamfight');
    if (result.winnerKills + result.loserKills > 0) {
      const { winSide, loseSide, loseDead, winDead } = applyFight(state, result, tally);

      killPlayers(pm, loseSide, loseDead);
      killPlayers(pm, winSide,  winDead);

      state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills : -result.winnerKills), 5, 95);
      if (chance(68)) {
        state.objectives.towers[winSide]++;
        recordObj(tally, 'tower', result.blueWins);
      }
      const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
      const player = randPlayer(result.blueWins ? blue : red);
      const useUlt = chance(35);
      const text = tfPBP(winSide, result, blue, red, 'Skirmish near mid', useUlt);
      pushEvent({
        time: padTime(state.t), text,
        type: 'teamfight', phase: 'midgame',
        killBlue: result.blueWins,
        tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
        tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Inner tower rotation before Baron (25–26 min) ────────────────────────
  state.t = Math.max(state.t + 0.5, 25);
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    const leading  = state.mapAdvantage >= 50 ? 'blue' : 'red';
    const leadMag  = Math.abs(state.mapAdvantage - 50);
    const numTowers = leadMag > 15 ? (chance(55) ? 2 : 1) : 1;
    const towerSide = leadMag > 8 ? leading : (chance(50) ? 'blue' : 'red');
    const wLabel    = towerSide === 'blue' ? 'Blue' : 'Red';
    for (let i = 0; i < numTowers; i++) {
      state.objectives.towers[towerSide]++;
      recordObj(tally, 'tower', towerSide === 'blue');
    }
    const lane = randFrom(['top','mid','bot']);
    const preset = lane==='top'
      ? (towerSide==='blue' ? POS_PRESETS.TOWER_TOP_BLUE : POS_PRESETS.TOWER_TOP_RED)
      : lane==='mid'
        ? (towerSide==='blue' ? POS_PRESETS.TOWER_MID_BLUE : POS_PRESETS.TOWER_MID_RED)
        : (towerSide==='blue' ? POS_PRESETS.TOWER_BOT_BLUE : POS_PRESETS.TOWER_BOT_RED);
    applyPreset(pm, towerSide, preset);
    pushEvent({
      time: padTime(state.t),
      text: `🏰 ${wLabel} side sieges the ${lane} inner tower — ${numTowers > 1 ? 'two towers crumble before Baron spawns!' : 'inner tower destroyed as Baron approaches!'}`,
      type: 'objective', phase: 'midgame', towerBlue: towerSide === 'blue',
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  state.t = 26;
}

// ─── Late Game (26+ min) ──────────────────────────────────────────────────────

function simulateLateGame(blue, red, bR, rR, state, events, tally, pm, snapshots) {
  addCSGold(state, 26, 36);
  const objR = (r) => r.lateRating * 0.55 + r.tfRating * 0.45;

  function pushEvent(ev) {
    ev.positions = clonePosMap(pm);
    events.push(ev);
    snapshots.push({ t: Math.round(state.t * 60), positions: clonePosMap(pm) });
  }

  // Revive everyone entering late game
  for (const side of ['blue','red']) {
    for (const pos of POSITIONS) {
      if (state.respawn[side][pos] <= 26) pm[side][pos].alive = true;
    }
  }

  // ── Dragon 4 (≥nextDragon, ~26–31 min) ──────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  if (state.t < 35) {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.DRAGON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.DRAGON_RED);

    const result = resolveFight(state, objR(bR), objR(rR), blue, red, 'objective');
    const d4Type = state.drakePool[state.dIdx % state.drakePool.length];
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;

    let soulText = '';
    if (state.objectives.dragons.blue >= 4 && !state.buffs.soulBlue) {
      state.buffs.soulBlue = true; soulText = ' 🔥 DRAGON SOUL for Blue!';
    }
    if (state.objectives.dragons.red >= 4 && !state.buffs.soulRed) {
      state.buffs.soulRed = true; soulText = ' 🔥 DRAGON SOUL for Red!';
    }
    const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
    const stacks = state.objectives.dragons[winSide];
    pushEvent({
      time: padTime(state.t),
      text: `🐉 ${d4Type} Dragon to ${wLabel} side (${stacks} total drakes)${soulText ? '' : '.'}${soulText}`,
      type: 'objective', phase: 'lategame', dragonBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Baron Nashor (≥nextBaron, ~26–30 min) ────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextBaron);
  let baronWinSide;
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.BARON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.BARON_RED);

    const result = resolveFight(state, objR(bR), objR(rR), blue, red, 'objective');
    const { winSide, loseSide, loseDead, winDead } = applyFight(state, result, tally);
    baronWinSide = winSide;

    killPlayers(pm, loseSide, loseDead);
    killPlayers(pm, winSide,  winDead);

    state.objectives.barons[winSide]++;
    recordObj(tally, 'baron', result.blueWins);

    if (winSide === 'blue') state.buffs.baronBlue = state.t + 3;
    else                    state.buffs.baronRed  = state.t + 3;

    state.nextBaron = state.t + 6;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 12 : -12), 5, 95);

    const jg = playerAt(result.blueWins ? blue : red, 'jungle');
    const isSteal = chance(14) && result.loserKills > 0;
    const useUlt  = chance(50);
    const text = baronPBP(winSide, result, jg, isSteal, blue, red, useUlt);
    pushEvent({
      time: padTime(state.t), text,
      type: 'objective', phase: 'lategame', baronBlue: result.blueWins,
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Baron Push (1–2 min after Baron) ─────────────────────────────────────
  state.t += 1 + Math.random();
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }

    // Baron team advances toward enemy base
    if (baronWinSide === 'blue') {
      applyPreset(pm, 'blue', POS_PRESETS.PUSH_BLUE);
      applyPreset(pm, 'red',  POS_PRESETS.TOWER_TOP_RED);
    } else {
      applyPreset(pm, 'red',  POS_PRESETS.PUSH_RED);
      applyPreset(pm, 'blue', POS_PRESETS.TOWER_TOP_BLUE);
    }

    const result = resolveFight(state, bR.tfRating, rR.tfRating, blue, red, 'teamfight');
    const { winSide, loseSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, loseSide, loseDead);
    killPlayers(pm, winSide,  winDead);

    const pushSide  = winSide;
    const inhibLane = randFrom(['top','mid','bot']);
    const towersDown = randInt(2, 3);
    for (let i = 0; i < towersDown; i++) {
      state.objectives.towers[pushSide]++;
      recordObj(tally, 'tower', pushSide === 'blue');
    }

    const inhibFalls = result.winnerKills >= 3 || Math.abs(state.mapAdvantage - 50) > 22;
    if (inhibFalls) {
      state.objectives.inhibDown[loseSide].push(inhibLane);
    }

    if (baronWinSide === 'blue') state.buffs.baronBlue = 0;
    else                         state.buffs.baronRed  = 0;

    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills*2 : -result.winnerKills*2), 5, 95);
    const inhibText  = inhibFalls ? ` The ${inhibLane} inhibitor falls — super minions incoming!` : '';
    const baronLabel = baronWinSide === 'blue' ? 'Blue' : 'Red';
    const useUlt = chance(40);

    let pushText;
    if (baronWinSide === pushSide) {
      const tfBase = tfPBP(pushSide, result, blue, red, `${baronLabel} side Baron push`, useUlt);
      pushText = `${tfBase} ${towersDown} tower${towersDown>1?'s':''} fall — buffed minions crash through the base!${inhibText}`;
    } else {
      pushText = `💥 ${baronLabel} side pushes with Baron buff but ${pushSide==='blue'?'Blue':'Red'} side DEFENDS ${fightScore(result)}! ${towersDown} tower${towersDown>1?'s':''} traded!${inhibText}`;
    }
    pushEvent({
      time: padTime(state.t), text: pushText,
      type: 'teamfight', phase: 'lategame',
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Second Baron (only if game is still close) ────────────────────────────
  const canSecondBaron = Math.abs(state.mapAdvantage - 50) < 20;
  state.t = Math.max(state.t + 2, state.nextBaron);
  if (canSecondBaron && state.t < 42) {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.BARON_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.BARON_RED);

    const result = resolveFight(state, objR(bR), objR(rR), blue, red, 'objective');
    const { winSide, loseDead, winDead } = applyFight(state, result, tally);

    killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
    killPlayers(pm, winSide, winDead);

    state.objectives.barons[winSide]++;
    recordObj(tally, 'baron', result.blueWins);
    if (winSide === 'blue') state.buffs.baronBlue = state.t + 3;
    else                    state.buffs.baronRed  = state.t + 3;
    state.nextBaron = state.t + 6;

    const killLine = result.winnerKills + result.loserKills > 0 ? ` Fight: ${fightScore(result)}.` : '';
    const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
    pushEvent({
      time: padTime(state.t),
      text: `🟣 Second Baron spawns — ${wLabel} side secures it!${killLine} This could be the deciding push.`,
      type: 'objective', phase: 'lategame', baronBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });

    // Second baron push
    state.t += 1 + Math.random();
    {
      for (const side of ['blue','red']) {
        for (const pos of POSITIONS) {
          if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
        }
      }
      if (winSide === 'blue') {
        applyPreset(pm, 'blue', POS_PRESETS.PUSH_BLUE);
      } else {
        applyPreset(pm, 'red',  POS_PRESETS.PUSH_RED);
      }

      const pushResult = resolveFight(state, bR.tfRating, rR.tfRating, blue, red, 'teamfight');
      const { winSide: pushSide, loseSide: pushLoseSide, loseDead: pld, winDead: pwd } = applyFight(state, pushResult, tally);

      killPlayers(pm, pushLoseSide, pld);
      killPlayers(pm, pushSide, pwd);

      const b2Towers = randInt(1, 2);
      for (let i = 0; i < b2Towers; i++) {
        state.objectives.towers[pushSide]++;
        recordObj(tally, 'tower', pushResult.blueWins);
      }
      if (winSide === 'blue') state.buffs.baronBlue = 0;
      else                    state.buffs.baronRed  = 0;
      state.mapAdvantage = clamp(state.mapAdvantage + (pushResult.blueWins ? pushResult.winnerKills*2 : -pushResult.winnerKills*2), 5, 95);

      pushEvent({
        time: padTime(state.t),
        text: `💥 ${wLabel} side uses second Baron buff — ${fightScore(pushResult)}, ${b2Towers} more tower${b2Towers>1?'s':''} fall! The base is crumbling.`,
        type: 'teamfight', phase: 'lategame',
        killBlue: pushResult.blueWins,
        tfBlueKills: pushResult.blueWins ? pushResult.winnerKills : pushResult.loserKills,
        tfRedKills:  pushResult.blueWins ? pushResult.loserKills  : pushResult.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Elder Dragon (if soul has been claimed and ~35 min) ───────────────────
  // Elder spawns 6 min after first soul OR at 35:00 — only simulate if game still going
  const elderSpawnTime = 35 + Math.random() * 2;
  if (state.t < elderSpawnTime && (state.buffs.soulBlue || state.buffs.soulRed) && Math.abs(state.mapAdvantage - 50) < 18) {
    state.t = Math.max(state.t + 1, elderSpawnTime);
    {
      for (const side of ['blue','red']) {
        for (const pos of POSITIONS) {
          if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
        }
      }
      applyPreset(pm, 'blue', POS_PRESETS.DRAGON_BLUE);
      applyPreset(pm, 'red',  POS_PRESETS.DRAGON_RED);

      const elderBlueScore = objR(bR) * (state.buffs.soulBlue ? 1.15 : 1.0);
      const elderRedScore  = objR(rR) * (state.buffs.soulRed  ? 1.15 : 1.0);
      const result = resolveFight(state, elderBlueScore, elderRedScore, blue, red, 'objective');
      const { winSide, loseDead, winDead } = applyFight(state, result, tally);

      killPlayers(pm, winSide === 'blue' ? 'red' : 'blue', loseDead);
      killPlayers(pm, winSide, winDead);

      recordObj(tally, 'dragon', result.blueWins);
      state.objectives.dragons[winSide]++;
      state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 15 : -15), 5, 95);
      const wLabel = winSide === 'blue' ? 'Blue' : 'Red';
      const killLine = result.winnerKills > 0 ? ` Fight: ${fightScore(result)}.` : '';
      pushEvent({
        time: padTime(state.t),
        text: `🐉🔥 ELDER DRAGON! ${wLabel} side secures this monstrous late-game objective!${killLine} Enemies struck by ${wLabel} will be instantly executed!`,
        type: 'objective', phase: 'lategame', dragonBlue: result.blueWins,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Final Teamfight ───────────────────────────────────────────────────────
  state.t += 2 + Math.random() * 2;
  {
    for (const side of ['blue','red']) {
      for (const pos of POSITIONS) {
        if (state.respawn[side][pos] <= state.t) pm[side][pos].alive = true;
      }
    }
    applyPreset(pm, 'blue', POS_PRESETS.TF_BLUE);
    applyPreset(pm, 'red',  POS_PRESETS.TF_RED);

    const comebackSide = state.mapAdvantage < 50 ? 'blue' : 'red';
    const clutch       = comebackSide === 'blue' ? bR.clutchRating : rR.clutchRating;
    const comeback     = chance(clamp((clutch - 60) * 0.7, 4, 22));

    let result;
    if (comeback) {
      const savedAdv = state.mapAdvantage;
      state.mapAdvantage = 50;
      result = resolveFight(state, bR.lateRating, rR.lateRating, blue, red, 'teamfight');
      result.blueWins = comebackSide === 'blue';
      state.mapAdvantage = savedAdv;
    } else {
      result = resolveFight(state, bR.lateRating, rR.lateRating, blue, red, 'teamfight');
    }

    // Final fight must be decisive
    result.winnerKills = clamp(Math.max(result.winnerKills, 3), 3, 5);
    result.loserKills  = clamp(result.loserKills, 0, 2);

    applyFight(state, result, tally);
    const finalWinner = result.blueWins ? 'blue' : 'red';
    const winTeam     = result.blueWins ? blue   : red;

    killPlayers(pm, finalWinner === 'blue' ? 'red' : 'blue', getAlivePosns(state, finalWinner === 'blue' ? 'red' : 'blue').slice(0, result.winnerKills));

    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 18 : -18), 5, 95);

    // 2 nexus towers before nexus
    state.objectives.towers[finalWinner] += 2;
    recordObj(tally, 'tower', result.blueWins);
    recordObj(tally, 'tower', result.blueWins);

    const useUlt = chance(55);
    let finalText;
    if (comeback) {
      const hero = playerWithChamp(winTeam, randFrom(['mid','adc','jungle']));
      if (useUlt) {
        const heroChamp = champOf(winTeam, randFrom(['mid','jungle','top']));
        if (heroChamp) {
          const data = getChampData(heroChamp);
          finalText = `🔥 CLUTCH COMEBACK! ${heroChamp} uses ${data.ult}: ${data.ultDesc}!! ${finalWinner==='blue'?'Blue':'Red'} side turns it around ${fightScore(result)}! THE BASE IS OPEN! THE CROWD IS GOING INSANE!`;
        } else {
          finalText = `🔥 CLUTCH COMEBACK! ${hero} makes the play of the tournament — ${finalWinner==='blue'?'Blue':'Red'} side REVERSES THE GAME ${fightScore(result)}! THE BASE IS OPEN!`;
        }
      } else {
        finalText = `🔥 CLUTCH COMEBACK! ${hero} makes an INSANE play — ${finalWinner==='blue'?'Blue':'Red'} side turns it around ${fightScore(result)}! BASE IS OPEN!`;
      }
    } else {
      finalText = tfPBP(finalWinner, result, blue, red, 'Final teamfight', useUlt) + ' The base is wide open — GG incoming!';
    }

    pushEvent({
      time: padTime(state.t), text: finalText,
      type: 'teamfight', phase: 'lategame',
      killBlue: result.blueWins,
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });

    state.winner = finalWinner;
  }

  // ── Nexus (1–2 min after final fight) ─────────────────────────────────────
  const nexusMin = state.t + 1 + Math.random();
  {
    const wLabel = state.winner === 'blue' ? 'Blue' : 'Red';
    const loserSide = state.winner === 'blue' ? 'red' : 'blue';
    // Winners push into nexus
    if (state.winner === 'blue') {
      applyPreset(pm, 'blue', POS_PRESETS.NEXUS_RED);
    } else {
      applyPreset(pm, 'red',  POS_PRESETS.NEXUS_BLUE);
    }
    // Losers are dead/at base
    for (const pos of POSITIONS) {
      pm[loserSide][pos].alive = false;
    }
    pushEvent({
      time: padTime(nexusMin),
      text: `🏆 NEXUS DESTROYED! ${wLabel} side wins the match! Outstanding performance — GG WP!`,
      type: 'result', phase: 'lategame',
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
    // Actually save the correct time
    events[events.length-1].time = padTime(nexusMin);
  }
}

// ─── Main Match Simulator ─────────────────────────────────────────────────────

function padToPositions(team) {
  return CONFIG.POSITIONS.map(pos => team.find(p => p && p.position === pos) || null);
}

function simulateMatch(blueTeam, redTeam, blueTeamName, redTeamName) {
  const blue = padToPositions(blueTeam);
  const red  = padToPositions(redTeam);

  const draft = draftChampions(blue, red);
  const tally = makeTally();
  initKDA(tally, blue, red);

  const bR = calcTeamRatings(blue);
  const rR = calcTeamRatings(red);

  const state = createState();
  state.mapAdvantage = clamp(50 + (bR.draftRating - rR.draftRating) * 0.15, 40, 60);

  // Position map and snapshots — threaded through all phases
  const pm        = makePosMap();
  const snapshots = [];

  const laningEvents = [];
  const midEvents    = [];
  const lateEvents   = [];

  simulateLaning(blue, red, bR, rR, state, laningEvents, tally, pm, snapshots);

  // Early stomp check after laning
  if (state.mapAdvantage >= 82 || state.mapAdvantage <= 18) {
    const earlyWin = state.mapAdvantage >= 50;
    const earlyMin = randInt(18, 22);

    // Move winners toward enemy base, losers dead
    if (earlyWin) {
      applyPreset(pm, 'blue', POS_PRESETS.NEXUS_RED);
      for (const pos of POSITIONS) pm.red[pos].alive = false;
    } else {
      applyPreset(pm, 'red',  POS_PRESETS.NEXUS_BLUE);
      for (const pos of POSITIONS) pm.blue[pos].alive = false;
    }
    const surrenderPos = clonePosMap(pm);

    lateEvents.push({
      time: padTime(earlyMin, 0),
      text: `🏆 EARLY SURRENDER! ${earlyWin ? (blueTeamName||'Blue') : (redTeamName||'Red')} completely dominates — GG WP!`,
      type: 'result', phase: 'lategame',
      goldDiff: tally.goldDiff,
      advAfter: state.mapAdvantage,
      positions: surrenderPos,
    });
    snapshots.push({ t: earlyMin * 60, positions: surrenderPos });

    tally.blue.gold += Math.round(earlyMin * 700 * (earlyWin ? 0.55 : 0.45));
    tally.red.gold  += Math.round(earlyMin * 700 * (earlyWin ? 0.45 : 0.55));
    const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };
    return {
      winner: earlyWin ? 'blue' : 'red',
      events: { laning: laningEvents, midgame: [], lategame: lateEvents },
      stats,
      draft,
      advantage: state.mapAdvantage,
      ratings: { blue: bR, red: rR },
      snapshots,
    };
  }

  simulateMidGame(blue, red, bR, rR, state, midEvents, tally, pm, snapshots);
  simulateLateGame(blue, red, bR, rR, state, lateEvents, tally, pm, snapshots);

  // Gold estimate based on actual game length
  const nexusEv = lateEvents.find(e => e.type === 'result');
  const gameMin = nexusEv ? (parseInt((nexusEv.time||'35').split(':')[0]) || 35) : 35;
  const blueWins = state.winner === 'blue';
  tally.blue.gold += Math.round(gameMin * 700 * (blueWins ? 0.52 : 0.48));
  tally.red.gold  += Math.round(gameMin * 700 * (blueWins ? 0.48 : 0.52));

  const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };

  const toSec = t => { if (!t) return 9999; const [m,s]=(t+'').split(':').map(Number); return (m||0)*60+(s||0); };
  const sortByTime = evs => evs.slice().sort((a,b) => toSec(a.time) - toSec(b.time));

  return {
    winner: state.winner || (blueWins ? 'blue' : 'red'),
    events: {
      laning:   sortByTime(laningEvents),
      midgame:  sortByTime(midEvents),
      lategame: sortByTime(lateEvents),
    },
    stats,
    draft,
    advantage: state.mapAdvantage,
    ratings: { blue: bR, red: rR },
    snapshots,
  };
}

// ─── Quick AI vs AI Simulation ────────────────────────────────────────────────

function quickSimulate(blueTeam, redTeam) {
  if (blueTeam && redTeam && Array.isArray(blueTeam)) {
    const bP = padToPositions(blueTeam.filter(Boolean));
    const rP = padToPositions(redTeam.filter(Boolean));
    const bR = calcTeamRatings(bP);
    const rR = calcTeamRatings(rP);
    const overall = r => (r.earlyRating + r.tfRating + r.lateRating) / 3;
    const diff    = (overall(bR) - overall(rR)) * 0.5;
    return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
  }
  const diff = ((blueTeam || 0.5) - (redTeam || 0.5)) * 40;
  return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
}
