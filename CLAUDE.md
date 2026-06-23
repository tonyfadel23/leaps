# LEAPs — Product Discovery Pipeline

LEAPs is one home for the whole product: the Electron app (`electron/`, `src/`) **and** the discovery pipeline (`.claude/skills`, `scripts/`, `connectors.yaml`, `pipeline/`). It takes any idea and grinds it into a learned, prototyped, conviction-ready artifact through conversation. Conviction (0-100, Pursue/Needs/Kill, rigor-gated) is computed by one engine (`electron/engine/conviction.js`), stored in each idea's `.briefdata.json`, shown in the brief, and audited by `/eval`.

## Quick Start

```
/setup                          # First run — wire your data tools to LEAPs
/1 water-subscription           # Start grinding an idea
/pipeline                       # See all ideas at a glance
```

See `SKILLS.md` for the full skill catalog with arguments and phases.

## Startup Behavior

When a PM opens a new conversation, run this sequence **before responding to their first message**. If the PM's first message is already a skill command (`/1`, `/2`, `/grill-me`, etc.), skip the welcome entirely and run the skill.

### Step 1 — Detect Pipeline State

Scan `pipeline/*/` directories. For each, detect stage by checking file existence (highest wins):

| Check | Stage |
|-------|-------|
| `ship/` directory exists | Shipped |
| `prove.md` exists | Proven |
| `assess.md` exists | Assessed |
| `explore.md` exists | Explored |
| `learn.md` exists | Learned |
| Directory exists but empty | Empty |

If `.state.json` exists in an idea directory, that idea is in-progress — note which skill and phase.

### Step 2 — Check Connector Status

Check if `connectors.yaml` exists at the project root:
- If yes: count how many roles have bindings (non-empty `primary` field)
- If no: connectors are not configured

### Step 3 — Present Welcome

**If no ideas exist in the pipeline (first-time or empty):**

```
Welcome to LEAPs — your AI product discovery partner.

I take any idea from raw signal to conviction-ready artifact through conversation.

/1 learn    → Sharpen a fuzzy idea into a clear problem (JTBD)
/2 explore    → Prototype solutions before touching metrics
/3 assess    → Set success criteria, baselines, kill criteria
/4 prove   → Test feasibility, map dependencies, pick a direction
/5 ship     → Mid-fi prototype + stress test + release checklist

Tell me an idea, a problem, or a signal — or type /1 to start.
```

If connectors are not configured, append:

```
Your data tools aren't connected yet. Type /setup to wire your BI, design, and ticketing tools so I can pull real numbers during discovery.
```

**If ideas exist in the pipeline (returning user):**

```
Welcome back. Here's your pipeline:

| Idea | Stage | Next Step |
|------|-------|-----------|
| {slug} | {stage} | → /{next} {slug} |
| ... | ... | ... |

{N} ideas total. Pick one to continue, or tell me a new idea.
```

For the "Next Step" column, recommend based on current stage:

| Current Stage | Recommend |
|---------------|-----------|
| Learned | `/2` to explore solutions |
| Explored | `/3` to assess success criteria |
| Assessed | `/4` to prove feasibility |
| Proven | `/5` to build mid-fi prototype |
| Shipped | `/grill-me` to stress-test, or `/eval` to score |

After the table, show quick actions:

```
Quick actions:
• Continue: /{N} {slug}
• New idea: just tell me about it
• Full board: /pipeline
• Stress-test: /grill-me {slug}
• Compare ideas: /compare
```

If any idea is in-progress (has `.state.json`), highlight it: `{slug} is mid-run — pick up where you left off with /{skill} {slug}`

### Startup Rules

- **First message only.** After the welcome, operate normally.
- **Skill commands skip welcome.** If the PM types `/2 water-subscription` as their first message, go straight to the skill.
- **Keep it short.** The returning-user table should show at most 8 ideas. If more exist, show top 5 by last-updated date and say "+{N} more — type /pipeline to see all."
- **No tutorial dumps.** The PM doesn't need to learn the system — they need to pick an action.

## Pipeline

5 chainable skills, each conversation-first with specialist agent delegation:

| # | Skill | Purpose | Status |
|---|-------|---------|--------|
| `/1` | learn | Raw idea → sharp JTBD problem statement | Shipped |
| `/2` | explore | Problem → lo-fi HTML prototypes + journey maps | Shipped |
| `/3` | assess | Sketches → success criteria, KRs, baselines, kill criteria | Shipped |
| `/4` | prove | KRs + sketches → feasibility, constraints, competing directions | Shipped |
| `/5` | ship | Conviction → mid-fi prototype + stress-test + release checklist | Shipped |

### Utility Skills

8 utility skills (down from 14 — six were merged into flags on existing skills):

| Skill | Purpose |
|-------|---------|
| `/setup` | Configure connectors. `--sync-design` pulls Figma design tokens _(was /sync-design)_ |
| `/eval` | Quality checks + system audit (Tier 1 structural + Tier 2 LLM-as-Judge), incl. **Conviction Rigor** |
| `/prd` | Compile artifacts into a vibe-coding handoff prompt. `--publish` deploys the brief + artifacts _(was /share)_ |
| `/pipeline` | Portfolio view. `--rank` prioritizes _(was /compare)_, `--cost` usage report _(was /cost)_, `--replay` decision history _(was /replay)_ |
| `/grill-me` | Stress-test PM's thinking — relentless interrogation of assumptions and gaps |
| `/landscape` | Source docs → JTBD landscape with sized bets + scaffolded pipeline |
| `/import` | Import existing docs (PRDs, one-pagers) into the pipeline |
| `/archive` | Archive/unarchive pipeline ideas |

_Cut: `/agenthub-setup` (your company Agents Hub deployment — out of scope as a core pipeline skill)._

## Connector System

See `SKILLS.md` for the full connector catalog. Run `/setup` to configure, `/setup --check` to audit.

## Auth Preflight

Pipeline skills check MCP authentication before starting. If tokens have
expired, the skill warns you and suggests `/setup --auth` to batch-authenticate.
Auth status is cached for 20 minutes in `.auth-cache.json`.

## Structure

```
leap/                            # the app + the pipeline, one home
├── electron/                    # Electron main + engine (conviction.js, pipeline-reader.js, discovery.js, connectors.js)
├── src/                         # renderer UI (the LEAPs desktop app)
├── CLAUDE.md                    # This file
├── SKILLS.md                    # Full skill catalog — usage, arguments, phases
├── SPEC.md                      # System specification — architecture, data model, protocols
├── connectors.yaml              # Connector bindings (generated by /setup)
├── presets/                     # Preset connector configs
│   └── generic.yaml
├── design/
│   ├── DESIGN.md                # Design tokens + app patterns (NEUTRAL default; replace via Settings → Design system / /setup --sync-design)
│   ├── design_tokens.json       # Raw tokens (updated by /sync-design)
│   └── .figma-source            # Figma file URL (saved by /sync-design)
├── backlog/                     # Source docs for /landscape (drop strategy docs here)
├── scripts/
│   ├── build-brief.js              # Rebuild .briefdata.json + compute conviction + render brief.html
│   ├── compute-conviction.js       # Conviction engine wrapper: --write (store) / --check (eval honesty gate)
│   ├── regenerate-briefs-v2.js     # Brief renderer (slide builders, incl. the Conviction page)
│   └── generate-pipeline-board.js  # Kanban board generator (runs via PostToolUse hook)
├── .claude/agents/              # Shared agents (used across multiple skills)
│   ├── brief-builder.md         # Pipeline brief renderer
│   ├── data-analyst.md          # Consolidated data analyst (sizing + baselines)
│   ├── doc-analyzer.md          # Document analysis agent
│   ├── pm-proxy.md         # Answers pipeline questions as the PM (invocable)
│   ├── pm-challenger.md    # Grills any phase output in the PM's voice (invocable)
│   └── pm-orchestrator.md  # First-pass /1→/5 run with the PM's judgment (invocable)
├── .claude/skills/              # All skills live here — specialist agents
│   ├── _shared/                 # Shared protocols, references & templates
│   │   ├── protocols/
│   │   │   ├── connector-resolver.md # MCP connector resolution
│   │   │   ├── auth-preflight.md    # MCP auth check before skill start
│   │   │   ├── session-management.md # Session resume, phase routing, progress tracking
│   │   │   ├── staleness-check.md   # Upstream change detection with diff summaries
│   │   │   ├── claims-cache.md      # Data finding persistence across skills (.claims.json)
│   │   │   ├── consistency-check.md # Mid-interview contradiction detection
│   │   │   ├── handoff-schema.md    # Inter-skill data contracts (4 transitions)
│   │   │   ├── cascade.md           # Cascade invalidation (skills /1-/5)
│   │   │   ├── opportunity-update.md # Common opportunity.md update patterns
│   │   │   ├── design-handoff.md    # Design token handoff between skills
│   │   │   ├── pipeline-cost.md     # Token cost calculation protocol
│   │   │   └── feedback-collection.md # PM feedback collection protocol
│   │   ├── reference/
│   │   │   ├── design-tokens.css    # Shared CSS custom properties (--pos-*)
│   │   │   ├── business-context.md   # Compiled from active context/*.md docs (folder of toggleable markdown docs; active docs compile here; pipeline skills + live discovery read this file)
│   │   │   ├── job-framework.md     # JTBD framework (4D map, outcomes, scoring)
│   │   │   ├── prototype-specs.md   # Phone shell dimensions, visual constants, NEVER-DO list
│   │   │   └── brief-field-mappings.md  # briefData extraction rules per skill
│   │   ├── brief-pages/          # Per-page brief rendering specs
│   │   │   ├── summary.md, outcomes.md, competitors.md
│   │   │   ├── journey.md, variations.md, kpis.md
│   │   │   └── scope.md, feasibility.md, decisions.md, prd.md
│   │   └── templates/           # Output document templates
│   │       ├── learn-card.md, assess-card.md, prove-card.md
│   │       ├── opportunity-init.md, summary-init.md, outcomes-page.md
│   │       ├── research-plan.md, feasibility-page.md, release-checklist.md
│   │       ├── quality-checklist.md
│   │       ├── showcase-navigation.md  # Mandatory JS for index.html + final-showcase.html
│   │       └── verify-*.md             # Per-skill structural verification templates
│   ├── learn/                  # /1 learn — interviewer, context retriever
│   ├── explore/                  # /2 explore — journey mapper, competitor researcher,
│   │                            #    prototype builder, showcase builder, comparative critique
│   ├── assess/                  # /3 assess — define interviewer
│   ├── prove/                 # /4 prove — architecture scout, feasibility interviewer,
│   │                            #    assumption auditor, direction generator, feature analyzer
│   ├── ship/                   # /5 ship — prototype builder (reused), stress tester
│   │   └── SKILL.md
│   ├── setup/                   # /setup (connector configuration)
│   │   └── SKILL.md
│   ├── prd/                     # /prd (utility)
│   │   └── SKILL.md
│   ├── eval/                    # /eval (utility)
│   │   ├── SKILL.md
│   │   └── agents/
│   │       └── judge.md
│   ├── landscape/               # /landscape (utility)
│   │   └── SKILL.md
│   ├── pipeline/                # /pipeline (utility)
│   │   └── SKILL.md
│   ├── grill-me/                # /grill-me (utility)
│   │   └── SKILL.md
│   ├── import/                  # /import (utility)
│   │   └── SKILL.md
│   └── archive/                 # /archive (utility)
│       └── SKILL.md
├── evals/                       # Cross-idea evals only: system/, batch/, agent-tests/
│   │                            #   (per-idea evals live under each idea's eval/ folder)
└── pipeline/                    # Outputs from running skills
    ├── index.html               # Auto-generated kanban board (do not edit)
    └── {idea-slug}/
        ├── opportunity.md           # Living one-pager (grows with each skill)
        ├── brief.html               # Pipeline brief (slide-deck, grows with each skill)
        ├── summary.md               # Brief page source: bet, evidence, seeking (/1, updated by all)
        ├── outcomes.md              # Brief page source: job, occasion, outcome map (/1)
        ├── competitors.md           # Brief page source: strategic read, differentiators (/2)
        ├── journey.md               # Brief page source: direction, stages, intervention (/2)
        ├── variations.md            # Brief page source: chosen + explored directions (/2)
        ├── metrics.md               # Brief page source: north star, inputs, kill criteria (/3)
        ├── scope.md                 # Brief page source: ship/don't/later + build context (/3)
        ├── feasibility.md           # Brief page source: formula scoring, risks, deps (/4)
        ├── decisions.md             # Brief page source: open/resolved + full Q&A log (all stages)
        ├── decision-log.md          # Raw append-only Q&A log (process record)
        ├── learn.md                # /1 process output
        ├── research-plan.md         # /1 user research plan
        ├── competitors/             # /2 competitor research (raw analysis + screenshots)
        ├── sketches/                # /2 HTML prototypes + journey map
        │   ├── explore.md
        │   ├── journey.html
        │   ├── index.html           # Variation explorer (interactive, one phone)
        │   ├── overview.html        # Variation overview (static gallery, all phones)
        │   ├── final-showcase.html  # Chosen direction
        │   └── variation-*.html
        ├── prd.md                   # Vibe-coding handoff (/2, updated by /4)
        ├── assess.md                # /3 process output
        ├── prove.md               # /4 process output
        ├── .claims.json             # Data findings cache (persists across skills)
        ├── eval/                    # Per-idea eval history (owned by the idea)
        │   ├── phase-checks.jsonl   # Deterministic per-phase checks (background hook)
        │   ├── .eval-state.json     # Hook bookkeeping — phases already evaluated
        │   ├── feedback.md          # PM feedback (per-phase + skill-end)
        │   └── YYYY-MM-DD.md        # Deep LLM scorecard (/eval, skill-end auto-eval)
        └── ship/                   # /5 output
```

## Design Principles

1. **Conversation, not template** — skills ask questions one at a time, propose answers
2. **JTBD-native, domain-fluent** — questions grounded in your company context, not theory
3. **Opinionated handoffs** — each skill recommends the next step
4. **Concrete before measurable** — sketch the experience before defining KRs
5. **Graceful degradation with transparency** — if an MCP fails mid-skill (error, timeout, auth expired), follow the Runtime Failure Handling protocol in `_shared/connector-resolver.md`: retry once, try fallbacks, then surface the gap to the PM honestly. Never silently skip data or fabricate content to fill gaps. Every MCP failure is logged to `decision-log.md`.
6. **Cascade invalidation — enforced** — re-running an upstream skill marks downstream artifacts as stale. Each skill checks upstream modification dates on entry and warns the PM before proceeding with outdated inputs. When a skill re-runs and updates its output, it writes a `cascade` entry to `.state.json`:

   ```json
   {
     "cascade": {
       "source": "/1 learn",
       "updated_at": "2026-06-08T14:30:00Z",
       "stale": ["explore.md", "assess.md", "prove.md"]
     }
   }
   ```

   On pipeline startup (Step 1), check every idea's `.state.json` for a `cascade` entry. If present, show a staleness warning in the pipeline table. When a downstream skill runs and finds its file in `cascade.stale`, it shows the warning and logs the PM's decision. After completing, it removes its file from the array. When the array is empty, delete the `cascade` entry.

   Cascade decisions are logged to `decision-log.md` with `When: Cascade`. Discovery is non-linear — PMs can jump back to any stage and the pipeline tracks what needs refreshing.

## Concurrency Guard

Before starting any pipeline skill on an idea directory, check for active runs:

1. **Read `.state.json`** in `pipeline/{idea-slug}/`
2. If it exists AND `skill` is a **different** skill than the one being invoked:
   - Show: "**Another skill is active on this idea.**
     `/{N} {skill}` was started on {started_at} and is currently in phase
     {current_phase}. Running two skills on the same idea simultaneously
     will corrupt shared files (opportunity.md, decision-log.md, brief.html).
     
     Options:
     1. **Wait** — finish the active skill first, then run this one
     2. **Force** — clear the lock and proceed (only if the prior session crashed)"
   - If PM says "force": delete `.state.json`, proceed, and log to
     `decision-log.md`: `**Force override**: cleared stale lock from /{old_skill}, {date}`
   - If PM says "wait": stop and remind them to finish the other skill
3. If `.state.json` exists AND `started_at` is more than **24 hours ago**:
   - Treat as a crashed session — auto-clear the lock
   - Log to `decision-log.md`: `**Auto-cleared stale lock**: /{skill} started {started_at}, expired after 24h`
   - Proceed with the new skill
4. If `.state.json` exists AND `skill` matches: this is a resume (existing behavior)
5. If `.state.json` doesn't exist: proceed normally

All `.state.json` writes must include a `started_at` ISO timestamp:

```json
{
  "skill": "/2 explore",
  "phase": "prototype",
  "started_at": "2026-06-08T14:30:00Z",
  "completed_phases": ["journey", "concepts"]
}
```

> **Note:** This guard is prompt-level enforcement only. If two Claude sessions start simultaneously on the same idea, both may read `.state.json` before either writes. This is an accepted limitation — the probability is low (requires two terminals on the same idea at the same instant). If it becomes a problem, a filesystem-level lock (e.g., `flock` wrapper) could be added via a hook.

## Checkpoint Protocol

Each skill writes `.state.json` after every phase completes. To improve
recovery from mid-run failures:

### What to checkpoint

`.state.json` must include:
- `skill`: which skill is running
- `phase`: current phase name
- `started_at`: ISO timestamp of skill start
- `completed_phases`: array of phase names already finished
- `context`: object with skill-specific intermediate data (confirmed JTBD,
  metric tree, chosen direction, etc.)

### Recovery behavior

When resuming from `.state.json`:
1. Read `completed_phases` to know where to start
2. Read `context` to restore intermediate state
3. Re-read existing artifacts (`decision-log.md`, `learn.md`, etc.)
   to recover conversation context
4. **Do not re-ask questions that are already answered in decision-log.md.**
   Parse the existing Q&A entries for the current skill's section and
   treat those as confirmed answers.

### Mid-phase crash recovery

If a phase fails partway through:
1. The phase stays in `.state.json` as `phase` (not in `completed_phases`)
2. On resume, re-read any artifacts written so far in that phase
3. If decision-log.md has Q&A entries from the current phase, those
   answers are confirmed — don't re-ask them
4. Present: "Resuming {phase_name} — I found [N] questions already
   answered from the interrupted session. Picking up from Q{next}."

## Execution Log

Every pipeline skill writes an execution log to
`pipeline/{idea-slug}/execution-log.md`. This is an operational audit
trail — for debugging and improvement.

### What to log

Append entries after each phase completes:

```markdown
## /N {skill} — {date}

### Phase {N}: {phase_name}
- **Started**: {timestamp}
- **Agents invoked**: {list of agent files called}
- **MCP calls**:
  - {role}: {mcp_name} — {success/failed/fallback used}
- **Connector failures**: {list, or "none"}
- **Artifacts written**: {list of files created/updated}
- **Completed**: {timestamp}
```

### Rules

- Append only — never overwrite prior entries
- Log MCP failures even if fallback succeeded (helps identify flaky connectors)
- Log agent invocations even if they returned empty results
- Keep entries compact — structured metadata, not prose
- Create the file on first skill run; subsequent skills append

## Viewing Artifacts

Always use `open` to display HTML artifacts (briefs, prototypes, journey maps, showcases). **Never use Playwright `browser_navigate` or direct URLs to view pipeline artifacts.**

```bash
open pipeline/{idea-slug}/brief.html            # Brief deck
open pipeline/{idea-slug}/sketches/index.html    # Variation explorer
open pipeline/{idea-slug}/sketches/overview.html  # Variation overview (gallery)
open pipeline/{idea-slug}/sketches/journey.html  # Journey map
open pipeline/{idea-slug}/ship/showcase.html    # Build showcase
```

Inside the Electron app, `open` is intercepted and routes to the built-in preview pane — no browser tab opens. Outside the app (plain terminal), `open` uses the system default browser.

