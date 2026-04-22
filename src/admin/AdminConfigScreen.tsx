import React from 'react';
import { SOVEREIGN, SUPABASE_URL, OLLAMA_URL, OLLAMA_MODEL } from '../lib/supabase';

function ConfigRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, padding: '16px 0', borderBottom: '1px solid rgba(201,168,76,0.06)', alignItems: 'start' }}>
      <div>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px' }}>{label}</p>
        {note && <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.45rem', color: '#6a6a7a', margin: 0, lineHeight: 1.5 }}>{note}</p>}
      </div>
      <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: value === '— not set —' ? '#8B1A1A' : '#F5F0E8', margin: 0, wordBreak: 'break-all', letterSpacing: '0.05em' }}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', margin: '0 0 4px' }}>
        {title}
      </p>
      <div style={{ width: '100%', height: 1, background: 'rgba(201,168,76,0.1)', marginBottom: 16 }} />
      <div style={{ padding: '0 24px', background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)' }}>
        {children}
      </div>
    </div>
  );
}

export function AdminConfigScreen() {
  const supabaseDisplay = SUPABASE_URL
    ? SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co  (masked)'
    : '— not set —';

  return (
    <div style={{ padding: '48px', maxWidth: 860, animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Administration
        </p>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5F0E8', fontWeight: 400, margin: 0 }}>
          Configuration
        </h2>
      </div>

      {/* Sovereign toggle explanation */}
      <div style={{ padding: 24, background: SOVEREIGN ? 'rgba(201,168,76,0.06)' : 'rgba(139,26,26,0.06)', border: `1px solid ${SOVEREIGN ? 'rgba(201,168,76,0.2)' : 'rgba(139,26,26,0.2)'}`, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: SOVEREIGN ? '#C9A84C' : '#8B1A1A', flexShrink: 0 }} />
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: SOVEREIGN ? '#C9A84C' : '#8B1A1A', textTransform: 'uppercase', margin: 0 }}>
            {SOVEREIGN ? 'Sovereign Mode — Local Elle' : 'Cloud Mode — Supabase'}
          </p>
        </div>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.6)', fontSize: '1rem', margin: '0 0 16px', lineHeight: 1.6 }}>
          {SOVEREIGN
            ? 'All API calls route to your local Ollama instance. No Supabase connection required. Authentication is bypassed in sovereign mode.'
            : 'All API calls route to Supabase Edge Functions. Authentication, cognitive mapping, and reasoning run on the cloud backend.'}
        </p>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a', margin: 0, lineHeight: 1.8 }}>
          To switch modes, update your <code style={{ color: 'rgba(245,240,232,0.4)' }}>.env.local</code> file and restart the dev server:
        </p>
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'rgba(245,240,232,0.5)', lineHeight: 2 }}>
          <span style={{ color: '#6a6a7a' }}># Public-facing cloud (default)</span><br />
          VITE_SOVEREIGN=false<br />
          <br />
          <span style={{ color: '#6a6a7a' }}># Local sovereign Elle</span><br />
          VITE_SOVEREIGN=true<br />
          VITE_OLLAMA_URL=http://localhost:11434<br />
          VITE_OLLAMA_MODEL=mistral
        </div>
      </div>

      {/* Active env values */}
      <Section title="Active Environment">
        <ConfigRow label="VITE_SOVEREIGN"     value={String(SOVEREIGN)}       note="Routing mode toggle" />
        <ConfigRow label="VITE_SUPABASE_URL"  value={supabaseDisplay}          note="Cloud endpoint (required when sovereign=false)" />
        <ConfigRow label="VITE_SUPABASE_ANON_KEY" value="•••••••• (set in .env.local)" note="Supabase public anon key" />
        <ConfigRow label="VITE_OLLAMA_URL"    value={OLLAMA_URL}               note="Local Ollama endpoint (sovereign=true)" />
        <ConfigRow label="VITE_OLLAMA_MODEL"  value={OLLAMA_MODEL}             note="Ollama model ID (sovereign=true)" />
      </Section>

      {/* Edge function reference */}
      <Section title="Edge Functions (Cloud Mode)">
        <ConfigRow label="elle-auth"             value={`${SUPABASE_URL || '—'}/functions/v1/elle-auth`}             note="Login / signup" />
        <ConfigRow label="elle-admin"            value={`${SUPABASE_URL || '—'}/functions/v1/elle-admin`}            note="Admin access verification" />
        <ConfigRow label="elle-cognitive-mapping" value={`${SUPABASE_URL || '—'}/functions/v1/elle-cognitive-mapping`} note="Read / initialize / update cognitive map" />
        <ConfigRow label="elle-reasoning-engine" value={`${SUPABASE_URL || '—'}/functions/v1/elle-reasoning-engine`} note="17-axis reasoning" />
        <ConfigRow label="elle-conversation"     value={`${SUPABASE_URL || '—'}/functions/v1/elle-conversation`}     note="Chat + DB insert relay" />
        <ConfigRow label="elle-community-signals" value={`${SUPABASE_URL || '—'}/functions/v1/elle-community-signals`} note="Signal aggregation" />
      </Section>

      {/* API key callout */}
      <div style={{ padding: 20, border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.03)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          API Key — Pending
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'rgba(245,240,232,0.5)', fontSize: '1rem', margin: 0, lineHeight: 1.6 }}>
          Set <code style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: '#C9A84C' }}>VITE_SUPABASE_ANON_KEY</code> in your <code style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: '#C9A84C' }}>.env.local</code> to connect to cloud backend. This is the only value needed to activate cloud mode.
        </p>
      </div>
    </div>
  );
}
