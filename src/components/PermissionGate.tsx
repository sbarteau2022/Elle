// ============================================================
// PermissionGate — the one and only door to the microphone or the camera.
//
// This modal is the entire consent surface for whichever device it's asked
// about: it appears only when you reach for a voice or visual feature, and
// the device is engaged only after the allow button. There is no auto-accept
// path — in Electron the main process default-denies Chromium's permission
// requests until this click arrives over IPC, and in the browser we never
// call getUserMedia before it. "Not now" is stored and respected; asking
// again takes another explicit click from you.
// ============================================================
const COPY = {
  microphone: {
    icon: '🎙', verb: 'listen',
    body: 'Elle is asking for the microphone — so you can speak instead of type, and drive the workbench by voice ("open trading", "send it", "stop listening").',
    hint: 'she only hears you while the listening indicator is lit',
  },
  camera: {
    icon: '📷', verb: 'see',
    body: 'Elle is asking for the camera — so she can look at what you show her, on your click, and describe it.',
    hint: 'she only sees a single frame when you press capture — never a live feed',
  },
} as const

export default function PermissionGate({ accent, kind = 'microphone', onAllow, onDeny }: {
  accent: string; kind?: 'microphone' | 'camera'; onAllow: () => void; onDeny: () => void
}) {
  const c = COPY[kind]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,5,8,.72)', backdropFilter: 'blur(3px)' }}>
      <div className="rise" role="dialog" aria-modal="true" aria-label={`${kind} permission`}
        style={{ width: 400, maxWidth: 'calc(100vw - 48px)', background: 'var(--float)', border: '0.5px solid var(--b1)', borderRadius: 12, padding: '26px 28px', boxShadow: '0 18px 60px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>{c.icon}</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--t1)' }}>
            She'd like to {c.verb}<span style={{ color: accent }}>.</span>
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 10 }}>
          {c.body}
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 20 }}>
          {c.hint} · nothing is granted automatically · revoke any time from the left rail
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onDeny}
            style={{ background: 'none', border: '0.5px solid var(--b1)', borderRadius: 7, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 16px' }}>
            not now
          </button>
          <button onClick={onAllow} autoFocus
            style={{ background: accent + '22', border: `0.5px solid ${accent}66`, borderRadius: 7, color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 16px' }}>
            allow the {kind}
          </button>
        </div>
      </div>
    </div>
  )
}
