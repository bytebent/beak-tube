// Reference engine tests. Run: node tests/engine-test.js
'use strict';
const path = require('path');
const L = require(path.join(__dirname, 'lib.js'));
const S = require(path.join(__dirname, 'signals.js'));
const { BeakTube } = L;

let failed = 0, count = 0;
function check(name, ok, detail) {
  count++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : ''));
  if (!ok) failed++;
}
const sr = 48000, N = 8192;
const noise = S.noise(sr, 4, 0.1);
const near = (a, b, tol) => Math.abs(a / b - 1) <= tol;
const pct = (a, b) => ((a / b - 1) * 100).toFixed(1) + '%';
const H = (params, x = noise) => { const r = L.run(sr, x, null, Object.assign({ spread: 0 }, params)); return L.transfer(x, r.L, N, 9600); };

/* ---------- Song chain ---------- */

{ // trachea alone: a closed–open tube of 3.5 cm resonates at c/4L and 3c/4L
  const r = L.run(sr, noise, null, { trachloss: 0, track: 0, spread: 0 }, 128, { tap: true });
  const T = L.transfer(noise, r.e.tap.p, N, 9600);
  const p1 = L.peakIn(T, sr, N, 1500, 4000).f, p2 = L.peakIn(T, sr, N, 6000, 9000).f;
  check('trachea 3.5 cm peaks at 2.5 and 7.5 kHz', near(p1, 2500, 0.03) && near(p2, 7500, 0.03), Math.round(p1) + ' / ' + Math.round(p2) + ' Hz');
  const r2 = L.run(sr, noise, null, { trachloss: 0, track: 0, spread: 0, size: 1 }, 128, { tap: true });
  const q1 = L.peakIn(L.transfer(noise, r2.e.tap.p, N, 9600), sr, N, 300, 1200).f;
  check('Size 1 makes the tube 4× longer', near(q1, 625, 0.04), Math.round(q1) + ' Hz (625 expected)');
}
{ // Perl et al.'s circuit values put the Helmholtz resonance near 4 kHz (their OEC average)
  const Lg = 30, Ch = 2e-8 / 350, f = 1 / (2 * Math.PI * Math.sqrt(Lg * Ch));
  check("Perl's larynx and cavity values give about 4 kHz", f > 3300 && f < 4700, Math.round(f) + ' Hz');
}
{ // with Track at 0 the cavity sits at Tune; a smaller larynx lowers it
  const res = [];
  for (const tune of [1500, 3000, 6000]) {
    const p = L.peakIn(H({ track: 0, tune, trachloss: 1, gapefollow: 0 }), sr, N, 300, 16000).f;
    res.push(Math.round(p));
    if (!near(p, tune, 0.06)) { check('cavity sits at Tune', false, tune + ' → ' + Math.round(p)); break; }
  }
  if (res.length === 3) check('cavity sits at Tune (Track 0)', true, res.join(', ') + ' Hz');
  const lo = L.peakIn(H({ track: 0, tune: 3000, trachloss: 1, larynx: 0.2 }), sr, N, 300, 16000).f;
  const hi = L.peakIn(H({ track: 0, tune: 3000, trachloss: 1, larynx: 1 }), sr, N, 300, 16000).f;
  check('a smaller larynx lowers the resonance', lo < 2500 && hi > 3500, 'Larynx 0.2: ' + Math.round(lo) + ' Hz, 1: ' + Math.round(hi) + ' Hz');
}
{ // eastern towhee: a small gape cuts 4–7.5 kHz, little effect below about 4 kHz
  const a = H({ track: 0, tune: 2000, gape: 0.05, gapefollow: 0 }), b = H({ track: 0, tune: 2000, gape: 0.95, gapefollow: 0 });
  const band = (f1, f2) => { let s = 0, c = 0; for (let k = Math.round(f1 / sr * N); k <= Math.round(f2 / sr * N); k++) { s += 10 * Math.log10(a[k] / b[k]); c++; } return s / c; };
  const low = band(500, 2500), high = band(4000, 7500);
  check('small gape cuts 4–7.5 kHz, much less below', high < -8 && high < low - 6, 'below 2.5 kHz ' + low.toFixed(1) + ' dB, 4–7.5 kHz ' + high.toFixed(1) + ' dB');
}
{ // Ring: higher Q, sharper peak
  const peakDb = ring => { const h = H({ track: 0, tune: 3000, trachloss: 1, ring }); const p = L.peakIn(h, sr, N, 1000, 8000); const k = Math.round(1500 / sr * N); return 10 * Math.log10(p.v / h[k]); };
  const a = peakDb(0.1), b = peakDb(0.9);
  check('Ring sharpens the cavity', b > a + 10, 'peak over 1.5 kHz: ' + a.toFixed(1) + ' → ' + b.toFixed(1) + ' dB');
}
{ // the response curve the bench draws matches what comes out
  const r = L.run(sr, noise, null, { track: 0, tune: 3000, spread: 0 });
  const h = L.transfer(noise, r.L, N, 9600);
  const fr = [500, 1000, 2000, 3000, 4000, 6000, 8000], db = new Float64Array(fr.length);
  r.e.response(0, fr, db);
  let worst = 0; fr.forEach((f, i) => { worst = Math.max(worst, Math.abs(db[i] - 10 * Math.log10(h[Math.round(f / sr * N)]))); });
  check('response() matches the measured response, 0.5–8 kHz', worst < 3, 'worst ' + worst.toFixed(1) + ' dB');
}

/* ---------- Tracking ---------- */

function trackErr(rate, f1, f2, secs, params, block = 100) {
  const fn = S.sweepHz(f1, f2, secs), x = S.pulses(rate, secs + 0.3, t => fn(Math.max(0, t - 0.1)));
  const r = L.run(rate, x, null, Object.assign({ track: 1, lag: 0, spread: 0 }, params), block, { tap: true });
  const d = r.e.trkDelay; let worst = 0, sum = 0, cnt = 0;
  for (let k = Math.round(0.15 * rate) + d; k < x.length - 0.1 * rate; k += 16) {
    const want = fn(Math.max(0, (k - d) / rate - 0.1)), c = Math.abs(L.cents(r.e.tap.f[k], want));
    worst = Math.max(worst, c); sum += c; cnt++;
  }
  return { mean: sum / cnt, worst };
}
for (const rate of [44100, 48000, 96000]) {
  const a = trackErr(rate, 1000, 8000, 1), b = trackErr(rate, 8000, 1000, 0.1), c = trackErr(rate, 120, 900, 1);
  check('Track 100%: the cavity follows sweeps at ' + rate / 1000 + ' kHz',
    a.mean < 5 && a.worst < 30 && b.mean < 5 && b.worst < 40 && c.mean < 5 && c.worst < 30,
    '1→8 kHz in 1 s: ' + a.mean.toFixed(1) + ' / ' + a.worst.toFixed(0) + ' ct; 8→1 kHz in 0.1 s: ' + b.mean.toFixed(1) + ' / ' + b.worst.toFixed(0) + ' ct; 120→900 Hz: ' + c.mean.toFixed(1) + ' / ' + c.worst.toFixed(0) + ' ct (mean / worst)');
}
{ // Lag smooths: a 5 ms lag trails a 3 oct/s sweep by about 3 × 1200 × 0.005 = 18 cents
  const a = trackErr(48000, 1000, 8000, 1, { lag: 0.005 });
  check('Lag 5 ms trails a fast sweep by about 18 cents', a.mean > 10 && a.mean < 25, a.mean.toFixed(1) + ' ct');
}
function content(x, f0) {
  const P = L.psd(x, N, 9600); let a = 0, b = 0;
  for (let h = 1; h * f0 < 20000; h++) { const k = Math.round(h * f0 / sr * N); let e = 0; for (let j = k - 3; j <= k + 3; j++) e += P[j]; a += h * e; b += e; }
  return a / b;
}
{ // the songbird trick: a rich source comes out a pure tone
  const out = [];
  for (const f0 of [1000, 2000, 4000]) {
    const x = S.pulses(sr, 1, f0), r = L.run(sr, x, null, { track: 1 });
    out.push([content(x, f0), content(r.L, f0)]);
  }
  check('Track 100% turns a rich source into a pure tone', out.every(([, b]) => b < 1.15),
    'content dry → out: ' + out.map(([a, b]) => a.toFixed(2) + ' → ' + b.toFixed(2)).join(', ') + ' (1 is a pure tone)');
}
{ // unsure input holds the tuning: pulses at 2 kHz, then noise, then silence
  const n = sr * 1.5, x = new Float32Array(n), p = S.pulses(sr, 0.5, 2000), z = S.noise(sr, 0.5, 0.2, 11);
  x.set(p, 0); x.set(z, sr * 0.5);
  const fs = [];
  L.run(sr, x, null, { track: 1, lag: 0, spread: 0 }, 32, { each: (e, i) => { if (i > sr * 0.6 && i % 3200 === 0) fs.push(e.info.res[0]); } });
  const ok = fs.every(f => near(f, 2000, 0.01));
  check('unsure input (noise, then silence) holds the tuning', ok, 'resonance during noise and silence: ' + Math.round(Math.min(...fs)) + '–' + Math.round(Math.max(...fs)) + ' Hz');
}
{ // stereo in stays stereo: each side tracks its own pitch
  const l = S.pulses(sr, 1, 1500), rr = S.pulses(sr, 1, 3000);
  const r = L.run(sr, l, rr, { track: 1, spread: 0 });
  const fl = r.e.info.res[0], fr = r.e.info.res[1];
  check('stereo in: each channel tracks its own pitch', near(fl, 1500, 0.01) && near(fr, 3000, 0.01), Math.round(fl) + ' / ' + Math.round(fr) + ' Hz');
  const m = L.run(sr, l, null, { spread: 0 });
  let same = true; for (let i = 0; i < m.L.length; i++) if (m.L[i] !== m.R[i]) { same = false; break; }
  const s = L.run(sr, l, null, { spread: 0.5 });
  let diff = 0; for (let i = 0; i < s.L.length; i++) diff = Math.max(diff, Math.abs(s.L[i] - s.R[i]));
  check('mono in: one tract until Spread is up', same && diff > 1e-3, 'Spread 0: identical; Spread 0.5: max difference ' + diff.toFixed(3));
}

/* ---------- latency, determinism, safety ---------- */

for (const rate of [44100, 48000, 96000]) {
  const e = new BeakTube(rate);
  const x = new Float32Array(rate / 2); x[100] = 1;
  const r = L.run(rate, x, null, { mix: 0 });
  let at = -1; for (let i = 0; i < r.L.length; i++) if (r.L[i] !== 0) { at = i; break; }
  check('fixed latency at ' + rate / 1000 + ' kHz: dry arrives exactly ' + e.latency + ' samples late', at === 100 + e.latency && r.L[at] === 1,
    (e.latency / rate * 1000).toFixed(2) + ' ms');
}
{
  const x = S.pulses(sr, 1, S.sweepHz(800, 5000, 1));
  const ref = L.run(sr, x, null, {}, 128).L;
  let same = true;
  for (const b of [1, 64, 1000]) { const o = L.run(sr, x, null, {}, b).L; for (let i = 0; i < o.length; i++) if (o[i] !== ref[i]) { same = false; break; } }
  check('same output at buffer sizes 1, 64, 128, 1000', same);
}
{
  const x = S.pulses(sr, 0.5, 2000);
  const a = L.run(sr, x, null, { bypass: 1 }), e = a.e;
  let ok = true; for (let i = e.latency; i < x.length; i++) if (a.L[i] !== x[i - e.latency]) { ok = false; break; }
  check('Bypass passes the input, delayed by the latency', ok);
}
{ // no NaN or runaway with extreme settings and inputs
  const worst = [];
  const inputs = [S.noise(sr, 1, 1, 5), new Float32Array(sr).fill(0.9), S.pulses(sr, 1, 20000 / 3, 0.1, 1), S.pulses(sr, 1, 40, 0.5, 1)];
  const sets = [{}, { ring: 1, tune: 10000, track: 0, larynx: 1 }, { ring: 1, tune: 200, larynx: 0, track: 0 }, { size: 0, gape: 1, gapefollow: 1 },
    { size: 1, trachlen: 200, trachloss: 0 }, { mode: 1, ring: 1 }, { mode: 2, inflate: 1, sactune: 1500 }, { mode: 3, body: 1, size: 1, trachlen: 200, trachloss: 0 }];
  let bad = 0;
  for (const p of sets) for (const x of inputs) {
    const r = L.run(sr, x, null, p);
    let m = 0; for (let i = 0; i < r.L.length; i++) { const v = Math.abs(r.L[i]); if (!(v < 1e3)) { bad++; break; } if (v > m) m = v; }
    worst.push(m);
  }
  check('no NaN or runaway across extreme settings and inputs', bad === 0, 'loudest peak ' + Math.max(...worst).toFixed(1));
}
{ // silence: output goes to exact zero and the engine idles, then wakes up
  const x = new Float32Array(sr * 3); x.set(S.pulses(sr, 0.3, 2000), 0); x.set(S.pulses(sr, 0.3, 2000), sr * 2.5);
  let idleSeen = false;
  const r = L.run(sr, x, null, {}, 128, { each: (e, i) => { if (i > sr * 2 && i < sr * 2.4 && e.info.idle) idleSeen = true; } });
  let zero = true; for (let i = sr * 2; i < sr * 2.4; i++) if (r.L[i] !== 0) { zero = false; break; }
  const back = L.rms(r.L, sr * 2.6, sr * 2.8) > 0.01;
  check('silence: exact zero and idle, then wakes up', idleSeen && zero && back);
}

/* ---------- level ---------- */

{
  const RANGES = [[1200, 2000, 3500, 6000], [1200, 2000, 3500, 6000], [400, 600, 800], [25, 35, 50]];
  const out = [];
  for (let m = 0; m < 4; m++) for (const rad of [1, 0]) {
    let s = 0;
    for (const f of RANGES[m]) { const x = S.pulses(sr, m === 3 ? 1.2 : 0.6, f), r = L.run(sr, x, null, { mode: m, radiation: rad }); s += L.db(L.rms(r.L, 9600) / L.rms(x, 9600)); }
    out.push(s / RANGES[m].length);
  }
  check('each mode matches the dry level, Radiation on and off (within 1 dB)', out.every(v => Math.abs(v) < 1), out.map(v => v.toFixed(1)).join(' '));
}

/* ---------- modes ---------- */

{ // Parrot: four formants inside Beckers et al.'s ranges, F3 moves about 2 kHz with the tongue
  const bands = [[900, 2500], [3500, 5000], [5000, 8200], [8200, 11000]];
  const fm = fb => bands.map(([a, b]) => L.peakIn(H({ mode: 1, tonguefb: fb, trachlen: 1.5 }), sr, N, a, b).f);
  const mid = fm(0.5), front = fm(0), back = fm(1);
  const ranges = [[1300, 1900], [4100, 4500], [5200, 7600], [8600, 9900]];
  const inside = mid.every((f, k) => f >= ranges[k][0] * 0.97 && f <= ranges[k][1] * 1.03);
  check('Parrot: four formants in the monk parakeet ranges', inside, mid.map(f => (f / 1000).toFixed(2)).join(', ') + ' kHz');
  check('Parrot: tongue back lowers F3 about 2 kHz and raises F1', front[2] - back[2] > 1500 && back[0] > front[0],
    'F3 ' + (front[2] / 1000).toFixed(2) + ' → ' + (back[2] / 1000).toFixed(2) + ' kHz, F1 ' + Math.round(front[0]) + ' → ' + Math.round(back[0]) + ' Hz');
  const lv = ht => { const h = H({ mode: 1, tongueht: ht, trachlen: 1.5 }); return 10 * Math.log10(L.peakIn(h, sr, N, 900, 2500).v); };
  check('Parrot: tongue height lowers all formants', lv(1) < lv(0) - 6, (lv(1) - lv(0)).toFixed(1) + ' dB at F1');
}
{
  const res = [300, 600, 1200].map(st => L.peakIn(H({ mode: 2, sactune: st }), sr, N, 100, 8000).f);
  check('Sac peaks at Sac tune', res.every((f, i) => near(f, [300, 600, 1200][i], 0.03)), res.map(Math.round).join(', ') + ' Hz');
  const long = S.noise(sr, 8, 0.1, 21);
  const r = L.run(sr, long, null, { mode: 3, sactune: 600, spread: 0 });
  const b = L.peakIn(L.transfer(long, r.L, 65536, 9600, 1), sr, 65536, 15, 200).f;
  check('Boom peaks at Sac tune ÷ 16', near(b, 37.5, 0.08), b.toFixed(1) + ' Hz');
}
{ // Body adds a low resonance, lower for a bigger bird
  const e0 = H({ track: 0, tune: 4000 }), e1 = H({ track: 0, tune: 4000, body: 1 });
  const k = Math.round(400 / sr * N), gain = 10 * Math.log10(e1[k] / e0[k]);
  check('Body adds a low resonance', gain > 6, '+' + gain.toFixed(1) + ' dB at 400 Hz');
}

console.log('\n' + (failed ? failed + ' of ' + count + ' FAILED' : 'all ' + count + ' passed'));
process.exit(failed ? 1 : 0);
