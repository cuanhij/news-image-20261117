// THE WORLD IN ONE DAY — one-image summary of world news, Tuesday 17 November 2026.
// Draws a 1024x1024 newspaper front page from code (no stock images, no network)
// and writes it as a PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png).
// Node 22, standard library only. Deterministic: two runs write identical bytes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 232];
const INK: RGB = [24, 24, 40];
const NAVY: RGB = [20, 38, 74];
const RED: RGB = [176, 42, 42];
const STEEL: RGB = [70, 110, 150];
const GOLD: RGB = [198, 142, 40];
const ORANGE: RGB = [214, 96, 32];
const TEAL: RGB = [32, 120, 110];
const LIGHT: RGB = [232, 226, 208];
const GREY: RGB = [140, 134, 120];
const WHITE: RGB = [255, 255, 255];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) setPixel(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) setPixel(x, y, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: RGB, filled: boolean): void {
  if (filled) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
    }
  } else {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
}

function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) setPixel(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 cells; '#' is ink, ' ' is empty.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r][col] === '1') {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(y: number, text: string, scale: number, c: RGB): void {
  drawText(Math.floor((W - textWidth(text, scale)) / 2), y, text, scale, c);
}

// Greedy word wrap to a pixel width.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (6 * scale)));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- icons
// Each icon is drawn with plain geometry inside the box (x, y, w, h).

function drawBridge(x: number, y: number, w: number, h: number): void {
  const deckY = y + Math.floor(h * 0.55);
  const t1 = x + Math.floor(w * 0.18);
  const t2 = x + Math.floor(w * 0.72);
  // water
  for (let i = 0; i < 3; i++) {
    hline(x + 6, x + w - 6, y + h - 12 - i * 7, STEEL);
  }
  // towers
  rect(t1, y + 8, 7, deckY - y - 8, INK);
  rect(t2, y + 8, 7, deckY - y - 8, INK);
  // cables
  line(t1 + 3, y + 10, x + Math.floor(w * 0.5) - 8, deckY, INK);
  line(t2 + 3, y + 10, x + Math.floor(w * 0.5) + 8, deckY, INK);
  line(t1 + 3, y + 10, x + 6, deckY, GREY);
  line(t2 + 3, y + 10, x + w - 8, deckY, GREY);
  // deck with a collapsed gap in the middle (red broken span)
  hline(x + 4, x + Math.floor(w * 0.5) - 10, deckY, INK);
  hline(x + 4, x + Math.floor(w * 0.5) - 10, deckY + 1, INK);
  hline(x + Math.floor(w * 0.5) + 10, x + w - 6, deckY, INK);
  hline(x + Math.floor(w * 0.5) + 10, x + w - 6, deckY + 1, INK);
  line(x + Math.floor(w * 0.5) - 10, deckY, x + Math.floor(w * 0.5) - 2, deckY + 16, RED);
  line(x + Math.floor(w * 0.5) + 10, deckY, x + Math.floor(w * 0.5) + 2, deckY + 16, RED);
  // falling debris
  setPixel(x + Math.floor(w * 0.5) - 4, deckY + 20, RED);
  setPixel(x + Math.floor(w * 0.5) + 5, deckY + 24, RED);
}

function drawTanker(x: number, y: number, w: number, h: number): void {
  const hullY = y + Math.floor(h * 0.55);
  // flames above the deck
  triangle(x + Math.floor(w * 0.3), hullY - 6, x + Math.floor(w * 0.38), hullY - 34, x + Math.floor(w * 0.46), hullY - 6, ORANGE);
  triangle(x + Math.floor(w * 0.55), hullY - 6, x + Math.floor(w * 0.62), hullY - 28, x + Math.floor(w * 0.7), hullY - 6, RED);
  // hull
  rect(x + 6, hullY, w - 16, 16, NAVY);
  triangle(x + w - 10, hullY, x + w - 2, hullY + 8, x + w - 10, hullY + 16, NAVY);
  // deckhouse + funnel
  rect(x + 12, hullY - 14, 14, 14, INK);
  rect(x + Math.floor(w * 0.62), hullY - 18, 8, 18, RED);
  // waves
  for (let i = 0; i < 3; i++) {
    hline(x + 4, x + w - 4, hullY + 22 + i * 7, STEEL);
  }
  // second small tanker behind
  rect(x + Math.floor(w * 0.55), hullY - 30, 18, 8, GREY);
}

function drawSummit(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w * 0.5);
  const cy = y + Math.floor(h * 0.52);
  const r = Math.floor(Math.min(w, h) * 0.3);
  // globe
  circle(cx, cy, r, STEEL, false);
  circle(cx, cy, r - 1, STEEL, false);
  // meridians
  vline(cx, cy - r, cy + r, STEEL);
  hline(cx - r, cx + r, cy, STEEL);
  line(cx - Math.floor(r * 0.7), cy - Math.floor(r * 0.7), cx + Math.floor(r * 0.7), cy + Math.floor(r * 0.7), STEEL);
  line(cx + Math.floor(r * 0.7), cy - Math.floor(r * 0.7), cx - Math.floor(r * 0.7), cy + Math.floor(r * 0.7), STEEL);
  // three flags on poles above the globe
  const flagCols: RGB[] = [RED, GOLD, TEAL];
  for (let i = 0; i < 3; i++) {
    const fx = x + 14 + i * Math.floor((w - 28) / 2);
    vline(fx, y + 6, cy - r - 2, INK);
    rect(fx + 1, y + 6, 16, 10, flagCols[i]);
  }
  // ground line
  hline(x + 6, x + w - 6, y + h - 10, INK);
}

function drawRwanda(x: number, y: number, w: number, h: number): void {
  const baseY = y + h - 14;
  // building with a pitched roof
  triangle(x + 8, y + 34, x + Math.floor(w * 0.5), y + 10, x + w - 10, y + 34, RED);
  rect(x + 12, y + 34, w - 26, baseY - y - 34, NAVY);
  // door and windows
  rect(x + Math.floor(w * 0.5) - 6, baseY - 18, 12, 18, WHITE);
  rect(x + 20, y + 44, 10, 10, GOLD);
  rect(x + w - 32, y + 44, 10, 10, GOLD);
  // arrow pointing in (return)
  line(x + Math.floor(w * 0.5) + 16, y + 52, x + w - 14, y + 52, TEAL);
  line(x + w - 14, y + 52, x + w - 22, y + 46, TEAL);
  line(x + w - 14, y + 52, x + w - 22, y + 58, TEAL);
  // five small dots = five states
  for (let i = 0; i < 5; i++) {
    circle(x + 16 + i * 13, y + h - 24, 3, TEAL, true);
  }
  hline(x + 6, x + w - 6, baseY, INK);
}

function drawBank(x: number, y: number, w: number, h: number): void {
  const baseY = y + h - 14;
  // pediment + columns
  triangle(x + 6, y + 26, x + Math.floor(w * 0.5), y + 8, x + w - 8, y + 26, NAVY);
  for (let i = 0; i < 3; i++) {
    const cx = x + 18 + i * Math.floor((w - 36) / 2);
    rect(cx, y + 30, 8, baseY - y - 30, INK);
  }
  rect(x + 8, baseY - 4, w - 18, 4, INK);
  // lightning bolt (the bug) striking the bank
  triangle(x + Math.floor(w * 0.62), y + 12, x + Math.floor(w * 0.78), y + 12, x + Math.floor(w * 0.66), y + 34, GOLD);
  triangle(x + Math.floor(w * 0.72), y + 30, x + Math.floor(w * 0.56), y + 30, x + Math.floor(w * 0.68), y + 52, GOLD);
  // small bug: body + legs
  circle(x + 16, y + 52, 5, RED, true);
  line(x + 11, y + 48, x + 5, y + 42, RED);
  line(x + 11, y + 56, x + 5, y + 62, RED);
  line(x + 21, y + 48, x + 27, y + 42, RED);
  line(x + 21, y + 56, x + 27, y + 62, RED);
  hline(x + 6, x + w - 6, baseY, INK);
}

function drawRocket(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w * 0.42);
  // flame
  triangle(cx - 7, y + 66, cx + 7, y + 66, cx, y + 92, ORANGE);
  triangle(cx - 4, y + 66, cx + 4, y + 66, cx, y + 82, RED);
  // body
  rect(cx - 8, y + 22, 16, 44, NAVY);
  triangle(cx - 8, y + 22, cx + 8, y + 22, cx, y + 6, RED);
  // fins
  triangle(cx - 8, y + 52, cx - 20, y + 70, cx - 8, y + 66, INK);
  triangle(cx + 8, y + 52, cx + 20, y + 70, cx + 8, y + 66, INK);
  // window
  circle(cx, y + 34, 4, WHITE, true);
  // two satellites (small squares with panels) drifting away
  const sx = x + Math.floor(w * 0.72);
  rect(sx - 3, y + 16, 10, 10, INK);
  rect(sx - 15, y + 19, 11, 4, GOLD);
  rect(sx + 8, y + 19, 11, 4, GOLD);
  rect(sx + 2, y + 46, 8, 8, GREY);
  rect(sx - 8, y + 49, 9, 3, GOLD);
  rect(sx + 11, y + 49, 9, 3, GOLD);
  // stars
  setPixel(x + 10, y + 12, GOLD);
  setPixel(x + w - 12, y + 60, GOLD);
  setPixel(x + 14, y + 78, GOLD);
  // ground line
  hline(x + 6, x + w - 6, y + h - 8, INK);
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- stories
interface Story {
  headline: string;
  body: string;
  icon: (x: number, y: number, w: number, h: number) => void;
  lead: boolean;
}

const STORIES: Story[] = [
  {
    headline: 'UKRAINE STRIKES KERCH BRIDGE',
    body: 'UKRAINE HITS THE BRIDGE LINKING RUSSIA TO CRIMEA. A ROAD SPAN COLLAPSES. ZELENSKYY CALLS IT AN UNPRECEDENTED OPERATION. RUSSIA HITS TWO BRIDGES IN KYIV AND CLAIMS IT INTERCEPTED 1,336 DRONES.',
    icon: drawBridge,
    lead: true,
  },
  {
    headline: 'TANKERS HIT NEAR HORMUZ',
    body: "IRAN'S REVOLUTIONARY GUARD SAYS TWO OIL TANKERS HIT MINES AND CAUGHT FIRE NEAR THE STRAIT OF HORMUZ. A THIRD US CARRIER, USS THEODORE ROOSEVELT, ARRIVES IN THE REGION. BAHRAIN SAYS IT STOPPED IRANIAN DRONES AIMED AT A US RADAR.",
    icon: drawTanker,
    lead: false,
  },
  {
    headline: 'TRUMP IN ASIA, SUMMIT SET',
    body: 'TRUMP ARRIVES IN MANILA FOR THE ASEAN SUMMIT AND SIGNS A TRADE STATEMENT WITH THAILAND. CHINA CONFIRMS THE FIRST XI-TRUMP-PUTIN MEETING, THURSDAY 19 NOVEMBER IN SHENZHEN, ON THE APEC SIDELINES.',
    icon: drawSummit,
    lead: false,
  },
  {
    headline: 'EU STATES PLAN RWANDA RETURN HUB',
    body: 'FIVE EUROPEAN STATES - GERMANY, DENMARK, AUSTRIA, GREECE, THE NETHERLANDS - ANNOUNCE A JOINT FACILITY IN RWANDA FOR REJECTED ASYLUM SEEKERS.',
    icon: drawRwanda,
    lead: false,
  },
  {
    headline: 'JPMORGAN OUTAGE BLAMED ON BUG',
    body: "JPMORGAN CHASE BLAMES A SOFTWARE BUG, NOT A CYBERATTACK, FOR MONDAY'S BANKING OUTAGE HITTING ONLINE BANKING AND ZELLE.",
    icon: drawBank,
    lead: false,
  },
  {
    headline: 'VULCAN ROCKET FAILS',
    body: 'A ULA VULCAN ROCKET FAILS IN FLIGHT, DESTROYING 40 AMAZON LEO INTERNET SATELLITES.',
    icon: drawRocket,
    lead: false,
  },
];

// ---------------------------------------------------------------- layout
function drawPage(): void {
  const MX = 20;
  const RX = W - MX; // 1004
  // masthead
  rect(MX, 16, RX - MX, 110, NAVY);
  drawTextCentered(28, 'THE WORLD IN ONE DAY', 5, WHITE);
  drawTextCentered(76, 'TUESDAY, 17 NOVEMBER 2026', 3, GOLD);
  rect(MX, 130, RX - MX, 4, RED);

  // rows
  const heights = [150, 138, 138, 138, 138, 138];
  const gap = 4;
  let y = 140;
  for (let i = 0; i < STORIES.length; i++) {
    const s = STORIES[i];
    const rh = heights[i];
    // icon box
    rect(MX, y, 96, rh, LIGHT);
    rect(MX, y, 96, 2, INK);
    rect(MX, y + rh - 2, 96, 2, INK);
    rect(MX, y, 2, rh, INK);
    rect(MX + 94, y, 2, rh, INK);
    s.icon(MX + 4, y + 4, 88, rh - 8);
    // headline + body
    const tx = MX + 112;
    const tw = RX - tx;
    const hs = s.lead ? 4 : 3;
    const hCol: RGB = s.lead ? RED : INK;
    drawText(tx, y + 6, s.headline, hs, hCol);
    const bodyY = y + 6 + 7 * hs + 5;
    const lines = wrapText(s.body, tw, 3);
    for (let li = 0; li < lines.length; li++) {
      drawText(tx, bodyY + li * 21, lines[li], 3, INK);
    }
    // divider rule
    if (i < STORIES.length - 1) {
      hline(MX, RX, y + rh + 1, GREY);
    }
    y += rh + gap;
  }

  // footer
  drawTextCentered(1004, 'ALL EVENTS FIRST REPORTED ON TUESDAY, 17 NOVEMBER 2026', 2, GREY);
}

drawPage();

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
