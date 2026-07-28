// ============================================================
// TERMINAL panel — the full-height home for the same shells the drawer
// shows. Switching between the two doesn't restart anything: both surfaces
// render <Terminals />, and the sessions live in lib/terminals.ts, so a
// build you kicked off in the drawer keeps streaming here.
// ============================================================
import Terminals from './Terminal'

export default function TerminalPanel() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <Terminals />
    </div>
  )
}
