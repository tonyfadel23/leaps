---
name: prd
description: >
  Compile pipeline artifacts into a vibe-coding handoff prompt (prd.md).
  Reads existing learn.md, explore.md, assess.md, prove.md and produces
  a self-contained starter prompt for tools like v0, Cursor, Claude Code,
  or Replit. Use when a PM says "/prd". Also auto-generated during /2, /3, /4
  Synthesize phases.
  Also handles /share (publish the full brief + artifacts) via --publish.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
---

# /prd — Vibe-Coding Handoff Prompt

Compile pipeline artifacts into a self-contained starter prompt that a PM
can paste into any vibe-coding tool (v0, Cursor, Claude Code, Replit) to
start building.

**This is a utility skill.** It reads what exists and compiles — no interview,
no new thinking. The pipeline skills (`/2`, `/3`, `/4`) call this logic
automatically during their Synthesize phases.

---

## Usage

```
/prd water-subscription
```

Run standalone at any point after `/1 learn` has completed.

---

## Process

### 1. Detect Available Artifacts

Read `pipeline/{idea-slug}/` and determine what exists:

| File | Minimum? | What it contributes |
|------|----------|---------------------|
| `learn.md` | **Required** | Who, problem, segment |
| `opportunity.md` | **Required** | What to build, don't build, done looks like |
| `explore.md` | Optional | Direction, journey flow, screen list |
| `assess.md` | Optional | Success signal (one sentence, no numbers) |
| `prove.md` | Optional | Build constraints, recommended direction, key dependencies |

If `learn.md` or `opportunity.md` doesn't exist, stop: "Run `/1` first —
I need at least a grounded problem and opportunity doc to generate a PRD."

### 2. Compile the PRD

Read available artifacts and produce the prompt using this template:

```markdown
# Build: {imperative title from opportunity.md}

## Who this is for

{From learn.md — segment, situation, desired outcome. One paragraph.
Rewrite from JTBD into natural language the builder can understand.
Tag specific numbers inline: `[data: {source}]`, `[pm]`, etc.}

## The problem they're stuck on

{From learn.md JTBD — rewritten as user-language friction. When it
happens, what it costs. Not academic — concrete and specific.
Preserve citation tags on any numbers: frequency, counts, durations.}

## What to build

{From opportunity.md "What to build" — rewritten as user-facing
capabilities.}

- {capability 1}
- {capability 2}
- {capability 3}
- ...

## Don't build (out of scope)

{Lifted from opportunity.md "Don't build" — verbatim.}

- {cut 1}
- {cut 2}
- ...

## Done looks like

{From opportunity.md "Done looks like" — one sentence behavior change.
No metric numbers — describe the observable shift.}

## Notes for the prototype

- {Stack guidance based on what was prototyped}
- {Persist state in localStorage unless build context says otherwise}
- {Design tokens: use your company design system (see design/DESIGN.md)}
```

### 3. Progressive Enrichment

Add sections based on what exists beyond the minimum:

**If `explore.md` exists** — add after "Don't build":

```markdown
## Direction

{Chosen direction name and one-sentence description from explore.md}

### Journey flow

{Stage sequence from the journey map: Trigger → Discovery → First Use →
Core Loop → Recovery. One line per stage describing what happens.}

### Key screens

{List the prototype screens from the chosen variation — name each screen
and its purpose.}
```

**If `assess.md` exists** — update "Done looks like":

Replace with the refined success signal from assess.md. If the metric tree
revealed new capabilities or cuts, update the ship/don't-build sections.

**If `prove.md` exists** — add to "Notes for the prototype":

```markdown
## Build constraints

- {Recommended direction: one sentence}
- {Key dependencies or required integrations from prove.md}
- {Backend requirement if the direction implies multi-user or persistence}
- {Any scope change from feasibility findings}
```

### 4. Appendix — Data & Assumptions Index

After all body sections, add an appendix that traces every data point and
assumption used in the PRD back to its source. This is NOT for the builder
to read line-by-line — it's a reference for anyone who asks "where did
this number come from?"

```markdown
---

## Appendix: Data & Assumptions

### Key data points

| Claim | Value | Tag | Source | Link |
|-------|-------|-----|--------|------|
| {what the number says} | {the number} | {`[data: {source}]`, `[pm]`, `[inferred]`, etc.} | {where it came from} | {[artifact](relative-path) or [{MCP}: {explore}](url)} |

### Assumptions

| Assumption | Status | Tag | Source |
|------------|--------|-----|--------|
| {what we assumed} | {Validated / Unvalidated / Flagged} | {`[pm]`, `[inferred]`, etc.} | {[artifact](relative-path) — context} |

### Source artifacts

| Artifact | Stage | Last updated |
|----------|-------|-------------|
| [learn.md](learn.md) | /1 learn | {date} |
| [opportunity.md](opportunity.md) | /1-/4 | {date} |
| ... | ... | ... |
```

**What goes in Key data points:**
- Every specific number mentioned in the PRD body (customer counts,
  frequencies, prices, durations, market scope)
- Pull from learn.md's Data Sources table, opportunity.md source
  citations, and assess.md baselines
- Preserve citation tags from source: `[data: {source}]`, `[pm]`, `[inferred]`
- If a source has a URL (explore, dashboard), include it
- If PM-provided, write `PM-provided` with the date from learn.md

**What goes in Assumptions:**
- Every assumption from learn.md's Assumptions or Confidence section
- Any `[inferred]` claims from assess.md
- Flagged gaps from prove.md's Assumptions Resolved table
- Status: `Validated` (confirmed by data or PM), `Unvalidated` (still a bet),
  `Flagged` (contradicted or risky)

**What goes in Source artifacts:**
- Every pipeline file that contributed to this PRD
- File modification date (so the reader knows if the PRD is stale)

### 5. Save and Present

Save to `pipeline/{idea-slug}/prd.md`.

Present: "Here's the PRD — paste it into your vibe-coding tool.
It covers who, what, and constraints from everything we've discovered so far."

---

## Rules

- **Compile, don't create.** Every line traces to a pipeline artifact. Don't
  add ideas, features, or constraints that aren't in the source files.
- **Cite inline.** Every specific number in the body carries its citation tag
  (`[data: {source}]`, `[pm]`, `[inferred]`, `[web: source]`, `[scout: source]`).
  Preserve tags from source artifacts. Appendix tables include a Tag column
  and markdown links to source files.
- **Builder language, not PM language.** Rewrite JTBD and opportunity framing
  into language a developer or AI agent can act on directly.
- **No metrics in the prompt.** "Done looks like" is a behavior change, not a
  number. The numbers live in assess.md.
- **Keep the body under 500 words.** The appendix doesn't count toward the
  limit. The body is a starter prompt, not a spec — brevity forces focus.
- **Idempotent.** Running `/prd` twice produces the same output (given the
  same inputs). Later pipeline stages overwrite earlier versions.

---

## Pipeline Structure

```
pipeline/{idea-slug}/
├── prd.md               # This skill's output — vibe-coding handoff
├── opportunity.md       # Source: what to build, don't build, done looks like
├── learn.md            # Source: who, problem, segment
├── explore.md   # Source: direction, journey, screens
├── assess.md            # Source: success signal refinement
└── prove.md           # Source: build constraints, recommended direction
```


---

## Mode: Publish (`--publish`)

_Also triggered by `/share` (merged skill)._


# /share — Publish Pipeline Artifacts

Deploy a pipeline idea to `https://vibe-pipelines.lths.ai/{slug}/` so it's
accessible via a shareable link. Publishes the entire idea folder — brief,
prototypes, markdown artifacts, competitor research, everything.


## Usage

```
/share referral-rewards           # deploy everything in pipeline/referral-rewards/
/share referral-rewards --update  # redeploy after changes
/share referral-rewards --pdf     # export brief as PDF
```


## Pipeline ID (Collision Prevention)

Each idea gets a unique **pipeline ID** on first publish to prevent two ideas
with the same slug from overwriting each other on the shared site.

The pipeline ID format is: `{slug}-{5-char-hex}` (e.g., `water-subscription-a3f7b`).

### How it works

1. On first `/share`, generate a 5-character random hex string
2. Combine with slug: `{slug}-{hex}` → this is the **pipeline ID**
3. Store it in `pipeline/{slug}/.pipeline-id` (plain text, one line)
4. Use the pipeline ID (not the raw slug) as the remote path on Vibehost
5. On subsequent `/share` runs or auto-publish, read `.pipeline-id` and reuse it

If `.pipeline-id` already exists, always reuse it — never regenerate.

### Generation

```javascript
// 5-char hex = 1M+ possible values, effectively collision-free
const id = require('crypto').randomBytes(3).toString('hex').slice(0, 5);
const pipelineId = `${slug}-${id}`;
```


## Process

### Step 1 — Validate

1. Verify `pipeline/{slug}/` exists
2. Verify `pipeline/{slug}/brief.html` exists (minimum requirement)
3. If not: "No brief found for `{slug}`. Run `/1 learn` first."

### Step 2 — Resolve Pipeline ID

1. Check if `pipeline/{slug}/.pipeline-id` exists
2. If yes: read it — this is the deployment path
3. If no: generate a new pipeline ID, write it to `.pipeline-id`

The pipeline ID is used as `{pid}` in all remote paths below.

### Step 3 — Collect Files

Scan `pipeline/{slug}/` recursively. Collect **all** files:

```
pipeline/{slug}/
├── brief.html              → public/{pid}/index.html (also keep as brief.html)
├── opportunity.md           → public/{pid}/opportunity.md
├── learn.md                → public/{pid}/learn.md
├── summary.md               → public/{pid}/summary.md
├── assess.md                → public/{pid}/assess.md
├── prove.md               → public/{pid}/prove.md
├── prd.md                   → public/{pid}/prd.md
├── decision-log.md          → public/{pid}/decision-log.md
├── decisions.md             → public/{pid}/decisions.md
├── research-plan.md         → public/{pid}/research-plan.md
├── feedback.md              → public/{pid}/feedback.md
├── execution-log.md         → public/{pid}/execution-log.md
├── .briefdata.json          → public/{pid}/.briefdata.json
├── outcomes.md              → public/{pid}/outcomes.md
├── journey.md               → public/{pid}/journey.md
├── variations.md            → public/{pid}/variations.md
├── metrics.md               → public/{pid}/metrics.md
├── scope.md                 → public/{pid}/scope.md
├── feasibility.md           → public/{pid}/feasibility.md
├── competitors/             → public/{pid}/competitors/
│   ├── analysis.md
│   └── *.png
├── sketches/                → public/{pid}/sketches/
│   ├── variation-*.html
│   ├── index.html
│   ├── final-showcase.html
│   ├── journey.html
│   └── explore.md
└── ship/                   → public/{pid}/ship/
    ├── prototype.html
    ├── showcase.html
    └── release-checklist.md
```

**Skip**: `.state.json`, `.claims.json`, `.pipeline-id`, `node_modules/`, `.DS_Store`

**brief.html → index.html**: Copy `brief.html` as `index.html` so the URL
`https://vibe-pipelines.lths.ai/{pid}/` loads the brief directly.

### Step 4 — Ensure .briefdata.json Exists

The vibe-pipelines app requires `.briefdata.json` for the upload API.
If it doesn't exist, generate it:

```bash
node scripts/build-brief.js {slug}
```

This writes both `brief.html` and `.briefdata.json`.

### Step 5 — Deploy via Upload Script

Run the deploy script which uploads all files via the vibe-pipelines API:

```bash
node scripts/deploy-to-vibe-pipelines.js {slug}
```

This script:
1. Reads `.pipeline-id` to get the deployment slug
2. Collects all files from `pipeline/{slug}/`
3. Uploads via `POST /api/pipelines/upload` (multipart form)
4. The React app stores files in the database and renders them with
   full navigation (brief viewer, sketch explorer, markdown viewer)

The vibe-pipelines app is a React SPA backed by MySQL — files are stored
in the database, not as static files. The upload API handles slug collision
prevention using the pipeline ID.

### Step 6 — Update Local Brief

Inject a `<meta>` tag into the local `pipeline/{slug}/brief.html`:

```html
<meta name="deployed-url" content="https://vibe-pipelines.lths.ai/{pid}/">
```

Add it inside `<head>` if not already present. This makes the Share button
in the brief copy the live URL instead of the local file path.

### Step 8 — Report

```
Deployed to https://vibe-pipelines.lths.ai/{pid}/

Pipeline ID: {pid} (stored in .pipeline-id)
Files published:
- brief.html (entry point)
- {N} markdown artifacts
- {N} HTML prototypes
- {N} competitor files

Share this link with stakeholders.
```


## Redeployment

`/share {slug} --update` follows the same flow but skips scaffold.
It reads `.pipeline-id` and overwrites existing files in `public/{pid}/`.


## PDF Export (`--pdf`)

When `--pdf` is specified, render the brief as a local PDF file for email
attachments and offline sharing.

### Process

1. Verify `pipeline/{slug}/brief.html` exists
2. Open the brief in Playwright:
   ```
   mcp__plugin_playwright_playwright__browser_navigate(
     url: "file:///path/to/pipeline/{slug}/brief.html"
   )
   ```
3. Wait for the page to render (2 seconds for animations/fonts):
   ```
   mcp__plugin_playwright_playwright__browser_wait_for(time: 2)
   ```
4. Render the PDF via Playwright:
   ```
   mcp__plugin_playwright_playwright__browser_run_code_unsafe(
     code: "async (page) => {
       await page.pdf({
         path: '/path/to/pipeline/{slug}/brief.pdf',
         format: 'A4',
         landscape: true,
         printBackground: true,
         margin: { top: '0', right: '0', bottom: '0', left: '0' }
       });
       return { success: true };
     }"
   )
   ```
5. Close the browser:
   ```
   mcp__plugin_playwright_playwright__browser_close()
   ```
6. Report:
   ```
   PDF exported: pipeline/{slug}/brief.pdf

   Open with: open pipeline/{slug}/brief.pdf
   ```

### Landscape vs Portrait

The brief is designed as a slide deck — always use **landscape** orientation
with A4 format and zero margins for edge-to-edge rendering.

### Print Styles

The brief.css already includes `@media print` styles that:
- Hide navigation controls
- Force each slide to a new page
- Remove interactive elements

These activate automatically when rendering to PDF.


## Principles

1. **Everything ships.** The full artifact set — not just the brief. Stakeholders
   can drill into any markdown file, prototype, or decision log.
2. **brief.html is the entry point.** Copied as `index.html` so the URL works.
3. **Non-destructive.** Deploying one idea doesn't affect other ideas already
   on the site. Each idea lives in its own subdirectory.
4. **Local brief stays aware.** The `deployed-url` meta tag lets the Share
   button in the local brief copy the live URL.


## Related Skills

- `/share {slug} --pdf` — Export brief as PDF for email attachments
- `/pipeline` — See all ideas at a glance
- `/eval` — Quality-check before sharing
- `/prd` — Compile handoff prompt (included in the deploy)
