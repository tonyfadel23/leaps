# Brief Page: Journey

**Layout:** Full-width stacked — insights strip + storyboard + service blueprint
**Source:** `journey.md`
**dataKey:** `journey`

Three stacked sections, each in a white card container:
1. **Insights strip** — 3 cards summarizing the journey's key findings
2. **Storyboard** (warm bg) — 5 comic panels showing the customer's emotional arc
3. **Service blueprint** — swimlane grid (Customer / Frontstage / Backstage / Support)

**Structure:**

```html
<div class="slide" id="slide-journey">
  <!-- HERO -->
  <div class="hero-strip">
    <div class="hero-title">Customer Journey</div>
    <div class="hero-subtitle">{directionName} — {directionDescription}</div>
  </div>

  <div class="slide-body" style="padding:16px 24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto;">

    <!-- INSIGHTS — white card -->
    <div class="card" style="padding:16px;">
      <div class="section-header">Key Insights</div>
      <div class="insights-strip">
        <!-- Repeat for each insight (exactly 3) -->
        <div class="insight-card {highlightClass}">
          <div class="insight-icon">{icon}</div>
          <div class="insight-body">
            <div class="insight-title">{insightTitle}</div>
            <div class="insight-text">{insightText}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- STORYBOARD — white card with warm inner bg -->
    <div class="card" style="padding:0;">
      <div class="storyboard-section">
        <div class="section-header" style="padding:12px 16px 0;">Customer Story</div>
        <div class="storyboard" style="padding:12px 16px 14px;">
          <!-- Repeat for each panel (exactly 5), with sb-arrow between -->
          <div class="sb-panel">
            <div class="sb-frame {interventionClass}">
              <div class="sb-scene" {interventionBg}>
                <div class="icon">{sceneIcon}</div>
                <div class="sb-thought">{thought}</div>
              </div>
              <div class="sb-emotion {emotionClass}">{emotionLabel}</div>
            </div>
            <div class="sb-caption">{caption}</div>
            <div class="sb-detail">{detail}</div>
          </div>
          <div class="sb-arrow">&rarr;</div>
          <!-- next panel... -->
        </div>
      </div>
    </div>

    <!-- SERVICE BLUEPRINT — white card -->
    <div class="card" style="padding:16px;">
      <div class="section-header">Service Blueprint</div>
      <div class="bp-grid">
        <!-- Header row: label + 5 stage columns -->
        <div class="bp-cell header label">Layer</div>
        <div class="bp-cell header">{stage1}</div>
        <div class="bp-cell header">{stage2}</div>
        <div class="bp-cell header">{stage3}</div>
        <div class="bp-cell header">{stage4}</div>
        <div class="bp-cell header">{stage5}</div>

        <!-- Customer row -->
        <div class="bp-cell label">Customer</div>
        <div class="bp-cell {interventionClass}">
          <div class="bp-title">{title}</div>
          <div class="bp-detail">{detail}</div>
        </div>
        <!-- ...repeat for each stage -->

        <!-- Frontstage row -->
        <div class="bp-cell label">Frontstage</div>
        <!-- ...5 cells -->

        <!-- Line of visibility -->
        <div class="bp-visibility">LINE OF VISIBILITY — customer does not see below</div>

        <!-- Backstage row -->
        <div class="bp-cell label">Backstage</div>
        <!-- ...5 cells -->

        <!-- Support row -->
        <div class="bp-cell label">Support</div>
        <!-- ...5 cells -->
      </div>
    </div>

  </div>
</div>
```

**Storyboard rules:**
- Exactly 5 panels with arrows between them (no arrow after the last panel)
- First 1-2 panels show the pain (`.sb-emotion.negative`, plain `.sb-frame`)
- Intervention panels get `.sb-frame.intervention` + orange scene bg
- Last panel shows the outcome (`.sb-emotion.positive`)
- Thought bubbles are short (max ~6 words)

**Blueprint rules:**
- Grid has exactly 5 stage columns + 1 label column
- Stage columns should align with storyboard panels
- Intervention cells get `.bp-cell.intervention` (orange bg)
- Line of visibility separates customer-visible from internal layers

**Insights rules:**
- Exactly 3 cards. One gets `.highlight` class (the intervention value card).
- Keep titles to 3-5 words. Keep text to 1-2 sentences.
- Pattern: pain insight, intervention value (highlight), outcome data.
