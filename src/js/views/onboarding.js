// First-run onboarding — a 4-step welcome that sets LEAPs up and explains it.
// Shown (gated in app.js) until the user finishes; persisted via completeOnboarding.
window.OnboardingView = (() => {
  const { esc } = window.H;
  const I = window.Icons;

  const STEPS = ['Welcome', 'Connect', 'Design', 'Context', 'Start'];
  const STAGES = [
    ['Learn', 'Sharpen a fuzzy idea into a clear problem'],
    ['Explore', 'Prototype solutions before touching metrics'],
    ['Assess', 'Set success criteria, baselines, kill criteria'],
    ['Prove', 'Test feasibility, pick a direction'],
    ['Ship', 'Mid-fi prototype + stress test + checklist'],
  ];

  function dots(step) {
    return `<div class="onb-dots">${STEPS.map((label, i) =>
      `<span class="onb-dot ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}" title="${esc(label)}"></span>`
    ).join('')}</div>`;
  }

  // ── Step 0: Welcome ──
  function welcome() {
    return `
      <div class="onb-hero">
        <span class="onb-logo">${I.leap({ w: 32, stroke: '#fff' })}</span>
        <h1>Welcome to LEAPs</h1>
        <p class="onb-lede">Turn any fuzzy idea into a conviction-ready decision. LEAPs interviews you, pulls real evidence, and scores how convinced you should be — so you <b>build conviction or kill it cleanly</b>.</p>
      </div>
      <div class="onb-flow">
        ${STAGES.map(([name, desc], i) => `
          <div class="onb-flow-stage">
            <div class="onb-flow-num">${i + 1}</div>
            <div class="onb-flow-name">${name}</div>
            <div class="onb-flow-desc">${desc}</div>
          </div>`).join('')}
      </div>
      <div class="onb-outcomes">
        <span class="onb-oc" style="color:var(--pursue);background:var(--pursue-weak)">Pursue</span>
        <span class="onb-oc" style="color:var(--needs);background:var(--needs-weak)">Needs more</span>
        <span class="onb-oc" style="color:var(--kill);background:var(--kill-weak)">Kill</span>
        <span class="onb-oc-note">a rigor-gated 0-100 verdict on every concept</span>
      </div>`;
  }

  // ── Step 1: Connect Claude + folder + tools ──
  function connect(s) {
    const st = s.settings || {};
    const cx = s.connectors;
    const signedIn = st.loginMethod === 'subscription';
    const count = cx && cx.count != null ? cx.count : null;
    return `
      <div class="onb-step-h"><h2>Connect your tools</h2><p>LEAPs uses your own Claude login and your data tools — nothing is hosted.</p></div>
      <div class="onb-rows">
        <div class="onb-row">
          <span class="onb-ic">${I.sparkle({ w: 18, stroke: 'var(--accent-ink)' })}</span>
          <div class="onb-row-b"><div class="onb-row-t">Claude engine</div>
            <div class="onb-row-d">${signedIn ? 'Signed in with your Claude subscription.' : 'Sign in once so discovery can run on your plan (not an API key).'}</div></div>
          ${signedIn
            ? `<span class="onb-ok">${I.check({ w: 14 })} Connected</span>`
            : (s.signingIn
                ? `<span class="onb-wait">${I.clock({ w: 13 })} Finish in Terminal…</span>`
                : `<button class="onb-btn sm" data-action="sign-in">Sign in</button>`)}
        </div>
        <div class="onb-row">
          <span class="onb-ic">${I.folder({ w: 18 })}</span>
          <div class="onb-row-b"><div class="onb-row-t">Concepts folder</div>
            <div class="onb-row-d">${esc(s.pipelineDir || st.pipelineDir || 'Using the bundled sample. Pick a folder to keep your own concepts.')}</div></div>
          <button class="onb-btn sm ghost" data-action="pick-folder">Choose…</button>
        </div>
        <div class="onb-row">
          <span class="onb-ic">${I.plug({ w: 18 })}</span>
          <div class="onb-row-b"><div class="onb-row-t">Data sources</div>
            <div class="onb-row-d">${count != null
              ? `${count} source${count === 1 ? '' : 's'} wired. Run <code>/setup</code> to add your BI, analytics, or design tools.`
              : 'Map your tools in <code>connectors.yaml</code> (run <code>/setup</code>), and add your role + company in <code>business-context.md</code>.'}</div></div>
        </div>
      </div>`;
  }

  // ── Step 2: Design system (optional) ──
  function designStep(s) {
    const draft = s.figmaDraft != null ? s.figmaDraft : '';
    return `
      <div class="onb-step-h"><h2>Your design system <span class="onb-opt">optional</span></h2>
        <p>Prototypes use design tokens. The default is brand-neutral — paste your Figma file URL to use your company's system, or skip and connect it later in Settings.</p></div>
      <div class="onb-rows">
        <div class="onb-row">
          <span class="onb-ic">${I.palette({ w: 18 })}</span>
          <div class="onb-row-b"><div class="onb-row-t">Figma file URL</div>
            <div class="onb-row-d"><input class="onb-figma" data-figma-url value="${esc(draft)}" placeholder="https://www.figma.com/file/…  (optional)" spellcheck="false" /></div></div>
        </div>
      </div>
      <div class="onb-note">${I.sparkle({ w: 13 })} You can sync tokens anytime from Settings → Design system. Skipping keeps the neutral default.</div>`;
  }

  // ── Step 3: Your context ──
  function contextStep(s) {
    const c = s.contextDraft || {};
    const field = (key, label, ph) => `<label class="onb-ctx-f"><span>${label}</span>`
      + `<input data-ctx-field="${key}" value="${esc(c[key] || '')}" placeholder="${esc(ph)}" spellcheck="false" /></label>`;
    return `
      <div class="onb-step-h"><h2>Your context</h2><p>So LEAPs grounds every question in your business, not generic theory. Change it anytime in Settings.</p></div>
      <div class="onb-ctx">
        ${field('company', 'Company — what you do', 'e.g. on-demand delivery marketplace')}
        ${field('role', 'Your role', 'e.g. Senior PM')}
        ${field('scope', 'Your scope', 'e.g. retention & loyalty')}
        ${field('goals', 'Goals / priorities', 'e.g. lift 90-day retention 5pts')}
      </div>`;
  }

  // ── Step 4: How to use ──
  function start() {
    const cmds = [
      ['/1 learn', 'Start grinding an idea into a sharp problem'],
      ['/pipeline', 'See every concept and its conviction at a glance'],
      ['/grill-me', 'Stress-test your thinking'],
      ['/eval', 'Score the quality + audit conviction'],
    ];
    return `
      <div class="onb-step-h"><h2>You're set</h2><p>Type an idea into a concept's conversation, or run a command. LEAPs asks one question at a time and recomputes conviction as evidence lands.</p></div>
      <div class="onb-cmds">
        ${cmds.map(([c, d]) => `<div class="onb-cmd"><code>${esc(c)}</code><span>${esc(d)}</span></div>`).join('')}
      </div>
      <div class="onb-note">${I.folder({ w: 13 })} A sample concept (Guided onboarding) is loaded so you can look around right away.</div>`;
  }

  function render(s) {
    const step = s.onboardingStep || 0;
    const body = [welcome, connect, designStep, contextStep, start][step](s);
    const last = step === STEPS.length - 1;
    return `
    <div class="onboard">
      <div class="onb-card">
        <div class="onb-top">${dots(step)}
          <button class="onb-skip" data-action="onboarding-skip">${step > 0 ? 'Skip' : 'Skip setup'}</button>
        </div>
        <div class="onb-body">${body}</div>
        <div class="onb-foot">
          ${step > 0 ? `<button class="onb-btn ghost" data-action="onboarding-back">${I.chevLeft({ w: 15 })} Back</button>` : '<span></span>'}
          ${last
            ? `<button class="onb-btn" data-action="onboarding-finish">Open LEAPs ${I.arrow({ w: 15 })}</button>`
            : `<button class="onb-btn" data-action="onboarding-next">Continue ${I.chevRight({ w: 15 })}</button>`}
        </div>
      </div>
    </div>`;
  }

  return { render };
})();
