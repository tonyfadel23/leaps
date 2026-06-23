# Brief Page: Variations

**Layout:** Two-pane, winner leads
**Source:** `variations.md`
**dataKey:** `variations`

**Structure:**

```html
<div class="slide" id="slide-variations">
  <!-- HERO -->
  <div class="hero-strip">
    <div class="hero-title">Variations Explored</div>
    <div class="hero-subtitle">
      Chosen: <strong>{chosenName}</strong> — {chosenWhy}
    </div>
  </div>

  <div class="slide-body two-pane">
    <div class="pane-left">
      <!-- CHOSEN DIRECTION (first, prominent) -->
      <div class="section-header">Chosen Direction</div>
      <div class="variation-card active" data-var-id="{chosenId}">
        <div class="variation-card-header">
          <span class="variation-name">{name}</span>
          <span class="chosen-badge">PICK</span>
        </div>
        <div class="variation-concept">{concept}</div>
      </div>

      <!-- ALSO EXPLORED (demoted) -->
      <div class="section-header">Also Explored</div>
      <div class="variation-card" data-var-id="{altId}">
        <div class="variation-card-header">
          <span class="variation-name">{name}</span>
        </div>
        <div class="variation-concept">{concept}</div>
        <div class="dropped-reason">Dropped: {reaction}</div>
      </div>
      <!-- ... other variations -->
    </div>
    <div class="pane-right bg-surface" style="display:flex;align-items:center;justify-content:center;">
      <!-- Phone frame wrapper with nav dots — uses brief.css phone classes -->
      <div class="phone-wrapper">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-home"></div>
          <div class="phone-screen">
            <iframe id="variationFrame" data-src="sketches/final-showcase.html" style="width:100%;height:100%;border:none;"></iframe>
          </div>
        </div>
        <div class="nav-dots">
          <div class="dots-row" id="variationDots">
            <!-- JS populates from iframe's __screens array -->
          </div>
          <div class="screen-label" id="variationLabel"></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

Clicking a variation card swaps `.active` and updates the right-pane
iframe. Chosen direction always appears first with PICK badge.

**Phone frame:** The brief renders its own phone frame around the iframe
using `.phone-wrapper` / `.phone-frame` / `.phone-screen` from `brief.css`.
The prototype inside the iframe detects `in-iframe` mode and strips its own
phone chrome — the brief's phone frame takes over.

**Nav dots:** Populated from the iframe's `__screens` array after load.
Clicking a dot sends `{ type: 'navigate', entry }` to the iframe. The
iframe sends `{ type: 'screen-change', entry }` back to sync the active dot.

**Iframe source:** `data-src` points to `final-showcase.html` for the
chosen direction. When clicking a non-chosen variation card, swap the
iframe src to that variation's file directly.

**Dot/frame JS** (include in the brief's `<script>` section):

```javascript
// Phone frame nav for variation pane
function setupPhoneDots(frameId, dotsId, labelId) {
  const iframe = document.getElementById(frameId);
  if (!iframe) return;
  iframe.addEventListener('load', () => {
    try {
      const screens = iframe.contentWindow.__screens || [];
      let active = 0;
      const dotsEl = document.getElementById(dotsId);
      const labelEl = document.getElementById(labelId);
      function render() {
        if (!dotsEl) return;
        dotsEl.innerHTML = screens.map((s, i) =>
          `<button class="dot${i === active ? ' active' : ''}"
            onclick="navProto('${frameId}','${dotsId}','${labelId}',${i})"></button>`
        ).join('');
        if (labelEl && screens[active]) {
          labelEl.textContent = screens[active].label;
        }
      }
      render();
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'screen-change' && e.source === iframe.contentWindow) {
          const idx = screens.findIndex(s => s.param === e.data.entry);
          if (idx !== -1) { active = idx; render(); }
        }
      });
      window['_phoneDots_' + frameId] = { screens, render, setActive: (i) => { active = i; render(); } };
    } catch(e) {}
  });
}
function navProto(frameId, dotsId, labelId, idx) {
  const state = window['_phoneDots_' + frameId];
  if (!state) return;
  const iframe = document.getElementById(frameId);
  state.setActive(idx);
  iframe.contentWindow.postMessage({ type: 'navigate', entry: state.screens[idx].param }, '*');
}
```
