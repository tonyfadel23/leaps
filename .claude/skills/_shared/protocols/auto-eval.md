# Auto-Eval (Tier 2)

After a skill completes, run the LLM-as-Judge quality pass for that stage.

- Delegate to `eval/agents/judge.md` with the stage's rubric (see `/eval`).
- Score each rubric dimension 1-5 with one-line reasoning; write the scorecard to `pipeline/{slug}/eval/YYYY-MM-DD.md`.
- For stage /assess+, include the **Conviction Rigor** dimension and run the deterministic gate: `node scripts/compute-conviction.js {slug} --check`.
