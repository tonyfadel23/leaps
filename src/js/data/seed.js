// Seed data — the view-model the UI consumes. This is the CONTRACT the Electron
// pipeline reader (Phase 2) reproduces from real pipeline/{slug}/ artifacts.
// Browser/dev runs render from this directly. It's a generic product example:
// a SaaS team running discovery across an activation/monetization portfolio.

window.SEED = {
  ideas: [
    { id:'onboarding', slug:'guided-onboarding', name:'Guided onboarding', category:'activation',
      owner:'Maya Chen', initials:'MC', updated:'2d ago', stage:'Explored',
      conviction:58, verdict:'needs', evidence:3,
      takeaway:'Unknown: activation lift — run the holdout before deciding.',
      dimensions:[
        { key:'problem',     label:'Problem',          score:78, note:'Real pain, validated in 12 interviews.' },
        { key:'size',        label:'Size',             score:64, note:'Plausible upside, lift still modeled.' },
        { key:'feasibility', label:'Feasibility',      score:72, note:'Ships on the existing onboarding surface.' },
        { key:'evidence',    label:'Evidence quality', score:32, note:'Activation lift assumed, not measured.' },
      ],
      gap:{ dim:'evidence', body:'Evidence quality — the activation lift is assumed, not measured. A 2-week 50/50 holdout would resolve it and decide Pursue vs Kill.' },
      verdictLine:'One gap away from a defensible call.',
      sizing:{
        headline:'Upside is real, but the lift is modeled from a similar flow — not measured for onboarding.',
        liveLabel:'2 of 4 live',
        metrics:[
          { v:'$0.9–1.4M', l:'ARR impact / yr', dot:null },
          { v:'Medium', l:'Confidence', dot:'var(--needs)' },
          { v:'Medium', l:'Complexity', dot:null },
        ],
        rows:[
          { m:'New signups / month', v:'18K',        s:'Product analytics · live', dot:'var(--pursue)' },
          { m:'Day-1 activation rate', v:'34%',       s:'Analytics · live',         dot:'var(--pursue)' },
          { m:'Modeled lift from guidance', v:'+6–10pt', s:'Comp: import flow',     dot:'var(--needs)' },
          { m:'ARR impact / year', v:'$0.9–1.4M',     s:'Derived',                  dot:'var(--needs)' },
        ],
        note:'Upside holds at the low end. The range is wide because the lift is modeled from the import flow, not measured for onboarding.',
      },
      journey:{
        headline:'The empty workspace right after signup is where new users stall — no obvious first step.',
        steps:[
          { t:'0:00', l:'Sign up', friction:false },
          { t:'0:30', l:'Empty workspace', friction:true, note:'no first step' },
          { t:'2:00', l:'Create project', friction:false },
          { t:'4:00', l:'Invite teammate', friction:false },
          { t:'6:00', l:'First value', friction:false },
        ],
        note:'The empty state is the friction point: users land in a blank workspace with no obvious next step and bounce. A short guided checklist removes the guesswork — that is the product.',
      },
      brief:{
        title:'Guided onboarding',
        sections:[
          { lbl:'The bet', body:'New users sign up but stall in an empty workspace and never reach first value. A short, guided checklist that walks them to their first project and invite removes the guesswork that kills activation.' },
          { lbl:'The job', body:'Get a new user from signup to a real "aha" in their first session — without reading docs or guessing what to do next.' },
          { lbl:'The unknown', body:'Whether guidance lifts day-1 activation or just reshuffles when already-motivated users get there. A 2-week 50/50 holdout resolves it.' },
        ],
      },
      artifacts:[
        { id:'research', kind:'Research · 12 interviews', title:'Onboarding interviews', meta:'Synthesized · 3d ago', strength:5, icon:'research' },
        { id:'proto',    kind:'Prototype · interactive',  title:'Checklist flow',     meta:'Updated 2d ago',     strength:3, icon:'proto' },
        { id:'data',     kind:'Data pull · pending',      title:'Activation cohort',  meta:'Queued · ETA 1 day', strength:1, icon:'data', pending:true },
        { id:'brief',    kind:'Brief · auto-drafted',     title:'One-pager',          meta:'From this session',  strength:2, icon:'brief' },
      ],
      messages:[
        { role:'user', text:'Idea: a guided onboarding checklist that walks new users to their first project and invite. Worth pursuing?' },
        { role:'ai', kind:'text', tag:'Framing', text:'Strong problem, thin proof. The whole bet rides on one number — does guidance actually lift day-1 activation, or just move when already-motivated users get there? Let’s size it, then go find the evidence that would change your mind.' },
        { role:'ai', kind:'sizing', tag:'Sizing' },
        { role:'ai', kind:'journey', tag:'Journey' },
        { role:'ai', kind:'proto', tag:'Prototype', text:'I mocked the first-session flow — a 4-step checklist that drops users straight into creating their first project.', expand:'proto' },
        { role:'ai', kind:'closing', tag:'Recommendation', text:'Biggest unknown is activation lift. Before any build, run a 2-week 50/50 holdout and measure day-1 activation against control. I’ve queued the data pull — it’s in Evidence on the right.', expand:'data' },
      ],
      chips:['Pull the activation cohort','Define kill criteria','Compare to the import flow','Draft the 2-week test'],
      expanded:{
        data:{
          warn:'Queued · ETA 1 day. This is the missing measurement — day-1 activation, guided cohort vs control.',
          bars:[
            { label:'Control',      val:'34%', score:34, color:'var(--ink-2)',  bg:'var(--surface-3)' },
            { label:'Guided · low', val:'37%', score:37, color:'var(--needs)',  bg:'var(--needs-weak)' },
            { label:'Guided · mid', val:'41%', score:41, color:'var(--accent)', bg:'var(--accent-weak)' },
            { label:'Guided · high',val:'44%', score:44, color:'var(--pursue)', bg:'var(--pursue-weak)' },
          ],
          quotes:[
            { text:'“I signed up, saw a blank screen, and had no idea what to do first. I closed the tab.”', who:'New user · interview 03' },
            { text:'“Just show me the one thing to do to get started — I’ll figure out the rest.”', who:'Team admin · interview 09' },
            { text:'“Too many options on day one. I don’t know which ones matter yet.”', who:'Analyst · interview 11' },
          ],
        },
      },
    },
    { id:'nudges', slug:'in-app-upgrade-nudges', name:'In-app upgrade nudges', category:'monetization',
      owner:'Alex Rivera', initials:'AR', updated:'1d ago', stage:'Built',
      conviction:81, verdict:'pursue', evidence:5, takeaway:'Converts in two cohorts. Ship the pilot.' },
    { id:'billing', slug:'usage-based-billing', name:'Usage-based billing', category:'pricing',
      owner:'Priya Nair', initials:'PN', updated:'4d ago', stage:'Defined',
      conviction:64, verdict:'needs', evidence:2, takeaway:'Revenue model unproven — model churn risk first.' },
    { id:'csvimport', slug:'bulk-csv-import', name:'Bulk CSV import', category:'onboarding',
      owner:'Jordan Lee', initials:'JL', updated:'6h ago', stage:'Proven',
      conviction:84, verdict:'pursue', evidence:4, takeaway:'Clear demand, low build cost. Ship it.' },
    { id:'referral', slug:'referral-rewards', name:'Referral rewards', category:'growth',
      owner:'Maya Chen', initials:'MC', updated:'3d ago', stage:'Defined',
      conviction:73, verdict:'pursue', evidence:4, takeaway:'Cheaper than paid acquisition, stickier in tests.' },
    { id:'templates', slug:'templates-marketplace', name:'Templates marketplace', category:'content',
      owner:'Alex Rivera', initials:'AR', updated:'5d ago', stage:'Sketched',
      conviction:52, verdict:'needs', evidence:2, takeaway:'Supply side thin. Re-test with seed templates.' },
    { id:'presence', slug:'live-collaboration', name:'Live collaboration cursors', category:'collaboration',
      owner:'Priya Nair', initials:'PN', updated:'1w ago', stage:'Grounded',
      conviction:39, verdict:'needs', evidence:1, takeaway:'Delight, not need. Weak willingness to pay.' },
  ],
  killed: [
    { name:'Native mobile rewrite', reason:'Cost 6× a responsive web build, with near-identical reach. No case.', when:'Killed 2w ago', owner:'JL' },
    { name:'AI activity feed',      reason:'No retention signal across three separate tests. A clean negative.', when:'Killed 1mo ago', owner:'MC' },
    { name:'Crypto payments',       reason:'Demand sat below the noise floor. Not worth the compliance load.', when:'Killed 1mo ago', owner:'PN' },
  ],
};
