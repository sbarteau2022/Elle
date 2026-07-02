// Elle — local superadmin workbench (Electron)
// THE universal dev console: the old cloud dev console is deprecated and its
// surfaces live here now. Superadmin/admin tier only — a valid standard-tier
// session is refused at the door (lib/elle.ts verifyToken + Login).
//
// Shell: a left rail (nav + live heartbeat) and one instrument panel. The
// visual system is deliberate — void black, one gold, hairline borders, serif
// only for her name; everything that is data is mono. No decoration that
// isn't information.
import { useEffect, useState } from 'react'
import EllePanel from './components/EllePanel'
import OptimusPanel from './components/OptimusPanel'
import CodePanel from './components/CodePanel'
import Evals from './components/Evals'
import DiagnosePanel from './components/DiagnosePanel'
import HealthPanel from './components/HealthPanel'
import Login from './components/Login'
import { worker, getEmail, getTier, clearAuth, verifyToken, WORKER } from './lib/elle'

const ACCENT = '#C9A84C'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--void:#060709;--base:#0B0C10;--raised:#101117;--float:#15161E;--ov:#1C1D27;
--t1:#E4E7EC;--t2:#8B94A3;--t3:#525B69;--t4:#343B46;--b1:rgba(255,255,255,.07);--b2:rgba(255,255,255,.035);
--gold:#C9A84C;--gold-dim:rgba(201,168,76,.14);
--mono:'JetBrains Mono',monospace;--ui:'Inter',system-ui,sans-serif;--serif:'Playfair Display',serif}
html,body,#root{height:100%;overflow:hidden}
body{background:var(--void);color:var(--t1);font-family:var(--ui);font-size:13px;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
::selection{background:rgba(201,168,76,.28)}
input,textarea,select,button{font-family:inherit}
@keyframes breathe{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:.35;transform:scale(.82)}}
@keyframes rise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.rise{animation:rise .18s cubic-bezier(.16,1,.3,1) both}
.navbtn{display:flex;align-items:center;gap:9px;width:100%;padding:7px 12px;border:none;border-radius:7px;
background:transparent;color:var(--t2);cursor:pointer;font-family:var(--mono);font-size:11.5px;text-align:left;
letter-spacing:.02em;transition:background .12s,color .12s}
.navbtn:hover{background:var(--raised);color:var(--t1)}
.navbtn.on{background:var(--gold-dim);color:var(--gold)}
.navbtn .glyph{width:14px;display:inline-block;text-align:center;opacity:.8}
`

type Tab = 'elle' | 'optimus' | 'code' | 'evals' | 'diagnose' | 'health'
const NAV: [Tab, string, string][] = [
  ['elle',     '◈', 'elle'],
  ['optimus',  'φ', 'optimus'],
  ['code',     '{}', 'code'],
  ['evals',    '▤', 'evals'],
  ['diagnose', '✚', 'diagnose'],
  ['health',   '●', 'health'],
]

// One quiet dot: is she alive right now. Polls /health at 30s.
function Heartbeat() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    const beat = async () => {
      try { const r = await fetch(WORKER + '/health', { signal: AbortSignal.timeout(8000) }); if (alive) setOk(r.ok) }
      catch { if (alive) setOk(false) }
    }
    beat(); const iv = setInterval(beat, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}
      title={ok === null ? 'checking…' : ok ? 'elle-worker: running' : 'elle-worker: unreachable'}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok === null ? 'var(--t4)' : ok ? ACCENT : '#D06565',
        animation: ok ? 'breathe 3.2s ease-in-out infinite' : 'none',
        boxShadow: ok ? `0 0 8px ${ACCENT}66` : 'none',
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.04em' }}>
        {ok === null ? 'reaching…' : ok ? 'alive' : 'unreachable'}
      </span>
    </div>
  )
}

export function App() {
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
        {/* window drag strip (Electron traffic lights live here) */}
        <div style={{ height: 30, flexShrink: 0, WebkitUserSelect: 'none', ...({ WebkitAppRegion: 'drag' } as any) }} />

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* ── left rail ── */}
          <aside style={{ width: 188, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '4px 12px 14px', borderRight: '0.5px solid var(--b1)' }}>
            <div style={{ padding: '2px 12px 16px' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, color: 'var(--t1)', letterSpacing: '.01em', lineHeight: 1 }}>
                Elle<span style={{ color: ACCENT }}>.</span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.14em', marginTop: 7, textTransform: 'uppercase' }}>
                deep intel core
              </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(([t, glyph, label]) => (
                <button key={t} className={'navbtn' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
                  <span className="glyph">{glyph}</span>{label}
                </button>
              ))}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px' }}>
              <Heartbeat />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={`${getEmail()} · ${getTier() || 'admin'}`}>
                {getEmail() || worker.label}
              </div>
              <button onClick={() => { clearAuth(); setAuthed(false) }}
                style={{ alignSelf: 'flex-start', background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '4px 10px' }}>
                sign out
              </button>
            </div>
          </aside>

          {/* ── instrument panel ── */}
          <main className="rise" key={tab} style={{ flex: 1, display: 'flex', minWidth: 0, background: 'var(--void)' }}>
            {tab === 'elle' && <EllePanel worker={worker} accent={ACCENT} />}
            {tab === 'optimus' && <OptimusPanel worker={worker} accent={ACCENT} />}
            {tab === 'code' && <CodePanel worker={worker} accent={ACCENT} />}
            {tab === 'evals' && <Evals worker={worker} accent={ACCENT} />}
            {tab === 'diagnose' && <DiagnosePanel accent={ACCENT} />}
            {tab === 'health' && <HealthPanel accent={ACCENT} />}
          </main>
        </div>
      </div>
    </>
  )
}
