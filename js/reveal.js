import { gameState, allStats } from './state.js';
import { showScreen } from './utils.js';

export function showReveal(drafter, slot, rec, round) {
  const isZero = rec.ppr_points === 0;

  document.getElementById('reveal-slot').textContent = `${drafter} — ${slot}`;
  document.getElementById('reveal-name').textContent = rec.name;

  const ptsEl = document.getElementById('reveal-points');
  ptsEl.textContent = rec.ppr_points;
  ptsEl.className = isZero ? 'reveal-zero' : '';

  const statLabels = {
    pass_yds: 'Pass Yds', pass_td: 'Pass TD', interceptions: 'INT',
    rush_yds: 'Rush Yds', rush_td: 'Rush TD',
    receptions: 'Rec', rec_yds: 'Rec Yds', rec_td: 'Rec TD'
  };

  const metaEl = document.getElementById('reveal-meta');
  const gamesEl = document.getElementById('reveal-games');
  const statsDiv = document.getElementById('reveal-stats');
  const logDiv = document.getElementById('reveal-log');

  if (!isZero) {
    document.getElementById('reveal-emoji').textContent = '🎯';
    metaEl.textContent = `${rec.position} · ${rec.team} · ${rec.year}`;
    gamesEl.textContent = rec.games ? `${rec.games} games played` : '';
    statsDiv.innerHTML = Object.entries(rec.stats || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<div class="reveal-stat">${statLabels[k] || k}: <span>${v}</span></div>`)
      .join('');
  } else {
    document.getElementById('reveal-emoji').textContent = '😬';
    gamesEl.textContent = '';

    if (rec.zeroReason === 'wrong_pool') {
      const poolLabel = gameState.pool;
      metaEl.innerHTML = `<span style="color:var(--danger);">Played for ${rec.actualTeam} (${rec.actualDiv}) in ${rec.year}</span><br>Not in your pool: ${poolLabel}`;
      gamesEl.textContent = rec.actualGames ? `${rec.actualGames} games played` : '';
      statsDiv.innerHTML = `<div class="reveal-stat" style="color:var(--danger);">Wrong pool — 0 points!</div>
        <div class="reveal-stat" style="color:var(--accent);">Would have been <span style="color:var(--accent);font-weight:800;">${rec.actualPts}</span> pts</div>`;
      const actualStatEntries = Object.entries(rec.actualStats || {}).filter(([, v]) => v > 0);
      if (actualStatEntries.length > 0) {
        statsDiv.innerHTML += actualStatEntries
          .map(([k, v]) => `<div class="reveal-stat">${statLabels[k] || k}: <span>${v}</span></div>`)
          .join('');
      }
    } else {
      const playerRecords = allStats.filter(r => r.name === rec.name);
      if (playerRecords.length > 0) {
        const years = playerRecords.map(r => r.year).sort();
        const teams = [...new Set(playerRecords.map(r => `${r.team} (${r.year})`))];
        const yearRange = `${years[0]}–${years[years.length - 1]}`;
        metaEl.innerHTML = `<span style="color:var(--danger);">${rec.name} did not play in ${rec.year}</span><br>Career: ${yearRange}`;
        statsDiv.innerHTML = `<div class="reveal-stat">Played for: ${teams.slice(0, 4).join(', ')}${teams.length > 4 ? '...' : ''}</div>`;
      } else {
        metaEl.innerHTML = `<span style="color:var(--danger);">${rec.name} — no stats found for ${rec.year}</span>`;
        statsDiv.innerHTML = '';
      }
    }
  }

  // Game log
  const logData = rec.log || rec.actualLog || [];
  if (logData.length > 0) {
    logDiv.innerHTML = `<table class="game-log-table">
      <thead><tr><th class="wk-col">Wk</th><th class="line-col">Stats</th><th class="pts-col">Pts</th></tr></thead>
      <tbody>${logData.map(g => `<tr>
        <td class="wk-col">${g.wk}</td>
        <td class="line-col">${g.line || '—'}</td>
        <td class="pts-col">${g.pts}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } else {
    logDiv.innerHTML = '';
  }

  // Continue button
  const btn = document.getElementById('reveal-continue-btn');
  gameState.currentPickIndex++;

  const prevRound = round;
  const nextRound = gameState.currentPickIndex < gameState.draftOrder.length
    ? Math.floor(gameState.currentPickIndex / gameState.players.length) + 1
    : null;

  if (gameState.currentPickIndex >= gameState.draftOrder.length) {
    btn.textContent = 'See Round Results';
    btn.onclick = () => import('./leaderboard.js').then(m => m.showRoundLeaderboard(prevRound, true));
  } else if (nextRound !== prevRound) {
    btn.textContent = 'See Round Results';
    btn.onclick = () => import('./leaderboard.js').then(m => m.showRoundLeaderboard(prevRound, false));
  } else {
    const nextPlayer = gameState.draftOrder[gameState.currentPickIndex];
    btn.textContent = `Pass to ${nextPlayer}`;
    btn.onclick = () => import('./draft.js').then(m => m.showDraft());
  }

  showScreen('reveal');
}
