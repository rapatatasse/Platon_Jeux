import * as THREE from 'three';

/** Texture issue d'un canvas 2D, avec le bon espace colorimétrique (sRGB). */
export function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crée un canvas, son contexte 2D et le dessine via `draw(ctx, w, h)`. */
export function drawCanvas(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  return cv;
}
