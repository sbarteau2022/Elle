// ============================================================
// terminals — the workbench's live shells, owned OUTSIDE React.
//
// The reason this store exists at all: in an IDE, a terminal keeps running
// while you look at something else. If the xterm instance lived in component
// state it would be torn down every time the drawer closed or you switched
// tabs, taking the scrollback with it and (worse) making every remount spawn
// a fresh shell. So the sessions and their xterm instances live here, at
// module scope, for the life of the window; a React component only ever
// *attaches* a stored terminal to a DOM node and detaches on unmount.
//
// The main process (electron/native/providers/terminal.cjs) owns the actual
// shell; this is the renderer half — one xterm per session, wired to the
// preload bridge, plus a tiny subscribe() so the tab strips re-render when
// the session list changes.
// ============================================================
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export interface Session {
  id: string
  title: string
  shell: string
  cwd: string
  /** false → node-pty missing here; piped shell, no TTY (see the provider). */
  pty: boolean
  term: Terminal
  fit: FitAddon
  /**
   * The div xterm actually rendered into. term.open() can only be called
   * once per instance, so the session owns its own host element and React
   * simply appends/removes THIS node — that's what lets a terminal move
   * between the drawer and the full panel without losing a byte.
   */
  host: HTMLDivElement
  /** Set once the shell exits; the tab shows the code and stops accepting input. */
  exited: number | null
  dispose: () => void
}

const sessions: Session[] = []
const listeners = new Set<() => void>()

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// listSessions is a useSyncExternalStore getSnapshot, so it MUST return the
// same reference until something actually changes — handing back a fresh
// [...sessions] every call reads as "changed" on every render and spins React
// into an infinite loop. So: one cached copy, rebuilt only in changed().
let snapshot: Session[] = []
function changed() {
  snapshot = [...sessions]
  listeners.forEach(fn => { try { fn() } catch { /* one bad listener can't break the rest */ } })
}

export function listSessions(): Session[] { return snapshot }
export function hasNative(): boolean { return !!window.elleNative?.terminal }

// The workbench's palette, applied to the terminal so it belongs to the room
// rather than looking like a pasted-in VT100. Reads the live CSS variables,
// so the light-theme toggle carries through (see retheme below).
function themeFromCss(): Record<string, string> {
  const v = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  return {
    background: v('--base', '#1d2d3d'),
    foreground: v('--t1', '#f2f2f3'),
    cursor: v('--gold', '#5980a6'),
    cursorAccent: v('--base', '#1d2d3d'),
    selectionBackground: 'rgba(89,128,166,.28)',
    black: '#1d2d3d', red: '#D06565', green: '#4ADE80', yellow: '#5980a6',
    blue: '#6E9FE0', magenta: '#B98CD9', cyan: '#59C2C9', white: '#E4E7EC',
    brightBlack: '#4A5261', brightRed: '#E5484D', brightGreen: '#6EE7A0', brightYellow: '#E0C169',
    brightBlue: '#8FB8EA', brightMagenta: '#CBA6E8', brightCyan: '#7FD6DC', brightWhite: '#FFFFFF',
  }
}

/** Re-skin every open terminal — called when the shell flips light/dark. */
export function retheme(): void {
  const theme = themeFromCss()
  for (const s of sessions) s.term.options.theme = theme
}

let counter = 0

// Spawn a shell and its terminal. Rejects (with a readable reason) outside
// Electron — the browser dev server has no shell to give, and the panel says
// so plainly rather than rendering a terminal that can never work.
export async function createSession(cwd?: string): Promise<Session> {
  const bridge = window.elleNative?.terminal
  if (!bridge) throw new Error('no shell here — the integrated terminal needs the Electron app (npm run electron:dev)')

  const term = new Terminal({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12.5,
    lineHeight: 1.35,
    letterSpacing: 0.2,
    cursorBlink: true,
    cursorStyle: 'bar',
    // Deep scrollback: build output is the thing you scroll back through, and
    // 1000 lines (the default) loses the start of a long compile.
    scrollback: 10_000,
    allowProposedApi: true,
    theme: themeFromCss(),
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  // Clicking a URL in output opens it in the OS browser: main's window-open
  // handler routes http(s) out and denies everything else, so this can't be
  // used to steer the privileged window anywhere.
  term.loadAddon(new WebLinksAddon((_e, uri) => { window.open(uri, '_blank') }))

  // Opened against a detached host now, mounted into the DOM by whichever
  // surface is showing it. xterm measures as soon as it's in a laid-out
  // parent, and fitSession() follows.
  const host = document.createElement('div')
  host.style.width = '100%'
  host.style.height = '100%'
  term.open(host)

  const info = await bridge.create({ cwd, cols: 80, rows: 24 })

  const offData = bridge.onData(info.id, d => term.write(d))
  const offExit = bridge.onExit(info.id, code => {
    const s = sessions.find(x => x.id === info.id)
    if (s) { s.exited = code; changed() }
    term.write(`\r\n\x1b[2m[process exited with code ${code}]\x1b[0m\r\n`)
  })
  const offInput = term.onData(d => { bridge.write(info.id, d) })

  const session: Session = {
    id: info.id,
    title: `${info.shell.split(/[\\/]/).pop() || 'shell'} ${++counter}`,
    shell: info.shell,
    cwd: info.cwd,
    pty: info.pty,
    term, fit, host,
    exited: null,
    dispose: () => {
      offData(); offExit(); offInput.dispose()
      bridge.kill(info.id).catch(() => {})
      term.dispose()
      host.remove()
      const i = sessions.findIndex(s => s.id === info.id)
      if (i >= 0) sessions.splice(i, 1)
      changed()
    },
  }
  sessions.push(session)
  changed()
  return session
}

export function closeSession(id: string): void {
  sessions.find(s => s.id === id)?.dispose()
}

/** Push the current geometry to the shell so line wrapping and TUIs are right. */
export function fitSession(s: Session): void {
  try {
    s.fit.fit()
    window.elleNative?.terminal?.resize(s.id, s.term.cols, s.term.rows)
  } catch { /* not laid out yet — the next fit gets it */ }
}
