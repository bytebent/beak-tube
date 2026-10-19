// Builds tools/beak-tube.html: the beak-tube reference engine, the vendored Syrinx engine and map
// (a bird to play into it) and the worklet wrapper inlined into one page, plus Syrinx's test presets.
// Run: node tools/bench/build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const d = __dirname, vd = path.join(d, 'vendor');
const vendor = JSON.parse(fs.readFileSync(path.join(vd, 'vendor.json'), 'utf8'));
const read = f => fs.readFileSync(f, 'utf8');
for (const [name, v] of Object.entries(vendor.files)) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(vd, name))).digest('hex');
  if (h !== v.sha256) throw new Error('vendor/' + name + ' differs from Syrinx ' + vendor.commit.slice(0, 7) + ' (update vendor.json if that is intended)');
}
// the map goes first: in the worklet it defines globalThis.SyrinxMap, which the Syrinx engine reads
const dsp = [path.join(vd, 'syrinx-maps.js'), path.join(vd, 'syrinx-engine.js'), path.join(d, '..', '..', 'reference', 'beak-tube.js'), path.join(d, 'processor.js')].map(read).join('\n');
const presets = read(path.join(vd, 'syrinx-presets.js'));
for (const [name, src] of [['DSP', dsp], ['presets', presets]]) if (/<\/script/i.test(src)) throw new Error(name + ' source contains </script');
const tpl = read(path.join(d, 'template.html'));
for (const ph of ['/*__DSP__*/', '/*__PRESETS__*/']) if (tpl.split(ph).length !== 2) throw new Error('placeholder missing: ' + ph);
const out = path.join(d, '..', 'beak-tube.html');
fs.writeFileSync(out, tpl.replace('/*__DSP__*/', () => dsp).replace('/*__PRESETS__*/', () => presets));
console.log('tools/beak-tube.html', Math.round(fs.statSync(out).size / 1024), 'KB');
