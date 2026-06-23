# Session Management

Resume, phase routing, and progress tracking for a multi-phase skill.

- Each skill declares an ordered list of phase names. Write `.state.json` after every phase: `{ skill, phase, started_at (ISO), completed_phases[], context{} }`.
- **On start:** if `.state.json` exists for this skill, resume — read `completed_phases` to know where to pick up, restore `context`, re-read prior artifacts (decision-log.md, learn.md, …). Do NOT re-ask questions already answered in `decision-log.md`.
- **Concurrency guard:** if `.state.json` names a *different* in-flight skill started < 24h ago, stop and offer Wait/Force. If > 24h, treat as a crashed session and auto-clear. Same skill = resume.
- **Mid-phase crash:** the active `phase` stays out of `completed_phases`; on resume, re-read partial artifacts and continue from the next unanswered question.
