// Constants
export const ROSTER_SLOTS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE'];
export const SLOT_POSITIONS = { QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', TE: 'TE', FLEX: 'FLEX' };
export const FLEX_POSITIONS = ['RB', 'WR', 'TE'];

// Team colors for badges
export const TEAM_COLORS = {
  ARI:'#97233F', ATL:'#A71930', BAL:'#241773', BUF:'#00338D', CAR:'#0085CA',
  CHI:'#C83200', CIN:'#FB4F14', CLE:'#311D00', DAL:'#003594', DEN:'#FB4F14',
  DET:'#0076B6', GB:'#203731', HOU:'#03202F', IND:'#002C5F', JAX:'#006778',
  KC:'#E31837', LA:'#003594', LAC:'#0080C6', LV:'#000000', MIA:'#008E97',
  MIN:'#4F2683', NE:'#002244', NO:'#D3BC8D', NYG:'#0B2265', NYJ:'#125740',
  PHI:'#004C54', PIT:'#FFB612', SEA:'#002244', SF:'#AA0000', TB:'#D50A0A',
  TEN:'#0C2340', WAS:'#5A1414',
};

// All loaded stats data
export let allStats = [];

export function setAllStats(data) {
  allStats = data;
}

// Game state
export const gameState = {
  players: [],
  pool: 'all',
  flexEnabled: false,
  draftOrder: [],
  currentPickIndex: 0,
  teams: {},
  roundPicks: {},
  takenCombos: [],
  takenPlayers: new Set(),
  phase: 'setup',
  tiedPlayers: [],
  hardMode: false,
  selectedSlot: null,
  selectedPlayer: null,
  selectedYear: null,
  selectedRecord: null,
  lastCompletedRound: 0,
  draftOrderList: [],
  draftOrderRevealed: false,
};

// Roster helpers
export function getRosterSlots() {
  const slots = [...ROSTER_SLOTS];
  if (gameState.flexEnabled) slots.push('FLEX');
  return slots;
}

export function getRosterSize() {
  return getRosterSlots().length;
}

export function buildSnakeOrder(players, rounds) {
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const roundPlayers = r % 2 === 0 ? [...players] : [...players].reverse();
    roundPlayers.forEach(p => order.push(p));
  }
  return order;
}

export function getCurrentRound() {
  return Math.floor(gameState.currentPickIndex / gameState.players.length) + 1;
}

export function filterByPool(data) {
  const pool = gameState.pool;
  if (pool === 'all') return data;
  if (pool === 'AFC' || pool === 'NFC') return data.filter(r => r.conference === pool);
  return data.filter(r => r.division === pool);
}
