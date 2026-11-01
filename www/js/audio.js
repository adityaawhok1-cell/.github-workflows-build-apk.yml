'use strict';
// ====== Audio chiptune (WebAudio, tanpa file) ======
const Au = { ctx: null, master: null, want: null, cur: null, step: 0, next: 0, timer: null };
function auInit() {
  if (!Au.ctx) {
    try {
      Au.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Au.master = Au.ctx.createGain(); Au.master.gain.value = .5; Au.master.connect(Au.ctx.destination);
      Au.musicG = Au.ctx.createGain(); Au.musicG.gain.value = .35; Au.musicG.connect(Au.master);
      Au.timer = setInterval(auTick, 40);
    } catch (e) { Au.ctx = null; }
  }
  if (Au.ctx && Au.ctx.state === 'suspended') Au.ctx.resume();
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function tone(f, t0, d, type, vol, to, dest) {
  const c = Au.ctx; if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || .15, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(dest || Au.master); o.start(t0); o.stop(t0 + d + .02);
}
function noise(t0, d, vol) {
  const c = Au.ctx; if (!c) return;
  const len = Math.floor(c.sampleRate * d), b = c.createBuffer(1, len, c.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < len; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = vol || .25;
  s.connect(g); g.connect(Au.master); s.start(t0);
}
function sfx(n) {
  if (!Au.ctx || !save || !save.sfx) return; const t = Au.ctx.currentTime;
  switch (n) {
    case 'click': tone(660, t, .06, 'square', .1); break;
    case 'select': tone(880, t, .05, 'square', .1); tone(1320, t + .05, .07, 'square', .1); break;
    case 'cancel': tone(500, t, .08, 'square', .1, 300); break;
    case 'move': tone(300, t, .04, 'triangle', .12); break;
    case 'hit': noise(t, .15, .3); tone(160, t, .12, 'sawtooth', .15, 60); break;
    case 'crit': noise(t, .3, .4); tone(120, t, .25, 'sawtooth', .22, 40); tone(900, t, .12, 'square', .12, 200); break;
    case 'miss': tone(700, t, .15, 'triangle', .1, 1400); break;
    case 'slash': noise(t, .09, .15); tone(900, t, .1, 'sawtooth', .06, 300); break;
    case 'bow': tone(1200, t, .12, 'triangle', .1, 400); break;
    case 'magic': tone(400, t, .3, 'sine', .15, 1600); tone(600, t, .3, 'triangle', .08, 1900); break;
    case 'die': tone(300, t, .5, 'sawtooth', .15, 50); break;
    case 'error': tone(200, t, .15, 'square', .12); tone(150, t + .12, .18, 'square', .12); break;
    case 'level': [72, 76, 79, 84].forEach((n2, i) => tone(midi(n2), t + i * .09, .14, 'square', .12)); break;
    case 'win': [72, 72, 72, 76, 79, 76, 79, 84].forEach((n2, i) => tone(midi(n2), t + i * .12, .16, 'square', .12)); break;
    case 'lose': [60, 58, 56, 53].forEach((n2, i) => tone(midi(n2), t + i * .25, .3, 'triangle', .18)); break;
    case 'summon': for (let i = 0; i < 14; i++) tone(midi(55 + i * 2), t + i * .12, .18, 'triangle', .07); break;
    case 'flash': noise(t, .5, .3); tone(200, t, .5, 'sawtooth', .12, 2000); break;
    case 'r3': tone(midi(72), t, .15, 'square', .12); tone(midi(79), t + .12, .2, 'square', .12); break;
    case 'r4': [72, 76, 79, 83].forEach((n2, i) => tone(midi(n2), t + i * .1, .2, 'square', .12)); break;
    case 'r5': [72, 76, 79, 84, 88, 91, 96].forEach((n2, i) => { tone(midi(n2), t + i * .09, .3, 'square', .1); tone(midi(n2 - 12), t + i * .09, .3, 'triangle', .1); }); break;
    case 'banner': tone(midi(67), t, .1, 'square', .1); tone(midi(74), t + .1, .2, 'square', .1); break;
  }
}
// ---- BGM sederhana yang dibangkitkan secara prosedural ----
const TRACKS = {
  calm:   { bpm: 92,  root: 57, scale: [0, 3, 5, 7, 10, 12, 15, 17], prog: [0, -4, -2, -5], lead: 'triangle', seed: 7,  dens: .55 },
  battle: { bpm: 138, root: 52, scale: [0, 2, 3, 7, 8, 12, 14, 15],  prog: [0, 0, -4, -2], lead: 'square',   seed: 21, dens: .8 },
  gacha:  { bpm: 108, root: 60, scale: [0, 2, 4, 7, 9, 12, 14, 16],  prog: [0, 5, 7, 4],   lead: 'triangle', seed: 3,  dens: .6 },
};
function bgm(n) { Au.want = n; }
function auTick() {
  const c = Au.ctx; if (!c || c.state !== 'running') return;
  if (!save || !save.music || !Au.want) { Au.cur = null; return; }
  if (Au.cur !== Au.want) { Au.cur = Au.want; Au.step = 0; Au.next = c.currentTime + .05; Au.rng = mulberry32(TRACKS[Au.cur].seed); }
  const T = TRACKS[Au.cur]; const sd = 60 / T.bpm / 2;
  while (Au.next < c.currentTime + .25) {
    const s = Au.step, bar = Math.floor(s / 16) % 4, pos = s % 16, root = T.root + T.prog[bar];
    if (pos % 4 === 0) tone(midi(root - 12), Au.next, sd * 3.5, 'triangle', .22, 0, Au.musicG);
    if (Au.cur === 'battle' && pos % 2 === 0) tone(midi(root - 12), Au.next, sd * .8, 'square', .06, 0, Au.musicG);
    if (pos % 2 === 0 || Au.rng() < T.dens * .4) {
      if (Au.rng() < T.dens) { const nt = T.scale[Math.floor(Au.rng() * T.scale.length)]; tone(midi(root + 12 + nt), Au.next, sd * 1.6, T.lead, .1, 0, Au.musicG); }
    }
    if (pos === 0 && bar === 0) Au.rng = mulberry32(T.seed + 1);
    Au.step++; Au.next += sd;
  }
}
