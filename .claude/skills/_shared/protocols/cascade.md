# Cascade Invalidation

Re-running an upstream skill marks downstream artifacts stale.

Dependency chain (each invalidates everything to its right):

| Re-run | Invalidates |
|--------|-------------|
| /1 learn   | explore.md, assess.md, prove.md, ship/ |
| /2 explore | assess.md, prove.md, ship/ |
| /3 assess  | prove.md, ship/ |
| /4 prove   | ship/ |
| /5 ship   | (nothing) |

When a skill re-runs and changes its output, write `cascade: { source, updated_at, stale:[…] }` into `.state.json`. On pipeline startup, surface a staleness warning for any idea with a `cascade` entry. When a downstream skill runs and finds its file in `cascade.stale`, warn the PM, log the decision to `decision-log.md` (`When: Cascade`), and remove its file from the array. Empty array → delete the `cascade` entry.
