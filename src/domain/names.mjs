// Display names that match the landing page's team color map (keyed "NFL:Eagles", "NCAAF:Michigan", ...).

const TWO_WORD = ['Red Sox', 'White Sox', 'Blue Jays', 'Maple Leafs', 'Golden Knights', 'Blue Jackets', 'Red Wings', 'Trail Blazers'];
const NICKNAME_LEAGUES = new Set(['NFL', 'MLB', 'NHL', 'NBA', 'WNBA']);
const SCHOOL_FIX = {Byu: 'BYU', Utep: 'UTEP', Utsa: 'UTSA', Ucf: 'UCF', Unlv: 'UNLV', Lsu: 'LSU', Tcu: 'TCU', Smu: 'SMU', Uab: 'UAB', Usc: 'USC', Ucla: 'UCLA', 'A&m': 'A&M'};

export function displayName(full, league) {
  const name = full.replace(/\s+/g, ' ').trim();
  if (NICKNAME_LEAGUES.has(league)) {
    const two = TWO_WORD.find(t => name.endsWith(' ' + t) || name === t);
    return two || name.split(' ').pop();
  }
  if (league === 'NCAAF') return name.split(' ').map(w => SCHOOL_FIX[w] || w).join(' ');
  if (league === 'UFC') return name.replace(/\bMc([a-z])/g, (_, c) => 'Mc' + c.toUpperCase()).replace(/\bMac([a-z])(?=[a-z]{3})/g, (_, c) => 'Mac' + c.toUpperCase());
  return name;
}
