// Elle — local superadmin workbench (Electron)
// Direct access to Elle's deep intel core: the unified router surface, the
// Optimus phase-state journal, the code engine, and the eval/training bench.
// Local only — no public deploy. Per-user JWT against elle-worker.
import { useEffect, useState } from 'react'
import EllePanel from './components/EllePanel'
import OptimusPanel from './components/OptimusPanel'
import CodePanel from './components/CodePanel'
import Evals from './components/Evals'
import Login from './components/Login'
import { worker, getEmail, clearAuth, verifyToken } from './lib/elle'

const ACCENT = '#C9A84C'

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--void:#07080C;--base:#0C0D14;--raised:#11121B;--float:#171824;--ov:#1E1F2E;
--t1:#DDE5EE;--t2:#8896A8;--t3:#52606E;--t4:#363F4A;--b1:rgba(255,255,255,.08);--b2:rgba(255,255,255,.04);
--mono:'JetBrains Mono',monospace;--ui:'Inter',system-ui,sans-serif}
html,body,#root{height:100%;overflow:hidden}
body{background:var(--void);color:var(--t1);font-family:var(--ui);font-size:13px}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}
input,textarea,select,button{font-family:inherit}
`

type Tab = 'elle' | 'optimus' | 'code' | 'evals'
const TABS: [Tab, string][] = [['elle', 'Elle'], ['optimus', 'Optimus'], ['code', 'Code'], ['evals', 'Evals']]

export function App() {
  // Gate on a network-backed verify — same as the dev console's _authenticated
  // route. A revoked-but-present token is caught, not just an empty one, so the
  // workbench opens only for a live superadmin session.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('elle')

  useEffect(() => {
    let active = true
    verifyToken().then(ok => { if (active) setAuthed(ok) })
    return () => { active = false }
  }, [])

  if (authed === null) return (
    <><style>{CSS}</style>
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        verifying session…
      </div>
    </>
  )

  if (!authed) return (<><style>{CSS}</style><Login onAuth={() => setAuthed(true)} /></>)

  return (
    <>
      <style>{CSS}</style>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--void)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', paddingTop: 28, borderBottom: '0.5px solid var(--b1)', background: 'var(--base)', WebkitUserSelect: 'none', ...( { WebkitAppRegion: 'drag' } as any) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #C9A84C66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: ACCENT }}>E</div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>elle</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: ACCENT }}>workbench · deep intel core</span>
          </div>
          <nav style={{ display: 'flex', gap: 2, marginLeft: 14, ...( { WebkitAppRegion: 'no-drag' } as any) }}>
            {TABS.map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11.5, background: tab === t ? 'var(--float)' : 'transparent', color: tab === t ? ACCENT : 'var(--t2)' }}>
                {lbl}
              </button>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, ...( { WebkitAppRegion: 'no-drag' } as any) }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>{getEmail() || worker.label}</span>
            <button onClick={() => { clearAuth(); setAuthed(false) }}
              style={{ background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 9px' }}>
              sign out
            </button>
          </div>
        </header>
        <main style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {tab === 'elle' && <EllePanel worker={worker} accent={ACCENT} />}
          {tab === 'optimus' && <OptimusPanel worker={worker} accent={ACCENT} />}
          {tab === 'code' && <CodePanel worker={worker} accent={ACCENT} />}
          {tab === 'evals' && <Evals worker={worker} accent={ACCENT} />}
        </main>
      </div>
    </>
  )
}
