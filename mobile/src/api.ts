// ============================================================
// THE DOOR'S WIRE — src/api.ts
//
// One typed client for every worker endpoint the app touches. This file is
// the contract with elle-worker: shapes here mirror the worker's responses
// (index.ts, arrival.ts, push.ts, member-feed.ts) and nothing else in the
// app talks to the network. Streaming rides expo/fetch (WinterCG streams);
// everything else is plain fetch.
// ============================================================

import { fetch as streamingFetch } from 'expo/fetch';
import { createSseParser } from './sse';

export const WORKER_URL =
  process.env.EXPO_PUBLIC_ELLE_WORKER_URL || 'https://elle-worker.sbarteau2022.workers.dev';

// ── shapes (mirrors of the worker) ───────────────────────────────────────────

export interface User { id: string; email: string; tier: string }
export interface AuthResult { access_token: string; user: User; must_reset?: boolean }

export interface LiveStep {
  kind: 'run_start' | 'step' | 'obs';
  run_id?: string;
  step?: number;
  thought?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  duration_ms?: number;
}

export interface KappaDynamics { kappa?: number; velocity?: number | null; accel?: number | null; jerk?: number | null }

export interface ConversationDone {
  content: string;
  response: string;
  session_id: string;
  steps: number;
  kappa_dynamics: KappaDynamics | null;
}

export interface Arrival {
  brief: string;
  wrote_at: number;
  heartbeat: { status: string; beat_at: string } | null;
  kappa: { kappa: number; reserve: number | null; velocity: number | null; accel: number | null } | null;
  counts: { journal: number; dreams: number; watches_fired: number; runs: number };
  first_meeting: boolean;
}

export interface Turn { id: string; role: 'user' | 'assistant'; content: string; kappa: number | null; created_at: string }
export interface FeedItem { kind: 'journal' | 'dream' | 'watch'; title: string; body: string; at: number; kappa?: number | null; ref?: string | null }
export interface Memory { id: string; memory_type: string; summary: string; content: string; importance: number; created_at: string }
export interface ReachPrefs { reach_budget_per_week: number; quiet_start: number; quiet_end: number; tz: string }
export interface ReachOut { id: string; reason_kind: string; reason_ref: string; body: string; sent_at: number }

export const doorSession = (userId: string) => `door:${userId}`;

// ── plumbing ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `HTTP ${res.status}`, res.status);
  return data as T;
}

// ── auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    call<AuthResult>('/api/elle-auth', { body: { action: 'login', email, password } }),
  signup: (email: string, password: string) =>
    call<AuthResult>('/api/elle-auth', { body: { action: 'signup', email, password } }),
  // The forced first-login flow for provisioned accounts (must_reset).
  setPassword: (email: string, password: string, newPassword: string) =>
    call<AuthResult>('/api/elle-auth', { body: { action: 'set_password', email, password, new_password: newPassword } }),
  verify: (token: string) =>
    call<{ valid: boolean; user: User }>('/api/elle-auth', { body: { action: 'verify', token } }),
  // Google sign-in: trade a Google ID token for the same JWT password login
  // mints. The worker verifies it server-side (audience + email_verified);
  // the app never trusts the Google token by itself.
  oauth: (credential: string) =>
    call<AuthResult>('/api/elle-oauth', { body: { credential } }),
};

// ── the thread ───────────────────────────────────────────────────────────────

// Send a message and watch her think: step/obs frames as they happen, then
// the done payload. Returns done; onLive fires per live frame. On any stream
// failure the caller falls back to send() — the non-streaming door.
export async function sendStreaming(
  token: string,
  userId: string,
  query: string,
  onLive: (ev: LiveStep) => void,
): Promise<ConversationDone> {
  const res = await streamingFetch(`${WORKER_URL}/api/elle-conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, session_id: doorSession(userId), stream: true, source: 'door' }),
  });
  if (!res.ok || !res.body) throw new ApiError(`stream HTTP ${res.status}`, res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  let done: ConversationDone | null = null;

  const handle = (ev: { event: string; data: string }) => {
    let payload: unknown;
    try { payload = JSON.parse(ev.data); } catch { return; }
    if (ev.event === 'done') done = payload as ConversationDone;
    else if (ev.event === 'error') throw new ApiError(String((payload as { error?: string }).error || 'stream error'), 502);
    else onLive(payload as LiveStep);
  };

  for (;;) {
    const { value, done: eof } = await reader.read();
    if (value) for (const ev of parser.feed(decoder.decode(value, { stream: true }))) handle(ev);
    if (eof) break;
  }
  for (const ev of parser.flush()) handle(ev);

  if (!done) throw new ApiError('stream ended without done frame', 502);
  return done;
}

export const send = (token: string, userId: string, query: string) =>
  call<ConversationDone>('/api/elle-conversation', { token, body: { query, session_id: doorSession(userId), source: 'door' } });

export const thread = (token: string, opts: { before?: string; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (opts.before) qs.set('before', opts.before);
  if (opts.limit) qs.set('limit', String(opts.limit));
  return call<{ turns: Turn[]; has_more: boolean }>(`/api/thread?${qs}`, { token });
};

// ── arrival + her day ────────────────────────────────────────────────────────

export const arrival = (token: string) => call<Arrival>('/api/arrival', { token });

export const feed = (token: string, opts: { before?: number; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (opts.before) qs.set('before', String(opts.before));
  if (opts.limit) qs.set('limit', String(opts.limit));
  return call<{ items: FeedItem[]; as_of: number }>(`/api/feed?${qs}`, { token });
};

export const provenance = (token: string, runId: string) =>
  call<{ run_id: string; steps: Array<{ step_index: number; kind: string; tool: string | null; result_preview: string | null; duration_ms: number | null; created_at: string }> }>(
    `/api/feed/provenance?run_id=${encodeURIComponent(runId)}`, { token });

// ── you ──────────────────────────────────────────────────────────────────────

export const me = {
  memories: (token: string) => call<{ memories: Memory[] }>('/api/me/memories', { token }),
  deleteMemory: (token: string, id: string) =>
    call<{ deleted: boolean }>('/api/me/memories', { token, body: { delete_id: id } }),
  exportAll: (token: string) => call<Record<string, unknown>>('/api/me/export', { token }),
  erase: (token: string) =>
    call<{ erased: boolean }>('/api/me/delete', { token, body: { confirm: 'erase everything' } }),
  prefs: (token: string) => call<ReachPrefs>('/api/prefs', { token }),
  putPrefs: (token: string, p: Partial<ReachPrefs>) => call<ReachPrefs>('/api/prefs', { token, body: p }),
  reachOuts: (token: string) => call<{ reach_outs: ReachOut[] }>('/api/reach-outs', { token }),
  registerPush: (token: string, expoToken: string, platform: string) =>
    call<{ ok: boolean }>('/api/push/register', { token, body: { expo_token: expoToken, platform } }),
  unregisterPush: (token: string, expoToken: string) =>
    call<{ ok: boolean }>('/api/push/unregister', { token, body: { expo_token: expoToken } }),
};
