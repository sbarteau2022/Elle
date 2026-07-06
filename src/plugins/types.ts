// ============================================================
// Panel plugin contract — every workbench tab (built-in or third-party) is
// one of these. The registry (registry.ts) is the single source App.tsx
// renders from; the shell never names a panel by import again, so a new
// comm panel plugs in the exact same way elle/conductor/library etc. do.
// ============================================================
import type { ReactNode } from 'react'

export interface WorkerConfig {
  url: string
  label: string
}

// What a panel is handed at render time. Kept small on purpose — a panel
// that needs more (capabilities, session, …) reaches for its own hooks,
// the same way the built-ins already do (useVoice, usePresence, etc.).
export interface PanelContext {
  worker: WorkerConfig
  accent: string
}

export interface PanelPlugin {
  id: string
  glyph: string
  label: string
  section: string
  /** Sort position within its section; also drives the ⌘1..9 shortcut. */
  order: number
  render: (ctx: PanelContext) => ReactNode
  /**
   * Optional attention signal. If present, the shell polls it and flashes this
   * panel's rail tab (dark→light) while it returns true — e.g. the sandbox tab
   * flashes when Elle has surfaced a report that hasn't been opened yet. Kept
   * dependency-free (no ctx) so a panel owns its own worker call.
   */
  alert?: () => Promise<boolean>
  /**
   * Native capability keys (see Capabilities in native.d.ts) this panel
   * leans on — e.g. ['mic'], ['camera']. Advisory only: the shell doesn't
   * hide or gate on this today, but a panel can read useCapabilities()
   * itself and use `requires` to explain why a feature is dim.
   */
  requires?: string[]
}
