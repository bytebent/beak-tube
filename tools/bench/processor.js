/* AudioWorklet wrapper: a source (Syrinx, played from the keyboard, or the node's input: a file or
   the microphone) → beak-tube → stereo output. Runs after syrinx-maps.js, syrinx-engine.js and
   beak-tube.js. */
class BeakTubeBench extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bt = new BeakTube(sampleRate);
    this.syr = new SyrinxEngine(sampleRate, 1234);
    this.syr.setParam('filter', 0);          // raw source: beak-tube is the filter
    this.src = 0;                             // 0 Syrinx, 1 input (file or mic)
    this.alloc(128);
    this.vizEvery = Math.round(sampleRate / 30);
    this.vizCount = 0;
    // response curve, log-spaced
    this.NF = 96; this.freqs = new Float64Array(this.NF);
    for (let i = 0; i < this.NF; i++) this.freqs[i] = 100 * Math.pow(16000 / 100, i / (this.NF - 1));
    this.rL = new Float64Array(this.NF); this.rR = new Float64Array(this.NF);
    // DSP load: time spent in the engines / length of audio produced
    this.hiRes = typeof performance !== 'undefined' && typeof performance.now === 'function';
    this.clock = this.hiRes ? () => performance.now() : () => Date.now();
    this.busyMs = 0; this.audioMs = 0; this.load = 0; this.btMs = 0; this.btLoad = 0;
    this.inPk = 0; this.outPk = 0;
    this.port.onmessage = (e) => {
      const m = e.data, s = this.syr, b = this.bt;
      if (m.t === 'b') b.setParam(m.id, m.v);
      else if (m.t === 'bmany') { for (const k in m.p) b.setParam(k, m.p[k]); }
      else if (m.t === 's') { if (m.id !== 'filter') s.setParam(m.id, m.v); }
      else if (m.t === 'smany') { for (const k in m.p) if (k !== 'filter') s.setParam(k, m.p[k]); s.setParam('filter', 0); }
      else if (m.t === 'sreset') {   // Syrinx back to its defaults (a fresh engine), then these settings
        this.syr = new SyrinxEngine(sampleRate, 1234);
        for (const k in m.p) if (k !== 'filter') this.syr.setParam(k, m.p[k]);
        this.syr.setParam('filter', 0);
      }
      else if (m.t === 'src') { this.src = m.v; if (m.v !== 0) s.allNotesOff(); }
      else if (m.t === 'on') s.noteOn(m.n, m.v, 0);
      else if (m.t === 'off') s.noteOff(m.n, 0);
      else if (m.t === 'bend') s.setBend(m.v);
      else if (m.t === 'panic') s.allNotesOff();
    };
    this.port.postMessage({ t: 'ready', sr: sampleRate, latency: this.bt.latency, freqs: Array.from(this.freqs) });
  }
  alloc(n) { this.bufN = n; this.zero = new Float32Array(n); this.sL = new Float32Array(n); this.sR = new Float32Array(n); }
  process(inputs, outputs) {
    const out = outputs[0], oL = out[0], oR = out[1] || out[0], n = oL.length;
    if (n > this.bufN) this.alloc(n);
    const t0 = this.clock();
    let inL, inR = null;
    if (this.src === 0) {
      // Syrinx's output is the same on both sides: mono into beak-tube
      this.syr.process(this.sL, this.sR, n);
      inL = this.sL;
    } else {
      const fin = inputs[0] || [];
      inL = fin[0] || this.zero; inR = fin.length > 1 ? fin[1] : null;
    }
    const t1 = this.clock();
    this.bt.process(inL, inR, oL, oR, n);
    const t2 = this.clock();
    for (let c = 2; c < out.length; c++) out[c].set(oL);
    for (let i = 0; i < n; i++) {
      const a = Math.abs(inL[i]); if (a > this.inPk) this.inPk = a;
      const b = Math.abs(oL[i]); if (b > this.outPk) this.outPk = b;
    }
    const len = n / sampleRate * 1000;
    this.busyMs += t2 - t0; this.btMs += t2 - t1; this.audioMs += len;
    if (this.audioMs >= 500) { this.load = this.busyMs / this.audioMs; this.btLoad = this.btMs / this.audioMs; this.busyMs = 0; this.btMs = 0; this.audioMs = 0; }
    if ((this.vizCount += n) >= this.vizEvery) {
      this.vizCount = 0;
      const b = this.bt, i = b.info;
      b.response(0, this.freqs, this.rL);
      if (b.twoTracts) b.response(1, this.freqs, this.rR);
      this.port.postMessage({ t: 'stat', f: i.f.slice(), conf: i.conf.slice(), sure: i.sure.slice(), res: i.res.slice(), gape: i.gape.slice(),
        stereo: i.stereo, two: b.twoTracts, idle: i.idle, load: this.load, btLoad: this.btLoad, voices: this.syr.info.voices,
        inPk: this.inPk, outPk: this.outPk, rL: Array.from(this.rL), rR: b.twoTracts ? Array.from(this.rR) : null });
      this.inPk = 0; this.outPk = 0;
    }
    return true;
  }
}
registerProcessor('beak-tube-bench', BeakTubeBench);
