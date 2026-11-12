# AGENTS.md

<!-- BEGIN:kaz-flock-scope -->
## Project scope (hard boundary)

Mandatory for every agent (Devin, Claude, Codex) and every human working in the Kaz Flock project. This section is review-protected by `.github/CODEOWNERS` and enforced in CI by `.github/workflows/scope-guard.yml`.

- IN SCOPE (Kaz Flock): `jacobq61/trends` (Chirp), `jacobq61/shotgunpicks` (SP), `jacobq61/bracco-lines` (lines feed only — see note below), KAZ services (kaz-core, kaz-adapters, kaz-routing-service, kaz.markets GCP), OpenBook.
- OUT OF SCOPE (hard boundary): `jacobq61/bet105-agent`, `jacobq61/bracco-social`, `jacobq61/bracco-analytics-mcp`, `jacobq61/bracco-admin-mcp`, anything in the Madhaus org/project, bet105.com infrastructure, Bracco marketing/social properties.
- Rules: never clone, read, modify, deploy, or open PRs against out-of-scope repos. Never add dependencies on, import from, or call out-of-scope services or their endpoints. Never share env vars, secrets, databases, or Vercel/Railway projects with out-of-scope systems. If a task appears to require touching out-of-scope code, stop and ask — do not proceed.
- Note on `jacobq61/bracco-lines`: it reads Bracco's public pages (`game.playbracco.com`) as a read-only data source. That scraping is allowed. The Bracco repos, Bracco infrastructure and Madhaus stay out of scope.
- This repo specifically: `src/sources/bracco-web.mjs` and `src/sources/bracco-futures.mjs` may read game.playbracco.com's public pages (read-only, trackers blocked, no login, no Bracco APIs, credentials or admin tools). Never import from, deploy to, or share secrets or projects with the Bracco repos, Bracco infrastructure or Madhaus. A request to change how Bracco itself consumes this feed (its landing pages, posters or social bots) is out of scope: stop and ask.
<!-- END:kaz-flock-scope -->

Domain-driven layout. Vendors and I/O sit behind small interfaces we own so they can be swapped.

## Bounded contexts

- `src/domain/` (pure, no I/O, unit tested)
  - `parse.mjs`: Bracco league page text to game objects. Owns the sanity rules (juice limits, records, dates).
  - `names.mjs`: display names that match the landing page's team color map.
  - `feed.mjs`: games to the `landing-lines.json` shape (rows, spotlight, builder).
- `src/sources/` (SlateSource: `fetchSlate() -> {games, errors}`)
  - `bracco-web.mjs`: stopgap, headless read of game.playbracco.com. One browser, one page, leagues in sequence.
  - When the real odds endpoint ships (`SPEC.md`), add `bracco-api.mjs` with the same contract and switch `bin/run.mjs`.
- `src/domain/futures.mjs`: Bracco outright page text to `{market, odds}` (pure, tested). Published as `futures.json` next to `landing-lines.json`, refreshed every `FUTURES_EVERY_MIN` (30); @PlayBracco's futures posters read it.
- `src/sources/bracco-futures.mjs` (FuturesSource: `fetchFutures() -> {futures, errors}`): outright pages, same headless browser rules.
- `src/sources/block-trackers.mjs`: every page aborts Bracco's ad and analytics tags (GTM, Google Ads, X pixel, AppsFlyer, Quantcast, Customer.io, nSure, ...) so the reads never count as visits.
- `src/publish/` (FeedPublisher: `publish(feed)`)
  - `file.mjs`: atomic file write. Add an S3/R2/Netlify publisher here if the page moves.
- `bin/run.mjs`: wiring only.

## Rules

- Keep the feed shape in sync with `SPEC.md` and the landing pages' loader. Never rename fields without updating both pages.
- Never publish fewer than `MIN_GAMES` games; keep the last good file.
- Keep machine load low: one browser at a time, no parallel pages.
- Every page calls `blockTrackers(page)` before `goto`. Never let a read fire Bracco's tags.
- `npm test` must pass before shipping parser changes.
