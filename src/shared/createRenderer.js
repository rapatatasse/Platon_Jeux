import * as THREE from 'three';

/**
 * Crée un WebGLRenderer collé à un conteneur DOM et le redimensionne automatiquement.
 * `onResize(w, h)` permet au jeu d'adapter sa caméra.
 */
export function createRenderer(container, { antialias = true, shadows = false, alpha = false, onResize } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias, alpha });
  if (alpha) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = shadows;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(renderer.domElement);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    onResize?.(w, h);
  };
  new ResizeObserver(resize).observe(container);
  resize();
  return renderer;
}
