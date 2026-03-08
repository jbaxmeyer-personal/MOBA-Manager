// js/game/simulation.js — Match simulation engine
// Pro LoL stat references:
//   Total kills/game: ~18-25 (winner ~12-15, loser ~6-10)
//   Winner towers: 7-11, Loser towers: 0-4
//   Dragons: winner 2-4, loser 0-2. Baron: 0-2 (usually 1)
//   Game length: 25-42 min (avg ~33 min)

// ─── Utilities ────────────────────────────────────────────────────────────────

function rand(min, max)   { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
function chance(pct)       { return Math.random() * 100 < pct; }
function padTime(m, s)     { return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function playerAt(team, pos) {
  const p = team.find(p => p && p.position === pos);
  return p ? p.name : { top:'the top laner', jungle:'the jungler', mid:'the mid laner', adc:'the ADC', support:'the support' }[pos] || 'a player';
}
function randPlayer(team) {
  const valid = team.filter(Boolean);
  return valid.length ? valid[randInt(0, valid.length-1)].name : 'a player';
}

// ─── Team Rating Calculation ──────────────────────────────────────────────────

const FILLER = { mechanics:42, laning:42, gameSense:42, teamfighting:42, communication:42, clutch:42, consistency:42, draftIQ:42 };

function getStats(player) {
  return player ? getEffectiveStats(player) : { ...FILLER };
}

function avgStat(team, stat) {
  const vals = team.map(p => getStats(p)[stat]);
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

function calcTeamRatings(team) {
  // Apply trait and region bonuses to each player's stats
  const traits  = calcTraitSynergies(team);
  const region  = calcRegionSynergy(team);

  const boosted = team.map(p => {
    const base = getStats(p);
    return applyBonuses(base, traits.bonuses, region.bonusPct);
  });

  const avg = stat => boosted.reduce((a, s) => a + s[stat], 0) / boosted.length;

  const jStats = boosted[CONFIG.POSITIONS.indexOf('jungle')] || FILLER;
  const adcStats= boosted[CONFIG.POSITIONS.indexOf('adc')]   || FILLER;

  return {
    earlyRating:   avg('laning')        * 0.45 + avg('mechanics')    * 0.35 + avg('gameSense')    * 0.20,
    jungleRating:  jStats.gameSense     * 0.40 + jStats.mechanics     * 0.40 + jStats.laning       * 0.20,
    tfRating:      avg('teamfighting')  * 0.45 + avg('mechanics')     * 0.30 + avg('communication')* 0.25,
    lateRating:    avg('gameSense')     * 0.40 + avg('clutch')        * 0.35 + avg('teamfighting') * 0.25,
    draftRating:   avg('draftIQ')       * 0.70 + avg('gameSense')     * 0.30,
    adcRating:     adcStats.mechanics   * 0.50 + adcStats.teamfighting* 0.30 + adcStats.consistency* 0.20,
    consistency:   avg('consistency'),
    clutchRating:  avg('clutch'),
  };
}

// Resolve a single event: returns true if blue wins the event
function blueWinsEvent(blueScore, redScore, bConsistency, rConsistency) {
  const diff = (blueScore - redScore);
  // Scale: a 20-point rating difference → ±10% chance
  const raw  = clamp(50 + diff * 0.5, 15, 85);
  // Consistency reduces variance (tightens the range toward 50)
  const avgCons = (bConsistency + rConsistency) / 2 / 100;
  const adjusted = 50 + (raw - 50) * (1.2 - avgCons * 0.4);
  return chance(clamp(adjusted, 12, 88));
}

// ─── Champion Draft ───────────────────────────────────────────────────────────

function draftChampions(blueTeam, redTeam) {
  const picks = { blue: [], red: [] };

  [blueTeam, redTeam].forEach((team, ti) => {
    const side = ti === 0 ? 'blue' : 'red';
    team.forEach(player => {
      if (!player) { picks[side].push(null); return; }
      const stats = getEffectiveStats(player);
      const pool  = player.champions || [];
      if (!pool.length) { picks[side].push({ player: player.name, champion: '?', position: player.position }); return; }

      // High draftIQ = picks index 0 (best champ for situation) more reliably
      const draftRoll = Math.random() * 100;
      const idx = draftRoll < stats.draftIQ ? 0 : randInt(0, pool.length - 1);
      const champion = pool[idx];
      player.champion = champion;
      picks[side].push({ player: player.name, champion, position: player.position });
    });
  });

  const blueComp = getCompType(blueTeam.map((p,i) => p ? {...p, champion: picks.blue[i]?.champion} : null));
  const redComp  = getCompType(redTeam.map((p,i)  => p ? {...p, champion: picks.red[i]?.champion}  : null));

  return { blue: picks.blue, red: picks.red, blueComp, redComp };
}

// ─── Laning Phase (0–14 min) ──────────────────────────────────────────────────

function simulateLaning(blue, red, bR, rR, events) {
  let adv = 50;

  // First Blood (3–7 min)
  const fbBlue = blueWinsEvent(bR.earlyRating, rR.earlyRating, bR.consistency, rR.consistency);
  const fbMin  = randInt(3, 7), fbSec = randInt(0, 59);
  const fbKiller = fbBlue ? randPlayer(blue) : randPlayer(red);
  const fbVictim = fbBlue ? playerAt(red, 'mid')  : playerAt(blue, 'mid');
  adv = clamp(adv + (fbBlue ? 5 : -5), 5, 95);
  events.push({ time: padTime(fbMin, fbSec), text: `⚔️ FIRST BLOOD! ${fbKiller} eliminates ${fbVictim}!`, type: 'kill', phase: 'laning' });

  // CS/laning advantage commentary (5–9 min)
  const laningBlue = blueWinsEvent(bR.earlyRating, rR.earlyRating, bR.consistency, rR.consistency);
  const csDiff = randInt(8, 22);
  const csLaner = laningBlue ? playerAt(blue, 'mid') : playerAt(red, 'mid');
  const csDir   = laningBlue ? 'a' : 'an';
  adv = clamp(adv + (laningBlue ? 3 : -3), 5, 95);
  events.push({ time: padTime(randInt(5,9), randInt(0,59)), text: `📊 ${csLaner} builds ${csDir} +${csDiff} CS lead — the laning phase is going their way.`, type: 'commentary', phase: 'laning' });

  // Gank event (6–11 min)
  const gankBlue = blueWinsEvent(bR.jungleRating, rR.jungleRating, bR.consistency, rR.consistency);
  const gankLane = ['top', 'mid', 'bot'][randInt(0,2)];
  const gankPos  = gankLane === 'bot' ? 'adc' : gankLane;
  const jgName   = gankBlue ? playerAt(blue, 'jungle') : playerAt(red, 'jungle');
  const gankVictim = gankBlue ? playerAt(red, gankPos) : playerAt(blue, gankPos);
  if (chance(65)) {
    adv = clamp(adv + (gankBlue ? 4 : -4), 5, 95);
    events.push({ time: padTime(randInt(6,11), randInt(0,59)), text: `🗺️ ${jgName} ganks ${gankLane} — ${gankVictim} is caught out of position and goes down!`, type: 'kill', phase: 'laning' });
  } else {
    events.push({ time: padTime(randInt(6,11), randInt(0,59)), text: `🗺️ ${jgName} rotates to ${gankLane} but the enemy wards it and ${gankVictim} flashes away!`, type: 'commentary', phase: 'laning' });
  }

  // First Tower (10–14 min)
  const towerBlue = blueWinsEvent(bR.earlyRating * 0.7 + bR.jungleRating * 0.3,
                                   rR.earlyRating * 0.7 + rR.jungleRating * 0.3,
                                   bR.consistency, rR.consistency);
  const towerLane = ['top', 'mid', 'bot'][randInt(0,2)];
  adv = clamp(adv + (towerBlue ? 6 : -6), 5, 95);
  events.push({ time: padTime(randInt(10,14), randInt(0,59)),
    text: `🏰 ${towerBlue ? 'Blue' : 'Red'} side takes the First Tower in ${towerLane}! Gold lead widening.`,
    type: 'objective', phase: 'laning' });

  return adv;
}

// ─── Mid Game (14–26 min) ─────────────────────────────────────────────────────

function simulateMidGame(blue, red, bR, rR, advIn, events) {
  let adv = advIn;
  const drakes = shuffleArray([...CONFIG.DRAGON_TYPES]);
  let dIdx = 0;

  const objectiveRating = (r) => r.tfRating * 0.55 + r.jungleRating * 0.45;

  // Dragon 1 (14–17 min)
  const d1Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
  const d1Type = drakes[dIdx++];
  adv = clamp(adv + (d1Blue ? 4 : -4), 5, 95);
  if (chance(45)) {
    const fightWinner = d1Blue ? randPlayer(blue) : randPlayer(red);
    events.push({ time: padTime(randInt(14,17), randInt(0,59)), text: `🐉 ${d1Type} Dragon: ${d1Blue ? 'Blue' : 'Red'} side wins a skirmish — ${fightWinner} gets a kill in the river!`, type: 'objective', phase: 'midgame' });
  } else {
    events.push({ time: padTime(randInt(14,17), randInt(0,59)), text: `🐉 ${playerAt(d1Blue ? blue : red, 'jungle')} secures the ${d1Type} Dragon. ${d1Blue ? 'Blue' : 'Red'} side takes early drake control.`, type: 'objective', phase: 'midgame' });
  }

  // Rift Herald (15–19 min)
  const rhBlue = blueWinsEvent(bR.jungleRating, rR.jungleRating, bR.consistency, rR.consistency);
  adv = clamp(adv + (rhBlue ? 3 : -3), 5, 95);
  const rhLane = ['top', 'mid'][randInt(0,1)];
  events.push({ time: padTime(randInt(15,19), randInt(0,59)), text: `🔮 Rift Herald seized by ${rhBlue ? 'blue' : 'red'} side and smashed into the ${rhLane} lane — tower falls!`, type: 'objective', phase: 'midgame' });

  // Mid-game teamfight (18–23 min)
  const tf1Blue   = blueWinsEvent(bR.tfRating, rR.tfRating, bR.consistency, rR.consistency);
  const tf1Kills  = randInt(2, 5);
  const tf1Deaths = randInt(0, Math.max(0, tf1Kills - 1));
  adv = clamp(adv + (tf1Blue ? tf1Kills * 1.4 : -tf1Kills * 1.4), 5, 95);
  events.push({ time: padTime(randInt(18,23), randInt(0,59)),
    text: `💥 Teamfight breaks out near Dragon pit — ${tf1Blue ? 'Blue' : 'Red'} side wins ${tf1Kills}-for-${tf1Deaths}! ${randPlayer(tf1Blue ? blue : red)} was massive.`,
    type: 'teamfight', phase: 'midgame' });

  // Dragon 2 (21–25 min)
  const d2Blue = blueWinsEvent(objectiveRating(bR) + (adv > 55 ? 5 : 0),
                                objectiveRating(rR) + (adv < 45 ? 5 : 0),
                                bR.consistency, rR.consistency);
  const d2Type = drakes[dIdx++] || drakes[0];
  adv = clamp(adv + (d2Blue ? 5 : -5), 5, 95);
  events.push({ time: padTime(randInt(21,25), randInt(0,59)), text: `🐉 ${d2Type} Dragon secured by ${d2Blue ? 'blue' : 'red'} side after a quick rotate.`, type: 'objective', phase: 'midgame' });

  return { adv, drakes, dIdx };
}

// ─── Late Game (26+ min) ──────────────────────────────────────────────────────

function simulateLateGame(blue, red, bR, rR, advIn, events, drakes, dIdx) {
  let adv = advIn;

  const objectiveRating = (r) => r.lateRating * 0.55 + r.tfRating * 0.45;

  // Dragon 3 / Soul point (26–30 min)
  const d3Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
  const d3Type = drakes[dIdx] || drakes[0];
  adv = clamp(adv + (d3Blue ? 5 : -5), 5, 95);
  const soulText = d3Blue ? (adv > 65 ? ' 🔥 **DRAGON SOUL** — Blue side is unstoppable!' : '') :
                            (adv < 35 ? ' 🔥 **DRAGON SOUL** — Red side is unstoppable!' : '');
  events.push({ time: padTime(randInt(26,30), randInt(0,59)), text: `🐉 ${d3Type} Dragon to ${d3Blue ? 'blue' : 'red'} side.${soulText}`, type: 'objective', phase: 'lategame' });

  // Baron Nashor (28–33 min)
  const baronMin = randInt(28, 33);
  const baronBlue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);

  if (chance(18)) {
    // STEAL
    const stealerSide = !baronBlue; // opposite team steals
    const stealer = playerAt(stealerSide ? blue : red, 'jungle');
    adv = clamp(adv + (stealerSide ? 12 : -12), 5, 95);
    events.push({ time: padTime(baronMin, randInt(0,59)), text: `🟣 BARON STEAL!! ${stealer} smites it away from ${!stealerSide ? 'blue' : 'red'} side at the last second! THE CROWD GOES WILD!`, type: 'objective', phase: 'lategame' });
  } else {
    adv = clamp(adv + (baronBlue ? 10 : -10), 5, 95);
    events.push({ time: padTime(baronMin, randInt(0,59)),
      text: `🟣 BARON NASHOR secured by ${baronBlue ? 'blue' : 'red'} side! ${playerAt(baronBlue ? blue : red, 'jungle')} lands the Smite — buff applied!`,
      type: 'objective', phase: 'lategame' });
  }

  // Baron push teamfight (31–36 min)
  const pushBlue  = blueWinsEvent(bR.tfRating + (adv > 50 ? 8 : 0), rR.tfRating + (adv < 50 ? 8 : 0), bR.consistency, rR.consistency);
  const pushKills = randInt(2, 5);
  const pushLoss  = randInt(0, Math.max(0, pushKills - 2));
  adv = clamp(adv + (pushBlue ? pushKills * 1.6 : -pushKills * 1.6), 5, 95);
  events.push({ time: padTime(randInt(31,36), randInt(0,59)),
    text: `💥 Baron buff pressure — ${pushBlue ? 'Blue' : 'Red'} side wins a ${pushKills}-for-${pushLoss} fight and destroys an inhibitor!`,
    type: 'teamfight', phase: 'lategame' });

  // Final teamfight / Nexus push (36–43 min)
  const finalBlue = blueWinsEvent(bR.lateRating, rR.lateRating, bR.consistency, rR.consistency);

  // Clutch comeback check
  const comebackSide = !finalBlue; // losing side has clutch chance
  const clutchRating = comebackSide ? bR.clutchRating : rR.clutchRating;
  const comebackHappens = chance(clamp((clutchRating - 60) * 0.7, 4, 24));

  let blueWins;
  if (comebackHappens) {
    blueWins = comebackSide; // losing side pulls it back!
    const hero = randPlayer(blueWins ? blue : red);
    adv = clamp(adv + (blueWins ? 15 : -15), 5, 95);
    events.push({ time: padTime(randInt(36,40), randInt(0,59)),
      text: `🔥 CLUTCH COMEBACK! ${hero} makes an INSANE play — ${blueWins ? 'Blue' : 'Red'} side turns the fight around! ACE!`,
      type: 'teamfight', phase: 'lategame' });
  } else {
    blueWins = finalBlue;
    const finalKills = randInt(2, 5);
    const finalLoss  = randInt(0, Math.max(0, finalKills - 1));
    adv = clamp(adv + (blueWins ? finalKills * 1.5 : -finalKills * 1.5), 5, 95);
    events.push({ time: padTime(randInt(36,43), randInt(0,59)),
      text: `💥 Final teamfight — ${blueWins ? 'Blue' : 'Red'} side wins ${finalKills}-for-${finalLoss}! The base is wide open!`,
      type: 'teamfight', phase: 'lategame' });
  }

  // Nexus
  const nexusMin = randInt(38, 46);
  events.push({ time: padTime(nexusMin, randInt(0,59)),
    text: `🏆 NEXUS DESTROYED! ${blueWins ? 'Blue' : 'Red'} side wins the match!`,
    type: 'result', phase: 'lategame' });

  return { adv, blueWins };
}

// ─── Derive Realistic Final Stats ────────────────────────────────────────────

function deriveMatchStats(blueWins, advantage) {
  // advantage from blue's perspective (50 = even, 0-100)
  const winnerAdv  = blueWins ? advantage : 100 - advantage;
  const dominance  = clamp((winnerAdv - 50) / 50, 0, 1); // 0 = coin flip, 1 = stomp

  // Total kills: pro average 20-25; close games have more action
  const totalKills = randInt(16, 28) - Math.round(dominance * 4);

  // Winner gets 55-78% of kills based on dominance
  const winnerShare  = 0.54 + dominance * 0.24;
  const winnerKills  = Math.round(totalKills * winnerShare);
  const loserKills   = totalKills - winnerKills;

  // Towers: winner 7-11, loser 0-4
  const winnerTowers = clamp(randInt(6, 9) + Math.round(dominance * 2), 5, 11);
  const loserTowers  = clamp(randInt(0, 3) - Math.round(dominance * 1.5), 0, 4);

  // Dragons: winner 2-4, loser 0-2
  const winnerDragons = clamp(randInt(1, 3) + Math.round(dominance * 1.5), 1, 4);
  const loserDragons  = clamp(randInt(0, 2) - Math.round(dominance * 0.8), 0, 2);

  // Baron: most games have 1. Short stomps may have 0. Long games may have 2.
  const isEarlyEnd   = dominance > 0.75;
  const isLong       = dominance < 0.15;
  const totalBarons  = isEarlyEnd
    ? (chance(35) ? 0 : 1)
    : isLong ? (chance(30) ? 2 : 1)
    : 1;
  const winnerBarons = totalBarons === 0 ? 0 : Math.ceil(totalBarons * 0.75);
  const loserBarons  = totalBarons - winnerBarons;

  return blueWins
    ? { blue: { kills: winnerKills, towers: winnerTowers, dragons: winnerDragons, barons: winnerBarons },
        red:  { kills: loserKills,  towers: loserTowers,  dragons: loserDragons,  barons: loserBarons  } }
    : { blue: { kills: loserKills,  towers: loserTowers,  dragons: loserDragons,  barons: loserBarons  },
        red:  { kills: winnerKills, towers: winnerTowers, dragons: winnerDragons, barons: winnerBarons } };
}

// ─── Main Match Simulator ─────────────────────────────────────────────────────

function simulateMatch(blueTeam, redTeam, blueTeamName, redTeamName) {
  // Pad to 5 positions (matching CONFIG.POSITIONS order for rating indexing)
  const blue = padToPositions(blueTeam);
  const red  = padToPositions(redTeam);

  // Draft
  const draft = draftChampions(blue, red);

  // Team ratings (include trait/region bonuses)
  const bR = calcTeamRatings(blue);
  const rR = calcTeamRatings(red);

  // Events storage
  const laningEvents = [], midEvents = [], lateEvents = [];

  // Draft advantage shifts starting advantage
  let advantage = 50;
  const draftAdv = (bR.draftRating - rR.draftRating) * 0.15;
  advantage = clamp(50 + draftAdv, 40, 60);

  // Simulate phases
  advantage = simulateLaning(blue, red, bR, rR, laningEvents);

  // Early stomp check (very dominant early game can end it)
  if (advantage >= 85 || advantage <= 15) {
    const earlyWin = advantage >= 50;
    const earlyMin = randInt(18, 22);
    lateEvents.push({ time: padTime(earlyMin, 0), text: `🏆 EARLY SURRENDER! ${earlyWin ? blueTeamName : redTeamName} completely dominates — GG WP!`, type: 'result', phase: 'lategame' });

    const stats = deriveMatchStats(earlyWin, advantage);
    return { winner: earlyWin ? 'blue' : 'red', events: { laning: laningEvents, midgame: [], lategame: lateEvents }, stats, draft, advantage, ratings: { blue: bR, red: rR } };
  }

  const midResult  = simulateMidGame(blue, red, bR, rR, advantage, midEvents);
  advantage = midResult.adv;

  const lateResult = simulateLateGame(blue, red, bR, rR, advantage, lateEvents, midResult.drakes, midResult.dIdx);
  advantage = lateResult.adv;
  const blueWins   = lateResult.blueWins;

  const stats = deriveMatchStats(blueWins, advantage);

  return {
    winner:  blueWins ? 'blue' : 'red',
    events:  { laning: laningEvents, midgame: midEvents, lategame: lateEvents },
    stats,
    draft,
    advantage,
    ratings: { blue: bR, red: rR },
  };
}

// Pad roster to exactly 5 slots in POSITIONS order
function padToPositions(team) {
  return CONFIG.POSITIONS.map(pos => team.find(p => p && p.position === pos) || null);
}

// ─── Quick AI vs AI Match ─────────────────────────────────────────────────────

function quickSimulate(blueTeam, redTeam) {
  // Use actual ratings if teams provided, else use strength fallback
  if (blueTeam && redTeam && Array.isArray(blueTeam)) {
    const bP = padToPositions(blueTeam.filter(Boolean));
    const rP = padToPositions(redTeam.filter(Boolean));
    const bR = calcTeamRatings(bP);
    const rR = calcTeamRatings(rP);
    const overall = (r) => (r.earlyRating + r.tfRating + r.lateRating) / 3;
    const diff = (overall(bR) - overall(rR)) * 0.5;
    return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
  }
  // Fallback: numeric strength
  const diff = ((blueTeam || 0.5) - (redTeam || 0.5)) * 40;
  return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
}
