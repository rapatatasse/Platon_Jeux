import { SoundBox } from '../../shared/SoundBox.js';

/** Effets sonores synthétisés (WebAudio) : sobres, graves et feutrés pour une ambiance de château. */
export class Sounds extends SoundBox {
  select()   { this._tone({ freq: 440, to: 660, type: 'triangle', dur: 0.1, gain: 0.05 }); }
  start()    { [330, 392, 494, 659].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.3, delay: i * 0.1, gain: 0.06 })); }
  count()    { this._tone({ freq: 523, type: 'sine', dur: 0.18, gain: 0.07 }); }
  go()       { this._tone({ freq: 784, type: 'triangle', dur: 0.4, gain: 0.08 }); this._tone({ freq: 392, type: 'sine', dur: 0.4, gain: 0.06 }); }
  place()    { this._tone({ freq: 392, to: 784, type: 'sine', dur: 0.18, gain: 0.07 }); this._tone({ freq: 1175, type: 'triangle', dur: 0.25, delay: 0.06, gain: 0.03 }); }
  fuse()     { this._tone({ freq: 1400, to: 900, type: 'square', dur: 0.04, gain: 0.012 }); }
  explode()  {
    this._tone({ freq: 150, to: 70, type: 'sine', dur: 0.28, gain: 0.08 });
    this._tone({ freq: 523, type: 'sine', dur: 0.55, gain: 0.04 });
    this._tone({ freq: 784, type: 'sine', dur: 0.5, delay: 0.03, gain: 0.03 });
    this._tone({ freq: 1568, type: 'sine', dur: 0.35, delay: 0.08, gain: 0.012 });
  }
  crumble()  { this._noise(0.18, 0.06); }
  chest()    { [392, 523, 659, 784].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.22, delay: i * 0.07, gain: 0.06 })); this._tone({ freq: 1568, type: 'sine', dur: 0.5, delay: 0.25, gain: 0.025 }); }
  bonus()    { this._tone({ freq: 660, to: 990, type: 'triangle', dur: 0.14, gain: 0.06 }); }
  magic()    { [523, 784, 1046].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.16, delay: i * 0.06, gain: 0.06 })); }
  ice()      { [1568, 2093, 2637, 3136].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.25, delay: i * 0.04, gain: 0.03 })); this._noise(0.2, 0.03); }
  freeze()   { this._tone({ freq: 2400, to: 600, type: 'triangle', dur: 0.35, gain: 0.05 }); }
  push()     { this._noise(0.3, 0.07); this._tone({ freq: 160, to: 380, type: 'sawtooth', dur: 0.25, gain: 0.04 }); }
  fire()     { this._noise(0.8, 0.09); this._tone({ freq: 110, to: 260, type: 'sawtooth', dur: 0.7, gain: 0.06 }); this._tone({ freq: 220, to: 140, type: 'triangle', dur: 0.9, gain: 0.05 }); }
  fall()     { this._tone({ freq: 900, to: 90, type: 'sine', dur: 0.8, gain: 0.07 }); }
  ray()      { this._tone({ freq: 1800, to: 300, type: 'sawtooth', dur: 0.3, gain: 0.06 }); this._tone({ freq: 900, to: 150, type: 'square', dur: 0.3, gain: 0.03 }); }
  slow()     { this._tone({ freq: 500, to: 120, type: 'sine', dur: 0.7, gain: 0.07 }); }
  haste()    { this._tone({ freq: 250, to: 1100, type: 'triangle', dur: 0.4, gain: 0.06 }); }
  die()      { this._tone({ freq: 330, to: 70, type: 'sawtooth', dur: 0.6, gain: 0.07 }); this._noise(0.3, 0.05); }
  closing()  { this._tone({ freq: 90, to: 60, type: 'square', dur: 0.1, gain: 0.04 }); }
  empty()    { this._tone({ freq: 200, type: 'square', dur: 0.05, gain: 0.025 }); }
  win()      { [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.26, delay: i * 0.12, gain: 0.07 })); }
  round()    { [440, 554, 659].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.22, delay: i * 0.1, gain: 0.06 })); }
}
