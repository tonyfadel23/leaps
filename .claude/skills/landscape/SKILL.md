---
name: landscape
description: >
  Drop source documents (strategy docs, RFCs, PRDs, competitive analyses) into a
  backlog folder and generate a JTBD-structured strategic landscape: Occasions →
  Opportunities → Bets, all sized with real data. Scaffolds pipeline directories
  for downstream /learn processing. Use when a PM says "/landscape", "map this
  domain", "create a landscape", or has multiple related ideas that need a strategic
  overview before individual grounding.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: metrics_source
    required: true
    used_by: Data Analyst — sizing verification, baseline pulls
  - role: knowledge_base
    required: false
    used_by: Doc Analyzer — prior work, system ownership, existing decisions
---

# /landscape — Strategic Landscape Builder

Take a set of source documents — strategy docs, RFCs, PRDs, competitive analyses —
and synthesize them into a single JTBD-structured landscape: consumer Occasions →
customer Opportunities → sized Bets. The output is a strategic one-pager that maps
an entire domain, plus scaffolded pipeline directories ready for `/learn`.

---

## Usage

```
/landscape search-discovery
/landscape payments
/landscape                        # auto-detect: uses the only folder in backlog/
```

Or describe the domain and point to docs:
```
/landscape I have 4 docs about search and discovery improvements
```

### Input: The Backlog Folder

Source documents go in `backlog/{domain-slug}/`:

```
backlog/
├── search-discovery/
│   ├── item-first-search-rfc.md
│   ├── search-ambitions-2026.md
│   ├── discovery-growth-strategy.md
│   └── .urls                     # optional: one URL per line for web sources
└── payments/
    ├── wallet-strategy.md
    └── checkout-optimization.md
```

The skill reads everything in the domain folder. No manifest needed — it
processes all files found. Supported formats: `.md`, `.txt`. For Google Docs
or web pages, list URLs in a `.urls` file (one per line).

### Phase Routing

Re-run a specific phase without restarting the full skill:

```
/landscape search-discovery --phase structure    # re-extract structure from docs
/landscape search-discovery --phase size         # re-pull sizing data
/landscape search-discovery --phase synthesize   # rewrite landscape.md
```

When `--phase` is specified:
1. Read existing outputs (`{domain}-landscape.md`, decision-log) for context
2. Skip to the named phase
3. Continue through remaining phases
4. If no prior output exists for skipped phases, warn and fall back to full run

**Phase names:** `ingest`, `structure`, `size`, `synthesize`

### Session Resume

On entry, check for `pipeline/{domain-slug}-landscape/.state.json`:
- If it exists and `skill` matches `/landscape`:
  - Show: "Found prior session — completed phases: [list]. Resume from [next phase]?"
  - If PM confirms: skip completed phases, load context from state, continue
  - If PM declines: delete state file, start fresh
- If it doesn't exist: start fresh

Write/update `.state.json` after each phase completes. Delete it when all
phases finish successfully. Context keys: `domain_slug`, `documents_read`,
`extracted_data`, `confirmed_structure`, `verified_sizing`.

### Phase Progress

On entry — before any phase work — create tasks for all phases so the PM
can track progress:

1. Create one task per phase using TaskCreate (use `activeForm` for the
   spinner text shown during that phase)
2. If resuming a session (`--phase` or `.state.json`): mark already-completed
   phases as `completed` immediately
3. As each phase starts: mark it `in_progress`
4. As each phase finishes: mark it `completed`

Phases for this skill:

- Phase 0 — Preflight (`activeForm`: "Checking MCP connections")
- Phase 1 — Ingest (`activeForm`: "Reading source documents")
- Phase 2 — Structure (`activeForm`: "Organizing into Occasions → Opportunities → Bets")
- Phase 3 — Size (`activeForm`: "Verifying sizing with real data")
- Phase 4 — Synthesize (`activeForm`: "Writing landscape document")
- Phase 5 — Scaffold (`activeForm`: "Creating pipeline directories")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

---

## Process

### Phase 0 — Preflight (Connector Check)

Before starting any work, resolve the connectors this skill depends on.
Follow the connector-resolver protocol (`_shared/protocols/connector-resolver.md`).

**Required roles for /landscape:**

| Role | Required | What it provides | What's lost without it |
|------|----------|-----------------|----------------------|
| `metrics_source` | Yes | Sizing verification, baselines, real numbers | All sizing relies on doc claims — marked `[unverified]` |
| `knowledge_base` | No | Prior work, system ownership, decisions | Can't cross-reference against existing knowledge |

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
  > "`metrics_source` is not connected. Sizing will use doc claims only — all marked `[unverified]`.
  > To connect: run `/setup --role metrics_source`."
  - If PM says proceed: continue with degraded mode
  - If PM wants to fix: wait for them to configure, then re-check

### Phase 1 — Ingest (Doc Analyzer)

1. **Resolve the domain slug**:
   - If provided: use as-is (e.g., `/landscape search-discovery` → `search-discovery`)
   - If not provided: list folders in `backlog/`. If one folder, use it.
     If multiple, ask: "Found [list] — which domain?"
   - If `backlog/` doesn't exist or is empty: ask the PM to create
     `backlog/{domain-slug}/` and drop their docs there

2. **Read source documents**:
   - Read all files in `backlog/{domain-slug}/`
   - If `.urls` file exists: fetch each URL using WebFetch and include content
   - If Google Docs URLs: use `mcp__google-workspace__get_doc_as_markdown`
   - Present: "Found {N} documents in `backlog/{domain-slug}/`: [list]. Reading..."

3. **Extract structured data** — delegate to Doc Analyzer agent (`.claude/agents/doc-analyzer.md`):
   - Pass all file paths
   - Agent returns: claims, initiatives, pain points, segments, candidate
     occasions, contradictions, gaps

4. **Present extraction summary**:
   ```
   Read {N} documents. Extracted:
   - {X} data claims ({Y} verifiable)
   - {Z} initiatives/bets
   - {W} pain points
   - {V} contradictions found

   Contradictions:
   - [topic]: Doc A says [X], Doc B says [Y]

   Gaps:
   - [what's missing]
   ```

5. **Generate skeleton brief** — create `pipeline/{domain-slug}-landscape/brief.html`:
   Run: `node scripts/build-brief.js {domain-slug}-landscape --skeleton`
   Open it: `open pipeline/{domain-slug}-landscape/brief.html`

6. **Save state**: `documents_read`, `extracted_data`

### Phase 2 — Structure (Approval Gate #1)

Organize extracted data into the Occasion → Opportunity → Bet hierarchy.

1. **Group pain points into Occasions**:
   - An Occasion is a real, recurring consumer context
   - Fill the dimension table: Time, Social, Need, Struggle
   - Multiple pain points can belong to the same occasion

2. **Group initiatives into Opportunities under Occasions**:
   - An Opportunity is where your company currently fails to serve the occasion
   - Score each opportunity with the 4-signal framework:
     - One person coordinates: High / Medium / Low / N/A
     - Painful workaround: High / Medium / Low
     - Scale: High / Medium / Low
     - No good solution: High / Medium / Low
   - Use extracted evidence for signal scoring

3. **Map initiatives as Bets under Opportunities**:
   - A Bet is a specific initiative from the source docs
   - Generate a pipeline slug for each bet (lowercase, hyphenated)
   - Note sizing claims from docs (verification comes in Phase 3)

4. **Present the structure for approval**:

   ```
   Here's the landscape structure I extracted:

   ## Occasion 1: "[name]"
   Time: [X] | Social: [X] | Need: [X] | Struggle: [X]

     ### Opportunity 1.1: [name]
     Signals: coordinates [X] | workaround [X] | scale [X] | no solution [X]

       #### Bet 1.1a: [name] → `pipeline-slug`
       #### Bet 1.1b: [name] → `pipeline-slug`

     ### Opportunity 1.2: [name]
       #### Bet 1.2a: [name] → `pipeline-slug`

   ## Occasion 2: "[name]"
   ...

   Is this the right grouping? Want to move, merge, or drop anything?
   ```

5. **Wait for PM confirmation.** If they redirect, adjust and re-present.
   Log every Q&A to the decision log.

6. **Save state**: `confirmed_structure`

### Phase 3 — Size (Approval Gate #2)

Verify sizing claims from the source docs against real data.

1. **For each verifiable claim** — delegate to Data Analyst (`.claude/agents/data-analyst.md`):
   - Show plan: "Here are the claims I want to verify: [list]. Let me pull actuals..."
   - Query the resolved `metrics_source` for each claim
   - Compare doc claim vs actual
   - Verdict: Confirmed / Worse than claimed / Better than claimed / Inflated / Unverifiable

2. **Build the verification table**:

   ```
   | Claim | Doc says | Actuals | Verdict |
   |-------|----------|---------|---------|
   | CVR gap | 69% lower | 85.6% lower | Worse than claimed |
   | Multi-basket sessions | 13% | 8.9% | Inflated |
   | GMV opportunity | €70M | ~2.7% of QC GMV | Plausible |
   ```

3. **For claims that can't be verified**: mark `[unverifiable]` and note why

4. **Size each bet** using verified numbers:
   - Use the Data Analyst for napkin math
   - Show the formula and assumptions
   - Tag every number: `[data: source]`, `[context: doc]`, `[inferred]`

5. **Present verified sizing for approval**:

   ```
   Sizing verification complete. Key findings:
   - {N} claims verified, {M} inflated, {K} unverifiable
   - Total addressable opportunity: €{X}M (conservative) to €{Y}M (optimistic)

   [verification table]

   Happy with the sizing, or want to dig deeper on anything?
   ```

6. **Wait for PM confirmation.** Log to decision log.

7. **Save state**: `verified_sizing`

### Phase 4 — Synthesize

Write the landscape document using the confirmed structure and verified sizing.

**Output: `pipeline/{domain-slug}-landscape.md`**

Use this exact template:

```markdown
# [Domain Title] Strategic Landscape

> [Business Line] — your company {year}
> All sizing uses verified data where available. Unverified claims from source docs are marked.

---

## Occasion {N}: "[Occasion Name]"

> [One-sentence description of the consumer context]

| Dimension | Value |
|-----------|-------|
| Time | [Daily / Weekly / Monthly / Seasonal] [details] |
| Social | [Solo / Couple / Friends / Family / Team] |
| Need | [Planned / Urgent / Routine / Emotional / Social] |
| Struggle | [Accessibility / Decision / Trust / Quality / Affordability] — [specifics] |

### Opportunity {N.M}: [Opportunity Name]

[2-3 sentence description of the customer struggle — what's broken, not what feature is missing]

**Signal scoring:**

| Signal | Strength | Evidence |
|--------|----------|---------|
| One person coordinates | [High/Medium/Low/N/A] | [evidence with citation] |
| Painful workaround | [High/Medium/Low] | [evidence with citation] |
| Scale | [High/Medium/Low] | [evidence with citation] |
| No good solution | [High/Medium/Low] | [evidence with citation] |

#### Bet {N.Ma}: [Bet Name]

> **Pipeline slug**: `{pipeline-slug}`

[2-3 sentences: what this bet does, how it changes the customer experience]

**Architecture** (if known from docs): [key systems, dependencies] `[context: source]`

**Sizing**: [napkin number] `[data/context: source]`. [method and assumptions]

**Complexity**: [S/M/L/XL] — [what it touches, one line]

**Confidence**: [Red/Yellow/Green] — [reason, tied to data verification]

**Phases** (if known from docs):
1. [phase with timeline]
2. [phase with timeline]

---

[Repeat for each Occasion → Opportunity → Bet]

---

## Summary: Pipeline Ideas at a Glance

| # | Pipeline Slug | Occasion | Opportunity | Top Bet | Sizing | Confidence |
|---|---------------|----------|-------------|---------|--------|------------|
| 1 | `{slug}` | {occasion} | {opportunity} | {bet} | {size} | {color} |
| ... | ... | ... | ... | ... | ... | ... |

### Total Addressable Opportunity (Conservative)

| Lever | Sizing | Source |
|-------|--------|--------|
| [lever] | [amount] | [source with link] |
| ... | ... | ... |
| **Total** | **€{X}M–€{Y}M** | |

### Data Sources Used

| Source | What It Provided |
|--------|-----------------|
| [source] | [what] |
| [source] | [what] |

### Document Sources

| Document | Key Contributions |
|----------|------------------|
| [filename from backlog] | [what it contributed to the landscape] |

---
*Generated by /landscape, {date}*
*Source documents: `backlog/{domain-slug}/`*
*Next step: Run `/learn {bet-slug}` on individual bets to sharpen problem statements*
```

**Citation tags — inline traceability:**

Every specific claim must carry a tag:

| Tag | Meaning |
|-----|---------|
| `[pm]` | PM-provided during approval gates |
| `[data: source]` | From Data Analyst — name the MCP and prove/table |
| `[context: source doc]` | From source documents in backlog |
| `[web: source]` | From web fetch (URLs in `.urls` file) |
| `[inferred]` | Model's own inference — not directly sourced |

**Self-check (before presenting):**

After writing the landscape doc, scan for anti-patterns and fix inline:
- [ ] Any sizing number without a citation tag
- [ ] Occasion missing a dimension in the table
- [ ] Opportunity missing a signal in the scoring table
- [ ] Bet missing sizing, complexity, or confidence
- [ ] Confidence rationale is generic ("needs more data" without specifics)
- [ ] Pipeline slugs contain spaces or uppercase
- [ ] Summary table doesn't match the detail sections

**Also create `pipeline/{domain-slug}-landscape/decision-log.md`**:

```markdown
# Decision Log: {domain-slug}-landscape

## /landscape — {date}

**Q1**: [first structural question]
**A1**: [PM's response]

...
```

**Also update `brief.html`** — write the finalized landscape briefData fields to
`pipeline/{domain-slug}-landscape/.briefdata.json`, then run:
`node scripts/build-brief.js {domain-slug}-landscape --data pipeline/{domain-slug}-landscape/.briefdata.json`

**Present to PM:** "Here's the landscape — [summary of occasions, opportunities,
bets, total sizing]. Want to change anything before I scaffold the pipeline?"

### Phase 5 — Scaffold

Create pipeline directories for each confirmed bet.

1. **For each bet in the landscape**, create:
   ```
   pipeline/{bet-slug}/
   ├── decision-log.md      # skeleton with "## /landscape — {date}" header
   └── .state.json           # { "skill": "/landscape", "next_skill": "/learn" }
   ```

   Decision log skeleton:
   ```markdown
   # Decision Log: {bet-slug}

   ## /landscape — {date}

   Scaffolded from [{domain} landscape](../{domain-slug}-landscape.md).
   Run `/learn {bet-slug}` to start problem grounding.
   ```

2. **Don't overwrite** — if a pipeline directory already exists for a bet
   (e.g., from prior `/learn` work), skip it and note: "Skipped `{slug}` — already exists."

3. **Present scaffold summary**:
   ```
   Created {N} pipeline directories:
   - pipeline/{slug-1}/ (new)
   - pipeline/{slug-2}/ (new)
   - pipeline/{slug-3}/ (skipped — already exists)

   Run `/learn {slug}` on any bet to start detailed problem grounding.
   Run `/pipeline --rank` to prioritize bets against each other.
   Run `/pipeline` to see the full portfolio view.
   ```

4. **Update Pipeline cost** — read `.state.json` and `execution-log.md` from
   `pipeline/{domain-slug}-landscape/`. Calculate pipeline cost using the
   shared pipeline-cost protocol (`_shared/protocols/pipeline-cost.md`).

### Phase 6 — Feedback

Follow the feedback collection protocol (`_shared/protocols/feedback-collection.md`). It runs at two cadences: **per-phase micro-ratings** after each phase completes (§A — one tap, non-blocking) and the **skill-end rating + follow-up** (§B). All feedback saves to `pipeline/{domain-slug}-landscape/eval/feedback.md`.

**Skill-specific options:**

| Scenario | Options |
|----------|---------|
| "Best part" (if score = 4) | Structure extraction, Sizing verification, Bet coverage, Summary table |
| "Improve" (if score ≤ 2) | More occasions, Deeper sizing, Missing bets |

---

## What This Skill Does NOT Do

- **Does not replace `/learn`** — the landscape is a strategic overview.
  Individual bets still need grounding (sharper JTBD, deeper sizing, customer evidence).
- **Does not interview the PM deeply** — it has two approval gates (structure, sizing)
  but doesn't run a full conversational interview. That's `/learn`'s job.
- **Does not create prototypes** — that's `/explore`.
- **Does not define success metrics** — that's `/assess`.
