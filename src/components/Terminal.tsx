// ============================================================
// TERMINAL — the workbench's shell surface.
//
// One component, two homes: the drawer that slides up under any panel
// (⌃` — the Cursor reflex) and the full-height `terminal` tab. Both render
// <Terminals />; the sessions themselves live in lib/terminals.ts, outside
// React, so a shell keeps running — and keeps its scrollback — while you're
// off in another tab or the drawer is shut.
//
// What's here is the chrome: the tab strip, the split, the mount point that
// adopts a session's host node, and the resize plumbing that keeps the shell's
// idea of the window the same as yours.
// ============================================================
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import '@xterm/xterm/css/xterm.css'
import {
  type Session, subscribe, listSessions, createSession, closeSession, fitSession, hasNative,
} from '../lib/terminals'

// Mounts one session's terminal into this pane. Adopting the session's own
// host node (rather than calling term.open again) is what makes moving a live
// shell between surfaces lossless.
function Surface({ session, focus }: { session: Session; focus: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.appendChild(session.host)
    fitSession(session)
    if (focus && !session.exited) session.term.focus()

    // Follow the pane, not just the window: the drawer's drag handle and the
    // rail collapsing both change our width without a window resize event.
    const ro = new ResizeObserver(() => fitSession(session))
    ro.observe(el)
    return () => { ro.disconnect(); session.host.remove() }
  }, [session, focus])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, padding: '6px 4px 4px 10px' }} />
}

function Tab({ s, active, onSelect, onClose }: {
  s: Session; active: boolean; onSelect: () => void; onClose: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={`${s.shell} — ${s.cwd}${s.pty ? '' : ' (piped: no TTY on this machine)'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px 4px 10px',
        borderRadius: 5, cursor: 'pointer', maxWidth: 190,
        background: active ? 'var(--gold-dim)' : hover ? 'var(--raised)' : 'transparent',
        color: active ? 'var(--gold)' : 'var(--t2)',
        fontFamily: 'var(--mono)', fontSize: 10.5, whiteSpace: 'nowrap',
      }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: s.exited !== null ? 'var(--t4)' : s.pty ? 'var(--good)' : 'var(--gold)',
      }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {s.title}{s.exited !== null ? ` · ${s.exited}` : ''}
      </span>
      <button onClick={e => { e.stopPropagation(); onClose() }} title="close this shell"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
          color: 'var(--t4)', fontSize: 12, opacity: hover || active ? 1 : 0,
        }}>×</button>
    </div>
  )
}

export default function Terminals({ compact = false }: { compact?: boolean }) {
  const sessions = useSyncExternalStore(subscribe, listSessions, listSessions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const active = sessions.find(s => s.id === activeId) ?? sessions[0] ?? null

  const spawn = async () => {
    setError('')
    try { setActiveId((await createSession()).id) }
    catch (e: any) { setError(e?.message || String(e)) }
  }

  // Opening this surface with no shell anywhere hands you a prompt — an empty
  // terminal with nothing but a "+" is a chore. Deliberately mount-only: if it
  // ran whenever the list emptied, closing your last tab would immediately
  // spawn another one, and there'd be no way to end the session.
  useEffect(() => {
    if (!listSessions().length && hasNative()) void spawn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the active session pointed at something real after a close.
  useEffect(() => {
    if (activeId && !sessions.some(s => s.id === activeId)) setActiveId(sessions[0]?.id ?? null)
  }, [sessions, activeId])

  if (!hasNative()) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7,
      }}>
        the integrated terminal runs real shells on this machine,<br />
        so it needs the desktop app — <span style={{ color: 'var(--t2)' }}>npm run electron:dev</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--base)' }}>
      {/* ── tab strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, padding: '5px 8px',
        borderBottom: '0.5px solid var(--b1)', flexShrink: 0, overflowX: 'auto',
      }}>
        {!compact && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '.18em', textTransform: 'uppercase', padding: '0 8px 0 4px' }}>
            terminal
          </span>
        )}
        {sessions.map(s => (
          <Tab key={s.id} s={s} active={s.id === active?.id}
            onSelect={() => setActiveId(s.id)} onClose={() => closeSession(s.id)} />
        ))}
        <button onClick={spawn} title="new shell (⌃⇧`)"
          style={{
            background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)',
            cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 9px', marginLeft: 4, flexShrink: 0,
          }}>+</button>
        {active && !active.pty && (
          <span title="node-pty isn't built on this machine, so this shell is piped: commands run and print, but full-screen programs (vim, htop) and interactive prompts won't render. `npm rebuild node-pty` to get a real TTY."
            style={{
              marginLeft: 'auto', flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--gold)',
              border: '0.5px solid var(--gold-dim)', borderRadius: 4, padding: '2px 7px', letterSpacing: '.04em',
            }}>
            piped · no tty
          </span>
        )}
      </div>

      {/* ── the shell itself ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {active
          ? <Surface key={active.id} session={active} focus />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 10.5, textAlign: 'center', padding: 20 }}>
              {error || 'no shell open — press + to start one'}
            </div>
          )}
      </div>
      {error && active && (
        <div style={{ flexShrink: 0, padding: '5px 12px', borderTop: '0.5px solid var(--b1)', color: '#D06565', fontFamily: 'var(--mono)', fontSize: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}
