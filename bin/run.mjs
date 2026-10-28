#!/usr/bin/env node
// Reads Bracco's lines and writes landing-lines.json. Run it every 5 minutes (see README).
//   OUT=/path/to/landing-lines.json  where to write (default ./out/landing-lines.json)
//   MORE_BASE=https://...            base URL for the "All NFL lines" links (default game.playbracco.com)
//   FUTURES_OUT=/path/futures.json   Bracco outright odds (default next to OUT); FUTURES_EVERY_MIN=30
//   MIN_GAMES=8                      refuse to overwrite the last good file if fewer games than this came back

import {createBraccoWebSource} from '../src/sources/bracco-web.mjs';
import {createFilePublisher} from '../src/publish/file.mjs';
import {buildFeed} from '../src/domain/feed.mjs';
import {createBraccoFuturesSource} from '../src/sources/bracco-futures.mjs';

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

// Futures (outrights) move slowly: refresh when the last file is older than FUTURES_EVERY_MIN. Never blocks the lines.
const FUT_OUT = process.env.FUTURES_OUT || OUT.replace(/[^/]+$/, 'futures.json');
const {stat} = await import('node:fs/promises');
const age = await stat(FUT_OUT).then(s => Date.now() - s.mtimeMs).catch(() => Infinity);
if (age > +(process.env.FUTURES_EVERY_MIN || 30) * 60e3) {
  const {futures, errors: fe} = await createBraccoFuturesSource({log}).fetchFutures();
  if (Object.keys(futures).length) {
    await createFilePublisher(FUT_OUT).publish({asOf: new Date().toISOString(), source: 'bracco-lines-stopgap (headless read of game.playbracco.com outrights)', futures});
    log(`wrote futures for ${Object.keys(futures).join(', ')} -> ${FUT_OUT}${fe.length ? ` (${fe.join('; ')})` : ''}`);
  } else log(`no futures read; keeping the last file. ${fe.join('; ')}`);
}
