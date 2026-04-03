/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// ============================================================
// ELLE API CLIENT
// Uses official Supabase JS client for auth.
// ============================================================

export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SOVEREIGN     = import.meta.env.VITE_SOVEREIGN === 'true';
export const OLLAMA_URL    = import.meta.env.VITE_OLLAMA_URL  || 'http://localhost:11434';
export const OLLAMA_MODEL  = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';

// Official Supabase client — handles auth correctly
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth functions using official client ──────────────────────

export async function authSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return { access_token: data.session?.access_token, user: data.user };
}

export async function authSignUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { access_token: data.session?.access_token, user: data.user };
}

// ── Core edge function caller ─────────────────────────────────

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

// ── Direct DB write (public forms) ────────────────────────────

export async function dbInsert(table: string, row: Record<string, unknown>) {
  const { error } = await supabase.from(table).insert(row);
  return !error;
}
