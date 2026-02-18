export function lsGet(key, fallback=null){
  try{
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }catch{
    return fallback;
  }
}

export function lsSet(key, value){
  try{ localStorage.setItem(key, value); }catch{}
}

export function lsDel(key){
  try{ localStorage.removeItem(key); }catch{}
}

export function lsGetJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

export function lsSetJson(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch{}
}
