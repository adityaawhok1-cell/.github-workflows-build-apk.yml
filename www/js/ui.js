'use strict';
// ====== Kanvas, input, UI, tween, partikel ======
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
let btns = [], modal = null, scene = null, fadeA = 0, fadeDir = 0, pend = null, scrollY = 0, maxScroll = 0, gtime = 0, speedMul = 1, down = null;
const SC = {}, tweens = [], parts = [];

function resize() { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px'; }
addEventListener('resize', resize); resize();

function go(n, a) { if (fadeDir) return; pend = [n, a]; fadeDir = 1; }
function enterScene(n, a) { scene = SC[n]; scrollY = 0; maxScroll = 0; btns = []; modal = null; if (scene.enter) scene.enter(a); }

// ---- tween ----
function tw(ms, fn) { return new Promise(res => tweens.push({ t: 0, d: ms, fn: fn || (() => { }), res })); }
function wait(ms) { return tw(ms); }
function updTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const a = tweens[i]; a.t += dt * 1000 * speedMul * (window.TEST_SPEED || 1); const p = Math.min(1, a.t / a.d); a.fn(p);
    if (p >= 1) { tweens.splice(i, 1); a.res(); }
  }
}
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

// ---- partikel ----
function addPart(x, y, o) { parts.push(Object.assign({ x, y, vx: 0, vy: 0, g: 0, life: .6, max: .6, c: '#fff', s: 3 }, o, { max: o.life || .6 })); }
function burst(x, y, n, col, spd, life, g) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (.3 + Math.random() * .7) * spd; addPart(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: Array.isArray(col) ? col[i % col.length] : col, life: (life || .6) * (.6 + Math.random() * .6), g: g || 0, s: 2 + Math.floor(Math.random() * 3) }); }
}
function updParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
function drawParts() { parts.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }); ctx.globalAlpha = 1; }

// ---- teks & panel ----
function txt(s, x, y, o) {
  o = o || {}; const sz = o.size || 10;
  ctx.font = 'bold ' + sz + 'px "Courier New",monospace'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'top';
  if (o.shadow !== false) { ctx.fillStyle = o.sh || '#0a0e24'; ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
  ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, Math.round(x), Math.round(y));
}
function wrapTxt(s, max) {
  const w = s.split(' '), lines = []; let l = '';
  w.forEach(t => { if ((l + ' ' + t).trim().length > max) { lines.push(l.trim()); l = t; } else l += ' ' + t; }); if (l.trim()) lines.push(l.trim()); return lines;
}
function panel(x, y, w, h, a, b) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, a || '#2f55b0'); g.addColorStop(1, b || '#14246a');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1; ctx.strokeStyle = '#080c26'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.strokeStyle = '#e8d890'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.strokeStyle = '#5a7ad8'; ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
}
const inside = (px, py, x, y, w, h) => px >= x && px < x + w && py >= y && py < y + h;
function btn(x, y, w, h, label, fn, o) {
  o = o || {}; if (o.clip && (y + h < o.clip[0] || y > o.clip[1])) return;
  const pr = down && !down.moved && inside(down.x, down.y, x, y, w, h) && !o.disabled; const oy = pr ? 1 : 0;
  const c1 = o.disabled ? '#586080' : (o.c1 || '#4a78e8'), c2 = o.disabled ? '#2c3250' : (o.c2 || '#1c3aa8');
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y + oy, w, h);
  ctx.strokeStyle = '#080c26'; ctx.strokeRect(x + .5, y + oy + .5, w - 1, h - 1);
  ctx.strokeStyle = o.disabled ? '#8a8a9a' : '#f0dc8c'; ctx.strokeRect(x + 1.5, y + oy + 1.5, w - 3, h - 3);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 3, y + oy + 3, w - 6, 2);
  txt(label, x + w / 2, y + oy + h / 2, { size: o.size || 12, align: 'center', base: 'middle', color: o.disabled ? '#b8b8c8' : (o.color || '#fff') });
  btns.push({ x, y, w, h, fn: o.disabled ? (o.onDisabled || null) : fn, quiet: o.quiet });
}
function region(x, y, w, h, fn) { btns.push({ x, y, w, h, fn, quiet: true }); }
function bar(x, y, w, h, v, max, col, bg) {
  ctx.fillStyle = '#05081c'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = bg || '#2a2f4a'; ctx.fillRect(x, y, w, h);
  const ww = Math.max(0, Math.round(w * Math.min(1, v / max))); ctx.fillStyle = col; ctx.fillRect(x, y, ww, h);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, ww, Math.max(1, Math.floor(h / 3)));
}
function stars(n, x, y, size, col) { const s = '★'.repeat(n); txt(s, x, y, { size: size || 10, color: col || '#ffd84a', align: 'left' }); }
const STAR_COL = { 3: '#8ab8ff', 4: '#d89aff', 5: '#ffd84a' };

function showModal(m) { modal = m; }
function closeModal() { modal = null; }
function drawModal() {
  if (!modal) return;
  ctx.fillStyle = 'rgba(0,0,10,.62)'; ctx.fillRect(0, 0, W, H);
  const lines = []; (modal.lines || []).forEach(l => wrapTxt(l, 28).forEach(x => lines.push(x)));
  const h = 54 + lines.length * 14 + 16 + 44, w = 270, x = (W - w) / 2, y = Math.max(20, (H - h) / 2 - 20);
  panel(x, y, w, h); txt(modal.title || '', W / 2, y + 14, { size: 14, align: 'center', color: '#ffe27a' });
  lines.forEach((l, i) => txt(l, W / 2, y + 42 + i * 14, { size: 10, align: 'center' }));
  const bs = modal.buttons || [['OK', null]]; const bw = Math.min(110, (w - 24 - (bs.length - 1) * 8) / bs.length), tot = bs.length * bw + (bs.length - 1) * 8;
  const mb = [];
  bs.forEach((b, i) => { const bx = x + (w - tot) / 2 + i * (bw + 8), by = y + h - 44; btn(bx, by, bw, 30, b[0], null, { size: 11 }); btns.pop(); mb.push({ x: bx, y: by, w: bw, h: 30, fn: b[1] }); });
  modal.rects = mb;
}

// ---- background ----
const STARS = []; { const r = mulberry32(5); for (let i = 0; i < 70; i++) STARS.push({ x: Math.floor(r() * W), y: Math.floor(r() * 380), s: r() < .2 ? 2 : 1, f: .8 + r() * 2.2, p: r() * 6 }); }
function drawSky(towerY) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060a22'); g.addColorStop(.5, '#2a1c5e'); g.addColorStop(1, '#8a3a6a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  STARS.forEach(s => { ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(gtime * s.f + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }); ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4efd0'; ctx.beginPath(); ctx.arc(258, 78, 20, 0, 6.283); ctx.fill(); ctx.fillStyle = '#d8d0a8';
  ctx.fillRect(250, 70, 4, 4); ctx.fillRect(262, 84, 5, 5); ctx.fillRect(256, 90, 3, 3);
  for (let i = 0; i < 3; i++) { const cx = ((gtime * (6 + i * 3) + i * 140) % (W + 120)) - 60, cy = 150 + i * 46; ctx.fillStyle = 'rgba(160,120,200,' + (.16 + i * .04) + ')'; ctx.fillRect(cx, cy, 70, 6); ctx.fillRect(cx + 12, cy - 5, 40, 5); ctx.fillRect(cx + 20, cy + 6, 36, 4); }
  drawTower(towerY === undefined ? 130 : towerY);
}
function drawTower(top) {
  const cx = 160, base = H - 150;
  ctx.fillStyle = '#18102e';
  const tiers = [[34, 0, 40], [46, 40, 90], [58, 90, 170], [70, 170, 300]];
  tiers.forEach(([hw, a, b]) => { ctx.fillRect(cx - hw, top + a, hw * 2, b - a + 1); });
  ctx.fillRect(cx - hw0(), top + 300, hw0() * 2, base - top - 300 + 40);
  // atap
  ctx.beginPath(); ctx.moveTo(cx - 44, top + 2); ctx.lineTo(cx, top - 38); ctx.lineTo(cx + 44, top + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1c4a'; for (let y = top; y < base + 30; y += 12) ctx.fillRect(cx - 78, y, 156, 1);
  const wr = mulberry32(11);
  for (let y = top + 8; y < base; y += 22) for (let k = -2; k <= 2; k++) { const on = wr() < .6; if (!on) continue; const fl = .7 + .3 * Math.sin(gtime * 2 + y + k); ctx.fillStyle = 'rgba(255,214,106,' + fl + ')'; if (Math.abs(k) * 20 < 34 + Math.min(40, Math.max(0, (y - top) / 5))) ctx.fillRect(cx + k * 22 - 2, y, 5, 8); }
  // bendera
  ctx.fillStyle = '#c8c0e0'; ctx.fillRect(cx - 1, top - 50, 2, 28);
  const fw = Math.sin(gtime * 4) * 2; ctx.fillStyle = '#e8453b'; ctx.fillRect(cx + 1, top - 50, 14, 4); ctx.fillRect(cx + 1, top - 46, 10 + fw, 4); ctx.fillRect(cx + 1, top - 42, 6 + fw, 3);
  // bukit depan
  ctx.fillStyle = '#0c0820'; ctx.fillRect(0, base + 20, W, H); for (let x = 0; x < W; x += 4) { const hh = 14 + Math.sin(x * .05) * 6 + Math.sin(x * .13) * 3; ctx.fillRect(x, base + 20 - hh, 4, hh + 2); }
  ctx.fillStyle = '#1a2a2a'; for (let x = 0; x < W; x += 4) { const hh = 14 + Math.sin(x * .05) * 6 + Math.sin(x * .13) * 3; ctx.fillRect(x, base + 20 - hh, 4, 2); }
}
function hw0() { return 78; }

// ---- main loop ----
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(.05, ((ts - lastTs) / 1000) || 0); lastTs = ts; gtime += dt;
  updTweens(dt); updParts(dt);
  if (scene && scene.update) scene.update(dt);
  if (fadeDir) { fadeA += fadeDir * dt / .22; if (fadeDir > 0 && fadeA >= 1) { fadeA = 1; fadeDir = -1; enterScene(pend[0], pend[1]); } else if (fadeDir < 0 && fadeA <= 0) { fadeA = 0; fadeDir = 0; } }
  btns = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
  if (scene) scene.draw();
  drawParts(); drawModal();
  if (fadeA > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fadeA + ')'; ctx.fillRect(0, 0, W, H); }
  requestAnimationFrame(frame);
}

// ---- input ----
function ptr(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
cv.addEventListener('pointerdown', e => { auInit(); const p = ptr(e); down = { x: p.x, y: p.y, sy: scrollY, moved: false }; if (scene && scene.skip) scene.skip(); e.preventDefault(); });
cv.addEventListener('pointermove', e => {
  if (!down) return; const p = ptr(e); const dy = p.y - down.y;
  if (Math.abs(dy) > 8 || Math.abs(p.x - down.x) > 8) down.moved = true;
  if (down.moved && maxScroll > 0) scrollY = Math.max(0, Math.min(maxScroll, down.sy - dy));
});
cv.addEventListener('pointerup', e => { const d = down; down = null; if (!d || d.moved) return; const p = ptr(e); tap(p.x, p.y); });
cv.addEventListener('pointercancel', () => { down = null; });
function tap(x, y) {
  if (fadeDir) return;
  if (modal) {
    const m = modal; for (const r of (m.rects || [])) if (inside(x, y, r.x, r.y, r.w, r.h)) { sfx('click'); if (modal === m) closeModal(); if (r.fn) r.fn(); return; } return;
  }
  for (let i = btns.length - 1; i >= 0; i--) { const b = btns[i]; if (inside(x, y, b.x, b.y, b.w, b.h)) { if (b.fn) { if (!b.quiet) sfx('click'); b.fn(); } else if (!b.quiet) sfx('error'); return; } }
  if (scene && scene.tap) scene.tap(x, y);
}
