export function fmtMMSS(total){
  total = Math.max(0, Math.floor(total || 0));
  const m = String(Math.floor(total/60)).padStart(2,'0');
  const s = String(total%60).padStart(2,'0');
  return m + ':' + s;
}

export function fmtHMM(totalSeconds){
  totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h <= 0) return m + ' min';
  return h + ' h ' + m + ' min';
}

export function nowIsoUtcNoMs(){
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
