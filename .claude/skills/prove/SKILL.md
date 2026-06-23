---
name: prove
description: >
  Grind a sketched and defined idea against reality. Feasibility assessment,
  competing implementation directions, dependency map, and risk register.
  Use when a PM says "/4" or "/prove", or after completing /3 (assess).
  This is the first skill where solutions are on the table.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: knowledge_base
    required: false
    used_by: Architecture Scout — prior work, system ownership, architectural decisions
  - role: metrics_source
    required: false
    used_by: Data Analyst — capacity and cost signals
  - role: ticketing
    required: false
    used_by: Architecture Scout — engineering design docs, RFCs, prior tickets
  - role: code_explorer
    required: false
    used_by: Architecture Scout — existing APIs, services, implementation patterns, dependencies
---

# /4 — Explore

Grind the defined idea against reality. You have a JTBD, a prototype, and
success criteria. Now: can it actually be built, by whom, in what time, and
which implementation approach is worth committing to?

This is the first skill where solutions are on the table. Every prior skill
explicitly deferred feasibility and implementation direction here. `/4` delivers
a conviction-ready answer: here is the recommended direction, here is why,
here is what blocks us, here is what could kill it before launch.

**No constraints in `/2`. No feasibility in `/3`. That work starts here.**

---

## Usage

```
/4 water-subscription
/prove water-subscription
```

Or after completing `/3`, confirm the handoff: "Run `/4` to continue."

### Session Management

Follow `_shared/protocols/session-management.md`. Phase names: `audit`, `feasibility`, `directions`, `synthesize`, `verify`

Context keys: `assumptions_audited`, `feasibility_verdict`,
`competing_directions`, `recommended_direction`.

Phases:
- Phase 1 — Load & Audit (`activeForm`: "Loading inputs and auditing assumptions")
- Phase 2 — Feasibility Interview (`activeForm`: "Assessing feasibility")
- Phase 3 — Competing Directions (`activeForm`: "Mapping competing implementation approaches")
- Phase 4 — Synthesize (`activeForm`: "Synthesizing explore card & updating opportunity brief")
- Phase 5 — Verify (`activeForm`: "Running structural checks")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

---

## Process

### Phase 1 — Load & Audit

**Staleness check:** Follow `_shared/protocols/staleness-check.md`.
Upstream: `learn.md`, `explore.md`, `assess.md`. This skill's output: `prove.md`.

---

The orchestrator does real work here — not a recap.

1. **Read all inputs**:
   - `pipeline/{idea-slug}/learn.md` — Occasion (signals), Opportunity (struggle + signal scores), JTBD, sizing, complexity, open questions
   - `pipeline/{idea-slug}/explore.md` — chosen direction, open questions
   - `pipeline/{idea-slug}/assess.md` — metric tree, kill criteria, instrumentation gaps, assumptions
   - `pipeline/{idea-slug}/opportunity.md` — builder brief, Build context table, Decide before building

2. **Audit assumptions**: Extract every assumption from all prior files. These
   are the inputs that `/4` is responsible for validating or qualifying.
   Look for:
   - Explicit assumptions from assess.md's Assumptions section
   - Implicit assumptions in learn.md's sizing (conversion rates, frequency lifts)
   - Occasion-based assumptions: do the recommended directions align with the
     Occasion signals? (e.g., if Occasion is Social/Family, does the architecture
     handle multi-user coordination? If Need is Urgent, does latency matter?)
   - Open questions from explore.md and assess.md that were deferred to `/4`
   - Gaps flagged in the Build context table (No / Partial entries)
   - Blocking questions in the "Decide before building" section

3. **Validate handoff schema**: Check the /3→/4 handoff contract
   (`_shared/protocols/handoff-schema.md`). Required fields: metric tree,
   kill criteria, baselines. If any required field is missing, warn the PM
   before proceeding.

4. **Delegate to Assumption Auditor** (`agents/assumption-auditor.md`):
   - Pass: all assumptions from prior files, `.claims.json` data cache
   - Auditor classifies each assumption as Validated / Questioned / Untested
   - Returns targeted interview questions for Untested/Questioned items
   - These questions are passed to the Feasibility Interviewer in Phase 2

5. **Read claims cache**: Load `pipeline/{idea-slug}/.claims.json` if it exists.
   This contains data findings from prior skills (sizing numbers, baselines,
   market data) that should not be re-queried. Follow
   `_shared/protocols/claims-cache.md` for the read protocol.

6. **Delegate to Architecture Scout** (`agents/architecture-scout.md`):
   - Pass: JTBD, chosen direction, Build context table from opportunity.md, all assumptions
   - Scout queries the `knowledge_base` connector and any available knowledge sources for:
     - What engineering systems already exist relevant to this idea
     - Prior work or spike documents on adjacent infrastructure
     - Team ownership of relevant services
     - Known constraints or decisions already made by engineering
   - Scout returns structured findings (see agent for format)
   - Scout findings carry `[scout: source]` citation tags (e.g., `[scout: {MCP name}]`)

4. **Delegate to Feature Analyzer** (`agents/feature-analyzer.md`):
   - **Auto-triggers** when the `code_explorer` connector is bound in `connectors.yaml`
     and Playwright MCP is available. Do not ask the PM whether to run it — just run it.
   - If the tool requires an API key, prompt the PM inline: "The Feature Analysis
     tool needs an API key. Paste it here (sk-...):" — then proceed immediately.
   - Pass: a detailed business requirement constructed from `opportunity.md`
     (JTBD, What to build, Don't build, Build context table with Exists? status)
   - Feature Analyzer automates the code-explorer connector to get:
     - Which services (out of 101 in the knowledge base) are affected
     - File-level changes, DB schema changes, API contract changes
     - Event schema changes and recommended execution order
   - Optionally runs "Validate against real code" — clones affected repos and
     verifies proposed changes against actual source code (PM must request this)
   - Returns implementation impact analysis (see agent for format)
   - If Playwright is unavailable or the tool errors: fall back to manual mode
     (see agent's Manual Fallback Mode) — never silently skip

5. **Present audit summary to PM**:
   - "I've read all prior outputs. Here's what `/4` needs to resolve: [N assumptions, N open questions, N 'No' Build context rows]"
   - "Architecture Scout found: [key findings]"
   - "Feature Analyzer found: [N affected services, key implementation impacts]" (if run)
   - "I'll now run the Feasibility Interview — one question at a time."

**Log Q&A**: Append to `pipeline/{idea-slug}/decision-log.md` under
`## /4 Prove — {date}`, continuing from the last numbered question.

### Phase 2 — Feasibility Interview (Feasibility Interviewer Agent)

Delegate to the Feasibility Interviewer agent (`agents/feasibility-interviewer.md`).

**Consistency Check**: During the interview, run the consistency check
protocol (`_shared/protocols/consistency-check.md`) every 3rd PM answer.
Cross-check the answer against prior claims from `.claims.json` and
decision-log entries. If a contradiction is detected, surface it
immediately: "Earlier you said X, but now Y — which is correct?"

Pass the agent:
- The full audit summary from Phase 1 (assumptions, open questions, Build context gaps)
- Assumption Auditor's targeted questions (for Untested/Questioned assumptions)
- Architecture Scout findings
- Claims cache data (so the interviewer doesn't re-ask known facts)
- Ground card (JTBD, sizing, complexity call, systems flagged)
- Define card (metric tree, kill criteria, instrumentation gaps)
- Chosen prototype direction from explore.md
- Decision log path: `pipeline/{idea-slug}/decision-log.md` — agent appends
  Q&A under the existing `## /4 Prove — {date}` header

The Interviewer:
- Works through assumptions and gaps in priority order (blocking ones first)
- Asks ONE question at a time, proposes an answer, waits for confirm/redirect
- Covers: architecture readiness, team dependencies, timeline realism,
  regulatory/compliance constraints, pricing/commercial constraints
- Does NOT propose which direction to build yet — that's Phase 3
- Flags anything that changes the assess.md kill criteria or metric assumptions

**Critical — No Fabrication:**
When the interview reaches capacity estimates or cost questions, the Feasibility
Interviewer MUST:
1. Check if Data Analyst agent has a connected `metrics_source`
2. If yes: delegate cost/capacity queries, present real signals
3. If no: ask the PM, or state what needs to be pulled and from where
4. **NEVER fabricate team capacity, build timelines, or infrastructure costs**

**Rules:**
- Never batch questions
- Never ask open-ended "what do you think?" — always propose an answer grounded
  in the Build context table and Architecture Scout findings
- If the PM reveals a constraint that invalidates a assess.md assumption, flag
  it immediately: "This changes the [metric/kill criterion] — we may need to
  revisit the target"
- Log every Q&A to decision-log.md

### Phase 3 — Competing Directions

After the Feasibility Interview converges, delegate to the **Direction Generator**
agent (`agents/direction-generator.md`). Pass it the interview findings, assess.md
metrics, scout findings, and risk register. It returns 3-4 competing implementation
approaches with a KR coverage matrix and formula scores (Feasibility × Impact ÷ Effort).

**What makes a direction "competing":**

Directions must differ on a structural axis — not just scope or sequencing.
The axis should be the decision that most shapes build cost, timeline, and
risk. Common axes:

| Axis | Example |
|------|---------|
| Build vs. reuse | Net-new engine vs. extending existing infra |
| Scope | Full-featured vs. minimal viable wire |
| Dependency strategy | Wait for Platform team vs. build workaround vs. proxy solution |
| Technical approach | Sync vs. async processing; centralized vs. federated |
| Market sequencing | One-market focus vs. multi-market from day one |

Name the axis explicitly: "I'm comparing these directions along **[axis]**
because that's the decision that most changes what we build and how long it takes."

**For each direction, present:**

| | |
|---|---|
| **Name** | Short label |
| **Approach** | 2-3 sentences on what gets built and how |
| **What it reuses** | Which existing systems or components |
| **What it requires net-new** | New services, integrations, data models |
| **Key dependency** | The single team or system that blocks this direction |
| **Indicative timeline** | Rough estimate with stated assumptions [citation tag] |
| **Risk** | The specific failure mode for this direction |

Present the table and ask: "Which of these directions feels right given the
constraints we surfaced? Want to change any, drop one, or add a direction?"

**Post-presentation iteration loop:**

The PM can react in any of these ways:

| PM reaction | What to do |
|-------------|-----------|
| **Reject all** | Propose new directions along a different axis |
| **Modify one** | Adjust the approach, dependencies, or timeline for that direction |
| **Combine two** | Create a hybrid direction that takes elements from multiple |
| **Add one** | Propose an additional direction the PM describes |
| **Pick one** | Move to approval gate |

**Combining:** When PM says "I want A's architecture but B's timeline":
1. Identify the specific elements to pull from each direction
2. Build a new hybrid direction row with updated dependencies and risks
3. Re-present the table with the hybrid included

**Keep looping** until the PM is ready to commit.

**Hard approval gate:** When the PM indicates a preference, confirm
explicitly: "So we're going with [direction name] — [one-sentence summary].
This is the approach that goes into the opportunity brief and drives /5.
Confirm?"

**Do not synthesize until the PM explicitly confirms.**

**Feasibility verdict co-determination:**

Before synthesis, present the overall feasibility verdict:
"Based on everything we surfaced, I'd call overall feasibility **[Green/Yellow/Red]**
because [reason]. Do you agree?" If the PM overrides, use their call
and note the reasoning in prove.md.

### Phase 4 — Synthesize & Output

Produce the explore card using the template in `_shared/templates/prove-card.md`.
Save to `pipeline/{idea-slug}/prove.md`.

**Also update `pipeline/{idea-slug}/opportunity.md`**:

1. **Replace the Build context table** with an enriched version:
   - Add a "Direction" column showing which implementation direction applies
   - Update status for each component based on feasibility findings
   - Add a **Dependency Map** sub-section after the table:

```markdown
## Build context

| Component | Exists? | Notes | Direction |
|-----------|---------|-------|-----------
| ... | Yes/No/Partial | [updated finding] | [which direction requires this] |

### Dependency Map

| Dependency | Blocks | Owner | Status |
|------------|--------|-------|--------|
| [team or system] | [what it blocks] | [who] | [open / resolved / escalation] |

**Recommended direction**: [direction name] — [one sentence]

Data sources: *[source name](url)* | *[source name](url)*
Explore findings: [`prove.md`](prove.md)
```

2. **Update "Decide before building"** — for each blocking question:
   - If answered during the feasibility interview: change status to `Resolved` with a one-line answer (don't remove them)
   - If still open with a clear owner: keep it with the owner noted
   - If escalation is needed: prefix with "ESCALATE: " and name the stakeholder

3. Follow `_shared/protocols/opportunity-update.md` for Decisions (`When: Architecture`), Scoring, and footer updates.

**Self-check (before presenting):**

After writing prove.md but before presenting to the PM, scan for
anti-patterns and fix inline — don't flag to PM, just fix:

- [ ] Direction approach restates the problem instead of describing a build strategy
- [ ] Timeline has no stated assumptions
- [ ] Risk has no mitigation (just a worry, not a risk register entry)
- [ ] Dependency has no owner
- [ ] "Key dependency" is "TBD"
- [ ] Any specific claim missing a citation tag (`[pm]`, `[scout: ...]`, `[data: ...]`, `[inferred]`)

**Target Revision Protocol:**

After writing `prove.md` and updating `opportunity.md`, check whether
any feasibility finding invalidates a target from `assess.md`. Targets
live in two places: `assess.md` (Success Criteria table) and
`opportunity.md` (Measure these section).

1. **Scan for invalidated targets.** Compare every quantified target in
   `assess.md`'s Success Criteria table against the feasibility verdict,
   interview findings, and Architecture Scout results. A target is
   invalidated when:
   - Feasibility interview revealed a constraint that makes the target
     unreachable (e.g., addressable audience is smaller than assumed)
   - Architecture findings show a technical ceiling below the target
   - Timeline or dependency findings mean the target can't be hit in the
     stated timeframe
   - Kill criteria reference a threshold that contradicts feasibility data

2. **If a target is invalidated, revise it in both files:**
   - `assess.md` — update the number in the Success Criteria table. Add
     a footnote: `*Revised from {original} — see decision-log.md /4 Prove*`
   - `opportunity.md` — update the corresponding metric in the
     "Measure these" section with the revised number

3. **Log the revision** in `decision-log.md` under the existing
   `## /4 Prove — {date}` header:

   ```markdown
   **Target revised** (When: Cascade)
   - Metric: {metric name}
   - Original target: {original value} (set in /3 assess)
   - Revised target: {new value}
   - Reason: {one-line explanation grounded in feasibility finding}
   - Source: [{citation tag}]
   ```

4. **If no targets are invalidated**, skip silently — don't flag to PM.

**Post-synthesis review:**

After writing `prove.md` and updating `opportunity.md`, present the
explore card to the PM:

"Here's the explore card — feasibility verdict, recommended direction,
dependency map, and risk register. And I've updated the opportunity brief.
Want to change anything?"

If the PM wants changes:
1. **Direction change**: switch recommended direction and update rationale
2. **Risk adjustment**: add/remove risks or change likelihood/impact
3. **Dependency update**: mark dependencies as resolved or add new ones
4. **Feasibility override**: PM can override the verdict with reasoning

Update both `prove.md` and `opportunity.md` with any changes.
Keep iterating until the PM approves. Only then proceed to brief
generation and verify.

**Create per-page md files:**

After PM approves, create the 1:1 md source file for the Feasibility
brief page.

1. **Create `pipeline/{idea-slug}/feasibility.md`** using `_shared/templates/feasibility-page.md`.
   Extract components from `prove.md` Feasibility Assessment table. Map each row
   to the 5-factor scoring. Compute scores automatically. Identify top 2 components
   by score as the bottleneck narrative.

2. **Update `pipeline/{idea-slug}/summary.md`** — update with feasibility
   context:
   - Update Confidence if feasibility findings change the assessment
   - Update Seeking line to reflect post-feasibility ask

3. **Append to `pipeline/{idea-slug}/decisions.md`** — add /4 Prove
   decisions:
   - Append `### /4 Prove — {date}` to the Decision Log section
   - Update Open Questions and Resolved Decisions tables

**Update the pipeline brief:**

Extract `briefData` fields per `_shared/reference/brief-field-mappings.md` (/4 section).
Write the extracted fields to `pipeline/{idea-slug}/.briefdata.json`.
Run: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief with `open pipeline/{idea-slug}/brief.html`.

Present: "The brief now includes feasibility assessment and risk register.
This is the complete pipeline brief — ready to share with stakeholders."

**Update PRD:**

If `pipeline/{idea-slug}/prd.md` exists, update "Notes for the prototype"
with build constraints from the recommended direction:
- Key technical dependencies or required integrations
- Backend requirement if the direction implies multi-user or persistence
- Any scope change from feasibility findings

If it doesn't exist, generate it now using the `/prd` template
(see `.claude/skills/prd/SKILL.md`).

### Phase 5 — Verify

Run structural checks from `_shared/templates/verify-prove.md`. Flag failures but don't block.

After verify passes, run `_shared/protocols/auto-publish.md` to update the live brief if previously published.

Then run **Tier 2** of `_shared/protocols/auto-eval.md`: delegate to the Judge agent (path in that protocol) and write the deep scorecard to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md`. Non-blocking — skip and note if an artifact is incomplete.

### Recommend Next Step

Based on feasibility verdict:

- **Green**: "Feasibility is clear. The recommended direction is [X]. Run `/5` to build
  the production prototype."
- **Yellow**: "We have open dependencies: [list]. I'd suggest [specific action] before
  starting `/5`. Want to resolve these, or proceed anyway?"
- **Red**: "There's a blocking constraint: [X]. This likely changes scope or timeline
  significantly. Want to revise the approach, or escalate [dependency] first?"

Do not auto-chain.

### Phase 6 — Collect Feedback

Follow `_shared/protocols/feedback-collection.md` with skill name `/4 prove`. This protocol runs at two cadences: **per-phase micro-ratings** after each phase completes (§A — one tap, non-blocking) and the **skill-end rating + follow-up** (§B). All feedback saves to `pipeline/{idea-slug}/eval/feedback.md`.

---

## Principles

1. **First skill where solutions are on the table.** Every prior skill deferred
   implementation questions here. `/4` holds that boundary — don't apologize for it.
   When feasibility surfaces that the scope must change, say so directly.

2. **Competing directions, not a recommendation search.** Present genuinely
   different structural approaches before recommending one. A single direction
   presented with caveats is not competing directions. The PM should feel
   the tension between tradeoffs before converging.

3. **Ground every claim.** Feasibility findings come from Architecture Scout
   or PM input — not from the model's assumptions about what's hard to build.
   If a dependency is flagged, it's because the scout found it or the PM confirmed it.

4. **Interrogate assess.md assumptions.** The metric tree and targets from `/3`
   are based on assumptions the team believed at the time. Feasibility findings
   may invalidate them. Flag when a constraint changes a kill criterion or target.

5. **Dependency map is a deliverable.** Every significant dependency — a team that
   needs to approve, a system that needs to be extended, a regulation that needs
   sign-off — goes in the dependency map. "We'll figure it out later" is not a
   dependency resolution strategy.

6. **Risk register over risk list.** A risk without Likelihood + Impact + Mitigation
   is just a worry. Every risk gets all three. "Technical risk: high" is not enough.

7. **Graceful degradation.** Architecture Scout may not find anything useful.
   Data sources may be unavailable. If so: flag it explicitly and continue from
   what the PM provides. Never fabricate architectural context.

8. **Leave `/5` a clean handoff.** The recommended direction should tell an engineer
   or AI agent exactly which implementation approach was chosen, which dependencies
   are resolved, and which open questions remain. If `/5` has to re-ask feasibility
   questions, `/4` failed.

9. **Thinking is visible.** The PM reads your reasoning in real time.
   When assessing feasibility without Architecture Scout findings, be
   explicit in thinking about what you're guessing vs. what you've
   confirmed. Brief: 30-80 words of thinking per question or synthesis
   section. Don't fake confidence in the thinking block.

---

## Agent Definitions

- **Feasibility Interviewer**: `agents/feasibility-interviewer.md` — Architecture-aware sequential questioning on dependencies, constraints, timeline, and regulatory limits
- **Architecture Scout**: `agents/architecture-scout.md` — Active investigation of existing systems, prior work, and team ownership via `knowledge_base` connector
- **Data Analyst**: `.claude/agents/data-analyst.md` — Cost & capacity signals via `metrics_source` + `knowledge_base` connectors (cost/capacity mode)
- **Feature Analyzer**: `agents/feature-analyzer.md` — Playwright-driven automation of the code-explorer connector for file-level implementation impact analysis (optional — requires Playwright MCP + API key)
- **Assumption Auditor**: `agents/assumption-auditor.md` — Pre-interview assumption classification (Validated/Questioned/Untested) and targeted question generation from pipeline artifacts + claims cache
- **Direction Generator**: `agents/direction-generator.md` — Synthesizes 3-4 competing implementation directions with KR coverage matrix and formula scoring (Feasibility × Impact ÷ Effort)

**Protocols:**
- **Consistency Check**: `_shared/protocols/consistency-check.md` — Mid-interview contradiction detection, runs every 3rd PM answer
- **Claims Cache**: `_shared/protocols/claims-cache.md` — Read/write data findings to `.claims.json` to prevent re-querying across skills
- **Handoff Schema**: `_shared/protocols/handoff-schema.md` — Validates /3→/4 contract on entry

If an agent is unavailable, note it and continue: "Architecture Scout not finding
relevant context — proceeding from PM-provided information only."

---

## Related Skills

- `/1 learn` — JTBD problem statement and sizing
- `/2 explore` — Lo-fi prototypes and journey maps
- `/3 assess` — Success criteria, KRs, targets, kill criteria
- `/5 ship` — Next step: production-ready prototype and release checklist
- `/eval` — Evaluate all outputs including prove.md
