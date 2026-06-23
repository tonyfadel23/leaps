---
name: import
description: >
  Import an existing document (PRD, one-pager, strategy doc, RFC) into the
  pipeline as a partially-completed idea. Use when a PM says "/import",
  "import this doc", "bring this into the pipeline", "I have a PRD",
  or drops a file into the Orbit terminal.
version: "1.0"
changelog:
  - "1.0: Initial release"
---

# /import — Document Import

Import an existing product document into the pipeline. Analyzes the document,
extracts JTBD elements, metrics, evidence, and creates a pipeline idea at the
appropriate stage.

---

## Usage

```
/import                                    # paste or describe the document
/import water-subscription-prd.md          # import a local file
/import https://docs.google.com/...        # import from URL (via Google Drive MCP)
```

When a file is dropped onto the Orbit terminal, this skill is automatically invoked.

---

## Input Types

| Input | How to Handle |
|-------|---------------|
| Local file path | Read with Read tool |
| Google Docs URL | Use google-workspace MCP (read_file_content) |
| Confluence URL | Use atlassian MCP |
| Pasted text | Accept inline |
| Dropped file (via Orbit) | File path passed as argument |

---

## Process

### Step 1 — Ingest

1. Detect input type (file, URL, paste)
2. Read the document content
3. Delegate to Doc Analyzer agent (`.claude/agents/doc-analyzer.md`) to extract:
   - Document type (PRD, one-pager, strategy doc, RFC, research report)
   - Title / bet name
   - JTBD elements: job, occasion, outcomes (if present)
   - Metrics: north star, KRs, baselines, targets (if present)
   - Evidence: sizing, data claims, user research (if present)
   - Scope: what to build, what not to build (if present)
   - Risks and dependencies (if present)
   - Competitors mentioned (if present)

### Step 2 — Assess Stage

Determine which pipeline stage the document covers based on extracted content:

| Has | Covers Stage |
|-----|-------------|
| JTBD + occasion + outcomes + sizing | /learn |
| + prototypes or journey map or variations | /explore |
| + metric tree + kill criteria + baselines | /assess |
| + feasibility + risks + dependencies | /prove |
| + release checklist or build plan | /ship |

Show the PM:
```
This document covers through /assess:
  ✓ JTBD: "When [occasion], I want to [job], so I can [outcome]"
  ✓ Sizing: ~2.3M addressable customers
  ✓ Metric tree: 3 KRs identified
  ✓ Kill criteria: 2 found
  ✗ Feasibility: not covered
  ✗ Implementation directions: not covered

Slug suggestion: {slugified-title}
Import as "{slug}" at stage /assess? (or adjust)
```

### Step 3 — Scaffold

1. Create `pipeline/{slug}/` directory
2. Write artifacts for each covered stage:
   - `learn.md` — from JTBD elements + sizing
   - `opportunity.md` — from extracted structured data
   - `decision-log.md` — with import note: "Imported from {source} on {date}"
   - `explore.md` — if variations/journey found
   - `assess.md` — if metrics/kill criteria found
   - `prove.md` — if feasibility/risks found
3. Write brief source pages (summary.md, outcomes.md, etc.) from extracted data
4. Generate `brief.html` using the brief builder

### Step 4 — Gap Analysis

Show what's missing vs. a fully-completed stage:
```
Imported to /assess. Gaps found:

/learn gaps:
  - No research plan generated
  - Sizing confidence not assessed

/explore Explore gaps:
  - No HTML prototypes (run /explore to generate)
  - No competitor analysis

/assess Assess gaps:
  - Kill criteria found but no instrumentation assessment
  - Baselines not validated against data sources

Recommended next step:
  /grill-me {slug}     — stress-test the imported content
  /prove {slug}            — continue to feasibility (fill gaps later)
  /explore {slug} --phase prototype  — generate prototypes from the JTBD
```

### Step 5 — Report

```
Imported "{title}" as pipeline/{slug}/

Stage: /assess
Artifacts created: learn.md, opportunity.md, assess.md, brief.html, + 5 brief sources
Gaps: 4 (see above)
Decision log started with import metadata

Next: /grill-me {slug} or /prove {slug}
```

---

## Principles

1. **Extract, don't fabricate.** Only create artifacts from content actually in the document. Mark gaps explicitly.
2. **PM confirms the slug and stage.** Don't auto-create without approval.
3. **Gap transparency.** Show exactly what's missing so the PM can decide whether to fill gaps or proceed.
4. **Source attribution.** The decision log records what was imported and from where.
5. **Reuse existing agents.** Doc Analyzer handles extraction. Brief Builder handles rendering.

---

## Related Skills

- `/learn` — Start from scratch instead of importing
- `/landscape` — Import many docs as a strategic landscape (batch import)
- `/grill-me` — Stress-test imported content
