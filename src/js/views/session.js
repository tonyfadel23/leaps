// Session view — 2-pane: conversation (left) + tabbed brief (right) + expanded modal.
window.SessionView = (() => {
  const { status, segs, strengthColor, esc } = window.H;
  const I = window.Icons;

  // ── conversation message renderers ──
  const aiWrap = (idea, m, inner) => `
    <div class="msg-ai">
      <div class="ai-avatar">${I.sparkle({ w:16, stroke:'var(--accent-ink)' })}</div>
      <div class="ai-body">
        <div class="ai-head"><span class="who">LEAPs</span>${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ''}</div>
        ${inner}
      </div>
    </div>`;

  function sizingCard(idea) {
    const z = idea.sizing; if (!z) return '';
    const rows = z.rows.map(r => `
      <div class="kv-row">
        <div><div class="m">${esc(r.m)}</div>
          <div class="s"><i style="background:${r.dot}"></i>${esc(r.s)}</div></div>
        <span class="v">${esc(r.v)}</span>
      </div>`).join('');
    return `
    <div class="card-block">
      <div class="hd"><span class="t">Market sizing</span>
        <span class="live-dot"><i></i>${esc(z.liveLabel || '')}</span></div>
      ${rows}
      <div class="note">${esc(z.note)}</div>
    </div>`;
  }

  function journeyTrack(steps, big) {
    return steps.map((st, i) => `
      ${i > 0 ? '<div class="journey-line"></div>' : ''}
      <div class="journey-step ${st.friction ? 'friction' : ''}">
        <div class="jdot"></div>
        <span class="jt">${esc(st.t)}</span>
        <span class="jl">${esc(st.l)}</span>
        ${st.friction && st.note ? `<span class="jf">${esc(st.note)}</span>` : ''}
      </div>`).join('');
  }

  function journeyCard(idea) {
    const j = idea.journey; if (!j) return '';
    return `
    <div class="journey">
      <span class="t">Morning journey</span>
      <div class="journey-track">${journeyTrack(j.steps)}</div>
      <div class="note">${esc(j.note)}</div>
    </div>`;
  }

  function protoCard(idea, m) {
    return `
    <div class="proto-card">
      <span class="lede">${esc(m.text)}</span>
      <div class="proto-link" data-action="expand" data-exp="${esc(m.expand)}">
        <div class="phone-thumb"><i style="height:8px"></i><i class="mid"></i><i class="btm"></i></div>
        <div class="meta"><div class="t">Morning flow prototype</div><div class="s">Interactive · 4 screens</div></div>
        <span class="open">Open ${I.expand({ w:14, sw:2.2 })}</span>
      </div>
    </div>`;
  }

  function closingCard(idea, m) {
    return `
    <div class="closing">
      <span class="lede">${esc(m.text)}</span>
      <button class="ghost-btn" data-action="expand" data-exp="${esc(m.expand)}">
        ${I.chart({ w:14, stroke:'var(--needs)' })} View the queued data pull
      </button>
    </div>`;
  }

  // Models the PM can pick to grind an idea. Empty id = inherit the CLI default.
  // The ids are CLI --model aliases (always resolve to the current version) so the
  // switch can't fail on a stale pinned model string.
  const MODELS = [
    { id: '',       label: 'Default', sub: 'Inherit CLI default' },
    { id: 'opus',   label: 'Opus',    sub: 'Most capable' },
    { id: 'sonnet', label: 'Sonnet',  sub: 'Balanced' },
    { id: 'haiku',  label: 'Haiku',   sub: 'Fastest' },
  ];
  // Friendly name for any model id — our aliases, or a resolved id from a run
  // (e.g. "claude-opus-4-8" → "Opus 4.8").
  function modelShort(id) {
    if (!id) return 'Default';
    const m = MODELS.find(x => x.id === id);
    if (m) return m.label;
    const s = String(id).replace(/^claude-/, '');
    const fam = s.match(/^(opus|sonnet|haiku)/i);
    const ver = s.match(/(\d+)[-.](\d+)/);
    if (fam) return fam[1][0].toUpperCase() + fam[1].slice(1) + (ver ? ' ' + ver[1] + '.' + ver[2] : '');
    return s.replace(/-\d{6,}$/, '');
  }

  // One tool step inside a work group.
  function stepRow(st) {
    return `<div class="wstep ${st.kind === 'error' ? 'is-error' : ''}"><span class="wdot"></span><span class="wx">${esc(st.text)}</span></div>`;
  }

  // Collapsed "working" group — folds a run of tool calls into a single line instead
  // of a wall of chatty rows. Live: shows the latest step, pulsing. Done: collapses
  // to a count the PM can expand.
  function workGroup(m, i) {
    const steps = m.steps || [];
    const last = steps[steps.length - 1];
    const open = !!m.expanded;
    const label = m.running ? (last ? last.text : 'Working…')
      : `Worked through ${steps.length} step${steps.length === 1 ? '' : 's'}`;
    return `
    <div class="msg-work${m.running ? ' is-running' : ''}${open ? ' is-open' : ''}">
      <button class="work-head" data-action="toggle-work" data-mi="${i}">
        <span class="work-dot"></span>
        <span class="work-label">${esc(label)}</span>
        ${steps.length ? `<span class="work-count">${steps.length}</span>` : ''}
        ${I.chevDown({ w:14, stroke:'var(--ink-3)' })}
      </button>
      ${open ? `<div class="work-steps">${steps.map(stepRow).join('')}</div>` : ''}
    </div>`;
  }

  // Quiet one-line run status (model + connected data) shown when a run connects.
  function statusRow(m) {
    const bits = [];
    if (m.model) bits.push(modelShort(m.model));
    bits.push(m.mcp && m.mcp.length ? 'data: ' + m.mcp.join(', ') : 'no data sources');
    return `<div class="msg-status"><span class="st-dot"></span><span>Connected · ${esc(bits.join(' · '))}</span></div>`;
  }

  function errorRow(m) {
    return `<div class="msg-act is-error"><span class="act-dot"></span><span class="act-x">${esc(m.text)}</span></div>`;
  }

  // Footer card when a discovery run finishes — what moved + what it cost.
  function resultCard(m) {
    const bits = [];
    if (m.count) bits.push(`${m.count} new finding${m.count === 1 ? '' : 's'}`);
    if (m.cost != null) bits.push('$' + Number(m.cost).toFixed(2));
    const label = m.error ? 'Discovery stopped' : 'Discovery complete';
    return `
    <div class="msg-result ${m.error ? 'is-error' : ''}">
      ${m.summary ? `<div class="res-sum">${esc(m.summary)}</div>` : ''}
      <div class="res-meta"><span class="res-tick"></span><span>${label}${bits.length ? ' · ' + bits.join(', ') : ''}</span></div>
    </div>`;
  }

  function message(idea, m, i) {
    if (m.role === 'user') return `<div class="msg-user">${esc(m.text)}</div>`;
    if (m.kind === 'status') return statusRow(m);
    if (m.kind === 'work')   return workGroup(m, i);
    if (m.kind === 'error')  return errorRow(m);
    if (m.kind === 'result') return resultCard(m);
    let inner = '';
    if (m.kind === 'text')      inner = `<div class="ai-text">${esc(m.text)}</div>`;
    if (m.kind === 'live-text') inner = m.ask
      ? `<div class="ai-text md is-ask"><span class="ask-eyebrow">Your move</span>${window.MD.render(m.text)}</div>`
      : `<div class="ai-text md">${window.MD.render(m.text)}</div>`;
    if (m.kind === 'sizing')  inner = sizingCard(idea);
    if (m.kind === 'journey') inner = journeyCard(idea);
    if (m.kind === 'proto')   inner = protoCard(idea, m);
    if (m.kind === 'closing') inner = closingCard(idea, m);
    return aiWrap(idea, m, inner);
  }

  // Model picker popover (anchored above the composer toolbar).
  function modelMenu(s) {
    const cur = s.model || '';
    const items = MODELS.map(m => {
      // On the Default row, surface what it last resolved to so it's never opaque.
      const sub = (m.id === '' && s.resolvedModel) ? 'Currently ' + modelShort(s.resolvedModel) : m.sub;
      return `
      <button class="mm-item${m.id === cur ? ' active' : ''}" data-action="set-model" data-model="${esc(m.id)}">
        <span class="mm-l"><span class="mm-label">${esc(m.label)}</span><span class="mm-sub">${esc(sub)}</span></span>
        ${m.id === cur ? I.check({ w:15, stroke:'var(--accent)' }) : ''}
      </button>`;
    }).join('');
    return `<div class="pop model-pop" data-stop="1"><div class="pop-head">Model running discovery</div>${items}</div>`;
  }

  // Gemini-style "+" bottom sheet — every composer function lives here, off the
  // input bar: commands, attach, note, and the connected data sources.
  function plusSheet(sources, ctxFiles) {
    const srcItems = (sources && sources.length)
      ? sources.map(src => {
          const name = src.label || src.name || src.mcp || String(src);
          return `<button class="ps-item sub" data-action="insert-source" data-src="${esc(name)}">${esc(name)}</button>`;
        }).join('')
      : `<div class="ps-muted">None connected — wire them in Settings → Connectors.</div>`;
    return `
    <div class="plus-sheet" data-stop="1">
      <button class="ps-item" data-action="slash-open">${I.command({ w:16 })}<span>Commands</span><kbd>/</kbd></button>
      <button class="ps-item" data-action="add-context-file">${I.file({ w:15 })}<span>Attach files</span></button>
      <button class="ps-item" data-action="add-context-note">${I.plus({ w:16 })}<span>Add a note</span></button>
      ${ctxFiles && ctxFiles.length ? `<div class="ps-muted small">${I.folder({ w:13 })} ${ctxFiles.length} file${ctxFiles.length === 1 ? '' : 's'} in context</div>` : ''}
      <div class="ps-sep"></div>
      <div class="ps-label">${I.database({ w:14 })} Data sources</div>
      ${srcItems}
      <div class="ps-sep"></div>
      <button class="ps-item sub" data-action="open-connectors">${I.plug({ w:14 })}<span>Manage connectors</span></button>
    </div>`;
  }

  // Context-window fill for the running model. 1M for the long-context variants,
  // 200k otherwise. Used + percentage shown next to the model in the topbar.
  function modelWindow(id) { return /1m|\[1m\]/i.test(String(id || '')) ? 1000000 : 200000; }
  function fmtTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return String(n);
  }
  function ctxMeter(s) {
    const win = modelWindow(s.resolvedModel || s.model);
    const used = s.tokens || 0;
    const pct = Math.min(100, Math.round((used / win) * 100));
    return `<span class="ctx-meter${pct >= 80 ? ' hot' : ''}" title="${fmtTokens(used)} of ${fmtTokens(win)} tokens · ${pct}% of context window">
      <span class="ctx-bar"><i style="width:${pct}%"></i></span>
      <span class="ctx-txt">${fmtTokens(used)}/${fmtTokens(win)} · ${pct}%</span>
    </span>`;
  }

  // Live phase checklist (from the skill's TodoWrite), shown as a collapsible
  // strip between the conversation and the composer. Collapsed by default — the
  // header names the active phase so the PM always knows where they are.
  function taskStrip(s, idea) {
    const todos = idea.todos || [];
    if (!todos.length) return '';
    const done = todos.filter(t => t.status === 'completed').length;
    const active = todos.find(t => t.status === 'in_progress');
    const label = active ? (active.activeForm || active.content) : (done >= todos.length ? 'All phases complete' : 'Phase tasks');
    const open = !s.tasksCollapsed;
    const rows = open ? `<div class="task-rows">${todos.map(t => `
        <div class="task-row is-${esc(t.status || 'pending')}">
          <span class="task-dot"></span>
          <span class="task-text">${esc(t.status === 'in_progress' ? (t.activeForm || t.content) : t.content)}</span>
        </div>`).join('')}</div>` : '';
    return `
      <div class="task-strip${open ? ' is-open' : ''}">
        <button class="task-head" data-action="toggle-tasks">
          <span class="task-pulse${active ? ' on' : ''}"></span>
          <span class="task-label">${esc(label)}</span>
          <span class="task-count">${done}/${todos.length}</span>
          ${I.chevDown({ w:14, stroke:'var(--ink-3)' })}
        </button>
        ${rows}
      </div>`;
  }

  function conversation(s, idea) {
    const msgs = (idea.messages || []).map((m, i) => message(idea, m, i)).join('');
    const empty = !idea.messages || !idea.messages.length
      ? `<div class="empty"><h3>No conversation yet</h3><p>Start grinding this idea. Ask a question, type <b>/</b> for a move, or pick a suggestion.</p></div>` : '';

    // Suggestions belong to the conversation, not the input — render after the
    // last message (hidden while a run is in flight).
    const running = !!(s.discovery && s.discovery.running);
    const chips = (!running && idea.chips && idea.chips.length)
      ? `<div class="suggest">${idea.chips.map(c => `<button class="chip" data-action="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
      : '';
    const scroll = `<div class="conv-scroll">${msgs || empty}${chips}</div>`;

    if (running) {
      const inner = `<div class="working">
           <span class="work-dot"></span>
           <span class="work-x">${esc((s.discovery && s.discovery.activity) || 'Working…')}</span>
           <button class="stop-btn" data-action="stop-discovery">${I.x({ w:13, sw:2.4 })} Stop</button>
         </div>`;
      return `
      <section class="pane conversation" style="flex:none;width:${s.convWidth}px;min-width:300px">
        ${scroll}
        ${taskStrip(s, idea)}
        <div class="composer is-working">${inner}</div>
      </section>`;
    }

    const steerBar = s.activeDim ? (() => {
      const d = (idea.dimensions || []).find(x => x.key === s.activeDim);
      return d ? `
      <div class="steer">
        <i></i><span>Steering toward <b>${esc(d.label)}</b></span>
        <button data-action="clear-steer">${I.x({ w:13, sw:2.2 })}</button>
      </div>` : '';
    })() : '';

    const composer = `
      ${steerBar}
      <div class="prompt-shell">
        ${s.plusOpen ? plusSheet(s.connectedSources || [], s.contextFiles || []) : ''}
        <div class="slash-menu" id="slash-menu" hidden></div>
        <div class="input-row">
          <button class="plus-btn${s.plusOpen ? ' on' : ''}" data-action="plus-sheet" title="Commands, files, context, data">${I.plus({ w:18, sw:2.2 })}</button>
          <textarea id="composer-input" class="prompt-ta" rows="1" spellcheck="false"
            placeholder="Message LEAPs…">${esc(s.draft || '')}</textarea>
          <button class="send-btn" data-action="send" title="Send (Enter)">${I.arrow({ w:17, sw:2.1 })}</button>
        </div>
      </div>`;

    return `
    <section class="pane conversation" style="flex:none;width:${s.convWidth}px;min-width:300px">
      ${scroll}
      ${taskStrip(s, idea)}
      <div class="composer">${composer}</div>
    </section>`;
  }

  // ── brief pane tabs ──
  // Flat tab model — Verdict (LEAPs decision) + the real brief sections + Evidence.
  // No WHY/WHAT/HOW group labels; sections render natively from .briefdata.json.
  const TABS = [
    { key:'summary',       label:'Summary' },
    { key:'opportunities', label:'Opportunities' },
    { key:'competitors',   label:'Competitors' },
    { key:'journey',       label:'Journey' },
    { key:'prototype',     label:'Prototype' },
    { key:'kpis',          label:'KPIs' },
    { key:'scope',         label:'Scope' },
    { key:'feasibility',   label:'Feasibility' },
    { key:'decisions',     label:'Decisions' },
    { key:'prd',           label:'PRD' },
  ];

  function tabbar(s) {
    const tabs = TABS.map(t =>
      `<button class="tab ${s.activeTab === t.key ? 'active' : ''}" data-action="tab" data-tab="${t.key}">${t.label}</button>`
    ).join('');
    return `<div class="tabbar">${tabs}</div>`;
  }

  function verdictTab(idea) {
    const sm = status(idea.verdict);
    const dims = (idea.dimensions || []).map(d => {
      const isGap = idea.gap && idea.gap.dim === d.key;
      const active = false; // dim active state mirrors steering; kept subtle here
      return `
      <div class="dim-row ${active ? 'active' : ''}" data-action="steer" data-dim="${esc(d.key)}">
        <div class="label"><div class="n">${esc(d.label)}</div><div class="note">${esc(d.note)}</div></div>
        <div class="track"><i style="width:${d.score}%;background:${isGap ? 'var(--needs)' : 'var(--accent)'}"></i></div>
        <span class="sc" style="color:${isGap ? 'var(--needs)' : 'var(--ink-2)'}">${d.score}</span>
        ${I.chevRight({ w:15, stroke:'var(--ink-3)' })}
      </div>`;
    }).join('');

    const vopts = ['pursue','needs','kill'].map(k => {
      const m = status(k === 'kill' ? 'kill' : k);
      const sel = idea.verdict === k || (k === 'kill' && idea.verdict === 'kill');
      const label = k === 'pursue' ? 'Pursue' : k === 'needs' ? 'Needs more' : 'Kill';
      return `<button class="vbtn" data-action="set-verdict" data-verdict="${k}"
        style="${sel ? `background:${m.weak};border-color:${m.color};color:${m.color}` : ''}">${label}</button>`;
    }).join('');

    const gap = idea.gap ? `
      <div class="gap-box">
        <span class="eyebrow">${I.warn({ w:13, sw:2.2 })} Biggest gap</span>
        <span class="body">${esc(idea.gap.body)}</span>
        <button class="cta" data-action="steer" data-dim="${esc(idea.gap.dim)}">Steer the conversation here ${I.arrow({ w:14, sw:2.2 })}</button>
      </div>` : '';

    return `
    <div class="brief-col">
      <div>
        <div class="eyebrow" style="margin-bottom:13px">Decision · Verdict</div>
        <div class="verdict-hero">
          <span class="num" style="color:${sm.color}">${idea.conviction}</span>
          <div class="meta">
            <span class="pill" style="align-self:flex-start;height:26px;padding:0 12px;font-size:13px;background:${sm.weak};color:${sm.color}">
              <span class="dot"></span>${sm.label}</span>
            <span class="line">${esc(idea.verdictLine || '')} · conviction out of 100</span>
          </div>
        </div>
      </div>
      <div class="set-verdict"><span class="lbl">Set verdict</span><div class="opts">${vopts}</div></div>
      <div>
        <div class="eyebrow" style="margin-bottom:8px;letter-spacing:.08em">Four dimensions · click any to steer the chat</div>
        <div class="dims">${dims || '<p class="tab-p">No dimensions scored yet.</p>'}</div>
      </div>
      ${gap}
    </div>`;
  }

  // the interactive prototype artifact (sketches/*.html), if present
  function protoArtifact(idea) {
    return (idea.artifacts || []).find(a => a.id === 'proto' && a.isHtml && a.fileUrl) || null;
  }

  // right sub-pane: the live prototype, framed in a phone device (matches brief.html).
  // Prefers the raw chosen-variation screen over the showcase wrapper.
  function protoPreview(idea) {
    const a = protoArtifact(idea);
    const url = idea.prototypeUrl || (a && a.fileUrl);
    const label = idea.prototypeFile || (a && a.file) || 'prototype';
    if (!url) return `<div class="brief-preview empty-preview"><div class="empty"><h3>No prototype</h3><p>This idea has no interactive prototype yet.</p></div></div>`;
    return `
    <div class="brief-preview">
      <div class="preview-head">
        <span class="file-chip">${I.proto({ w:12 })} ${esc(label)}</span>
        ${a ? `<button class="ghost-btn" data-action="open-external" data-art="proto">${I.expand({ w:14 })} Full screen</button>` : ''}
      </div>
      <div class="preview-stage">
        <div class="phone-device">
          <div class="phone-bezel">
            <div class="phone-notch-bar"></div>
            <iframe class="phone-screen-frame" sandbox="allow-scripts allow-same-origin allow-popups" src="${esc(url)}" title="Prototype"></iframe>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Prototype tab right pane — the live phone, framed, showing the currently
  // selected variation screen (falls back to the chosen one). The variation
  // cards on the LEFT (BriefSections.variations) act as the selector. Mirrors
  // brief.html's Variations slide: cards left, phone right.
  function protoPhone(s, idea) {
    const vars = (idea.variations || []).filter(v => v.name);
    const sel = vars.find(v => String(v.id) === String(s.selectedVariation))
      || vars.find(v => v.chosen) || vars[0] || null;
    const a = protoArtifact(idea);
    const url = (sel && sel.fileUrl) || idea.prototypeUrl || (a && a.fileUrl);
    const label = (sel && sel.name) || idea.prototypeFile || 'prototype';
    if (!url) return `<div class="brief-preview empty-preview"><div class="empty"><h3>No prototype</h3><p>This idea has no interactive prototype yet.</p></div></div>`;
    return `
    <div class="brief-preview">
      <div class="preview-head">
        <span class="file-chip">${I.proto({ w:12 })} ${esc(label)}</span>
        ${a ? `<button class="ghost-btn" data-action="open-external" data-art="proto">${I.expand({ w:14 })} Full screen</button>` : ''}
      </div>
      <div class="preview-stage">
        <div class="phone-device">
          <div class="phone-bezel">
            <div class="phone-notch-bar"></div>
            <iframe class="phone-screen-frame" sandbox="allow-scripts allow-same-origin allow-popups" src="${esc(url)}" title="Prototype"></iframe>
          </div>
        </div>
      </div>
    </div>`;
  }

  function briefShell(s, inner) {
    return `<section class="pane brief">${tabbar(s)}${inner}</section>`;
  }
  // A two-pane brief layout. Not draggable — proportions are fixed and responsive
  // (CSS handles the ratio and collapses to a stack when the pane is narrow).
  // variant 'phone' → content left + device preview right; 'content' → wider left
  // (data/table) + secondary right (tree/timeline).
  function splitBody(left, right, variant) {
    const v = variant === 'content' ? 'is-content' : 'is-phone';
    return `
      <div class="brief-split ${v}">
        <div class="brief-body bs-left">${left}</div>
        ${right}
      </div>`;
  }

  function briefPane(s, idea) {
    const bd = idea.briefData;

    // Prototype tab = variation cards (left) + live phone (right), mirroring the
    // old Variations Explored slide. Clicking a card swaps the phone screen.
    if (s.activeTab === 'prototype') {
      const vfn = window.BriefSections && window.BriefSections.variations;
      const left = (bd && vfn)
        ? vfn(idea, bd, s.selectedVariation)
        : window.BK.col(window.BK.empty('No variations explored yet.'));
      return briefShell(s, splitBody(left, protoPhone(s, idea), 'phone'));
    }

    const fn = window.BriefSections && window.BriefSections[s.activeTab];
    const result = (bd && fn) ? fn(idea, bd) : window.BK.col(window.BK.empty(`No ${s.activeTab} data on file for this idea.`));

    // Summary pairs its content with the chosen prototype on the right.
    const proto = protoArtifact(idea);
    if (s.activeTab === 'summary' && (idea.prototypeUrl || proto)) {
      const left = typeof result === 'string' ? result : (result.left || '');
      return briefShell(s, splitBody(left, protoPreview(idea), 'phone'));
    }
    // content-defined split (e.g. Decisions: decisions · log; KPIs: metrics · tree)
    if (result && typeof result === 'object' && result.left && result.right) {
      return briefShell(s, splitBody(result.left, `<div class="brief-body bs-right">${result.right}</div>`, 'content'));
    }
    // single column
    return briefShell(s, `<div class="brief-body">${typeof result === 'string' ? result : (result.left || '')}</div>`);
  }

  // ── expanded modal ──
  const EXP = {
    proto:    { title:'Onboarding flow prototype', meta:'Interactive · 4 screens', icon:'proto' },
    data:     { title:'Activation cohort',          meta:'Data pull · queued',      icon:'data' },
    brief:    { title:'One-pager: Guided onboarding', meta:'Auto-drafted',          icon:'brief' },
    research: { title:'Onboarding interviews',       meta:'12 sessions · synthesized', icon:'research' },
  };

  function modal(idea, expId) {
    const art = (idea.artifacts || []).find(a => a.id === expId);
    const e = EXP[expId] || (art ? { title: art.title, meta: art.kind || art.meta, icon: art.icon || 'file' } : null);
    if (!e) return '';
    const wide = !!(art && art.isHtml);

    // Real HTML artifact (brief.html, sketches/*.html) → render the actual file inline.
    if (art && art.isHtml && art.fileUrl) {
      return `
      <div class="modal-overlay" data-action="close-modal">
        <div class="modal wide" data-stop="1">
          <div class="modal-head">
            <div class="l"><span class="badge">${I[e.icon] ? I[e.icon]({ w:17 }) : I.file({ w:17 })}</span>
              <div><div class="t">${esc(e.title)}</div><div class="meta">${esc(e.meta || '')}</div></div></div>
            <div style="display:flex;gap:8px">
              <button class="ghost-btn" data-action="open-external" data-art="${esc(expId)}">${I.expand({ w:14 })} Open externally</button>
              <button class="icon-btn sq" data-action="close-modal">${I.x({ w:17 })}</button>
            </div>
          </div>
          <div class="modal-body" style="padding:0">
            <iframe class="modal-frame" sandbox="allow-scripts allow-same-origin allow-popups" src="${esc(art.fileUrl)}" title="${esc(e.title)}"></iframe>
          </div>
        </div>
      </div>`;
    }

    let body = '';
    if (expId === 'data') {
      const d = (idea.expanded && idea.expanded.data) || null;
      if (d) {
        const bars = d.bars.map(b => `
          <div class="col">
            <div class="bx" style="height:${Math.round(b.score / 45 * 100)}%;background:${b.bg};color:${b.color}">${esc(b.val)}</div>
            <div class="cl">${esc(b.label)}</div>
          </div>`).join('');
        const quotes = d.quotes.map(q => `
          <div class="quote"><div class="t">${esc(q.text)}</div><div class="w">${esc(q.who)}</div></div>`).join('');
        body = `
          <div style="display:flex;flex-direction:column;gap:18px">
            <div class="data-warn">${I.clockDot({ w:17, stroke:'var(--needs)' })}<span><b>Queued · ETA 1 day.</b> ${esc(d.warn.replace(/^Queued · ETA 1 day\.\s*/,''))}</span></div>
            <div class="bars">${bars}</div>
            <div style="display:flex;flex-direction:column;gap:14px">${quotes}</div>
          </div>`;
      }
    } else if (expId === 'proto') {
      body = `
        <div class="proto-stage" style="justify-content:center">
          <div class="phone lg">
            <div class="phone-screen">
              <div class="phone-hero"><div class="greet">Welcome, Maya</div>
                <div class="h">Let’s get you set up</div><div class="eta">3 steps · about 2 minutes</div></div>
              <div class="phone-list">
                <div class="phone-item"><div class="thumb"></div><div><div class="t">Create your first project</div><div class="s">Step 1 of 3</div></div></div>
                <div class="phone-item"><div class="thumb"></div><div><div class="t">Invite a teammate</div><div class="s">Step 2 · optional</div></div></div>
                <button class="phone-cta">Start setup</button>
              </div>
            </div>
          </div>
          <div class="proto-notes">
            <h3>One guided path, before they bounce</h3>
            <p>The flow removes the guesswork that kills activation: a short checklist that drops new users straight into their first project instead of a blank workspace. Test it against the empty-state control to measure the activation lift.</p>
            <div class="pt"><i style="background:var(--pursue)"></i>2-minute median time to first project in 6 internal tests</div>
            <div class="pt"><i style="background:var(--needs)"></i>Activation impact still unmeasured. The open question.</div>
          </div>
        </div>`;
    } else {
      const openBtn = art ? `<button class="ghost-btn" data-action="open-external" data-art="${esc(expId)}">${I.expand({ w:14 })} Open ${esc(art.file || 'file')}</button>` : '';
      body = `<div style="display:flex;flex-direction:column;gap:14px">
        <p class="tab-p">${art ? esc(art.kind || '') : 'This artifact opens from the pipeline folder.'}</p>
        ${openBtn}</div>`;
    }

    return `
    <div class="modal-overlay" data-action="close-modal">
      <div class="modal" data-stop="1">
        <div class="modal-head">
          <div class="l"><span class="badge">${I[e.icon] ? I[e.icon]({ w:17 }) : I.file({ w:17 })}</span>
            <div><div class="t">${esc(e.title)}</div><div class="meta">${esc(e.meta)}</div></div></div>
          <button class="icon-btn sq" data-action="close-modal">${I.x({ w:17 })}</button>
        </div>
        <div class="modal-body">${body}</div>
      </div>
    </div>`;
  }

  function deleteModal(idea) {
    return `
    <div class="modal-overlay" data-action="cancel-delete">
      <div class="modal sm-modal" data-stop="1">
        <div class="modal-head"><div class="l"><span class="badge" style="background:var(--kill-weak);color:var(--kill)">${I.trash({ w:16 })}</span>
          <div><div class="t">Delete concept</div><div class="meta">${esc(idea.name)}</div></div></div></div>
        <div class="modal-body sm-body">
          <p class="sm-p">This permanently deletes the concept folder and everything in it — conversation, brief, prototypes, context. This can't be undone.</p>
          <div class="sm-foot">
            <button class="ghost-btn" data-action="cancel-delete">Cancel</button>
            <button class="danger-btn" data-action="confirm-delete" data-id="${esc(idea.id)}">Delete concept</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function noteModal(s) {
    return `
    <div class="modal-overlay" data-action="cancel-note">
      <div class="modal sm-modal" data-stop="1">
        <div class="modal-head"><div class="l"><span class="badge">${I.plus({ w:16 })}</span>
          <div><div class="t">Add context</div><div class="meta">Paste OKRs, goals, constraints — saved to the concept's context folder</div></div></div>
          <button class="icon-btn sq" data-action="cancel-note">${I.x({ w:17 })}</button></div>
        <div class="modal-body sm-body">
          <input id="note-title" class="new-input" placeholder="Title (e.g. Q3 OKRs)" value="${esc(s.noteTitle || '')}" spellcheck="false" />
          <textarea id="note-body" class="note-body" placeholder="Paste or type the context the agent should use…" spellcheck="false">${esc(s.noteBody || '')}</textarea>
          <div class="sm-foot">
            <button class="ghost-btn" data-action="cancel-note">Cancel</button>
            <button class="conn-save" data-action="save-note">Add to context</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function render(s) {
    const idea = s.idea;
    if (!idea) return `<div class="view"><div class="empty"><h3>Idea not found</h3></div></div>`;
    const sm = status(idea.verdict);

    return `
    <div class="view">
      <div class="topbar session">
        <div class="session-head">
          <button class="icon-btn sq ${s.convCollapsed ? '' : 'on'}" data-action="toggle-conv"
            title="${s.convCollapsed ? 'Show conversation' : 'Hide conversation'}">${I.panelLeft({ w:16 })}</button>
          <div class="col">
            <div class="row">
              <span class="title">${esc(idea.name)}</span>
              <span class="pill pill-sm" style="background:${sm.weak};color:${sm.color}"><span class="dot"></span>${sm.label}</span>
            </div>
            <span class="sub">${esc(idea.category || '')} · owned by ${esc(idea.owner || 'unassigned')}</span>
          </div>
        </div>
        <div class="topbar-actions">
          ${(() => {
            // Explicit pick wins; on Default, show the actual model the last run
            // resolved to (from its init event) rather than the generic "Default".
            const label = s.model ? modelShort(s.model) : (s.resolvedModel ? modelShort(s.resolvedModel) : 'Default');
            return `<div class="model-pick">
              ${s.tokens ? ctxMeter(s) : ''}
              <button class="model-btn${s.modelMenuOpen ? ' on' : ''}" data-action="model-menu" title="Model running discovery">
                ${I.cpu({ w:14 })}<span>${esc(label)}</span>${I.chevDown({ w:13, stroke:'var(--ink-3)' })}
              </button>
              ${s.modelMenuOpen ? modelMenu(s) : ''}
            </div>`;
          })()}
          <button class="verdict-pill ${s.verdictOpen ? 'on' : ''}" data-action="toggle-verdict"
            style="background:${sm.weak};color:${sm.color}" title="Open the verdict & dimensions">
            <span class="dot"></span>${sm.label}
            ${idea.conviction == null ? '' : `<span class="conv">${idea.conviction}</span>`}
          </button>
          <button class="icon-btn sq" data-action="header-menu" title="Rename or delete">${I.dots({ w:16 })}</button>
        </div>
      </div>
      <div class="session-body${s.convCollapsed ? ' collapsed' : ''}">
        ${s.convCollapsed ? '' : conversation(s, idea)}
        ${s.convCollapsed ? '' : `<div class="splitter" data-action="splitter"><span class="grip"></span></div>`}
        ${s.convCollapsed ? `<button class="conv-rail" data-action="toggle-conv" title="Show conversation">${I.chat({ w:16 })}</button>` : ''}
        ${briefPane(s, idea)}
      </div>
      ${s.verdictOpen ? verdictDrawer(idea) : ''}
      ${s.expanded ? modal(idea, s.expanded) : ''}
      ${s.confirmDelete ? deleteModal(idea) : ''}
      ${s.noteOpen ? noteModal(s) : ''}
      ${s.cardMenu ? window.BoardView.cardMenu(s.cardMenu) : ''}
      ${s.renameFor ? window.BoardView.renameModal(s) : ''}
    </div>`;
  }

  // Right-side slide-over showing the verdict + dimensions (opened from the topbar pill).
  function verdictDrawer(idea) {
    return `
    <div class="drawer-overlay" data-action="close-verdict">
      <aside class="verdict-drawer" data-stop="1">
        <div class="drawer-head">
          <span class="eyebrow">Decision · Verdict</span>
          <button class="icon-btn sq" data-action="close-verdict">${I.x({ w:17 })}</button>
        </div>
        <div class="drawer-body">${verdictTab(idea)}</div>
      </aside>
    </div>`;
  }

  return { render, MODELS };
})();
