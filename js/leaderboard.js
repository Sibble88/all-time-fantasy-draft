import { gameState, getRosterSlots, getRosterSize, buildSnakeOrder } from './state.js';
import { esc, showScreen } from './utils.js';

export function showRoundLeaderboard(round, isFinalRound) {
  gameState.lastCompletedRound = round;

  document.getElementById('round-lb-header').textContent = `Round ${round} Complete`;

  const list = document.getElementById('round-lb-list');
  let html = '';

  // Per-round scores
  const roundScores = gameState.players.map(p => {
    const picks = gameState.roundPicks[p][round] || [];
    const roundPts = picks.reduce((s, pk) => s + pk.ppr_points, 0);
    return { name: p, roundPts, picks };
  }).sort((a, b) => b.roundPts - a.roundPts);

  html += `<h3 style="margin-bottom:8px;">Round ${round} Scores</h3>`;
  roundScores.forEach((s, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    const pickSummary = s.picks.map(pk => `${pk.name} '${String(pk.year).slice(2)}`).join(', ');
    html += `<div class="lb-entry${rankClass}">
      <div class="lb-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <div class="lb-rank">${rank}</div>
        <div class="lb-name">
          ${esc(s.name)}
          <div style="font-size:0.75rem; color:var(--text-dim); font-weight:400; margin-top:2px;">${esc(pickSummary)}</div>
        </div>
        <div class="lb-total">+${s.roundPts.toFixed(1)}</div>
      </div>
      <div class="lb-detail">
        ${s.picks.map(pk => `<div class="lb-pick">
          <span class="pick-pos">${pk.slot}</span>
          <span class="pick-name">${esc(pk.name)} '${String(pk.year).slice(2)}</span>
          <span class="pick-pts${pk.ppr_points === 0 ? ' zero' : ''}">${pk.ppr_points}</span>
        </div>`).join('')}
      </div>
    </div>`;
  });

  // Overall standings
  html += `<h3 style="margin:16px 0 8px;">Overall Standings</h3>`;
  const slots = getRosterSlots();
  const overallScores = gameState.players.map(p => {
    const teamObj = gameState.teams[p];
    const total = Object.values(teamObj).reduce((s, pk) => s + (pk ? pk.ppr_points : 0), 0);
    return { name: p, total, teamObj };
  }).sort((a, b) => b.total - a.total);

  overallScores.forEach((s, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    html += `<div class="lb-entry${rankClass}">
      <div class="lb-header">
        <div class="lb-rank">${rank}</div>
        <div class="lb-name">${esc(s.name)}</div>
        <div class="lb-total">${s.total.toFixed(1)}</div>
      </div>
      <div class="lb-detail open">
        ${slots.map(sl => {
          const pk = s.teamObj[sl];
          if (pk) {
            return `<div class="lb-pick">
              <span class="pick-pos">${sl}</span>
              <span class="pick-name">${pk.pickLabel ? `<span style="color:var(--text-dim);font-size:0.7rem;margin-right:4px;">${pk.pickLabel}</span>` : ''}${esc(pk.name)} '${String(pk.year).slice(2)} (${pk.team})</span>
              <span class="pick-pts${pk.ppr_points === 0 ? ' zero' : ''}">${pk.ppr_points}</span>
            </div>`;
          } else {
            return `<div class="lb-pick">
              <span class="pick-pos">${sl}</span>
              <span class="pick-name" style="color:var(--text-dim);">— empty —</span>
              <span class="pick-pts" style="color:var(--text-dim);">—</span>
            </div>`;
          }
        }).join('')}
      </div>
    </div>`;
  });

  list.innerHTML = html;

  const btn = document.getElementById('next-round-btn');
  if (isFinalRound) {
    btn.textContent = 'See Final Results';
    btn.onclick = () => showFinalLeaderboard();
  } else {
    btn.textContent = 'Next Round';
    btn.onclick = () => import('./draft.js').then(m => m.showPassScreen());
  }

  showScreen('round-lb');
}

function showFinalLeaderboard() {
  gameState.phase = 'leaderboard';
  const slots = getRosterSlots();
  const totalRounds = getRosterSize();

  const standings = gameState.players.map(p => {
    const teamObj = gameState.teams[p];
    const picks = slots.map(s => ({ slot: s, pick: teamObj[s] || null }));
    const total = picks.reduce((s, pk) => s + (pk.pick ? pk.pick.ppr_points : 0), 0);
    const roundTotals = {};
    for (let r = 1; r <= totalRounds; r++) {
      const rPicks = gameState.roundPicks[p][r] || [];
      roundTotals[r] = rPicks.reduce((s, pk) => s + pk.ppr_points, 0);
    }
    return { name: p, total, picks, roundTotals };
  }).sort((a, b) => b.total - a.total);

  document.getElementById('lb-trophy').textContent = '🏆';
  document.getElementById('lb-winner').textContent = standings[0].name;
  document.getElementById('lb-winner-pts').textContent = `${standings[0].total.toFixed(1)} PPR Points`;

  const topScore = standings[0].total;
  const tied = standings.filter(s => Math.abs(s.total - topScore) < 0.01);

  if (tied.length > 1) {
    document.getElementById('tie-banner').style.display = 'block';
    document.getElementById('tiebreaker-btn').style.display = 'block';
    document.getElementById('lb-winner').textContent = 'TIE!';
    document.getElementById('lb-winner-pts').textContent = `${tied.length} players tied at ${topScore.toFixed(1)} pts`;
    gameState.tiedPlayers = tied.map(t => t.name);
  } else {
    document.getElementById('tie-banner').style.display = 'none';
    document.getElementById('tiebreaker-btn').style.display = 'none';
    gameState.tiedPlayers = [];
  }

  const list = document.getElementById('leaderboard-list');
  list.innerHTML = standings.map((s, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    const roundLine = Object.entries(s.roundTotals)
      .map(([r, pts]) => `R${r}: ${pts.toFixed(1)}`)
      .join(' | ');
    return `<div class="lb-entry${rankClass}">
      <div class="lb-header">
        <div class="lb-rank">${rank}</div>
        <div class="lb-name">${esc(s.name)}</div>
        <div class="lb-total">${s.total.toFixed(1)}</div>
      </div>
      <div class="lb-detail open">
        <div style="font-size:0.8rem; color:var(--text-dim); margin-bottom:8px;">${roundLine}</div>
        ${s.picks.map(p => `<div class="lb-pick">
          <span class="pick-pos">${p.slot}</span>
          <span class="pick-name">${p.pick ? (p.pick.pickLabel ? `<span style="color:var(--text-dim);font-size:0.7rem;margin-right:4px;">${p.pick.pickLabel}</span>` : '') + esc(p.pick.name) + ' \'' + String(p.pick.year).slice(2) + ' (' + p.pick.team + ')' : '---'}</span>
          <span class="pick-pts${p.pick && p.pick.ppr_points === 0 ? ' zero' : ''}">${p.pick ? p.pick.ppr_points : '---'}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  showScreen('leaderboard');
}

export function startTiebreaker() {
  gameState.phase = 'tiebreaker';
  gameState.draftOrder = buildSnakeOrder(gameState.tiedPlayers, 1);
  gameState.currentPickIndex = 0;
  import('./draft.js').then(m => m.showPassScreen());
}
