// Builds landing-lines.json from parsed games. Same shape the landing pages read:
// {asOf, games: {id: game}, rows: [{h, p, more: [url, label], keys}], spot: [id], build: [id], start: {}}

const DAY = 864e5;
const PRIORITY = ['NFL', 'NCAAF', 'MLB', 'NHL', 'NBA', 'WNBA', 'UFC'];
const sport = g => g.lg.split(' ')[0];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const listJoin = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

export function gameId(g) {
  return slug(`${sport(g)} ${g.a[0]} ${g.h[0]} ${g.at.slice(0, 10)}`);
}

export function buildFeed(parsed, {now = Date.now(), moreBase = 'https://game.playbracco.com', horizonDays = 9} = {}) {
  const games = {};
  for (const g of parsed) {
    const t = new Date(g.at).getTime();
    if (t <= now + 5 * 6e4 || t > now + horizonDays * DAY) continue;   // started or too far out
    const {event, ...clean} = g;
    games[gameId(g)] = {...clean, ...(event ? {event} : {})};
  }
  const ids = Object.keys(games).sort((x, y) => new Date(games[x].at) - new Date(games[y].at));
  const of = lg => ids.filter(id => sport(games[id]) === lg);

  const rows = [];
  if (of('NFL').length) rows.push({h: 'NFL', p: 'This week', more: [`${moreBase}/football/nfl`, 'All NFL lines'], keys: of('NFL').slice(0, 10)});
  if (of('NCAAF').length) rows.push({h: 'College Football', p: 'This week', more: [`${moreBase}/football/college-football`, 'All college lines'], keys: of('NCAAF').slice(0, 10)});
  const mixLeagues = ['MLB', 'NHL', 'NBA', 'WNBA'].filter(lg => of(lg).length);
  if (mixLeagues.length) {
    const keys = ids.filter(id => mixLeagues.includes(sport(games[id]))).slice(0, 10);
    rows.push({h: 'Up next', p: listJoin(mixLeagues.filter(lg => keys.some(id => sport(games[id]) === lg))), more: [`${moreBase}/sports`, 'All sports'], keys});
  }
  const ufc = of('UFC');
  if (ufc.length) {
    const lg = games[ufc[0]].lg, card = ufc.filter(id => games[id].lg === lg);
    const ev = (games[card[0]].event || lg).split(':').slice(1).join(':').trim().replace(/\bVs\b/g, 'vs');
    const day = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'long'}).format(new Date(games[card[0]].at));
    rows.push({h: lg, p: ev ? `${ev}. ${day}` : day, more: [`${moreBase}/mma/ufc`, 'All UFC fights'], keys: card.slice(0, 10)});
  }

  // Spotlight: round-robin across sports so the hero shows a mix, soonest first.
  const spot = [], queues = PRIORITY.map(of);
  while (spot.length < 10 && queues.some(q => q.length)) for (const q of queues) if (q.length && spot.length < 10) spot.push(q.shift());

  // Parlay builder: one game per sport; the page refills slots as games start.
  const build = PRIORITY.map(lg => of(lg)[0]).filter(Boolean).slice(0, 6);

  return {asOf: new Date(now).toISOString(), source: 'bracco-lines-stopgap (headless read of game.playbracco.com)', games, rows, spot, build, start: {}};
}
