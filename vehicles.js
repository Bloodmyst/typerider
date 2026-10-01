/* ============================================================
   TYPERIDER — véhicules en pixel art procédural
   Chaque véhicule est dessiné à 1 cellule = 1 pixel dans un
   petit canvas, contouré automatiquement, puis agrandi par le
   jeu. Repère : x vers la droite, y vers le haut négatif,
   origine = point de contact au sol, au centre du véhicule.
   ============================================================ */
(() => {
'use strict';

const CW = 100, CH = 84, AX = 50, AY = 74;
const cv = document.createElement('canvas');
cv.width = CW; cv.height = CH;
let g = cv.getContext('2d'); // contexte de dessin courant (les primitives dessinent ici)
const out = document.createElement('canvas');
out.width = CW; out.height = CH;
const og = out.getContext('2d');
const OUTLINE = '#141a2e';

// couleurs fixes (personnage, pneus, métal, vitres…)
const FIXED = {
  o: '#141a2e', k: '#f2c29b', K: '#d99a73', h: '#5a3522',
  c: '#f4f1e8', C: '#c9c3b3', e: '#ffffff', p: '#34405e', P: '#252e45',
  t: '#1f2230', T: '#454a5c', s: '#a3adc2', S: '#6a7389',
  w: '#8fd3ff', W: '#e6f7ff', r: '#ff4a4a', y: '#ffe97a',
  b: '#8a5a33', B: '#5c3a20', n: '#2a3050',
  // Kimlu : cheveux brun très foncé et leur reflet, boucles d'oreilles (or + pierre bleu-vert)
  u: '#2b1b1e', U: '#5b3b38', E: '#ffd93b', z: '#3fd0c0',
};

// jeux de couleurs achetables : m = principale, d = sombre, l = claire, a = accent, g = lueur
const SKINS = {
  skin_bleu: { m: '#3d6fd1', d: '#27458c', l: '#7fb0ff', a: '#ffb347', g: '#7ad9ff' },
  skin_or:   { m: '#d9a82e', d: '#8f6b16', l: '#ffe38a', a: '#c0392b', g: '#fff3b0' },
  skin_rose: { m: '#e0508f', d: '#9a2c5e', l: '#ff9ec4', a: '#7ad9ff', g: '#ffc6e0' },
  skin_camo: { m: '#5f7d3a', d: '#3a4f24', l: '#93b05a', a: '#c9a86a', g: '#d3ef9a' },
  skin_lave: { m: '#c9362a', d: '#7a1e18', l: '#ff7a52', a: '#ffb347', g: '#ffc06b' },
};

function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - k));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

// palette complète selon le skin et la tenue du pilote (j/J/q = veste)
const palCache = {};
// Kimlu garde sa tenue quel que soit le véhicule : robe bleu canard, legging noir, bottes marron
const KIMLU_LOOK = {
  k: '#e9b48e', K: '#c98b67',
  j: '#1f9a95', J: '#45c2b8', q: '#14706d',
  p: '#262433', P: '#17151f',
  R: '#ffd9b0', Y: '#8f5f48', Q: '#0a3e3d',
};

function palette(skinId, jacket, char) {
  const key = skinId + '|' + jacket + '|' + char;
  if (palCache[key]) return palCache[key];
  const s = SKINS[skinId] || SKINS.skin_bleu;
  const P = Object.assign({}, FIXED, s, { A: darken(s.a, 0.3) });
  if (jacket === 'cream') Object.assign(P, { j: P.c, J: P.e, q: P.C });
  else Object.assign(P, { j: P.m, J: P.l, q: P.d });
  if (char && char.startsWith('kimlu')) Object.assign(P, KIMLU_LOOK);
  palCache[key] = P;
  return P;
}

// ---------- primitives (coordonnées en cellules) ----------
function R(col, x, y, w, h) {
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

function line(col, x0, y0, x1, y1, th) {
  th = th || 1;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const o = Math.floor((th - 1) / 2);
  let err = dx + dy;
  g.fillStyle = col;
  for (;;) {
    g.fillRect(x0 - o, y0 - o, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// disque plein, jamais sous le niveau du sol
function disc(col, cx, cy, r) {
  g.fillStyle = col;
  const y1 = Math.min(-1, Math.ceil(cy + r));
  for (let y = Math.floor(cy - r); y <= y1; y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) g.fillRect(x, y, 1, 1);
    }
  }
}

// roue qui tourne : pneu, jante et rayons selon le style
function wheel(cx, cy, r, ang, style, P) {
  const y1 = Math.min(-1, Math.ceil(cy + r));
  for (let y = Math.floor(cy - r); y <= y1; y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      const a = Math.atan2(dy, dx) - ang;
      let col = null;
      if (d > r - 1.25) {
        col = (style === 'off' && Math.sin(a * 8) > 0.3) ? P.T : P.t;
      } else if (style === 'spoke') {
        if (d > r - 2) col = P.S;
        else if (d < 1) col = P.s;
        else if (Math.abs(Math.sin(a * 3)) < 0.2) col = P.s;
      } else if (style === 'small') {
        col = d < 1 ? P.s : P.a;
      } else if (style === 'cap') {
        if (d > r - 2) col = P.T;
        else col = (d > 1.2 && Math.sin(a * 5) > 0.6) ? P.S : P.s;
      } else if (style === 'mag') {
        if (d > r - 2) col = P.S;
        else if (d < 1.2) col = P.s;
        else col = Math.abs(Math.sin(a * 1.5)) < 0.3 ? P.m : P.T;
      } else {
        if (d > r - 2.2) col = P.S;
        else if (d < 1.2) col = P.s;
        else col = Math.sin(a * 4) > 0.5 ? P.a : P.T;
      }
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  }
}

// jambe à deux segments (cinématique inverse, genou vers l'avant)
function leg(col, shoe, hx, hy, fx, fy, L1, L2) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  const md = L1 + L2 - 0.05;
  if (d > md) { fx = hx + dx / d * md; fy = hy + dy / d * md; d = md; }
  d = Math.max(0.1, d);
  const a = Math.atan2(fy - hy, fx - hx);
  const cb = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const ka = a - Math.acos(cb);
  const kx = hx + Math.cos(ka) * L1, ky = hy + Math.sin(ka) * L1;
  line(col, hx, hy, kx, ky, 2);
  line(col, kx, ky, fx, fy, 2);
  const sx = Math.round(fx), sy = Math.round(fy);
  R(shoe, sx - 1, sy, 4, 1);
  R(shoe, sx - 1, sy - 1, 3, 1);
}

// arme orientée : suite de segments [longueur, épaisseur, couleur, décalage, avance]
function weapon(segs, P, px, py, ang, recoil) {
  const cx = Math.cos(ang), sy = Math.sin(ang), nx = -sy, ny = cx;
  let s = -recoil;
  for (const sg of segs) {
    const len = sg[0], th = sg[1], off = sg[3] || 0, adv = sg[4] !== false;
    g.fillStyle = P[sg[2]];
    for (let u = 0; u < len; u += 0.5) {
      for (let v = -th / 2 + 0.25; v < th / 2; v += 0.5) {
        g.fillRect(Math.floor(px + cx * (s + u) + nx * (v + off)),
                   Math.floor(py + sy * (s + u) + ny * (v + off)), 1, 1);
      }
    }
    if (adv) s += len;
  }
  return s;
}

function accessory(acc, P, head, back, t) {
  if (!acc) return;
  const hx = Math.round(head[0]), hy = Math.round(head[1]);
  const bx = Math.round(back[0]), by = Math.round(back[1]);
  const ink = '#14182e';
  if (acc === 'acc_chapeau') {
    R(ink, hx - 4, hy + 1, 9, 1);
    R(ink, hx - 3, hy - 4, 7, 5);
    R(P.a, hx - 3, hy, 7, 1);
  } else if (acc === 'acc_fete') {
    // chapeau pointu de fête à rayures, avec pompon
    for (let k = 0; k < 7; k++) {
      const w = Math.max(1, 7 - k);
      R(k % 2 ? '#ffd93b' : '#ff5d8f', hx - Math.floor(w / 2), hy + 1 - k, w, 1);
    }
    R('#7ad9ff', hx - 2, hy, 1, 1);
    R('#7ad9ff', hx + 1, hy - 2, 1, 1);
    R('#ffffff', hx - 1, hy - 7, 2, 2);
  } else if (acc === 'acc_couronne') {
    R('#ffd93b', hx - 3, hy - 1, 7, 2);
    R('#ffd93b', hx - 3, hy - 3, 1, 2);
    R('#ffd93b', hx, hy - 3, 1, 2);
    R('#ffd93b', hx + 3, hy - 3, 1, 2);
    R('#ff5d8f', hx, hy - 1, 1, 1);
    R('#7ad9ff', hx - 2, hy, 1, 1);
    R('#7ad9ff', hx + 2, hy, 1, 1);
  } else if (acc === 'acc_lunettes') {
    R(ink, hx - 4, hy + 4, 9, 1);
    R(ink, hx, hy + 5, 2, 1);
    R(ink, hx + 3, hy + 5, 2, 1);
    R('#7ad9ff', hx + 1, hy + 4, 1, 1);
  } else if (acc === 'acc_drapeau') {
    const fl = Math.floor(t * 6) % 2;
    R(P.n, bx, by - 12, 1, 12);
    R(P.a, bx - 5, by - 12, 5, 1);
    R(P.a, bx - 6 + fl, by - 11, 6, 1);
    R(P.A, bx - 5, by - 10, 5, 1);
  } else if (acc === 'acc_radar') {
    R(P.n, bx, by - 6, 1, 6);
    const w = Math.round(Math.abs(Math.cos(t * 2.5)) * 3);
    R(P.g, bx - w, by - 7, 2 * w + 1, 1);
    R(P.S, bx, by - 8, 1, 1);
    if (Math.sin(t * 6) > 0.6) R(P.r, bx, by - 9, 1, 1);
  }
}

// ---------- les 9 véhicules ----------
const VEHICLES = [
  {
    id: 'marche', name: 'A PIED', weapon: 'LANCE-PIERRE', jacket: 'skin',
    speed: 0.35, proj: 'caillou', kick: 0.6, halfW: 7, h: 23,
    segs: [[2.5, 2, 'j'], [1.5, 2, 'k'], [2.5, 1, 'b'], [2, 1, 'b', -1, false], [2, 1, 'b', 1], [0.5, 3, 'r']],
    // dessiné en haute définition par renderWalker
  },
  {
    id: 'trottinette', name: 'TROTTINETTE', weapon: 'PISTOLET A EAU', jacket: 'skin',
    speed: 0.55, proj: 'eau', kick: 0.6, halfW: 10, h: 29,
    segs: [[2.5, 2, 'j'], [1.5, 2, 'k'], [2, 3, 'a'], [3, 2, 'g'], [1, 1, 'e']],
    draw(P, o) {
      const ang = o.travel / 2.5;
      const ph = o.travel * 0.22;
      leg(P.P, P.B, -2, -15, -4.5 + 2.5 * Math.cos(ph), -9.5 + 1.5 * Math.sin(ph), 3.4, 3.6);
      wheel(-6, -2.5, 2.5, ang, 'small', P);
      wheel(6, -2.5, 2.5, ang, 'small', P);
      line(P.S, 6, -3, 4, -21, 2);
      R(P.S, 1, -22, 5, 1);
      R(P.a, 0, -22, 2, 1);
      R(P.l, -8, -7, 14, 1);
      R(P.m, -8, -6, 14, 1);
      R(P.d, -8, -5, 14, 1);
      R(P.S, -10, -6, 2, 1);
      drawPilot(P, o, 'torso', -8, -29);
      leg(P.p, P.B, -1, -15, 0, -9, 3.4, 3.6);
      line(P.j, -1, -19, 1, -21, 2);
      return { mount: [1.5, -19.5], head: [-1.5, -29], back: [-6, -21], contacts: [[-6, 0], [6, 0]] };
    },
  },
  {
    id: 'velo', name: 'VELO', weapon: 'LANCE-BALLES', jacket: 'skin',
    speed: 0.75, proj: 'balle', kick: 0.8, halfW: 13, h: 29,
    segs: [[2.5, 2, 'j'], [1.5, 2, 'k'], [4, 3, 'l'], [1.5, 4, 'a']],
    draw(P, o) {
      const ang = o.travel / 4.5;
      const c = o.travel * 0.3;
      const p1x = -1 + Math.cos(c) * 2.2, p1y = -5 + Math.sin(c) * 2.2;
      const p2x = -1 - Math.cos(c) * 2.2, p2y = -5 - Math.sin(c) * 2.2;
      leg(P.P, P.B, -2.5, -15, p2x, p2y - 1, 5, 5.6);
      wheel(-8, -4.5, 4.5, ang, 'spoke', P);
      wheel(8, -4.5, 4.5, ang, 'spoke', P);
      line(P.m, -8, -5, -1, -5, 1);
      line(P.m, -8, -5, -3, -12, 1);
      line(P.m, -1, -5, -3, -12, 2);
      line(P.m, -3, -12, 5, -13, 2);
      line(P.m, -1, -5, 6, -11, 2);
      line(P.m, 5, -13, 6, -10, 2);
      line(P.s, 6, -10, 8, -5, 1);
      line(P.S, 5, -13, 4, -16, 1);
      R(P.S, 2, -17, 4, 1);
      R(P.a, 1, -17, 2, 1);
      R(P.B, -6, -14, 5, 1);
      disc(P.S, -0.5, -4.5, 1.6);
      drawPilot(P, o, 'torso', -9, -29);
      leg(P.p, P.B, -2, -15, p1x, p1y - 1, 5, 5.6);
      line(P.j, -2, -19, 2, -17, 2);
      return { mount: [0.5, -19.5], head: [-2.5, -29], back: [-7, -21], contacts: [[-8, 0], [8, 0]] };
    },
  },
  {
    id: 'voiture', name: 'VOITURE', weapon: 'CANON A CONFETTIS', jacket: 'cream',
    speed: 1.0, proj: 'confetti', kick: 1.2, halfW: 18, h: 22,
    segs: [[1.5, 3, 'S'], [4, 3, 'a'], [1, 4, 'l'], [1, 3, 'e']],
    draw(P, o) {
      const ang = o.travel / 4;
      const y = Math.round(Math.sin(o.travel * 0.15) * 0.6);
      R(P.B, -11, -15 + y, 2, 5);
      drawPilot(P, o, 'torso', -8, -21 + y);
      R(P.m, -15, -12 + y, 8, 2);
      R(P.l, -15, -12 + y, 8, 1);
      R(P.m, -16, -10 + y, 32, 6);
      R(P.l, -16, -10 + y, 32, 1);
      R(P.a, -15, -7 + y, 30, 1);
      R(P.d, -16, -5 + y, 32, 1);
      R(P.d, -2, -9 + y, 1, 4);
      R(P.S, 0, -8 + y, 2, 1);
      R(P.m, 16, -9 + y, 1, 4);
      R(P.y, 16, -9 + y, 1, 2);
      R(P.S, 16, -5 + y, 2, 2);
      R(P.S, -18, -5 + y, 2, 2);
      R(P.r, -17, -9 + y, 1, 2);
      line(P.w, 4, -11 + y, 6, -16 + y, 1);
      line(P.S, 5, -11 + y, 7, -16 + y, 1);
      line(P.S, 2, -12 + y, 3, -10 + y, 1);
      line(P.j, -1, -12 + y, 2, -12 + y, 2);
      disc(P.d, -10, -4, 5.3);
      disc(P.d, 10, -4, 5.3);
      wheel(-10, -4, 4, ang, 'cap', P);
      wheel(10, -4, 4, ang, 'cap', P);
      R(P.S, -12, -14 + y, 1, 2);
      return { mount: [-11.5, -14.5 + y], head: [-1.5, -21 + y], back: [-15, -12 + y],
               contacts: [[-10, 0], [10, 0]], headlight: [17, -8 + y], exhaust: [-18, -4] };
    },
  },
  {
    id: 'moto', name: 'MOTO', weapon: 'BLASTER LASER', jacket: 'cream',
    speed: 1.25, proj: 'laser', kick: 1.0, halfW: 15, h: 27,
    segs: [[2.5, 2, 'j'], [1.5, 2, 'k'], [4, 2, 'S'], [1, 3, 'd'], [1, 2, 'g']],
    draw(P, o) {
      const ang = o.travel / 4.5;
      wheel(-9, -4.5, 4.5, ang, 'mag', P);
      wheel(9, -4.5, 4.5, ang, 'mag', P);
      line(P.S, -9, -5, -2, -7, 2);
      line(P.S, -5, -6, -13, -8, 2);
      R(P.T, -15, -9, 2, 2);
      R(P.S, -3, -10, 6, 4);
      R(P.T, -2, -9, 4, 1);
      R(P.T, -2, -7, 4, 1);
      line(P.s, 9, -5, 7, -14, 2);
      R(P.B, -8, -12, 7, 2);
      R(P.m, -11, -13, 4, 2);
      R(P.r, -12, -13, 1, 1);
      drawPilot(P, o, 'helmet', -10, -27);
      R(P.m, -2, -13, 8, 3);
      R(P.l, -1, -13, 6, 1);
      R(P.a, -1, -12, 6, 1);
      R(P.m, 5, -15, 4, 6);
      R(P.m, 8, -13, 2, 4);
      R(P.y, 10, -12, 1, 2);
      line(P.w, 6, -16, 8, -18, 1);
      leg(P.p, P.B, -3.5, -13, -1, -7, 4.5, 4.8);
      line(P.j, -3, -18, 6, -16, 2);
      return { mount: [-0.5, -17.5], head: [-3.5, -27], back: [-9, -19],
               contacts: [[-9, 0], [9, 0]], headlight: [11, -11], exhaust: [-15, -8] };
    },
  },
  {
    id: 'buggy', name: 'BUGGY', weapon: 'DOUBLE BLASTER', jacket: 'cream',
    speed: 1.3, proj: 'laser2', kick: 1.2, halfW: 17, h: 29,
    segs: [[1.5, 4, 'S'], [5, 1, 'S', -1, false], [5, 1, 'S', 1], [1, 1, 'g', -1, false], [1, 1, 'g', 1]],
    draw(P, o) {
      const ang = o.travel / 5.5;
      const y = Math.round(Math.sin(o.travel * 0.21) * 0.9);
      drawPilot(P, o, 'helmet', -8, -25 + y);
      R(P.S, -15, -13 + y, 4, 5);
      R(P.T, -15, -12 + y, 4, 1);
      R(P.T, -15, -10 + y, 4, 1);
      line(P.T, -15, -9 + y, -17, -11 + y, 1);
      R(P.m, -11, -11 + y, 22, 3);
      R(P.l, -11, -11 + y, 22, 1);
      R(P.d, -11, -9 + y, 22, 1);
      R(P.m, 11, -10 + y, 3, 2);
      R(P.l, 11, -10 + y, 3, 1);
      R(P.y, 13, -10 + y, 1, 1);
      line(P.S, -12, -8 + y, 13, -8 + y, 1);
      line(P.d, -9, -11 + y, -7, -27 + y, 1);
      line(P.d, -7, -27 + y, 5, -27 + y, 1);
      line(P.d, 5, -27 + y, 11, -11 + y, 1);
      line(P.S, 5, -14 + y, 7, -11 + y, 1);
      line(P.j, -1, -16 + y, 5, -14 + y, 2);
      wheel(-10, -5.5, 5.5, ang, 'off', P);
      wheel(10, -5.5, 5.5, ang, 'off', P);
      R(P.S, -3, -28 + y, 2, 1);
      return { mount: [-2, -28.5 + y], head: [-1.5, -25 + y], back: [-13, -13 + y],
               contacts: [[-10, 0], [10, 0]], headlight: [14, -10 + y], exhaust: [-17, -11 + y] };
    },
  },
  {
    id: 'jeep', name: 'JEEP 4X4', weapon: 'MINI-ROQUETTES', jacket: 'cream',
    speed: 1.35, proj: 'roquette', kick: 1.8, halfW: 20, h: 32,
    segs: [[1, 2, 'S'], [5, 5, 'S'], [1, 5, 'T'], [1, 1, 'r', -1.5, false], [1, 1, 'r', 0, false], [1, 1, 'r', 1.5]],
    draw(P, o) {
      const ang = o.travel / 5.5;
      const y = Math.round(Math.sin(o.travel * 0.17) * 0.7);
      drawPilot(P, o, 'torso', -7, -28 + y);
      R(P.m, -16, -14 + y, 32, 8);
      R(P.l, -16, -14 + y, 32, 1);
      R(P.d, -16, -7 + y, 32, 1);
      R(P.a, -15, -10 + y, 30, 1);
      R(P.d, 3, -13 + y, 1, 5);
      R(P.S, 16, -13 + y, 1, 6);
      R(P.y, 16, -12 + y, 1, 2);
      R(P.S, 16, -8 + y, 3, 2);
      R(P.S, -18, -8 + y, 2, 2);
      R(P.r, -17, -13 + y, 1, 2);
      disc(P.t, -18, -11 + y, 3);
      disc(P.S, -18, -11 + y, 1.4);
      line(P.w, 4, -15 + y, 5, -21 + y, 1);
      line(P.S, 5, -15 + y, 6, -21 + y, 1);
      line(P.S, -9, -15 + y, -9, -31 + y, 1);
      R(P.S, -9, -31 + y, 3, 1);
      line(P.S, 3, -17 + y, 4, -15 + y, 1);
      line(P.j, 0, -19 + y, 3, -17 + y, 2);
      disc(P.d, -11, -5.5, 6.6);
      disc(P.d, 11, -5.5, 6.6);
      wheel(-11, -5.5, 5.5, ang, 'off', P);
      wheel(11, -5.5, 5.5, ang, 'off', P);
      return { mount: [-7.5, -32 + y], head: [-0.5, -28 + y], back: [-15, -15 + y],
               contacts: [[-11, 0], [11, 0]], headlight: [17, -11 + y], exhaust: [-19, -7] };
    },
  },
  {
    id: 'blinde', name: 'BLINDE', weapon: 'CANON PLASMA', jacket: 'cream',
    speed: 1.2, proj: 'plasma', kick: 2.2, halfW: 20, h: 28,
    segs: [[3, 4, 'S'], [2, 2, 'S'], [1, 3, 'g'], [2, 2, 'S'], [1, 3, 'g'], [1, 2, 'e']],
    draw(P, o) {
      const ang = o.travel / 4.5;
      drawPilot(P, o, 'torso', -8, -28);
      R(P.S, -11, -22, 3, 2);
      R(P.m, -9, -20, 14, 5);
      R(P.l, -9, -20, 14, 1);
      R(P.d, -9, -16, 14, 1);
      R(P.m, -17, -15, 34, 8);
      R(P.l, -17, -15, 34, 1);
      R(P.d, -17, -9, 34, 2);
      R(P.m, 17, -14, 2, 5);
      R(P.m, 19, -12, 1, 3);
      R(P.y, 19, -11, 1, 1);
      R(P.S, -18, -14, 1, 6);
      for (let x = -15; x <= 15; x += 5) R(P.d, x, -13, 1, 1);
      R(P.d, -10, -12, 5, 2);
      R(P.d, 4, -11, 6, 2);
      R(P.w, 11, -13, 4, 1);
      wheel(-12, -4.5, 4.5, ang, 'off', P);
      wheel(0, -4.5, 4.5, ang, 'off', P);
      wheel(12, -4.5, 4.5, ang, 'off', P);
      return { mount: [5, -18], head: [-1.5, -28], back: [-15, -16],
               contacts: [[-12, 0], [0, 0], [12, 0]], headlight: [20, -11], exhaust: [-19, -11] };
    },
  },
  {
    id: 'char', name: 'CHAR FUTURISTE', weapon: 'CANON LOURD', jacket: 'cream',
    speed: 1.1, proj: 'obus', kick: 3.5, halfW: 22, h: 27,
    segs: [[4, 5, 'S'], [9, 2, 'S'], [2, 4, 'T']],
    draw(P, o) {
      const tr = o.travel;
      drawPilot(P, o, 'torso', -8, -27);
      R(P.S, -14, -21, 3, 2);
      R(P.m, -11, -19, 20, 6);
      R(P.l, -11, -19, 20, 1);
      R(P.d, -11, -14, 20, 1);
      R(P.m, 9, -18, 2, 4);
      R(P.m, 11, -17, 1, 2);
      R(P.g, -7, -20, 3, 1);
      R(P.m, -19, -13, 38, 5);
      R(P.l, -19, -13, 38, 1);
      R(P.d, -19, -10, 38, 2);
      R(P.m, 19, -12, 2, 3);
      R(P.m, 21, -11, 1, 2);
      R(P.g, -14, -11, 26, 1);
      R(P.y, 21, -11, 1, 1);
      // chenilles : le brin du haut avance, celui du bas reste collé au sol
      R(P.t, -17, -8, 34, 1);
      R(P.t, -18, -7, 36, 6);
      R(P.t, -17, -1, 34, 1);
      const off = Math.floor(tr) % 3;
      for (let x = -17; x < 17; x++) {
        if ((((x - off) % 3) + 3) % 3 === 0) R(P.T, x, -8, 1, 1);
        if ((((x + off) % 3) + 3) % 3 === 0) R(P.T, x, -1, 1, 1);
      }
      const a = tr / 2.3;
      for (const wx of [-15, -9, -3, 3, 9, 15]) {
        disc(P.S, wx, -4, 2.3);
        R(P.T, wx + Math.cos(a) * 1.2 - 0.5, -4.5 + Math.sin(a) * 1.2, 1, 1);
      }
      return { mount: [7, -16], head: [-1.5, -27], back: [-17, -14],
               contacts: [[-15, 0], [15, 0]], headlight: [22, -11], exhaust: [-20, -10] };
    },
  },
];

for (const v of VEHICLES) {
  v.muzzle = v.segs.reduce((s, sg) => s + (sg[4] === false ? 0 : sg[0]), 0);
}

// ---------- Personnages en haute définition (2 pixels fins par cellule) ----------
// Les véhicules sont dessinés à l'échelle des cellules (x2) ; les personnages, leurs bras et
// leurs accessoires en pixels fins : profil du visage, plis des vêtements, jambes et chaussures.
const cvF = document.createElement('canvas');
cvF.width = CW * 2; cvF.height = CH * 2;
const gF = cvF.getContext('2d');
const outF = document.createElement('canvas');
outF.width = CW * 2; outF.height = CH * 2;
const ogF = outF.getContext('2d');

function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v + (255 - v) * k);
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

// couleurs fines de Kimlu (sa robe bleu canard ne change pas avec les couleurs achetées)
const FINE = {
  u: '#160e10', U: '#2a1b1c', H: '#4a332f', Y: '#7a5040',          // cheveux : ombre, base, reflet, contour chaud
  k: '#dba27e', K: '#b97f60', L: '#8f5c46', R: '#f6cfa8',          // peau : base, ombre, ombre profonde, contour
  o: '#140c10', m: '#b2595c',                                        // œil, lèvres
  j: '#18837f', J: '#2fa59e', q: '#0f5c5a', Q: '#083a39', Z: '#7fd9cf', // robe
  E: '#e8c050', z: '#38c7b8',                                        // boucle d'oreille
  b: '#7a4f2e', r: '#c23a3a',                                        // lance-pierre
};

// chaque personnage : coiffure, tenue, accessoires portés en permanence
const LOOKS = {
  kimlu: { hair: 'long', outfit: 'dress', earring: true, pack: false, sleeve: false },
  rider: { hair: 'short', outfit: 'jacket', earring: false, pack: true, sleeve: true },
};
const charId = (c) => (c && c.startsWith('kimlu') ? 'kimlu' : 'rider');

function lookColors(id, P) {
  const helmetCols = { v: P.m, V: P.d, W: P.l, n: P.g, S: P.S, a: P.a, A: P.A };
  if (id === 'kimlu') return Object.assign({}, FINE, helmetCols);
  // Rider : cheveux châtains courts, veste aux couleurs achetées, sac à dos
  return Object.assign({}, FINE, helmetCols, {
    u: '#2e1a12', U: '#5a3522', H: '#7d4c30', Y: '#a8744e',
    k: '#efbf98', K: '#cf9470', L: '#a8704f', R: '#ffe2c4', m: '#c98676',
    j: P.j, J: P.J, q: P.q, Q: darken(P.q, 0.35), Z: lighten(P.J, 0.45),
    p: P.p, P: P.P,
  });
}

// tête de profil (vers la droite), lignes de 24 pixels fins
const FINE_HEAD = [
  '..........uuuu..........',
  '........uuUUUUuu........',
  '.......uUUHHUUUUu.......',
  '......uUUHHUUUUUUu......',
  '......uUUUUUUUUUuYu.....',
  '.....uUUUUUUUUuukR......',
  '.....uUUUUUUUuukkkR.....',
  '.....uUUUUUUUuuukkR.....',
  '.....uUUUUUUUukokkkR....',
  '.....uUUUUUUKKkkkkkkR...',
  '.....uUUUUUUEKkkkkkKR...',
  '.....uUUUUUUzKkkkkmkR...',
  '.....uUUUUUUUuKkkkkR....',
  '....uUUUUUUUUUuKkkK.....',
  '....uUUUUUUUUUuKkkR.....',
];

// tête casquée (moto, buggy) : coque aux couleurs achetées, visière lumineuse, jugulaire
const FINE_HEAD_HELMET = [
  '........vvvvvv..........',
  '......vvvvvvvvvv........',
  '.....vvWvvvvvvvvv.......',
  '....vvWWvvvvvvvvvv......',
  '....vvvvvvvvvvvnnnn.....',
  '....vvvvvvvvvvnnnnnn....',
  '....vvvvvvvvvvnnnWnnn...',
  '....vvvvvvvvvvnnnnnnn...',
  '....VvvvvvvvvvvnnnnnV...',
  '.....VvvvvvvvvvvvvvV....',
  '......VVvvvvvvvvVkkR....',
  '.......SSSSSSSSKkkkR....',
  '.............SKkkkR.....',
  '..............Kkk.......',
  '..............KkkR......',
];

function headRows(look, helmet) {
  if (helmet) return FINE_HEAD_HELMET;
  let rows = FINE_HEAD;
  if (!look.earring) rows = rows.map(r => r.replace(/[Ez]/g, 'K'));
  if (look.hair === 'short') {
    // cheveux courts : rien sous la nuque
    rows = rows.map((r, i) => (i < 12 ? r : r.split('').map((c, x) => ('uUH'.includes(c) ? (x >= 12 ? 'K' : '.') : c)).join('')));
  }
  return rows;
}

// silhouette du corps ligne par ligne : bord arrière et bord avant
function fineBodyEdges(r, outfit) {
  if (r <= 16) return [10, 18];             // épaules
  if (r <= 22) return [10, 19];             // poitrine
  if (r <= 27) return [11, 17];             // taille qui s'affine
  if (r === 28) return [11, 16];            // taille
  if (r <= 34 || outfit !== 'dress') return [10 - (r > 31 ? 1 : 0), 17 + (r > 31 ? 1 : 0)]; // hanches
  const t = (r - 35) / 15;                  // jupe évasée jusqu'aux genoux
  return [Math.round(9 - t * 3), Math.round(18 + t * 3)];
}

function dressColor(r, i, xb, xf) {
  if (r <= 19 && i >= 14 + (r - 15)) return i === xf ? 'R' : i === 14 + (r - 15) ? 'K' : 'k'; // épaule nue
  if (r === 28) return i === xf ? 'Z' : 'Q';                       // taille froncée
  if (i === xf) return 'Z';                                         // contour de lumière
  if (i === xf - 1 || (r > 34 && i === xf - 2 && r % 2)) return 'J';
  if (i <= xb + 1) return r > 34 && i === xb ? 'Q' : 'q';          // côté ombre
  if (r > 34) {
    const d = i - xb;
    if (d === 4 || d === 8 || d === 11) return 'q';                 // plis de la jupe
    if (d === 5 || d === 9) return 'J';
  }
  if (r === 22 && i > xb + 1 && i < xf - 1) return 'q';            // ombre sous la poitrine
  if (i === xb + 2 && (i + r) % 2) return 'q';                     // dégradé tramé
  return 'j';
}

function jacketColor(r, i, xb, xf) {
  if (r > 34) return i === xf ? 'p' : i <= xb + 1 ? 'P' : 'p';     // haut du pantalon
  if (r === 15) return i >= 15 ? 'J' : 'j';                        // col
  if (i === xf) return 'Z';
  if (i === xf - 1) return 'J';
  if (i <= xb + 1) return 'q';
  if (i === xf - 4 && r > 16 && r < 33) return 'q';                // fermeture éclair
  if (r >= 32) return 'q';                                          // bas de la veste
  if (i === xb + 2 && (i + r) % 2) return 'q';
  return 'j';
}

// poses : 'stand' (à pied, jusqu'aux hanches ou à l'ourlet), 'seat' (buste), 'helmet' (buste casqué)
const figCache = new WeakMap();
function figure(char, pose, P) {
  let byP = figCache.get(P);
  if (!byP) { byP = {}; figCache.set(P, byP); }
  const key = char + '|' + pose;
  if (byP[key]) return byP[key];
  const id = charId(char), look = LOOKS[id], C = lookColors(id, P);
  const helmet = pose === 'helmet';
  const H2 = pose === 'stand' ? (look.outfit === 'dress' ? 51 : 41) : 28;
  const c = document.createElement('canvas');
  c.width = 24; c.height = H2;
  const x = c.getContext('2d');
  const px = (col, cx, cy) => { x.fillStyle = C[col] || col; x.fillRect(cx, cy, 1, 1); };
  headRows(look, helmet).forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') px(row[i], i, r); });
  if (helmet && look.hair === 'long') {
    for (let r = 9; r < 15; r++) for (let i = 3; i <= 7; i++) px(i === 3 ? 'u' : 'U', i, r); // cheveux sous le casque
  }
  for (let r = 15; r < H2; r++) {
    if (look.hair === 'long' && r <= 34) {
      // longs cheveux qui tombent dans le dos, avec un reflet
      const h0 = r < 18 ? 4 : r < 28 ? 3 : 4 + Math.floor((r - 28) / 2);
      const h1 = r < 28 ? 10 : 10 - Math.floor((r - 28) / 3);
      for (let i = h0; i <= h1; i++) px(i === h0 ? 'u' : (i === h0 + 2 && r < 30 ? 'H' : 'U'), i, r);
    }
    if (look.pack && r >= 16 && r <= 29) {
      for (let i = 6; i <= 10; i++) px(i === 6 || r === 29 ? 'A' : (i === 7 && r < 22 ? lighten(C.a, 0.3) : 'a'), i, r); // sac à dos
    }
    const [xb, xf] = fineBodyEdges(r, look.outfit);
    const from = look.hair === 'long' && r <= 34 ? Math.max(xb, 11) : look.pack && r >= 16 && r <= 29 ? 11 : xb;
    for (let i = from; i <= xf; i++) {
      px(look.outfit === 'dress' ? dressColor(r, i, xb, xf) : jacketColor(r, i, xb, xf), i, r);
    }
    if (look.outfit === 'dress' && r === H2 - 1 && pose === 'stand') {
      for (let i = xb; i <= xf; i++) px(i === xf ? 'q' : 'Q', i, r); // ourlet
    }
  }
  byP[key] = c;
  return c;
}

// buste du pilote sur un véhicule : remplace l'ancien sprite de 12 x 14 cellules au même endroit
function drawPilot(P, o, pose, x, y) {
  g.drawImage(figure(o.char, pose === 'helmet' ? 'helmet' : 'seat', P), x, y, 12, 14);
}

function legFine(C, hx, hy, fx, fy, L1, L2) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  const md = L1 + L2 - 0.05;
  if (d > md) { fx = hx + dx / d * md; fy = hy + dy / d * md; d = md; }
  d = Math.max(0.1, d);
  const a = Math.atan2(fy - hy, fx - hx);
  const cb = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const ka = a - Math.acos(cb);
  const kx = hx + Math.cos(ka) * L1, ky = hy + Math.sin(ka) * L1;
  line(C.leg, hx, hy, kx, ky, 4);
  line(C.legL, hx + 2, hy, kx + 1, ky, 1);
  const bx = kx + (fx - kx) * 0.18, bY = ky + (fy - ky) * 0.18;
  line(C.leg, kx, ky, bx, bY, 3);
  line(C.boot, bx, bY, fx, fy - 2, 3);
  line(C.bootL, bx + 1, bY, fx + 1, fy - 3, 1);
  if (C.cuff) R(C.bootL, Math.round(bx) - 1, Math.round(bY), 4, 1);  // revers de la botte
  const sx = Math.round(fx), sy = Math.round(fy);
  R(C.shoe || C.boot, sx - 1, sy - 2, 6, 2);
  R(C.shoeL || C.bootL, sx + 1, sy - 2, 3, 1);
  R(C.sole, sx - 1, sy, 7, 1);
}

function legColors(id, P, front) {
  if (id === 'kimlu') {
    return front
      ? { leg: '#1e1c26', legL: '#3a3746', boot: '#5a3820', bootL: '#7a5030', sole: '#1b1412', cuff: true }
      : { leg: '#121018', legL: '#24222e', boot: '#3d2614', bootL: '#5a3820', sole: '#100c0a', cuff: true };
  }
  // Rider : pantalon aux couleurs du jeu, baskets marron
  const pants = front ? P.p : P.P;
  return { leg: pants, legL: lighten(pants, 0.18), boot: pants, bootL: lighten(pants, 0.12),
           shoe: front ? P.B : darken(P.B, 0.3), shoeL: lighten(P.B, 0.25), sole: '#1b1412' };
}

const ARM_SEGS = {
  kimlu: [[6, 3, 'k'], [5, 3, 'k'], [2, 3, 'K'], [3, 2, 'b'], [2, 2, 'b', -2, false], [2, 2, 'b', 2], [1, 3, 'r']],
  rider: [[6, 3, 'j'], [5, 3, 'j'], [2, 3, 'k'], [3, 2, 'b'], [2, 2, 'b', -2, false], [2, 2, 'b', 2], [1, 3, 'r']],
};

// arme d'un véhicule en pixels fins : bras plus fin (3 pixels), le reste à la même taille qu'avant
function fineSegs(segs) {
  return segs.map(([len, th, col, off, adv]) => [len * 2, 'jJkK'.includes(col) ? 3 : th * 2, col, (off || 0) * 2, adv]);
}

function finishFine(o) {
  // contour d'un seul pixel fin, discret : la silhouette se lit par la lumière
  ogF.globalCompositeOperation = 'source-over';
  ogF.globalAlpha = 1;
  ogF.clearRect(0, 0, CW * 2, CH * 2);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ogF.drawImage(cvF, ox, oy);
  ogF.globalCompositeOperation = 'source-in';
  ogF.fillStyle = 'rgba(10,8,14,0.72)';
  ogF.fillRect(0, 0, CW * 2, CH * 2);
  ogF.globalCompositeOperation = 'source-over';
  ogF.drawImage(cvF, 0, 0);
  if (o.dark || o.white > 0) {
    ogF.globalCompositeOperation = 'source-atop';
    ogF.globalAlpha = o.dark ? 1 : Math.min(1, o.white);
    ogF.fillStyle = o.dark ? '#0b1022' : '#ffffff';
    ogF.fillRect(0, 0, CW * 2, CH * 2);
    ogF.globalAlpha = 1;
    ogF.globalCompositeOperation = 'source-over';
  }
}

function renderWalker(o) {
  const id = charId(o.char);
  const P = palette(o.skin, 'skin', o.char);
  const C = lookColors(id, P);
  g.setTransform(1, 0, 0, 1, AX * 2, AY * 2);
  // grande foulée : pas de 9 pixels fins, pied levé de 6
  const ph = o.travel * 0.36;
  const by = -Math.round(Math.abs(Math.sin(ph)) * 2);
  const f1x = 4 + 9 * Math.cos(ph), f1y = -1 + Math.min(0, Math.sin(ph)) * 6;
  const f2x = 2 + 9 * Math.cos(ph + Math.PI), f2y = -1 + Math.min(0, Math.sin(ph + Math.PI)) * 6;
  legFine(legColors(id, P, false), 1, -40 + by, f2x, f2y, 19, 20);
  legFine(legColors(id, P, true), 3, -40 + by, f1x, f1y, 19, 20);
  g.drawImage(figure(o.char, 'stand', P), -12, -76 + by);
  const PA = Object.assign({}, P, C);
  weapon(ARM_SEGS[id], PA, 5, -58 + by, o.angle, (o.recoil || 0) * 3);
  accessory(o.acc, PA, [3, -77 + by], [-7, -60 + by], o.t || 0);
  return {
    mount: [2.5, (-58 + by) / 2], head: [1.5, (-77 + by) / 2], back: [-3.5, (-60 + by) / 2],
    contacts: [[f1x / 2, 0], [f2x / 2, 0]],
  };
}

/* Dessine le véhicule `tier` (1..9) et renvoie sa géométrie + le canvas (2 pixels fins par cellule).
   o = { t, travel, angle, recoil, skin, acc, char, white (0..1), dark (silhouette) } */
function render(tier, o) {
  const def = VEHICLES[Math.max(0, Math.min(VEHICLES.length - 1, tier - 1))];
  const sv = g;
  g = gF;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, CW * 2, CH * 2);
  let m;
  if (def.id === 'marche') {
    m = renderWalker(o);
  } else {
    const P = palette(o.skin, def.jacket, o.char);
    g.setTransform(2, 0, 0, 2, AX * 2, AY * 2);
    m = def.draw(P, o);
    g.setTransform(1, 0, 0, 1, AX * 2, AY * 2);
    const PA = Object.assign({}, P, lookColors(charId(o.char), P));
    weapon(fineSegs(def.segs), PA, m.mount[0] * 2, m.mount[1] * 2, o.angle, (o.recoil || 0) * Math.min(3, 1 + def.kick) * 2);
    accessory(o.acc, PA, [m.head[0] * 2, m.head[1] * 2], [m.back[0] * 2, m.back[1] * 2], o.t || 0);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g = sv;
  finishFine(o);
  m.canvas = outF;
  m.fine = true;
  return m;
}

function height(tier, char) {
  return tier === 1 ? 39 : VEHICLES[tier - 1].h;
}

window.TRVehicles = {
  height,
  list: VEHICLES,
  SKINS,
  CW, CH, AX, AY,
  render,
};

})();
