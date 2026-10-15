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
- `src/publish/` (FeedPublisher: `publish(feed)`)
  - `file.mjs`: atomic file write. Add an S3/R2/Netlify publisher here if the page moves.
- `bin/run.mjs`: wiring only.

## Rules

- Keep the feed shape in sync with `SPEC.md` and the landing pages' loader. Never rename fields without updating both pages.
- Never publish fewer than `MIN_GAMES` games; keep the last good file.
- Keep machine load low: one browser at a time, no parallel pages.
- `npm test` must pass before shipping parser changes.
