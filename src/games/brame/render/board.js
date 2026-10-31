// Rendu vectoriel (SVG) du plateau, des pions et des pyramides de BRAME.
// Petit effet 3D uniquement dans le sens de la hauteur : pions = disques empilés, pyramides à deux faces.
import { CIRCLES, COLS, EXIT, NODES, RESERVE, ROWS, cellId, goalRow, parseCell, startRow } from '../core/board.js';

// Plateau horizontal : les rangées vont de droite (rangée 0) à gauche (rangée 10, départ du Noir),
// les 3 colonnes deviennent 3 lignes.
const LEN = 56;
const WID = 66;
const LEFT = 80;
export const VIEW = { w: LEFT * 2 + LEN * ROWS, h: 560 };
const YS = [110, 280, 450];
export const px = (row) => LEFT + LEN / 2 + LEN * (ROWS - 1 - row);
export const CIRCLE_POS = { k0: { x: px(5), y: 195, r: 28 }, k1: { x: px(5), y: 365, r: 28 } };

export function nodePos(id) {
  const c = parseCell(id);
  return c ? { x: px(c.row), y: YS[c.col] } : { x: CIRCLE_POS[id].x, y: CIRCLE_POS[id].y };
}

/** Position d'un pion en déplacement : le camp et la sortie sont juste hors du plateau, dans la ligne du premier / dernier pas. */
export function ghostPos(id, player, path) {
  if (id === RESERVE) return { x: px(startRow(player)) + (player === 0 ? -LEN : LEN) * 1.1, y: nodePos(path[1]).y };
  if (id === EXIT) return { x: px(goalRow(player)) + (player === 0 ? LEN : -LEN) * 1.1, y: nodePos(path[path.length - 2]).y };
  return nodePos(id);
}

export const SKINS = [
  { top: '#2c2c31', side: '#0f0f12', rim: '#000', mark: '#e7c96c', pyrL: '#3b3b42', pyrR: '#16161a' },
  { top: '#d92a2f', side: '#8c1418', rim: '#5d0b0e', mark: '#9a90bd', pyrL: '#e8484b', pyrR: '#a01a1e' },
];

const PASSAGE_LINES = [
  [cellId(0, 0), cellId(1, 1)], [cellId(2, 0), cellId(1, 1)],
  [cellId(0, 3), cellId(1, 2)], [cellId(2, 3), cellId(1, 2)],
  [cellId(0, 7), cellId(1, 8)], [cellId(2, 7), cellId(1, 8)],
  [cellId(0, 10), cellId(1, 9)], [cellId(2, 10), cellId(1, 9)],
];

/** Scarabée vectorisé (d'après scarabe.png) : à utiliser avec <use href="#scarab"> . */
export const SYMBOLS = `
<defs>
  <g id="scarab-half" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="30">
    <path d="M150 210 C92 218 66 178 78 134 C88 100 134 80 192 46"/>
    <path d="M114 294 C86 302 76 322 80 350" stroke-width="26"/>
    <path d="M126 394 C84 394 70 422 96 448 C116 468 150 492 192 524"/>
    <path d="M110 262 C140 250 180 252 207 268 L207 446 C160 446 125 425 115 380 C105 335 108 290 110 262Z" fill="currentColor" stroke="none"/>
  </g>
  <symbol id="scarab" viewBox="0 0 430 570">
    <use href="#scarab-half"/>
    <use href="#scarab-half" transform="translate(430 0) scale(-1 1)"/>
    <path d="M116 244 C118 200 134 168 164 148 C184 130 204 122 215 122 C226 122 246 130 266 148 C296 168 312 200 314 244 C270 234 160 234 116 244Z" fill="currentColor"/>
    <path d="M180 172 Q215 186 250 172" fill="none" stroke="var(--cut, #fff)" stroke-width="9" stroke-linecap="round"/>
  </symbol>
  <filter id="cloth" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/>
  </filter>
</defs>`;

const f = (n) => Math.round(n * 10) / 10;

const PYRAMIDS = ['/images/brame/Pyramide%20Seth.png', '/images/brame/Pyramide%20Horus.png'];

/** Pyramide du joueur : image fournie (Seth ou Horus), avec ombre portée. */
export function pyramidMarkup(owner, x = 0, y = 0, scale = 1) {
  return `<g class="pyramid p${owner}" transform="translate(${f(x)} ${f(y)}) scale(${scale})">
    <image href="${PYRAMIDS[owner]}" x="-30" y="-46" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>
  </g>`;
}

/** Pile de pions : disques empilés (effet de hauteur), scarabée sur le dessus. */
export function stackMarkup(owner, count, x = 0, y = 0, { cap = 8, badge = true, scale = 1 } = {}) {
  const s = SKINS[owner];
  const layers = Math.min(count, cap);
  const thick = 5;
  let out = `<g class="stack p${owner}" transform="translate(${f(x)} ${f(y)}) scale(${scale})">`;
  out += `<ellipse cx="2" cy="5" rx="27" ry="12" fill="rgba(0,0,0,.22)"/>`;
  for (let i = 0; i < layers; i++) {
    const c = -i * thick;
    out += `<path d="M-24,${c} L-24,${c + thick} A24,12 0 0 0 24,${c + thick} L24,${c} Z" fill="${s.side}" stroke="${s.rim}" stroke-width="1"/>`;
    out += `<ellipse cx="0" cy="${c}" rx="24" ry="12" fill="${s.top}" stroke="${s.rim}" stroke-width="1"/>`;
  }
  const top = -(layers - 1) * thick;
  out += `<g transform="translate(0 ${top}) scale(1 0.55) rotate(${owner === 0 ? 90 : -90})"><use href="#scarab" x="-13" y="-17" width="26" height="34" style="color:${s.mark};--cut:${s.top}" fill="${s.mark}" stroke="${s.mark}"/></g>`;
  if (badge && count > 1) out += `<g transform="translate(24 ${top - 16})"><circle r="10" fill="#fff9e3" stroke="#3a2813" stroke-width="2"/><text y="5" text-anchor="middle" font-size="14" font-weight="700" fill="#3a2813" font-family="Georgia,serif">${count}</text></g>`;
  return `${out}</g>`;
}

function boardLayer() {
  let s = `<g>`;
  s += `<image href="/images/brame/fond%20plateau.jpg" x="14" y="14" width="${VIEW.w - 28}" height="${VIEW.h - 28}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clothclip)" opacity="0.8"/><clipPath id="clothclip"><rect x="14" y="14" width="${VIEW.w - 28}" height="${VIEW.h - 28}" rx="10"/></clipPath>`;
  s += `<g filter="url(#cloth)" opacity="0.92">`;
  s += `<g stroke="#2e3a3c" stroke-width="3.5" stroke-linecap="round" fill="none">`;
  PASSAGE_LINES.forEach(([a, b]) => {
    const pa = nodePos(a);
    const pb = nodePos(b);
    const dir = pb.y > pa.y ? 1 : -1;
    s += `<line x1="${pa.x}" y1="${pa.y + dir * WID / 2}" x2="${pb.x}" y2="${pb.y - dir * WID / 2}"/>`;
  });
  CIRCLES.forEach((k) => {
    const { x, y, r } = CIRCLE_POS[k];
    const edges = k === 'k0' ? [YS[0] + WID / 2, YS[1] - WID / 2] : [YS[1] + WID / 2, YS[2] - WID / 2];
    edges.forEach((ey) => [4, 6].forEach((row) => {
      const sx = px(row) > x ? 1 : -1;
      const sy = ey > y ? 1 : -1;
      s += `<line x1="${x + sx * r * 0.7}" y1="${y + sy * r * 0.7}" x2="${px(row)}" y2="${ey}" stroke-width="5"/>`;
    }));
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fbf8ef" stroke-width="3.5"/>`;
    s += `<use href="#scarab" x="${x - 11}" y="${y - 13}" width="22" height="26" color="#8c2a22" fill="#8c2a22" stroke="#8c2a22" style="--cut:#fbf8ef" opacity=".75"/>`;
  });
  s += '</g>';
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const goal = r === 0 || r === ROWS - 1;
      s += `<rect x="${px(r) - LEN / 2}" y="${YS[c] - WID / 2}" width="${LEN}" height="${WID}" fill="${goal ? '#efe6cc' : '#fbf8ef'}" stroke="#2e3a3c" stroke-width="2.5"/>`;
    }
    [4, 7].forEach((r) => { s += `<line x1="${px(r) + LEN / 2}" x2="${px(r) + LEN / 2}" y1="${YS[c] - WID / 2}" y2="${YS[c] + WID / 2}" stroke="#2e3a3c" stroke-width="5.5"/>`; });
  }
  return `${s}</g>`;
}

/**
 * Dessine le plateau complet. `ui.marks` : { nodeId: 'move' | 'attack' | 'pick' | 'target' | 'kill' }.
 * Les pions et pyramides sont triés de haut en bas pour que les piles du bas passent devant.
 */
export function renderBoard(svg, game, ui = { marks: {}, selected: null }) {
  const items = [];
  const cells = { ...game.cells };
  const dest = ui.moving?.to;
  if (dest && cells[dest]) cells[dest] = { ...cells[dest], count: cells[dest].count - 1 };
  Object.entries(cells).filter(([, c]) => c.count > 0).forEach(([id, c]) => items.push({ id, y: nodePos(id).y, svg: stackMarkup(c.owner, c.count, nodePos(id).x, nodePos(id).y + 4) }));
  game.pyramids.forEach((id, p) => { if (id) items.push({ id, y: nodePos(id).y + 1, svg: pyramidMarkup(p, nodePos(id).x, nodePos(id).y + 4) }); });
  items.sort((a, b) => a.y - b.y);
  const right = goalRow(game.current) === 0;
  const exit = { x: right ? px(0) + LEN / 2 + 8 : 20, y: 60, w: 54, h: VIEW.h - 120 };
  const marks = Object.entries(ui.marks).filter(([id]) => id === EXIT || NODES.includes(id)).map(([id, kind]) => {
    if (id === EXIT) return `<g class="mark ${kind}"><rect x="${exit.x}" y="${exit.y}" width="${exit.w}" height="${exit.h}" rx="10"/><text transform="translate(${exit.x + exit.w / 2 + 8} ${VIEW.h / 2}) rotate(${right ? 90 : -90})" text-anchor="middle" class="exit-label">SORTIE : pion sauvé</text></g>`;
    const c = parseCell(id);
    const p = nodePos(id);
    const shape = c
      ? `<rect x="${p.x - LEN / 2 - 3}" y="${p.y - WID / 2 - 3}" width="${LEN + 6}" height="${WID + 6}" rx="6"/>`
      : `<circle cx="${p.x}" cy="${p.y}" r="${CIRCLE_POS[id].r + 4}"/>`;
    return `<g class="mark ${kind}${ui.selected === id ? ' selected' : ''}">${shape}</g>`;
  }).join('');
  const hits = [...Array.from({ length: COLS * ROWS }, (_, i) => cellId(Math.floor(i / ROWS), i % ROWS)), ...CIRCLES].map((id) => {
    const p = nodePos(id);
    return parseCell(id)
      ? `<rect data-node="${id}" x="${p.x - LEN / 2}" y="${p.y - WID / 2}" width="${LEN}" height="${WID}" fill="transparent"/>`
      : `<circle data-node="${id}" cx="${p.x}" cy="${p.y}" r="${CIRCLE_POS[id].r}" fill="transparent"/>`;
  }).join('');
  const exitHit = `<rect data-node="${EXIT}" x="${exit.x}" y="${exit.y}" width="${exit.w}" height="${exit.h}" fill="transparent"/>`;
  svg.innerHTML = `${boardLayer()}${marks}${items.map((i) => i.svg).join('')}<g id="ghost"></g><g class="hits">${hits}${exitHit}</g>`;
}
