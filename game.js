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
const V = window.TRVehicles;

let W = 0, H = 0;        // taille plein écran (px réels)
let PX = 3;              // taille d'un "gros pixel" du décor
let bw = 0, bh = 0;      // taille du buffer basse résolution
const bg = document.createElement('canvas');
const bctx = bg.getContext('2d');
const fg = document.createElement('canvas');   // premier plan, dessiné devant le véhicule
const fctx = fg.getContext('2d');

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
  fg.width = bw;
  fg.height = bh;
  groundY = H - GROUND_LR * PX;
  ctx.imageSmoothingEnabled = false;
  bctx.imageSmoothingEnabled = false;
  fctx.imageSmoothingEnabled = false;
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
'=':['00000','00000','11111','00000','11111','00000','00000'],
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
  fgLayer = { speed: 62, parts: genForeground(TILE) };

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

function drawTiled(img, offset, y, target) {
  const c2 = target || bctx;
  const o = ((offset % TILE) + TILE) % TILE;
  c2.drawImage(img, Math.round(-o), y);
  c2.drawImage(img, Math.round(TILE - o), y);
  if (TILE * 2 - o < bw) c2.drawImage(img, Math.round(TILE * 2 - o), y);
}

// premier plan : touffes d'herbes hautes, rochers et buissons, en silhouettes sombres
const FG_H = GROUND_LR + 10;
function genForeground(tw) {
  const th = FG_H;
  const base = newPart(tw, th, 'shade2', 'bush');
  const hi = newPart(tw, th, 'shade', 'bush');
  let x = 30;
  while (x < tw - 40) {
    const n = periodicNoise(x, 61, tw);
    const kind = Math.floor(n * 4);
    if (kind <= 1) {
      const blades = 5 + Math.floor(n * 37) % 5;
      for (let b = 0; b < blades; b++) {
        const bx = x + b * 2 + (b % 2);
        const hgt = 8 + Math.floor(periodicNoise(bx, 62, tw) * 12);
        const lean = (b - blades / 2) * 0.1;
        for (let k = 0; k < hgt; k++) {
          const px = Math.round(bx + lean * k);
          base.g.fillRect(px, th - 1 - k, k > hgt * 0.6 ? 1 : 2, 1);
        }
        hi.g.fillRect(Math.round(bx + lean * hgt), th - hgt, 1, 2);
      }
    } else if (kind === 2) {
      const rw = 10 + Math.floor(n * 23) % 10, rh = 5 + Math.floor(n * 17) % 4;
      for (let yy = 0; yy < rh; yy++) {
        const ww = Math.round(rw * Math.sqrt(1 - (yy / rh) * (yy / rh)));
        base.g.fillRect(x + Math.floor((rw - ww) / 2), th - 1 - yy, ww, 1);
      }
      hi.g.fillRect(x + Math.floor(rw / 2), th - rh, Math.max(2, Math.floor(rw / 3)), 1);
    } else {
      const r = 5 + Math.floor(n * 19) % 4;
      for (let dy = 0; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt(r * r - dy * dy));
        base.g.fillRect(x + r - hw, th - 1 - dy, hw * 2, 1);
      }
      hi.g.fillRect(x + r, th - r, 3, 1);
      hi.g.fillRect(x + r - 3, th - r + 2, 2, 1);
    }
    x += 70 + Math.floor(periodicNoise(x, 63, tw) * 110);
  }
  return [base, hi];
}

let scrollT = 0;
let fgLayer = null;

function drawForeground() {
  fctx.clearRect(0, 0, bw, bh);
  for (const part of fgLayer.parts) {
    drawTiled(tintPart(part, 'bush'), scrollT * fgLayer.speed, bh - FG_H, fctx);
  }
  ctx.drawImage(fg, 0, 0, bw * PX, bh * PX);
}

function drawBackground(dt) {
  scrollT += dt * worldSpeed;
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
  shoot(style) {
    switch (style) {
      case 'caillou': this.tone(520, 0.06, 'triangle', 0.06, -200); break;
      case 'eau': this.tone(900, 0.08, 'sine', 0.05, -500); this.noise(0.05, 0.03); break;
      case 'balle': this.tone(420, 0.07, 'square', 0.04, 160); break;
      case 'confetti': this.noise(0.08, 0.06); this.tone(700, 0.05, 'square', 0.03); break;
      case 'laser': this.tone(1300, 0.1, 'sawtooth', 0.035, -1000); break;
      case 'laser2': this.tone(1200, 0.1, 'sawtooth', 0.03, -900); this.tone(1500, 0.1, 'sawtooth', 0.02, -1100); break;
      case 'roquette': this.noise(0.15, 0.06); this.tone(240, 0.15, 'square', 0.04, 300); break;
      case 'plasma': this.tone(260, 0.16, 'sine', 0.07, 520); break;
      case 'obus': this.noise(0.22, 0.1); this.tone(90, 0.22, 'sawtooth', 0.08, -40); break;
      default: this.tone(880, 0.09, 'square', 0.05, -500);
    }
  },
  evolve() {
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'square', 0.05), i * 170));
  },
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
  // vocabulaire enfants : mots simples du quotidien
  kids4: ['eau','mer','jus','sel','riz','nez','dos','ami','roi','fee','the','sac','bol','jeu','chat','loup','ours','lion','bleu','vert','rose','noir','lune','vent','main','pied','pain','lait','chou','miel','papa','bebe','velo','coq','ane','oie','mur','pot','lit','cle'],
  kids: ['chien','lapin','poule','vache','souris','cheval','mouton','cochon','canard','oiseau','maman','papi','mamie','ecole','ballon','pomme','poire','banane','fraise','cerise','gateau','bonbon','tete','bras','reine','tigre','singe','zebre','girafe','rouge','jaune','blanc','soleil','etoile','fleur','arbre','herbe','sable','plage','neige','pluie','nuage','livre','table','porte','robot','pirate','dragon'],
  short: ['mer','roc','feu','eau','pic','lac','val','cap','ile','arc','air','nid','bec','pin','pre','col','vol','gel','ciel','vent','bois','loup','cerf','aube','lune','pont','houx','sable','ruche','pluie','fleur','herbe','sapin','nuage','orage','neige','brume','givre','galet','foret','orme','etang','dune','mare','baie','anse','cime','gorge','crete','butte','ravin','delta','oasis','jonc','iris','rose','chene','hetre','saule','frene','cedre','aulne','ours','lynx','aigle','biche','merle','geai','faon','hibou','bison','recif','genet','lande','marne','crabe','loriot'],
  medium: ['riviere','prairie','vallee','sommet','rocher','source','aurore','mousse','etoile','soleil','chemin','sentier','falaise','colline','torrent','cascade','glacier','ruisseau','feuille','branche','racine','ecorce','buisson','tempete','eclair','horizon','erable','luciole','orchidee','roseau','jungle','corail','tilleul','bouleau','renard','lievre','fougere','bruyere','lavande','jasmin','muguet','sorbier','cypres','sequoia','platane','crevasse','plateau','canyon','volcan','geyser','lagune','savane','faucon','loutre','castor','mouflon','chamois','belette','toundra','moraine','baobab','anemone','tulipe','gentiane','aubepine','digitale','archipel'],
  long: ['montagne','papillon','libellule','hirondelle','crepuscule','escalade','panorama','avalanche','brouillard','chevreuil','ecureuil','marmotte','myrtille','framboise','campagne','clairiere','alpiniste','belvedere','stalactite','coquelicot','chataignier','sauterelle','coccinelle','peninsule','bouquetin','salamandre','grenouille','scarabee','araignee','chrysalide','eglantine','paquerette','pissenlit','tournesol','genevrier','clematite','primevere','cordillere','permafrost','eucalyptus','edelweiss','peuplier','noisette','chouette','herisson','estuaire','sanglier','blaireau'],
  verylong: ['constellation','biodiversite','photosynthese','meteorologie','hibernation','germination','pollinisation','sedimentation','cristallisation','precipitations','transhumance','chlorophylle','rhododendron','cornouiller','stratosphere','metamorphose'],
};

function pickWord(wave, existing) {
  let pool;
  const r = Math.random();
  const d = DIFFS[diffIndex];
  if (d.pool === 'poussin') {
    // tout-petits : mots de 3-4 lettres, quelques mots simples plus longs ensuite
    pool = (wave <= 2 || r < 0.7) ? WORDS.kids4 : WORDS.kids;
  } else if (d.pool === 'enfant') {
    if (wave <= 2) pool = r < 0.5 ? WORDS.kids4 : WORDS.kids;
    else if (wave <= 4) pool = r < 0.55 ? WORDS.kids : WORDS.short;
    else pool = r < 0.4 ? WORDS.kids : (r < 0.8 ? WORDS.short : WORDS.medium);
  }
  else if (wave <= 2) pool = r < 0.75 ? WORDS.short : WORDS.medium;
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

// ===================== DIFFICULTÉS =====================
// fallMul : multiplie le temps de chute (plus grand = plus lent)
// countMul/gapMul : nombre de mots par vague / espacement des apparitions
// dropMul : fréquence des bonus
const DIFFS = [
  { id: 'poussin', name: 'POUSSIN', desc: 'POUR LES PETITS DOIGTS', color: '#7affc0',
    fallMul: 2.2, countMul: 0.55, gapMul: 1.8, lives: 5, dropMul: 2.0, pool: 'poussin' },
  { id: 'enfant', name: 'ENFANT', desc: 'MOTS SIMPLES, CHUTE LENTE', color: '#7ad9ff',
    fallMul: 1.55, countMul: 0.8, gapMul: 1.35, lives: 4, dropMul: 1.5, pool: 'enfant' },
  { id: 'normal', name: 'NORMAL', desc: 'LE JEU CLASSIQUE', color: '#ffe97a',
    fallMul: 1, countMul: 1, gapMul: 1, lives: 3, dropMul: 1, pool: 'full' },
  { id: 'expert', name: 'EXPERT', desc: 'PLUS VITE, PLUS DENSE !', color: '#ff6b6b',
    fallMul: 0.78, countMul: 1.2, gapMul: 0.82, lives: 3, dropMul: 1, pool: 'full' },
];

function loadJSON(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

let diffIndex = Math.min(DIFFS.length - 1, Math.max(0, loadJSON('typerider.diff', 2)));

let score = 0, best = 0;
// meilleur score séparé par difficulté (l'ancienne clé sert de valeur au mode normal)
function loadBest() {
  const v = loadJSON('typerider.best.' + DIFFS[diffIndex].id, null);
  if (v !== null) return v;
  if (DIFFS[diffIndex].id === 'normal') {
    try { return parseInt(localStorage.getItem('typerider.best') || '0', 10) || 0; } catch (e) { return 0; }
  }
  return 0;
}
best = loadBest();

// progression persistante (crédits, achats, équipement, effets actifs, garage)
let credits = loadJSON('typerider.credits', 0);
let owned = loadJSON('typerider.owned', ['skin_bleu']);
let equipped = loadJSON('typerider.equip', { skin: 'skin_bleu', acc: null });
// effets achetés avant la bibliothèque : ils restent actifs
let fxOn = loadJSON('typerider.fxOn', null) || owned.filter(id => id.startsWith('fx_'));
let garageMax = loadJSON('typerider.garage', 1); // meilleur véhicule jamais atteint
function saveMeta() {
  saveJSON('typerider.credits', credits);
  saveJSON('typerider.owned', owned);
  saveJSON('typerider.equip', equipped);
  saveJSON('typerider.fxOn', fxOn);
  saveJSON('typerider.garage', garageMax);
}
const fxActive = (id) => owned.includes(id) && fxOn.includes(id);

// ===================== BOUTIQUE =====================
const SHOP_TABS = [
  { id: 'skin', name: 'COULEURS' },
  { id: 'acc', name: 'ACCESSOIRES' },
  { id: 'fx', name: 'EFFETS' },
  { id: 'garage', name: 'GARAGE' },
];

const SHOP_ITEMS = [
  { id: 'skin_bleu', type: 'skin', name: 'BLEU CLASSIQUE', price: 0 },
  { id: 'skin_or', type: 'skin', name: 'OR ROYAL', price: 300 },
  { id: 'skin_rose', type: 'skin', name: 'NEON ROSE', price: 250 },
  { id: 'skin_camo', type: 'skin', name: 'VERT CAMO', price: 200 },
  { id: 'skin_lave', type: 'skin', name: 'ROUGE LAVE', price: 250 },
  { id: 'acc_drapeau', type: 'acc', name: 'DRAPEAU', price: 150 },
  { id: 'acc_radar', type: 'acc', name: 'ANTENNE RADAR', price: 200 },
  { id: 'acc_lunettes', type: 'acc', name: 'LUNETTES DE SOLEIL', price: 150 },
  { id: 'acc_chapeau', type: 'acc', name: 'CHAPEAU HAUT-DE-FORME', price: 250 },
  { id: 'acc_couronne', type: 'acc', name: 'COURONNE', price: 400 },
  // bibliothèque d'effets : chaque effet acheté s'active / se désactive librement
  { id: 'fx_arc', type: 'fx', sub: 'TIRS', name: 'BALLES ARC-EN-CIEL', price: 400 },
  { id: 'fx_comete', type: 'fx', sub: 'TIRS', name: 'TRAINEE DE COMETE', price: 300 },
  { id: 'fx_etoiles', type: 'fx', sub: 'IMPACTS', name: 'EXPLOSIONS ETOILEES', price: 350 },
  { id: 'fx_confettis', type: 'fx', sub: 'IMPACTS', name: 'CONFETTIS DE VICTOIRE', price: 300 },
  { id: 'fx_aura', type: 'fx', sub: 'VEHICULE', name: 'AURA DOREE', price: 450 },
  { id: 'fx_neon', type: 'fx', sub: 'VEHICULE', name: 'TRAINEE NEON', price: 400 },
  { id: 'fx_etincelles', type: 'fx', sub: 'VEHICULE', name: 'ETINCELLES', price: 250 },
  { id: 'fx_traces', type: 'fx', sub: 'VEHICULE', name: 'TRACES ARC-EN-CIEL', price: 350 },
];

let shopTab = 0, shopIndex = 0, garageSel = 0;
let shopReturn = 'title'; // 'title' ou 'game'
let lastGain = 0, lastNiveau = 0;
let previewShotT = 0, previewAnchor = null;

function shopRows() {
  const tab = SHOP_TABS[shopTab].id;
  if (tab === 'garage') return V.list.map((v, i) => ({ garage: true, i, v }));
  return SHOP_ITEMS.filter(it => it.type === tab);
}

function openShop(ret, tab) {
  shopReturn = ret;
  shopTab = tab || 0;
  garageSel = Math.max(0, Math.min(garageMax, ret === 'game' ? vehicleTier : garageMax) - 1);
  shopIndex = SHOP_TABS[shopTab].id === 'garage' ? garageSel : 0;
  bullets = [];
  state = ST_SHOP;
}

function shopMove(dir) {
  const rows = shopRows();
  shopIndex = (shopIndex + dir + rows.length) % rows.length;
  if (rows[shopIndex].garage) garageSel = shopIndex;
  AudioSys.tone(500, 0.04, 'square', 0.03);
}

function shopTabMove(dir) {
  shopTab = (shopTab + dir + SHOP_TABS.length) % SHOP_TABS.length;
  shopIndex = SHOP_TABS[shopTab].id === 'garage' ? garageSel : 0;
  AudioSys.tone(420, 0.05, 'square', 0.03);
}

function shopAction() {
  const it = shopRows()[shopIndex];
  if (!it || it.garage) return;
  const click = () => AudioSys.tone(700, 0.08, 'square', 0.05);
  if (!owned.includes(it.id)) {
    if (credits < it.price) { AudioSys.error(); return; }
    credits -= it.price;
    owned.push(it.id);
    if (it.type === 'skin') equipped.skin = it.id;
    if (it.type === 'acc') equipped.acc = it.id;
    if (it.type === 'fx') fxOn.push(it.id);
    AudioSys.word(4);
  } else if (it.type === 'skin') {
    equipped.skin = it.id;
    click();
  } else if (it.type === 'acc') {
    equipped.acc = equipped.acc === it.id ? null : it.id;
    click();
  } else {
    fxOn = fxOn.includes(it.id) ? fxOn.filter(id => id !== it.id) : fxOn.concat(it.id);
    click();
  }
  saveMeta();
}

function closeShop() {
  bullets = [];
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

const turret = { x: 0, y: 0, angle: -Math.PI / 3, targetAngle: -Math.PI / 3, recoil: 0, lastShot: -9 };

// ===================== VÉHICULES =====================
let vehicleTier = 1;
let worldSpeed = 0.35;        // vitesse de défilement du décor (dépend du véhicule)
let travel = 0;               // distance parcourue, en cellules du véhicule (anime roues et jambes)
let vehMeta = null;           // géométrie du dernier véhicule dessiné (point d'attache de l'arme…)
let evo = null;               // animation d'évolution en cours
const EVO_FLASH = 1.8, EVO_DUR = 3.8;
let marks = [], markAcc = 0;  // traces arc-en-ciel au sol

// les modes enfants évoluent toutes les 2 vagues, les autres à chaque manche
function tierForWave(w) {
  const per = DIFFS[diffIndex].pool === 'full' ? WAVES_PER_MANCHE : 2;
  return Math.min(V.list.length, Math.floor((w - 1) / per) + 1);
}
function displayTier() {
  if (state === ST_SHOP) return garageSel + 1;
  return state === ST_TITLE ? garageMax : vehicleTier;
}
function vu() { return Math.max(2, Math.round(PX * 0.9)); } // taille d'une cellule de véhicule
function groundSpeedPx() { return 34 * worldSpeed * PX; }

function startEvolution(from, to) {
  evo = { from, to, t: 0, burst: false };
  garageMax = Math.max(garageMax, to);
  saveMeta();
  AudioSys.evolve();
}

// ===================== EFFETS DE RENDU =====================
let rings = [];               // ondes de choc
let hitStop = 0;              // micro-pause à la destruction d'un mot
let camX = 0, camY = 0;       // recul de caméra orienté

function addRing(x, y, maxR, col, dur) { rings.push({ x, y, maxR, col, t: 0, dur: dur || 0.45 }); }
function camKick(dx, dy, amt) { camX += dx * amt; camY += dy * amt; }

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

function waveWordCount(w) { return Math.max(3, Math.round((5 + w * 2) * DIFFS[diffIndex].countMul)); }
function waveFallTime(w) { return Math.max(6, 19 - w * 1.5) * DIFFS[diffIndex].fallMul; }
function waveSpawnGap(w) { return Math.max(1.0, 3.4 - w * 0.22) * DIFFS[diffIndex].gapMul; }

function startGame() {
  score = 0; combo = 0; lives = DIFFS[diffIndex].lives; waveNum = 0;
  best = loadBest();
  words = []; bullets = []; particles = []; popups = [];
  activeWord = null; gameT = 0;
  stats = { typed: 0, errors: 0, wordsDone: 0, bestCombo: 0 };
  inventory = { rewind: 1, boomerang: 1 }; // on démarre avec 1 de chaque
  queuedWord = null; previewWord = ''; previewTimer = 0; rewindFlash = 0;
  playT = 0; keyLog = []; peakMpm = 0;
  vehicleTier = 1; evo = null; rings = []; marks = [];
  nextWave();
}

function nextWave() {
  waveNum++;
  palTarget = PALETTES[(waveNum - 1) % PALETTES.length];
  toSpawn = waveWordCount(waveNum);
  spawnTimer = 1.2;
  state = ST_BREAK;
  breakTimer = 2.4;
  const nt = tierForWave(waveNum);
  if (nt > vehicleTier) {
    startEvolution(vehicleTier, nt);
    vehicleTier = nt;
    breakTimer = EVO_DUR;
  } else {
    AudioSys.wave();
  }
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
const BALL_COLORS = ['#ff5d8f', '#ffd93b', '#7ad9ff', '#7affc0', '#d38bff', '#ff8c42'];

// tir depuis la bouche de l'arme du véhicule vers (tx, ty) ; word = null pour les démos de la boutique
function shootFrom(anchorX, anchorY, u, meta, tier, tx, ty, word, index) {
  const def = V.list[tier - 1];
  const mount = meta ? meta.mount : [0, -15];
  const px = anchorX + (mount[0] + 0.5) * u, py = anchorY + (mount[1] + 0.5) * u;
  const dx = tx - px, dy = ty - py;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const ml = Math.min(dist * 0.5, def.muzzle * u);
  const mx = px + ux * ml, my = py + uy * ml;
  const speed = Math.max(1400, dist * 4) * (def.proj === 'roquette' ? 0.8 : 1);
  bullets.push({
    x: mx, y: my, vx: ux * speed, vy: uy * speed,
    word, index, resetCount: word ? word.resetCount : 0,
    life: (dist - ml) / speed + 0.02,
    style: def.proj, col: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
  });
  spawnParticles(mx, my, 3, '#ffe97a', 120, 0.15);
  return { ux, uy, kick: def.kick };
}

function fireAt(word, index) {
  const p = letterPos(word, index);
  const s = shootFrom(turret.x, turret.y, vu(), vehMeta, vehicleTier, p.x, p.y, word, index);
  turret.targetAngle = Math.atan2(s.uy, s.ux);
  turret.recoil = 1;
  turret.lastShot = gameT;
  camKick(-s.ux, -s.uy, s.kick * 1.2);
  AudioSys.shoot(V.list[vehicleTier - 1].proj);
}

// éclats de lettre qui rebondissent au sol puis glissent avec le décor
function spawnShards(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 160,
      life: 1.4 + Math.random() * 0.6, maxLife: 2, color, size: 1, grav: 900, bounce: true,
    });
  }
}

function spawnConfetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = 160 + Math.random() * 220;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 1.2 + Math.random() * 0.8, maxLife: 2,
      color: BALL_COLORS[i % BALL_COLORS.length], size: 2, grav: 260, conf: true, ph: Math.random() * 6,
    });
  }
}

// impact d'un projectile, selon l'arme
function impactFx(x, y, style, onLetter) {
  if (style === 'eau') {
    spawnParticles(x, y, 14, '#7ad9ff', 200, 0.4, true);
    spawnParticles(x, y, 6, '#e6f7ff', 140, 0.3);
  } else if (style === 'balle') {
    spawnParticles(x, y, 12, BALL_COLORS[Math.floor(Math.random() * 6)], 200, 0.4);
  } else if (style === 'confetti') {
    spawnConfetti(x, y, 10);
  } else if (style === 'laser' || style === 'laser2') {
    spawnParticles(x, y, 12, style === 'laser' ? '#ff5d8f' : '#7ad9ff', 240, 0.3);
    spawnParticles(x, y, 4, '#ffffff', 160, 0.2);
  } else if (style === 'roquette') {
    spawnParticles(x, y, 16, '#ff8c42', 240, 0.45);
    spawnParticles(x, y, 8, '#9aa7c7', 90, 0.7);
    addRing(x, y, 26, '#ffd93b', 0.3);
  } else if (style === 'plasma') {
    spawnParticles(x, y, 18, '#7affc0', 230, 0.45);
    addRing(x, y, 30, '#7affc0', 0.35);
  } else if (style === 'obus') {
    spawnParticles(x, y, 22, '#ff8c42', 300, 0.5);
    spawnParticles(x, y, 10, '#ffd93b', 200, 0.4);
    addRing(x, y, 44, '#fff3b0', 0.4);
    shake(4);
  } else {
    spawnParticles(x, y, 12, '#ffd93b', 180, 0.4);
    spawnParticles(x, y, 6, '#ff8c42', 220, 0.3);
  }
  if (onLetter) spawnShards(x, y, 4, '#f2f5ff');
  if (fxActive('fx_etoiles')) spawnStars(x, y, 3);
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
  const r = Math.random() / DIFFS[diffIndex].dropMul;
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
    if (e.key === 'ArrowUp') shopMove(-1);
    else if (e.key === 'ArrowDown') shopMove(1);
    else if (e.key === 'ArrowLeft') shopTabMove(-1);
    else if (e.key === 'ArrowRight') shopTabMove(1);
    else if (e.key === 'Enter') shopAction();
    else if (e.key === 'Escape') closeShop();
    e.preventDefault();
    return;
  }

  if (state === ST_TITLE || state === ST_OVER) {
    if (e.key === 'Enter') { startGame(); }
    else if (e.key === 'b' || e.key === 'B') { lastGain = 0; openShop('title', 0); }
    else if (e.key === 'g' || e.key === 'G') { lastGain = 0; openShop('title', 3); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      diffIndex = (diffIndex + dir + DIFFS.length) % DIFFS.length;
      saveJSON('typerider.diff', diffIndex);
      best = loadBest();
      AudioSys.tone(520 + diffIndex * 90, 0.06, 'square', 0.04);
      if (state === ST_OVER) state = ST_TITLE; // retour au menu pour changer de mode
    }
    else if (e.key === 'Escape' && state === ST_OVER) { state = ST_TITLE; }
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

  // arme : vise la cible, puis revient en position de repos
  if (gameT - turret.lastShot > 1.2) turret.targetAngle = -Math.PI / 5 + Math.sin(gameT * 0.7) * 0.12;
  let da = turret.targetAngle - turret.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  turret.angle += da * Math.min(1, dt * 18);
  turret.recoil = Math.max(0, turret.recoil - dt * 6);
  turret.x = W / 2;
  turret.y = groundY + 3 * PX;

  // vitesse du monde : on avance plus vite avec un meilleur véhicule
  const tdef = V.list[displayTier() - 1];
  if (!evo || evo.t > EVO_FLASH) worldSpeed += (tdef.speed - worldSpeed) * Math.min(1, dt * 1.5);
  const gsp = groundSpeedPx();
  travel += dt * gsp / vu();
  camX *= Math.exp(-dt * 14);
  camY *= Math.exp(-dt * 14);

  // évolution du véhicule
  if (evo) {
    evo.t += dt;
    if (!evo.burst && evo.t >= EVO_FLASH) {
      evo.burst = true;
      const cy = turret.y - 14 * vu();
      spawnParticles(turret.x, cy, 50, '#fff3b0', 340, 0.9, true);
      spawnParticles(turret.x, cy, 30, '#7ad9ff', 280, 0.8, true);
      spawnConfetti(turret.x, cy, 24);
      addRing(turret.x, cy, 160, '#ffffff', 0.6);
      addRing(turret.x, cy, 100, '#ffe97a', 0.45);
      shake(6);
      AudioSys.word(8);
    }
    if (evo.t >= EVO_DUR) evo = null;
  }

  // particules liées au véhicule (échappement, poussière, effets de la bibliothèque)
  if (vehMeta && state !== ST_SHOP && state !== ST_OVER) vehicleParticles(dt, vehMeta, gsp);
  for (let i = marks.length - 1; i >= 0; i--) {
    marks[i].x -= gsp * dt;
    if (marks[i].x < -20) marks.splice(i, 1);
  }

  // particules
  const restY = groundY + 2 * PX;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    if (p.rest) { p.x -= gsp * dt; continue; }
    p.vy += p.grav * dt;
    if (p.conf) p.vx += Math.sin(gameT * 9 + p.ph) * 400 * dt - p.vx * 1.5 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.bounce && p.y >= restY && p.vy > 0) {
      p.y = restY;
      p.vy *= -0.38;
      p.vx *= 0.55;
      if (Math.abs(p.vy) < 40) p.rest = true;
    }
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].t += dt;
    if (rings[i].t >= rings[i].dur) rings.splice(i, 1);
  }
  // popups
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.life -= dt;
    p.y -= 30 * dt;
    if (p.life <= 0) popups.splice(i, 1);
  }
  // balles
  const comet = fxActive('fx_comete');
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
    if (b.style === 'roquette' && Math.random() < 0.7) {
      particles.push({
        x: b.x, y: b.y, vx: -b.vx * 0.05, vy: -b.vy * 0.05,
        life: 0.4, maxLife: 0.4, color: '#c9cfdd', size: 2, grav: -40,
      });
    }
    if (b.life <= 0) {
      bullets.splice(i, 1);
      const w = b.word;
      if (!w) {
        impactFx(b.x, b.y, b.style, false); // tir de démonstration (boutique)
      } else if (words.indexOf(w) !== -1 && b.resetCount === w.resetCount) {
        w.letters[b.index].gone = true;
        const p = letterPos(w, b.index);
        impactFx(p.x, p.y, b.style, true);
        AudioSys.hit();
        // mot entièrement détruit → feu d'artifice, onde de choc, micro-pause
        if (w.dying && w.letters.every(l => l.gone)) {
          words.splice(words.indexOf(w), 1);
          const c = letterPos(w, (w.text.length - 1) / 2);
          spawnParticles(c.x, c.y, 30, '#7affc0', 260, 0.7, true);
          spawnParticles(c.x, c.y, 20, '#7ad9ff', 220, 0.6, true);
          addRing(c.x, c.y, 50 + w.text.length * 8, '#ffffff', 0.45);
          if (fxActive('fx_confettis')) spawnConfetti(c.x, c.y, 28);
          const d = Math.hypot(b.vx, b.vy) || 1;
          camKick(b.vx / d, b.vy / d, 5);
          shake(3);
          hitStop = 0.06;
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
          saveJSON('typerider.best.' + DIFFS[diffIndex].id, best);
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
      openShop('game', 0);
      AudioSys.wave();
    } else {
      addPopup(W / 2, H * 0.4, 'VAGUE ' + waveNum + ' TERMINEE +' + (100 * waveNum), '#7affc0', 3);
      nextWave();
    }
  }
}

// ===================== RENDU : VÉHICULE =====================
function vehicleOpts(extra) {
  return Object.assign({
    t: gameT, travel, angle: turret.angle, recoil: turret.recoil,
    skin: equipped.skin, acc: equipped.acc, white: 0, dark: false,
  }, extra);
}

function drawAura(x, y, u, def) {
  const cy = y - def.h * u * 0.5, r = Math.max(def.halfW, def.h) * u;
  const a = 0.22 + 0.1 * Math.sin(gameT * 4);
  const gr = ctx.createRadialGradient(x, cy, r * 0.1, x, cy, r);
  gr.addColorStop(0, 'rgba(255,217,59,' + a + ')');
  gr.addColorStop(1, 'rgba(255,217,59,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.fillRect(x - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.fillStyle = '#fff3b0';
  for (let k = 0; k < 6; k++) {
    const ang = gameT * 1.6 + k * Math.PI / 3;
    ctx.fillRect(Math.round(x + Math.cos(ang) * r * 0.8), Math.round(cy + Math.sin(ang) * r * 0.45), u, u);
  }
}

function drawNeon(x, y, u, def) {
  const col = V.SKINS[equipped.skin].g;
  const x0 = x - def.halfW * u;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const ly = Math.round(y - (2 + k * 4) * u);
    const len = 160 + k * 40 + Math.sin(gameT * 9 + k) * 20;
    const gr = ctx.createLinearGradient(x0, 0, x0 - len, 0);
    gr.addColorStop(0, hexToRgba(col, 0.7));
    gr.addColorStop(1, hexToRgba(col, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x0 - len, ly, len, u);
  }
  ctx.restore();
}

function drawHeadlight(m) {
  const a = Math.min(1, (pal.starA - 0.3) / 0.5);
  if (a <= 0) return;
  const hx = m.x + m.headlight[0] * m.u, hy = m.y + m.headlight[1] * m.u;
  const len = 240;
  const gr = ctx.createLinearGradient(hx, 0, hx + len, 0);
  gr.addColorStop(0, 'rgba(255,243,176,' + (0.35 * a) + ')');
  gr.addColorStop(1, 'rgba(255,243,176,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 2);
  ctx.lineTo(hx + len, hy - 44);
  ctx.lineTo(hx + len, hy + 30);
  ctx.lineTo(hx, hy + 3);
  ctx.fill();
  ctx.restore();
}

function drawVehicleAt(tier, x, y, u, o) {
  const def = V.list[tier - 1];
  if (!o.dark) {
    if (fxActive('fx_aura')) drawAura(x, y, u, def);
    if (fxActive('fx_neon')) drawNeon(x, y, u, def);
  }
  const m = V.render(tier, o);
  ctx.drawImage(m.canvas, Math.round(x - V.AX * u), Math.round(y - V.AY * u), V.CW * u, V.CH * u);
  m.x = x; m.y = y; m.u = u; m.tier = tier;
  if (!o.dark && m.headlight) drawHeadlight(m);
  return m;
}

function drawVehicle() {
  let tier = displayTier(), white = 0;
  if (evo && evo.t < EVO_FLASH) {
    // l'ancien et le nouveau véhicule alternent de plus en plus vite, en silhouette blanche
    tier = Math.sin(evo.t * evo.t * 9) > 0 ? evo.to : evo.from;
    white = 0.3 + 0.65 * (evo.t / EVO_FLASH);
  }
  vehMeta = drawVehicleAt(tier, turret.x, turret.y, vu(), vehicleOpts({ white }));
}

function vehicleParticles(dt, m, gsp, preview) {
  const u = m.u;
  if (m.exhaust && Math.random() < dt * 14) {
    particles.push({
      x: m.x + m.exhaust[0] * u, y: m.y + m.exhaust[1] * u,
      vx: -gsp * 0.35 - 20 - Math.random() * 20, vy: -20 - Math.random() * 25,
      life: 0.9, maxLife: 0.9, color: '#cfd6e6', size: 2, grav: -30,
    });
  }
  const contacts = m.contacts || [];
  if (m.tier >= 2 && contacts.length && Math.random() < dt * 10) {
    particles.push({
      x: m.x + (contacts[0][0] - 3) * u, y: m.y - u,
      vx: -gsp * 0.5 - Math.random() * 30, vy: -30 - Math.random() * 40,
      life: 0.6, maxLife: 0.6, color: shadeColor(pal.ground, 'light'), size: 1, grav: 60,
    });
  }
  if (fxActive('fx_etincelles')) {
    for (const c of contacts) {
      if (Math.random() > dt * 22) continue;
      particles.push({
        x: m.x + c[0] * u, y: m.y - u,
        vx: -gsp * (0.3 + Math.random() * 0.6), vy: -60 - Math.random() * 120,
        life: 0.35, maxLife: 0.35, color: ['#ffd93b', '#ff8c42', '#fff3b0'][Math.floor(Math.random() * 3)],
        size: 1, grav: 500,
      });
    }
  }
  if (!preview && fxActive('fx_traces')) {
    markAcc += gsp * dt;
    if (markAcc > 10) {
      markAcc = 0;
      marks.push({ x: m.x + (contacts.length ? contacts[0][0] : -3) * u, hue: (gameT * 160) % 360 });
    }
  }
}

function drawMarks() {
  const y = groundY + 2 * PX;
  for (const mk of marks) {
    ctx.globalAlpha = Math.max(0, Math.min(1, mk.x / (W * 0.4)));
    ctx.fillStyle = 'hsl(' + mk.hue + ',90%,65%)';
    ctx.fillRect(Math.round(mk.x), y, 2 * PX, PX);
  }
  ctx.globalAlpha = 1;
}

function drawRings() {
  for (const r of rings) {
    const k = r.t / r.dur;
    const rad = r.maxR * (1 - Math.pow(1 - k, 3));
    const n = Math.max(12, Math.round(rad * 2 * Math.PI / (PX * 1.4)));
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = r.col;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ctx.fillRect(Math.round((r.x + Math.cos(a) * rad) / PX) * PX,
                   Math.round((r.y + Math.sin(a) * rad) / PX) * PX, PX, PX);
    }
  }
  ctx.globalAlpha = 1;
}

function drawEvolutionBanner() {
  if (!evo) return;
  const y = Math.round(H * 0.16);
  if (evo.t < EVO_FLASH) {
    if (Math.sin(gameT * 14) > -0.2) {
      drawPixelTextOutline(ctx, 'EVOLUTION !', W / 2, y, 4, '#fff3b0', '#101528', 'center');
    }
    return;
  }
  const def = V.list[evo.to - 1];
  const a = Math.min(1, (EVO_DUR - evo.t) * 2);
  ctx.globalAlpha = a;
  drawPixelTextOutline(ctx, 'NOUVEAU VEHICULE !', W / 2, y, 3, '#ffd93b', '#101528', 'center');
  drawPixelTextOutline(ctx, def.name, W / 2, y + 34, 6, '#7affc0', '#101528', 'center');
  drawPixelTextOutline(ctx, 'ARME : ' + def.weapon, W / 2, y + 88, 2, '#dfe6ff', '#101528', 'center');
  ctx.globalAlpha = 1;
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

// apparence de chaque projectile : [cœur, couleur, traînée, taille relative]
const PROJ_LOOK = {
  caillou:  ['#d7dce8', '#8a93a8', 'rgba(200,205,220,0.35)', 1.6],
  eau:      ['#e6f7ff', '#4fb4ff', 'rgba(122,217,255,0.5)', 1.8],
  balle:    ['#ffffff', null, 'rgba(255,255,255,0.35)', 2],
  confetti: ['#fff7cf', '#ff5d8f', 'rgba(255,93,143,0.45)', 1.8],
  laser:    ['#ffffff', '#ff5d8f', 'rgba(255,93,143,0.7)', 1.2],
  laser2:   ['#ffffff', '#7ad9ff', 'rgba(122,217,255,0.7)', 1.2],
  roquette: ['#ffd93b', '#ff5d3d', 'rgba(255,140,66,0.6)', 1.8],
  plasma:   ['#e8fff4', '#7affc0', 'rgba(122,255,192,0.6)', 2.6],
  obus:     ['#fff3b0', '#ff8c42', 'rgba(255,200,120,0.7)', 2.4],
};

function drawBullet(b) {
  const look = PROJ_LOOK[b.style] || PROJ_LOOK.caillou;
  const rainbow = fxActive('fx_arc');
  const hue = (gameT * 420 + b.x * 0.7) % 360;
  const d = Math.hypot(b.vx, b.vy) || 1;
  const tx = b.vx / d, ty = b.vy / d;
  const q = Math.max(2, PX - 1);
  const s = Math.round(q * look[3]);
  const body = rainbow ? 'hsl(' + hue + ',90%,62%)' : (look[1] || b.col);
  const core = rainbow ? 'hsl(' + ((hue + 40) % 360) + ',95%,85%)' : look[0];
  const long = b.style === 'laser' || b.style === 'laser2';
  const tlen = (fxActive('fx_comete') ? 64 : 26) + (long ? 20 : 0);
  const lanes = b.style === 'laser2' ? [-1.5, 1.5] : [0];
  for (const lane of lanes) {
    const ox = -ty * lane * q, oy = tx * lane * q;
    const x = b.x + ox, y = b.y + oy;
    ctx.strokeStyle = rainbow ? 'hsla(' + hue + ',90%,65%,0.55)' : look[2];
    ctx.lineWidth = long ? q : 2;
    ctx.beginPath();
    ctx.moveTo(x - tx * tlen, y - ty * tlen);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (b.style === 'plasma') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(122,255,192,0.25)';
      ctx.fillRect(Math.round(x) - s * 2, Math.round(y) - s * 2, s * 4, s * 4);
      ctx.restore();
    }
    ctx.fillStyle = body;
    ctx.fillRect(Math.round(x - s / 2) - 1, Math.round(y - s / 2) - 1, s + 2, s + 2);
    ctx.fillStyle = core;
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.max(2, s - 1), Math.max(2, s - 1));
  }
}

function drawBullets() {
  for (const b of bullets) drawBullet(b);
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
    } else if (p.conf) {
      // confetti qui tournoie : sa largeur apparente oscille
      const cw = Math.max(1, Math.round(s * Math.abs(Math.sin(gameT * 10 + p.ph))));
      ctx.fillRect(px - Math.round(cw / 2), py - Math.round(s / 2), cw, s);
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
  let ox = camX, oy = camY;
  if (shakeAmp > 0) {
    ox += (Math.random() - 0.5) * shakeAmp * 2;
    oy += (Math.random() - 0.5) * shakeAmp * 2;
  }
  ctx.translate(Math.round(ox), Math.round(oy));

  drawBackground(state === ST_PAUSE ? 0 : dt);

  if (state === ST_SHOP) {
    drawForeground();
    drawShop(dt);
    ctx.restore();
    return;
  }

  if (state === ST_TITLE) {
    drawMarks();
    drawVehicle();
    drawForeground();
    drawParticles();
    drawTitle();
    ctx.restore();
    return;
  }

  drawMarks();
  if (state !== ST_OVER) drawWords();
  drawBullets();
  drawVehicle();
  drawForeground();
  drawParticles();
  drawRings();
  drawPopups();
  drawHUD();
  drawEvolutionBanner();

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
      { text: 'MODE ' + DIFFS[diffIndex].name + '  -  NIVEAU ' + niveauCourant() + ' - VAGUE ' + ((waveNum - 1) % WAVES_PER_MANCHE + 1) + '/' + WAVES_PER_MANCHE, scale: 2, color: DIFFS[diffIndex].color, gap: 10 },
      { text: waveNum === 1 ? 'TAPEZ LES MOTS AVANT L\'IMPACT !' : 'PLUS VITE, PLUS NOMBREUX...', scale: 2, color: '#dfe6ff', gap: 8 },
      { text: blink ? 'PREPAREZ-VOUS' : ' ', scale: 2, color: '#7ad9ff', gap: 0 },
    ]);
  } else if (state === ST_PAUSE) {
    drawCenteredPanel([
      { text: 'PAUSE', scale: 6, color: '#7ad9ff', gap: 20 },
      { text: 'ECHAP OU ENTREE POUR REPRENDRE', scale: 2, color: '#dfe6ff', gap: 0 },
    ]);
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
      { text: Math.sin(gameT * 4) > -0.3 ? 'ENTREE POUR REJOUER' : ' ', scale: 3, color: '#7affc0', gap: 12 },
      { text: 'ECHAP : MENU (CHANGER DE DIFFICULTE)', scale: 2, color: '#9fb3e8', gap: 0 },
    ]);
  }

  ctx.restore();
}

// ===================== BOUTIQUE (rendu) =====================
function shopRowStatus(it) {
  if (it.garage) {
    return it.i < garageMax ? [it.v.weapon, '#9fb3e8'] : ['NIVEAU ' + (it.i + 1), '#ff6b6b'];
  }
  if (!owned.includes(it.id)) return [it.price + ' CR', credits >= it.price ? '#ffd93b' : '#ff6b6b'];
  if (it.type === 'skin') return equipped.skin === it.id ? ['EQUIPE', '#7affc0'] : ['ACHETE', '#9fb3e8'];
  if (it.type === 'acc') return equipped.acc === it.id ? ['EQUIPE', '#7affc0'] : ['ACHETE', '#9fb3e8'];
  return fxOn.includes(it.id) ? ['ACTIF', '#7affc0'] : ['INACTIF', '#9fb3e8'];
}

// aperçu animé : le véhicule roule et tire, avec couleurs, accessoire et effets actifs
function drawShopPreview(x, y, w, h, dt) {
  const tier = garageSel + 1;
  const locked = tier > garageMax;
  ctx.fillStyle = 'rgba(122,217,255,0.06)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(159,179,232,0.35)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);

  const u = vu();
  const gy = y + h - 30;
  ctx.fillStyle = pal.grass;
  ctx.fillRect(x + 2, gy, w - 4, 6);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(x + 2, gy + 6, w - 4, 22);
  ctx.fillStyle = shadeColor(pal.ground, 'light');
  const off = (travel * u) % 48;
  for (let px = x + w - 6 - off; px > x + 4; px -= 48) ctx.fillRect(Math.round(px), gy + 14, 2 * PX, PX);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - 4);
  ctx.clip();
  const ax = x + w / 2, ay = gy + 2;
  const m = drawVehicleAt(tier, ax, ay, u, vehicleOpts({ dark: locked }));
  if (!locked) {
    vehicleParticles(dt, m, groundSpeedPx(), true);
    previewShotT -= dt;
    if (previewShotT <= 0) {
      previewShotT = 0.9;
      const s = shootFrom(ax, ay, u, m, tier, x + 40 + Math.random() * (w - 80), y + 16 + Math.random() * 50, null, 0);
      turret.targetAngle = Math.atan2(s.uy, s.ux);
      turret.recoil = 1;
      turret.lastShot = gameT;
    }
  }
  drawBullets();
  drawParticles();
  drawRings();
  ctx.restore();

  const def = V.list[tier - 1];
  drawPixelTextOutline(ctx, locked ? 'VEHICULE VERROUILLE' : def.name, x + w / 2, y + h + 12, 3,
    locked ? '#ff6b6b' : '#7affc0', '#101528', 'center');
  drawPixelTextOutline(ctx, locked ? 'ATTEIGNEZ LE NIVEAU ' + tier : 'ARME : ' + def.weapon, x + w / 2, y + h + 42, 2,
    '#dfe6ff', '#101528', 'center');
}

function drawShop(dt) {
  ctx.fillStyle = 'rgba(6,9,22,0.85)';
  ctx.fillRect(0, 0, W, H);

  let y = Math.max(16, Math.round(H * 0.04));
  drawPixelTextOutline(ctx, 'BOUTIQUE', W / 2, y, 5, '#ffd93b', '#101528', 'center');
  y += 48;
  if (shopReturn === 'game' && lastGain > 0) {
    drawPixelTextOutline(ctx, 'NIVEAU ' + lastNiveau + ' ATTEINT !  +' + lastGain + ' CREDITS', W / 2, y, 2, '#7affc0', '#101528', 'center');
    y += 24;
  }
  drawPixelTextOutline(ctx, 'CREDITS : ' + credits, W / 2, y, 3, '#ffd93b', '#101528', 'center');
  y += 40;

  // onglets
  const tabW = SHOP_TABS.map(t => textWidth(t.name, 2) + 28);
  const total = tabW.reduce((a, b) => a + b, 0) + (SHOP_TABS.length - 1) * 8;
  let tx = Math.round(W / 2 - total / 2);
  SHOP_TABS.forEach((t, i) => {
    const on = i === shopTab;
    ctx.fillStyle = on ? 'rgba(255,217,59,0.18)' : 'rgba(122,217,255,0.06)';
    ctx.fillRect(tx, y - 8, tabW[i], 30);
    ctx.fillStyle = on ? '#ffd93b' : 'rgba(159,179,232,0.4)';
    ctx.fillRect(tx, y + 20, tabW[i], 2);
    drawPixelTextOutline(ctx, t.name, tx + tabW[i] / 2, y, 2, on ? '#ffffff' : '#9fb3e8', '#101528', 'center');
    tx += tabW[i] + 8;
  });
  y += 46;

  // liste à gauche, aperçu à droite (empilés si l'écran est étroit)
  const wide = W >= 720;
  const colW = wide ? Math.min(380, W / 2 - 30) : W - 40;
  const listL = wide ? W / 2 - 10 - colW + 12 : 32;
  const listR = wide ? W / 2 - 10 : W - 20;
  const pvH = 220;
  drawShopPreview(wide ? W / 2 + 10 : 20, y, colW, pvH, dt);
  const listY = wide ? y + 8 : y + pvH + 76;

  const rows = shopRows();
  const entries = [];
  let sub = null, yy = 0;
  rows.forEach((it, i) => {
    if (it.sub && it.sub !== sub) {
      sub = it.sub;
      entries.push({ hdr: sub, y: yy + (yy ? 6 : 0) });
      yy += yy ? 32 : 26;
    }
    entries.push({ it, i, y: yy });
    yy += 24;
  });
  // défilement pour garder la ligne choisie visible
  const avail = H - 70 - listY;
  const selE = entries.find(e => e.i === shopIndex);
  const scroll = selE && selE.y + 24 > avail ? selE.y + 24 - avail : 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(listL - 16, listY - 8, listR - listL + 28, Math.max(0, avail + 8));
  ctx.clip();
  for (const e of entries) {
    const ey = listY + e.y - scroll;
    if (e.hdr) {
      drawPixelTextOutline(ctx, e.hdr, listL, ey, 2, '#ffb347', '#101528');
      continue;
    }
    const it = e.it, sel = e.i === shopIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(122,217,255,0.14)';
      ctx.fillRect(listL - 12, ey - 5, listR - listL + 20, 24);
      drawPixelText(ctx, '>', listL - 6, ey, 2, '#7ad9ff');
    }
    const name = it.garage ? (it.i + 1) + ' ' + (it.i < garageMax ? it.v.name : '?????') : it.name;
    const st = shopRowStatus(it);
    drawPixelTextOutline(ctx, name, listL + 12, ey, 2, sel ? '#ffffff' : '#dfe6ff', '#101528');
    drawPixelTextOutline(ctx, st[0], listR, ey, 2, st[1], '#101528', 'right');
  }
  ctx.restore();

  const tab = SHOP_TABS[shopTab].id;
  const hint = tab === 'garage' ? 'HAUT/BAS : VOIR UN VEHICULE'
    : 'ENTREE : ' + (tab === 'fx' ? 'ACHETER / ACTIVER' : 'ACHETER / EQUIPER');
  drawPixelTextOutline(ctx, 'GAUCHE/DROITE : ONGLET   ' + hint, W / 2, H - 54, 2, '#dfe6ff', '#101528', 'center');
  drawPixelTextOutline(ctx, 'ECHAP : ' + (shopReturn === 'game' ? 'CONTINUER LA PARTIE' : 'RETOUR AU TITRE'),
    W / 2, H - 32, 2, '#7ad9ff', '#101528', 'center');
}

function drawTitle() {
  const cy = H * 0.19;
  const bob = Math.sin(gameT * 1.5) * 6;
  // logo
  drawPixelTextOutline(ctx, 'TYPE', W / 2 - 10, cy - 40 + bob, 9, '#ffe97a', '#101528', 'right');
  drawPixelTextOutline(ctx, 'RIDER', W / 2 + 10, cy - 40 + bob, 9, '#7ad9ff', '#101528', 'left');
  drawPixelTextOutline(ctx, 'TAPE OU COULE !', W / 2, cy + 42 + bob, 2, '#ff5d8f', '#101528', 'center');

  // mot de démonstration qui tombe
  const demoY = cy + 80 + Math.sin(gameT * 0.8) * 8;
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
    'UNE LETTRE JUSTE = UN TIR, UNE ERREUR = ON REPREND LE MOT',
    'ENCHAINEZ SANS FAUTE POUR MULTIPLIER LE SCORE',
    'BONUS : 1 = REMONTE-TEMPS   2 = BOOMERANG DU FUTUR',
    'CHAQUE NIVEAU FAIT EVOLUER VOTRE VEHICULE, JUSQU\'AU CHAR !',
  ];
  // mise en page fluide sous les règles (évite tout chevauchement)
  let ry = demoY + 56;
  for (const r of rules) {
    drawPixelTextOutline(ctx, r, W / 2, ry, 2, '#dfe6ff', '#101528', 'center');
    ry += 24;
  }

  // sélecteur de difficulté
  const d = DIFFS[diffIndex];
  ry += 12;
  drawPixelTextOutline(ctx, 'DIFFICULTE', W / 2, ry, 2, '#9fb3e8', '#101528', 'center');
  ry += 22;
  const arrows = Math.sin(gameT * 5) > 0 ? 2 : 0;
  drawPixelTextOutline(ctx, '<', W / 2 - textWidth(d.name, 3) / 2 - 30 - arrows, ry, 3, '#dfe6ff', '#101528', 'center');
  drawPixelTextOutline(ctx, d.name, W / 2, ry, 3, d.color, '#101528', 'center');
  drawPixelTextOutline(ctx, '>', W / 2 + textWidth(d.name, 3) / 2 + 30 + arrows, ry, 3, '#dfe6ff', '#101528', 'center');
  ry += 28;
  drawPixelTextOutline(ctx, d.desc, W / 2, ry, 2, '#dfe6ff', '#101528', 'center');
  ry += 32;

  if (Math.sin(gameT * 4) > -0.3) {
    drawPixelTextOutline(ctx, 'APPUYEZ SUR ENTREE', W / 2, ry, 4, '#7affc0', '#101528', 'center');
  }
  ry += 40;
  drawPixelTextOutline(ctx, 'FLECHES : DIFFICULTE   B : BOUTIQUE   G : GARAGE', W / 2, ry, 2, '#9fb3e8', '#101528', 'center');
  ry += 22;
  drawPixelTextOutline(ctx, 'ECHAP : PAUSE   F2 : SON', W / 2, ry, 2, '#9fb3e8', '#101528', 'center');
  ry += 24;
  const meta = [];
  if (best > 0) meta.push('MEILLEUR (' + DIFFS[diffIndex].name + ') ' + best);
  meta.push('CREDITS ' + credits);
  drawPixelTextOutline(ctx, meta.join('   '), W / 2, ry, 2, '#ffe97a', '#101528', 'center');
}

// ===================== BOUCLE PRINCIPALE =====================
let lastT = 0;
function frame(t) {
  let dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (hitStop > 0) { hitStop -= dt; dt *= 0.08; }
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
  get tier() { return vehicleTier; },
  get evo() { return evo ? { from: evo.from, to: evo.to, t: evo.t } : null; },
  get garage() { return garageMax; },
  get worldSpeed() { return worldSpeed; },
  giveCredits(n) { credits += n; saveMeta(); },
  setTier(n) { vehicleTier = n; garageMax = Math.max(garageMax, n); },
  step(sec) {
    const dt = 1 / 60;
    for (let i = 0; i < sec * 60; i++) { if (state !== ST_PAUSE) update(dt); draw(dt); }
  },
  shop(tab) { openShop('title', tab || 0); },
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
