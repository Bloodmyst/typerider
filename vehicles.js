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
const g = cv.getContext('2d');
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
function palette(skinId, jacket) {
  const key = skinId + '|' + jacket;
  if (palCache[key]) return palCache[key];
  const s = SKINS[skinId] || SKINS.skin_bleu;
  const P = Object.assign({}, FIXED, s, { A: darken(s.a, 0.3) });
  if (jacket === 'cream') Object.assign(P, { j: P.c, J: P.e, q: P.C });
  else Object.assign(P, { j: P.m, J: P.l, q: P.d });
  palCache[key] = P;
  return P;
}

// ---------- sprites du pilote (sans contour : il est ajouté automatiquement) ----------
const SPRITES = {
  torso: [
    '....hhhh....',
    '...hhhhhhh..',
    '..hhhhhhhhh.',
    '..hhhkkkkkk.',
    '..hhkkkkokk.',
    '..hkkkkkkkkK',
    '...kkkkkkkk.',
    '....KKkkk...',
    '..aajjjjjj..',
    '.aaajjJJJjj.',
    '.aaajjjjjjj.',
    '.aAajjjjjjj.',
    '.aaajjjjjqq.',
    '..aa.qqqqqq.',
  ],
  helmet: [
    '....mmmm....',
    '...mmmmmmm..',
    '..mmmmmmmmm.',
    '..mmlmgggggg',
    '..mmmgWggggg',
    '..mmmgggggg.',
    '...mmmmmmmd.',
    '....SSkkk...',
    '..aajjjjjj..',
    '.aaajjJJJjj.',
    '.aaajjjjjjj.',
    '.aAajjjjjjj.',
    '.aaajjjjjqq.',
    '..aa.qqqqqq.',
  ],
};

const sprCache = {};
function sprite(name, P, key) {
  const ck = name + '|' + key;
  let c = sprCache[ck];
  if (c) return c;
  const rows = SPRITES[name];
  c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const sg = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      sg.fillStyle = P[ch];
      sg.fillRect(x, y, 1, 1);
    }
  }
  sprCache[ck] = c;
  return c;
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
    draw(P, o) {
      const ph = o.travel * 0.52;
      const by = -Math.round(Math.abs(Math.sin(ph)));
      const f1x = 3 * Math.cos(ph), f1y = -2 + Math.min(0, Math.sin(ph)) * 2.5;
      const f2x = 3 * Math.cos(ph + Math.PI), f2y = -2 + Math.min(0, Math.sin(ph + Math.PI)) * 2.5;
      leg(P.P, P.B, 0, -9 + by, f2x, f2y, 4, 4.8);
      g.drawImage(sprite('torso', P, o.skin + 'skin'), -6, -23 + by);
      leg(P.p, P.B, 1, -9 + by, f1x, f1y, 4, 4.8);
      return { mount: [3.5, -13.5 + by], head: [0.5, -23 + by], back: [-4, -15 + by],
               contacts: [[f1x, 0], [f2x, 0]] };
    },
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
      g.drawImage(sprite('torso', P, o.skin + 'skin'), -8, -29);
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
      g.drawImage(sprite('torso', P, o.skin + 'skin'), -9, -29);
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
      g.drawImage(sprite('torso', P, o.skin + 'cream'), -8, -21 + y);
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
      g.drawImage(sprite('helmet', P, o.skin + 'cream'), -10, -27);
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
      g.drawImage(sprite('helmet', P, o.skin + 'cream'), -8, -25 + y);
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
      g.drawImage(sprite('torso', P, o.skin + 'cream'), -7, -28 + y);
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
      g.drawImage(sprite('torso', P, o.skin + 'cream'), -8, -28);
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
      g.drawImage(sprite('torso', P, o.skin + 'cream'), -8, -27);
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

/* Dessine le véhicule `tier` (1..9) et renvoie sa géométrie + le canvas.
   o = { t, travel, angle, recoil, skin, acc, white (0..1), dark (silhouette) } */
function render(tier, o) {
  const def = VEHICLES[Math.max(0, Math.min(VEHICLES.length - 1, tier - 1))];
  const P = palette(o.skin, def.jacket);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, CW, CH);
  g.setTransform(1, 0, 0, 1, AX, AY);
  const m = def.draw(P, o);
  weapon(def.segs, P, m.mount[0], m.mount[1], o.angle, (o.recoil || 0) * Math.min(3, 1 + def.kick));
  accessory(o.acc, P, m.head, m.back, o.t || 0);
  g.setTransform(1, 0, 0, 1, 0, 0);

  // contour automatique : silhouette dilatée d'une cellule, teintée en sombre
  og.globalCompositeOperation = 'source-over';
  og.globalAlpha = 1;
  og.clearRect(0, 0, CW, CH);
  og.drawImage(cv, -1, 0);
  og.drawImage(cv, 1, 0);
  og.drawImage(cv, 0, -1);
  og.drawImage(cv, 0, 1);
  og.globalCompositeOperation = 'source-in';
  og.fillStyle = OUTLINE;
  og.fillRect(0, 0, CW, CH);
  og.globalCompositeOperation = 'source-over';
  og.drawImage(cv, 0, 0);
  if (o.dark || o.white > 0) {
    og.globalCompositeOperation = 'source-atop';
    og.globalAlpha = o.dark ? 1 : Math.min(1, o.white);
    og.fillStyle = o.dark ? '#0b1022' : '#ffffff';
    og.fillRect(0, 0, CW, CH);
    og.globalAlpha = 1;
    og.globalCompositeOperation = 'source-over';
  }
  m.canvas = out;
  return m;
}

window.TRVehicles = {
  list: VEHICLES,
  SKINS,
  CW, CH, AX, AY,
  render,
};

})();
