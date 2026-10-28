// FuturesSource adapter: reads Bracco's public outright pages (?outrights=1) with a headless browser.
// fetchFutures() -> { futures: { NFL: { market, odds }, ... }, errors }. One page at a time.
import {chromium} from 'playwright';
import {blockTrackers} from './block-trackers.mjs';
import {parseOutrights} from '../domain/futures.mjs';

export const FUTURES = [
  {key: 'NFL', path: '/football/nfl?outrights=1'},
  {key: 'NHL', path: '/hockey/nhl?outrights=1'},
  {key: 'NBA', path: '/basketball/nba?outrights=1'},
  {key: 'NCAAF', path: '/football/college-football?outrights=1'},
];

export function createBraccoFuturesSource({base = 'https://game.playbracco.com', log = () => {}} = {}) {
  return {
    async fetchFutures(leagues = FUTURES) {
      const browser = await chromium.launch();
      const futures = {}, errors = [];
      try {
        for (const {key, path} of leagues) {
          const page = await browser.newPage({viewport: {width: 1440, height: 1000}, timezoneId: 'America/New_York', locale: 'en-US'});
            await blockTrackers(page);   // no fake visits in Bracco's ad and analytics data
          try {
            await page.goto(base + path, {waitUntil: 'domcontentloaded', timeout: 45000});
            // Expand "Show N More" until the team count stops growing (the page shows the top 5 first).
            let parsed = null, prev = -1, stable = 0;
            for (let i = 0; i < 15 && stable < 2; i++) {
              await page.waitForTimeout(1000);
              const more = page.getByText(/^Show \d+ More$/).first();
              if (await more.count()) await more.click().catch(() => {});
              parsed = parseOutrights(await page.evaluate(() => (document.querySelector('main') || document.body).innerText));
              const n = parsed?.odds.length ?? 0;
              stable = n > 0 && n === prev ? stable + 1 : 0;
              prev = n;
            }
            if (parsed) { futures[key] = parsed; log(`${key} futures: ${parsed.market}, ${parsed.odds.length} teams`); }
          } catch (e) { errors.push(`${key} futures: ${e.message.split('\n')[0]}`); }
          finally { await page.close(); }
        }
      } finally { await browser.close(); }
      return {futures, errors};
    },
  };
}
