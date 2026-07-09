#!/usr/bin/env node
// Generates the desktop shortcut's icon: same void black (#0f0f1a) + one gold
// mark (#C9A84C) identity as mobile/scripts/make-icons.js, packed into a real
// macOS .icns (a plain OSType/length/data container around PNG images — no
// re-encoding, no image toolchain, no macOS needed to build it). Run:
//   node electron/branding/make-icns.js
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

// Same mark as mobile/scripts/make-icons.js, proportions scaled to `size` so
// every icns entry keeps the identical silhouette (base proportions are at
// 1024). onInk=true (opaque void-black square) is right for an app icon —
// macOS already gives it rounded corners / a shadow chrome.
function mark(size) {
  const s = size / 1024;
  const dotR = 176 * s, haloR = 320 * s, haloW = Math.max(1, 28 * s);
  const cx = size / 2, cy = size / 2;
  return png(size, (x, y) => {
    const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
    const edge = (r, w) => Math.max(0, Math.min(1, (r - d) / w));
    const ring = (r, w) => Math.max(0, 1 - Math.abs(d - r) / w);
    const a = Math.min(1, edge(dotR, Math.max(1, 2 * s)) + ring(haloR, haloW) * 0.28);
    const r = INK[0] + (GOLD[0] - INK[0]) * a;
    const g = INK[1] + (GOLD[1] - INK[1]) * a;
    const b = INK[2] + (GOLD[2] - INK[2]) * a;
    return [r | 0, g | 0, b | 0, 255];
  });
}

// icns entry tag → the pixel size Apple defines it as (PNG-backed tags only —
// every modern macOS release accepts these; no legacy raw-bitmap tags needed).
const ENTRIES = [
  ['ic11', 32], ['ic12', 64], ['ic07', 128], ['ic13', 256],
  ['ic08', 256], ['ic14', 512], ['ic09', 512], ['ic10', 1024],
];

function icns() {
  const bySize = new Map(); // dedupe: ic08/ic13 share 256px art, ic09/ic14 share 512px
  const parts = [];
  for (const [tag, size] of ENTRIES) {
    if (!bySize.has(size)) bySize.set(size, mark(size));
    const data = bySize.get(size);
    const tagBuf = Buffer.from(tag, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(8 + data.length);
    parts.push(Buffer.concat([tagBuf, lenBuf, data]));
  }
  const body = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([header, body]);
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'icon.icns'), icns());
console.log(`icon.icns  ${(fs.statSync(path.join(outDir, 'icon.icns')).size / 1024).toFixed(1)}KB`);
// Also drop a flat PNG for platforms/build tools that want one directly
// (electron-builder's Windows/Linux icon paths, README screenshots, etc.).
fs.writeFileSync(path.join(outDir, 'icon.png'), mark(1024));
console.log('icon.png   ' + (fs.statSync(path.join(outDir, 'icon.png')).size / 1024).toFixed(1) + 'KB');
