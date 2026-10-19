// CPU per scenario: share of one core the reference engine needs at 48 kHz, host buffer 128.
// Run: node tools/perf.js
'use strict';
const path = require('path');
const { BeakTube } = require(path.join(__dirname, '..', 'reference', 'beak-tube.js'));
const S = require(path.join(__dirname, '..', 'tests', 'signals.js'));
const sr = 48000, secs = 4, B = 128;
const mono = S.pulses(sr, secs, S.sweepHz(800, 6000, secs)), [sl, srr] = S.stereo(sr, secs), silent = new Float32Array(sr * secs);
const SCEN = [
  ['Silent (idle)', silent, null, {}],
  ['Mono in, Song, Spread 0', mono, null, { spread: 0 }],
  ['Mono in, Song, defaults (two tracts)', mono, null, {}],
  ['Stereo in, Song (two trackers)', sl, srr, {}],
  ['Stereo in, Parrot', sl, srr, { mode: 1 }],
  ['Stereo in, Sac', sl, srr, { mode: 2 }],
  ['Stereo in, Boom, crane, 200 cm', sl, srr, { mode: 3, size: 1, trachlen: 200 }],
];
const oL = new Float32Array(B), oR = new Float32Array(B);
console.log('Scenario'.padEnd(40) + 'CPU (one core, 48 kHz)');
for (const [name, L, R, p] of SCEN) {
  const e = new BeakTube(sr); for (const k in p) e.setParam(k, p[k]);
  const run = () => { for (let i = 0; i + B <= L.length; i += B) e.process(L.subarray(i, i + B), R ? R.subarray(i, i + B) : null, oL, oR, B); };
  run(); // warm up
  const t0 = process.hrtime.bigint(); run(); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(name.padEnd(40) + (ms / (secs * 1000) * 100).toFixed(1) + '%');
}
