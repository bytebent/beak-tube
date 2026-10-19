// Deterministic test inputs shared by the tests and the calibration.
'use strict';
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 * 2 - 1; }; }

// A rich bird-like source: a train of raised-cosine pulses (open share `duty`) at f0, built from its
// harmonics up to 0.45 × sr so it is band-limited at any pitch (like Syrinx's decimated output).
// f0 may be a number or a function of time (s) → Hz, for sweeps.
function pulses(sr, seconds, f0 = 2000, duty = 0.25, level = 0.3) {
  const n = Math.round(sr * seconds), out = new Float32Array(n);
  const ff = typeof f0 === 'function' ? f0 : () => f0;
  // Fourier coefficients of a Hann pulse of width duty (period 1)
  const coef = k => { const u = k * duty; if (Math.abs(1 - u * u) < 1e-9) return duty / 4; const s = u === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u); return duty * s / (1 - u * u); };
  const C = new Float64Array(400); for (let k = 1; k < 400; k++) C[k] = coef(k);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const f = ff(i / sr);
    ph += f / sr; if (ph >= 1) ph -= 1;
    const K = Math.min(399, Math.floor(0.45 * sr / f));
    let x = 0; for (let k = 1; k <= K; k++) x += C[k] * Math.cos(2 * Math.PI * k * ph);
    out[i] = level * 2 * x;
  }
  return out;
}
// exponential sweep from f1 to f2 over the whole length
const sweepHz = (f1, f2, seconds) => t => f1 * Math.pow(f2 / f1, Math.min(1, t / seconds));
function noise(sr, seconds, level = 0.1, seed = 3) {
  const n = Math.round(sr * seconds), out = new Float32Array(n), r = rng(seed);
  for (let i = 0; i < n; i++) out[i] = level * r();
  return out;
}
// Stereo: left = noise bursts (drum-like), right = pulses at 1.5 kHz
function stereo(sr, seconds, seed = 9) {
  const n = Math.round(sr * seconds), L = new Float32Array(n), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = i % Math.round(sr * 0.25);
    L[i] = t < sr * 0.05 ? r() * 0.5 * Math.exp(-t / (sr * 0.012)) : 0;
  }
  return [L, pulses(sr, seconds, 1500)];
}
module.exports = { rng, pulses, sweepHz, noise, stereo };
