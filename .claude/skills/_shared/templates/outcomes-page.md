# Outcomes Page Template

Template for `pipeline/{idea-slug}/outcomes.md` — canonical source for the
Outcomes brief page. Created by /1 learn.

---

```markdown
## Job
[Core functional job statement from learn.md]

## Occasion
| Dimension | Value | Evidence |
|-----------|-------|----------|
| Time | [value] | [evidence + source] |
| Social | [value] | [evidence + source] |
| Need | [value] | [evidence + source] |
| Struggle | [value] | [evidence + source] |

## Outcome Map
### Discover
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 1 | ... | ... | ... | ... | ... |

### Decide
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|

### Do
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|

### Resolve
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|

## Top Underserved Outcomes (Opp >= 3.0)
[Ranked list — outcome statement + score + source + why it's underserved]

## Key Data

> **Format matters**: Each row maps to a `keyDataPoints` object in briefData:
> `{ label, value, source, sourceUrl }`. The `source` is the display name,
> `sourceUrl` is the clickable link. Both must be present or the brief
> renderer will show empty cells.

| Metric | Value | Source | Source URL | Methodology |
|--------|-------|--------|-----------|-------------|
| [what] | [number] | [display name, e.g., "Looker"] | [full URL to prove/dashboard] | [how it was derived] |

## Open Questions
| Question | Raised in | Owner | Status |
|----------|-----------|-------|--------|
| [question] | /1 learn | [owner] | Open |

## Confidence
[Color] — [Full reasoning with evidence trail]
```

Pull all content from `learn.md`. This is a restructured extraction, not
new synthesis. If the idea is non-occasion, omit the Occasion section.
