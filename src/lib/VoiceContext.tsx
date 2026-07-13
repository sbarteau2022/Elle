// ============================================================
// VoiceContext — one voice, one mic policy, for the whole workbench.
//
// Everything ear-and-mouth shaped is owned here so the workbench has exactly
// one recognition session, one TTS pipeline, one presence stream, and — the
// part that matters — ONE door to the microphone:
//
//   · Nothing requests the mic at startup, ever. The PermissionGate modal
//     appears only when you explicitly reach for a voice feature, and the
//     mic is engaged only after you click allow. "Not now" is remembered.
//   · In Electron, consent is enforced below the renderer too: main.cjs
//     default-denies Chromium permission requests, and only flips to allow
//     after your click arrives over IPC (setPermission). A compromised page
//     can't self-grant.
//   · Revoking (rail control) drops both the renderer state and the
//     main-process grant, and kills any live listening session.
//
// Listen mode is the continuous ear: finals stream in; each one is parsed
// against the spoken grammar (commands.ts). Commands act — "open trading"
// navigates, "quiet" cuts her off, "stop listening" closes the ear. Plain
// speech is emitted as dictation for whichever panel is subscribed; nothing
// is ever auto-sent — sending takes an explicit "send", a nod, or Enter.
//
// Gestures ride the same bus: while listen mode is on, a nod emits
// gesture.nod (confirm/send) and a head-shake emits gesture.shake
// (cancel). A shake also cuts her speech any time — an embodied "no".
// ============================================================
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useVoice, type VoiceApi } from './useVoice'
import { usePresence, type Presence } from './usePresence'
import { emit, on, parseCommand } from './commands'
import { listPanels } from '../plugins/registry'
import PermissionGate from '../components/PermissionGate'

export type MicConsent = 'granted' | 'denied' | null
const MIC_CONSENT_KEY = 'elle_mic_consent'

export interface WorkbenchVoice {
  voice: VoiceApi
  presence: Presence
  micConsent: MicConsent
  /** Ask for the mic. Opens the consent gate unless already granted; resolves with the decision. */
  requestMic: () => Promise<boolean>
  /** Drop mic consent everywhere and stop any live listening. */
  revokeMic: () => void
  listenMode: boolean
  toggleListenMode: () => void
}

const Ctx = createContext<WorkbenchVoice | null>(null)

export function useWorkbenchVoice(): WorkbenchVoice {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkbenchVoice must be used inside <VoiceProvider>')
  return v
}

export function VoiceProvider({ accent, children }: { accent: string; children: ReactNode }) {
  const voice = useVoice()
  const presence = usePresence()

  // Her own TTS leaking back through the mic would transcribe her answers
  // into the composer. Cheap, robust guard: drop anything heard while she's
  // speaking — voice.isSpeaking() covers both the system voice and
  // ElevenLabs playback. (With AirPods there's no acoustic path at all;
  // this covers open speakers.)
  const herOwnVoice = () => voice.isSpeaking()

  const [micConsent, setMicConsent] = useState<MicConsent>(() => {
    const v = localStorage.getItem(MIC_CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  })
  const [listenMode, setListenModeState] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const gateResolve = useRef<((ok: boolean) => void) | null>(null)
  const listenModeRef = useRef(false)

  // A consent you granted in a past session re-arms the main-process grant on
  // boot — that's persistence of YOUR earlier decision, not an auto-accept:
  // the mic still stays cold until a feature explicitly starts listening.
  useEffect(() => {
    if (micConsent === 'granted') window.elleNative?.setPermission?.('microphone', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const decide = useCallback((ok: boolean) => {
    setGateOpen(false)
    const next: MicConsent = ok ? 'granted' : 'denied'
    localStorage.setItem(MIC_CONSENT_KEY, next)
    setMicConsent(next)
    window.elleNative?.setPermission?.('microphone', ok)
    gateResolve.current?.(ok)
    gateResolve.current = null
  }, [])

  const requestMic = useCallback((): Promise<boolean> => {
    if (micConsent === 'granted') return Promise.resolve(true)
    // Previously denied still re-asks — but only because a click landed here.
    setGateOpen(true)
    return new Promise(res => {
      gateResolve.current?.(false) // a second ask supersedes a dangling one
      gateResolve.current = res
    })
  }, [micConsent])

  const stopListen = useCallback(() => {
    listenModeRef.current = false
    setListenModeState(false)
    voice.stopListening()
  }, [voice])

  const revokeMic = useCallback(() => {
    localStorage.setItem(MIC_CONSENT_KEY, 'denied')
    setMicConsent('denied')
    window.elleNative?.setPermission?.('microphone', false)
    stopListen()
  }, [stopListen])

  const startListen = useCallback(() => {
    listenModeRef.current = true
    setListenModeState(true)
    voice.startListening(
      (text) => {
        if (herOwnVoice()) return
        const cmd = parseCommand(text, listPanels().map(p => ({ id: p.id, label: p.label })))
        if (!cmd) { emit({ kind: 'dictation', text }); return }
        switch (cmd.kind) {
          case 'listen.stop': stopListen(); break
          case 'tts.stop': voice.stopSpeaking(); break
          case 'tts.set': voice.setEnabled(cmd.on); break
          default: emit(cmd) // nav / send / cancel — the shell and panels act
        }
      },
      (interim) => { if (!herOwnVoice()) emit({ kind: 'dictation.interim', text: interim }) },
      { continuous: true },
    )
  }, [voice, stopListen])

  const toggleListenMode = useCallback(() => {
    if (listenModeRef.current) { stopListen(); return }
    requestMic().then(ok => { if (ok) startListen() })
  }, [requestMic, startListen, stopListen])

  // "stop listening" spoken, or any panel emitting listen.stop, closes the ear.
  useEffect(() => on('listen.stop', stopListen), [stopListen])

  // If recognition dies underneath us (revoked at the OS level, engine gone),
  // don't keep showing a lit ear that isn't hearing anything.
  useEffect(() => {
    if (listenMode && !voice.listening) { listenModeRef.current = false; setListenModeState(false) }
  }, [voice.listening, listenMode])

  // Gestures → commands. Nod only means "send" while the ear is open (natural
  // head movement outside listen mode must never fire a message). A shake is
  // always an interrupt — cutting her off mid-answer is barge-in, not a send.
  useEffect(() => {
    if (presence.nod && listenModeRef.current) emit({ kind: 'gesture.nod' })
  }, [presence.nod])
  useEffect(() => {
    if (presence.shake) {
      voice.stopSpeaking()
      if (listenModeRef.current) emit({ kind: 'gesture.shake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presence.shake])

  return (
    <Ctx.Provider value={{ voice, presence, micConsent, requestMic, revokeMic, listenMode, toggleListenMode }}>
      {children}
      {gateOpen && <PermissionGate accent={accent} onAllow={() => decide(true)} onDeny={() => decide(false)} />}
    </Ctx.Provider>
  )
}
