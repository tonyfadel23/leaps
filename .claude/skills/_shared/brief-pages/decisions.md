# Brief Page: Decisions

**Layout:** Two-pane (status + log)
**Source:** `decisions.md`
**dataKey:** `decisionLog`

**Structure:**

```html
<div class="slide" id="slide-decisions">
  <!-- HERO -->
  <div class="hero-strip">
    <div class="hero-title">Decisions</div>
    <div class="hero-subtitle">
      {openCount} open <span class="meta-sep">·</span> {resolvedCount} resolved
    </div>
  </div>

  <div class="slide-body two-pane">
    <div class="pane-left">
      <!-- OPEN (top — needs attention first) -->
      <div class="section-header">Open</div>
      <div class="decision-status-item open">{question}</div>

      <!-- RESOLVED (below) -->
      <div class="section-header">Resolved</div>
      <div class="decision-status-item resolved">{decision}</div>
    </div>
    <div class="pane-right flex-col bg-warm">
      <!-- FULL DECISION LOG grouped by stage -->
      <div class="decision-timeline">
        <div class="skill-group-header">/1 Learn</div>
        <div class="decision-card">
          <div class="decision-q">
            <span class="q-badge">Q</span>
            <span>{fullQuestion}</span>
          </div>
          <div class="decision-a">{fullAnswer}</div>
          <!-- optional tag badges -->
        </div>
        <!-- more entries -->

        <div class="skill-group-header">/2 Explore</div>
        <!-- ... -->
      </div>
    </div>
  </div>
</div>
```

**Content rule:** Use full text from `decision-log.md` — don't abbreviate.
The log preserves PM reasoning.
