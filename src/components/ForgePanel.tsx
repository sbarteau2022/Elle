// ============================================================
// FORGE — take a tool into the sandbox and iterate it out, watched LIVE.
//
// The rewrite of "nothing happens." A tool is a NAME + PURPOSE + GOALS (each
// goal a boolean assertion). Shipping it runs the whole loop in the turn and
// streams every frame here:
//   LEFT  — what she's building on the box: each iteration's CODE and every
//           goal RUN with its real pass/fail, exit code, stdout/stderr.
//   RIGHT — her chain of thought: the reasoning per iteration, the heavy-model
//           REVIEW verdict, and the PR that bakes it into worker source.
//
// Two ways in: forge a tool by hand (the form), or receive a bubble the 70B
// proposed — the Ideas panel emits 'forge.ship' and we stream that idea's
// stored spec. The registry below is every tool she's forged and where each
// one stands (passing / approved / PR open).
//
// Fed by /api/elle-forge (SSE) on the worker.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'
import { on } from '../lib/commands'

type Goal = { describe: string; assert: string }
type GoalRun = { goal_id: string; describe: string; pass: boolean; exit: number; stdout: string; stderr: string; duration_ms: number }
type Iter = { iter: number; thought: string; code: string; goals: GoalRun[]; passed?: number; total?: number }
type Review = { verdict: 'approve' | 'revise'; notes: string }
type Merge = { ok: boolean; pr_number?: number; url?: string; note: string }
type Done = { status: string; iterations: number; note: string; pr_number?: number; pr_url?: string }
type RegTool = {
  id: string; name: string; description: string; language: string; forge_status: string | null
  iterations: number; review_notes: string | null; pr_number: number | null; pr_url: string | null
  runs: number; goals: Goal[]; updated_at: number
}

// A bubble handed over from the Ideas panel before this panel mounted — read
// once on mount so the ship survives the tab switch (the panel isn't listening
// until it's rendered).
let PENDING: { ideaId: string; name?: string } | null = null
export function shipIdeaToForge(ideaId: string, name?: string) { PENDING = { ideaId, name } }

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`
}

const STATUS_COLOR: Record<string, string> = {
  forging: '#5CC8C2', passing: '#7FB4D8', reviewing: '#B08FD8',
  approved: '#4ADE80', pr_open: '#4ADE80', rejected: '#D06565', failed: '#D06565',
}

export default function ForgePanel({ accent }: any) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<'python' | 'javascript'>('python')
  const [goals, setGoals] = useState<Goal[]>([{ describe: '', assert: '' }])

  const [iters, setIters] = useState<Iter[]>([])
  const [review, setReview] = useState<Review | null>(null)
  const [merge, setMerge] = useState<Merge | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [err, setErr] = useState('')
  const [reg, setReg] = useState<RegTool[]>([])
  const [ideating, setIdeating] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const loadReg = async () => {
    try {
      const r = await fetch(WORKER + '/api/elle-forge', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ op: 'registry' }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) setReg((d.tools as RegTool[]) || [])
    } catch { /* the ledger is a bonus */ }
  }
  useEffect(() => { loadReg() }, [])

  // Ship a bubble that arrived from the Ideas panel (both the pre-mount handoff
  // and the live event, so it works whether or not we were already open).
  useEffect(() => {
    if (PENDING) { const p = PENDING; PENDING = null; void run({ idea_id: p.ideaId }, p.name || 'bubble') }
    return on('forge.ship', e => { void run({ idea_id: e.ideaId }, e.name || 'bubble') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }) }, [iters, review, merge, done])

  const reset = () => { setIters([]); setReview(null); setMerge(null); setDone(null); setErr(''); setStatus('') }

  const ideate = async () => {
    setIdeating(true); setErr('')
    try {
      const r = await fetch(WORKER + '/api/elle-ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ op: 'ideate', count: 4 }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(String(d.error || `HTTP ${r.status}`))
    } catch (e: any) { setErr('ideate: ' + String(e.message || e)) }
    finally { setIdeating(false) }
  }

  // The stream: POST the spec (or an idea_id) and render frames as they land.
  const run = async (payload: Record<string, unknown>, label: string) => {
    reset(); setRunning(true); setStatus('forging'); setName(label)
    const local: Iter[] = []
    const upsert = (iter: number, patch: Partial<Iter>) => {
      let it = local.find(x => x.iter === iter)
      if (!it) { it = { iter, thought: '', code: '', goals: [] }; local.push(it) }
      Object.assign(it, patch)
      setIters([...local])
    }
    try {
      const r = await fetch(WORKER + '/api/elle-forge', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...payload, stream: true }),
      })
      const ctype = r.headers.get('content-type') || ''
      if (!r.ok || !ctype.includes('text/event-stream') || !r.body) {
        const d = await r.json().catch(() => ({})); throw new Error(String(d.error || `HTTP ${r.status}`))
      }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''
      for (;;) {
        const { value, done: eof } = await reader.read()
        if (eof) break
        buf += dec.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, sep); buf = buf.slice(sep + 2)
          let ev = '', data = ''
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) ev = line.slice(7).trim()
            else if (line.startsWith('data: ')) data += line.slice(6)
          }
          if (!data) continue
          let d: any; try { d = JSON.parse(data) } catch { continue }
          switch (ev) {
            case 'forge_start': setStatus('forging'); if (d.name) setName(d.name); break
            case 'iterate': upsert(d.iter, { thought: d.thought || '', code: d.code || '' }); break
            case 'goal_result': {
              const it = local.find(x => x.iter === d.iter) || { iter: d.iter, thought: '', code: '', goals: [] as GoalRun[] }
              if (!local.includes(it)) local.push(it)
              it.goals = [...it.goals.filter(g => g.goal_id !== d.goal_id), { goal_id: d.goal_id, describe: d.describe, pass: d.pass, exit: d.exit, stdout: d.stdout, stderr: d.stderr, duration_ms: d.duration_ms }]
              setIters([...local]); break
            }
            case 'iter_summary': upsert(d.iter, { passed: d.passed, total: d.total }); break
            case 'review': setReview({ verdict: d.verdict, notes: d.notes }); setStatus('reviewing'); break
            case 'merge': setMerge({ ok: d.ok, pr_number: d.pr_number, url: d.url, note: d.note }); break
            case 'forge_done': setDone({ status: d.status, iterations: d.iterations, note: d.note }); setStatus(d.status); break
            case 'forge_error': setErr(d.message || 'forge error'); break
            case 'done': setDone(prev => prev || { status: d.status, iterations: d.iterations, note: d.note, pr_number: d.pr_number, pr_url: d.pr_url }); break
          }
        }
      }
    } catch (e: any) { setErr(String(e.message || e)) }
    finally { setRunning(false); void loadReg() }
  }

  const canForge = name.trim().length >= 3 && description.trim().length >= 15 &&
    goals.some(g => g.describe.trim() && g.assert.trim())

  const forgeByHand = () => run({
    name: name.trim(), description: description.trim(), language,
    goals: goals.filter(g => g.describe.trim() && g.assert.trim()).map((g, i) => ({ id: `g${i + 1}`, describe: g.describe.trim(), assert: g.assert.trim() })),
  }, name.trim())

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── LEFT: what she's building on the box ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '0.5px solid var(--b1)' }}>
        <Head accent={accent} title="forge — the box, live" status={status} running={running} />
        {err && <div style={{ padding: '0 18px 6px', fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{err}</div>}
        <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {iters.length === 0 && !running && (
            <Empty>nothing forging yet — define a tool and its goals below, or ship a bubble from the ideas column. she writes the code, runs it against every goal on the box, and refines until they pass.</Empty>
          )}
          {iters.map(it => (
            <div key={it.iter} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '0.5px solid var(--b2)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>iteration {it.iter}</span>
                {it.total != null && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: it.passed === it.total ? 'var(--good)' : 'var(--t3)' }}>
                    {it.passed}/{it.total} goals pass
                  </span>
                )}
              </div>
              {it.code && (
                <pre style={{ margin: 0, padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t1)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflow: 'auto', background: 'var(--base)' }}>
                  {it.code}
                </pre>
              )}
              {it.goals.length > 0 && (
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {it.goals.map(g => <GoalCard key={g.goal_id} g={g} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: chain of thought · review · merge · forge a tool ── */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Section title="chain of thought">
            {iters.length === 0 && <Empty>her reasoning streams here as she works</Empty>}
            {iters.map(it => it.thought && (
              <div key={it.iter} style={{ borderLeft: `2px solid ${accent}44`, paddingLeft: 10 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: accent }}>iteration {it.iter}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.55, marginTop: 2 }}>{it.thought}</div>
              </div>
            ))}
          </Section>

          {review && (
            <Section title="heavy-model review">
              <div style={{ background: review.verdict === 'approve' ? '#4ADE8014' : '#E0A45C18', border: `0.5px solid ${review.verdict === 'approve' ? '#4ADE8055' : '#E0A45C55'}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: review.verdict === 'approve' ? 'var(--good)' : '#E0A45C', letterSpacing: '.06em', textTransform: 'uppercase' }}>{review.verdict}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.55, marginTop: 5, whiteSpace: 'pre-wrap' }}>{review.notes}</div>
              </div>
            </Section>
          )}

          {merge && (
            <Section title="merge — bake into worker source">
              <div style={{ background: merge.ok ? 'var(--gold-dim)' : '#D0656518', border: `0.5px solid ${merge.ok ? accent + '66' : '#D0656555'}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{merge.note}</div>
                {merge.url && <a href={merge.url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: accent, marginTop: 6, display: 'inline-block' }}>PR #{merge.pr_number} — merge on GitHub to deploy ▸</a>}
              </div>
            </Section>
          )}

          {done && (
            <div style={{ background: 'var(--float)', border: `0.5px solid ${(STATUS_COLOR[done.status] || 'var(--b1)')}55`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: STATUS_COLOR[done.status] || 'var(--t2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{done.status} · {done.iterations} iteration(s)</div>
              <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.55, marginTop: 5 }}>{done.note}</div>
            </div>
          )}

          {/* forge a tool by hand */}
          <Section title="forge a tool">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="tool name (a-z0-9_-)" disabled={running}
              style={inp} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="what it does and what it's for (the purpose)" disabled={running} rows={2}
              style={{ ...inp, fontFamily: 'var(--ui)', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['python', 'javascript'] as const).map(l => (
                <button key={l} onClick={() => setLanguage(l)} disabled={running}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `0.5px solid ${language === l ? accent + '77' : 'var(--b1)'}`, background: language === l ? accent + '22' : 'transparent', color: language === l ? accent : 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>{l}</button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>acceptance goals</div>
            {goals.map((g, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 7 }}>
                <input value={g.describe} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? { ...x, describe: e.target.value } : x))} placeholder="what this goal means" disabled={running} style={{ ...inp, marginBottom: 0, fontSize: 10.5 }} />
                <input value={g.assert} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? { ...x, assert: e.target.value } : x))} placeholder={language === 'python' ? "assert e.g. roman(4)=='IV'" : "assert e.g. slug('a b')==='a-b'"} disabled={running} style={{ ...inp, marginBottom: 0, fontSize: 10.5, color: accent }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setGoals(gs => [...gs, { describe: '', assert: '' }])} disabled={running || goals.length >= 12}
                style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--b1)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>+ goal</button>
              {goals.length > 1 && <button onClick={() => setGoals(gs => gs.slice(0, -1))} disabled={running}
                style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--b1)', background: 'transparent', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>−</button>}
              <button onClick={forgeByHand} disabled={running || !canForge}
                style={{ marginLeft: 'auto', padding: '5px 16px', borderRadius: 6, border: `0.5px solid ${accent}77`, background: accent + '22', color: accent, cursor: (running || !canForge) ? 'not-allowed' : 'pointer', opacity: canForge ? 1 : 0.5, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                {running ? 'forging…' : 'forge it ▸'}
              </button>
            </div>
            <button onClick={ideate} disabled={ideating || running}
              style={{ marginTop: 4, padding: '6px 0', borderRadius: 6, border: '0.5px solid var(--b1)', background: 'var(--raised)', color: 'var(--t2)', cursor: (ideating || running) ? 'wait' : 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
              {ideating ? 'the 70B is ideating…' : '✦ have the 70B propose tools → the idea column'}
            </button>
          </Section>

          {/* the forged-tool ledger */}
          <Section title="forged — the ledger">
            {reg.length === 0 && <Empty>nothing forged yet</Empty>}
            {reg.map(t => {
              const col = STATUS_COLOR[t.forge_status || ''] || 'var(--t4)'
              return (
                <div key={t.id} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 7, padding: '8px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--t1)', fontWeight: 500, fontFamily: 'var(--mono)' }}>{t.name}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: col, border: `0.5px solid ${col}55`, borderRadius: 4, padding: '1px 6px' }}>{t.forge_status || '—'}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)' }}>{ago(t.updated_at)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.45, marginTop: 3 }}>{t.description}</div>
                  {t.pr_url && <a href={t.pr_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: accent, marginTop: 3, display: 'inline-block' }}>PR #{t.pr_number} ▸</a>}
                </div>
              )
            })}
          </Section>
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6,
  color: 'var(--t1)', padding: '6px 9px', fontSize: 11, fontFamily: 'var(--mono)', outline: 'none', marginBottom: 6,
}

function Head({ accent, title, status, running }: { accent: string; title: string; status: string; running: boolean }) {
  const col = STATUS_COLOR[status] || accent
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 8px' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{title}</span>
      {status && (
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}`, animation: running ? 'breathe 1.4s ease-in-out infinite' : 'none' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: col, letterSpacing: '.06em' }}>{status}</span>
        </span>
      )}
    </div>
  )
}

function GoalCard({ g }: { g: GoalRun }) {
  const [open, setOpen] = useState(false)
  const col = g.pass ? 'var(--good)' : '#D06565'
  const out = g.stderr || g.stdout
  return (
    <div style={{ border: `0.5px solid ${col}44`, borderRadius: 6, padding: '6px 9px', background: g.pass ? '#4ADE8010' : '#D0656510' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: col }}>{g.pass ? '✓' : '✕'} {g.goal_id}</span>
        <span style={{ fontSize: 10.5, color: 'var(--t2)' }}>{g.describe}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>exit {g.exit} · {g.duration_ms}ms</span>
      </div>
      {out && (
        <>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer', padding: '3px 0 0' }}>
            {open ? '▾ output' : '▸ output'}
          </button>
          {open && <pre style={{ margin: '3px 0 0', fontFamily: 'var(--mono)', fontSize: 9.5, color: g.stderr ? '#D0908C' : 'var(--t3)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflow: 'auto' }}>{out}</pre>}
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  )
}
function Empty({ children }: { children: any }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', lineHeight: 1.5 }}>{children}</div>
}
