---
name: page-1-design-skill
description: "Use this skill when implementing or reviewing UI that should match the extracted Page 1 design system. It tells Copilot or Claude how to prioritize DESIGN.md, tokens, and Tailwind output when generating code or evaluating visual consistency."
---

# Page 1 UI Implementation Skill

## Role

Use this skill when a coding task should align with the extracted Page 1 design system. Treat the generated artifacts as implementation guidance, with DESIGN.md as the main narrative source of truth and the token files as the exact value source.

## Use When

- Building or refining UI that should follow the extracted design system.
- Mapping components to exported tokens or Tailwind theme values.
- Reviewing whether new UI work stays visually consistent with the extracted system.
- Turning the design extraction into implementation-ready code, prompts, or review guidance.

## Read In This Order

1. `DESIGN.md` for design intent, hierarchy, and section-by-section guidance.
2. `design_tokens.json` for exact token names, values, and structured component properties.
3. `tailwind.config.js` for direct implementation mapping in Tailwind-based codebases.
4. This `SKILL.md` for agent behavior, guardrails, and delivery expectations.

## System Snapshot

Page 1 is documented here as a self-contained DESIGN.md extracted from Figma and intended to act as the shared source of truth for downstream design and implementation work.

- Colors: 52 exported tokens, including `color-1`, `color-2`, `color-3`, `on-surface`, `background`, and `secondary`.
- Typography: 73 exported roles, including `headline-lg`, `label-7`, `label-15`, `label-8`, `body-lg`, and `title-13`.
- Spacing: 45 exported values, including `8xl`, `xs`, `4xl`, `space-43`, `space-22`, and `14xl`.
- Components: 240 documented entries, including `1`, `7`, `backgroundstack`, `clock`, `icon-button`, and `left-text`.

## Extraction Coverage

The source scan covered the whole Figma file across 1 page.

## Agent Instructions

- Start from `DESIGN.md`, not from assumptions about common design systems.
- Reuse exported token names when writing code, docs, or comments so downstream references stay stable.
- Prefer exact values from `design_tokens.json` over approximate visual guesses.
- If the project already has UI conventions, adapt these artifacts into that codebase without breaking existing architectural patterns.
- When using Tailwind, map directly to `tailwind.config.js` instead of duplicating theme values inline.
- If the extracted artifacts are incomplete or ambiguous, state that explicitly instead of inventing unsupported states or semantics.

## Implementation Rules

- Keep spacing, radius, typography, and color choices aligned with the generated artifacts.
- Preserve component structure and naming when the extracted artifacts provide those cues.
- Do not introduce extra variants, breakpoints, or interaction states unless the task explicitly asks for them or the artifacts support them.
- Prefer small, traceable deviations over broad stylistic reinterpretation.
- If you must diverge, explain why and point back to the closest matching token or section in `DESIGN.md`.

## Expected Deliverables

- Production-oriented code that references the exported design decisions rather than reinterpreting them.
- A short explanation of any assumptions, gaps, or mismatches between the request and the extracted artifacts.
- Reviews that call out visual drift, token misuse, or unsupported embellishments.

## When The Artifacts Are Ambiguous

- Say which section or token is missing, unclear, or inferred.
- Choose the most conservative implementation that preserves consistency with the rest of the exported system.
- Avoid inventing new design language when the extraction does not justify it.

## Prompt Starter

Use or adapt this when giving the artifacts to Copilot or Claude:

```text
Implement this UI using the attached Page 1 design artifacts. Read DESIGN.md first, use design_tokens.json for exact values, and use tailwind.config.js if the target codebase uses Tailwind. Reuse token names where possible, avoid inventing unsupported states, and call out any ambiguity before making large stylistic assumptions.
```

## Limitations

- The extraction is inferred from scanned Figma content, so semantic naming and component intent may still need human review.
- Missing states, interactions, responsive behavior, or edge cases may not be present in the exported artifacts.
- This skill is a working guide for agents; consult `DESIGN.md` directly when you need the fuller narrative context.

## Companion Files

- Keep `DESIGN.md`, `design_tokens.json`, and `tailwind.config.js` adjacent to this skill so the agent can read the narrative guidance, exact values, and implementation mapping together.
