/**
 * Генератор иконок PWA на чистом Node: пишет PNG без зависимостей.
 * Запускается автоматически перед `dev` и `build`.
 *
 *   node tools/make-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');

/* ---------- PNG ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // бит на канал
  header[9] = 2; // truecolor RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // фильтр None
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- Рисунок ---------- */

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const mix = (a, b, t) => a + (b - a) * t;

/** Покрытие пикселя скруглённым прямоугольником. */
function roundedRectCoverage(x, y, x0, y0, x1, y1, radius) {
  const innerX = Math.max(x0 + radius, Math.min(x, x1 - radius));
  const innerY = Math.max(y0 + radius, Math.min(y, y1 - radius));
  const dx = x - innerX;
  const dy = y - innerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > radius) return 0;
  if (distance < radius - 1.2) return 1;
  return clamp01(radius - distance);
}

function renderIcon(size, scale = 1) {
  const rgb = Buffer.alloc(size * size * 3);

  const barWidth = size * 0.115 * scale;
  const gap = size * 0.085 * scale;
  const heights = [0.3, 0.47, 0.38];
  const radius = barWidth * 0.42;
  const total = barWidth * 3 + gap * 2;
  const startX = (size - total) / 2;

  const bars = heights.map((ratio, index) => {
    const height = size * ratio * scale;
    const x0 = startX + index * (barWidth + gap);
    const y0 = (size - height) / 2;
    return { x0, y0, x1: x0 + barWidth, y1: y0 + height };
  });

  const glowX = size * 0.78;
  const glowY = size * 0.2;
  const violetX = size * 0.12;
  const violetY = size * 0.92;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (2 * (size - 1));

      // Фон: диагональный градиент
      let r = mix(14, 6, t);
      let g = mix(14, 6, t);
      let b = mix(20, 9, t);

      // Жёлтое свечение сверху справа
      const glowDistance = Math.hypot(x - glowX, y - glowY) / (size * 0.85);
      const glow = clamp01(1 - glowDistance) ** 2 * 0.34;
      r = mix(r, 255, glow);
      g = mix(g, 216, glow);
      b = mix(b, 77, glow);

      // Фиолетовое свечение снизу слева
      const violetDistance = Math.hypot(x - violetX, y - violetY) / (size * 0.7);
      const violet = clamp01(1 - violetDistance) ** 2 * 0.16;
      r = mix(r, 139, violet);
      g = mix(g, 108, violet);
      b = mix(b, 255, violet);

      // Столбики эквалайзера
      let coverage = 0;
      for (const bar of bars) {
        const value = roundedRectCoverage(x, y, bar.x0, bar.y0, bar.x1, bar.y1, radius);
        if (value > coverage) coverage = value;
      }

      if (coverage > 0) {
        const accentT = clamp01(y / (size - 1));
        const ar = mix(255, 255, accentT);
        const ag = mix(229, 194, accentT);
        const ab = mix(137, 31, accentT);
        r = mix(r, ar, coverage);
        g = mix(g, ag, coverage);
        b = mix(b, ab, coverage);
      }

      const offset = (y * size + x) * 3;
      rgb[offset] = Math.round(clamp01(r / 255) * 255);
      rgb[offset + 1] = Math.round(clamp01(g / 255) * 255);
      rgb[offset + 2] = Math.round(clamp01(b / 255) * 255);
    }
  }

  return encodePng(size, size, rgb);
}

/* ---------- Сборка ---------- */

mkdirSync(OUT, { recursive: true });

const files = [
  ['icon-512.png', 512, 1],
  ['icon-192.png', 192, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-512-maskable.png', 512, 0.74],
];

for (const [name, size, scale] of files) {
  const png = renderIcon(size, scale);
  writeFileSync(join(OUT, name), png);
  console.log(`${name}: ${size}×${size}, ${(png.length / 1024).toFixed(1)} КБ`);
}
