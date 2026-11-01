'use strict';
// ====== Konstanta & data game ======
const W = 320, H = 576, TS = 32, COLS = 10, ROWS = 11, MAPY = 48;
const STAR_MULT = { 3: 1, 4: 1.12, 5: 1.25 };
const LV_CAP = 40;
const MAX_FLOOR = 100;

const CLASSES = {
  lord:    { name: 'Lord',      wep: 'sword', hp: 20, atk: 7, def: 4, spd: 7, mov: 5, rng: [1, 1], g: [55, 45, 30, 45] },
  knight:  { name: 'Ksatria',   wep: 'lance', hp: 24, atk: 7, def: 8, spd: 3, mov: 4, rng: [1, 1], g: [60, 40, 45, 25] },
  fighter: { name: 'Petarung',  wep: 'axe',   hp: 26, atk: 8, def: 3, spd: 5, mov: 5, rng: [1, 1], g: [70, 50, 25, 30] },
  archer:  { name: 'Pemanah',   wep: 'bow',   hp: 18, atk: 7, def: 3, spd: 8, mov: 5, rng: [2, 2], g: [50, 45, 25, 50] },
  mage:    { name: 'Penyihir',  wep: 'tome',  hp: 16, atk: 9, def: 2, spd: 6, mov: 5, rng: [1, 2], g: [45, 55, 20, 40], magic: true },
};
const WEP_NAME = { sword: 'Pedang', lance: 'Tombak', axe: 'Kapak', bow: 'Busur', tome: 'Sihir' };
// segitiga senjata: pedang > kapak > tombak > pedang
const TRI = { sword: 'axe', axe: 'lance', lance: 'sword' };
function triangle(a, d) { if (TRI[a] === d) return 1; if (TRI[d] === a) return -1; return 0; }

const SKILLS = {
  pierce: ['Tembus', 'Abaikan 40% DEF lawan'],
  crit:   ['Kritikal', '+20% peluang kritikal'],
  guard:  ['Perisai', 'Damage diterima -2'],
  swift:  ['Gesit', '+1 jarak gerak'],
  regen:  ['Pemulih', 'Pulih 4 HP tiap giliran'],
  lucky:  ['Akurat', '+15% peluang kena'],
  fury:   ['Amuk', 'ATK +3 saat HP < 50%'],
};

// [hp, atk, def, spd]
const HEROES = [
  // 5 bintang
  { id: 'aldric',   name: 'Aldric',   title: 'Pangeran Fajar',   cls: 'lord',    stars: 5, hair: '#f5d36b', armor: '#4a7bd8', cape: '#d8453b', mods: [4, 3, 1, 2],  skill: 'pierce' },
  { id: 'selene',   name: 'Selene',   title: 'Penyihir Agung',   cls: 'mage',    stars: 5, hair: '#d9a7ff', armor: '#7a4ad8', cape: '#2c1e8a', mods: [3, 5, 0, 2],  skill: 'crit' },
  { id: 'bramwell', name: 'Bramwell', title: 'Benteng Hidup',    cls: 'knight',  stars: 5, hair: '#c8c8d8', armor: '#8a93a8', cape: '#2f6fd0', mods: [8, 1, 4, 0],  skill: 'guard' },
  { id: 'sylvara',  name: 'Sylvara',  title: 'Panah Badai',      cls: 'archer',  stars: 5, hair: '#7be0a0', armor: '#2f9e6a', cape: '#e8e0b0', mods: [3, 4, 1, 3],  skill: 'lucky' },
  // 4 bintang
  { id: 'kaelen',   name: 'Kaelen',   title: 'Kapak Api',        cls: 'fighter', stars: 4, hair: '#e8643a', armor: '#a85a2a', cape: '#8a2a1a', mods: [3, 2, 0, 1],  skill: 'crit' },
  { id: 'rowena',   name: 'Rowena',   title: 'Pemburu Elang',    cls: 'archer',  stars: 4, hair: '#8a5a2a', armor: '#3a8a4a', cape: '#c9b46a', mods: [1, 2, 0, 2],  skill: 'swift' },
  { id: 'dante',    name: 'Dante',    title: 'Ksatria Bayangan', cls: 'lord',    stars: 4, hair: '#2a2a3a', armor: '#3a3a5a', cape: '#a81a4a', mods: [1, 2, 0, 1],  skill: 'fury' },
  { id: 'mira',     name: 'Mira',     title: 'Bintang Pagi',     cls: 'mage',    stars: 4, hair: '#ff9ac8', armor: '#e8e8f8', cape: '#d86a9a', mods: [3, 1, 1, 1],  skill: 'regen' },
  { id: 'orin',     name: 'Orin',     title: 'Penjaga Gerbang',  cls: 'knight',  stars: 4, hair: '#6a7a9a', armor: '#a8a870', cape: '#4a6a3a', mods: [4, 1, 2, 0],  skill: 'guard' },
  { id: 'talia',    name: 'Talia',    title: 'Pendekar Badai',   cls: 'fighter', stars: 4, hair: '#4ad8e8', armor: '#d8a02a', cape: '#2a7a9a', mods: [2, 2, 1, 2],  skill: 'fury' },
  // 3 bintang
  { id: 'finn',     name: 'Finn',     title: 'Prajurit Muda',    cls: 'lord',    stars: 3, hair: '#6ab0e8', armor: '#5a7ac8', cape: '#c84a4a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'hugo',     name: 'Hugo',     title: 'Tukang Kayu',      cls: 'fighter', stars: 3, hair: '#a86a3a', armor: '#8a6a4a', cape: '#aa3a3a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'pia',      name: 'Pia',      title: 'Pemanah Desa',     cls: 'archer',  stars: 3, hair: '#e8b04a', armor: '#5aa05a', cape: '#8a6a3a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'gwen',     name: 'Gwen',     title: 'Murid Sihir',      cls: 'mage',    stars: 3, hair: '#f08a8a', armor: '#a86ad8', cape: '#5a3a9a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'bert',     name: 'Bert',     title: 'Penjaga Desa',     cls: 'knight',  stars: 3, hair: '#8a6a4a', armor: '#7a8aa0', cape: '#3a5aa0', mods: [0, 0, 0, 0],  skill: null },
  { id: 'lena',     name: 'Lena',     title: 'Pengintai',        cls: 'archer',  stars: 3, hair: '#4a3a5a', armor: '#4a7a8a', cape: '#9a4a6a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'rex',      name: 'Rex',      title: 'Pengelana',        cls: 'lord',    stars: 3, hair: '#d8d8d8', armor: '#8a4a4a', cape: '#3a3a4a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'ned',      name: 'Ned',      title: 'Penebang',         cls: 'fighter', stars: 3, hair: '#3a2a1a', armor: '#6a8a4a', cape: '#6a4a2a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'ivy',      name: 'Ivy',      title: 'Peramal',          cls: 'mage',    stars: 3, hair: '#5ae0a0', armor: '#3a9a8a', cape: '#2a6a5a', mods: [0, 0, 0, 0],  skill: null },
  { id: 'tomas',    name: 'Tomas',    title: 'Pengawal',         cls: 'knight',  stars: 3, hair: '#b88a5a', armor: '#9a9a9a', cape: '#8a3a3a', mods: [0, 0, 0, 0],  skill: null },
];
const HERO = {}; HEROES.forEach(h => HERO[h.id] = h);
const POOL = { 3: [], 4: [], 5: [] }; HEROES.forEach(h => POOL[h.stars].push(h));

// tema per 10 lantai
const THEMES = [
  { name: 'Dataran Fajar',  g: ['#5aa84a', '#4a9640', '#74c25e'], tree: ['#2f8a3c', '#1d5a2a'], trunk: '#6a4a2a', rock: ['#9a9aa8', '#6e6e80', '#f2f2fa'], w: ['#3a78d8', '#6aa8f4'], sky: ['#5aa8ec', '#a8d8ff', '#e8f6ff'], far: '#7a9ac0' },
  { name: 'Padang Salju',   g: ['#dce8f2', '#c8d8ea', '#f6fafe'], tree: ['#2f6a58', '#1d4a3e'], trunk: '#5a4a3a', rock: ['#8a98ae', '#667690', '#ffffff'], w: ['#5a8ac8', '#9ac4ee'], sky: ['#8aa8c8', '#c8dcf0', '#f2f8ff'], far: '#a8b8d0' },
  { name: 'Gurun Terik',    g: ['#d8b868', '#c8a458', '#ecd286'], tree: ['#4a8a3a', '#2f6a2a'], trunk: '#7a5a2a', rock: ['#b88a5a', '#8a6a40', '#f0d098'], w: ['#2aa0b0', '#6ad0d8'], sky: ['#f0a868', '#ffd498', '#fff0c8'], far: '#c8946a' },
  { name: 'Benteng Kelam',  g: ['#4a4458', '#3e384c', '#5e5872'], tree: ['#6a2a6a', '#44184a'], trunk: '#2a1a2a', rock: ['#6e5e82', '#4a3e5e', '#a898c8'], w: ['#d8501a', '#ffa02a'], sky: ['#241636', '#4a2a62', '#7a4a84'], far: '#3a2a52' },
];
const T_COST = [1, 2, 3, 99];
const T_DEF = [0, 1, 2, 0];
const T_AVO = [0, 15, 25, 0];
const T_NAME = ['Dataran', 'Hutan', 'Gunung', 'Air'];

const ENEMY_CLS_NAME = { lord: 'Prajurit', knight: 'Ksatria Gelap', fighter: 'Bandit', archer: 'Pemanah Gelap', mage: 'Penyihir Gelap' };
const BOSS_NAMES = ['Raja Goblin', 'Ratu Es', 'Sultan Pasir', 'Jenderal Bayangan', 'Naga Abu', 'Lich Agung', 'Raksasa Batu', 'Ksatria Hitam', 'Iblis Menara', 'Penguasa Menara'];

// ====== Seeded RNG ======
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ====== Stat ======
function heroStats(id, lv, lb) {
  const h = HERO[id], c = CLASSES[h.cls], m = STAR_MULT[h.stars];
  const keys = ['hp', 'atk', 'def', 'spd'];
  const o = {};
  keys.forEach((k, i) => {
    let v = c[k] + h.mods[i] + c.g[i] * (lv - 1) / 100 + (k === 'hp' ? 2 : (k === 'atk' ? 1 : 0.5)) * lb;
    o[k] = Math.max(1, Math.round(v * m));
  });
  o.mov = c.mov + (h.skill === 'swift' ? 1 : 0);
  o.rng = c.rng; o.wep = c.wep; o.magic = !!c.magic; o.skill = h.skill;
  return o;
}
function enemyStats(cls, floor, boss) {
  const c = CLASSES[cls], f = floor - 1;
  const hp = c.hp * (1 + 0.06 * f) * (boss ? 2.2 : 1);
  const atk = c.atk * 1.05 * (1 + 0.06 * f) * (boss ? 1.25 : 1);
  const def = c.def * (1 + 0.035 * f) * (boss ? 1.15 : 1);
  const spd = c.spd * (1 + 0.025 * f);
  return { hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), spd: Math.round(spd), mov: c.mov, rng: c.rng, wep: c.wep, magic: !!c.magic, skill: boss ? 'guard' : null };
}
function xpToNext(lv) { return 100; }

// ====== Save ======
const SAVE_KEY = 'menara_emblem_v1';
let save;
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function defaultSave() {
  const o = {}; ['finn', 'hugo', 'pia', 'gwen'].forEach(id => o[id] = { lv: 1, xp: 0, lb: 0 });
  return { orbs: 1500, owned: o, party: ['finn', 'hugo', 'pia', 'gwen'], best: 0, pity: 0, pulls: 0, login: '', sfx: true, music: true, duel: true };
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.owned) { save = Object.assign(defaultSave(), s); return; } } catch (e) { }
  save = defaultSave();
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
