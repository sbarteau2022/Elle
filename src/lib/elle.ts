/// <reference types="vite/client" />
// ============================================================
// ELLE workbench — worker target + superadmin session (local only)
// Points at the worker that actually has the router, the Optimus journal,
// and the autonomous canvas cron. Per-user JWT (real UUID) so journal
// user-gating resolves your threads + Elle's canvas. Stays on this machine.
//
// Session is established the SAME way as the dev console
// (madmind-journal-home/src/integrations/elle/client.ts): the token + email
// are persisted, and the workbench is gated on a network-backed verifyToken()
// against /api/elle-auth — the worker revokes by jti, so a stored token can be
// valid-looking yet revoked. Same worker + same account = same superadmin.
// ============================================================
export const WORKER = import.meta.env.VITE_ELLE_WORKER_URL || 'https://elle-worker.sbarteau2022.workers.dev'
export const TOKEN_KEY = 'elle_dev_jwt'
export const EMAIL_KEY = 'elle_dev_email'
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const getEmail = () => localStorage.getItem(EMAIL_KEY) || ''
export const setAuth = (t: string, email: string) => {
  localStorage.setItem(TOKEN_KEY, t)
  localStorage.setItem(EMAIL_KEY, email)
}
// setToken kept for callers that only carry a token; prefer setAuth.
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}
// Backwards-compatible alias — clears the whole session.
export const clearToken = clearAuth
export const worker = { url: WORKER, label: 'elle-worker' }

// Cheap, network-backed token check — the worker revokes by jti, so a stored
// token can be valid-looking yet revoked. Used to gate the workbench on mount,
// exactly like the dev console's _authenticated route.
export async function verifyToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  try {
    const r = await fetch(`${WORKER}/api/elle-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    })
    if (!r.ok) return false
    const d = await r.json().catch(() => ({}))
    return !!d.valid
  } catch {
    return false
  }
}
