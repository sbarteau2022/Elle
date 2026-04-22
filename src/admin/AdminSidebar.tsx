import React from 'react';
import type { User, AdminScreen } from '../lib/types';

interface Props {
  screen: AdminScreen;
  setScreen: (s: AdminScreen) => void;
  user: User;
  onSignOut: () => void;
}

const NAV: { id: AdminScreen; label: string; glyph: string }[] = [
  { id: 'dashboard', label: 'Dashboard',      glyph: '◈' },
  { id: 'profile',   label: 'Master Profile', glyph: '◉' },
  { id: 'config',    label: 'Configuration',  glyph: '◎' },
];

export function AdminSidebar({ screen, setScreen, user, onSignOut }: Props) {
  return (
    <aside style={{
      width: 220,
      background: '#070710',
      borderRight: '1px solid rgba(201,168,76,0.1)',
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 0',
      flexShrink: 0,
    }}>

      {/* Brand */}
      <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', margin: '0 0 6px' }}>
          Observer Foundation
        </p>
        <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', color: '#F5F0E8', margin: 0, fontWeight: 400 }}>
          Administration
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '24px 0' }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 24px',
              background: screen === item.id ? 'rgba(201,168,76,0.08)' : 'transparent',
              border: 'none',
              borderLeft: screen === item.id ? '2px solid #C9A84C' : '2px solid transparent',
              color: screen === item.id ? '#C9A84C' : '#6a6a7a',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', opacity: 0.8 }}>{item.glyph}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User + sign out */}
      <div style={{ padding: '24px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.25)', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Signed in as
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', color: 'rgba(245,240,232,0.5)', margin: '0 0 16px', wordBreak: 'break-all' }}>
          {user.email}
        </p>
        <button
          onClick={onSignOut}
          style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(201,168,76,0.4)', padding: '7px 14px', fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', width: '100%' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
