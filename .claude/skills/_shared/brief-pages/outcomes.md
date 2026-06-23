# Brief Page: Opportunities

**Layout:** Hero banner + 3-column dashboard
**Source:** `outcomes.md`
**dataKey:** `research`

**Structure:**

```html
<div class="slide" id="slide-opportunities">
  <!-- HERO BANNER -->
  <div class="hero-strip">
    <div class="hero-title">{job}</div>
    <div class="hero-subtitle">
      <div class="dimension-pills">
        <span class="dimension-pill"><span class="dimension-label">Time</span> {time}</span>
        <span class="dimension-pill"><span class="dimension-label">Social</span> {social}</span>
        <span class="dimension-pill"><span class="dimension-label">Need</span> {need}</span>
        <span class="dimension-pill"><span class="dimension-label">Struggle</span> {struggle}</span>
      </div>
    </div>
    <div class="hero-meta">
      <span class="status-dot {confidenceColor}"></span> {confidenceReason}
    </div>
  </div>

  <!-- 3-COLUMN DASHBOARD -->
  <div class="slide-body three-col">
    <div class="col-pane bg-warm">
      <div class="section-header">Top Opportunities</div>
      <!-- outcome cards -->
    </div>
    <div class="col-pane">
      <div class="section-header">Key Data</div>
      <table class="brief-table">
        <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
        <!-- rows with source links: <a class="evidence-source" href="{url}">{source}</a> -->
      </table>
    </div>
    <div class="col-pane">
      <div class="section-header">Open Questions</div>
      <!-- question items -->
    </div>
  </div>
</div>
```

If `briefData.occasion` is null (non-occasion idea), omit the dimension
pills from the hero and show the key data / open questions in a simpler
two-column layout instead.
