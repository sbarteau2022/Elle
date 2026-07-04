// ============================================================
// useVoice — Elle speaks, and listens.
//
// TTS: Web Speech `speechSynthesis` speaks her answers. The chosen voice is
//   the best available "en" system voice (macOS ships good ones); when AirPods
//   are connected they ARE the OS default output, so she speaks into your ears
//   with no extra wiring. The synth backend is isolated behind speak()/stop()
//   so a higher-quality provider (worker-side neural TTS) can drop in later
//   without touching callers.
// STT: Web Speech `SpeechRecognition` transcribes from the default input —
//   again, the AirPods mic when connected. Two modes through one API:
//   push-to-talk (default: one utterance, recognition ends itself) and
//   continuous ({ continuous: true }: finals stream in as you speak and the
//   session auto-restarts on end until stopListening()). VoiceContext owns
//   the continuous mode and the consent gate in front of both — nothing here
//   asks for the mic on its own.
//
// Barge-in: starting to listen stops any in-flight speech, so you can cut her
// off the way you would a person. Everything degrades to inert no-ops when the
// APIs are absent (they exist in Electron/Chromium and modern browsers).
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'

const VOICE_ENABLED_KEY = 'elle_voice_enabled'

// The known high-quality neural/enhanced system voices, best first. These are
// the difference between "robot" and "person": macOS ships Ava/Samantha/Zoe,
// Windows ships the "Natural" line, Chrome ships "Google US English". Matching
// a name here is what kills the tinny default voice.
const GOOD_VOICES = [
  'ava', 'samantha', 'zoe', 'serena', 'allison', 'susan', 'nicky', 'evan', 'nathan', 'tom',
  'aria', 'jenny', 'guy', 'michelle', 'google us english', 'natural', 'premium', 'enhanced', 'siri',
]

// Score every available voice and take the best — rather than the first match,
// which often left a flat default in place even when a neural voice existed.
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || []
  if (!voices.length) return null
  const score = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase()
    let s = 0
    const idx = GOOD_VOICES.findIndex(g => name.includes(g))
    if (idx >= 0) s += 100 - idx * 3           // earlier in the list = better
    if (/en[-_]US/i.test(v.lang)) s += 40
    else if (/^en/i.test(v.lang)) s += 20
    if (!v.localService) s += 8                // network/neural often richer
    if (/compact|eloquence|fred|albert|zarvox|novelty/i.test(name)) s -= 60 // the tinny ones
    return s
  }
  return voices.slice().sort((a, b) => score(b) - score(a))[0] || voices[0]
}

// Strip anything that reads badly aloud (stray urls, long id strings) without
// changing her words — she writes plain prose, so this is light.
function forSpeech(text: string): string {
  return String(text || '')
    .replace(/https?:\/\/\S+/g, 'a link')
    .replace(/`[^`]*`/g, '')
    .trim()
}

export interface ListenOptions {
  /** Keep transcribing across utterances; auto-restart until stopListening(). */
  continuous?: boolean
}

export interface VoiceApi {
  ttsSupported: boolean
  sttSupported: boolean
  enabled: boolean            // auto-speak her answers
  setEnabled: (v: boolean) => void
  speaking: boolean
  listening: boolean
  speak: (text: string) => void
  stopSpeaking: () => void
  startListening: (onFinal: (text: string) => void, onInterim?: (text: string) => void, opts?: ListenOptions) => void
  stopListening: () => void
}

export function useVoice(): VoiceApi {
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const sttSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const [enabled, setEnabledState] = useState<boolean>(() => localStorage.getItem(VOICE_ENABLED_KEY) === '1')
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const recRef = useRef<any>(null)
  // True while a listening session is wanted; continuous mode uses it to
  // decide whether an `onend` means "restart" or "we're done".
  const wantRef = useRef(false)

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v); localStorage.setItem(VOICE_ENABLED_KEY, v ? '1' : '0')
    if (!v && ttsSupported) { window.speechSynthesis.cancel(); setSpeaking(false) }
  }, [ttsSupported])

  // Voices load async in Chromium — resolve once available.
  useEffect(() => {
    if (!ttsSupported) return
    const load = () => { voiceRef.current = pickVoice() }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [ttsSupported])

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return
    window.speechSynthesis.cancel(); setSpeaking(false)
  }, [ttsSupported])

  const speak = useCallback((text: string) => {
    if (!ttsSupported) return
    const clean = forSpeech(text)
    if (!clean) return
    window.speechSynthesis.cancel()
    // Group sentences into LARGER blocks (~260 chars) instead of one utterance
    // per sentence. Every utterance boundary is an audible gap where the engine
    // resets its prosody — speaking sentence-by-sentence was the "staccato".
    // Blocks keep the natural intonation flowing while staying short enough to
    // dodge the long-utterance cutoff bug and let barge-in interrupt cleanly.
    const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean]
    const chunks: string[] = []
    let buf = ''
    for (const s of sentences) {
      if ((buf + s).length > 260 && buf) { chunks.push(buf.trim()); buf = s }
      else buf += s
    }
    if (buf.trim()) chunks.push(buf.trim())

    let i = 0
    const next = () => {
      if (i >= chunks.length) { setSpeaking(false); return }
      const u = new SpeechSynthesisUtterance(chunks[i++])
      if (voiceRef.current) u.voice = voiceRef.current
      u.rate = 0.98; u.pitch = 1.02   // a hair slower + warmer than the flat default
      u.onend = next
      u.onerror = () => { setSpeaking(false) }
      window.speechSynthesis.speak(u)
    }
    setSpeaking(true); next()
  }, [ttsSupported])

  const stopListening = useCallback(() => {
    wantRef.current = false
    try { recRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }, [])

  const startListening = useCallback((onFinal: (t: string) => void, onInterim?: (t: string) => void, opts?: ListenOptions) => {
    if (!sttSupported) return
    stopSpeaking() // barge-in: cut her off when you start talking
    const continuous = !!opts?.continuous
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition

    // One recognition session. Finals fire the moment the engine settles a
    // phrase (both modes), so continuous mode streams phrases instead of
    // buffering to the end. Recognition engines end sessions on their own
    // (silence, network hiccups) — in continuous mode `onend` begins a fresh
    // session while wantRef holds, which is what makes listen mode survive
    // pauses in the conversation.
    const begin = () => {
      const rec = new Rec()
      rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = continuous
      rec.onresult = (e: any) => {
        let interim = ''
        for (let k = e.resultIndex; k < e.results.length; k++) {
          const r = e.results[k]
          if (r.isFinal) { const text = String(r[0].transcript).trim(); if (text) onFinal(text) }
          else interim += r[0].transcript
        }
        if (interim && onInterim) onInterim(interim)
      }
      rec.onend = () => {
        if (continuous && wantRef.current) {
          try { begin() } catch { wantRef.current = false; setListening(false) }
        } else {
          wantRef.current = false; setListening(false)
        }
      }
      rec.onerror = (e: any) => {
        // 'no-speech' / 'aborted' are routine; onend decides whether to
        // restart. Permission errors are terminal — stop wanting the mic.
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          wantRef.current = false; setListening(false)
        }
      }
      recRef.current = rec
      rec.start()
    }

    wantRef.current = true
    try { begin(); setListening(true) } catch { wantRef.current = false; setListening(false) }
  }, [sttSupported, stopSpeaking])

  // Clean up on unmount.
  useEffect(() => () => { wantRef.current = false; try { window.speechSynthesis?.cancel() } catch {}; try { recRef.current?.stop() } catch {} }, [])

  return { ttsSupported, sttSupported, enabled, setEnabled, speaking, listening, speak, stopSpeaking, startListening, stopListening }
}
