// Bracco outright (futures) page text to { market, odds: [{ team, price }] }.
// The page lists each team as "Team | 0.52 | Over | +540" (the 0.52 and "Over" are widget labels);
// an "Under | -1190477" row can follow a team and is not a real price, so only Over rows count.
const PRICE = /^[+-]\d{3,6}$/;

export function parseOutrights(text) {
  const lines = String(text).split('\n').map(s => s.trim()).filter(Boolean);
  const start = lines.findIndex(l => /^OUTRIGHT WINNER$/i.test(l));
  if (start < 0) return null;
  const market = lines[start - 1] || 'Outright Winner';
  const odds = [];
  for (let i = start + 1; i < lines.length - 3; i++) {
    if (/^OUTRIGHT WINNER$/i.test(lines[i])) break;   // the next market (e.g. conference winner) starts here
    const [team, , over, price] = lines.slice(i, i + 4);
    if (/^\d\.\d+$/.test(lines[i + 1]) && over === 'Over' && PRICE.test(price) && /^[A-Z][A-Za-z0-9 .'&-]+$/.test(team)) {
      const p = Number(price);
      if (p > -1000 && p < 100000 && !odds.some(o => o.team === team)) odds.push({ team, price: p });   // sanity: real futures prices only
      i += 3;
    }
  }
  return odds.length ? { market, odds: odds.sort((a, b) => implied(b.price) - implied(a.price)) } : null;
}
const implied = p => (p < 0 ? -p / (-p + 100) : 100 / (p + 100));
