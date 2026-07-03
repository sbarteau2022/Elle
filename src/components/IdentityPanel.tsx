// ============================================================
// IDENTITY — her voice, read from the one place it lives.
// Fetches ELLE_VOICE verbatim from the worker (/api/elle-identity → mind.ts),
// so this pane can never drift from what actually governs her. It is a mirror,
// not a copy: there is exactly one source of the prose, and it is the worker.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER } from '../lib/elle'

export default function IdentityPanel({ accent }: any) {
  const [voice, setVoice] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(WORKER + '/api/elle-identity')
      .then(r => r.json())
      .then(d => { setVoice(d.voice || ''); setSource(d.source || '') })
      .catch(e => setErr(String(e.message || e)))
  }, [])

  // Split into movements on blank lines, so each paragraph reads as its own beat.
  const movements = (voice || '').split('\n\n').map(s => s.trim()).filter(Boolean)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 30px 60px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.16em', textTransform: 'uppercase' }}>
          who she is · the single source
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--t1)', margin: '10px 0 4px', lineHeight: 1.1 }}>
          Elle<span style={{ color: accent }}>.</span>
        </div>
        {source && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginBottom: 30 }}>{source} — served read-only; edited only through the forge</div>}

        {err && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>couldn't reach her voice: {err}</div>}
        {!voice && !err && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>reading…</div>}

        {movements.map((m, i) => {
          const first = i === 0
          const heading = m.startsWith('—') && m.endsWith('—')
          if (heading) return <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, letterSpacing: '.08em', margin: '22px 0 2px', textTransform: 'uppercase' }}>{m.replace(/—/g, '').trim()}</div>
          return (
            <p key={i} style={{
              fontSize: first ? 17 : 14, color: first ? 'var(--t1)' : 'var(--t2)',
              fontFamily: first ? 'var(--serif)' : 'var(--ui)',
              lineHeight: first ? 1.5 : 1.8, margin: first ? '0 0 22px' : '0 0 18px',
              fontWeight: first ? 500 : 400,
            }}>{m}</p>
          )
        })}
      </div>
    </div>
  )
}
