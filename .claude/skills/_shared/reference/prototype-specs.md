# Prototype Visual Specs

Canonical dimensions and visual constants for all prototype and showcase
files. Reference this instead of re-defining in each agent.

For the actual HTML shell template, see `templates/prototype-shell.html`.

---

## Phone Shell Dimensions

| Element | Value |
|---------|-------|
| Phone shell outer | 390 x 844 px |
| Phone shell border-radius | 55px |
| Screen area border-radius | 47px |
| Dynamic Island notch | 126 x 37 px, `#000`, radius 24px |
| Home indicator | 134 x 5 px, `rgba(255,255,255,0.3)`, radius 3px |
| Phone shell padding | 8px |
| Content design target | 375 px wide |
| Iframe dimensions | 375 x 812 px |

## Common Visual Constants

| Property | Value |
|----------|-------|
| Background (page) | `#F8FAFC` (neutral) |
| Font stack | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Phone frame color | `#1c1c1e` |
| Active dot | 12x12px, `#2563EB` |
| Inactive dot | 10x10px, `#D4D4D4` |
| Dot hover | `#AAAAAA` |
| Dot gap | 8px |
| Screen label | 11px/500, `#999`, number in `#2563EB` weight 600 |
| Height | 100vh, no scrolling |

## Phone Scaling (showcases)

JS calculates scale factor based on available height. Phone renders at
390x844 with CSS `transform: scale()` and `transform-origin: top left`.
Wrap in `.phone-wrapper` div with `position: relative` — width/height
set by JS to scaled dimensions. Do NOT use `overflow: hidden` on wrapper
(clips box-shadow).

```javascript
function scalePhone() {
  const shell = document.getElementById('phone-shell');
  const wrapper = document.getElementById('phone-wrapper');
  const topbar = document.querySelector('.topbar');
  const dots = document.querySelector('.showcase-dots');
  const used = (topbar ? topbar.offsetHeight : 0)
    + (dots ? dots.offsetHeight + 40 : 60) + 40;
  const available = window.innerHeight - used;
  const scale = Math.min(available / 844, 1);
  shell.style.transform = `scale(${scale})`;
  shell.style.transformOrigin = 'top left';
  wrapper.style.width = (390 * scale) + 'px';
  wrapper.style.height = (844 * scale) + 'px';
}
```

## Showcase Topbar Spec

- **Badge:** pill, uppercase, 10px/700, letter-spacing .8px, `#2563EB` bg, `#FFF` text, radius 100px, padding `4px 12px`
- **Title:** 17px/700, `#262626`
- **Separator:** 1px x 20px vertical line, `#E0E0E0`
- **Subtitle:** 13px, `#999`
- **Padding:** `12px 20px 8px`
- **Border-bottom:** `1px solid #E8E3DC`

## Carousel Dot Sync Protocol

Dots and iframe stay in sync via postMessage:

- **Clicking dot:** sends `{ type: 'navigate', entry }` to iframe
- **Prototype navigation:** sends `{ type: 'screen-change', entry }` back
- Showcase updates active dot + label on `screen-change`
- Use `.showcase-dot` / `.showcase-label` class names (not `.proto-dot`) to avoid CSS collision with iframe

## Bottom CTA Pattern (sticky buttons)

Screens with action buttons at the bottom (checkout, confirm, place order)
MUST pin them to the bottom of the phone frame regardless of content height.
This is the #1 visual bug in prototypes — buttons floating mid-screen.

**Pattern:**
```html
<div class="screen active" id="screen-checkout">
  <!-- Scrollable content area -->
  <div style="flex:1; overflow-y:auto; padding:16px;">
    <!-- ... screen content ... -->
  </div>
  <!-- Pinned bottom CTA — always visible at bottom -->
  <div style="padding:12px 16px; border-top:1px solid #E8E3DC; background:#fff;">
    <button style="width:100%; padding:16px; border-radius:12px; ...">Place Order</button>
  </div>
</div>
```

**Rules:**
- The `.screen` is already `display:flex; flex-direction:column; flex:1`
- Content wrapper gets `flex:1; overflow-y:auto` to take remaining space and scroll
- Bottom CTA wrapper has NO flex-grow — it sits at the natural bottom
- If multiple buttons: stack them in the bottom wrapper
- `border-top: 1px solid #E8E3DC` separates content from CTA
- NEVER use `position:absolute/fixed` for bottom buttons — flex layout handles it

## NEVER Do These

Each has caused real bugs:

- Call `showScreen()` or manipulate `.screen` visibility directly — use `navigateTo(param)`
- Use `transform: scale()` inside iframes — CSS `zoom` only (showcases use `transform: scale()` on the outer phone frame)
- Set `.phone-shell { width: 100% }` — breaks zoom scaling. Keep `390px` standalone, `375px` iframe
- Set `.phone-shell { width: 375px }` standalone — shell is 390px (8px padding = 374px content). 375px is iframe only
- Set `border-radius: 40px` or `0` on `.phone-shell` — must be `55px`
- Use `min-height` on `.phone-shell` — must be `height: 844px` (fixed). `min-height` causes short content to not fill the frame, leaving a black gap at the bottom
- Set `background: #F5F5F5` or `#EDE8E2` — must be `#F8FAFC`
- Set viewport to `width=375` — use `width=device-width`
- Send `navigate` messages before iframe `load` fires
- Write phone frame CSS from scratch — paste Block A verbatim
- Import Google Fonts — use the font stack above
- Omit `* { box-sizing: border-box; }` — phone renders at 406px without it
- Leave `.screen` at default `overflow-y: auto` on sticky-footer screens — override with `overflow-y: hidden`
