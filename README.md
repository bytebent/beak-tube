# beak-tube

An audio effect that shapes sound the way a bird's vocal tract does. It makes no sound of its
own: whatever comes in travels up a trachea, through a throat cavity that retunes itself to the
pitch it hears, and out of a beak (or an inflated sac). Put it on a bird source like
[Syrinx](https://github.com/bytebent/syrinx), or on voices, synths and drums.

Songbirds turn a source full of harmonics into a pure tone by moving the resonance of their
throat cavity onto the note they sing. That is beak-tube's main job. There are no vowel shapes
inside: apart from parrots, birds don't make formants with the tongue.

Status: **prototype, batch 05 of 08**. The reference engine has every parameter of the design:
the trachea, the Song chain (larynx, throat cavity, beak), the pitch tracker with Track, Lag and
Gape follow, the Parrot, Sac and Boom modes, Body, Spread, Radiation and Mix. The browser bench
plays it. Next: the listening round on the bench and the control changes in `design.md` §10, then
the C++ port and the JUCE plugin.

## Try it

Open `tools/beak-tube.html` in a current browser and press **Power on**. Syrinx is built in as a
source with its Filter off: play it with the computer keyboard (A to ; for notes, Z/X octave, C/V
velocity) or pick a **Test bird** and press Load and play. Or switch the input to a file or the
microphone (use headphones). The spectrogram shows the tracked pitch in green and the throat
resonance in yellow; the curve beside it is the tract's response. Rebuild the page after changing
the engine: `node tools/bench/build.js`.

Needs Node 18 or newer for the rest. No packages to install.

```sh
node tests/engine-test.js        # engine tests
node tools/perf.js               # CPU per scenario
node tools/calibrate.js          # level of each mode against dry
```

## Controls

| Group | Control | What it does |
|---|---|---|
| Bird | Size | Wren to crane. Scales the trachea, beak and body; matches Syrinx's Size |
| | Mode | Song (throat tracks the pitch), Parrot (tongue formants), Sac (dove coo), Boom (cassowary) |
| Trachea | Length, Loss | Tube length (scaled by Size) and wall loss: ringing to dull |
| Throat | Track | How much the throat resonance follows the input's pitch |
| | Tune | Where it sits when not tracking |
| | Larynx | Opening into the throat; smaller is lower |
| | Lag | How quickly it follows |
| | Ring | Broad to sharp |
| Beak | Gape, Gape follow | Beak opening (small cuts the highs) and how much it opens with pitch |
| Tongue | Front–back, Height | Parrot only: moves and dampens the formants |
| Sac | Sac tune, Inflate | Sac and Boom: the sac's resonance and how much it radiates |
| Body | Body | A low resonator driven by the trachea |
| Output | Spread, Radiation, Mix, Output, Bypass | Stereo difference, flow → pressure, dry/wet, level, bypass |

Stereo in stays stereo: a tracker and a tract per side. Mono in uses one tract until Spread is
up. Latency is fixed at about 6 ms (one 32-sample block plus the tracker's look-ahead).

## Performance

`node tools/perf.js` prints how much of one CPU core each scenario needs at 48 kHz. On a 2.1 GHz
Xeon core: about 5% for mono in, about 10% for stereo in, 0.1% when silent. Most of it is the
pitch tracker's high band, which runs at about 96 kHz so bird pitches of a few samples per period
still land on a fine grid.

## Files

- `design.md`: what beak-tube is and how it works, with every parameter
- `plan.md`: build batches, in order
- `research.md`: the papers behind the design and the numbers taken from them
- `tests.md`: test and experiment results per batch, with pictures in `docs/tests/`

The design is shared with Syrinx in the doc *Syrinx and beak-tube: design and architecture*.
`design.md` is this repo's copy of the beak-tube half.

## Layout

- `reference/beak-tube.js`: the reference engine; defines the sound
- `tests/engine-test.js`: engine tests (`lib.js` and `signals.js` hold the helpers and test inputs)
- `tools/bench/`: bench template, AudioWorklet wrapper and build script → `tools/beak-tube.html`
- `tools/bench/vendor/`: Syrinx's engine, map and test presets, copied unmodified; the build
  checks their hashes against `vendor.json`
- `tools/perf.js`, `tools/calibrate.js`: benchmark, level match

Later (see `plan.md`): `source/` (C++ port and JUCE effect), `ui/`, `packaging/`, CI.

## License note

The plugin will be built with [JUCE](https://juce.com) 8, which is available under the AGPLv3
or a commercial licence. Keeping this repository public and open source satisfies the AGPL.
