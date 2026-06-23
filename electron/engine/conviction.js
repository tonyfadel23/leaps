// conviction.js — the LEAPs scoring engine.
//
// Core principle: high conviction REQUIRES grounded evidence. You cannot buy
// confidence with stage progression alone — Evidence quality is weighted highest
// and gates the verdict. This is the rigor wall: a beautiful, fully-built idea
// whose claims are all assumed stays 'needs', never 'pursue'.
//
// computeConviction(facts) takes DERIVED facts about ONE idea (assembled by the
// pipeline reader) and returns the scoring object the renderer consumes. Output
// matches the view-model in src/js/data/seed.js: { conviction, verdict, evidence,
// dimensions[4], gap, verdictLine }.
//
// INPUT `facts` shape:
//   {
//     stage: 'Grounded'|'Sketched'|'Defined'|'Explored'|'Built',  // furthest stage reached
//     claims: [ { text:string, source:string|null } ],            // exec-summary claims; source like "Looker: Order_PU", null = assumed
//     has: {
//       ground:bool, sketch:bool, define:bool, explore:bool,       // which discovery phases produced artifacts
//       metrics:bool, sketches:bool, competitors:bool,             // artifact presence flags
//       killCriteria:bool, interviews:bool
//     },
//     sizingSourced: number,   // count of sizing rows backed by a live/real source
//     sizingTotal:   number    // total sizing rows
//   }

// Stage ordering for progression math and the evidence ceiling per stage.
// LEAPs vocabulary: Learn -> Explore -> Assess -> Prove -> Build. Legacy labels
// (Grounded/Sketched/Defined) from archived runs alias to the same ranks.
const STAGE_ORDER = { Learned: 0, Explored: 1, Assessed: 2, Proven: 3, Shipped: 4,
  Grounded: 0, Sketched: 1, Defined: 2, Built: 4 };
// Max overall evidence (0-5) reachable at each stage — early stages can't earn 5.
const STAGE_EVIDENCE_CAP = { Learned: 2, Explored: 3, Assessed: 4, Proven: 4, Shipped: 5,
  Grounded: 2, Sketched: 3, Defined: 4, Built: 5 };

// Verdict thresholds. Defaults are overridable via leaps.config.json (loaded by
// settings.js and passed in as `opts`). Pursue needs BOTH conviction and evidence;
// kill fires below killBelow.
const VERDICT_DEFAULTS = { killBelow: 50, pursueFrom: 70, pursueMinEvidence: 3 };

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function stageIndex(stage) {
  return STAGE_ORDER[stage] != null ? STAGE_ORDER[stage] : 0;
}

function computeConviction(facts, opts) {
  const t = Object.assign({}, VERDICT_DEFAULTS, opts || {});
  const has = (facts && facts.has) || {};
  const claims = (facts && Array.isArray(facts.claims)) ? facts.claims : [];
  const stage = (facts && facts.stage) || 'Grounded';
  const sIdx = stageIndex(stage);
  const sizingTotal = (facts && facts.sizingTotal) || 0;
  const sizingSourced = (facts && facts.sizingSourced) || 0;

  // --- Evidence quality: the rigor gate. Sourced claims vs total. ------------
  let evidenceScore;
  if (claims.length === 0) {
    evidenceScore = 20; // no claims at all — thin by definition
  } else {
    const sourced = claims.filter(c => c && c.source).length;
    evidenceScore = Math.round((sourced / claims.length) * 100);
  }
  const sourcedCount = claims.filter(c => c && c.source).length;
  const evidenceNote = claims.length === 0
    ? 'No claims to verify — thin.'
    : (sourcedCount === claims.length
        ? 'Every claim traces to a live source.'
        : `${claims.length - sourcedCount} of ${claims.length} claims still assumed, not measured.`);

  // --- Problem: real, validated pain. Stage baseline + ground + interviews. ---
  // Grounded baseline ~55, climbs with progression; interviews are the strong
  // signal that the pain is real and not imagined.
  let problemScore = 40 + sIdx * 6;          // 40 → 64 across stages
  if (has.ground) problemScore += 8;
  if (has.interviews) problemScore += 22;    // interviews = strongest problem signal
  problemScore = clamp(problemScore, 0, 100);
  const problemNote = has.interviews
    ? 'Pain validated in interviews — real, not assumed.'
    : (has.ground ? 'Grounded in context, but no direct user validation yet.' : 'Problem still asserted, not grounded.');

  // --- Size: market plausibility. Define/metrics presence + sourcing ratio. ---
  // Modeled-only sizing caps Size (~64); live-sourced rows lift it.
  let sizeScore = 30 + sIdx * 4;             // small stage contribution
  if (has.define) sizeScore += 12;
  if (has.metrics) sizeScore += 10;
  let sizeRatio = sizingTotal > 0 ? sizingSourced / sizingTotal : 0;
  sizeScore += Math.round(sizeRatio * 30);
  // Cap when sizing is modeled-only (no live rows): plausible but unproven.
  if (sizingTotal > 0 && sizingSourced === 0) sizeScore = Math.min(sizeScore, 64);
  sizeScore = clamp(sizeScore, 0, 100);
  const sizeNote = sizingTotal > 0
    ? (sizingSourced >= sizingTotal
        ? 'Sizing inputs are live, not modeled.'
        : (sizingSourced > 0
            ? `${sizingSourced} of ${sizingTotal} sizing inputs live — attach rate still modeled.`
            : 'Plausible range, but every input is modeled.'))
    : 'No sizing model yet.';

  // --- Feasibility: can we build/operate it. Explore/define presence + stage. -
  // No exploration → cap ~50: you don't yet know if it's buildable.
  let feasScore = 35 + sIdx * 5;
  if (has.define) feasScore += 8;
  if (has.explore) feasScore += 22;
  if (has.sketches) feasScore += 5;
  if (!has.explore) feasScore = Math.min(feasScore, 50);
  feasScore = clamp(feasScore, 0, 100);
  const feasNote = has.explore
    ? 'Explored — a viable build/ops path exists.'
    : 'Not yet explored — buildability unproven.';

  // --- Dimensions (exactly these 4 keys/labels, in this order). --------------
  const dimensions = [
    { key: 'problem',     label: 'Problem',          score: problemScore,  note: problemNote },
    { key: 'size',        label: 'Size',             score: sizeScore,     note: sizeNote },
    { key: 'feasibility', label: 'Feasibility',      score: feasScore,     note: feasNote },
    { key: 'evidence',    label: 'Evidence quality', score: evidenceScore, note: evidenceNote },
  ];

  // --- Conviction: weighted average. Evidence carries the most weight. -------
  const conviction = Math.round(
    problemScore * 0.25 +
    sizeScore * 0.25 +
    feasScore * 0.2 +
    evidenceScore * 0.3
  );

  // --- Overall evidence strength (0-5), bounded by stage ceiling. -------------
  const evidence = clamp(
    Math.min(Math.round(evidenceScore / 20), STAGE_EVIDENCE_CAP[stage] != null ? STAGE_EVIDENCE_CAP[stage] : 5),
    0, 5
  );

  // --- Verdict. Pursue needs BOTH conviction AND evidence; kill below killBelow. -
  let verdict;
  if (conviction >= t.pursueFrom && evidence >= t.pursueMinEvidence) {
    verdict = 'pursue';
  } else if (conviction < t.killBelow) {
    verdict = 'kill';
  } else {
    verdict = 'needs';
  }

  // --- Gap: the lowest-scoring dimension + a concrete resolving action. -------
  const lowest = dimensions.reduce((a, b) => (b.score < a.score ? b : a));
  const gapBody = gapBodyFor(lowest, facts);
  const gap = { dim: lowest.key, body: gapBody };

  // --- Verdict line: short, situational. -------------------------------------
  const verdictLine = verdictLineFor(verdict, conviction, evidence, lowest);

  return { conviction, verdict, evidence, dimensions, gap, verdictLine };
}

// Concrete, dimension-specific gap sentence + the action that would resolve it.
function gapBodyFor(lowest, facts) {
  switch (lowest.key) {
    case 'evidence':
      return 'Evidence quality — the lift is assumed, not measured. A 2-week holdout against control would resolve it and decide Pursue vs Kill.';
    case 'problem':
      return 'Problem — the pain is asserted, not validated. A round of user interviews would confirm it is real before you invest further.';
    case 'size':
      return 'Size — the opportunity rests on a modeled attach rate. One live data pull on actual attach would tighten the range and the call.';
    case 'feasibility':
      return 'Feasibility — the build/ops path is unproven. A scoped prototype or ops dry-run would show whether it can ship.';
    default:
      return `${lowest.label} is the weakest dimension — resolve it before deciding.`;
  }
}

// Short verdict line matching seed.js tone.
function verdictLineFor(verdict, conviction, evidence, lowest) {
  if (verdict === 'pursue') return 'The evidence holds — this is a defensible call to pursue.';
  if (verdict === 'kill')   return 'Weak on every dimension — a clean negative.';
  // 'needs' — one gap from a decision.
  if (conviction >= 60)     return 'One gap away from a defensible call.';
  if (evidence < 2)         return 'Promising, but the proof is too thin to commit.';
  return `${lowest.label} is holding this back — close it to decide.`;
}

module.exports = { computeConviction, VERDICT_DEFAULTS };

// --- Inline self-test: `node conviction.js` -------------------------------
if (require.main === module) {
  const sample = {
    stage: 'Explored',
    claims: [
      { text: 'Morning-active users 5–10am', source: 'App analytics · live' },
      { text: 'Avg bundle value AED 34', source: 'Basket model · live' },
      { text: 'Breakfast attach rate 6–9%', source: null },
      { text: 'Bundle lifts weekly retention', source: null },
    ],
    has: {
      ground: true, sketch: true, define: true, explore: true,
      metrics: true, sketches: true, competitors: true,
      killCriteria: false, interviews: true,
    },
    sizingSourced: 2,
    sizingTotal: 4,
  };
  console.log(JSON.stringify(computeConviction(sample), null, 2));
}
