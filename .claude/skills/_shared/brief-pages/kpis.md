# Brief Page: KPIs

**Layout:** Two-pane
**Source:** `metrics.md`
**dataKey:** `metrics`

**Structure:**

```html
<div class="slide" id="slide-kpis">
  <!-- HERO -->
  <div class="hero-strip">
    <div class="hero-title">Success Metrics</div>
    <div class="hero-subtitle">
      Aligned to: <strong>{goal}</strong> via {mechanism}
    </div>
  </div>

  <div class="slide-body two-pane">
    <div class="pane-left">
      <!-- NORTH STAR (prominent) -->
      <div class="north-star-card">
        <div class="north-star-name">{northStarName}</div>
        <div class="north-star-values">
          {baseline} → {target}
          <span class="meta-sep">·</span>
          <span class="pill pill-{confidence}">{confidenceLabel}</span>
        </div>
      </div>

      <!-- INPUT METRICS TABLE -->
      <div class="section-header">Input Metrics</div>
      <table class="brief-table">
        <thead><tr><th>Metric</th><th>Baseline</th><th>Target</th><th>Conf</th></tr></thead>
        <tbody><!-- input rows --></tbody>
      </table>

      <!-- KILL CRITERIA -->
      <div class="section-header">Kill Criteria</div>
      <ul class="kill-list">
        <li class="kill-item">{condition} — {timeframe}</li>
      </ul>
    </div>
    <div class="pane-right" style="padding:0;">
      <!-- METRIC TREE (visual hierarchy — centered cards with tree lines) -->
      <div class="metric-tree">
        <div class="metric-section-label">North Star</div>
        <div class="metric-card north-star">
          <div class="metric-name">{northStarName}</div>
          <div class="metric-values"><span class="conf-dot conf-{conf}"></span> {baseline} → {target} · Outcome #{n} (Opp: {score})</div>
        </div>
        <div class="tree-line"></div>
        <div class="metric-section-label">Input Metrics</div>
        <!-- Pair input metrics side-by-side in .metric-row -->
        <div class="metric-row">
          <div class="metric-card input">
            <div class="metric-name">{name}</div>
            <div class="metric-values"><span class="conf-dot conf-{conf}"></span> {baseline} → {target}</div>
            <div class="metric-conf">Outcome #{n} (Opp: {score})</div>
          </div>
          <div class="metric-card input"><!-- ... --></div>
        </div>
        <div class="tree-line"></div>
        <div class="metric-section-label">Guardrails (kill signals)</div>
        <div class="metric-card guardrail">
          <div class="metric-name">{name}</div>
          <div class="metric-values"><span class="conf-dot conf-{conf}"></span> Must stay: {threshold}</div>
        </div>
      </div>
    </div>
  </div>
</div>
```
