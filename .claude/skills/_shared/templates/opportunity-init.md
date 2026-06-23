# Opportunity.md Init Template

Initial template for `pipeline/{idea-slug}/opportunity.md`, created by /learn.
Later skills fill in the placeholder sections.

---

```markdown
# Build: [imperative title]

> **Occasion**: [occasion name] — [one-line description]
> **Job**: [core functional job]
> **Top Outcomes**: [top 3 underserved outcomes with scores]
> **JTBD**: [segment] who [occasion] want to [outcome] but [struggle]

**Team**: [teams surfaced during grounding] | **Approver**: [TBD]

---

## Prototype

*Run /explore to sketch the experience*

## What to build

*Run /explore to define scope*

## Don't build

*Run /explore to define scope*

## Later (post-MVP)

*Run /explore to define scope*

## Build context

*Run /assess to assess infrastructure*

## Decide before building

| Question | Owner | Status |
|----------|-------|--------|
| [blocking open question from grounding] | [team/person] | Open |

## Assumptions

| # | Assumption | Source | State | Updated |
|---|------------|--------|-------|---------|
| 1 | [assumption from grounding — e.g., "Users abandon because delivery ETA is unclear"] | [pm] | Stated | [date] |
| 2 | [data-backed assumption — e.g., "38% of grocery users reorder within 30 days"] | [data: bigquery] | Stated | [date] |
| 3 | [inferred assumption — e.g., "Subscription reduces churn because it shifts from active to passive reorder"] | [inferred] | Stated | [date] |

> **Lifecycle:** `Stated` (captured in /learn-/2) → `Questioned` (challenged in /assess-/4) → `Validated` (confirmed with data) or `Contradicted` (disproven with evidence).
>
> Skills /assess-/5 must review and update assumption states before proceeding. When an assumption is validated or contradicted, update the State column and add a note to [`decision-log.md`](decision-log.md).

## Decisions

| # | Decision | Why | When |
|---|----------|-----|------|
| 1 | [first PM decision from the interview] | [reasoning] | Strategy |

All decisions: [`decision-log.md`](decision-log.md) | Full grounding: [`learn.md`](learn.md)

---

## Done looks like

*Run /assess to define success*

## Measure these

*Run /assess to define success*

## Scoring

**Impact**: [High / Medium / Low] — [one line: why this level of impact]
**Complexity**: [High / Medium / Low] — [one line: why this level of complexity]
**Confidence**: [High / Medium / Low] — [one line: what gives or limits confidence]

## Pipeline cost

*Updated automatically after each skill run*

---
*Created by /learn, {date}*
```

## Template Rules

- **Team line**: List teams surfaced during grounding. Later skills append.
- **Decisions table**: Max 5 rows. Follow `_shared/protocols/opportunity-update.md`.
- **Decide before building**: Follow `_shared/protocols/opportunity-update.md`.
- **Unfilled sections**: Must have `*Run /N*` placeholders, not empty.
