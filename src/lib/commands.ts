// ============================================================
// commands — the workbench's one event bus, and the voice-command grammar.
//
// Everything that lets you drive the workbench without the keyboard flows
// through here: parsed voice commands, dictation from the continuous
// listener, and gestures from head tracking. The shell subscribes to 'nav'
// (any registered panel is reachable by voice — the plugin registry supplies
// the vocabulary); a panel that wants dictation or send/cancel subscribes to
// those and unsubscribes on unmount. Emit never throws: one bad handler
// can't take down the pipeline that's feeding it.
// ============================================================

export type WorkbenchEvent =
  | { kind: 'nav'; panel: string }            // "open trading" → switch tab
  | { kind: 'listen.stop' }                   // "stop listening" → exit listen mode
  | { kind: 'tts.stop' }                      // "quiet" → cut her off mid-sentence
  | { kind: 'tts.set'; on: boolean }          // "mute" / "voice on"
  | { kind: 'send' }                          // "send it" → submit the composer
  | { kind: 'cancel' }                        // "scratch that" → clear the composer
  | { kind: 'dictation'; text: string }       // a final phrase that wasn't a command
  | { kind: 'dictation.interim'; text: string } // words still forming, for live display
  | { kind: 'gesture.nod' }                   // embodied "yes" — confirm/send
  | { kind: 'gesture.shake' }                 // embodied "no" — cancel/stop

type Kind = WorkbenchEvent['kind']
type Of<K extends Kind> = Extract<WorkbenchEvent, { kind: K }>

const handlers = new Map<Kind, Set<(e: WorkbenchEvent) => void>>()

export function on<K extends Kind>(kind: K, fn: (e: Of<K>) => void): () => void {
  let set = handlers.get(kind)
  if (!set) { set = new Set(); handlers.set(kind, set) }
  set.add(fn as (e: WorkbenchEvent) => void)
  return () => { set!.delete(fn as (e: WorkbenchEvent) => void) }
}

export function emit(e: WorkbenchEvent): void {
  handlers.get(e.kind)?.forEach(fn => {
    try { fn(e) } catch (err) { console.error('[commands] handler failed for', e.kind, err) }
  })
}

// ── the spoken grammar ──────────────────────────────────────
// Deliberately small and literal: exact phrases, not NLU. Anything that
// doesn't parse is dictation, so a false command-match (which would eat your
// words) is worse than a miss (which just lands in the composer). An
// optional "elle," / "hey elle" prefix is stripped first.

export interface NavTarget { id: string; label: string }

export function parseCommand(raw: string, panels: NavTarget[]): WorkbenchEvent | null {
  let t = raw.toLowerCase().replace(/[.,!?;:'"]/g, ' ').replace(/\s+/g, ' ').trim()
  t = t.replace(/^(?:hey |ok |okay )?elle[, ]+/, '').trim()
  if (!t) return null

  if (/^stop (listening|dictation)$/.test(t)) return { kind: 'listen.stop' }
  if (/^(stop|stop talking|be quiet|quiet|hush)$/.test(t)) return { kind: 'tts.stop' }
  if (/^(unmute|voice on)$/.test(t)) return { kind: 'tts.set', on: true }
  if (/^(mute|voice off)$/.test(t)) return { kind: 'tts.set', on: false }
  if (/^(send|send it|ship it)$/.test(t)) return { kind: 'send' }
  if (/^(cancel|clear|never mind|nevermind|scratch that)$/.test(t)) return { kind: 'cancel' }

  const nav = t.match(/^(?:open|show|go to|switch to) (?:the )?(.+)$/)
  if (nav) {
    const want = nav[1].trim()
    const hit = panels.find(p => p.label.toLowerCase() === want || p.id.toLowerCase() === want)
    if (hit) return { kind: 'nav', panel: hit.id }
  }
  return null
}
