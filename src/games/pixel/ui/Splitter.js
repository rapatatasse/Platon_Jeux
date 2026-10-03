const STORAGE_KEY = 'pixel.sideWidth';
const MIN = 300;

/**
 * Barre verticale entre la scène et le panneau de droite : on la glisse à la souris
 * (curseur ↔) pour changer la largeur du panneau. La largeur est mémorisée.
 */
export function initSplitter(splitter, side) {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  if (saved) side.style.width = `${clamp(saved)}px`;

  splitter.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');
    document.body.classList.add('resizing');

    const startX = e.clientX;
    const startW = side.getBoundingClientRect().width;

    const move = (ev) => { side.style.width = `${clamp(startW + (startX - ev.clientX))}px`; };
    const up = () => {
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      splitter.classList.remove('dragging');
      document.body.classList.remove('resizing');
      localStorage.setItem(STORAGE_KEY, String(Math.round(side.getBoundingClientRect().width)));
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  });

  // Double-clic : largeur par défaut
  splitter.addEventListener('dblclick', () => {
    side.style.width = '';
    localStorage.removeItem(STORAGE_KEY);
  });
}

function clamp(w) {
  return Math.min(Math.max(w, MIN), window.innerWidth * 0.75);
}
