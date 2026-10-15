# Landing lines feed: developer spec

**Goal:** the sports landing pages show real, current Bracco lines, never a game that has started, and prices that update while the page is open.

**Today:** a stopgap (this repo) reads Bracco's public pages in a headless browser every 5 minutes. It works, but it depends on the front-end layout. This spec replaces it with a proper server-side job.

## 1. What we need

A job that writes one JSON file, `landing-lines.json`, every 1 to 5 minutes, served from the same origin as the landing page (for example `playbracco.com/lp/landing-lines.json`). No new public API is needed. If serving it from another origin, send `Access-Control-Allow-Origin` for the landing page domains.

Response headers: `Content-Type: application/json`, `Cache-Control: max-age=30` (or no-store). The page fetches with `cache: 'no-store'` every 60 seconds.

## 2. Source

Read pre-match lines server-side from the same source the Bracco app uses (Ganchrow, via the existing `/__sports-catalog` and `/__partner-prematch` services, or directly). These endpoints are CORS-restricted to Bracco origins, which is fine for a server-side job.

Leagues: NFL, NCAAF, MLB, NHL, NBA, WNBA, UFC. Markets: main spread (or run line / puck line), main total, moneyline. Pre-match only.

## 3. File format

```json
{
  "asOf": "2026-10-14T15:20:23.319Z",
  "games": {
    "nfl-seahawks-broncos-2026-10-15": {
      "lg": "NFL",
      "at": "2026-10-15T20:15-04:00",
      "a": ["Seahawks", "3-2"],
      "h": ["Broncos", "3-2"],
      "s": ["-2.5", "-116", "+2.5", "-104"],
      "tot": ["41.5", "+101", "-129"],
      "ml": ["-147", "+121"]
    }
  },
  "rows":  [{"h": "NFL", "p": "This week", "more": ["https://game.playbracco.com/football/nfl", "All NFL lines"], "keys": ["nfl-seahawks-broncos-2026-10-15"]}],
  "spot":  ["nfl-seahawks-broncos-2026-10-15"],
  "build": ["nfl-seahawks-broncos-2026-10-15"],
  "start": {}
}
```

| Field | Meaning |
|---|---|
| `asOf` | ISO time the lines were read. The page hides all prices if this is more than 6 hours old. |
| `games` | Keyed by a stable id. Keep the same id for the same game across runs; the page uses it to update prices in place. |
| `lg` | `NFL`, `NCAAF`, `MLB`, `NHL`, `NBA`, `WNBA`, or `UFC 333` (event number) for UFC. |
| `at` | Start time, ISO with offset. |
| `a` / `h` | Away / home: `[display name, record]`. Pro teams use the nickname ("Red Sox"), college the school, UFC the full name. Record may be `""`. |
| `s` | Optional. `[away line, away price, home line, home price]`. Omit if not offered (UFC). |
| `sl` | Optional label for `s`: `"Run line"` or `"Puck line"`. |
| `tot` | Required. `[line, over price, under price]`. For UFC, rounds. |
| `ml` | Required. `[away price, home price]`. |
| `event` | Optional, UFC: full event title. |
| `rows` | Carousels on the page, in order. `keys` are game ids. A row with fewer than 3 upcoming games is hidden. |
| `spot` | Hero spotlight game ids (up to 10, mixed sports). |
| `build` | Parlay builder game ids (one per sport, up to 6). |
| `start` | Optional preselected builder picks: `{"game-id": "ml:a"}`. |

Prices are American odds strings (`"-110"`, `"+125"`). Even money is `"+100"`.

## 4. Rules the job must follow

1. Only games starting more than 5 minutes from now and within the next 9 days.
2. Drop a spread or total if either price is outside +/-250 (bad data). Drop the game if it has no total or no moneyline.
3. Never publish fewer than 8 games. Keep the last good file instead and alert.
4. Write atomically (temp file then rename, or a single object PUT).
5. Ids must be stable: `{sport}-{away}-{home}-{YYYY-MM-DD}` lowercased with hyphens works.

## 5. What the page already does

- Loads the file on page load. Without it, it falls back to the snapshot built into the HTML.
- Re-reads it every 60 seconds (only while the tab is visible) and updates prices in place with a short orange flash. The parlay slip recalculates.
- If a game on screen disappears from the file or gains or loses a market, the page reloads the next time the visitor is idle for 2 minutes or returns to the tab.
- Hides any game whose start time has passed, and reloads when one kicks off.

## 6. Done when

- The file updates at least every 5 minutes in production.
- Opening the page during a game window shows no started games, and a line change in the app reaches the page within about 6 minutes.
- The stopgap cron is turned off.

The Google social sportsbook site should get its own feed from its own book, not Bracco's sweepstakes lines. Same format.
