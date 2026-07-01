import { useState } from 'react'
import { WORKER, setAuth } from '../lib/elle'

export default function Login({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

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
      setAuth(d.access_token as string, (d.user?.email as string) || em)
      onAuth()
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
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', marginBottom: 18 }}>local · deep intel core</div>
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
      </div>
    </div>
  )
}
