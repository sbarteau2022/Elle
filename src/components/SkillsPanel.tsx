// ============================================================
// SKILLS — her bucket of distilled procedures, browsable from the workbench.
// skill_list/skill_read/skill_write have no dedicated REST door (see
// lib/toolCall.ts) — every action here asks the router to reach for the
// named tool and renders its raw observation, exactly the way she'd reach
// for it mid-task.
// ============================================================
import { useState } from 'react'
import { Md } from '../lib/md'
import { callTool } from '../lib/toolCall'

const SESSION_KEY = 'elle_toolkit_skills_session'
const mono = (size = 10): React.CSSProperties => ({ fontFamily: 'var(--mono)', fontSize: size })

const btn = (accent: string, on = false): React.CSSProperties => ({
  background: on ? accent + '1f' : 'none', border: `0.5px solid ${on ? accent + '55' : 'var(--b1)'}`,
  borderRadius: 0, color: on ? accent : 'var(--t3)', cursor: 'pointer', ...mono(9.5), padding: '5px 12px',
})
const input: React.CSSProperties = {
  background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 0, color: 'var(--t1)',
  ...mono(11), padding: '6px 9px', outline: 'none',
}

function Block({ title, sub, loading, error, text, accent }: {
  title: string; sub?: string; loading: boolean; error?: string; text: string; accent: string
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{title}</span>
        {sub && <span style={{ ...mono(9.5), color: 'var(--t4)' }}>{sub}</span>}
      </div>
      {error && <div style={{ ...mono(10), color: '#D06565' }}>{error}</div>}
      {!error && loading && <div style={{ ...mono(10), color: 'var(--t4)', fontStyle: 'italic' }}>asking her…</div>}
      {!error && !loading && text && (
        <div style={{ border: '0.5px solid var(--b1)', background: 'var(--raised)', padding: '12px 14px', maxWidth: 720 }}>
          <Md text={text} />
        </div>
      )}
      {!error && !loading && !text && <div style={{ ...mono(10), color: 'var(--t4)', fontStyle: 'italic' }}>nothing yet</div>}
    </div>
  )
}

export default function SkillsPanel({ accent }: { accent: string }) {
  const [index, setIndex] = useState('')
  const [indexLoading, setIndexLoading] = useState(false)
  const [indexErr, setIndexErr] = useState('')

  const [readName, setReadName] = useState('')
  const [readText, setReadText] = useState('')
  const [readLoading, setReadLoading] = useState(false)
  const [readErr, setReadErr] = useState('')

  const [newName, setNewName] = useState('')
  const [newBody, setNewBody] = useState('')
  const [writeLoading, setWriteLoading] = useState(false)
  const [writeNote, setWriteNote] = useState('')
  const [writeErr, setWriteErr] = useState(false)

  const loadIndex = async () => {
    setIndexLoading(true); setIndexErr('')
    const r = await callTool(SESSION_KEY,
      'Call skill_list and show me her skill library index — every skill name with its one-line description, as a markdown bullet list. Nothing else.',
      'skill_list')
    if (r.error) setIndexErr(r.error)
    setIndex(r.result || r.answer)
    setIndexLoading(false)
  }

  const readSkill = async () => {
    const name = readName.trim()
    if (!name || readLoading) return
    setReadLoading(true); setReadErr(''); setReadText('')
    const r = await callTool(SESSION_KEY,
      `Call skill_read on the skill named "${name}" and show me its full content verbatim — no summary, no commentary.`,
      'skill_read')
    if (r.error) setReadErr(r.error)
    setReadText(r.result || r.answer)
    setReadLoading(false)
  }

  const writeSkill = async () => {
    const name = newName.trim(), body = newBody.trim()
    if (!name || !body || writeLoading) return
    setWriteLoading(true); setWriteNote(''); setWriteErr(false)
    const r = await callTool(SESSION_KEY,
      `Call skill_write to author a skill named "${name}" with this procedure:\n\n${body}\n\nConfirm briefly once it's saved, or report the error plainly.`,
      'skill_write')
    setWriteNote(r.error || r.result || r.answer || 'done')
    setWriteErr(!!r.error)
    setWriteLoading(false)
    if (!r.error) { setNewName(''); setNewBody(''); loadIndex() }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '22px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--t1)' }}>Skills.</span>
          <span style={{ ...mono(10), color: 'var(--t3)' }}>her distilled procedures — reachable mid-task, browsable here</span>
          <button onClick={loadIndex} disabled={indexLoading} style={{ ...btn(accent), marginLeft: 'auto' }}>
            {indexLoading ? '…' : '↻ list skills'}
          </button>
        </div>

        <Block title="index" sub="skill_list" loading={indexLoading} error={indexErr} text={index} accent={accent} />

        <div style={{ marginBottom: 26 }}>
          <div style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>read a skill</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={readName} onChange={e => setReadName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && readSkill()}
              placeholder="skill name, from the index above" style={{ ...input, flex: 1, maxWidth: 340 }} />
            <button onClick={readSkill} disabled={readLoading || !readName.trim()} style={btn(accent)}>
              {readLoading ? '…' : 'skill_read'}
            </button>
          </div>
          <Block title="procedure" loading={readLoading} error={readErr} text={readText} accent={accent} />
        </div>

        <div>
          <div style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>teach her a new skill</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="skill name" style={input} />
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="the procedure, in your own words"
              rows={5} style={{ ...input, resize: 'vertical', fontFamily: 'var(--ui)', fontSize: 12.5, lineHeight: 1.5 }} />
            <button onClick={writeSkill} disabled={writeLoading || !newName.trim() || !newBody.trim()}
              style={{ ...btn(accent), alignSelf: 'flex-start' }}>
              {writeLoading ? 'saving…' : 'skill_write'}
            </button>
            {writeNote && <div style={{ ...mono(9.5), color: writeErr ? '#D06565' : accent }}>{writeNote}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
