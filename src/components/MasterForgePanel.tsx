// ============================================================
// FORGE — the whole build pipeline, condensed into one rail tab.
//
// Idea → forge it live → watch it run in the sandbox → the duplex
// conversation running alongside all of it: four things that used to be four
// separate rail slots, but are really one continuous workflow. They live
// under a sub-tab bar here instead — same panels, unchanged, just not
// competing for rail space with everything else.
//
// Only the active sub-tab is mounted (matching how the rail itself only ever
// mounts the active top-level panel), so each panel's own polling only runs
// while you're looking at it. The "ship to the sandbox" handoff from Ideas
// still works exactly as before — it emits a 'nav' event at the 'forge'
// panel with sub:'forge', and this listens for that to jump straight to the
// live stream.
// ============================================================
import { useEffect, useState } from 'react'
import { on } from '../lib/commands'
import IdeasPanel from './IdeasPanel'
import ForgePanel from './ForgePanel'
import SandboxPanel, { sandboxHasUnseenReport } from './SandboxPanel'
import DuplexPanel, { duplexHasUnseen } from './DuplexPanel'

type Sub = 'ideas' | 'forge' | 'sandbox' | 'duplex'
const SUBS: Array<{ id: Sub; glyph: string; label: string }> = [
  { id: 'ideas', glyph: '✦', label: 'ideas' },
  { id: 'forge', glyph: '⚒', label: 'forge' },
  { id: 'sandbox', glyph: '⇅', label: 'sandbox' },
  { id: 'duplex', glyph: '⇄', label: 'duplex' },
]
const STORE_KEY = 'elle_forge_sub'

// The rail's single attention signal for this tab — flashes if either of the
// two sub-panels that used to flash on their own (a surfaced sandbox report,
// an unseen duplex message) has something waiting.
export async function forgeHasAlert(): Promise<boolean> {
  const [s, d] = await Promise.all([sandboxHasUnseenReport(), duplexHasUnseen()])
  return s || d
}

export default function MasterForgePanel({ accent }: any) {
  const [sub, setSub] = useState<Sub>(() => {
    const saved = localStorage.getItem(STORE_KEY)
    return (SUBS.some(s => s.id === saved) ? saved : 'ideas') as Sub
  })
  const [subAlert, setSubAlert] = useState<Record<string, boolean>>({})

  useEffect(() => { localStorage.setItem(STORE_KEY, sub) }, [sub])

  useEffect(() => on('nav', e => { if (e.panel === 'forge' && e.sub) setSub(e.sub as Sub) }), [])

  useEffect(() => {
    let live = true
    const tick = async () => {
      const [s, d] = await Promise.all([sandboxHasUnseenReport().catch(() => false), duplexHasUnseen().catch(() => false)])
      if (live) setSubAlert({ sandbox: s, duplex: d })
    }
    tick(); const iv = setInterval(tick, 7000)
    return () => { live = false; clearInterval(iv) }
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '10px 14px 0', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 }}>
        {SUBS.map(s => {
          const isOn = sub === s.id
          const flashing = !!subAlert[s.id] && !isOn
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: '6px 6px 0 0',
                borderBottom: `2px solid ${isOn ? accent : 'transparent'}`,
                background: isOn ? 'var(--gold-dim)' : 'transparent',
                color: isOn ? accent : 'var(--t3)',
                cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.03em',
                animation: flashing ? 'tabflash 1.15s ease-in-out infinite' : 'none',
              }}>
              <span style={{ opacity: isOn ? 1 : .75, fontSize: 12 }}>{s.glyph}</span>{s.label}
            </button>
          )
        })}
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {sub === 'ideas' && <IdeasPanel accent={accent} />}
        {sub === 'forge' && <ForgePanel accent={accent} />}
        {sub === 'sandbox' && <SandboxPanel accent={accent} />}
        {sub === 'duplex' && <DuplexPanel accent={accent} />}
      </div>
    </div>
  )
}
