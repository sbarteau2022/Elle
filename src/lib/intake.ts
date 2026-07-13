// ============================================================
// INTAKE — the error-proofed lane from this machine into her memory.
//
// capture → local encode (Qwen-VL description, prosody → text) → local embed
// (bge-large via the preload bridge — the worker's own weights) → one thin
// POST to /api/elle-intake, which hands it to memWrite, the kernel's single
// write path. The design rule, from the memory-kernel spec's postmortem:
// every failure is VISIBLE and every failure has a NAMED lane —
//
//   local embed ok      → send { content, vector }   lane: 'local'
//   local embed fails   → send { content }            lane: 'cloud'
//                         (worker embeds on Workers AI — same weights,
//                          same space; nothing lost but locality)
//   worker rejects the vector (400 naming why — wrong dims = wrong model
//   tag) → ONE retry without the vector                lane: 'cloud-retry'
//   worker unreachable  → { error } returned to the caller with the reason;
//                         the caller still holds the content. Nothing is
//                         silently dropped, nothing pretends to have landed.
//
// Every degradation is console.error'd at the moment it happens (never a
// bare catch), and the result names which lane actually ran, so "it worked"
// is always auditable one hop deep.
// ============================================================
import { WORKER, getToken } from './elle'

export type IntakeLane = 'local' | 'cloud' | 'cloud-retry'

export type IntakeResult =
  | { ok: true; id: string; lane: IntakeLane; embeddedVia: string; warning?: string }
  | { ok: false; error: string }

export interface IntakeOpts {
  content: string
  type?: 'observation' | 'insight' | 'preference' | 'identity' | 'fact' | 'task' | 'deliberate'
  importance?: number
  tags?: string[]
  sessionId?: string
  sourceEngine?: string   // every writer names itself — kernel spec §3.1
}

async function post(body: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const r = await fetch(`${WORKER}/api/elle-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  return { status: r.status, data: await r.json().catch(() => ({})) }
}

export async function intakeMemory(o: IntakeOpts): Promise<IntakeResult> {
  const content = (o.content || '').trim()
  if (!content) return { ok: false, error: 'nothing to intake — content is empty' }

  const base: Record<string, unknown> = {
    content,
    type: o.type,
    importance: o.importance,
    tags: o.tags,
    session_id: o.sessionId,
    source_engine: o.sourceEngine || 'workbench_intake',
  }

  // Lane 1: embed locally on the worker's own weights. Absent bridge (plain
  // browser) or any embed failure → named degradation to the cloud lane.
  let vector: number[] | null = null
  let localWarning: string | undefined
  const bridge = window.elleNative?.embedLocal
  if (bridge) {
    try {
      const e = await bridge(content)
      if (e.ok) vector = e.vector
      else {
        localWarning = `local embed unavailable (${e.error}) — embedding server-side`
        console.error('[INTAKE]', localWarning)
      }
    } catch (err: any) {
      localWarning = `local embed bridge threw (${err?.message || err}) — embedding server-side`
      console.error('[INTAKE]', localWarning)
    }
  }

  try {
    if (vector) {
      const r1 = await post({ ...base, vector })
      if (r1.status === 200 && r1.data?.ok) {
        return { ok: true, id: r1.data.id, lane: 'local', embeddedVia: r1.data.embedded_via }
      }
      // The worker names exactly what was wrong with the vector (dims =
      // wrong model tag, non-finite, all-zero). Surface it, then retry once
      // WITHOUT the vector — content must not be lost to an embed defect.
      const why = r1.data?.error || `HTTP ${r1.status}`
      console.error(`[INTAKE] worker rejected the local vector (${why}) — retrying without it`)
      const r2 = await post(base)
      if (r2.status === 200 && r2.data?.ok) {
        return { ok: true, id: r2.data.id, lane: 'cloud-retry', embeddedVia: r2.data.embedded_via, warning: `local vector rejected: ${why}` }
      }
      return { ok: false, error: `intake failed on both lanes — vector rejected (${why}), then ${r2.data?.error || `HTTP ${r2.status}`}` }
    }

    const r = await post(base)
    if (r.status === 200 && r.data?.ok) {
      return { ok: true, id: r.data.id, lane: 'cloud', embeddedVia: r.data.embedded_via, warning: localWarning }
    }
    return { ok: false, error: r.data?.error || `HTTP ${r.status}` }
  } catch (err: any) {
    // Worker unreachable. The caller still holds the content — say so
    // plainly instead of pretending anything landed.
    const msg = `worker unreachable (${err?.message || err}) — nothing was written; the content is still yours to retry`
    console.error('[INTAKE]', msg)
    return { ok: false, error: msg }
  }
}
