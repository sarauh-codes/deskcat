// Generates every cat sprite sheet (32x32 frames, horizontal strips) + the app icon source.
// Usage: node scripts/gen-sprites.mjs [--preview]   (frame counts must match src/data/cats.ts)
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const S = 32;
const E = "#1b1b24", N = "#f08aa4", I = "#f6b5c3", Z = "#7aa2ff", H = "#ff5d8f";
const SKINS = {
  orange: { b: "#e8914a", s: "#c06a2c", l: "#f8cf9c", stripe: true },
  black: { b: "#3a3a46", s: "#24242e", l: "#5a5a68" },
  white: { b: "#f2f2f4", s: "#cfcfd8", l: "#ffffff" },
  gray: { b: "#8d929e", s: "#666b78", l: "#c3c7cf", stripe: true },
  cream: { b: "#f0d6a8", s: "#d4b17c", l: "#fff0d4", stripe: true },
  tortoiseshell: {
    e: "#f2d14a", b: "#4a3328", s: "#2e1f19", l: "#c98a52",
    patches: [
      [6, 17, 3, 4, "#c9702e"], [11, 15, 3, 3, "#1f1714"], [13, 20, 4, 4, "#c9702e"], [17, 17, 3, 3, "#1f1714"],
      [8, 24, 3, 4, "#c9702e"], [19, 6, 3, 4, "#c9702e"], [24, 11, 3, 3, "#c9702e"], [23, 18, 3, 4, "#c9702e"],
    ],
  },
  // patches recolour only body-coloured pixels inside the rect: [x, y, w, h, colour]
  calico: {
    b: "#f2f2f4", s: "#cfcfd8", l: "#ffffff",
    patches: [[6, 12, 7, 12, "#e8914a"], [14, 15, 5, 8, "#33333d"], [19, 6, 5, 7, "#e8914a"]],
  },
};

const mk = () => {
  const f = Array(S * S).fill(null);
  const P = (x, y, c) => { if (x >= 0 && x < S && y >= 0 && y < S) f[y * S + x] = c; };
  const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c); };
  return { f, P, R };
};
const heart = (P, x, y) =>
  [".X.X.", "XXXXX", ".XXX.", "..X.."].forEach((row, j) => [...row].forEach((ch, i) => ch === "X" && P(x + i, y + j, H)));
const zed = (P, x, y) => [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]].forEach(([i, j]) => P(x + i, y + j, Z));
const finish = ({ f }, c) => {
  for (const [x, y, w, h, col] of c.patches ?? [])
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (f[j * S + i] === c.b) f[j * S + i] = col;
  return f;
};

function standing(c, { bob = 0, lift = [0, 0, 0, 0], blink = false, tail = 0 }) {
  const m = mk(), { P, R } = m;
  if (tail === 0) R(4, 12, 2, 10, c.b);
  else { R(4, 12, 2, 3, c.b); R(3, 14, 2, 8, c.b); R(5, 20, 1, 2, c.b); }
  R(6, 16 + bob, 16, 8, c.b); R(6, 22 + bob, 16, 2, c.s);
  if (c.stripe) [9, 12, 15, 18].forEach((x) => R(x, 16 + bob, 1, 3, c.s));
  [7, 10, 17, 20].forEach((x, i) => { R(x, 24 + bob, 2, 6 - lift[i] - bob, c.b); R(x, 29 - lift[i], 2, 1, c.l); });
  R(20, 10 + bob, 9, 8, c.b);
  R(20, 8 + bob, 2, 3, c.b); R(27, 8 + bob, 2, 3, c.b); P(21, 9 + bob, I); P(27, 9 + bob, I);
  R(25, 15 + bob, 4, 3, c.l); P(28, 15 + bob, N);
  blink ? R(25, 13 + bob, 2, 1, c.e ?? E) : R(25, 12 + bob, 2, 2, c.e ?? E);
  return finish(m, c);
}

function sitting(c, { tail = 0, blink = false, happy = false, heartY = null }) {
  const m = mk(), { P, R } = m;
  if (tail === 0) R(3, 27, 6, 3, c.b); else { R(3, 25, 2, 5, c.b); R(4, 28, 5, 2, c.b); }
  R(8, 16, 14, 14, c.b); R(8, 28, 14, 2, c.s); R(18, 18, 4, 11, c.l);
  if (c.stripe) [9, 12, 15].forEach((x) => R(x, 17, 1, 4, c.s));
  R(17, 14, 7, 3, c.b); R(16, 6, 10, 9, c.b);
  R(16, 4, 2, 3, c.b); R(23, 4, 2, 3, c.b); P(17, 5, I); P(24, 5, I);
  R(22, 10, 4, 3, c.l); P(25, 10, N);
  if (happy) { P(21, 9, c.e ?? E); P(22, 8, c.e ?? E); P(23, 9, c.e ?? E); }
  else if (blink) R(21, 9, 3, 1, c.e ?? E);
  else R(21, 8, 2, 2, c.e ?? E);
  if (heartY !== null) heart(P, 26, heartY);
  return finish(m, c);
}

function sleeping(c, { up = 0, z = 0 }) {
  const m = mk(), { P, R } = m;
  R(2, 23, 4, 6, c.b);
  R(5, 20 - up, 22, 9 + up, c.b); P(5, 20 - up, null); R(5, 27, 22, 2, c.s);
  if (c.stripe) [9, 12, 15].forEach((x) => R(x, 20 - up, 1, 3, c.s));
  R(20, 18, 9, 10, c.b);
  R(20, 16, 2, 3, c.b); R(27, 16, 2, 3, c.b); P(21, 17, I); P(27, 17, I);
  R(24, 22, 3, 1, c.e ?? E); R(25, 24, 4, 3, c.l); P(28, 24, N);
  zed(P, 23, 11); if (z) zed(P, 26, 6);
  return finish(m, c);
}

// standing cat batting a yarn ball back and forth
function playing(c, i) {
  const f = standing(c, { bob: (i + 1) % 2, lift: [[0, 0, 0, 3], [0, 0, 0, 0], [0, 0, 3, 0], [0, 0, 0, 0]][i], tail: i % 2 });
  [".XX.", "XoXX", "XXXX", ".XX."].forEach((row, j) =>
    [...row].forEach((ch, k) => { if (ch !== ".") f[(26 + j) * S + [24, 26, 28, 26][i] + k] = ch === "o" ? "#ffc2c8" : "#e0525c"; }));
  return f;
}

// arched back, puffed tail, swiping paw
function fighting(c, i) {
  const m = mk(), { P, R } = m, b = i % 2;
  R(2, 9 - b, 5, 12, c.b); R(4, 20, 3, 2, c.b);
  R(6, 17, 16, 7, c.b); R(8, 14 - b, 10, 4, c.b); R(6, 22, 16, 2, c.s);
  if (c.stripe) [9, 12, 15].forEach((x) => R(x, 15 - b, 1, 4, c.s));
  [7, 10, 17, 20].forEach((x) => { R(x, 24, 2, 6, c.b); R(x, 29, 2, 1, c.l); });
  const hx = 19 + b;
  R(hx, 14, 9, 8, c.b); R(hx - 1, 13, 3, 2, c.b); R(hx + 6, 12, 2, 3, c.b); P(hx + 7, 13, I);
  P(hx + 4, 16, c.e ?? E); R(hx + 5, 17, 2, 1, c.e ?? E);
  R(hx + 5, 19, 4, 3, c.l); P(hx + 8, 19, N); R(hx + 6, 21, 3, 1, "#8a2b35");
  if (b) { R(27, 24, 4, 2, c.b); R(30, 26, 1, 1, c.l); }
  (b ? [[30, 9], [29, 10], [31, 12], [30, 13]] : [[31, 8], [28, 9], [30, 11]]).forEach(([x, y]) => P(x, y, "#ffd23f"));
  return finish(m, c);
}

const ANIMS = {
  fighting: [0, 1, 2, 3].map((i) => (c) => fighting(c, i)),
  playing: [0, 1, 2, 3].map((i) => (c) => playing(c, i)),
  idle: [{}, { tail: 1 }, { blink: true }, { tail: 1 }].map((o) => (c) => standing(c, o)),
  sitting: [{}, { tail: 1, blink: true }].map((o) => (c) => sitting(c, o)),
  sleeping: [{ up: 0, z: 0 }, { up: 1, z: 1 }].map((o) => (c) => sleeping(c, o)),
  walking: [
    { lift: [2, 0, 0, 2] }, { bob: 1 }, { lift: [0, 2, 2, 0] }, { bob: 1 },
  ].map((o) => (c) => standing(c, o)),
  petting: [8, 5, 2, 0].map((y, i) => (c) => sitting(c, { happy: true, heartY: y, tail: i % 2 })),
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function png(w, h, rgba) {
  const stride = w * 4 + 1, raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// frames -> png, optionally scaled and on a solid background (for preview)
function sheet(frames, scale = 1, bg = null) {
  const w = frames.length * S * scale, h = S * scale, buf = Buffer.alloc(w * h * 4);
  frames.forEach((f, n) => f.forEach((c, i) => {
    const col = c ?? bg; if (!col) return;
    const [r, g, b] = rgb(col), px = n * S + (i % S), py = Math.floor(i / S);
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++)
      buf.set([r, g, b, 255], ((py * scale + dy) * w + px * scale + dx) * 4);
  }));
  return png(w, h, buf);
}

const preview = [];
for (const [skin, c] of Object.entries(SKINS)) {
  const dir = `public/assets/cats/${skin}`; mkdirSync(dir, { recursive: true });
  const all = [];
  for (const [name, fns] of Object.entries(ANIMS)) {
    const frames = fns.map((fn) => fn(c)); all.push(...frames);
    writeFileSync(`${dir}/${name}.png`, sheet(frames));
  }
  preview.push(all);
}
writeFileSync("scripts/icon.png", sheet([ANIMS.sitting[0](SKINS.orange)], 8));
if (process.argv.includes("--preview")) {
  // one row per skin, all frames, on a grey background
  for (const [i, all] of preview.entries()) writeFileSync(`scripts/preview-${i}.png`, sheet(all, 3, "#9aa0a6"));
}
console.log("sprites written");
