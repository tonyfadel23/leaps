# Verify: /4 Prove

Structural checks on /prove outputs. Fast pass/fail — flag failures but don't block.

**prove.md checks:**
- [ ] `prove.md` exists and is non-empty
- [ ] Has a Feasibility Assessment (components scored, with evidence — not "looks feasible")
- [ ] Has Competing Directions (at least 2 genuinely different build/ops paths)
- [ ] Names a Recommended Direction with the reason it wins
- [ ] Has a Risk Register (risks with impact + a mitigation each)

**feasibility.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/feasibility.md`
- [ ] Every component is scored with a transparent formula (no hidden hand-waving)
- [ ] Dependencies are listed with owners or systems

**prd.md checks:**
- [ ] `prd.md` updated with the chosen direction's scope (carried from /explore, refined by /prove)

**opportunity.md checks:**
- [ ] Scoring section refreshed (Confidence reflects what prove surfaced)
- [ ] Decisions table has the direction decision logged with `When: …`

**conviction checks:**
- [ ] Stored `conviction` verdict matches a fresh recompute (`compute-conviction.js {slug} --check`)
- [ ] The gap names the true lowest dimension; evidence level matches the sourced-claim ratio

**On failure:** Flag which checks failed. Don't block — these gaps weaken `/ship`.
