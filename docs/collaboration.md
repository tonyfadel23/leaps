# Collaboration — design roadmap

LEAPs is **local-first** today: one person, one machine. Concepts are files in
`pipeline/{slug}/`; discovery spawns *your* local `claude`; there are no accounts
or backend. This doc designs how multiple people could work on the same concept
(Google-Docs / Miro style) — it is a roadmap, **not yet built**.

## The good news: one seam

The renderer never touches the filesystem. All data flows through a single
abstraction:

```
src/js/data/source.js  (DataSource)  →  IPC in electron/main.js  →  engine/{pipeline-reader, store, discovery}.js
```

`conviction.js` is a pure function. So a sync/backend layer attaches at the
`DataSource`/IPC seam **without changing the UI**. That keeps either option below
tractable.

## Two viable directions

### A. Local-first + shared sync (recommended for OSS)
Concepts stay as files; a team shares a concept through a shared store — a **git
repo per workspace** or a light **sync relay**. Each person still runs their own
Claude locally.

- **Pros:** preserves "works out of the box, no SSO"; trivially open-sourceable
  (clone, point at a repo); your data stays yours.
- **Cons:** async, not real-time-simultaneous; needs merge/conflict handling on
  the shared files and a cross-user version of the `.state.json` skill lock.
- **Smallest change:** `DataSource` reads/writes the shared store; the
  `.leap.json` sidecar merge (already non-destructive) extends to multi-writer;
  decision-log stays append-only.

### B. Hosted real-time (true Google-Docs / Miro)
A backend (Postgres + a CRDT like **Yjs**), accounts/auth, a **web client**, and
server-side AI. Real simultaneous multiplayer + presence.

- **Pros:** true co-editing, presence, sharing links, mobile.
- **Cons:** large multi-month build; far harder to adopt as OSS ("deploy your own
  server + DB + auth"); gives up the local-first "works out of the box" model.
- **Attach point:** same `DataSource`/IPC seam, swapping file I/O for REST +
  WebSocket; conviction moves server-side (it's a pure function, so identical
  output); discovery runs server-side or stays per-user-local.

## Cross-cutting questions to resolve before building
- **Identity** — none today (uses the local Claude login). Both options above add
  some notion of "who" (at minimum an author tag on edits / verdicts).
- **The AI in a shared concept** — does discovery run per-user-local (A) or
  server-side with a shared key (B)? Affects cost, auth, and the moat.
- **Conflict model** — last-write-wins for verdict overrides; append-only for the
  decision log and discovered claims; CRDT only if simultaneous editing (B).
- **Distribution** — A stays desktop; B implies a web app.

## Recommendation
Start with **A** (local-first + git/relay sync): it's the smallest step, keeps
the open-source "clone and run" promise, and most teams co-author async. Revisit
**B** only if real-time simultaneous editing becomes a hard requirement.
