import { SoundBox } from '../shared/SoundBox.js';

export class HubSounds extends SoundBox {
  fire()      { this._tone({ freq: 760, to: 360, type: 'triangle', dur: 0.09, gain: 0.05 }); }
  enemyFire() { this._tone({ freq: 300, to: 180, type: 'sawtooth', dur: 0.14, gain: 0.04 }); }
  rock()      { this._tone({ freq: 160, to: 110, type: 'square', dur: 0.06, gain: 0.05 }); }
  boom()      { this._noise(0.22, 0.1); this._tone({ freq: 200, to: 60, type: 'sawtooth', dur: 0.22, gain: 0.06 }); }
  hit()       { this._noise(0.12, 0.12); this._tone({ freq: 180, to: 90, type: 'square', dur: 0.18, gain: 0.07 }); }
  orbit()     { this._tone({ freq: 440, to: 660, type: 'sine', dur: 0.25, gain: 0.05 }); }
  launch()    { [392, 523, 659, 784].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.2, delay: i * 0.1, gain: 0.07 })); }
  takeoff()   { this._noise(0.5, 0.05); this._tone({ freq: 90, to: 320, type: 'sawtooth', dur: 0.9, gain: 0.04 }); }
}
