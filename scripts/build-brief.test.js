const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ─── Test Helpers ────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '__test_fixtures_build_brief__');
const SCRIPTS_DIR = __dirname;

function cleanFixtures() {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
}

function setupSlug(slug, files = {}) {
  const dir = path.join(FIXTURES_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    if (name.includes('/')) {
      fs.mkdirSync(path.join(dir, path.dirname(name)), { recursive: true });
    }
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

cleanFixtures();
fs.mkdirSync(FIXTURES_DIR, { recursive: true });

let v2;
function loadV2() {
  delete require.cache[require.resolve('./regenerate-briefs-v2')];
  v2 = require('./regenerate-briefs-v2');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Step 1: regenerate-briefs-v2.js exports
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 1: Module exports ──');

test('exports buildV2Brief function', () => {
  loadV2();
  assert.strictEqual(typeof v2.buildV2Brief, 'function');
});

test('exports extractBriefData function', () => {
  loadV2();
  assert.strictEqual(typeof v2.extractBriefData, 'function');
});

test('buildV2Brief returns valid HTML with doctype', () => {
  loadV2();
  const html = v2.buildV2Brief({ title: 'Test' }, 'test-idea');
  assert.ok(html.includes('<!DOCTYPE html>'), 'Missing doctype');
  assert.ok(html.includes('<html'), 'Missing html tag');
  assert.ok(html.includes('Test'), 'Missing title');
});

// ══════════════════════════════════════════════════════════════════════════════
// Step 1.5: Slide builder data shape compatibility
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 1.5a: Feasibility builder ──');

test('feasibility: accepts flat spec fields (featureScore, teamCount, bottleneck)', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    feasibility: {
      featureScore: 42,
      teamCount: 3,
      bottleneck: 'Payment integration requires 2 teams',
      components: [
        { name: 'API Gateway', score: 12, driver: 'Effort + Risk' },
        { name: 'Frontend', score: 8, driver: 'Effort' }
      ],
      risks: [
        { risk: 'Data migration', likelihood: 'High', impact: 'High', mitigation: 'Phased rollout' }
      ],
      dependencies: [
        { dependency: 'Auth service', owner: 'Platform', status: 'Open' }
      ]
    }
  }, 'test-feas');
  assert.ok(!html.includes('available after /4'), 'Should NOT show placeholder when flat fields provided');
  assert.ok(html.includes('42'), 'Should render featureScore');
  assert.ok(html.includes('API Gateway'), 'Should render component names');
  assert.ok(html.includes('Data migration'), 'Should render risks');
});

test('feasibility: still accepts legacy f.overall wrapper', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    feasibility: {
      overall: { score: 7, status: 'Green', rationale: 'Doable with effort' },
      components: [{ name: 'Backend', effort: 'M', risk: 'Low', score: 4 }],
      risks: [],
      dependencies: []
    }
  }, 'test-feas-legacy');
  assert.ok(!html.includes('available after /4'), 'Should NOT show placeholder');
  assert.ok(html.includes('7'), 'Should render score from overall');
  assert.ok(html.includes('Backend'), 'Should render component');
});

console.log('\n── Step 1.5b: Competitors builder ──');

test('competitors: accepts differentiators[] with color-coded cells', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    competitors: {
      strategicRead: 'No one does X well',
      differentiators: [
        { name: 'Real-time tracking', us: 'strong', compA: 'partial', compB: 'absent' },
        { name: 'Subscription model', us: 'absent', compA: 'strong', compB: 'strong' }
      ],
      tableStakes: ['Fast delivery', 'Mobile app', 'Payment options'],
      takeaways: ['Gap in subscription', 'Tracking is our edge']
    }
  }, 'test-comp');
  assert.ok(html.includes('Real-time tracking'), 'Should render differentiator names');
  assert.ok(html.includes('cell-strong') || html.includes('cell-highlight'), 'Should use color-coded cells');
  assert.ok(html.includes('Fast delivery'), 'Should render table stakes');
});

test('competitors: still accepts legacy competitorRows[]', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    competitors: {
      strategicRead: 'Legacy format',
      competitorRows: [
        { name: 'CompA', market: 'UAE', offer: 'Same-day', interesting: 'Fast' }
      ],
      takeaways: ['Key insight']
    }
  }, 'test-comp-legacy');
  assert.ok(html.includes('CompA'), 'Should render legacy competitor rows');
  assert.ok(html.includes('Same-day'), 'Should render offer column');
});

console.log('\n── Step 1.5c: Journey builder ──');

test('journey: renders rich layout when structured data present', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    direction: { name: 'Smart Reorder', description: 'One-tap repeat' },
    journey: {
      insights: [
        { icon: '⏱', title: 'Time Pain', text: 'Avg 4 min to reorder', highlight: false },
        { icon: '🎯', title: 'Quick Win', text: 'One-tap cuts to 30s', highlight: true },
        { icon: '📈', title: 'Repeat Rate', text: '+18% expected lift', highlight: false }
      ],
      storyboard: [
        { icon: '😩', thought: 'Not again...', caption: 'Opens app', detail: 'Scrolling past 50 items', emotion: 'negative' },
        { icon: '🔄', thought: 'Same stuff', caption: 'Browses menus', detail: 'Decision fatigue kicks in', emotion: 'negative' },
        { icon: '✨', thought: 'Oh nice!', caption: 'Sees reorder', detail: 'Smart Reorder banner appears', emotion: 'positive', intervention: true },
        { icon: '👆', thought: 'One tap!', caption: 'Confirms order', detail: 'Previous cart pre-loaded', emotion: 'positive', intervention: true },
        { icon: '😌', thought: 'So easy', caption: 'Order placed', detail: 'Done in 30 seconds', emotion: 'positive' }
      ],
      blueprint: {
        stages: ['Discovery', 'Browse', 'Reorder Prompt', 'Confirm', 'Post-Order'],
        layers: {
          customer: ['Opens app', 'Scrolls menus', 'Taps reorder', 'Reviews cart', 'Receives food'],
          frontstage: ['Home screen', 'Menu list', 'Reorder banner', 'Pre-filled cart', 'Tracking'],
          backstage: ['Personalization', 'Menu API', 'ML model', 'Cart service', 'Dispatch'],
          support: ['CDN', 'Search index', 'Training data', 'Payment gateway', 'Logistics']
        }
      }
    }
  }, 'test-journey');
  // Should render insights
  assert.ok(html.includes('insight-card') || html.includes('Key Insights'), 'Should render insights section');
  assert.ok(html.includes('Time Pain'), 'Should render insight titles');
  // Should render storyboard
  assert.ok(html.includes('sb-panel') || html.includes('storyboard'), 'Should render storyboard');
  assert.ok(html.includes('Not again'), 'Should render thought bubbles');
  // Should render blueprint
  assert.ok(html.includes('bp-grid') || html.includes('blueprint') || html.includes('Service Blueprint'), 'Should render blueprint');
  assert.ok(html.includes('Discovery'), 'Should render blueprint stages');
});

test('journey: still uses iframe when d.files.journey exists', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    direction: { name: 'Dir' },
    journey: {},
    files: { journey: 'sketches/journey.html' }
  }, 'test-journey-iframe');
  assert.ok(html.includes('iframe') || html.includes('showcase-frame'), 'Should use iframe embed');
});

console.log('\n── Step 1.5d: Scope builder ──');

test('scope: accepts bc.statusColor field', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    whatToBuild: ['Feature A'],
    dontBuild: ['Feature B'],
    buildContext: [
      { component: 'API', statusColor: 'green', notes: 'Exists' },
      { component: 'Frontend', statusColor: 'red', notes: 'New build' }
    ]
  }, 'test-scope');
  assert.ok(html.includes('API'), 'Should render component name');
  assert.ok(html.includes('green'), 'Should use statusColor for dot class');
});

test('scope: still accepts legacy bc.exists field', () => {
  loadV2();
  const html = v2.buildV2Brief({
    title: 'Test',
    whatToBuild: ['Feature A'],
    buildContext: [
      { component: 'Backend', exists: 'Yes', notes: 'Ready' }
    ]
  }, 'test-scope-legacy');
  assert.ok(html.includes('Backend'), 'Should render component');
  assert.ok(html.includes('green') || html.includes('Exists'), 'Should handle legacy exists field');
});

// ══════════════════════════════════════════════════════════════════════════════
// Step 2: build-brief.js CLI
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n── Step 2: build-brief.js CLI ──');

test('--skeleton creates a skeleton brief.html', () => {
  const slug = 'test-skeleton';
  setupSlug(slug);
  const cmd = `node ${path.join(SCRIPTS_DIR, 'build-brief.js')} ${slug} --skeleton --pipeline-dir ${FIXTURES_DIR}`;
  execSync(cmd, { cwd: path.join(__dirname, '..') });
  const briefPath = path.join(FIXTURES_DIR, slug, 'brief.html');
  assert.ok(fs.existsSync(briefPath), 'brief.html should be created');
  const content = fs.readFileSync(briefPath, 'utf8');
  assert.ok(content.includes('<!DOCTYPE html>'), 'Should be valid HTML');
  assert.ok(content.includes('Test Skeleton') || content.includes('test-skeleton'), 'Should include slug-derived title');
});

test('--data merges provided JSON into brief', () => {
  const slug = 'test-data-merge';
  const dir = setupSlug(slug);
  // Write a briefdata JSON file using actual briefData field names
  const dataPath = path.join(dir, '.briefdata.json');
  fs.writeFileSync(dataPath, JSON.stringify({
    title: 'Data Merge Test',
    betHeadline: 'Test bet headline',
    seeking: 'Test seeking statement'
  }));
  const cmd = `node ${path.join(SCRIPTS_DIR, 'build-brief.js')} ${slug} --data ${dataPath} --pipeline-dir ${FIXTURES_DIR}`;
  execSync(cmd, { cwd: path.join(__dirname, '..') });
  const briefPath = path.join(FIXTURES_DIR, slug, 'brief.html');
  assert.ok(fs.existsSync(briefPath), 'brief.html should be created');
  const content = fs.readFileSync(briefPath, 'utf8');
  assert.ok(content.includes('Data Merge Test'), 'Should include provided title');
  assert.ok(content.includes('Test bet headline'), 'Should include betHeadline');
});

test('exits with code 1 on missing slug directory', () => {
  try {
    execSync(`node ${path.join(SCRIPTS_DIR, 'build-brief.js')} nonexistent-idea-xyz --pipeline-dir ${FIXTURES_DIR}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    assert.fail('Should have thrown');
  } catch (e) {
    assert.ok(e.status !== 0, 'Should exit with non-zero code');
  }
});

// ─── Teardown ────────────────────────────────────────────────────────────────

cleanFixtures();

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
