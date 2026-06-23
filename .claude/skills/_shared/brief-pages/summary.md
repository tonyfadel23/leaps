# Brief Page: Summary

**Layout:** Two-pane + prototype phone frame
**Source:** `summary.md`
**Always shown** (dataKey: null)

The summary is a **decision card** — a stakeholder reads this and either
leans in or moves on.

**bet-headline framing:** The headline is NOT a feature description ("Let users do X").
It frames the occasion + JTBD as a strategic insight — the "why this matters" for
executives. Pattern: "When [occasion], [audience] need [job outcome]."
Example: "When medication runs low, patients need refills without the cognitive
burden of remembering and reordering" — NOT "Let chronic-condition patients
auto-refill medications through the app."

**Structure:**

```html
<div class="slide active" id="slide-summary">
  <div class="slide-body two-pane">
    <div class="pane-left">
      <!-- HERO TIER -->
      <div class="bet-slug">{pipelineSlug}</div>
      <div class="bet-headline">{betHeadline}</div>
      <div class="bet-context">
        <span class="pill pill-orange">{stage}</span> <span class="dot-sep">·</span>
        {occasionLabel} <span class="dot-sep">·</span>
        {opportunityLabel}
      </div>
      <!-- STATS STRIP — color-coded chips -->
      <div class="stats-strip">
        <div class="stat-chip chip-neutral"><span class="stat-value">{opportunity}</span><span class="stat-label">GMV potential</span></div>
        <div class="stat-chip chip-{complexityColor}"><span class="stat-value">{complexity}</span><span class="stat-label">Complexity</span></div>
        <div class="stat-chip chip-{confidenceColor}"><span class="stat-value">{confidenceLabel}</span><span class="stat-label">Confidence</span></div>
      </div>

      <!-- EXECUTIVE SUMMARY — 1-2 sentence thesis -->
      <div class="exec-summary">{execSummary}</div>

      <!-- EVIDENCE: 3 narrative proof bullets -->
      <div class="section-header">Evidence</div>
      <ul class="evidence-list">
        <li><strong>{stat1}</strong> — {interpretation1} <a class="evidence-source" href="{url1}">{source1}</a></li>
        <li><strong>{stat2}</strong> — {interpretation2} <a class="evidence-source" href="{url2}">{source2}</a></li>
        <li><strong>{stat3}</strong> — {interpretation3} <a class="evidence-source" href="{url3}">{source3}</a></li>
      </ul>

      <!-- SEEKING -->
      <div class="seeking-line"><span class="seeking-label">Seeking</span>{seeking}</div>

      <!-- FOOTER — producer + cost only -->
      <div class="metadata-footer">
        <div class="meta-row">
          <span><strong>{producer}</strong></span>
          <span class="meta-sep">·</span>
          <span>{sessions} sessions</span>
          <span class="meta-sep">·</span>
          <span>{estCost}</span>
        </div>
      </div>
    </div>
    <div class="pane-right bg-surface" style="display:flex;align-items:center;justify-content:center;">
      <!-- Phone frame wrapper with nav dots — uses brief.css phone classes -->
      <div class="phone-wrapper">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-home"></div>
          <div class="phone-screen">
            <iframe id="summaryProtoFrame" data-src="{prototype}" style="width:100%;height:100%;border:none;"></iframe>
          </div>
        </div>
        <div class="nav-dots">
          <div class="dots-row" id="summaryDots">
            <!-- JS populates from iframe's __screens array -->
          </div>
          <div class="screen-label" id="summaryLabel"></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Phone frame:** Same pattern as Variations page — brief renders its own
phone frame using `.phone-wrapper` / `.phone-frame` / `.phone-screen`.
Prototype runs in iframe mode (strips its own chrome). Nav dots sync
bidirectionally via postMessage. Use the same `setupPhoneDots()` JS
from the Variations page spec.

**Data fields used:**
- `betHeadline` — executive-facing headline: "When [occasion], [audience] need [job outcome]"
- `keyNumbers.opportunity`, `keyNumbers.complexity` — shown in stats strip
- `confidence.color`, `confidence.label` — shown in stats strip
- `occasionLabel`, `opportunityLabel` — short labels for bet context
- `stage` — pipeline stage badge
- `execSummary` — 1-2 sentence thesis TL;DR (new field)
- `executiveSummary[]` — exactly 3 items, each with `text`, `source`, `sourceUrl`
- `seeking` — what the producer wants from the reader
- `producer` — single name
- `pipelineCost.sessions`, `pipelineCost.estCost`
