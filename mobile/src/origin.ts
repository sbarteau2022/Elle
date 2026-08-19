// The worker origin, alone in its own module.
//
// api.ts imports expo/fetch, which cannot load outside the React Native
// runtime — so anything that needs only the base URL (artifacts.ts, and its
// unit tests) would drag the whole native wire in with it. This keeps the
// constant reachable from pure code. api.ts re-exports it, so every existing
// `import { WORKER_URL } from './api'` still resolves.
export const WORKER_URL =
  process.env.EXPO_PUBLIC_ELLE_WORKER_URL || 'https://elle-worker.sbarteau2022.workers.dev';
