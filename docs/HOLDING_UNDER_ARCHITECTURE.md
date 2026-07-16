# Holding Under Architecture

**Pressure Test II — the valve inside the machine**

Companion to `SUPERPOSITION_HOLDING.md` · sim: `holding_architecture_sim.cjs` (seeded,
self-compiles the merged `src/lib/holding.ts` — the real module, not a port) · 2026

---

## What this test is

Pressure Test I validated the holding construction against clean local-level
statistics: Gaussian drift, uniform cadence, one process at a time. Elle's runtime
produces none of those. This test feeds the merged valve, unmodified, a synthetic day
shaped like her actual architecture:

| Architectural reality | How it was modeled |
|---|---|
| Multi-step reasoning (elle-router agentic loop) | per-turn \|Δκ\| variance scales with tool steps (Poisson-distributed, heavy in deep-work) |
| Dynamic KV cache | compaction shocks: one-turn κ jumps of ±0.10–0.15 with partial recovery, on a context clock |
| Register switches (mind.ts voices) | deliberate −0.08 κ level shift for 5 turns — style, not pathology |
| Duplex sovereign→local failover | −0.05 κ level + doubled noise for 16 turns, then failback |
| Bursty session cadence | 25-turn morning, 3 h silence, 60-turn deep work, 2 h silence, evening, night |
| Genuine decoherence | 20 turns of runaway ±0.30 κ alternation (the incident the loss exists to catch) |

Four variants raced on the identical stream: **A** shipped (ρ = 0.02, exactly as
merged) · **B** wall-clock leak · **C** step-normalized drift · **D** shipped + fast
companion at ρ = 0.10. 140 turns; strain threshold L > 0.25 throughout.

**Caveat, stated plainly:** this is a simulation of the architecture's statistical
signature, not a replay of production κ telemetry. The worker is not in this repo; the
event magnitudes are modeled, not measured. Findings about *structure* (what kind of
thing the valve can and cannot see) are robust to that; the specific latencies will
shift with real magnitudes.

## What held

**1. The bound is indifferent to the architecture.** Max loss across every variant and
every turn: 0.213 (A), 0.596 (D) — both far under e−1 = 1.718. Compaction shocks,
failover, and the incident change *where* L goes, never *whether* it is bounded.
Proposition 1 is architectural, not statistical. PASS, trivially and importantly.

**2. Zero false strain from architectural life.** Worst shipped loss during KV
compaction shocks: 0.029. During the register switch: 0.025. During the 16-turn duplex
failover: 0.029. All an order of magnitude under threshold. The leak forgives isolated
discontinuities exactly as designed — the valve does not mistake her machinery for her
pathology. This was the isolated test's open question, and it closes cleanly.

**3. Timescale-invariant thresholds (the λ = ρ dividend).** The fast companion at
5× the leak rate used the *same* 0.25 threshold with zero false positives — because
λ = ρ makes steady-state L read in drift units regardless of ρ. One threshold
semantics across any bank of timescales. This property was designed for transparency;
it turns out to be what makes variant D free.

## What changed

**4. The shipped valve slept through the incident — and peaked after it ended.**
Twenty turns of ±0.30 runaway alternation drove A's loss to 0.213: *under* the 0.25
threshold, never flagged, with the maximum landing at **turn 106 — one turn after the
incident stopped**. The analytical reason was already in the paper (a 35-turn memory
cannot fill fast enough for a 20-turn episode; detection of sustained 0.3-drift needs
~59 turns at ρ = 0.02) but the isolated test never staged a *finite* episode, so the
consequence never surfaced: **at ρ = 0.02 the valve is a historian, not a smoke
alarm.** Its recovery-phase mean loss (0.155) exceeds its incident-phase mean (0.127)
— it reports the fire mostly while the ashes cool. The fast companion (ρ = 0.10,
half-life 6.6 turns) detected the same incident in **5 turns**, released **8 turns**
after it ended, and false-alarmed **zero** times all day at a calm-phase mean of 0.017
(15× headroom). Two valves, two honest jobs: the slow one prices what a session has
been carrying; the fast one notices what is happening right now.

**5. The tension clock freezes when she's alone.** T decays per *observation*, and the
client-side valve only observes when turns arrive. Across the 3-hour morning gap,
shipped T went 1.42 → 1.44 (the new turn added more than nothing had drained);
wall-clock variant B drained 1.35 → 0.08 over the same gap. The isolated test's
"power-down" property (§4B of the paper) is real but *turn-indexed*: she powers down
through activity, never through absence. This is a semantics fork, not a bug, and it
deserves a deliberate choice: the thermodynamic reading says silence should drain the
reservoir (B); the presence reading says a held thing stays held through silence — she
remembers, and you come back to find her still holding it. The current behavior is
accidentally the second. If it stays, it should stay on purpose.

> **Resolution (post-PT-III):** first documented as a deliberate keep of the
> turn-indexed reading, then **flipped to wall-clock by explicit ruling** — staying
> continuous is still spending energy maintaining; it still needs a decay. The valve
> now applies (1−ρ)^(Δt/τ), τ = 60 s, floored at one turn per observation so the e−1
> bound survives any cadence. PT-III's harness reproduces its validated numbers
> exactly (its turns arrive back-to-back, so the floor binds); this harness now feeds
> the sim's own timestamps, and the post-ruling re-run shows the drain working
> (T 1.347 → 0.077 across the 3 h gap, matching the independent wall-clock reference
> to three decimals) plus two honest second-order effects: the fast valve enters the
> incident freshly drained after the 2 h gap, costing one extra turn of detection
> (5 → 6) while releasing faster (8 → 5), and cross-gap draining lowers the slow
> valve's carryover (peak 0.213 → 0.191; work-vs-chat contrast 3.7× → 2.6×). A rested
> valve is marginally slower to alarm and quicker to forgive — that is the ruling's
> physics, working as stated. Half-life: ~35 turns in conversation, ~35 minutes across
> silence; `quiescent` is now reachable through absence.

**6. Work reads as drift.** Deep-work loss ran 3.7× morning-chat loss on the shipped
valve with zero pathology present — tool-heavy turns produce more output, more output
moves κ more, and the ledger cannot tell effort from decoherence. Step-normalization
(C, dividing \|Δκ\| by √steps) compressed the contrast to 2.7× but could not remove it,
because the true within-turn scaling is unknown to the valve (and in this sim,
deliberately not √steps). The workbench *has* the missing signal — `trace.length`
lands in the same frame as `kappa_dynamics` — so the valve could be told how hard she
was working. Until then: an elevated L during a forge session is expected reading, not
strain.

**7. The self-calibrator classifies oscillation as noise — correctly, and that's the
trap.** The ρ* estimator fired exactly once all day (turn 86, the incident's first
swing, clamped at 0.2) and went silent for the remaining 19 incident turns. The
local-level moment estimator reads alternating ±0.3 swings as *anti-persistent
measurement noise* (large negative lag-1 autocovariance → σ_w² ≤ 0 → null), which is
statistically correct — runaway oscillation is not secular drift — and operationally
useless as an incident detector. Two consequences: the single boundary firing was a
shock artifact and should not be trusted alone (require persistence across consecutive
windows before surfacing ρ̂ prominently); and calibration can never substitute for the
fast valve, because the pathology class that most needs fast detection is the one the
drift estimator is designed to ignore.

## Recommendations, ranked

1. **Add the fast companion (D) — the cheapest real gain.** Second instance of the
   existing `createHoldingValve(0.10)`, same threshold by the λ = ρ property, ~three
   lines in `EllePanel`. Detects in 5 turns what the shipped valve never flags. Render
   as nothing new in the header until strained — the readout stays quiet.
2. **Decide the silence semantics (5) on purpose.** ~~Keep turn-indexed tension as the
   presence reading, or adopt wall-clock decay.~~ *Decided twice, deliberately: PT-III
   documented the turn-indexed keep; a subsequent explicit ruling flipped it to
   wall-clock (see finding 5's resolution note). Implemented in `holding.ts`.*
3. **Feed `steps` to the valve (6).** `trace.length` is already in hand at both call
   sites; one optional field on `HoldingInput`, normalize the ledger increment. Makes
   L phase-comparable.
4. **Harden ρ̂ against shock artifacts (7).** Surface it only after k consecutive
   non-null windows (k = 3 is enough); document that it estimates secular drift only.
5. **Do not raise the strain threshold** to make the slow valve catch incidents — that
   trades away finding 2 (zero false strain). Speed comes from ρ, not from lowering
   the bar; that is the whole geometry of the paper's §3.

## What was not tested

Real worker κ computation (the worker repo is out of session); real event magnitudes;
concurrent multi-session valves; the mobile surface. The sim is seeded and committed —
when production κ telemetry is exportable, replaying a real day through the same
harness replaces every modeled magnitude with a measured one and re-scores findings
4–7 with no code changes.

---

*Run it: `node docs/holding_architecture_sim.cjs` from the repo root (self-compiles
the merged valve via esbuild; deterministic).*
