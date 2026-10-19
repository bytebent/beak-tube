# beak-tube · design

A bird's vocal tract as an audio effect. Audio in, audio out. A trachea, a throat cavity whose
resonance follows the input's pitch, and a beak or an inflated sac.

Labels: **[Decided]** you chose it, **[Proposed]** suggested and not yet confirmed, **[Open]**
still to decide. Sources for every number are in `research.md`.

---

## 1. What it is

- An **AU/VST3 effect for macOS** plus a standalone app, like mouth-tube. [Decided]
- It shapes sound only. The bird's sound source is **Syrinx**, a separate instrument in its own
  repo; nothing but audio passes between them. [Decided]
- beak-tube works **from the audio and its own controls only**: no MIDI, no pitch from another
  plugin. [Decided]
- In the birds studied, the syrinx is not strongly coupled to the upper tract, so source and
  tract are usually treated as separate (Amador, Mindlin & Elemans 2025). A downstream effect
  loses little. The coupled effect that matters, frequency jumps, lives inside Syrinx.
- Built the bytebent way: JavaScript reference engine and browser bench first, then the C++
  port, then the JUCE plugin. [Decided]

## 2. Signal flow

```
in ─┬─► pitch tracker ───────────────┐ (sets the cavity's tuning)
    │                                ▼
    └─► trachea ─► larynx opening ─► OEC ─► beak (or sac) ─► body ─► out
```

One tracker and one tract per channel.

## 3. The chain

After Perl et al. 2011, whose tract reproduced zebra finch song:

1. **Trachea:** a tube closed at the syrinx end and open at the larynx, a delay line with a
   lossy reflection. Perl et al. used 3.5 cm, which puts resonances at 2.5 and 7.5 kHz, the
   peaks found throughout zebra finch song.
2. **Larynx opening:** the neck of a Helmholtz resonator. A smaller opening lowers the cavity's
   resonance.
3. **OEC** (oropharyngeal-esophageal cavity): the resonator's volume. A larger volume lowers its
   resonance. Perl et al. used an average of about 4 kHz for zebra finch.
4. **Beak:** an inertance (the air in the beak) and a radiation resistance. Gape sets the
   inertance. In eastern towhees a small gape cut 4–7.5 kHz and had little effect below about
   4–5 kHz.

Steps 2–4 are Perl et al.'s equation 7, three state variables per channel, written as an
electrical circuit. Their values, in acoustic units: larynx inertance 20–40, cavity compliance
1.5–2.5 × 10⁻⁸ / 350, cavity loss 1000, beak inertance 1000, beak radiation 100,000. The
compliance units look unusual as printed; batch 02 checks them by measuring the resonance.

## 4. Tracking

- **Track** sets how much of the cavity's tuning follows the input pitch: at 100% the resonance
  sits on the fundamental, at 0% it stays at Tune. Northern cardinals move it from below about
  1.6 kHz to above about 8 kHz this way (Riede et al. 2006).
- **Lag** smooths the tracking. How well birds track short, steep sweeps is unknown, so Lag is
  tuned by ear. [Open]
- **Gape follow** opens the beak with pitch, as sparrows open wider for higher notes.
- **The tracker** is deterministic, follows one fundamental and reports how sure it is. When it
  is unsure (noise, drums, two voices) the cavity holds its last tuning. [Decided]

## 5. Modes

| Mode | What changes | Bird | Source |
|---|---|---|---|
| Song (default) | The chain above | Songbirds | Perl 2011; Riede 2006 |
| Parrot | Four resonances near 1.3–1.9, 4.1–4.5, 5.2–7.6 and 8.6–9.9 kHz. Tongue front/back moves the third up by about 2 kHz and the first down slightly, and changes levels unevenly; Tongue height mostly lowers the level of all four | Monk parakeet | Beckers, Nelson & Suthers 2004 |
| Sac | Beak closed; sound leaves through an inflated esophagus: one narrow resonance at Sac tune, highs damped by the soft wall | Ring dove coo, about 600 Hz | Fletcher et al. 2004 (via the research brief) |
| Boom | Sac with a long trachea and the body resonator, for very low calls | Cassowary booms at 23–32 Hz | Mack & Jones 2003 (via the research brief) |

**Body** adds a low resonator standing for a sternum driven by a coiled trachea, as Gaunt et al.
1987 proposed for cranes. Off by default; no measured values yet. [Open]

## 6. Size

Size (0–1) scales every length and volume together, on the same scale as Syrinx's Size, so the
same value gives a matching bird. Track, Gape follow and Mode stay put.

- Songbird (about 0.25, default): a 3.5 cm trachea.
- Dove: a sac tuned near 600 Hz.
- Large bird (1): tracheae of 25 cm (Ross's goose) to 163 cm (Japanese crane) (Fitch 1999). A
  longer trachea does not lower the call's pitch; it packs the tube's resonances closer together,
  c/2L, which listeners hear as a bigger animal. A sandhill crane's 56 cm trachea, 13 cm of it
  coiled in the sternum, lowers that spacing from 406 to 313 Hz.

## 7. Stereo

Stereo in stays stereo out: each channel has its own tracker and tract, so a left and right that
differ keep their own pitch and resonance. Mono in runs through one tract and turns stereo only
when Spread is up, as in mouth-tube; Spread makes the two tracts differ slightly. [Decided]

## 8. Parameters

21 parameters, no LFOs (hosts automate it). Defaults are design values to tune by ear unless the
text gives a source. Ranges may go somewhat past nature.

| Group | id | Range | Default | What it does |
|---|---|---|---|---|
| Global | `size` | 0–1 | 0.25 | Scales every length and volume, matched to Syrinx |
| | `mode` | Song, Parrot, Sac, Boom | Song | Front of the chain |
| Trachea | `trachlen` | 1.5–200 cm, log | 3.5 cm | Tube length (scaled by Size) |
| | `trachloss` | 0–1 | 0.3 | Wall loss: ringing to dull |
| Larynx | `larynx` | 0–1 | 0.6 | Opening into the cavity; smaller is lower |
| OEC | `track` | 0–100% | 90% | How much the resonance follows the pitch |
| | `tune` | 0.2–10 kHz, log | 4 kHz | Resonance when not tracking |
| | `lag` | 0–30 ms | 5 ms | Tracking delay |
| | `ring` | 0–1 | 0.5 | Cavity damping: broad to sharp |
| Beak | `gape` | 0–1 | 0.5 | Beak opening |
| | `gapefollow` | 0–100% | 60% | Gape opens with pitch |
| Tongue | `tonguefb` | 0–1 | 0.5 | Front to back (Parrot) |
| | `tongueht` | 0–1 | 0.3 | Low to high (Parrot) |
| Sac | `sactune` | 0.2–1.5 kHz, log | 600 Hz | Sac resonance (Sac, Boom) |
| | `inflate` | 0–1 | 0.8 | How much the sac radiates |
| Body | `body` | 0–1 | 0 | Sternum resonator level |
| Output | `spread` | 0–1 | 0.2 | Stereo difference between the tracts |
| | `radiation` | Off, On | On | Flow to pressure at the beak, as in mouth-tube |
| | `mix` | 0–100% | 100% | Dry to processed, dry delayed to line up |
| | `output` | −24 to +12 dB | 0 dB | |
| | `bypass` | Off, On | Off | Host bypass, latency kept |

## 9. Code architecture

Same rules as mouth-tube and Throat:

- Fixed 32-sample blocks; the tracker's latency and the block are reported to the host as one
  fixed latency.
- `process()` never allocates. Parameters are read once per block, tracking per block with Lag
  smoothing inside it.
- Deterministic: same input, same output, at any host buffer size.
- The C++ port is checked sample by sample against the reference, built with `-ffp-contract=off`.

Engine interface: `new BeakTube(sr)`, `setParam`, `process(inL, inR, outL, outR, n)`.
