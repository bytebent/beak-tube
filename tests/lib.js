// Small helpers for the tests: running the engine, spectra, levels.
'use strict';
const path = require('path');
const { BeakTube } = require(path.join(__dirname, '..', 'reference', 'beak-tube.js'));

// run the engine over L (and R) with the given params; block = host buffer size
function run(sr, L, R, params, block = 128, opts = {}) {
  const e = new BeakTube(sr);
  for (const k in params || {}) e.setParam(k, params[k]);
  const n = L.length, oL = new Float32Array(n), oR = new Float32Array(n);
  if (opts.tap) e.tap = { n: 0, len: n, p: new Float32Array(n), f: new Float32Array(n) };
  const tl = new Float32Array(block), tr = new Float32Array(block);
  for (let i = 0; i < n; i += block) {
    if (opts.events) opts.events(e, i);
    const m = Math.min(block, n - i);
    const il = L.subarray(i, i + m), ir = R ? R.subarray(i, i + m) : null;
    e.process(il, ir, tl, tr, m);
    oL.set(tl.subarray(0, m), i); oR.set(tr.subarray(0, m), i);
    if (opts.each) opts.each(e, i + m);
  }
  return { e, L: oL, R: oR };
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], k = i + j + len / 2;
        const vr = re[k] * cr - im[k] * ci, vi = re[k] * ci + im[k] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[k] = ur - vr; im[k] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// Welch power spectrum (Hann, 50% overlap) of x from sample `from`
function psd(x, N = 4096, from = 0) {
  const P = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  let count = 0;
  for (let s = from; s + N <= x.length; s += N / 2) {
    for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re[i] = x[s + i] * w; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
    count++;
  }
  for (let k = 0; k < N / 2; k++) P[k] /= Math.max(1, count);
  return P;
}
// transfer |Y/X|² per bin from two signals, smoothed over `sm` bins
function transfer(x, y, N = 4096, from = 0, sm = 3) {
  const Px = psd(x, N, from), Py = psd(y, N, from), H = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let a = 0, b = 0;
    for (let j = Math.max(0, k - sm); j <= Math.min(N / 2 - 1, k + sm); j++) { a += Px[j]; b += Py[j]; }
    H[k] = b / Math.max(1e-30, a);
  }
  return H;
}
// local maxima of H between f1 and f2 (Hz), strongest first
function peaks(H, sr, N, f1, f2, count = 4) {
  const out = [];
  const k1 = Math.max(1, Math.floor(f1 / sr * N)), k2 = Math.min(H.length - 2, Math.ceil(f2 / sr * N));
  for (let k = k1; k <= k2; k++) if (H[k] > H[k - 1] && H[k] >= H[k + 1]) out.push({ f: k * sr / N, v: H[k] });
  out.sort((a, b) => b.v - a.v);
  return out.slice(0, count);
}
function peakIn(H, sr, N, f1, f2) { return peaks(H, sr, N, f1, f2, 1)[0] || { f: 0, v: 0 }; }
function rms(x, from = 0, to = x.length) { let s = 0; for (let i = from; i < to; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, to - from)); }
const db = v => 20 * Math.log10(Math.max(1e-12, v));
const cents = (a, b) => 1200 * Math.log2(a / b);
module.exports = { run, fft, psd, transfer, peaks, peakIn, rms, db, cents, BeakTube };
