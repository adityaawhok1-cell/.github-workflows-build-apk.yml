'use strict';
// ====== Scene: judul, menu, gacha, pahlawan, pilih lantai ======
const idleF = (off) => Math.floor(gtime * 2.4 + (off || 0)) % 2;
const pick = a => a[Math.floor(Math.random() * a.length)];
function heroDef(id) { return HERO[id]; }
function orbsBadge() { panel(214, 8, 100, 24, '#2a2a6a', '#16164a'); txt('◆', 222, 13, { size: 12, color: '#7af0ff' }); txt(String(save.orbs), 308, 13, { size: 12, align: 'right', color: '#fff' }); }
function hIcon(id, x, y, w, h, o) {
  o = o || {}; const hd = HERO[id], s = save.owned[id];
  const g = ctx.createLinearGradient(0, y, 0, y + h); const col = STAR_COL[hd.stars];
  g.addColorStop(0, '#26356e'); g.addColorStop(1, '#101a42'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.lineWidth = 1;
  const sc = o.scale || 3; drawSpr(heroSprite(hd, idleF(x * .01)), x + (w - 16 * sc) / 2, y + 6, sc);
  txt(hd.name, x + w / 2, y + 6 + 16 * sc + 2, { size: 9, align: 'center' });
  if (s) txt('Lv' + s.lv, x + w / 2, y + 6 + 16 * sc + 13, { size: 9, align: 'center', color: '#bcd0ff' });
  txt('★'.repeat(hd.stars), x + 4, y + 4, { size: 8, color: col });
  if (s && s.lb > 0) txt('+' + s.lb, x + w - 4, y + 4, { size: 9, align: 'right', color: '#7af0ff' });
}

// ---------- JUDUL ----------
SC.title = {
  enter() { bgm('calm'); },
  draw() {
    drawSky(150);
    const y = 54 + Math.sin(gtime * 1.6) * 3;
    txt('MENARA', W / 2, y, { size: 38, align: 'center', color: '#ffe27a', sh: '#7a2a10' });
    txt('EMBLEM', W / 2, y + 38, { size: 38, align: 'center', color: '#8ab8ff', sh: '#14246a' });
    txt('Panggil pahlawan. Taklukkan menara.', W / 2, y + 86, { size: 9, align: 'center', color: '#d8d0ff' });
    const party = save.party.slice(0, 4);
    party.forEach((id, i) => { drawSpr(heroSprite(HERO[id], idleF(i * .5)), 60 + i * 52, 392, 3); });
    if (Math.floor(gtime * 1.8) % 2 === 0) txt('- SENTUH LAYAR -', W / 2, 490, { size: 14, align: 'center', color: '#fff' });
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
    drawSky(190);
    orbsBadge();
    txt('Lantai tertinggi: ' + save.best, 10, 14, { size: 11, color: '#ffe27a' });
    txt('MENARA', W / 2, 40, { size: 28, align: 'center', color: '#ffe27a', sh: '#7a2a10' });
    txt('EMBLEM', W / 2, 70, { size: 28, align: 'center', color: '#8ab8ff', sh: '#14246a' });
    save.party.slice(0, 4).forEach((id, i) => { drawSpr(heroSprite(HERO[id], idleF(i * .5)), 62 + i * 52, 350, 3); });
    panel(14, 412, 292, 152, 'rgba(30,50,130,.92)', 'rgba(14,22,80,.95)');
    btn(30, 424, 260, 44, 'NAIK MENARA', () => go('tower'), { size: 16, c1: '#f0a028', c2: '#b04a10' });
    btn(30, 474, 260, 38, 'PANGGIL PAHLAWAN', () => go('gacha'), { size: 13, c1: '#a860e8', c2: '#5a2aa8' });
    btn(30, 518, 126, 34, 'PAHLAWAN', () => go('roster'), { size: 12 });
    btn(164, 518, 126, 34, 'PENGATURAN', () => { SET.open = true; }, { size: 12 });
    if (SET.open) drawSettings();
  }
};
function drawSettings() {
  ctx.fillStyle = 'rgba(0,0,10,.6)'; ctx.fillRect(0, 0, W, H);
  panel(24, 110, 272, 330);
  txt('PENGATURAN', W / 2, 124, { size: 14, align: 'center', color: '#ffe27a' });
  const onoff = v => v ? 'NYALA' : 'MATI';
  btn(40, 154, 240, 34, 'Efek Suara: ' + onoff(save.sfx), () => { save.sfx = !save.sfx; writeSave(); });
  btn(40, 194, 240, 34, 'Musik: ' + onoff(save.music), () => { save.music = !save.music; writeSave(); });
  btn(40, 234, 240, 34, 'Animasi Duel: ' + onoff(save.duel), () => { save.duel = !save.duel; writeSave(); });
  btn(40, 274, 240, 34, 'Cara Bermain', () => showModal({ title: 'Cara Bermain', lines: ['Sentuh pahlawanmu, pilih kotak biru untuk bergerak, lalu sentuh musuh (kotak merah) untuk menyerang.', 'Pedang > Kapak > Tombak > Pedang.', 'Hutan & gunung menambah DEF dan menghindar.', 'Menang di setiap lantai untuk dapat Orb, lalu Panggil pahlawan baru!'], buttons: [['Mengerti', null]] }));
  btn(40, 314, 240, 34, 'Hapus Data', () => showModal({ title: 'Hapus Data?', lines: ['Semua pahlawan & progres akan hilang.'], buttons: [['Batal', null], ['Hapus', () => { save = defaultSave(); writeSave(); SET.open = false; }]] }), { c1: '#d84a4a', c2: '#8a1a1a' });
  btn(40, 386, 240, 40, 'TUTUP', () => { SET.open = false; });
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
  const g = ctx.createRadialGradient(160, 280, 20, 160, 280, 380); g.addColorStop(0, '#3a1a6a'); g.addColorStop(1, '#07031a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  STARS.forEach(s => { ctx.globalAlpha = .3 + .6 * Math.abs(Math.sin(gtime * s.f + s.p)); ctx.fillStyle = '#c8b8ff'; ctx.fillRect(s.x, (s.y * 1.5) % H, s.s, s.s); }); ctx.globalAlpha = 1;
}
function magicCircle(cx, cy, k, col) {
  const t = gtime; circle(cx, cy, 100 * k, col, 2); circle(cx, cy, 92 * k, col, 1, .6); circle(cx, cy, 60 * k, col, 2, .8);
  poly(cx, cy, 92 * k, 6, t * .6, col, 2); poly(cx, cy, 92 * k, 6, t * .6 + Math.PI / 6, col, 2); poly(cx, cy, 60 * k, 5, -t * .9, col, 1);
  for (let i = 0; i < 12; i++) { const a = i * 6.283 / 12 - t * .3; ctx.fillStyle = col; ctx.fillRect(cx + Math.cos(a) * 80 * k - 2, cy + Math.sin(a) * 80 * k - 2, 4, 4); }
}
SC.gacha = {
  enter() { bgm('gacha'); G.phase = 'idle'; },
  update(dt) { G.t += dt; if (G.phase === 'summon' && G.t > 2.3) { G.phase = 'flash'; G.t = 0; sfx('flash'); } else if (G.phase === 'flash' && G.t > .5) { G.phase = 'reveal'; G.t = 0; this.revealFx(); } },
  skip() { if (G.phase === 'summon' && G.t > .4) G.t = 2.29; },
  revealFx() { const r = G.res[G.i]; sfx('r' + r.h.stars); burst(160, 230, 36 + r.h.stars * 12, [RCOL[r.h.stars], '#fff'], 150 + r.h.stars * 25, 1.1, 40); },
  draw() {
    gachaBg(); const cx = 160, cy = 270;
    if (G.phase === 'idle') {
      orbsBadge();
      txt('PANGGILAN PAHLAWAN', W / 2, 48, { size: 15, align: 'center', color: '#ffe27a' });
      magicCircle(cx, cy, 1, '#8a6ad8');
      const f = featured(); const bob = Math.sin(gtime * 2) * 4;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + 62, 44, 9, 0, 0, 6.283); ctx.fill();
      drawSpr(heroSprite(f, idleF()), cx - 64, cy - 64 + bob, 8);
      txt('★★★★★  PELUANG NAIK', W / 2, 94, { size: 10, align: 'center', color: '#ffd84a' });
      txt(f.name + ' - ' + f.title, W / 2, 110, { size: 11, align: 'center' });
      panel(20, 368, 280, 52); txt('5★ 3%   4★ 17%   3★ 80%', W / 2, 376, { size: 11, align: 'center' });
      txt('Jaminan 5★ dalam ' + Math.max(1, 50 - save.pity) + ' panggilan lagi', W / 2, 394, { size: 10, align: 'center', color: '#ffe27a' });
      btn(20, 432, 136, 52, '', () => doPull(1), { c1: '#a860e8', c2: '#5a2aa8' });
      txt('Panggil x1', 88, 442, { size: 13, align: 'center' }); txt('◆ 100', 88, 462, { size: 11, align: 'center', color: '#7af0ff' });
      btn(164, 432, 136, 52, '', () => doPull(10), { c1: '#f0a028', c2: '#b04a10' });
      txt('Panggil x10', 232, 442, { size: 13, align: 'center' }); txt('◆ 900', 232, 462, { size: 11, align: 'center', color: '#7af0ff' });
      txt('Garansi minimal 1 hero 4★+ pada x10', W / 2, 494, { size: 8, align: 'center', color: '#b8b0e0' });
      btn(20, 514, 120, 38, 'KEMBALI', () => go('home'), { size: 12 });
    } else if (G.phase === 'summon') {
      const k = .6 + Math.min(1, G.t / 1.4) * .5; magicCircle(cx, cy, k, G.col);
      for (let i = 0; i < 4; i++) { const a = gtime * 3 + i * 1.57, rr = Math.max(8, 150 - G.t * 60); ctx.fillStyle = G.col; ctx.fillRect(cx + Math.cos(a) * rr - 3, cy + Math.sin(a) * rr - 3, 6, 6); }
      const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, 70 + G.t * 30); gl.addColorStop(0, G.col); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = Math.min(.9, G.t / 2); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (Math.random() < .5) addPart(cx + (Math.random() - .5) * 160, cy + 90, { vx: 0, vy: -90 - Math.random() * 60, c: G.col, life: 1.2, s: 3 });
      txt('Memanggil...', W / 2, 470, { size: 12, align: 'center', color: '#d8d0ff' });
    } else if (G.phase === 'flash') {
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - G.t / .5) + ')'; ctx.fillRect(0, 0, W, H);
    } else if (G.phase === 'reveal') {
      const r = G.res[G.i], h = r.h, col = RCOL[h.stars];
      const bgc = ctx.createRadialGradient(cx, 250, 10, cx, 250, 300); bgc.addColorStop(0, col); bgc.addColorStop(.35, '#2a1a5a'); bgc.addColorStop(1, '#07031a');
      ctx.fillStyle = bgc; ctx.globalAlpha = .55; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      for (let i = 0; i < 14; i++) { const a = i * .449 + gtime * .5; ctx.fillStyle = col; ctx.globalAlpha = .12; ctx.beginPath(); ctx.moveTo(cx, 250); ctx.lineTo(cx + Math.cos(a) * 400, 250 + Math.sin(a) * 400); ctx.lineTo(cx + Math.cos(a + .1) * 400, 250 + Math.sin(a + .1) * 400); ctx.fill(); } ctx.globalAlpha = 1;
      panel(30, 90, 260, 380, '#2a2a7a', '#10104a'); circle(cx, 240, 80, col, 2, .7);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, 304, 50, 10, 0, 0, 6.283); ctx.fill();
      const sc = Math.min(8, 1 + G.t * 40); drawSpr(heroSprite(h, idleF()), cx - 8 * sc, 240 - 8 * sc + Math.sin(gtime * 2) * 3, sc);
      txt('★'.repeat(h.stars), W / 2, 104, { size: 20, align: 'center', color: col });
      txt(h.name, W / 2, 334, { size: 22, align: 'center' }); txt(h.title, W / 2, 360, { size: 11, align: 'center', color: '#bcd0ff' });
      txt(CLASSES[h.cls].name + ' / ' + WEP_NAME[CLASSES[h.cls].wep], W / 2, 380, { size: 11, align: 'center', color: '#ffe27a' });
      if (h.skill) txt(SKILLS[h.skill][0] + ': ' + SKILLS[h.skill][1], W / 2, 400, { size: 9, align: 'center', color: '#a8e8b8' });
      const tag = r.isNew ? 'BARU!' : (r.lbUp ? 'LIMIT BREAK +1' : '+30 ORB (maks)'); if (Math.floor(gtime * 3) % 2 === 0 || true) txt(tag, W / 2, 424, { size: 14, align: 'center', color: r.isNew ? '#ff8a8a' : '#7af0ff' });
      txt((G.i + 1) + ' / ' + G.res.length + '   sentuh untuk lanjut', W / 2, 448, { size: 9, align: 'center', color: '#b8b0e0' });
    } else if (G.phase === 'summary') {
      txt('HASIL PANGGILAN', W / 2, 30, { size: 15, align: 'center', color: '#ffe27a' });
      G.res.forEach((r, i) => { const x = 7 + (i % 5) * 62, y = 70 + Math.floor(i / 5) * 128; hIconRes(r, x, y, 58, 120); });
      orbsBadge();
      btn(20, 350, 130, 40, 'Ulangi x10', () => doPull(10), { c1: '#f0a028', c2: '#b04a10', size: 12 });
      btn(170, 350, 130, 40, 'Selesai', () => { G.phase = 'idle'; }, { size: 12 });
    }
  },
  tap() {
    if (G.phase === 'reveal' && G.t > .5) { sfx('select'); if (G.i < G.res.length - 1) { G.i++; G.t = 0; this.revealFx(); } else if (G.res.length > 1) { G.phase = 'summary'; } else G.phase = 'idle'; }
  }
};
function hIconRes(r, x, y, w, h) {
  const hd = r.h, col = RCOL[hd.stars]; ctx.fillStyle = '#16205a'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.lineWidth = 1;
  drawSpr(heroSprite(hd, idleF(x * .02)), x + 13, y + 26, 2); txt('★'.repeat(hd.stars), x + w / 2, y + 6, { size: 8, align: 'center', color: col });
  txt(hd.name, x + w / 2, y + 62, { size: 9, align: 'center' });
  txt(r.isNew ? 'BARU' : (r.lbUp ? 'LB+1' : '+30◆'), x + w / 2, y + 78, { size: 9, align: 'center', color: r.isNew ? '#ff8a8a' : '#7af0ff' });
}

// ---------- PAHLAWAN ----------
const RS = { sel: null };
function sortedOwned() { return Object.keys(save.owned).sort((a, b) => HERO[b].stars - HERO[a].stars || save.owned[b].lv - save.owned[a].lv || a.localeCompare(b)); }
SC.roster = {
  enter() { RS.sel = null; bgm('calm'); },
  draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#101a4a'); g.addColorStop(1, '#241a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ids = sortedOwned(); const rows = Math.ceil(ids.length / 4); maxScroll = Math.max(0, rows * 104 + 10 - 450);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 56, W, 460); ctx.clip();
    ids.forEach((id, i) => {
      const x = 11 + (i % 4) * 76, y = 62 + Math.floor(i / 4) * 104 - scrollY; if (y < -100 || y > 520) return;
      hIcon(id, x, y, 70, 98, { scale: 3 });
      if (save.party.includes(id)) { ctx.fillStyle = '#f0a028'; ctx.fillRect(x + 1, y + 85, 68, 12); txt('TIM ' + (save.party.indexOf(id) + 1), x + 35, y + 86, { size: 9, align: 'center', color: '#2a1000', shadow: false }); }
      if (!RS.sel) { const ry = Math.max(y, 56), rb = Math.min(y + 98, 516); if (rb > ry) region(x, ry, 70, rb - ry, () => { RS.sel = id; }); }
    });
    ctx.restore();
    panel(0, 0, W, 54); txt('PAHLAWAN (' + ids.length + '/' + HEROES.length + ')', 12, 10, { size: 13, color: '#ffe27a' }); txt('Tim: ' + save.party.length + '/4', 12, 32, { size: 10, color: '#bcd0ff' });
    orbsBadge();
    if (!RS.sel) btn(20, 524, 280, 40, 'KEMBALI', () => go('home'), { size: 12 });
    else this.detail();
  },
  detail() {
    const id = RS.sel, hd = HERO[id], s = save.owned[id], st = heroStats(id, s.lv, s.lb), col = STAR_COL[hd.stars];
    ctx.fillStyle = 'rgba(0,0,10,.7)'; ctx.fillRect(0, 0, W, H); btns = [];
    panel(12, 40, 296, 490, '#2a3a8a', '#10184a');
    txt('★'.repeat(hd.stars), W / 2, 52, { size: 16, align: 'center', color: col });
    const gl = ctx.createRadialGradient(160, 150, 5, 160, 150, 90); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = .4; ctx.fillStyle = gl; ctx.fillRect(40, 70, 240, 170); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(160, 212, 40, 8, 0, 0, 6.283); ctx.fill();
    drawSpr(heroSprite(hd, idleF()), 160 - 56, 90 + Math.sin(gtime * 2) * 2, 7);
    txt(hd.name, W / 2, 218, { size: 20, align: 'center' }); txt(hd.title, W / 2, 242, { size: 10, align: 'center', color: '#bcd0ff' });
    txt(CLASSES[hd.cls].name + ' • ' + WEP_NAME[CLASSES[hd.cls].wep] + ' • Jarak ' + (st.rng[0] === st.rng[1] ? st.rng[0] : st.rng[0] + '-' + st.rng[1]), W / 2, 258, { size: 10, align: 'center', color: '#ffe27a' });
    txt('Lv ' + s.lv + (s.lv >= LV_CAP ? ' (MAKS)' : ''), 28, 280, { size: 12 }); bar(100, 282, 180, 8, s.lv >= LV_CAP ? 1 : s.xp, s.lv >= LV_CAP ? 1 : 100, '#3ad8a0');
    txt('Limit Break', 28, 300, { size: 10, color: '#7af0ff' }); for (let i = 0; i < 5; i++) { ctx.fillStyle = i < s.lb ? '#7af0ff' : '#2a3050'; ctx.fillRect(116 + i * 22, 300, 18, 10); }
    const rows = [['HP', st.hp, 70, '#4ad870'], ['ATK', st.atk, 45, '#f06a4a'], ['DEF', st.def, 35, '#4a9af0'], ['SPD', st.spd, 30, '#f0d84a'], ['GERAK', st.mov, 8, '#c08af0']];
    rows.forEach((r, i) => { const y = 324 + i * 22; txt(r[0], 28, y, { size: 11 }); txt(String(r[1]), 84, y, { size: 11, color: '#ffe27a' }); bar(116, y + 2, 164, 9, r[1], r[2], r[3]); });
    if (hd.skill) { txt('Skill: ' + SKILLS[hd.skill][0], 28, 440, { size: 11, color: '#a8e8b8' }); txt(SKILLS[hd.skill][1], 28, 456, { size: 9, color: '#d8e8d8' }); }
    else txt('Tanpa skill khusus', 28, 440, { size: 10, color: '#9aa0c0' });
    const inP = save.party.includes(id);
    btn(24, 476, 136, 38, inP ? 'Keluar Tim' : 'Masuk Tim', () => {
      if (inP) { if (save.party.length <= 1) { sfx('error'); return; } save.party = save.party.filter(x => x !== id); }
      else { if (save.party.length >= 4) { showModal({ title: 'Tim Penuh', lines: ['Keluarkan satu pahlawan dulu.'], buttons: [['OK', null]] }); return; } save.party.push(id); }
      writeSave();
    }, { c1: inP ? '#d84a4a' : '#3ab870', c2: inP ? '#8a1a1a' : '#16683a' });
    btn(168, 476, 128, 38, 'TUTUP', () => { RS.sel = null; });
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
    drawSky(60); orbsBadge();
    const f = TW.floor, info = floorInfo(f), th = THEMES[info.th];
    panel(20, 52, 280, 150, 'rgba(30,50,140,.94)', 'rgba(14,22,80,.96)');
    txt('LANTAI', W / 2, 62, { size: 12, align: 'center', color: '#bcd0ff' });
    txt(String(f), W / 2, 76, { size: 54, align: 'center', color: info.boss ? '#ff8a6a' : '#ffe27a', sh: '#3a1a0a' });
    txt(th.name + (info.boss ? '  ☠ BOS' : ''), W / 2, 142, { size: 11, align: 'center', color: info.boss ? '#ff8a8a' : '#d8e8ff' });
    txt('Musuh: ' + info.n + '    Hadiah: ◆' + info.reward + (f > save.best ? '' : ' (ulang)'), W / 2, 162, { size: 10, align: 'center', color: '#ffe27a' });
    txt('Lv musuh ≈ ' + f, W / 2, 180, { size: 9, align: 'center', color: '#9ab0e0' });
    btn(24, 100, 36, 44, '<', () => { TW.floor = Math.max(1, TW.floor - 1); }, { size: 18, disabled: f <= 1 });
    btn(260, 100, 36, 44, '>', () => { TW.floor = Math.min(save.best + 1, MAX_FLOOR, TW.floor + 1); }, { size: 18, disabled: f >= Math.min(save.best + 1, MAX_FLOOR) });
    panel(20, 330, 280, 120, 'rgba(30,50,140,.94)', 'rgba(14,22,80,.96)'); txt('TIM', 30, 338, { size: 11, color: '#ffe27a' });
    save.party.forEach((id, i) => { hIcon(id, 28 + i * 66, 354, 60, 90, { scale: 2 }); });
    btn(20, 462, 280, 48, 'MULAI PERTEMPURAN', () => { if (!save.party.length) return; go('battle', f); }, { size: 15, c1: '#f0a028', c2: '#b04a10' });
    btn(20, 518, 134, 38, 'ATUR TIM', () => go('roster'), { size: 12 });
    btn(166, 518, 134, 38, 'KEMBALI', () => go('home'), { size: 12 });
  }
};
