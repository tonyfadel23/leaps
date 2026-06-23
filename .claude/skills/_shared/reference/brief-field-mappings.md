# Brief Field Mappings

Field-by-field extraction rules for updating `briefData` in `brief.html`.
Each skill reads existing briefData, adds its fields, and delegates to the Brief Builder.

---

## /1 learn — Initial briefData

### Extract briefData from source files:

From `summary.md`:
- `betHeadline` <- Bet section text
- `occasionLabel` <- from "Occasion label:" line
- `opportunityLabel` <- from "Opportunity label:" line
- `executiveSummary` <- Evidence Narrative items as
  `[{ text, source, sourceUrl }]` — exactly 3 items
- `seeking` <- Seeking section text
- `producer` <- Producer section text
- `keyNumbers.opportunity` <- from Impact -> Opportunity size
- `keyNumbers.metricType` <- parenthetical in Opportunity size (GMV/Revenue/etc.)
- `keyNumbers.complexity` <- from Impact -> Complexity
- `confidence` <- from Impact -> Confidence as `{ color, label, reason }`

From `outcomes.md`:
- `occasion` <- `{ name, description, time, social, need, struggle, evidence }`
  (null if non-occasion idea)
- `job` <- Job section text
- `outcomeMap` <- `{ discover, decide, do, resolve }` — arrays of
  `{ num, text, i, s, opp, source }`
- `topOutcomes` <- Top Underserved Outcomes as
  `[{ num, text, i, s, opp, step, source }]`
- `research` <- `{ inputType, affected, opportunitySize, complexity,
  openQuestions, keyDataPoints }`
  - `keyDataPoints` **must** be an array of objects: `[{ label, value, source, sourceUrl }]`
    - `label`: metric name (e.g., "Morning orders/month")
    - `value`: the number (e.g., "3.25M")
    - `source`: display name (e.g., "Looker")
    - `sourceUrl`: clickable link to the source (e.g., Looker explore URL) — empty string if none
    - **NOT** plain strings — the renderer expects objects and will silently show nothing if given strings

From `decisions.md`:
- `decisions` <- Resolved Decisions rows as `[{ num, decision, why, when }]`
- `openQuestions` <- Open Questions rows as `[{ question, owner, status }]`
- `decisionLog` <- Decision Log sections as
  `[{ skill, date, entries: [{ q, a }] }]`
- `rawDecisionLog` <- Full raw content of `decision-log.md` as a string
  (displayed in the "Raw Log" tab on the Decisions brief page)

From `opportunity.md`:
- `title` <- from heading
- `jtbd` <- from blockquote
- `pipelineCost` <- `{ sessions, estCost }`
- `keyNumbers.affected` <- from Team line context

### Set null for unavailable data:

- `competitors: null`, `journey: null`, `direction: null`,
  `variations: null`, `chosenDirection: null`, `metrics: null`,
  `killCriteria: null`, `goalsAlignment: null`, `whatToBuild: null`,
  `dontBuild: null`, `later: null`, `buildContext: null`,
  `feasibility: null`, `prd: null`
- `files: { prototype: null, finalShowcase: null, journey: null, variationExplorer: null }`

---

## /2 Explore — Add competitors, journey, variations

### Add new fields from source files:

From `competitors.md`:
- `competitors.strategicRead` <- Strategic Read section
- `competitors.tableStakes` <- Table Stakes bullet items as string array
- `competitors.differentiators` <- Differentiators table rows as
  `[{ name, us, compA, compB, ... }]` with values 'strong'/'partial'/'absent'
- `competitors.compNames` <- competitor column headers from table
- `competitors.takeaways` <- Key Takeaways as
  `[{ insight, data, source, sourceUrl }]`
- `competitors.screenshots` <- Screenshots table as
  `[{ name, filename, caption }]`

From `journey.md`:
- `journey.insights` <- Insights section as
  `[{ icon, title, text, highlight }]` — exactly 3 items; one with `highlight: true`
- `journey.storyboard` <- Storyboard section as
  `[{ icon, thought, emotion, emotionClass, caption, detail, isIntervention }]`
  — exactly 5 panels. `emotionClass`: `'negative'` | `'positive'` | `''`
- `journey.blueprint.stages` <- Blueprint stage column headers (exactly 5)
- `journey.blueprint.rows` <- 4 rows (Customer, Frontstage, Backstage, Support),
  each with `{ label, cells: [{ title, detail, isIntervention }] }`
- `direction` <- `{ name, description }` from Direction section

From `variations.md`:
- `variations` <- all directions as
  `[{ id, name, concept, reaction, chosen, screens }]`
- `chosenDirection` <- `{ name, why }` from Chosen Direction section

From `summary.md` (updated):
- Update `executiveSummary` — if the direction changed the narrative,
  update the 3rd evidence item to reflect the chosen direction
- `files.prototype` <- Prototype path

### Add PRD content:

Read `pipeline/{idea-slug}/prd.md`. Set `prd` to the full markdown content of the file.

### Keep existing fields:

`occasion`, `job`, `outcomeMap`, `topOutcomes`, `research`, `keyNumbers`,
`confidence`, etc.

### General updates:

- Update `meta.stage` to `'Explored'`, `meta.date` to today
- `files.finalShowcase`, `files.journey`, `files.variationExplorer`
  <- actual filenames from sketches/

---

## /3 Assess — Add metrics, scope

### Add new fields from source files:

From `metrics.md`:
- `metrics.northStar` <- `{ name, outcomeNum, oppScore, baseline, target, confidence }`
- `metrics.inputs` <- Input Metrics table rows as
  `[{ name, outcomeNum, oppScore, baseline, target, confidence }]`
- `metrics.guardrails` <- Guardrails table rows as
  `[{ name, outcomeNum, oppScore, baseline, target, confidence }]`
- `killCriteria` <- Kill Criteria table rows as
  `[{ condition, timeframe, action }]`
- `goalsAlignment` <- `{ goal, mechanism }` from Alignment section

From `scope.md`:
- `whatToBuild` <- Build items as string array
- `dontBuild` <- Don't Build items as string array
- `later` <- Later table rows as `[{ item, phase, reason }]`
- `buildContext` <- Build Context table rows as
  `[{ component, status, statusColor, notes }]`
  (statusColor: 'green' for Exists, 'yellow' for Modify, 'red' for New)

From `decisions.md` (updated):
- Update `decisionLog` — append /3 Assess entries
- Update `openQuestions` and `decisions`

### General updates:

- Update `meta.stage` to `'Assessed'`, `meta.date` to today
- `feasibility: null` — not available until /4

---

## /4 Prove — Add feasibility

### Add the feasibility field from `feasibility.md`:

- `feasibility.components` <- Component Scores table rows as
  `[{ component, effort, deps, risk, criticality, aiReadiness, score, driver }]`
- `feasibility.teamCount` <- from Coordination teams count
- `feasibility.teamNames` <- from Coordination team names as array
- `feasibility.coordinationFactor` <- from Coordination factor value
- `feasibility.featureScore` <- computed total from Total section
- `feasibility.bottleneck` <- Bottleneck Analysis text (compressed to 1-2 sentences)
- `feasibility.aiReadinessNarrative` <- AI Readiness Detail text (compressed)
- `feasibility.risks` <- Risk Register rows as
  `[{ risk, likelihood, impact, mitigation }]`
- `feasibility.dependencies` <- Dependencies rows as
  `[{ dep, type, blocks, owner, status }]`

From `decisions.md` (updated):
- Update `decisionLog` — append /4 Prove entries
- Update `openQuestions` and `decisions`

### General updates:

- Update `meta.stage` to `'Proven'`, `meta.date` to today

---

## /5 Ship — Final updates

- Update `meta.stage` to `'Shipped'`, `meta.date` to today.
- Update `files.prototype` to `ship/prototype.html`.
- Update `pipelineCost` with final session count and cost.
- Update `decisionLog` — append /5 Ship entries.
- Update `openQuestions` and `decisions` from `decisions.md`.
