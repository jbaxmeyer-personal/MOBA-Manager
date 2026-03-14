// js/data/players.js — LCS player database
// FM-style attributes 1-20: Technical + Mental (no Physical needed for esports!)
// Each player: stats, play style, champion pool, contract, morale, form

// ─── Helper: generate a form array ────────────────────────────────────────────
function makeForm(avg, spread = 1) {
  return [1,2,3].map(() => Math.min(10, Math.max(1, Math.round(avg + (Math.random()-0.5)*spread*2))));
}

// ─── Player Templates ─────────────────────────────────────────────────────────
// playStyle: 'carry' | 'utility' | 'aggressive' | 'passive' | 'playmaker' | 'shotcaller' | 'flex'
// position:  'top' | 'jungle' | 'mid' | 'adc' | 'support'

const PLAYER_DB = [

  // ══════════════════════════════════════════════════════════════════
  // CLOUD9 (human team)
  // ══════════════════════════════════════════════════════════════════

  { id:'p001', name:'Fudge',    teamId:'c9',   position:'top',     age:22, nationality:'AUS',
    playStyle:'flex',       champions:['Renekton','Jayce','Camille','Gnar','Fiora'],
    contract:{ salary:180000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:15,csAccuracy:14,teamfightPositioning:13,mapMovement:14,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:12,leadership:11,adaptability:14,composure:13 } },

  { id:'p002', name:'Blaber',   teamId:'c9',   position:'jungle',  age:23, nationality:'CAN',
    playStyle:'aggressive', champions:['Lee Sin','Vi','Hecarim','Xin Zhao','Graves'],
    contract:{ salary:220000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:16,csAccuracy:14,teamfightPositioning:15,mapMovement:17,objectiveExecution:16,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:13,leadership:12,adaptability:15,composure:14 } },

  { id:'p003', name:'Jojopyun', teamId:'c9',   position:'mid',     age:20, nationality:'USA',
    playStyle:'carry',      champions:['Akali','LeBlanc','Zed','Vex','Syndra'],
    contract:{ salary:200000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:17,csAccuracy:16,teamfightPositioning:14,mapMovement:15,objectiveExecution:12,championPoolDepth:15,
            decisionMaking:14,gameSense:15,communication:11,leadership:10,adaptability:15,composure:14 } },

  { id:'p004', name:'Berserker',teamId:'c9',   position:'adc',     age:21, nationality:'KOR',
    playStyle:'carry',      champions:['Jinx','Zeri','Aphelios','Caitlyn','Jhin'],
    contract:{ salary:280000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:17,csAccuracy:18,teamfightPositioning:16,mapMovement:14,objectiveExecution:13,championPoolDepth:15,
            decisionMaking:14,gameSense:15,communication:10,leadership:9,adaptability:14,composure:15 } },

  { id:'p005', name:'Vulcan',   teamId:'c9',   position:'support', age:24, nationality:'CAN',
    playStyle:'playmaker',  champions:['Thresh','Nautilus','Rakan','Blitzcrank','Alistar'],
    contract:{ salary:190000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:10,teamfightPositioning:16,mapMovement:15,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:15,gameSense:16,communication:16,leadership:14,adaptability:15,composure:15 } },

  // C9 Academy
  { id:'p006', name:'Tenacity', teamId:'c9',   position:'top',     age:19, nationality:'USA',
    playStyle:'aggressive', champions:['Darius','Garen','Malphite','Renekton'],
    contract:{ salary:45000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:11,csAccuracy:10,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:9,
            decisionMaking:10,gameSense:10,communication:9,leadership:8,adaptability:11,composure:10 } },

  { id:'p007', name:'Procxin',  teamId:'c9',   position:'jungle',  age:20, nationality:'USA',
    playStyle:'aggressive', champions:['Vi','Jarvan IV','Amumu','Sejuani'],
    contract:{ salary:40000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:10,csAccuracy:9,teamfightPositioning:11,mapMovement:11,objectiveExecution:10,championPoolDepth:9,
            decisionMaking:9,gameSense:10,communication:9,leadership:8,adaptability:10,composure:9 } },

  { id:'p008', name:'Isles',    teamId:'c9',   position:'mid',     age:18, nationality:'USA',
    playStyle:'carry',      champions:['Lux','Annie','Vex','Zoe'],
    contract:{ salary:35000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:11,csAccuracy:11,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:10,
            decisionMaking:10,gameSense:11,communication:9,leadership:7,adaptability:11,composure:10 } },

  { id:'p009', name:'Kaori',    teamId:'c9',   position:'adc',     age:19, nationality:'USA',
    playStyle:'carry',      champions:['Ashe','Caitlyn','Sivir','Tristana'],
    contract:{ salary:38000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:11,csAccuracy:12,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:9,
            decisionMaking:10,gameSense:10,communication:9,leadership:7,adaptability:10,composure:10 } },

  { id:'p010', name:'Chime',    teamId:'c9',   position:'support', age:20, nationality:'USA',
    playStyle:'utility',    champions:['Soraka','Lulu','Janna','Karma'],
    contract:{ salary:35000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:9,csAccuracy:7,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:9,
            decisionMaking:10,gameSense:10,communication:11,leadership:9,adaptability:10,composure:10 } },

  // ══════════════════════════════════════════════════════════════════
  // TEAM LIQUID
  // ══════════════════════════════════════════════════════════════════

  { id:'p011', name:'Bwipo',    teamId:'tl',   position:'top',     age:25, nationality:'BEL',
    playStyle:'aggressive', champions:['Renekton','Gnar','Wukong','Darius','Malphite'],
    contract:{ salary:250000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:16,csAccuracy:15,teamfightPositioning:16,mapMovement:15,objectiveExecution:14,championPoolDepth:15,
            decisionMaking:15,gameSense:16,communication:15,leadership:14,adaptability:16,composure:15 } },

  { id:'p012', name:'Umti',     teamId:'tl',   position:'jungle',  age:22, nationality:'KOR',
    playStyle:'playmaker',  champions:['Lee Sin','Rek\'Sai','Hecarim','Jarvan IV','Vi'],
    contract:{ salary:200000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:14,teamfightPositioning:15,mapMovement:16,objectiveExecution:15,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:11,leadership:11,adaptability:14,composure:14 } },

  { id:'p013', name:'APA',      teamId:'tl',   position:'mid',     age:19, nationality:'USA',
    playStyle:'carry',      champions:['Azir','Orianna','Corki','Twisted Fate','Lux'],
    contract:{ salary:160000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:15,teamfightPositioning:14,mapMovement:14,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:12,leadership:11,adaptability:15,composure:14 } },

  { id:'p014', name:'Yeon',     teamId:'tl',   position:'adc',     age:21, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Jhin','Caitlyn','Ezreal','Aphelios'],
    contract:{ salary:190000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:15,csAccuracy:16,teamfightPositioning:15,mapMovement:13,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:12,leadership:10,adaptability:13,composure:14 } },

  { id:'p015', name:'CoreJJ',   teamId:'tl',   position:'support', age:28, nationality:'KOR',
    playStyle:'shotcaller', champions:['Thresh','Nautilus','Alistar','Leona','Braum'],
    contract:{ salary:350000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:16,csAccuracy:11,teamfightPositioning:18,mapMovement:17,objectiveExecution:17,championPoolDepth:16,
            decisionMaking:18,gameSense:19,communication:18,leadership:18,adaptability:17,composure:18 } },

  // TL Academy
  { id:'p016', name:'Summit',   teamId:'tl',   position:'top',     age:24, nationality:'KOR',
    playStyle:'carry',      champions:['Irelia','Riven','Fiora','Camille'],
    contract:{ salary:90000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:17,csAccuracy:16,teamfightPositioning:13,mapMovement:14,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:12,gameSense:13,communication:9,leadership:8,adaptability:13,composure:12 } },

  { id:'p017', name:'Eyla',     teamId:'tl',   position:'support', age:21, nationality:'AUS',
    playStyle:'utility',    champions:['Lulu','Karma','Nami','Soraka'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:11,csAccuracy:8,teamfightPositioning:12,mapMovement:12,objectiveExecution:10,championPoolDepth:10,
            decisionMaking:12,gameSense:12,communication:13,leadership:10,adaptability:12,composure:12 } },

  // ══════════════════════════════════════════════════════════════════
  // 100 THIEVES
  // ══════════════════════════════════════════════════════════════════

  { id:'p021', name:'Ssumday',  teamId:'100t', position:'top',     age:28, nationality:'KOR',
    playStyle:'utility',    champions:['Ornn','Malphite','Sion','Gnar','Renekton'],
    contract:{ salary:300000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:16,csAccuracy:16,teamfightPositioning:17,mapMovement:15,objectiveExecution:15,championPoolDepth:16,
            decisionMaking:17,gameSense:17,communication:13,leadership:14,adaptability:16,composure:17 } },

  { id:'p022', name:'Closer',   teamId:'100t', position:'jungle',  age:23, nationality:'KOR',
    playStyle:'aggressive', champions:['Nidalee','Evelynn','Kha\'Zix','Lee Sin','Rengar'],
    contract:{ salary:220000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:16,csAccuracy:15,teamfightPositioning:15,mapMovement:17,objectiveExecution:15,championPoolDepth:15,
            decisionMaking:15,gameSense:16,communication:12,leadership:11,adaptability:15,composure:14 } },

  { id:'p023', name:'Tenacity', teamId:'100t', position:'mid',     age:21, nationality:'USA',
    playStyle:'carry',      champions:['Viktor','Syndra','Zoe','LeBlanc','Ryze'],
    contract:{ salary:180000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:15,teamfightPositioning:14,mapMovement:14,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:12,leadership:10,adaptability:14,composure:14 } },

  { id:'p024', name:'FBI',      teamId:'100t', position:'adc',     age:23, nationality:'AUS',
    playStyle:'carry',      champions:['Jinx','Ezreal','Lucian','Tristana','Draven'],
    contract:{ salary:210000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:16,csAccuracy:17,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:15,
            decisionMaking:14,gameSense:15,communication:13,leadership:11,adaptability:14,composure:15 } },

  { id:'p025', name:'huhi',     teamId:'100t', position:'support', age:26, nationality:'KOR',
    playStyle:'utility',    champions:['Lulu','Soraka','Karma','Janna','Nami'],
    contract:{ salary:170000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:9,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:14,
            decisionMaking:15,gameSense:15,communication:15,leadership:13,adaptability:15,composure:14 } },

  // ══════════════════════════════════════════════════════════════════
  // FLYQUEST
  // ══════════════════════════════════════════════════════════════════

  { id:'p031', name:'Impact',   teamId:'flyq', position:'top',     age:29, nationality:'KOR',
    playStyle:'utility',    champions:['Ornn','Malphite','Sion','Gnar','Gragas'],
    contract:{ salary:200000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:15,csAccuracy:15,teamfightPositioning:17,mapMovement:14,objectiveExecution:15,championPoolDepth:15,
            decisionMaking:17,gameSense:17,communication:14,leadership:15,adaptability:16,composure:17 } },

  { id:'p032', name:'Inspired', teamId:'flyq', position:'jungle',  age:22, nationality:'POL',
    playStyle:'playmaker',  champions:['Lee Sin','Evelynn','Taliyah','Graves','Hecarim'],
    contract:{ salary:230000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:16,csAccuracy:14,teamfightPositioning:16,mapMovement:17,objectiveExecution:15,championPoolDepth:15,
            decisionMaking:15,gameSense:16,communication:13,leadership:12,adaptability:16,composure:14 } },

  { id:'p033', name:'Gala',     teamId:'flyq', position:'mid',     age:22, nationality:'USA',
    playStyle:'carry',      champions:['Azir','Ryze','Cassiopeia','Orianna','Viktor'],
    contract:{ salary:160000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:14,teamfightPositioning:14,mapMovement:13,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:14,gameSense:14,communication:12,leadership:10,adaptability:13,composure:13 } },

  { id:'p034', name:'Prince',   teamId:'flyq', position:'adc',     age:21, nationality:'KOR',
    playStyle:'carry',      champions:['Aphelios','Jinx','Zeri','Kai\'Sa','Caitlyn'],
    contract:{ salary:175000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:16,teamfightPositioning:15,mapMovement:13,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:11,leadership:9,adaptability:13,composure:14 } },

  { id:'p035', name:'Busio',    teamId:'flyq', position:'support', age:22, nationality:'USA',
    playStyle:'playmaker',  champions:['Thresh','Blitzcrank','Nautilus','Rakan','Alistar'],
    contract:{ salary:140000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:9,teamfightPositioning:14,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:13,gameSense:14,communication:14,leadership:12,adaptability:13,composure:13 } },

  // ══════════════════════════════════════════════════════════════════
  // EVIL GENIUSES
  // ══════════════════════════════════════════════════════════════════

  { id:'p041', name:'Thanatos', teamId:'eg',   position:'top',     age:23, nationality:'KOR',
    playStyle:'carry',      champions:['Camille','Irelia','Renekton','Jax','Darius'],
    contract:{ salary:160000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:14,teamfightPositioning:14,mapMovement:14,objectiveExecution:13,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:11,leadership:10,adaptability:14,composure:13 } },

  { id:'p042', name:'Contractz',teamId:'eg',   position:'jungle',  age:25, nationality:'USA',
    playStyle:'aggressive', champions:['Graves','Lee Sin','Vi','Xin Zhao','Jarvan IV'],
    contract:{ salary:150000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:14,mapMovement:15,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:13,gameSense:14,communication:13,leadership:11,adaptability:13,composure:13 } },

  { id:'p043', name:'Jizuke',   teamId:'eg',   position:'mid',     age:25, nationality:'ITA',
    playStyle:'carry',      champions:['LeBlanc','Zed','Akali','Syndra','Ahri'],
    contract:{ salary:170000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:16,csAccuracy:15,teamfightPositioning:14,mapMovement:14,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:11,leadership:9,adaptability:14,composure:13 } },

  { id:'p044', name:'Kaito',    teamId:'eg',   position:'adc',     age:20, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Lucian','Ezreal','Xayah','Tristana'],
    contract:{ salary:130000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:15,teamfightPositioning:14,mapMovement:13,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:11,leadership:9,adaptability:13,composure:13 } },

  { id:'p045', name:'Ignar',    teamId:'eg',   position:'support', age:26, nationality:'KOR',
    playStyle:'playmaker',  champions:['Rakan','Thresh','Alistar','Nautilus','Leona'],
    contract:{ salary:180000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:10,teamfightPositioning:16,mapMovement:15,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:15,gameSense:15,communication:14,leadership:13,adaptability:14,composure:14 } },

  // ══════════════════════════════════════════════════════════════════
  // DIGNITAS
  // ══════════════════════════════════════════════════════════════════

  { id:'p051', name:'Armut',    teamId:'dig',  position:'top',     age:23, nationality:'TUR',
    playStyle:'aggressive', champions:['Gnar','Renekton','Wukong','Pantheon','Darius'],
    contract:{ salary:140000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:13,
            decisionMaking:13,gameSense:14,communication:12,leadership:11,adaptability:13,composure:13 } },

  { id:'p052', name:'eXyu',     teamId:'dig',  position:'jungle',  age:22, nationality:'BIH',
    playStyle:'aggressive', champions:['Lee Sin','Graves','Kha\'Zix','Rengar','Vi'],
    contract:{ salary:120000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:11,leadership:10,adaptability:12,composure:12 } },

  { id:'p053', name:'Blue',     teamId:'dig',  position:'mid',     age:21, nationality:'USA',
    playStyle:'carry',      champions:['Akali','Sylas','Zed','LeBlanc','Fizz'],
    contract:{ salary:110000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:13,mapMovement:13,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:11,leadership:9,adaptability:13,composure:12 } },

  { id:'p054', name:'Tomo',     teamId:'dig',  position:'adc',     age:20, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Caitlyn','Ashe','Jhin','Sivir'],
    contract:{ salary:100000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:14,teamfightPositioning:13,mapMovement:12,objectiveExecution:11,championPoolDepth:12,
            decisionMaking:11,gameSense:12,communication:10,leadership:8,adaptability:12,composure:12 } },

  { id:'p055', name:'IgNar',    teamId:'dig',  position:'support', age:27, nationality:'KOR',
    playStyle:'playmaker',  champions:['Thresh','Nautilus','Blitzcrank','Alistar','Rakan'],
    contract:{ salary:150000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:9,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:14,gameSense:15,communication:14,leadership:13,adaptability:14,composure:14 } },

  // ══════════════════════════════════════════════════════════════════
  // NRG ESPORTS
  // ══════════════════════════════════════════════════════════════════

  { id:'p061', name:'Dhokla',   teamId:'nrg',  position:'top',     age:24, nationality:'USA',
    playStyle:'utility',    champions:['Malphite','Ornn','Gragas','Garen','Sion'],
    contract:{ salary:120000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:14,mapMovement:12,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:12,leadership:11,adaptability:12,composure:13 } },

  { id:'p062', name:'Ivern',    teamId:'nrg',  position:'jungle',  age:21, nationality:'KOR',
    playStyle:'aggressive', champions:['Lee Sin','Hecarim','Vi','Jarvan IV','Xin Zhao'],
    contract:{ salary:110000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:10,leadership:9,adaptability:12,composure:12 } },

  { id:'p063', name:'Palafox',  teamId:'nrg',  position:'mid',     age:22, nationality:'USA',
    playStyle:'carry',      champions:['Zoe','Syndra','Lux','Viktor','Orianna'],
    contract:{ salary:120000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:13,mapMovement:13,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:13,gameSense:13,communication:11,leadership:9,adaptability:13,composure:12 } },

  { id:'p064', name:'Stixxay',  teamId:'nrg',  position:'adc',     age:26, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Tristana','Lucian','Draven','Ashe'],
    contract:{ salary:130000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:14,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:12,leadership:10,adaptability:12,composure:13 } },

  { id:'p065', name:'Isles',    teamId:'nrg',  position:'support', age:21, nationality:'USA',
    playStyle:'utility',    champions:['Lulu','Soraka','Karma','Janna','Thresh'],
    contract:{ salary:100000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:8,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:11,
            decisionMaking:12,gameSense:12,communication:13,leadership:10,adaptability:12,composure:11 } },

  // ══════════════════════════════════════════════════════════════════
  // SHOPIFY REBELLION
  // ══════════════════════════════════════════════════════════════════

  { id:'p071', name:'Licorice',  teamId:'shop', position:'top',    age:24, nationality:'USA',
    playStyle:'flex',       champions:['Camille','Renekton','Jayce','Gangplank','Gnar'],
    contract:{ salary:150000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:14,teamfightPositioning:14,mapMovement:14,objectiveExecution:13,championPoolDepth:15,
            decisionMaking:14,gameSense:14,communication:13,leadership:12,adaptability:15,composure:14 } },

  { id:'p072', name:'Akaadian',  teamId:'shop', position:'jungle', age:25, nationality:'USA',
    playStyle:'aggressive', champions:['Graves','Xin Zhao','Vi','Lee Sin','Jarvan IV'],
    contract:{ salary:110000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:12,leadership:10,adaptability:12,composure:12 } },

  { id:'p073', name:'Soligo',    teamId:'shop', position:'mid',    age:22, nationality:'USA',
    playStyle:'carry',      champions:['Azir','Ryze','Orianna','Syndra','Viktor'],
    contract:{ salary:120000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:13,mapMovement:13,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:13,gameSense:13,communication:12,leadership:10,adaptability:13,composure:13 } },

  { id:'p074', name:'Ngo',       teamId:'shop', position:'adc',    age:20, nationality:'CAN',
    playStyle:'carry',      champions:['Jinx','Zeri','Aphelios','Jhin','Caitlyn'],
    contract:{ salary:90000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:13,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:11,
            decisionMaking:11,gameSense:12,communication:10,leadership:8,adaptability:12,composure:12 } },

  { id:'p075', name:'Olleh',     teamId:'shop', position:'support',age:27, nationality:'KOR',
    playStyle:'playmaker',  champions:['Thresh','Blitzcrank','Nautilus','Alistar','Leona'],
    contract:{ salary:130000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:9,teamfightPositioning:14,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:14,gameSense:14,communication:13,leadership:12,adaptability:13,composure:13 } },

  // ══════════════════════════════════════════════════════════════════
  // GOLDEN GUARDIANS
  // ══════════════════════════════════════════════════════════════════

  { id:'p081', name:'Haeri',    teamId:'gg',   position:'top',     age:22, nationality:'KOR',
    playStyle:'aggressive', champions:['Renekton','Darius','Camille','Irelia','Gnar'],
    contract:{ salary:110000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:13,mapMovement:13,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:11,leadership:9,adaptability:13,composure:12 } },

  { id:'p082', name:'River',    teamId:'gg',   position:'jungle',  age:23, nationality:'KOR',
    playStyle:'aggressive', champions:['Lee Sin','Kha\'Zix','Evelynn','Graves','Hecarim'],
    contract:{ salary:120000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:10,leadership:10,adaptability:13,composure:12 } },

  { id:'p083', name:'Gori',     teamId:'gg',   position:'mid',     age:22, nationality:'KOR',
    playStyle:'carry',      champions:['Syndra','Zoe','Vex','Lux','LeBlanc'],
    contract:{ salary:110000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:13,mapMovement:12,objectiveExecution:11,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:11,leadership:9,adaptability:13,composure:12 } },

  { id:'p084', name:'Stixxay',  teamId:'gg',   position:'adc',     age:26, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Lucian','Ezreal','Ashe','Sivir'],
    contract:{ salary:100000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:12,csAccuracy:13,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:12,
            decisionMaking:11,gameSense:12,communication:11,leadership:9,adaptability:12,composure:12 } },

  { id:'p085', name:'Lehends',  teamId:'gg',   position:'support', age:23, nationality:'KOR',
    playStyle:'utility',    champions:['Soraka','Lulu','Karma','Nami','Janna'],
    contract:{ salary:110000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:8,teamfightPositioning:13,mapMovement:13,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:12,leadership:11,adaptability:13,composure:12 } },

  // ══════════════════════════════════════════════════════════════════
  // IMMORTALS
  // ══════════════════════════════════════════════════════════════════

  { id:'p091', name:'Allorim',  teamId:'imt',  position:'top',     age:27, nationality:'USA',
    playStyle:'utility',    champions:['Malphite','Ornn','Garen','Sion','Gragas'],
    contract:{ salary:100000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:11,csAccuracy:11,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:12,leadership:11,adaptability:12,composure:13 } },

  { id:'p092', name:'Xerxe',    teamId:'imt',  position:'jungle',  age:24, nationality:'ROM',
    playStyle:'playmaker',  champions:['Lee Sin','Elise','Kha\'Zix','Vi','Graves'],
    contract:{ salary:110000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:13,
            decisionMaking:13,gameSense:13,communication:11,leadership:10,adaptability:13,composure:12 } },

  { id:'p093', name:'Ablazeolive',teamId:'imt', position:'mid',    age:21, nationality:'USA',
    playStyle:'carry',      champions:['Azir','Orianna','Corki','Viktor','Sylas'],
    contract:{ salary:100000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:12,
            decisionMaking:12,gameSense:12,communication:11,leadership:9,adaptability:12,composure:11 } },

  { id:'p094', name:'WildTurtle',teamId:'imt',  position:'adc',    age:28, nationality:'CAN',
    playStyle:'carry',      champions:['Jinx','Lucian','Caitlyn','Jhin','Sivir'],
    contract:{ salary:120000, yearsLeft:1, expiryYear:2026 },
    stats:{ mechanics:12,csAccuracy:13,teamfightPositioning:13,mapMovement:12,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:13,leadership:11,adaptability:13,composure:13 } },

  { id:'p095', name:'Winston',  teamId:'imt',  position:'support', age:22, nationality:'USA',
    playStyle:'utility',    champions:['Lulu','Thresh','Soraka','Blitzcrank','Karma'],
    contract:{ salary:85000, yearsLeft:2, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:8,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:11,
            decisionMaking:12,gameSense:12,communication:12,leadership:10,adaptability:12,composure:11 } },

  // ══════════════════════════════════════════════════════════════════
  // FREE AGENTS
  // ══════════════════════════════════════════════════════════════════

  { id:'fa001', name:'Hauntzer',  teamId:null, position:'top',     age:28, nationality:'USA',
    playStyle:'utility',    champions:['Ornn','Malphite','Gnar','Renekton','Sion'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:14,mapMovement:13,objectiveExecution:13,championPoolDepth:13,
            decisionMaking:14,gameSense:14,communication:13,leadership:13,adaptability:13,composure:14 } },

  { id:'fa002', name:'Sven',      teamId:null, position:'jungle',  age:25, nationality:'GER',
    playStyle:'aggressive', champions:['Lee Sin','Graves','Kha\'Zix','Vi','Rengar'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:11,leadership:10,adaptability:13,composure:12 } },

  { id:'fa003', name:'Pobelter',  teamId:null, position:'mid',     age:27, nationality:'USA',
    playStyle:'utility',    champions:['Orianna','Viktor','Corki','Twisted Fate','Lux'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:13,mapMovement:13,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:14,gameSense:14,communication:13,leadership:12,adaptability:14,composure:13 } },

  { id:'fa004', name:'Cody Sun',  teamId:null, position:'adc',     age:26, nationality:'USA',
    playStyle:'carry',      champions:['Jinx','Caitlyn','Ezreal','Jhin','Sivir'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:13,csAccuracy:14,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:12,leadership:10,adaptability:12,composure:13 } },

  { id:'fa005', name:'Aphromoo',  teamId:null, position:'support', age:30, nationality:'USA',
    playStyle:'shotcaller', champions:['Thresh','Blitzcrank','Leona','Alistar','Braum'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:12,csAccuracy:8,teamfightPositioning:14,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:15,gameSense:15,communication:16,leadership:15,adaptability:13,composure:15 } },

  { id:'fa006', name:'Lourlo',    teamId:null, position:'top',     age:26, nationality:'USA',
    playStyle:'utility',    champions:['Malphite','Ornn','Garen','Renekton','Darius'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:11,csAccuracy:11,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:11,
            decisionMaking:12,gameSense:12,communication:12,leadership:11,adaptability:12,composure:12 } },

  { id:'fa007', name:'Meteos',    teamId:null, position:'jungle',  age:29, nationality:'USA',
    playStyle:'utility',    champions:['Jarvan IV','Vi','Sejuani','Amumu','Zac'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2025 },
    stats:{ mechanics:12,csAccuracy:11,teamfightPositioning:13,mapMovement:13,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:14,gameSense:14,communication:13,leadership:13,adaptability:13,composure:14 } },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

function getPlayer(id) {
  return PLAYER_DB.find(p => p.id === id) || null;
}

function getTeamRoster(teamId) {
  return PLAYER_DB.filter(p => p.teamId === teamId);
}

function getFreeAgents() {
  return PLAYER_DB.filter(p => !p.teamId);
}

// Current ability: average of all stats, scaled 1-200 (like FM)
function calcCA(player) {
  const vals = Object.values(player.stats);
  const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
  return Math.round((avg / 20) * 200);
}

// Overall rating for display (1-99)
function calcOverall(player) {
  const vals = Object.values(player.stats);
  const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
  return Math.round((avg / 20) * 99);
}
