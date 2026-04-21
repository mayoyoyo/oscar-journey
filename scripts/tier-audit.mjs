import { MOVIES } from '../src/data/movies.js';
import { getTierInfo, MAX_TIER, TIER_LABELS } from '../src/utils/tierInfo.js';

const buckets = {};
const lists = {};
let tier0 = 0;
let total = 0;
let scoreSum = 0;

for (const m of MOVIES) {
  const { tier } = getTierInfo(m);
  total++;
  if (tier === 0) { tier0++; continue; }
  buckets[tier] = (buckets[tier] || 0) + 1;
  scoreSum += tier;
  for (const l of (m.lists || [])) lists[l] = (lists[l] || 0) + 1;
}

console.log('Total films:', total);
console.log('Tier 0 (no canon endorsement):', tier0);
for (let t = MAX_TIER; t >= 1; t--) {
  const n = buckets[t] || 0;
  const pct = ((n / total) * 100).toFixed(1);
  console.log(`Tier ${t} ${TIER_LABELS[t].padEnd(11)}  n=${String(n).padStart(3)}  pct=${pct}%  contributes ${t * n} to max score`);
}
console.log('\nMax Canon Score sum:', scoreSum);

const contrib = {};
for (let t = 1; t <= MAX_TIER; t++) contrib[t] = t * (buckets[t] || 0);
const sumC = Object.values(contrib).reduce((a,b)=>a+b,0);
console.log('\nContribution to max score by tier:');
for (let t = MAX_TIER; t >= 1; t--) {
  const pct = ((contrib[t] / sumC) * 100).toFixed(1);
  console.log(`  Tier ${t}: ${pct}% of total score capacity (n=${buckets[t] || 0})`);
}
