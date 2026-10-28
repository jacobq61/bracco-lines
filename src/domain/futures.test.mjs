import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOutrights} from './futures.mjs';

const NFL = ['Main Lines', 'Outrights', 'Super Bowl Champion', 'OUTRIGHT WINNER', 'Buffalo Bills', '0.52', 'Over', '+700', 'Under', '-1190477',
  'San Francisco 49ers', '0.52', 'Over', '+540', 'Kansas City Chiefs', '0.52', 'Over', '+900', 'Show 27 More', 'NOV 27 9:26 AM'].join('\n');

test('reads an outright market, best price first, ignoring the junk Under row', () => {
  const r = parseOutrights(NFL);
  assert.equal(r.market, 'Super Bowl Champion');
  assert.deepEqual(r.odds, [{team: 'San Francisco 49ers', price: 540}, {team: 'Buffalo Bills', price: 700}, {team: 'Kansas City Chiefs', price: 900}]);
});

test('no outright block: null', () => {
  assert.equal(parseOutrights('Spread\nTotal\nMoneyline'), null);
});

test('stops at the next outright market on the same page', () => {
  const two = NFL + ['', 'AFC Champion', 'OUTRIGHT WINNER', 'Buffalo Bills', '0.52', 'Over', '+300'].join('\n');
  assert.equal(parseOutrights(two).odds.find(o => o.team === 'Buffalo Bills').price, 700);
});
