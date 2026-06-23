// context.js — the user's business context as a folder of toggleable markdown
// docs (context/*.md). The folder is the source of truth; active docs are
// concatenated into the mirror file (.claude/skills/_shared/reference/
// business-context.md) that the CLI pipeline skills read, and returned in-process
// via combinedContext() for live discovery. Onboarding's five-field form is kept
// as a compatibility path that seeds the first doc.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const appRoot = () => process.env.LEAPS_APP_ROOT || path.join(__dirname, '..', '..');
const ctxDir = () => path.join(appRoot(), 'context');
const jsonPath = () => path.join(appRoot(), 'business-context.json');
const mdPath = () => path.join(appRoot(), '.claude', 'skills', '_shared', 'reference', 'business-context.md');

const FIELDS = ['company', 'markets', 'role', 'scope', 'goals'];

function slugify(s) {
  return (String(s || 'doc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'doc');
}

function parseRaw(raw) {
  // Split optional `---\n<yaml>\n---\n<body>`; tolerate a body-only file.
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  let meta = {}, body = raw;
  if (m) { try { meta = yaml.load(m[1]) || {}; } catch { meta = {}; } body = m[2]; }
  return { meta, body: body.replace(/^\n+/, '') };
}

function serialize(doc) {
  const meta = { title: doc.title || 'Untitled', summary: doc.summary || '', active: doc.active !== false, order: doc.order || 1 };
  return `---\n${yaml.dump(meta).trim()}\n---\n${(doc.body || '').trim()}\n`;
}

function ensureDir() { try { fs.mkdirSync(ctxDir(), { recursive: true }); } catch {} }

function readDoc(id) {
  try {
    const raw = fs.readFileSync(path.join(ctxDir(), id + '.md'), 'utf8');
    const { meta, body } = parseRaw(raw);
    return { id, title: meta.title || id, summary: meta.summary || '', active: meta.active !== false, order: Number(meta.order) || 1, body };
  } catch { return null; }
}

function allDocs() {
  let files = [];
  try { files = fs.readdirSync(ctxDir()).filter((f) => f.endsWith('.md') && !f.startsWith('.')); } catch {}
  return files.map((f) => readDoc(f.slice(0, -3))).filter(Boolean).sort((a, b) => a.order - b.order);
}

function listDocs() {
  migrateFromJson();
  return allDocs().map(({ id, title, summary, active, order }) => ({ id, title, summary, active, order }));
}

function getDoc(id) { return readDoc(id); }

function saveDoc({ id, title, summary, body, active } = {}) {
  ensureDir();
  let docId = id;
  let order;
  if (docId && fs.existsSync(path.join(ctxDir(), docId + '.md'))) {
    order = (readDoc(docId) || {}).order || 1;
  } else {
    let base = slugify(title), candidate = base, n = 2;
    while (fs.existsSync(path.join(ctxDir(), candidate + '.md'))) candidate = `${base}-${n++}`;
    docId = candidate;
    const orders = allDocs().map((d) => d.order);
    order = (orders.length ? Math.max(...orders) : 0) + 1;
  }
  fs.writeFileSync(path.join(ctxDir(), docId + '.md'),
    serialize({ title, summary, body, active: active !== false, order }));
  rebuildContextMd();
  return { ok: true, id: docId };
}

function deleteDoc(id) {
  try { fs.unlinkSync(path.join(ctxDir(), id + '.md')); } catch {}
  rebuildContextMd();
  return { ok: true };
}

function toggleDoc(id) {
  const d = readDoc(id);
  if (!d) return { ok: false };
  d.active = !d.active;
  fs.writeFileSync(path.join(ctxDir(), id + '.md'), serialize(d));
  rebuildContextMd();
  return { ok: true, active: d.active };
}

function combinedContext() {
  const active = allDocs().filter((d) => d.active && d.body.trim());
  if (!active.length) return { text: '', hasAny: false };
  const text = `# Business Context\n\nYour company and role, used to ground every discovery question. Managed by LEAPs' Settings → Context.\n\n`
    + active.map((d) => `## ${d.title}\n\n${d.body.trim()}\n`).join('\n');
  return { text, hasAny: true };
}

function rebuildContextMd() {
  const { text, hasAny } = combinedContext();
  try {
    fs.mkdirSync(path.dirname(mdPath()), { recursive: true });
    fs.writeFileSync(mdPath(), hasAny ? text : '# Business Context\n\n_(no active context)_\n');
  } catch {}
}

function fieldsToBody(c) {
  const line = (label, v) => `- **${label}:** ${v && String(v).trim() ? String(v).trim() : '_(not set)_'}`;
  return [
    '## Company', line('What you do', c.company), line('Markets & segments', c.markets), '',
    '## Role & scope', line('Your role', c.role), line('Your scope', c.scope), '',
    '## Priorities & goals', line('Current goals / OKRs', c.goals),
  ].join('\n');
}

function migrateFromJson() {
  if (fs.existsSync(ctxDir())) return; // already on the folder model
  let json = {};
  try { json = JSON.parse(fs.readFileSync(jsonPath(), 'utf8')) || {}; } catch { return; }
  if (!FIELDS.some((f) => json[f] && String(json[f]).trim())) return;
  ensureDir();
  fs.writeFileSync(path.join(ctxDir(), 'company-and-role.md'),
    serialize({ title: 'Company & Role', summary: 'What you do, your role, scope, and goals', body: fieldsToBody(json), active: true, order: 1 }));
  rebuildContextMd();
}

// ── Compatibility shims (onboarding + main.js getContext/saveContext) ──
function loadContext() {
  try { return Object.assign({ company: '', markets: '', role: '', scope: '', goals: '' }, JSON.parse(fs.readFileSync(jsonPath(), 'utf8')) || {}); }
  catch { return { company: '', markets: '', role: '', scope: '', goals: '' }; }
}

function saveContext(patch) {
  const merged = loadContext();
  for (const f of FIELDS) if (patch && patch[f] !== undefined) merged[f] = patch[f] || '';
  const clean = {}; for (const f of FIELDS) clean[f] = merged[f] || '';
  try { fs.writeFileSync(jsonPath(), JSON.stringify(clean, null, 2) + '\n'); } catch {}
  // Seed/refresh the first doc so onboarding input grounds discovery.
  ensureDir();
  const existing = fs.existsSync(path.join(ctxDir(), 'company-and-role.md')) ? readDoc('company-and-role') : null;
  fs.writeFileSync(path.join(ctxDir(), 'company-and-role.md'),
    serialize({ title: 'Company & Role', summary: 'What you do, your role, scope, and goals', body: fieldsToBody(clean), active: existing ? existing.active : true, order: existing ? existing.order : 1 }));
  rebuildContextMd();
  return clean;
}

function toMarkdown(c) { return `# Business Context\n\n${fieldsToBody(c)}\n`; }

module.exports = {
  listDocs, getDoc, saveDoc, deleteDoc, toggleDoc, combinedContext, rebuildContextMd, migrateFromJson,
  loadContext, saveContext, toMarkdown, FIELDS,
};
