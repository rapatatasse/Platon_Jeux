import * as THREE from 'three';
import { COLORS, CELL } from '../core/constants.js';

// Géométrie et matériaux partagés par tous les cubes (une seule instance chacun = perf).
export const CUBE_GEOMETRY = new THREE.BoxGeometry(0.92, 0.92, 0.92);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });

export const MATERIALS = {
  red: mat(COLORS.red, { emissive: COLORS.red, emissiveIntensity: 0.35 }),
  [CELL.YELLOW]: mat(COLORS.yellow),
  [CELL.PURPLE]: mat(COLORS.purple, { emissive: COLORS.purple, emissiveIntensity: 0.25 }),
  [CELL.WHITE]: mat(COLORS.white, { roughness: 0.9 }),
  bullet: new THREE.MeshBasicMaterial({ color: COLORS.bullet }),
};

export const colorOf = (type) => (typeof type === 'number' ? type : type === 'red' ? COLORS.red : COLORS[type] ?? 0xffffff);
