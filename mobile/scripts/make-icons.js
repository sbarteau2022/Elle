#!/usr/bin/env node
// Generates the door's icons: void black (#0f0f1a) with the one gold mark
// (#C9A84C) — a single breathing dot, same as the heartbeat. Hand-rolled PNG
// encoder (zlib is built in) so the repo needs no image toolchain. Run:
//   node scripts/make-icons.js
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const INK = [0x0f, 0x0f, 0x1a];
const GOLD = [0xc9, 0xa8, 0x4c];

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = ~0;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// pixels: (x, y) -> [r, g, b, a]
function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels(x, y);
      const o = row + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The mark: a gold dot at the center with a soft edge (2px feather), and a
// faint gold halo ring — the heartbeat, still.
function mark(size, { dotR, haloR, haloW, onInk }) {
  const cx = size / 2, cy = size / 2;
  return png(size, (x, y) => {
    const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
    const edge = (r, w) => Math.max(0, Math.min(1, (r - d) / w));         // filled, feathered
    const ring = (r, w) => Math.max(0, 1 - Math.abs(d - r) / w);          // ring, feathered
    const dot = edge(dotR, 2);
    const halo = ring(haloR, haloW) * 0.28;
    const a = Math.min(1, dot + halo);
    if (onInk) {
      const r = INK[0] + (GOLD[0] - INK[0]) * a;
      const g = INK[1] + (GOLD[1] - INK[1]) * a;
      const b = INK[2] + (GOLD[2] - INK[2]) * a;
      return [r | 0, g | 0, b | 0, 255];
    }
    return [GOLD[0], GOLD[1], GOLD[2], Math.round(a * 255)]; // transparent ground
  });
}

const out = (name, buf) => {
  const p = path.join(__dirname, '..', 'assets', name);
  fs.writeFileSync(p, buf);
  console.log(`${name}  ${(buf.length / 1024).toFixed(1)}KB`);
};

out('icon.png', mark(1024, { dotR: 176, haloR: 320, haloW: 28, onInk: true }));
out('splash-icon.png', mark(512, { dotR: 72, haloR: 150, haloW: 16, onInk: false }));
out('android-icon-foreground.png', mark(432, { dotR: 62, haloR: 118, haloW: 12, onInk: false }));
out('android-icon-background.png', png(432, () => [INK[0], INK[1], INK[2], 255]));
out('android-icon-monochrome.png', mark(432, { dotR: 62, haloR: 118, haloW: 12, onInk: false }));
out('favicon.png', mark(48, { dotR: 9, haloR: 16, haloW: 3, onInk: true }));
