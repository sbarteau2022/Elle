import { useState } from 'react'
import { WORKER, setAuth, clearAuth, tierAllowed } from '../lib/elle'

export default function Login({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Forced first-login reset: when a provisioned (temp-password) account signs
  // in, the worker returns must_reset. We hold the temp password and require a
  // new one before the console opens.
  const [reset, setReset] = useState(false)
  const [np1, setNp1] = useState('')
  const [np2, setNp2] = useState('')

  // Common landing: gate the tier and open the console.
  const land = (d: any, em: string) => {
    const tier = String(d.user?.tier || 'standard')
    if (!tierAllowed(tier)) {
      clearAuth()
      throw new Error(`this is the admin workbench — "${tier}" tier accounts cannot open it`)
    }
    setAuth(d.access_token as string, (d.user?.email as string) || em, tier)
    onAuth()
  }

  const submit = async () => {
    if (busy || !email.trim() || !pw) return
    setBusy(true); setErr('')
    try {
      const em = email.trim().toLowerCase()
      const r = await fetch(WORKER + '/api/elle-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email: em, password: pw }),
      })
      const d = await r.json()
      if (!r.ok || !d.access_token) throw new Error(d.error || `HTTP ${r.status}`)
      // Provisioned temp password → force a self-set reset before entry.
      if (d.must_reset) { setReset(true); return }
      land(d, em)
    } catch (e: any) { setErr(String(e.message || e)) } finally { setBusy(false) }
  }

  const submitReset = async () => {
    if (busy) return
    if (np1.length < 8) { setErr('new password must be at least 8 characters'); return }
    if (np1 !== np2) { setErr('passwords do not match'); return }
    setBusy(true); setErr('')
    try {
      const em = email.trim().toLowerCase()
      const r = await fetch(WORKER + '/api/elle-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_password', email: em, password: pw, new_password: np1 }),
      })
      const d = await r.json()
      if (!r.ok || !d.access_token) throw new Error(d.error || `HTTP ${r.status}`)
      land(d, em)
    } catch (e: any) { setErr(String(e.message || e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--void)' }}>
      <div style={{ width: 340, padding: 28, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, border: '1px solid #C9A84C66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>E</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>elle</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#C9A84C' }}>workbench</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', marginBottom: 18 }}>{reset ? 'set a new password to continue' : 'local · deep intel core'}</div>
        {reset ? (<>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)', marginBottom: 10 }}>Welcome. This account was set up with a temporary password — choose your own to continue.</div>
          <input value={np1} onChange={e => setNp1(e.target.value)} type="password" placeholder="new password (8+ chars)" autoComplete="new-password"
            style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 8 }} />
          <input value={np2} onChange={e => setNp2(e.target.value)} type="password" placeholder="confirm new password" autoComplete="new-password"
            onKeyDown={e => { if (e.key === 'Enter') submitReset() }}
            style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 12 }} />
          <button onClick={submitReset} disabled={busy || !np1 || !np2}
            style={{ width: '100%', padding: '9px 0', borderRadius: 6, border: '0.5px solid #C9A84C66', background: '#C9A84C22', color: '#C9A84C', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 10 }}>
            {busy ? '…' : 'set password & enter'}
          </button>
          {err && <div style={{ color: '#e07070', fontFamily: 'var(--mono)', fontSize: 10.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{err}</div>}
        </>) : (<>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" autoComplete="username"
          style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 8 }} />
        <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 12 }} />
        <button onClick={submit} disabled={busy || !email.trim() || !pw}
          style={{ width: '100%', padding: '9px 0', borderRadius: 6, border: '0.5px solid #C9A84C66', background: '#C9A84C22', color: '#C9A84C', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 10 }}>
          {busy ? '…' : mode === 'login' ? 'sign in' : 'create account'}
        </button>
        {err && <div style={{ color: '#e07070', fontFamily: 'var(--mono)', fontSize: 10.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{err}</div>}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr('') }}
          style={{ width: '100%', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
          {mode === 'login' ? 'need an account? sign up' : 'have an account? sign in'}
        </button>
        </>)}
      </div>
    </div>
  )
}
