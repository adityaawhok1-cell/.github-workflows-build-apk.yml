'use strict';
// ====== Scene landscape HD: judul, menu, gacha, pahlawan, pilih lantai ======
const pick = a => a[Math.floor(Math.random() * a.length)];
function heroDef(id) { return HERO[id]; }
function shadowEll(cx, cy, rx, ry, a) { ctx.fillStyle = 'rgba(0,0,0,' + (a === undefined ? .35 : a) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.fill(); }
function orbsBadge() {
  panel(VW - 176, 10, 166, 42, '#2a2a6a', '#16164a', 12);
  txt('◆', VW - 160, 18, { size: 22, color: '#7af0ff' }); txt(String(save.orbs), VW - 20, 17, { size: 24, align: 'right' });
}
function hIcon(id, x, y, w, h, o) {
  o = o || {}; const hd = HERO[id], s = save.owned[id], col = STAR_COL[hd.stars];
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2c3c7c'); g.addColorStop(1, '#0e1640');
  rrect(x, y, w, h, 12); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; rrect(x + 1.5, y + 1.5, w - 3, h - 3, 11); ctx.stroke(); ctx.lineWidth = 1;
  const sz = o.size || w * .78;
  const rg = ctx.createRadialGradient(x + w / 2, y + 10 + sz * .6, 4, x + w / 2, y + 10 + sz * .6, sz * .7); rg.addColorStop(0, col + '55'); rg.addColorStop(1, col + '00'); ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  shadowEll(x + w / 2, y + 12 + sz * .93, sz * .32, sz * .07, .4);
  drawHero(hd, x + (w - sz) / 2, y + 12, sz, { bob: idleBob(x * .01), ph: x * .01 });
  const base = y + 12 + sz;
  txt(hd.name, x + w / 2, base + 2, { size: o.nsize || 16, align: 'center' });
  if (s) txt('Lv' + s.lv, x + w / 2, base + 2 + (o.nsize || 16) + 3, { size: o.lsize || 14, align: 'center', color: '#bcd0ff' });
  txt('★'.repeat(hd.stars), x + 7, y + 5, { size: 13, color: col });
  if (s && s.lb > 0) txt('+' + s.lb, x + w - 7, y + 5, { size: 14, align: 'right', color: '#7af0ff' });
}
function logo(cx, y, size) {
  txt('MENARA', cx, y, { size, align: 'center', grad: ['#fff4b0', '#f0a828'], sh: '#7a2a10' });
  txt('EMBLEM', cx, y + size * .98, { size, align: 'center', grad: ['#e0f0ff', '#4a86e8'], sh: '#14246a' });
}

// ---------- JUDUL ----------
SC.title = {
  enter() { bgm('calm'); },
  draw() {
    drawSky(720, 64);
    const y = 56 + Math.sin(gtime * 1.6) * 4;
    ctx.textAlign = 'left'; txt('MENARA', 56, y, { size: 104, grad: ['#fff4b0', '#f0a828'], sh: '#7a2a10' });
    txt('EMBLEM', 56, y + 102, { size: 104, grad: ['#e0f0ff', '#4a86e8'], sh: '#14246a' });
    txt('Panggil pahlawan. Taklukkan menara.', 62, y + 222, { size: 26, color: '#e0d8ff' });
    save.party.slice(0, 4).forEach((id, i) => { const x = 36 + i * 118, yy = 322; shadowEll(x + 66, yy + 124, 40, 8, .4); drawHero(HERO[id], x, yy, 132, { bob: idleBob(i * 1.3), ph: i * 1.3 }); });
    if (Math.floor(gtime * 1.8) % 2 === 0) txt('- SENTUH LAYAR UNTUK MULAI -', 62, 482, { size: 28 });
  },
  tap() { sfx('select'); go('home'); }
};

// ---------- MENU UTAMA ----------
let SET = { open: false };
SC.home = {
  enter() {
    bgm('calm'); SET.open = false;
    if (save.login !== todayStr()) { save.login = todayStr(); save.orbs += 300; writeSave(); showModal({ title: 'Bonus Harian', lines: ['Selamat datang kembali!', '+300 Orb diterima.'], buttons: [['Ambil', null]] }); sfx('level'); }
  },
  draw() {
    drawSky(230, 36, { moonX: 560, moonY: 110 });
    orbsBadge();
    txt('Lantai tertinggi: ' + save.best, 22, 16, { size: 22, color: '#ffe27a' });
    save.party.slice(0, 4).forEach((id, i) => { const x = 40 + i * 106, yy = 330; shadowEll(x + 59, yy + 110, 38, 8, .4); drawHero(HERO[id], x, yy, 118, { bob: idleBob(i * 1.3), ph: i * 1.3 }); });
    panel(580, 66, 350, 440, 'rgba(30,50,130,.93)', 'rgba(14,22,80,.96)');
    logo(755, 84, 54);
    btn(610, 204, 290, 70, 'NAIK MENARA', () => go('tower'), { size: 30, c1: '#f0a028', c2: '#b04a10' });
    btn(610, 288, 290, 60, 'PANGGIL PAHLAWAN', () => go('gacha'), { size: 22, c1: '#a860e8', c2: '#5a2aa8' });
    btn(610, 362, 140, 56, 'PAHLAWAN', () => go('roster'), { size: 17 });
    btn(760, 362, 140, 56, 'PENGATURAN', () => { SET.open = true; }, { size: 16 });
    txt('Tim aktif: ' + save.party.length + ' pahlawan', 755, 440, { size: 18, align: 'center', color: '#bcd0ff' });
    if (SET.open) drawSettings();
  }
};
function drawSettings() {
  fullRect('rgba(0,0,10,.62)');
  panel(240, 30, 480, 480, '#2f55b0', '#14246a');
  txt('PENGATURAN', VW / 2, 50, { size: 30, align: 'center', color: '#ffe27a' });
  const onoff = v => v ? 'NYALA' : 'MATI';
  btn(280, 102, 400, 54, 'Efek Suara: ' + onoff(save.sfx), () => { save.sfx = !save.sfx; writeSave(); }, { size: 20 });
  btn(280, 164, 400, 54, 'Musik: ' + onoff(save.music), () => { save.music = !save.music; writeSave(); }, { size: 20 });
  btn(280, 226, 400, 54, 'Animasi Duel: ' + onoff(save.duel), () => { save.duel = !save.duel; writeSave(); }, { size: 20 });
  btn(280, 288, 400, 54, 'Cara Bermain', () => showModal({ title: 'Cara Bermain', lines: ['Sentuh pahlawanmu, pilih kotak biru untuk bergerak, lalu sentuh musuh (kotak merah) untuk menyerang.', 'Pedang > Kapak > Tombak > Pedang.', 'Hutan & gunung menambah DEF dan menghindar.', 'Menang di setiap lantai untuk dapat Orb, lalu Panggil pahlawan baru!'], buttons: [['Mengerti', null]] }), { size: 20 });
  btn(280, 350, 400, 54, 'Hapus Data', () => showModal({ title: 'Hapus Data?', lines: ['Semua pahlawan & progres akan hilang.'], buttons: [['Batal', null], ['Hapus', () => { save = defaultSave(); writeSave(); SET.open = false; }]] }), { size: 20, c1: '#d84a4a', c2: '#8a1a1a' });
  btn(280, 430, 400, 58, 'TUTUP', () => { SET.open = false; }, { size: 22 });
}

// ---------- GACHA ----------
const G = { phase: 'idle', res: [], i: 0, t: 0, col: '#5aa0ff', best: 3 };
const RCOL = { 3: '#5aa0ff', 4: '#c070ff', 5: '#ffd84a' };
function featured() { const a = POOL[5]; return a[Math.floor(Date.now() / 86400000) % a.length]; }
function rollOne(min4) {
  save.pity++;
  const r = Math.random(); let st = save.pity >= 50 ? 5 : (r < .03 ? 5 : r < .20 ? 4 : 3);
  if (min4 && st < 4) st = 4;
  if (st === 5) save.pity = 0;
  if (st === 5) return Math.random() < .5 ? featured() : pick(POOL[5]);
  return pick(POOL[st]);
}
function doPull(n) {
  const cost = n === 1 ? 100 : 900;
  if (save.orbs < cost) { sfx('error'); showModal({ title: 'Orb Kurang', lines: ['Butuh ' + cost + ' Orb.', 'Menangkan pertempuran di menara untuk mendapat Orb.'], buttons: [['OK', null], ['Ke Menara', () => go('tower')]] }); return; }
  save.orbs -= cost; const res = [];
  for (let i = 0; i < n; i++) {
    const h = rollOne(n === 10 && i === 9 && !res.some(r => r.h.stars >= 4));
    const o = save.owned[h.id]; let isNew = false, lbUp = false, refund = 0;
    if (!o) { save.owned[h.id] = { lv: 1, xp: 0, lb: 0 }; isNew = true; }
    else if (o.lb < 5) { o.lb++; lbUp = true; } else { refund = 30; save.orbs += 30; }
    res.push({ h, isNew, lbUp, refund });
  }
  save.pulls += n; writeSave(); G.res = res; G.i = 0; G.t = 0; G.phase = 'summon';
  G.best = Math.max.apply(null, res.map(r => r.h.stars)); G.col = RCOL[G.best]; sfx('summon');
}
function circle(cx, cy, r, col, w, a) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = a === undefined ? 1 : a; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
function poly(cx, cy, r, n, rot, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = rot + i * 6.283 / n; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.stroke(); ctx.lineWidth = 1; }
function gachaBg() {
  const g = ctx.createRadialGradient(VW / 2, 280, 40, VW / 2, 280, 620); g.addColorStop(0, '#3a1a6a'); g.addColorStop(1, '#07031a'); fullRect(g);
  STARS.forEach(s => { ctx.globalAlpha = .25 + .6 * Math.abs(Math.sin(gtime * s.f + s.p)); ctx.fillStyle = '#c8b8ff'; ctx.beginPath(); ctx.arc(-OX + s.x * W, (s.y * 1.35 * VH) % VH, s.s, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1;
}
function magicCircle(cx, cy, k, col) {
  const t = gtime; circle(cx, cy, 100 * k, col, 3); circle(cx, cy, 92 * k, col, 1.5, .6); circle(cx, cy, 60 * k, col, 3, .8);
  poly(cx, cy, 92 * k, 6, t * .6, col, 3); poly(cx, cy, 92 * k, 6, t * .6 + Math.PI / 6, col, 3); poly(cx, cy, 60 * k, 5, -t * .9, col, 2);
  for (let i = 0; i < 12; i++) { const a = i * 6.283 / 12 - t * .3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 80 * k, cy + Math.sin(a) * 80 * k, 3.4 * Math.max(.7, k), 0, 6.283); ctx.fill(); }
}
SC.gacha = {
  enter() { bgm('gacha'); G.phase = 'idle'; },
  update(dt) { G.t += dt; if (G.phase === 'summon' && G.t > 2.3) { G.phase = 'flash'; G.t = 0; sfx('flash'); } else if (G.phase === 'flash' && G.t > .5) { G.phase = 'reveal'; G.t = 0; this.revealFx(); } },
  skip() { if (G.phase === 'summon' && G.t > .4) G.t = 2.29; },
  revealFx() { const r = G.res[G.i]; sfx('r' + r.h.stars); burst(290, 270, 36 + r.h.stars * 12, [RCOL[r.h.stars], '#fff'], 150 + r.h.stars * 25, 1.1, 40); },
  draw() {
    gachaBg();
    if (G.phase === 'idle') {
      const cx = 290, cy = 300; orbsBadge();
      txt('PANGGILAN PAHLAWAN', cx, 20, { size: 30, align: 'center', color: '#ffe27a' });
      magicCircle(cx, cy, 1.55, '#8a6ad8');
      const f = featured(); const bob = Math.sin(gtime * 2) * 5;
      shadowEll(cx, cy + 112, 70, 13, .38);
      drawHero(f, cx - 130, cy - 150 + bob, 260, { bob: 0 });
      txt('★★★★★  PELUANG NAIK', cx, 68, { size: 20, align: 'center', color: '#ffd84a' });
      txt(f.name + ' - ' + f.title, cx, 96, { size: 22, align: 'center' });
      panel(580, 84, 350, 420, 'rgba(40,40,130,.92)', 'rgba(16,16,74,.95)');
      txt('PELUANG', 755, 102, { size: 22, align: 'center', color: '#ffe27a' });
      txt('5★ 3%   4★ 17%   3★ 80%', 755, 134, { size: 22, align: 'center' });
      txt('Jaminan 5★ dalam ' + Math.max(1, 50 - save.pity) + ' panggilan lagi', 755, 170, { size: 17, align: 'center', color: '#ffe27a' });
      btn(610, 206, 290, 68, '', () => doPull(1), { c1: '#a860e8', c2: '#5a2aa8' });
      txt('Panggil x1', 755, 216, { size: 24, align: 'center' }); txt('◆ 100', 755, 244, { size: 20, align: 'center', color: '#7af0ff' });
      btn(610, 288, 290, 68, '', () => doPull(10), { c1: '#f0a028', c2: '#b04a10' });
      txt('Panggil x10', 755, 298, { size: 24, align: 'center' }); txt('◆ 900', 755, 326, { size: 20, align: 'center', color: '#7af0ff' });
      txt('Garansi minimal 1 hero 4★+ pada x10', 755, 368, { size: 15, align: 'center', color: '#c8c0f0' });
      btn(640, 416, 230, 56, 'KEMBALI', () => go('home'), { size: 20 });
    } else if (G.phase === 'summon') {
      const cx = VW / 2, cy = 280, k = 1.0 + Math.min(1, G.t / 1.4) * .9; magicCircle(cx, cy, k, G.col);
      for (let i = 0; i < 4; i++) { const a = gtime * 3 + i * 1.57, rr = Math.max(14, 300 - G.t * 120); ctx.fillStyle = G.col; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 6, 0, 6.283); ctx.fill(); }
      const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 140 + G.t * 70); gl.addColorStop(0, G.col); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = Math.min(.9, G.t / 2); fullRect(gl); ctx.globalAlpha = 1;
      if (Math.random() < .6) addPart(cx + (Math.random() - .5) * 320, cy + 170, { vx: 0, vy: -170 - Math.random() * 110, c: G.col, life: 1.3, s: 6 });
      txt('Memanggil...', VW / 2, 480, { size: 26, align: 'center', color: '#e0d8ff' });
    } else if (G.phase === 'flash') {
      fullRect('rgba(255,255,255,' + (1 - G.t / .5) + ')');
    } else if (G.phase === 'reveal') {
      const r = G.res[G.i], h = r.h, col = RCOL[h.stars], cx = 290, cy = 270;
      const bgc = ctx.createRadialGradient(cx, cy, 20, cx, cy, 560); bgc.addColorStop(0, col); bgc.addColorStop(.35, '#2a1a5a'); bgc.addColorStop(1, '#07031a');
      ctx.globalAlpha = .6; fullRect(bgc); ctx.globalAlpha = 1;
      for (let i = 0; i < 14; i++) { const a = i * .449 + gtime * .5; ctx.fillStyle = col; ctx.globalAlpha = .12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 900, cy + Math.sin(a) * 900); ctx.lineTo(cx + Math.cos(a + .1) * 900, cy + Math.sin(a + .1) * 900); ctx.fill(); } ctx.globalAlpha = 1;
      circle(cx, cy + 10, 150, col, 3, .7); circle(cx, cy + 10, 128, col, 1.5, .5);
      shadowEll(cx, cy + 126, 80, 14, .4);
      const sc = Math.min(1, .15 + G.t * 5); const sz = 290 * sc; drawHero(h, cx - sz / 2, cy + 130 - sz * .93 + Math.sin(gtime * 2) * 4, sz, {});
      panel(520, 56, 410, 424, '#2a2a7a', '#10104a');
      txt('★'.repeat(h.stars), 725, 76, { size: 40, align: 'center', color: col });
      txt(h.name, 725, 134, { size: 48, align: 'center' }); txt(h.title, 725, 196, { size: 24, align: 'center', color: '#bcd0ff' });
      txt(CLASSES[h.cls].name + ' / ' + WEP_NAME[CLASSES[h.cls].wep], 725, 234, { size: 22, align: 'center', color: '#ffe27a' });
      if (h.skill) { txt(SKILLS[h.skill][0], 725, 274, { size: 20, align: 'center', color: '#a8e8b8' }); wrapPx(SKILLS[h.skill][1], 340, 18).forEach((l, i) => txt(l, 725, 302 + i * 24, { size: 18, align: 'center', color: '#d0f0d8' })); }
      const tag = r.isNew ? 'BARU!' : (r.lbUp ? 'LIMIT BREAK +1' : '+30 ORB (maks)'); txt(tag, 725, 366, { size: 32, align: 'center', color: r.isNew ? '#ff8a8a' : '#7af0ff' });
      txt((G.i + 1) + ' / ' + G.res.length + '    sentuh untuk lanjut', 725, 430, { size: 17, align: 'center', color: '#c8c0f0' });
    } else if (G.phase === 'summary') {
      txt('HASIL PANGGILAN', VW / 2, 16, { size: 32, align: 'center', color: '#ffe27a' });
      G.res.forEach((r, i) => { const x = 40 + (i % 5) * 178, y = 66 + Math.floor(i / 5) * 192; hIconRes(r, x, y, 168, 182); });
      orbsBadge();
      btn(250, 462, 220, 58, 'Ulangi x10', () => doPull(10), { c1: '#f0a028', c2: '#b04a10', size: 22 });
      btn(490, 462, 220, 58, 'Selesai', () => { G.phase = 'idle'; }, { size: 22 });
    }
  },
  tap() {
    if (G.phase === 'reveal' && G.t > .5) { sfx('select'); if (G.i < G.res.length - 1) { G.i++; G.t = 0; this.revealFx(); } else if (G.res.length > 1) { G.phase = 'summary'; } else G.phase = 'idle'; }
  }
};
function hIconRes(r, x, y, w, h) {
  const hd = r.h, col = RCOL[hd.stars];
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#26347a'); g.addColorStop(1, '#0e1444'); rrect(x, y, w, h, 12); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = col; rrect(x + 1.5, y + 1.5, w - 3, h - 3, 11); ctx.stroke(); ctx.lineWidth = 1;
  txt('★'.repeat(hd.stars), x + w / 2, y + 7, { size: 16, align: 'center', color: col });
  shadowEll(x + w / 2, y + 28 + 96 * .93, 30, 6, .4); drawHero(hd, x + (w - 96) / 2, y + 28, 96, { bob: idleBob(x * .02), ph: x * .02 });
  txt(hd.name, x + w / 2, y + 128, { size: 18, align: 'center' });
  txt(r.isNew ? 'BARU' : (r.lbUp ? 'LB +1' : '+30◆'), x + w / 2, y + 152, { size: 17, align: 'center', color: r.isNew ? '#ff8a8a' : '#7af0ff' });
}

// ---------- PAHLAWAN ----------
const RS = { sel: null };
function sortedOwned() { return Object.keys(save.owned).sort((a, b) => HERO[b].stars - HERO[a].stars || save.owned[b].lv - save.owned[a].lv || a.localeCompare(b)); }
SC.roster = {
  enter() { RS.sel = null; bgm('calm'); },
  draw() {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#101a4a'); g.addColorStop(1, '#2a1a62'); fullRect(g);
    const ids = sortedOwned(), cols = 8, rows = Math.ceil(ids.length / cols), CW = 104, CH = 136, PX = 112, PY = 144;
    maxScroll = Math.max(0, rows * PY + 8 - (VH - 66));
    ctx.save(); ctx.beginPath(); ctx.rect(-OX, 62, W, VH - 62); ctx.clip();
    ids.forEach((id, i) => {
      const x = 36 + (i % cols) * PX, y = 72 + Math.floor(i / cols) * PY - scrollY; if (y < -150 || y > VH) return;
      hIcon(id, x, y, CW, CH, { size: 74, nsize: 16, lsize: 14 });
      if (save.party.includes(id)) { rrect(x + 5, y + 24, 52, 20, 8); ctx.fillStyle = '#f0a028'; ctx.fill(); txt('TIM ' + (save.party.indexOf(id) + 1), x + 31, y + 26, { size: 14, align: 'center', color: '#2a1000', shadow: false }); }
      if (!RS.sel) { const ry = Math.max(y, 62), rb = Math.min(y + CH, VH); if (rb > ry) region(x, ry, CW, rb - ry, () => { RS.sel = id; }); }
    });
    ctx.restore();
    panel(-8, -8, VW + 16, 70, '#1c2c78', '#0e1648', 0);
    txt('PAHLAWAN (' + ids.length + '/' + HEROES.length + ')', 24, 10, { size: 28, color: '#ffe27a' }); txt('Tim: ' + save.party.length + '/4', 330, 17, { size: 22, color: '#bcd0ff' });
    orbsBadge();
    if (!RS.sel) btn(VW - 390, 8, 190, 48, 'KEMBALI', () => go('home'), { size: 19 });
    else this.detail();
  },
  detail() {
    const id = RS.sel, hd = HERO[id], s = save.owned[id], st = heroStats(id, s.lv, s.lb), col = STAR_COL[hd.stars];
    fullRect('rgba(0,0,10,.72)'); btns = [];
    panel(100, 20, 760, 500, '#2a3a8a', '#10184a');
    const cx = 290;
    txt('★'.repeat(hd.stars), cx, 40, { size: 32, align: 'center', color: col });
    const gl = ctx.createRadialGradient(cx, 210, 10, cx, 210, 150); gl.addColorStop(0, col + '88'); gl.addColorStop(1, col + '00'); ctx.fillStyle = gl; ctx.fillRect(cx - 160, 90, 320, 250);
    shadowEll(cx, 330, 76, 13, .4);
    drawHero(hd, cx - 130, 330 - 260 * .93 + Math.sin(gtime * 2) * 3, 260, {});
    txt(hd.name, cx, 352, { size: 36, align: 'center' }); txt(hd.title, cx, 396, { size: 20, align: 'center', color: '#bcd0ff' });
    txt(CLASSES[hd.cls].name + ' • ' + WEP_NAME[CLASSES[hd.cls].wep] + ' • Jarak ' + (st.rng[0] === st.rng[1] ? st.rng[0] : st.rng[0] + '-' + st.rng[1]), cx, 428, { size: 17, align: 'center', color: '#ffe27a' });
    const x0 = 520;
    txt('Lv ' + s.lv + (s.lv >= LV_CAP ? ' (MAKS)' : ''), x0, 44, { size: 26 }); bar(x0 + 130, 52, 180, 14, s.lv >= LV_CAP ? 1 : s.xp, s.lv >= LV_CAP ? 1 : 100, '#3ad8a0');
    txt('Limit Break', x0, 88, { size: 19, color: '#7af0ff' }); for (let i = 0; i < 5; i++) { rrect(x0 + 130 + i * 38, 92, 32, 18, 5); ctx.fillStyle = i < s.lb ? '#7af0ff' : '#2a3050'; ctx.fill(); }
    const rowsS = [['HP', st.hp, 70, '#4ad870'], ['ATK', st.atk, 45, '#f06a4a'], ['DEF', st.def, 35, '#4a9af0'], ['SPD', st.spd, 30, '#f0d84a'], ['GERAK', st.mov, 8, '#c08af0']];
    rowsS.forEach((r, i) => { const y = 134 + i * 42; txt(r[0], x0, y, { size: 20 }); txt(String(r[1]), x0 + 84, y, { size: 20, color: '#ffe27a' }); bar(x0 + 134, y + 5, 176, 15, r[1], r[2], r[3]); });
    if (hd.skill) { txt('Skill: ' + SKILLS[hd.skill][0], x0, 354, { size: 21, color: '#a8e8b8' }); wrapPx(SKILLS[hd.skill][1], 300, 17).forEach((l, i) => txt(l, x0, 384 + i * 22, { size: 17, color: '#d8e8d8' })); }
    else txt('Tanpa skill khusus', x0, 354, { size: 19, color: '#9aa0c0' });
    const inP = save.party.includes(id);
    btn(x0, 448, 150, 52, inP ? 'Keluar Tim' : 'Masuk Tim', () => {
      if (inP) { if (save.party.length <= 1) { sfx('error'); return; } save.party = save.party.filter(x => x !== id); }
      else { if (save.party.length >= 4) { showModal({ title: 'Tim Penuh', lines: ['Keluarkan satu pahlawan dulu.'], buttons: [['OK', null]] }); return; } save.party.push(id); }
      writeSave();
    }, { size: 18, c1: inP ? '#d84a4a' : '#3ab870', c2: inP ? '#8a1a1a' : '#16683a' });
    btn(x0 + 164, 448, 146, 52, 'TUTUP', () => { RS.sel = null; }, { size: 18 });
  }
};

// ---------- PILIH LANTAI ----------
const TW = { floor: 1 };
function floorInfo(f) {
  const boss = f % 10 === 0; const n = boss ? Math.min(6, 2 + Math.floor(f / 20)) + 1 : Math.min(8, 3 + Math.floor(f / 4));
  const reward = (f > save.best ? 40 + f * 5 : 12) * (boss ? 3 : 1);
  return { boss, n, reward, th: Math.floor((f - 1) / 10) % THEMES.length };
}
SC.tower = {
  enter() { bgm('calm'); TW.floor = Math.min(MAX_FLOOR, save.best + 1); },
  draw() {
    drawSky(undefined, 0, { moonX: 120, moonY: 100 }); orbsBadge();
    const f = TW.floor, info = floorInfo(f), th = THEMES[info.th];
    panel(40, 66, 420, 310, 'rgba(30,50,140,.94)', 'rgba(14,22,80,.96)');
    txt('LANTAI', 250, 84, { size: 24, align: 'center', color: '#bcd0ff' });
    txt(String(f), 250, 108, { size: 118, align: 'center', color: info.boss ? '#ff8a6a' : '#ffe27a', sh: '#3a1a0a' });
    txt(th.name + (info.boss ? '   ☠ BOS' : ''), 250, 246, { size: 24, align: 'center', color: info.boss ? '#ff8a8a' : '#d8e8ff' });
    txt('Musuh: ' + info.n + '     Hadiah: ◆' + info.reward + (f > save.best ? '' : ' (ulang)'), 250, 286, { size: 20, align: 'center', color: '#ffe27a' });
    txt('Lv musuh ≈ ' + f, 250, 318, { size: 18, align: 'center', color: '#9ab0e0' });
    btn(60, 140, 62, 96, '<', () => { TW.floor = Math.max(1, TW.floor - 1); }, { size: 34, disabled: f <= 1 });
    btn(378, 140, 62, 96, '>', () => { TW.floor = Math.min(save.best + 1, MAX_FLOOR, TW.floor + 1); }, { size: 34, disabled: f >= Math.min(save.best + 1, MAX_FLOOR) });
    panel(490, 66, 430, 310, 'rgba(30,50,140,.94)', 'rgba(14,22,80,.96)'); txt('TIM', 512, 80, { size: 22, color: '#ffe27a' });
    save.party.forEach((id, i) => { hIcon(id, 508 + (i % 4) * 100, 118, 94, 150, { size: 70, nsize: 15, lsize: 14 }); });
    txt('Atur tim untuk mengganti pahlawan', 705, 296, { size: 16, align: 'center', color: '#9ab0e0' });
    btn(490, 394, 430, 74, 'MULAI PERTEMPURAN', () => { if (!save.party.length) return; go('battle', f); }, { size: 30, c1: '#f0a028', c2: '#b04a10' });
    btn(490, 480, 208, 48, 'ATUR TIM', () => go('roster'), { size: 19 });
    btn(712, 480, 208, 48, 'KEMBALI', () => go('home'), { size: 19 });
  }
};
