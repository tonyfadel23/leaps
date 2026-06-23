# Brief Page: Competitors

**Layout:** Hero + two-pane + gallery footer
**Source:** `competitors.md`
**dataKey:** `competitors`

**Structure:**

```html
<div class="slide" id="slide-competitors">
  <div class="slide-with-footer">
    <!-- HERO -->
    <div class="hero-strip">
      <div class="hero-title">Competitive Landscape</div>
      <div class="hero-meta">{strategicRead}</div>
      <div class="table-stakes-strip">
        <span class="table-stake-pill">{stake1}</span>
        <span class="table-stake-pill">{stake2}</span>
        <!-- ... -->
      </div>
    </div>

    <!-- TWO-PANE BODY -->
    <div class="slide-body two-pane">
      <div class="pane-left bg-warm">
        <div class="section-header">Key Takeaways</div>
        <ul class="evidence-list">
          <li><strong>{insight1}</strong> — {data1} <a class="evidence-source" href="{url}">{source}</a></li>
          <!-- 3 takeaways with inline evidence -->
        </ul>
      </div>
      <div class="pane-right flex-col">
        <div class="section-header">Differentiators</div>
        <table class="brief-table">
          <!-- color-coded cells: cell-strong / cell-partial / cell-absent -->
          <!-- the Us column: cell-highlight -->
        </table>
      </div>
    </div>

    <!-- GALLERY FOOTER -->
    <div class="slide-footer">
      <div class="section-header">App Screenshots</div>
      <div class="screenshot-gallery">
        <div class="screenshot-card">
          <img src="competitors/{filename}" alt="{name}">
          <div class="screenshot-caption">{caption}</div>
        </div>
        <!-- ... -->
      </div>
    </div>
  </div>
</div>
```

**Competitor table cells:** Use `cell-strong` (green bg) for strong
capability, `cell-partial` (amber bg) for partial, `cell-absent` (grey bg)
for absent. The the Us column uses `cell-highlight` for subtle orange tint.
