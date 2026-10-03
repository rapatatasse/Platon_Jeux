import * as THREE from 'three';

/** Charge des textures en parallèle. Une image manquante donne `null` (le jeu doit gérer le repli). */
export function loadTextures(urls, onProgress) {
  const loader = new THREE.TextureLoader();
  let done = 0;
  const step = () => onProgress?.(++done / urls.length);
  return Promise.all(urls.map((url) => new Promise((resolve) => {
    loader.load(
      url,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; step(); resolve(tex); },
      undefined,
      () => { console.warn('Texture introuvable :', url); step(); resolve(null); },
    );
  })));
}
