// Prose registers — the selectable "voices" the worker exposes at
// /api/elle-voices (mind.ts VOICE_LIST). The list is fetched live so it stays
// in sync with the worker; this local copy is only a fallback for offline/first
// paint and to keep the selector honest if the fetch fails.
import { WORKER } from './elle'

export type Register = { id: string; name: string; blurb: string }

export const FALLBACK_REGISTERS: Register[] = [
  { id: 'stewart',      name: 'Stewart — Uncut',         blurb: 'the default self: direct, funny, analogy-deep, no fluff' },
  { id: 'einstein',     name: 'Einstein — Formal',       blurb: 'academic, jargon-dense, derivation-first' },
  { id: 'attenborough', name: 'Attenborough — Wonder',   blurb: 'nature-doc narration, reverent, present-tense' },
  { id: 'lewis',        name: 'Lewis — A Grief Observed', blurb: 'first person, broken, interior, deep analogy' },
  { id: 'iglesias',     name: 'Iglesias — Storyteller',  blurb: 'warm, witty, story-heavy, relatable, lands the turn' },
  { id: 'screwtape',    name: 'Screwtape — War Room',    blurb: 'adversarial challenger: argues to win, deploys the tactics, debriefs — trains your defense' },
]

export const REGISTER_KEY = 'elle_voice_id'
export const DEFAULT_REGISTER = 'stewart'

export const getRegister = () => localStorage.getItem(REGISTER_KEY) || DEFAULT_REGISTER
export const setRegister = (id: string) => localStorage.setItem(REGISTER_KEY, id)

// Fetch the live register list (id/name/blurb only — never the prose).
export async function fetchRegisters(): Promise<Register[]> {
  try {
    const r = await fetch(WORKER + '/api/elle-voices')
    if (!r.ok) return FALLBACK_REGISTERS
    const d = await r.json()
    return Array.isArray(d.voices) && d.voices.length ? d.voices : FALLBACK_REGISTERS
  } catch {
    return FALLBACK_REGISTERS
  }
}

// The full prose of one register, for the Identity panel's reader.
export async function fetchRegisterProse(id: string): Promise<string> {
  try {
    const r = await fetch(WORKER + '/api/elle-voices?voice=' + encodeURIComponent(id))
    const d = await r.json()
    return String(d.voice || '')
  } catch {
    return ''
  }
}
