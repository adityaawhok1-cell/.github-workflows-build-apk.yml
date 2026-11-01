'use strict';
// ====== Seni vektor HD: karakter chibi & tile (digambar langsung, resolusi bebas) ======
function shade(hex, amt) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function grayHex(hex) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16); const v = Math.round(((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) * .6);
  return '#' + ((1 << 24) | (v << 16) | (v << 8) | Math.min(255, v + 6)).toString(16).slice(1);
}
const isEnemy = d => !!(d.boss || /^e\d/.test(d.id || ''));
const idleBob = ph => Math.sin(gtime * 3 + (ph || 0)) * 1.3;

// Menggambar karakter dalam kotak size x size di (x,y). Menghadap kanan; flip => menghadap kiri.
// o: { flip, bob, walk, mode: 'n' | 'g'(abu) | 'w'(putih/kilat), ph, t }
function drawHero(d, x, y, size, o) {
  o = o || {};
  const mode = o.mode || 'n', t = o.t === undefined ? gtime : o.t, cls = d.cls, wep = CLASSES[cls].wep, boss = !!d.boss, en = isEnemy(d);
  const C = c => mode === 'w' ? '#ffffff' : (mode === 'g' ? grayHex(c) : c);
  const OL = mode === 'w' ? '#ffffff' : '#1c1624';
  const sk0 = d.skin || '#f2c9a0';
  const skin = C(sk0), skinL = C(shade(sk0, 24)), hair = C(d.hair), hairD = C(shade(d.hair, -48)), hairL = C(shade(d.hair, 28));
  const arm = C(d.armor), armD = C(shade(d.armor, -48)), armL = C(shade(d.armor, 42));
  const cape = C(d.cape), capeD = C(shade(d.cape, -48)), capeL = C(shade(d.cape, 30));
  const gold = C('#f0c84a'), goldD = C('#b8862a'), steel = C('#dfe6f2'), steelD = C('#7f8ba4'), wood = C('#8a5e34'), woodD = C('#5a3a1e'), boot = C('#4a3424');
  const bob = o.bob || 0, sway = Math.sin(t * 3 + (o.ph || 0)), wk = o.walk ? Math.sin(t * 16) : 0;
  const k = size / 100;
  ctx.save(); ctx.translate(x + (o.flip ? size : 0), y); if (o.flip) ctx.scale(-1, 1); ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = OL;
  const FS = f => { ctx.fillStyle = f; ctx.fill(); ctx.stroke(); };
  const LG = (y0, y1, c0, c1) => { if (mode === 'w') return '#fff'; const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  const RG = (cx, cy, r, c0, c1) => { if (mode === 'w') return '#fff'; const g = ctx.createRadialGradient(cx - r * .35, cy - r * .35, r * .1, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  const circ = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); };
  const limb = (x0, y0, x1, y1, col, w) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = (w || 6.4) + 3.2; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = w || 6.4; ctx.strokeStyle = col; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; };
  const soft = (col, a) => mode === 'w' ? '#fff' : col.replace('A', a);

  // aura boss
  if (boss && mode === 'n') { const g = ctx.createRadialGradient(50, 60, 10, 50, 60, 66); g.addColorStop(0, 'rgba(255,70,60,.38)'); g.addColorStop(1, 'rgba(255,70,60,0)'); ctx.fillStyle = g; ctx.fillRect(-30, -20, 160, 150); }

  // ---- kaki ----
  [0, 1].forEach(i => {
    const lx = 38 + i * 13, off = wk * (i ? 1 : -1) * 3;
    ctx.beginPath(); rrect(lx, 74, 10, 14, 4); FS(LG(74, 88, armD, C(shade(d.armor, -75))));
    ctx.beginPath(); rrect(lx - 1.5 + off, 84, 13, 8.5, 4); FS(LG(84, 93, C(shade('#4a3424', 25)), boot));
  });

  ctx.save(); ctx.translate(0, bob);

  // ---- belakang: jubah, rambut belakang, tabung panah ----
  ctx.beginPath(); ctx.moveTo(37, 51); ctx.lineTo(63, 51); ctx.quadraticCurveTo(77 + sway * 2, 70, 72 + sway * 3, 89); ctx.lineTo(28 + sway * 3, 89); ctx.quadraticCurveTo(23, 70, 37, 51); ctx.closePath(); FS(LG(50, 90, cape, capeD));
  if (cls === 'mage') { ctx.beginPath(); ctx.ellipse(50, 45, 21, 27, 0, 0, 6.283); FS(LG(20, 70, hair, hairD)); }
  if (cls === 'archer') {
    ctx.save(); ctx.translate(37, 54); ctx.rotate(-.5); ctx.beginPath(); rrect(-4.5, -17, 9, 28, 3); FS(LG(-17, 11, wood, woodD));
    ctx.strokeStyle = C('#d84a4a'); ctx.lineWidth = 2; [[-2, -17, -3, -23], [0, -17, 0, -24], [2.5, -17, 3.5, -23]].forEach(a => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); ctx.stroke(); });
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(27 + sway, 42, 6.5, 14, .35, 0, 6.283); FS(LG(28, 56, hair, hairD));   // kuncir
  }

  // ---- badan ----
  if (cls === 'mage') {
    ctx.beginPath(); ctx.moveTo(38, 50); ctx.lineTo(62, 50); ctx.lineTo(73, 90); ctx.lineTo(27, 90); ctx.closePath(); FS(LG(50, 90, armL, armD));
    ctx.beginPath(); ctx.moveTo(30.5, 83); ctx.lineTo(69.5, 83); ctx.strokeStyle = gold; ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(50, 52); ctx.lineTo(50, 82); ctx.strokeStyle = C(shade(d.armor, -25)); ctx.lineWidth = 1.5; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    ctx.beginPath(); rrect(37, 64, 26, 5.5, 2.5); FS(cape);
  } else {
    ctx.beginPath(); rrect(36, 50, 28, 28, 8); FS(LG(50, 78, armL, armD));
    if (mode === 'n') { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(45, 57, 6, 3.2, -.4, 0, 6.283); ctx.fill(); }
    ctx.beginPath(); rrect(36, 69, 28, 5.5, 2); FS(LG(69, 75, gold, goldD)); ctx.beginPath(); rrect(46, 67.5, 8, 8.5, 2); FS(gold);
    if (cls === 'archer') { ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(62, 72); ctx.strokeStyle = OL; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = wood; ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; }
    if (cls === 'fighter') { ctx.beginPath(); ctx.moveTo(41, 50); ctx.lineTo(61, 71); ctx.strokeStyle = OL; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = cape; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; }
    if (cls === 'lord') { circ(44, 53, 3.4); FS(gold); ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(50, 58); ctx.lineTo(60, 50); ctx.strokeStyle = cape; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; }
    if (cls === 'knight') {
      [36, 64].forEach(px => { circ(px, 54.5, 9); FS(RG(px, 54.5, 9, steel, armD)); circ(px, 54.5, 2); FS(gold); });
      ctx.beginPath(); ctx.moveTo(50, 52); ctx.lineTo(50, 68); ctx.strokeStyle = armD; ctx.lineWidth = 1.5; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    }
  }
  if (boss && cls !== 'mage') {
    [[30, 49, 22, 33, 38, 47], [70, 49, 78, 33, 62, 47]].forEach(a => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); ctx.lineTo(a[4], a[5]); ctx.closePath(); FS(steel); });
  }

  // ---- kepala ----
  ctx.beginPath(); circ(50, 33, 18.5); FS(RG(50, 33, 18.5, skinL, skin));
  if (mode !== 'w') {
    const eyeCol = en ? '#4a0a14' : '#1a1a34';
    [44.5, 58].forEach((ex, i) => {
      ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.ellipse(ex, 35.5, 3, 4.4, 0, 0, 6.283); ctx.fill();
      if (en) { ctx.fillStyle = 'rgba(255,60,60,.9)'; ctx.beginPath(); ctx.ellipse(ex, 36.5, 1.6, 2.2, 0, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1, 34, 1.3, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(ex - 1, 37.5, .7, 0, 6.283); ctx.fill();
    });
    ctx.strokeStyle = C(shade(d.hair, -30)); ctx.lineWidth = 1.8;
    ctx.beginPath(); if (en) { ctx.moveTo(40, 28); ctx.lineTo(48, 31.2); ctx.moveTo(62, 28); ctx.lineTo(54.5, 31.2); } else { ctx.moveTo(40.5, 29.5); ctx.lineTo(47.5, 29); ctx.moveTo(54.5, 29); ctx.lineTo(61.5, 29.6); } ctx.stroke();
    ctx.strokeStyle = '#7a3a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); if (en) { ctx.moveTo(48, 44.5); ctx.lineTo(55, 44.5); } else { ctx.arc(51.5, 42.2, 3, .25, Math.PI - .25); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,120,.32)'; ctx.beginPath(); ctx.ellipse(38.5, 41, 3.6, 2.2, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(62, 41, 3.2, 2, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
  }

  // ---- rambut / topi / helm ----
  const fringe = (yTop, spikes) => {
    ctx.beginPath(); ctx.moveTo(31, 36); ctx.bezierCurveTo(28, yTop, 72, yTop - 2, 69, 35);
    ctx.lineTo(66, 25); ctx.lineTo(62, 32); ctx.lineTo(57, 22 + spikes); ctx.lineTo(52, 31); ctx.lineTo(46, 21 + spikes); ctx.lineTo(42, 30); ctx.lineTo(36, 23); ctx.closePath(); FS(LG(yTop, 34, hairL, hair));
  };
  if (cls === 'lord') {
    fringe(8, 0); ctx.beginPath(); ctx.moveTo(32, 25); ctx.quadraticCurveTo(50, 17, 68, 25); ctx.strokeStyle = OL; ctx.lineWidth = 5.4; ctx.stroke(); ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    circ(50, 19.8, 3); FS(C('#4ad8ff'));
  } else if (cls === 'fighter') {
    ctx.beginPath(); ctx.moveTo(31, 36); ctx.lineTo(29, 14); ctx.lineTo(38, 20); ctx.lineTo(40, 3); ctx.lineTo(47, 15); ctx.lineTo(52, 0); ctx.lineTo(57, 15); ctx.lineTo(64, 4); ctx.lineTo(64, 20); ctx.lineTo(72, 13); ctx.lineTo(69, 36); ctx.closePath(); FS(LG(0, 34, hairL, hair));
    ctx.beginPath(); ctx.moveTo(31, 27); ctx.quadraticCurveTo(50, 20, 69, 27); ctx.lineTo(69, 32); ctx.quadraticCurveTo(50, 25, 31, 32); ctx.closePath(); FS(cape);
    ctx.beginPath(); ctx.moveTo(31, 29); ctx.quadraticCurveTo(24 - sway * 2, 31, 16 - sway * 3, 38); ctx.lineTo(24, 33); ctx.lineTo(18 - sway * 3, 28); ctx.closePath(); FS(capeD);
  } else if (cls === 'archer') {
    fringe(9, 1);
    ctx.beginPath(); ctx.moveTo(31, 28); ctx.quadraticCurveTo(50, 20, 69, 28); ctx.lineTo(69, 31); ctx.quadraticCurveTo(50, 23, 31, 31); ctx.closePath(); FS(cape);
    ctx.save(); ctx.translate(36, 15); ctx.rotate(-.7); ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 9.5, 0, 0, 6.283); FS(C('#f4f4ff')); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.strokeStyle = C('#d84a4a'); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
  } else if (cls === 'knight') {
    // jambul
    ctx.beginPath(); ctx.moveTo(48, 11); ctx.bezierCurveTo(38 + sway * 2, -6, 14 + sway * 3, 2, 22 + sway * 2, 26); ctx.bezierCurveTo(30, 14, 42, 20, 50, 18); ctx.closePath(); FS(LG(0, 26, capeL, capeD));
    ctx.beginPath(); ctx.moveTo(29.5, 37); ctx.lineTo(29.5, 29); ctx.arc(50, 29, 20.5, Math.PI, 0); ctx.lineTo(70.5, 37); ctx.lineTo(66, 37); ctx.lineTo(66, 29); ctx.lineTo(34, 29); ctx.lineTo(34, 37); ctx.closePath(); FS(LG(8, 38, armL, armD));
    ctx.beginPath(); ctx.moveTo(50, 9); ctx.lineTo(50, 26); ctx.strokeStyle = C(shade(d.armor, -30)); ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    ctx.beginPath(); rrect(30, 28, 40, 4.5, 2); FS(gold);
  } else if (cls === 'mage') {
    ctx.beginPath(); ctx.moveTo(31, 33); ctx.bezierCurveTo(30, 18, 70, 18, 69, 33); ctx.lineTo(64, 27); ctx.lineTo(58, 33); ctx.lineTo(52, 26); ctx.lineTo(46, 33); ctx.lineTo(40, 27); ctx.closePath(); FS(hair);
    ctx.beginPath(); ctx.ellipse(50, 21, 26, 6.5, -.04, 0, 6.283); FS(LG(15, 28, capeL, capeD));
    ctx.beginPath(); ctx.moveTo(35, 19); ctx.quadraticCurveTo(44, -2, 70 + sway * 2, -9); ctx.quadraticCurveTo(62, 8, 65, 19); ctx.quadraticCurveTo(50, 24, 35, 19); ctx.closePath(); FS(LG(-9, 22, capeL, capeD));
    ctx.beginPath(); ctx.moveTo(36, 18.6); ctx.quadraticCurveTo(50, 23, 64.6, 18.4); ctx.strokeStyle = OL; ctx.lineWidth = 5.8; ctx.stroke(); ctx.strokeStyle = gold; ctx.lineWidth = 3.2; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    ctx.fillStyle = gold; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -1.5708 + i * .6283, r = i % 2 ? 1.5 : 3.6; ctx.lineTo(50 + Math.cos(a) * r, 8 + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
  }
  if (boss && cls !== 'mage') {
    const by = cls === 'knight' ? -4 : 0;
    ctx.beginPath(); ctx.moveTo(35, 15 + by); ctx.lineTo(34, 2 + by); ctx.lineTo(42, 9 + by); ctx.lineTo(50, -3 + by); ctx.lineTo(58, 9 + by); ctx.lineTo(66, 2 + by); ctx.lineTo(65, 15 + by); ctx.closePath(); FS(LG(-3, 15, gold, goldD));
    if (mode !== 'w') { ctx.fillStyle = '#ff4a5a'; [[50, 8], [41, 11], [59, 11]].forEach(a => { ctx.beginPath(); ctx.arc(a[0], a[1] + by, 1.8, 0, 6.283); ctx.fill(); }); }
  }

  // ---- lengan & senjata ----
  const armCol = cls === 'fighter' ? skin : arm;
  limb(38, 57, 31, 68, armCol); circ(31, 68, 4.2); FS(skin);       // tangan kiri
  const R0 = [62, 57], hx = 73, hy = 64;
  if (wep === 'bow') {
    ctx.beginPath(); ctx.moveTo(40, 58); ctx.lineTo(95, 58); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = C('#e6d6a8'); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(95, 58); ctx.lineTo(87, 54.5); ctx.lineTo(87, 61.5); ctx.closePath(); ctx.fillStyle = C('#e8eef8'); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 2.5;
    const bx = 52; ctx.beginPath(); ctx.arc(bx, 58, 27, -1.18, 1.18); ctx.strokeStyle = OL; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = wood; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 27 * Math.cos(-1.18), 58 - 27 * Math.sin(1.18)); ctx.lineTo(bx + 5 * Math.cos(0), 58); ctx.lineTo(bx + 27 * Math.cos(1.18), 58 + 27 * Math.sin(1.18)); ctx.strokeStyle = C('#f4f4ff'); ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
    limb(R0[0], R0[1], 76, 59, armCol); circ(76, 59, 4.2); FS(skin);
  } else {
    limb(R0[0], R0[1], hx, hy, armCol);
    ctx.save(); ctx.translate(hx, hy);
    if (wep === 'sword') {
      ctx.rotate(-.5 + sway * .04);
      ctx.beginPath(); ctx.moveTo(-3.4, -3); ctx.lineTo(-3.4, -35); ctx.lineTo(0, -43); ctx.lineTo(3.4, -35); ctx.lineTo(3.4, -3); ctx.closePath(); FS(LG(-43, 0, '#ffffff', C('#aab4c8')));
      ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -6); ctx.strokeStyle = C('#8894ac'); ctx.lineWidth = 1.3; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
      ctx.beginPath(); rrect(-8.5, -4.5, 17, 5, 2.2); FS(LG(-5, 1, gold, goldD)); ctx.beginPath(); rrect(-2.2, 0, 4.4, 10, 2); FS(C('#5a3a24')); circ(0, 11.5, 3); FS(gold);
    } else if (wep === 'lance') {
      ctx.rotate(-.12 + sway * .02);
      ctx.beginPath(); rrect(-1.9, -50, 3.8, 82, 1.9); FS(LG(-50, 32, wood, woodD));
      ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-6, -49); ctx.lineTo(0, -52); ctx.lineTo(6, -49); ctx.closePath(); FS(LG(-70, -49, '#ffffff', steelD));
      ctx.beginPath(); ctx.moveTo(1.5, -49); ctx.quadraticCurveTo(10 + sway * 2, -44, 8 + sway * 3, -34); ctx.quadraticCurveTo(5, -42, 1.5, -40); ctx.closePath(); FS(cape);
    } else if (wep === 'axe') {
      ctx.rotate(-.18 + sway * .03);
      ctx.beginPath(); rrect(-1.9, -38, 3.8, 66, 1.9); FS(LG(-38, 28, wood, woodD));
      ctx.beginPath(); ctx.moveTo(1.9, -40); ctx.quadraticCurveTo(25, -44, 19, -14); ctx.quadraticCurveTo(10, -23, 1.9, -20); ctx.closePath(); FS(LG(-44, -14, '#ffffff', steelD));
      ctx.beginPath(); ctx.moveTo(-1.9, -35); ctx.lineTo(-9, -30); ctx.lineTo(-1.9, -25); ctx.closePath(); FS(steelD);
    } else if (wep === 'tome') {
      ctx.rotate(sway * .05);
      if (mode === 'n') { const g = ctx.createRadialGradient(0, -26, 1, 0, -26, 20); g.addColorStop(0, 'rgba(120,240,255,.65)'); g.addColorStop(1, 'rgba(120,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -48, 44, 44); }
      ctx.beginPath(); rrect(-10, -15, 20, 15, 2.5); FS(LG(-15, 0, capeL, capeD)); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -1); ctx.strokeStyle = gold; ctx.lineWidth = 1.8; ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
      ctx.beginPath(); rrect(-7.5, -12.5, 6, 10, 1); ctx.fillStyle = C('#f4eed8'); ctx.fill(); ctx.beginPath(); rrect(1.5, -12.5, 6, 10, 1); ctx.fill();
      const oy = -26 + Math.sin(t * 3) * 1.6; circ(0, oy, 5.2); FS(RG(0, oy, 5.2, '#ffffff', C(en ? '#ff6aff' : '#3ad0ff')));
    }
    ctx.restore();
    circ(hx, hy, 4.4); FS(skin);
  }
  ctx.restore();   // bob
  ctx.restore();
}

// ====== Tile HD (digambar sekali ke kanvas offscreen 144px) ======
const TILE_PX = 144, TILE_CACHE = {};
function tileCanvas(th, type, variant, frame) {
  const key = th + '_' + type + '_' + variant + '_' + (type === 3 ? frame : 0);
  if (TILE_CACHE[key]) return TILE_CACHE[key];
  const c = document.createElement('canvas'); c.width = c.height = TILE_PX; const x = c.getContext('2d');
  const T = THEMES[th], r = mulberry32(th * 1000 + variant * 77 + type * 131 + 1), S = TILE_PX;
  x.lineJoin = 'round'; x.lineCap = 'round';
  const base = () => {
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, shade(T.g[0], 8)); g.addColorStop(1, shade(T.g[0], -10)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 10; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; x.beginPath(); x.ellipse(r() * S, r() * S, 14 + r() * 22, 8 + r() * 12, r() * 3, 0, 6.283); x.fill(); }
    for (let i = 0; i < 46; i++) { const px = r() * S, py = r() * S, h = 5 + r() * 8, sw = (r() - .5) * 5; x.strokeStyle = r() < .55 ? T.g[1] : T.g[2]; x.lineWidth = 2; x.globalAlpha = .75; x.beginPath(); x.moveTo(px, py); x.lineTo(px + sw, py - h); x.stroke(); x.moveTo(px + 4, py); x.lineTo(px + 4 + sw * .6, py - h * .7); x.stroke(); }
    x.globalAlpha = 1;
  };
  if (type === 3) {
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, shade(T.w[0], 14)); g.addColorStop(1, shade(T.w[0], -22)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = T.w[1]; x.lineWidth = 3.2; x.globalAlpha = .65;
    for (let row = 0; row < 5; row++) { const yy = 14 + row * 30 + variant * 3; x.beginPath(); for (let i = 0; i <= S; i += 6) { const yv = yy + Math.sin(i * .09 + frame * 2.09 + row * 1.7 + variant) * 4; i ? x.lineTo(i, yv) : x.moveTo(i, yv); } x.stroke(); }
    x.globalAlpha = .9; x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const sx = (r() * S + frame * 22) % S, sy = r() * S; x.beginPath(); x.arc(sx, sy, 2, 0, 6.283); x.fill(); }
    x.globalAlpha = 1; return TILE_CACHE[key] = c;
  }
  base();
  if (th === 0 && variant === 2) { [[34, 40], [104, 96], [70, 110]].forEach(([fx, fy], i) => { x.fillStyle = i === 1 ? '#ffe27a' : '#fff'; for (let a = 0; a < 5; a++) { x.beginPath(); x.arc(fx + Math.cos(a * 1.2566) * 5, fy + Math.sin(a * 1.2566) * 5, 3.4, 0, 6.283); x.fill(); } x.fillStyle = '#f0a020'; x.beginPath(); x.arc(fx, fy, 3, 0, 6.283); x.fill(); }); }
  if (th === 1) { x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(r() * S, r() * S, 5 + r() * 6, 2.5, 0, 0, 6.283); x.fill(); } }
  if (type === 1) {
    x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(72, 120, 44, 12, 0, 0, 6.283); x.fill();
    x.beginPath(); x.moveTo(62, 124); x.lineTo(64, 84); x.lineTo(82, 84); x.lineTo(84, 124); x.closePath(); x.fillStyle = T.trunk; x.fill(); x.strokeStyle = shade(T.trunk, -50); x.lineWidth = 3; x.stroke();
    const blobs = [[72, 54, 40], [44, 72, 28], [100, 72, 28], [72, 78, 30]];
    blobs.forEach(([bx, by, br], i) => {
      const g = x.createRadialGradient(bx - br * .35, by - br * .4, br * .1, bx, by, br); g.addColorStop(0, shade(T.tree[0], 38)); g.addColorStop(.55, T.tree[0]); g.addColorStop(1, T.tree[1]);
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, 6.283); x.fill(); x.strokeStyle = shade(T.tree[1], -35); x.lineWidth = 3; x.stroke();
    });
    blobs.forEach(([bx, by, br]) => { x.fillStyle = th === 1 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(bx - br * .25, by - br * .55, br * .5, br * .2, -.3, 0, 6.283); x.fill(); });
  } else if (type === 2) {
    x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(72, 124, 56, 11, 0, 0, 6.283); x.fill();
    const peak = (cx, top, hw, bot) => {
      x.beginPath(); x.moveTo(cx - hw, bot); x.lineTo(cx - hw * .25, top + 8); x.lineTo(cx, top); x.lineTo(cx + hw * .28, top + 10); x.lineTo(cx + hw, bot); x.closePath();
      const g = x.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, T.rock[0]); g.addColorStop(.5, T.rock[0]); g.addColorStop(.5, T.rock[1]); g.addColorStop(1, shade(T.rock[1], -25)); x.fillStyle = g; x.fill(); x.strokeStyle = '#2a2a38'; x.lineWidth = 3.4; x.stroke();
      x.beginPath(); x.moveTo(cx - hw * .42, top + 38); x.lineTo(cx - hw * .25, top + 8); x.lineTo(cx, top); x.lineTo(cx + hw * .28, top + 10); x.lineTo(cx + hw * .46, top + 40); x.lineTo(cx + hw * .2, top + 31); x.lineTo(cx, top + 42); x.lineTo(cx - hw * .2, top + 30); x.closePath(); x.fillStyle = T.rock[2]; x.fill(); x.stroke();
      x.strokeStyle = 'rgba(30,30,50,.4)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx, top + 42); x.lineTo(cx + hw * .1, bot - 6); x.moveTo(cx - hw * .5, bot - 20); x.lineTo(cx - hw * .2, bot - 6); x.stroke();
    };
    peak(96, 36, 34, 122); peak(60, 14, 52, 124);
  }
  x.strokeStyle = 'rgba(0,0,0,.10)'; x.lineWidth = 3; x.strokeRect(0, 0, S, S);
  return TILE_CACHE[key] = c;
}
