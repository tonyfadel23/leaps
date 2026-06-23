# Cascade Invalidation

Re-running an upstream skill marks downstream artifacts stale.

Dependency chain (each invalidates everything to its right):

| Re-run | Invalidates |
|--------|-------------|
| /learn   | explore.md, assess.md, prove.md, ship/ |
| /explore | assess.md, prove.md, ship/ |
| /assess  | prove.md, ship/ |
| /prove   | ship/ |
| /ship   | (nothing) |

When a skill re-runs and changes its output, write `cascade: { source, updated_at, stale:[…] }` into `.state.json`. On pipeline startup, surface a staleness warning for any idea with a `cascade` entry. When a downstream skill runs and finds its file in `cascade.stale`, warn the PM, log the decision to `decision-log.md` (`When: Cascade`), and remove its file from the array. Empty array → delete the `cascade` entry.
