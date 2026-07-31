/* ============================================================
   TYPERIDER — jeu de dactylographie en pixel art
   Des mots tombent du ciel : tapez-les avant qu'ils ne
   touchent le sol. Chaque lettre validée déclenche un tir.
   ============================================================ */
(() => {
'use strict';

// ===================== CANVAS & DIMENSIONS =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;        // taille plein écran (px réels)
let PX = 3;              // taille d'un "gros pixel" du décor
let bw = 0, bh = 0;      // taille du buffer basse résolution
const bg = document.createElement('canvas');
const bctx = bg.getContext('2d');

const GROUND_LR = 14;    // hauteur du sol en pixels basse-rés
let groundY = 0;         // y du sol en px réels

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  PX = Math.max(2, Math.round(Math.min(W, H) / 260));
  bw = Math.ceil(W / PX);
  bh = Math.ceil(H / PX);
  bg.width = bw;
  bg.height = bh;
  groundY = H - GROUND_LR * PX;
  ctx.imageSmoothingEnabled = false;
  bctx.imageSmoothingEnabled = false;
  buildBackground();
}
window.addEventListener('resize', resize);

// ===================== POLICE PIXEL 5x7 =====================
const FONT = {
'A':['01110','10001','10001','11111','10001','10001','10001'],
'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01110','10001','10000','10000','10000','10001','01110'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01110','10001','10000','10111','10001','10001','01111'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['01110','00100','00100','00100','00100','00100','01110'],
'J':['00111','00010','00010','00010','00010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','10101','01010'],
'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'3':['11111','00010','00100','00010','00001','10001','01110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],
'5':['11111','10000','11110','00001','00001','10001','01110'],
'6':['00110','01000','10000','11110','10001','10001','01110'],
'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],
'9':['01110','10001','10001','01111','00001','00010','01100'],
'-':['00000','00000','00000','11111','00000','00000','00000'],
'+':['00000','00100','00100','11111','00100','00100','00000'],
'.':['00000','00000','00000','00000','00000','01100','01100'],
',':['00000','00000','00000','00000','00110','00100','01000'],
'!':['00100','00100','00100','00100','00100','00000','00100'],
'?':['01110','10001','00001','00010','00100','00000','00100'],
':':['00000','01100','01100','00000','01100','01100','00000'],
"'":['00100','00100','01000','00000','00000','00000','00000'],
'>':['01000','00100','00010','00001','00010','00100','01000'],
'<':['00010','00100','01000','10000','01000','00100','00010'],
'♥':['00000','01010','11111','11111','01110','00100','00000'],
'/':['00001','00010','00010','00100','01000','01000','10000'],
' ':['00000','00000','00000','00000','00000','00000','00000'],
};

const glyphCache = new Map();
function getGlyph(ch, color, scale) {
  const key = ch + '|' + color + '|' + scale;
  let g = glyphCache.get(key);
  if (g) return g;
  const rows = FONT[ch] || FONT['?'];
  const c = document.createElement('canvas');
  c.width = 5 * scale;
  c.height = 7 * scale;
  const gc = c.getContext('2d');
  gc.fillStyle = color;
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (rows[r][col] === '1') gc.fillRect(col * scale, r * scale, scale, scale);
  glyphCache.set(key, c);
  return c;
}

function textWidth(text, scale) { return text.length * 6 * scale - scale; }

function drawPixelText(c2, text, x, y, scale, color, align) {
  text = String(text).toUpperCase();
  if (align === 'center') x -= Math.round(textWidth(text, scale) / 2);
  else if (align === 'right') x -= textWidth(text, scale);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== ' ') c2.drawImage(getGlyph(ch, color, scale), Math.round(x), Math.round(y));
    x += 6 * scale;
  }
}

function drawPixelTextOutline(c2, text, x, y, scale, color, outline, align) {
  const o = scale;
  drawPixelText(c2, text, x + o, y + o, scale, outline, align);
  drawPixelText(c2, text, x - o, y + o, scale, outline, align);
  drawPixelText(c2, text, x + o, y - o, scale, outline, align);
  drawPixelText(c2, text, x - o, y - o, scale, outline, align);
  drawPixelText(c2, text, x, y, scale, color, align);
}

// ===================== PALETTES (une par ambiance de vague) =====================
const PALETTES = [
  { // JOUR — éclatant
    skyTop:'#2fa5f2', skyBot:'#a8efff', sun:'#ffd93b', glow:'#ffef9e',
    cloud:'#ffffff', far:'#8f7ce0', snow:'#ffffff', mid:'#3fb8a5',
    hill:'#4cc157', tree:'#2c9a4b', tree2:'#1f8a68', bush:'#237a3c',
    ground:'#8a5a33', grass:'#5ad24f', starA:0, moon:false,
  },
  { // COUCHER DE SOLEIL — rose / orange
    skyTop:'#503a9e', skyBot:'#ff9e56', sun:'#ff6b6b', glow:'#ffb36b',
    cloud:'#ffd1e8', far:'#c86bb1', snow:'#ffe3f2', mid:'#8e4d9e',
    hill:'#5f3f85', tree:'#43306b', tree2:'#553a80', bush:'#382a5c',
    ground:'#4a3560', grass:'#6a4f8f', starA:0.25, moon:false,
  },
  { // NUIT — bleu profond étoilé
    skyTop:'#0a0e2a', skyBot:'#27356b', sun:'#e8ecff', glow:'#aebcf5',
    cloud:'#3d4a7a', far:'#2c3a6e', snow:'#b9c8ff', mid:'#1f2b52',
    hill:'#16203f', tree:'#0f1830', tree2:'#132240', bush:'#0b1226',
    ground:'#141b33', grass:'#1e2c50', starA:1, moon:true,
  },
  { // AUBE — pastels frais
    skyTop:'#6a5acd', skyBot:'#ffc1a1', sun:'#ffb347', glow:'#ffd9a1',
    cloud:'#ffe9f3', far:'#a08ae0', snow:'#ffffff', mid:'#5fae9e',
    hill:'#57a05f', tree:'#356e46', tree2:'#2d7d5a', bush:'#2a5738',
    ground:'#7a5236', grass:'#66c45f', starA:0.4, moon:false,
  },
];

function hexToRgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
}
function lerp(a,b,t) { return a + (b-a)*t; }
function lerpHex(a,b,t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0],B[0],t), lerp(A[1],B[1],t), lerp(A[2],B[2],t));
}

// palette courante (interpolée) et cible
let pal = Object.assign({}, PALETTES[0]);
let palTarget = PALETTES[0];
function updatePalette(dt) {
  const k = Math.min(1, dt * 1.5);
  for (const key in palTarget) {
    if (typeof palTarget[key] === 'number') pal[key] = lerp(pal[key], palTarget[key], k);
    else if (typeof palTarget[key] === 'string') pal[key] = lerpHex(pal[key], palTarget[key], k);
    else pal[key] = palTarget[key];
  }
}

// ===================== DÉCOR PARALLAX =====================
// Chaque couche = plusieurs masques blancs (forme, ombres, lumières)
// reteintés selon la palette pour un rendu pixel art riche.
const TILE = 1280; // largeur du motif répété (basse rés)
let layers = [];      // {speed, colorKey, th, parts:[...], haze?}
let groundLayer = null;
let flowersTile = null;
let stars = [], clouds = [], birds = [], fireflies = [], shootingStars = [];

function periodicNoise(x, seed, tw) {
  // bruit pseudo-aléatoire périodique sur tw
  const m = ((Math.floor(x) % tw) + tw) % tw;
  const s = Math.sin(m * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// déclinaisons d'une couleur de palette (le soleil vient de la droite)
function shadeColor(hex, mod) {
  switch (mod) {
    case 'light':  return lerpHex(hex, '#ffffff', 0.30);
    case 'light2': return lerpHex(hex, '#ffffff', 0.55);
    case 'shade':  return lerpHex(hex, '#0e1228', 0.28);
    case 'shade2': return lerpHex(hex, '#0e1228', 0.48);
    case 'fade':   return lerpHex(hex, pal.skyBot, 0.45); // brume lointaine
    default: return hex;
  }
}

function hexToRgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function newPart(tw, th, mod, colorKey) {
  const c = document.createElement('canvas');
  c.width = tw; c.height = th;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  return { mask: c, g, mod, colorKey: colorKey || null, tinted: null, last: '' };
}

// -------- montagnes avec faces éclairées, ombres en damier et neige --------
function genMountain(tw, th, opts) {
  const TAU = Math.PI * 2;
  const tri = (u) => { const f = u - Math.floor(u); return Math.abs(f - 0.5) * -4 + 1; };
  const hs = new Array(tw);
  for (let x = 0; x < tw; x++) {
    let h = opts.base;
    for (const [k, amp, ph, type] of opts.waves) {
      h += (type === 'tri' ? tri(k * x / tw + ph) : Math.sin(TAU * k * x / tw + ph)) * amp;
    }
    h += (periodicNoise(Math.floor(x / opts.jagStep), opts.seed, Math.ceil(tw / opts.jagStep)) - 0.5) * opts.jag;
    hs[x] = Math.max(2, Math.round(h / opts.quant) * opts.quant);
  }
  const base = newPart(tw, th, 'base');
  const light = newPart(tw, th, 'light');
  const shade = newPart(tw, th, 'shade');
  let snowB = null, snowS = null;
  if (opts.snow) {
    snowB = newPart(tw, th, 'base', 'snow');
    snowS = newPart(tw, th, 'shade', 'snow');
  }
  for (let x = 0; x < tw; x++) {
    const h = hs[x];
    const top = th - h;
    base.g.fillRect(x, top, 1, h);
    const dh = hs[(x + 1) % tw] - h;
    // arête : face droite éclairée, face gauche dans l'ombre
    if (dh <= -opts.quant) light.g.fillRect(x, top, 1, 2);
    else if (dh >= opts.quant) shade.g.fillRect(x, top, 1, 2);
    // corps : de plus en plus sombre vers la base, transition en damier
    const d1 = Math.round(h * 0.45), d2 = Math.round(h * 0.72);
    for (let d = d1; d < h; d++) {
      const y = top + d;
      if (d >= d2 || (x + y) % 2 === 0) shade.g.fillRect(x, y, 1, 1);
    }
    if (opts.snow && h > opts.snowLine) {
      const depth = Math.min(9, Math.round((h - opts.snowLine) * 0.65));
      snowB.g.fillRect(x, top, 1, depth);
      // bord de neige irrégulier
      if (periodicNoise(x, opts.seed + 20, tw) > 0.5) snowB.g.fillRect(x, top + depth, 1, 1);
      if (dh >= opts.quant) snowS.g.fillRect(x, top, 1, Math.max(1, Math.round(depth * 0.6)));
    }
  }
  const parts = [base, shade, light];
  if (snowB) parts.push(snowB, snowS);
  return { parts, hs, th };
}

// -------- forêt : sapins et feuillus en 3 tons, 2 teintes de feuillage --------
function genForest(tw, th, hillHs, seed) {
  const mkGroup = (key) => ({
    base: newPart(tw, th, 'base', key),
    light: newPart(tw, th, 'light', key),
    shade: newPart(tw, th, 'shade', key),
  });
  const g1 = mkGroup('tree'), g2 = mkGroup('tree2');
  const trunks = newPart(tw, th, 'shade2', 'tree');
  const step = 20;
  for (let px = 0; px < tw; px += step) {
    const jx = px + Math.floor(periodicNoise(px, seed, tw) * 15);
    if (periodicNoise(jx, seed + 5, tw) < 0.2) continue; // clairières
    const x = jx % tw;
    const G = periodicNoise(jx, seed + 3, tw) > 0.45 ? g1 : g2;
    const baseY = th - Math.round(hillHs[x]) + 2;
    const kind = periodicNoise(jx, seed + 11, tw);
    if (kind < 0.72) {
      // sapin étagé
      const treeH = 10 + Math.floor(periodicNoise(jx, seed + 9, tw) * 9);
      trunks.g.fillRect(x, baseY - 3, 2, 4);
      let w = treeH * 0.85, y = baseY - 3;
      while (w > 0.8) {
        const iw = Math.max(1, Math.round(w));
        const x0 = Math.round(x - iw / 2) + 1;
        G.base.g.fillRect(x0, y - 2, iw, 2);
        const lw = Math.max(1, Math.round(iw * 0.3));
        G.light.g.fillRect(x0 + iw - lw, y - 2, lw, 1);
        G.shade.g.fillRect(x0, y - 1, Math.max(1, Math.round(iw * 0.25)), 1);
        y -= 2;
        w -= 1.5;
      }
    } else {
      // feuillu à couronne ronde
      const r = 4 + Math.floor(periodicNoise(jx, seed + 13, tw) * 3);
      trunks.g.fillRect(x, baseY - r, 2, r + 1);
      const cy = baseY - 2 * r + 1;
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
        const y = cy + dy;
        G.base.g.fillRect(x - hw + 1, y, hw * 2, 1);
        if (dy < -r * 0.2) G.light.g.fillRect(x + Math.max(0, hw - 3) + 1, y, Math.min(3, hw), 1);
        if (dy > r * 0.35) G.shade.g.fillRect(x - hw + 1, y, hw * 2, 1);
      }
    }
  }
  return { parts: [trunks, g1.base, g1.shade, g1.light, g2.base, g2.shade, g2.light], th };
}

// -------- sol : terre stratifiée, cailloux, liseré d'herbe et brins --------
function genGround(tw) {
  const th = GROUND_LR;
  const dirt = newPart(tw, th, 'base', 'ground');
  const dirtSh = newPart(tw, th, 'shade', 'ground');
  const dirtSh2 = newPart(tw, th, 'shade2', 'ground');
  const pebbles = newPart(tw, th, 'light', 'ground');
  const grass = newPart(tw, th, 'base', 'grass');
  const grassL = newPart(tw, th, 'light', 'grass');
  const grassS = newPart(tw, th, 'shade', 'grass');
  dirt.g.fillRect(0, 0, tw, th);
  for (let x = 0; x < tw; x++) {
    // strates de terre de plus en plus sombres, damier aux transitions
    for (let y = 6; y < th; y++) {
      if (y >= 11) dirtSh2.g.fillRect(x, y, 1, 1);
      else if (y >= 9 || (x + y) % 2 === 0) dirtSh.g.fillRect(x, y, 1, 1);
    }
    // cailloux clairs épars
    const n = periodicNoise(x, 55, tw);
    if (n > 0.94) pebbles.g.fillRect(x, 6 + (Math.floor(n * 53) % 6), 2, 1);
    // bande d'herbe
    grass.g.fillRect(x, 2, 1, 3);
    grassL.g.fillRect(x, 2, 1, 1);
    if ((x % 3) === 0) grassS.g.fillRect(x, 4, 1, 1);
    // brins d'herbe qui dépassent
    if (periodicNoise(x, 42, tw) > 0.5) {
      const b = 1 + Math.floor(periodicNoise(x, 7, tw) * 3);
      grass.g.fillRect(x, 2 - b, 1, b);
      if (periodicNoise(x, 77, tw) > 0.6) grassL.g.fillRect(x, 2 - b, 1, 1);
    }
  }
  return { parts: [dirt, dirtSh, dirtSh2, pebbles, grass, grassS, grassL], th };
}

// -------- fleurs colorées à tige (couleurs fixes, volontairement vives) --------
function makeFlowersTile(tw) {
  const c = document.createElement('canvas');
  c.width = tw; c.height = GROUND_LR;
  const g = c.getContext('2d');
  const colors = ['#ff5d8f', '#ffd93b', '#ff8c42', '#7ad9ff', '#d38bff', '#ff6b6b'];
  for (let x = 0; x < tw; x += 5) {
    const n = periodicNoise(x, 91, tw);
    if (n > 0.68) {
      const col = colors[Math.floor(n * 37) % colors.length];
      g.fillStyle = '#2f7d3a';
      g.fillRect(x + 1, 1, 1, 3);
      g.fillStyle = col;
      g.fillRect(x, 0, 2, 2);
      if (periodicNoise(x, 33, tw) > 0.5) { g.fillStyle = '#fff7cf'; g.fillRect(x, 0, 1, 1); }
    }
  }
  return c;
}

// -------- nuages en 2 tons (corps + ventre ombré) --------
function makeCloudSprite(seed) {
  const w = 30 + Math.floor(seed * 34), h = 13;
  const body = document.createElement('canvas');
  body.width = w; body.height = h;
  const g = body.getContext('2d');
  g.fillStyle = '#fff';
  const bottomAt = new Array(w).fill(-1);
  const blobs = 3 + Math.floor(seed * 4);
  for (let i = 0; i < blobs; i++) {
    const bx = 5 + (w - 14) * ((i + 0.3) / blobs);
    const bwd = 9 + Math.floor(periodicNoise(i * 13, seed * 100, 999) * 11);
    const bht = 3 + Math.floor(periodicNoise(i * 7, seed * 50, 999) * 5);
    for (let r = 0; r < bht; r++) {
      const rw = bwd - r * 2;
      if (rw <= 0) continue;
      const x0 = Math.round(bx - rw / 2), y = h - 2 - r;
      g.fillRect(x0, y, rw, 1);
      for (let xx = Math.max(0, x0); xx < Math.min(w, x0 + rw); xx++) bottomAt[xx] = Math.max(bottomAt[xx], y);
    }
  }
  const shadow = document.createElement('canvas');
  shadow.width = w; shadow.height = h;
  const sg = shadow.getContext('2d');
  sg.fillStyle = '#fff';
  for (let xx = 0; xx < w; xx++) if (bottomAt[xx] >= 0) sg.fillRect(xx, bottomAt[xx], 1, 1);
  return { body, shadow };
}

function buildBackground() {
  layers = [];
  const scaleH = Math.max(0.6, Math.min(1.4, bh / 260));
  const s = (v) => Math.round(v * scaleH);

  // chaîne très lointaine, fondue dans la brume
  const farfar = genMountain(TILE, s(126), {
    base: s(66),
    waves: [[9, s(24), 0.8, 'tri'], [19, s(9), 2.6, 'tri'], [37, s(4), 1.1]],
    jag: s(4), jagStep: 6, quant: 3, seed: 7,
  });
  farfar.parts = [Object.assign(farfar.parts[0], { mod: 'fade' })];

  const far = genMountain(TILE, s(112), {
    base: s(46),
    waves: [[13, s(26), 0.15, 'tri'], [29, s(10), 0.42, 'tri'], [43, s(4), 2.1]],
    jag: s(5), jagStep: 5, quant: 3, seed: 1, snow: true, snowLine: s(62),
  });
  const mid = genMountain(TILE, s(78), {
    base: s(28),
    waves: [[17, s(15), 0.62, 'tri'], [31, s(7), 0.21, 'tri'], [53, s(3), 3.3]],
    jag: s(4), jagStep: 4, quant: 2, seed: 2,
  });
  const hills = genMountain(TILE, s(46), {
    base: s(16),
    waves: [[9, s(5), 1.2, 'tri'], [21, s(3), 4.0]],
    jag: 2, jagStep: 6, quant: 1, seed: 3,
  });
  const forest = genForest(TILE, s(64), hills.hs, 8);
  const bush = genMountain(TILE, s(14), {
    base: s(6), waves: [[26, s(3), 0.7], [49, s(2), 2.9]], jag: 2, jagStep: 3, quant: 1, seed: 4,
  });

  const mk = (gen, speed, colorKey, extra) => Object.assign(
    { speed, colorKey, th: gen.th, parts: gen.parts }, extra || {});

  layers.push(mk(farfar, 1.5, 'far'));
  layers.push(mk(far, 3, 'far', { haze: 0.30 }));
  layers.push(mk(mid, 7, 'mid', { haze: 0.16 }));
  layers.push(mk(hills, 14, 'hill'));
  layers.push(mk(forest, 14, 'tree'));
  layers.push(mk(bush, 26, 'bush'));

  groundLayer = mk(genGround(TILE), 34, 'ground');
  flowersTile = makeFlowersTile(TILE);

  stars = [];
  const starCols = ['#ffffff', '#cdd8ff', '#ffe9c9', '#ffd6e8'];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * bw,
      y: Math.random() * bh * 0.6,
      tw: 1 + Math.random() * 3,
      ph: Math.random() * 10,
      big: Math.random() < 0.12,
      col: starCols[Math.floor(Math.random() * starCols.length)],
    });
  }
  clouds = [];
  for (let i = 0; i < 6; i++) {
    const spr = makeCloudSprite(Math.random());
    clouds.push({
      body: spr.body, shadow: spr.shadow,
      tintedB: null, lastB: '', tintedS: null, lastS: '',
      x: Math.random() * bw,
      y: 6 + Math.random() * bh * 0.32,
      speed: 2 + Math.random() * 4,
    });
  }
  birds = [];
  for (let i = 0; i < 4; i++) {
    birds.push({
      x: Math.random() * bw,
      y: bh * (0.12 + Math.random() * 0.25),
      sp: 8 + Math.random() * 7,
      ph: Math.random() * 6.28,
    });
  }
  fireflies = [];
  for (let i = 0; i < 10; i++) {
    fireflies.push({
      x: Math.random() * bw,
      y: bh - GROUND_LR - 6 - Math.random() * 26,
      ph: Math.random() * 6.28,
      sp: 0.5 + Math.random(),
    });
  }
  shootingStars = [];
}

function tintPart(part, defaultKey) {
  const color = shadeColor(pal[part.colorKey || defaultKey], part.mod);
  if (part.last === color && part.tinted) return part.tinted;
  if (!part.tinted) {
    part.tinted = document.createElement('canvas');
    part.tinted.width = part.mask.width;
    part.tinted.height = part.mask.height;
  }
  const g = part.tinted.getContext('2d');
  g.globalCompositeOperation = 'copy';
  g.drawImage(part.mask, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, part.tinted.width, part.tinted.height);
  part.last = color;
  return part.tinted;
}

function tintSprite(obj, img, color, tintedKey, lastKey) {
  if (obj[lastKey] === color && obj[tintedKey]) return obj[tintedKey];
  if (!obj[tintedKey]) {
    obj[tintedKey] = document.createElement('canvas');
    obj[tintedKey].width = img.width;
    obj[tintedKey].height = img.height;
  }
  const g = obj[tintedKey].getContext('2d');
  g.globalCompositeOperation = 'copy';
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, img.width, img.height);
  obj[lastKey] = color;
  return obj[tintedKey];
}

function drawTiled(img, offset, y) {
  const o = ((offset % TILE) + TILE) % TILE;
  bctx.drawImage(img, Math.round(-o), y);
  bctx.drawImage(img, Math.round(TILE - o), y);
  if (TILE * 2 - o < bw) bctx.drawImage(img, Math.round(TILE * 2 - o), y);
}

let scrollT = 0;

function drawBackground(dt) {
  scrollT += dt;
  const horizon = bh - GROUND_LR;

  // ciel
  const grad = bctx.createLinearGradient(0, 0, 0, bh);
  grad.addColorStop(0, pal.skyTop);
  grad.addColorStop(0.75, pal.skyBot);
  grad.addColorStop(1, lerpHex(pal.skyBot, pal.glow, 0.25));
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, bw, bh);

  // étoiles multicolores scintillantes + étoiles filantes
  if (pal.starA > 0.02) {
    for (const st of stars) {
      const a = pal.starA * (0.35 + 0.65 * Math.abs(Math.sin(scrollT * st.tw + st.ph)));
      bctx.globalAlpha = a;
      bctx.fillStyle = st.col;
      bctx.fillRect(Math.round(st.x), Math.round(st.y), st.big ? 2 : 1, st.big ? 2 : 1);
    }
    bctx.globalAlpha = 1;
    if (pal.starA > 0.5 && Math.random() < dt * 0.12) {
      shootingStars.push({
        x: Math.random() * bw, y: Math.random() * bh * 0.3,
        vx: -(60 + Math.random() * 50), vy: 22 + Math.random() * 16,
        life: 0.9,
      });
    }
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.life -= dt;
    if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }
    ss.x += ss.vx * dt; ss.y += ss.vy * dt;
    const a = Math.min(1, ss.life * 2) * pal.starA;
    for (let k = 0; k < 7; k++) {
      bctx.globalAlpha = a * (1 - k / 7);
      bctx.fillStyle = '#ffffff';
      bctx.fillRect(Math.round(ss.x - ss.vx * k * 0.012), Math.round(ss.y - ss.vy * k * 0.012), 1, 1);
    }
    bctx.globalAlpha = 1;
  }

  // soleil / lune avec halo doux
  const sx = Math.round(bw * 0.76), sy = Math.round(bh * 0.16), r = Math.round(Math.min(bw, bh) * 0.045) + 5;
  bctx.fillStyle = pal.glow;
  for (const [rr, a] of [[r + 9, 0.10], [r + 5, 0.16], [r + 2, 0.28]]) {
    bctx.globalAlpha = a;
    fillPixelCircle(bctx, sx, sy, rr);
  }
  bctx.globalAlpha = 1;
  bctx.fillStyle = pal.sun;
  fillPixelCircle(bctx, sx, sy, r);
  if (pal.moon) {
    // croissant + cratères
    bctx.fillStyle = pal.skyTop;
    fillPixelCircle(bctx, sx + Math.round(r * 0.5), sy - Math.round(r * 0.28), Math.round(r * 0.82));
    bctx.fillStyle = lerpHex(pal.sun, '#8a93c4', 0.5);
    fillPixelCircle(bctx, sx - Math.round(r * 0.4), sy + Math.round(r * 0.15), Math.max(1, Math.round(r * 0.14)));
    fillPixelCircle(bctx, sx - Math.round(r * 0.1), sy + Math.round(r * 0.5), Math.max(1, Math.round(r * 0.1)));
    fillPixelCircle(bctx, sx - Math.round(r * 0.55), sy - Math.round(r * 0.25), Math.max(1, Math.round(r * 0.09)));
  } else {
    // cœur plus lumineux côté haut-gauche
    bctx.fillStyle = lerpHex(pal.sun, '#ffffff', 0.4);
    fillPixelCircle(bctx, sx - Math.round(r * 0.28), sy - Math.round(r * 0.28), Math.round(r * 0.4));
  }

  // nuages 2 tons (dérive vers la gauche, avec le décor)
  for (const cl of clouds) {
    cl.x -= cl.speed * dt;
    if (cl.x < -cl.body.width - 30) { cl.x = bw + 20; cl.y = 6 + Math.random() * bh * 0.32; }
    const body = tintSprite(cl, cl.body, lerpHex(pal.cloud, '#ffffff', 0.15), 'tintedB', 'lastB');
    const shadow = tintSprite(cl, cl.shadow, shadeColor(pal.cloud, 'shade'), 'tintedS', 'lastS');
    bctx.globalAlpha = 0.92;
    bctx.drawImage(body, Math.round(cl.x), Math.round(cl.y));
    bctx.drawImage(shadow, Math.round(cl.x), Math.round(cl.y));
    bctx.globalAlpha = 1;
  }

  // oiseaux en plein jour (vol battant, vers la droite comme la lecture)
  if (pal.starA < 0.25) {
    bctx.globalAlpha = 0.8 - pal.starA * 2;
    bctx.fillStyle = shadeColor(pal.far, 'shade2');
    for (const b of birds) {
      b.x += b.sp * dt;
      if (b.x > bw + 12) { b.x = -12; b.y = bh * (0.1 + Math.random() * 0.28); }
      const flap = Math.sin(scrollT * 9 + b.ph) > 0 ? -1 : 0;
      const x = Math.round(b.x), y = Math.round(b.y);
      bctx.fillRect(x - 2, y + flap, 2, 1);
      bctx.fillRect(x + 1, y + flap, 2, 1);
      bctx.fillRect(x, y, 1, 1);
    }
    bctx.globalAlpha = 1;
  }

  // couches de relief (défilement vers la gauche : on voyage vers la droite)
  for (const layer of layers) {
    const y = horizon - layer.th + 2;
    for (const part of layer.parts) {
      drawTiled(tintPart(part, layer.colorKey), scrollT * layer.speed, y);
    }
    if (layer.haze) {
      // brume atmosphérique au pied de la chaîne
      const hh = Math.round(layer.th * 0.5);
      const hz = bctx.createLinearGradient(0, horizon - hh, 0, horizon + 2);
      hz.addColorStop(0, hexToRgba(pal.skyBot, 0));
      hz.addColorStop(1, hexToRgba(pal.skyBot, layer.haze));
      bctx.fillStyle = hz;
      bctx.fillRect(0, horizon - hh, bw, hh + 2);
    }
  }

  // sol détaillé + fleurs
  for (const part of groundLayer.parts) {
    drawTiled(tintPart(part, groundLayer.colorKey), scrollT * groundLayer.speed, horizon);
  }
  drawTiled(flowersTile, scrollT * groundLayer.speed, horizon);

  // lucioles la nuit
  if (pal.starA > 0.5) {
    for (const f of fireflies) {
      const a = pal.starA * (0.3 + 0.7 * Math.max(0, Math.sin(scrollT * f.sp * 2 + f.ph)));
      const fx = f.x + Math.sin(scrollT * f.sp + f.ph) * 6;
      const fy = f.y + Math.cos(scrollT * f.sp * 0.7 + f.ph) * 3;
      bctx.globalAlpha = a;
      bctx.fillStyle = '#d9ff7a';
      bctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
    }
    bctx.globalAlpha = 1;
  }

  ctx.drawImage(bg, 0, 0, bw * PX, bh * PX);
}

function fillPixelCircle(g, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

// ===================== AUDIO (synthé rétro) =====================
const AudioSys = {
  ctx: null, muted: false,
  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol, slide) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.1;
    src.connect(g).connect(this.ctx.destination);
    src.start(t);
  },
  shoot() { this.tone(880, 0.09, 'square', 0.05, -500); },
  hit() { this.noise(0.08, 0.07); },
  error() { this.tone(140, 0.25, 'sawtooth', 0.09, -60); },
  word(mult) {
    const base = 500 + Math.min(mult, 8) * 60;
    this.tone(base, 0.1, 'square', 0.06);
    setTimeout(() => this.tone(base * 1.33, 0.1, 'square', 0.06), 70);
    setTimeout(() => this.tone(base * 2, 0.16, 'square', 0.06), 140);
  },
  wave() {
    [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.07), i * 110));
  },
  boom() { this.noise(0.4, 0.16); this.tone(70, 0.4, 'sawtooth', 0.12, -40); },
  over() {
    [523, 440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.09), i * 220));
  },
};

// ===================== MOTS (nature, sans accents) =====================
const WORDS = {
  short: ['mer','roc','feu','eau','pic','lac','val','cap','ile','arc','air','nid','bec','pin','pre','col','vol','gel','ciel','vent','bois','loup','cerf','aube','lune','pont','houx','sable','ruche','pluie','fleur','herbe','sapin','nuage','orage','neige','brume','givre','galet','foret','orme','etang','dune','mare','baie','anse','cime','gorge','crete','butte','ravin','delta','oasis','jonc','iris','rose','chene','hetre','saule','frene','cedre','aulne','ours','lynx','aigle','biche','merle','geai','faon','hibou','bison','recif','genet','lande','marne','crabe','loriot'],
  medium: ['riviere','prairie','vallee','sommet','rocher','source','aurore','mousse','etoile','soleil','chemin','sentier','falaise','colline','torrent','cascade','glacier','ruisseau','feuille','branche','racine','ecorce','buisson','tempete','eclair','horizon','erable','luciole','orchidee','roseau','jungle','corail','tilleul','bouleau','renard','lievre','fougere','bruyere','lavande','jasmin','muguet','sorbier','cypres','sequoia','platane','crevasse','plateau','canyon','volcan','geyser','lagune','savane','faucon','loutre','castor','mouflon','chamois','belette','toundra','moraine','baobab','anemone','tulipe','gentiane','aubepine','digitale','archipel'],
  long: ['montagne','papillon','libellule','hirondelle','crepuscule','escalade','panorama','avalanche','brouillard','chevreuil','ecureuil','marmotte','myrtille','framboise','campagne','clairiere','alpiniste','belvedere','stalactite','coquelicot','chataignier','sauterelle','coccinelle','peninsule','bouquetin','salamandre','grenouille','scarabee','araignee','chrysalide','eglantine','paquerette','pissenlit','tournesol','genevrier','clematite','primevere','cordillere','permafrost','eucalyptus','edelweiss','peuplier','noisette','chouette','herisson','estuaire','sanglier','blaireau'],
  verylong: ['constellation','biodiversite','photosynthese','meteorologie','hibernation','germination','pollinisation','sedimentation','cristallisation','precipitations','transhumance','chlorophylle','rhododendron','cornouiller','stratosphere','metamorphose'],
};

function pickWord(wave, existing) {
  let pool;
  const r = Math.random();
  if (wave <= 2) pool = r < 0.75 ? WORDS.short : WORDS.medium;
  else if (wave <= 4) pool = r < 0.4 ? WORDS.short : (r < 0.85 ? WORDS.medium : WORDS.long);
  else if (wave <= 7) pool = r < 0.2 ? WORDS.short : (r < 0.6 ? WORDS.medium : WORDS.long);
  else pool = r < 0.15 ? WORDS.short : (r < 0.5 ? WORDS.medium : (r < 0.85 ? WORDS.long : WORDS.verylong));
  // éviter deux mots actifs commençant par la même lettre (ambiguïté de ciblage)
  const used = new Set(existing.map(w => w.text[0]));
  for (let tries = 0; tries < 24; tries++) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(w[0]) || tries > 15) return w;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===================== ÉTAT DU JEU =====================
const ST_TITLE = 0, ST_PLAY = 1, ST_BREAK = 2, ST_OVER = 3, ST_PAUSE = 4, ST_SHOP = 5;
let state = ST_TITLE;

const WAVES_PER_MANCHE = 4; // une manche = 4 vagues (un cycle jour/nuit complet)
const MAX_LIVES = 5;

function loadJSON(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

let score = 0, best = 0;
try { best = parseInt(localStorage.getItem('typerider.best') || '0', 10) || 0; } catch (e) {}

// progression persistante (crédits, achats, équipement)
let credits = loadJSON('typerider.credits', 0);
let owned = loadJSON('typerider.owned', ['skin_bleu']);
let equipped = loadJSON('typerider.equip', { skin: 'skin_bleu', acc: null });
function saveMeta() {
  saveJSON('typerider.credits', credits);
  saveJSON('typerider.owned', owned);
  saveJSON('typerider.equip', equipped);
}
const hasFx = (id) => owned.includes(id);

// ===================== BOUTIQUE =====================
const SHOP_ITEMS = [
  { id: 'skin_bleu', cat: 'SKINS DE TOURELLE', name: 'BLEU CLASSIQUE', price: 0, type: 'skin' },
  { id: 'skin_or', cat: 'SKINS DE TOURELLE', name: 'OR ROYAL', price: 300, type: 'skin' },
  { id: 'skin_rose', cat: 'SKINS DE TOURELLE', name: 'NEON ROSE', price: 250, type: 'skin' },
  { id: 'skin_camo', cat: 'SKINS DE TOURELLE', name: 'VERT CAMO', price: 200, type: 'skin' },
  { id: 'skin_lave', cat: 'SKINS DE TOURELLE', name: 'ROUGE LAVE', price: 250, type: 'skin' },
  { id: 'fx_arc', cat: 'EFFETS VISUELS', name: 'BALLES ARC-EN-CIEL', price: 400, type: 'fx' },
  { id: 'fx_etoiles', cat: 'EFFETS VISUELS', name: 'EXPLOSIONS ETOILEES', price: 350, type: 'fx' },
  { id: 'fx_comete', cat: 'EFFETS VISUELS', name: 'TRAINEE DE COMETE', price: 300, type: 'fx' },
  { id: 'acc_drapeau', cat: 'ACCESSOIRES', name: 'DRAPEAU', price: 150, type: 'acc' },
  { id: 'acc_radar', cat: 'ACCESSOIRES', name: 'ANTENNE RADAR', price: 200, type: 'acc' },
  { id: 'acc_chapeau', cat: 'ACCESSOIRES', name: 'CHAPEAU HAUT-DE-FORME', price: 250, type: 'acc' },
];

const TURRET_SKINS = {
  skin_bleu: { dome: '#39415f', domeTop: '#4a5680', barrel: '#3d4a7a', accent: '#ffb347', glow: '#7ad9ff' },
  skin_or:   { dome: '#6b5518', domeTop: '#8a6f2a', barrel: '#7a6420', accent: '#ffd93b', glow: '#fff3b0' },
  skin_rose: { dome: '#4a2440', domeTop: '#63305a', barrel: '#6b2f57', accent: '#ff5d8f', glow: '#ff9ec4' },
  skin_camo: { dome: '#2f4a2c', domeTop: '#3f5f3a', barrel: '#3d5c38', accent: '#a3c94a', glow: '#d3ef9a' },
  skin_lave: { dome: '#4a2020', domeTop: '#632a24', barrel: '#6b2a24', accent: '#ff6b3d', glow: '#ffc06b' },
};

let shopIndex = 0;
let shopReturn = 'title'; // 'title' ou 'game'
let lastGain = 0, lastNiveau = 0;

function shopAction() {
  const it = SHOP_ITEMS[shopIndex];
  const isOwned = owned.includes(it.id);
  if (!isOwned) {
    if (credits >= it.price) {
      credits -= it.price;
      owned.push(it.id);
      if (it.type === 'skin') equipped.skin = it.id;
      if (it.type === 'acc') equipped.acc = it.id;
      saveMeta();
      AudioSys.word(4);
    } else {
      AudioSys.error();
    }
  } else if (it.type === 'skin') {
    equipped.skin = it.id;
    saveMeta();
    AudioSys.tone(700, 0.08, 'square', 0.05);
  } else if (it.type === 'acc') {
    equipped.acc = equipped.acc === it.id ? null : it.id;
    saveMeta();
    AudioSys.tone(700, 0.08, 'square', 0.05);
  }
}

function closeShop() {
  if (shopReturn === 'game') nextWave();
  else state = ST_TITLE;
}

let combo = 0, lives = 3, waveNum = 0;
let words = [], bullets = [], particles = [], popups = [];
let activeWord = null;
let toSpawn = 0, spawnTimer = 0, breakTimer = 0;
let shakeT = 0, shakeAmp = 0;
let errorFlash = 0;
let gameT = 0;
let stats = { typed: 0, errors: 0, wordsDone: 0, bestCombo: 0 };

// power-ups et statistiques de frappe
let inventory = { rewind: 1, boomerang: 1 };
let queuedWord = null;          // prochain mot (décidé à l'avance pour le boomerang)
let previewWord = '', previewTimer = 0;
let rewindFlash = 0;
let playT = 0;                  // temps de jeu effectif (hors pause/menus)
let keyLog = [];                // horodatage des lettres justes (fenêtre MPM)
let peakMpm = 0;

function currentMPM() {
  if (playT < 2) return 0;
  const win = Math.min(10, playT);
  let n = 0;
  for (let i = keyLog.length - 1; i >= 0 && keyLog[i] > playT - win; i--) n++;
  return Math.round((n / 5) * (60 / win));
}

function niveauCourant() { return Math.floor(Math.max(0, waveNum - 1) / WAVES_PER_MANCHE) + 1; }

const turret = { x: 0, y: 0, angle: -Math.PI / 2, targetAngle: -Math.PI / 2, recoil: 0 };

function multiplier() {
  if (combo >= 40) return 8;
  if (combo >= 25) return 6;
  if (combo >= 15) return 5;
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

const WORD_SCALE = 3;
function charW() { return 6 * WORD_SCALE * Math.max(1, Math.round(PX / 3)); }
function wordScale() { return WORD_SCALE * Math.max(1, Math.round(PX / 3)); }

function waveWordCount(w) { return 5 + w * 2; }
function waveFallTime(w) { return Math.max(6, 19 - w * 1.5); }
function waveSpawnGap(w) { return Math.max(1.0, 3.4 - w * 0.22); }

function startGame() {
  score = 0; combo = 0; lives = 3; waveNum = 0;
  words = []; bullets = []; particles = []; popups = [];
  activeWord = null; gameT = 0;
  stats = { typed: 0, errors: 0, wordsDone: 0, bestCombo: 0 };
  inventory = { rewind: 1, boomerang: 1 }; // on démarre avec 1 de chaque
  queuedWord = null; previewWord = ''; previewTimer = 0; rewindFlash = 0;
  playT = 0; keyLog = []; peakMpm = 0;
  nextWave();
}

function nextWave() {
  waveNum++;
  palTarget = PALETTES[(waveNum - 1) % PALETTES.length];
  toSpawn = waveWordCount(waveNum);
  spawnTimer = 1.2;
  state = ST_BREAK;
  breakTimer = 2.4;
  AudioSys.wave();
}

function nextQueuedWord() {
  if (!queuedWord) queuedWord = pickWord(waveNum, words).toUpperCase();
  return queuedWord;
}

function spawnWord() {
  const text = nextQueuedWord();
  queuedWord = null;
  previewTimer = 0; // le mot annoncé vient d'apparaître
  const sc = wordScale();
  const wpx = text.length * 6 * sc;
  const margin = 24;
  let x = margin + Math.random() * Math.max(10, W - wpx - margin * 2);
  // éloigner des mots récents en haut d'écran
  for (let tries = 0; tries < 10; tries++) {
    const clash = words.some(w => w.y < 90 && Math.abs(w.x + w.wpx / 2 - (x + wpx / 2)) < (w.wpx + wpx) / 2 + 30);
    if (!clash) break;
    x = margin + Math.random() * Math.max(10, W - wpx - margin * 2);
  }
  const fallTime = waveFallTime(waveNum) * (0.88 + Math.random() * 0.28);
  words.push({
    text, x, y: -40, wpx,
    speed: (groundY + 40) / fallTime,
    progress: 0,
    letters: text.split('').map(ch => ({ ch, gone: false })),
    swayPh: Math.random() * 6.28,
    swayAmp: 3 + Math.random() * 5,
    dying: false, resetCount: 0, flash: 0,
  });
}

// position (centre) d'une lettre d'un mot, en px écran
function letterPos(word, i) {
  const sc = wordScale();
  const sway = Math.sin(gameT * 0.9 + word.swayPh) * word.swayAmp;
  return {
    x: word.x + sway + i * 6 * sc + 2.5 * sc,
    y: word.y + 3.5 * sc,
  };
}

// ===================== TIRS & PARTICULES =====================
function fireAt(word, index) {
  const p = letterPos(word, index);
  const mx = turret.x, my = turret.y - 14 * Math.max(1, PX / 3);
  const dx = p.x - mx, dy = p.y - my;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = Math.max(1400, dist * 4);
  bullets.push({
    x: mx, y: my,
    vx: dx / dist * speed, vy: dy / dist * speed,
    word, index, resetCount: word.resetCount,
    life: dist / speed + 0.05,
  });
  turret.targetAngle = Math.atan2(dy, dx);
  turret.recoil = 1;
  spawnParticles(mx, my, 3, '#ffe97a', 120, 0.15);
  AudioSys.shoot();
}

function spawnParticles(x, y, n, color, speed, life, gravity) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.9);
    particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - (gravity ? 40 : 0),
      life: life * (0.6 + Math.random() * 0.8), maxLife: life,
      color, size: Math.random() < 0.4 ? 2 : 1,
      grav: gravity ? 600 : 60,
    });
  }
}

function spawnStars(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 120 * (0.4 + Math.random());
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
      life: 0.7, maxLife: 0.7, color: '#fff3b0', size: 2, grav: 300, star: true,
    });
  }
}

function addPopup(x, y, text, color, scale) {
  popups.push({ x, y, text, color, scale: scale || 3, life: 1.2, maxLife: 1.2 });
}

function shake(amp) { shakeT = 0.35; shakeAmp = Math.max(shakeAmp, amp); }

// ===================== POWER-UPS =====================
// Machine à remonter le temps (touche 1) : les mots NON validés remontent de 3 s
function useRewind() {
  if (inventory.rewind <= 0) {
    AudioSys.tone(180, 0.1, 'square', 0.05);
    addPopup(W / 2, H * 0.3, 'PAS DE REMONTE-TEMPS', '#9fb3e8', 2);
    return;
  }
  inventory.rewind--;
  for (const w of words) {
    if (w.dying) continue; // les mots validés ne reviennent pas
    w.y = Math.max(-40, w.y - w.speed * 3);
    const p = letterPos(w, Math.floor(w.text.length / 2));
    spawnParticles(p.x, p.y, 10, '#7ad9ff', 160, 0.5);
  }
  rewindFlash = 0.6;
  addPopup(W / 2, H * 0.35, 'RETOUR 3 SECONDES !', '#7ad9ff', 3);
  AudioSys.tone(180, 0.45, 'sine', 0.09, 620); // sweep inversé
}

// Boomerang du futur (touche 2) : révèle le prochain mot de la vague
function useBoomerang() {
  if (inventory.boomerang <= 0) {
    AudioSys.tone(180, 0.1, 'square', 0.05);
    addPopup(W / 2, H * 0.3, 'PAS DE BOOMERANG', '#9fb3e8', 2);
    return;
  }
  if (toSpawn <= 0) {
    // fin de vague / de manche : inutilisable, non consommé
    addPopup(W / 2, H * 0.3, 'FIN DE VAGUE : AUCUN MOT A VENIR', '#ffb0b0', 2);
    AudioSys.error();
    return;
  }
  inventory.boomerang--;
  previewWord = nextQueuedWord();
  previewTimer = 6;
  AudioSys.tone(620, 0.28, 'triangle', 0.07, -380);
}

// butin possible à chaque mot terminé
function maybeDrop(word) {
  const r = Math.random();
  const p = letterPos(word, Math.floor(word.text.length / 2));
  if (r < 0.05 && lives < MAX_LIVES) {
    lives++;
    addPopup(p.x, word.y - 40, 'BONUS : +1 VIE !', '#ff5d8f', 2);
    AudioSys.word(8);
  } else if (r < 0.13) {
    inventory.rewind++;
    addPopup(p.x, word.y - 40, 'BONUS : REMONTE-TEMPS', '#7ad9ff', 2);
    AudioSys.word(6);
  } else if (r < 0.21) {
    inventory.boomerang++;
    addPopup(p.x, word.y - 40, 'BONUS : BOOMERANG', '#7affc0', 2);
    AudioSys.word(6);
  }
}

// ===================== SAISIE =====================
window.addEventListener('keydown', (e) => {
  AudioSys.init();

  // F2 coupe le son : jamais en conflit avec les lettres du jeu
  if (e.key === 'F2') { AudioSys.muted = !AudioSys.muted; return; }

  if (state === ST_SHOP) {
    if (e.key === 'ArrowUp') { shopIndex = (shopIndex + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length; AudioSys.tone(500, 0.04, 'square', 0.03); }
    else if (e.key === 'ArrowDown') { shopIndex = (shopIndex + 1) % SHOP_ITEMS.length; AudioSys.tone(500, 0.04, 'square', 0.03); }
    else if (e.key === 'Enter') shopAction();
    else if (e.key === 'Escape') closeShop();
    e.preventDefault();
    return;
  }

  if (state === ST_TITLE || state === ST_OVER) {
    if (e.key === 'Enter') { startGame(); }
    else if (e.key === 'b' || e.key === 'B') { shopReturn = 'title'; shopIndex = 0; lastGain = 0; state = ST_SHOP; }
    return;
  }
  if (state === ST_PAUSE) {
    if (e.key === 'Escape' || e.key === 'Enter') state = ST_PLAY;
    return;
  }
  if (state === ST_BREAK) return;

  // seule Échap met en pause : toutes les lettres (P et M compris) servent à jouer
  if (e.key === 'Escape') { state = ST_PAUSE; return; }

  // power-ups : 1/& = remonte-temps, 2/é = boomerang (clavier AZERTY inclus)
  if (e.key === '1' || e.key === '&') { useRewind(); return; }
  if (e.key === '2' || e.key === 'é' || e.key === 'É') { useBoomerang(); return; }

  if (e.key.length !== 1) return;
  let ch = e.key.toUpperCase();
  if (!/[A-Z\-']/.test(ch)) return;
  e.preventDefault();
  typeChar(ch);
});

function typeChar(ch) {
  if (activeWord && (activeWord.dying || words.indexOf(activeWord) === -1)) activeWord = null;

  if (!activeWord) {
    // cibler le mot le plus proche du sol commençant par cette lettre
    let cand = null;
    for (const w of words) {
      if (w.dying || w.progress > 0) continue;
      if (w.text[0] === ch && (!cand || w.y > cand.y)) cand = w;
    }
    if (!cand) {
      AudioSys.tone(200, 0.06, 'square', 0.03);
      return;
    }
    activeWord = cand;
  }

  const w = activeWord;
  const expected = w.text[w.progress];
  stats.typed++;

  if (ch === expected) {
    w.letters[w.progress].gone = false; // le tir la fera disparaître
    fireAt(w, w.progress);
    w.progress++;
    score += 10 * multiplier();
    // statistiques de frappe
    keyLog.push(playT);
    while (keyLog.length && keyLog[0] < playT - 12) keyLog.shift();
    peakMpm = Math.max(peakMpm, currentMPM());
    if (w.progress >= w.text.length) {
      // mot terminé !
      w.dying = true;
      activeWord = null;
      combo++;
      stats.wordsDone++;
      stats.bestCombo = Math.max(stats.bestCombo, combo);
      const mult = multiplier();
      const bonus = 25 * w.text.length * mult;
      score += bonus;
      const p = letterPos(w, Math.floor(w.text.length / 2));
      addPopup(p.x, w.y - 14, '+' + bonus, '#ffe97a', 3);
      if (mult > 1) addPopup(p.x, w.y - 14 - 26, 'X' + mult, '#7affc0', 2);
      AudioSys.word(mult);
      maybeDrop(w);
    }
  } else {
    // erreur : on recommence le mot depuis le début
    stats.errors++;
    w.progress = 0;
    w.resetCount++;
    for (const l of w.letters) l.gone = false;
    w.flash = 0.5;
    combo = 0;
    errorFlash = 0.25;
    activeWord = null; // il faudra re-cibler avec la 1re lettre
    AudioSys.error();
  }
}

window.addEventListener('blur', () => { if (state === ST_PLAY) state = ST_PAUSE; });

// ===================== MISE À JOUR =====================
function update(dt) {
  updatePalette(dt);
  gameT += dt;

  if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeAmp = 0; }
  if (errorFlash > 0) errorFlash -= dt;
  if (rewindFlash > 0) rewindFlash -= dt;
  if (previewTimer > 0) previewTimer -= dt;
  if (state === ST_PLAY) playT += dt;

  // tourelle
  let da = turret.targetAngle - turret.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  turret.angle += da * Math.min(1, dt * 18);
  turret.recoil = Math.max(0, turret.recoil - dt * 6);
  turret.x = W / 2;
  turret.y = groundY + 4;

  // particules
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  // popups
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.life -= dt;
    p.y -= 30 * dt;
    if (p.life <= 0) popups.splice(i, 1);
  }
  // balles
  const comet = hasFx('fx_comete');
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (comet && Math.random() < 0.6) {
      particles.push({
        x: b.x, y: b.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.3, maxLife: 0.3, color: '#ffd93b', size: 1, grav: 0,
      });
    }
    if (b.life <= 0) {
      bullets.splice(i, 1);
      const w = b.word;
      if (words.indexOf(w) !== -1 && b.resetCount === w.resetCount) {
        w.letters[b.index].gone = true;
        const p = letterPos(w, b.index);
        spawnParticles(p.x, p.y, 12, '#ffd93b', 180, 0.4);
        spawnParticles(p.x, p.y, 6, '#ff8c42', 220, 0.3);
        if (hasFx('fx_etoiles')) spawnStars(p.x, p.y, 3);
        AudioSys.hit();
        // mot entièrement détruit → gros feu d'artifice
        if (w.dying && w.letters.every(l => l.gone)) {
          words.splice(words.indexOf(w), 1);
          spawnParticles(p.x, p.y, 30, '#7affc0', 260, 0.7, true);
          spawnParticles(p.x, p.y, 20, '#7ad9ff', 220, 0.6, true);
          shake(3);
        }
      } else {
        spawnParticles(b.x, b.y, 4, '#9aa7c7', 120, 0.2);
      }
    }
  }

  if (state === ST_BREAK) {
    breakTimer -= dt;
    if (breakTimer <= 0) state = ST_PLAY;
  }

  if (state !== ST_PLAY) return;

  // apparition des mots
  if (toSpawn > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWord();
      toSpawn--;
      spawnTimer = waveSpawnGap(waveNum) * (0.75 + Math.random() * 0.5);
    }
  }

  // chute des mots
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (w.flash > 0) w.flash -= dt;
    if (!w.dying) w.y += w.speed * dt;
    const wordBottom = w.y + 7 * wordScale();
    if (!w.dying && wordBottom >= groundY) {
      // impact au sol !
      words.splice(i, 1);
      if (activeWord === w) activeWord = null;
      const p = letterPos(w, Math.floor(w.text.length / 2));
      spawnParticles(p.x, groundY, 40, '#ff6b6b', 300, 0.8, true);
      spawnParticles(p.x, groundY, 20, '#ff8c42', 240, 0.6, true);
      combo = 0;
      lives--;
      shake(9);
      errorFlash = 0.35;
      AudioSys.boom();
      if (lives <= 0) {
        state = ST_OVER;
        if (score > best) {
          best = score;
          try { localStorage.setItem('typerider.best', String(best)); } catch (e) {}
        }
        AudioSys.over();
        return;
      }
    }
  }

  // fin de vague
  if (toSpawn === 0 && words.length === 0 && bullets.length === 0) {
    score += 100 * waveNum;
    if (waveNum % WAVES_PER_MANCHE === 0) {
      // fin de manche : niveau gagné, crédits, et passage par la boutique
      lastNiveau = waveNum / WAVES_PER_MANCHE;
      lastGain = 150 + 100 * lastNiveau + combo * 5;
      credits += lastGain;
      saveMeta();
      shopReturn = 'game';
      shopIndex = 0;
      state = ST_SHOP;
      AudioSys.wave();
    } else {
      addPopup(W / 2, H * 0.4, 'VAGUE ' + waveNum + ' TERMINEE +' + (100 * waveNum), '#7affc0', 3);
      nextWave();
    }
  }
}

// ===================== RENDU =====================
function drawTurret() {
  const u = Math.max(2, Math.round(PX * 0.9)); // unité pixel de la tourelle
  const x = turret.x, y = turret.y;
  const skin = TURRET_SKINS[equipped.skin] || TURRET_SKINS.skin_bleu;

  // socle
  ctx.fillStyle = '#232840';
  ctx.fillRect(x - 9 * u, y - 3 * u, 18 * u, 4 * u);
  ctx.fillStyle = '#2f3757';
  ctx.fillRect(x - 8 * u, y - 5 * u, 16 * u, 2 * u);
  ctx.fillStyle = skin.accent;
  ctx.fillRect(x - 8 * u, y - 3 * u, 2 * u, u);
  ctx.fillRect(x + 6 * u, y - 3 * u, 2 * u, u);

  // canon (pivote vers la cible)
  const bl = 9 * u - turret.recoil * 3 * u;
  ctx.save();
  ctx.translate(x, y - 6 * u);
  ctx.rotate(turret.angle + Math.PI / 2);
  ctx.fillStyle = skin.barrel;
  ctx.fillRect(-2 * u, -bl, 4 * u, bl);
  ctx.fillStyle = skin.glow;
  ctx.fillRect(-2 * u, -bl, 4 * u, u);
  ctx.restore();

  // dôme
  ctx.fillStyle = skin.dome;
  ctx.fillRect(x - 5 * u, y - 8 * u, 10 * u, 4 * u);
  ctx.fillStyle = skin.domeTop;
  ctx.fillRect(x - 4 * u, y - 9 * u, 8 * u, u);
  ctx.fillStyle = skin.glow;
  ctx.fillRect(x - 2 * u, y - 7 * u, 4 * u, u);

  // accessoires équipés
  if (equipped.acc === 'acc_drapeau') {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(x - 8 * u, y - 16 * u, u, 11 * u);
    const fl = Math.sin(gameT * 6) > 0 ? 0 : 1;
    ctx.fillStyle = skin.accent;
    ctx.fillRect(x - 7 * u, y - 16 * u + fl, 4 * u, u);
    ctx.fillRect(x - 7 * u, y - 15 * u + (1 - fl), 4 * u, u);
  } else if (equipped.acc === 'acc_radar') {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(x + 5 * u, y - 12 * u, u, 4 * u);
    const a = gameT * 2.5;
    ctx.fillStyle = skin.glow;
    for (let k = 0; k <= 3; k++) {
      ctx.fillRect(Math.round(x + 5 * u + Math.cos(a) * k * u),
                   Math.round(y - 12 * u + Math.sin(a) * k * u), u, u);
    }
  } else if (equipped.acc === 'acc_chapeau') {
    ctx.fillStyle = '#14182e';
    ctx.fillRect(x - 5 * u, y - 10 * u, 10 * u, u);
    ctx.fillRect(x - 3 * u, y - 14 * u, 6 * u, 4 * u);
    ctx.fillStyle = skin.accent;
    ctx.fillRect(x - 3 * u, y - 11 * u, 6 * u, u);
  }
}

function drawWords() {
  const sc = wordScale();
  for (const w of words) {
    const sway = Math.sin(gameT * 0.9 + w.swayPh) * w.swayAmp;
    const x = Math.round(w.x + sway);
    const y = Math.round(w.y);
    const wpx = w.text.length * 6 * sc;
    const isActive = w === activeWord;
    const danger = !w.dying && w.y > groundY - H * 0.28;

    // fond du mot
    if (!w.dying) {
      ctx.fillStyle = w.flash > 0 ? 'rgba(180,30,50,0.75)' : 'rgba(8,12,28,0.62)';
      ctx.fillRect(x - 2 * sc, y - 2 * sc, wpx + 3 * sc, 11 * sc);
      // liseré
      let border = null;
      if (isActive) border = '#ffe97a';
      else if (danger) border = (Math.sin(gameT * 10) > 0 ? '#ff6b6b' : null);
      if (border) {
        ctx.fillStyle = border;
        ctx.fillRect(x - 2 * sc, y - 2 * sc, wpx + 3 * sc, sc);
        ctx.fillRect(x - 2 * sc, y + 9 * sc, wpx + 3 * sc, sc);
        ctx.fillRect(x - 2 * sc, y - 2 * sc, sc, 11 * sc);
        ctx.fillRect(x + wpx + sc - sc, y - 2 * sc, sc, 11 * sc);
      }
    }

    // lettres
    for (let i = 0; i < w.text.length; i++) {
      const l = w.letters[i];
      if (l.gone) continue;
      let color;
      if (i < w.progress) color = '#4a5680'; // déjà tapée, balle en vol
      else if (isActive && i === w.progress) color = '#ffe97a';
      else color = w.flash > 0 ? '#ffb0b0' : '#f2f5ff';
      drawPixelText(ctx, l.ch, x + i * 6 * sc, y, sc, color);
    }
    // curseur sous la prochaine lettre
    if (isActive && w.progress < w.text.length && Math.sin(gameT * 12) > -0.2) {
      ctx.fillStyle = '#ffe97a';
      ctx.fillRect(x + w.progress * 6 * sc, y + 8 * sc, 5 * sc, sc);
    }
  }
}

function drawBullets() {
  const rainbow = hasFx('fx_arc');
  const tlen = hasFx('fx_comete') ? 64 : 26;
  for (const b of bullets) {
    const d = Math.hypot(b.vx, b.vy) || 1;
    const tx = b.vx / d, ty = b.vy / d;
    const hue = (gameT * 420 + b.x * 0.7) % 360;
    ctx.strokeStyle = rainbow ? 'hsla(' + hue + ',90%,65%,0.55)' : 'rgba(255,233,122,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - tx * tlen, b.y - ty * tlen);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = rainbow ? 'hsl(' + hue + ',95%,85%)' : '#fff7cf';
    ctx.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 3, 6, 6);
    ctx.fillStyle = rainbow ? 'hsl(' + ((hue + 40) % 360) + ',90%,65%)' : '#ffe97a';
    ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const s = p.size * Math.max(2, PX - 1);
    const px = Math.round(p.x), py = Math.round(p.y);
    if (p.star) {
      const t = Math.max(2, Math.round(s / 3));
      ctx.fillRect(px - s, py - Math.round(t / 2), s * 2, t);
      ctx.fillRect(px - Math.round(t / 2), py - s, t, s * 2);
    } else {
      ctx.fillRect(px - Math.round(s / 2), py - Math.round(s / 2), s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPopups() {
  for (const p of popups) {
    const a = Math.max(0, Math.min(1, p.life / p.maxLife * 2));
    ctx.globalAlpha = a;
    drawPixelTextOutline(ctx, p.text, p.x, p.y, p.scale, p.color, '#101528', 'center');
  }
  ctx.globalAlpha = 1;
}

// icônes pixel 9x9 pour l'inventaire
const ICON_CLOCK = [
  '..#####..',
  '.#.....#.',
  '#...#...#',
  '#...#...#',
  '#...##..#',
  '#.......#',
  '#.......#',
  '.#.....#.',
  '..#####..'];
const ICON_BOOM = [
  '#####....',
  '.#####...',
  '...###...',
  '....###..',
  '....###..',
  '.....###.',
  '.....###.',
  '......###',
  '.........'];

function drawIcon(c2, rows, x, y, s, color) {
  c2.fillStyle = color;
  for (let r = 0; r < rows.length; r++)
    for (let k = 0; k < rows[r].length; k++)
      if (rows[r][k] === '#') c2.fillRect(x + k * s, y + r * s, s, s);
}

function drawInventory() {
  const by = H - 82;
  const slots = [
    { key: '1', icon: ICON_CLOCK, count: inventory.rewind, col: '#7ad9ff' },
    { key: '2', icon: ICON_BOOM, count: inventory.boomerang, col: '#7affc0' },
  ];
  slots.forEach((sl, i) => {
    const x = W - 16 - (2 - i) * 62;
    const on = sl.count > 0;
    ctx.fillStyle = 'rgba(8,12,28,0.62)';
    ctx.fillRect(x, by, 54, 54);
    ctx.fillStyle = on ? sl.col : 'rgba(80,90,120,0.5)';
    ctx.fillRect(x, by, 54, 2);
    ctx.fillRect(x, by + 52, 54, 2);
    ctx.fillRect(x, by, 2, 54);
    ctx.fillRect(x + 52, by, 2, 54);
    drawIcon(ctx, sl.icon, x + 14, by + 14, 3, on ? sl.col : '#4a5680');
    drawPixelText(ctx, sl.key, x + 5, by + 5, 2, '#dfe6ff');
    drawPixelText(ctx, 'X' + Math.min(9, sl.count), x + 31, by + 38, 2, on ? '#ffffff' : '#4a5680');
  });
}

function drawHUD() {
  const s = 3;
  const pad = 16;
  // score + crédits
  drawPixelTextOutline(ctx, 'SCORE', pad, pad, 2, '#9fb3e8', '#101528');
  drawPixelTextOutline(ctx, String(score).padStart(7, '0'), pad, pad + 20, s, '#ffffff', '#101528');
  drawPixelTextOutline(ctx, 'CREDITS ' + credits, pad, pad + 48, 2, '#ffd93b', '#101528');

  // combo / multiplicateur
  const mult = multiplier();
  if (combo > 0) {
    const mcol = mult >= 5 ? '#ff8c42' : (mult >= 3 ? '#7affc0' : '#7ad9ff');
    drawPixelTextOutline(ctx, 'COMBO ' + combo, pad, pad + 74, 2, '#9fb3e8', '#101528');
    const pulse = mult > 1 ? 3 + (Math.sin(gameT * 6) > 0.5 ? 1 : 0) : 3;
    drawPixelTextOutline(ctx, 'X' + mult, pad, pad + 94, pulse, mcol, '#101528');
  }

  // niveau + vague + vies
  drawPixelTextOutline(ctx, 'NIV ' + niveauCourant() + '  VAGUE ' + waveNum, W - pad, pad, s, '#ffffff', '#101528', 'right');
  const slots = Math.max(3, lives);
  for (let i = 0; i < slots; i++) {
    const col = i < lives ? '#ff5d8f' : 'rgba(80,90,120,0.5)';
    drawPixelText(ctx, '♥', W - pad - (slots - i) * 6 * 3 + 3, pad + 28, 3, col);
  }

  // mots restants dans la vague
  const remaining = toSpawn + words.filter(w => !w.dying).length;
  drawPixelTextOutline(ctx, 'MOTS ' + remaining, W - pad, pad + 56, 2, '#9fb3e8', '#101528', 'right');

  // statistiques de frappe en direct
  const acc = stats.typed > 0 ? Math.round((stats.typed - stats.errors) / stats.typed * 100) : 100;
  drawPixelTextOutline(ctx, 'MPM ' + currentMPM() + '   PRECISION ' + acc, pad, H - 30, 2, '#9fb3e8', '#101528');

  drawInventory();
}

function drawCenteredPanel(lines) {
  // lines: [{text, scale, color, gap}]
  let totalH = 0;
  for (const l of lines) totalH += 7 * l.scale + (l.gap || 12);
  let y = Math.round(H / 2 - totalH / 2);
  ctx.fillStyle = 'rgba(8,12,28,0.55)';
  ctx.fillRect(0, y - 30, W, totalH + 60);
  for (const l of lines) {
    drawPixelTextOutline(ctx, l.text, W / 2, y, l.scale, l.color, '#101528', 'center');
    y += 7 * l.scale + (l.gap || 12);
  }
}

function draw(dt) {
  ctx.save();
  if (shakeAmp > 0) {
    ctx.translate((Math.random() - 0.5) * shakeAmp * 2, (Math.random() - 0.5) * shakeAmp * 2);
  }

  drawBackground(state === ST_PAUSE ? 0 : dt);

  if (state === ST_TITLE) {
    drawTitle();
    ctx.restore();
    return;
  }

  if (state !== ST_OVER) drawWords();
  drawBullets();
  drawTurret();
  drawParticles();
  drawPopups();
  drawHUD();

  if (errorFlash > 0) {
    ctx.fillStyle = 'rgba(255,60,60,' + (errorFlash * 0.5) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (rewindFlash > 0) {
    ctx.fillStyle = 'rgba(90,180,255,' + (rewindFlash * 0.4) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  // aperçu du boomerang du futur
  if (previewTimer > 0 && state === ST_PLAY) {
    const a = Math.min(1, previewTimer) * (0.75 + 0.25 * Math.sin(gameT * 8));
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,12,28,0.7)';
    const pw = Math.max(textWidth(previewWord, 3), textWidth('PROCHAIN MOT', 2)) + 40;
    ctx.fillRect(W / 2 - pw / 2, 84, pw, 62);
    drawPixelTextOutline(ctx, 'PROCHAIN MOT', W / 2, 94, 2, '#7affc0', '#101528', 'center');
    drawPixelTextOutline(ctx, previewWord, W / 2, 116, 3, '#b8ffe0', '#101528', 'center');
    ctx.globalAlpha = 1;
  }

  if (state === ST_BREAK) {
    const blink = Math.sin(gameT * 5) > -0.4;
    drawCenteredPanel([
      { text: 'VAGUE ' + waveNum, scale: 6, color: '#ffe97a', gap: 14 },
      { text: 'NIVEAU ' + niveauCourant() + ' - VAGUE ' + ((waveNum - 1) % WAVES_PER_MANCHE + 1) + '/' + WAVES_PER_MANCHE + ' DE LA MANCHE', scale: 2, color: '#ffd93b', gap: 10 },
      { text: waveNum === 1 ? 'TAPEZ LES MOTS AVANT L\'IMPACT !' : 'PLUS VITE, PLUS NOMBREUX...', scale: 2, color: '#dfe6ff', gap: 8 },
      { text: blink ? 'PREPAREZ-VOUS' : ' ', scale: 2, color: '#7ad9ff', gap: 0 },
    ]);
  } else if (state === ST_PAUSE) {
    drawCenteredPanel([
      { text: 'PAUSE', scale: 6, color: '#7ad9ff', gap: 20 },
      { text: 'ECHAP OU ENTREE POUR REPRENDRE', scale: 2, color: '#dfe6ff', gap: 0 },
    ]);
  } else if (state === ST_SHOP) {
    drawShop();
  } else if (state === ST_OVER) {
    const acc = stats.typed > 0 ? Math.round((stats.typed - stats.errors) / stats.typed * 100) : 100;
    const avgMpm = playT > 5 ? Math.round(((stats.typed - stats.errors) / 5) / (playT / 60)) : 0;
    drawCenteredPanel([
      { text: 'PARTIE TERMINEE', scale: 5, color: '#ff6b6b', gap: 24 },
      { text: 'SCORE ' + score, scale: 4, color: '#ffffff', gap: 14 },
      { text: 'MEILLEUR ' + best + (score >= best && score > 0 ? '  NOUVEAU RECORD !' : ''), scale: 2, color: '#ffe97a', gap: 14 },
      { text: 'MOTS ' + stats.wordsDone + '   PRECISION ' + acc + '/100   MEILLEUR COMBO ' + stats.bestCombo, scale: 2, color: '#9fb3e8', gap: 10 },
      { text: 'MPM MOYEN ' + avgMpm + '   MPM MAX ' + peakMpm + '   NIVEAU ' + niveauCourant(), scale: 2, color: '#9fb3e8', gap: 10 },
      { text: 'CREDITS ' + credits, scale: 2, color: '#ffd93b', gap: 20 },
      { text: Math.sin(gameT * 4) > -0.3 ? 'ENTREE POUR REJOUER' : ' ', scale: 3, color: '#7affc0', gap: 0 },
    ]);
  }

  ctx.restore();
}

// ===================== BOUTIQUE (rendu) =====================
function drawShop() {
  ctx.fillStyle = 'rgba(6,9,22,0.85)';
  ctx.fillRect(0, 0, W, H);

  let y = Math.max(20, H * 0.06);
  drawPixelTextOutline(ctx, 'BOUTIQUE', W / 2, y, 6, '#ffd93b', '#101528', 'center');
  y += 58;
  if (shopReturn === 'game' && lastGain > 0) {
    drawPixelTextOutline(ctx, 'NIVEAU ' + lastNiveau + ' ATTEINT !  +' + lastGain + ' CREDITS', W / 2, y, 2, '#7affc0', '#101528', 'center');
    y += 26;
  }
  drawPixelTextOutline(ctx, 'CREDITS : ' + credits, W / 2, y, 3, '#ffd93b', '#101528', 'center');
  y += 40;

  const left = Math.max(30, W / 2 - 280);
  const right = Math.min(W - 30, W / 2 + 280);
  let cat = '';
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const it = SHOP_ITEMS[i];
    if (it.cat !== cat) {
      cat = it.cat;
      y += 8;
      drawPixelTextOutline(ctx, cat, left, y, 2, '#9fb3e8', '#101528');
      y += 24;
    }
    const sel = i === shopIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(122,217,255,0.14)';
      ctx.fillRect(left - 10, y - 5, right - left + 20, 24);
      drawPixelText(ctx, '>', left - 4, y, 2, '#7ad9ff');
    }
    const isOwned = owned.includes(it.id);
    const nameCol = sel ? '#ffffff' : '#dfe6ff';
    drawPixelTextOutline(ctx, it.name, left + 18, y, 2, nameCol, '#101528');
    let status, stCol;
    if (!isOwned) {
      status = it.price + ' CR';
      stCol = credits >= it.price ? '#ffd93b' : '#ff6b6b';
    } else if (it.type === 'skin') {
      status = equipped.skin === it.id ? 'EQUIPE' : 'ACHETE';
      stCol = equipped.skin === it.id ? '#7affc0' : '#9fb3e8';
    } else if (it.type === 'acc') {
      status = equipped.acc === it.id ? 'EQUIPE' : 'ACHETE';
      stCol = equipped.acc === it.id ? '#7affc0' : '#9fb3e8';
    } else {
      status = 'ACTIF';
      stCol = '#7affc0';
    }
    drawPixelTextOutline(ctx, status, right, y, 2, stCol, '#101528', 'right');
    y += 24;
  }

  y += 14;
  drawPixelTextOutline(ctx, 'FLECHES : CHOISIR   ENTREE : ACHETER / EQUIPER', W / 2, y, 2, '#dfe6ff', '#101528', 'center');
  y += 22;
  drawPixelTextOutline(ctx, 'ECHAP : ' + (shopReturn === 'game' ? 'CONTINUER LA PARTIE' : 'RETOUR AU TITRE'), W / 2, y, 2, '#7ad9ff', '#101528', 'center');
}

function drawTitle() {
  const cy = H * 0.30;
  const bob = Math.sin(gameT * 1.5) * 6;
  // logo
  drawPixelTextOutline(ctx, 'TYPE', W / 2 - 10, cy - 40 + bob, 9, '#ffe97a', '#101528', 'right');
  drawPixelTextOutline(ctx, 'RIDER', W / 2 + 10, cy - 40 + bob, 9, '#7ad9ff', '#101528', 'left');
  drawPixelTextOutline(ctx, 'TAPE OU COULE !', W / 2, cy + 42 + bob, 2, '#ff5d8f', '#101528', 'center');

  // mot de démonstration qui tombe
  const demoY = cy + 100 + Math.sin(gameT * 0.8) * 12;
  ctx.fillStyle = 'rgba(8,12,28,0.62)';
  const demoW = textWidth('MONTAGNE', 3) + 14;
  ctx.fillRect(W / 2 - demoW / 2 - 4, demoY - 8, demoW + 8, 37);
  const done = Math.floor((gameT * 2.5) % 12);
  const demo = 'MONTAGNE';
  for (let i = 0; i < demo.length; i++) {
    const col = i < done ? '#4a5680' : (i === done ? '#ffe97a' : '#f2f5ff');
    if (i < done - 2) continue;
    drawPixelText(ctx, demo[i], W / 2 - textWidth(demo, 3) / 2 + i * 18, demoY, 3, col);
  }

  const rules = [
    'DES MOTS TOMBENT DU CIEL : TAPEZ-LES AVANT L\'IMPACT',
    'CHAQUE LETTRE JUSTE DECLENCHE UN TIR',
    'UNE ERREUR ? ON REPREND LE MOT AU DEBUT',
    'ENCHAINEZ LES MOTS SANS FAUTE POUR MULTIPLIER LE SCORE',
    'BONUS : 1 = REMONTE-TEMPS   2 = BOOMERANG DU FUTUR',
    'FINISSEZ UNE MANCHE DE 4 VAGUES POUR GAGNER DES CREDITS',
  ];
  let ry = H * 0.58;
  for (const r of rules) {
    drawPixelTextOutline(ctx, r, W / 2, ry, 2, '#dfe6ff', '#101528', 'center');
    ry += 26;
  }

  if (Math.sin(gameT * 4) > -0.3) {
    drawPixelTextOutline(ctx, 'APPUYEZ SUR ENTREE', W / 2, H * 0.78, 4, '#7affc0', '#101528', 'center');
  }
  drawPixelTextOutline(ctx, 'ECHAP : PAUSE   F2 : SON   B : BOUTIQUE', W / 2, H * 0.78 + 44, 2, '#9fb3e8', '#101528', 'center');
  const meta = [];
  if (best > 0) meta.push('MEILLEUR SCORE ' + best);
  meta.push('CREDITS ' + credits);
  drawPixelTextOutline(ctx, meta.join('   '), W / 2, H * 0.78 + 70, 2, '#ffe97a', '#101528', 'center');
  drawTurret();
}

// ===================== BOUCLE PRINCIPALE =====================
let lastT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (state !== ST_PAUSE) update(dt);
  draw(dt);
  requestAnimationFrame(frame);
}

resize();
turret.x = W / 2;
turret.y = groundY + 4;
requestAnimationFrame(frame);

// petit hook de debug/test (n'affecte pas le jeu)
window.__TR = {
  get state() { return state; },
  get score() { return score; },
  get combo() { return combo; },
  get lives() { return lives; },
  get wave() { return waveNum; },
  get words() { return words.map(w => ({ text: w.text, y: Math.round(w.y), progress: w.progress, dying: w.dying })); },
  get credits() { return credits; },
  get inventory() { return Object.assign({}, inventory); },
  giveCredits(n) { credits += n; saveMeta(); },
  useRewind, useBoomerang,
  finishWave(n) {
    if (waveNum === 0) startGame();
    waveNum = n;
    toSpawn = 0; words = []; bullets = [];
    state = ST_PLAY;
  },
  start() { AudioSys.muted = true; startGame(); },
  key(ch) { if (state === ST_PLAY) typeChar(ch.toUpperCase()); },
  jumpWave(n) {
    if (waveNum === 0) startGame();
    words = []; bullets = [];
    waveNum = n - 1;
    nextWave();
    pal = Object.assign({}, palTarget); // palette instantanée
  },
};

})();
