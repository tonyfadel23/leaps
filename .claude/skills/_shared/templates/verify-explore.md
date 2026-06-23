# Verify: /2 Explore

Structural checks on /explore outputs. Fast pass/fail — flag failures but don't block.

**competitors.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/competitors.md`
- [ ] Has Strategic Read section (2-3 sentences)
- [ ] Has Table Stakes section with at least 2 items
- [ ] Has Differentiators table with 3+ competitors and color-coded values (strong/partial/absent)
- [ ] Has Key Takeaways section with exactly 3 insights, each with inline evidence + source
- [ ] Has Screenshots table (if competitor screenshots were captured)
- [ ] `competitors/analysis.md` also exists (raw analysis from research agent)

**journey.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/journey.md`
- [ ] Has Direction section with name and description
- [ ] Has Stages table with at least 3 stages
- [ ] Has Intervention Point section naming the changed stage

**variations.md checks:**
- [ ] File exists at `pipeline/{idea-slug}/variations.md`
- [ ] Has Chosen Direction section with name, concept, and "Why it won"
- [ ] Has Also Explored section with at least 1 alternative + "Why dropped"
- [ ] Has Prototype Files table listing variation HTML files

**explore.md checks:**
- [ ] Has Mermaid journey diagram (contains ` ```mermaid`)
- [ ] Has variations table with 3+ rows
- [ ] Has a "Direction Chosen" section naming one variation
- [ ] Direction has "Why" rationale

**sketches/ checks:**
- [ ] `journey.html` exists and contains `journeyData` script block
- [ ] `journey.html` has all 4 job map steps (Discover, Decide, Do, Resolve)
- [ ] Entry point links in `journey.html` use correct `?entry=` params matching the chosen variation's `__screens`
- [ ] At least 3 `variation-{x}.html` files exist
- [ ] `index.html` exists
- [ ] `overview.html` exists and contains `overview.variations` config block
- [ ] `overview.html` has matching variation count to `index.html`
- [ ] `final-showcase.html` exists
- [ ] Each variation file has `?entry=` routing (contains `URLSearchParams` or `getParameter`)
- [ ] Each variation file has iframe detection (contains `window.self !== window.top`)

**opportunity.md checks:**
- [ ] Prototype section is filled — has direction + showcase link + "See also" traceability links
- [ ] What to build has at least 3 user-facing capabilities
- [ ] Don't build has at least 1 hard cut
- [ ] Later (post-MVP) has at least 1 deferred item with phase
- [ ] Decisions table has at least 1 row with `When: Experience` and <=5 rows total
- [ ] Decide before building is a table (not bullet list) with Status column
- [ ] Has Scoring section with Impact, Complexity, and Confidence (each High/Medium/Low with rationale)

**brief.html checks:**
- [ ] File exists at pipeline root `brief.html` (not in sketches/)
- [ ] Contains updated `briefData` with `variations` not null
- [ ] Has Variations slides in addition to Overview and Research
- [ ] `files.finalShowcase` points to existing file
- [ ] If `competitors/analysis.md` exists, `competitors` field is not null

**prd.md checks:**
- [ ] `prd.md` exists at `pipeline/{idea-slug}/prd.md`
- [ ] Has "What to build" with at least 3 capabilities
- [ ] Has "Don't build" with at least 1 cut
- [ ] Has "Done looks like" (one sentence, not a metric)

**On failure:** Show which checks failed. Don't block — but flag:
"These gaps may cause problems in `/assess`."
