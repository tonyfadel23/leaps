# Phase Convergence — readiness-driven, not question-counted

Every pipeline phase (`/learn` … `/ship`) decides when to STOP and move on by a **phase
readiness score**, not by a fixed number of questions. Drive toward readiness; converge
when it's high enough.

## Phase Readiness (0–100)

```
readiness = coverage × grounding-honesty
```

- **coverage** — the fraction of THIS phase's *required outputs* you've captured (each
  skill lists its own rubric; e.g. `/learn` = occasion + core job + ≥2 scored outcomes +
  rough size + complexity read).
- **grounding-honesty** — each captured output carries a source tag (`[data]`,
  `[context]`, `[pm]`, `[inferred]`) and every gap is named out loud. Honest PM estimates
  with flagged gaps still earn readiness — so a phase can converge with zero connectors.
  An outcome map that is silently all-`[inferred]` (unacknowledged guesses) **caps
  readiness low** until you either ground it or name the gap.

**Readiness is NOT conviction.** Readiness = "do I have enough to responsibly move the
process forward?" Conviction (`electron/engine/conviction.js`) = "should we pursue the
idea?" and is deliberately rigor-gated (needs *sourced* evidence). A phase can be
fully *ready* while conviction is still "needs" — that's expected and fine.

## The rule

- **Threshold = 80.** (Adjust by editing this file.)
- Each turn, self-assess readiness against the phase's rubric and report it as
  `phaseReadiness` (0–100) in the turn's `leap-findings` block.
- **Pull before you probe.** Pulling real data/knowledge raises readiness faster than
  asking opinion questions — attempt the skill's data/knowledge pull early.
- **Converge when readiness ≥ 80 — OR when it plateaus** (~2 turns with no path to raise
  it further). At that point STOP asking, present the phase's approval gate, state the
  readiness read, and **recommend the next phase**. The PM confirms (type `/explore`, etc.) —
  do not auto-chain.
- **Never loop on data you can't ground.** If readiness can't rise (no connectors, PM has
  no numbers), present what you have with the gaps named explicitly and let the PM decide
  — do not keep asking questions you cannot answer.

There is **no fixed question budget**. A sharp phase may converge in 3 questions; a fuzzy
one may take more — but it stops on readiness, never on a counter.
