---
name: setup
description: >
  Configure LEAPs connectors — scan available MCPs, map them to semantic
  roles, and write connectors.yaml. Use on first run, when adding new tools,
  or when troubleshooting connector issues.
  Also handles /sync-design (pull Figma design tokens) via --sync-design.
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
---

# /setup — Connector Setup

Scan your environment, detect available MCP servers, and wire them to the
semantic roles that pipeline skills depend on. This is the first thing to
run in a new LEAPs installation.

---

## Role & context

Also scaffold your company + role context: copy `_shared/reference/business-context.example.md` to `business-context.md` and help the PM fill in their company, markets, OKRs, role, scope, and decision lens. The pipeline skills and live discovery read it.

## Usage

```
/setup                    # Full setup — scan, map, write connectors.yaml
/setup --check            # Check-only — show status, don't write anything
/setup --preset your company   # Apply a preset and verify connections
/setup --role metrics_source  # Configure a single role
/setup --health           # Show connector health report from execution logs
/setup --auth             # Authenticate all unauthenticated MCPs one by one
/setup --auth --required  # Only authenticate required roles
```

---

## Process

### Phase 1 — Detect Environment

1. **Check for existing connectors.yaml** at the pipeline root
   - If exists: read it, show current bindings
   - If not: note "No connectors.yaml found — will create one"

2. **Check for presets** in `presets/` directory
   - List available presets (currently: `generic.yaml`)
   - If `--preset` flag was given, load that preset

3. **Scan available MCP tools** — list all tools available in the current
   Claude Code session. Group them by prefix to identify connected servers.

### Phase 2 — Map Roles

For each of the 17 standard roles, determine what's available:

**Core data:**

| Role | What to scan for | Common MCPs |
|------|-----------------|-------------|
| `metrics_source` | your-bi-tool, looker, bigquery, tableau, metabase | BI/analytics tools |
| `knowledge_base` | your-knowledge-tool, notion, confluence, coda | Internal wikis/docs |
| `product_analytics` | amplitude, mixpanel, posthog, heap | Behavioral event tools |

**Build context:**

| Role | What to scan for | Common MCPs |
|------|-----------------|-------------|
| `ticketing` | atlassian, jira, linear, shortcut, asana | Issue trackers |
| `design_system` | figma, plugin_figma | Design tools |
| `experimentation` | eppo, launchdarkly, statsig, optimizely | A/B test platforms |
| `monitoring` | sentry, datadog, pagerduty, newrelic | Error/reliability tools |
| `code_explorer` | github, gitlab, sourcegraph, your-knowledge-tool | Codebase exploration tools |

**Voice of customer:**

| Role | What to scan for | Common MCPs |
|------|-----------------|-------------|
| `feedback` | productboard, canny | Feature request boards |
| `research_repository` | dovetail, enjoyhq | Research repositories |
| `support` | zendesk, intercom, freshdesk | Support ticket systems |
| `app_store` | appfollow, appbot | App review trackers |
| `session_replay` | fullstory, hotjar, logrocket | Session replay tools |

**Communication & creative:**

| Role | What to scan for | Common MCPs |
|------|-----------------|-------------|
| `communication` | slack, teams | Chat platforms |
| `image_generation` | nano-banana, dall-e | Image generators |

**Situational:**

| Role | What to scan for | Common MCPs |
|------|-----------------|-------------|
| `market_intel` | similarweb, klue, crayon | Competitor intelligence |
| `deployment` | vibehost | App deployment/hosting |

For each role:
1. Check if any matching MCP tools exist
2. If multiple match (e.g., both Looker and BigQuery for `metrics_source`):
   - Set the most capable as `primary`
   - Set others as `fallbacks`
3. If none match: mark as unconfigured

### Phase 3 — Present Status

Show the PM a clear status table:

```
LEAPs Connector Status

CORE DATA
  metrics_source       your-bi-tool         ✓ connected
    ↳ fallbacks        looker           ✓ connected
                       bigquery         ✓ connected
                       tableau          ✗ not found
  knowledge_base       your-knowledge-tool       ✓ connected
  product_analytics    —                ✗ not configured

BUILD CONTEXT
  ticketing            atlassian        ✓ connected
  design_system        figma            ✓ connected
  experimentation      eppo             ⚠ needs auth
  monitoring           —                ✗ not configured
  code_explorer        —                ✗ not configured

VOICE OF CUSTOMER
  feedback             —                ✗ not configured
  research_repository  —                ✗ not configured
  support              —                ✗ not configured
  app_store            —                ✗ not configured
  session_replay       —                ✗ not configured

COMMUNICATION & CREATIVE
  communication        slack            ⚠ needs auth
  image_generation     nano-banana      ✓ connected

SITUATIONAL
  market_intel         —                ✗ not configured
  deployment           vibehost         ✓ connected

8/17 roles configured · 2 need auth
```

For servers that need authentication (only expose an `authenticate` tool):
- Show the auth command: `claude mcp add {name} {url} --transport http`
- Or for OAuth-based servers: note "Run the authenticate tool to start OAuth"

### Phase 3b — Validate Role Names

If `connectors.yaml` exists, check that every role key under `connectors:`
matches the canonical 17-role list:

```
metrics_source, knowledge_base, product_analytics,
ticketing, design_system, experimentation, monitoring, code_explorer,
feedback, research_repository, support, app_store, session_replay,
communication, image_generation, market_intel, deployment
```

For any unrecognized role name:
- Warn: "Unknown role `metric_source` in connectors.yaml — did you mean `metrics_source`?"
- Suggest the closest match (Levenshtein or prefix match)
- Do not auto-fix — just flag it

This catches typos like `metric_source`, `experiment`, `knowledge`, etc. that
would silently resolve as unconfigured.

### Phase 4 — Write connectors.yaml

**If `--check` flag:** Skip this phase, just show the status.

**Otherwise:**

1. If a preset was loaded (`--preset`): use it as the base, update with
   detected availability
2. If no preset and no existing file: generate from auto-detection
3. If existing file: ask "Update connectors.yaml with detected changes, or keep current config?"

Write the file with:
- Detected MCP names and URLs (from tool metadata where available)
- `required: true` for `metrics_source` (the only required role)
- `fallback_mode: ask_user` as default for required roles
- `fallback_mode: skip` as default for optional roles
- Hints from the preset if available, or generic hints

Show the PM: "Wrote connectors.yaml. Your pipeline skills will use these
connectors. Run `/setup --check` anytime to verify."

### Phase 5 — Suggest Next Steps

Based on what's configured:

- **All roles bound**: "You're fully set up. Run `/1` to start grinding an idea."
- **Missing required roles**: "metrics_source isn't connected. Your pipeline
  will work but you'll need to provide data manually. To connect: [instructions]"
- **Missing optional roles**: "Some optional connectors are missing. Skills
  will skip those enrichment steps. To add them later: run `/setup --role {name}`"
- **Auth needed**: "2 servers need authentication. Run these commands: [list]"

---

## Single Role Configuration (`--role`)

When `--role metrics_source` is specified:

1. Show current binding for that role
2. List available MCPs that could fill it
3. Ask: "Which MCP should be the primary for metrics_source?"
4. If multiple options: "Set fallback order?"
5. Ask for a hint (optional): "Any tips for using this tool? (e.g., which tables to query)"
6. Update just that role in connectors.yaml

---

## Health Check (`--health`)

When `--health` is specified, run the connector health report instead of
the normal setup flow:

1. Run `node scripts/connector-health.js`
2. Display the output to the PM
3. If any role has < 90% success rate, recommend adding fallbacks or checking auth
4. If any role has never been used, note it (may not be needed for current workflows)

The health report parses `pipeline/*/execution-log.md` files to aggregate
MCP call success/failure data across all pipeline runs. It cross-references
`connectors.yaml` to identify roles that are configured but never called.

---

## Batch Authentication (`--auth`)

Walk through all unauthenticated MCPs one at a time.

### Process

1. For each MCP server in the session, check if its only tool is `authenticate`
2. Cross-reference with `connectors.yaml` to get the role name
3. Present a numbered list:
   ```
   MCPs needing authentication:
   1. atlassian (ticketing, knowledge_base)
   2. eppo (experimentation)
   3. slack (communication, support)
   4. bigquery (metrics_source fallback)

   Authenticating 1 of 4...
   ```
4. For each unauthenticated MCP, call its `mcp__{name}__authenticate` tool
5. The tool returns an OAuth URL — show it to the PM
6. Wait for PM to complete auth in browser (the tool will return success)
7. Show: `✓ atlassian authenticated. Moving to 2 of 4...`
8. If PM says "skip", move to next: `→ Skipped atlassian. Moving to 2 of 4...`
9. After all MCPs processed, show summary:
   ```
   Authentication complete:
   ✓ atlassian — authenticated
   ✓ eppo — authenticated
   → slack — skipped
   ✓ bigquery — authenticated

   3/4 authenticated, 1 skipped.
   ```
10. Delete `.auth-cache.json` so next skill gets fresh results

If `--required` is also specified, only walk through MCPs that serve
`required: true` roles in `connectors.yaml`.

---


## Principles

1. **Auto-detect first, ask second.** Scan tools before asking the PM to configure.
2. **Presets over manual config.** If a preset matches the environment, use it.
3. **Never block.** Missing connectors are informational, not errors. The pipeline
   works without them — just with more manual input.
4. **Show, don't hide.** The PM should always know what's connected and what's not.
5. **Idempotent.** Running `/setup` twice should produce the same result.


---

## Mode: Design-token sync (`--sync-design`)

_Also triggered by `/sync-design` (merged skill)._


# /sync-design

Pull current design tokens from Figma into `design/DESIGN.md` and
`design/design_tokens.json`. Run this every few weeks to keep
prototype tokens current.


## Usage

```
/sync-design
```

No arguments. The skill remembers which Figma file to pull from.


## Process

### Step 1 — Resolve Design System Connector

Resolve the `design_system` role via the connector-resolver protocol
(`_shared/protocols/connector-resolver.md`).

1. Read `connectors.yaml` and resolve `design_system`
2. Use the returned MCP and its `hint` for tool selection
3. If the resolved MCP requires authentication (only exposes an `authenticate`
   tool), trigger the auth flow and wait for the user to complete it

If the `design_system` role is unavailable:

> "No design system connector configured. Run `/setup --role design_system`
> to connect Figma or another design tool."

### Step 2 — Get the Figma File URL

Check if `design/.figma-source` exists:
- **If yes**: read the URL from it
- **If no**: ask the user for the Figma file URL, then save it to
  `design/.figma-source` for next time

### Step 3 — Fetch Design Tokens

Use the available Figma tools to read from the file:
- **Colors**: all color styles (name, hex value, role)
- **Typography**: font families, sizes, weights, line heights
- **Spacing**: spacing scale values
- **Border radius**: radius scale values
- **Components**: key component patterns (buttons, cards, inputs, tags, etc.)

Extract structured data. If a tool returns raw Figma node data, parse it
into the token format used by `design_tokens.json`.

### Step 4 — Read Current DESIGN.md

Read `design/DESIGN.md`. Locate the section boundary markers:

```
<!-- AUTO-SYNCED FROM FIGMA — do not edit between these markers -->
...auto-synced content...
<!-- END AUTO-SYNCED -->
```

Everything **between** these markers will be regenerated.
Everything **outside** (header, manual rules, App Screen Patterns, Don'ts)
is preserved untouched.

### Step 5 — Regenerate Auto-Synced Sections

Rebuild these sections from the Figma data, using the same markdown format:

1. **Brand Colors** — table with Token, Hex, Role, When to use
2. **Typography** — table with Role, Size, Weight, Use
3. **Spacing** — table with Token, Value, Use
4. **Border Radius** — table with Token, Value, Use
5. **Component Patterns** — CSS code blocks for each component

Keep the existing table structure and CSS format. Map Figma style names to
the semantic token names already used (e.g., "Orange" for `#2563EB`,
"on-surface" for `#262626`). If new tokens appear, add them. If tokens are
removed from Figma, remove them and flag it in the summary.

### Step 6 — Update design_tokens.json

Write the raw token data from Figma to `design/design_tokens.json`
in the existing format (Design Token Community Group spec with `$type`
and `$value` fields).

### Step 7 — Write DESIGN.md

Replace the content between the `<!-- AUTO-SYNCED -->` markers with the
regenerated sections. Leave everything else untouched.

### Step 8 — Show Diff Summary

Present a summary to the user:

```
### Sync Complete

**Updated:** Brand Colors (2 changed), Typography (no changes)
**Added:** 1 new color token (info-light: #E3F2FD)
**Removed:** 1 color token (color-6) — verify this is intentional
**Unchanged:** Spacing, Border Radius, Component Patterns

Manual sections preserved: Color Rules, Typography Rules,
App Screen Patterns, Don'ts
```


## Graceful Degradation

| Scenario | What happens |
|----------|-------------|
| `design_system` connector unavailable | Stop with `/setup --role design_system` instructions |
| No Figma file URL saved | Ask the user |
| Figma file not accessible | Report the error, suggest checking the URL or token |
| Partial extraction (some tokens missing) | Update what's available, flag what's missing |
| No `<!-- AUTO-SYNCED -->` markers in DESIGN.md | Add them around the standard sections, then proceed |


## What Gets Synced vs. What's Manual

| Section | Source | Synced? |
|---------|--------|---------|
| Brand Colors (table) | Figma | Yes |
| Color Rules (prose) | Manual | No — preserved |
| Typography (table) | Figma | Yes |
| Typography Rules (prose) | Manual | No — preserved |
| Spacing | Figma | Yes |
| Border Radius | Figma | Yes |
| Component Patterns (CSS) | Figma | Yes |
| Prototype Page Structure | Manual | No — preserved |
| App Screen Patterns | Manual | No — preserved |
| Don'ts | Manual | No — preserved |


## Principles

1. **Preserve manual sections.** The marker-based approach means manual
   content is never touched. If markers are missing, add them conservatively.
2. **Same format, updated data.** Don't change the markdown structure —
   just refresh the values inside existing tables and CSS blocks.
3. **Flag changes, don't hide them.** The diff summary should make it
   obvious what changed so the user can spot unexpected token removals.
4. **Don't invent tokens.** Only write what comes from Figma. If a token
   exists in DESIGN.md but not in Figma, remove it and flag it.
5. **One file, one read.** The Figma file URL is saved so the user never
   has to provide it twice.
