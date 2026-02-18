import { api } from '../services/api.js';
import { fmtHMM } from '../utils/time.js';

function todayKeyLocal(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function dateKeyFromIso(iso){
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export async function refreshReport(){
  const token = localStorage.getItem('token');
  const streakEl = document.getElementById('streak');
  const todayEl = document.getElementById('todayFocus');

  if (!token){
    streakEl.textContent = '—';
    todayEl.textContent = '—';
    return;
  }

  const summary = await api('/v1/analytics/summary?days=7');
  streakEl.textContent = String(summary.streak_days ?? '—');

  const sessions = await api('/v1/sessions');
  const tk = todayKeyLocal();

  let focusSeconds = 0;
  for (const s of (sessions || [])){
    if (s.kind !== 'work') continue;
    const iso = s.ended_at || s.started_at || '';
    if (dateKeyFromIso(iso) !== tk) continue;
    focusSeconds += Number(s.actual_seconds || 0);
  }

  todayEl.textContent = fmtHMM(focusSeconds);
}
