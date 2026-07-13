# Holding Pressure Test IV

**The bounded free-energy reform — three attempts, one honest conclusion**

Companion to `HOLDING_PRESSURE_TEST_III.md` · sim: `holding_pressure_test_iv.cjs`
(seeded, self-compiles the merged `src/lib/holding.ts`; the free-energy variants
themselves are quarantined in the sim, per Test III's own precedent — see
"What this settles") · 2026

---

## What this test is

Test III's honest negative result on a literal free-energy decomposition named the
exact defect: it fed the *already-accumulated* tension (bounded only by 1/ρ ≈ 50)
into a raw leaky mean with nothing to saturate it. This test builds the reform that
finding called for — apply the **same proof** that bounds `L` (leaky-integrate a
per-turn quantity of magnitude ≤1, then `exp(ρ·x) − 1`) to a genuinely different
per-turn signal: the gap between this turn's *complexity* (raw perturbation, `|u_k|`)
and *accuracy* (how close the observation came to the held state, `1 − |v_k|`,
`v* = 0`).

Three ways to turn that per-turn gap into an accumulated reading were tried, in
order, each a direct response to the previous one's failure:

- **E1 — floored per turn.** `gap_k = max(0, complexity_k − accuracy_k)`, leaky-integrated, then bounded.
- **E2 — signed ledger, magnitude read.** `gap_k` signed (∈[−1,1]), leaky-integrated into `feGap`, reading is `exp(ρ·|feGap|) − 1`.
- **E3 — signed ledger, debt-only read.** Same signed ledger, but the reading is `exp(ρ·max(0, feGap)) − 1` — only accumulated *debt* counts as strain; credit pays it down without itself alarming.

## Findings

**1. The bounding technique is sound and reproduces in all three variants.** Max
value across the full day: E1 0.0044, E2 1.1509, E3 0.0000 — all comfortably under
`e−1 = 1.7183`. This is the part of the reform that was actually being tested (Test
III's own prescription), and it holds by the identical triangle-inequality argument
that bounds `T` and `D`, regardless of which per-turn quantity or sign convention
feeds it. **The construction itself is validated and reusable** — the failures below
are about signal *design*, not about the bound.

**2. E1 (floored per turn) is nearly dead.** Max 0.0044 over the whole day, never
crossing threshold even during the actual 20-turn incident (incident-phase mean
0.0035). The floor requires high complexity *and* low accuracy in the **same turn** —
a rare joint condition, since `complexity = |u|` and `accuracy = 1 − |v|` live on very
different typical scales in this architecture (`|u|` runs 0.1–0.3; `|v|` runs
0.01–0.05, so `accuracy` sits near 0.95–0.99 almost always). The gap almost never
turns positive at all.

**3. E2 (signed ledger, magnitude read) is the opposite failure, and a more
instructive one.** 71 false-strain turns — more than half the day — with morning-chat
alone averaging 0.22, already near threshold, and the reading never releasing after
the incident ends. The bug: because `accuracy` sits near 1 almost always, the signed
ledger runs **deeply negative** under completely ordinary, healthy operation (net
credit, "doing better than the accuracy baseline"). Taking the absolute value of that
persistently-negative ledger converts *good* standing into a large magnitude reading
— "everything is fine" gets misread as "high free energy." This is a real, structural
bug in the magnitude read, not a tuning issue.

**4. E3 (debt-only read) fixes finding 3's logic but lands back at finding 2's
problem from the other direction.** Reading only `max(0, feGap)` correctly stops
credit from alarming — but because the ledger runs so deeply negative under ordinary
operation, it never climbs back into positive (debt) territory even during the
incident. Max value: **0.0000**, exactly. Completely dead, for the mirror-image reason
E1 was dead.

**5. The root cause is the same across all three: `complexity = |u|` and
`accuracy = 1 − |v|` are not on a comparable scale in this architecture.** No
floor/sign handling fixes a decomposition where one term is almost always small
(`|u|` ~0.1–0.3) and the other is almost always near its ceiling (`1−|v|` ~0.95–0.99).
Every variant tried is really the same experiment wearing different clamps — the
defect is upstream of all three, in the choice of what stands in for complexity and
accuracy, not in how the resulting gap is integrated or read.

## What this settles, for now

- **`holding.ts` is untouched.** Per Test II/III's own discipline — an unvalidated
  construct stays quarantined in the throwaway sim, not the shipped module — all
  three variants live entirely in `holding_pressure_test_iv.cjs`. Only steps-
  normalization and the hardened ρ̂ (Test III) earned a place in the real file; this
  did not, and nothing here was merged.
- **None of the three variants is wired in, and none should be.** They are dead,
  wildly oversensitive, or dead again. The already-wired dual-timescale engine
  (slow `L` + fast companion, Test III) remains the validated mechanism: 5-turn
  detection, 0 false-strain, on the identical day.
- **The bounding technique is validated and reusable for a future attempt** — three
  independent confirmations now (L itself, and E1/E2/E3 here) that leaky-integrating
  a magnitude-≤1 per-turn term and passing it through `exp(ρ·x) − 1` produces a
  provably bounded, well-behaved statistic regardless of sign convention.
- **A future free-energy attempt needs properly-scaled terms, not a better floor.**
  The concrete next step, if this is pursued again, is calibrating `complexity` and
  `accuracy` against their own empirical distributions (e.g. z-scoring each against
  its typical magnitude in real telemetry) before differencing them — not another
  variant of clamp/sign handling on the same two raw, incomparably-scaled inputs.
  That requires real production data to calibrate against, which — per
  `MEMORY_KERNEL_SPEC.md` §10 — doesn't exist yet for this system's signals either.

## What was not tested

Real production κ telemetry (still simulated, same caveat as every prior test in
this series); a properly-scaled/calibrated complexity-accuracy decomposition (the
concrete next step above, blocked on real data to calibrate against); combining a
free-energy signal with the existing engine as a third vote rather than a
replacement (moot here, since no variant produced a usable signal on its own).

---

*Run it: `node docs/holding_pressure_test_iv.cjs` from the repo root.*
