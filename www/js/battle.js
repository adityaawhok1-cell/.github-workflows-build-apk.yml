'use strict';
// ====== Pertempuran taktis (grid) + adegan duel ala GBA ======
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let BT = null, BS = null;
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const unitAt = (x, y) => BT.units.find(u => !u.dead && u.x === x && u.y === y);
const aliveTeam = t => BT.units.filter(u => u.team === t && !u.dead);
const kxy = (x, y) => y * COLS + x;

function genMap(floor, th) {
  const r = mulberry32(floor * 9973 + 7), grid = [], vr = [];
  for (let y = 0; y < ROWS; y++) { grid[y] = []; vr[y] = []; for (let x = 0; x < COLS; x++) { const v = r(); let t = 0; if (v < .15) t = 1; else if (v < .21) t = 2; else if (v < .26) t = 3; if ((y <= 2 || y >= 7) && t >= 2) t = 0; if ((y <= 0 || y >= 8) && t === 1 && r() < .5) t = 0; grid[y][x] = t; vr[y][x] = Math.floor(r() * 4); } }
  return { grid, vr };
}
function mkUnit(o) { const u = Object.assign({ dead: false, acted: false, alpha: 1, flash: 0, rx: o.x, ry: o.y, walk: false, lvDelta: 0 }, o); u.hp = u.hp || u.st.hp; u.maxhp = u.st.hp; return u; }
function enemyDefs(floor, th) {
  const r = mulberry32(floor * 131 + 3), boss = floor % 10 === 0, defs = [];
  const n = boss ? Math.min(6, 2 + Math.floor(floor / 20)) : Math.min(8, 3 + Math.floor(floor / 4));
  const w = { lord: 3, fighter: 3, archer: 2, knight: 1 + floor / 20, mage: 1 + floor / 25 };
  const keys = Object.keys(w), tot = keys.reduce((s, k) => s + w[k], 0);
  const roll = () => { let v = r() * tot; for (const k of keys) { v -= w[k]; if (v <= 0) return k; } return 'lord'; };
  const PAL = [['#8a2a2a', '#3a1a1a'], ['#5a2a7a', '#2a1a3a'], ['#7a5a1a', '#3a2a0a'], ['#2a2a4a', '#6a1a3a']][th];
  const hairs = ['#2a2a2a', '#7a7a7a', '#c8c8c8', '#8a2a1a'];
  for (let i = 0; i < n; i++) { const cls = roll(); defs.push({ id: 'e' + i, name: ENEMY_CLS_NAME[cls], cls, hair: hairs[Math.floor(r() * 4)], armor: PAL[0], cape: PAL[1], skin: cls === 'fighter' ? '#9ac86a' : '#d8b090', boss: false }); }
  if (boss) { const cls = ['lord', 'knight', 'mage', 'fighter'][Math.floor(r() * 4)]; defs.unshift({ id: 'boss', name: BOSS_NAMES[(floor / 10 - 1) % BOSS_NAMES.length], cls, hair: '#e8e8e8', armor: shade(PAL[0], 20), cape: '#f0c84a', skin: '#c8a090', boss: true }); }
  return defs;
}
function startBattle(floor) {
  const th = Math.floor((floor - 1) / 10) % THEMES.length, m = genMap(floor, th);
  BT = { floor, th, grid: m.grid, vr: m.vr, units: [], turn: 1, phase: 'init', sel: null, mode: 'idle', reach: null, atkSet: new Set(), origin: null, busy: true, over: false, inspect: null, floats: [], bp: 0, banner: '', lvLog: [] };
  const pcount = save.party.length, x0 = Math.floor((COLS - pcount) / 2);
  save.party.forEach((id, i) => { const o = save.owned[id]; BT.units.push(mkUnit({ team: 'p', id, def: HERO[id], name: HERO[id].name, lv: o.lv, xp: o.xp, lb: o.lb, st: heroStats(id, o.lv, o.lb), x: x0 + i, y: 7 + (i % 2) })); });
  BT.units.forEach(u => { BT.grid[u.y][u.x] = BT.grid[u.y][u.x] === 3 ? 0 : BT.grid[u.y][u.x]; });
  const defs = enemyDefs(floor, th), r = mulberry32(floor * 17 + 5), used = new Set();
  defs.forEach((d, i) => {
    let x, y, tries = 0;
    do { x = Math.floor(r() * COLS); y = d.boss ? Math.floor(r() * 2) : Math.floor(r() * 3); tries++; } while ((used.has(kxy(x, y)) || BT.grid[y][x] === 3) && tries < 200);
    if (d.boss) { x = 5 + Math.floor(r() * 2); y = 0; BT.grid[y][x] = 0; }
    used.add(kxy(x, y)); const st = enemyStats(d.cls, floor, d.boss);
    BT.units.push(mkUnit({ team: 'e', id: d.id, def: d, name: d.name, lv: floor, xp: 0, lb: 0, st, x, y }));
  });
}
// ---------- jangkauan ----------
function computeReach(u) {
  const mov = u.st.mov, dist = new Map(), prev = new Map(), start = kxy(u.x, u.y); dist.set(start, 0); const open = [start];
  while (open.length) {
    open.sort((a, b) => dist.get(a) - dist.get(b)); const c = open.shift(), cx = c % COLS, cy = (c / COLS) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const tt = BT.grid[ny][nx]; if (tt === 3) continue; const cost = dist.get(c) + T_COST[tt]; if (cost > mov) continue;
      const o = unitAt(nx, ny); if (o && o.team !== u.team) continue; const k = kxy(nx, ny);
      if (!dist.has(k) || cost < dist.get(k)) { dist.set(k, cost); prev.set(k, c); open.push(k); }
    }
  }
  const dest = new Set(); dist.forEach((v, k) => { const o = unitAt(k % COLS, (k / COLS) | 0); if (!o || o === u) dest.add(k); });
  return { dist, prev, dest };
}
function pathTo(reach, k) { const p = []; while (reach.prev.has(k)) { p.unshift({ x: k % COLS, y: (k / COLS) | 0 }); k = reach.prev.get(k); } return p; }
function rangeTiles(u, x, y) { const s = [], [a, b] = u.st.rng; for (let dy = -b; dy <= b; dy++) for (let dx = -b; dx <= b; dx++) { const d = Math.abs(dx) + Math.abs(dy); if (d >= a && d <= b) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) s.push(kxy(nx, ny)); } } return s; }
function atkSetFrom(u, dest) { const s = new Set(); dest.forEach(k => rangeTiles(u, k % COLS, (k / COLS) | 0).forEach(t => s.add(t))); return s; }
function targetsFrom(u, x, y) { const [a, b] = u.st.rng; return BT.units.filter(o => !o.dead && o.team !== u.team && (d => d >= a && d <= b)(Math.abs(o.x - x) + Math.abs(o.y - y))); }

// ---------- perhitungan duel ----------
function calc(a, d, ax, ay, dx, dy) {
  const tri = triangle(a.st.wep, d.st.wep), tt = BT.grid[dy][dx];
  let atk = a.st.atk + tri + (a.st.skill === 'fury' && a.hp < a.maxhp / 2 ? 3 : 0);
  let df = d.st.def + T_DEF[tt]; if (a.st.skill === 'pierce') df *= .6; if (a.st.magic) df *= .5;
  let dmg = Math.max(1, Math.round(atk - df) - (d.st.skill === 'guard' ? 2 : 0));
  const hit = Math.max(10, Math.min(100, 85 + (a.st.spd - d.st.spd) * 2 + tri * 10 + (a.st.skill === 'lucky' ? 15 : 0) - T_AVO[tt]));
  const crit = 5 + (a.st.skill === 'crit' ? 20 : 0);
  return { dmg, hit, crit, tri };
}
function simFight(a, d) {
  const dist = man(a, d), out = []; let ah = a.hp, dh = d.hp;
  const dInRange = dist >= d.st.rng[0] && dist <= d.st.rng[1];
  const order = ['a']; if (dInRange) order.push('d'); if (a.st.spd - d.st.spd >= 4) order.push('a'); else if (dInRange && d.st.spd - a.st.spd >= 4) order.push('d');
  for (const w of order) {
    if (ah <= 0 || dh <= 0) break;
    const att = w === 'a' ? a : d, df = w === 'a' ? d : a, c = calc(att, df, att.x, att.y, df.x, df.y);
    const hit = Math.random() * 100 < c.hit, crit = hit && Math.random() * 100 < c.crit, dmg = hit ? (crit ? c.dmg * 2 : c.dmg) : 0;
    if (w === 'a') dh = Math.max(0, dh - dmg); else ah = Math.max(0, ah - dmg);
    out.push({ src: w, hit, crit, dmg, aHp: ah, dHp: dh, vHp: w === 'a' ? dh : ah });
  }
  return out;
}
// ---------- XP ----------
function calcXp(pu, eu, killed) { let b = 10 + Math.max(0, eu.lv - pu.lv) * 3; if (killed) b += 20 + (eu.def.boss ? 40 : 0); return Math.max(5, Math.min(70, b)); }
function giveXp(u, amt) {
  const info = { pre: { lv: u.lv, xp: u.xp }, amt, ups: [] }; if (u.team !== 'p') return info;
  if (u.lv >= LV_CAP) { info.amt = 0; return info; }
  u.xp += amt;
  while (u.xp >= 100 && u.lv < LV_CAP) {
    u.xp -= 100; const old = u.st; u.lv++; u.st = heroStats(u.id, u.lv, u.lb);
    const dl = { hp: u.st.hp - old.hp, atk: u.st.atk - old.atk, def: u.st.def - old.def, spd: u.st.spd - old.spd };
    u.maxhp = u.st.hp; u.hp = Math.min(u.maxhp, u.hp + Math.max(0, dl.hp)); info.ups.push({ lv: u.lv, dl });
  }
  if (u.lv >= LV_CAP) u.xp = 0; return info;
}
function syncSave() { BT.units.filter(u => u.team === 'p').forEach(u => { const o = save.owned[u.id]; if (o) { o.lv = u.lv; o.xp = u.xp; } }); writeSave(); }

// ---------- aksi ----------
function floatTxt(u, s, c) { BT.floats.push({ x: MAPX + u.rx * TS + TS / 2, y: MAPY + u.ry * TS, s: String(s), c: c || '#fff', born: gtime }); }
async function moveUnit(u, path) {
  u.walk = true;
  for (const p of path) { const sx = u.rx, sy = u.ry; sfx('move'); await tw(105, q => { u.rx = sx + (p.x - sx) * q; u.ry = sy + (p.y - sy) * q; }); u.x = p.x; u.y = p.y; u.rx = p.x; u.ry = p.y; }
  u.walk = false;
}
function selectUnit(u) {
  BT.sel = u; BT.inspect = null; BT.mode = 'move'; BT.origin = { x: u.x, y: u.y }; BT.reach = computeReach(u); BT.atkSet = atkSetFrom(u, BT.reach.dest); sfx('select');
}
function deselect() { BT.sel = null; BT.mode = 'idle'; BT.reach = null; BT.atkSet = new Set(); }
async function enterAction(u) {
  BT.mode = 'action'; BT.reach = null; BT.atkSet = new Set(targetsFrom(u, u.x, u.y).map(t => kxy(t.x, t.y)));
}
async function playerMove(u, tx, ty) {
  BT.busy = true; const k = kxy(tx, ty);
  if (k !== kxy(u.x, u.y)) await moveUnit(u, pathTo(BT.reach, k));
  await enterAction(u); BT.busy = false;
}
async function playerAttack(a, d) {
  BT.busy = true; BT.mode = 'none'; BT.atkSet = new Set(); BT.reach = null;
  await doAttack(a, d); a.acted = true; deselect(); BT.busy = false;
  if (await checkEnd()) return; if (aliveTeam('p').every(u => u.acted)) endPlayerPhase();
}
async function approachAndAttack(a, d) {
  BT.busy = true; let best = null, bs = -1e9; const [r0, r1] = a.st.rng;
  BT.reach.dest.forEach(k => { const x = k % COLS, y = (k / COLS) | 0, dd = Math.abs(x - d.x) + Math.abs(y - d.y); if (dd < r0 || dd > r1) return; const sc = dd * 3 + T_DEF[BT.grid[y][x]] * 2 - BT.reach.dist.get(k) * .1; if (sc > bs) { bs = sc; best = k; } });
  if (best === null) { BT.busy = false; return; }
  if (best !== kxy(a.x, a.y)) await moveUnit(a, pathTo(BT.reach, best));
  BT.busy = false; await playerAttack(a, d);
}
function waitUnit(u) { u.acted = true; deselect(); sfx('cancel'); if (aliveTeam('p').every(x => x.acted)) endPlayerPhase(); }
function cancelSel() {
  const u = BT.sel; if (!u) return;
  if (BT.mode === 'action' && BT.origin && (u.x !== BT.origin.x || u.y !== BT.origin.y)) { u.x = u.rx = BT.origin.x; u.y = u.ry = BT.origin.y; }
  deselect(); sfx('cancel');
}

async function doAttack(a, d) {
  const seq = simFight(a, d), dist = man(a, d);
  const pu = a.team === 'p' ? a : (d.team === 'p' ? d : null), eu = pu === a ? d : a;
  const preHp = { a: a.hp, d: d.hp };
  const last = seq[seq.length - 1], aDead = last.aHp <= 0, dDead = last.dHp <= 0;
  let xi = null;
  if (pu) { const puDead = pu === a ? aDead : dDead, eKilled = pu === a ? dDead : aDead; if (!puDead) { xi = giveXp(pu, pu === a ? calcXp(pu, eu, eKilled) : Math.round(calcXp(pu, eu, eKilled) * .6)); } }
  if (save.duel) await duel(a, d, dist, seq, xi);
  else await quickFight(a, d, seq);
  a.hp = last.aHp; d.hp = last.dHp;
  if (a.hp <= 0) { a.dead = true; a.alpha = 0; } if (d.hp <= 0) { d.dead = true; d.alpha = 0; }
  if (xi && xi.ups.length) { floatTxt(pu, 'LEVEL UP!', '#7af0ff'); }
}
async function quickFight(a, d, seq) {
  for (const s of seq) {
    const att = s.src === 'a' ? a : d, df = s.src === 'a' ? d : a;
    const ax = att.rx, ay = att.ry; await tw(110, p => { att.rx = ax + (df.rx - ax) * .35 * Math.sin(p * Math.PI); att.ry = ay + (df.ry - ay) * .35 * Math.sin(p * Math.PI); });
    if (s.hit) { sfx(s.crit ? 'crit' : 'hit'); df.flash = 1; df.hp = s.vHp; floatTxt(df, s.dmg, s.crit ? '#ffd84a' : '#fff'); burst(MAPX + df.rx * TS + TS / 2, MAPY + df.ry * TS + TS / 2, 10, ['#fff', '#ffd84a'], 80, .4); } else { sfx('miss'); floatTxt(df, 'MISS', '#bcd0ff'); }
    await tw(180, p => { df.flash = s.hit ? 1 - p : 0; });
  }
  [a, d].forEach(u => { if (u.hp <= 0 || (u === a ? seq[seq.length - 1].aHp <= 0 : seq[seq.length - 1].dHp <= 0)) { } });
  const l = seq[seq.length - 1];
  for (const [u, hp] of [[a, l.aHp], [d, l.dHp]]) if (hp <= 0) { sfx('die'); await tw(350, p => { u.alpha = 1 - p; }); u.dead = true; }
}

// ---------- adegan duel (landscape, karakter vektor besar) ----------
const SPX = { L: 250, R: 710 }, FEET = 420, DSZ = 280, HOR = 310;
async function duel(a, d, dist, seq, xi) {
  const aP = a.team === 'p', Lu = aP ? a : (d.team === 'p' ? d : a), Ru = Lu === a ? d : a;
  BS = { u: { L: Lu, R: Ru }, hp: { L: Lu.hp, R: Ru.hp }, off: { L: 0, R: 0 }, hop: { L: 0, R: 0 }, sink: { L: 0, R: 0 }, flash: { L: 0, R: 0 }, alpha: { L: 1, R: 1 }, shake: 0, fade: 0, fx: [], texts: [], xp: null, whiteFlash: 0, th: BT.th };
  await tw(260, p => BS.fade = p);
  await wait(250);
  const sideOf = u => u === Lu ? 'L' : 'R';
  for (const s of seq) { const att = s.src === 'a' ? a : d; await strike(sideOf(att), s); }
  const l = seq[seq.length - 1];
  for (const [u, hp] of [[a, l.aHp], [d, l.dHp]]) if (hp <= 0) { const sd = sideOf(u); sfx('die'); for (let i = 0; i < 4; i++) { BS.alpha[sd] = i % 2 ? 1 : .3; await wait(70); } await tw(450, p => { BS.alpha[sd] = 1 - p; BS.sink[sd] = p * 40; }); }
  await wait(250);
  if (xi && xi.amt > 0) await xpScene(xi);
  await wait(200);
  await tw(240, p => BS.fade = 1 - p); BS = null;
}
async function strike(side, s) {
  const other = side === 'L' ? 'R' : 'L', dir = side === 'L' ? 1 : -1, au = BS.u[side], melee = ['sword', 'lance', 'axe'].includes(au.st.wep);
  const cxA = SPX[side], cxD = SPX[other], cy = FEET - 130, wep = au.st.wep, LUNGE = 170;
  if (melee) {
    await tw(170, p => BS.off[side] = dir * ease(p) * LUNGE);
    sfx('slash'); const f = { t: wep, p: 0, x: cxD, y: cy, dir }; BS.fx.push(f); tw(260, p => f.p = p).then(() => BS.fx.splice(BS.fx.indexOf(f), 1));
    await wait(110);
  } else {
    await tw(120, p => BS.off[side] = -dir * 18 * Math.sin(p * Math.PI * .5));
    sfx(wep === 'bow' ? 'bow' : 'magic'); const col = wep === 'bow' ? '#e8e0b0' : (au.def.boss ? '#ff6aff' : '#8ae0ff'); const f = { t: wep === 'bow' ? 'arrow' : 'bolt', p: 0, x0: cxA + dir * 110, x1: cxD, y: cy - 24, dir, col }; BS.fx.push(f);
    await tw(wep === 'bow' ? 240 : 360, p => f.p = p); BS.fx.splice(BS.fx.indexOf(f), 1);
  }
  // dampak
  if (s.hit) {
    sfx(s.crit ? 'crit' : 'hit'); BS.flash[other] = 1; BS.shake = s.crit ? 16 : 7; if (s.crit) BS.whiteFlash = .9;
    burst(cxD, cy - 20, s.crit ? 30 : 14, s.crit ? ['#ffd84a', '#fff', '#ff8a4a'] : ['#fff', '#ffe27a'], s.crit ? 230 : 140, .55, 140);
    const f2 = { t: 'ring', p: 0, x: cxD, y: cy, col: s.crit ? '#ffd84a' : '#fff' }; BS.fx.push(f2); tw(260, p => f2.p = p).then(() => BS.fx.splice(BS.fx.indexOf(f2), 1));
    BS.texts.push({ x: cxD, y: FEET - 270, s: String(s.dmg), c: s.crit ? '#ffd84a' : '#fff', big: s.crit, born: gtime }); if (s.crit) BS.texts.push({ x: cxD, y: FEET - 316, s: 'KRITIKAL!', c: '#ff8a4a', born: gtime });
    const from = BS.hp[other]; tw(300, p => { BS.hp[other] = Math.round(from + (s.vHp - from) * p); BS.flash[other] = 1 - p; BS.shake *= .85; BS.whiteFlash *= .88; });
    await tw(130, p => BS.off[other] = dir * 26 * Math.sin(p * Math.PI));
  } else {
    sfx('miss'); BS.texts.push({ x: cxD, y: FEET - 270, s: 'MISS', c: '#bcd0ff', born: gtime });
    await tw(260, p => { BS.hop[other] = -Math.sin(p * Math.PI) * 44; BS.off[other] = dir * Math.sin(p * Math.PI) * 44; });
  }
  await wait(120);
  if (melee) await tw(160, p => BS.off[side] = dir * (1 - ease(p)) * LUNGE); else BS.off[side] = 0;
  BS.off[side] = 0; BS.off[other] = 0; BS.hop[other] = 0; await wait(110);
}
async function xpScene(xi) {
  BS.xp = { v: xi.pre.xp, amt: xi.amt, lv: xi.pre.lv, up: null, show: true };
  await tw(260, p => { });
  let cur = xi.pre.xp, left = xi.amt; sfx('select');
  for (let i = 0; i <= xi.ups.length; i++) {
    const target = i < xi.ups.length ? 100 : xi.pre.xp + xi.amt - xi.ups.length * 100; const from = i === 0 ? xi.pre.xp : 0;
    await tw(Math.max(200, Math.abs(target - from) * 12), p => BS.xp.v = from + (target - from) * p);
    if (i < xi.ups.length) { const up = xi.ups[i]; BS.xp.lv = up.lv; BS.xp.up = up; sfx('level'); BS.whiteFlash = .6; tw(300, p => BS.whiteFlash = .6 * (1 - p)); burst(SPX.L, 300, 34, ['#7af0ff', '#fff', '#ffe27a'], 170, 1, -60); await wait(1350); BS.xp.up = null; BS.xp.v = 0; }
  }
  await wait(450);
}
function drawDuel() {
  const B = BS, T = THEMES[B.th];
  ctx.save(); if (B.shake > .5) ctx.translate((Math.random() - .5) * B.shake, (Math.random() - .5) * B.shake);
  // langit gradasi halus
  const sg = ctx.createLinearGradient(0, 0, 0, HOR + 10); sg.addColorStop(0, T.sky[0]); sg.addColorStop(.55, T.sky[1]); sg.addColorStop(1, T.sky[2]); ctx.fillStyle = sg; ctx.fillRect(-OX - 30, -30, W + 60, HOR + 40);
  // matahari/bulan samar
  const sun = ctx.createRadialGradient(780, 120, 4, 780, 120, 130); sun.addColorStop(0, 'rgba(255,255,230,.65)'); sun.addColorStop(1, 'rgba(255,255,230,0)'); ctx.fillStyle = sun; ctx.fillRect(600, -20, 360, 280);
  for (let i = 0; i < 5; i++) {
    const span = W + 400, cx = ((gtime * (8 + i * 3) + i * 260) % span) - 200 - OX, cy = 50 + i * 40; ctx.fillStyle = 'rgba(255,255,255,.5)';
    [[0, 0, 84, 15], [-44, 7, 52, 11], [50, 8, 58, 11]].forEach(c => { ctx.beginPath(); ctx.ellipse(cx + c[0], cy + c[1], c[2], c[3], 0, 0, 6.283); ctx.fill(); });
  }
  const mt = (col, base, amp, f1, f2, ph) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-OX - 30, HOR + 4); for (let x = -OX - 30; x <= W - OX + 30; x += 8) ctx.lineTo(x, base - (Math.abs(Math.sin(x * f1 + ph)) * amp + Math.abs(Math.sin(x * f2)) * amp * .28)); ctx.lineTo(W - OX + 30, HOR + 4); ctx.closePath(); ctx.fill(); };
  mt(T.far, HOR - 8, 120, .0062, .021, 1); mt(shade(T.far, -30), HOR, 54, .013, .045, 2);
  // tanah dengan perspektif
  const gg = ctx.createLinearGradient(0, HOR, 0, VH); gg.addColorStop(0, shade(T.g[0], 18)); gg.addColorStop(1, shade(T.g[0], -30)); ctx.fillStyle = gg; ctx.fillRect(-OX - 30, HOR, W + 60, VH - HOR + 30);
  for (let y = HOR, i = 0; y < VH; y += 14 + i * 5, i++) { ctx.fillStyle = i % 2 ? T.g[1] : T.g[2]; ctx.globalAlpha = .28; ctx.fillRect(-OX - 30, y, W + 60, 5 + i * 1.4); }
  ctx.globalAlpha = 1; const r = mulberry32(9);
  for (let i = 0; i < 90; i++) { const gx = -OX + r() * W, gy = HOR + 14 + r() * (VH - HOR), h = 5 + (gy - HOR) * .06; ctx.strokeStyle = r() < .5 ? T.g[1] : T.g[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - h); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 4, gy - h * .8); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-OX - 30, HOR, W + 60, 3);
  // petarung
  ['L', 'R'].forEach(sd => {
    const u = B.u[sd], cx = SPX[sd] + B.off[sd], boxX = cx - DSZ / 2, boxY = FEET - DSZ * .93 + B.hop[sd] + B.sink[sd];
    shadowEll(SPX[sd] + B.off[sd], FEET + 6, 92 - Math.abs(B.hop[sd]) * .5, 15, .34 * B.alpha[sd]);
    ctx.globalAlpha = B.alpha[sd]; const opt = { flip: sd === 'R', bob: idleBob(sd === 'L' ? 0 : 1.7), ph: sd === 'L' ? 0 : 1.7 };
    drawHero(u.def, boxX, boxY, DSZ, opt);
    if (B.flash[sd] > .02) { ctx.globalAlpha = B.alpha[sd] * B.flash[sd] * .85; drawHero(u.def, boxX, boxY, DSZ, Object.assign({ mode: 'w' }, opt)); }
    ctx.globalAlpha = 1;
  });
  B.fx.forEach(f => drawFx(f));
  B.texts = B.texts.filter(t => gtime - t.born < 1.1);
  B.texts.forEach(t => { const a = gtime - t.born; txt(t.s, t.x, t.y - Math.min(a, .5) * 70, { size: t.big ? 64 : (t.s.length > 3 ? 30 : 50), align: 'center', color: t.c, sh: '#000', base: 'middle' }); });
  ctx.restore();
  if (B.whiteFlash > .02) fullRect('rgba(255,255,255,' + B.whiteFlash + ')');
  // panel HP
  ['L', 'R'].forEach(sd => {
    const u = B.u[sd], x = sd === 'L' ? 20 : 610, y = 14, w = 330, hp = Math.max(0, B.hp[sd]), fr = hp / u.maxhp;
    panel(x, y, w, 104, sd === 'L' ? '#2a4ab0' : '#a02a3a', sd === 'L' ? '#10206a' : '#4a1020', 14);
    txt(u.name, x + 20, y + 14, { size: 26 }); txt('Lv' + u.lv + ' ' + WEP_NAME[u.st.wep], x + w - 20, y + 20, { size: 17, align: 'right', color: '#ffe27a' });
    txt('HP', x + 20, y + 52, { size: 18, color: '#ffe27a' }); txt(String(hp), x + 56, y + 46, { size: 28 }); txt('/' + u.maxhp, x + 62 + measure(String(hp), 28), y + 54, { size: 17, color: '#bcd0ff' });
    bar(x + 20, y + 80, w - 40, 12, hp, u.maxhp, fr > .5 ? '#4ad870' : (fr > .25 ? '#f0d84a' : '#f06a4a'));
  });
  const lw = B.u.L.st.wep, rw = B.u.R.st.wep, tri = triangle(lw, rw);
  if (tri) txt(tri > 0 ? 'Keunggulan senjata ▲' : 'Kalah senjata ▼', VW / 2, 24, { size: 16, align: 'center', color: tri > 0 ? '#7af0a0' : '#f08a8a' });
  if (B.xp && B.xp.show) {
    const x = 220, y = 458, w = 520; panel(x, y, w, 68, '#1a3a6a', '#0a1a3a', 14); txt('EXP', x + 22, y + 22, { size: 22, color: '#7af0ff' }); txt('Lv ' + B.xp.lv, x + 86, y + 22, { size: 22 });
    bar(x + 170, y + 26, 250, 16, B.xp.v, 100, '#3ad8a0'); txt('+' + B.xp.amt, x + w - 24, y + 20, { size: 26, align: 'right', color: '#ffe27a' });
    if (B.xp.up) { const up = B.xp.up; panel(300, 150, 360, 170, '#3a2a8a', '#1a104a', 16); txt('LEVEL UP!', VW / 2, 168, { size: 42, align: 'center', color: '#ffe27a' }); txt('Lv ' + up.lv, VW / 2, 224, { size: 26, align: 'center' });
      const d = up.dl; txt('HP+' + d.hp + '  ATK+' + d.atk + '  DEF+' + d.def + '  SPD+' + d.spd, VW / 2, 268, { size: 20, align: 'center', color: '#a8f0b8' }); }
  }
  if (B.fade < 1) fullRect('rgba(0,0,0,' + (1 - B.fade) + ')');
}
function drawFx(f) {
  const p = f.p; ctx.save();
  if (f.t === 'sword') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 14 * (1 - p) + 3; ctx.lineCap = 'round'; const a0 = f.dir > 0 ? -2.3 : -.84 - 1.6; ctx.beginPath(); ctx.arc(f.x - f.dir * 10, f.y + 26, 108, a0, f.dir > 0 ? a0 + p * 2.6 : a0, f.dir < 0); ctx.stroke(); ctx.strokeStyle = '#8ae0ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x - f.dir * 10, f.y + 26, 120, a0, f.dir > 0 ? a0 + p * 2.6 : a0, f.dir < 0); ctx.stroke(); }
  else if (f.t === 'lance') { const l = 170 * Math.min(1, p * 2.2); const sx = f.dir > 0 ? f.x - 110 : f.x + 110 - l; ctx.globalAlpha = 1 - p * .8; ctx.fillStyle = '#fff'; ctx.fillRect(sx, f.y - 4, l, 9); ctx.fillStyle = '#8ae0ff'; ctx.fillRect(sx, f.y + 6, l, 4); ctx.fillStyle = '#fff'; ctx.beginPath(); const tx = f.x + (f.dir > 0 ? -110 + l : 110 - l); ctx.moveTo(tx + f.dir * 16, f.y); ctx.lineTo(tx - f.dir * 4, f.y - 14); ctx.lineTo(tx - f.dir * 4, f.y + 14); ctx.fill(); }
  else if (f.t === 'axe') { ctx.strokeStyle = '#ffd0a0'; ctx.lineCap = 'round'; ctx.lineWidth = 20 * (1 - p) + 4; ctx.beginPath(); ctx.arc(f.x, f.y - 20, 112, -2.2, -2.2 + p * 2.4); ctx.stroke(); if (p > .5) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.fillRect(f.x - 70, f.y + 92, 140, 5); } }
  else if (f.t === 'arrow') { const x = f.x0 + (f.x1 - f.x0) * p; ctx.fillStyle = f.col; ctx.fillRect(Math.min(x, x - f.dir * 50), f.y - 2, 50, 4); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + f.dir * 14, f.y); ctx.lineTo(x, f.y - 8); ctx.lineTo(x, f.y + 8); ctx.fill(); ctx.fillStyle = '#c04a4a'; ctx.fillRect(f.dir > 0 ? x - 50 : x + 38, f.y - 6, 12, 12); }
  else if (f.t === 'bolt') { const x = f.x0 + (f.x1 - f.x0) * p, y = f.y + Math.sin(p * 18) * 8; const g = ctx.createRadialGradient(x, y, 2, x, y, 40); g.addColorStop(0, '#fff'); g.addColorStop(.4, f.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80); addPart(x, y, { vx: -f.dir * 40, vy: (Math.random() - .5) * 60, c: f.col, life: .35, s: 5 }); }
  else if (f.t === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - p; ctx.lineWidth = 8 * (1 - p) + 2; ctx.beginPath(); ctx.arc(f.x, f.y, 18 + p * 95, 0, 6.283); ctx.stroke(); }
  ctx.restore();
}

// ---------- fase ----------
async function showBanner(s, col) { BT.banner = s; BT.bcol = col || '#ffe27a'; sfx('banner'); await tw(280, p => BT.bp = p); await wait(520); await tw(240, p => BT.bp = 1 + p); BT.banner = ''; }
async function startPlayerPhase() {
  BT.phase = 'player'; BT.busy = true;
  await showBanner('GILIRAN ' + BT.turn + ' - PEMAIN', '#8ab8ff');
  aliveTeam('p').forEach(u => { u.acted = false; if (u.st.skill === 'regen' && u.hp < u.maxhp) { u.hp = Math.min(u.maxhp, u.hp + 4); floatTxt(u, '+4', '#7af0a0'); } });
  BT.busy = false;
}
async function endPlayerPhase() {
  if (BT.phase !== 'player' || BT.over) return;
  if (BT.sel) cancelSel(); BT.phase = 'enemy'; BT.busy = true; deselect(); BT.inspect = null;
  await showBanner('GILIRAN MUSUH', '#ff8a8a');
  for (const u of aliveTeam('e').slice()) {
    if (BT.over) return; if (u.dead) continue;
    const plan = aiPlan(u); if (!plan) continue;
    if (plan.move.length) await moveUnit(u, plan.move);
    if (plan.target && !plan.target.dead) { await doAttack(u, plan.target); if (await checkEnd()) return; }
    await wait(120);
  }
  if (BT.over) return; BT.turn++; startPlayerPhase();
}
function aiPlan(u) {
  const reach = computeReach(u), players = aliveTeam('p'); if (!players.length) return null;
  if (u.def.boss && BT.turn < 4) { const near = players.some(p => man(u, p) <= u.st.mov + u.st.rng[1] + 1); if (!near) return { move: [], target: null }; }
  let best = null, bs = -1e9;
  reach.dest.forEach(k => {
    const x = k % COLS, y = (k / COLS) | 0;
    players.forEach(p => {
      const d = Math.abs(p.x - x) + Math.abs(p.y - y); if (d < u.st.rng[0] || d > u.st.rng[1]) return;
      const c = calc(u, p, x, y, p.x, p.y), dmg = Math.min(c.dmg, p.hp) * c.hit / 100; let risk = 0;
      if (d >= p.st.rng[0] && d <= p.st.rng[1]) { const cc = calc(p, u, p.x, p.y, x, y); risk = cc.dmg * cc.hit / 100 * .6; }
      const sc = dmg * 2 + (c.dmg >= p.hp ? 40 : 0) - risk + T_DEF[BT.grid[y][x]] * 1.5 + (c.tri > 0 ? 2 : 0) + Math.random();
      if (sc > bs) { bs = sc; best = { k, target: p }; }
    });
  });
  if (best) return { move: best.k === kxy(u.x, u.y) ? [] : pathTo(reach, best.k), target: best.target };
  let bk = kxy(u.x, u.y), bd = 1e9;
  reach.dest.forEach(k => { const x = k % COLS, y = (k / COLS) | 0; const d = Math.min.apply(null, players.map(p => Math.abs(p.x - x) + Math.abs(p.y - y))) + reach.dist.get(k) * .01; if (d < bd) { bd = d; bk = k; } });
  return { move: bk === kxy(u.x, u.y) ? [] : pathTo(reach, bk), target: null };
}
async function checkEnd() {
  if (BT.over) return true;
  if (!aliveTeam('e').length) { victory(); return true; }
  if (!aliveTeam('p').length) { defeat(); return true; }
  return false;
}
async function victory() {
  BT.over = true; BT.busy = true; BT.sel = null; deselect(); bgm(null); sfx('win'); await showBanner('KEMENANGAN!', '#ffe27a');
  const info = floorInfo(BT.floor), first = BT.floor > save.best; const lines = [];
  save.orbs += info.reward; if (first) save.best = BT.floor;
  const fx = 30 + BT.floor * 2; const ups = [];
  BT.units.filter(u => u.team === 'p').forEach(u => { const r = giveXp(u, fx); r.ups.forEach(x => ups.push(u.name + ' naik ke Lv' + x.lv)); });
  syncSave(); writeSave();
  lines.push('+' + info.reward + ' Orb' + (first ? ' (pertama kali)' : '')); lines.push('Bonus EXP +' + fx + ' untuk semua anggota tim.');
  ups.slice(0, 4).forEach(s => lines.push(s)); if (ups.length > 4) lines.push('...dan ' + (ups.length - 4) + ' lainnya');
  const next = Math.min(MAX_FLOOR, BT.floor + 1), f = BT.floor;
  showModal({ title: 'LANTAI ' + f + ' SELESAI', lines, buttons: BT.floor < MAX_FLOOR ? [['Menara', () => go('tower')], ['Lantai ' + next, () => go('battle', next)]] : [['Menara', () => go('tower')]] });
}
function defeat() {
  BT.over = true; BT.busy = true; bgm(null); sfx('lose'); syncSave(); const f = BT.floor;
  showModal({ title: 'KALAH...', lines: ['Semua pahlawanmu tumbang.', 'Tingkatkan level, atau panggil pahlawan baru lalu coba lagi.'], buttons: [['Menara', () => go('tower')], ['Ulangi', () => go('battle', f)]] });
}

// ---------- scene ----------
const PX0 = MAPX + COLS * TS;   // tepi kiri panel info (648)
SC.battle = {
  enter(floor) { startBattle(floor); bgm('battle'); startPlayerPhase(); },
  update(dt) { if (!BT) return; BT.units.forEach(u => { if (u.flash > 0 && !BS) u.flash = Math.max(0, u.flash - dt * 4); }); },
  skip() { if (BS) speedMul = 3; },
  draw() {
    if (!BT) return; if (!BS) speedMul = 1;
    this.drawMap(); if (BS) drawDuel();
  },
  drawMap() {
    const th = BT.th, wf = Math.floor(gtime * 2) % 3, T = THEMES[th];
    fullRect('#0a0e24');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.drawImage(tileCanvas(th, BT.grid[y][x], BT.vr[y][x], wf), MAPX + x * TS, MAPY + y * TS, TS + .6, TS + .6);
    const pulse = .30 + .12 * Math.sin(gtime * 6);
    BT.atkSet.forEach(k => { const x = k % COLS, y = (k / COLS) | 0; if (BT.reach && BT.reach.dest.has(k)) return; ctx.fillStyle = 'rgba(230,50,60,' + pulse + ')'; rrect(MAPX + x * TS + 2, MAPY + y * TS + 2, TS - 4, TS - 4, 8); ctx.fill(); ctx.strokeStyle = 'rgba(255,150,150,.9)'; ctx.lineWidth = 2; ctx.stroke(); });
    if (BT.reach) BT.reach.dest.forEach(k => { const x = k % COLS, y = (k / COLS) | 0; ctx.fillStyle = 'rgba(60,120,255,' + pulse + ')'; rrect(MAPX + x * TS + 2, MAPY + y * TS + 2, TS - 4, TS - 4, 8); ctx.fill(); ctx.strokeStyle = 'rgba(170,205,255,.95)'; ctx.lineWidth = 2; ctx.stroke(); });
    ctx.lineWidth = 1;
    // header
    const hg = ctx.createLinearGradient(0, 0, 0, MAPY); hg.addColorStop(0, '#22388e'); hg.addColorStop(1, '#0c1444'); ctx.fillStyle = hg; ctx.fillRect(-OX, 0, W, MAPY); ctx.fillStyle = '#e8d890'; ctx.fillRect(-OX, MAPY - 3, W, 2); ctx.fillStyle = '#05081c'; ctx.fillRect(-OX, MAPY - 1, W, 1);
    txt('LANTAI ' + BT.floor, 18, 9, { size: 26, color: '#ffe27a' }); txt(T.name, 18 + measure('LANTAI ' + BT.floor, 26) + 18, 15, { size: 17, color: '#bcd0ff' });
    txt('Giliran ' + BT.turn, 440, 14, { size: 21, align: 'center' }); txt('Pemain ' + aliveTeam('p').length + '  /  Musuh ' + aliveTeam('e').length, 640, 15, { size: 18, align: 'center', color: '#d8e8ff' });
    btn(VW - 150, 5, 138, 38, 'MENYERAH', () => { if (BT.over) return; showModal({ title: 'Menyerah?', lines: ['Keluar dari lantai ini. EXP yang didapat tetap tersimpan.'], buttons: [['Batal', null], ['Keluar', () => { syncSave(); go('tower'); }]] }); }, { size: 15, c1: '#8a3a3a', c2: '#4a1a1a' });
    // unit
    const us = BT.units.filter(u => !u.dead || u.alpha > 0).slice().sort((a, b) => a.ry - b.ry);
    us.forEach(u => {
      if (u.dead && u.alpha <= 0) return; const px = MAPX + u.rx * TS, py = MAPY + u.ry * TS, sel = BT.sel === u, SZ = 68;
      const bx = px + TS / 2 - SZ / 2, by = py + TS - 8 - SZ * .93;
      ctx.globalAlpha = u.alpha;
      ctx.fillStyle = u.team === 'p' ? 'rgba(40,90,255,.5)' : 'rgba(255,40,50,.5)'; ctx.beginPath(); ctx.ellipse(px + TS / 2, py + TS - 9, 21, 8, 0, 0, 6.283); ctx.fill();
      if (u.def.boss) { ctx.fillStyle = 'rgba(255,80,60,' + (.22 + .14 * Math.sin(gtime * 5)) + ')'; ctx.beginPath(); ctx.ellipse(px + TS / 2, py + TS - 14, 26, 14, 0, 0, 6.283); ctx.fill(); }
      const gray = u.team === 'p' && u.acted && BT.phase === 'player';
      const opt = { flip: u.team === 'e', walk: u.walk, bob: u.walk ? -Math.abs(Math.sin(gtime * 14)) * 3 : idleBob(u.x * .7 + u.y * .5), ph: u.x * .7 + u.y * .5, mode: gray ? 'g' : 'n' };
      drawHero(u.def, bx, by, SZ, opt);
      if (u.flash > .02) { ctx.globalAlpha = u.alpha * u.flash; drawHero(u.def, bx, by, SZ, Object.assign({}, opt, { mode: 'w' })); }
      ctx.globalAlpha = u.alpha; const w = 40, f = Math.max(0, u.hp / u.maxhp), hy = py + TS - 6;
      rrect(px + TS / 2 - w / 2 - 1.5, hy - 1.5, w + 3, 8, 4); ctx.fillStyle = '#05081c'; ctx.fill();
      if (f > 0) { rrect(px + TS / 2 - w / 2, hy, Math.max(4, w * f), 5, 2.5); ctx.fillStyle = u.team === 'p' ? (f > .5 ? '#4ad870' : f > .25 ? '#f0d84a' : '#f06a4a') : '#f06a6a'; ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    // kursor
    if (BT.sel) {
      const u = BT.sel, px = MAPX + u.rx * TS, py = MAPY + u.ry * TS, o = (Math.sin(gtime * 9) * .5 + .5) * 3; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach(([cx, cy, sx, sy]) => { const x = px + 3 + cx * (TS - 6) - sx * o, y = py + 3 + cy * (TS - 6) - sy * o; ctx.beginPath(); ctx.moveTo(x + sx * 13, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * 13); ctx.stroke(); });
      ctx.lineWidth = 1;
    }
    // angka melayang
    BT.floats = BT.floats.filter(f => gtime - f.born < 1); BT.floats.forEach(f => { const a = gtime - f.born; txt(f.s, f.x, f.y - 6 - a * 40, { size: 26, align: 'center', color: f.c, sh: '#000', base: 'middle' }); });
    this.drawInfo();
    // banner
    if (BT.banner) { const p = BT.bp; const x = p < 1 ? (-W + p * W) : (p - 1) * W; ctx.fillStyle = 'rgba(0,0,20,.8)'; ctx.fillRect(-OX, 214, W, 84); ctx.fillStyle = BT.bcol; ctx.fillRect(-OX, 214, W, 3); ctx.fillRect(-OX, 295, W, 3); txt(BT.banner, VW / 2 + x, 232, { size: 44, align: 'center', color: BT.bcol, sh: '#000' }); }
  },
  drawInfo() {
    const x0 = PX0 + 8, y0 = MAPY + 8, pw = VW - PX0 - 12;
    ctx.fillStyle = '#0a0e24'; ctx.fillRect(PX0, MAPY, VW - PX0 + OX + 2, VH - MAPY);
    panel(PX0 + 4, MAPY + 4, pw + 6, VH - MAPY - 10, '#1e3a98', '#0c1650', 14);
    const u = BT.sel || BT.inspect, ix = x0 + 14, iw = pw - 22;
    if (u && !u.dead) {
      rrect(ix, y0 + 14, 94, 94, 12); ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fill();
      shadowEll(ix + 47, y0 + 98, 26, 6, .4); drawHero(u.def, ix + 2, y0 + 12, 90, { bob: idleBob(0), flip: u.team === 'e' });
      txt(u.name, ix + 108, y0 + 14, { size: 24, color: u.team === 'p' ? '#fff' : '#ffb0b0' }); txt('Lv' + u.lv + ' ' + CLASSES[u.def.cls].name + ' / ' + WEP_NAME[u.st.wep], ix + 108, y0 + 46, { size: 15, color: '#ffe27a' });
      txt('HP ' + u.hp + '/' + u.maxhp, ix + 108, y0 + 68, { size: 18 }); bar(ix + 108, y0 + 94, iw - 108, 12, u.hp, u.maxhp, '#4ad870');
      txt('ATK ' + u.st.atk + '    DEF ' + u.st.def, ix, y0 + 124, { size: 19, color: '#d8e8ff' }); txt('SPD ' + u.st.spd + '    MOV ' + u.st.mov, ix, y0 + 150, { size: 19, color: '#d8e8ff' });
      let yy = y0 + 180;
      if (u.st.skill) { wrapPx(SKILLS[u.st.skill][0] + ': ' + SKILLS[u.st.skill][1], iw, 15).forEach(l => { txt(l, ix, yy, { size: 15, color: '#a8e8b8' }); yy += 20; }); }
      const tt = BT.grid[u.y][u.x]; txt(T_NAME[tt] + '  DEF+' + T_DEF[tt] + '  HIN+' + T_AVO[tt], ix, yy + 2, { size: 15, color: '#ffe27a' }); yy += 28;
      if (BT.sel && BT.mode === 'action') { const ts = targetsFrom(u, u.x, u.y); wrapPx(ts.length ? 'Sentuh musuh merah untuk menyerang.' : 'Tidak ada musuh dalam jangkauan.', iw, 15).forEach(l => { txt(l, ix, yy, { size: 15, color: ts.length ? '#ff9a9a' : '#bcd0ff' }); yy += 20; }); }
      else if (BT.sel) wrapPx('Sentuh kotak biru: bergerak. Sentuh musuh merah: serang.', iw, 15).forEach(l => { txt(l, ix, yy, { size: 15, color: '#bcd0ff' }); yy += 20; });
    } else {
      txt('Sentuh pahlawan biru', ix, y0 + 18, { size: 19, color: '#d8e8ff' }); txt('untuk memilih.', ix, y0 + 42, { size: 19, color: '#d8e8ff' });
      txt('Pedang > Kapak > Tombak > Pedang', ix, y0 + 86, { size: 15, color: '#ffe27a' });
      txt('Hutan: DEF+1 hindar+15', ix, y0 + 118, { size: 15, color: '#bcd0ff' }); txt('Gunung: DEF+2 hindar+25', ix, y0 + 142, { size: 15, color: '#bcd0ff' }); txt('Air tidak bisa dilewati.', ix, y0 + 166, { size: 15, color: '#bcd0ff' });
    }
    const pl = BT.phase === 'player' && !BT.busy && !BT.over, bw = (iw - 10) / 2;
    btn(ix, 396, bw, 52, BT.mode === 'action' ? 'Tunggu' : 'Batal', () => { if (BT.mode === 'action') waitUnit(BT.sel); else cancelSel(); }, { size: 19, disabled: !pl || !BT.sel, c1: '#3ab870', c2: '#16683a', quiet: true });
    btn(ix + bw + 10, 396, bw, 52, 'Urung', () => cancelSel(), { size: 19, disabled: !pl || !BT.sel || BT.mode !== 'action', quiet: true });
    btn(ix, 458, iw, 62, 'AKHIRI GILIRAN', () => endPlayerPhase(), { size: 21, disabled: !pl, c1: '#f0a028', c2: '#b04a10' });
  },
  tap(x, y) {
    if (!BT || BT.busy || BT.phase !== 'player' || BT.over || BS) return;
    if (y < MAPY || y >= MAPY + ROWS * TS || x < MAPX || x >= MAPX + COLS * TS) return;
    const tx = Math.floor((x - MAPX) / TS), ty = Math.floor((y - MAPY) / TS), u = unitAt(tx, ty), sel = BT.sel, k = kxy(tx, ty);
    if (!sel) { if (u && u.team === 'p' && !u.acted) selectUnit(u); else { BT.inspect = u || null; if (u) sfx('select'); } return; }
    if (BT.mode === 'move') {
      if (u === sel) { playerMove(sel, tx, ty); return; }
      if (u && u.team === 'p') { if (!u.acted) selectUnit(u); else { BT.inspect = u; } return; }
      if (u && u.team === 'e') { if (BT.atkSet.has(k)) approachAndAttack(sel, u); else { deselect(); BT.inspect = u; sfx('select'); } return; }
      if (BT.reach.dest.has(k)) { playerMove(sel, tx, ty); return; }
      cancelSel();
    } else if (BT.mode === 'action') {
      if (u && u.team === 'e' && BT.atkSet.has(k)) { playerAttack(sel, u); return; }
      if (u === sel) { waitUnit(sel); return; }
      sfx('error');
    }
  }
};
