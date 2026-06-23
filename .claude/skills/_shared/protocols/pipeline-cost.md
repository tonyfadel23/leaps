# Pipeline Cost

Track token + tool usage per skill run.

- Append to `pipeline/{slug}/execution-log.md`: agents invoked, MCP calls (success/fallback/fail), artifacts written, and approximate token cost for the run.
- `/pipeline --cost` aggregates these logs into a per-idea and cross-pipeline report.
