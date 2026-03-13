// js/data/config.js — Game constants

const CONFIG = {
  ROSTER_MAX: 5,      // Always 5 active slots (unlocked from start)
  BENCH_MAX: 9,
  SHOP_SIZE: 5,
  REROLL_COST: 2,
  XP_COST: 4,
  XP_PER_BUY: 4,
  XP_PER_ROUND: 2,

  // XP levels only affect shop quality, not roster size
  // Cumulative XP to reach each level (index = level) — max level 9
  LEVEL_XP: [0, 0, 2, 6, 12, 20, 32, 48, 68, 92],

  // Cost to buy / gold returned on sell, indexed by tier
  TIER_COST: [0, 1, 2, 3, 4, 5],
  TIER_SELL: [0, 0, 1, 2, 3, 4],

  // Copies of each player in the shared pool, indexed by tier
  TIER_POOL_SIZE: [0, 25, 20, 15, 10, 9],

  STARTING_GOLD: 10,
  BASE_GOLD: 5,
  MAX_INTEREST: 5,

  // Bonus gold at win/lose streak counts
  WIN_STREAK_GOLD:  { 0:0, 1:0, 2:1, 3:1, 4:2, 5:3 },
  LOSE_STREAK_GOLD: { 0:0, 1:0, 2:1, 3:2, 4:3, 5:3 },

  ROUND_ROBIN_ROUNDS: 14,  // Each team plays every other team TWICE
  TOTAL_TEAMS: 8,
  BRACKET_SIZE: 4,

  // Shop tier odds by player level [T1%, T2%, T3%, T4%, T5%] — TFT-style scaling
  TIER_ODDS: {
    1: [75, 25,  0,  0,  0],  // Only Iron/Silver
    2: [50, 35, 15,  0,  0],  // Mostly Iron/Silver, some Gold
    3: [26, 38, 29, 7, 0],  // Gold focus, barely any Platinum, no Diamond
    4: [ 8, 24, 40, 24,  4],  // Gold/Platinum mix
    5: [ 2, 14, 36, 34, 14],  // Platinum focus, Diamond available
    6: [ 0,  6, 24, 42, 28],  // Platinum/Diamond
    7: [ 0,  2, 15, 40, 43],  // Diamond focus
    8: [ 0,  1,  9, 34, 56],  // Mostly Diamond
    9: [ 0,  0,  5, 25, 70],  // Almost all Diamond
  },

  // Star upgrade multipliers (applied to base stats)
  STAR_MULTIPLIER: { 1: 1.0, 2: 1.22, 3: 1.55 },
  COPIES_TO_UPGRADE: 3,

  POSITIONS: ['top', 'jungle', 'mid', 'adc', 'support'],
  DRAGON_TYPES: ['Infernal', 'Mountain', 'Ocean', 'Cloud', 'Hextech', 'Chemtech'],

  // ─── REGION SYNERGIES ─────────────────────────────────────────
  // Active when 2+ players from same region on active roster
  REGION_SYNERGY: {
    2: { bonusPct: 4,  desc: '+4% all stats' },
    3: { bonusPct: 8,  desc: '+8% all stats' },
    4: { bonusPct: 12, desc: '+12% all stats' },
    5: { bonusPct: 15, desc: '+15% all stats' },
  },
  REGION_COLORS: {
    LCK: '#4fc3f7', LPL: '#ff7043', LEC: '#ab47bc',
    LCS: '#26a69a', LLA: '#ffa726', VCS: '#d4e157', PCS: '#66bb6a',
  },

  // ─── AI STRATEGIES ────────────────────────────────────────────
  AI_STRATEGIES: ['economy', 'synergy', 'aggressor', 'reroller', 'leveler'],
};
