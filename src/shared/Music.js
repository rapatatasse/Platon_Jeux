const STORAGE_KEY = 'platon.muted';
const DEFAULT_PLAYLIST = ['audio/piste1.mp3', 'audio/piste2.mp3'];

/**
 * Musique de fond : playlist jouée en boucle. Fichiers dans public/audio/.
 * Démarre au premier clic/touche (règle des navigateurs). Le choix « muet » est partagé par tous les jeux.
 */
export class Music {
  constructor({ playlist = DEFAULT_PLAYLIST, volume = 0.35, onTrack } = {}) {
    this.playlist = playlist.map((p) => import.meta.env.BASE_URL + p);
    this.onTrack = onTrack;
    this.muted = localStorage.getItem(STORAGE_KEY) === '1';
    this.volume = volume;
    this.index = 0;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => { console.warn('Musique introuvable :', this.audio.src); this.next(); });

    const start = () => this.start();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.play(0);
  }

  play(i) {
    this.index = i % this.playlist.length;
    this.audio.src = this.playlist[this.index];
    this.audio.volume = this.muted ? 0 : this.volume;
    this.audio.play().then(() => this.onTrack?.(this.playlist[this.index])).catch((e) => console.warn('Lecture musique refusée :', e.message));
  }

  next() {
    this.play(this.index + 1);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    this.audio.volume = this.muted ? 0 : this.volume;
    if (!this.muted && this.started && this.audio.paused) this.audio.play().catch(() => {});
    return this.muted;
  }
}
