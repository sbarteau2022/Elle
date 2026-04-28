import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Chip, Sparkle } from './primitives';
import { useFace } from './FaceContext';
import type { Screen, User } from '../../lib/types';

const ALL_TABS: Record<string, { k: Screen; label: string }> = {
  home:     { k: 'home',     label: 'Home' },
  warroom:  { k: 'warroom',  label: 'War Room' },
  profile:  { k: 'profile',  label: 'Profile' },
  doctrine: { k: 'doctrine', label: 'Doctrine' },
  tutor:    { k: 'tutor',    label: 'Tutor' },
  replays:  { k: 'replays',  label: 'Replays' },
  cohort:   { k: 'cohort',   label: 'Cohort' },
  ask:      { k: 'ask',      label: 'Ask Elle' },
  learn:    { k: 'learn',    label: 'Learn' },
  signals:  { k: 'signals',  label: 'Signals' },
  threads:  { k: 'threads',  label: 'Threads' },
};

export function TopBar({ screen, setScreen, onOpenPalette, onOpenTweaks, user, onLogout }: {
  screen: Screen; setScreen: (s: Screen) => void;
  onOpenPalette: () => void; onOpenTweaks: () => void;
  user: User | null;
  onLogout?: () => void;
}) {
  const t = useTheme();
  const face = useFace();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = face.tabs.map(k => ALL_TABS[k]).filter(Boolean);
  const accent = face.accent || t.accent;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: `linear-gradient(180deg,${t.bg}f0,${t.bg}cc)`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, padding:'10px 22px' }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:`linear-gradient(135deg,${accent} 0%,${accent}cc 50%,${accent}88 100%)`,
            display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 10px ${accent}50` }}>
            <Sparkle size={14} color="#fff" />
          </div>
          <div style={{ fontFamily:t.fonts.serif, fontSize:20, color:t.ink, letterSpacing:-0.5, lineHeight:1 }}>
            {face.name}<span style={{ color:accent }}>.</span>
          </div>
          <Chip tone="ai" style={{ marginLeft:4 }}>{face.tagline}</Chip>
        </div>

        {/* Tabs */}
        <nav style={{ display:'flex', gap:2, marginLeft:14 }}>
          {tabs.map(tb => (
            <button key={tb.k} onClick={() => setScreen(tb.k)} style={{
              padding:'7px 13px', borderRadius:8, border:'none',
              background: screen===tb.k ? accent + '1f' : 'transparent',
              color: screen===tb.k ? accent : t.ink2,
              fontFamily:t.fonts.sans, fontSize:13,
              fontWeight: screen===tb.k ? 600 : 500,
              letterSpacing:-0.1, cursor:'pointer', transition:'all .12s',
            }}>{tb.label}</button>
          ))}
        </nav>

        <div style={{ flex:1 }} />

        {/* Search */}
        <button onClick={onOpenPalette} style={{
          display:'flex', alignItems:'center', gap:10, padding:'6px 10px 6px 12px',
          borderRadius:10, background:t.surfaceSoft, border:`1px solid ${t.border}`,
          color:t.ink3, fontFamily:t.fonts.sans, fontSize:12,
          cursor:'pointer', minWidth:240, letterSpacing:-0.1,
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="5.5" cy="5.5" r="4"/><path d="M8.5 8.5L12 12"/>
          </svg>
          <span style={{ flex:1, textAlign:'left' }}>Ask Elle, jump anywhere…</span>
          <span style={{ fontFamily:t.fonts.mono, fontSize:10, padding:'2px 5px', border:`1px solid ${t.border}`, borderRadius:4, color:t.ink3 }}>⌘K</span>
        </button>

        {/* Tweaks + Avatar/menu */}
        <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }}>
          <button onClick={onOpenTweaks} style={{ width:30, height:30, borderRadius:8, background:'transparent', border:`1px solid ${t.border}`, color:t.ink2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="6.5" cy="6.5" r="2"/>
              <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2M2.5 2.5l1.4 1.4M9.1 9.1l1.4 1.4M10.5 2.5L9.1 3.9M3.9 9.1L2.5 10.5"/>
            </svg>
          </button>
          <button onClick={() => setMenuOpen(o => !o)} style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg,${accent} 0%,${accent}cc 50%,${accent}88 100%)`, color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:t.fonts.sans, fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {((user?.display_name || user?.email || 'EL')).slice(0,2).toUpperCase()}
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:30, minWidth:180, background:t.surface, border:`1px solid ${t.borderStrong}`, borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.2)', overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}` }}>
                <div style={{ fontSize:12, color:t.ink, fontWeight:500 }}>{user?.display_name || user?.email}</div>
                <div style={{ fontSize:11, color:t.ink3, marginTop:2 }}>{user?.email}</div>
              </div>
              {onLogout && (
                <button onClick={() => { setMenuOpen(false); onLogout(); }}
                  style={{ width:'100%', padding:'10px 14px', background:'transparent', border:'none', color:t.ink2, fontFamily:t.fonts.sans, fontSize:13, textAlign:'left', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceSoft}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
