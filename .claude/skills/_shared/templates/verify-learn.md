# Verify: /1 Learn

Structural checks on /1 learn outputs. Fast pass/fail — flag failures but don't block.

**learn.md checks:**
- [ ] `learn.md` exists and is non-empty
- [ ] JTBD is a single sentence (one "When… I want… so I can…" line, not a paragraph)
- [ ] Has citation tags on factual claims (`[data: ...]`, `[pm]`, or `[inferred]`)
- [ ] Opportunity size names a metric *type* (users, orders, GMV, rate), not a vague "big"
- [ ] Names at least one underserved outcome with an opportunity score

**opportunity.md checks:**
- [ ] Created with the core problem/job section filled
- [ ] Has a Scoring section (Impact / Complexity / Confidence, each with rationale)
- [ ] "Done looks like" is one sentence with no metric numbers (those come in /3)

**decision-log.md checks:**
- [ ] Exists with at least one `**Q1**: … / **A1**: …` entry from the interview

**brief.html / .briefdata.json checks:**
- [ ] `brief.html` exists at the idea root with a `briefData` script block
- [ ] `executiveSummary` claims each carry a `source` (string) or are explicitly assumed (`null`)

**On failure:** Flag which checks failed. Don't block — these gaps may surface in `/2`.
