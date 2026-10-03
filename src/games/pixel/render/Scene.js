import * as THREE from 'three';
import { COLORS } from '../core/constants.js';
import { createRenderer } from '../../../shared/createRenderer.js';

/**
 * Scène, caméra (vue de dessus légèrement inclinée, style rétro) et sol infini.
 * Le sol et la grille suivent le joueur : le plateau n'a pas de limite.
 */
export class SceneView {
  constructor(container) {
    this.container = container;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.renderer = createRenderer(container, {
      shadows: true,
      onResize: (w, h) => { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); },
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.ground);
    this.scene.fog = new THREE.Fog(COLORS.ground, 60, 120);

    this.cameraOffset = new THREE.Vector3(0, 34, 22);
    this.target = new THREE.Vector3();
    this.zoom = 1;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sun.position.set(20, 40, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 150 });
    this.scene.add(this.sun, this.sun.target);

    this.board = new THREE.Group();
    this.scene.add(this.board);
  }

  /** Plateau fini : un sol + une grille exactement de la taille de la carte. */
  setBoard(bounds) {
    this.board.clear();
    const w = bounds.maxX - bounds.minX + 1, h = bounds.maxZ - bounds.minZ + 1;
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: 0x1c1f33, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.5, cz);
    ground.receiveShadow = true;
    this.board.add(ground);

    // GridHelper est carré : on le fabrique à la main pour coller à la carte
    const pts = [];
    for (let x = 0; x <= w; x++) pts.push(bounds.minX - 0.5 + x, -0.49, bounds.minZ - 0.5, bounds.minX - 0.5 + x, -0.49, bounds.maxZ + 0.5);
    for (let z = 0; z <= h; z++) pts.push(bounds.minX - 0.5, -0.49, bounds.minZ - 0.5 + z, bounds.maxX + 0.5, -0.49, bounds.minZ - 0.5 + z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.board.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: COLORS.grid })));
  }

  /** Centre la vue sur une position monde (lissée). */
  follow(x, z, dt) {
    this.target.lerp(new THREE.Vector3(x, 0, z), Math.min(1, dt * 6));
    const off = this.cameraOffset.clone().multiplyScalar(this.zoom);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    this.sun.position.set(this.target.x + 20, 40, this.target.z + 10);
    this.sun.target.position.copy(this.target);
  }

  setZoom(z) {
    this.zoom = THREE.MathUtils.clamp(z, 0.4, 2.5);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
