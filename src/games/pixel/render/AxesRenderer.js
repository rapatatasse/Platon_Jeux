import * as THREE from 'three';

const LEN = 2.5;
const AXES = [
  { label: 'X', color: 0xff6b6b, dir: [1, 0, 0] },
  { label: 'Y', color: 0x5ef28a, dir: [0, 1, 0] },
  { label: 'Z', color: 0x4fb4ff, dir: [0, 0, 1] },
];

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillText(text, 32, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  sprite.scale.set(0.9, 0.9, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Repère 3D (X droite, Y haut, Z bas de l'écran) accroché au coin bas-droite de la carte. */
export class AxesRenderer {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    for (const { label, color, dir } of AXES) {
      const d = new THREE.Vector3(...dir);
      this.group.add(new THREE.ArrowHelper(d, new THREE.Vector3(), LEN, color, 0.6, 0.35));
      const s = labelSprite(label, color);
      s.position.copy(d.multiplyScalar(LEN + 0.6));
      this.group.add(s);
    }
  }

  setBounds({ maxX, maxZ }) {
    this.group.position.set(maxX + 0.5, -0.5, maxZ + 0.5);
  }
}
