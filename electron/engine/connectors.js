// connectors.js — reads connectors.yaml (in the project root) and produces (a) a SIMPLE
// deduplicated list of the real data sources for Settings, and (b) the MCP config
// + prompt hints that actually WIRE those sources into a discovery run.
//
// connectors.yaml is the pipeline framework's rich source of truth (roles, primary
// + fallbacks, hints). LEAPs doesn't need that shape: many roles point at the same
// source (one source often serves several roles). So we
// collapse roles → unique sources, keyed by MCP name, and keep only what LEAPs uses:
// name, url, transport, and a one-line purpose.

const fs = require('fs');
const path = require('path');
// Robust YAML parsing. js-yaml is a declared dependency; the try/catch keeps the
// engine working (via the legacy line parser) even if it's somehow unavailable.
let YAML = null;
try { YAML = require('js-yaml'); } catch { YAML = null; }

function connectorsPath(pipelineDir) {
  // Resolve the project root from this file (electron/engine/ -> project root).
  const appRoot = path.join(__dirname, '..', '..');
  const candidates = [];
  if (pipelineDir) {
    candidates.push(
      path.join(path.dirname(pipelineDir), 'connectors.yaml'),
      path.join(pipelineDir, 'connectors.yaml'),
      path.join(pipelineDir, '..', 'connectors.yaml'),
    );
  }
  // App-root: the user's active config (gitignored), then the shipped sample.
  candidates.push(
    path.join(appRoot, 'connectors.yaml'),
    path.join(appRoot, 'connectors.example.yaml'),
  );
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

function humanizeRole(role) {
  return String(role || '').split('_').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// The fixed catalog of roles the pipeline knows how to use. You bind these to your
// tools; you don't invent roles. Order is the display order in Settings.
//   examples — suggested tools, shown as a hint so binding isn't guesswork.
//   fallback — what LEAPs does when the role is UNBOUND, so discovery still works.
//   mode     — the default fallback_mode for an unbound role (ask_user | skip).
const ROLE_CATALOG = [
  { role: 'metrics_source',    description: 'Customer counts, order volumes, sizing, baselines, unit economics',
    examples: 'Looker, BigQuery, Metabase, a data gateway', mode: 'ask_user',
    fallback: 'LEAPs asks you to paste the numbers and labels them as PM-provided (not measured).' },
  { role: 'product_analytics', description: 'Events, funnels, cohorts — behavioral product data',
    examples: 'Amplitude, Mixpanel, PostHog', mode: 'ask_user',
    fallback: 'LEAPs reasons from assumptions and flags every behavioral claim as unmeasured.' },
  { role: 'knowledge_base',    description: 'Prior work, domain ownership, existing decisions, tribal knowledge',
    examples: 'Confluence, Notion, Glean, Slack', mode: 'skip',
    fallback: 'LEAPs proceeds without prior-work context and notes the gap.' },
  { role: 'feedback',          description: 'Voice of customer: reviews, research, churn drivers',
    examples: 'Dovetail, app-store reviews, survey tools', mode: 'ask_user',
    fallback: 'LEAPs relies on what you tell it about customer pain and flags it as unverified.' },
  { role: 'support',           description: 'Support tickets: complaint volume, top recurring issues',
    examples: 'Zendesk, Intercom, Freshdesk', mode: 'skip',
    fallback: 'LEAPs asks you for the top pain points instead of pulling ticket volume.' },
  { role: 'ticketing',         description: 'Issue trackers: prior tickets, RFCs, planned/closed work',
    examples: 'Jira, Linear, Shortcut, Asana', mode: 'skip',
    fallback: 'LEAPs skips prior-ticket lookups — tell it about known work and blockers.' },
  { role: 'market_intel',      description: 'Competitor tracking, market research, industry benchmarks',
    examples: 'Crayon, Similarweb, a research MCP', mode: 'skip',
    fallback: 'LEAPs falls back to web search for competitor and market data.' },
  { role: 'design_system',     description: 'Design tokens, component patterns, visual language',
    examples: 'Figma, Storybook', mode: 'skip',
    fallback: "Prototypes use LEAPs' built-in default tokens." },
  { role: 'code_explorer',     description: 'Codebase, architecture, feasibility — what already exists',
    examples: 'GitHub, GitLab, a repo MCP', mode: 'skip',
    fallback: 'Feasibility is estimated from your description and flagged as unverified.' },
];
const CATALOG_ROLES = ROLE_CATALOG.map((r) => r.role);
const CATALOG_BY_ROLE = new Map(ROLE_CATALOG.map((r) => [r.role, r]));

const blankConn = () => ({ mcp: '', url: '', transport: 'http', hint: '' });

// Parse connectors.yaml → role objects. Uses a real YAML parser (js-yaml) so any
// valid YAML works — varying indentation, quoting styles, comments, blank values.
// Falls back to the legacy line parser if js-yaml is unavailable or the parse throws.
function parseRoles(text) {
  if (YAML) {
    try {
      const doc = YAML.load(String(text || ''));
      const conns = doc && typeof doc === 'object' ? doc.connectors : undefined;
      if (conns && typeof conns === 'object' && !Array.isArray(conns)) {
        return Object.keys(conns).map((role) => roleFromYaml(role, conns[role] || {}));
      }
      // Valid YAML but no `connectors:` map → no roles bound yet.
      if (doc === null || doc === undefined || (typeof doc === 'object' && conns === undefined)) return [];
    } catch { /* malformed YAML → fall back to the tolerant line parser */ }
  }
  return parseRolesLegacy(text);
}

// Map one YAML role node to the role object shape the rest of the engine expects.
function roleFromYaml(role, node) {
  node = node && typeof node === 'object' ? node : {};
  const p = node.primary && typeof node.primary === 'object' ? node.primary : {};
  const str = (v) => (v == null ? null : String(v).trim());
  const fbs = (Array.isArray(node.fallbacks) ? node.fallbacks : [])
    .filter((f) => f && typeof f === 'object')
    .map((f) => ({ mcp: str(f.mcp) || '', url: str(f.url) || '', transport: str(f.transport) || 'http', hint: f.hint == null ? '' : String(f.hint) }));
  return {
    role: String(role),
    label: humanizeRole(role),
    mcp: str(p.mcp),
    url: str(p.url),
    transport: str(p.transport),
    hint: p.hint == null ? '' : String(p.hint),
    description: node.description == null ? '' : String(node.description),
    required: node.required === true,
    fallback_mode: node.fallback_mode ? String(node.fallback_mode) : 'ask_user',
    fallbacks: fbs,
  };
}

// Legacy tolerant line parser — fallback when js-yaml isn't available. Captures each
// role's primary connector AND its fallbacks (the order the resolver tries them).
function parseRolesLegacy(text) {
  const lines = String(text || '').split(/\r?\n/);
  const roles = [];
  let cur = null, section = null, fb = null, started = false;
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (/^connectors:\s*$/.test(line)) { started = true; continue; }
    if (!started) continue;
    if (/^\s*#/.test(line) || !line.trim()) continue;

    const roleM = line.match(/^ {2}([a-z0-9_]+):\s*$/i);
    if (roleM) {
      cur = { role: roleM[1], label: humanizeRole(roleM[1]), mcp: null, url: null, transport: null, hint: '', description: '', required: false, fallback_mode: 'ask_user', fallbacks: [] };
      roles.push(cur); section = null; fb = null; continue;
    }
    if (!cur) continue;

    const descM = line.match(/^ {4}description:\s*"?(.*?)"?\s*$/);
    if (descM) { cur.description = descM[1]; continue; }
    const reqM = line.match(/^ {4}required:\s*(true|false)\s*$/);
    if (reqM) { cur.required = reqM[1] === 'true'; continue; }
    const fmM = line.match(/^ {4}fallback_mode:\s*"?([a-z_]+)"?\s*$/);
    if (fmM) { cur.fallback_mode = fmM[1]; continue; }
    if (/^ {4}primary:\s*$/.test(line)) { section = 'primary'; continue; }
    if (/^ {4}fallbacks:\s*$/.test(line)) { section = 'fallbacks'; continue; }

    if (section === 'primary') {
      const m = line.match(/^ {6}(mcp|url|transport|hint):\s*"?(.*?)"?\s*$/);
      if (m) { const k = m[1]; if (k === 'mcp') cur.mcp = m[2].trim(); else if (k === 'url') cur.url = m[2].trim(); else if (k === 'transport') cur.transport = m[2].trim(); else cur.hint = m[2]; }
    } else if (section === 'fallbacks') {
      const startM = line.match(/^ {6}- (mcp):\s*"?(.*?)"?\s*$/);
      if (startM) { fb = blankConn(); fb.mcp = startM[2].trim(); cur.fallbacks.push(fb); continue; }
      const contM = line.match(/^ {8}(mcp|url|transport|hint):\s*"?(.*?)"?\s*$/);
      if (contM && fb) { const k = contM[1]; if (k === 'url') fb.url = contM[2].trim(); else if (k === 'transport') fb.transport = contM[2].trim(); else if (k === 'hint') fb.hint = contM[2]; else fb.mcp = contM[2].trim(); }
    }
  }
  return roles;
}

// Merge parsed roles onto the fixed catalog so every role always shows (bound or
// not), in catalog order. Any extra roles in the file are appended after.
function withCatalog(parsed) {
  const byRole = new Map(parsed.map((r) => [r.role, r]));
  // Per-role display metadata (examples + unbound fallback) always comes from the
  // catalog, so the Settings UI can explain each role and what happens when unset.
  const meta = (c) => ({ examples: c.examples || '', fallback: c.fallback || '' });
  const out = ROLE_CATALOG.map((c) => {
    const r = byRole.get(c.role);
    byRole.delete(c.role);
    return r
      ? Object.assign({}, r, { description: r.description || c.description }, meta(c))
      : { role: c.role, label: humanizeRole(c.role), mcp: null, url: null, transport: 'http', hint: '',
          description: c.description, required: false, fallback_mode: c.mode || 'ask_user', fallbacks: [], ...meta(c) };
  });
  for (const r of byRole.values()) out.push(r); // any non-catalog roles still present
  return out;
}

// Collapse roles → unique sources keyed by MCP name (primary + fallbacks both
// count as reachable sources). Carries the roles each serves + url/transport.
function dedupeSources(roles) {
  const map = new Map();
  const add = (mcp, url, transport, label, purpose) => {
    if (!mcp) return;
    if (!map.has(mcp)) map.set(mcp, { name: mcp, url: url || null, transport: transport || null, serves: [], purpose: purpose || '' });
    const s = map.get(mcp);
    if (label && s.serves.indexOf(label) === -1) s.serves.push(label);
    if (!s.url && url) { s.url = url; s.transport = transport; }
  };
  for (const r of roles) {
    add(r.mcp, r.url, r.transport, r.label, r.description);
    for (const f of (r.fallbacks || [])) add(f.mcp, f.url, f.transport, r.label + ' (fallback)', r.description);
  }
  return Array.from(map.values());
}

// readConnectors(pipelineDir) → simple, deduped view + everything needed to wire
// discovery. `sources` is for display; `mcpServers` + `promptBlock` wire the run.
function readConnectors(pipelineDir) {
  const p = connectorsPath(pipelineDir);
  const empty = { ok: false, path: p || null, sources: [], roles: withCatalog([]), mcpServers: {}, promptBlock: '', count: 0, presets: listPresets() };
  if (!p) return empty;
  let text = '';
  try { text = fs.readFileSync(p, 'utf8'); } catch { return empty; }

  const roles = withCatalog(parseRoles(text));
  const sources = dedupeSources(roles);

  // MCP config for `claude -p --mcp-config`: only the reachable http sources.
  const mcpServers = {};
  for (const s of sources) {
    if (s.url && /^https?:\/\//i.test(s.url)) mcpServers[s.name] = { type: 'http', url: s.url };
  }

  // Compact "data sources" block injected into the discovery system prompt — both
  // what's connected AND how to degrade for what isn't (so fallbacks are honored).
  const unbound = roles.filter((r) => !r.mcp && r.fallback);
  const promptBlock = [
    sources.length
      ? 'Data sources connected (use the matching MCP tools):\n' +
        sources.map((s) => `- ${s.name}: ${s.serves.join(', ')}`).join('\n')
      : '',
    unbound.length
      ? 'Not connected — degrade gracefully (never fabricate):\n' +
        unbound.map((r) => `- ${r.label}: ${r.fallback}`).join('\n')
      : '',
  ].filter(Boolean).join('\n\n');

  return { ok: true, path: p, sources, roles, mcpServers, promptBlock, count: sources.length, presets: listPresets() };
}

// ── editing: serialize roles back to the schema parseRoles() reads ──
const appRoot = () => path.join(__dirname, '..', '..');
const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '')}"`;

function serializeRoles(roles) {
  let out = '# Connectors — managed by LEAPs Settings (or edit by hand).\n'
    + '# Each role binds a primary MCP + optional fallbacks the resolver tries in order.\n\nconnectors:\n';
  for (const r of (Array.isArray(roles) ? roles : [])) {
    const role = String(r.role || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!role) continue;
    out += `  ${role}:\n`;
    out += `    description: ${q(r.description)}\n`;
    if (r.mcp || r.url) {
      out += `    primary:\n`;
      if (r.mcp) out += `      mcp: ${String(r.mcp).trim()}\n`;
      if (r.url) out += `      url: ${q(r.url)}\n`;
      out += `      transport: ${r.transport || 'http'}\n`;
      if (r.hint) out += `      hint: ${q(r.hint)}\n`;
    }
    const fbs = (r.fallbacks || []).filter((f) => f && (f.mcp || f.url));
    if (fbs.length) {
      out += `    fallbacks:\n`;
      for (const f of fbs) {
        out += `      - mcp: ${String(f.mcp || '').trim()}\n`;
        if (f.url) out += `        url: ${q(f.url)}\n`;
        out += `        transport: ${f.transport || 'http'}\n`;
        if (f.hint) out += `        hint: ${q(f.hint)}\n`;
      }
    }
    out += `    required: ${r.required ? 'true' : 'false'}\n`;
    out += `    fallback_mode: ${r.fallback_mode || 'ask_user'}\n\n`;
  }
  return out;
}

// Write to the active connectors.yaml (app root). Returns the path written.
function writeConnectors(roles) {
  const p = path.join(appRoot(), 'connectors.yaml');
  fs.writeFileSync(p, serializeRoles(roles));
  return p;
}

function listPresets() {
  try {
    return fs.readdirSync(path.join(appRoot(), 'presets'))
      .filter((f) => /\.ya?ml$/i.test(f)).map((f) => f.replace(/\.ya?ml$/i, '')).sort();
  } catch { return []; }
}

// Copy presets/{name}.yaml → connectors.yaml. Returns { ok }.
function applyPreset(name) {
  try {
    const src = path.join(appRoot(), 'presets', String(name).replace(/[^a-z0-9_-]/gi, '') + '.yaml');
    if (!fs.existsSync(src)) return { ok: false };
    fs.copyFileSync(src, path.join(appRoot(), 'connectors.yaml'));
    return { ok: true };
  } catch { return { ok: false }; }
}

module.exports = { readConnectors, connectorsPath, parseRoles, serializeRoles, writeConnectors, listPresets, applyPreset, withCatalog, ROLE_CATALOG, CATALOG_ROLES };

// self-test: `node connectors.js`
if (require.main === module) {
  const r = readConnectors(path.join(__dirname, '..', '..', 'pipeline'));
  console.log('path:', r.path, '| sources:', r.count, '| wired (http):', Object.keys(r.mcpServers).length);
  for (const s of r.sources) console.log(`  ${s.url ? '●' : '○'} ${s.name} → ${s.serves.join(', ')}`);
  console.log('\n--- promptBlock ---\n' + r.promptBlock);
}
