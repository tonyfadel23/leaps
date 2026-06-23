# JTBD Framework — Occasions, Jobs, Outcomes

Shared definitions for the Jobs-to-be-Done framework used across all
pipeline skills. Reference this instead of re-defining in each agent.

---

## Core Concepts

- **Occasion** — a real, recurring consumer context (e.g., "morning breakfast before work")
- **Job** — the core functional job the customer is trying to get done within that occasion
- **Outcomes** — desired outcome statements scored on Importance × Satisfaction gap
- **Bet** — specific solution hypotheses (comes in /explore, NOT in /learn)

## Signal Dimensions

Characterize every occasion with these four dimensions:

| Dimension | Values |
|-----------|--------|
| **Time** | Daily, Weekly, Monthly, Seasonal |
| **Social** | Solo, Couple, Friends, Family, Team |
| **Need** | Planned, Urgent, Routine, Emotional, Social |
| **Struggle** | Accessibility, Decision, Trust, Quality, Affordability |

## 4D Job Map

Compressed from Ulwick's 8-step Universal Job Map:

| Step | Absorbs | Question it answers |
|------|---------|-------------------|
| **Discover** | Define + Locate | How does the customer realize they need this and find options? |
| **Decide** | Prepare + Confirm | How do they evaluate, configure, and commit? |
| **Do** | Execute + Monitor | What happens during the core action? |
| **Resolve** | Modify + Conclude | What if it goes wrong? How do they finish? |

## Outcome Statement Structure

`[Direction] + [metric] + [object of control] + during [occasion]`

- **Direction**: Minimize / Maximize / Reduce / Increase
- **Metric**: time, likelihood, number of steps, effort, cost
- **Object of control**: what the customer is trying to manage
- **Occasion**: the contextual clarifier

Examples:
- "Minimize the time to **find breakfast options that match dietary preferences** during solo weekday breakfast"
- "Minimize the number of **decisions needed to complete an order** during solo weekday breakfast"
- "Maximize confidence that **the order will arrive on time** during solo weekday breakfast"

Frame as what the customer wants to control, not what the app should do:
- GOOD: "Minimize the likelihood that items arrive at different temperatures"
- BAD: "Add multi-vendor order bundling"

## Opportunity Score

`Opp = I × (5 - S) / 4`

Where I = Importance (1-5), S = Satisfaction (1-5). Score range is 0-5.

| I | S | Opp | Read as |
|---|---|-----|---------|
| 5 | 1 | 5.0 | Max opportunity — critical and completely unserved |
| 5 | 3 | 2.5 | Half the opportunity remains |
| 3 | 1 | 3.0 | Moderate importance, fully unserved |
| 5 | 5 | 0.0 | Fully served — no opportunity |

## Journey Satisfaction Scoring

For journey maps and visual renderers:

| Score | Emoji | Meaning |
|-------|-------|---------|
| 1 | 😫 | Painful |
| 2 | 😐 | Frustrating |
| 3 | 😊 | Neutral/OK |
| 4 | 😄 | Good |
| 5 | 😍 | Delightful |
