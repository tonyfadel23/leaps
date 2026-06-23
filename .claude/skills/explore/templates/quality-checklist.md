# Quality Checklist — Sketch Skill

Unified self-checks for all HTML outputs. Run the relevant section
before returning ANY file to the orchestrator. Fix failures inline.

---

## Prototype (`variation-*.html`)

1. `body` background is `#F8FAFC` — not white, not gray
2. `.phone-shell` width `390px`, min-height `844px`, border-radius `55px`
3. `.phone-screen-area` border-radius `47px`
4. `.phone-notch` 126x37px `#000` radius 24px; `.phone-home` 134x5px radius 3px
5. `body.in-iframe .phone-shell` width `375px` (not `100%`)
6. Iframe scaling uses CSS `zoom` (not `transform: scale()`)
7. `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
8. Dots: inactive `#D4D4D4` 10px, active `#2563EB` 12px
9. `screens` array has `param: ''` for default; IDs match `screen-{param}`
10. `navigateTo()` is the only way screens change
11. Keyboard arrows work (ArrowLeft/Right/Up/Down)
12. No `@import` or `<link>` to Google Fonts — use `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
13. `* { box-sizing: border-box; }` is present
14. Sticky-footer screens have `overflow-y: hidden` on `.screen` div with inner scroll area

## Showcase (`index.html`, `final-showcase.html`)

1. Background `#F8FAFC`; `html { height: 100% }`
2. Phone frame 390x844 `#1c1c1e` radius `55px`; inner radius `47px`
3. Notch + home indicator present; shell padding `8px`
4. Dots below phone, sync bidirectionally via postMessage
5. Screen label below dots: "Screen N — Label"
6. Clicking dot sends `{ type: 'navigate', entry }` to iframe
7. `iframeReady = true` set on iframe `load` event before navigating
8. Keyboard arrows work; everything fits in `100vh`
9. Badge `#2563EB` bg / `#FFF` text
10. No Google Fonts; `* { box-sizing: border-box; }`
11. `iframeReady = false` reset when switching variations (index.html only)

## Journey (`journey.html`)

1. Background `#F8FAFC`; no Google Fonts
2. All 4 stages present (Discover, Decide, Do, Resolve)
3. Score colors: <=2 `#ED1B24`, 3 `#EAA407`, >=4 `#0E9339`
4. Entry links open `{entryTarget}?entry={param}` in `target="_blank"`
5. `journeyData` script block present with all stage data
6. Desktop: `100vh` no scrolling; `* { box-sizing: border-box; }`
