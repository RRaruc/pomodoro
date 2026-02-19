const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__ !== undefined)
  ? String(window.__API_BASE__ || '')
  : '';

export function getApiBase() {
  return API_BASE;
}

export async function api(path, { method = 'GET', body = null, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== null) h['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, {
    method,
    headers: h,
    body: body !== null ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) throw { status: res.status, data };
  return data;
}
