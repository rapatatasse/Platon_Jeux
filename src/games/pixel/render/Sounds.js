import { SoundBox } from '../../../shared/SoundBox.js';

/**
 * Sons de PIXEL (générés à la volée, aucun fichier).
 * Pour remplacer par de vrais sons : garder les mêmes noms et charger des fichiers ici.
 */
export class Sounds extends SoundBox {
  attach()   { this._tone({ freq: 520, to: 880, dur: 0.12 }); this._tone({ freq: 880, dur: 0.08, delay: 0.1 }); }
  destroy()  { this._noise(0.18, 0.12); this._tone({ freq: 220, to: 60, type: 'sawtooth', dur: 0.2 }); }
  fire()     { this._tone({ freq: 900, to: 300, type: 'triangle', dur: 0.1 }); }
  blocked()  { this._tone({ freq: 140, dur: 0.1, type: 'square', gain: 0.05 }); }
  error()    { this._tone({ freq: 200, to: 150, dur: 0.15, type: 'sawtooth', gain: 0.04 }); }
  levelUp()  { [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, dur: 0.15, delay: i * 0.12, gain: 0.07 })); }
  gameOver() { [400, 300, 200, 120].forEach((f, i) => this._tone({ freq: f, dur: 0.3, type: 'sawtooth', delay: i * 0.2 })); }
  bullet()   { this._tone({ freq: 1200, dur: 0.04, type: 'square', gain: 0.03 }); }
}
