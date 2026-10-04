export function bindTouchControls(root, { onState = () => {}, onAction = () => {} } = {}) {
  const held = new Set();
  const buttons = [...root.querySelectorAll('[data-touch]')];
  const sync = () => onState(new Set(held));
  const release = (button) => {
    const code = button.dataset.touch;
    if (!button.dataset.action && held.delete(code)) sync();
    button.classList.remove('pressed');
  };

  for (const button of buttons) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add('pressed');
      if (button.dataset.action) onAction(button.dataset.action);
      else { held.add(button.dataset.touch); sync(); }
    });
    button.addEventListener('pointerup', () => release(button));
    button.addEventListener('pointercancel', () => release(button));
    button.addEventListener('lostpointercapture', () => release(button));
  }

  window.addEventListener('blur', () => {
    held.clear();
    buttons.forEach((button) => button.classList.remove('pressed'));
    sync();
  });

  return () => {
    held.clear();
    buttons.forEach((button) => button.classList.remove('pressed'));
    sync();
  };
}
