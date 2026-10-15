// Turns the visible text of a Bracco league page into game objects.
// Pure functions only: no browser, no network. The text layout is what game.playbracco.com renders today:
//
//   Spread | Total | Moneyline            (or Run Line / Puck Line; UFC is Moneyline | Total)
//   Philadelphia Eagles / (2-0-0) / -3.5 / -113 / o41.5 / -110 / -213
//   vs
//   Chicago Bears / (1-1-0) / +3.5 / -108 / u41.5 / -110 / +172
//   TODAY 8:15 PM
//   SEPTEMBER 28, 2026 AT 8:15 PM EDT
//   More Wagers

import {displayName} from './names.mjs';

const HEADERS = new Set(['Spread', 'Run Line', 'Puck Line', 'Total', 'Moneyline']);
const FULL_DATE = /^([A-Z]+) (\d{1,2}), (\d{4}) AT (\d{1,2}):(\d{2}) ([AP]M) (E[DS]T)$/;
const SHORT_TIME = /\d{1,2}:\d{2} [AP]M$/;
const ODDS = /^[+-]\d{3,5}$|^EVEN$/i;
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const MAX_MAIN_JUICE = 250;   // spread/total prices outside +/-250 are feed glitches (e.g. "+13 at -633"), so drop that market

export function parseFullDate(s) {
  const m = FULL_DATE.exec(s.trim());
  if (!m) return null;
  let h = +m[4] % 12; if (m[6] === 'PM') h += 12;
  const mo = MONTHS.indexOf(m[1]) + 1;
  if (!mo) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${m[3]}-${pad(mo)}-${pad(+m[2])}T${pad(h)}:${m[5]}${m[7] === 'EDT' ? '-04:00' : '-05:00'}`;
}

const odds = v => (/^EVEN$/i.test(v) ? '+100' : v);
const okJuice = (...xs) => xs.every(x => x && ODDS.test(x) && Math.abs(+odds(x)) <= MAX_MAIN_JUICE);
const cleanRecord = r => {
  const m = /^\((\d+)-(\d+)(?:-(\d+))?\)$/.exec(r || '');
  if (!m) return '';                       // pitcher names etc. are not records
  return m[3] && m[3] !== '0' ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}`;
};

// Reads one side: name, optional "(record)", then one value group per header.
function readSide(tokens, headers) {
  // Teams without a logo image render a one-letter placeholder ("G") before the name: skip it.
  if (tokens.length > 1 && /^[A-Z0-9]$/.test(tokens[0])) tokens = tokens.slice(1);
  const [name, maybeRec, ...rest] = tokens;
  const hasRec = (maybeRec || '').startsWith('(');
  const vals = hasRec ? rest : [maybeRec, ...rest].filter(v => v !== undefined);
  const out = {name, rec: hasRec ? cleanRecord(maybeRec) : ''};
  let j = 0;
  for (const h of headers) {
    if (vals[j] === '--' || vals[j] === undefined) { out[h] = null; j++; continue; }
    if (h === 'Moneyline') { out[h] = odds(vals[j]); j += 1; }
    else { out[h] = [vals[j], odds(vals[j + 1] || '')]; j += 2; }
  }
  return out;
}

// league: 'NFL' | 'NCAAF' | 'MLB' | 'NHL' | 'NBA' | 'WNBA' | 'UFC'
export function parseLeagueText(text, league) {
  const L = text.split('\n').map(s => s.trim()).filter(Boolean);
  const games = [];
  let title = '';   // UFC event title, e.g. "UFC 333: Smith Vs Jones"
  for (let i = 0; i < L.length; i++) {
    if (/^(UFC|Dana)/i.test(L[i]) && !HEADERS.has(L[i])) title = L[i];
    if (!HEADERS.has(L[i]) || HEADERS.has(L[i - 1])) continue;
    const headers = [];
    while (i < L.length && HEADERS.has(L[i])) headers.push(L[i++]);
    const vs = L.indexOf('vs', i);
    if (vs < 0 || vs - i > 12) continue;
    const sideA = L.slice(i, vs);
    let k = vs + 1;
    while (k < L.length && k - vs < 14 && !(SHORT_TIME.test(L[k]) && FULL_DATE.test(L[k + 1] || ''))) k++;
    if (k >= L.length || k - vs >= 14) continue;
    const sideB = L.slice(vs + 1, k);
    const at = parseFullDate(L[k + 1]);
    i = k + 1;
    const a = readSide(sideA, headers), h = readSide(sideB, headers);
    const g = toGame(league, title, headers, a, h, at);
    if (g) games.push(g);
  }
  return games;
}

function toGame(league, title, headers, a, h, at) {
  if (!at || !a.name || !h.name) return null;
  let lg = league;
  if (league === 'UFC') {
    if (!/^UFC/i.test(title)) return null;            // skip Contender Series and other non-UFC cards
    lg = title.split(':')[0].trim().replace(/\s+/g, ' ');
  }
  const spreadKey = headers.find(x => x === 'Spread' || x === 'Run Line' || x === 'Puck Line');
  const g = {lg, at, a: [displayName(a.name, league), a.rec], h: [displayName(h.name, league), h.rec]};
  if (spreadKey && a[spreadKey] && h[spreadKey] && okJuice(a[spreadKey][1], h[spreadKey][1])) {
    g.s = [a[spreadKey][0], a[spreadKey][1], h[spreadKey][0], h[spreadKey][1]];
    if (spreadKey !== 'Spread') g.sl = spreadKey === 'Run Line' ? 'Run line' : 'Puck line';
  }
  if (a.Total && h.Total && okJuice(a.Total[1], h.Total[1])) {
    const line = a.Total[0].replace(/^[ou]/i, '');
    if (line === h.Total[0].replace(/^[ou]/i, '')) g.tot = [line, a.Total[1], h.Total[1]];
  }
  if (a.Moneyline && h.Moneyline && ODDS.test(a.Moneyline) && ODDS.test(h.Moneyline)) g.ml = [a.Moneyline, h.Moneyline];
  if (!g.tot || !g.ml) return null;                    // the landing page needs a total and a moneyline on every card
  if (league === 'UFC') g.event = title;
  return g;
}
