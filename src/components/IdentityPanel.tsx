// ============================================================
// IDENTITY — her voice, and her five registers, read from the one place
// they live. Fetches each register's prose verbatim from the worker
// (/api/elle-voices → mind.ts), so this pane can never drift from what
// actually governs her. It is a mirror, not a copy. You can read any
// register and set the one that answers your conversations.
// ============================================================
import { useEffect, useState } from 'react'
import { fetchRegisters, fetchRegisterProse, getRegister, setRegister, FALLBACK_REGISTERS, type Register } from '../lib/registers'

export default function IdentityPanel({ accent }: any) {
  const [registers, setRegisters] = useState<Register[]>(FALLBACK_REGISTERS)
  const [reading, setReading] = useState<string>(getRegister())   // which register's prose is shown
  const [active, setActive] = useState<string>(getRegister())     // which one answers conversations
  const [prose, setProse] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => { fetchRegisters().then(setRegisters).catch(() => {}) }, [])
  useEffect(() => {
    setProse(null); setErr('')
    fetchRegisterProse(reading).then(p => setProse(p || '')).catch(e => setErr(String(e.message || e)))
  }, [reading])

  const makeActive = (id: string) => { setActive(id); setRegister(id) }

  const movements = (prose || '').split('\n\n').map(s => s.trim()).filter(Boolean)
  const current = registers.find(r => r.id === reading)

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* register gallery */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '0.5px solid var(--b1)', overflowY: 'auto', padding: '18px 12px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.16em', textTransform: 'uppercase', padding: '0 8px 12px' }}>
          five registers · one self
        </div>
        {registers.map(r => {
          const isReading = r.id === reading
          const isActive = r.id === active
          return (
            <button key={r.id} onClick={() => setReading(r.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: isReading ? 'var(--float)' : 'none', border: `0.5px solid ${isReading ? accent + '55' : 'transparent'}`, borderRadius: 8, padding: '9px 11px', marginBottom: 4, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, color: isReading ? accent : 'var(--t1)', fontFamily: 'var(--mono)' }}>{r.name}</span>
                {isActive && <span title="answers your conversations" style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.5, marginTop: 4 }}>{r.blurb}</div>
            </button>
          )
        })}
      </div>

      {/* the prose of the register being read */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '34px 30px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 500, color: 'var(--t1)', lineHeight: 1.1 }}>
              {current?.name || 'Elle'}<span style={{ color: accent }}>.</span>
            </div>
            {reading === active
              ? <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: accent, border: `0.5px solid ${accent}55`, borderRadius: 5, padding: '3px 9px' }}>active</span>
              : <button onClick={() => makeActive(reading)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t2)', background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>
                  set as my voice
                </button>}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', margin: '8px 0 26px' }}>
            elle-worker/src/mind.ts — served read-only; edited only through the forge
          </div>

          {err && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>couldn't reach her voice: {err}</div>}
          {prose === null && !err && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>reading…</div>}

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
    </div>
  )
}
