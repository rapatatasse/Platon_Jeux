import { SoundBox } from '../../shared/SoundBox.js';

export class Sounds extends SoundBox {
  select()  { this._tone({ freq: 520, to: 780, type: 'triangle', dur: 0.12, gain: 0.06 }); }
  takeoff() { this._noise(0.5, 0.05); this._tone({ freq: 90, to: 320, type: 'sawtooth', dur: 0.9, gain: 0.04 }); }
  deliver() { [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.18, delay: i * 0.09, gain: 0.07 })); }
  win()     { [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.22, delay: i * 0.12, gain: 0.07 })); }
  lose()    { [400, 300, 220, 150].forEach((f, i) => this._tone({ freq: f, type: 'sawtooth', dur: 0.28, delay: i * 0.18, gain: 0.05 })); }
  tick()    { this._tone({ freq: 880, dur: 0.05, type: 'square', gain: 0.03 }); }
}
