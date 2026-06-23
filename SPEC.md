# LEAPs — System Specification

> Version 1.7 · June 2026
> Status: Production (internal tool, ~128 commits, 3 tagged releases)

---

## 1. System Overview

LEAPs is an AI-powered product discovery pipeline that converts raw ideas into conviction-ready artifacts through structured, conversation-first skills. It is purpose-built for PMs at your company — JTBD-native, data-connected, and opinionated about process.

### Core Thesis

Traditional product discovery tools are template-driven and disconnected from data. LEAPs inverts this: each skill is a conversation where the AI asks questions, proposes evidence-based answers, and produces artifacts that feed the next stage. The PM steers; the system grinds.

### System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                       LEAPs                            │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Orbit   │   │ Claude Code  │   │  Pipeline Artifacts│   │
│  │ (Electron│◄─►│  (LLM Agent) │──►│  (HTML, MD, JSON) │   │
│  │  App)    │   │              │   │                    │   │
│  └──────────┘   └──────┬───────┘   └──────────────────┘    │
│                        │                                    │
│              ┌─────────▼─────────┐                          │
│              │  MCP Connectors   │                          │
│              │  (17 roles)       │                          │
│              └───────────────────┘                          │
│                        │                                    │
│         ┌──────────────┼──────────────┐                     │
│         ▼              ▼              ▼                     │
│     Data Tools    Design Tools   Communication              │
│   (Looker, BQ,   (Figma, Image  (Slack, Jira,              │
│    Tableau)       Generation)    GitHub)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 Component Hierarchy

| Layer | Components | Responsibility |
|-------|-----------|----------------|
| **Presentation** | Orbit (Electron), Pipeline HTML, Brief HTML | User interface, artifact rendering |
| **Orchestration** | Skill SKILL.md files (18 total) | Phase routing, agent delegation, state management |
| **Agent** | specialist agents (per-skill) + shared agents | Domain-specific AI tasks (interview, research, prototype, score) |
| **Protocol** | 12 shared protocols | Cross-cutting concerns (sessions, connectors, auth, handoffs, caching) |
| **Persistence** | Pipeline filesystem (MD, HTML, JSON) | Artifact storage, state checkpoints, decision logs |
| **Integration** | Connector system (17 roles → MCP tools) | External data tool resolution and fallback |

### 2.2 Skill System

#### Pipeline Skills (Sequential, Chainable)

```
/1 learn ──► /2 explore ──► /3 assess ──► /4 prove ──► /5 ship
   │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼
 Problem       Prototype      Metrics       Feasibility    Mid-fi +
 statement     + journey      + kill        + risks        stress test
 (JTBD)                       criteria
```

Each skill:
- Has 5-7 phases (Preflight → Feedback)
- Delegates to 1-6 specialist agents
- Writes `.state.json` after every phase for crash recovery
- Appends to `execution-log.md` for operational audit
- Updates `opportunity.md`, `decision-log.md`, `brief.html`
- Validates upstream inputs via handoff schema before starting
- Collects PM feedback on completion

#### Utility Skills (Independent)

| Skill | Purpose | Reads | Writes |
|-------|---------|-------|--------|
| `/setup` | Configure MCP connectors | Available MCPs | `connectors.yaml` |
| `/sync-design` | Figma → local tokens | Figma file | `DESIGN.md`, `design_tokens.json` |
| `/pipeline` | Portfolio snapshot | All `pipeline/*/` | stdout only |
| `/compare` | Idea prioritization | `opportunity.md` Scoring sections | stdout only |
| `/grill-me` | Assumption stress-test | All pipeline artifacts | `decision-log.md` |
| `/eval` | Quality audit | All pipeline artifacts | `evals/` scorecards |
| `/prd` | Vibe-coding handoff | All pipeline artifacts | `prd.md` |
| `/landscape` | Strategy doc → JTBD landscape | `backlog/` docs | `landscape.md` + pipeline dirs |
| `/share` | Publish to web | All pipeline artifacts | Vibehost deployment |
| `/replay` | Decision history walkthrough | `decision-log.md` | stdout (structured narrative) |
| `/cost` | Token cost & execution report | `execution-log.md` files | stdout only |
| `/import` | Import external docs into pipeline | File/URL/paste | Pipeline idea directory |
| `/archive` | Archive/unarchive ideas | `pipeline/{slug}/` | `archive/{slug}/` |

### 2.3 Agent Inventory

specialist agents + shared agents, organized by skill:

| Agent | File | Skills | Capability |
|-------|------|--------|------------|
| Interviewer | `learn/agents/interviewer.md` | /1 | One-question-at-a-time JTBD conversation |
| Context Retriever | `learn/agents/context-retriever.md` | /1 | Tribal knowledge from MCPs (KB, ticketing, feedback, support) |
| Doc Analyzer | `_shared/doc-analyzer.md` | /1, /L | Source document extraction and claim identification |
| Journey Mapper | `explore/agents/journey-mapper.md` | /2 | 4D customer journey (time, social, need, struggle) |
| Journey Renderer | `explore/agents/journey-renderer.md` | /2 | HTML visualization of journey map |
| Competitor Researcher | `explore/agents/competitor-researcher.md` | /2 | Market landscape, screenshots, feature matrices |
| Prototype Builder | `explore/agents/prototype-builder.md` | /2, /5 | HTML prototypes with your company design tokens (lo-fi + mid-fi) |
| Showcase Builder | `explore/agents/showcase-builder.md` | /2 | Variation explorer + final direction showcase |
| Comparative Critique | `explore/agents/comparative-critique.md` | /2 | 5-dimension scoring (ease, cost, novelty, confidence, impact) |
| Define Interviewer | `assess/agents/assess-interviewer.md` | /3 | Metric tree construction, kill criteria, baselines |
| Architecture Scout | `prove/agents/architecture-scout.md` | /4 | Prior work, system ownership, code patterns |
| Feasibility Interviewer | `prove/agents/feasibility-interviewer.md` | /4 | Constraints + dependency conversation |
| Assumption Auditor | `prove/agents/assumption-auditor.md` | /4 | Pre-interview assumption classification + question gen |
| Direction Generator | `prove/agents/direction-generator.md` | /4 | 3-4 competing directions with KR coverage + formula scoring |
| Feature Analyzer | `prove/agents/feature-analyzer.md` | /4 | Code-level implementation impact analysis |
| Stress Tester | `ship/agents/stress-tester.md` | /5 | 3-lens stress analysis (metrics, kill criteria, risks) |
| Judge | `eval/agents/judge.md` | /eval | LLM-as-Judge quality scoring against rubrics |
| **Data Analyst** | `_shared/data-analyst.md` | /1,/3,/4,/5,/L,/grill | Sizing, baselines, capacity, instrumentation |

### 2.4 Protocol System

12 protocols enforce cross-cutting behavior across all skills:

| Protocol | File | Purpose |
|----------|------|---------|
| Connector Resolver | `connector-resolver.md` | Role → MCP resolution with fallback chains |
| Auth Preflight | `auth-preflight.md` | MCP authentication check before skill start |
| Session Management | `session-management.md` | Crash recovery, phase routing, `.state.json` |
| Staleness Check | `staleness-check.md` | Detect upstream changes with diff summaries |
| Claims Cache | `claims-cache.md` | Data finding persistence in `.claims.json` |
| Consistency Check | `consistency-check.md` | Mid-interview contradiction detection (every 3rd answer) |
| Handoff Schema | `handoff-schema.md` | Required field validation at 4 skill transitions |
| Cascade | `cascade.md` | Invalidation propagation when upstream skills re-run |
| Opportunity Update | `opportunity-update.md` | Common `opportunity.md` update patterns per skill |
| Design Handoff | `design-handoff.md` | Design token handoff between skills |
| Pipeline Cost | `pipeline-cost.md` | Token usage calculation and display |
| Feedback Collection | `feedback-collection.md` | PM satisfaction survey at skill completion |

---

## 3. Data Model

### 3.1 Pipeline Artifact Structure

Each idea lives in `pipeline/{idea-slug}/` with this canonical structure:

```
pipeline/{idea-slug}/
│
│  ── Living Documents (updated by multiple skills) ──
├── opportunity.md         # One-pager: JTBD, sizing, metrics, feasibility, scoring
├── brief.html             # Slide-deck presentation (auto-generated, grows per skill)
├── decision-log.md        # Append-only Q&A log (all skills write here)
├── prd.md                 # Vibe-coding handoff (created /2, updated /4)
│
│  ── Skill Outputs (one skill owns each) ──
├── learn.md              # /1 output: JTBD, occasion, outcomes, sizing
├── research-plan.md       # /1 output: user research plan
├── explore.md              # /2 output: journey, directions, variations
├── assess.md              # /3 output: metric tree, baselines, kill criteria
├── prove.md             # /4 output: feasibility, risks, dependencies, directions
│
│  ── Brief Source Pages (per-page brief data) ──
├── summary.md             # /1+: bet summary, evidence, seeking
├── outcomes.md            # /1: job, occasion, outcome map
├── competitors.md         # /2: strategic read, differentiators
├── journey.md             # /2: direction, stages, intervention
├── variations.md          # /2: chosen + explored directions
├── metrics.md             # /3: north star, inputs, kill criteria
├── scope.md               # /3: ship/don't/later + build context
├── feasibility.md         # /4: formula scoring, risks, deps
├── decisions.md           # /4: open/resolved + full Q&A log
│
│  ── Rich Artifacts ──
├── sketches/              # /2: HTML prototypes + journey map
│   ├── variation-a.html, variation-b.html, variation-c.html
│   ├── index.html         # Variation explorer
│   ├── final-showcase.html # Chosen direction
│   ├── journey.html       # Customer journey visualization
│   └── explore.md
├── competitors/           # /2: competitor research
│   ├── analysis.md
│   └── screenshots/
├── ship/                 # /5: mid-fi prototype + release checklist
│   ├── prototype.html
│   ├── showcase.html
│   └── release-checklist.md
│
│  ── State & Metadata ──
├── .state.json            # Session checkpoint (deleted on completion)
├── .claims.json           # Data findings cache (persists across skills)
├── execution-log.md       # Operational audit trail
└── feedback.md            # PM run feedback
```

### 3.2 State Machine

Each skill execution follows a deterministic phase sequence. The `.state.json` checkpoint enables crash recovery:

```json
{
  "skill": "/3 assess",
  "phase": "validate",
  "started_at": "2026-06-19T10:00:00Z",
  "completed_phases": ["inspect", "interview"],
  "context": {
    "north_star": "Monthly active subscribers",
    "confirmed_krs": ["KR1: 10% adoption in 90 days"]
  },
  "cascade": {
    "source": "/1 learn",
    "updated_at": "2026-06-18T14:30:00Z",
    "stale": ["explore.md", "assess.md"]
  }
}
```

**State transitions:**
- `pending` → Phase begins, `.state.json` written with current phase
- `completed` → Phase done, added to `completed_phases`, next phase starts
- `failed` → Phase stays as `phase` (not in `completed_phases`), resume re-reads partial artifacts
- `skill complete` → `.state.json` deleted

**Concurrency:** Only one skill can run per idea at a time. Lock enforced by `.state.json` presence. 24-hour auto-expiry for stale locks.

### 3.3 Handoff Contracts

Each transition validates required fields from upstream:

| Transition | Required Fields |
|------------|----------------|
| `/1 → /2` | JTBD statement, occasion, job, outcome map, sizing estimate, confidence level |
| `/2 → /3` | Chosen direction, variations explored, customer journey, prototype URLs |
| `/3 → /4` | Metric tree (north star + inputs), kill criteria, baselines, instrumentation gaps |
| `/4 → /5` | Feasibility scoring (Green/Yellow required), risk register, recommended direction |

### 3.4 Decision Log Format

Append-only. Canonical source of truth for all PM decisions:

```markdown
**Q{N}**: {Question text}
**A{N}**: {PM's answer}

**Data pull — {context}**: [findings with citations]
**When**: {skill} / Runtime failure / Cascade
```

---

## 4. Connector System

### 4.1 Resolution Pattern

Skills never hardcode MCP tool names. Instead, they declare semantic roles. The connector resolver maps roles to MCPs at runtime:

```
Skill declares: "I need metrics_source"
          ↓
Read connectors.yaml → primary: "your-bi-tool"
          ↓
Is your-bi-tool available? → Yes → Use it
                        → No → Try fallback: looker → bigquery → tableau
                                    ↓
                              All fail? → Apply fallback_mode:
                                          ask_user / skip / paste
```

### 4.2 Role Catalog (17 Roles)

| Category | Role | Primary | Fallbacks |
|----------|------|---------|-----------|
| **Core Data** | `metrics_source` | your-bi-tool | looker, bigquery, tableau |
| | `knowledge_base` | your-knowledge-tool | atlassian (Confluence) |
| | `product_analytics` | your-bi-tool | looker events |
| **Build Context** | `ticketing` | atlassian (Jira) | — |
| | `design_system` | figma | — |
| | `experimentation` | eppo | — |
| | `monitoring` | datadog | sentry, crashlytics |
| | `code_explorer` | code-explorer | your-knowledge-tool, github |
| **Voice of Customer** | `feedback` | your-knowledge-tool | — |
| | `research_repository` | your-knowledge-tool | — |
| | `support` | shakebugs | slack |
| | `app_store` | *(not configured)* | — |
| | `session_replay` | *(not configured)* | — |
| **Comms & Creative** | `communication` | slack | — |
| | `image_generation` | nano-banana | — |
| **Situational** | `market_intel` | competebite | websearch, playwright |
| | `deployment` | vibehost | — |

### 4.3 Configuration

```yaml
# connectors.yaml (generated by /setup)
metrics_source:
  primary: your-bi-tool
  fallbacks: [looker, bigquery]
  fallback_mode: ask_user
  hints:
    your-bi-tool: "Use SQL queries against the analytics warehouse"
```

---

## 5. Orbit (Electron App)

### 5.1 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Orbit (Electron)                │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │           Renderer Process               │    │
│  │                                          │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────┐  │    │
│  │  │ Home     │  │ Workspace │  │ Set- │  │    │
│  │  │ (Kanban) │  │ (Term+    │  │ tings│  │    │
│  │  │          │  │  Preview) │  │      │  │    │
│  │  └──────────┘  └───────────┘  └──────┘  │    │
│  │                                          │    │
│  │  ┌──────────┐  ┌───────────┐             │    │
│  │  │ Titlebar │  │ Preflight │             │    │
│  │  │          │  │ (Wizard)  │             │    │
│  │  └──────────┘  └───────────┘             │    │
│  └──────────────────────────────────────────┘    │
│                      │ IPC                        │
│  ┌──────────────────────────────────────────┐    │
│  │           Main Process                   │    │
│  │                                          │    │
│  │  Config     File Watcher    PTY          │    │
│  │  (JSON)     (chokidar)      (node-pty)   │    │
│  │                                          │    │
│  │  Git/GitHub   MCP Discovery   Updater    │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### 5.2 Key Features

- **Pipeline board**: Kanban view with stage detection, scoring, producer name
- **Embedded terminal**: xterm.js + node-pty running Claude Code CLI
- **Live preview**: File watcher triggers preview refresh on artifact changes
- **Preflight wizard**: Checks Claude CLI, GitHub auth, MCP servers on first launch
- **Auto-update**: GitHub Releases polling, notification + one-click install
- **Keyboard shortcuts**: Cmd+T (terminal), Cmd+P (preview), Cmd+K (command)
- **Signal file**: Writes `/tmp/orbit-preview.txt` for cross-process preview refresh

### 5.3 Tech Stack

| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | 39 | Desktop app framework |
| xterm.js | 5.5 | Terminal emulator |
| node-pty | 1.1 | PTY spawn for CLI subprocess |
| chokidar | 4.0 | File system watching |
| electron-builder | 26 | DMG packaging + code signing |
| marked | 15 | Markdown rendering |

---

## 6. Brief System

### 6.1 Page Inventory

The brief is a slide-deck HTML presentation. Pages are added as skills complete:

| Page | Source File | Added By | Content |
|------|-----------|----------|---------|
| Summary | `summary.md` | /1 | Bet thesis, evidence, what we're seeking |
| Outcomes | `outcomes.md` | /1 | JTBD, occasion, outcome map |
| Competitors | `competitors.md` | /2 | Strategic read, differentiators, screenshots |
| Journey | `journey.md` | /2 | Direction, stages, intervention points |
| Variations | `variations.md` | /2 | Chosen direction + alternatives explored |
| KPIs | `metrics.md` | /3 | North star, input metrics, kill criteria |
| Scope | `scope.md` | /3 | Build / Don't Build / Later |
| Feasibility | `feasibility.md` | /4 | Formula scoring, risks, dependencies |
| Decisions | `decisions.md` | All | Open/resolved questions + full Q&A log |
| PRD | `prd.md` | /2,/4 | Vibe-coding handoff prompt |

### 6.2 Rendering Pipeline

```
Skill writes brief source page (e.g., summary.md)
       ↓
brief-builder.md reads all source pages
       ↓
brief-field-mappings.md extracts briefData per field
       ↓
Per-page brief-pages/*.md renders HTML for each slide
       ↓
brief.css provides styling (Linear-inspired, shadow depth)
       ↓
Output: brief.html (self-contained slide deck)
```

### 6.3 Automation

- `scripts/generate-pipeline-board.js` — regenerates `pipeline/index.html` kanban after skill runs
- `scripts/regenerate-briefs-v2.js` — bulk regeneration of all brief.html files
- `scripts/build-brief.js` — standalone brief builder
- `scripts/llm-brief-fallback.js` — LLM fallback for brief data extraction gaps

---

## 7. Design System

### 7.1 Token Source

Design tokens are synced from Figma via `/sync-design`:

```
Figma file ──► /sync-design ──► design/
                                  ├── DESIGN.md (human-readable)
                                  ├── design_tokens.json (raw)
                                  └── .figma-source (URL)
```

### 7.2 CSS Custom Properties

All prototypes use `--pos-*` prefixed CSS custom properties:

```css
/* Colors */
--pos-orange-500: #FF5A00;
--pos-lime-500: #C8E63E;
--pos-neutral-900: #1A1A1A;

/* Typography */
--pos-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--pos-font-size-body: 14px;

/* Spacing */
--pos-space-m: 16px;

/* Radius */
--pos-radius-m: 12px;
```

---

## 8. Eval System

### 8.1 Two-Layer Evaluation

**Layer 1 — Structural Checks (Pass/Fail):**
- Required files exist per stage
- Required fields populated in opportunity.md
- Brief.html renders without errors
- Decision-log.md has entries

**Layer 2 — LLM-as-Judge (1-5 Scoring):**
- Clarity: Is the artifact unambiguous?
- Completeness: Are all expected sections filled?
- Actionability: Could someone act on this?
- Evidence Quality: Are claims supported by data?
- Feasibility: Is the assessment realistic?

### 8.2 System Eval

`/eval system` audits the skills and agents themselves:
- Agent inventory completeness
- Connector binding coverage
- Protocol usage per skill
- Handoff schema coverage

---

## 9. Deployment & Distribution

### 9.1 Orbit Distribution

```
Developer builds DMG:
  npm run release
       ↓
electron-builder creates signed DMG
       ↓
Uploaded to GitHub Releases (tonyfadel23/leaps)
       ↓
Users install via:
  curl -fsSL https://product-os.lths.ai/setup.sh | bash
       ↓
App auto-checks for updates on launch
```

### 9.2 Artifact Publishing

```
PM runs /share {idea-slug}
       ↓
Collects all files from pipeline/{slug}/
       ↓
Deploys to Vibehost
       ↓
Live at: https://vibe-pipelines.lths.ai/{slug}/
       ↓
Injects deployed-url meta tag into local brief
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

- Skill execution: 3-15 minutes per skill depending on data tool latency
- Brief regeneration: < 10 seconds for single idea
- Pipeline board generation: < 5 seconds for 20 ideas
- Orbit startup: < 3 seconds to interactive

### 10.2 Reliability

- Crash recovery via `.state.json` checkpoints (resume from last completed phase)
- Connector fallback chains (primary → fallback → ask_user)
- 24-hour auto-expiry for stale session locks
- Graceful degradation when MCPs unavailable

### 10.3 Data Integrity

- Append-only decision logs (never overwrite PM answers)
- Claims cache with source citations (MCP name + query)
- Cascade invalidation tracks freshness across skills
- Handoff validation prevents running skills with missing inputs

### 10.4 CI/CD

- GitHub Actions CI runs on push and PR to `main`
- Tests: brief builder unit tests, pipeline board generator tests
- Orbit: electron-builder for DMG packaging, GitHub Releases for distribution
- Auto-update: Orbit polls GitHub Releases on launch

### 10.5 Security

- No secrets in pipeline artifacts (MCP auth handled by Claude Code)
- Pipeline artifacts are local-first (only published via explicit `/share`)
- Electron app sandboxed with contextIsolation enabled
- GitHub auth via `gh` CLI (no stored tokens)
