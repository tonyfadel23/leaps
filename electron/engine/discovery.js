// discovery.js — the live discovery engine.
//
// LEAPs' thesis is local-first: it drives the PM's OWN installed Claude Code CLI,
// headless, inside the idea's pipeline folder. That means it inherits the user's
// auth, their CLAUDE.md, and — critically — their configured MCP servers (your
// BI tools, etc). No SSO, no hosted backend: the app grinds an idea using the
// exact data access the employee already has.
//
// We spawn `claude -p <prompt> --output-format stream-json` and forward each
// NDJSON event to the renderer over IPC. When the run finishes, we parse a fenced
// ```leap-findings JSON block out of the final message — new claims (each with a
// source or marked assumed) — persist them to the .leap.json sidecar, and let the
// conviction engine recompute. The rigor gate is preserved: only *sourced* claims
// lift Evidence quality, so confidence can't be talked up, only grounded up.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Resolve the user's claude binary. PATH in a packaged Electron app is sparse, so
// check the common install locations before falling back to bare `claude`.
function resolveClaudeBin() {
  const home = process.env.HOME || '';
  const candidates = [
    path.join(home, '.local/bin/claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return 'claude';
}

// Read the signed-in Claude account from ~/.claude.json (oauthAccount). Returns
// { email, displayName, plan } or null. This is how the app shows WHICH account
// is active, so sign-in is never ambiguous.
function readAccount() {
  const home = process.env.HOME || '';
  try {
    const j = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'));
    const a = j && j.oauthAccount;
    if (!a || !a.emailAddress) return null;
    const planMap = { claude_max: 'Claude Max', claude_pro: 'Claude Pro', claude_team: 'Claude Team' };
    let plan = planMap[a.organizationType] || (a.billingType === 'stripe_subscription' ? 'Claude subscription' : '');
    if (/20x/.test(a.organizationRateLimitTier || '')) plan += ' (20x)';
    else if (/5x/.test(a.organizationRateLimitTier || '')) plan += ' (5x)';
    return { email: a.emailAddress, displayName: a.displayName || '', plan: plan.trim() };
  } catch { return null; }
}

// Does the CLI have an interactive subscription (OAuth) login on file? Check the
// credentials file (Linux) or the oauthAccount in ~/.claude.json (macOS Keychain).
function hasSubscriptionLogin() {
  const home = process.env.HOME || '';
  try { if (fs.existsSync(path.join(home, '.claude', '.credentials.json'))) return true; } catch {}
  return !!readAccount();
}

// Local-first billing: if the user has signed the CLI into their Claude
// subscription, use THAT — not an inherited ANTHROPIC_API_KEY (which routes to a
// console/API account that may be unfunded → "Credit balance is too low"). When
// there's no subscription login, leave the env untouched so the API key is used.
function spawnEnv() {
  const env = Object.assign({}, process.env);
  if (hasSubscriptionLogin()) {
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }
  return env;
}

// The discovery brief appended to Claude's system prompt. It sets a TURN-BY-TURN
// conversational discipline, defers to the real LEAPs pipeline skills, and forces
// the structured findings block we parse for conviction.
// Is the user's message a multi-phase pipeline skill command (/learn … /ship, /1 … /5)?
// Those turns run the skill autonomously; free-form messages stay turn-by-turn chat.
function isSkillCommand(prompt) {
  return /^\s*\/(learn|explore|assess|prove|ship)\b/i.test(String(prompt || ''));
}

const BRIEF_HEAD = [
  'You are LEAPs, a product-discovery partner. You operate the LEAPs pipeline skills',
  '(learn, explore, assess, prove, ship and the utilities) for a PM who is building',
  'conviction to PURSUE or KILL the idea in the current concept folder.',
];

// Free-form chat: one focused exchange per turn.
const CHAT_DISCIPLINE = [
  'TURN-BY-TURN — this is a live conversation, not a batch job. Respond to the',
  "user's CURRENT message with EITHER one focused answer OR one clarifying question,",
  'then STOP and wait for their reply. Ask at most ONE question per turn. Do NOT run',
  'an autonomous end-to-end investigation across the whole pipeline in a single turn',
  'unless the user explicitly invokes a multi-phase skill command. When you have',
  'given your answer or asked your question, end the turn — stop calling tools.',
  '',
  'USING THE SKILLS — for free-form messages, use the relevant skill\'s approach and',
  'judgment, but keep to a single exchange. Prefer the skills\' own files and agents.',
];

// A multi-phase pipeline skill command was invoked: run the skill, pull evidence,
// and converge — do NOT behave like a one-question-at-a-time chat.
const SKILL_DISCIPLINE = [
  'SKILL RUN — the user invoked a multi-phase pipeline skill (e.g. `/learn`). Open and',
  'follow that skill at `.claude/skills/<name>/SKILL.md` and its agents. This is NOT a',
  'one-question-per-turn chat: you MAY and SHOULD call the skill\'s sub-agents and MCP',
  'tools within this turn to PULL evidence PROACTIVELY — pull tribal knowledge and',
  'sizing data EARLY (before asking a string of opinion questions), exactly as the',
  'skill specifies. Do not defer the data/knowledge pull to a later turn, and do not',
  'stop calling tools after a single question.',
  '',
  'Drive the skill\'s phases toward CONVERGENCE, not endless interviewing. Self-assess a',
  'PHASE READINESS score (0–100) each turn per `_shared/protocols/phase-convergence.md`',
  'and converge when it crosses the threshold (or plateaus) — NOT at a fixed question',
  'count. Ask focused questions only when the PM\'s input is genuinely required, and keep',
  'them few. When ready, STOP asking, present the skill\'s approval gate, state the',
  'readiness read, write its outputs (e.g. learn.md), and recommend the next phase.',
  'If a needed data source is not connected, take the skill\'s graceful-degradation',
  'path (use PM-provided estimates or note the gap) and keep converging — never loop',
  'asking questions you cannot ground.',
];

const BRIEF_TAIL = [
  'FILES — you MAY read and write files inside this LEAPs project, especially the',
  "current concept's folder under pipeline/<slug>/ (the skills write learn.md,",
  '.briefdata.json, brief.html, sketches/, decision-log.md, etc). Do NOT edit the',
  'app\'s own source (the electron/ or src/ directories).',
  '',
  'How to work:',
  '- Read the concept folder (brief.html, .briefdata.json, *.md) for current state.',
  '- If a context/ folder exists, READ IT FIRST — the PM put OKRs, goals, docs, and',
  '  data there. Treat it as authoritative grounding for this concept.',
  '- Pull REAL evidence where you can: query connected data sources via MCP tools,',
  '  search the web, read docs. Cite what you find.',
  '- Be rigorous and skeptical. Distinguish measured facts from assumptions. A clean',
  '  "kill" is a valuable outcome — say so when the evidence points that way.',
  '- Keep prose tight. The user is a senior operator.',
  '',
  'OUTPUT STYLE — write plain, direct prose. Do NOT add "Insight" callout blocks,',
  '★ markers, decorative ─── separator rules, or tutorial-style asides. No preamble,',
  'no recap of what you are about to do. Lead with the finding.',
  '',
  'COMPANY CONTEXT — IMPORTANT: the business/role context provided below (if any) is',
  'the ONLY source of truth for who the user is and what company/market this is about.',
  'Do NOT infer the company from ambient memory, global config, or prior projects. If',
  'no business context is provided, stay company-neutral: do not assume any specific',
  'employer or market — reason generically and ask the user when it matters.',
  '',
  'CRITICAL — regardless of whether a skill ran, end every turn with a fenced code',
  'block tagged `leap-findings` containing JSON of any NEW claims you established',
  'this turn (empty claims array if none):',
  '```leap-findings',
  '{',
  '  "claims": [',
  '    { "text": "Repeat-purchase rate is 38% in the target cohort", "source": "Analytics: live query" },',
  '    { "text": "Feature would need a 4-week build", "source": null }',
  '  ],',
  '  "verdictHint": "needs",',
  '  "phaseReadiness": 65,',
  '  "summary": "one-line read of where conviction stands now"',
  '}',
  '```',
  'Set "source" to the real data source string when a claim is measured, or null when',
  'it is still an assumption/estimate. Only include claims you actually established',
  'this turn. If you established none, return an empty claims array. "phaseReadiness" is',
  'a 0–100 self-assessed readiness of the CURRENT phase per the phase-convergence',
  'protocol (omit or 0 for free-form chat that is not running a phase skill).',
];

// Assemble the system brief, swapping the discipline block for skill vs chat turns.
function buildBrief(skill) {
  return BRIEF_HEAD
    .concat([''], skill ? SKILL_DISCIPLINE : CHAT_DISCIPLINE, [''], BRIEF_TAIL)
    .join('\n');
}

const activeRuns = new Map(); // id -> child process

// Pull the last ```leap-findings ... ``` JSON block out of an assistant transcript.
function parseFindings(text) {
  if (!text) return null;
  const re = /```leap-findings\s*([\s\S]*?)```/gi;
  let m, last = null;
  while ((m = re.exec(text)) !== null) last = m[1];
  if (!last) return null;
  try {
    const obj = JSON.parse(last.trim());
    if (obj && typeof obj === 'object') return obj;
  } catch {}
  return null;
}

// Turn a stream-json event into the compact card the renderer understands, or
// null to ignore. Cards: {type:'activity'|'text'|'thinking', ...}.
function toCard(ev) {
  if (!ev || typeof ev !== 'object') return null;

  if (ev.type === 'system' && ev.subtype === 'init') {
    const tools = Array.isArray(ev.tools) ? ev.tools.length : 0;
    const mcp = Array.isArray(ev.mcp_servers) ? ev.mcp_servers.filter(s => s && s.status === 'connected').map(s => s.name) : [];
    // Structured init — the renderer shows a quiet "Connected · model · data" status
    // line, not a chatty "N tools" message. Keep `text` as a fallback.
    return {
      type: 'activity', kind: 'init', tools, mcp,
      model: ev.model || null,
      sessionId: ev.session_id || null,
      text: 'Connected' + (mcp.length ? ' · data: ' + mcp.join(', ') : ''),
    };
  }

  if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
    const cards = [];
    for (const block of ev.message.content) {
      if (block.type === 'text' && block.text && block.text.trim()) {
        cards.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use' && block.name === 'TodoWrite' && block.input && Array.isArray(block.input.todos)) {
        // The skill phases ARE a TodoWrite list (content/status/activeForm). Keep the
        // structured payload so the UI can show a live phase checklist instead of a
        // meaningless "TodoWrite" work step.
        cards.push({ type: 'todos', todos: block.input.todos });
      } else if (block.type === 'tool_use') {
        cards.push({ type: 'activity', kind: 'tool', tool: block.name, text: describeTool(block.name, block.input) });
      }
    }
    // Live context-window usage for this turn (so the UI can show a fill meter).
    if (ev.message.usage) cards.push({ type: 'usage', usage: ev.message.usage, model: ev.message.model || null });
    return cards.length ? cards : null;
  }

  if (ev.type === 'result') {
    return {
      type: 'result',
      ok: ev.subtype === 'success',
      cost: typeof ev.total_cost_usd === 'number' ? ev.total_cost_usd : null,
      turns: ev.num_turns || null,
      durationMs: ev.duration_ms || null,
      usage: ev.usage || null,
      text: ev.result || '',
    };
  }

  return null;
}

// Human-readable one-liner for a tool call (what LEAPs is doing right now).
function describeTool(name, input) {
  input = input || {};
  switch (name) {
    case 'Read':  return 'Reading ' + baseName(input.file_path);
    case 'Grep':  return 'Searching for "' + (input.pattern || '') + '"';
    case 'Glob':  return 'Scanning ' + (input.pattern || 'files');
    case 'Bash':  return 'Running ' + (input.description || (input.command || '').slice(0, 48));
    case 'WebSearch': return 'Searching the web: ' + (input.query || '');
    case 'WebFetch':  return 'Fetching ' + (input.url || '');
    default:
      if (/^mcp__/.test(name)) {
        const pretty = name.replace(/^mcp__/, '').replace(/__/g, ' · ');
        return 'Querying ' + pretty;
      }
      return name;
  }
}

function baseName(p) {
  if (!p) return 'a file';
  return String(p).split('/').pop();
}

// Start a discovery run. `onEvent(payload)` is called for every card; the caller
// (main.js) forwards it to the renderer. `onDone({findings, transcript, result})`
// fires once at the end. Returns the spawned child (so it can be stopped).
// Read the user's filled-in company + role/scope context (business-context.md),
// resolved relative to the app root. Returns the text (capped) or null if unset.
function readBusinessContext() {
  try {
    const { text, hasAny } = require('./context').combinedContext();
    if (!hasAny) return null; // no active context — discovery stays company-neutral
    return text.length > 6000 ? text.slice(0, 6000) : text;
  } catch { return null; }
}

function startDiscovery({ id, ideaDir, projectRoot, prompt, onEvent, onDone, mcpServers, promptBlock, model, sessionId, resume }) {
  // Don't allow two concurrent runs for one idea.
  stopDiscovery(id);

  const bin = resolveClaudeBin();

  // Ground the run in the user's company + role/scope (business-context.md), then
  // append the connectors.yaml data-source list so the agent knows what it can reach.
  const ctx = readBusinessContext();
  const systemPrompt = buildBrief(isSkillCommand(prompt))
    + (ctx
        ? '\n\nBUSINESS & ROLE CONTEXT (the authoritative source — use only this):\n' + ctx
        : '\n\nNo business context is set. Stay company-neutral — do not assume any specific employer or market.')
    + (promptBlock ? '\n\n' + promptBlock : '');

  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    // Local-first: the run uses exactly the data access the user already has in
    // their CLI. bypassPermissions means a tool that would otherwise need approval
    // never gets silently skipped — discovery can reach every connected source,
    // and the pipeline skills can write their artifacts into the concept folder.
    '--permission-mode', 'bypassPermissions',
    '--add-dir', ideaDir,
    '--append-system-prompt', systemPrompt,
  ];

  // Turn-by-turn memory: each concept owns a stable session id. First turn sets it
  // with --session-id; every later turn continues it with --resume so the agent
  // remembers the conversation. Never both, and never --continue (global) /
  // --fork-session (breaks continuity) / --bare (would skip skill loading).
  if (resume && sessionId) args.push('--resume', sessionId);
  else if (sessionId) args.push('--session-id', sessionId);

  // Let the PM choose which model grinds the idea (composer model picker). Empty
  // / 'default' means inherit the CLI default.
  if (model && model !== 'default') args.push('--model', model);

  // Wire the connectors: hand `claude` an MCP config built from connectors.yaml so
  // discovery actually connects to your-bi-tool/your-knowledge-tool/looker/etc. Merges with the
  // user's own MCP config (no --strict), so local tools (figma, nano-banana) stay.
  if (mcpServers && Object.keys(mcpServers).length) {
    try {
      const cfgPath = path.join(os.tmpdir(), `leap-mcp-${id}.json`);
      fs.writeFileSync(cfgPath, JSON.stringify({ mcpServers }, null, 2));
      args.push('--mcp-config', cfgPath);
    } catch (e) { /* fall back to the user's own MCP config */ }
  }

  const child = spawn(bin, args, {
    // Run from the LEAPs project root so the CLI discovers .claude/skills (the real
    // pipeline skills). The concept folder is still reachable via --add-dir, and the
    // skills resolve their pipeline/<slug>/ paths relative to this root.
    cwd: projectRoot || ideaDir,
    env: spawnEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group so we can kill the CLI *and* its sub-processes as a unit
    // (stopDiscovery / stopAll signal -pid). Keep the stdio pipes; never unref —
    // the run's lifecycle stays tied to the app.
    detached: true,
  });
  activeRuns.set(id, { child, startedAt: Date.now(), prompt });

  let buf = '';
  let transcript = '';
  let resultEvent = null;
  let cliSessionId = null; // the id the CLI actually used (for self-heal)

  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line); } catch { continue; }
      const card = toCard(ev);
      if (!card) continue;
      const cards = Array.isArray(card) ? card : [card];
      for (const c of cards) {
        if (c.type === 'text') transcript += c.text + '\n';
        if (c.type === 'result') { resultEvent = c; transcript += (c.text || ''); }
        if (c.kind === 'init' && c.sessionId) cliSessionId = c.sessionId;
        try { onEvent(c); } catch {}
      }
    }
  });

  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });

  child.on('error', (err) => {
    activeRuns.delete(id);
    try { onEvent({ type: 'error', text: 'Could not start discovery: ' + err.message }); } catch {}
    try { onDone({ findings: null, transcript, result: null, error: err.message, sessionId: cliSessionId }); } catch {}
  });

  child.on('close', (code) => {
    activeRuns.delete(id);
    const blob = (stderr + transcript).toLowerCase();
    // A stale/invalid resume id → tell main to drop it so the next run starts fresh.
    const sessionError = resume && /session.*(not found|does not exist|invalid|no conversation)/.test(blob);
    if (code !== 0 && !resultEvent) {
      let msg;
      if (/credit balance is too low|insufficient_quota|billing/.test(blob)) {
        msg = 'Claude CLI billing: credit balance too low. Add credits to your API org, or sign the CLI into your Claude subscription (run `claude` → /login), then retry.';
      } else if (/not logged in|unauthorized|authentication|no api key|please run.*login/.test(blob)) {
        msg = 'Claude CLI is not authenticated. Run `claude` → /login (or set a funded API key), then retry.';
      } else if (sessionError) {
        msg = 'The conversation session expired. Send your message again to start a fresh one.';
      } else {
        msg = 'Discovery exited (' + code + '). ' + (stderr.split('\n').find(Boolean) || '');
      }
      try { onEvent({ type: 'error', text: msg }); } catch {}
    }
    const findings = parseFindings(transcript);
    try { onDone({ findings, transcript, result: resultEvent, error: code === 0 ? null : 'exit ' + code, sessionId: cliSessionId, sessionError }); } catch {}
  });

  return child;
}

function stopDiscovery(id) {
  const rec = activeRuns.get(id);
  if (rec) {
    // Kill the whole process group (the CLI plus any sub-processes it spawned).
    // The child is detached, so -pid targets the group; fall back to the direct
    // child if the group signal fails (e.g. it already exited).
    try { process.kill(-rec.child.pid, 'SIGTERM'); }
    catch { try { rec.child.kill('SIGTERM'); } catch {} }
    activeRuns.delete(id);
    return true;
  }
  return false;
}

// Kill every in-flight run — used on app quit / window close so no claude CLI
// process is left orphaned.
function stopAll() {
  for (const id of Array.from(activeRuns.keys())) stopDiscovery(id);
}

// Snapshot of in-flight runs, for the Settings panel.
function listRuns() {
  return Array.from(activeRuns.entries()).map(([id, r]) => ({
    id, startedAt: r.startedAt, prompt: r.prompt,
  }));
}

// Run a one-shot skill command headless (e.g. "/setup --sync-design") from the
// project root so .claude/skills resolves. Streams human-readable text via
// onEvent({ text }); calls onDone({ ok, error }) on close. Used for non-
// conversational maintenance runs like the design-token sync.
function runHeadlessSkill({ projectRoot, prompt, onEvent, onDone }) {
  const bin = resolveClaudeBin();
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', 'bypassPermissions',
  ];
  let child;
  try {
    child = spawn(bin, args, {
      cwd: projectRoot,
      env: spawnEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
  } catch (e) {
    try { onEvent({ text: 'Could not start sync: ' + e.message }); } catch {}
    try { onDone({ ok: false, error: e.message }); } catch {}
    return null;
  }

  let buf = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      const cards = [].concat(toCard(ev) || []);
      for (const c of cards) {
        if (c && c.type === 'text' && c.text) { try { onEvent({ text: c.text }); } catch {} }
      }
    }
  });
  child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
  child.on('error', (err) => {
    try { onEvent({ text: 'Sync failed to start: ' + err.message }); } catch {}
    try { onDone({ ok: false, error: err.message }); } catch {}
  });
  child.on('close', (code) => {
    const blob = stderr.toLowerCase();
    let error = null;
    if (code !== 0) {
      if (/not logged in|unauthorized|authentication|no api key|please run.*login/.test(blob)) {
        error = 'Claude CLI is not authenticated. Run `claude` → /login, then retry.';
      } else {
        error = 'Sync exited (' + code + '). ' + (stderr.split('\n').find(Boolean) || '');
      }
    }
    try { onDone({ ok: code === 0, error }); } catch {}
  });
  return child;
}

module.exports = { startDiscovery, stopDiscovery, stopAll, listRuns, parseFindings, resolveClaudeBin, hasSubscriptionLogin, readAccount, runHeadlessSkill };
