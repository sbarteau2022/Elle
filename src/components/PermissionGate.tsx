// ============================================================
// PermissionGate — the one and only door to the microphone.
//
// This modal is the entire consent surface: it appears only when you reach
// for a voice feature, and the mic is engaged only after the allow button.
// There is no auto-accept path — in Electron the main process default-denies
// Chromium's permission requests until this click arrives over IPC, and in
// the browser we never call the speech APIs before it. "Not now" is stored
// and respected; asking again takes another explicit click from you.
// ============================================================
export default function PermissionGate({ accent, onAllow, onDeny }: {
  accent: string; onAllow: () => void; onDeny: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,5,8,.72)', backdropFilter: 'blur(3px)' }}>
      <div className="rise" role="dialog" aria-modal="true" aria-label="microphone permission"
        style={{ width: 400, maxWidth: 'calc(100vw - 48px)', background: 'var(--float)', border: '0.5px solid var(--b1)', borderRadius: 12, padding: '26px 28px', boxShadow: '0 18px 60px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🎙</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--t1)' }}>
            She'd like to listen<span style={{ color: accent }}>.</span>
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 10 }}>
          Elle is asking for the microphone — so you can speak instead of type, and drive the
          workbench by voice ("open trading", "send it", "stop listening").
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 20 }}>
          she only hears you while the listening indicator is lit · nothing is granted
          automatically · revoke any time from the left rail
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onDeny}
            style={{ background: 'none', border: '0.5px solid var(--b1)', borderRadius: 7, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 16px' }}>
            not now
          </button>
          <button onClick={onAllow} autoFocus
            style={{ background: accent + '22', border: `0.5px solid ${accent}66`, borderRadius: 7, color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 16px' }}>
            allow the microphone
          </button>
        </div>
      </div>
    </div>
  )
}
