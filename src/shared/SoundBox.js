/**
 * Base pour les effets sonores rétro générés à la volée (WebAudio, aucun fichier).
 * Un jeu étend cette classe et définit ses propres sons avec `_tone` / `_noise`.
 */
export class SoundBox {
  constructor() {
    this.ctx = null;
    this.muted = false;
    const unlock = () => { this.ctx ??= new (window.AudioContext || window.webkitAudioContext)(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  _tone({ freq = 440, to = null, type = 'square', dur = 0.12, gain = 0.08, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur = 0.2, gain = 0.1) {
    if (!this.ctx || this.muted) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.buffer = buf;
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }
}
