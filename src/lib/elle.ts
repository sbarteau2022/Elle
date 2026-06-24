/// <reference types="vite/client" />
// ============================================================
// ELLE workbench — worker target + auth token (local only)
// Points at the worker that actually has the router, the Optimus journal,
// and the autonomous canvas cron. Per-user JWT (real UUID) so journal
// user-gating resolves your threads + Elle's canvas. Stays on this machine.
// ============================================================
export const WORKER = import.meta.env.VITE_ELLE_WORKER_URL || 'https://elle-worker.sbarteau2022.workers.dev'
export const TOKEN_KEY = 'elle_dev_jwt'
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
export const worker = { url: WORKER, label: 'elle-worker' }
