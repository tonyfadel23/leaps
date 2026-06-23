const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function freshRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leap-ctx-'));
  process.env.LEAPS_APP_ROOT = dir;
  delete require.cache[require.resolve('../electron/engine/context')];
  return dir;
}
const load = () => require('../electron/engine/context');
const mirror = (root) => path.join(root, '.claude', 'skills', '_shared', 'reference', 'business-context.md');

test('saveDoc creates a file and rebuilds the mirror', () => {
  const root = freshRoot();
  const ctx = load();
  const { id } = ctx.saveDoc({ title: 'Pricing Notes', summary: 'how we price', body: 'We charge per seat.' });
  assert.ok(fs.existsSync(path.join(root, 'context', id + '.md')));
  const md = fs.readFileSync(mirror(root), 'utf8');
  assert.match(md, /Pricing Notes/);
  assert.match(md, /We charge per seat\./);
});

test('toggleDoc off removes a doc from the combined output', () => {
  const root = freshRoot();
  const ctx = load();
  const { id } = ctx.saveDoc({ title: 'Draft', body: 'secret draft' });
  ctx.toggleDoc(id);
  assert.strictEqual(ctx.combinedContext().text.includes('secret draft'), false);
  assert.strictEqual(fs.existsSync(path.join(root, 'context', id + '.md')), true, 'doc is kept, not deleted');
});

test('listDocs returns docs sorted by order without bodies', () => {
  freshRoot();
  const ctx = load();
  ctx.saveDoc({ title: 'First', body: 'a' });
  ctx.saveDoc({ title: 'Second', body: 'b' });
  const docs = ctx.listDocs();
  assert.deepStrictEqual(docs.map((d) => d.title), ['First', 'Second']);
  assert.strictEqual(docs[0].body, undefined);
});

test('deleteDoc removes the file and updates the mirror', () => {
  const root = freshRoot();
  const ctx = load();
  const { id } = ctx.saveDoc({ title: 'Temp', body: 'temp body' });
  ctx.deleteDoc(id);
  assert.strictEqual(fs.existsSync(path.join(root, 'context', id + '.md')), false);
  assert.strictEqual(fs.readFileSync(mirror(root), 'utf8').includes('temp body'), false);
});

test('saveDoc updates in-place when id is provided (no second file, order preserved)', () => {
  const root = freshRoot();
  const ctx = load();
  const { id } = ctx.saveDoc({ title: 'Roadmap', body: 'v1 body' });
  ctx.saveDoc({ id, title: 'Roadmap', body: 'v2 body', active: true });
  const files = fs.readdirSync(path.join(root, 'context')).filter((f) => f.endsWith('.md'));
  assert.strictEqual(files.length, 1, 'update must not create a second file');
  const doc = ctx.getDoc(id);
  assert.ok(doc.body.includes('v2 body'), 'body should contain v2 body');
  assert.strictEqual(doc.body.includes('v1 body'), false, 'body should not contain v1 body');
  assert.strictEqual(doc.order, 1, 'order must be preserved');
});

test('migrateFromJson seeds the first doc from business-context.json', () => {
  const root = freshRoot();
  fs.writeFileSync(path.join(root, 'business-context.json'),
    JSON.stringify({ company: 'Acme grocery', markets: '', role: 'PM', scope: '', goals: '' }));
  const ctx = load();
  ctx.migrateFromJson();
  const docs = ctx.listDocs();
  assert.strictEqual(docs.length, 1);
  assert.match(ctx.getDoc(docs[0].id).body, /Acme grocery/);
});
