// ============================================================
// TOOLKIT — skills + MCP, one rail slot instead of two.
// Same reasoning as MasterForgePanel: two panels that belong together
// (her procedure library and her connector shelf — both "reach for a tool
// she doesn't have loaded yet") share a sub-tab bar rather than each
// claiming its own place in an already-long rail.
// ============================================================
import { useEffect, useState } from 'react'
import { on } from '../lib/commands'
import SkillsPanel from './SkillsPanel'
import McpPanel from './McpPanel'

type Sub = 'skills' | 'mcp'
const SUBS: Array<{ id: Sub; glyph: string; label: string }> = [
  { id: 'skills', glyph: '✦', label: 'skills' },
  { id: 'mcp', glyph: '⎘', label: 'mcp' },
]
const STORE_KEY = 'elle_toolkit_sub'

export default function ToolkitPanel({ accent }: { accent: string }) {
  const [sub, setSub] = useState<Sub>(() => {
    const saved = localStorage.getItem(STORE_KEY)
    return (SUBS.some(s => s.id === saved) ? saved : 'skills') as Sub
  })

  useEffect(() => { localStorage.setItem(STORE_KEY, sub) }, [sub])
  useEffect(() => on('nav', e => { if (e.panel === 'toolkit' && e.sub) setSub(e.sub as Sub) }), [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '10px 14px 0', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 }}>
        {SUBS.map(s => {
          const isOn = sub === s.id
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 0,
                borderBottom: `2px solid ${isOn ? accent : 'transparent'}`,
                background: isOn ? 'var(--gold-dim)' : 'transparent',
                color: isOn ? accent : 'var(--t3)',
                cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.03em',
              }}>
              <span style={{ opacity: isOn ? 1 : .75, fontSize: 12 }}>{s.glyph}</span>{s.label}
            </button>
          )
        })}
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {sub === 'skills' && <SkillsPanel accent={accent} />}
        {sub === 'mcp' && <McpPanel accent={accent} />}
      </div>
    </div>
  )
}
