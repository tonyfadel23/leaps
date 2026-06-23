# Connector Resolver

How a skill turns a semantic role (e.g. `metrics_source`) into a live MCP call.

1. Read `connectors.yaml` at the project root. Find the role's `primary` binding (mcp + url + transport + hint).
2. Call the primary MCP. On success, use it and move on.
3. On failure (error, timeout, auth expired): try each `fallbacks` entry in order.
4. If all fail, act on `fallback_mode`: `ask_user` → surface the gap and ask how to proceed; `skip` → note the gap and continue without that data.
5. **Never fabricate data to fill a gap.** Log every MCP failure to `decision-log.md` (even when a fallback succeeded — it flags flaky connectors).
