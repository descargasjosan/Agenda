// Genera los iconos PNG de la PWA (sin dependencias externas).
// Uso: node scripts/gen-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// ---------- PNG encoder ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Icono: reloj sobre fondo slate-900 ----------
const BG = [15, 23, 42];       // slate-900
const WHITE = [248, 250, 252];
const ACCENT = [59, 130, 246]; // blue-500

function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const c = size / 2;
  const ringOuter = size * 0.34;
  const ringInner = size * 0.27;

  const paint = (x, y, col, alpha = 255) => {
    const i = (y * size + x) * 4;
    const a = alpha / 255;
    px[i] = Math.round(col[0] * a + px[i] * (1 - a));
    px[i + 1] = Math.round(col[1] * a + px[i + 1] * (1 - a));
    px[i + 2] = Math.round(col[2] * a + px[i + 2] * (1 - a));
    px[i + 3] = Math.max(px[i + 3], alpha);
  };

  // Fondo completo (maskable: contenido dentro del 80% central)
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = BG[0]; px[i * 4 + 1] = BG[1]; px[i * 4 + 2] = BG[2]; px[i * 4 + 3] = 255;
  }

  // Manilla: segmento desde el centro en direccion (dx,dy), longitud L, ancho W (capsula)
  const hand = (dx, dy, len, wid, col) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const vx = x - c, vy = y - c;
        const t = vx * dx + vy * dy;            // proyeccion sobre la manilla
        const perp = Math.abs(vx * -dy + vy * dx); // distancia perpendicular
        if (t < 0 || t > len) continue;
        const dCap = Math.min(Math.hypot(vx, vy), Math.hypot(vx - dx * len, vy - dy * len));
        if (perp <= wid / 2 && t <= len || dCap <= wid / 2) {
          // antialias simple en el borde
          const edge = Math.min(perp, dCap);
          if (perp <= wid / 2 || dCap <= wid / 2) paint(x, y, col);
        }
      }
    }
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      // Aro del reloj (antialias por cobertura lineal)
      const aRing = Math.min(Math.max(Math.min(d - ringInner, ringOuter - d), 0), 1) * 255;
      if (aRing > 0 && d <= ringOuter && d >= ringInner) paint(x, y, WHITE, Math.round(aRing));
    }
  }

  // Manillas estilo 10:10
  const w = size * 0.038;
  hand(-0.866, -0.5, size * 0.16, w, WHITE);   // hora -> 10
  hand(0.5, -0.866, size * 0.23, w, WHITE);    // minutos -> 2

  // Punto central
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x - c, y - c) <= size * 0.032) paint(x, y, ACCENT);
    }
  }
  return Buffer.from(px.buffer);
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  fs.writeFileSync(path.join(OUT, name), encodePNG(size, drawIcon(size)));
  console.log('generado', name);
}
