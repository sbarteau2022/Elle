// ============================================================
// THE THREAD, KEPT — src/store.ts
//
// Offline cache of the one conversation, in SQLite. The relationship stays
// readable on a plane: every turn that renders is written here, and the
// Thread hydrates from here before the network answers. The server remains
// the source of truth — rows carry the server ids where they have one, and
// a fresh /api/thread page upserts over whatever it overlaps.
// ============================================================

import * as SQLite from 'expo-sqlite';
import type { Turn } from './api';

const db = SQLite.openDatabaseSync('elle-door.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS turns (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    kappa REAL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_turns_at ON turns (created_at DESC);
`);

export function cacheTurns(turns: Turn[]): void {
  const stmt = db.prepareSync('INSERT OR REPLACE INTO turns (id, role, content, kappa, created_at) VALUES (?,?,?,?,?)');
  try {
    for (const t of turns) stmt.executeSync([t.id, t.role, t.content, t.kappa, t.created_at]);
  } finally { stmt.finalizeSync(); }
}

export function loadCachedTurns(limit = 100): Turn[] {
  const rows = db.getAllSync<Turn>('SELECT id, role, content, kappa, created_at FROM turns ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.reverse(); // oldest → newest for rendering
}

// A locally-minted id for turns born on this phone; server pages later
// overwrite by server id, and these stay as the offline record of the moment.
export function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clearCache(): void {
  db.execSync('DELETE FROM turns');
}
