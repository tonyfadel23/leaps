---
name: explore
description: >
  Take a sharp problem statement and make it tangible with lo-fi HTML
  prototypes and customer journey maps. Use when a PM says "/2" or "/explore",
  or after completing /1 (learn). No feasibility, no constraints, no metrics —
  just "how could this work for a customer?"
version: "1.0"
changelog:
  - "1.0: Initial versioned release"
connectors:
  - role: image_generation
    required: false
    used_by: Prototype Builder — realistic product images
  - role: market_intel
    required: false
    used_by: Competitor Researcher — competitor screenshots, market share, feature analysis
---

# /2 — Sketch

Take a sharp problem (from `/1 learn`) and make it tangible before anyone
touches a metric. Generate lo-fi HTML prototypes and customer journey maps
so the PM can react to something concrete.

**No feasibility. No constraints. No "but what about ads/logistics/campaigns."**
Pure imagination anchored to the JTBD.

---

## Usage

```
/2 water-subscription
/explore water-subscription
```

Or after completing `/1`, confirm the handoff: "Run `/2` to continue."

### Session Management

Follow `_shared/protocols/session-management.md`. Phase names: `journey`, `concepts`, `prototype`, `converge`, `verify`

Context keys: `confirmed_journey`, `journey_data`, `confirmed_concepts`,
`chosen_variation`, `prototype_files`.

Phases:
- Phase 1 — Journey & Research (`activeForm`: "Mapping the customer journey")
- Phase 2 — Propose Concepts (`activeForm`: "Proposing variation concepts")
- Phase 3 — Prototype (`activeForm`: "Building HTML prototypes")
- Phase 4 — Converge (`activeForm`: "Converging on a direction")
- Phase 5 — Verify (`activeForm`: "Running structural checks")
- Phase 6 — Feedback (`activeForm`: "Collecting PM feedback")

---

## Process

### Phase 1 — Journey & Research

**Staleness check:** Follow `_shared/protocols/staleness-check.md`.
Upstream: `learn.md`. This skill's output: `explore.md`.

---

Read `pipeline/{idea-slug}/learn.md`. Extract the Occasion (name, signal
dimensions: Time/Social/Need/Struggle), Job (core functional job), Outcome Map
(4D steps with I/S/Opp scores), Top Underserved Outcomes, and JTBD. Present
these to the PM, then run two agent delegations:

1. **Journey Mapper** (`agents/journey-mapper.md`) — produces a Mermaid journey
   diagram covering the **4D job map** (Discover -> Decide -> Do -> Resolve),
   grounded in your company touchpoints. Each step shows the relevant outcomes and
   their opportunity scores from learn.md. Also returns recommended entry points
   for prototyping.

2. **Competitor Researcher** (`agents/competitor-researcher.md`) — searches the
   web for how competitors and adjacent players solve this problem. **Pass the
   top underserved outcomes (Opp ≥ 3.0) from learn.md** so the researcher
   focuses on how competitors address the highest-opportunity outcomes, not
   just the general problem domain. Returns a structured comparison table
   plus an Outcome Coverage Matrix (competitors × top outcomes).

Once the journey mapper returns, create `pipeline/{idea-slug}/journey.md`
from the `brief-journey` data block. Then update `.briefdata.json` with the
journey data (insights, storyboard, blueprint) using the renderer's expected
field format:
- `storyboard[].emotion`: `"positive"` or `"negative"` (not label names)
- `storyboard[].intervention`: boolean (not `isIntervention`)
- `blueprint.layers`: flat object with `customer`, `frontstage`, `backstage`,
  `support` as string arrays (not `rows` with cell objects)

Rebuild the brief: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief: `open pipeline/{idea-slug}/brief.html`

The journey renders inside the brief deck (insights strip + storyboard + service
blueprint). There is no standalone `journey.html` file.

**Competitor research failure handling:**

If the Competitor Researcher agent fails, follow the Runtime Failure Handling
protocol in `_shared/protocols/connector-resolver.md`. Present three options
to the PM: **Retry**, **Skip for now** (continue without competitor data,
re-run later with `/2 {slug} --competitors`), or **Manual input** (PM pastes
competitor URLs/notes). Log the failure and PM's decision to `decision-log.md`.

**When competitor research succeeds (happy path):**

Save the competitor research to `pipeline/{idea-slug}/competitors/analysis.md`. Use the
exact format the agent returned (comparison table + table stakes / differentiated
/ gap sections). Competitor claims with specific numbers carry `[web: source]`
citation tags. Append a footer: `*Researched by /2 explore, {date}*`.

If the Competitor Researcher also captured screenshots, they'll already be
saved as `pipeline/{idea-slug}/competitors/{competitor-name}.png`.

Present both to the PM:
- "Here's the customer journey — [opens visual timeline]. React before we go further."
- "Here's what competitors are doing — [table stakes / differentiated / gaps]."

Iterate the journey if PM redirects. When iterated, re-delegate to Journey
Renderer with updated data. Move on when confirmed.

**Log Q&A**: Append every question and PM response to
`pipeline/{idea-slug}/decision-log.md` under a `## /2 Explore — {date}`
header. Continue numbering from where `/1` left off.

### Phase 2 — Propose & Confirm Concepts

Using the journey map, competitor research, and **top underserved outcomes**
from learn.md, propose 3+ variation concepts. Each one must be a genuinely
different take — not incremental improvements. Minimum 3 — more is fine if
the problem space warrants it.

**Each variation targets the same top outcomes differently.** The variation
question is: "Which outcomes do we prioritize, and how aggressively?"

**For each concept, describe:**

| | |
|---|---|
| **Name** | One-line label |
| **Core idea** | 2-3 sentences on how it works |
| **How they find it** | Which touchpoint from the 4D job map |
| **Outcomes targeted** | Which top underserved outcomes this variation addresses |
| **What makes it different** | The key dimension that separates this from the other variations |

**Variation dimensions should adapt to the problem.** Don't use a fixed
framework. Instead, identify what actually varies for this specific idea:

| Problem type | Vary by |
|-------------|---------|
| New feature | Entry point (home banner vs. product page vs. post-order) |
| Subscription/recurring | Commitment level (per-item vs. plan vs. auto-refill) |
| Discovery/engagement | Engagement model (push-driven vs. browse vs. search) |
| Pricing/monetization | Value framing (save money vs. unlock premium vs. earn rewards) |
| Retention/loyalty | Timing (proactive vs. reactive vs. scheduled) |
| Cross-sell | Trigger moment (pre-order vs. in-cart vs. post-order) |

Pick the 1-2 dimensions that create the most meaningful variation for this
specific JTBD. Name them explicitly: "I'm varying these concepts along
**[dimension]** because that's where the real design question is."

Present the table and wait for PM confirmation:
"Want to change any of these, drop one, or add a variation before I build?"

**Do not prototype until the PM confirms.**

### Phase 3 — Prototype

Delegate to the **Prototype Builder** agent (`agents/prototype-builder.md`).
Pass the agent:
- Each confirmed concept (name, core idea, entry point)
- The confirmed journey map (so entry points match journey touchpoints)
- The idea-slug for file naming

The agent builds `variation-{a|b|c}.html` files.

Once all variations are built, delegate to the **Showcase Builder**
(`agents/showcase-builder.md`) to build `index.html` — the variation
explorer. Pass:
- Config: title, subtitle
- Variations: letter, name, goal, description, file, screens (read from
  each prototype's `screens` array)
- **designPrompt**: Build this object per `_shared/protocols/design-handoff.md`.
  Pull JTBD and segment from learn.md, variation concepts from the confirmed
  concepts, and design tokens from `design/DESIGN.md`. This enables
  the "Copy Prompt for Claude Design" button in the High Fidelity tab.

Also create the `sketches/hifi/` directory (empty) so it's ready for drops.

Also delegate to the Showcase Builder to build `overview.html` — the variation
overview gallery. Pass:
- Config: title, subtitle (same as index.html)
- Variations: letter, name, description, flow stages (3-4 high-level stage
  names for the flow pills), and 3 key screens each (read from each
  prototype's `screens` array — pick entry, core interaction, outcome)

The overview shows all variations as static cards in a 2-column grid with
mini phone previews. Unlike index.html (interactive, one phone at a time),
overview.html shows everything at a glance — ideal for stakeholder sharing.

Once both files are built, **open index.html** with `open pipeline/{idea-slug}/sketches/index.html`

Present each variation: "Here's the showcase — click the tabs on the left to
browse variations. What resonates? What feels wrong?

I also generated an [overview page](sketches/overview.html) showing all
variations side-by-side — good for sharing with stakeholders."

**Post-build iteration loop:**

The PM can react to built prototypes in any of these ways:

| PM reaction | What to do |
|-------------|-----------|
| **Reject all** | Go back to Phase 2 — propose new concepts |
| **Reject some** | Drop rejected variations, keep the rest |
| **Modify one** | Iterate on that variation file directly — rebuild and re-show |
| **Mix pieces** | Create a new variation combining elements from multiple |
| **All look good** | Move to Phase 4 — Converge |

**Mixing:** When PM says "I want A's cart but C's checkout flow":
1. Identify the specific screens/flows to pull from each variation
2. Delegate to Prototype Builder for a new `variation-{next}.html`
3. Delegate to Showcase Builder to update `index.html` with new tab
4. Re-show the showcase

**Keep looping** — re-show after every change. Only move to Phase 4 when ready.

**Optional — Realistic Images:**
After presenting variations, ask about realistic product images. If yes and
`image_generation` connector is available, delegate to Prototype Builder.

### Phase 4 — Converge

**Comparative Critique:** Before asking the PM to choose, delegate to
the **Comparative Critique** agent (`agents/comparative-critique.md`).
Pass all variation HTML files and the JTBD + outcome map. The agent
returns a 5-dimension scoring matrix (Desirability, Feasibility,
Viability, UX Quality, Strategic Fit) with a lead recommendation.

Present the matrix to the PM, then ask: "Which variation (or combination) is the one? Or do you want to keep iterating?"

Iteration continues here — PM can still request changes, mix elements,
or go back to Phase 3 for a full rebuild.

**Hard approval gate:** Do NOT build `final-showcase.html` until the PM gives
explicit approval. Ask directly: "Ready to lock this as the final direction?"

**Outcome Evaluation Table:**

Before building the final showcase, evaluate each variation against top
underserved outcomes from learn.md:

```markdown
## Variation Evaluation

| Outcome (top 5) | Opp Score | Var A | Var B | Var C |
|-----------------|-----------|-------|-------|-------|
| [Outcome 1] | [score] | check addresses | ~ partial | check addresses |
```

Include this table in `explore.md` after the Variations Explored section.

Once approved, **determine the layout mode** for the final showcase:

```
if items are from different files or all single-screen -> gallery
else if flows.length === 1 -> linear (flatten to screens[])
else -> flows (multi-flow hierarchy)
```

Delegate to the **Showcase Builder** (`agents/showcase-builder.md`) to build
`final-showcase.html`. Tell the builder explicitly:
- "Build final-showcase as **linear** — single flow with these screens: [...]"
- "Build final-showcase as **flows** — here are the flows: [...]"
- "Build final-showcase as **gallery** — here are the items: [...]"

`index.html` stays untouched as the full variation explorer.

**Refresh the journey in the brief:**

The journey was built in Phase 1 before concepts existed. Now update it:

1. Update `pipeline/{idea-slug}/journey.md` — fill in the Direction section
   (name + description) with the chosen direction
2. Update `.briefdata.json` journey data with the direction info
3. Rebuild the brief: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`

**Log convergence**: Append the convergence Q&A to `decision-log.md`.

**Self-check (before writing explore.md):**

After convergence but before writing explore.md, scan for anti-patterns
and fix inline:
- [ ] Direction rationale restates the problem instead of explaining the design bet
- [ ] Variation descriptions are incremental tweaks, not genuinely different approaches
- [ ] Journey map missing a 4D step (Discover, Decide, Do, Resolve)
- [ ] "Users" without naming the specific segment

Save a sketch summary to `pipeline/{idea-slug}/explore.md`:

```markdown
## Sketch: [idea-slug]

### Customer Journey

[Mermaid diagram — updated to reflect chosen direction]

### Variations Explored

| Variation | Concept | Outcomes Targeted | PM Reaction |
|-----------|---------|-------------------|-------------|
| A | [concept] | [which top outcomes] | [reaction] |
| B | [concept] | [which top outcomes] | [reaction] |
| C | [concept] | [which top outcomes] | [reaction] |

### Outcome Evaluation

| Outcome (top 5) | Opp Score | Var A | Var B | Var C |
|-----------------|-----------|-------|-------|-------|
| [outcome 1] | [score] | [check/~/x] | [check/~/x] | [check/~/x] |

### Direction Chosen

[Which variation or combination, and why]

### Open Questions (for /3 Assess)

- [Questions that emerged from sketching]

---
*Explored from: learn.md*
*Generated by /2 explore, {date}*
```

**Also update `pipeline/{idea-slug}/opportunity.md`**:

1. Replace the **Prototype** placeholder with:

```markdown
## Prototype

[`sketches/final-showcase.html`](sketches/final-showcase.html) — the visual spec.

**Direction**: [chosen variation name]
**How it works**: [2-3 sentences — what the customer sees and does]
**Journey**: [entry] -> [core action] -> [outcome]

See also: [`sketches/index.html`](sketches/index.html) (interactive explorer), [`sketches/overview.html`](sketches/overview.html) (gallery overview), [`explore.md`](explore.md) (journey map + variation comparison)
```

2. Fill **What to build** with user-facing capabilities (what was prototyped).
3. Fill **Don't build** with hard scope cuts.
4. Fill **Later (post-MVP)** with deferred items: `- {item} (Phase N — {why deferred})`
5-8. Follow `_shared/protocols/opportunity-update.md` for Decisions, Scoring, Team line,
   and footer. Tag decisions with `When: Experience`.
9. **Update Pipeline cost** — follow `_shared/protocols/pipeline-cost.md`.

**Cascade invalidation (re-runs only):** Follow `_shared/protocols/cascade.md`.
Downstream artifacts to check: `assess.md`, `prove.md`.

**Create per-page md files:**

After writing `explore.md` and updating `opportunity.md`, create
the 1:1 md source files for the brief pages added by this skill.

1. **Create `pipeline/{idea-slug}/competitors.md`** — source for the
   Competitors brief page. Structure: Strategic Read (2-3 sentences),
   Table Stakes (list), Differentiators (comparison table with
   strong/partial/absent values), Key Takeaways (3 insights with data +
   sources), Extended competitive analysis, Screenshots table.
   Pull from `competitors/analysis.md`.

2. **Create `pipeline/{idea-slug}/journey.md`** — source for the Journey
   brief page. Use the `brief-journey` block returned by the Journey Mapper
   agent. Update the Direction section with the chosen direction name and
   description from Phase 4. This file feeds `_shared/brief-pages/journey.md`.

3. **Create `pipeline/{idea-slug}/variations.md`** — source for the
   Variations brief page. Structure: Chosen Direction (name + concept +
   why it won), Also Explored (each alt with concept + why dropped),
   Prototype Files table (direction / file / screens).

4. **Update `pipeline/{idea-slug}/summary.md`** — append/update direction info.

5. **Append to `pipeline/{idea-slug}/decisions.md`** — add /2 Explore decisions.

**Update the pipeline brief:**

Extract `briefData` fields per `_shared/reference/brief-field-mappings.md` (/2 section).
Write the extracted fields to `pipeline/{idea-slug}/.briefdata.json`.
Run: `node scripts/build-brief.js {idea-slug} --data pipeline/{idea-slug}/.briefdata.json`
Open the brief with `open pipeline/{idea-slug}/brief.html`.

**Generate PRD:**

After updating opportunity.md, generate the first version of
`pipeline/{idea-slug}/prd.md` — a vibe-coding handoff prompt.

Read opportunity.md and learn.md. Compile using the `/prd` template
(see `.claude/skills/prd/SKILL.md`). At this stage, include: who,
problem, what to build, don't build, done looks like, direction,
and journey flow.

Present: "I've also generated a PRD for vibe-coding tools
— see `prd.md`. You can paste it into v0/Cursor/Claude Code."

### Phase 5 — Verify

Run structural checks from `_shared/templates/verify-explore.md`. Flag failures but don't block.

After verify passes, run `_shared/protocols/auto-publish.md` to update the live brief if previously published.

Then run **Tier 2** of `_shared/protocols/auto-eval.md`: delegate to the Judge agent (path in that protocol) and write the deep scorecard to `pipeline/{idea-slug}/eval/YYYY-MM-DD.md`. Non-blocking — skip and note if an artifact is incomplete.

Recommend next step: "The experience is sketched. Run `/3` to define success criteria and targets informed by what we just built."

### Phase 6 — Collect Feedback

Follow `_shared/protocols/feedback-collection.md` with skill name `/2 explore`. This protocol runs at two cadences: **per-phase micro-ratings** after each phase completes (§A — one tap, non-blocking) and the **skill-end rating + follow-up** (§B). All feedback saves to `pipeline/{idea-slug}/eval/feedback.md`.

---

## Principles

1. **Concrete before measurable.** You can't define KRs for something no one
   has seen. Sketch first, measure second.

2. **Variations, not iterations.** Show genuinely different approaches, not
   incremental tweaks to one idea.

3. **No constraints.** Don't filter ideas through feasibility, campaigns,
   existing systems, or technical limitations. That's `/4 prove`'s job.

4. **Lo-fi in layout, on-brand in style.** Keep layouts simple and content
   minimal — rough enough to invite imagination, not bikeshedding. But use
   your design tokens so it feels like the product.

5. **React to artifacts, not abstractions.** The PM should be clicking through
   something, not reading a description of something.

6. **Journey drives prototypes.** The journey map's touchpoints become the
   prototype's entry points. They're not separate exercises.

7. **Thinking is visible.** The PM reads your reasoning in real time.
   Think out loud honestly — if you're unsure about a variation direction,
   say so. Brief: 30-80 words of thinking per concept or convergence
   decision. Don't fake confidence in the thinking block.

---

## Agent Definitions

- **Journey Mapper**: `agents/journey-mapper.md` — Mermaid journey diagrams + structured journey data (JSON) with your company touchpoints + entry point recommendations. Model: haiku.
- **Competitor Researcher**: `agents/competitor-researcher.md` — Web search for how others solve the problem, domain-aware competitive landscape. Model: sonnet.
- **Prototype Builder**: `agents/prototype-builder.md` — HTML prototypes (`variation-*.html`) with your company app patterns. References `templates/prototype-shell.html` for the mandatory shell. Model: sonnet.
- **Showcase Builder**: `agents/showcase-builder.md` — Variation explorer (`index.html`) and final direction showcase (`final-showcase.html`, 3 layout modes: linear/flows/gallery). Model: sonnet.
- **Comparative Critique**: `agents/comparative-critique.md` — 5-dimension scoring matrix across all variations before direction gate. Model: sonnet.

---

## Related Skills

- `/1 learn` — Previous step: JTBD problem statement and sizing
- `/3 assess` — Next step: success criteria, KRs, targets informed by sketches
- `/4 prove` — Grind sketches against reality: feasibility, constraints, directions
- `/5 ship` — Production-ready prototype and stress-test
