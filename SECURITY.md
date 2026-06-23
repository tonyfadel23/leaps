# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, use GitHub's private vulnerability reporting (the **Security** tab →
*Report a vulnerability*) on this repository, or email the maintainers listed in
`package.json`. We'll acknowledge within a few days and keep you posted on a fix.

## Scope notes

LEAPs is **local-first**: it runs on your machine, drives your own `claude` CLI,
and reads/writes files in a folder you choose. It has no server and stores no
data remotely. The most relevant areas:

- **Connectors** — `connectors.yaml` may contain internal endpoints/credentials.
  It is gitignored by default; keep it out of commits.
- **Live discovery** — spawns your local `claude` binary with `--permission-mode
  acceptEdits` inside the active concept folder. Only run it on concepts you
  trust, since the agent can edit files in that folder.
- **Update checks** — LEAPs queries the GitHub Releases API over HTTPS and never
  auto-installs; it only links you to a download.
