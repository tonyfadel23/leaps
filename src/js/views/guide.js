// Guide — an in-depth reference for a PM using LEAPs. Distinct from onboarding
// (which is first-run setup). A left-rail of sections + readable content drawn
// from SKILLS.md / CLAUDE.md. Opened from the topbar Guide button.
window.GuideView = (() => {
  const { esc } = window.H;
  const I = window.Icons;

  const STAGES = [
    ['1', 'learn', 'Learn', 'Raw idea → a sharp JTBD problem statement. Interviews and context retrieval sharpen what the real job is.', 'Learned'],
    ['2', 'explore', 'Explore', 'Problem → lo-fi HTML prototypes + journey maps. Sketch the experience before defining metrics.', 'Explored'],
    ['3', 'assess', 'Assess', 'Sketches → success criteria, KRs, baselines, and kill criteria. Make it measurable.', 'Assessed'],
    ['4', 'prove', 'Prove', 'Test feasibility, map dependencies, score competing directions, pick one.', 'Proven'],
    ['5', 'ship', 'Ship', 'Mid-fi prototype + stress-test against the metric tree + a release checklist.', 'Shipped'],
  ];
  const UTILITIES = [
    ['/setup', 'Wire your data tools (connectors.yaml). --sync-design pulls Figma tokens.'],
    ['/pipeline', 'Portfolio view. --rank prioritizes by conviction, --cost a usage report.'],
    ['/grill-me', 'Relentless interrogation of your assumptions and gaps.'],
    ['/eval', 'Quality checks + conviction-integrity audit (Tier-1 structural + Tier-2 judge).'],
    ['/prd', 'Compile artifacts into a vibe-coding handoff prompt. --publish deploys the brief.'],
    ['/landscape', 'Source docs → a JTBD landscape with sized bets + a scaffolded pipeline.'],
    ['/import', 'Pull existing PRDs / one-pagers into the pipeline.'],
    ['/archive', 'Archive or restore concepts.'],
  ];
  const AGENTS = [
    ['pm-proxy', 'Answers a pipeline question as a senior PM would — drawn from your business-context.'],
    ['pm-challenger', 'Stress-tests any phase output in an opinionated senior-PM voice.'],
    ['pm-orchestrator', 'A first-pass /learn→/5 run with senior-PM judgment.'],
    ['data-analyst', 'Sizing + baselines from your connected data sources.'],
    ['brief-builder', 'Renders the pipeline brief deck.'],
    ['interviewer / context-retriever', 'The /learn pair — sharpen the problem, pull prior work.'],
    ['architecture-scout / feasibility-interviewer', 'The /prove pair — can we build it, what does it depend on.'],
    ['stress-tester', 'The /ship adversary — runs the prototype against kill criteria.'],
  ];
  const PRACTICES = [
    ['Concrete before measurable', 'Sketch the experience in /explore before you define KRs in /assess. Numbers on a vague idea are theater.'],
    ['Source everything', 'Conviction can be grounded up with cited data, never talked up. A claim tagged [data:…] lifts evidence; [pm]/[inferred] does not.'],
    ['A clean kill is a win', 'Killing a weak idea early frees the team. Low conviction with sourced evidence is a real, defensible outcome.'],
    ['One question at a time', 'Skills interview you — answer one, see the next. Don\'t batch; the follow-ups adapt to what you said.'],
    ['Re-run upstream freely', 'Discovery is non-linear. Re-running /learn marks downstream artifacts stale; the pipeline tracks what needs refreshing.'],
    ['Ground it in your world', 'Fill in Settings → Context (company, role, goals) so every question is about your business, not generic product theory.'],
  ];

  const SECTIONS = ['Overview', 'The pipeline', 'Skills', 'Agents', 'Conviction', 'Connect data', 'Best practices'];

  function overview() {
    return `
      <p class="gd-lede">LEAPs turns a fuzzy idea into a conviction-ready decision through five conversational stages. You talk; specialist agents pull evidence; a rigor-gated model scores how convinced you should be — so you <b>build conviction or kill the idea</b>, instead of debating decks.</p>
      <div class="gd-flow">${STAGES.map(([n,,name]) => `<div class="gd-flow-i"><span class="gd-flow-n">${n}</span>${name}</div>`).join('<span class="gd-flow-a">→</span>')}</div>
      <p class="gd-p">Everything runs on your machine and drives your own Claude. Each concept is a folder of plain files. Start a concept with <b>+ New idea</b> or <code>/learn</code>, then just type.</p>`;
  }
  function pipeline() {
    return `<p class="gd-p">Five chainable stages. Each is conversation-first and ends by recommending the next. Run them as <code>/learn</code>…<code>/ship</code> or by name.</p>
      ${STAGES.map(([n, cmd, name, desc, stage]) => `
        <div class="gd-card"><div class="gd-card-h"><span class="gd-cmd">/${n} ${cmd}</span><span class="gd-stage">${stage}</span></div>
          <div class="gd-card-b">${esc(desc)}</div></div>`).join('')}`;
  }
  function skills() {
    return `<p class="gd-p">Beyond the five stages, utility skills manage the portfolio and sharpen your thinking.</p>
      ${UTILITIES.map(([cmd, desc]) => `<div class="gd-row"><code>${esc(cmd)}</code><span>${esc(desc)}</span></div>`).join('')}`;
  }
  function agents() {
    return `<p class="gd-p">Skills delegate to specialist agents — each does one job (interview, research, prototype, score). You don't call them directly; the skills orchestrate them. The notable ones:</p>
      ${AGENTS.map(([name, desc]) => `<div class="gd-row"><code>${esc(name)}</code><span>${esc(desc)}</span></div>`).join('')}`;
  }
  function conviction() {
    return `<p class="gd-p">Every concept gets a <b>0–100 conviction score</b> and a verdict — <b>Pursue / Needs more / Kill</b> — from four weighted dimensions:</p>
      <div class="gd-dims">
        <div class="gd-dim"><b>Problem</b> 25% — is the pain real and validated?</div>
        <div class="gd-dim"><b>Size</b> 25% — is the opportunity material, with live (not modeled) sizing?</div>
        <div class="gd-dim"><b>Feasibility</b> 20% — can it be built and operated?</div>
        <div class="gd-dim"><b>Evidence quality</b> 30% — what share of claims trace to a real source?</div>
      </div>
      <p class="gd-p"><b>The rigor wall:</b> a beautiful, fully-built idea whose claims are all assumed stays "Needs" — it can't reach Pursue. Only <i>sourced</i> evidence lifts it. Set where Pursue/Kill fall in Settings → Conviction.</p>`;
  }
  function connect() {
    return `<p class="gd-p">During discovery, agents pull real numbers from <b>your</b> tools via MCP servers — Looker, BigQuery, a data gateway, Figma, Jira, anything with an MCP.</p>
      <div class="gd-row"><code>/setup</code><span>Scan your MCPs and bind each role (metrics, knowledge base, design…) to a source.</span></div>
      <div class="gd-row"><code>Settings → Data sources</code><span>Edit role→MCP bindings, apply a preset, add or remove sources.</span></div>
      <p class="gd-p">No tools connected? LEAPs still works — it asks you to paste data or flags the gap honestly. It never fabricates numbers.</p>`;
  }
  function practices() {
    return PRACTICES.map(([t, d]) => `<div class="gd-card"><div class="gd-card-h"><span class="gd-prac-t">${esc(t)}</span></div><div class="gd-card-b">${esc(d)}</div></div>`).join('');
  }

  function body(sec) {
    switch (sec) {
      case 'The pipeline': return pipeline();
      case 'Skills': return skills();
      case 'Agents': return agents();
      case 'Conviction': return conviction();
      case 'Connect data': return connect();
      case 'Best practices': return practices();
      default: return overview();
    }
  }

  function render(s) {
    const sec = s.guideSection || 'Overview';
    return `
    <div class="modal-overlay" data-action="close-guide">
      <div class="modal guide-modal tabbed" data-stop="1">
        <div class="set-rail">
          <div class="set-rail-h"><span class="badge">${I.research({ w:16 })}</span><span>Guide</span></div>
          ${SECTIONS.map(n => `<button class="set-tab ${sec === n ? 'on' : ''}" data-action="guide-section" data-section="${esc(n)}">${n}</button>`).join('')}
        </div>
        <div class="set-main">
          <div class="set-main-head"><div class="t">${esc(sec)}</div>
            <button class="icon-btn sq" data-action="close-guide">${I.x({ w:17 })}</button></div>
          <div class="set-main-body gd-body">${body(sec)}</div>
        </div>
      </div>
    </div>`;
  }

  return { render, body };
})();
