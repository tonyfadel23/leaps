---
name: learn
description: >
  Take any fuzzy idea, directive, or signal and grind it into a sharp, grounded
  problem statement through JTBD-native conversation. Use when a PM says "/learn",
  "I have an idea", "what do you think about", "Toon/Jeremy wants us to", or any
  raw product idea that needs sharpening before exploring solutions.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: metrics_source
    required: true
  - role: knowledge_base
    required: false
    used_by: Context Retriever — prior work, system ownership, decisions
  - role: ticketing
    required: false
    used_by: Context Retriever — prior engineering work, closed tickets
  - role: feedback
    required: false
    used_by: Context Retriever — customer demand signals, feature requests
  - role: support
    required: false
    used_by: Context Retriever — customer pain points, complaint volume
  - role: research_repository
    required: false
    used_by: Context Retriever — prior user research, interview findings
  - role: app_store
    required: false
    used_by: Context Retriever — unsolicited customer voice, review themes
---

# /learn — Problem Grinder

Take any input — a half-formed idea, a top-down directive, a competitive signal,
an incident — and grind it into a sharp problem statement through conversation.
No templates. No forms. Just focused interrogation that lands on a JTBD, a sizing
napkin, and a confidence call.

---

## Usage

```
/learn I want to launch a water subscription service
/learn Leadership wants us to explore a new fulfillment model
/learn The bundle pilot worked, what's next
/learn We need to hit 30% grocery repeat rate
/learn Customers keep complaining about delivery slots
/learn Instacart just launched X
```

Or just paste a raw idea — the skill detects the input type and adapts.

### Session Management

Follow `_shared/protocols/session-management.md`. Phase names for this skill:
`orient`, `interview`, `synthesize`, `verify`

Context keys: `input_type`, `doc_context`, `occasion`, `job`, `outcome_map`,
`top_outcomes`, `confirmed_jtbd`, `confirmed_segment`, `sizing_data`.

Phases:
- Phase 0 — Preflight (`activeForm`: "Checking MCP connections")
- Phase 1 — Detect & Orient (`activeForm`: "Detecting input type & loading context")
- Phase 2 — Interrogate (`activeForm`: "Interviewing — occasion, job & outcomes")
- Phase 3 — Synthesize (`activeForm`: "Synthesizing ground card & opportunity brief")
- Phase 4 — Verify (`activeForm`: "Running structural checks")
- Phase 5 — Recommend Next Step (`activeForm`: "Recommending next step")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

**Track these phases with `TodoWrite`** — one todo per phase, using the `activeForm`
strings above, marking each `in_progress` then `completed` as you go. The app renders
this as a live phase checklist for the PM.

**End every question turn with a `leap-ask` block** — a fenced list of the 2-4
answers/next-steps you're proposing, so the app can show them as one-tap chips and
highlight the question:

````
```leap-ask
- Confirm this framing
- Reframe the occasion
- Pull the data first
```
````

---

## Process

### Phase 0 — Preflight (Connector Check)

Before starting any work, resolve the connectors this skill depends on.
Follow the connector-resolver protocol (`_shared/protocols/connector-resolver.md`).

**Required roles for /1 learn:**

| Role | Required | What it provides | What's lost without it |
|------|----------|-----------------|----------------------|
| `metrics_source` | Yes | Customer counts, order volumes, sizing numbers | Sizing uses PM-provided numbers or placeholders instead of real metrics |
| `knowledge_base` | No | Prior work, domain ownership, existing decisions | Grounding relies entirely on conversation — can't check what's been tried |

**How to check:**

1. Read `connectors.yaml` from the pipeline root
2. For each role, resolve the primary MCP and fallbacks
3. A server is "connected" if at least one tool with its prefix exists
4. A server "needs auth" if it only exposes an `authenticate` tool

**Report to PM:**

Show a compact connector status table:

```
Connector Preflight
✓ metrics_source — {mcp_name} (connected)
  ↳ fallbacks: {fallback1} (connected), {fallback2} (not found)
✓ knowledge_base — {mcp_name} (connected)
```

**Decision logic:**

- **All required roles resolved** → proceed silently to Phase 1
- **Optional roles missing** → note what's skipped, proceed to Phase 1
- **Required roles missing** → show the fallback mode and ask:
  > "{role} is not connected. I'll {fallback_mode description} when I need data.
  > To connect: run `/setup --role {role}`."
  - If PM says proceed: continue with degraded mode
  - If PM wants to fix: wait for them to configure, then re-check

### Phase 1 — Detect & Orient

1. Read the PM's input
2. Detect input type (see Interviewer agent: 6 types)
3. If ambiguous, ask: "This reads like a [type] — is that right, or is it more [alternative]?"
4. Load context — **run before generating the skeleton brief, not after:**
   - **Mandatory wiki pull**: Invoke the Context Retriever agent immediately with the PM's raw input as the query. Run all available supplementary sources (ticketing, feedback, support, research_repository). This pull happens before the first interview question so the interviewer enters the conversation knowing what the org already knows.
   - If pipeline folder exists for this idea: read prior work from `learn.md`, `decision-log.md`
   - Surface to the PM: "Here's what I found in our knowledge base before we start: [findings summary]". If nothing found, say so — don't skip silently.
   - Pass the full Context Retriever output to the Interviewer as pre-loaded context so it can propose answers grounded in prior work from question 1.
5. **Generate skeleton brief** — create `pipeline/{idea-slug}/brief.html`
   immediately so the PM can see it from the first question:
   - Derive the idea title from the PM's input (e.g. "Water Subscription")
   - Set `briefData` with:
     - `meta` (slug, today's date, stage: 'Ground')
     - `betHeadline: '...'` (placeholder — will be sharpened in synthesis)
     - `title`, `jtbd: '...'` (placeholders)
     - `occasionLabel: ''`, `opportunityLabel: ''`, `seeking: ''`, `producer: ''`
     - `executiveSummary: []` (empty array — filled after synthesis)
     - `confidence: null`, `keyNumbers: null`
     - All other fields `null`: `occasion`, `job`, `outcomeMap`, `topOutcomes`,
       `research`, `competitors`, `journey`, `direction`, `variations`,
       `chosenDirection`, `metrics`, `killCriteria`, `goalsAlignment`,
       `whatToBuild`, `dontBuild`, `later`, `buildContext`, `feasibility`,
       `decisions`, `openQuestions`, `decisionLog`, `prd`
     - `pipelineCost: { sessions: 0, estCost: '' }`
     - `files: { prototype: null, finalShowcase: null, journey: null, variationExplorer: null }`
   - The brief renders with just a Summary slide showing the placeholder
     title. Other slides appear as their data becomes non-null.
   - Run: `node scripts/build-brief.js {idea-slug} --skeleton`
   - Open the brief: `open pipeline/{idea-slug}/brief.html`
   - Present: "Started the pipeline brief — it'll fill in as we go."

### Phase 2 — Interrogate (Interviewer Agent)

Delegate to the Interviewer agent (`agents/interviewer.md`). The Interviewer:

- Asks ONE question at a time, proposes answers, waits for confirm/redirect
- Adapts question path based on input type
- Leads with occasion identification, then names the core functional job
- Walks the 4D job map (Discover → Decide → Do → Resolve) to generate outcome statements
- Scores each outcome on Importance (1-5) and Satisfaction (1-5)
- Ranks by opportunity score: `I × (5 - S) / 4` (range 0-5)
- Top 5 underserved outcomes ARE the opportunity
- Synthesizes JTBD grounded in top outcomes
- Shows its plan before executing analysis ("here's how I'd size this...")
- Drives toward: scope clarity → occasion → job → 4D outcomes → score → rank → JTBD → sizing → complexity

**Agent delegation:** The interview is the main thread. Context Retriever
and Data Analyst fire inline between questions when the Interviewer needs
data. The PM sees a continuous conversation.

**Critical — Data Over Guessing:**

The Interviewer has a **mandatory occasion validation** (step 3b) that MUST
run before generating outcomes. This is the most common failure mode:
skipping data pulls and producing an outcome map full of `[inferred]` scores.

**Enforcement rule:** If the Interviewer presents an outcome map where >30%
of scores are `[inferred]`, stop and ask: "Most of these scores are
inferences — should I pull data first?" The occasion validation requires:

1. **Data Analyst query** — occasion metrics (volumes, segments, behavioral data)
2. **Context Retriever query** — internal knowledge (UXR, prior experiments, customer feedback)

**Competitor research is NOT part of grounding.** It happens in `/2 explore`
after outcomes are ranked — focused on the top underserved outcomes rather
than cast broadly across the whole problem space.

The pattern is: validate occasion with data → generate outcomes → rank → THEN
competitor research in /2 targets your top outcomes.

When the conversation reaches "who's affected" or "sizing", the Interviewer MUST:
1. Check if Data Analyst is available → delegate the query
2. If no agent: ask the PM for estimates, or state the formula with explicit blanks
3. **NEVER fabricate numbers, percentages, or customer counts**
4. **Tag every I/S score with its confidence source** (see Scoring Sources below)

**Scoring Sources:** PM judgment `[pm]`, support tickets `[data: support]`, app reviews `[data: reviews]`, behavioral data `[data: analytics]`, competitor analysis `[web: competitor]`. When 2+ sources converge ±1, confidence = high. Single source = medium. PM-only = low.

**Customer Evidence Gap — Research Plan:**
If after the interview completes, no direct customer feedback or evidence was
found (knowledge base had no relevant findings, Data Analyst returned no behavioral
data, PM has no customer research to share), generate a user research plan
using `_shared/templates/research-plan.md`. Save to `pipeline/{idea-slug}/research-plan.md`.

**Exception:** Type 2 (Top-Down Initiative) with green confidence can skip —
the executive mandate is the signal. All other types need evidence or a plan
to get it.

When generated:
1. Set confidence to yellow at minimum
2. Add "Customer evidence gap — see research-plan.md" to open questions in learn.md
3. In Phase 5, suggest running the research plan before `/2`

**Citation tags — inline traceability:**

Every specific claim (number, percentage, date, cohort label, benchmark)
must carry an inline citation tag so the PM can trace it to source:

| Tag | Meaning |
|-----|---------|
| `[pm]` | PM-provided during interview |
| `[data: source]` | From Data Analyst — name the MCP and prove/table used |
| `[context: source]` | From knowledge base query |
| `[web: source]` | From web search (competitor data, benchmarks) |
| `[inferred]` | Model's own inference — not directly sourced |

What requires a tag: any percentage, count, ratio, duration, absolute
number, specific cohort label, benchmark, comparator, or dated fact.

What does NOT require a tag: general reasoning, hypotheticals, section
framing sentences.

Example: "155K monthly water buyers `[data: {source}: QC Category Performance]`
spend an average $42/order `[data: {source}: QC Category Performance]`."

When the Interviewer presents a number sourced from an agent, tag it
inline. When the PM provides a number, tag it `[pm]`. If you're inferring
(e.g., a conversion rate assumption), tag it `[inferred]` — an honest
inference is more useful than a number that looks sourced but isn't.

**Rules:**
- Never batch questions
- Never ask open-ended "what do you think?" — always propose an answer
- Never skip straight to solutions — this skill is about the problem
- Never guess data — delegate to agents or ask the PM
- If the PM starts solutioning, redirect: "Let's nail the problem first — we'll explore solutions in `/prove`"
- **Log every Q&A**: after each question and PM response, append to
  `pipeline/{idea-slug}/decision-log.md` (see Decision Log below)

**Approval gate:**

When the interview converges, present the full occasion + job + top outcomes + JTBD
for explicit sign-off before moving to synthesis:

"Here's where we landed:

> **Occasion**: [name] — [one-sentence description]
>   Time: [value] | Social: [value] | Need: [value] | Struggle: [value]
>
> **Job**: [core functional job statement]
>
> **Top Underserved Outcomes** (Opp ≥ 3.0):
> 1. [Outcome statement] — **[score]** [source tag]
> 2. [Outcome statement] — **[score]** [source tag]
> 3. [Outcome statement] — **[score]** [source tag]
>
> **JTBD**: [segment] who [occasion] want to [outcome] but [struggle]
> **Affected**: [who, how many]
> **Opportunity size**: [napkin number] ([GMV / Revenue / Profit / Cost Savings])
> **Complexity**: [S/M/L/XL]
> **Confidence**: [red/yellow/green] — [reason]

Is this the right problem statement? Want to sharpen anything before I
write it up?"

**Do not synthesize until the PM confirms.**

If the PM pushes back, iterate — adjust the framing, re-ask specific
questions, re-pull data if needed. Only proceed when they say it's right.

**Confidence co-determination:**

When presenting the confidence level, explain why and ask:
"I'd call this [color] because [reason]. Do you agree, or do you see it
differently?" If the PM overrides, use their call and note the reasoning.

### Phase 3 — Synthesize & Output

Produce the ground summary card using the template in `_shared/templates/learn-card.md`.
Save to `pipeline/{idea-slug}/learn.md`.

**Also create `pipeline/{idea-slug}/decision-log.md`** — the running record
of every question asked and every PM answer across all pipeline stages:

```markdown
# Decision Log: [idea-slug]

## /1 learn — {date}

**Q1**: [full question as presented — including context, reasoning, and proposed answer. Do NOT summarize.]
**A1**: [PM's full response]

**Q2**: [full question as presented]
**A2**: [PM's full response]

...
```

Questions are numbered sequentially (Q1, Q2... Qn) and never restart —
later stages continue from the last number. **Log the full question
verbatim** — including your reasoning, proposed answers, and context.
A reader should understand each decision without having seen the live
conversation. Log confirmations ("confirmed"), redirects ("no, I meant..."),
and everything in between.

**Create `pipeline/{idea-slug}/opportunity.md`** using `_shared/templates/opportunity-init.md`.
Follow `_shared/protocols/opportunity-update.md` for Decisions table and Decide before building rules.

**Template rules specific to /1 learn:**
- **Team line**: List teams that surfaced during grounding (from complexity
  assessment). Later skills append teams as they surface.
- **Decisions table**: Keep only the **5 most consequential** decisions here.
  Everything else stays in `decision-log.md`. When a new decision outweighs
  an existing one, swap it in.
- **Decide before building**: Table with status tracking. `Open` / `Resolved`
  / `Blocked`. When resolved, keep the row — change status and add a one-line
  answer. Never silently remove resolved questions.
- Log every meaningful PM decision (scope choices, framing, segments) to the
  Decisions table with `When: Strategy`. Not every "yes, go ahead."

**Update Pipeline cost** — follow `_shared/protocols/pipeline-cost.md`.

**Self-check (before presenting):**

After writing learn.md but before presenting to the PM, scan for
anti-patterns and fix inline — don't flag to PM, just fix:
- [ ] JTBD uses hedging verbs (could, might, may)
- [ ] Affected section says "users" without naming the segment
- [ ] Opportunity size has a number without a citation tag
- [ ] Confidence rationale is generic ("needs more data" without specifics)
- [ ] Any specific claim missing a citation tag (`[pm]`, `[data: ...]`, `[context: ...]`, `[web: ...]`, `[inferred]`)

**Post-synthesis review:**

After writing `learn.md` and `opportunity.md`, present the ground card
to the PM for review:

"Here's the ground card — [show key fields]. And the opportunity brief
is started. Want to change anything before we move on?"

If the PM wants changes:
1. **JTBD reframe**: update learn.md and opportunity.md subtitle
2. **Sizing adjustment**: re-pull data or adjust assumptions
3. **Complexity change**: update systems/teams
4. **Confidence override**: use PM's call

Keep iterating until the PM approves. Only then proceed to cascade
check, brief generation, and verify.

**Write claims cache:** After synthesis, persist all data findings to
`pipeline/{idea-slug}/.claims.json` per `_shared/protocols/claims-cache.md`.
Include every data point that was pulled during grounding:
- Sizing numbers (order volumes, customer counts, segment sizes)
- Baselines (conversion rates, AOV, frequency)
- Market data (competitor metrics, benchmark numbers)

Each claim includes: `metric`, `value`, `source`, `confidence`, `skill` ("/1 learn"), `date`.
This prevents downstream skills from re-querying the same data.

**Cascade invalidation (re-runs only):** Follow `_shared/protocols/cascade.md`.
Downstream artifacts to check: `explore.md`, `assess.md`, `prove.md`.

**Create per-page md files:**

After creating `learn.md` and `opportunity.md`, create the 1:1 md source
files that map to brief pages. These are the extensive versions — the brief
compresses them.

1. **Create `pipeline/{idea-slug}/summary.md`** using `_shared/templates/summary-init.md`.

   **Evidence Narrative rules:**
   - Exactly 3 bullets in a story arc: problem is real → opportunity is sized → bet is credible
   - Each bullet: bold lead stat, dash, one-sentence interpretation, inline hyperlinked source
   - Sources come from learn.md Data Sources table — use the actual URLs
   - If only PM-provided data exists, cite as `[pm]` with no URL

2. **Create `pipeline/{idea-slug}/outcomes.md`** using `_shared/templates/outcomes-page.md`.
   Pull all content from `learn.md` — restructured extraction, not new synthesis.

3. **Create `pipeline/{idea-slug}/decisions.md`** — the append-only decision
   log source for the brief. Structure: Open Questions table, Resolved
   Decisions table, and Decision Log section with full Q&A from
   `decision-log.md`. Open Questions and Resolved Decisions are extracted
   from `opportunity.md`.

**Update the pipeline brief:**

Extract `briefData` fields per `_shared/reference/brief-field-mappings.md` (/1 section).
Write the extracted fields to `pipeline/{idea-slug}/.briefdata.json`.
Run: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief with `open pipeline/{idea-slug}/brief.html`.

Present: "Here's the pipeline brief — it starts with the occasion, job,
and outcome scores. More slides will appear as you run /2, /3, and /4."

### Phase 4 — Verify

Run structural checks from `_shared/templates/verify-learn.md`. Flag failures but don't block.

After verify passes, run `_shared/protocols/auto-publish.md` to update the live brief if previously published.

Then run **Tier 2** of `_shared/protocols/auto-eval.md`: delegate to the Judge agent (path in that protocol) and write the deep scorecard to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md`. Non-blocking — skip and note if an artifact is incomplete.

### Phase 5 — Recommend Next Step

Based on confidence level:

- **Green**: "This is well-grounded. Run `/2` to sketch the experience."
- **Yellow**: "We have gaps in [X]. I'd suggest [specific action] before moving on. Want to dig deeper, or move to `/2` anyway?"
- **Yellow with research plan**: "We have no direct customer evidence for this problem. I've created a research plan — see `research-plan.md`. Consider running it before `/2` to validate the problem is real. Want to proceed anyway, or run the research first?"
- **Red**: "The problem isn't sharp enough yet. I'd recommend [specific question to answer]. Want to continue grounding?"

If the PM confirms next step, state: "Run `/2` to continue." Do not auto-chain.

### Phase 6 — Collect Feedback

Follow `_shared/protocols/feedback-collection.md` with skill name `/1 learn`. This protocol runs at two cadences: **per-phase micro-ratings** after each phase completes (§A — one tap, non-blocking) and the **skill-end rating + follow-up** (§B). All feedback saves to `pipeline/{idea-slug}/eval/feedback.md`.

---

## Principles

1. **Conversation, not template.** The PM experiences this as a dialogue, not a form.
   The summary card is a receipt of the thinking, not the thinking itself.

2. **JTBD-native, domain-fluent.** Never ask "who's your target user?" Ask "are you
   thinking the 2M monthly grocery customers who already buy water, or the
   segment that gets a product they already buy delivered and doesn't use your company?"

3. **Problem, not solution.** This skill grinds the problem. If the PM jumps to
   solutions, bring them back. Solutions live in `/prove`.

4. **Opinionated, not open-ended.** Propose answers for qualitative framing.
   "I'd position this as a groceries recurring add-on — confirm?" Not "where do
   you see this living?" **But never propose numbers** — delegate to Data Analyst
   or ask the PM. "I'd guess 30%" is fabrication. "Let me pull the data" is right.

5. **Show your work.** Before sizing or analysis, show the plan: "Here's how I'd
   size this — [approach]. Want me to pull the data?" Never present the estimate
   before pulling it. The plan comes first, then the data, then the result.

6. **Napkin math, not spreadsheets.** Sizing is back-of-napkin with stated assumptions.
   Precision comes in `/assess` with real data.

7. **Thinking is visible.** The PM reads your reasoning in real time.
   Think out loud honestly — if you're unsure, say so. If you're inferring
   rather than sourcing, name the gap. Brief: 30-80 words of thinking per
   question or synthesis section. Don't fake confidence in the thinking
   block, and don't write commentary in the text block.

---

## Agent Definitions

- **Interviewer**: `agents/interviewer.md` — JTBD-native sequential questioning
- **Context Retriever**: `agents/context-retriever.md` — Knowledge base retrieval via `knowledge_base` connector
- **Data Analyst**: `.claude/agents/data-analyst.md` — Sizing, baselines & instrumentation via `metrics_source` connector

---

## Related Skills

- `/2 explore` — Next step: lo-fi prototypes and journey maps
- `/3 assess` — Success criteria, KRs, targets
- `/4 prove` — Feasibility, constraints, competing directions
- `/5 ship` — Production-ready prototype and stress-test
- `/grill-me` — Stress-test the grounded problem statement
