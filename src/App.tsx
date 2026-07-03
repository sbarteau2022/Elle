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
import ConductorPanel from './components/ConductorPanel'
import TradingPanel from './components/TradingPanel'
import LibraryPanel from './components/LibraryPanel'
import IdentityPanel from './components/IdentityPanel'
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
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.rise{animation:rise .2s cubic-bezier(.16,1,.3,1) both}
.navbtn{position:relative;display:flex;align-items:center;gap:10px;width:100%;padding:7px 12px;border:none;border-radius:7px;
background:transparent;color:var(--t2);cursor:pointer;font-family:var(--mono);font-size:11.5px;text-align:left;
letter-spacing:.02em;transition:background .13s,color .13s}
.navbtn:hover{background:var(--raised);color:var(--t1)}
.navbtn.on{background:var(--gold-dim);color:var(--gold)}
.navbtn.on::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:14px;border-radius:2px;background:var(--gold);box-shadow:0 0 6px var(--gold)}
.navbtn .glyph{width:14px;display:inline-block;text-align:center;opacity:.75;font-size:12px}
.navbtn.on .glyph{opacity:1}
.navbtn .kb{margin-left:auto;font-size:9px;color:var(--t4);opacity:0;transition:opacity .13s}
.navbtn:hover .kb{opacity:1}
/* a hairline of gold along the very top edge — the room has a pulse */
.topglow{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent);pointer-events:none;z-index:10}
`

type Tab = 'elle' | 'conductor' | 'library' | 'identity' | 'optimus' | 'trading' | 'code' | 'evals' | 'diagnose' | 'health'
// [tab, glyph, label, section] — nav is grouped by what she's doing there.
// The number is the 1-9 keyboard shortcut (⌘/Ctrl+n).
const NAV: [Tab, string, string, string][] = [
  ['elle',      '◈', 'elle',      'mind'],
  ['conductor', '∞', 'conductor', 'mind'],
  ['library',   '▣', 'library',   'mind'],
  ['identity',  '✶', 'identity',  'mind'],
  ['optimus',   'φ', 'optimus',   'work'],
  ['trading',   '$', 'trading',   'work'],
  ['code',      '{}', 'code',     'work'],
  ['evals',     '▤', 'evals',     'work'],
  ['diagnose',  '✚', 'diagnose',  'ops'],
  ['health',    '●', 'health',    'ops'],
]
const SECTIONS = ['mind', 'work', 'ops']

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

  // ⌘/Ctrl + 1..9 jumps to a tab — a console you can fly without the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= NAV.length) { e.preventDefault(); setTab(NAV[n - 1][0]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--void)', position: 'relative' }}>
        <div className="topglow" />
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
              {SECTIONS.map(sec => (
                <div key={sec} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)', letterSpacing: '.18em', textTransform: 'uppercase', padding: '4px 12px 2px' }}>{sec}</div>
                  {NAV.filter(([, , , s]) => s === sec).map(([t, glyph, label]) => {
                    const n = NAV.findIndex(x => x[0] === t) + 1
                    return (
                      <button key={t} className={'navbtn' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
                        <span className="glyph">{glyph}</span>{label}
                        <span className="kb">⌘{n}</span>
                      </button>
                    )
                  })}
                </div>
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
            {tab === 'conductor' && <ConductorPanel accent={ACCENT} />}
            {tab === 'library' && <LibraryPanel accent={ACCENT} />}
            {tab === 'identity' && <IdentityPanel accent={ACCENT} />}
            {tab === 'trading' && <TradingPanel accent={ACCENT} />}
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
