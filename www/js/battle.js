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
  for (let y = 0; y < ROWS; y++) { grid[y] = []; vr[y] = []; for (let x = 0; x < COLS; x++) { const v = r(); let t = 0; if (v < .15) t = 1; else if (v < .21) t = 2; else if (v < .26) t = 3; if ((y <= 2 || y >= 8) && t >= 2) t = 0; if ((y <= 1 || y >= 9) && t === 1 && r() < .5) t = 0; grid[y][x] = t; vr[y][x] = Math.floor(r() * 4); } }
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
  save.party.forEach((id, i) => { const o = save.owned[id]; BT.units.push(mkUnit({ team: 'p', id, def: HERO[id], name: HERO[id].name, lv: o.lv, xp: o.xp, lb: o.lb, st: heroStats(id, o.lv, o.lb), x: x0 + i, y: 9 + (i % 2) })); });
  BT.units.forEach(u => { BT.grid[u.y][u.x] = BT.grid[u.y][u.x] === 3 ? 0 : BT.grid[u.y][u.x]; });
  const defs = enemyDefs(floor, th), r = mulberry32(floor * 17 + 5), used = new Set();
  defs.forEach((d, i) => {
    let x, y, tries = 0;
    do { x = Math.floor(r() * COLS); y = d.boss ? Math.floor(r() * 2) : Math.floor(r() * 4); tries++; } while ((used.has(kxy(x, y)) || BT.grid[y][x] === 3) && tries < 200);
    if (d.boss) { x = 4 + Math.floor(r() * 2); y = 0; BT.grid[y][x] = 0; }
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
function floatTxt(u, s, c) { BT.floats.push({ x: u.rx * TS + 16, y: MAPY + u.ry * TS, s: String(s), c: c || '#fff', born: gtime }); }
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
    if (s.hit) { sfx(s.crit ? 'crit' : 'hit'); df.flash = 1; df.hp = s.vHp; floatTxt(df, s.dmg, s.crit ? '#ffd84a' : '#fff'); burst(df.rx * TS + 16, MAPY + df.ry * TS + 16, 8, ['#fff', '#ffd84a'], 80, .4); } else { sfx('miss'); floatTxt(df, 'MISS', '#bcd0ff'); }
    await tw(180, p => { df.flash = s.hit ? 1 - p : 0; });
  }
  [a, d].forEach(u => { if (u.hp <= 0 || (u === a ? seq[seq.length - 1].aHp <= 0 : seq[seq.length - 1].dHp <= 0)) { } });
  const l = seq[seq.length - 1];
  for (const [u, hp] of [[a, l.aHp], [d, l.dHp]]) if (hp <= 0) { sfx('die'); await tw(350, p => { u.alpha = 1 - p; }); u.dead = true; }
}

// ---------- adegan duel ----------
const SPX = { L: 24, R: 168 }, SPY = 230;
async function duel(a, d, dist, seq, xi) {
  const aP = a.team === 'p', Lu = aP ? a : (d.team === 'p' ? d : a), Ru = Lu === a ? d : a;
  BS = { u: { L: Lu, R: Ru }, hp: { L: Lu.hp, R: Ru.hp }, off: { L: 0, R: 0 }, hop: { L: 0, R: 0 }, sink: { L: 0, R: 0 }, flash: { L: 0, R: 0 }, alpha: { L: 1, R: 1 }, shake: 0, fade: 0, fx: [], texts: [], xp: null, whiteFlash: 0, th: BT.th };
  await tw(260, p => BS.fade = p);
  await wait(250);
  const sideOf = u => u === Lu ? 'L' : 'R';
  for (const s of seq) { const att = s.src === 'a' ? a : d; await strike(sideOf(att), s); }
  const l = seq[seq.length - 1];
  for (const [u, hp] of [[a, l.aHp], [d, l.dHp]]) if (hp <= 0) { const sd = sideOf(u); sfx('die'); for (let i = 0; i < 4; i++) { BS.alpha[sd] = i % 2 ? 1 : .3; await wait(70); } await tw(450, p => { BS.alpha[sd] = 1 - p; BS.sink[sd] = p * 24; }); }
  await wait(250);
  if (xi && xi.amt > 0) await xpScene(xi);
  await wait(200);
  await tw(240, p => BS.fade = 1 - p); BS = null;
}
async function strike(side, s) {
  const other = side === 'L' ? 'R' : 'L', dir = side === 'L' ? 1 : -1, au = BS.u[side], melee = ['sword', 'lance', 'axe'].includes(au.st.wep);
  const cxA = SPX[side] + 64, cxD = SPX[other] + 64, cy = SPY + 70, wep = au.st.wep;
  if (melee) {
    await tw(170, p => BS.off[side] = dir * ease(p) * 62);
    sfx('slash'); const f = { t: wep, p: 0, x: cxD, y: cy, dir }; BS.fx.push(f); tw(260, p => f.p = p).then(() => BS.fx.splice(BS.fx.indexOf(f), 1));
    await wait(110);
  } else {
    await tw(120, p => BS.off[side] = -dir * 10 * Math.sin(p * Math.PI * .5));
    sfx(wep === 'bow' ? 'bow' : 'magic'); const col = wep === 'bow' ? '#e8e0b0' : (au.def.boss ? '#ff6aff' : '#8ae0ff'); const f = { t: wep === 'bow' ? 'arrow' : 'bolt', p: 0, x0: cxA + dir * 40, x1: cxD, y: cy - 6, dir, col }; BS.fx.push(f);
    await tw(wep === 'bow' ? 220 : 340, p => f.p = p); BS.fx.splice(BS.fx.indexOf(f), 1);
  }
  // dampak
  if (s.hit) {
    sfx(s.crit ? 'crit' : 'hit'); BS.flash[other] = 1; BS.shake = s.crit ? 9 : 4; if (s.crit) BS.whiteFlash = .9;
    burst(cxD, cy - 10, s.crit ? 26 : 12, s.crit ? ['#ffd84a', '#fff', '#ff8a4a'] : ['#fff', '#ffe27a'], s.crit ? 190 : 110, .5, 120);
    const f2 = { t: 'ring', p: 0, x: cxD, y: cy, col: s.crit ? '#ffd84a' : '#fff' }; BS.fx.push(f2); tw(260, p => f2.p = p).then(() => BS.fx.splice(BS.fx.indexOf(f2), 1));
    BS.texts.push({ x: cxD, y: SPY + 20, s: String(s.dmg), c: s.crit ? '#ffd84a' : '#fff', big: s.crit, born: gtime }); if (s.crit) BS.texts.push({ x: cxD, y: SPY - 6, s: 'KRITIKAL!', c: '#ff8a4a', born: gtime });
    const from = BS.hp[other]; tw(300, p => { BS.hp[other] = Math.round(from + (s.vHp - from) * p); BS.flash[other] = 1 - p; BS.shake *= .85; BS.whiteFlash *= .88; });
    await tw(130, p => BS.off[other] = -(-dir) * 0 + dir * 14 * Math.sin(p * Math.PI));
  } else {
    sfx('miss'); BS.texts.push({ x: cxD, y: SPY + 20, s: 'MISS', c: '#bcd0ff', born: gtime });
    await tw(260, p => { BS.hop[other] = -Math.sin(p * Math.PI) * 24; BS.off[other] = dir * Math.sin(p * Math.PI) * 22; });
  }
  await wait(120);
  if (melee) await tw(160, p => BS.off[side] = dir * (1 - ease(p)) * 62); else BS.off[side] = 0;
  BS.off[side] = 0; BS.off[other] = 0; BS.hop[other] = 0; await wait(110);
}
async function xpScene(xi) {
  BS.xp = { v: xi.pre.xp, amt: xi.amt, lv: xi.pre.lv, up: null, show: true };
  await tw(260, p => { });
  let cur = xi.pre.xp, left = xi.amt; sfx('select');
  for (let i = 0; i <= xi.ups.length; i++) {
    const target = i < xi.ups.length ? 100 : xi.pre.xp + xi.amt - xi.ups.length * 100; const from = i === 0 ? xi.pre.xp : 0;
    await tw(Math.max(200, Math.abs(target - from) * 12), p => BS.xp.v = from + (target - from) * p);
    if (i < xi.ups.length) { const up = xi.ups[i]; BS.xp.lv = up.lv; BS.xp.up = up; sfx('level'); BS.whiteFlash = .6; tw(300, p => BS.whiteFlash = .6 * (1 - p)); burst(88, 300, 30, ['#7af0ff', '#fff', '#ffe27a'], 160, 1, -60); await wait(1350); BS.xp.up = null; BS.xp.v = 0; }
  }
  await wait(450);
}
function drawDuel() {
  const B = BS, T = THEMES[B.th];
  ctx.save(); if (B.shake > .5) ctx.translate((Math.random() - .5) * B.shake, (Math.random() - .5) * B.shake);
  // langit
  const sk = T.sky; ctx.fillStyle = sk[0]; ctx.fillRect(-20, -20, W + 40, 120); ctx.fillStyle = shade(sk[0], 18); ctx.fillRect(-20, 100, W + 40, 60); ctx.fillStyle = sk[1]; ctx.fillRect(-20, 160, W + 40, 60); ctx.fillStyle = sk[2]; ctx.fillRect(-20, 220, W + 40, 90);
  for (let i = 0; i < 4; i++) { const cx = ((gtime * (5 + i * 2) + i * 100) % (W + 140)) - 70, cy = 40 + i * 38; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx, cy, 60, 8); ctx.fillRect(cx + 10, cy - 6, 34, 6); ctx.fillRect(cx + 18, cy + 8, 28, 5); }
  ctx.fillStyle = T.far; for (let x = -4; x < W + 4; x += 4) { const h = 40 + Math.abs(Math.sin(x * .021 + 1)) * 50 + Math.abs(Math.sin(x * .07)) * 14; ctx.fillRect(x, 300 - h, 4, h + 2); }
  ctx.fillStyle = shade(T.far, -30); for (let x = -4; x < W + 4; x += 4) { const h = 16 + Math.abs(Math.sin(x * .05 + 2)) * 26; ctx.fillRect(x, 304 - h, 4, h); }
  // tanah
  ctx.fillStyle = T.g[0]; ctx.fillRect(-20, 300, W + 40, 130);
  for (let y = 300, i = 0; y < 430; y += 10 + i * 2, i++) { ctx.fillStyle = i % 2 ? T.g[1] : T.g[2]; ctx.globalAlpha = .55; ctx.fillRect(-20, y, W + 40, 3 + i); }
  ctx.globalAlpha = 1; const r = mulberry32(9); for (let i = 0; i < 40; i++) { ctx.fillStyle = T.g[1]; const gx = Math.floor(r() * W), gy = 306 + Math.floor(r() * 110); ctx.fillRect(gx, gy, 2, 3); }
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-20, 300, W + 40, 2);
  // petarung
  ['L', 'R'].forEach(sd => {
    const u = B.u[sd], x = SPX[sd] + B.off[sd], y = SPY + B.hop[sd] + B.sink[sd];
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(SPX[sd] + 64, SPY + 128, 46 - Math.abs(B.hop[sd]) * .3, 9, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = B.alpha[sd]; const spr = heroSprite(u.def, idleF(sd === 'L' ? 0 : .5));
    drawSpr(spr, x, y, 8, sd === 'R'); if (B.flash[sd] > .02) { ctx.globalAlpha = B.alpha[sd] * B.flash[sd] * .85; drawSpr(whiteSprite(spr), x, y, 8, sd === 'R'); }
    ctx.globalAlpha = 1;
    if (u.def.boss) { ctx.strokeStyle = 'rgba(255,90,90,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x + 10, y + 6, 108, 120); ctx.lineWidth = 1; }
  });
  // efek
  B.fx.forEach(f => drawFx(f));
  // angka
  B.texts = B.texts.filter(t => gtime - t.born < 1.1);
  B.texts.forEach(t => { const a = gtime - t.born; txt(t.s, t.x, t.y - Math.min(a, .5) * 40, { size: t.big ? 30 : (t.s.length > 3 ? 14 : 24), align: 'center', color: t.c, sh: '#000' }); });
  ctx.restore();
  if (B.whiteFlash > .02) { ctx.fillStyle = 'rgba(255,255,255,' + B.whiteFlash + ')'; ctx.fillRect(0, 0, W, 430); }
  // panel HP
  ctx.fillStyle = '#0a1238'; ctx.fillRect(0, 430, W, H - 430); ctx.fillStyle = '#e8d890'; ctx.fillRect(0, 430, W, 2);
  ['L', 'R'].forEach(sd => {
    const u = B.u[sd], x = sd === 'L' ? 6 : 164, w = 150, y = 436; panel(x, y, w, 62, sd === 'L' ? '#2a4ab0' : '#a02a3a', sd === 'L' ? '#10206a' : '#4a1020');
    txt(u.name, x + 10, y + 6, { size: 12 }); txt('Lv' + u.lv + ' ' + WEP_NAME[u.st.wep], x + 10, y + 21, { size: 9, color: '#ffe27a' });
    txt('HP', x + 10, y + 34, { size: 11, color: '#ffe27a' }); txt(String(Math.max(0, B.hp[sd])), x + 36, y + 32, { size: 14, align: 'left' }); txt('/' + u.maxhp, x + 36 + String(Math.max(0, B.hp[sd])).length * 9 + 3, y + 36, { size: 9, color: '#bcd0ff' });
    bar(x + 10, y + 52, w - 20, 6, Math.max(0, B.hp[sd]), u.maxhp, B.hp[sd] / u.maxhp > .5 ? '#4ad870' : (B.hp[sd] / u.maxhp > .25 ? '#f0d84a' : '#f06a4a'));
  });
  // info segitiga
  const lw = B.u.L.st.wep, rw = B.u.R.st.wep, tri = triangle(lw, rw);
  txt(tri > 0 ? 'Keunggulan senjata ▲' : (tri < 0 ? 'Kalah senjata ▼' : ''), 6, 504, { size: 9, color: tri > 0 ? '#7af0a0' : '#f08a8a' });
  if (B.xp && B.xp.show) {
    const x = 6, y = 512; panel(x, y, 308, 54, '#1a3a6a', '#0a1a3a'); txt('EXP', x + 12, y + 10, { size: 12, color: '#7af0ff' }); txt('Lv ' + B.xp.lv, x + 12, y + 30, { size: 12 });
    bar(x + 70, y + 14, 220, 10, B.xp.v, 100, '#3ad8a0'); txt('+' + B.xp.amt, x + 296, y + 32, { size: 14, align: 'right', color: '#ffe27a' });
    if (B.xp.up) { const up = B.xp.up; panel(40, 200, 240, 96, '#3a2a8a', '#1a104a'); txt('LEVEL UP!', W / 2, 210, { size: 20, align: 'center', color: '#ffe27a' }); txt('Lv ' + up.lv, W / 2, 238, { size: 12, align: 'center' });
      const d = up.dl; txt('HP+' + d.hp + '  ATK+' + d.atk + '  DEF+' + d.def + '  SPD+' + d.spd, W / 2, 262, { size: 10, align: 'center', color: '#a8f0b8' }); }
  }
  if (B.fade < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - B.fade) + ')'; ctx.fillRect(0, 0, W, H); }
}
function drawFx(f) {
  const p = f.p; ctx.save();
  if (f.t === 'sword') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 7 * (1 - p) + 2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(f.x - f.dir * 6, f.y + 14, 58, f.dir > 0 ? -2.3 : -.84 - 1.6, f.dir > 0 ? -2.3 + p * 2.6 : -.84 - 1.6 + 0, f.dir < 0); ctx.stroke(); ctx.strokeStyle = '#8ae0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x - f.dir * 6, f.y + 14, 64, f.dir > 0 ? -2.3 : -.84 - 1.6, f.dir > 0 ? -2.3 + p * 2.6 : -.84 - 1.6, f.dir < 0); ctx.stroke(); }
  else if (f.t === 'lance') { const l = 90 * Math.min(1, p * 2.2); ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - p * .8; ctx.fillRect(f.dir > 0 ? f.x - 60 : f.x + 60 - l, f.y - 2, l, 5); ctx.fillStyle = '#8ae0ff'; ctx.fillRect(f.dir > 0 ? f.x - 60 : f.x + 60 - l, f.y + 4, l, 2); ctx.fillStyle = '#fff'; ctx.fillRect(f.x + (f.dir > 0 ? -60 + l - 6 : 60 - l), f.y - 6, 6, 13); }
  else if (f.t === 'axe') { ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 11 * (1 - p) + 3; ctx.beginPath(); ctx.arc(f.x, f.y - 10, 60, -2.2, -2.2 + p * 2.4); ctx.stroke(); if (p > .5) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.fillRect(f.x - 40, f.y + 50, 80, 3); } }
  else if (f.t === 'arrow') { const x = f.x0 + (f.x1 - f.x0) * p; ctx.fillStyle = f.col; ctx.fillRect(x - f.dir * 14, f.y, 16, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x + (f.dir > 0 ? 2 : -6), f.y - 2, 4, 6); ctx.fillStyle = '#c04a4a'; ctx.fillRect(x - f.dir * 14 + (f.dir > 0 ? 0 : 10), f.y - 2, 4, 6); }
  else if (f.t === 'bolt') { const x = f.x0 + (f.x1 - f.x0) * p, y = f.y + Math.sin(p * 18) * 4; const g = ctx.createRadialGradient(x, y, 1, x, y, 16); g.addColorStop(0, '#fff'); g.addColorStop(.4, f.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32); addPart(x, y, { vx: -f.dir * 20, vy: (Math.random() - .5) * 30, c: f.col, life: .3, s: 2 }); }
  else if (f.t === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - p; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + p * 46, 0, 6.283); ctx.stroke(); }
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
SC.battle = {
  enter(floor) { startBattle(floor); bgm('battle'); startPlayerPhase(); },
  update(dt) { if (!BT) return; BT.units.forEach(u => { if (u.flash > 0 && !BS) u.flash = Math.max(0, u.flash - dt * 4); }); },
  skip() { if (BS) speedMul = 3; },
  draw() {
    if (!BT) return; if (!BS) speedMul = 1;
    this.drawMap(); if (BS) drawDuel();
  },
  drawMap() {
    const th = BT.th, wf = Math.floor(gtime * 2) % 3;
    ctx.fillStyle = '#0a0e24'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.drawImage(tileCanvas(th, BT.grid[y][x], BT.vr[y][x], wf), x * TS, MAPY + y * TS, TS, TS);
    const pulse = .32 + .12 * Math.sin(gtime * 6);
    BT.atkSet.forEach(k => { const x = k % COLS, y = (k / COLS) | 0; if (BT.reach && BT.reach.dest.has(k)) return; ctx.fillStyle = 'rgba(230,50,60,' + pulse + ')'; ctx.fillRect(x * TS, MAPY + y * TS, TS, TS); ctx.strokeStyle = 'rgba(255,140,140,.8)'; ctx.strokeRect(x * TS + .5, MAPY + y * TS + .5, TS - 1, TS - 1); });
    if (BT.reach) BT.reach.dest.forEach(k => { const x = k % COLS, y = (k / COLS) | 0; ctx.fillStyle = 'rgba(60,120,255,' + pulse + ')'; ctx.fillRect(x * TS, MAPY + y * TS, TS, TS); ctx.strokeStyle = 'rgba(160,200,255,.9)'; ctx.strokeRect(x * TS + .5, MAPY + y * TS + .5, TS - 1, TS - 1); });
    // unit
    const us = BT.units.filter(u => !u.dead || u.alpha > 0).slice().sort((a, b) => a.ry - b.ry);
    us.forEach(u => {
      if (u.dead && u.alpha <= 0) return; const px = Math.round(u.rx * TS), py = MAPY + Math.round(u.ry * TS), sel = BT.sel === u;
      const fr = u.walk ? Math.floor(gtime * 10) % 2 : (sel ? Math.floor(gtime * 5) % 2 : idleF(u.x * .3 + u.y * .2));
      ctx.globalAlpha = u.alpha; ctx.fillStyle = u.team === 'p' ? 'rgba(40,90,255,.45)' : 'rgba(255,40,50,.45)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 12, 5, 0, 0, 6.283); ctx.fill();
      let spr = heroSprite(u.def, fr); const gray = u.team === 'p' && u.acted && BT.phase === 'player'; if (gray) spr = graySprite(spr);
      if (u.def.boss) { ctx.fillStyle = 'rgba(255,80,60,' + (.25 + .15 * Math.sin(gtime * 5)) + ')'; ctx.beginPath(); ctx.ellipse(px + 16, py + 20, 18, 14, 0, 0, 6.283); ctx.fill(); }
      drawSpr(spr, px, py - 2, 2); if (u.flash > .02) { ctx.globalAlpha = u.alpha * u.flash; drawSpr(whiteSprite(heroSprite(u.def, fr)), px, py - 2, 2); }
      ctx.globalAlpha = u.alpha; const w = 24, f = Math.max(0, u.hp / u.maxhp); ctx.fillStyle = '#05081c'; ctx.fillRect(px + 3, py + 28, w + 2, 4); ctx.fillStyle = u.team === 'p' ? (f > .5 ? '#4ad870' : f > .25 ? '#f0d84a' : '#f06a4a') : '#f06a6a'; ctx.fillRect(px + 4, py + 29, Math.round(w * f), 2);
      ctx.globalAlpha = 1;
    });
    // kursor
    if (BT.sel) { const u = BT.sel, px = Math.round(u.rx * TS), py = MAPY + Math.round(u.ry * TS), o = Math.floor(gtime * 6) % 2 * 2; ctx.fillStyle = '#ffe27a'; [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach(([cx, cy, sx, sy]) => { const x = px + cx * (TS - 1) + sx * o, y = py + cy * (TS - 1) + sy * o; ctx.fillRect(sx > 0 ? x : x - 7, y, 8, 2); ctx.fillRect(sx > 0 ? x : x - 1, sy > 0 ? y : y - 6, 2, 7); }); }
    // angka melayang
    BT.floats = BT.floats.filter(f => gtime - f.born < 1); BT.floats.forEach(f => { const a = gtime - f.born; txt(f.s, f.x, f.y - 6 - a * 24, { size: 14, align: 'center', color: f.c, sh: '#000' }); });
    // header
    panel(0, 0, W, MAPY, '#1a2a70', '#0a1240'); txt('LANTAI ' + BT.floor, 10, 8, { size: 14, color: '#ffe27a' }); txt(THEMES[th].name, 10, 28, { size: 9, color: '#bcd0ff' });
    txt('Giliran ' + BT.turn, 160, 8, { size: 11, align: 'center' }); txt('Pemain ' + aliveTeam('p').length + ' / Musuh ' + aliveTeam('e').length, 160, 26, { size: 9, align: 'center', color: '#d8e8ff' });
    btn(246, 6, 68, 36, 'MENYERAH', () => { if (BT.over) return; showModal({ title: 'Menyerah?', lines: ['Keluar dari lantai ini. EXP yang didapat tetap tersimpan.'], buttons: [['Batal', null], ['Keluar', () => { syncSave(); go('tower'); }]] }); }, { size: 8, c1: '#8a3a3a', c2: '#4a1a1a' });
    // panel bawah
    this.drawInfo();
    // banner
    if (BT.banner) { const p = BT.bp; const x = p < 1 ? (-W + p * W) : (p - 1) * W; ctx.fillStyle = 'rgba(0,0,20,.78)'; ctx.fillRect(0, 230, W, 56); ctx.fillStyle = BT.bcol; ctx.fillRect(0, 230, W, 2); ctx.fillRect(0, 284, W, 2); txt(BT.banner, W / 2 + x, 246, { size: 22, align: 'center', color: BT.bcol, sh: '#000' }); }
  },
  drawInfo() {
    panel(0, MAPY + ROWS * TS, W, H - MAPY - ROWS * TS, '#1e3a98', '#0c1650'); const y0 = MAPY + ROWS * TS;
    const u = BT.sel || BT.inspect;
    if (u && !u.dead) {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(10, y0 + 14, 54, 54); drawSpr(heroSprite(u.def, idleF()), 14, y0 + 16, 3);
      txt(u.name, 72, y0 + 10, { size: 13, color: u.team === 'p' ? '#fff' : '#ffb0b0' }); txt('Lv' + u.lv + ' ' + CLASSES[u.def.cls].name + '/' + WEP_NAME[u.st.wep], 72, y0 + 27, { size: 9, color: '#ffe27a' });
      txt('HP ' + u.hp + '/' + u.maxhp, 72, y0 + 41, { size: 10 }); bar(150, y0 + 43, 90, 6, u.hp, u.maxhp, '#4ad870');
      txt('ATK ' + u.st.atk + '  DEF ' + u.st.def + '  SPD ' + u.st.spd + '  MOV ' + u.st.mov, 72, y0 + 56, { size: 9, color: '#d8e8ff' });
      if (u.st.skill) txt(SKILLS[u.st.skill][0] + ': ' + SKILLS[u.st.skill][1], 12, y0 + 74, { size: 8, color: '#a8e8b8' });
      const tt = BT.grid[u.y][u.x]; txt(T_NAME[tt], 312, y0 + 10, { size: 10, align: 'right', color: '#ffe27a' }); txt('DEF+' + T_DEF[tt] + ' HIN+' + T_AVO[tt], 312, y0 + 24, { size: 8, align: 'right', color: '#bcd0ff' });
      if (BT.sel && BT.mode === 'action') { const ts = targetsFrom(u, u.x, u.y); if (ts.length) txt('Sentuh musuh merah untuk menyerang', 12, y0 + 90, { size: 9, color: '#ff9a9a' }); else txt('Tidak ada musuh dalam jangkauan', 12, y0 + 90, { size: 9, color: '#bcd0ff' }); }
      else if (BT.sel) txt('Sentuh kotak biru: bergerak. Sentuh musuh merah: serang.', 12, y0 + 90, { size: 8, color: '#bcd0ff' });
    } else { txt('Sentuh pahlawan biru untuk memilih.', 12, y0 + 16, { size: 10, color: '#d8e8ff' }); txt('Pedang > Kapak > Tombak > Pedang', 12, y0 + 34, { size: 9, color: '#ffe27a' }); txt('Hutan: DEF+1 hindar+15   Gunung: DEF+2 hindar+25', 12, y0 + 50, { size: 8, color: '#bcd0ff' }); txt('Air tidak bisa dilewati.', 12, y0 + 64, { size: 8, color: '#bcd0ff' }); }
    const by = H - 44, pl = BT.phase === 'player' && !BT.busy && !BT.over;
    btn(8, by, 96, 36, BT.mode === 'action' ? 'Tunggu' : 'Batal', () => { if (BT.mode === 'action') waitUnit(BT.sel); else cancelSel(); }, { size: 12, disabled: !pl || !BT.sel, c1: '#3ab870', c2: '#16683a', quiet: true });
    btn(112, by, 96, 36, 'Urung', () => cancelSel(), { size: 12, disabled: !pl || !BT.sel || BT.mode !== 'action', quiet: true });
    btn(216, by, 96, 36, 'Akhiri', () => endPlayerPhase(), { size: 12, disabled: !pl, c1: '#f0a028', c2: '#b04a10' });
  },
  tap(x, y) {
    if (!BT || BT.busy || BT.phase !== 'player' || BT.over || BS) return;
    if (y < MAPY || y >= MAPY + ROWS * TS) return;
    const tx = Math.floor(x / TS), ty = Math.floor((y - MAPY) / TS), u = unitAt(tx, ty), sel = BT.sel, k = kxy(tx, ty);
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
