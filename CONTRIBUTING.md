# Contributing to LEAPs

Thanks for your interest! LEAPs is a zero-build Electron app — no bundler, no
transpile step. The renderer is plain ES modules; the main process is CommonJS.

## Setup

```bash
npm install
npm start            # run the app
npm test             # node --test scripts/*.test.js
npm run build        # package the macOS app -> dist/
```

You'll need [Claude Code](https://claude.com/claude-code) (`claude` CLI) on your
PATH for the live-discovery feature, signed into a Claude subscription.

## Project layout

```
electron/            main process + engine (conviction, pipeline-reader, store,
                     discovery, connectors) — all pure CommonJS, Node built-ins
src/                 renderer UI (vanilla JS modules: state, views, brief kit)
scripts/             brief build + conviction CLI (build-brief.js, compute-conviction.js)
.claude/             the discovery pipeline — skills, agents, shared protocols/templates
connectors.example.yaml   sample data-source config
examples/            a sample concept shown on first run
docs/                design docs (e.g. collaboration roadmap)
```

`pipeline/` (your concepts) and `connectors.yaml` / `business-context.md` (your
filled-in config) are **gitignored** — never commit private work or internal
endpoints.

## Conventions

- Keep the engine (`electron/engine/*.js`) pure and Node-built-ins only — it must
  run standalone (`node electron/engine/conviction.js`).
- The renderer talks to data **only** through the `DataSource` abstraction
  (`src/js/data/source.js`) → IPC. Don't reach into the filesystem from the UI.
- Match the surrounding style. No new dependencies without discussion.
- Add a `node --test` test for engine/script changes where practical.

## Pull requests

1. Fork, branch from `main`.
2. Make the change + tests; run `npm test`.
3. Open a PR describing the what and why. Small, focused PRs merge fastest.

By contributing you agree your contributions are licensed under the project's
[MIT License](LICENSE).
