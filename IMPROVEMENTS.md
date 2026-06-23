# Product OS — Improvements, Fixes & Feature Proposals

> Generated from codebase audit, June 2026
> Organized by: Bugs/Fixes → Architecture Improvements → New Features

---

## Completed (v1.7)

15 of 19 items resolved in the v1.7 release cycle:

- **F1** Script duplication — consolidated `regenerate-briefs.js`
- **F2** CLAUDE.md tree inaccuracies — fixed
- **F3** Orphaned scripts — audited and cleaned up
- **F4** Architecture flow link — resolved
- **F5** Concurrency guard — accepted as prompt-level enforcement, documented limitation
- **A1** Skill versioning — version headers added to all SKILL.md files
- **A2** Partial phase cleanup — idempotent phases for prototype/synthesis, rollback for interview phases
- **A3** Agent testing framework — eval framework with unit evals, regression evals, protocol contract tests
- **A4** Connector health dashboard — `/setup --health` aggregates MCP failure rates
- **A5** Brief rendering as script — consolidated into deterministic `build-brief.js` with LLM fallback
- **A6** Archive lifecycle — `/archive` and `/unarchive` skill (moves ideas to/from `archive/`)
- **N1** `/replay` — decision history walkthrough for onboarding and stakeholder context
- **N6** `/import` — import existing PRDs/one-pagers into pipeline + Orbit file drop support
- **N8** `/cost` — pipeline token cost and execution report
- **N9** PDF export — `/share --pdf` renders brief.html to PDF via Playwright

---

## Bugs & Fixes

### F1. Brief regeneration script duplication
**Problem:** Two versions exist: `regenerate-briefs.js` and `regenerate-briefs-v2.js`. Unclear which is canonical.
**Impact:** Maintenance confusion, potential for stale script to be invoked.
**Fix:** Delete `regenerate-briefs.js` (v1). Rename v2 to `regenerate-briefs.js`. Update any references (hooks, CLAUDE.md).

### F2. CLAUDE.md tree inaccuracies *(fixed)*
**Problem:** Shared agents (`brief-builder.md`, `data-analyst.md`, `doc-analyzer.md`) listed under `.claude/skills/_shared/` but actually live in `.claude/agents/`. Cascade described as "/1-/3" but covers /1-/5. Missing `design-handoff.md` protocol. Missing `landscape/`, `pipeline/`, `share/` skill directories.
**Impact:** Claude reads CLAUDE.md on every conversation — inaccuracies cause incorrect tool routing.
**Fix:** Applied in this PR.

### F3. Orphaned script files
**Problem:** Multiple fix scripts in `scripts/` suggest past issues that may be resolved:
- `fix-prototype-shells.js` — phone shell fixes
- `fix-shell-dimensions.js` — dimension fixes
- `fix-iframe-scroll.js` — scroll fixes
**Impact:** Clutter, unclear if these are one-time migrations or ongoing maintenance.
**Fix:** Audit each. If the root cause was fixed in the prototype builder agent, delete the scripts. If they're still needed as maintenance tools, document their purpose.

### F4. Pipeline board generator missing `architecture-flow.html`
**Problem:** `pipeline/architecture-flow.html` exists as a static file, but the board generator (`generate-pipeline-board.js`) doesn't know about it. It's not linked from `index.html`.
**Fix:** Either link it from the kanban board or document it as a standalone artifact.

### F5. Concurrency guard enforcement gap
**Problem:** CLAUDE.md documents a comprehensive concurrency guard (force/wait/auto-clear/24h expiry), but this is purely prompt-based — there's no code enforcement. If two Claude sessions start simultaneously on the same idea, both will read `.state.json`, both may decide it's stale, and both may proceed.
**Impact:** Low probability (requires two terminals), but data corruption if it happens.
**Fix:** Accept as prompt-level enforcement for now. Document the limitation. If it becomes a problem, add a filesystem-level lock (e.g., `flock` wrapper in a hook).

---

## Architecture Improvements

### A1. Skill versioning
**Problem:** Skills have no version headers. When a skill's logic changes (e.g., ground interviewer adds a new question), there's no way to know which version produced an existing artifact. Old ideas can't be compared to new ones.
**Impact:** Retroactive changes silently affect all ideas. No way to track "which version of /2 sketch produced this prototype."
**Proposal:** Add a `version` field to each SKILL.md frontmatter:
```yaml
version: 2.1
changelog:
  - 2.1: Added emotion curve to journey mapper
  - 2.0: Added comparative critique agent
  - 1.0: Initial release
```
Write the skill version to `.state.json` and `execution-log.md`. On resume, warn if skill version has changed since the checkpoint.

### A2. Partial phase cleanup
**Problem:** If a phase fails midway (e.g., prototype builder creates `variation-a.html` but crashes before `variation-b.html`), there's no automatic cleanup. The next resume picks up partial artifacts and may produce inconsistent output.
**Impact:** Rare, but confusing when it happens — leads to ideas with 1 of 3 expected prototypes.
**Proposal:** Two options:
1. **Idempotent phases** — each phase checks what already exists and only creates what's missing (preferred for prototype phases)
2. **Phase rollback** — on crash, delete all artifacts written in the current phase and retry from scratch (safer but loses partial work)

Recommend option 1 for prototype/synthesis phases, option 2 for interview phases (where partial Q&A is worse than restarting).

### A3. Agent testing framework
**Problem:** No tests exist for agents or protocols. Script tests exist (`brief-builder.test.js`) but agent behavior is only tested manually by running skills end-to-end.
**Impact:** Agent regressions are caught late (only when PMs notice quality drops). Protocol changes can break downstream skills silently.
**Proposal:** Create an agent eval framework:
- **Unit evals** — feed an agent a known input (e.g., ground.md with specific JTBD), check that output matches expected structure
- **Regression evals** — compare agent output before/after a change using `/eval` scoring
- **Protocol contract tests** — verify that handoff schemas match actual file structures

### A4. Connector health dashboard
**Problem:** MCP failures are logged to `execution-log.md` per idea, but there's no aggregate view. A PM can't see "Looker has failed 3 times this week."
**Proposal:** Add a `/setup --health` command that:
1. Scans all `execution-log.md` files for MCP failure entries
2. Aggregates by connector role and MCP name
3. Shows success/failure rates, last success timestamp
4. Recommends fallback upgrades or reconfiguration

### A5. Brief rendering as a script (not agent)
**Problem:** Brief rendering currently delegates to the `brief-builder.md` agent, which reads markdown source pages and renders HTML. This is slow (agent overhead) and inconsistent (LLM-dependent rendering).
**Impact:** Brief regeneration takes 30-60 seconds per idea. Bulk regeneration of 20+ ideas is slow.
**Proposal:** Move brief rendering to a deterministic Node.js script:
- Read markdown source pages (summary.md, outcomes.md, etc.)
- Apply field extraction rules from `brief-field-mappings.md`
- Render HTML using templates from `brief-pages/`
- Apply `brief.css`

The `build-brief.js` and `llm-brief-fallback.js` scripts suggest this migration is already partially underway. Consolidate into a single `build-brief.js` that handles all cases, with LLM fallback only for complex field extraction.

### A6. Archive lifecycle
**Problem:** The `archive/` directory exists with 20+ archived ideas, but there's no skill or protocol for archiving. Ideas are manually moved.
**Proposal:** Add `/archive {slug}` command that:
1. Moves `pipeline/{slug}/` to `archive/{slug}/`
2. Updates `pipeline/index.html`
3. Records archival reason in the idea's `decision-log.md`
4. Supports `/unarchive {slug}` to restore

---

## New Features

### N1. `/replay` — Decision replay for onboarding
**Description:** New utility skill that replays the decision log of a completed idea as a walkthrough. Useful for onboarding new PMs or explaining a bet to stakeholders.
**How it works:**
1. Read `decision-log.md` for {slug}
2. Walk through Q&A entries chronologically
3. Highlight key decision points (JTBD selection, direction choice, kill criteria)
4. Show how evidence influenced each answer
5. Output: a standalone HTML walkthrough

### N2. `/diff` — Compare idea versions
**Description:** When a skill is re-run, show what changed compared to the previous run.
**How it works:**
1. Before overwriting `ground.md`, save previous version as `.ground.md.bak`
2. After writing new version, diff the two
3. Highlight: changed JTBD, new evidence, shifted sizing, altered outcomes
4. PM approves the diff before proceeding

### N3. Multi-PM collaboration
**Description:** Currently, Product OS is single-user. Two PMs can't work on the same pipeline without conflicts.
**Proposal — lightweight first version:**
1. Add `producer` field to `opportunity.md` (who owns this idea)
2. `/pipeline` shows producer column
3. Concurrency guard checks producer before allowing skill runs
4. No real-time sync — just ownership tracking + conflict prevention

### N4. `/status {slug}` — Quick status check
**Description:** One-line status check without the full `/pipeline` output.
**Output example:**
```
water-subscription: Explored (4/5) · Feasibility: Green · Last run: 2h ago
  Next step: /5 build · 2 open decisions · 1 stale artifact (sketch.md)
```

### N5. Pipeline webhooks / Slack integration
**Description:** Post to Slack when:
- An idea completes a stage (`/1` → `/2` transition)
- Kill criteria is triggered
- `/share` publishes a brief
- `/grill-me` surfaces a critical gap
**Implementation:** Hook into PostToolUse or add to the feedback phase of each skill. Use the existing `communication` connector role (already mapped to Slack).

### N6. `/import` — Import from external PM tools
**Description:** Import existing PRDs, one-pagers, or strategy docs directly into the pipeline as a partially-completed idea. Different from `/landscape` (which creates a landscape from many docs) — this is one doc → one idea.
**How it works:**
1. PM provides a doc (file, URL, or paste)
2. Doc Analyzer extracts JTBD, outcomes, metrics, evidence
3. System determines which skill stage the doc covers
4. Scaffolds the idea at that stage, pre-filling what it can
5. PM reviews and fills gaps via conversation

### N7. Orbit: command palette
**Description:** Cmd+K already exists but could be expanded into a full command palette:
- Search ideas by name
- Jump to any skill: `/3 water-subscription`
- Quick actions: archive, share, compare
- Recent files: last 5 briefs viewed
- Settings shortcuts

### N8. `/cost` — Pipeline token cost report
**Description:** The `pipeline-cost.md` protocol tracks token usage per skill run. Surface this as a user-facing report:
```
Pipeline Token Usage (last 30 days):
  /1 ground:   avg 45K tokens/run · 12 runs · $2.40 total
  /2 sketch:   avg 85K tokens/run ·  8 runs · $3.60 total
  /grill-me:   avg 30K tokens/run ·  5 runs · $0.75 total
  Total: $12.50 across 42 skill runs
```

### N9. Brief export to PDF / Google Slides
**Description:** The brief.html is the shareable artifact, but stakeholders often want:
- PDF for email attachments
- Google Slides for presentation decks
**Proposal:**
1. `/share --pdf {slug}` — uses Playwright to render brief.html to PDF
2. `/share --slides {slug}` — converts brief pages to Google Slides via API (using google-workspace MCP)

### N10. `/retrospective {slug}` — Post-launch learner
**Description:** After a bet ships and gets data, run a structured retrospective:
1. Pull post-launch metrics from data sources
2. Compare against the metric tree and targets from `/3 define`
3. Check kill criteria — any triggered?
4. Compare actual vs. predicted sizing from `/1 ground`
5. Document: what did we learn? What would we do differently?
6. Output: `retrospective.md` + brief page update

This closes the loop — Product OS currently covers discovery-to-handoff, but doesn't learn from outcomes.

---

## Priority Ranking

| # | Item | Impact | Effort | Status |
|---|------|--------|--------|--------|
| F1 | Script duplication | Low | 30 min | Done |
| F2 | CLAUDE.md tree inaccuracies | Low | 1 hr | Done |
| F3 | Orphaned scripts | Low | 1 hr | Done |
| F4 | Architecture flow link | Low | 15 min | Done |
| F5 | Concurrency guard | Low | N/A | Done (accepted as-is) |
| A1 | Skill versioning | Medium | 2 hr | Done |
| A2 | Partial phase cleanup | Low | 4 hr | Done |
| A3 | Agent testing | High | 8 hr | Done |
| A4 | Connector health | Medium | 3 hr | Done |
| A5 | Brief as script | High | 4 hr | Done |
| A6 | Archive lifecycle | Medium | 2 hr | Done |
| N1 | /replay | Medium | 4 hr | Done |
| N6 | /import + Orbit file drop | Medium | 6 hr | Done |
| N8 | /cost report | Low | 2 hr | Done |
| N9 | PDF export | Medium | 4 hr | Done |
| **N10** | **/retrospective** | **High** | **8 hr** | **Pending — highest priority** |
| N4 | /status command | Medium | 1 hr | Pending |
| N5 | Slack webhooks | Medium | 3 hr | Pending |
| N2 | /diff | Medium | 4 hr | Pending — cascade already warns |
| N3 | Multi-PM collab | Medium | 8 hr | Pending — single user for now |
| N7 | Cmd+K palette | Low | 4 hr | Pending — UX polish |
