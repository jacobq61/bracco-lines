## What changed

## How it was checked

## Checklist
- [ ] Stays inside the Kaz Flock scope below: Bracco is read only through its public pages; no Bracco repo, Bracco infra, Madhaus or other out-of-scope system touched or referenced
- [ ] `npm test` passes (required for parser changes)
- [ ] Feed shape unchanged, or `SPEC.md` and the landing pages' loader updated together

<!-- BEGIN:kaz-flock-scope -->
## Project scope (hard boundary)

Mandatory for every agent (Devin, Claude, Codex) and every human working in the Kaz Flock project. This section is review-protected by `.github/CODEOWNERS` and enforced in CI by `.github/workflows/scope-guard.yml`.

- IN SCOPE (Kaz Flock): `jacobq61/trends` (Chirp), `jacobq61/shotgunpicks` (SP), `jacobq61/bracco-lines` (lines feed only — see note below), KAZ services (kaz-core, kaz-adapters, kaz-routing-service, kaz.markets GCP), OpenBook.
- OUT OF SCOPE (hard boundary): `jacobq61/bet105-agent`, `jacobq61/bracco-social`, `jacobq61/bracco-analytics-mcp`, `jacobq61/bracco-admin-mcp`, anything in the Madhaus org/project, bet105.com infrastructure, Bracco marketing/social properties.
- Rules: never clone, read, modify, deploy, or open PRs against out-of-scope repos. Never add dependencies on, import from, or call out-of-scope services or their endpoints. Never share env vars, secrets, databases, or Vercel/Railway projects with out-of-scope systems. If a task appears to require touching out-of-scope code, stop and ask — do not proceed.
- Note on `jacobq61/bracco-lines`: it reads Bracco's public pages (`game.playbracco.com`) as a read-only data source. That scraping is allowed. The Bracco repos, Bracco infrastructure and Madhaus stay out of scope.
- This repo specifically: `src/sources/bracco-web.mjs` and `src/sources/bracco-futures.mjs` may read game.playbracco.com's public pages (read-only, trackers blocked, no login, no Bracco APIs, credentials or admin tools). Never import from, deploy to, or share secrets or projects with the Bracco repos, Bracco infrastructure or Madhaus. A request to change how Bracco itself consumes this feed (its landing pages, posters or social bots) is out of scope: stop and ask.
<!-- END:kaz-flock-scope -->
