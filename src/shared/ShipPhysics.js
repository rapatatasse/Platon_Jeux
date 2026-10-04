/**
 * Déplacement du vaisseau, commun au hub et aux jeux de la plateforme (sans Three.js ni DOM).
 * Repère : x vers la droite, y vers le HAUT, dir en radians (0 = vers la droite, sens anti-horaire).
 * Commandes : turn = +1 gauche / -1 droite ; thrust = 1 avance dans la direction du nez ; uturn() = demi-tour rapide.
 */
export const DEFAULT_SHIP = { radius: 22, turnSpeed: 3.4, uturnSpeed: 9, accel: 720, maxSpeed: 340, drag: 1.7 };

export function createShipState(x = 0, y = 0, dir = Math.PI / 2) {
  return { x, y, vx: 0, vy: 0, dir, turnLeft: 0 };
}

export function startUTurn(ship) {
  if (ship.turnLeft <= 0) ship.turnLeft = Math.PI;
}

/** Avance le vaisseau de dt secondes. `bounds` = { halfW, halfH } (rebond amorti sur les bords). */
export function stepShip(ship, { turn = 0, thrust = 0 }, dt, params = DEFAULT_SHIP, bounds = null) {
  if (ship.turnLeft > 0) {
    const step = Math.min(ship.turnLeft, params.uturnSpeed * dt);
    ship.dir += step; ship.turnLeft -= step;
  } else {
    ship.dir += turn * params.turnSpeed * dt;
  }
  if (thrust > 0) {
    ship.vx += Math.cos(ship.dir) * params.accel * dt;
    ship.vy += Math.sin(ship.dir) * params.accel * dt;
  }
  const damp = Math.exp(-params.drag * dt);
  ship.vx *= damp; ship.vy *= damp;
  const sp = Math.hypot(ship.vx, ship.vy);
  if (sp > params.maxSpeed) { ship.vx *= params.maxSpeed / sp; ship.vy *= params.maxSpeed / sp; }
  ship.x += ship.vx * dt; ship.y += ship.vy * dt;

  if (!bounds) return;
  const r = params.radius;
  if (ship.x < -bounds.halfW + r) { ship.x = -bounds.halfW + r; ship.vx = Math.abs(ship.vx) * 0.3; }
  if (ship.x > bounds.halfW - r) { ship.x = bounds.halfW - r; ship.vx = -Math.abs(ship.vx) * 0.3; }
  if (ship.y < -bounds.halfH + r) { ship.y = -bounds.halfH + r; ship.vy = Math.abs(ship.vy) * 0.3; }
  if (ship.y > bounds.halfH - r) { ship.y = bounds.halfH - r; ship.vy = -Math.abs(ship.vy) * 0.3; }
}
