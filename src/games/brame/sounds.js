import { SoundBox } from '../../shared/SoundBox.js';

/** Bruitages de Brame : bourdonnements et grésillements d'insectes, cliquetis de dés. */
export class Sounds extends SoundBox {
  buzz(len = 16) {
    for (let i = 0; i < len; i++) this._tone({ freq: 150 + (i % 3) * 35 + Math.random() * 20, type: 'sawtooth', dur: 0.05, gain: 0.05, delay: i * 0.032 });
  }

  chitter(len = 9) {
    for (let i = 0; i < len; i++) this._tone({ freq: 2200 + Math.random() * 1100, to: 1700, type: 'square', dur: 0.025, gain: 0.03, delay: i * 0.045 });
  }

  rattle() {
    for (let i = 0; i < 8; i++) this._tone({ freq: 220 + Math.random() * 500, type: 'square', dur: 0.02, gain: 0.05, delay: i * 0.07 });
  }

  clash() {
    this._noise(0.22, 0.16);
    this._tone({ freq: 240, to: 55, type: 'sawtooth', dur: 0.3, gain: 0.1 });
    this.chitter(6);
  }

  crunch() {
    this._noise(0.1, 0.2);
    this._tone({ freq: 90, to: 40, type: 'square', dur: 0.12, gain: 0.08, delay: 0.05 });
  }

  tick() { this._tone({ freq: 520, to: 420, type: 'triangle', dur: 0.06, gain: 0.06 }); }

  saved() { [520, 660, 880].forEach((freq, i) => this._tone({ freq, type: 'triangle', dur: 0.15, gain: 0.07, delay: i * 0.1 })); }

  win() { [440, 554, 660, 880].forEach((freq, i) => this._tone({ freq, type: 'triangle', dur: 0.2, gain: 0.08, delay: i * 0.12 })); }
}
