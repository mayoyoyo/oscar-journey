import { MOVIES } from '../src/data/movies.js';
import { getTierInfo, MAX_TIER, TIER_LABELS } from '../src/utils/tierInfo.js';

const byTier = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (const m of MOVIES) {
  const { tier } = getTierInfo(m);
  if (tier >= 1) byTier[tier].push(m);
}
const counts = Object.fromEntries(Object.entries(byTier).map(([t, arr]) => [t, arr.length]));

const curves = {
  'A linear 1,2,3,4,5'     : [0, 1, 2, 3, 4, 5],
  'B fib-ish 1,2,3,5,8'    : [0, 1, 2, 3, 5, 8],
  'C prog   1,2,4,7,11'    : [0, 1, 2, 4, 7, 11],
  'D steep  1,3,6,10,15'   : [0, 1, 3, 6, 10, 15],
  'E squared 1,4,9,16,25'  : [0, 1, 4, 9, 16, 25],
};

const ceilings = {};
for (const [name, w] of Object.entries(curves)) {
  let total = 0;
  for (let t = 1; t <= 5; t++) total += counts[t] * w[t];
  ceilings[name] = total;
}

// Profiles to spot-check
const profiles = {
  'newbie grinder (50 tier-1)': { 1: 50 },
  'casual (20/15/5/2/0)':       { 1: 20, 2: 15, 3: 5, 4: 2 },
  'balanced (60/40/20/10/3)':   { 1: 60, 2: 40, 3: 20, 4: 10, 5: 3 },
  'film-head (150/90/45/25/10)':{ 1: 150, 2: 90, 3: 45, 4: 25, 5: 10 },
  'apex-chaser (10/10/10/20/16)':{ 1: 10, 2: 10, 3: 10, 4: 20, 5: 16 },
  'completionist-T1 only (300)':{ 1: 300 },
  'skip-bottom (0/151/71/49/16)':{ 2: 151, 3: 71, 4: 49, 5: 16 },
  'everything':                 { 1: 300, 2: 151, 3: 71, 4: 49, 5: 16 },
};

console.log('Catalog counts:', counts, '\n');

// Print per-curve ceiling + tier share
console.log('Curve           | ceiling | T1 %  T2 %  T3 %  T4 %  T5 %');
console.log('----------------|---------|---------------------------');
for (const [name, w] of Object.entries(curves)) {
  const ceil = ceilings[name];
  const shares = [];
  for (let t = 1; t <= 5; t++) shares.push(((counts[t]*w[t]/ceil)*100).toFixed(1).padStart(4));
  console.log(`${name.padEnd(16)}| ${String(ceil).padStart(7)} | ${shares.join('  ')}`);
}

console.log('\n=== Spot checks — percent of ceiling ===\n');
const header = Object.keys(curves).map(k => k.padEnd(24)).join('');
console.log('Profile'.padEnd(36) + 'A lin  B fib  C prog D steep E sqr');
for (const [pname, p] of Object.entries(profiles)) {
  const row = [];
  for (const [cname, w] of Object.entries(curves)) {
    let score = 0;
    for (let t = 1; t <= 5; t++) score += (p[t] || 0) * w[t];
    const pct = ((score / ceilings[cname]) * 100).toFixed(1).padStart(5);
    row.push(`${pct}%`);
  }
  console.log(pname.padEnd(36) + row.join('  '));
}

// Marginal reward: how many tier-1s does one tier-5 equal?
console.log('\n=== Marginal reward: 1 Apex film = N Canonical films ===');
for (const [name, w] of Object.entries(curves)) {
  console.log(`${name.padEnd(16)}: 1 Apex = ${w[5]} Canonical`);
}
