/// <reference types="vite/client" />

// ============================================================
// ELLE API CLIENT
// All calls go through Supabase edge functions.
// Auth goes through elle-auth edge function.
// ============================================================

export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SOVEREIGN     = import.meta.env.VITE_SOVEREIGN === 'true';
export const OLLAMA_URL    = import.meta.env.VITE_OLLAMA_URL  || 'http://localhost:11434';
export const OLLAMA_MODEL  = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';

export async function callEdge(
  fn: string,
  body: Record<string, unknown>,
  token?: string
): Promise<Record<string, unknown>> {
  if (SOVEREIGN) return callOllama(fn, body);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${token || SUPABASE_ANON}`,
    },
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

export async function dbInsert(table: string, row: Record<string, unknown>) {
  callEdge('elle-conversation', { _db_insert: table, _row: row }).catch(() => {});
}
