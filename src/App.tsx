// Elle — local superadmin workbench (Electron)
// THE universal dev console: the old cloud dev console is deprecated and its
// surfaces live here now. Superadmin/admin tier only — a valid standard-tier
// session is refused at the door (lib/elle.ts verifyToken + Login).
//
// Shell: a left rail (nav + live heartbeat) and one instrument panel. The
// visual system is deliberate — void black, one gold, hairline borders, serif
// only for her name; everything that is data is mono. No decoration that
// isn't information.
//
// The tab bar below is a plugin surface, not a fixed list: './plugins/builtins'
// registers the ten panels below it via registerPanel(), and this file reads
// them back out through listPanels()/listSections(). A third-party comm panel
// (see plugins/registry.ts) plugs in the exact same way — nothing here needs
// to change to add one.
import { useEffect, useState } from 'react'
import Login from './components/Login'
import './plugins/builtins'
import { listPanels, listSections } from './plugins/registry'
import { worker, getEmail, getTier, clearAuth, verifyToken, WORKER } from './lib/elle'
import { VoiceProvider, useWorkbenchVoice } from './lib/VoiceContext'
import { CameraProvider } from './lib/CameraContext'
import { on } from './lib/commands'

const ACCENT = '#C9A84C'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--void:#060709;--base:#0B0C10;--raised:#101117;--float:#15161E;--ov:#1C1D27;
--t1:#E4E7EC;--t2:#9AA3B2;--t3:#6B7688;--t4:#4A5261;--b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.05);
--gold:#C9A84C;--gold-dim:rgba(201,168,76,.14);--good:#4ADE80;
--mono:'JetBrains Mono',monospace;--ui:'Inter',system-ui,sans-serif;--serif:'Playfair Display',serif}
/* Light theme — same structure, inverted surfaces + darkened text tiers for
   contrast. Stamped on <html data-theme="light"> by the header toggle. */
:root[data-theme="light"]{--void:#F6F4EF;--base:#FFFFFF;--raised:#EFEDE6;--float:#E8E5DC;--ov:#DFDBD0;
--t1:#1A1C22;--t2:#3E4551;--t3:#5C6472;--t4:#8A93A0;--b1:rgba(0,0,0,.12);--b2:rgba(0,0,0,.06);
--gold:#8A6D18;--gold-dim:rgba(138,109,24,.14);--good:#178A4E}
:root[data-theme="light"] ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18)}
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
/* a tab with an unattended alert (e.g. a surfaced sandbox report) breathes
   dark→light until it's opened */
@keyframes tabflash{0%,100%{background:transparent;color:var(--t2)}50%{background:var(--gold);color:var(--void);box-shadow:0 0 10px var(--gold-dim)}}
.navbtn.flash{animation:tabflash 1.15s ease-in-out infinite}
.navbtn.flash .glyph{opacity:1}
.navbtn .glyph{width:14px;display:inline-block;text-align:center;opacity:.75;font-size:12px}
.navbtn.on .glyph{opacity:1}
.navbtn .kb{margin-left:auto;font-size:9px;color:var(--t4);opacity:0;transition:opacity .13s}
.navbtn:hover .kb{opacity:1}
/* a hairline of gold along the very top edge — the room has a pulse */
.topglow{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent);pointer-events:none;z-index:10}
`

// Registered once at module load (plugins/builtins side effect above).
// Reading it into a const here — not inside the component — keeps the nav
// stable across renders exactly the way the old hardcoded array was.
const PANELS = listPanels()
const SECTIONS = listSections()

// The workbench's ear, in the rail: toggle listen mode (consent-gated — the
// first press opens the PermissionGate, never the mic directly), see plainly
// when she can hear you, and revoke the mic without hunting for a settings
// page. Invisible when this host has no speech recognition at all.
function ListenControl() {
  const wv = useWorkbenchVoice()
  if (!wv.voice.sttSupported) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <button onClick={wv.toggleListenMode}
        title={wv.listenMode ? 'she is listening — click to stop (or say "stop listening")' : 'let her listen continuously — asks for the mic first'}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
          background: wv.listenMode ? '#D0656518' : 'none',
          border: `0.5px solid ${wv.listenMode ? '#D0656577' : 'var(--b1)'}`,
          borderRadius: 6, color: wv.listenMode ? '#D06565' : 'var(--t3)',
          cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, padding: '5px 10px',
        }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: wv.listenMode ? '#D06565' : 'var(--t4)',
          animation: wv.listenMode ? 'breathe 1.1s ease-in-out infinite' : 'none',
          boxShadow: wv.listenMode ? '0 0 8px #D0656599' : 'none',
        }} />
        {wv.listenMode ? 'listening' : 'listen'}
      </button>
      {wv.micConsent === 'granted' && (
        <button onClick={wv.revokeMic} title="drop microphone access everywhere"
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, padding: 0, letterSpacing: '.04em' }}>
          mic allowed · revoke
        </button>
      )}
      {wv.micConsent === 'denied' && (
        <span title="she'll ask again the next time you reach for a voice feature"
          style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.04em' }}>
          mic blocked
        </span>
      )}
    </div>
  )
}

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
  const [tab, setTab] = useState<string>(PANELS[0]?.id ?? '')
  // Per-panel attention signals (PanelPlugin.alert) → a flashing rail tab.
  const [alerts, setAlerts] = useState<Record<string, boolean>>({})
  // Theme: dark by default (the console's native look); light for when the low
  // -contrast tiers get hard to read. Stamped on <html> so the CSS overrides win.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('elle_theme') === 'light' ? 'light' : 'dark'))
  useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('elle_theme', theme)
  }, [theme])

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
      if (n >= 1 && n <= PANELS.length) { e.preventDefault(); setTab(PANELS[n - 1].id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // …or without your hands: "open trading" (any registered panel's name)
  // arrives here from the voice pipeline as a nav event.
  useEffect(() => on('nav', e => setTab(e.panel)), [])

  // Panels that define alert() get polled; while one returns true its rail tab
  // flashes (see .navbtn.flash). Only panels that opt in are polled.
  useEffect(() => {
    const alerting = PANELS.filter(p => p.alert)
    if (!alerting.length) return
    let live = true
    const tick = async () => {
      const entries = await Promise.all(alerting.map(async p => [p.id, await p.alert!().catch(() => false)] as const))
      if (live) setAlerts(prev => { const next = { ...prev }; for (const [id, on] of entries) next[id] = !!on; return next })
    }
    tick(); const iv = setInterval(tick, 7000)
    return () => { live = false; clearInterval(iv) }
  }, [])

  if (authed === null) return (
    <><style>{CSS}</style>
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        verifying session…
      </div>
    </>
  )

  if (!authed) return (<><style>{CSS}</style><Login onAuth={() => setAuthed(true)} /></>)

  const activePanel = PANELS.find(p => p.id === tab)

  return (
    <VoiceProvider accent={ACCENT}>
    <CameraProvider accent={ACCENT}>
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
                  {PANELS.filter(p => p.section === sec).map(p => {
                    const n = PANELS.findIndex(x => x.id === p.id) + 1
                    return (
                      <button key={p.id}
                        className={'navbtn' + (tab === p.id ? ' on' : '') + (alerts[p.id] && tab !== p.id ? ' flash' : '')}
                        onClick={() => { setTab(p.id); if (alerts[p.id]) setAlerts(a => ({ ...a, [p.id]: false })) }}>
                        <span className="glyph">{p.glyph}</span>{p.label}
                        <span className="kb">⌘{n}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px' }}>
              <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'switch to dark' : 'switch to light'}
                style={{ alignSelf: 'flex-start', background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '4px 10px', letterSpacing: '.04em' }}>
                {theme === 'light' ? '◐ dark' : '◑ light'}
              </button>
              <ListenControl />
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
            {activePanel?.render({ worker, accent: ACCENT })}
          </main>
        </div>
      </div>
    </CameraProvider>
    </VoiceProvider>
  )
}
