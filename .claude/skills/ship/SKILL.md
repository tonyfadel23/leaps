---
name: ship
description: >
  Take a conviction-ready idea and upgrade to a mid-fidelity prototype.
  Stress-test against metric tree, kill criteria, and risk register.
  Produce a release checklist. Use when a PM says "/5" or "/ship",
  or after completing /prove (prove).
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: design_system
    required: false
  - role: image_generation
    required: false
  - role: metrics_source
    required: false
  - role: experimentation
    required: false
    used_by: Release Checklist — feature flag configuration and rollout steps
  - role: ticketing
    required: false
    used_by: Release Checklist — related tickets and tracking
  - role: code_explorer
    required: false
    used_by: Release Checklist — verify implementation paths and existing code
---

# /5 — Build

Take a conviction-ready idea — learned, explored, assessed, and proven —
and build a mid-fidelity prototype. Stress-test it against the metric tree,
kill criteria, and risk register. Produce a release checklist with go/no-go
criteria.

By now you have: a sharp JTBD, lo-fi prototypes, success criteria with
baselines, and a feasibility-cleared direction. `/ship` turns that into
something an engineering team can build from.

---

## Usage

```
/ship water-subscription
/build water-subscription
```

Or after completing `/prove`, confirm the handoff: "Run `/ship` to continue."

### Session Management

Follow `_shared/protocols/session-management.md`. Phase names: `plan`, `prototype`, `stress-test`, `checklist`, `verify`

Context keys: `upgrade_plan`, `stress_findings`, `checklist_items`.

Phases:
- Phase 1 — Load & Plan (`activeForm`: "Loading inputs and planning upgrade")
- Phase 2 — Upgrade Prototype (`activeForm`: "Building mid-fidelity prototype")
- Phase 3 — Stress Test (`activeForm`: "Stress-testing against metrics and risks")
- Phase 4 — Release Checklist (`activeForm`: "Building release checklist")
- Phase 5 — Verify (`activeForm`: "Running structural checks")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

---

## Process

### Phase 1 — Load & Plan

**Staleness check:** Same pattern as /explore-/4. Check all upstream artifacts
against `ship/` outputs.

1. **Read all inputs**:
   - `opportunity.md` — living brief with build context, dependencies, scoring
   - `learn.md` — JTBD, sizing, affected segment
   - `explore.md` — chosen direction, variations explored
   - `assess.md` — metric tree, kill criteria, instrumentation gaps
   - `prove.md` — feasibility verdict, recommended direction, risks, dependencies
   - `prd.md` — vibe-coding handoff

2. **Verify readiness**:
   - Feasibility verdict must be Green or Yellow
   - If Red: "Feasibility is Red — resolve blocking constraints before building.
     Run `/prove` to address [specific blocker]."
   - Kill criteria must be defined in assess.md
   - Recommended direction must be selected in prove.md
   - If any are missing: "Run `/assess` and `/prove` first — I need defined metrics and
     a feasibility-cleared direction to build."

3. **Present build plan**:

   "Here's what I'll build:
   - **Upgrade**: [variation name] → mid-fi with [specific upgrades]
   - **New screens**: error recovery, edge cases, [list from risk register]
   - **Stress-test**: [N] KRs, [N] kill criteria, [N] risks
   - **Direction**: [recommended direction from prove.md]
   
   Ready to proceed?"

Wait for PM confirmation before building.

### Phase 2 — Upgrade Prototype

Delegate to the Prototype Builder (`../explore/agents/prototype-builder.md`).
Reuse the same agent — it already knows your design system and
showcase format.

**Upgrade instructions:**

1. **Start from the chosen variation** — don't rebuild from scratch
2. **Add realistic content**:
   - Replace placeholder text with realistic product names, prices, descriptions
   - Use your categories and vendor patterns
   - Add realistic notification copy and CTA text
3. **Add missing states**:
   - **Loading states**: skeleton screens while data loads
   - **Empty states**: what the user sees before they have data
   - **Error states**: network failure, out-of-stock, payment declined
   - **Edge cases**: from the risk register — what happens when things go wrong
4. **Tighten visual polish**:
   - Verify design token usage matches `design/DESIGN.md`
   - Add micro-interactions (button press states, transitions)
   - Ensure consistent spacing and typography
5. **Add onboarding** (if the feature is new to users):
   - First-time experience: tooltip, coach mark, or intro card
   - How the user discovers this feature

Save prototype to `pipeline/{idea-slug}/ship/prototype.html`.
Build showcase: `pipeline/{idea-slug}/ship/showcase.html`.

Open: `open pipeline/{idea-slug}/ship/showcase.html`

Present: "Here's the upgraded prototype with [N] screens including error
and edge cases. Walk through it and tell me what's missing."

**Iteration loop**: Same as /explore — PM can request changes, additions, or
rethinks. Keep iterating until the PM approves.

### Phase 3 — Stress Test

Delegate to the **Stress Tester** agent (`agents/stress-tester.md`). Pass it
the prototype HTML, assess.md (KRs + kill criteria), and prove.md (risk register).
The agent runs the prototype through three structured lenses and returns a
coverage matrix with gap classifications (CRITICAL / WARNING / INFO).

Present all findings together — this is a structured review, not a conversation.

**1. Metric alignment**

For each KR in the metric tree (from assess.md):

| KR | Measurement point in prototype | Gap |
|----|-------------------------------|-----|
| [metric name] | [which screen/interaction measures this] | [what's missing or unmeasurable] |

Flag: any KR that has no corresponding measurement point in the prototype.

**2. Kill criteria check**

For each kill criterion (from assess.md):

| Kill criterion | Design mitigation | Earliest signal | Risk level |
|---------------|-------------------|-----------------|------------|
| [condition] | [how the prototype addresses it] | [when we'd see this] | [H/M/L] |

Flag: any kill criterion with no design mitigation.

**3. Risk stress**

For each risk (from prove.md risk register):

| Risk | User experience if triggered | Prototype handles it? | Gap |
|------|-----------------------------|-----------------------|-----|
| [risk] | [what the user sees/feels] | Yes/Partially/No | [what's missing] |

Flag: any high-impact risk with no prototype coverage.

**Present stress-test findings:**

"Stress test complete:
- **Metric coverage**: [X/Y] KRs have measurement points in the prototype
- **Kill criteria**: [X/Y] have design mitigations
- **Risk coverage**: [X/Y] risks are handled in the prototype
- **Gaps**: [list the specific gaps]

Want to address any of these gaps before the release checklist?"

If PM wants to address gaps: iterate on the prototype (return to Phase 2
for specific screens), then re-run the stress test.

### Phase 4 — Release Checklist

Produce the release checklist using `_shared/templates/release-checklist.md`.
Save to `pipeline/{idea-slug}/ship/release-checklist.md`.

Every item must trace to a specific finding from the pipeline — no generic
boilerplate.

**Update opportunity.md and per-page files:**

Follow `_shared/protocols/opportunity-update.md` for Scoring, Pipeline cost, and footer updates.

Additionally:
1. Update **Prototype** section: `**Mid-fi prototype**: [`ship/showcase.html`](ship/showcase.html)`
2. **Update `pipeline/{idea-slug}/summary.md`**:
   - Update Pipeline Cost with final session count and dollar figure
   - Update Prototype line: `ship/showcase.html`
   - Update Seeking line if the ask has evolved post-build (e.g., "Launch approval")
   - Update Confidence if build findings change the assessment
3. **Append to `pipeline/{idea-slug}/decisions.md`**:
   - Append `### /ship Ship — {date}` to the Decision Log section
   - Update Open Questions and Resolved Decisions tables
   - Log any stress-test findings as resolved decisions

**Update the pipeline brief:**

Extract `briefData` fields per `_shared/reference/brief-field-mappings.md` (/ship section).
Write the extracted fields to `pipeline/{idea-slug}/.briefdata.json`.
Run: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief with `open pipeline/{idea-slug}/brief.html`.

### Phase 5 — Verify

Run structural checks from `_shared/templates/verify-ship.md`. Flag failures but don't block.

After verify passes, run `_shared/protocols/auto-publish.md` to update the live brief if previously published.

Then run **Tier 2** of `_shared/protocols/auto-eval.md`: delegate to the Judge agent (path in that protocol) and write the deep scorecard to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md`. Non-blocking — skip and note if an artifact is incomplete.

### Phase 6 — Collect Feedback

Use `_shared/protocols/feedback-collection.md` protocol (two cadences: **per-phase micro-ratings** after each phase, §A; and the **skill-end rating + follow-up**, §B — all saved to `pipeline/{idea-slug}/eval/feedback.md`) with:
- Skill name: `/ship`
- "Best part" options: Prototype quality, Stress test, Release checklist, Edge cases
- "Improve" placeholders: More depth, Missing scenarios

---

## Principles

1. **Upgrade, don't rebuild.** Start from the chosen variation — preserve the
   design decisions already validated by the PM.
2. **Edge cases are features.** Error states, empty states, and recovery flows
   are not afterthoughts — they're where users form trust.
3. **Stress test before checklist.** The checklist is only as good as the gaps
   it catches. Run the stress test first.
4. **Specific, not generic.** Every checklist item traces to a specific pipeline
   finding. No boilerplate "ensure quality" items.
5. **Engineering-ready.** The output should let an engineer or AI agent start
   building without re-asking feasibility or scope questions.
6. **Thinking is visible.** Brief: 30-80 words of thinking per upgrade decision
   or stress-test finding.

---

## Agent Definitions

- **Prototype Builder**: `../explore/agents/prototype-builder.md` — Reused from /explore.
  Same agent handles both lo-fi and mid-fi. Pass upgrade instructions.
- **Stress Tester**: `agents/stress-tester.md` — 3-lens stress analysis (metric alignment, kill criteria mitigation, risk exposure) with coverage matrix and gap classification
- **Data Analyst**: `.claude/agents/data-analyst.md` — For any last-mile baseline
  verification during stress test

**Protocols:**
- **Handoff Schema**: `_shared/protocols/handoff-schema.md` — Validates /prove→/5 contract on entry

---

## Related Skills

- `/prove` — Previous step: feasibility and recommended direction
- `/eval` — Run after build to evaluate full pipeline quality
- `/pipeline --rank` — Compare this idea against others in the pipeline
- `/grill-me` — Stress-test the PM's conviction before committing
