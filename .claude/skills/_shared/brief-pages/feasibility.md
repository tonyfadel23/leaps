# Brief Page: Feasibility

**Layout:** Two-pane, formula-driven + narrative
**Source:** `feasibility.md`
**dataKey:** `feasibility`

**Feasibility Formula:**

```
Component Score = Effort x (1 + Dependencies) x Risk x Criticality x AI Readiness

| Factor         | Values                                      |
|----------------|---------------------------------------------|
| Effort         | 1 (S) / 2 (M) / 4 (L) / 8 (XL)            |
| Dependencies   | 0 / 1 / 2 / 3                               |
| Risk           | 1.0 / 1.5 / 2.0                             |
| Criticality    | 1.0 (low) / 1.5 (core) / 2.0 (payments)    |
| AI Readiness   | 0.5 (ready) / 0.75 (partial) / 1.0 (none)  |

Feature Score = (Sum of Component Scores) x Coordination Factor
Coordination: 1.0 (1 team) / 1.3 (2 teams) / 1.6 (3 teams) / 2.0 (4+ teams)
```

AI Readiness **reduces** cost — it's a discount when AI infrastructure exists.

**Structure:**

```html
<div class="slide" id="slide-feasibility">
  <!-- HERO -->
  <div class="hero-strip">
    <div class="hero-title">Feasibility</div>
    <div class="hero-subtitle">
      <span class="feasibility-score">{featureScore}</span>
      <span class="meta-sep">·</span>
      <span>{teamCount} teams</span>
    </div>
    <div class="hero-meta">{bottleneckNarrative}</div>
  </div>

  <div class="slide-body two-pane">
    <div class="pane-left">
      <!-- COMPONENT SCORES (sorted by score desc) -->
      <div class="section-header">Component Scores</div>
      <table class="brief-table">
        <thead><tr><th>Component</th><th>Score</th><th>Driver</th></tr></thead>
        <tbody><!-- rows sorted by score descending --></tbody>
      </table>

      <!-- COORDINATION -->
      <div class="coordination-badge">
        x{coordinationFactor} coordination ({teamCount} teams: {teamNames})
      </div>

      <!-- AI READINESS -->
      <div class="ai-readiness">
        <div class="ai-readiness-label">AI Readiness</div>
        <div class="ai-readiness-text">{aiReadinessNarrative}</div>
      </div>
    </div>
    <div class="pane-right flex-col bg-warm">
      <!-- RISK REGISTER -->
      <div class="section-header">Risk Register</div>
      <div class="risk-card {severity}">
        <div class="risk-name">{risk} <span class="pill pill-{color}">{severity}</span></div>
        <div class="risk-detail">{mitigation}</div>
      </div>

      <!-- DEPENDENCIES -->
      <div class="section-header">Dependencies</div>
      <table class="brief-table">
        <thead><tr><th>Dependency</th><th>Owner</th><th>Status</th></tr></thead>
        <tbody><!-- rows --></tbody>
      </table>
    </div>
  </div>
</div>
```
