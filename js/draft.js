import { gameState, allStats, SLOT_POSITIONS, FLEX_POSITIONS, getRosterSlots, getCurrentRound, filterByPool } from './state.js';
import { esc, showScreen } from './utils.js';
import { showReveal } from './reveal.js';

// Pass screen
export function showPassScreen() {
  const nextPlayer = gameState.draftOrder[gameState.currentPickIndex];
  const round = getCurrentRound();
  document.getElementById('pass-round-info').textContent = `On the clock:`;
  document.getElementById('pass-name').textContent = nextPlayer;
  document.getElementById('pass-btn').textContent = `Start Round ${round}`;
  showScreen('pass');
}

// Draft screen
export function showDraft() {
  const currentPlayer = gameState.draftOrder[gameState.currentPickIndex];
  const teamObj = gameState.teams[currentPlayer];
  const round = getCurrentRound();
  const pickInRound = (gameState.currentPickIndex % gameState.players.length) + 1;

  const pickNum = String(pickInRound).padStart(2, '0');
  const poolLabel = gameState.pool === 'all' ? 'All NFL' : gameState.pool;
  const modeLabel = gameState.hardMode ? '  ·  HARD MODE' : '';
  document.getElementById('turn-label').textContent = `🏈 ${currentPlayer}'s Pick`;
  document.getElementById('round-label').textContent = `Pick ${round}.${pickNum}  ·  ${poolLabel}${modeLabel}`;

  renderRosterGrid(teamObj, null);

  gameState.selectedSlot = null;
  gameState.selectedPlayer = null;
  gameState.selectedYear = null;
  gameState.selectedRecord = null;
  document.getElementById('draft-controls').style.display = 'none';
  document.getElementById('search-player').value = '';
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('year-section').style.display = 'none';
  document.getElementById('preview-card').classList.remove('visible');
  document.getElementById('draft-btn').disabled = true;

  showScreen('draft');
}

function renderRosterGrid(teamObj, selectedSlot) {
  const slots = getRosterSlots();
  const grid = document.getElementById('roster-grid');
  grid.innerHTML = slots.map(slot => {
    const pick = teamObj[slot];
    const isFilled = !!pick;
    const isSelected = slot === selectedSlot;
    let cls = 'roster-slot';
    if (isFilled) cls += ' filled';
    else cls += ' open';
    if (isSelected) cls += ' selected';
    const onclick = isFilled ? '' : `data-slot="${slot}"`;
    return `<div class="${cls}" ${onclick}>
      <div class="slot-label">${slot}</div>
      <div class="slot-player">${pick ? esc(pick.name) + ' \'' + String(pick.year).slice(2) : 'Empty'}</div>
      ${pick ? `<div class="slot-pts">${pick.ppr_points} pts</div>` : ''}
    </div>`;
  }).join('');
}

export function tapSlot(slot) {
  const currentPlayer = gameState.draftOrder[gameState.currentPickIndex];
  const teamObj = gameState.teams[currentPlayer];

  gameState.selectedSlot = slot;
  gameState.selectedPlayer = null;
  gameState.selectedYear = null;
  gameState.selectedRecord = null;

  renderRosterGrid(teamObj, slot);

  const pos = SLOT_POSITIONS[slot] || 'FLEX';
  const posLabel = pos === 'FLEX' ? 'RB, WR, or TE' : pos;
  document.getElementById('slot-hint').textContent = `Filling ${slot} — search for a ${posLabel}`;
  document.getElementById('draft-controls').style.display = 'block';
  document.getElementById('search-player').value = '';
  document.getElementById('search-player').focus();
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('year-section').style.display = 'none';
  document.getElementById('preview-card').classList.remove('visible');
  document.getElementById('draft-btn').disabled = true;
}

// Player search
const searchInput = document.getElementById('search-player');
const searchResults = document.getElementById('search-results');
let searchTimeout;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(doSearch, 150);
});
searchInput.addEventListener('focus', () => { if (searchInput.value.length >= 2) doSearch(); });
document.addEventListener('click', e => {
  if (!e.target.closest('.search-container')) searchResults.classList.remove('open');
});

function getNeededPosition(slot) {
  return SLOT_POSITIONS[slot] || 'FLEX';
}

function doSearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (query.length < 2) { searchResults.classList.remove('open'); return; }

  const slot = gameState.selectedSlot;
  if (!slot) return;
  const neededPos = getNeededPosition(slot);

  const searchData = gameState.hardMode ? allStats : filterByPool(allStats);

  const matched = new Map();
  for (const rec of searchData) {
    if (!rec.name.toLowerCase().includes(query)) continue;
    if (gameState.takenPlayers.has(rec.name)) continue;
    if (neededPos !== 'FLEX' && rec.position !== neededPos) continue;
    if (neededPos === 'FLEX' && !FLEX_POSITIONS.includes(rec.position)) continue;
    if (!matched.has(rec.name)) {
      matched.set(rec.name, { name: rec.name, position: rec.position, teams: new Set() });
    }
    matched.get(rec.name).teams.add(rec.team);
  }

  const results = [...matched.values()].slice(0, 20);
  if (results.length === 0) {
    searchResults.innerHTML = '<div style="padding:14px; color:var(--text-dim);">No players found</div>';
  } else {
    searchResults.innerHTML = results.map(r =>
      `<div class="search-result" data-player="${esc(r.name)}">
        <span class="sr-name">${esc(r.name)}</span>
        <span class="sr-meta">${r.position}${gameState.hardMode ? '' : ' · ' + [...r.teams].slice(0, 3).join(', ')}</span>
      </div>`
    ).join('');
  }
  searchResults.classList.add('open');
}

export function selectPlayer(name) {
  gameState.selectedPlayer = name;
  gameState.selectedYear = null;
  gameState.selectedRecord = null;
  searchInput.value = name;
  searchResults.classList.remove('open');
  document.getElementById('preview-card').classList.remove('visible');
  document.getElementById('draft-btn').disabled = true;

  const yearSelect = document.getElementById('year-select');
  let options = '<option value="">-- Choose a year --</option>';
  for (let y = 2025; y >= 2000; y--) {
    const taken = gameState.takenCombos.includes(`${name}-${y}`);
    if (taken) {
      options += `<option value="${y}" disabled>${y} (taken)</option>`;
    } else {
      options += `<option value="${y}">${y}</option>`;
    }
  }
  yearSelect.innerHTML = options;
  document.getElementById('year-section').style.display = 'block';
}

// Year selection
document.getElementById('year-select').addEventListener('change', function() {
  const year = parseInt(this.value);
  if (!year) {
    gameState.selectedYear = null;
    gameState.selectedRecord = null;
    document.getElementById('preview-card').classList.remove('visible');
    document.getElementById('draft-btn').disabled = true;
    return;
  }

  gameState.selectedYear = year;

  const slot = gameState.selectedSlot;
  const pos = SLOT_POSITIONS[slot] || '??';

  const fullRec = allStats.find(r => r.name === gameState.selectedPlayer && r.year === year);
  const poolRec = filterByPool(allStats).find(r => r.name === gameState.selectedPlayer && r.year === year);

  let rec;
  if (!gameState.hardMode) {
    rec = poolRec || null;
  } else {
    if (fullRec && poolRec) {
      rec = fullRec;
    } else {
      rec = null;
    }
  }

  if (rec) {
    gameState.selectedRecord = rec;
  } else {
    let zeroReason = 'not_found';
    let actualTeam = '';
    let actualDiv = '';
    let actualConf = '';
    let actualPts = 0;
    let actualStats = {};
    let actualGames = 0;
    let actualLog = [];
    let actualPosition = pos === 'FLEX' ? '??' : pos;
    if (fullRec) {
      zeroReason = 'wrong_pool';
      actualTeam = fullRec.team;
      actualDiv = fullRec.division;
      actualConf = fullRec.conference;
      actualPts = fullRec.ppr_points;
      actualStats = fullRec.stats;
      actualGames = fullRec.games;
      actualLog = fullRec.log;
      actualPosition = fullRec.position;
    }
    gameState.selectedRecord = {
      name: gameState.selectedPlayer,
      year: year,
      team: actualTeam || '??',
      conference: actualConf,
      division: actualDiv,
      position: actualPosition,
      ppr_points: 0,
      stats: {},
      zeroReason: zeroReason,
      actualTeam: actualTeam,
      actualDiv: actualDiv,
      actualConf: actualConf,
      actualPts: actualPts,
      actualStats: actualStats,
      actualGames: actualGames,
      actualLog: actualLog,
    };
  }

  document.getElementById('pc-name').textContent = gameState.selectedPlayer;
  document.getElementById('pc-meta').textContent = `${year} season`;
  document.getElementById('preview-card').classList.add('visible');
  document.getElementById('draft-btn').disabled = false;
});

export function confirmDraft() {
  if (!gameState.selectedRecord || !gameState.selectedSlot) return;
  const currentPlayer = gameState.draftOrder[gameState.currentPickIndex];
  const rec = gameState.selectedRecord;
  const slot = gameState.selectedSlot;
  const round = getCurrentRound();

  const pickInRound = (gameState.currentPickIndex % gameState.players.length) + 1;
  rec.pickLabel = `${round}.${String(pickInRound).padStart(2, '0')}`;
  gameState.teams[currentPlayer][slot] = rec;
  gameState.takenCombos.push(`${rec.name}-${rec.year}`);
  gameState.takenPlayers.add(rec.name);

  if (!gameState.roundPicks[currentPlayer][round]) {
    gameState.roundPicks[currentPlayer][round] = [];
  }
  gameState.roundPicks[currentPlayer][round].push({ slot, ...rec });

  showReveal(currentPlayer, slot, rec, round);
}
