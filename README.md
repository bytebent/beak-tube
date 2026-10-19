# beak-tube

An audio effect that shapes sound the way a bird's vocal tract does. It makes no sound of its
own: whatever comes in travels up a trachea, through a throat cavity that retunes itself to the
pitch it hears, and out of a beak (or an inflated sac). Put it on a bird source like
[Syrinx](https://github.com/bytebent/syrinx), or on voices, synths and drums.

Songbirds turn a source full of harmonics into a pure tone by moving the resonance of their
throat cavity onto the note they sing. That is beak-tube's main job. There are no vowel shapes
inside: apart from parrots, birds don't make formants with the tongue.

Status: **design**. Nothing is built yet. The reference engine and browser bench come first,
then the C++ port and the JUCE plugin.

## Files

- `design.md`: what beak-tube is and how it works, with every parameter
- `plan.md`: build batches, in order
- `research.md`: the papers behind the design and the numbers taken from them

The design is shared with Syrinx in the doc *Syrinx and beak-tube: design and architecture*.
`design.md` is this repo's copy of the beak-tube half.

## Planned layout

- `reference/beak-tube.js`: the reference engine; defines the sound
- `source/BeakTubeDSP.h`: C++ port, real-time safe, no JUCE dependency
- `source/PluginProcessor.*`, `source/PluginEditor.*`, `ui/index.html`: JUCE effect and its
  web-view interface
- `tests/`: engine tests, C++ against reference comparison, plugin wrapper test
- `tools/`: bench (`beak-tube.html`)

## License note

The plugin will be built with [JUCE](https://juce.com) 8, which is available under the AGPLv3
or a commercial licence. Keeping this repository public and open source satisfies the AGPL.
