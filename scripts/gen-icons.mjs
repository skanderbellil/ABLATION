// Generates the PWA icons as PNGs with no image dependencies.
// Motif: a 3×3 grid of filled cells on paper stock, one cell removed — the ablation.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const PAPER = [0xe8, 0xe9, 0xe0];
const INK = [0x1b, 0x1f, 0x1a];
const RED = [0xa8, 0x32, 0x1e];

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels(x, y);
      const o = row + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// pad: fraction of the canvas left as margin around the motif
function draw(size, pad) {
  const m = Math.round(size * pad);
  const span = size - 2 * m;
  const gap = Math.max(2, Math.round(span * 0.08));
  const cell = Math.floor((span - 2 * gap) / 3);
  const start = Math.round((size - (3 * cell + 2 * gap)) / 2);
  const stroke = Math.max(2, Math.round(size * 0.02));
  return png(size, (x, y) => {
    for (let cy = 0; cy < 3; cy++) {
      for (let cx = 0; cx < 3; cx++) {
        const x0 = start + cx * (cell + gap);
        const y0 = start + cy * (cell + gap);
        if (x >= x0 && x < x0 + cell && y >= y0 && y < y0 + cell) {
          // centre cell is the ablated one: hollow with a red outline
          if (cx === 1 && cy === 1) {
            const edge =
              x < x0 + stroke ||
              x >= x0 + cell - stroke ||
              y < y0 + stroke ||
              y >= y0 + cell - stroke;
            return edge ? RED : PAPER;
          }
          return INK;
        }
      }
    }
    return PAPER;
  });
}

writeFileSync(join(OUT, 'icon-192.png'), draw(192, 0.14));
writeFileSync(join(OUT, 'icon-512.png'), draw(512, 0.14));
// maskable: keep the motif inside the central 80% safe zone
writeFileSync(join(OUT, 'icon-maskable-512.png'), draw(512, 0.24));
writeFileSync(join(OUT, 'apple-touch-icon.png'), draw(180, 0.14));
console.log('icons written to', OUT);
