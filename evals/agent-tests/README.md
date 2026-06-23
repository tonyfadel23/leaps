# Testing skills & agents (the "TDD" for the pipeline)

Skills and agents are prompts, not functions — you can't unit-test them the way
you test `conviction.js`. Instead LEAPs uses a **three-tier test pyramid**, from
fast/deterministic to slow/judgment-based. This is the closest equivalent to TDD
for a prompt-driven system: write the check first, then make the skill satisfy it.

## 1. Structural tests — fast, deterministic (`npm test` includes this)

`structural.test.js` validates the *framework* is wired correctly:
- every agent `.md` has real content (not just frontmatter),
- every expected skill has a `SKILL.md`,
- every `agents/…md` and `protocols/…md` referenced by a SKILL.md exists on disk,
- all protocol files are non-empty.

This is what catches a rename or a phantom reference (a skill pointing at an agent
that doesn't exist). Run: `node evals/agent-tests/structural.test.js`

## 2. Contract tests — deterministic, data-driven (`npm run eval`)

`contracts.test.js` validates that real ideas in `pipeline/` satisfy the
handoff schema at each stage:
- the stage's required output exists (`/1`→`learn.md`, `/2`→`explore.md` +
  `sketches/*.html` + `competitors/`, `/3`→`assess.md`, `/4`→`prove.md`,
  `/5`→`ship/`),
- `opportunity.md` has its core sections, `decision-log.md` has Q&A entries,
  `.state.json` matches the documented schema.

On a fresh clone (no `pipeline/`) it passes with nothing to check. Against your
own ideas it surfaces real gaps (an idea that reached "assessed" but never wrote
`explore.md`). Run: `node evals/agent-tests/contracts.test.js`

## 3. Quality evals — LLM-as-Judge, slow (`/eval`)

The `/eval` skill delegates to the **Judge agent** (`.claude/skills/eval/agents/judge.md`),
which scores each stage's output 1-5 against per-stage rubrics (incl. **Conviction
Rigor**, which runs `compute-conviction.js {slug} --check` so a verdict can't drift
from the engine). This is the acceptance-test layer — judgment a structural check
can't make. Run: `/eval {idea-slug}` in a Claude session.

## The honesty gate

Tier-1 also includes `scripts/compute-conviction.js {slug} --check`: it recomputes
conviction from the files and fails if it disagrees with what's stored. Conviction
can be *grounded* up (with sourced claims) but never *talked* up.

## Running

```bash
npm test          # script unit tests + structural (always green on any clone)
npm run eval      # structural + contract tests (contracts validate local data)
```
