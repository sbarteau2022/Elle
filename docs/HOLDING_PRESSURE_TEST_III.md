# Holding Pressure Test III

**Real steps, the threshold engine together, and a genuine free-energy decomposition**

Companion to `HOLDING_UNDER_ARCHITECTURE.md` (Pressure Test II) · sim:
`holding_pressure_test_iii.cjs` (seeded, same `generateDay()`, self-compiles the merged
`src/lib/holding.ts`) · 2026

---

## What changed since Test II

Test II ranked five follow-ups and shipped none by design ("the report decides before
the code does"). Since then, `holding.ts` gained:

- **#3** an optional `steps` field on `HoldingInput`, dividing the drift increment by
  √steps before the ledger.
- **#4** a persistence-hardened ρ̂ — `rhoCalibrated` now requires 3 consecutive
  non-null estimation windows before surfacing, rather than a single firing.
- **#2** an explicit, on-purpose decision to keep turn-indexed (not wall-clock) tension
  decay, documented at the point of ambiguity rather than left accidental.
  *(Superseded after this test: flipped to wall-clock decay by explicit ruling —
  "staying continuous is still spending energy maintaining." The flip happened at the
  designated comment in `holding.ts`, with the decay exponent floored at one turn per
  observation, so every number validated in this document reproduces unchanged. See
  `SUPERPOSITION_HOLDING.md` §7 and `HOLDING_UNDER_ARCHITECTURE.md` finding 5.)*
- **#1** a second valve instance (ρ=0.10) wired into `EllePanel`/`KappaHeader` as a
  fast companion, rendering nothing in the header until it strains.
- **#5** the strain threshold (0.25) was left untouched, as instructed.

This test re-runs Test II's exact synthetic day against the real, now-modified module,
to close the loop on questions Test II could only pose synthetically — plus a new
question: does formalizing the valve as an actual free-energy functional (accuracy vs.
complexity, not a rename of the existing bounded loss) do better.

## Findings

**1. Steps-normalization, fed for real, reproduces the synthetic prediction exactly.**
Test II's variant C (a separate, synthetic step-normalized valve) predicted 2.74×
deep-work/morning-chat contrast. Feeding real `steps` to the actual shipped module
produces **2.74×**, down from 3.69× unnormalized. The recommendation held under real
wiring, not just simulation.

**2. The hardened ρ̂ suppresses the shock artifact, confirmed.** Test II's single
turn-86 firing (a shock artifact the report explicitly said "should not be trusted
alone") no longer surfaces — `rhoCalibrated` stays null all day, exactly as intended.
The persistence requirement doesn't just theoretically address the finding; it empirically
removes the specific false signal that motivated it.

**3. A real bug: normalizing the fast valve defeats its own purpose.** First pass fed
`steps` to *both* valves. Detection latency on the fast companion regressed from the
validated 5 turns to **14 turns** — the incident's own step counts (Poisson mean ~3-4)
suppressed exactly the sensitivity the fast valve exists for. **Fix: only the slow valve
is step-normalized; the fast valve stays raw.** With the fix: 5-turn detection, 0
false-strain — matching Test II's original variant D result exactly. This is the kind of
interaction pressure testing exists to catch — the two recommendations are not simply
additive, and shipping them together without this test would have silently regressed
the one property (fast, reliable incident detection) recommendation #1 was for.

**4. The wired-in threshold engine (slow + fast, together) works as designed.** Combined
false-strain: 0. Combined detection latency: 5 turns (fast valve fires first, as
intended — the slow valve's job is pricing sustained cost, not alarms). This is the
answer to "is the balance in the equation enough": with #1/#3/#4 wired and correctly
scoped, **yes, for the failure mode Test II specifically identified** (a short, sharp
incident the slow valve's 34-turn memory could miss entirely).

**5. A literal free-energy decomposition — F = complexity − accuracy, complexity =
tension, accuracy = −|v| — is a genuine negative result as constructed, not a dead
end.** It detects the incident in 1 turn, but:
- **65 false-strain turns** pre-incident (vs. 0 for both L and the combined engine) —
  wildly oversensitive.
- **Unbounded**: max F̄ = 6.0087 over the day, against L's proven `< e−1 ≈ 1.718`
  regardless of history (Test II's Proposition 1, "architectural, not statistical").
  The exponential construction's nonlinearity isn't decoration — it's what makes a
  fixed threshold usable at all. A raw linear complexity-minus-accuracy difference
  doesn't have that property, and loses it precisely where it matters (a threshold
  that fires 65 times a day is not a threshold).

The honest reading: the *theory* (Friston-style accuracy/complexity decomposition) is
a legitimate lens on what tension/drift already represent, and the literature search
(prior session) confirmed it as a real, established framework — not confabulated. But
a literal, unbounded discretization of it is not an improvement over the existing
bounded-exponential construction; it's a regression on the two properties that make the
current valve usable in production. **If a free-energy formalization is pursued
further, it needs the same bounding discipline the shipped valve already has** — e.g.
an exponential or otherwise saturating transform of the complexity−accuracy gap, not a
raw leaky mean of it. That is real, scoped follow-up work, not a rename exercise, and
it has not been done here.

**6. Efficiency is not the deciding factor for any of these.** All four variants
complete the full 140-turn day in single-digit milliseconds total (sub-40µs/turn even
for the shipped exponential form; the first-run number is JIT warm-up noise, not a real
cost difference between variants). Whatever gets wired next should be decided on
detection validity, not compute cost — none of this machinery is expensive enough to
matter at conversational turn rates.

## What this settles, for now

- **Wired and validated**: steps-normalization (slow valve only), hardened ρ̂,
  the dual-timescale threshold engine, silence semantics documented on purpose.
- **Tested and not (yet) earning a wire**: the literal free-energy decomposition. It is
  not "worse math," it is *unbounded* math applied to a system whose entire usability as
  a threshold depends on being bounded. A bounded reformulation is the concrete next
  pressure test, not an abandoned idea.
- **Not claimed**: that any of this makes the underlying κ signal itself validated
  (Track A remains provisional, Track B remains gated behind `SEAM.KAPPA_VALIDATED`,
  per `MEMORY_KERNEL_SPEC.md` §6). This test is about the *valve's* detection behavior
  given whatever κ it's fed, not about κ's own ground truth.

## What was not tested

Real production κ telemetry (still simulated); the mobile surface; a bounded
free-energy variant (proposed, not built); interaction with `elle-worker`'s
`superposition.ts` (SHADOW, gated behind anchored κ post-Gate-2 per the memory kernel
spec — this test is entirely client-side and does not touch it).

---

*Run it: `node docs/holding_pressure_test_iii.cjs` from the repo root.*
