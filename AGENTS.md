# AGENTS.md

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
