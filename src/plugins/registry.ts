// ============================================================
// Panel registry — plugins call registerPanel() once (see builtins.ts for
// the pattern); App.tsx only ever reads listPanels()/listSections(). This is
// what makes the workbench's tab bar a plugin surface instead of a fixed
// switch statement: a future "comm panel" plugin package imports this same
// module and registers itself, with zero changes to App.tsx.
// ============================================================
import type { PanelPlugin } from './types'

const panels = new Map<string, PanelPlugin>()

export function registerPanel(panel: PanelPlugin): void {
  if (panels.has(panel.id)) {
    console.warn(`[plugins] panel "${panel.id}" registered twice — replacing the earlier one`)
  }
  panels.set(panel.id, panel)
}

export function unregisterPanel(id: string): void {
  panels.delete(id)
}

export function getPanel(id: string): PanelPlugin | undefined {
  return panels.get(id)
}

export function listPanels(): PanelPlugin[] {
  return [...panels.values()].sort((a, b) => a.order - b.order)
}

// Sections in first-seen order (by lowest panel order), not alphabetical —
// "mind" belongs before "ops" the same way it always has.
export function listSections(): string[] {
  const seen: string[] = []
  for (const p of listPanels()) if (!seen.includes(p.section)) seen.push(p.section)
  return seen
}
