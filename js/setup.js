import { gameState, getRosterSize, buildSnakeOrder } from './state.js';
import { esc, showScreen } from './utils.js';

// Setup screen logic
const playerInput = document.getElementById('player-name-input');
playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

export function addPlayer() {
  const name = playerInput.value.trim();
  if (!name || gameState.players.length >= 14) return;
  if (gameState.players.includes(name)) return;
  gameState.players.push(name);
  playerInput.value = '';
  renderPlayerTags();
  updateStartBtn();
}

export function removePlayer(name) {
  gameState.players = gameState.players.filter(p => p !== name);
  renderPlayerTags();
  updateStartBtn();
}

function renderPlayerTags() {
  const c = document.getElementById('player-tags');
  c.innerHTML = gameState.players.map(p =>
    `<div class="player-tag"><span>${esc(p)}</span><span class="remove" data-name="${esc(p)}">&times;</span></div>`
  ).join('');
}

function updateStartBtn() {
  document.getElementById('start-btn').disabled = gameState.players.length < 2;
}

// Draft order screen
export function startDraft() {
  if (gameState.players.length < 2) return;
  gameState.pool = document.getElementById('pool-select').value;
  gameState.flexEnabled = document.getElementById('flex-toggle').checked;
  gameState.hardMode = document.getElementById('hard-toggle').checked;
  const customOrder = document.getElementById('custom-order-toggle').checked;

  if (customOrder) {
    gameState.draftOrderList = [...gameState.players];
    gameState.draftOrderRevealed = false;
    document.getElementById('draft-order-randomize-btn').style.display = '';
    renderDraftOrder();
    showScreen('draft-order');
  } else {
    gameState.draftOrderList = [...gameState.players];
    for (let i = gameState.draftOrderList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameState.draftOrderList[i], gameState.draftOrderList[j]] = [gameState.draftOrderList[j], gameState.draftOrderList[i]];
    }
    gameState.draftOrderRevealed = true;
    document.getElementById('draft-order-randomize-btn').style.display = 'none';
    renderDraftOrder();
    showScreen('draft-order');
  }
}

export function renderDraftOrder() {
  const list = document.getElementById('draft-order-list');
  const revealed = gameState.draftOrderRevealed;
  document.getElementById('draft-order-subtitle').textContent = revealed
    ? 'Randomized draft order' : 'Drag to set the pick order';
  list.innerHTML = gameState.draftOrderList.map((name, i) => `
    <div class="draft-order-item" data-index="${i}" data-name="${esc(name)}">
      <div class="order-num">${i + 1}</div>
      <div class="order-name">${esc(name)}</div>
      ${!revealed ? `<div class="order-handle">&#8801;</div>` : ''}
    </div>
  `).join('');

  if (!revealed) initDragAndDrop(list);
}

function initDragAndDrop(list) {
  if (list._dragInit) return;
  list._dragInit = true;

  let dragging = null;

  list.addEventListener('pointerdown', e => {
    const item = e.target.closest('.draft-order-item');
    if (!item) return;
    dragging = item;
    item.setPointerCapture(e.pointerId);
    item.classList.add('dragging');
  });

  list.addEventListener('pointermove', e => {
    if (!dragging) return;
    e.preventDefault();
    const siblings = [...list.querySelectorAll('.draft-order-item:not(.dragging)')];
    const after = getDragAfterElement(siblings, e.clientY);
    if (after) {
      list.insertBefore(dragging, after);
    } else {
      list.appendChild(dragging);
    }
  });

  list.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    const items = [...list.querySelectorAll('.draft-order-item')];
    gameState.draftOrderList = items.map(item => item.dataset.name);
    items.forEach((item, i) => {
      item.dataset.index = i;
      item.querySelector('.order-num').textContent = i + 1;
    });
    dragging = null;
  });

  list.addEventListener('pointercancel', () => {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    dragging = null;
    list._dragInit = false;
    renderDraftOrder();
  });
}

function getDragAfterElement(items, y) {
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function moveDraftOrder(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= gameState.draftOrderList.length) return;
  const list = gameState.draftOrderList;
  [list[index], list[newIndex]] = [list[newIndex], list[index]];
  renderDraftOrder();
}

export function randomizeDraftOrder() {
  const list = gameState.draftOrderList;
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  renderDraftOrder();
}

export function confirmDraftOrder() {
  gameState.players = [...gameState.draftOrderList];
  gameState.draftOrder = buildSnakeOrder(gameState.players, getRosterSize());
  gameState.currentPickIndex = 0;
  gameState.takenCombos = [];
  gameState.takenPlayers = new Set();
  gameState.teams = {};
  gameState.roundPicks = {};
  gameState.lastCompletedRound = 0;
  gameState.players.forEach(p => {
    gameState.teams[p] = {};
    gameState.roundPicks[p] = {};
  });
  gameState.phase = 'draft';
  // Dynamic import to avoid circular dependency
  import('./draft.js').then(m => m.showPassScreen());
}

export function resetGame() {
  gameState.players = [];
  gameState.pool = 'all';
  gameState.flexEnabled = false;
  gameState.draftOrder = [];
  gameState.currentPickIndex = 0;
  gameState.teams = {};
  gameState.roundPicks = {};
  gameState.takenCombos = [];
  gameState.takenPlayers = new Set();
  gameState.phase = 'setup';
  gameState.tiedPlayers = [];
  gameState.lastCompletedRound = 0;
  renderPlayerTags();
  updateStartBtn();
  document.getElementById('pool-select').value = 'all';
  document.getElementById('flex-toggle').checked = false;
  document.getElementById('hard-toggle').checked = false;
  document.getElementById('custom-order-toggle').checked = false;
  showScreen('setup');
}
