// js/data/players.js — FM-style pro player database
// Attributes 1-20 FM scale: Technical (mechanics, csAccuracy, teamfightPositioning,
//   mapMovement, objectiveExecution, championPoolDepth) + Mental (decisionMaking,
//   gameSense, communication, leadership, adaptability, composure)

const STARTER_PACK = [
  { id:'s-top', name:'Rookie Top',     position:'top',     tier:0, region:null, age:18, secondaryRole:null, champions:['Garen','Malphite'],   contract:{salary:15000,yearsLeft:1,expiryYear:2027}, bio:'A fresh prospect just starting their pro career.', stars:1,
    stats:{mechanics:4,csAccuracy:4,teamfightPositioning:4,mapMovement:4,objectiveExecution:3,championPoolDepth:3,decisionMaking:4,gameSense:4,communication:4,leadership:3,adaptability:4,composure:4} },
  { id:'s-jg',  name:'Rookie Jungler', position:'jungle',  tier:0, region:null, age:18, secondaryRole:null, champions:['Warwick','Amumu'],     contract:{salary:15000,yearsLeft:1,expiryYear:2027}, bio:'Learning the art of objective control.', stars:1,
    stats:{mechanics:4,csAccuracy:3,teamfightPositioning:4,mapMovement:4,objectiveExecution:4,championPoolDepth:3,decisionMaking:4,gameSense:4,communication:4,leadership:3,adaptability:4,composure:4} },
  { id:'s-mid', name:'Rookie Mid',     position:'mid',     tier:0, region:null, age:18, secondaryRole:null, champions:['Annie','Lux'],         contract:{salary:15000,yearsLeft:1,expiryYear:2027}, bio:'Building fundamentals in the mid lane.', stars:1,
    stats:{mechanics:4,csAccuracy:4,teamfightPositioning:4,mapMovement:4,objectiveExecution:3,championPoolDepth:3,decisionMaking:4,gameSense:4,communication:4,leadership:3,adaptability:4,composure:4} },
  { id:'s-adc', name:'Rookie ADC',     position:'adc',     tier:0, region:null, age:18, secondaryRole:null, champions:['Ashe','Caitlyn'],      contract:{salary:15000,yearsLeft:1,expiryYear:2027}, bio:'Learning to farm and position safely.', stars:1,
    stats:{mechanics:4,csAccuracy:4,teamfightPositioning:4,mapMovement:3,objectiveExecution:3,championPoolDepth:3,decisionMaking:4,gameSense:4,communication:4,leadership:3,adaptability:4,composure:4} },
  { id:'s-sup', name:'Rookie Support', position:'support', tier:0, region:null, age:18, secondaryRole:null, champions:['Soraka','Blitzcrank'], contract:{salary:15000,yearsLeft:1,expiryYear:2027}, bio:'Keeping the team alive from the bottom lane.', stars:1,
    stats:{mechanics:3,csAccuracy:3,teamfightPositioning:4,mapMovement:4,objectiveExecution:3,championPoolDepth:3,decisionMaking:4,gameSense:4,communication:5,leadership:4,adaptability:4,composure:4} },
];

const PLAYER_TEMPLATES = [

  // ─── TOP LANERS ───────────────────────────────────────────────
  { id:'p01', name:'Kronos', position:'top', tier:5, region:'LCK', age:24, secondaryRole:null,
    champions:['Renekton','Camille','Gnar','Jayce'],
    contract:{salary:900000, yearsLeft:2, expiryYear:2028},
    bio:'Dominant Korean lane bully — world-class mechanics and laning.', stars:1,
    stats:{mechanics:19,csAccuracy:18,teamfightPositioning:16,mapMovement:15,objectiveExecution:15,championPoolDepth:17,decisionMaking:16,gameSense:17,communication:14,leadership:15,adaptability:16,composure:18} },

  { id:'p02', name:'Fortress', position:'top', tier:4, region:'LEC', age:26, secondaryRole:null,
    champions:['Jayce','Gnar','Fiora','Ornn'],
    contract:{salary:220000, yearsLeft:1, expiryYear:2027},
    bio:'Veteran EU top laner with elite game sense and versatile champion pool.', stars:1,
    stats:{mechanics:15,csAccuracy:14,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:16,decisionMaking:17,gameSense:16,communication:15,leadership:14,adaptability:16,composure:15} },

  // ─── JUNGLERS ─────────────────────────────────────────────────
  { id:'p03', name:'Wraith', position:'jungle', tier:5, region:'LCK', age:22, secondaryRole:null,
    champions:['Lee Sin','Rek\'Sai','Nidalee','Graves'],
    contract:{salary:850000, yearsLeft:3, expiryYear:2029},
    bio:'The most mechanically gifted jungler in the world — famous for insane Lee Sin plays.', stars:1,
    stats:{mechanics:20,csAccuracy:17,teamfightPositioning:17,mapMovement:19,objectiveExecution:18,championPoolDepth:17,decisionMaking:17,gameSense:19,communication:15,leadership:14,adaptability:17,composure:18} },

  { id:'p04', name:'Eclipse', position:'jungle', tier:4, region:'LPL', age:23, secondaryRole:null,
    champions:['Viego','Hecarim','Evelynn','Kayn'],
    contract:{salary:350000, yearsLeft:2, expiryYear:2028},
    bio:'Aggressive carry jungler who snowballs early leads into decisive advantages.', stars:1,
    stats:{mechanics:17,csAccuracy:15,teamfightPositioning:16,mapMovement:17,objectiveExecution:16,championPoolDepth:15,decisionMaking:15,gameSense:16,communication:13,leadership:12,adaptability:15,composure:14} },

  // ─── MID LANERS ───────────────────────────────────────────────
  { id:'p05', name:'Mirage', position:'mid', tier:5, region:'LCK', age:21, secondaryRole:null,
    champions:['Azir','Orianna','Zed','Akali','Corki'],
    contract:{salary:1000000, yearsLeft:2, expiryYear:2028},
    bio:'Generational mid laner — elite on both carry and utility champions.', stars:1,
    stats:{mechanics:20,csAccuracy:19,teamfightPositioning:18,mapMovement:17,objectiveExecution:15,championPoolDepth:20,decisionMaking:18,gameSense:19,communication:15,leadership:16,adaptability:19,composure:18} },

  { id:'p06', name:'Vortex', position:'mid', tier:4, region:'LPL', age:22, secondaryRole:null,
    champions:['Viktor','Syndra','LeBlanc','Zoe'],
    contract:{salary:280000, yearsLeft:2, expiryYear:2028},
    bio:'Poke-focused mid laner with incredible teamfight positioning.', stars:1,
    stats:{mechanics:16,csAccuracy:17,teamfightPositioning:17,mapMovement:15,objectiveExecution:14,championPoolDepth:15,decisionMaking:16,gameSense:17,communication:14,leadership:13,adaptability:15,composure:16} },

  // ─── ADC ──────────────────────────────────────────────────────
  { id:'p07', name:'Javelin', position:'adc', tier:5, region:'LPL', age:20, secondaryRole:null,
    champions:['Jinx','Aphelios','Zeri','Kai\'Sa','Jhin'],
    contract:{salary:950000, yearsLeft:2, expiryYear:2028},
    bio:'Mechanical prodigy — the best farming ADC in the world with pristine teamfight positioning.', stars:1,
    stats:{mechanics:19,csAccuracy:20,teamfightPositioning:19,mapMovement:16,objectiveExecution:15,championPoolDepth:18,decisionMaking:17,gameSense:18,communication:14,leadership:13,adaptability:17,composure:19} },

  { id:'p08', name:'Tempest', position:'adc', tier:4, region:'LEC', age:24, secondaryRole:null,
    champions:['Caitlyn','Ezreal','Xayah','Varus'],
    contract:{salary:180000, yearsLeft:1, expiryYear:2027},
    bio:'Consistent EU marksman known for precise kiting and late-game impact.', stars:1,
    stats:{mechanics:16,csAccuracy:17,teamfightPositioning:16,mapMovement:14,objectiveExecution:13,championPoolDepth:15,decisionMaking:15,gameSense:16,communication:14,leadership:12,adaptability:15,composure:17} },

  // ─── SUPPORTS ─────────────────────────────────────────────────
  { id:'p09', name:'Aegis', position:'support', tier:5, region:'LCK', age:23, secondaryRole:null,
    champions:['Thresh','Nautilus','Rakan','Blitzcrank'],
    contract:{salary:750000, yearsLeft:2, expiryYear:2028},
    bio:'Engage support with perfect timing and unmatched playmaking ability.', stars:1,
    stats:{mechanics:18,csAccuracy:12,teamfightPositioning:19,mapMovement:17,objectiveExecution:16,championPoolDepth:16,decisionMaking:18,gameSense:19,communication:18,leadership:17,adaptability:17,composure:18} },

  { id:'p10', name:'Citadel', position:'support', tier:4, region:'LCS', age:27, secondaryRole:null,
    champions:['Lulu','Karma','Soraka','Janna'],
    contract:{salary:160000, yearsLeft:1, expiryYear:2027},
    bio:'Veteran enchanter support — the backbone of every team he plays on.', stars:1,
    stats:{mechanics:13,csAccuracy:11,teamfightPositioning:15,mapMovement:15,objectiveExecution:13,championPoolDepth:15,decisionMaking:16,gameSense:17,communication:18,leadership:17,adaptability:16,composure:15} },
];

// Build the player pool: each player repeated by tier pool size (T0 excluded — only in STARTER_PACK)
function buildPlayerPool() {
  const pool = [];
  PLAYER_TEMPLATES.forEach(p => {
    if (p.tier === 0) return;
    const copies = CONFIG.TIER_POOL_SIZE[p.tier] || 0;
    for (let i = 0; i < copies; i++) {
      pool.push({ ...p, stats: { ...p.stats }, champions: [...p.champions] });
    }
  });
  return pool;
}

function getPlayerTemplate(id) {
  return PLAYER_TEMPLATES.find(p => p.id === id);
}

function createPlayerInstance(template) {
  return {
    ...template,
    stats:     { ...template.stats },
    champions: [...template.champions],
    stars:     1,
    instanceId: Math.random().toString(36).substr(2, 9),
    champion:  null,
  };
}

function getStarterPack() {
  return STARTER_PACK.map(p => ({
    ...p,
    stats:     { ...p.stats },
    champions: [...p.champions],
    instanceId: Math.random().toString(36).substr(2, 9),
    champion:  null,
  }));
}

function getEffectiveStats(player) {
  const mult = CONFIG.STAR_MULTIPLIER[player.stars] || 1;
  const s = {};
  for (const [k, v] of Object.entries(player.stats)) {
    s[k] = Math.min(20, Math.round(v * mult));
  }
  return s;
}
