import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLeagueText, parseFullDate} from './parse.mjs';
import {buildFeed} from './feed.mjs';

const NFL = `Spread\nTotal\nMoneyline\nSeattle Seahawks\n(3-2-0)\n-2.5\n-116\no41.5\n+101\n-147\nvs\nDenver Broncos\n(3-2-0)\n+2.5\n-104\nu41.5\n-129\n+121\nTHU 8:15 PM\nOCTOBER 15, 2026 AT 8:15 PM EDT\nMore Wagers`;

test('parses a full date with zone', () => {
  assert.equal(parseFullDate('OCTOBER 15, 2026 AT 8:15 PM EDT'), '2026-10-15T20:15-04:00');
  assert.equal(parseFullDate('DECEMBER 1, 2026 AT 12:05 PM EST'), '2026-12-01T12:05-05:00');
});

test('parses an NFL game block', () => {
  const [g] = parseLeagueText(NFL, 'NFL');
  assert.deepEqual(g, {lg: 'NFL', at: '2026-10-15T20:15-04:00', a: ['Seahawks', '3-2'], h: ['Broncos', '3-2'],
    s: ['-2.5', '-116', '+2.5', '-104'], tot: ['41.5', '+101', '-129'], ml: ['-147', '+121']});
});

test('drops a glitched spread but keeps the game', () => {
  const [g] = parseLeagueText(NFL.replace('-116', '-633'), 'NFL');
  assert.equal(g.s, undefined);
  assert.ok(g.ml && g.tot);
});

test('feed skips started games and builds rows', () => {
  const games = parseLeagueText(NFL, 'NFL');
  const before = buildFeed(games, {now: Date.parse('2026-10-15T12:00-04:00')});
  assert.equal(Object.keys(before.games).length, 1);
  assert.equal(before.rows[0].h, 'NFL');
  const after = buildFeed(games, {now: Date.parse('2026-10-15T20:20-04:00')});
  assert.equal(Object.keys(after.games).length, 0);
});

test('skips the one-letter logo placeholder before a team name', () => {
  const txt = `Spread\nTotal\nMoneyline\nG\nGeorgia Southern\n(2-4)\n-3\n-119\no46.5\n-108\n-163\nvs\nO\nOld Dominion\n(2-4)\n+3\n-102\nu46.5\n-112\n+134\nTODAY 7:30 PM\nOCTOBER 15, 2026 AT 7:30 PM EDT\nMore Wagers`;
  const [g] = parseLeagueText(txt, 'NCAAF');
  assert.deepEqual([g.a, g.h, g.s, g.ml], [['Georgia Southern', '2-4'], ['Old Dominion', '2-4'], ['-3', '-119', '+3', '-102'], ['-163', '+134']]);
});
