import { api } from '../services/api.js';
import { fmtMMSS, nowIsoUtcNoMs } from '../utils/time.js';
import { showToast } from './toast.js';
import { getUiSettings } from './settings.js';
import { getCompletedCycles, setCompletedCycles, currentCycleNo, shouldLongBreakAfterWork } from '../state/session_state.js';
import { renderTasks } from './tasks.js';
import { refreshReport } from './report.js';

let mode = 'work';
let duration = 1500;
let remaining = duration;
let running = false;
let timerHandle = null;

let activeSessionId = null;
let pauseStartedAt = null;

let completedWorkCount = 0;
let transitioning = false;

function applyDurationFromSettingsOrDefault(){
  const s = getUiSettings();
  const work = Number(s.work_seconds || 1500);
  const shortB = Number(s.short_break_seconds || 300);
  const longB = Number(s.long_break_seconds || 900);

  if (mode === 'work') duration = work;
  if (mode === 'short_break') duration = shortB;
  if (mode === 'long_break') duration = longB;
}

function setMode(newMode){
  mode = newMode;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  if (!running){
    applyDurationFromSettingsOrDefault();
    remaining = duration;
    document.getElementById('timeView').textContent = fmtMMSS(remaining);
  }
  document.getElementById('hintView').textContent = mode === 'work' ? 'Time to focus' : 'Time for a break';
}

function stopLocalTimer(){
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  running = false;
}

function startLocalTimer(){
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(tick, 1000);
  running = true;
}

function tick(){
  if (transitioning) return;
  remaining -= 1;
  document.getElementById('timeView').textContent = fmtMMSS(remaining);
  if (remaining <= 0){
    stopLocalTimer();
    running = false;
    document.getElementById('btnStartPause').textContent = 'START';
    stopSessionAndGoNext({ autoStartNext: true }).catch(()=>{});
  }
}

function randomGuest(){
  const rnd = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  return {
    email: 'guest_' + rnd.slice(0, 10) + '@local',
    password: (rnd + rnd).slice(0, 24),
  };
}

async function ensureAuthForTimer(){
  if (localStorage.getItem('token')) return;

  const savedEmail = localStorage.getItem('guest_email') || '';
  const savedPass = localStorage.getItem('guest_password') || '';

  // 1) пытаемся восстановить гостя логином
  if (savedEmail && savedPass){
    try{
      const data = await api('/v1/auth/login', { method:'POST', body:{ email: savedEmail, password: savedPass } });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_email', savedEmail);
      window.dispatchEvent(new CustomEvent('auth:changed'));
      return;
    }catch{
      // падаем в регистрацию нового гостя
    }
  }

  // 2) создаём нового гостя регистрацией
  for (let i = 0; i < 2; i++){
    const g = randomGuest();
    try{
      const data = await api('/v1/auth/register', { method:'POST', body:{ email: g.email, password: g.password } });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_email', g.email);

      localStorage.setItem('guest_email', g.email);
      localStorage.setItem('guest_password', g.password);

      window.dispatchEvent(new CustomEvent('auth:changed'));
      showToast({ title:'Гость создан', body:'Можно пользоваться таймером без регистрации. Данные сохраняются под гостем.' });
      return;
    }catch{
      // ещё одна попытка с другим email
    }
  }

  showToast({ title:'Ошибка', body:'Не удалось создать гостя.' });
  throw new Error('guest_create_failed');
}

async function getNextFromBackendOrFallback(wasMode){
  const s = getUiSettings();
  const longEvery = Number(s.long_break_every || 4);

  function localNext(){
    if (wasMode === 'work'){
      const needLong = shouldLongBreakAfterWork({ longBreakEvery: longEvery, completedWorkCount });
      const next_kind = needLong ? 'long_break' : 'short_break';
      const duration_seconds =
        next_kind === 'long_break'
          ? Number(s.long_break_seconds || 900)
          : Number(s.short_break_seconds || 300);
      return { next_kind, duration_seconds };
    }
    return { next_kind: 'work', duration_seconds: Number(s.work_seconds || 1500) };
  }

  try{
    const data = await api('/v1/sessions/next');
    if (data && data.next_kind && data.duration_seconds) return data;
    return localNext();
  }catch{
    return localNext();
  }
}

async function startSession(){
  await ensureAuthForTimer();

  applyDurationFromSettingsOrDefault();
  remaining = Math.min(remaining, duration);

  const body = { kind: mode, planned_seconds: duration };
  const s = await api('/v1/sessions/start', { method:'POST', body });
  activeSessionId = s.id;

  document.getElementById('btnStartPause').textContent = 'PAUSE';
  pauseStartedAt = null;
  startLocalTimer();
}

async function stopSessionAndGoNext({ autoStartNext=false } = {}){
  if (transitioning) return;
  if (!localStorage.getItem('token') || !activeSessionId) return;

  transitioning = true;
  document.getElementById('btnStartPause').disabled = true;
  document.getElementById('btnSkip').disabled = true;

  try{
    const actual = Math.max(1, duration - remaining);
    const body = { ended_at: nowIsoUtcNoMs(), actual_seconds: actual };
    await api(`/v1/sessions/${activeSessionId}/stop`, { method:'POST', body });

    const wasMode = mode;

    if (wasMode === 'work'){
      completedWorkCount += 1;
    }

    if (wasMode === 'short_break' || wasMode === 'long_break'){
      setCompletedCycles(getCompletedCycles() + 1);
    }

    activeSessionId = null;
    stopLocalTimer();
    running = false;
    document.getElementById('btnStartPause').textContent = 'START';

    const next = await getNextFromBackendOrFallback(wasMode);
    setMode(next.next_kind);
    duration = Number(next.duration_seconds || duration);
    remaining = duration;
    document.getElementById('timeView').textContent = fmtMMSS(remaining);

    document.getElementById('cycleView').textContent = '#' + currentCycleNo();

    await refreshReport().catch(()=>{});
    await renderTasks().catch(()=>{});

    if (autoStartNext){
      await startSession();
    }
  }catch{
    showToast({ title:'Ошибка', body:'Не удалось завершить/переключить сессию.' });
  }finally{
    document.getElementById('btnStartPause').disabled = false;
    document.getElementById('btnSkip').disabled = false;
    transitioning = false;
  }
}

export function wireTimer(){
  document.getElementById('btnStartPause').onclick = async () => {
    try{
      if (transitioning) return;

      if (!running){
        if (activeSessionId){
          pauseStartedAt = null;
          startLocalTimer();
          document.getElementById('btnStartPause').textContent = 'PAUSE';
          return;
        }
        await startSession();
      }else{
        stopLocalTimer();
        pauseStartedAt = Date.now();
        document.getElementById('btnStartPause').textContent = 'RESUME';
      }
    }catch{
      showToast({ title:'Ошибка', body:'Не удалось запустить таймер.' });
    }
  };

  document.getElementById('btnSkip').onclick = async () => {
    try{
      if (transitioning) return;

      if (!activeSessionId){
        showToast({ title:'Нечего пропускать', body:'Сначала запусти таймер.' });
        return;
      }

      // SKIP при паузе должен тоже срабатывать как завершение текущего интервала
      pauseStartedAt = null;

      remaining = Math.max(0, duration - 1);
      await stopSessionAndGoNext({ autoStartNext: true });
    }catch{
      showToast({ title:'Ошибка', body:'SKIP не выполнился.' });
    }
  };

  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => { if (!running && !transitioning) setMode(t.dataset.mode); };
  });

  document.getElementById('btnResetCycle').onclick = () => {
    setCompletedCycles(0);
    document.getElementById('cycleView').textContent = '#1';
    showToast({ title:'Сброс', body:'Счётчик сессий сброшен.' });
  };
}

export function initTimerUi(){
  setMode('work');
  applyDurationFromSettingsOrDefault();
  remaining = duration;
  document.getElementById('timeView').textContent = fmtMMSS(remaining);
  document.getElementById('cycleView').textContent = '#' + currentCycleNo();
}
