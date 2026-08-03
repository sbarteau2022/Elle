# Resonance — where deep learning is allowed to touch the atlas

## The question this answers

Does Elle deep-learn on her own? **No — and this contract is what keeps that
answer honest.** Elle uses learned models in exactly one atlas-adjacent role:
a pre-trained embedding model, run **inference-only** on the device, scores
candidate memory pairs. No training loop runs anywhere in this system. No
weights are updated by Elle's experience. Her actual "learning" is memory
accretion: the append-only recall ledger, deterministically re-folded into
the atlas by Dynanic-Hyperbolic-Neural-Graph (DHNG) on every build.

The division of labor is one sentence: **the learned model proposes, the
deterministic geometry disposes.**

## The pipeline (unchanged parts in plain type, the new part in bold)

1. Recall events accumulate in the worker's append-only ledger
   (`atlas-events.ts` — no update or delete functions, by design).
2. DHNG, on-device, folds events into edges and runs the
   hyper/torus/structure/product geometry through pure static functions.
3. **DHNG may additionally run its learned embedder over node content,
   score candidate "wormhole" pairs, benchmark every candidate against
   three nulls (random pairs, hub pairs, phase-permuted), and attach the
   results as an optional `resonance` block on the snapshot.**
4. The versioned snapshot is pushed to elle-worker. The atlas API stays
   exactly `GET /api/atlas/latest` · `/history` · `/at` — no new endpoints,
   no write path.
5. Elle's AtlasPanel re-gates every proposal deterministically
   (`src/lib/resonance.ts`) and renders survivors as dashed violet arcs
   behind a toggle that defaults **off**.

## The snapshot extension

```jsonc
{
  // ...existing snapshot fields unchanged...
  "resonance": {
    "scorer": {              // provenance of the learned component
      "kind": "embedding-cosine",
      "model": "<model id>", // e.g. "bge-small-en-v1.5"
      "dim": 384,
      "note": "inference only — no training, no weight updates"
    },
    "nulls": {               // 95th-percentile scores from on-device benchmarks
      "random_p95": 0.41,    // random node pairs
      "hub_p95": 0.47,       // pairs routed through high-degree hubs
      "permuted_p95": 0.44,  // phase-permuted assignment
      "samples": 1000
    },
    "proposals": [
      { "src": "<node id>", "dst": "<node id>", "score": 0.83, "hops": 5 }
    ]
  }
}
```

`hops` is the device's claimed graph distance at publish time (`null` for
different components). The client does **not** trust it — it recomputes hop
distance by BFS over the snapshot's own published edges.

## The client-side gate (`src/lib/resonance.ts`)

A proposal renders only if **all** of the following hold:

| Check | Recomputed client-side? |
| --- | --- |
| Both endpoints exist in the snapshot and carry coordinates | yes |
| The pair is not already an edge | yes |
| BFS hop distance ≥ 3, or the endpoints are in different components | yes |
| `score` strictly exceeds `random_p95`, `hub_p95`, and `permuted_p95` | thresholds are device-published; the comparison is client-side |

Failures are kept and counted, not discarded — "3 of 7 proposals failed the
gate" is information. The gate is a pure function of the snapshot, so a
replayed historical frame gates identically forever.

## The invariants this preserves

- **The ledger stays append-only.** Nothing about resonance writes an event.
- **The atlas stays read-only to the LLM** — same boundary as the `atlas`
  router tool ("she can look at the shape of her own memory graph; she
  cannot write, edit, or embed anything into it").
- **The geometry stays deterministic and replayable.** Node positions,
  edges, cycles: untouched. Proposals are claims *about* the graph, drawn
  in a visibly different register (dashed, violet, no particles), never
  part of it.
- **The learned component is quarantined** to the one job neural nets are
  trustworthy for here — similarity scoring — with provenance recorded in
  the snapshot and its output always subject to the deterministic gate
  before it is rendered as structure.

## What would violate this contract

Any of these is a design regression, not an extension: a learned model
writing edges or moving node positions; a training loop fed by Elle's own
recall; proposals rendered in the same visual register as real edges;
a write path from the panel or the LLM into the resonance block; gating
that trusts the device's `hops` claim instead of recomputing it.
