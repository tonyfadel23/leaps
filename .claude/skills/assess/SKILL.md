---
name: assess
description: >
  Take a prototyped experience and define how we'll know it works. Metric trees
  with real baselines, 90-day targets, kill criteria, and instrumentation gaps.
  Use when a PM says "/3" or "/assess", or after completing /explore (explore). Reads
  learn.md + explore.md + the actual prototypes and makes the problem measurable
  before exploring feasibility.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: metrics_source
    required: true
  - role: experimentation
    required: false
  - role: product_analytics
    required: false
    used_by: Data Analyst — instrumentation assessment (event existence checks)
  - role: monitoring
    required: false
    used_by: Data Analyst — kill criteria monitoring readiness
---

# /3 — Define

Take a prototyped experience (from `/explore`) and define success criteria.
What numbers move if this works? How do those numbers connect? What baselines
do we start from? What targets do we commit to? What would tell us to stop?

This step makes the problem measurable. It does NOT assess feasibility —
that's `/prove`'s job.

---

## Usage

```
/assess water-subscription
/assess water-subscription
```

Or after completing `/explore`, confirm the handoff: "Run `/assess` to continue."

### Session Management

Follow `_shared/protocols/session-management.md`. Phase names: `inspect`, `interview`, `validate`, `synthesize`, `verify`

Context keys: `outcome_map`, `top_outcomes`, `metric_tree`,
`confirmed_targets`, `baselines`, `kill_criteria`.

Phases:
- Phase 1 — Load, Align & Inspect (`activeForm`: "Loading and inspecting inputs")
- Phase 2 — Define Success (Interview) (`activeForm`: "Defining success criteria")
- Phase 3 — Validate & Instrument (`activeForm`: "Validating baselines & instrumentation")
- Phase 4 — Synthesize outputs (`activeForm`: "Synthesizing define card & opportunity brief")
- Phase 5 — Verify (`activeForm`: "Running structural checks")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

---

## Process

### Phase 1 — Load, Align & Inspect

**Staleness check:** Follow `_shared/protocols/staleness-check.md`.
Upstream: `learn.md`, `explore.md`. This skill's output: `assess.md`.

**Read claims cache:** Load `pipeline/{idea-slug}/.claims.json` if it exists
(per `_shared/protocols/claims-cache.md`). Check for existing baselines before
querying data sources — if a baseline already exists in the cache with
confidence "high" or "data", use it instead of re-querying. Present cached
data to the PM: "From /learn, I have these baselines: [list]. Want me to
re-verify any of them?"

---

The orchestrator does real work here — not a recap.

1. **Read inputs**: `pipeline/{idea-slug}/learn.md` and `pipeline/{idea-slug}/explore.md`.
   Extract from learn.md:
   - **Occasion signals** (Time, Social, Need, Struggle) — these shape metric
     selection. If Social (Family), guardrails protect group dynamics; if Need
     is Routine, retention and frequency matter more than acquisition.
   - **Job** — the core functional job (e.g., "get a complete breakfast before work")
   - **Outcome Map** — the 4D tables (Discover/Decide/Do/Resolve) with I/S/Opp
     scores for each outcome statement. These ARE the pre-built metric tree seed.
   - **Top Underserved Outcomes** (Opp >= 3.0) — the ranked list of outcomes with
     the most remaining opportunity. The highest-scoring outcome is the North Star
     candidate; the next 3-5 are Input Metric candidates.
   Extract from explore.md:
   - **Outcome Evaluation** table — which outcomes each variation addresses
   - **Chosen direction** and which outcomes it targets
2. **Inspect the prototypes**: Open `pipeline/{idea-slug}/sketches/index.html` and
   the chosen variation file. Identify the key interaction moments — these become
   measurement points. Note:
   - Where does the customer enter the flow? (awareness)
   - What's the core action? (activation)
   - What confirms success? (outcome)
   - Where could they drop off? (friction)
3. **Goals alignment**: Connect this initiative to your company or business line
   OKRs. Read `product_lines/_company/_context.md` and the relevant BL context
   if available. Frame: "This initiative serves [which OKR/goal] by [mechanism]."
   If the connection to strategic goals is weak or unclear, flag it.
4. **Confidence check**: If ground confidence is **red**, warn:
   "Ground confidence is red due to [X]. We can define success criteria, but
   [X] remains an assumption. Consider revisiting `/learn` first."

Present to the PM:
- "Here's where we are: [JTBD, chosen direction, opportunity size]"
- "The outcome map from /learn gives us [N] scored outcomes. The top [M] underserved
  outcomes (Opp >= 3.0) are: [list with scores]"
- "The prototyped experience has [N] key interaction moments: [list from prototype inspection]"
- "This connects to [OKR/goal]. I'll inherit the outcome table as the metric tree
  seed — outcomes are already measurable by definition."

### Phase 2 — Define Success (Define Interviewer Agent)

Delegate to the Define Interviewer agent (`agents/assess-interviewer.md`).

Pass the agent:
- Ground card (JTBD, sizing, confidence)
- Sketch summary (chosen direction, open questions)
- **Prototype interaction moments** identified in Phase 1
- **Goals alignment** context
- **Decision log** path: `pipeline/{idea-slug}/decision-log.md` — agent
  appends Q&A under `## /assess Assess — {date}`, continuing from last number

The Interviewer:
- Detects the PM's starting point (open, has conviction, has data)
- **Inherits the outcome table** from /learn as a pre-built metric tree seed:
  - **North Star** = highest-scoring underserved outcome (highest Opp score)
  - **Input Metrics** = next 3-5 underserved outcomes (Opp >= 3.0)
  - **Guardrails** = outcomes from the map that could regress if we over-optimize
    for the top outcomes (often from different 4D steps)
  - **Baselines** = the Satisfaction scores from /learn ARE the baselines — S=2 on a
    1-5 scale means 40% satisfied. No need to invent baselines from scratch.
  - **Targets** = "move satisfaction from S to S+N" — derived from the gap
    (e.g., S=2 -> target S=4 within 90 days)
- The outcome table gives structure; the Interviewer operationalizes it — mapping
  each outcome to a **trackable metric**, confirming the measurement instrument,
  and setting the satisfaction target
- References specific prototype screens when explaining what to measure
- Proposes kill criteria: **if the opportunity score drops below 1.5** (gap closed
  by competitor, importance dropped, or satisfaction improved without our
  intervention), the initiative loses its rationale. Also proposes traditional
  kill criteria tied to adoption/engagement thresholds.

**Citation tags — inline traceability:**

Baselines, targets, and benchmarks must carry citation tags:
- Baselines from Data Analyst: `[data: {source}: {prove/table}]`
- PM-provided targets: `[pm]`
- Inferred benchmarks: `[inferred]`
- Industry benchmarks from web search: `[web: source]`

**Critical — Data Over Guessing:**
When the Interviewer reaches baselines, the orchestrator MUST:
1. Check if Data Analyst agent (`.claude/agents/data-analyst.md`) has a connected `metrics_source`
2. If yes: delegate the baseline query, present real numbers
3. If no: ask the PM for data, or state what needs to be pulled and from where
4. **NEVER fabricate baselines, percentages, or benchmarks as if they're real data**

**Critical — No Tool Assumptions:**
When specifying "How we'll measure" in KR tables:
1. Do NOT auto-select measurement tools — use what's configured in `connectors.yaml`
2. Ask the PM: "How would you measure this?" or pull from configured tool list
3. If unknown, write "[to be confirmed]" rather than guessing

**Metric tree approval gate:**

When the interview converges on a complete metric tree, present the full
picture for explicit sign-off:

"Here's the complete metric tree (inherited from the outcome map):

> **North Star**: [outcome statement] (Opp: [score]) — S=[current] -> target S=[target]
>   Trackable as: [operational metric name + instrument]
> **Inputs**: [3-5 outcomes with Opp scores, S baselines, S targets, instruments]
> **Guardrails**: [outcomes that must not regress + thresholds]
> **Kill criteria**:
>   - Opportunity score drops below 1.5 (gap closed without intervention)
>   - [adoption/engagement threshold] after [N] days

Is this the right set? Want to change any metrics, targets, or kill criteria?"

**Do not proceed to Validate until the PM confirms the metric tree.**

**Kill criteria require explicit sign-off.** These are stop/go decisions.
Ask directly: "These are the conditions under which we'd kill or pivot this
initiative. Are you comfortable with these thresholds?" If the PM pushes
back, iterate — these matter too much to get wrong.

### Phase 3 — Validate & Instrument (Data Analyst Agent)

After the Interviewer converges on metrics, delegate to the Data Analyst
(`.claude/agents/data-analyst.md`) for an instrumentation check:

1. **Can we measure each metric today?** Check if the required events, tables,
   or explores exist in the connected data source
2. **Check `product_analytics` if available**: Resolve the `product_analytics`
   role — behavioral event platforms (Amplitude, Mixpanel) often know whether
   a specific event already fires. Check event existence before declaring
   "Needs work." This supplements `metrics_source`, not replaces it.
3. **Instrumentation gaps**: List what needs to be built — new events, tables,
   dashboard views — for metrics that can't be measured yet
4. **Proxy metrics**: For unmeasurable items, suggest available proxies from
   existing data
5. **Kill criteria monitoring readiness**: If `monitoring` is available, check
   whether existing alerts or dashboards already track the proposed kill criteria.
   Report: "Kill criterion [X] is already monitored in [tool]" or "Kill criterion
   [X] has no existing monitoring — needs new alert."

Present instrumentation findings to the PM:
"Of the [N] metrics defined, [X] can be measured today, [Y] need new tracking.
Here's what needs to be instrumented before launch: [list]."

**PM decision on gaps:** Don't just present findings — ask the PM what to do:

| Gap type | Ask |
|----------|-----|
| Metric can't be measured | "Should we use [proxy] instead, or flag this as a pre-launch instrumentation requirement?" |
| Baseline unavailable | "Should we set a baseline assumption and validate in week 1, or delay the target?" |
| Multiple proxies available | "Which proxy is closer to what you care about: [A] or [B]?" |

If instrumentation gaps change the metric tree (e.g., replacing a metric
with a proxy), update the confirmed tree and re-confirm with the PM before
proceeding to synthesis.

**Update claims cache:** After baseline validation, append new data findings
to `.claims.json`. Include all baselines pulled during define:
- Current metric values (from metrics_source, product_analytics)
- Instrumentation status (which metrics are measurable vs. gaps)
- Any cost/capacity data surfaced during metric discussions

### Phase 4 — Synthesize & Recommend

Produce the define card using the template in `_shared/templates/assess-card.md`.
Save to `pipeline/{idea-slug}/assess.md`.

**Also update `pipeline/{idea-slug}/opportunity.md`**:

1. Replace the **Done looks like** placeholder with one sentence describing
   the observable behavior change. No metric numbers.

2. Replace the **Measure these** placeholder with:

```markdown
## Measure these

- {metric}: {threshold} — *[source name](url-or-explore)*
- ...

**Stop if** any 2 trigger after 60 days:
- {kill signal}: {threshold}
- ...

Full metric tree + baselines: [`assess.md`](assess.md)
```

   Each metric should link to its data source. If no URL is available,
   use the source name: `*Source: {MCP name}: {prove/view}, {date}*`

3. Replace the **Build context** placeholder with an Infrastructure table:

```markdown
## Build context

| Component | Exists? | Notes |
|-----------|---------|-------|
| ... | Yes/No/Partial | ... |

Data sources: *[source name](url)* | *[source name](url)*
```

   **Notes column convention:** Explain *why* this component matters to the
   customer job, not just its technical status. "Dependency — confirmed but
   not shipped. Must support food + tMart items in single checkout" tells a
   builder what's at stake. "Coming soon" doesn't.

4. Update **Decide before building** table — mark resolved questions as
   `Resolved` with a one-line answer (don't remove them). Add new blocking
   questions with Status: `Open`. Drop non-blocking questions entirely
   (those stay in assess.md only).

5-8. Follow `_shared/protocols/opportunity-update.md` for Decisions (`When: Rules`), Scoring, Team line, and footer updates.

9. **Update Pipeline cost** — follow `_shared/protocols/pipeline-cost.md`.

**Self-check (before presenting):**

After writing assess.md but before presenting to the PM, scan for
anti-patterns and fix inline — don't flag to PM, just fix:

- [ ] Any KR says "improve X" without a specific threshold
- [ ] Kill criterion is vague ("if it doesn't work")
- [ ] Baseline says "estimated" without a citation tag
- [ ] Metric tree is a flat list, not a connected structure
- [ ] Target has no timeframe
- [ ] Any specific claim missing a citation tag (`[pm]`, `[data: ...]`, `[inferred]`)

**Post-synthesis review:**

After writing `assess.md` and updating `opportunity.md`, present the
define card to the PM:

"Here's the define card — metric tree, targets, kill criteria, and
instrumentation plan. And I've updated the opportunity brief with success
criteria and build context. Want to change anything?"

If the PM wants changes:
1. **Metric adjustment**: update the target, baseline, or confidence
2. **Kill criteria change**: adjust thresholds or add/remove conditions
3. **Scope change**: update what to build / don't build based on what metrics revealed
4. **Tree restructure**: change which metrics are inputs vs guardrails

Update both `assess.md` and `opportunity.md` with any changes.
Keep iterating until the PM approves. Only then proceed to cascade
check, brief generation, and verify.

**Cascade invalidation (re-runs only):** Follow `_shared/protocols/cascade.md`.
Downstream artifacts to check: `prove.md`.

**Create per-page md files:**

After PM approves, create the 1:1 md source files for the brief pages
added by this skill.

1. **Create `pipeline/{idea-slug}/metrics.md`** — source for the KPIs
   brief page. Structure: Alignment (goal + mechanism), North Star
   (metric, outcome #, Opp score, baseline, target, confidence), Input
   Metrics table, Guardrails table, Kill Criteria table, Instrumentation
   section. Pull from `assess.md`. Every metric links to an outcome #
   and Opp score from `outcomes.md`.

   **Baselines must be real data, not placeholders.** Before writing
   `metrics.md`, delegate to the Data Analyst (`.claude/agents/data-analyst.md`)
   to pull current values for each metric in the tree:
   - North Star baseline: query the `metrics_source` for the closest
     existing proxy (e.g., current group-like order patterns, completion
     rates for comparable flows)
   - Input metric baselines: pull from behavioral data, conversion funnels,
     or transaction logs
   - Guardrail baselines: pull current fail rates, cost metrics, or
     satisfaction proxies
   
   If Data Analyst returns no data for a metric, write the baseline as
   `[no data — needs instrumentation]` with a `[data gap]` tag, not a
   fabricated estimate. The brief's KPI breakdown table shows baselines
   and targets side-by-side — fake numbers here undermine the entire
   success criteria.

2. **Create `pipeline/{idea-slug}/scope.md`** — source for the Scope
   brief page. Structure: Direction (name + phase), Build (items with
   why in scope), Don't Build (items with why excluded), Later table
   (item / phase / reason), Build Context table (component / status /
   notes). Pull from `opportunity.md`.

3. **Update `pipeline/{idea-slug}/summary.md`** — update with success
   criteria context:
   - Update the 3rd evidence bullet if a credibility point now has metric backing
   - Update Seeking line if the ask has evolved (e.g., from "problem framing" to
     "approval for 90-day pilot with clear success criteria")

4. **Append to `pipeline/{idea-slug}/decisions.md`** — add /assess Assess
   decisions:
   - Append `### /assess Assess — {date}` to the Decision Log section
   - Update Open Questions table (resolve any answered, add new ones)
   - Update Resolved Decisions table with new decisions

**Update PRD:**

If `pipeline/{idea-slug}/prd.md` exists, append a "Success Criteria" section:
- North Star metric + target
- Kill criteria (conditions + timeframes)
- Key instrumentation requirements

If it doesn't exist, generate it now using the `/prd` template.

**Update the pipeline brief:**

Extract `briefData` fields per `_shared/reference/brief-field-mappings.md` (/assess section).
Write the extracted fields to `pipeline/{idea-slug}/.briefdata.json`.
Run: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief with `open pipeline/{idea-slug}/brief.html`.

Present: "The brief now includes success criteria and build scope. Run `/prove`
to explore feasibility."

### Phase 5 — Verify

Run structural checks from `_shared/templates/verify-assess.md`. Flag failures but don't block.

After verify passes, run `_shared/protocols/auto-publish.md` to update the live brief if previously published.

Then run **Tier 2** of `_shared/protocols/auto-eval.md`: delegate to the Judge agent (path in that protocol) and write the deep scorecard to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md`. Non-blocking — skip and note if an artifact is incomplete.

### Recommend Next Step

- "Success criteria are set. Run `/prove` to explore feasibility, constraints, and
  competing solution directions."

Do not auto-chain.

### Phase 6 — Collect Feedback

Follow `_shared/protocols/feedback-collection.md` with skill name `/assess`. This protocol runs at two cadences: **per-phase micro-ratings** after each phase completes (§A — one tap, non-blocking) and the **skill-end rating + follow-up** (§B). All feedback saves to `pipeline/{idea-slug}/eval/feedback.md`.

---

## Principles

1. **Inherited, not invented.** The outcome table from /learn IS the metric
   tree seed. North Star = highest-Opp outcome. Inputs = next 3-5 underserved
   outcomes. Baselines = satisfaction scores. /assess's job is to operationalize —
   mapping each outcome to a trackable metric and setting the satisfaction target.
   Don't reinvent what /learn already scored.

2. **Real data, not estimates.** Baselines come from the `metrics_source` connector or the PM.
   Never present fabricated numbers as baselines.

3. **Sketch-informed.** The experience direction from `/explore` shapes which metrics
   matter and WHERE to measure them. Reference specific prototype screens when
   explaining measurement points.

4. **Kill criteria are specific.** "If it doesn't work" is not a kill criterion.
   "If adoption < 3% after 60 days" is. Include both kill and pivot triggers.

5. **Instrumentation is part of defining.** Proposing metrics you can't measure
   is the same as not proposing them. Flag gaps and suggest proxies.

6. **Goals-aligned.** Every metric tree should connect upward to a company or
   BL-level OKR. If it doesn't, the initiative might not be strategically
   anchored — flag that.

7. **Measurable, not aspirational.** KRs have baselines (satisfaction scores
   from /learn), targets (satisfaction improvement), confidence levels, and
   instruments. "Improve retention" is not a KR. "Move satisfaction from S=2
   to S=4 on 'minimize decisions to order' (Opp: 5.0, tracked via checkout
   step count, confidence: medium)" is.

8. **No feasibility yet.** If the PM starts asking about technical constraints
   or team dependencies, redirect: "That's exactly what `/prove` will cover.
   Let's lock the success criteria first."

9. **Thinking is visible.** The PM reads your reasoning in real time.
   When proposing baselines or targets you haven't sourced, say so in
   thinking before presenting. If two metric structures are both valid,
   name the tradeoff. Brief: 30-80 words of thinking per question or
   synthesis section. Don't fake confidence in the thinking block.

---

## Agent Definitions

- **Define Interviewer**: `agents/assess-interviewer.md` — Adaptive success criteria interviewer with metric tree thinking
- **Data Analyst**: `.claude/agents/data-analyst.md` — Sizing, baselines & instrumentation via `metrics_source` connector

If an agent is unavailable, note it and continue: "Data sources not connected —
flagging [X] as a baseline gap for PM to fill."

---

## Related Skills

- `/learn` — JTBD problem statement and sizing
- `/explore` — Previous step: lo-fi prototypes and journey maps
- `/prove` — Next step: feasibility, constraints, competing directions
- `/ship` — Production-ready prototype and stress-test
