let csrf = '';
export function setCsrf(value) { csrf = value || ''; }
export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const response = await fetch(`/api/olivia${path}`, { method, credentials: 'same-origin', headers: { ...(method !== 'GET' ? { 'x-meet-csrf': csrf } : {}), ...(!raw && body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: raw ? body : JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || `Erreur HTTP ${response.status}`); error.status = response.status; error.code = result.code; if (response.status === 401 && result.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('meet-session-expired')); throw error; }
  return result;
}
export const oliviaService = {
  getMeetingSummary: id => api(`/meetings/${encodeURIComponent(id)}`),
  process: id => api(`/meetings/${id}/process`, { method: 'POST' }),
};
