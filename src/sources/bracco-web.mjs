// SlateSource adapter: reads Bracco's public league pages with a headless browser.
// This is the stopgap. When the proper endpoint exists, write another adapter with the same
// fetchSlate() contract (returns parsed games) and swap it in bin/run.mjs. Nothing else changes.

import {chromium} from 'playwright';
import {parseLeagueText} from '../domain/parse.mjs';

export const LEAGUES = [
  {key: 'NFL', path: '/football/nfl'},
  {key: 'NCAAF', path: '/football/college-football'},
  {key: 'MLB', path: '/baseball/mlb'},
  {key: 'NHL', path: '/hockey/nhl'},
  {key: 'NBA', path: '/basketball/nba'},
  {key: 'WNBA', path: '/basketball/wnba'},
  {key: 'UFC', path: '/mma/ufc'},
];

export function createBraccoWebSource({base = 'https://game.playbracco.com', log = () => {}} = {}) {
  return {
    async fetchSlate(leagues = LEAGUES) {
      const browser = await chromium.launch();
      const games = [], errors = [];
      try {
        for (const {key, path} of leagues) {
          let parsed = [], lastErr = null, lastSeen = '';
          for (let attempt = 0; attempt < 2 && !parsed.length; attempt++) {
            const page = await browser.newPage({viewport: {width: 1440, height: 1000}, timezoneId: 'America/New_York', locale: 'en-US'});   // dates parse as EDT/EST
            try {
              await page.goto(base + path, {waitUntil: 'domcontentloaded', timeout: 45000});
              // The game list renders after the shell; poll until the parsed count is non-zero and stable.
              let prev = -1;
              for (let i = 0; i < 20; i++) {
                await page.mouse.wheel(0, 2500); await page.waitForTimeout(1000);
                const text = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
                parsed = parseLeagueText(text, key); lastSeen = text;
                if (parsed.length && parsed.length === prev && i >= 3) break;
                prev = parsed.length;
              }
            } catch (e) { lastErr = e.message.split('\n')[0]; }
            finally { await page.close(); }
          }
          if (!parsed.length && lastSeen) log(`${key}: page text starts: ${lastSeen.replace(/\s+/g, ' ').slice(0, 300)}`);
          if (!parsed.length && lastErr) { errors.push(`${key}: ${lastErr}`); log(`${key}: failed (${lastErr})`); continue; }
          log(`${key}: ${parsed.length} games`);
          games.push(...parsed);
        }
      } finally { await browser.close(); }
      return {games, errors};
    },
  };
}
