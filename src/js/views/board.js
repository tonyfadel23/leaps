// Board view — portfolio of decision cards + retired (killed) lane.
window.BoardView = (() => {
  const { status, segs, esc } = window.H;
  const I = window.Icons;

  // Pipeline phases (kanban columns) + forward-map for legacy stage labels, so
  // dev seed data (Grounded/Sketched/Defined/Built) and production data (already
  // normalized in pipeline-reader.js) both bucket into the same columns.
  const PHASES = ['Learned', 'Explored', 'Assessed', 'Proven', 'Shipped'];
  const OLD_TO_NEW = { Grounded:'Learned', Sketched:'Explored', Defined:'Assessed', Built:'Shipped' };
  const normStage = (st) => OLD_TO_NEW[st] || st;

  // Condensed card for the narrow kanban columns.
  function kanbanCard(idea) {
    const sm = status(idea.verdict);
    const draft = idea.verdict === 'draft' || idea.conviction == null;
    return `
    <div class="kanban-card" data-action="open-idea" data-id="${esc(idea.id)}">
      <div class="kc-top">
        <span class="pill pill-sm" style="background:${sm.weak};color:${sm.color}">
          <span class="dot"></span>${sm.label}
        </span>
        <span class="kc-score" style="color:${sm.color}">${draft ? '—' : idea.conviction}</span>
      </div>
      <h4>${esc(idea.name)}</h4>
      <div class="kc-foot">
        <span class="avatar">${esc(idea.initials)}</span>
        <span class="when">${esc(idea.updated)}</span>
      </div>
    </div>`;
  }

  function ideaCard(idea) {
    const sm = status(idea.verdict);
    const draft = idea.verdict === 'draft' || idea.conviction == null;
    const pct = draft ? 0 : idea.conviction;
    return `
    <div class="idea-card" data-action="open-idea" data-id="${esc(idea.id)}">
      <div class="top">
        <span class="pill" style="background:${sm.weak};color:${sm.color}">
          <span class="dot"></span>${sm.label}
        </span>
        <div class="score">
          ${draft ? `<span class="n" style="color:${sm.color}">—</span>` : `<span class="n" style="color:${sm.color}">${idea.conviction}</span><span class="d">/100</span>`}
        </div>
      </div>
      <div>
        <h3>${esc(idea.name)}</h3>
        <p class="take">${esc(draft ? 'New concept — open it and start the conversation.' : idea.takeaway)}</p>
      </div>
      <div class="bar"><i style="width:${pct}%;background:${sm.color}"></i></div>
      <div class="foot">
        <div class="ev">
          <span class="lbl">Evidence</span>
          <div class="segs">${segs(idea.evidence)}</div>
        </div>
        <div class="owner">
          <span class="avatar">${esc(idea.initials)}</span>
          <span class="when">${esc(idea.updated)}</span>
        </div>
      </div>
    </div>`;
  }

  function killedCard(k) {
    return `
    <div class="killed-card">
      <div class="top">
        <span class="name">${esc(k.name)}</span>
        <span class="pill pill-sm" style="background:var(--kill-weak);color:var(--kill)">
          ${I.x({ w:11, sw:2.4 })}Killed
        </span>
      </div>
      <p>${esc(k.reason)}</p>
      <span class="meta">${esc(k.when)} · ${esc(k.owner)}</span>
    </div>`;
  }

  function render(s) {
    const board = s.board || { ideas: [], killed: [] };
    const all = board.ideas, killed = board.killed || [];
    const counts = {
      all: all.length,
      pursue: all.filter(i => i.verdict === 'pursue').length,
      needs: all.filter(i => i.verdict === 'needs').length,
      killed: killed.length,
    };
    const f = s.boardFilter;
    let visible = all;
    if (f === 'pursue') visible = all.filter(i => i.verdict === 'pursue');
    else if (f === 'needs') visible = all.filter(i => i.verdict === 'needs');
    else if (f === 'killed') visible = [];
    const showKilled = f === 'all' || f === 'killed';

    const filters = [
      { key:'all', label:'All' }, { key:'pursue', label:'Pursue' },
      { key:'needs', label:'Needs more' }, { key:'killed', label:'Killed' },
    ].map(ff => `
      <button class="${f === ff.key ? 'active' : ''}" data-action="filter" data-filter="${ff.key}">
        ${ff.label}<span class="cnt">${counts[ff.key]}</span>
      </button>`).join('');

    const noIdeas = !all.length;
    const folderName = s.pipelineDir ? s.pipelineDir.replace(/\/+$/, '').split('/').pop() : '';

    return `
    <div class="view">
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">${I.leap({ w:15, sw:2.4, stroke:'var(--accent-ink)' })}</div>
          <span class="brand-name">LEAPs</span>
          <span class="brand-sub">Decision board</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-btn" data-action="open-settings" title="Settings">${I.cog({ w:16 })}</button>
          <button class="btn-guide" data-action="guide" title="How to use LEAPs">${I.research({ w:15 })}Guide</button>
          <button class="btn btn-primary" data-action="new-idea">${I.plus({ w:15, sw:2.4 })}New idea</button>
        </div>
      </div>

      <div class="board-scroll">
        <div class="board-wrap">
          <div class="filters">
            <div class="seg">${filters}</div>
            <div class="sort-pills">
              <span>Conviction ${I.chevDown({ w:13 })}</span>
              <span>Evidence ${I.chevDown({ w:13 })}</span>
              <span>Owner ${I.chevDown({ w:13 })}</span>
            </div>
            <div class="seg view-toggle">
              <button class="${s.boardView === 'kanban' ? 'active' : ''}" data-action="board-view" data-view="kanban">Kanban</button>
              <button class="${s.boardView !== 'kanban' ? 'active' : ''}" data-action="board-view" data-view="grid">Board</button>
            </div>
            ${folderName ? `<div class="synced">${I.folder({ w:14 })} ${esc(folderName)}</div>` : ''}
          </div>

          ${noIdeas ? `
          <div class="empty">
            ${I.file({ w:30, stroke:'var(--ink-3)' })}
            <h3>No ideas found in this folder</h3>
            <p>LEAPs reads idea folders from your pipeline directory. Point it at the folder that holds your pipeline (each idea is a sub-folder).</p>
            <button class="btn btn-primary" data-action="pick-folder">${I.file({ w:15, stroke:'var(--accent-ink)' })}Choose pipeline folder</button>
          </div>` : (s.boardView === 'kanban'
            ? `<div class="kanban-board">${PHASES.map(phase => {
                const cards = visible.filter(i => normStage(i.stage) === phase);
                return `<div class="kanban-col">
                  <div class="kanban-col-head"><span>${phase}</span><span class="cnt">${cards.length}</span></div>
                  <div class="kanban-col-body">${cards.map(kanbanCard).join('') || '<div class="kanban-empty">—</div>'}</div>
                </div>`;
              }).join('')}</div>`
            : `<div class="cards-grid">${visible.map(ideaCard).join('')}</div>`)}

          ${showKilled && killed.length ? `
          <div class="killed-lane">
            <div class="lane-head">
              <h2>${I.trash({ w:16 })} Retired</h2>
              <div class="rule"></div>
              <span class="note">Killed ideas rest here with their reason. A kill is a result, not a failure.</span>
            </div>
            <div class="killed-grid">${killed.map(killedCard).join('')}</div>
          </div>` : ''}
        </div>
      </div>
      <div class="overlays">${overlays(s)}</div>
    </div>`;
  }

  // Board-level overlays (not the app-global ones). Swapped in place without
  // re-rendering the board behind them.
  function overlays(s) {
    return `${s.newIdeaOpen ? newIdeaModal(s) : ''}`
      + `${s.cardMenu ? cardMenu(s.cardMenu) : ''}`
      + `${s.renameFor ? renameModal(s) : ''}`
      + `${s.confirmDelete ? deleteConfirm(s) : ''}`;
  }

  // App-global modals (Settings, Guide) — rendered by the shell so they open over
  // ANY view (board or a card session), not just the board.
  function globalOverlays(s) {
    return `${s.settingsOpen ? settingsModal(s) : ''}`
      + `${s.guideOpen ? window.GuideView.render(s) : ''}`;
  }

  function cardMenu(m) {
    return `
    <div class="menu-overlay" data-action="close-card-menu">
      <div class="card-menu" style="left:${m.x}px;top:${m.y}px" data-stop="1">
        <button class="cm-item" data-action="open-idea" data-id="${esc(m.id)}">${I.expand({ w:14 })} Open</button>
        <button class="cm-item" data-action="rename-idea" data-id="${esc(m.id)}">${I.file({ w:14 })} Rename</button>
        <button class="cm-item danger" data-action="ask-delete" data-id="${esc(m.id)}">${I.trash({ w:14 })} Delete</button>
      </div>
    </div>`;
  }

  function renameModal(s) {
    const r = s.renameFor;
    return `
    <div class="modal-overlay" data-action="close-rename">
      <div class="modal sm-modal" data-stop="1">
        <div class="modal-head"><div class="l"><span class="badge">${I.file({ w:16 })}</span>
          <div><div class="t">Rename concept</div><div class="meta">${esc(r.name)}</div></div></div>
          <button class="icon-btn sq" data-action="close-rename">${I.x({ w:17 })}</button></div>
        <div class="modal-body sm-body">
          <input id="rename-input" class="new-input" placeholder="New title" value="${esc(s.renameTitle != null ? s.renameTitle : r.name)}" spellcheck="false" />
          <div class="sm-foot"><button class="ghost-btn" data-action="close-rename">Cancel</button>
            <button class="conn-save" data-action="save-rename" data-id="${esc(r.id)}">Rename</button></div>
        </div>
      </div>
    </div>`;
  }

  function deleteConfirm(s) {
    const name = (s.confirmDelete && s.confirmDelete.name) || 'this concept';
    return `
    <div class="modal-overlay" data-action="cancel-delete">
      <div class="modal sm-modal" data-stop="1">
        <div class="modal-head"><div class="l"><span class="badge" style="background:var(--kill-weak);color:var(--kill)">${I.trash({ w:16 })}</span>
          <div><div class="t">Delete concept</div><div class="meta">${esc(name)}</div></div></div></div>
        <div class="modal-body sm-body">
          <p class="sm-p">This permanently deletes the concept folder and everything in it — conversation, brief, prototypes, context. This can't be undone.</p>
          <div class="sm-foot"><button class="ghost-btn" data-action="cancel-delete">Cancel</button>
            <button class="danger-btn" data-action="confirm-delete" data-id="${esc((s.confirmDelete && s.confirmDelete.id) || '')}">Delete concept</button></div>
        </div>
      </div>
    </div>`;
  }

  // ── Settings ──
  function loginBadge(method) {
    if (method === 'subscription') return `<span class="set-badge ok">${I.check({ w:12, sw:2.6 })} Subscription</span>`;
    if (method === 'api-key') return `<span class="set-badge warn">API key</span>`;
    return `<span class="set-badge bad">Not signed in</span>`;
  }
  // Connectors editor — a FIXED catalog of pipeline roles. You bind each to a
  // primary MCP + optional fallbacks (tried in order). Edits a draft mutated in
  // place (app.js); Save writes the full schema to connectors.yaml.
  const opt = (v, sel) => `<option value="${v}"${(sel || 'http') === v ? ' selected' : ''}>${v}</option>`;
  const transSel = (attrs, v) => `<select ${attrs}>${opt('http', v)}${opt('stdio', v)}${opt('sse', v)}</select>`;

  function connRoleBlock(r, i, health) {
    const bound = !!r.mcp;
    const fbs = r.fallbacks || [];
    const ex = r.examples ? String(r.examples) : '';
    const exHint = ex ? 'e.g. ' + ex.split(',')[0].trim() : 'MCP name';
    // Real status comes from a connection check (claude mcp list). Without one we
    // only know the role is bound in connectors.yaml — not that it actually connects.
    let st = { cls: '', dot: 'mut', label: 'Not connected' };
    if (bound) {
      const h = health && health[r.mcp];
      if (!health) st = { cls: 'bound', dot: 'ok', label: 'Bound · not checked' };
      else if (h === 'connected') st = { cls: 'on', dot: 'ok', label: 'Connected' };
      else if (h === 'configured') st = { cls: 'on', dot: 'ok', label: 'Configured' };
      else if (h === 'failed') st = { cls: 'fail', dot: 'fail', label: 'Auth failed' };
      else st = { cls: 'warn', dot: 'warn', label: 'Not found in Claude' };
    }
    return `
      <div class="conn-role ${bound ? 'bound' : 'unbound'}">
        <div class="conn-role-h">
          <div class="conn-role-id">
            <span class="conn-dot ${st.dot}"></span>
            <span class="conn-role-n">${esc(r.label || r.role)}</span>
            <code class="conn-role-key">${esc(r.role)}</code>
            ${r.required ? '<span class="conn-req">required</span>' : ''}
          </div>
          <span class="conn-state ${st.cls}">${st.label}</span>
        </div>
        <div class="conn-role-d">${esc(r.description || '')}</div>
        ${!bound && r.fallback ? `<div class="conn-fallback">${I.warn({ w: 12, stroke: 'var(--needs)' })}<span><b>If unset:</b> ${esc(r.fallback)}</span></div>` : ''}
        <div class="conn-bind">
          <span class="conn-bind-l">Primary</span>
          <div class="conn-fields">
            <input data-conn-field="mcp" data-conn-idx="${i}" value="${esc(r.mcp || '')}" placeholder="${esc(exHint)}" spellcheck="false" />
            <input data-conn-field="url" data-conn-idx="${i}" value="${esc(r.url || '')}" placeholder="https://…  (optional)" spellcheck="false" />
            ${transSel(`data-conn-field="transport" data-conn-idx="${i}"`, r.transport)}
          </div>
        </div>
        ${ex ? `<div class="conn-ex">Works with: ${esc(ex)}</div>` : ''}
        ${fbs.map((f, j) => `
          <div class="conn-bind fb">
            <span class="conn-bind-l">Fallback ${j + 1}</span>
            <div class="conn-fields">
              <input data-conn-field="mcp" data-conn-idx="${i}" data-fb-idx="${j}" value="${esc(f.mcp || '')}" placeholder="MCP name" spellcheck="false" />
              <input data-conn-field="url" data-conn-idx="${i}" data-fb-idx="${j}" value="${esc(f.url || '')}" placeholder="https://…" spellcheck="false" />
              ${transSel(`data-conn-field="transport" data-conn-idx="${i}" data-fb-idx="${j}"`, f.transport)}
              <button class="conn-del" data-action="remove-fallback" data-idx="${i}" data-fb="${j}" title="Remove fallback">${I.trash({ w: 12 })}</button>
            </div>
          </div>`).join('')}
        <div class="conn-role-foot">
          <button class="conn-add-fb" data-action="add-fallback" data-idx="${i}">${I.plus({ w: 12 })} Add fallback</button>
          <label class="conn-mode" title="What discovery does when this role isn't connected">When unset
            <select data-conn-field="fallback_mode" data-conn-idx="${i}">
              <option value="ask_user"${r.fallback_mode !== 'skip' ? ' selected' : ''}>ask me</option>
              <option value="skip"${r.fallback_mode === 'skip' ? ' selected' : ''}>skip &amp; note gap</option>
            </select>
          </label>
        </div>
      </div>`;
  }

  function connectorsEditor(s) {
    const cx = s.connectors;
    if (cx === 'loading' || cx == null) return `<div class="set-mut">Loading connectors…</div>`;
    const draft = s.connectorsDraft || [];
    const presets = (cx && cx.presets) || [];
    const wired = draft.filter(r => r.mcp).length;
    const pct = draft.length ? Math.round(wired / draft.length * 100) : 0;
    return `
      <div class="conn-head">
        <div class="conn-summary">
          <div class="conn-count"><b>${wired}</b> of <b>${draft.length}</b> roles connected</div>
          <div class="conn-meter"><i style="width:${pct}%"></i></div>
        </div>
        <p class="set-mut">Bind each role to a tool you use. <b>Anything you leave unconnected still works</b> — LEAPs uses the fallback shown under that role and never fabricates data.</p>
        <div class="conn-check">
          <button class="set-tab" data-action="check-connectors" ${s.connectorsChecking ? 'disabled' : ''}>${s.connectorsChecking ? 'Checking…' : 'Check connections'}</button>
          <span class="set-mut">${s.connectorHealth ? 'Status below is live from your Claude CLI (auth + reachability).' : 'Status shows what’s bound — run a check to verify each one actually connects.'}</span>
        </div>
      </div>
      ${presets.length ? `<div class="conn-presets"><span class="conn-presets-l">Quick start</span>${presets.map(p =>
        `<button class="conn-preset" data-action="apply-preset" data-name="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
      <div class="conn-list">${draft.map((r, i) => connRoleBlock(r, i, s.connectorHealth)).join('')}</div>
      <div class="conn-actions">
        <span class="set-mut">Roles are fixed — connect the ones you have.</span>
        <div class="conn-actions-btns">
          <button class="set-tab" data-action="import-connectors">${I.file({ w:13 })} Import</button>
          <button class="set-tab" data-action="export-connectors">${I.expand({ w:13 })} Export</button>
          <button class="conn-save" data-action="save-connectors">${s.connectorsSaved ? 'Saved ✓' : 'Save connectors'}</button>
        </div>
      </div>`;
  }
  function runRow(s, r) {
    const idea = ((s.board && s.board.ideas) || []).find(i => i.id === r.id);
    const name = idea ? idea.name : r.id;
    return `<div class="set-run"><span class="run-dot"></span><div class="run-meta"><span class="run-name">${esc(name)}</span><span class="run-sub">grinding this idea…</span></div><button class="set-kill" data-action="kill-run" data-id="${esc(r.id)}">${I.x({ w:12, sw:2.4 })} Kill</button></div>`;
  }

  // Verdict-threshold sliders (shared classes with onboarding; set-* tweaks layout).
  function convictionControls(s) {
    const t = s.thresholds || { killBelow: 50, pursueFrom: 70 };
    return `
      <div class="onb-verdicts set-verdicts">
        <span class="onb-v" style="background:var(--kill-weak);color:var(--kill)">Kill &lt; ${t.killBelow}</span>
        <span class="onb-v" style="background:var(--needs-weak);color:var(--needs)">Needs ${t.killBelow}–${t.pursueFrom - 1}</span>
        <span class="onb-v" style="background:var(--pursue-weak);color:var(--pursue)">Pursue ≥ ${t.pursueFrom}</span>
      </div>
      <div class="onb-sliders set-sliders">
        <label class="onb-slider"><span class="onb-slider-l">Kill below <b>${t.killBelow}</b></span>
          <input type="range" min="20" max="60" value="${t.killBelow}" data-action="set-threshold" data-key="killBelow" /></label>
        <label class="onb-slider"><span class="onb-slider-l">Pursue at or above <b>${t.pursueFrom}</b></span>
          <input type="range" min="60" max="90" value="${t.pursueFrom}" data-action="set-threshold" data-key="pursueFrom" /></label>
      </div>
      <div class="set-mut">Drag to set where Pursue / Needs more / Kill fall. The rigor wall still holds — only sourced evidence lifts conviction.</div>`;
  }

  // Context wiki — list of docs + inline editor.
  function contextEditor(s) {
    const docs = s.contextDocs || [];
    const ed = s.editingDoc;
    if (ed) {
      const f = (k, label, ph) => `<label class="ctx-field"><span class="ctx-l">${label}</span>`
        + `<input data-doc-field="${k}" value="${esc(ed[k] || '')}" placeholder="${esc(ph)}" spellcheck="false" /></label>`;
      return `
        <div class="ctx-edit">
          ${f('title', 'Title', 'e.g. Competitor landscape')}
          ${f('summary', 'Summary (optional)', 'One line — what this doc covers')}
          <label class="ctx-field"><span class="ctx-l">Content</span>
            <textarea data-doc-field="body" class="ctx-body" rows="14" spellcheck="false" placeholder="Markdown…">${esc(ed.body || '')}</textarea></label>
          <div class="ctx-actions">
            <button class="conn-save" data-action="context-save">Save doc</button>
            <button class="set-tab" data-action="context-cancel">Cancel</button>
          </div>
        </div>`;
    }
    return `
      <div class="ctx-list">
        ${docs.length ? docs.map((d) => `
          <div class="ctx-row ${d.active ? '' : 'off'}">
            <button class="ctx-tog" data-action="context-toggle" data-id="${esc(d.id)}" title="${d.active ? 'Active — feeds discovery' : 'Inactive'}">${d.active ? '●' : '○'}</button>
            <div class="ctx-row-main" data-action="context-edit" data-id="${esc(d.id)}">
              <div class="ctx-row-t">${esc(d.title)}</div>
              ${d.summary ? `<div class="ctx-row-s">${esc(d.summary)}</div>` : ''}
            </div>
            <button class="ctx-del" data-action="context-delete" data-id="${esc(d.id)}" title="Delete">✕</button>
          </div>`).join('') : '<div class="set-mut">No context docs yet.</div>'}
      </div>
      <div class="ctx-actions"><button class="conn-save" data-action="context-new">+ New doc</button></div>`;
  }
  const updateLine = (u) => u.available
    ? `LEAPs ${esc(u.latest)} is available — <a href="${esc(u.url || '#')}">download</a>`
    : (u.error ? `Couldn't check (${esc(u.error)})` : `You're on the latest version.`);

  function newIdeaModal(s) {
    return `
    <div class="modal-overlay" data-action="close-new-idea">
      <div class="modal new-modal" data-stop="1">
        <div class="modal-head">
          <div class="l"><span class="badge">${I.plus({ w: 16 })}</span>
            <div><div class="t">New concept</div><div class="meta">Name it — refine everything later</div></div></div>
          <button class="icon-btn sq" data-action="close-new-idea">${I.x({ w: 17 })}</button>
        </div>
        <div class="modal-body new-body">
          <input id="new-idea-input" class="new-input" placeholder="e.g. Group ordering for offices" value="${esc(s.newIdeaTitle || '')}" spellcheck="false" />
          ${s.newIdeaError ? `<div class="set-mut" style="color:var(--kill)">${esc(s.newIdeaError)}</div>` : ''}
          <div class="new-foot">
            <button class="ghost-btn" data-action="close-new-idea">Cancel</button>
            <button class="conn-save" data-action="create-idea">Create concept</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  const SET_TABS = [
    { id: 'account', label: 'Account', icon: 'sparkle' },
    { id: 'context', label: 'Context', icon: 'research' },
    { id: 'connectors', label: 'Data sources', icon: 'plug' },
    { id: 'design', label: 'Design system', icon: 'palette' },
    { id: 'conviction', label: 'Conviction', icon: 'chart' },
  ];

  function accountTab(s) {
    const st = s.settings;
    const folder = s.pipelineDir || (st && st.pipelineDir) || 'No folder selected';
    const runs = (st && st.runs) || [];
    const acct = st && st.account;
    const signedIn = st && st.loginMethod === 'subscription';
    return `
      <div class="set-grp">
        <div class="set-grp-h">Claude account</div>
        ${acct ? `
          <div class="acct-card">
            <span class="acct-av">${esc((acct.displayName || acct.email || '?').slice(0,1).toUpperCase())}</span>
            <div class="acct-meta"><div class="acct-email">${esc(acct.email)}</div>
              <div class="acct-plan">${I.check({ w:12 })} ${esc(acct.plan || 'Signed in')}</div></div>
          </div>
          <div class="set-mut">LEAPs runs discovery on this account. To switch, run <code>claude</code> → <code>/login</code> in a terminal, then Reload.</div>
        ` : `
          <div class="acct-card warn">
            <span class="acct-av none">?</span>
            <div class="acct-meta"><div class="acct-email">Not signed in to a subscription</div>
              <div class="acct-plan mut">${st && st.loginMethod === 'api-key' ? 'Using an API key (may be unfunded)' : 'No Claude login found'}</div></div>
          </div>
          <button class="set-signin" data-action="sign-in">${I.sparkle({ w:14 })} Sign in with Claude subscription</button>
          ${s.signingIn
            ? `<div class="set-hint">${I.clock({ w:13 })}<span>A Terminal opened — finish the browser sign-in there. LEAPs detects it automatically.</span></div>`
            : `<div class="set-mut">Uses your Claude Max/Pro plan instead of an API key. Opens a one-time browser sign-in.</div>`}
        `}
      </div>

      <div class="set-grp">
        <div class="set-grp-h">Concepts folder</div>
        <div class="set-row">
          <div class="set-path">${I.folder({ w:14 })}<span>${esc(folder)}</span></div>
          <button class="ghost-btn" data-action="pick-folder">Change…</button>
        </div>
      </div>

      <div class="set-grp">
        <div class="set-grp-h">Appearance</div>
        <div class="set-row">
          <span class="set-mut">Theme</span>
          <div class="seg">
            <button class="${s.theme !== 'dark' ? 'active' : ''}" data-action="set-theme" data-theme="light">Light</button>
            <button class="${s.theme === 'dark' ? 'active' : ''}" data-action="set-theme" data-theme="dark">Dark</button>
          </div>
        </div>
      </div>

      <div class="set-grp">
        <div class="set-grp-h">About</div>
        <div class="set-kv"><span class="k">LEAPs version</span><span class="v mono">v${esc(st.appVersion || '')}</span></div>
        <div class="set-kv"><span class="k">Claude CLI</span><span class="v mono">${esc(st.claudeVersion || 'not found')}</span></div>
        <div class="set-row"><span class="set-mut">${s.updateState ? updateLine(s.updateState) : 'Check for a newer LEAPs build.'}</span>
          <button class="ghost-btn" data-action="check-updates">${s.updateChecking ? 'Checking…' : 'Check for updates'}</button></div>
      </div>

      ${runs.length ? `<div class="set-grp"><div class="set-grp-h">Active sessions</div>${runs.map(r => runRow(s, r)).join('')}</div>` : ''}
    `;
  }

  function designTab(s) {
    const d = s.design;
    if (d == null) return `<div class="set-mut">Loading…</div>`;
    const sourceLabel = d.source === 'figma'
      ? (d.lastSynced ? `Figma — synced ${esc(new Date(d.lastSynced).toLocaleString())}` : 'Figma — URL saved, not synced yet')
      : 'Neutral default';
    const swatches = (d.colors || []).map((c) =>
      `<div class="dz-sw" title="${esc(c.name)} ${esc(c.hex)}"><i style="background:${esc(c.hex)}"></i><span>${esc(c.name)}</span></div>`
    ).join('') || `<div class="set-mut">No tokens parsed.</div>`;
    const draft = s.figmaDraft != null ? s.figmaDraft : (d.figmaUrl || '');
    const syncing = !!s.designSyncing;
    const log = (s.designSyncLog || []);
    return `
      <div class="set-grp">
        <div class="set-grp-h">Design system</div>
        <p class="set-mut">Prototypes are built with these design tokens. The default is brand-neutral — connect your Figma file to use your company's system. <code>/setup --sync-design</code> runs under the hood.</p>
        <div class="dz-source"><span class="dz-src-dot ${d.source === 'figma' ? 'on' : ''}"></span>${esc(sourceLabel)}</div>
        <div class="dz-swatches">${swatches}</div>
        <label class="dz-field"><span>Figma file URL</span>
          <input data-figma-url value="${esc(draft)}" placeholder="https://www.figma.com/file/…" spellcheck="false" /></label>
        <div class="dz-actions">
          <button class="conn-save" data-action="save-figma-url">${s.figmaSaved ? 'Saved ✓' : 'Save URL'}</button>
          <button class="onb-btn sm" data-action="sync-design" ${syncing ? 'disabled' : ''}>${syncing ? 'Syncing…' : 'Sync from Figma'}</button>
          ${d.source !== 'default' ? `<button class="set-tab" data-action="reset-design">Reset to default</button>` : ''}
        </div>
        ${(syncing || log.length) ? `<div class="dz-log">${log.map((l) => `<div class="dz-log-line">${esc(l)}</div>`).join('')}</div>` : ''}
      </div>`;
  }

  // Just the active-tab content — swapped in place on tab switch (no modal re-render).
  function settingsBody(s) {
    const st = s.settings;
    const tab = s.settingsTab || 'account';
    if (!st) return `<div class="set-mut">Loading…</div>`;
    if (tab === 'design') return designTab(s);
    if (tab === 'context') return `<div class="set-grp"><div class="set-grp-h">Your context</div>
        <div class="set-mut" style="margin-bottom:12px">Docs that ground every discovery question. Toggle one off to exclude it. Active docs are compiled into business-context.md.</div>${contextEditor(s)}</div>`;
    if (tab === 'connectors') return `<div class="set-grp"><div class="set-grp-h">Data sources <button class="set-refresh" data-action="refresh-connectors">Reload</button></div>${connectorsEditor(s)}</div>`;
    if (tab === 'conviction') return `<div class="set-grp"><div class="set-grp-h">Conviction thresholds</div>${convictionControls(s)}</div>`;
    return accountTab(s);
  }
  const settingsTabLabel = (tab) => (SET_TABS.find(t => t.id === tab) || {}).label || 'Account';

  function settingsModal(s) {
    const st = s.settings;
    const tab = s.settingsTab || 'account';
    return `
    <div class="modal-overlay" data-action="close-settings">
      <div class="modal set-modal tabbed" data-stop="1">
        <div class="set-rail">
          <div class="set-rail-h"><span class="badge">${I.cog({ w:16 })}</span><span>Settings</span></div>
          ${SET_TABS.map(t => `<button class="set-tab ${tab === t.id ? 'on' : ''}" data-action="settings-tab" data-tab="${t.id}">${I[t.icon]({ w:15 })}<span>${t.label}</span></button>`).join('')}
          <div class="set-rail-foot">v${esc((st && st.appVersion) || '')}</div>
        </div>
        <div class="set-main">
          <div class="set-main-head"><div class="t">${esc(settingsTabLabel(tab))}</div>
            <button class="icon-btn sq" data-action="close-settings">${I.x({ w:17 })}</button></div>
          <div class="set-main-body">${settingsBody(s)}</div>
        </div>
      </div>
    </div>`;
  }

  return { render, overlays, globalOverlays, cardMenu, renameModal, settingsBody, settingsTabLabel };
})();
