/// <reference types="vite/client" />

// ============================================================
// ELLE API CLIENT — v3 · Cloudflare-native
// Direct calls to elle.sbarteau2022.workers.dev.
// No Supabase. No Vercel. No proxy.
//
// .env:
//   VITE_ELLE_WORKER_URL  = https://elle.sbarteau2022.workers.dev
//   VITE_ELLE_SERVICE_KEY = <from CF Dashboard: Workers > elle > Settings > Variables>
// ============================================================

export const ELLE_WORKER  = import.meta.env.VITE_ELLE_WORKER_URL  || 'https://elle.sbarteau2022.workers.dev';
export const SERVICE_KEY  = import.meta.env.VITE_ELLE_SERVICE_KEY || '';
export const SOVEREIGN    = import.meta.env.VITE_SOVEREIGN === 'true';
export const OLLAMA_URL   = import.meta.env.VITE_OLLAMA_URL   || 'http://localhost:11434';
export const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';

// Public — no auth needed
const PUBLIC_ENDPOINTS = new Set(['elle-auth']);

// Can use service key as fallback when no user token
const SERVICE_KEY_ENDPOINTS = new Set(['elle-conversation', 'elle-code-engine']);

export async function callEdge(
  fn: string,
  body: Record<string, unknown>,
  token?: string
): Promise<Record<string, unknown>> {
  if (SOVEREIGN) return callOllama(fn, body);

  let authHeader: Record<string, string> = {};
  if (!PUBLIC_ENDPOINTS.has(fn)) {
    const bearer = token || (SERVICE_KEY_ENDPOINTS.has(fn) ? SERVICE_KEY : '');
    if (bearer) authHeader['Authorization'] = `Bearer ${bearer}`;
  }

  const res = await fetch(`${ELLE_WORKER}/api/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${fn} failed: ${res.status} — ${err}`);
  }
  return res.json();
}

export async function authSignIn(email: string, password: string) {
  const data = await callEdge('elle-auth', { action: 'login', email, password });
  if (data.error) throw new Error(data.error as string);
  return data as { access_token: string; user: { id: string; email: string } };
}

export async function authSignUp(email: string, password: string) {
  const data = await callEdge('elle-auth', { action: 'signup', email, password });
  if (data.error) throw new Error(data.error as string);
  return data as { access_token: string | null; user: { id: string; email: string }; confirmed: boolean };
}

async function callOllama(
  _fn: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const messages = Array.isArray(body.messages)
    ? body.messages as { role: string; content: string }[]
    : [{ role: 'user', content: String(body.query || body.transcript || JSON.stringify(body)) }];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
  const data = await res.json() as { message?: { content?: string } };
  return { content: data.message?.content || '', sovereign: true };
}
// ------------------------------------------------------------
// dbInsert — public contact/outreach logging.
// Posts to the elle worker's public /api/contact endpoint.
// NOTE: worker must expose POST /api/contact (public, no auth)
// writing to the named table. Until then this resolves but the
// row is not persisted; the UI degrades gracefully.
// ------------------------------------------------------------
export async function dbInsert(
  table: string,
  row: Record<string, unknown>
): Promise<{ success: boolean }> {
  const res = await fetch(`${ELLE_WORKER}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, row }),
  });
  if (!res.ok) throw new Error(`contact failed: ${res.status}`);
  return res.json();
}
