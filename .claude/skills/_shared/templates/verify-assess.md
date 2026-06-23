# Verify: /3 Assess

Structural checks on /assess outputs. Fast pass/fail — flag failures but don't block.

**assess.md checks:**
- [ ] Has a Success Criteria table with columns: KR, Outcome #, Opp Score, Baseline (S), Target (S)
- [ ] Every KR links to an outcome # from learn.md's outcome map
- [ ] North Star = highest-Opp outcome from learn.md's Top Underserved Outcomes
- [ ] Has Kill Criteria section with at least 1 condition with a threshold
- [ ] Kill Criteria includes "Opportunity score drops below 1.5" condition
- [ ] Baselines cite at least one data source (contains a `[data: ...]` tag or dashboard name)
- [ ] Targets have timeframes (contains "day" or "week" or "month" or "90")
- [ ] Has Open Questions section
- [ ] Every baseline in the Success Criteria table has a citation tag (`[pm]`, `[data: ...]`, `[inferred]`)

**opportunity.md checks:**
- [ ] Done looks like section is filled — one sentence, no metric numbers
- [ ] Measure these has at least 3 metrics with thresholds
- [ ] Measure these has data source links or source citations
- [ ] Stop if section has at least 1 kill signal with threshold
- [ ] Build context has Infrastructure table with Notes column
- [ ] Build context Notes explain customer-job relevance (not just "Yes/No")
- [ ] Decisions table has at least 1 row with `When: Rules` and <=5 rows total
- [ ] Decide before building is a table (not bullet list) with Status column
- [ ] Resolved questions show status `Resolved` with one-line answer (not removed)
- [ ] Has Scoring section with Impact, Complexity, and Confidence (each High/Medium/Low with rationale)

**metrics.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/metrics.md`
- [ ] Has Alignment section with Goal and Mechanism
- [ ] Has North Star section with metric name, outcome #, baseline, target, confidence
- [ ] Has Input Metrics table with at least 2 rows
- [ ] Every metric links to an outcome # from outcomes.md
- [ ] Has Kill Criteria table with at least 1 condition + timeframe
- [ ] Has Instrumentation section

**scope.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/scope.md`
- [ ] Has Build section with at least 2 items
- [ ] Has Don't Build section with at least 1 item
- [ ] Has Later table with Phase column
- [ ] Has Build Context table with Status and Notes columns

**brief.html checks:**
- [ ] File exists at pipeline root `brief.html` (not in sketches/)
- [ ] Contains `briefData` script block
- [ ] Has KPIs and Scope slides (in addition to prior slides)
- [ ] `metrics` field is not null with northStar, inputs, guardrails
- [ ] `whatToBuild` is not null

**On failure:** Show which checks failed. Don't block — but flag:
"These gaps may cause problems in `/prove`."
