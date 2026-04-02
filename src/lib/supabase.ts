/// <reference types="vite/client" />

// ============================================================
// ELLE API CLIENT
// Single source of truth for all backend communication.
//
// Commercial mode: Supabase edge functions
// Sovereign mode:  Local Ollama (set VITE_SOVEREIGN=true)
//
// Every component imports from here. Never fetches directly.
// ============================================================

export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SOVEREIGN     = import.meta.env.VITE_SOVEREIGN === 'true';
export const OLLAMA_URL    = import.meta.env.VITE_OLLAMA_URL  || 'http://localhost:11434';
export const OLLAMA_MODEL  = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';

// ── Core fetch wrapper ────────────────────────────────────────

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
    throw new Error(`Edge function ${fn} failed: ${res.status} — ${err}`);
  }

  return res.json();
}

// ── Sovereign Ollama fallback ─────────────────────────────────

async function callOllama(
  fn: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const messages = extractMessages(fn, body);

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
  const data = await res.json() as { message?: { content?: string } };
  return { content: data.message?.content || '', sovereign: true };
}

function extractMessages(
  fn: string,
  body: Record<string, unknown>
): { role: string; content: string }[] {
  if (Array.isArray(body.messages)) return body.messages as { role: string; content: string }[];
  const text = String(body.query || body.transcript || body.thought || JSON.stringify(body));
  return [{ role: 'user', content: text }];
}

// ── Supabase Auth ─────────────────────────────────────────────

export async function authSignIn(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  return res.json() as Promise<{ access_token?: string; error_description?: string; error?: string }>;
}

export async function authSignUp(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  return res.json() as Promise<{ access_token?: string; error_description?: string; error?: string }>;
}

export async function authGetUser(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON },
  });
  return res.json() as Promise<{ id: string; email: string }>;
}

// ── Direct DB write (for public forms, no auth required) ──────

export async function dbInsert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  return res.ok;
}
