import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GamepadInput } from '../src/shared/Gamepad.js';

const withPads = (pads) => Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
const pad = (pressed = [], axes = [0, 0]) => ({ axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) })) });

test('manette : croix, stick et boutons nommés, fusionnés', () => {
  withPads([pad([14]), pad([], [0, -1])]);
  const g = new GamepadInput();
  g.poll();
  assert.ok(g.held('left'));
  assert.ok(g.held('up'));
  assert.ok(!g.held('right'));
  assert.ok(g.connected);
});

test('manette : les évènements ne partent qu\'au front montant', () => {
  const pads = [pad()];
  withPads(pads);
  const g = new GamepadInput();
  let a = 0, start = 0;
  g.on('a', () => a++);
  g.on('start', () => start++);
  g.poll();
  pads[0] = pad([0]); g.poll(); g.poll();
  assert.equal(a, 1);
  pads[0] = pad([0, 9]); g.poll();
  assert.equal(start, 1);
  pads[0] = pad(); g.poll();
  pads[0] = pad([0]); g.poll();
  assert.equal(a, 2);
});

test('manette : aucune manette ne plante', () => {
  withPads([]);
  const g = new GamepadInput();
  g.poll();
  assert.ok(!g.connected && !g.held('a'));
});
