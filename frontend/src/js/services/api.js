const API_BASE = 'http://localhost:8000';

export async function api(path, { method='GET', body=null, headers={} } = {}){
  const h = { ...headers };
  if (body !== null) h['Content-Type'] = 'application/json';

  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = 'Bearer ' + token;

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
