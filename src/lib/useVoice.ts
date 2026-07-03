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
//   again, the AirPods mic when connected — into the composer. Interim results
//   stream so you see words appear as you talk; the final result fires onFinal.
//
// Barge-in: starting to listen stops any in-flight speech, so you can cut her
// off the way you would a person. Everything degrades to inert no-ops when the
// APIs are absent (they exist in Electron/Chromium and modern browsers).
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'

const VOICE_ENABLED_KEY = 'elle_voice_enabled'

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || []
  if (!voices.length) return null
  // Prefer a natural en-US voice; fall back to any en, then anything.
  const prefer = [
    (v: SpeechSynthesisVoice) => /en[-_]US/i.test(v.lang) && /natural|premium|siri|samantha|ava|allison/i.test(v.name),
    (v: SpeechSynthesisVoice) => /en[-_]US/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /^en/i.test(v.lang),
    () => true,
  ]
  for (const test of prefer) { const hit = voices.find(test); if (hit) return hit }
  return voices[0]
}

// Strip anything that reads badly aloud (stray urls, long id strings) without
// changing her words — she writes plain prose, so this is light.
function forSpeech(text: string): string {
  return String(text || '')
    .replace(/https?:\/\/\S+/g, 'a link')
    .replace(/`[^`]*`/g, '')
    .trim()
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
  startListening: (onFinal: (text: string) => void, onInterim?: (text: string) => void) => void
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
    // Chunk on sentence boundaries: long single utterances get cut off by the
    // synth in some engines, and chunking lets barge-in interrupt cleanly.
    const chunks = clean.match(/[^.!?…]+[.!?…]*/g) || [clean]
    let i = 0
    const next = () => {
      if (i >= chunks.length) { setSpeaking(false); return }
      const u = new SpeechSynthesisUtterance(chunks[i++].trim())
      if (voiceRef.current) u.voice = voiceRef.current
      u.rate = 1.0; u.pitch = 1.0
      u.onend = next
      u.onerror = () => { setSpeaking(false) }
      window.speechSynthesis.speak(u)
    }
    setSpeaking(true); next()
  }, [ttsSupported])

  const stopListening = useCallback(() => {
    try { recRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }, [])

  const startListening = useCallback((onFinal: (t: string) => void, onInterim?: (t: string) => void) => {
    if (!sttSupported) return
    stopSpeaking() // barge-in: cut her off when you start talking
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new Rec()
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const r = e.results[k]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      if (interim && onInterim) onInterim(interim)
    }
    rec.onend = () => { setListening(false); if (finalText.trim()) onFinal(finalText.trim()) }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }, [sttSupported, stopSpeaking])

  // Clean up on unmount.
  useEffect(() => () => { try { window.speechSynthesis?.cancel() } catch {}; try { recRef.current?.stop() } catch {} }, [])

  return { ttsSupported, sttSupported, enabled, setEnabled, speaking, listening, speak, stopSpeaking, startListening, stopListening }
}
