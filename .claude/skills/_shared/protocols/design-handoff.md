# Design Handoff

Carry design tokens between skills so prototypes stay on-brand.

- Prototypes pull tokens from `design/DESIGN.md` + `design_tokens.json` (refreshed by `/setup --sync-design`).
- Save the chosen Figma source URL to `pipeline/{slug}/.figma-source` so later skills reuse the same design context.
