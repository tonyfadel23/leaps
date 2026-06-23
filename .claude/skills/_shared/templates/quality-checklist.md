# Quality Checklist

Run the relevant section before returning an artifact. Fast self-check — fix what
fails, then return.

## Prototype (HTML sketches)

- [ ] Renders standalone (open the file directly — no build step, no broken refs)
- [ ] Phone shell matches `_shared/reference/prototype-specs.md` dimensions
- [ ] Has a **loading** state (skeleton/spinner), not just final data
- [ ] Has an **empty** state (no results / nothing yet)
- [ ] Has an **error** state (something failed / unavailable)
- [ ] Real-looking copy and numbers — no "lorem ipsum", no "TODO"
- [ ] Tap targets are reachable; primary action is obvious
- [ ] No console errors

## Brief page

- [ ] `briefData` block parses as valid JSON
- [ ] Every claim/number has a `source` or is explicitly marked assumed
- [ ] No em-dashes in rendered copy (house style — use a hyphen)

## Written output (cards, pages)

- [ ] Headings match the template structure
- [ ] Citation tags present on factual claims (`[data: ...]` / `[pm]` / `[inferred]`)
- [ ] One idea per sentence; senior-operator tone, no filler

**On failure:** fix inline before returning. Don't ship a placeholder.
