# Changelog

All notable changes to LEAPs are documented here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Open-source release under the MIT license.
- First-run onboarding: a 4-step welcome that connects Claude + your tools, sets
  conviction thresholds, and explains the pipeline.
- Configurable verdict thresholds in `leap.config.json` (default **kill below 50**,
  pursue at/above 70) — editable in onboarding/Settings. `kill` is now reachable;
  previously the engine could never auto-kill.
- `connectors.example.yaml` + `business-context.example.md` templates with
  `.example` fallback so a fresh clone runs without configuration.
- A sample concept (`examples/team-lunch-ordering`) shown on first run.
- Update checks against GitHub Releases (startup + *Check for Updates…* menu);
  no silent self-install (the app ships unsigned).
- Test suite: `npm test` (engine/script unit tests + structural skill/agent
  checks) and `npm run eval` (+ contract tests). Direct coverage for the
  conviction engine, the pipeline reader, and discovery findings parsing.
- CI workflow, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  issue/PR templates, `docs/collaboration.md`.

### Changed
- Renamed the pipeline vocabulary to Learn → Explore → Assess → Prove → Ship.
- Genericized all company- and person-specific references; the `pm-*` agents now
  draw their persona from `business-context.md`.

[Unreleased]: https://github.com/tonyfadel23/leaps/commits/main
