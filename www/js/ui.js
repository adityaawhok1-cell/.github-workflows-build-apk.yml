'use strict';
// ====== Kanvas HD landscape, input, UI, tween, partikel ======
// Koordinat logis: 960x540 (16:9). Di layar lebih lebar, area tambahan (OX) dipakai latar.
// Backing-store kanvas mengikuti resolusi layar asli (devicePixelRatio) => tajam, bukan pixelated.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = VW, OX = 0, PXR = 1;
let btns = [], modal = null, scene = null, fadeA = 0, fadeDir = 0, pend = null, scrollY = 0, maxScroll = 0, gtime = 0, speedMul = 1, down = null;
const SC = {}, tweens = [], parts = [];
const FONT = '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

function resize() {
  const iw = Math.max(1, innerWidth), ih = Math.max(1, innerHeight);
  W = Math.round(Math.max(VW, Math.min(1200, VH * iw / ih))); OX = (W - VW) / 2;
  const s = Math.min(iw / W, ih / VH);
  const cssW = Math.floor(W * s), cssH = Math.floor(VH * s);
  let r = s * Math.min(3, window.devicePixelRatio || 1);      // piksel fisik per unit logis
  const MAXPX = 2800; if (W * r > MAXPX) r = MAXPX / W;      // batasi demi performa
  r = Math.max(r, .5);
  cv.width = Math.round(W * r); cv.height = Math.round(VH * r);
  cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; PXR = cv.width / W;
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 120)); resize();

function go(n, a) { if (fadeDir) return; pend = [n, a]; fadeDir = 1; }
function enterScene(n, a) { scene = SC[n]; scrollY = 0; maxScroll = 0; btns = []; modal = null; if (scene.enter) scene.enter(a); }

// ---- tween ----
function tw(ms, fn) { return new Promise(res => tweens.push({ t: 0, d: ms, fn: fn || (() => { }), res })); }
function wait(ms) { return tw(ms); }
function updTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const a = tweens[i]; a.t += dt * 1000 * speedMul * (window.TEST_SPEED || 1); const p = Math.min(1, a.t / a.d); try { a.fn(p); } catch (e) { }
    if (p >= 1) { tweens.splice(i, 1); a.res(); }
  }
}
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

// ---- partikel (skala 960x540) ----
function addPart(x, y, o) { parts.push(Object.assign({ x, y, vx: 0, vy: 0, g: 0, life: .6, max: .6, c: '#fff', s: 5 }, o, { max: o.life || .6 })); }
function burst(x, y, n, col, spd, life, g) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (.3 + Math.random() * .7) * spd * 1.8; addPart(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: Array.isArray(col) ? col[i % col.length] : col, life: (life || .6) * (.6 + Math.random() * .6), g: (g || 0) * 1.8, s: 3 + Math.random() * 4 }); }
}
function updParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
function drawParts() { parts.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * .55, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1; }

// ---- teks & panel ----
function fullRect(fill) { ctx.fillStyle = fill; ctx.fillRect(-OX - 1, -1, W + 2, VH + 2); }
function txt(s, x, y, o) {
  o = o || {}; const sz = o.size || 16;
  ctx.font = (o.weight || 'bold') + ' ' + sz + 'px ' + FONT; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'top';
  ctx.lineJoin = 'round';
  if (o.shadow !== false) { ctx.lineWidth = Math.max(2.5, sz * .2); ctx.strokeStyle = o.sh || 'rgba(8,10,36,.92)'; ctx.strokeText(s, x, y); }
  if (o.grad) { const yy = o.base === 'middle' ? y - sz / 2 : y; const g = ctx.createLinearGradient(0, yy, 0, yy + sz); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
  else ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
}
function measure(s, size) { ctx.font = 'bold ' + size + 'px ' + FONT; return ctx.measureText(s).width; }
function wrapPx(s, maxW, size) {
  ctx.font = 'bold ' + size + 'px ' + FONT; const w = s.split(' '), lines = []; let l = '';
  w.forEach(t => { const tryL = l ? l + ' ' + t : t; if (ctx.measureText(tryL).width > maxW && l) { lines.push(l); l = t; } else l = tryL; });
  if (l) lines.push(l); return lines;
}
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function panel(x, y, w, h, a, b, r) {
  r = r === undefined ? 14 : r;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.42)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4; rrect(x, y, w, h, r); ctx.fillStyle = '#0a1030'; ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, a || '#2f55b0'); g.addColorStop(1, b || '#14246a');
  rrect(x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#080c26'; rrect(x + 1.5, y + 1.5, w - 3, h - 3, r); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#e8d890'; rrect(x + 3.5, y + 3.5, w - 7, h - 7, Math.max(2, r - 2)); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(110,150,240,.55)'; rrect(x + 8, y + 8, w - 16, h - 16, Math.max(2, r - 6)); ctx.stroke();
  ctx.lineWidth = 1;
}
const inside = (px, py, x, y, w, h) => px >= x && px < x + w && py >= y && py < y + h;
function btn(x, y, w, h, label, fn, o) {
  o = o || {}; if (o.clip && (y + h < o.clip[0] || y > o.clip[1])) return;
  const pr = down && !down.moved && inside(down.x, down.y, x, y, w, h) && !o.disabled; const oy = pr ? 2 : 0;
  const c1 = o.disabled ? '#586080' : (o.c1 || '#4a78e8'), c2 = o.disabled ? '#2c3250' : (o.c2 || '#1c3aa8');
  const r = Math.min(12, h / 2.5);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
  if (!pr) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; rrect(x, y, w, h, r); ctx.fillStyle = c2; ctx.fill(); ctx.restore(); }
  rrect(x, y + oy, w, h, r); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#080c26'; rrect(x + 1.2, y + oy + 1.2, w - 2.4, h - 2.4, r); ctx.stroke();
  ctx.lineWidth = 1.8; ctx.strokeStyle = o.disabled ? '#8a8a9a' : '#f0dc8c'; rrect(x + 3.4, y + oy + 3.4, w - 6.8, h - 6.8, Math.max(2, r - 2)); ctx.stroke();
  const gl = ctx.createLinearGradient(0, y, 0, y + h * .5); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  rrect(x + 5, y + oy + 5, w - 10, h * .42, Math.max(2, r - 4)); ctx.fillStyle = gl; ctx.fill(); ctx.lineWidth = 1;
  if (label) txt(label, x + w / 2, y + oy + h / 2 + 1, { size: o.size || 20, align: 'center', base: 'middle', color: o.disabled ? '#b8b8c8' : (o.color || '#fff') });
  btns.push({ x, y, w, h, fn: o.disabled ? (o.onDisabled || null) : fn, quiet: o.quiet });
}
function region(x, y, w, h, fn) { btns.push({ x, y, w, h, fn, quiet: true }); }
function bar(x, y, w, h, v, max, col, bg) {
  const r = h / 2; rrect(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5); ctx.fillStyle = '#05081c'; ctx.fill();
  rrect(x, y, w, h, r); ctx.fillStyle = bg || '#2a2f4a'; ctx.fill();
  const ww = Math.max(0, w * Math.min(1, v / max)); if (ww > 0.5) {
    ctx.save(); rrect(x, y, w, h, r); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(col, 35)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fillRect(x, y, ww, h);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, ww, Math.max(1, h / 3)); ctx.restore();
  }
}
function stars(n, x, y, size, col) { txt('★'.repeat(n), x, y, { size: size || 16, color: col || '#ffd84a', align: 'left' }); }
const STAR_COL = { 3: '#8ab8ff', 4: '#d89aff', 5: '#ffd84a' };

function showModal(m) { modal = m; }
function closeModal() { modal = null; }
function drawModal() {
  if (!modal) return;
  fullRect('rgba(0,0,10,.62)');
  const lines = []; (modal.lines || []).forEach(l => wrapPx(l, 400, 18).forEach(x => lines.push(x)));
  const h = 70 + lines.length * 26 + 20 + 62, w = 470, x = (VW - w) / 2, y = Math.max(16, (VH - h) / 2);
  panel(x, y, w, h); txt(modal.title || '', VW / 2, y + 22, { size: 26, align: 'center', color: '#ffe27a' });
  lines.forEach((l, i) => txt(l, VW / 2, y + 68 + i * 26, { size: 18, align: 'center' }));
  const bs = modal.buttons || [['OK', null]]; const bw = Math.min(180, (w - 50 - (bs.length - 1) * 14) / bs.length), tot = bs.length * bw + (bs.length - 1) * 14;
  const mb = [];
  bs.forEach((b, i) => { const bx = x + (w - tot) / 2 + i * (bw + 14), by = y + h - 64; btn(bx, by, bw, 46, b[0], null, { size: 19 }); btns.pop(); mb.push({ x: bx, y: by, w: bw, h: 46, fn: b[1] }); });
  modal.rects = mb;
}

// ---- latar: langit malam + menara (vektor) ----
const STARS = []; { const r = mulberry32(5); for (let i = 0; i < 150; i++) STARS.push({ x: r(), y: r() * .72, s: r() < .15 ? 2.2 : (r() < .5 ? 1.4 : .9), f: .8 + r() * 2.2, p: r() * 6 }); }
function drawSky(towerX, towerTop, o) {
  o = o || {};
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#050920'); g.addColorStop(.45, '#271a5a'); g.addColorStop(.78, '#7a3a78'); g.addColorStop(1, '#c0586a');
  fullRect(g);
  STARS.forEach(s => { ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(gtime * s.f + s.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-OX + s.x * W, s.y * VH, s.s, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1;
  // bulan
  const mx = o.moonX === undefined ? 800 : o.moonX, my = o.moonY === undefined ? 96 : o.moonY;
  let mg = ctx.createRadialGradient(mx, my, 20, mx, my, 120); mg.addColorStop(0, 'rgba(255,248,210,.35)'); mg.addColorStop(1, 'rgba(255,248,210,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 130, my - 130, 260, 260);
  mg = ctx.createRadialGradient(mx - 8, my - 8, 4, mx, my, 38); mg.addColorStop(0, '#fffbe6'); mg.addColorStop(1, '#e0d6a4'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 38, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(160,150,110,.35)'; [[-12, -8, 7], [10, 6, 9], [-4, 16, 5], [14, -14, 4]].forEach(c => { ctx.beginPath(); ctx.arc(mx + c[0], my + c[1], c[2], 0, 6.283); ctx.fill(); });
  // awan lembut
  for (let i = 0; i < 4; i++) {
    const sp = 7 + i * 3, span = W + 400, cx = ((gtime * sp + i * 330) % span) - 200 - OX, cy = 200 + i * 52;
    ctx.fillStyle = 'rgba(190,150,230,' + (.10 + i * .03) + ')';
    [[0, 0, 90, 14], [-50, 6, 60, 10], [55, 7, 66, 10]].forEach(c => { ctx.beginPath(); ctx.ellipse(cx + c[0], cy + c[1], c[2], c[3], 0, 0, 6.283); ctx.fill(); });
  }
  // gunung jauh
  ctx.fillStyle = '#2a1c52'; ctx.beginPath(); ctx.moveTo(-OX - 1, VH);
  for (let x = -OX - 1; x <= W - OX + 4; x += 6) ctx.lineTo(x, 392 - (Math.abs(Math.sin(x * .0085 + 1.2)) * 80 + Math.abs(Math.sin(x * .024)) * 20));
  ctx.lineTo(W - OX + 4, VH); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1c1240'; ctx.beginPath(); ctx.moveTo(-OX - 1, VH);
  for (let x = -OX - 1; x <= W - OX + 4; x += 6) ctx.lineTo(x, 420 - (Math.abs(Math.sin(x * .013 + 3)) * 50 + Math.abs(Math.sin(x * .05)) * 10));
  ctx.lineTo(W - OX + 4, VH); ctx.closePath(); ctx.fill();
  if (towerX !== undefined) drawTower(towerX, towerTop === undefined ? 60 : towerTop, 440);
  // bukit depan
  ctx.fillStyle = '#0d0822'; ctx.beginPath(); ctx.moveTo(-OX - 1, VH);
  for (let x = -OX - 1; x <= W - OX + 4; x += 6) ctx.lineTo(x, 452 - (Math.sin(x * .012) * 14 + Math.sin(x * .031 + 2) * 7));
  ctx.lineTo(W - OX + 4, VH); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#16252a'; ctx.beginPath(); ctx.moveTo(-OX - 1, 470);
  for (let x = -OX - 1; x <= W - OX + 4; x += 6) ctx.lineTo(x, 464 - (Math.sin(x * .012) * 14 + Math.sin(x * .031 + 2) * 7) + 10);
  for (let x = W - OX + 4; x >= -OX - 1; x -= 6) ctx.lineTo(x, 470 - (Math.sin(x * .012) * 14 + Math.sin(x * .031 + 2) * 7) + 20);
  ctx.closePath(); ctx.fill();
  const tr = mulberry32(31); ctx.fillStyle = '#0a0618';
  for (let i = 0; i < 40; i++) { const x = -OX + tr() * W, by = 452 - (Math.sin(x * .012) * 14 + Math.sin(x * .031 + 2) * 7) + 6, h = 22 + tr() * 22; ctx.beginPath(); ctx.moveTo(x - 9, by); ctx.lineTo(x, by - h); ctx.lineTo(x + 9, by); ctx.closePath(); ctx.fill(); }
}
function drawTower(cx, top, gy) {
  const tiers = [[34, 36, 120], [50, 120, 220], [66, 220, 320], [84, 320, gy - top]];
  tiers.forEach(([hw, a, b], ti) => {
    const y0 = top + a, y1 = top + b, h = y1 - y0;
    const g = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, '#34296a'); g.addColorStop(.45, '#241a4c'); g.addColorStop(1, '#130c2c');
    ctx.fillStyle = g; ctx.fillRect(cx - hw, y0, hw * 2, h + 1);
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1;
    for (let yy = y0 + 14, row = 0; yy < y1; yy += 14, row++) { ctx.beginPath(); ctx.moveTo(cx - hw, yy); ctx.lineTo(cx + hw, yy); ctx.stroke(); for (let xx = cx - hw + (row % 2 ? 14 : 4); xx < cx + hw; xx += 20) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 14); ctx.stroke(); } }
    ctx.fillStyle = '#322766'; ctx.fillRect(cx - hw - 4, y0 - 4, hw * 2 + 8, 8);   // bibir
    ctx.fillStyle = '#241a4c'; for (let xx = cx - hw - 4; xx < cx + hw + 4 - 8; xx += 16) ctx.fillRect(xx, y0 - 14, 9, 11);   // gerigi
    // jendela
    const wr = mulberry32(11 + ti), n = ti === 0 ? 1 : (ti === 1 ? 2 : 3);
    for (let yy = y0 + 26; yy < y1 - 36; yy += 46) for (let k = 0; k < n; k++) {
      if (wr() < .25) continue; const wx = cx + (k - (n - 1) / 2) * (hw * 2 / (n + .6)), fl = .65 + .35 * Math.sin(gtime * 2 + yy + k * 2);
      const hg = ctx.createRadialGradient(wx, yy + 10, 1, wx, yy + 10, 24); hg.addColorStop(0, 'rgba(255,200,90,' + .35 * fl + ')'); hg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = hg; ctx.fillRect(wx - 26, yy - 14, 52, 50);
      ctx.fillStyle = 'rgba(255,214,106,' + fl + ')'; ctx.beginPath(); ctx.moveTo(wx - 6, yy + 20); ctx.lineTo(wx - 6, yy + 6); ctx.arc(wx, yy + 6, 6, Math.PI, 0); ctx.lineTo(wx + 6, yy + 20); ctx.closePath(); ctx.fill();
    }
  });
  const top0 = top + 36;
  const rg = ctx.createLinearGradient(cx - 46, 0, cx + 46, 0); rg.addColorStop(0, '#6a2a78'); rg.addColorStop(1, '#2a1048');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(cx - 46, top0 - 12); ctx.lineTo(cx, top0 - 78); ctx.lineTo(cx + 46, top0 - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8c0e0'; ctx.fillRect(cx - 1.2, top0 - 126, 2.4, 52);
  const fw = Math.sin(gtime * 4) * 3, fw2 = Math.sin(gtime * 4 + 1) * 3; ctx.fillStyle = '#e8453b'; ctx.beginPath(); ctx.moveTo(cx + 1, top0 - 124); ctx.quadraticCurveTo(cx + 14, top0 - 128 + fw, cx + 28 + fw, top0 - 120); ctx.quadraticCurveTo(cx + 16, top0 - 116 + fw2, cx + 24 + fw, top0 - 108); ctx.quadraticCurveTo(cx + 12, top0 - 112, cx + 1, top0 - 104); ctx.closePath(); ctx.fill();
  // pintu
  const ty = gy - 54; ctx.fillStyle = '#0a0618'; ctx.beginPath(); ctx.moveTo(cx - 17, gy); ctx.lineTo(cx - 17, ty + 18); ctx.arc(cx, ty + 18, 17, Math.PI, 0); ctx.lineTo(cx + 17, gy); ctx.closePath(); ctx.fill();
  const dg = ctx.createRadialGradient(cx, gy - 14, 2, cx, gy - 14, 26); dg.addColorStop(0, 'rgba(255,190,90,.55)'); dg.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = dg; ctx.fillRect(cx - 30, gy - 50, 60, 52);
}

// ---- main loop ----
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(.05, ((ts - lastTs) / 1000) || 0); lastTs = ts; gtime += dt;
  updTweens(dt); updParts(dt);
  if (scene && scene.update) scene.update(dt);
  if (fadeDir) { fadeA += fadeDir * dt / .22; if (fadeDir > 0 && fadeA >= 1) { fadeA = 1; fadeDir = -1; enterScene(pend[0], pend[1]); } else if (fadeDir < 0 && fadeA <= 0) { fadeA = 0; fadeDir = 0; } }
  btns = [];
  ctx.setTransform(PXR, 0, 0, PXR, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, VH);
  ctx.save(); ctx.translate(OX, 0);
  if (scene) scene.draw();
  drawParts(); drawModal();
  if (fadeA > 0) fullRect('rgba(0,0,0,' + fadeA + ')');
  ctx.restore();
  requestAnimationFrame(frame);
}

// ---- input ----
function ptr(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width - OX, y: (e.clientY - r.top) * VH / r.height }; }
cv.addEventListener('pointerdown', e => { auInit(); const p = ptr(e); down = { x: p.x, y: p.y, sy: scrollY, moved: false }; if (scene && scene.skip) scene.skip(); e.preventDefault(); });
cv.addEventListener('pointermove', e => {
  if (!down) return; const p = ptr(e); const dy = p.y - down.y;
  if (Math.abs(dy) > 12 || Math.abs(p.x - down.x) > 12) down.moved = true;
  if (down.moved && maxScroll > 0) scrollY = Math.max(0, Math.min(maxScroll, down.sy - dy));
});
cv.addEventListener('pointerup', e => { const d = down; down = null; if (!d || d.moved) return; const p = ptr(e); tap(p.x, p.y); });
cv.addEventListener('pointercancel', () => { down = null; });
cv.addEventListener('wheel', e => { if (maxScroll > 0) { scrollY = Math.max(0, Math.min(maxScroll, scrollY + e.deltaY * .5)); e.preventDefault(); } }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
function tap(x, y) {
  if (fadeDir) return;
  if (modal) {
    const m = modal; for (const r of (m.rects || [])) if (inside(x, y, r.x, r.y, r.w, r.h)) { sfx('click'); if (modal === m) closeModal(); if (r.fn) r.fn(); return; } return;
  }
  for (let i = btns.length - 1; i >= 0; i--) { const b = btns[i]; if (inside(x, y, b.x, b.y, b.w, b.h)) { if (b.fn) { if (!b.quiet) sfx('click'); b.fn(); } else if (!b.quiet) sfx('error'); return; } }
  if (scene && scene.tap) scene.tap(x, y);
}
