// Génère build/icon.png (512 x 512) et les icônes web (icons/icon-180.png pour l'iPhone, icons/icon-192.png) :
// même dessin que favicon.svg, agrandi en pixels nets.
// Encodeur PNG minimal, sans dépendance : node tools/make-icon.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GRID = 16;
const rects = [
  [0, 0, 16, 16, '#0a0e2a'],
  [0, 12, 16, 4, '#5ad24f'],
  [0, 14, 16, 2, '#8a5a33'],
  [2, 2, 7, 2, '#ffe97a'], [4, 4, 3, 7, '#ffe97a'],                       // T
  [9, 5, 2, 7, '#7ad9ff'], [11, 5, 3, 1, '#7ad9ff'], [13, 6, 1, 2, '#7ad9ff'], // R
  [11, 8, 2, 1, '#7ad9ff'], [12, 9, 1, 1, '#7ad9ff'], [13, 10, 1, 2, '#7ad9ff'],
  [13, 1, 1, 3, '#ff5d8f'], [12, 2, 3, 1, '#ff5d8f'],                     // étincelle
];

// dessin à une taille quelconque : chaque pixel prend la couleur de sa case de la grille 16 x 16
function render(SIZE) {
  const px = Buffer.alloc(SIZE * SIZE * 4);
  for (const [x, y, w, h, hex] of rects) {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (let yy = Math.round(y * SIZE / GRID); yy < Math.round((y + h) * SIZE / GRID); yy++) {
      for (let xx = Math.round(x * SIZE / GRID); xx < Math.round((x + w) * SIZE / GRID); xx++) {
        const o = (yy * SIZE + xx) * 4;
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
  }
  return px;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(SIZE) {
  const px = render(SIZE);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // 8 bits par canal
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = path.join(__dirname, '..');
for (const [file, size] of [['build/icon.png', 512], ['icons/icon-180.png', 180], ['icons/icon-192.png', 192]]) {
  const out = path.join(root, file);
  const data = png(size);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  console.log('icône écrite : ' + out + ' (' + data.length + ' octets)');
}
