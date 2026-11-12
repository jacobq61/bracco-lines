# Ops: Kaz Flock scope and secrets isolation

`jacobq61/bracco-lines` is in the Kaz Flock project for the lines feed only. The hard boundary is the
"Project scope (hard boundary)" section at the top of `AGENTS.md`. Reading Bracco's public pages
(`game.playbracco.com`) as a read-only source is allowed; the Bracco repos, Bracco infrastructure and
Madhaus are out of scope.

## Guardrails in this repo

| What | Where | Effect |
| --- | --- | --- |
| Scope block | `AGENTS.md` | Every agent reads it first |
| PR template | `.github/pull_request_template.md` | Every PR carries the scope text and a scope checkbox |
| Scope guard CI | `.github/workflows/scope-guard.yml`, `.github/scripts/scope-guard.sh` | Fails a PR whose diff adds an out-of-scope identifier, or that removes the scope block from `AGENTS.md` |
| Guard exemptions | `.github/scope-guard-allow.txt` | Only the guardrail files themselves |
| Owner review | `.github/CODEOWNERS` | Guardrail, CI and publish files need Jacob's review |

Blocked identifiers (case-insensitive, added lines only): `bet105`, `bracco-social`, `bracco-analytics`,
`bracco-admin` (also with `_` or a space), `madhaus` (also `mad-haus`, `mad haus`). `playbracco.com` and the
word Bracco on their own are not blocked, so the scrapers need no exemption.

### Turning enforcement on (Jacob, GitHub settings)

This repo is public, so branch protection is available on GitHub Free. In Settings, Branches, protect
`main` with "Require a pull request before merging", "Require review from Code Owners" and the required
status check `scope` (Scope guard). The `lines` workflow publishes to `gh-pages`, not `main`, so protecting
`main` does not affect the feed.

## Secrets and infrastructure inventory (2026-11-12)

Method: every env var and secret the code and workflows read was listed and checked against the blocked
identifiers, and for Slack or alert webhooks.

| Platform | Use | Secrets |
| --- | --- | --- |
| GitHub Actions | `lines` (scrape every 3 minutes, publish to `gh-pages`), `keepalive`, `scope-guard` | `GITHUB_TOKEN` only (the built-in token) |
| GitHub Pages | Serves `landing-lines.json` and `futures.json` | none |
| Vercel, Railway, GCP | none | No references in this repo |

Env vars read by the code: `OUT`, `FUTURES_OUT`, `MIN_GAMES`, `FUTURES_EVERY_MIN`, `MORE_BASE`, `LOOP_SECONDS`.
None are secrets.

### Findings

- No secrets beyond `GITHUB_TOKEN`; no env var references an out-of-scope system; no Slack webhooks
  (a failing run alerts through GitHub's failed-workflow email).
- The scraper sends no credentials to Bracco and blocks Bracco's trackers (`src/sources/block-trackers.mjs`).
- Consumers: the published feed is read by Bracco's landing pages and @PlayBracco's futures posters
  (`AGENTS.md`, Bounded contexts). Those consumers are Bracco marketing/social properties and out of scope;
  changes on their side are not made from this repo.
- Live check (Jacob): `gh secret list -R jacobq61/bracco-lines` should list nothing.
