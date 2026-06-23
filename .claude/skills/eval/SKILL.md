---
name: eval
description: >
  Evaluate LEAPs pipeline outputs and skill designs. Three modes:
  `/eval {idea-slug}` runs structural checks + LLM quality scoring on pipeline
  artifacts. `/eval system` meta-evaluates the skill and agent prompts themselves.
  `/eval all` batch-evaluates every pipeline idea and produces a cross-pipeline
  summary scorecard. Use after any pipeline stage to verify quality, or
  periodically to audit the system.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
---

# /eval — Pipeline & System Evaluator

Two-layer evaluation: structural checks (deterministic pass/fail) and quality
rubrics (LLM-as-Judge, 1-5 scoring). Run on pipeline outputs to catch gaps
before handoff, on skill designs to audit the system itself, or batch-evaluate
the entire pipeline at once.

---

## Usage

```
/eval water-subscription        # evaluate a pipeline idea's outputs
/eval system                    # meta-evaluate skill/agent designs
/eval all                       # batch-evaluate all pipeline ideas
/eval --all                     # alternative syntax
```

---

## Mode 1: Pipeline Eval (`/eval {idea-slug}`)

### Phase 1 — Detect Pipeline State

Read `pipeline/{idea-slug}/` and determine which stages have run:

| File | Stage |
|------|-------|
| `learn.md` | /1 learn |
| `explore.md` + `sketches/` | /2 explore |
| `assess.md` | /3 assess |
| `prove.md` | /4 prove |
| `prd.md` | Vibe-coding handoff (created /2, enriched /3, /4) |
| `opportunity.md` | Living doc (created by /1, enriched by /2, /3, /4) |

Report: "Found outputs for stages: [list]. Running eval on [N] artifacts."

### Phase 2 — Layer 1: Structural Checks

Run deterministic checks on each artifact that exists. These are pass/fail —
no LLM needed.

#### learn.md checks
- [ ] Has all required fields: input type, JTBD, affected, opportunity size, complexity, open questions, confidence
- [ ] JTBD is a single sentence (no line breaks within the JTBD value)
- [ ] Affected section has at least one number with a source citation
- [ ] Opportunity size has an explicit formula (contains `×` or `x` or `=`)
- [ ] Opportunity size states the metric type in parentheses (GMV / Revenue / Profit / Cost Savings / AOV uplift)
- [ ] Complexity has systems/teams listed after the t-shirt size
- [ ] Confidence color has a one-line reason
- [ ] Every number has a citation tag (`[pm]`, `[data: ...]`, `[context: ...]`, `[web: ...]`, `[inferred]`)

#### explore.md checks
- [ ] Has Mermaid journey diagram (contains ` ```mermaid`)
- [ ] Has variations table with 2+ rows
- [ ] Has a "Direction Chosen" section naming one variation
- [ ] Direction has "Why" rationale

#### sketches/ checks
- [ ] At least 2 `variation-{x}.html` files exist
- [ ] `index.html` exists
- [ ] `final-showcase.html` exists
- [ ] Each variation file has `?entry=` routing (contains `URLSearchParams` or `getParameter`)
- [ ] Each variation file has iframe detection (contains `window.self !== window.top`)

#### brief.html checks (if /3 has run)
- [ ] `brief.html` exists
- [ ] Contains `briefData` script block
- [ ] Has 6 slides (overview, journey, variations, metrics, build, decisions)
- [ ] Iframe `data-src` attributes point to existing showcase files

#### assess.md checks
- [ ] Has a Success Criteria table with columns: KR, Baseline, Target
- [ ] Has Kill Criteria section with at least 1 condition with a threshold
- [ ] Baselines cite at least one data source (contains a `[data: ...]` tag or dashboard name)
- [ ] Targets have timeframes (contains "day" or "week" or "month" or "90")
- [ ] Has Open Questions section
- [ ] Every baseline in the Success Criteria table has a citation tag (`[pm]`, `[data: ...]`, `[inferred]`)

#### opportunity.md checks (stage-dependent)
- [ ] File exists
- [ ] Has Team line below JTBD with at least 1 team listed
- [ ] Has all sections in order: Prototype, What to build, Don't build, Later, Build context, Decide before building, Decisions, Done looks like, Measure these, Scoring, Pipeline cost
- [ ] JTBD subtitle is a single sentence in the blockquote
- [ ] Decisions table has `When` column with Strategy/Experience/Rules values
- [ ] Decisions table has ≤5 rows (most consequential only; full log in decision-log.md)
- [ ] Decisions table links to `decision-log.md`
- [ ] Decide before building is a table with Question/Owner/Status columns
- [ ] Unfilled sections have `*Run /N*` placeholders (not empty)
- [ ] Has Scoring section with Impact, Complexity, and Confidence (each High/Medium/Low with rationale)

**If /2 has run:**
- [ ] Prototype section is filled — has direction + showcase link + "See also" traceability links
- [ ] What to build has at least 3 user-facing capabilities
- [ ] Don't build has at least 1 hard cut
- [ ] Later (post-MVP) has at least 1 deferred item with phase
- [ ] Decide before building has at least 1 row with Status: Open

**If /3 has run:**
- [ ] Done looks like is filled — one sentence, no metric numbers
- [ ] Measure these has at least 3 metrics with thresholds and source citations
- [ ] Stop if section has at least 1 kill signal with threshold
- [ ] Build context has Infrastructure table with Notes column
- [ ] Build context Notes explain customer-job relevance (not just technical status)
- [ ] Decisions table has rows with `When: Strategy`, `When: Experience`, and `When: Rules`
- [ ] Resolved questions in Decide before building show `Resolved` status (not removed)

#### prove.md checks
- [ ] Has Feasibility Assessment table with Status column (Ready/Partial/Gap/Blocked)
- [ ] Has an Overall feasibility verdict (Green/Yellow/Red)
- [ ] Has Competing Directions section with at least 2 directions
- [ ] Has Recommended Direction section naming one direction with rationale
- [ ] Has Dependency Map with at least 1 row
- [ ] Has Risk Register with at least 2 risks, each with Likelihood, Impact, Mitigation
- [ ] Feasibility Assessment notes have citation tags (`[scout: ...]`, `[pm]`, `[data: ...]`, `[inferred]`)

#### prd.md checks
- [ ] File exists at `pipeline/{idea-slug}/prd.md`
- [ ] Has "What to build" with at least 3 capabilities
- [ ] Has "Don't build" with at least 1 cut
- [ ] Has "Done looks like" (one sentence, not a metric number)
- [ ] Content traces to pipeline artifacts (no invented features)

#### Cross-file Coherence checks
- [ ] opportunity.md JTBD subtitle matches learn.md JTBD field
- [ ] assess.md references specific prototype screens (contains "variation" or "screen" or "entry" or "showcase")
- [ ] opportunity.md Measure these metrics align with assess.md KRs (metric names match)
- [ ] opportunity.md traceability links point to real files (learn.md, assess.md, explore.md, sketches/)
- [ ] Prototype `?entry=` params in final-showcase.html match variation file routing

#### Conviction integrity checks (stage /3+)
Deterministic honesty gate — the conviction verdict is computed by ONE engine (the rigor gate); this asserts the stored verdict wasn't drifted or hand-edited. Run:

```
node ../../leap/scripts/compute-conviction.js {idea-slug} --check
```

- [ ] `--check` exits 0 (stored `.briefdata.json` `conviction` matches a fresh recompute — no DRIFT)
- [ ] If exit 1 (drift/tampering): flag as a Layer-1 FAIL and recommend `--write` to recompute, or investigate why the stored verdict diverged from the engine
- [ ] Rigor gate holds: a `pursue` verdict never sits on 100%-modeled sizing (the engine caps Size ≤ 64 when `sizingSourced == 0`, so a stored Pursue implies real sourced evidence)

### Phase 3 — Layer 2: Quality Rubrics

Delegate to the Judge agent (`agents/judge.md`). Pass:
- Each output file that exists
- The relevant SKILL.md quality rules for each

The Judge scores each dimension 1-5 with one-line reasoning.

**Learn rubrics:**

| Dimension | What 5 looks like | What 1 looks like |
|-----------|------------------|------------------|
| JTBD Clarity | Single sentence naming segment, desired outcome, and current gap | Vague problem description without customer framing |
| Data Grounding | All numbers sourced from named data systems | Numbers appear fabricated or unsourced |
| Sizing Transparency | Formula explicit, assumptions named, source cited | "Roughly $X" with no derivation |
| Complexity Justification | T-shirt size with specific systems and teams | Size label with no supporting detail |
| Confidence Honesty | Color matches evidence level; gaps named | Confident rating with obvious gaps unacknowledged |
| Citation Coverage | Every number, benchmark, and dated fact has a citation tag; `[inferred]` used honestly | Numbers appear without any source attribution |

**Explore rubrics:**

| Dimension | What 5 looks like | What 1 looks like |
|-----------|------------------|------------------|
| Variation Distinctiveness | Concepts differ on genuinely different dimensions | Incremental tweaks of one idea |
| Journey Completeness | All 5 stages including Recovery; customer perspective | Missing stages; includes backend flows |
| Prototype Fidelity | Real design tokens, real content, real app screens as entry | Generic wireframe with placeholder text |
| Direction Rationale | Learned in evidence and JTBD, not just preference | "We liked this one" |

**Assess rubrics:**

| Dimension | What 5 looks like | What 1 looks like |
|-----------|------------------|------------------|
| Metric Structure | Connected tree: North Star → Inputs → Guardrails | Flat list of KPIs |
| Baseline Sourcing | All baselines from named data sources | "Estimated" or no baselines |
| Kill Specificity | Specific thresholds + timeframes + actions | "If it doesn't work, we'll stop" |
| Instrumentation Coverage | Gaps identified with proxies; tools specified or flagged TBC | Metrics proposed with no measurement path |
| Citation Coverage | Every baseline and target has a citation tag; `[inferred]` used honestly | Numbers appear without any source attribution |
| Conviction Rigor | Stored `conviction` verdict matches a fresh recompute; the rigor gate holds (no Pursue while sizing is 100% modeled); claims tagged `[data:…]` are real sources, not assumptions relabeled as data | Verdict asserted without recompute; high conviction sits on modeled-only sizing; `[data:]` tags hide `[pm]`/`[inferred]` claims |

**Opportunity rubrics:**

| Dimension | What 5 looks like | What 1 looks like |
|-----------|------------------|------------------|
| Template Compliance | All sections present, correctly structured | Missing sections or wrong structure |
| Decision Logging | Meaningful decisions with rationale and stage attribution | No decisions or just "yes, proceed" entries |
| Builder Readability | Engineer/AI agent can start building from this doc alone | Requires reading 3 other files to understand what to build |

**Prove rubrics:**

| Dimension | What 5 looks like | What 1 looks like |
|-----------|------------------|------------------|
| Feasibility Rigor | Every component scored with evidence; formula transparent | "Looks feasible" with no structured assessment |
| Direction Comparison | 2+ genuine alternatives compared on named criteria | One direction presented as inevitable |
| Risk Coverage | Risks have likelihood, impact, and specific mitigations | Generic risk list with no mitigation |
| Dependency Mapping | Named teams, APIs, timelines with status | "Depends on backend" with no specifics |
| Conviction Rigor | Verdict (Pursue/Needs/Kill) is defensible by the 4 dimensions and survives a fresh recompute; the gap names the true lowest dimension; evidence level matches the sourced-claim ratio | Verdict contradicts the dimension scores or a recompute; gap hand-waved; evidence inflated beyond what sources support |

### Phase 3b — Layer 3: PM Feedback

Read `pipeline/{idea-slug}/eval/feedback.md` if it exists. PM feedback is
collected after every phase (a quick rating) plus a richer follow-up at the
end of each skill run — see `_shared/protocols/feedback-collection.md`.

For each skill that has both PM feedback and automated quality scores:
- Show PM score alongside the automated average for that skill
- If delta > 1.0, flag it: "PM rated significantly [higher/lower] than
  automated assessment — worth investigating why"
- If PM left a "Would change" comment, surface it as a recommendation

If no PM feedback exists, note: "No PM feedback collected yet. Feedback is
collected automatically at the end of each skill run."

### Phase 4 — Scorecard

Produce and save the scorecard:

```markdown
# Eval: {idea-slug}
**Date:** YYYY-MM-DD
**Pipeline stage:** [Learned | Explored | Assessed]

## Layer 1: Structural Checks

### learn.md — N/N passed
- ✅ Has JTBD
- ❌ Sizing formula missing explicit formula marker
...

### explore.md — N/N passed
...

### opportunity.md — N/N passed
...

### Cross-file Coherence — N/N passed
...

## Layer 2: Quality Scores

| Skill | Dimension | Score | Reasoning |
|-------|-----------|-------|-----------|
| Learned | JTBD Clarity | 4/5 | Clear segment and gap, but outcome could be more specific |
| ... | ... | ... | ... |

**Overall: X.X / 5.0** (average across all scored dimensions)

## Layer 3: PM Feedback

| Skill | PM Score | Auto Score | Delta | Best Part | Would Change |
|-------|----------|------------|-------|-----------|--------------|
| /1 learn | 4/5 | 3.8/5 | +0.2 | JTBD framing | More competitor context |
| /2 explore | 5/5 | 3.4/5 | +1.6 | Prototypes | — |

*No PM feedback collected yet* ← (use this if feedback.md doesn't exist)

## Priority Fixes
- [Any dimension scoring ≤2, listed with specific improvement suggestion]

## Recommendations
1. [Specific improvement suggestion]
2. ...

---
*Generated by /eval, {date}*
```

Save to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md` (the idea owns its eval
history). This is the deep, LLM-judged scorecard — distinct from the
deterministic `eval/phase-checks.jsonl` that the background per-phase hook
appends after every phase.

**Trend:** If prior evals exist in the same directory, show the score delta:
"Previous eval (YYYY-MM-DD): X.X → Current: Y.Y (±Z.Z)"

### Phase 5 — Present & Recommend

Present the scorecard to the PM:
- "Layer 1: [N/M] structural checks passed"
- "Layer 2: Overall [X.X/5.0]"
- "Layer 3: PM feedback [summary or 'not yet collected']"
- "Priority fixes: [list any ≤2 scores]"
- "Recommendations: [top 3]"

---

## Mode 2: System Eval (`/eval system`)

Meta-evaluation of the skill and agent design. No pipeline outputs needed —
evaluates the SKILL.md and agent .md files directly.

### Phase 1 — Inventory

Read all skill and agent files:
- `.claude/skills/learn/SKILL.md` + `agents/*.md`
- `.claude/skills/explore/SKILL.md` + `agents/*.md`
- `.claude/skills/assess/SKILL.md` + `agents/*.md`
- `.claude/skills/prove/SKILL.md` + `agents/*.md`
- `.claude/skills/ship/SKILL.md` + `agents/*.md`
- `.claude/skills/eval/SKILL.md` + `agents/*.md`

Report: "Found [N] skills, [M] agents. Running system eval."

### Phase 2 — Rule Coverage

For each quality rule in each SKILL.md:
- **Testable** ✅ — has a corresponding structural check or rubric that can verify it
- **Aspirational** ⚠️ — states a principle but no way to verify from output alone
- **Contradicted** ❌ — conflicts with another rule in the same or different skill

Flag contradictions as priority fixes.

### Phase 3 — Agent Scope Clarity

For each agent:
- Is its responsibility boundary clear? (no overlap with other agents in the same skill)
- Are its inputs specified? (what it receives from the orchestrator)
- Are its outputs specified? (what it returns)
- Does it have quality rules or constraints?

Flag agents with unclear boundaries or missing I/O specs.

### Phase 4 — Handoff Integrity

Check that each skill's output contains everything the next skill needs:

| From | To | Required in output |
|------|----|--------------------|
| `/1 learn` | `/2 explore` | JTBD, segment, sizing, open questions |
| `/2 explore` | `/3 assess` | Chosen direction, prototype files, journey map |
| `/3 assess` | `/4 prove` | KRs, baselines, kill criteria, instrumentation gaps |
| `/4 prove` | `/5 ship` | Feasibility verdict, recommended direction, risk register, dependency map |

For each required item, check if the output template includes it.
Flag any missing handoff data.

### Phase 5 — Template Consistency

Check that opportunity.md update instructions across skills are consistent:
- Does each skill target the correct section?
- Are section names identical across all skill instructions?
- Does the progressive fill add up to a complete document?
- Are placeholder formats consistent (`*Pending — run /N*`)?

### Phase 6 — Design Token Coverage

Read `design/DESIGN.md` and check if the prototype-builder agent
references any tokens not defined there.

### Phase 7 — System Scorecard

```markdown
# System Eval
**Date:** YYYY-MM-DD
**Skills evaluated:** [N]
**Agents evaluated:** [M]

## Rule Coverage

| Skill | Testable | Aspirational | Contradicted |
|-------|----------|--------------|--------------|
| /1 learn | N | N | N |
| /2 explore | N | N | N |
| /3 assess | N | N | N |

### Contradictions Found
- [rule A in skill X] vs [rule B in skill Y]: [explanation]

### Aspirational Rules (no verification path)
- [skill]: [rule summary]

## Agent Scope

| Agent | Skill | Boundary Clear? | Inputs Spec'd? | Outputs Spec'd? | Has Rules? |
|-------|-------|-----------------|----------------|-----------------|------------|
| interviewer | /1 | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... | ... |

## Handoff Integrity

| From → To | Required | Present? |
|-----------|----------|----------|
| /1 → /2 | JTBD | ✅ |
| /1 → /2 | segment | ✅ |
| ... | ... | ... |

## Template Consistency

- [any mismatches found]

## Design Token Coverage

- [any missing tokens]

## Recommendations
1. [Specific improvement suggestion]
2. ...

---
*Generated by /eval system, {date}*
```

Save to `evals/system/YYYY-MM-DD.md`.

### Phase 8 — Cross-Pipeline Quality Patterns

Read all pipeline eval scorecards in `pipeline/*/eval/*.md` and identify
recurring quality issues across pipelines.

1. For each rubric dimension, collect scores across all pipeline evals
2. Flag **recurring weaknesses**: any dimension averaging ≤3.0 across 2+ evals
3. For each weakness, trace to the responsible skill/agent and propose a fix:
   - Which SKILL.md or agent .md file to change
   - Which section or rule to strengthen
   - What the change should accomplish

Add to the system scorecard:

```markdown
## Cross-Pipeline Patterns

| Dimension | Avg Score | Pipelines | Responsible File | Recommended Fix |
|-----------|-----------|-----------|-----------------|-----------------|
| [dimension] | [avg] | [slug (score), ...] | [file path] | [specific change] |

## Recommendations Applied (from prior system evals)
- ✅ [recommendation from YYYY-MM-DD] — implemented in [file]
- ❌ [recommendation from YYYY-MM-DD] — still open
```

If no prior pipeline evals exist, skip this phase and note:
"No pipeline evals found. Run `/eval {idea-slug}` first to generate scorecards."

---

## Mode 3: Batch Eval (`/eval all`)

Evaluate every pipeline idea in a single run and produce a cross-pipeline
summary scorecard. Useful for portfolio-level quality audits and spotting
systemic weaknesses across ideas.

### Phase 1 — Discover Ideas

Scan `pipeline/*/` to find all idea directories. Exclude:
- Directories that are landscapes (contain `landscape.md` but no `learn.md`)
- The `pipeline/index.html` file (not a directory)

Report: "Found [N] pipeline ideas to evaluate."

If an idea directory is empty (no pipeline output files), skip it and note:
"Skipped {slug} — no pipeline outputs found."

### Phase 2 — Sequential Eval

Run **Mode 1 (Pipeline Eval)** on each idea, one at a time. Show progress:

```
Evaluating {slug} ({N}/{total})...
```

Each individual eval saves to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md` as
normal — the batch run does not change individual eval behavior.

Collect from each eval:
- Stage (Learned / Explored / Assessed / Proven / Shipped)
- Layer 1 pass rate (N/M structural checks passed)
- Layer 2 overall score (X.X/5)
- Layer 3 PM score (X/5 or "—" if no feedback)
- Lowest-scoring dimension (the top issue to fix)

### Phase 3 — Cross-Pipeline Patterns

After all individual evals complete, analyze scores across the batch:

1. **Recurring weaknesses**: any rubric dimension averaging ≤3.0 across 2+ ideas.
   For each, name the dimension, the average, which ideas are affected, and a
   specific fix recommendation.

2. **Strongest dimensions**: any rubric dimension averaging ≥4.5 across 2+ ideas.
   These are working well — name the dimension, average, and which ideas.

3. **System cross-reference**: if a system eval exists in `evals/system/`,
   check whether its recommendations align with the recurring weaknesses found.
   Note any system-level fixes that would address multiple idea-level issues.

### Phase 4 — Batch Summary Scorecard

Produce and save the aggregate scorecard:

```markdown
# Batch Eval Summary
**Date:** YYYY-MM-DD
**Ideas evaluated:** N

## Overview

| Idea | Stage | L1 Pass Rate | L2 Score | PM Score | Top Issue |
|------|-------|-------------|----------|----------|-----------|
| {slug} | {stage} | N/M | X.X/5 | X/5 or — | {lowest dimension} |

## Cross-Pipeline Patterns

### Recurring Weaknesses (avg ≤3.0 across 2+ ideas)
| Dimension | Avg | Ideas Affected | Fix |
|-----------|-----|----------------|-----|

### Strongest Dimensions (avg ≥4.5)
| Dimension | Avg | Ideas |
|-----------|-----|-------|

## Recommendations
1. [System-level improvements based on patterns]

---
*Generated by /eval all, {date}*
```

Save to `evals/batch/YYYY-MM-DD.md`.

### Phase 5 — Present Summary

Present the batch results to the PM:
- "Evaluated {N} ideas across the pipeline"
- "Layer 1 average pass rate: {X}%"
- "Layer 2 average score: {X.X/5.0}"
- "Recurring weaknesses: [list dimensions ≤3.0 across 2+ ideas, or 'none']"
- "Strongest areas: [list dimensions ≥4.5, or 'none']"
- "Top recommendations: [top 3 system-level fixes]"

If any ideas were skipped, list them: "Skipped {N} ideas with no outputs: {slugs}"

**Trend:** If a prior batch eval exists in `evals/batch/`, show deltas:
"Previous batch eval (YYYY-MM-DD): avg L2 X.X → Current: Y.Y (±Z.Z)"

---

## Principles

1. **Structural before semantic.** Layer 1 catches template violations fast.
   Layer 2 only fires on artifacts that pass basic structure.

2. **Evidence-based scoring.** The Judge must cite specific text from the output
   for every score. "Good job" and "needs work" are not reasoning.

3. **Non-blocking by default.** Eval reports issues but never prevents the PM
   from continuing. It's a mirror, not a gate.

4. **Trend over snapshot.** When prior evals exist, always show the delta.
   A 3.5 that was 2.8 last week is progress. A 3.5 that was 4.2 is regression.

5. **System evals catch drift.** As skills evolve, rules can conflict and
   handoffs can break. Regular system evals catch this before pipeline runs do.

---

## Agent Definitions

- **Judge**: `agents/judge.md` — LLM-as-Judge quality scorer with rubrics per skill

---

## Pipeline Structure

```
product-os/
├── .claude/skills/eval/
│   ├── SKILL.md              # This file
│   └── agents/
│       └── judge.md          # LLM-as-Judge agent
├── evals/                    # Cross-idea evals only
│   ├── batch/                # Batch eval summaries (/eval all)
│   │   └── 2026-06-15.md
│   ├── system/               # System eval history (/eval system)
│   │   └── 2026-06-01.md
│   └── agent-tests/          # Structural unit tests
└── pipeline/
    └── {idea-slug}/          # Pipeline outputs being evaluated
        └── eval/             # Per-idea eval history (owned by the idea)
            ├── phase-checks.jsonl  # Deterministic per-phase checks (hook)
            ├── .eval-state.json    # Hook bookkeeping (phases evaluated)
            ├── feedback.md         # PM feedback (read by Layer 3)
            ├── 2026-06-01.md       # Deep LLM scorecard (this skill)
            └── 2026-06-15.md
```

---

## Related Skills

- `/1 learn` — Problem grinder (has inline Verify phase)
- `/2 explore` — Lo-fi prototypes (has inline Verify phase)
- `/3 assess` — Success criteria (has inline Verify phase)
- `/4 prove` — Feasibility (has inline Verify phase)
- `/prd` — Vibe-coding handoff prompt compilation
- `/5 ship` — Production prototype (has inline Verify phase)
