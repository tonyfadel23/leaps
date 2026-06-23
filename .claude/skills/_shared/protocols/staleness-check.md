# Staleness Check

On entry, a skill compares its input files' mtimes against its own last output.

- If an upstream input is newer than this skill's output, or this skill's file is listed in `.state.json` `cascade.stale`, warn the PM: "{upstream} changed since {output} was written — re-run, or proceed with outdated inputs?"
- Log the PM's choice to `decision-log.md`. Never silently proceed on stale inputs.
