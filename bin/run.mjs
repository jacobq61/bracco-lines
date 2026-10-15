#!/usr/bin/env node
// Reads Bracco's lines and writes landing-lines.json. Run it every 5 minutes (see README).
//   OUT=/path/to/landing-lines.json  where to write (default ./out/landing-lines.json)
//   MORE_BASE=https://...            base URL for the "All NFL lines" links (default game.playbracco.com)
//   MIN_GAMES=8                      refuse to overwrite the last good file if fewer games than this came back

import {createBraccoWebSource} from '../src/sources/bracco-web.mjs';
import {createFilePublisher} from '../src/publish/file.mjs';
import {buildFeed} from '../src/domain/feed.mjs';

const OUT = process.env.OUT || new URL('../out/landing-lines.json', import.meta.url).pathname;
const MORE_BASE = process.env.MORE_BASE || 'https://game.playbracco.com';
const MIN_GAMES = +(process.env.MIN_GAMES || 8);
const log = m => console.log(`[${new Date().toISOString()}] ${m}`);

const source = createBraccoWebSource({log});
const publisher = createFilePublisher(OUT);

const {games, errors} = await source.fetchSlate();
const feed = buildFeed(games, {moreBase: MORE_BASE});
const count = Object.keys(feed.games).length;
if (count < MIN_GAMES) {
  log(`only ${count} upcoming games (min ${MIN_GAMES}); keeping the last good file. ${errors.join('; ')}`);
  process.exit(1);
}
await publisher.publish(feed);
log(`wrote ${count} games, ${feed.rows.length} rows -> ${OUT}${errors.length ? ` (skipped: ${errors.join('; ')})` : ''}`);
