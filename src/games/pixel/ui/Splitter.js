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

const FN_KEY = 'pixel.functionsHeight';
const FN_MIN = 120;
const TERM_MIN = 120;

/**
 * Barre horizontale entre le terminal et « Mes fonctions » : en la glissant vers le haut,
 * la zone fonctions grandit et le terminal rétrécit. La hauteur est mémorisée.
 */
export function initHSplitter(splitter, panel, side) {
  const maxH = () => {
    const others = [...side.children].filter((c) => c !== panel && c.id !== 'terminal');
    const used = others.reduce((s, c) => s + c.getBoundingClientRect().height, 0) + 8 * side.children.length;
    return Math.max(FN_MIN, side.getBoundingClientRect().height - used - TERM_MIN);
  };
  const clampH = (h) => Math.min(Math.max(h, FN_MIN), maxH());
  const saved = Number(localStorage.getItem(FN_KEY));
  if (saved) panel.style.height = `${clampH(saved)}px`;

  splitter.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');
    document.body.classList.add('resizing-h');
    const startY = e.clientY;
    const startH = panel.getBoundingClientRect().height;
    const move = (ev) => { panel.style.height = `${clampH(startH + (startY - ev.clientY))}px`; };
    const up = () => {
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      splitter.classList.remove('dragging');
      document.body.classList.remove('resizing-h');
      localStorage.setItem(FN_KEY, String(Math.round(panel.getBoundingClientRect().height)));
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  });

  splitter.addEventListener('dblclick', () => {
    panel.style.height = '';
    localStorage.removeItem(FN_KEY);
  });
}

function clamp(w) {
  return Math.min(Math.max(w, MIN), window.innerWidth * 0.75);
}
