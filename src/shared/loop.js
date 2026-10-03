/** Boucle requestAnimationFrame : appelle `update(dtSecondes, nowMs)`. Retourne une fonction d'arrêt. */
export function startLoop(update, maxDt = 0.1) {
  let last = performance.now();
  let id = 0;
  const frame = (now) => {
    const dt = Math.min(maxDt, (now - last) / 1000);
    last = now;
    update(dt, now);
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(id);
}
