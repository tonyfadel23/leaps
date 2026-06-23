# Brief Page: Scope

**Layout:** Two-pane + build context footer
**Source:** `scope.md`
**dataKey:** `whatToBuild`

**Structure:**

```html
<div class="slide" id="slide-scope">
  <div class="slide-with-footer">
    <!-- HERO -->
    <div class="hero-strip">
      <div class="hero-title">Scope</div>
      <div class="hero-subtitle">{directionName} — Phase 1</div>
    </div>

    <!-- TWO-PANE: yes vs no/later -->
    <div class="slide-body two-pane">
      <div class="pane-left bg-warm">
        <div class="section-header">Build</div>
        <div class="scope-item build">{item}</div>
        <!-- ... -->
      </div>
      <div class="pane-right flex-col">
        <div class="section-header">Don't Build</div>
        <div class="scope-item dont">{item}</div>
        <!-- ... -->

        <div class="section-header">Later</div>
        <div class="later-item">
          <span class="phase-badge">P2</span> {item}
        </div>
        <!-- ... -->
      </div>
    </div>

    <!-- BUILD CONTEXT FOOTER -->
    <div class="slide-footer">
      <div class="section-header">Build Context</div>
      <table class="build-context-table">
        <thead><tr><th>Component</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr>
            <td>{component}</td>
            <td><span class="status-dot {statusColor}"></span> {statusLabel}</td>
            <td>{notes}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

Status colors: green = Exists, yellow = Modify, red = New.
