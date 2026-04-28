import React from 'react';
import { useTheme } from './ThemeProvider';
import { H } from './primitives';

const ACCENTS = ['#ff5a36','#7c5cff','#00d4a8','#3b82f6','#e0417a','#111111'];

export function TweaksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(12,10,8,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:340, height:'100%', background:t.surface, borderLeft:`1px solid ${t.borderStrong}`, padding:24, fontFamily:t.fonts.sans, display:'flex', flexDirection:'column', gap:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <H level={3}>Tweaks</H>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.ink3, fontSize:22, cursor:'pointer' }}>×</button>
        </div>
        <div>
          <div style={{ fontSize:12, color:t.ink3, marginBottom:10, letterSpacing:0.3, textTransform:'uppercase' }}>Theme</div>
          <div style={{ display:'flex', gap:8 }}>
            {['dark','light'].map(m => (
              <button key={m} onClick={() => t.setMode(m)} style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1px solid ${t.mode===m?t.accent:t.border}`, background:t.mode===m?t.accentSoft:'transparent', color:t.mode===m?t.accent:t.ink2, fontSize:13, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, color:t.ink3, marginBottom:10, letterSpacing:0.3, textTransform:'uppercase' }}>Accent</div>
          <div style={{ display:'flex', gap:10 }}>
            {ACCENTS.map(a => (
              <button key={a} onClick={() => t.setAccent(a)} aria-label={a} style={{ width:32, height:32, borderRadius:10, background:a, border:`2px solid ${t.accent===a?t.ink:'transparent'}`, cursor:'pointer', boxShadow:`0 2px 8px ${a}66` }} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, color:t.ink3, marginBottom:10, letterSpacing:0.3, textTransform:'uppercase' }}>Density</div>
          <div style={{ display:'flex', gap:8 }}>
            {['airy','medium','dense'].map(d => (
              <button key={d} onClick={() => t.setDensity(d)} style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1px solid ${t.density===d?t.accent:t.border}`, background:t.density===d?t.accentSoft:'transparent', color:t.density===d?t.accent:t.ink2, fontSize:12, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{d}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop:'auto', fontSize:12, color:t.ink3, lineHeight:1.5 }}>Changes apply live.</div>
      </div>
    </div>
  );
}
