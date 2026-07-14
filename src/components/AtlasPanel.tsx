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

export default function AtlasPanel({ worker, accent }: any) {
  const [data, setData] = useState<AtlasSnapshot | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const fgRef = useRef<any>(null)

  const load = useCallback(async () => {
    setLoading(true); setNote('')
    try {
      const r = await fetch(worker.url + '/api/atlas/latest', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (r.status === 404) { setData(null); setNote("no atlas published yet — the device cartographer hasn't pushed a snapshot"); return }
      const d = await r.json()
      if (!r.ok) { setNote(d.error || `HTTP ${r.status}`); setData(null); return }
      setData(d)
    } catch (e: any) {
      setNote('load failed: ' + (e.message || e))
    } finally { setLoading(false) }
  }, [worker.url])
  useEffect(() => { load() }, [load])

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
            <span>v{data.version} · {data.hash.slice(0, 10)}</span>
            <span>{data.nodes.length} nodes · {data.edges.length} edges</span>
            <span>cycle rank b₁={data.structure.invariants.cycle_rank}</span>
            <span>mix ℍ {Math.round(data.product.mix.hyperbolic * 100)}% · 𝕋 {Math.round(data.product.mix.toroidal * 100)}%</span>
            {data.hyper.drift && <span>drift {data.hyper.drift.mean.toFixed(4)} ({data.hyper.drift.moved} moved)</span>}
            <span>{new Date(data.created_at).toLocaleString()}</span>
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
