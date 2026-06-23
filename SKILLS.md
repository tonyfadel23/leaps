# LEAPs — Skill Catalog

Complete reference for all pipeline and utility skills. Each entry covers
usage, arguments, phases, agents, and connector roles.

---

## Pipeline Skills

These run in order. Each skill hands off to the next. You can also jump
to any skill directly — it will check for upstream artifacts and warn if
inputs are missing.

```
/1 learn → /2 explore → /3 assess → /4 prove → /5 ship
```

---

### /1 learn — Problem Grinder

Take any fuzzy idea, directive, or signal and grind it into a sharp,
grounded problem statement through JTBD-native conversation.

**Usage:**
```
/1 water-subscription
/learn I want to launch a water subscription service
/learn Leadership wants us to explore a new fulfillment model
/learn Customers keep complaining about delivery slots
```

**Phase routing:**
```
/1 water-subscription --phase tribal     # re-run tribal knowledge pull
/1 water-subscription --phase sizing     # re-pull sizing data
/1 water-subscription --phase synthesize # rewrite learn.md from existing Q&A
/1 water-subscription --phase verify     # re-run structural checks only
```

**Phases:**
1. Warm-up + Tribal Knowledge Pull
2. Interview (conversational, one question at a time)
3. Sizing (data analyst pulls baselines)
4. Synthesize (write learn.md + opportunity.md + brief.html)
5. Verify (structural checks)
6. Feedback (PM satisfaction)

**Agents:**
- Interviewer — JTBD-native conversation, one question at a time
- Context Retriever — tribal knowledge from knowledge base, ticketing, feedback, support, research, app store
- Data Analyst (shared) — sizing and baselines
- Doc Analyzer (shared) — source document extraction (folder files, dropped files, links)

**Connectors:** `metrics_source` (required), `knowledge_base`, `ticketing`, `feedback`, `support`, `research_repository`, `app_store`

**Outputs:** `learn.md`, `opportunity.md`, `brief.html`, `decision-log.md`, `research-plan.md`

---

### /2 explore — Experience Prototyper

Take a grounded problem and make it tangible with lo-fi HTML prototypes,
customer journey maps, and competitor research. No feasibility, no
constraints — pure imagination anchored to the JTBD.

**Usage:**
```
/2 water-subscription
/explore water-subscription
```

**Phase routing:**
```
/2 water-subscription --phase prototype    # rebuild prototypes from confirmed concepts
/2 water-subscription --phase converge     # re-converge on a direction
/2 water-subscription --phase verify       # re-run structural checks only
```

**Phases:**
1. Load & Research (competitors + journey mapping)
2. Prototype (lo-fi HTML with your company design tokens)
3. Converge (PM picks a direction)
4. Synthesize (write explore.md, update opportunity.md, prd.md, brief.html)
5. Verify (structural checks)
6. Feedback

**Agents:**
- Competitor Researcher — market analysis, competitor screenshots, feature comparisons
- Journey Mapper — customer journey with emotion curve, touchpoints, pain/gain
- Prototype Builder — lo-fi HTML prototypes with your company design system
- Comparative Critique — 5-dimension scoring matrix across variations before direction gate
- Showcase Builder — variation explorer + final direction showcase

**Protocols:** Handoff Schema (/1→/2 validation)

**Connectors:** `image_generation`, `market_intel`

**Outputs:** `sketches/` (variation-a.html, variation-b.html, ..., index.html, final-showcase.html, journey.html, explore.md), `competitors/`, `prd.md`

---

### /3 assess — Success Criteria

Take a sketched experience and define how we'll know it works. Metric
trees with real baselines, 90-day targets, kill criteria, and
instrumentation gaps.

**Usage:**
```
/3 water-subscription
/assess water-subscription
```

**Phase routing:**
```
/3 water-subscription --phase validate     # re-pull baselines from data sources
/3 water-subscription --phase synthesize   # rewrite assess.md from existing interview
/3 water-subscription --phase verify       # re-run structural checks only
```

**Phases:**
1. Load & Plan
2. Interview (conversational — North Star, input metrics, kill criteria)
3. Validate (pull baselines from data sources, instrumentation assessment)
4. Synthesize (write assess.md, update opportunity.md, prd.md, brief.html)
5. Verify (structural checks)
6. Feedback

**Agents:**
- Define Interviewer — metric tree construction, kill criteria
- Data Analyst (shared) — baseline pulls, instrumentation assessment

**Connectors:** `metrics_source` (required), `experimentation`, `product_analytics`, `monitoring`

**Outputs:** `assess.md`, updated `opportunity.md`, `prd.md`, `brief.html`

---

### /4 prove — Feasibility & Direction

Grind a sketched and defined idea against reality. Feasibility assessment,
competing implementation directions, dependency map, and risk register.
This is the first skill where solutions are on the table.

**Usage:**
```
/4 water-subscription
/prove water-subscription
```

**Phase routing:**
```
/4 water-subscription --phase scout       # re-run architecture scout only
/4 water-subscription --phase interview   # restart feasibility interview
/4 water-subscription --phase synthesize  # rewrite prove.md from findings
/4 water-subscription --phase verify      # re-run structural checks only
```

**Phases:**
1. Load & Architecture Scout
2. Feasibility Interview (PM provides engineering context)
3. Feature Analysis (compare implementation approaches)
4. Synthesize (write prove.md, update opportunity.md, prd.md, brief.html)
5. Verify (structural checks)
6. Feedback

**Agents:**
- Architecture Scout — investigates prior work, system ownership, code patterns
- Feasibility Interviewer — structured conversation about build constraints
- Assumption Auditor — pre-interview assumption classification + targeted question generation
- Direction Generator — synthesizes 3-4 competing directions with KR coverage + formula scoring
- Feature Analyzer — compares implementation directions
- Data Analyst (shared) — capacity and cost signals

**Protocols:** Handoff Schema (/3→/4 validation), Consistency Check (mid-interview), Claims Cache (read/write)

**Connectors:** `knowledge_base`, `metrics_source`, `ticketing`, `code_explorer`

**Outputs:** `prove.md`, updated `opportunity.md`, `prd.md`, `brief.html`

---

### /5 ship — Mid-Fi Prototype + Release Checklist

Take a conviction-ready idea and upgrade to a mid-fidelity prototype.
Stress-test against metric tree, kill criteria, and risk register.
Produce a release checklist with go/no-go criteria.

**Usage:**
```
/5 water-subscription
/build water-subscription
```

**Phase routing:**
```
/5 water-subscription --phase stress-test   # re-run stress test only
/5 water-subscription --phase checklist     # regenerate release checklist
/5 water-subscription --phase verify        # re-run structural checks
```

**Phases:**
1. Load & Plan (verify readiness: feasibility Green/Yellow, kill criteria defined)
2. Upgrade Prototype (lo-fi → mid-fi with realistic content, edge cases, error states)
3. Stress Test (metric alignment, kill criteria check, risk stress)
4. Release Checklist (pre-build, during-build, rollout, pre-launch, post-launch)
5. Verify (structural checks)
6. Feedback

**Agents:**
- Prototype Builder (reused from /2) — mid-fi upgrade with error states, loading states
- Stress Tester — 3-lens stress analysis with coverage matrix and gap classification
- Data Analyst (shared) — last-mile baseline verification

**Protocols:** Handoff Schema (/4→/5 validation)

**Connectors:** `design_system`, `image_generation`, `metrics_source`, `experimentation`, `ticketing`, `code_explorer`

**Outputs:** `ship/prototype.html`, `ship/showcase.html`, `ship/release-checklist.md`, updated `opportunity.md`, `brief.html`

---

## Utility Skills

These run independently at any point. They don't chain into the pipeline
sequence but read pipeline artifacts.

---

### /setup — Connector Setup

Configure LEAPs connectors. Scan available MCPs, map them to
semantic roles, and write `connectors.yaml`.

**Usage:**
```
/setup                          # Full setup — scan, map, write connectors.yaml
/setup --check                  # Check-only — show status, don't write
/setup --preset generic         # Apply a preset and verify connections
/setup --role metrics_source    # Configure a single role
/setup --auth                   # Authenticate all unauthenticated MCPs
/setup --auth --required        # Only authenticate required roles
```

**Connectors configured:** All 17 roles (metrics_source, knowledge_base, product_analytics, ticketing, design_system, experimentation, monitoring, code_explorer, feedback, research_repository, support, app_store, session_replay, communication, image_generation, market_intel, deployment)

---

### /eval — Pipeline & System Evaluator

Two-layer evaluation: structural checks (pass/fail) and quality rubrics
(LLM-as-Judge, 1-5 scoring).

**Usage:**
```
/eval water-subscription        # evaluate a pipeline idea's outputs
/eval system                    # meta-evaluate skill/agent designs
```

**Agents:**
- Judge — LLM-as-Judge quality scoring against rubrics

**Outputs:** `pipeline/{idea-slug}/eval/YYYY-MM-DD.md` (deep scorecards, owned by the idea). System/batch evals stay at root `evals/system/` and `evals/batch/`. A background hook also appends deterministic per-phase checks to `pipeline/{idea-slug}/eval/phase-checks.jsonl` after every phase.

---

### /prd — Vibe-Coding Handoff

Compile pipeline artifacts into a self-contained starter prompt for
vibe-coding tools (v0, Cursor, Claude Code, Replit).

**Usage:**
```
/prd water-subscription
```

Requires at least `/1 learn` completed. Also auto-generated during `/2`, `/3`, `/4` Synthesize phases.

**Outputs:** `prd.md`

---

### /pipeline — Portfolio View

Read-only snapshot of all pipeline ideas. Stage, blocking questions,
last updated, eval scores.

**Usage:**
```
/pipeline
```

Also available as HTML kanban board: `open pipeline/index.html`

---

### /pipeline --rank  _(was /compare)_ — Prioritize Ideas

Compare pipeline ideas side-by-side using their Scoring sections.
Rank by Impact x Confidence / Complexity with adjustable weights.

**Usage:**
```
/pipeline --rank                                              # all ideas
/pipeline --rank water-subscription group-ordering breakfast   # specific ideas
```

---

### /grill-me — Stress Test Your Thinking

Relentless, structured interrogation. Finds weak spots in JTBD, sizing,
confidence, metrics, and feasibility. With connectors, fact-checks claims
against live data.

**Usage:**
```
/grill-me water-subscription
/grill-me group-ordering --focus sizing
/grill-me breakfast-occasions --mode quick
/grill-me water-subscription --persona toon
```

**Options:**
- `--focus [area]` — sizing, jtbd, metrics, feasibility, risks
- `--mode quick` — 5 questions max
- `--persona [name]` — grill as a specific stakeholder

**Connectors:** `metrics_source`, `feedback`, `support`

---

### /landscape — Strategic Landscape Builder

Drop source documents (strategy docs, RFCs, PRDs, competitive analyses) into a
backlog folder and generate a JTBD-structured strategic landscape: Occasions →
Opportunities → Bets, all sized with real data. Scaffolds pipeline directories
for downstream `/1 learn`.

**Usage:**
```
/landscape search-discovery
/landscape payments
/landscape                        # auto-detect: uses the only folder in backlog/
```

**Phase routing:**
```
/landscape search-discovery --phase structure    # re-extract structure
/landscape search-discovery --phase size         # re-pull sizing
/landscape search-discovery --phase synthesize   # rewrite landscape.md
```

**Phases:**
1. Preflight (connector check)
2. Ingest (read backlog docs, extract claims + initiatives)
3. Structure (organize into Occasion → Opportunity → Bet, PM approval)
4. Size (verify claims against data sources, PM approval)
5. Synthesize (write landscape.md + brief.html)
6. Scaffold (create pipeline directories for each bet)
7. Feedback (PM satisfaction)

**Agents:**
- Doc Analyzer — extract claims, initiatives, pain points from source docs
- Data Analyst (shared) — sizing verification and baselines

**Connectors:** `metrics_source` (required), `knowledge_base`

**Outputs:** `pipeline/{domain}-landscape.md`, `pipeline/{bet-slug}/` directories with skeleton decision-logs

---

### /setup --sync-design  _(was /sync-design)_ — Design Token Sync

Pull design tokens from Figma and refresh `DESIGN.md` + `design_tokens.json`.
The desktop app also runs this from Settings → Design system ("Sync from Figma");
the default design system is brand-neutral until you connect a Figma file.

**Usage:**
```
/setup --sync-design
```

**Connectors:** `design_system` (required)

**Outputs:** `design/DESIGN.md`, `design/design_tokens.json`

---

## Shared Protocols

Agents and protocols in `_shared/` are used across multiple skills:

| Protocol | Purpose | Used By |
|----------|---------|---------|
| `connector-resolver.md` | Resolve semantic roles to MCP tools at runtime | All agents that access connectors |
| `auth-preflight.md` | Check MCP auth before skill start, cache results | Pipeline skills /1-/5, /grill-me, /landscape, /compare |
| `data-analyst.md` | Sizing, baselines, instrumentation assessment | /1, /3, /4, /5, /landscape |
| `brief-builder.md` | Render pipeline brief (brief.html) | All pipeline skills |
| `pipeline-cost.md` | Calculate and display token cost | All pipeline skills |
| `doc-analyzer.md` | Source document extraction (folder, dropped files, links) | /1, /landscape |
| `feedback-collection.md` | Collect PM satisfaction feedback | All pipeline skills |

---

### /prd --publish  _(was /share)_ — Publish to Web

Deploy a pipeline idea's full artifact set to `vibe-pipelines.lths.ai/{slug}/`.
Publishes brief, prototypes, markdown files, competitor research — everything.

**Usage:**
```
/prd --publish group-ordering           # deploy everything
/prd --publish group-ordering --update  # redeploy after changes
```

**Process:**
1. Collect all files from `pipeline/{slug}/`
2. Deploy to Vibehost (scaffolds app on first run)
3. Inject `deployed-url` meta tag into local brief
4. Share button copies the live URL

**Connectors:** `deployment`


**Outputs:** Live site at `https://vibe-pipelines.lths.ai/{slug}/`

---

### /agenthub-setup — REMOVED (cut: Company-specific deployment, out of scope)

Translate a LEAPs phase into a self-contained your company **Agents Hub** agent,
saved as a Draft. Inlines the phase's process into a system prompt, maps its
connector roles to Agents Hub MCP servers + the Context Hub capability, uploads
its reference docs as knowledge, and drives the create form via Playwright.
Stops at Draft — never inserts an LLM credential or clicks Deploy.

**Usage:**
```
/agenthub-setup ground          # by name
/agenthub-setup 1               # by pipeline number
/agenthub-setup grill-me        # any utility skill
```

**Process:**
1. Resolve target — read the skill's SKILL.md, agents, and referenced `_shared` files
2. Synthesize blueprint — self-contained system prompt, role→MCP mapping, knowledge files, suggested prompts (staged under `.agenthub/{skill}/`)
3. Preflight Okta SSO (persistent profile; first run `--headed`)
4. Deploy draft via `scripts/agentshub_deploy.py` (idempotent — updates by stored `slug`)
5. Verify MCPs / Context Hub / knowledge from the driver's JSON
6. Handoff — edit URL + manual finish (token → model → Deploy) + gaps report

**Role → Agents Hub mapping** lives in `scripts/agentshub_mapping.py` (`map_roles`).
Gaps (no hub equivalent): `code_explorer`, `design_system`/Figma, `image_generation`, `market_intel`.

**Outputs:** A Draft agent at `…/agents/{slug}/edit`; staging under `.agenthub/{skill}/` (git-ignored).

---

## Connector Roles Reference

17 roles across 5 categories. Run `/setup --check` to see what's wired.

| Category | Role | What It Provides |
|----------|------|-----------------|
| **Core Data** | `metrics_source` | Customer counts, order volumes, baselines, unit economics |
| | `knowledge_base` | Prior work, domain ownership, architectural decisions |
| | `product_analytics` | Behavioral events, funnels, retention, user paths |
| **Build Context** | `ticketing` | Issue tracking, sprint context, engineering tickets |
| | `design_system` | Design tokens, component patterns, visual language |
| | `experimentation` | A/B test config, feature flags, experiment results |
| | `monitoring` | Error rates, reliability signals, performance |
| | `code_explorer` | Codebase — APIs, services, dependencies, patterns |
| **Voice of Customer** | `feedback` | Structured feature requests, upvotes |
| | `research_repository` | Synthesized user research, interview notes |
| | `support` | Support tickets, complaint themes, volume |
| | `app_store` | App ratings, reviews, version sentiment |
| | `session_replay` | Behavior recordings, friction, rage clicks |
| **Comms & Creative** | `communication` | Team messaging, signals, async comms |
| | `image_generation` | Product mockup images for prototypes |
| **Situational** | `market_intel` | Competitor tracking, market research, benchmarks |
| | `deployment` | App deployment, hosting, publishing for prototypes and briefs |
