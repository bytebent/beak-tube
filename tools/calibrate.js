// Measures each mode's level against dry at its defaults, on band-limited pulse trains in the
// mode's own range, and prints the GAIN and GAIN_FLOW values that bring the mean to 0 dB.
// Run: node tools/calibrate.js (paste the result into reference/beak-tube.js if it moved).
'use strict';
const path = require('path');
const L = require(path.join(__dirname, '..', 'tests', 'lib.js'));
const S = require(path.join(__dirname, '..', 'tests', 'signals.js'));
const { GAIN_NOW, FLOW_NOW } = (() => { const { BeakTube } = L; return { GAIN_NOW: BeakTube.GAIN, FLOW_NOW: BeakTube.GAIN_FLOW }; })();
const sr = 48000;
const RANGES = [[1200, 2000, 3500, 6000], [1200, 2000, 3500, 6000], [400, 600, 800], [25, 35, 50]];
function mean(params, notes, secs) {
  let s = 0;
  for (const f of notes) { const x = S.pulses(sr, secs, f), r = L.run(sr, x, null, params); s += L.db(L.rms(r.L, 9600) / L.rms(x, 9600)); }
  return s / notes.length;
}
const gain = [], flow = [];
for (let m = 0; m < 4; m++) {
  const secs = m === 3 ? 1.2 : 0.6;
  const on = mean({ mode: m }, RANGES[m], secs), off = mean({ mode: m, radiation: 0 }, RANGES[m], secs);
  gain.push(+(GAIN_NOW[m] * Math.pow(10, -on / 20)).toFixed(2));
  flow.push(+(FLOW_NOW[m] * Math.pow(10, (on - off) / 20)).toFixed(2));
  console.log(['Song', 'Parrot', 'Sac', 'Boom'][m].padEnd(7), 'on', on.toFixed(1), 'dB  off', off.toFixed(1), 'dB');
}
console.log('const GAIN = [' + gain.join(', ') + '];');
console.log('const GAIN_FLOW = [' + flow.join(', ') + '];');
