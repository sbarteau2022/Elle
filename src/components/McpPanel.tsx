// ============================================================
// MCP — the connector shelf, from the workbench.
// mcp_library/mcp_add/mcp_tools have no dedicated REST door (see
// lib/toolCall.ts) — this asks the router to reach for the named tool and
// renders its raw observation, the same bridge SkillsPanel uses.
// ============================================================
import { useState } from 'react'
import { Md } from '../lib/md'
import { callTool } from '../lib/toolCall'

const SESSION_KEY = 'elle_toolkit_mcp_session'
const mono = (size = 10): React.CSSProperties => ({ fontFamily: 'var(--mono)', fontSize: size })

const btn = (accent: string): React.CSSProperties => ({
  background: 'none', border: '0.5px solid var(--b1)', borderRadius: 0, color: 'var(--t3)',
  cursor: 'pointer', ...mono(9.5), padding: '5px 12px',
})
const input: React.CSSProperties = {
  background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 0, color: 'var(--t1)',
  ...mono(11), padding: '6px 9px', outline: 'none',
}

function Block({ loading, error, text }: { loading: boolean; error?: string; text: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
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

export default function McpPanel({ accent }: { accent: string }) {
  const [shelf, setShelf] = useState('')
  const [shelfLoading, setShelfLoading] = useState(false)
  const [shelfErr, setShelfErr] = useState('')

  const [mounted, setMounted] = useState('')
  const [mountedLoading, setMountedLoading] = useState(false)
  const [mountedErr, setMountedErr] = useState('')

  const [name, setName] = useState('')
  const [mountLoading, setMountLoading] = useState(false)
  const [mountNote, setMountNote] = useState('')
  const [mountErr, setMountErr] = useState(false)

  const loadShelf = async () => {
    setShelfLoading(true); setShelfErr('')
    const r = await callTool(SESSION_KEY,
      'Call mcp_library and show me the curated MCP connector shelf — every connector name with a one-line description, as a markdown bullet list. Nothing else.',
      'mcp_library')
    if (r.error) setShelfErr(r.error)
    setShelf(r.result || r.answer)
    setShelfLoading(false)
  }

  const loadMounted = async () => {
    setMountedLoading(true); setMountedErr('')
    const r = await callTool(SESSION_KEY,
      'Call mcp_tools and list the MCP servers currently mounted along with the tools each exposes. Be concise.',
      'mcp_tools')
    if (r.error) setMountedErr(r.error)
    setMounted(r.result || r.answer)
    setMountedLoading(false)
  }

  const mount = async () => {
    const n = name.trim()
    if (!n || mountLoading) return
    setMountLoading(true); setMountNote(''); setMountErr(false)
    const r = await callTool(SESSION_KEY,
      `Call mcp_add to mount the MCP connector "${n}". Confirm briefly once it's mounted, or report the error plainly.`,
      'mcp_add')
    setMountNote(r.error || r.result || r.answer || 'done')
    setMountErr(!!r.error)
    setMountLoading(false)
    if (!r.error) { setName(''); loadMounted() }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '22px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--t1)' }}>MCP.</span>
          <span style={{ ...mono(10), color: 'var(--t3)' }}>the connector shelf — mount external tool servers by name</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase' }}>shelf</span>
          <span style={{ ...mono(9.5), color: 'var(--t4)' }}>mcp_library</span>
          <button onClick={loadShelf} disabled={shelfLoading} style={{ ...btn(accent), marginLeft: 'auto' }}>
            {shelfLoading ? '…' : '↻ browse'}
          </button>
        </div>
        <Block loading={shelfLoading} error={shelfErr} text={shelf} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase' }}>mounted now</span>
          <span style={{ ...mono(9.5), color: 'var(--t4)' }}>mcp_tools</span>
          <button onClick={loadMounted} disabled={mountedLoading} style={{ ...btn(accent), marginLeft: 'auto' }}>
            {mountedLoading ? '…' : '↻ refresh'}
          </button>
        </div>
        <Block loading={mountedLoading} error={mountedErr} text={mounted} />

        <div>
          <div style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>mount a connector</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && mount()}
              placeholder="connector name or URL, from the shelf above" style={{ ...input, flex: 1, maxWidth: 340 }} />
            <button onClick={mount} disabled={mountLoading || !name.trim()} style={btn(accent)}>
              {mountLoading ? 'mounting…' : 'mcp_add'}
            </button>
          </div>
          {mountNote && <div style={{ ...mono(9.5), color: mountErr ? '#D06565' : accent, marginTop: 8 }}>{mountNote}</div>}
        </div>
      </div>
    </div>
  )
}
