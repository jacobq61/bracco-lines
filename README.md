# bracco-lines-stopgap

Keeps the Bracco sports landing pages on current lines until the proper odds endpoint exists (see `SPEC.md`).

Every run opens Bracco's public league pages (game.playbracco.com: NFL, college football, MLB, NHL, NBA, WNBA, UFC) in a headless browser, reads the lines, and writes `landing-lines.json`. The landing pages read that file on load and again every 60 seconds, so prices update in place while someone is on the page.

## Run it

```bash
npm install
npx playwright install --only-shell chromium
npm run lines
```

Writes `out/landing-lines.json`. Set `OUT=/path/to/site/lp/landing-lines.json` to write it next to the landing page instead.

## Where it runs

GitHub Actions on jacobq61/bracco-lines. Each run loops for about 5.5 hours and refreshes every 3 minutes (`bin/loop.sh`), pushing `landing-lines.json` to the `gh-pages` branch. The feed is served at https://jacobq61.github.io/bracco-lines/landing-lines.json. A 20-minute cron keeps the next run queued, and `keepalive.yml` re-enables the schedule monthly so GitHub's 60-day inactivity rule never turns it off.

To run it on your own server instead, cron `node bin/run.mjs` every 5 minutes with `OUT` set to the page's folder.

## Safety rules built in

- A game is dropped 5 minutes before it starts. The page also hides any game that has started.
- If a spread or total price is outside +/-250, that market is dropped as a feed glitch.
- If fewer than 8 upcoming games come back (site down, layout changed), the run exits non-zero and the last good file stays in place.
- The page hides all prices if the file is more than 6 hours old, so a dead job shows matchups without stale odds.
- Writes are atomic (temp file + rename), so a page never reads half a file.

## Limits

This reads Bracco's rendered pages, so a front-end redesign can break the parser. The tests in `src/domain` pin the expected layout. When that happens, or when the real endpoint ships, replace the source adapter (see `AGENTS.md`).
