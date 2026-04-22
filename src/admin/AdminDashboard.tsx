import React from 'react';
import { SOVEREIGN, SUPABASE_URL, OLLAMA_URL, OLLAMA_MODEL } from '../lib/supabase';
import type { User, CognitiveMap } from '../lib/types';

interface Props {
  user: User;
  token: string;
  cogMap: CognitiveMap | null;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: 24, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)' }}>
      <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.4rem', color: '#F5F0E8', margin: '0 0 4px', fontWeight: 400 }}>{value}</p>
      {sub && <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a', margin: 0 }}>{sub}</p>}
    </div>
  );
}

export function AdminDashboard({ user, cogMap }: Props) {
  const modeLabel  = SOVEREIGN ? 'Sovereign · Local' : 'Cloud · Supabase';
  const modeColor  = SOVEREIGN ? '#C9A84C' : '#8B1A1A';
  const endpoint   = SOVEREIGN ? OLLAMA_URL : (SUPABASE_URL ? SUPABASE_URL.replace('https://', '').split('.')[0] + '.supabase.co' : '— not set —');
  const model      = SOVEREIGN ? OLLAMA_MODEL : 'claude (edge fn)';

  const maskedToken = user ? '••••••••' + (typeof window !== 'undefined' ? '' : '') : '—';

  return (
    <div style={{ padding: '48px', maxWidth: 900, animation: 'slideIn 0.4s ease forwards' }}>

      {/* Header */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Administration
          </p>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: 0 }}>
            Dashboard
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: modeColor, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.15em', color: modeColor, textTransform: 'uppercase' }}>
            {modeLabel}
          </span>
        </div>
      </div>

      {/* System status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, marginBottom: 40 }}>
        <StatCard label="Route Mode"    value={SOVEREIGN ? 'Sovereign' : 'Cloud'}       sub={SOVEREIGN ? 'Local Ollama' : 'Supabase Edge'} />
        <StatCard label="Endpoint"      value={endpoint}                                  sub={SOVEREIGN ? 'Ollama API' : 'Supabase project'} />
        <StatCard label="Model"         value={model}                                     sub={SOVEREIGN ? 'VITE_OLLAMA_MODEL' : 'via elle-reasoning-engine'} />
        <StatCard label="Cognitive Map" value={cogMap ? 'Active' : 'Not mapped'}         sub={cogMap ? `v${cogMap.map_version || 1} · ${cogMap.confidence} confidence` : 'Go to Master Profile to map'} />
      </div>

      {/* Session info */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 16, margin: '0 0 16px' }}>
          Active Session
        </p>
        <div style={{ padding: 24, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { label: 'Admin Email',  val: user.email },
            { label: 'User ID',      val: user.id },
            { label: 'Access Tier',  val: user.access_tier || 'admin' },
            { label: 'JWT Token',    val: maskedToken },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>{f.label}</p>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.7)', fontSize: '0.9rem', margin: 0, wordBreak: 'break-all' }}>{f.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 16, margin: '0 0 16px' }}>
          Quick Access
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          {[
            { label: 'Master Profile',    desc: 'Your cognitive map and admin profile',       href: '#profile' },
            { label: 'Configuration',     desc: 'Sovereign mode, routing, environment vars',  href: '#config' },
            { label: 'Elle Platform',     desc: 'Open the main user-facing platform',         href: '/app' },
            { label: 'Observer Site',     desc: 'Return to the public landing page',          href: '/' },
          ].map(item => (
            <a
              key={item.label}
              href={item.href}
              onClick={item.href.startsWith('#') ? (e) => { e.preventDefault(); } : undefined}
              style={{ display: 'block', padding: 20, background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.1)', textDecoration: 'none', transition: 'border-color 0.15s' }}
            >
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F0E8', margin: '0 0 6px' }}>{item.label}</p>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', color: '#6a6a7a', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
