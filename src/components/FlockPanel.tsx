// ============================================================
// FLOCK — the workbench face of elle-worker's src/flock.ts.
//
// One brain for running many brands' social presence. The brand kit (left
// rail) is the continuity source; everything on the right conditions on it:
//   STUDIO  — brief → on-brand concepts → captions, each gate-checked by the
//             Brand Guardian (a 0-100 continuity score, per-dimension).
//   IMAGE   — brand-conditioned generation + AI edit. Runs on Cloudflare
//             Workers AI today; the status strip shows when a sovereign
//             (self-hosted) image model is wired instead — same UI, your model.
//   FLOCK   — one post, many channels; review gates publish; publish fans out.
//   ASSETS  — everything generated for the active brand.
//
// Every call is POST /api/flock {action, …}; generated media is served back
// from the worker by unguessable id (/flock/asset/…).
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Brand = {
  id: string; name: string; mission?: string; voice?: string; audience?: string
  palette?: string; fonts?: string; taboos?: string; keywords?: string; visual_style?: string
}
type Concept = { hook: string; angle: string; format: string; image_prompt: string; rationale: string }
type Continuity = {
  score: number
  dimensions: { voice: number; palette: number; values: number; audience: number }
  issues: string[]; fixes: string[]; verdict: 'on-brand' | 'needs-work' | 'off-brand'
}
type Asset = { id: string; kind: string; prompt?: string; provider?: string; model?: string; status: string; url: string | null }
type Channel = { id: string; platform: string; handle?: string; status: string }
type Post = { id: string; title?: string; caption?: string; status: string; continuity_score?: number | null }
type Status = { image_provider: string; sovereign_image_configured: boolean; video_configured: boolean; platforms: string[] }

const post = async (body: any) => {
  const r = await fetch(WORKER + '/api/flock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
  return d
}

const mono = 'var(--mono)'
const label = (color = 'var(--t4)'): React.CSSProperties => ({ fontFamily: mono, fontSize: 9, color, letterSpacing: '.14em', textTransform: 'uppercase' })
const field: React.CSSProperties = { width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '8px 11px', fontSize: 12, fontFamily: 'var(--ui)', outline: 'none', boxSizing: 'border-box' }
const btn = (accent: string, on = true): React.CSSProperties => ({
  background: on ? accent : 'var(--raised)', color: on ? '#0B0C10' : 'var(--t3)',
  border: '0.5px solid var(--b1)', borderRadius: 6, padding: '7px 13px', fontFamily: mono,
  fontSize: 10.5, letterSpacing: '.06em', cursor: on ? 'pointer' : 'default', textTransform: 'uppercase',
})

function ScoreBar({ score, accent }: { score: number; accent: string }) {
  const color = score >= 80 ? '#6FCF97' : score >= 55 ? accent : '#D06565'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--ov)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 11, color, minWidth: 28, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

function ContinuityCard({ c, accent }: { c: Continuity; accent: string }) {
  return (
    <div style={{ marginTop: 10, padding: 12, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={label()}>brand continuity</span>
        <span style={{ ...label(c.verdict === 'on-brand' ? '#6FCF97' : c.verdict === 'off-brand' ? '#D06565' : accent) }}>{c.verdict}</span>
      </div>
      <ScoreBar score={c.score} accent={accent} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 10 }}>
        {(['voice', 'palette', 'values', 'audience'] as const).map(k => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={label()}>{k}</span>
            <ScoreBar score={c.dimensions[k]} accent={accent} />
          </div>
        ))}
      </div>
      {!!c.fixes.length && (
        <div style={{ marginTop: 10 }}>
          <span style={label()}>fixes</span>
          <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: 'var(--t2)', fontSize: 11.5 }}>
            {c.fixes.map((f, i) => <li key={i} style={{ marginBottom: 2 }}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function FlockPanel({ accent = '#C9A84C' }: { accent?: string }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [active, setActive] = useState<Brand | null>(null)
  const [tab, setTab] = useState<'studio' | 'image' | 'flock' | 'assets'>('studio')
  const [editing, setEditing] = useState<Partial<Brand> | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [imageSeed, setImageSeedState] = useState('')
  // A Studio concept can hand its visual direction to the Image tab.
  const seedImage = (p: string) => { setImageSeedState(p); setTab('image') }

  const loadBrands = useCallback(async () => {
    try { const d = await post({ action: 'brand.list' }); setBrands(d.brands || []) } catch (e) { setError(String((e as Error).message)) }
  }, [])

  useEffect(() => {
    post({ action: 'status' }).then(setStatus).catch(() => {})
    loadBrands()
  }, [loadBrands])

  useEffect(() => { if (!active && brands.length) setActive(brands[0]) }, [brands, active])

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name); setError('')
    try { await fn() } catch (e) { setError(String((e as Error).message)) } finally { setBusy('') }
  }

  const saveBrand = () => run('brand', async () => {
    if (!editing?.name?.trim()) { setError('name required'); return }
    const payload: any = {
      action: editing.id ? 'brand.update' : 'brand.create',
      brand_id: editing.id, name: editing.name, mission: editing.mission, voice: editing.voice,
      audience: editing.audience, fonts: editing.fonts, taboos: editing.taboos, visual_style: editing.visual_style,
      palette: (editing.palette || '').split(',').map(s => s.trim()).filter(Boolean).map(hex => ({ hex })),
      keywords: (editing.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
    }
    const d = await post(payload)
    setEditing(null); await loadBrands(); if (d.brand) setActive(d.brand)
  })

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── brand rail ── */}
      <div style={{ width: 264, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={label()}>{brands.length} brand{brands.length === 1 ? '' : 's'}</span>
            <button onClick={() => setEditing({})} style={{ ...btn(accent, false), padding: '4px 9px' }}>+ new</button>
          </div>
          {status && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <span title="image generation backend" style={{ ...label(status.sovereign_image_configured ? '#6FCF97' : accent), border: '0.5px solid var(--b1)', borderRadius: 4, padding: '2px 6px' }}>
                img: {status.sovereign_image_configured ? 'sovereign' : status.image_provider}
              </span>
              <span title="text-to-video provider" style={{ ...label(status.video_configured ? '#6FCF97' : 'var(--t4)'), border: '0.5px solid var(--b1)', borderRadius: 4, padding: '2px 6px' }}>
                video: {status.video_configured ? 'ready' : 'stub'}
              </span>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {brands.map(b => (
            <button key={b.id} onClick={() => setActive(b)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: active?.id === b.id ? 'var(--raised)' : 'none', border: '0.5px solid ' + (active?.id === b.id ? accent : 'transparent'), borderRadius: 7, padding: '9px 11px', marginBottom: 4, cursor: 'pointer' }}>
              <div style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 500 }}>{b.name}</div>
              {b.voice && <div style={{ color: 'var(--t3)', fontSize: 10.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.voice}</div>}
            </button>
          ))}
          {!brands.length && <div style={{ color: 'var(--t4)', fontSize: 11.5, padding: 10, fontFamily: mono }}>no brands yet — create one to begin.</div>}
        </div>
      </div>

      {/* ── main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, padding: '10px 14px', borderBottom: '0.5px solid var(--b1)', alignItems: 'center' }}>
          {(['studio', 'image', 'flock', 'assets'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: tab === t ? 'var(--raised)' : 'none', color: tab === t ? 'var(--t1)' : 'var(--t3)', border: '0.5px solid ' + (tab === t ? 'var(--b1)' : 'transparent'), borderRadius: 6, padding: '6px 13px', fontFamily: mono, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          {active && <button onClick={() => setEditing(active)} style={{ ...btn(accent, false), padding: '5px 11px' }}>edit kit</button>}
        </div>

        {error && <div style={{ margin: '10px 14px 0', padding: '8px 11px', background: '#D0656522', border: '0.5px solid #D0656555', borderRadius: 6, color: '#E39898', fontSize: 11.5, fontFamily: mono }}>{error}</div>}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!active ? (
            <div style={{ color: 'var(--t4)', fontFamily: mono, fontSize: 12 }}>Select or create a brand.</div>
          ) : tab === 'studio' ? <Studio brand={active} accent={accent} busy={busy} run={run} setImageSeed={seedImage} />
            : tab === 'image' ? <ImageStudio brand={active} accent={accent} busy={busy} run={run} seed={imageSeed} />
              : tab === 'flock' ? <Flock brand={active} accent={accent} busy={busy} run={run} platforms={status?.platforms || []} />
                : <Assets brand={active} accent={accent} />}
        </div>
      </div>

      {/* ── brand kit editor ── */}
      {editing && (
        <BrandEditor editing={editing} setEditing={setEditing} accent={accent} onSave={saveBrand} busy={busy === 'brand'} />
      )}
    </div>
  )
}

// ── Studio tab ─────────────────────────────────────────────────────────────
function Studio({ brand, accent, busy, run, setImageSeed }: any) {
  const [brief, setBrief] = useState('')
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [caption, setCaption] = useState<Record<number, { caption: string; hashtags: string[]; cta?: string }>>({})
  const [cont, setCont] = useState<Record<number, Continuity>>({})

  const ideate = () => run('ideate', async () => {
    const d = await post({ action: 'content.ideate', brand_id: brand.id, brief, count: 3 })
    setConcepts(d.concepts || []); setCaption({}); setCont({})
  })
  const writeCaption = (i: number, c: Concept) => run('cap' + i, async () => {
    const d = await post({ action: 'content.caption', brand_id: brand.id, concept: `${c.hook} — ${c.angle}` })
    setCaption(s => ({ ...s, [i]: d }))
  })
  const check = (i: number, c: Concept) => run('chk' + i, async () => {
    const cap = caption[i]
    const d = await post({ action: 'content.continuity', brand_id: brand.id, draft: { caption: cap?.caption, hashtags: cap?.hashtags, image_prompt: c.image_prompt } })
    setCont(s => ({ ...s, [i]: d.continuity }))
  })

  return (
    <div style={{ maxWidth: 760 }}>
      <span style={label()}>campaign brief</span>
      <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3} placeholder={`What are we posting about for ${brand.name}?`} style={{ ...field, marginTop: 6, resize: 'vertical', fontFamily: 'var(--ui)' }} />
      <button disabled={!!busy || !brief.trim()} onClick={ideate} style={{ ...btn(accent, !busy && !!brief.trim()), marginTop: 10 }}>{busy === 'ideate' ? 'thinking…' : 'ideate concepts'}</button>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {concepts.map((c, i) => (
          <div key={i} style={{ padding: 14, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 9 }}>
            <div style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 600 }}>{c.hook}</div>
            <div style={{ color: 'var(--t2)', fontSize: 12, marginTop: 4 }}>{c.angle}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ ...label(accent), border: '0.5px solid var(--b1)', borderRadius: 4, padding: '2px 6px' }}>{c.format}</span>
            </div>
            <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>{c.rationale}</div>
            {caption[i] && (
              <div style={{ marginTop: 10, padding: 10, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 7 }}>
                <div style={{ color: 'var(--t1)', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{caption[i].caption}</div>
                {!!caption[i].hashtags?.length && <div style={{ color: accent, fontSize: 11.5, marginTop: 6 }}>{caption[i].hashtags.map(h => '#' + h.replace(/^#/, '')).join(' ')}</div>}
              </div>
            )}
            {cont[i] && <ContinuityCard c={cont[i]} accent={accent} />}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button disabled={!!busy} onClick={() => writeCaption(i, c)} style={btn(accent, !busy)}>{busy === 'cap' + i ? '…' : 'write caption'}</button>
              <button disabled={!!busy} onClick={() => check(i, c)} style={btn(accent, false)}>{busy === 'chk' + i ? '…' : 'continuity check'}</button>
              <button disabled={!!busy} onClick={() => setImageSeed(c.image_prompt)} style={btn(accent, false)}>→ image</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Image tab ──────────────────────────────────────────────────────────────
function ImageStudio({ brand, accent, busy, run, seed }: any) {
  const [prompt, setPrompt] = useState('')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [instruction, setInstruction] = useState('')
  useEffect(() => { if (seed) setPrompt(seed) }, [seed])

  const generate = () => run('gen', async () => {
    const d = await post({ action: 'image.generate', brand_id: brand.id, prompt })
    setAsset(d.asset)
  })
  const edit = () => run('edit', async () => {
    if (!asset) return
    const d = await post({ action: 'image.edit', asset_id: asset.id, instruction })
    setAsset(d.asset); setInstruction('')
  })

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px', maxWidth: 460 }}>
        <span style={label()}>image prompt — drawn in {brand.name}'s visual language</span>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="a product hero shot on marble…" style={{ ...field, marginTop: 6, resize: 'vertical' }} />
        <button disabled={!!busy || !prompt.trim()} onClick={generate} style={{ ...btn(accent, !busy && !!prompt.trim()), marginTop: 10 }}>{busy === 'gen' ? 'generating…' : 'generate'}</button>
        {asset && (
          <div style={{ marginTop: 16 }}>
            <span style={label()}>ai edit</span>
            <input value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="make the light warmer, add steam…" style={{ ...field, marginTop: 6 }} />
            <button disabled={!!busy || !instruction.trim()} onClick={edit} style={{ ...btn(accent, !busy && !!instruction.trim()), marginTop: 8 }}>{busy === 'edit' ? 'editing…' : 'ai edit'}</button>
          </div>
        )}
      </div>
      <div style={{ flex: '1 1 320px' }}>
        {asset?.url ? (
          <div>
            <img src={WORKER + asset.url} alt="" style={{ width: '100%', maxWidth: 512, borderRadius: 10, border: '0.5px solid var(--b1)' }} />
            <div style={{ ...label(), marginTop: 8 }}>{asset.provider} · {asset.model}</div>
          </div>
        ) : <div style={{ color: 'var(--t4)', fontFamily: mono, fontSize: 12 }}>Generated imagery appears here.</div>}
      </div>
    </div>
  )
}

// ── Flock tab ──────────────────────────────────────────────────────────────
function Flock({ brand, accent, busy, run, platforms }: any) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [platform, setPlatform] = useState(platforms[0] || 'instagram')
  const [handle, setHandle] = useState('')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [pubResult, setPubResult] = useState<any>(null)

  const load = useCallback(() => run('load', async () => {
    const [c, p] = await Promise.all([post({ action: 'channel.list', brand_id: brand.id }), post({ action: 'post.list' })])
    setChannels(c.channels || []); setPosts(p.posts || [])
  }), [brand.id])
  useEffect(() => { load() }, [brand.id])

  const addChannel = () => run('ch', async () => { await post({ action: 'channel.add', brand_id: brand.id, platform, handle }); setHandle(''); await load() })
  const createPost = () => run('post', async () => { await post({ action: 'post.create', brand_id: brand.id, title, caption, channel_ids: picked }); setTitle(''); setCaption(''); setPicked([]); await load() })
  const review = (id: string) => run('rev' + id, async () => { await post({ action: 'post.review', post_id: id }); await load() })
  const publish = (id: string) => run('pub' + id, async () => { const d = await post({ action: 'post.publish', post_id: id }); setPubResult({ id, ...d }); await load() })

  return (
    <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 300px' }}>
        <span style={label()}>the flock — {channels.length} channel{channels.length === 1 ? '' : 's'}</span>
        <div style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {channels.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
              <span style={{ color: 'var(--t1)', fontSize: 12 }}>{c.platform}{c.handle ? ` · @${c.handle}` : ''}</span>
              <span style={label(c.status === 'connected' ? '#6FCF97' : 'var(--t4)')}>{c.status}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...field, width: 'auto', flex: '0 0 auto' }}>
            {platforms.map((p: string) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="handle" style={field} />
          <button disabled={!!busy} onClick={addChannel} style={btn(accent, !busy)}>add</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <span style={label()}>new post</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="internal title" style={{ ...field, marginTop: 6 }} />
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="caption" style={{ ...field, marginTop: 6, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '8px 0' }}>
            {channels.map(c => (
              <button key={c.id} onClick={() => setPicked(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])}
                style={{ ...label(picked.includes(c.id) ? '#0B0C10' : 'var(--t3)'), background: picked.includes(c.id) ? accent : 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>{c.platform}</button>
            ))}
          </div>
          <button disabled={!!busy || !caption.trim()} onClick={createPost} style={btn(accent, !busy && !!caption.trim())}>create draft</button>
        </div>
      </div>

      <div style={{ flex: '1 1 320px' }}>
        <span style={label()}>posts</span>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map(p => (
            <div key={p.id} style={{ padding: 11, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t1)', fontSize: 12.5, fontWeight: 500 }}>{p.title || '(untitled)'}</span>
                <span style={label(p.status.startsWith('published') ? '#6FCF97' : 'var(--t4)')}>{p.status}</span>
              </div>
              {p.caption && <div style={{ color: 'var(--t3)', fontSize: 11.5, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</div>}
              {typeof p.continuity_score === 'number' && <div style={{ marginTop: 8 }}><ScoreBar score={p.continuity_score} accent={accent} /></div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                <button disabled={!!busy} onClick={() => review(p.id)} style={btn(accent, false)}>{busy === 'rev' + p.id ? '…' : 'review'}</button>
                <button disabled={!!busy} onClick={() => publish(p.id)} style={btn(accent, !busy)}>{busy === 'pub' + p.id ? '…' : 'publish flock'}</button>
              </div>
              {pubResult?.id === p.id && (
                <div style={{ marginTop: 8, fontSize: 11, fontFamily: mono, color: 'var(--t2)' }}>
                  {(pubResult.results || []).map((r: any, i: number) => (
                    <div key={i} style={{ color: r.ok ? (r.dryRun ? accent : '#6FCF97') : '#D06565' }}>{r.platform}: {r.detail}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!posts.length && <div style={{ color: 'var(--t4)', fontFamily: mono, fontSize: 12 }}>No posts yet.</div>}
        </div>
      </div>
    </div>
  )
}

// ── Assets tab ─────────────────────────────────────────────────────────────
function Assets({ brand, accent }: any) {
  const [assets, setAssets] = useState<Asset[]>([])
  useEffect(() => { post({ action: 'asset.list', brand_id: brand.id }).then(d => setAssets(d.assets || [])).catch(() => {}) }, [brand.id])
  return (
    <div>
      <span style={label()}>{assets.length} asset{assets.length === 1 ? '' : 's'}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 10 }}>
        {assets.map(a => (
          <div key={a.id} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
            {a.url ? <img src={WORKER + a.url} alt="" style={{ width: '100%', display: 'block' }} />
              : <div style={{ padding: 20, textAlign: 'center', color: 'var(--t4)', fontFamily: mono, fontSize: 10 }}>{a.kind} · {a.status}</div>}
            <div style={{ padding: 8 }}>
              <div style={{ color: 'var(--t3)', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.prompt}</div>
              {a.provider && <div style={{ ...label(), marginTop: 4 }}>{a.provider}</div>}
            </div>
          </div>
        ))}
      </div>
      {!assets.length && <div style={{ color: 'var(--t4)', fontFamily: mono, fontSize: 12, marginTop: 10 }}>Nothing generated for this brand yet.</div>}
    </div>
  )
}

// ── Brand kit editor (modal-ish overlay) ─────────────────────────────────────
function BrandEditor({ editing, setEditing, accent, onSave, busy }: any) {
  const set = (k: string, v: string) => setEditing((s: any) => ({ ...s, [k]: v }))
  const F = ({ k, ph, area }: { k: string; ph: string; area?: boolean }) => (
    <div style={{ marginBottom: 10 }}>
      <span style={label()}>{k.replace('_', ' ')}</span>
      {area
        ? <textarea value={editing[k] || ''} onChange={e => set(k, e.target.value)} rows={2} placeholder={ph} style={{ ...field, marginTop: 5, resize: 'vertical' }} />
        : <input value={editing[k] || ''} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...field, marginTop: 5 }} />}
    </div>
  )
  return (
    <div onClick={() => setEditing(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', justifyContent: 'flex-end', zIndex: 30 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '90%', height: '100%', background: 'var(--base)', borderLeft: '0.5px solid var(--b1)', padding: 20, overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--t1)', marginBottom: 16 }}>{editing.id ? 'Edit brand kit' : 'New brand'}</div>
        <F k="name" ph="brand name" />
        <F k="mission" ph="what the brand is for" area />
        <F k="voice" ph="e.g. warm, precise, a little playful" />
        <F k="audience" ph="who it speaks to" />
        <F k="visual_style" ph="e.g. soft natural light, film grain, minimal" area />
        <F k="palette" ph="#C9A84C, #0B0C10  (comma-separated hex)" />
        <F k="fonts" ph="e.g. Playfair Display / Inter" />
        <F k="keywords" ph="comma-separated brand keywords" />
        <F k="taboos" ph="what to never do (becomes the negative prompt)" area />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled={busy} onClick={onSave} style={btn(accent, !busy)}>{busy ? 'saving…' : 'save'}</button>
          <button onClick={() => setEditing(null)} style={btn(accent, false)}>cancel</button>
        </div>
      </div>
    </div>
  )
}
