# beak-tube · build plan

Reference engine and bench first, then the C++ port and the plugin. Design: `design.md`.

Each batch ends with passing tests and a commit authored as
`bytebent <bytebent@users.noreply.github.com>`. Nothing moves to the next batch until you've
checked the one before where it says **You**.

## Layout

```
reference/
  beak-tube.js       the reference engine; defines the sound
source/
  BeakTubeDSP.h      C++ port, no JUCE
  PluginProcessor.*  JUCE effect: mono or stereo in and out
  PluginEditor.*     web-view host
  PresetManager.h    saving and loading presets
ui/index.html        interface (also opens in a browser)
tests/               engine-test.js, lib.js, signals.js; later compare.js + dsp_cli.cpp, plugin_test.cpp
tools/
  bench/             bench template, AudioWorklet wrapper, build script → beak-tube.html
  bench/vendor/      Syrinx's engine, map and presets, copied unmodified (hashes in vendor.json)
  calibrate.js       level match per mode
  perf.js            CPU per scenario
packaging/           Mac installer
.github/workflows/   CI: tests, universal binary, auval, pluginval strictness 7
```

## Batches

| # | Batch | Contents | Check | State |
|---|---|---|---|---|
| 01 | **Setup** | `README.md`, `design.md`, `plan.md`, `research.md`, `.gitignore`. | | Done |
| 02 | **Song chain** | Trachea, larynx opening, OEC and beak after Perl et al. 2011, Size, Tune, Ring, Gape, Radiation, Mix. Test runner. | Tests: a 3.5 cm tube peaks at 2.5 and 7.5 kHz; the cavity resonance moves down with volume and with a smaller larynx; Perl's values give a peak near 4 kHz | Done: 2467 / 7400 Hz; Perl's values 3844 Hz; Gape and Ring set the beak corner and Q directly (Perl's printed ones don't fit) |
| 03 | **Tracking** | Pitch tracker with confidence, Track, Lag, Gape follow; one tracker and tract per channel. | Tests: with Track at 100% the resonance sits on a swept input's fundamental; unsure input holds the tuning; stereo stays stereo; fixed latency | Done: two-band YIN; 1→8 kHz sweep within 10 ct worst; latency about 6 ms |
| 04 | **Modes** | Parrot (four resonances, tongue), Sac, Boom, Body. | Tests: Parrot peaks inside Beckers et al.'s ranges and the third moves about 2 kHz with Tongue front/back; Sac peaks at Sac tune | Done: 30 tests; F3 moves 2.1 kHz; each mode level-matched within 1 dB |
| 05 | **Bench** | `beak-tube.html`, loading audio like mouth-tube's bench. | **You:** listening round with Syrinx renders (Filter off), Throat and a voice | Done: `tools/beak-tube.html` plays Syrinx live (vendored, Filter off), a file or the microphone · **You:** listening round, decide the control changes in `design.md` §10 |
| 06 | **C++ port** | `BeakTubeDSP.h`, `dsp_cli.cpp`, `compare.js`. | Tests: C++ matches the reference | |
| 07 | **Plugin** | JUCE wrapper, web-view UI, presets, installer, CI. | CI green · **You:** use it in a host | |
| 08 | **Listening round** | Tuning defaults and ranges from what you hear. | **You** | |

Batches 02–05 were built together: the bench plays Syrinx live instead of renders.
