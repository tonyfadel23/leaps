# Auth Preflight Protocol

Checks MCP authentication status before pipeline skills start. Catches
expired OAuth tokens early — before a data pull fails mid-skill.

---

## When to Use

Call at the start of pipeline skills /learn through /ship, /grill-me, /landscape,
and /compare — any skill that uses MCP connectors. NOT needed for /pipeline,
/cost, /archive, /replay, /prd (no MCP calls).

Call BEFORE the connector-resolver protocol.

## Process

### Step 1 — Detect Auth Status

For each MCP server configured in the session, check which tools are available.
Use this heuristic:

- If the ONLY tool for an MCP prefix is `mcp__{name}__authenticate`, it needs auth
- If the MCP has real tools (not just `authenticate`), it's authenticated
- If the MCP has no tools at all, it's not configured (skip)

Examples:
- `mcp__atlassian__authenticate` is the only atlassian tool → needs auth
- `mcp__contexthub__contexthub_query`, `mcp__contexthub__contexthub_list_spaces` exist → authenticated
- `mcp__claude_ai_Slack__slack_send_message` exists → authenticated (note: Claude.ai Slack uses `claude_ai_Slack` prefix)

### Step 2 — Read connectors.yaml

Read `connectors.yaml` from the project root. For each role, check if the
primary MCP and fallback MCPs are authenticated (from Step 1).

### Step 3 — Classify

For each connector role used by the current skill (from the skill's
`connectors:` frontmatter), classify:

- **BLOCKED**: Role is `required: true` AND primary + all fallbacks need auth.
  The skill cannot proceed without manual data.
- **DEGRADED**: Role is optional OR has at least one authenticated fallback.
  The skill can proceed but with reduced capability.
- **OK**: Primary MCP is authenticated. No action needed.

### Step 4 — Present to PM

**If any BLOCKED roles:**
```
These data tools need authentication before starting:

{role}: {mcp_name} — needs OAuth login
  → Call the authenticate tool, then click the URL to log in
  → Or run /setup --auth to authenticate all at once

Authenticate now, or type "skip" to proceed with manual data entry.
```

Wait for PM to authenticate or skip. If skip, proceed with the role's
`fallback_mode` behavior (ask_user / paste).

**If only DEGRADED roles:**
```
Heads up: {N} optional tools need re-authentication.
- {role}: {mcp_name} — will {fallback behavior description}

Proceeding anyway. Run /setup --auth to fix these later.
```

Proceed normally. Log to `execution-log.md`.

**If all OK:**
Proceed silently. No message.

### Step 5 — Cache Results

Write results to `.auth-cache.json` at the project root:

```json
{
  "checked_at": "2026-06-19T15:00:00Z",
  "results": {
    "datamaxx": "ok",
    "contexthub": "ok",
    "atlassian": "auth_required",
    "slack": "ok",
    "eppo": "auth_required"
  }
}
```

On next skill run, if `.auth-cache.json` exists and `checked_at` is less
than 20 minutes ago, use cached results instead of re-probing.

## Rules

1. **Non-blocking for optional roles.** Never prevent a PM from working because Slack needs re-auth.
2. **Cache aggressively.** 20-minute TTL prevents redundant probing on back-to-back skills.
3. **Clear on auth.** After `/setup --auth` completes, delete `.auth-cache.json`.
4. **Log everything.** Auth status goes into `execution-log.md` under the skill's preflight phase.
