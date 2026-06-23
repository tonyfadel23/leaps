---
name: archive
description: >
  Archive or unarchive a pipeline idea. Moves ideas between pipeline/ and archive/,
  updates the kanban board, and logs the archival reason. Use when a PM says "/archive",
  "shelve this", "park this idea", "move to archive", or "/unarchive" to restore.
version: "1.0"
changelog:
  - "1.0: Initial release"
---

# /archive — Archive & Restore Ideas

Move pipeline ideas to the archive when they're completed, abandoned, or parked.
Restore them when they need to be revisited.

---

## Usage

```
/archive water-subscription                    # archive with reason prompt
/archive water-subscription --reason "shipped"  # archive with inline reason
/unarchive water-subscription                   # restore from archive
/archive --list                                 # list all archived ideas
```

---

## Archive Process

### Step 1 — Validate

1. Verify `pipeline/{slug}/` exists
2. Check for active `.state.json` — if a skill is mid-run, warn:
   "This idea has an active skill session. Archive anyway? (The session will be lost.)"
3. If PM confirms, proceed

### Step 2 — Capture Reason

If `--reason` not provided, ask:
```
Why are you archiving {slug}?

1. Shipped — bet launched, tracking results
2. Killed — didn't pass kill criteria or feasibility
3. Parked — good idea, wrong timing
4. Superseded — replaced by another bet
5. Other — (type your reason)
```

### Step 3 — Archive

1. Create `archive/` directory if it doesn't exist
2. Move `pipeline/{slug}/` to `archive/{slug}/`
3. Delete `.state.json` from the archived idea (if present)
4. Append to `archive/{slug}/decision-log.md`:
   ```markdown
   **Archived**: {date}
   **Reason**: {reason}
   **Stage at archive**: {detected stage}
   **When**: Archive
   ```
5. Create `archive/{slug}/.archive-meta.json`:
   ```json
   {
     "archived_at": "2026-06-19T15:00:00Z",
     "reason": "shipped",
     "stage_at_archive": "/prove",
     "archived_by": "Tony"
   }
   ```

### Step 4 — Update Board

Run the pipeline board generator to refresh `pipeline/index.html`:
```bash
node scripts/generate-pipeline-board.js
```

### Step 5 — Report

```
Archived: {slug}
Reason: {reason}
Stage: {stage}
Location: archive/{slug}/

To restore: /unarchive {slug}
```

---

## Unarchive Process

### Step 1 — Validate

1. Verify `archive/{slug}/` exists
2. Check that `pipeline/{slug}/` does NOT exist (name collision)
3. If collision: "A different idea with slug '{slug}' already exists in the pipeline. Rename the archived version?"

### Step 2 — Restore

1. Move `archive/{slug}/` back to `pipeline/{slug}/`
2. Delete `.archive-meta.json` from the restored idea
3. Append to `pipeline/{slug}/decision-log.md`:
   ```markdown
   **Unarchived**: {date}
   **When**: Unarchive
   ```

### Step 3 — Update Board

Run the pipeline board generator to refresh `pipeline/index.html`.

### Step 4 — Report

```
Restored: {slug}
Previous reason for archive: {reason from .archive-meta.json}
Stage: {detected stage}
Location: pipeline/{slug}/

Next step: /{next-skill-number} {slug}
```

---

## List Archived Ideas

`/archive --list` scans `archive/` and shows:

```
Archived Ideas:
| Idea | Stage | Reason | Archived |
|------|-------|--------|----------|
| water-subscription | /prove | Parked | 2026-05-15 |
| meal-planner | /explore | Killed | 2026-04-20 |
| ...

{N} ideas in archive. Use /unarchive {slug} to restore.
```

---

## Principles

1. **Reversible.** Every archive can be unarchived. No data is deleted.
2. **Reason tracked.** The decision log records why an idea was archived.
3. **Board stays clean.** Archived ideas don't appear on the pipeline kanban.
4. **Meta preserved.** `.archive-meta.json` stores archival context for later reference.
