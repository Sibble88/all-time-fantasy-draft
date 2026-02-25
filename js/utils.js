import { TEAM_COLORS } from './state.js';

// HTML-escape a string
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Show a screen by name
export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

// Team color lookup
export function getTeamColor(team) {
  return TEAM_COLORS[team] || '#555';
}

// Player initials from full name
export function getInitials(name) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Generate avatar HTML with consistent color from name
export function avatarHtml(name, size) {
  const cls = size === 'lg' ? 'player-avatar-lg' : 'player-avatar-sm';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 45%, 40%)`;
  return `<span class="player-avatar ${cls}" style="background:${bg}">${getInitials(name)}</span>`;
}

// Generate team badge HTML
export function teamBadgeHtml(team, size) {
  const cls = size === 'lg' ? 'team-badge-lg' : (size === 'sm' ? 'team-badge-sm' : 'team-badge');
  const bg = getTeamColor(team);
  return `<span class="${cls}" style="background:${bg}">${team}</span>`;
}
