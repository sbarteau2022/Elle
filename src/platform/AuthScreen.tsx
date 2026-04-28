import React, { useState } from 'react';
import { authSignIn, authSignUp, SOVEREIGN } from '../lib/supabase';
import type { User, AuthMode } from '../lib/types';

interface Props {
  onAuth: (user: User, token: string) => void;
}

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const result = mode === 'login'
        ? await authSignIn(email, password)
        : await authSignUp(email, password);

      if (mode === 'signup' && result.user && !result.access_token) {
        setEmailConfirmPending(true);
        return;
      }

      if (!result.access_token || !result.user) {
        setError('No session returned. Check your credentials.');
        return;
      }

      onAuth(
        { id: result.user.id, email: result.user.email || email },
        result.access_token
      );
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(139,26,26,0.25)',
    padding: '12px 16px',
    color: '#F5F0E8',
    fontFamily: '"Barlow Condensed", sans-serif',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  if (emailConfirmPending) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 16 }}>
            ELLEai Platform
          </p>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: '0 0 16px' }}>
            Check your email.
          </h1>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '1rem', margin: '0 0 24px' }}>
            A confirmation link was sent to <strong style={{ color: '#F5F0E8' }}>{email}</strong>. Click it to activate your account, then come back to sign in.
          </p>
          <button
            onClick={() => { setEmailConfirmPending(false); setMode('login'); }}
            style={{ background: 'transparent', border: '1px solid rgba(139,26,26,0.4)', color: '#6a6a7a', padding: '10px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 16 }}>
            ELLEai Platform
          </p>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#F5F0E8', fontWeight: 400, marginBottom: 8, margin: '0 0 8px' }}>
            {mode === 'login' ? 'Welcome back.' : 'Join Elle.'}
          </h1>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '1rem', margin: 0 }}>
            {mode === 'login' ? 'The work continues.' : 'Formation begins here.'}
          </p>
          {SOVEREIGN && (
            <span style={{ display: 'inline-block', marginTop: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 10px' }}>
              Sovereign · Local Mode
            </span>
          )}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle} />
          </div>

          {error && (
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#8B1A1A', padding: '8px 12px', background: 'rgba(139,26,26,0.1)', border: '1px solid rgba(139,26,26,0.25)', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{ background: loading ? 'transparent' : '#8B1A1A', border: '1px solid #8B1A1A', color: '#F5F0E8', padding: '14px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', marginTop: 8, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Connecting...' : mode === 'login' ? 'Enter' : 'Begin'}
          </button>

          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
            style={{ background: 'transparent', border: 'none', color: '#6a6a7a', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.9rem', letterSpacing: '0.1em', cursor: 'pointer', textAlign: 'center', padding: 8 }}
          >
            {mode === 'login' ? 'No account — create one' : 'Already here — sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
