import { setAllStats } from './state.js';
import { showScreen } from './utils.js';
import { addPlayer, removePlayer, startDraft, renderDraftOrder, moveDraftOrder, randomizeDraftOrder, confirmDraftOrder, resetGame } from './setup.js';
import { showDraft, tapSlot, selectPlayer, confirmDraft } from './draft.js';
import { startTiebreaker } from './leaderboard.js';

// Load data
fetch('stats.json')
  .then(r => r.json())
  .then(data => { setAllStats(data); })
  .catch(() => { console.warn('Could not load stats.json'); });

// Event delegation — wire up all onclick handlers via data attributes and button IDs
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-slot]');
  if (target) {
    tapSlot(target.dataset.slot);
    return;
  }

  const playerResult = e.target.closest('[data-player]');
  if (playerResult) {
    selectPlayer(playerResult.dataset.player);
    return;
  }

  const moveBtn = e.target.closest('[data-move]');
  if (moveBtn) {
    moveDraftOrder(parseInt(moveBtn.dataset.move), parseInt(moveBtn.dataset.dir));
    return;
  }

  const removeBtn = e.target.closest('.player-tag .remove');
  if (removeBtn) {
    removePlayer(removeBtn.dataset.name);
    return;
  }
});

// Expose functions to inline onclick handlers in HTML
window.addPlayer = addPlayer;
window.startDraft = startDraft;
window.randomizeDraftOrder = randomizeDraftOrder;
window.confirmDraftOrder = confirmDraftOrder;
window.showDraft = showDraft;
window.confirmDraft = confirmDraft;
window.resetGame = resetGame;
window.startTiebreaker = startTiebreaker;
window.showScreen = showScreen;
