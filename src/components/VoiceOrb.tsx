// A small living presence: an orb that breathes when idle, pulses when she's
// speaking, ripples when you're talking, and — when AirPods head tracking is
// live — leans with your head so it feels like she's tracking you. Pure visual;
// all state comes in as props.
import type { Presence } from '../lib/usePresence'

export default function VoiceOrb({ accent, speaking, listening, presence }: {
  accent: string; speaking: boolean; listening: boolean; presence: Presence
}) {
  const { available, pose, away, nod } = presence
  // Head yaw/pitch nudges the orb a few px so it "tracks" you.
  const dx = available ? Math.max(-6, Math.min(6, -pose.yaw * 14)) : 0
  const dy = available ? Math.max(-5, Math.min(5, pose.pitch * 12)) : 0
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle'
  const color = away ? 'var(--t4)' : accent

  return (
    <div title={available ? (away ? 'you turned away — she\'ll wait' : 'she\'s tracking you') : ''}
      style={{ width: 26, height: 26, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{
        position: 'absolute', width: 26, height: 26, borderRadius: '50%',
        border: `1px solid ${color}`, opacity: state === 'listening' ? 0.9 : 0.25,
        transform: `translate(${dx}px,${dy}px)`,
        animation: state === 'listening' ? 'orbRipple 1.1s ease-out infinite' : 'none',
        transition: 'transform .12s ease, opacity .2s',
      }} />
      <span style={{
        width: nod ? 13 : 9, height: nod ? 13 : 9, borderRadius: '50%',
        background: color, transform: `translate(${dx}px,${dy}px)`,
        boxShadow: state !== 'idle' ? `0 0 10px ${color}` : `0 0 5px ${color}88`,
        animation: state === 'speaking' ? 'orbSpeak .5s ease-in-out infinite' : state === 'idle' ? 'orbBreathe 3.4s ease-in-out infinite' : 'none',
        transition: 'transform .12s ease, width .18s, height .18s',
      }} />
      <style>{`
        @keyframes orbBreathe{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        @keyframes orbSpeak{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}
        @keyframes orbRipple{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.5);opacity:0}}
      `}</style>
    </div>
  )
}
