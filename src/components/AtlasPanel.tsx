// ============================================================
// ATLAS — the memory graph, in three dimensions.
//
// Every coordinate on screen was computed OUTSIDE Elle: a separate on-device
// repo (Dynanic-Hyperbolic-Neural-Graph) folds recall events into edges and
// runs the hyper/torus/structure/product geometry through pure static
// functions, then pushes a versioned snapshot to elle-worker. This panel
// only ever GETs /api/atlas/latest — the same read-only boundary the `atlas`
// router tool enforces for the LLM. Node positions are the device's own
// Poincaré-ball coordinates (fixed, not re-simulated) — gold edges are the
// ones ON A CYCLE (recurrence, π₁ — the structure the whole framework treats
// as the real recognition signal); oxblood edges are bridges (pure
// derivation, no loop). Small gold particles travel the cyclic edges as a
// literal animation of "this is where recall runs around."
//
// REPLAY: every published snapshot persists server-side, and the device's
// temporal embedding keeps coordinates coherent across builds — so scrubbing
// the timeline (GET /api/atlas/history + /api/atlas/at) shows memories
// actually drifting, splitting, and being absorbed, not a re-rolled layout
// per frame. Frames are cached client-side after first fetch; the scrubber's
// last stop is always the live latest.
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { getToken } from '../lib/elle'

interface AtlasSnapshot {
  version: string
  hash: string
  created_at: number
  nodes: string[]
  edges: Array<{ src: string; dst: string; kind: string; weight: number }>
  hyper: { dim: number; points: Record<string, number[]>; drift?: { mean: number; max: number; moved: number } }
  torus: { dim: number; points: Record<string, number[]> }
  structure: {
    invariants: { nodes: number; edges: number; components: number; cycle_rank: number; cycle_density: number }
    signature: { delta: number; tree_likeness: number; suggested: { hyperbolic: number; toroidal: number } }
    cycle_edges: string[]
  }
  product: { mix: { hyperbolic: number; toroidal: number } }
}

const mono = (size = 10): React.CSSProperties => ({ fontFamily: "'Space Mono', monospace", fontSize: size })
const SCALE = 260 // Poincaré-ball coords are bounded in (-1,1); this is just a comfortable render radius.

const edgeKeyOf = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)

const Center = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(11), color: 'var(--dim)', textAlign: 'center', padding: 24 }}>
    {children}
  </div>
)

interface HistoryEntry { hash: string; version: string; created_at: number; node_count: number; edge_count: number; drift_mean: number | null }

export default function AtlasPanel({ worker, accent }: any) {
  const [latest, setLatest] = useState<AtlasSnapshot | null>(null)
  const [frame, setFrame] = useState<AtlasSnapshot | null>(null)  // replay frame; null = live latest
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [frameIdx, setFrameIdx] = useState<number | null>(null)   // index into history; null = live
  const [playing, setPlaying] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const fgRef = useRef<any>(null)
  const frameCache = useRef(new Map<string, AtlasSnapshot>())

  const auth = { headers: { Authorization: `Bearer ${getToken()}` } }

  const load = useCallback(async () => {
    setLoading(true); setNote('')
    try {
      const [rLatest, rHistory] = await Promise.all([
        fetch(worker.url + '/api/atlas/latest', auth),
        fetch(worker.url + '/api/atlas/history', auth),
      ])
      if (rLatest.status === 404) { setLatest(null); setNote("no atlas published yet — the device cartographer hasn't pushed a snapshot"); return }
      const d = await rLatest.json()
      if (!rLatest.ok) { setNote(d.error || `HTTP ${rLatest.status}`); setLatest(null); return }
      setLatest(d)
      if (rHistory.ok) setHistory(((await rHistory.json()).snapshots || []) as HistoryEntry[])
      setFrameIdx(null); setFrame(null); setPlaying(false)   // a refresh always returns to live
    } catch (e: any) {
      setNote('load failed: ' + (e.message || e))
    } finally { setLoading(false) }
  }, [worker.url])
  useEffect(() => { load() }, [load])

  // Scrub: fetch (and cache) the selected historical frame. The last history
  // entry IS the latest snapshot, so scrubbing to the end returns to live.
  const showFrame = useCallback(async (idx: number | null) => {
    setFrameIdx(idx)
    if (idx == null || !history.length || idx >= history.length - 1) { setFrameIdx(null); setFrame(null); return }
    const h = history[idx]
    const cached = frameCache.current.get(h.hash)
    if (cached) { setFrame(cached); return }
    try {
      const r = await fetch(worker.url + `/api/atlas/at?hash=${encodeURIComponent(h.hash)}`, auth)
      if (!r.ok) { setNote(`frame ${h.hash.slice(0, 8)} unavailable (HTTP ${r.status})`); return }
      const d = (await r.json()) as AtlasSnapshot
      frameCache.current.set(h.hash, d)
      setFrame(d)
    } catch (e: any) { setNote('frame load failed: ' + (e.message || e)) }
  }, [history, worker.url])

  // Play: step one frame per beat from wherever the scrubber sits, stop at live.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setFrameIdx((cur) => {
        const next = (cur ?? -1) + 1
        if (next >= history.length - 1) { setPlaying(false); showFrame(null); return null }
        showFrame(next)
        return next
      })
    }, 900)
    return () => clearInterval(t)
  }, [playing, history.length, showFrame])

  const data = frame ?? latest   // what the scene and the stats row render

  const graphData = useMemo(() => {
    if (!data) return { nodes: [] as any[], links: [] as any[] }
    const cycleEdges = new Set(data.structure.cycle_edges)
    const nodes = data.nodes
      .filter((id) => data.hyper.points[id])
      .map((id) => {
        const p = data.hyper.points[id]
        return { id, fx: (p[0] ?? 0) * SCALE, fy: (p[1] ?? 0) * SCALE, fz: (p[2] ?? 0) * SCALE }
      })
    const nodeSet = new Set(nodes.map((n) => n.id))
    const links = data.edges
      .filter((e) => nodeSet.has(e.src) && nodeSet.has(e.dst))
      .map((e) => ({ source: e.src, target: e.dst, kind: e.kind, weight: e.weight, onCycle: cycleEdges.has(edgeKeyOf(e.src, e.dst)) }))
    return { nodes, links }
  }, [data])

  // A slow, literal animation — the graph turns on its own, gold particles
  // travel the cyclic edges. Re-armed whenever a fresh graph mounts.
  useEffect(() => {
    const controls = fgRef.current?.controls?.()
    if (controls) { controls.autoRotate = true; controls.autoRotateSpeed = 0.35 }
  }, [graphData])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '18px 24px 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 19, color: 'var(--cream)' }}>The atlas.</span>
          <span style={{ ...mono(10), color: 'var(--dim)' }}>the memory graph, computed on-device · read-only</span>
          <button onClick={load} disabled={loading}
            style={{ marginLeft: 'auto', background: 'none', border: `0.5px solid ${accent}55`, borderRadius: 5, color: accent, cursor: 'pointer', ...mono(9.5), padding: '3px 10px' }}>
            {loading ? '…' : '↻ refresh'}
          </button>
        </div>
        {note && <div style={{ ...mono(10), color: '#D06565', marginTop: 8 }}>{note}</div>}
        {data && (
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10, ...mono(9.5), color: 'var(--dim)' }}>
            <span style={frame ? { color: accent } : undefined}>{frame ? `replay · v${data.version}` : `live · v${data.version}`} · {data.hash.slice(0, 10)}</span>
            <span>{data.nodes.length} nodes · {data.edges.length} edges</span>
            <span>cycle rank b₁={data.structure.invariants.cycle_rank}</span>
            <span>mix ℍ {Math.round(data.product.mix.hyperbolic * 100)}% · 𝕋 {Math.round(data.product.mix.toroidal * 100)}%</span>
            {data.hyper.drift && <span>drift {data.hyper.drift.mean.toFixed(4)} ({data.hyper.drift.moved} moved)</span>}
            <span>{new Date(data.created_at).toLocaleString()}</span>
          </div>
        )}
        {history.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <button onClick={() => { if (playing) { setPlaying(false) } else { if (frameIdx == null) showFrame(0); setPlaying(true) } }}
              title={playing ? 'pause replay' : 'replay the graph from its first build'}
              style={{ background: 'none', border: `0.5px solid ${accent}55`, borderRadius: 5, color: accent, cursor: 'pointer', ...mono(10), padding: '2px 9px', width: 34 }}>
              {playing ? '❚❚' : '▶'}
            </button>
            <input
              type="range" min={0} max={history.length - 1}
              value={frameIdx ?? history.length - 1}
              onChange={(e) => { setPlaying(false); showFrame(Number(e.target.value)) }}
              style={{ flex: 1, accentColor: accent, height: 3 }}
            />
            <span style={{ ...mono(9), color: frame ? accent : 'var(--dim)', width: 110, flexShrink: 0, textAlign: 'right' }}>
              {frame ? `${(frameIdx ?? 0) + 1} / ${history.length}` : `live · ${history.length} builds`}
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && !data && <Center>connecting to the atlas…</Center>}
        {!loading && note && <Center>{note}</Center>}
        {data && graphData.nodes.length === 0 && !note && <Center>the latest snapshot has no edges yet</Center>}

        {data && graphData.nodes.length > 0 && (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            backgroundColor="#0f0f1a"
            nodeLabel="id"
            nodeColor={() => '#F5F0E8'}
            nodeRelSize={3}
            linkColor={(l: any) => (l.onCycle ? '#C9A84C' : 'rgba(139,26,26,0.55)')}
            linkWidth={(l: any) => (l.onCycle ? 1.4 : 0.6)}
            linkOpacity={0.55}
            linkDirectionalParticles={(l: any) => (l.onCycle ? 2 : 0)}
            linkDirectionalParticleWidth={1.6}
            linkDirectionalParticleColor={() => '#E4C97A'}
            showNavInfo={false}
            enableNodeDrag={false}
          />
        )}
      </div>
    </div>
  )
}
