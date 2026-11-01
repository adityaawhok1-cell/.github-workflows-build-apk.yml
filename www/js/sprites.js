'use strict';
// ====== Pixel art prosedural (gaya GBA, 16x16) ======
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const c16 = s => { const l = Math.floor((16 - s.length) / 2); return '.'.repeat(l) + s + '.'.repeat(16 - s.length - l); };
const BODY = ['', 'oooooo', 'ohhhhhho', 'ohhhhhhhho', 'ohhssssHho', 'ohsessesho', 'osssssssso', 'osssssso',
  'oaaaaaao', 'oaaaccaaao', 'osaaccaaso', 'oAAAAAAo', 'oaa..aao', 'obb..bbo', 'ooo..ooo', ''].map(c16);
const band = n => 'o' + 'c'.repeat(n) + 'o';
const CLS_OV = {
  lord:    { 3: 'gggg' },
  knight:  { 0: 'cc' },
  fighter: { 3: band(8) },
  archer:  { 2: band(6), 3: band(8) },
  mage:    { 0: 'cc', 1: 'occo', 2: 'o' + 'ccCCCCcc' + 'o', 12: 'oaaaaaao', 13: 'oAAAAAAo', 14: 'oooooooo' },
};
function weaponPx(w, f) {
  const p = []; const P = (x, y, k) => p.push([x, y, k]);
  if (w === 'sword') { for (let y = 1; y <= 8; y++) { P(13, y, 'w'); P(14, y, 'v'); } P(13, 0, 'w'); P(12, 9, 'g'); P(13, 9, 'g'); P(14, 9, 'g'); P(13, 10, 'W'); P(13, 11, 'g'); }
  else if (w === 'lance') { for (let y = 3; y <= 15; y++) P(14, y, 'W'); P(14, 0, 'w'); P(13, 1, 'v'); P(14, 1, 'w'); P(15, 1, 'v'); P(14, 2, 'w'); P(15, 3, 'c'); P(15, 4, 'c'); }
  else if (w === 'axe') { for (let y = 3; y <= 14; y++) P(13, y, 'W'); for (let y = 2; y <= 5; y++) { P(14, y, 'w'); P(15, y, 'v'); } P(14, 1, 'v'); }
  else if (w === 'bow') { P(14, 1, 'W'); for (let y = 2; y <= 10; y++) P(15, y, 'W'); P(14, 11, 'W'); for (let y = 2; y <= 10; y++) P(13, y, 'x'); P(14, 2, 'W'); P(14, 10, 'W'); }
  else if (w === 'tome') { for (let y = 2; y <= 14; y++) P(14, y, 'W'); const k = f ? 'x' : 'E'; P(14, 0, k); P(15, 0, k); P(14, 1, k); P(15, 1, k); P(13, 1, 'E'); }
  return p;
}
function palette(d) {
  const sk = d.skin || '#f2c9a0';
  return { o: '#1c1624', h: d.hair, H: shade(d.hair, -34), s: sk, e: '#1a1a2e', a: d.armor, A: shade(d.armor, -40), c: d.cape, C: shade(d.cape, -40),
    w: '#f0f4fc', v: '#9aa6bc', W: '#7a5230', g: '#f0c84a', b: '#4a3424', E: '#7af0ff', x: '#f4f4ff' };
}
const SPR_CACHE = {};
function heroSprite(d, frame) {
  const key = (d.id || d.name) + ':' + d.cls + ':' + (d.boss ? 'B' : '') + frame;
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d');
  const pal = Object.assign({}, palette(d));
  if (d.cls === 'knight') { pal.h = shade(d.armor, 25); pal.H = shade(d.armor, -20); }
  const P = (px, py, k) => { if (px < 0 || px > 15 || py < 0 || py > 15) return; x.fillStyle = pal[k]; x.fillRect(px, py, 1, 1); };
  const rows = (arr, y0, y1, dy) => { for (let y = y0; y <= y1; y++) { const r = arr[y]; if (!r) continue; for (let i = 0; i < 16; i++) { const ch = r[i]; if (ch && ch !== '.') P(i, y + dy, ch); } } };
  const ovRows = {}; const ov = CLS_OV[d.cls] || {};
  for (const k in ov) ovRows[k] = c16(ov[k]);
  const arrOv = []; for (let i = 0; i < 16; i++) arrOv[i] = ovRows[i];
  const dy = frame ? 1 : 0;
  rows(BODY, 0, 11, dy); rows(BODY, 12, 15, 0);
  rows(arrOv, 0, 11, dy); rows(arrOv, 12, 15, 0);
  weaponPx(CLASSES[d.cls].wep, frame).forEach(([px, py, k]) => P(px, py + dy, k));
  if (d.boss) { P(3, 1 + dy, 'w'); P(3, 0 + dy, 'w'); P(12, 1 + dy, 'w'); P(12, 0 + dy, 'w'); P(4, 2 + dy, 'v'); P(11, 2 + dy, 'v'); [6, 7, 8, 9].forEach(i => P(i, 1 + dy, 'g')); }
  SPR_CACHE[key] = cv; return cv;
}
const GRAY_CACHE = new Map();
function graySprite(cv) {
  if (GRAY_CACHE.has(cv)) return GRAY_CACHE.get(cv);
  const g = document.createElement('canvas'); g.width = g.height = 16; const x = g.getContext('2d'); x.drawImage(cv, 0, 0);
  const im = x.getImageData(0, 0, 16, 16), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) * .6; d[i] = v; d[i + 1] = v; d[i + 2] = v + 6; }
  x.putImageData(im, 0, 0); GRAY_CACHE.set(cv, g); return g;
}
const WHITE_CACHE = new Map();
function whiteSprite(cv) {
  if (WHITE_CACHE.has(cv)) return WHITE_CACHE.get(cv);
  const g = document.createElement('canvas'); g.width = g.height = 16; const x = g.getContext('2d'); x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16);
  WHITE_CACHE.set(cv, g); return g;
}
function drawSpr(c, x, y, s, flip) {
  if (flip) { ctx.save(); ctx.translate(x + 16 * s, y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0, 16 * s, 16 * s); ctx.restore(); }
  else ctx.drawImage(c, x, y, 16 * s, 16 * s);
}

// ====== Tile ======
const TILE_CACHE = {};
function tileCanvas(th, type, variant, frame) {
  const key = th + '_' + type + '_' + variant + '_' + frame;
  if (TILE_CACHE[key]) return TILE_CACHE[key];
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  const T = THEMES[th]; const r = mulberry32(th * 1000 + variant * 77 + (type === 3 ? 0 : 5) + 1);
  const P = (px, py, col) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); };
  if (type === 3) {
    x.fillStyle = T.w[0]; x.fillRect(0, 0, 16, 16);
    for (let y = 1; y < 16; y += 4) for (let i = 0; i < 16; i++) { if (((i + frame * 2 + y * 3 + variant * 5) % 8) < 3) P(i, y, T.w[1]); }
    return TILE_CACHE[key] = c;
  }
  x.fillStyle = T.g[0]; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 30; i++) P(Math.floor(r() * 16), Math.floor(r() * 16), r() < .55 ? T.g[1] : T.g[2]);
  for (let i = 0; i < 3; i++) { const px = Math.floor(r() * 14) + 1, py = Math.floor(r() * 12) + 3; P(px, py, T.g[1]); P(px - 1, py - 1, T.g[1]); P(px + 1, py - 1, T.g[1]); }
  if (th === 0 && variant === 2) { P(4, 4, '#fff'); P(11, 10, '#ffe27a'); }
  if (type === 1) {
    const cx = 8, cy = 7;
    [[7, 11], [8, 11], [7, 12], [8, 12], [7, 13], [8, 13]].forEach(([a, b]) => P(a, b, T.trunk));
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) {
      const d = Math.sqrt(xx * xx + yy * yy * 1.1);
      if (d <= 5.6) { const edge = d > 4.6; P(cx + xx, cy + yy, edge ? shade(T.tree[1], -25) : ((xx + yy > 2) ? T.tree[1] : T.tree[0])); if (!edge && xx < -1 && yy < -1 && ((xx + yy) % 3 === 0)) P(cx + xx, cy + yy, shade(T.tree[0], 30)); }
    }
  } else if (type === 2) {
    for (let y = 2; y <= 14; y++) {
      const hw = Math.floor((y - 2) * .62) + 1;
      for (let xx = -hw; xx <= hw; xx++) {
        const px = 8 + xx; let col = xx < 0 ? T.rock[0] : T.rock[1];
        if (y <= 5) col = T.rock[2]; if (y === 6 && (xx % 2 === 0)) col = T.rock[2];
        if (xx === -hw || xx === hw || y === 14) col = '#2a2a38';
        P(px, y, col);
      }
    }
    P(5, 11, T.rock[1]); P(10, 9, T.rock[0]); P(7, 10, T.rock[1]);
  }
  return TILE_CACHE[key] = c;
}
