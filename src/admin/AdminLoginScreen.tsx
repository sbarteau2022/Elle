import React, { useState } from 'react';
import { authSignInAdmin, SOVEREIGN } from '../lib/supabase';
import type { User } from '../lib/types';

interface Props {
  onAuth: (user: User, token: string) => void;
}

export function AdminLoginScreen({ onAuth }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const result = await authSignInAdmin(email, password);
      if (!result.access_token || !result.user) {
        setError('No session returned. Verify your credentials.');
        return;
      }
      onAuth({ id: result.user.id, email: result.user.email || email }, result.access_token);
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(201,168,76,0.2)',
    padding: '12px 16px',
    color: '#F5F0E8',
    fontFamily: '"Barlow Condensed", sans-serif',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: '"Space Mono", monospace',
    fontSize: '0.55rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(245,240,232,0.3)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 20, margin: '0 0 20px' }}>
            Observer Foundation · Administration
          </p>
          <div style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.3)', margin: '0 auto 20px' }} />
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: '0 0 8px' }}>
            Admin Access
          </h1>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.95rem', margin: 0 }}>
            Restricted to authorized administrators.
          </p>
          {SOVEREIGN && (
            <span style={{ display: 'inline-block', marginTop: 14, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 10px' }}>
              Sovereign · Local Mode
            </span>
          )}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoComplete="username"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: '#C9A84C', padding: '8px 12px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading || !email || !password}
            style={{ background: loading ? 'transparent' : 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', padding: '14px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: (loading || !email || !password) ? 'default' : 'pointer', marginTop: 8, opacity: (loading || !email || !password) ? 0.5 : 1, transition: 'all 0.2s' }}
          >
            {loading ? 'Verifying...' : 'Enter Administration'}
          </button>

          <a
            href="/"
            style={{ display: 'block', textAlign: 'center', fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.15em', color: 'rgba(245,240,232,0.2)', textDecoration: 'none', marginTop: 8 }}
          >
            ← Return to Observer Foundation
          </a>
        </div>
      </div>
    </div>
  );
}
