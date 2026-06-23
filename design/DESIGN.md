# Design System — Prototype Reference

> The design tokens and patterns the prototype builder uses. This is the
> **neutral default**. Connect your own Figma file in Settings → Design system to
> replace it with your company's system (`/setup --sync-design`).

<!-- AUTO-SYNCED:colors START -->
## Colors

| Token | Hex | Role | When to use |
|-------|-----|------|-------------|
| primary | `#2563EB` | Brand | Primary CTAs, active states, links |
| primary-dark | `#1D4ED8` | Brand | Hover / pressed |
| primary-light | `#EFF6FF` | Brand | Active backgrounds, tints |
| success | `#16A34A` | Status | Positive signals |
| warning | `#D97706` | Status | Caution |
| danger | `#DC2626` | Status | Errors, destructive, risk |
| text-primary | `#1A1A1A` | Text | Primary text |
| text-secondary | `#555555` | Text | Descriptions |
| text-tertiary | `#888888` | Text | Placeholders, timestamps |
| text-inverse | `#FFFFFF` | Text | On dark/colored backgrounds |
| surface-page | `#F8FAFC` | Surface | Page background |
| surface-card | `#FFFFFF` | Surface | Cards |
| surface-muted | `#F1F5F9` | Surface | Pills, tags |
| border | `#E2E8F0` | Surface | Borders, dividers |
<!-- AUTO-SYNCED:colors END -->

<!-- AUTO-SYNCED:typography START -->
## Typography

System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| Display | 28px | 700 | 34px |
| Title | 20px | 600 | 26px |
| Body | 16px | 400 | 24px |
| Label | 14px | 500 | 20px |
| Caption | 12px | 400 | 16px |
<!-- AUTO-SYNCED:typography END -->

<!-- AUTO-SYNCED:spacing START -->
## Spacing & Radius

4px grid: `4, 8, 12, 16, 24, 32, 48`. Radius: `sm 6px`, `md 10px`, `lg 16px`, `pill 999px`.
<!-- AUTO-SYNCED:spacing END -->

## App Screen Patterns

Generic, product-agnostic layouts the prototype builder can compose:

- **List / feed** — scrollable rows of cards, each a title + supporting line + optional trailing action. Sticky top bar with screen title and a primary action.
- **Detail** — hero/summary block at top, then sections of key–value or rich content, a sticky bottom CTA bar on mobile.
- **Form** — single-column labelled fields, inline validation, one primary CTA, grouped sections with section headers.
- **Empty state** — centered icon + one-line explanation + single primary action.
- **Navigation** — bottom tab bar (mobile) or left rail (web), 3–5 destinations, the active item in `primary`.

## Rules

1. **Tokens, not invention.** Use the tokens above; never hardcode raw hex that isn't a token.
2. **Lo-fi in layout, on-brand in style.** Real tokens, simple structure.
3. **No brand-specific content.** Keep copy and imagery generic until a real design system is synced.
