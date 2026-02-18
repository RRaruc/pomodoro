import { lsGet, lsSet } from '../utils/storage.js';

export function getAuthEmail(){
  return lsGet('auth_email', '');
}

export function isGuestEmail(email){
  return /^guest_[a-z0-9]+@local$/i.test(email || '');
}

export function displayNameFromEmail(email){
  if (!email) return '';
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

export function cycleKey(){
  const email = getAuthEmail();
  if (!localStorage.getItem('token') || !email) return 'completed_cycles:anon';
  return 'completed_cycles:' + email;
}

export function getCompletedCycles(){
  const v = Number(lsGet(cycleKey(), '0'));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

export function setCompletedCycles(v){
  lsSet(cycleKey(), String(v));
}

export function currentCycleNo(){
  return getCompletedCycles() + 1;
}

export function shouldLongBreakAfterWork({ longBreakEvery, completedWorkCount }){
  const every = Math.max(2, Number(longBreakEvery || 4));
  return completedWorkCount > 0 && (completedWorkCount % every === 0);
}
