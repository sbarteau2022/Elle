import React from 'react';
import type { User, Screen } from '../lib/types';
import { SOVEREIGN } from '../lib/supabase';

interface Props {
  screen: Screen;
  setScreen: (s: Screen) => void;
  user: User;
}

const NAV: { id: Screen; label: string; mono: string }[] = [
  { id: 'home',    label: 'Home',          mono: '01' },
  { id: 'ask',     label: 'Ask Elle',       mono: '02' },
  { id: 'learn',   label: 'Learn to Code',  mono: '03' },
  { id: 'threads', label: 'My Threads',     mono: '04' },
  { id: 'signals', label: 'Community',      mono: '05' },
  { id: 'profile', label: 'My Profile',     mono: '06' },
];

export function Sidebar({ screen, setScreen, user }: Props) {
  return (
    <aside style={{
      width: 220,
      background: '#13131f',
      borderRight: '1px solid rgba(139,26,26,0.2)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Identity */}
      <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid rgba(139,26,26,0.15)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 8, margin: '0 0 8px' }}>
          ELLEai
        </p>
        <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '0.95rem', fontWeight: 400, margin: '0 0 8px' }}>
          {user.display_name || user.email.split('@')[0]}
        </p>
        {SOVEREIGN && (
          <span style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', display: 'inline-block' }}>
            Sovereign
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 16 }}>
        {NAV.map(n => {
          const isActive = screen === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setScreen(n.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '11px 24px',
                background: isActive ? 'rgba(139,26,26,0.12)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #8B1A1A' : '2px solid transparent',
                color: isActive ? '#F5F0E8' : '#6a6a7a',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#F5F0E8'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#6a6a7a'; }}
            >
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#8B1A1A', width: 18, flexShrink: 0 }}>
                {n.mono}
              </span>
              <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {n.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div style={{ padding: 20, borderTop: '1px solid rgba(139,26,26,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B1A1A', display: 'inline-block', animation: 'ellePulse 2s infinite' }} />
          <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a', letterSpacing: '0.1em' }}>
            {SOVEREIGN ? 'LOCAL · API FREE' : 'ELLE ACTIVE'}
          </span>
        </div>
      </div>
    </aside>
  );
}
