# Verify: /5 Ship

Structural checks on /ship outputs. Fast pass/fail — flag failures but don't block.

**ship/ checks:**
- [ ] `ship/prototype.html` exists
- [ ] `ship/showcase.html` exists
- [ ] `ship/release-checklist.md` exists
- [ ] Prototype has error states (contains "error" or "failed" or "unavailable")
- [ ] Prototype has loading states (contains "loading" or "skeleton")
- [ ] Release checklist has pre-build, during-build, pre-launch, post-launch sections
- [ ] Release checklist references specific metrics from assess.md
- [ ] Release checklist references specific dependencies from prove.md

**stress-test checks:**
- [ ] All KRs from assess.md have been checked for measurement points
- [ ] All kill criteria have been checked for design mitigations
- [ ] All high-impact risks from prove.md have been checked

**opportunity.md checks:**
- [ ] Prototype section references ship/showcase.html
- [ ] Has Scoring section with all three levels assessed
- [ ] Pipeline cost is updated

**On failure:** Flag but don't block.
