// ============================================================
// A thin bridge from a purpose-built panel to one specific router tool.
// Skills and MCP have no dedicated REST door of their own — like every other
// write-tool in this app (trade_execute, forge_write, tool_forge…), they're
// only reachable by asking the router, which reasons about which tool to
// call and executes it (see EllePanel's POST /api/elle-router). This wraps
// that round trip for a panel that wants one specific tool's raw output: send
// an imperative instruction, pull the named tool's observation out of the
// trace, and fall back to her prose answer if she answered without calling
// it (still shown, so the panel never renders a dead blank).
// ============================================================
import { WORKER, getToken } from './elle'

export type ToolStep = { tool: string; args: any; result: string }

export type ToolCallResult = { steps: ToolStep[]; result: string; answer: string; error?: string }

// Each caller passes its own localStorage key so its scratch session stays
// separate from the elle chat panel's conversation thread (and from every
// other toolkit sub-panel) — asking mcp_library shouldn't show up in the
// main conversation history, and shouldn't share state with skill_list either.
export function toolSession(key: string): string {
  let s = localStorage.getItem(key)
  if (!s) { s = crypto.randomUUID(); localStorage.setItem(key, s) }
  return s
}

export async function callTool(sessionKey: string, prompt: string, expectTool?: string): Promise<ToolCallResult> {
  const session = toolSession(sessionKey)
  try {
    const r = await fetch(WORKER + '/api/elle-router', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ q: prompt, session_id: session }),
    })
    const d = await r.json()
    if (!r.ok || d.error) return { steps: [], result: '', answer: '', error: d.error || `HTTP ${r.status}` }
    const steps: ToolStep[] = d.trace || []
    const hit = expectTool ? steps.find(s => s.tool === expectTool) : steps[steps.length - 1]
    return { steps, result: hit ? String(hit.result || '') : '', answer: d.answer || '' }
  } catch (e: any) {
    return { steps: [], result: '', answer: '', error: e.message || String(e) }
  }
}
