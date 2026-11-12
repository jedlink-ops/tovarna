'use strict';
(() => {
  // =====================================================================
  //  ZELENÉ ÚDOLÍ – útulná budovatelská hra s logistikou
  // =====================================================================
  const A = window.ART;
  const W = 48, H = 48, T = 48, RS = 16;
  const SAVE_KEY = 'zelene-udoli-v2';
  const $ = id => document.getElementById(id);
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HALL_X = 24, HALL_Y = 24;
  const WORK_RANGE = 6, HOUSE_SLOTS = 2;
  const CONV_SPEED = 2.4;

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ---------- Suroviny ----------
  const RES = {
    wood: { n: 'Dřevo' }, stone: { n: 'Kámen' }, plank: { n: 'Prkna' }, wheat: { n: 'Pšenice' }, bread: { n: 'Chléb' },
    fish: { n: 'Ryby' }, ironOre: { n: 'Železná ruda' }, iron: { n: 'Železo' }, tool: { n: 'Nářadí' }, gold: { n: 'Zlato' }, jewel: { n: 'Klenoty' },
  };
  const RES_KEYS = Object.keys(RES);
  const ico = k => '<img class="ic" src="' + A.iconURL[k] + '" alt="">';

  // ---------- Budovy ----------
  // kind: prod (jen vyrábí), proc (přijímá vstupy a vyrábí), sink (sklad), house, split, conv
  const B = {
    hall:      { n: 'Radnice', kind: 'sink', size: 2, cost: {}, desc: 'Hlavní sklad osady. Co sem dovezeš, můžeš utratit za stavby.' },
    conveyor:  { n: 'Dopravník', kind: 'conv', cost: { wood: 1 }, desc: 'Veze zboží ve směru šipky. Kresli ho tažením prstu.' },
    splitter:  { n: 'Rozdělovač', kind: 'split', on: 'build', cost: { wood: 3, stone: 2 }, desc: 'Co k němu přijede, pošle střídavě na všechny strany.', hint: 'Staví se na trávu.' },
    lumber:    { n: 'Dřevorubec', kind: 'prod', on: 'forest', work: 1, cost: { wood: 5 }, rec: { out: 'wood', t: 3 }, desc: 'Kácí les a vyrábí dřevo.', hint: 'Staví se na les.' },
    quarry:    { n: 'Lom', kind: 'prod', on: 'rock', work: 1, cost: { wood: 8 }, rec: { out: 'stone', t: 3.5 }, desc: 'Láme kámen ze skály.', hint: 'Staví se na skálu.' },
    house:     { n: 'Chaloupka', kind: 'house', on: 'build', cost: { wood: 12, stone: 4 }, desc: 'Bydlí v ní 2 dělníci. Musí stát do 6 polí od jejich práce.', hint: 'Staví se na trávu.' },
    sawmill:   { n: 'Pila', kind: 'proc', on: 'build', work: 1, cost: { wood: 15, stone: 6 }, rec: { in: { wood: 2 }, out: 'plank', t: 4 }, desc: 'Ze 2 kusů dřeva uřízne prkno.', hint: 'Staví se na trávu.' },
    warehouse: { n: 'Sklad', kind: 'sink', on: 'build', cost: { wood: 25, stone: 10 }, desc: 'Další sklad: přijímá zboží a zvětší zásoby o 100.', hint: 'Staví se na trávu.' },
    farm:      { n: 'Pole', kind: 'prod', on: 'build', work: 1, cost: { wood: 12, plank: 4 }, rec: { out: 'wheat', t: 4 }, desc: 'Pěstuje pšenici. U vody roste o 50 % rychleji.', hint: 'Staví se na trávu.' },
    bakery:    { n: 'Pekárna', kind: 'proc', on: 'build', work: 1, cost: { wood: 15, stone: 12, plank: 6 }, rec: { in: { wheat: 2 }, out: 'bread', t: 5 }, desc: 'Ze 2 pšenic upeče chléb.', hint: 'Staví se na trávu.' },
    fisher:    { n: 'Rybář', kind: 'prod', on: 'shore', work: 1, cost: { wood: 10, plank: 4 }, rec: { out: 'fish', t: 4 }, desc: 'Loví ryby.', hint: 'Staví se na břehu vedle vody.' },
    mine:      { n: 'Důl', kind: 'prod', on: 'ore', work: 1, cost: { wood: 15, plank: 8, stone: 10 }, rec: { out: 'ironOre', t: 4 }, desc: 'Těží železnou rudu.', hint: 'Staví se na rudné ložisko (skály s oranžovými žilami).' },
    forge:     { n: 'Kovárna', kind: 'proc', on: 'build', work: 1, cost: { stone: 25, plank: 8 }, rec: { in: { ironOre: 2, wood: 1 }, out: 'iron', t: 6 }, desc: 'Ze 2 rud a 1 dřeva vytaví železo.', hint: 'Staví se na trávu.' },
    workshop:  { n: 'Dílna', kind: 'proc', on: 'build', work: 1, cost: { plank: 20, stone: 20, iron: 5 }, rec: { in: { iron: 1, plank: 1 }, out: 'tool', t: 8 }, desc: 'Z železa a prkna vyrobí nářadí.', hint: 'Staví se na trávu.' },
    goldmine:  { n: 'Zlatý důl', kind: 'prod', on: 'gold', work: 1, cost: { plank: 20, iron: 8, tool: 2 }, rec: { out: 'gold', t: 6 }, desc: 'Těží zlato.', hint: 'Staví se na zlatou žílu (žlutě se třpytí).' },
    jeweler:   { n: 'Klenotník', kind: 'proc', on: 'build', work: 1, cost: { stone: 30, plank: 20, iron: 6 }, rec: { in: { gold: 1, iron: 1 }, out: 'jewel', t: 10 }, desc: 'Ze zlata a železa vyrobí klenot.', hint: 'Staví se na trávu.' },
    monument:  { n: 'Velký chrám', kind: 'wonder', on: 'build', cost: { stone: 400, plank: 150, iron: 80, jewel: 20, tool: 20 }, desc: 'Dílo celého údolí. Postav ho a vyhráváš!', hint: 'Staví se na trávu. Potřebuješ velký sklad (3 sklady navíc).' },
  };
  const BRIDGE_COST = { plank: 2 };
  const PALETTE = ['erase', 'conveyor', 'splitter', 'lumber', 'quarry', 'house', 'sawmill', 'warehouse', 'farm', 'bakery', 'fisher', 'mine', 'forge', 'workshop', 'goldmine', 'jeweler', 'monument'];
  const UNLOCK_AT = { erase: 1, conveyor: 1, lumber: 1, quarry: 1, house: 1, sawmill: 2, warehouse: 2, splitter: 3, farm: 3, bakery: 3, fisher: 3, mine: 4, forge: 4, workshop: 5, goldmine: 6, jeweler: 6, monument: 9 };
  const BRIDGE_LVL = 3, FOOD_LVL = 3;

  // ---------- Levely ----------
  const LEVELS = [
    { name: 'Osada', goals: [{ k: 'dl', r: 'wood', n: 15 }, { k: 'dl', r: 'stone', n: 10 }, { k: 'build', b: 'house', n: 1 }], bonus: { wood: 25, stone: 10 } },
    { name: 'Řemeslníci', goals: [{ k: 'dl', r: 'plank', n: 15 }, { k: 'build', b: 'warehouse', n: 1 }, { k: 'build', b: 'house', n: 3 }], bonus: { wood: 30, stone: 20 } },
    { name: 'Úroda a mosty', goals: [{ k: 'build', b: 'bridge', n: 2 }, { k: 'dl', r: 'bread', n: 10 }, { k: 'dl', r: 'fish', n: 6 }], bonus: { plank: 25, wood: 25 } },
    { name: 'Železná doba', goals: [{ k: 'dl', r: 'iron', n: 12 }, { k: 'dl', r: 'stone', n: 40 }], bonus: { plank: 25, iron: 5, stone: 20 } },
    { name: 'Dílny', goals: [{ k: 'dl', r: 'tool', n: 6 }, { k: 'dl', r: 'iron', n: 20 }, { k: 'build', b: 'workshop', n: 1 }], bonus: { plank: 30, iron: 10, stone: 30 } },
    { name: 'Zlatá horečka', goals: [{ k: 'dl', r: 'gold', n: 10 }, { k: 'dl', r: 'jewel', n: 4 }, { k: 'build', b: 'warehouse', n: 3 }], bonus: { plank: 40, iron: 20 } },
    { name: 'Bohatství', goals: [{ k: 'dl', r: 'plank', n: 60 }, { k: 'dl', r: 'iron', n: 30 }, { k: 'dl', r: 'bread', n: 40 }, { k: 'dl', r: 'tool', n: 10 }], bonus: { stone: 80, tool: 6 } },
    { name: 'Metropole', goals: [{ k: 'dl', r: 'tool', n: 20 }, { k: 'dl', r: 'jewel', n: 12 }, { k: 'build', b: 'house', n: 10 }], bonus: { stone: 120, plank: 60, iron: 30, jewel: 4 } },
    { name: 'Velký chrám', goals: [{ k: 'build', b: 'monument', n: 1 }], bonus: {} },
  ];

  // ---------- Oblasti ----------
  const ORDER = [[1, 1], [1, 0], [2, 1], [1, 2], [0, 1], [2, 0], [2, 2], [0, 2], [0, 0]];
  const REG_NAMES = ['Střed údolí', 'Sever', 'Východ', 'Jih', 'Západ', 'Severovýchod', 'Jihovýchod', 'Jihozápad', 'Severozápad'];
  const REG_IDX = new Array(9);
  ORDER.forEach(([rx, ry], i) => { REG_IDX[ry * 3 + rx] = i; });
  const regIdxAt = (x, y) => REG_IDX[Math.floor(y / RS) * 3 + Math.floor(x / RS)];

  // ---------- Terén ----------
  const G = 0, FOREST = 1, ROCK = 2, WATER = 3, ORE = 4, GOLD = 5, SAND = 6;
  const terrain = new Uint8Array(W * H), gIdx = new Uint8Array(W * H);
  let grid = new Array(W * H).fill(null), blds = [];
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cell = (x, y) => (inb(x, y) ? grid[y * W + x] : null);
  const tAt = (x, y) => (inb(x, y) ? terrain[y * W + x] : -1);

  function blob(cx, cy, r, t) {
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      if (!inb(x, y)) continue;
      if (Math.hypot(x - cx, y - cy) < r * (0.72 + 0.48 * hash(x * 3 + Math.floor(cx), y * 5 + Math.floor(cy)))) terrain[y * W + x] = t;
    }
  }
  function river(vertical, center, width, wob, phase) {
    for (let i = 0; i < 48; i++) {
      const off = Math.round(Math.sin(i * 0.33 + phase) * wob);
      for (let k = 0; k < width; k++) {
        const a = center + off + k;
        if (vertical) { if (inb(a, i)) terrain[i * W + a] = WATER; } else if (inb(i, a)) terrain[a * W + i] = WATER;
      }
    }
  }
  function genTerrain() {
    terrain.fill(G);
    const F = (x, y, r) => blob(x, y, r, FOREST), R = (x, y, r) => blob(x, y, r, ROCK), O = (x, y, r) => blob(x, y, r, ORE),
          GD = (x, y, r) => blob(x, y, r, GOLD), WA = (x, y, r) => blob(x, y, r, WATER);
    // střed (začátek): les vlevo nahoře, skála vpravo dole, rybníček dole
    F(19.5, 21.5, 2.9); F(29, 19, 2.4); F(20, 29, 2.3); R(29.5, 28, 2.3); R(18, 25, 1.2); WA(23.5, 29.5, 1.7);
    // sever: velké jezero uprostřed, lesy kolem
    F(18, 11, 3.2); F(29, 11, 3); F(19, 3, 2.6); F(29, 4, 2.6); R(23, 14, 2); WA(24, 7, 5.2);
    // východ: ruda, skalní hřbet, žádný les (dřevo se musí dovézt)
    O(38, 22, 3); O(44, 27, 2.6); R(36, 18, 2); R(41, 18, 1.6); R(41, 21, 1.6); R(42, 24, 1.6); R(37, 29, 2.2); WA(37, 27, 1.7);
    // jih: les a jezero za řekou
    F(18, 38, 3); F(28, 40, 3.2); R(26, 37, 2); WA(22, 44, 3.2); WA(27, 46, 2.4);
    // západ: ruda a skály za řekou
    O(5, 22, 3); O(8, 28, 2.6); R(3, 18, 2.5); R(9, 24, 1.5); F(9, 19, 2.3); WA(4, 29, 2);
    // severovýchod: zlato, velké jezero a skály
    GD(41, 6, 2.5); GD(45, 11, 1.9); R(40, 10, 2); R(43, 3, 2); O(36, 13, 2.4); F(45, 5, 2.2); WA(37, 4, 4.4);
    // jihovýchod
    GD(42, 42, 2.5); GD(37, 39, 1.9); F(36, 44, 2.8); O(40, 36, 2.8); R(46, 44, 2.4); R(38, 41, 1.6); WA(44, 37, 3.4);
    // jihozápad
    GD(6, 42, 2.3); O(9, 38, 2.8); F(4, 36, 2.8); F(10, 45, 2.6); R(11, 41, 2.2); WA(4, 45, 3);
    // severozápad
    GD(5, 5, 2.3); GD(9, 10, 1.9); F(4, 12, 2.8); F(10, 3, 2.8); R(4, 9, 2.8); O(3, 3, 2.2); WA(9, 7, 3.3);
    // řeky (čím dál šířejí)
    river(true, 32, 2, 1.1, 0.4);
    river(false, 32, 3, 1.1, 1.7);
    river(true, 13, 3, 1.1, 2.6);
    // volný plácek kolem radnice
    for (let y = 18; y < 33; y++) for (let x = 18; x < 33; x++) if (Math.hypot(x - 25, y - 25) < 3.7) terrain[y * W + x] = G;
    // písek kolem vody
    const mark = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (terrain[y * W + x] !== G) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (tAt(x + dx, y + dy) === WATER) { near = true; break; }
      if (near) mark.push(y * W + x);
    }
    for (const i of mark) terrain[i] = SAND;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gIdx[y * W + x] = clamp(Math.floor((vnoise(x * 0.3, y * 0.3) * 0.75 + hash(x, y) * 0.25) * 16), 0, 15);
  }
  const waterNear = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tAt(x + dx, y + dy) === WATER) return true; return false; };

  // ---------- Stav ----------
  let stock, delivered, base, lvl, won, tut;
  let cnt = {}, capStock = 100, employed = 0, needWorkers = 0;
  let tool = null, sel = null, speed = 1, modalOpen = false, quiet = false, rot = 0;
  const fog = new Array(9).fill(1);
  const cam = { x: 0, y: 0, z: 1 };
  let fly = null;
  const popups = [], puffs = [], confetti = [];

  function newState() {
    stock = {}; delivered = {}; base = {};
    for (const k of RES_KEYS) { stock[k] = 0; delivered[k] = 0; base[k] = 0; }
    stock.wood = 42; stock.stone = 8;
    lvl = 1; won = false; tut = { on: true, step: 0 };
    grid = new Array(W * H).fill(null); blds = [];
    addB(makeB('hall', HALL_X, HALL_Y, 0));
    recalc();
  }
  const unlockedRegions = () => Math.min(9, lvl);
  const regionOpen = (x, y) => regIdxAt(x, y) < unlockedRegions();
  const size = b => B[b.type].size || 1;

  function makeB(type, x, y, dir) {
    return { type, x, y, dir: dir || 0, out: [], inv: {}, t: 0, working: false, state: 'ok', need: null, house: null,
      item: null, p: 0, inDir: 0, bridge: false, food: 0, foodT: 4, hungry: false, used: 0, buf: null, from: null, rr: 0, smokeT: Math.random() * 2, bonus: 1 };
  }
  function addB(b) {
    blds.push(b);
    const s = size(b);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) grid[(b.y + j) * W + b.x + i] = b;
  }
  function removeB(b) {
    blds.splice(blds.indexOf(b), 1);
    const s = size(b);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) grid[(b.y + j) * W + b.x + i] = null;
  }

  function recalc() {
    cnt = {};
    for (const b of blds) { cnt[b.type] = (cnt[b.type] || 0) + 1; if (b.bridge) cnt.bridge = (cnt.bridge || 0) + 1; }
    capStock = 100 + 100 * (cnt.warehouse || 0);
    const houses = blds.filter(b => b.type === 'house');
    for (const h of houses) h.used = 0;
    employed = 0; needWorkers = 0;
    for (const b of blds) {
      if (!B[b.type].work) continue;
      needWorkers++;
      let best = null, bd = 99;
      for (const h of houses) {
        if (h.used >= HOUSE_SLOTS) continue;
        const d = Math.max(Math.abs(h.x - b.x), Math.abs(h.y - b.y));
        if (d <= WORK_RANGE && d < bd) { bd = d; best = h; }
      }
      b.house = best;
      if (best) { best.used++; employed++; }
    }
    for (const b of blds) {
      if (b.type !== 'farm') continue;
      b.bonus = waterNear(b.x, b.y) ? 1.5 : 1;
    }
  }

  // ---------- Logistika ----------
  const dirFrom = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3); };
  function delivery(item, t) {
    stock[item]++; delivered[item]++;
    if (!quiet && popups.length < 24 && Math.random() < 0.6) popups.push({ x: t.x * T + T * (0.5 + Math.random() * size(t) * 0.5), y: t.y * T + T * 0.3, t: 0, icon: item });
  }
  function accept(t, item, src) {
    switch (B[t.type].kind) {
      case 'conv': {
        if (t.item) return false;
        const ed = src.type === 'conveyor' ? src.dir : dirFrom(src, t);
        if (ed === ((t.dir + 2) & 3)) return false;
        t.item = item; t.p = 0; t.inDir = ed; return true;
      }
      case 'sink':
        if (stock[item] >= capStock) return false;
        delivery(item, t); return true;
      case 'house':
        if (lvl >= FOOD_LVL && (item === 'bread' || item === 'fish') && t.food < 3) { t.food++; return true; }
        return false;
      case 'split':
        if (t.buf) return false;
        t.buf = item; t.from = src; return true;
      case 'proc': {
        const r = B[t.type].rec;
        if (r.in[item] && (t.inv[item] || 0) < r.in[item] * 2) { t.inv[item] = (t.inv[item] || 0) + 1; return true; }
        return false;
      }
    }
    return false;
  }
  function neighborsOf(b) {
    const out = [], s = size(b);
    for (let i = 0; i < s; i++) {
      out.push(cell(b.x + i, b.y - 1), cell(b.x + i, b.y + s), cell(b.x - 1, b.y + i), cell(b.x + s, b.y + i));
    }
    return out;
  }
  function pushOut(b, item) {
    const ns = neighborsOf(b);
    for (let i = 0; i < ns.length; i++) {
      const t = ns[(b.rr + i) % ns.length];
      if (!t || t === b || t === b.from) continue;
      if (accept(t, item, b)) { b.rr = (b.rr + i + 1) % ns.length; return true; }
    }
    return false;
  }
  function houseTick(b, dt) {
    if (lvl < FOOD_LVL) { b.hungry = false; return; }
    b.foodT -= dt;
    if (b.foodT <= 0) {
      if (b.food > 0) { b.food--; b.hungry = false; b.foodT = 32; } else { b.hungry = true; b.foodT = 1.5; }
    }
  }
  function craftTick(b, dt) {
    const d = B[b.type], r = d.rec;
    if (b.out.length) { if (pushOut(b, b.out[0])) b.out.shift(); }
    if (d.work && !b.house) { b.state = 'nowork'; return; }
    if (!b.working) {
      if (b.out.length >= 3) { b.state = 'blocked'; return; }
      if (r.in) {
        for (const k in r.in) if ((b.inv[k] || 0) < r.in[k]) { b.state = 'input'; b.need = k; return; }
        for (const k in r.in) b.inv[k] -= r.in[k];
      }
      b.working = true; b.t = 0;
    }
    b.state = 'ok';
    const hungry = b.house && b.house.hungry;
    b.t += dt * b.bonus * (hungry ? 0.5 : 1);
    if (b.t >= r.t) { b.out.push(r.out); b.working = false; b.t = 0; }
  }
  function update(dt) {
    for (const b of blds) {
      switch (B[b.type].kind) {
        case 'house': houseTick(b, dt); break;
        case 'conv':
          if (b.item) {
            b.p = Math.min(1, b.p + CONV_SPEED * dt);
            if (b.p >= 1) { const t = cell(b.x + DX[b.dir], b.y + DY[b.dir]); if (t && accept(t, b.item, b)) b.item = null; }
          }
          break;
        case 'split':
          if (b.buf && pushOut(b, b.buf)) { b.buf = null; b.from = null; }
          break;
        case 'prod': case 'proc': craftTick(b, dt); break;
      }
      if (!quiet) {
        const smoky = b.type === 'house' ? !b.hungry : (b.type === 'bakery' || b.type === 'forge') && b.working;
        if (smoky) { b.smokeT -= dt; if (b.smokeT <= 0) { b.smokeT = 1 + Math.random() * 0.7; if (puffs.length < 60) puffs.push({ x: b.x * T + T * (b.type === 'house' ? 0.64 : 0.6), y: b.y * T - T * 0.12, t: 0 }); } }
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.3) popups.splice(i, 1); }
    for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt; if (puffs[i].t > 1.8) puffs.splice(i, 1); }
  }

  // ---------- Stavění ----------
  const canAfford = c => Object.keys(c).every(k => stock[k] >= c[k]);
  const landOk = t => t === G || t === SAND;
  function validTile(type, x, y) {
    if (!inb(x, y) || cell(x, y)) return false;
    const t = terrain[y * W + x];
    if (type === 'conveyor') return landOk(t) || (t === WATER && lvl >= BRIDGE_LVL);
    switch (B[type].on) {
      case 'forest': return t === FOREST;
      case 'rock': return t === ROCK;
      case 'ore': return t === ORE;
      case 'gold': return t === GOLD;
      case 'build': return landOk(t);
      case 'shore': return landOk(t) && waterNear(x, y);
    }
    return false;
  }
  let lastWarn = 0;
  function warn(msg) { const n = performance.now(); if (n - lastWarn > 900) { toast(msg, 1600); lastWarn = n; } }
  function costTxt(c) { return Object.keys(c).map(k => ico(k) + c[k]).join(' '); }
  function missTxt(c) { return Object.keys(c).filter(k => stock[k] < c[k]).map(k => ico(k) + (c[k] - stock[k])).join(' '); }

  function placeConveyor(x, y, dir) {
    if (!inb(x, y)) return false;
    if (!regionOpen(x, y)) { warn('🔒 Tahle oblast je zamčená'); return false; }
    const t = terrain[y * W + x], ex = cell(x, y);
    if (ex) return false;
    const isBridge = t === WATER;
    if (isBridge && lvl < BRIDGE_LVL) { warn('🌊 Mosty se odemknou po splnění levelu ' + (BRIDGE_LVL - 1)); return false; }
    if (!isBridge && !landOk(t)) { warn(t === FOREST ? '🌲 Přes les dopravník nejde – obejdi ho' : '🪨 Přes skály dopravník nejde – obejdi je'); return false; }
    const c = isBridge ? BRIDGE_COST : B.conveyor.cost;
    if (!canAfford(c)) { warn('Chybí ti: ' + missTxt(c)); return false; }
    for (const k in c) stock[k] -= c[k];
    const b = makeB('conveyor', x, y, dir); b.bridge = isBridge;
    addB(b); recalc();
    return true;
  }
  function place(type, x, y, dir) {
    if (type === 'conveyor') return placeConveyor(x, y, dir === undefined ? rot : dir);
    const d = B[type];
    if (!inb(x, y)) return false;
    if (!regionOpen(x, y)) { warn('🔒 Tahle oblast je zamčená – splň level ' + regIdxAt(x, y)); return false; }
    if (cell(x, y)) return false;
    if (!validTile(type, x, y)) { warn(d.hint || 'Sem to nejde postavit'); return false; }
    if (!canAfford(d.cost)) { warn('Chybí ti: ' + missTxt(d.cost)); return false; }
    for (const k in d.cost) stock[k] -= d.cost[k];
    const b = makeB(type, x, y, 0);
    addB(b); recalc();
    popups.push({ x: x * T + T / 2, y: y * T + T * 0.2, t: 0, txt: '✨' });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* nic */ } }
    if (d.work && !b.house) warn('👷 Tady chybí chaloupka v dosahu ' + WORK_RANGE + ' polí');
    save();
    return true;
  }
  function demolish(b) {
    if (b.type === 'hall') return;
    const c = b.bridge ? BRIDGE_COST : B[b.type].cost;
    for (const k in c) stock[k] = Math.min(capStock, stock[k] + Math.floor(c[k] * 0.5));
    removeB(b); recalc();
    if (sel === b) sel = null;
  }

  // ---------- Hledání cesty (tutoriál + testy) ----------
  function bfsPath(sx, sy, goalFn, allowWater) {
    const prev = new Map(), q = [[sx, sy]]; prev.set(sy * W + sx, -1);
    while (q.length) {
      const [x, y] = q.shift();
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (!inb(nx, ny) || prev.has(ny * W + nx)) continue;
        const c = cell(nx, ny);
        if (c && goalFn(c)) { prev.set(ny * W + nx, y * W + x); const path = []; let k = ny * W + nx; while (k !== -1) { path.push([k % W, Math.floor(k / W)]); k = prev.get(k); } return path.reverse(); }
        if (c) continue;
        const t = terrain[ny * W + nx];
        if (!(landOk(t) || (allowWater && t === WATER))) continue;
        if (!regionOpen(nx, ny)) continue;
        prev.set(ny * W + nx, y * W + x); q.push([nx, ny]);
      }
    }
    return null;
  }

  // ---------- Úkoly / levely ----------
  function goalVal(g) { return g.k === 'dl' ? delivered[g.r] - base[g.r] : (cnt[g.b] || 0); }
  function checkGoals() {
    if (won || modalOpen) return;
    if (LEVELS[lvl - 1].goals.every(g => goalVal(g) >= g.n)) completeLevel();
  }
  function completeLevel() {
    const L = LEVELS[lvl - 1];
    tut.on = false;
    if (lvl === LEVELS.length) {
      won = true; save(); burst();
      showModal('<h2>🏆 Velký chrám stojí!</h2><p>Z malé osady se stalo prosperující údolí. Dokázal jsi propojit celou mapu.</p><p>Můžeš si dál hrát a stavět, jak chceš.</p>', [{ label: 'Hrát dál' }]);
      return;
    }
    for (const k in L.bonus) stock[k] = Math.min(capStock, stock[k] + L.bonus[k]);
    const done = lvl; lvl++;
    for (const k of RES_KEYS) base[k] = delivered[k];
    const newB = PALETTE.filter(t => UNLOCK_AT[t] === lvl && t !== 'erase');
    const ri = lvl - 1, [rx, ry] = ORDER[ri];
    const bonus = Object.keys(L.bonus).map(k => ico(k) + ' ' + L.bonus[k]).join('  ');
    burst(); save();
    let extra = '';
    if (lvl === 3) extra = '<div class="unlock">🌊 <b>Řeky:</b> Přes vodu teď postavíš most – dopravník na vodě stojí 2 prkna za pole.</div><div class="unlock">🍞 <b>Pozor:</b> chaloupky od teď jedí! Dovez do nich chléb nebo ryby dopravníkem. Hladoví dělníci pracují jen poloviční rychlostí.</div>';
    if (lvl === 4) extra = '<div class="unlock">🔥 Kovárna potřebuje <b>2 rudy a 1 dřevo</b>. Obojí musíš k ní dovézt dopravníkem. Ruda je za řekou.</div>';
    showModal(
      `<h2>⭐ Level ${done} splněn!</h2><p><b>${L.name}</b> je za tebou.</p>` +
      `<div class="unlock">🗺️ Nová oblast: <b>${REG_NAMES[ri]}</b></div>` +
      (newB.length ? `<div class="unlock">🔓 Nové: ${newB.map(t => '<b>' + B[t].n + '</b>').join(', ')}</div>` : '') + extra +
      (bonus ? `<div class="unlock">🎁 Odměna: ${bonus}</div>` : '') +
      `<p><b>Level ${lvl}: ${LEVELS[lvl - 1].name}</b></p>`,
      [{ label: 'Prozkoumat novou oblast', fn: () => flyTo((rx * RS + RS / 2) * T, (ry * RS + RS / 2) * T) }, { label: 'Dál', cls: 'sec' }]);
  }
  function burst() {
    const cols = ['#f5bd4f', '#7bd88f', '#ff8a7a', '#7ec8ff', '#f4f1e8', '#c59bff'];
    for (let i = 0; i < 90; i++) confetti.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 520, vy: -Math.random() * 520 - 120, c: cols[i % cols.length], life: 1.8 + Math.random() * 0.8, t: 0, s: 5 + Math.random() * 5 });
  }

  // ---------- Tutoriál (level 1) ----------
  const nearest = (type, fx, fy, extra) => {
    let best = null, bd = 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!validTile(type, x, y) || !regionOpen(x, y)) continue;
      if (extra && !extra(x, y)) continue;
      const d = Math.hypot(x - fx, y - fy);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  };
  const firstOf = type => blds.find(b => b.type === type);
  function tutTarget(kind) {
    if (kind === 'lumber') return nearest('lumber', HALL_X + 0.5, HALL_Y + 0.5);
    if (kind === 'quarry') return nearest('quarry', HALL_X + 0.5, HALL_Y + 0.5);
    if (kind === 'house') {
      const l = firstOf('lumber') ? [firstOf('lumber').x, firstOf('lumber').y] : nearest('lumber', HALL_X, HALL_Y);
      const q = firstOf('quarry') ? [firstOf('quarry').x, firstOf('quarry').y] : nearest('quarry', HALL_X, HALL_Y);
      const ch = (x, y, p) => !p || Math.max(Math.abs(x - p[0]), Math.abs(y - p[1])) <= WORK_RANGE - 1;
      const dh = (x, y) => Math.max(Math.abs(x - HALL_X - 0.5), Math.abs(y - HALL_Y - 0.5));
      return nearest('house', HALL_X - 1, HALL_Y + 3, (x, y) => dh(x, y) >= 3 && ch(x, y, l) && ch(x, y, q)) || nearest('house', HALL_X, HALL_Y + 3);
    }
    return null;
  }
  const TUT = [
    { text: 'Vítej v údolí! 🌿 Postavíš tu osadu a naučíš se vozit zboží dopravníky. Provedu tě krok za krokem.', btn: 'Jdeme na to' },
    { text: '👷 Dělníci bydlí v chaloupkách a pracují do 6 polí daleko. Vyber dole <b>Chaloupku</b> a klepni na zvýrazněné pole.', card: 'house', target: 'house', done: () => (cnt.house || 0) >= 1 },
    { text: '🪓 <b>Dřevorubec</b> kácí les. Vyber ho dole a klepni na zvýrazněný les.', card: 'lumber', target: 'lumber', done: () => (cnt.lumber || 0) >= 1 },
    { text: '📦 Dřevo leží u dřevorubce. Vyber dole <b>Dopravník</b> a <b>protáhni prstem</b> od dřevorubce až do Radnice po zvýrazněných polích. Pás se kreslí ve směru tažení.', card: 'conveyor', path: 'lumber', done: () => delivered.wood >= 1 },
    { text: '🔍 Dřevo teče do Radnice! Teď <b>klepni na dřevorubce</b> – ukáže, co dělá, co potřebuje a jak postupuje.', done: () => sel && sel.type === 'lumber' },
    { text: '⛏️ Totéž s kamenem: vyber <b>Lom</b> a postav ho na zvýrazněnou skálu.', card: 'quarry', target: 'quarry', done: () => (cnt.quarry || 0) >= 1 },
    { text: '➡️ Spoj lom dopravníkem s Radnicí. Začni tažení přímo na lomu.', card: 'conveyor', path: 'quarry', done: () => delivered.stone >= 1 },
    { text: '🎯 Skvěle! Nahoře vidíš <b>cíle levelu</b>. Víc dřevorubců a lomů = víc surovin. Po splnění cílů se otevře nová oblast a nové budovy.', btn: 'Rozumím' },
  ];
  let tutTgt = null, tutPathTiles = [];
  function tutTick() {
    if (!tut.on || modalOpen) return;
    if (lvl !== 1) { tut.on = false; return; }
    let step = TUT[tut.step];
    while (step && step.done && step.done()) { tut.step++; step = TUT[tut.step]; showSheet(); }
    if (!step) { tut.on = false; showSheet(); return; }
    tutTgt = null; tutPathTiles = [];
    if (step.target) tutTgt = tutTarget(step.target);
    if (step.path) {
      const b = firstOf(step.path);
      if (b) tutPathTiles = bfsPath(b.x, b.y, c => c.type === 'hall', false) || [];
    }
    refreshPalette();
  }
  function tutHTML() {
    const step = TUT[tut.step]; if (!step) return '';
    return `<div class="tut"><div class="tstep">Tutoriál · krok ${tut.step + 1}/${TUT.length}</div><div>${step.text}</div><div class="row">` +
      (step.btn ? `<button class="act ok" data-a="tnext">${step.btn}</button>` : '') + `<button class="act sec" data-a="tskip">Přeskočit tutoriál</button></div></div>`;
  }

  // ---------- Kamera ----------
  let canvas, ctx, vw = 0, vh = 0, dpr = 1, vignette = null;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
    const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
    g.addColorStop(0, 'rgba(10,20,30,0)'); g.addColorStop(1, 'rgba(10,20,30,.28)'); vignette = g;
    layoutSheet();
  }
  function clampCam() {
    const pad = 60 / cam.z;
    cam.x = clamp(cam.x, -pad, W * T - vw / cam.z + pad); cam.y = clamp(cam.y, -pad, H * T - vh / cam.z + pad);
  }
  function centerOn(wx, wy) { cam.x = wx - vw / cam.z / 2; cam.y = wy - vh / cam.z / 2; clampCam(); }
  function flyTo(wx, wy) { fly = { x: wx - vw / cam.z / 2, y: wy - vh / cam.z / 2 }; }
  function zoomAround(sx, sy, nz) {
    const wx = sx / cam.z + cam.x, wy = sy / cam.z + cam.y;
    cam.z = clamp(nz, 0.4, 2.6); cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z;
  }

  // ---------- Kreslení ----------
  function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  const GR = [];
  for (let i = 0; i < 16; i++) {
    const k = i / 15;
    GR.push(`rgb(${Math.round(104 + k * 36)},${Math.round(166 + k * 34)},${Math.round(76 + k * 20)})`);
  }
  function blobTile(x, y, pred, grow, col) {
    const R = T * 0.5, l = pred(x - 1, y), r = pred(x + 1, y), u = pred(x, y - 1), d = pred(x, y + 1);
    rrect(x * T - grow, y * T - grow, T + 2 * grow, T + 2 * grow, [(!l && !u) ? R : 0, (!r && !u) ? R : 0, (!r && !d) ? R : 0, (!l && !d) ? R : 0]);
    ctx.fillStyle = col; ctx.fill();
  }
  const isT = (...ts) => (x, y) => ts.includes(tAt(x, y));
  const pForest = isT(FOREST), pRock = isT(ROCK), pOre = isT(ORE), pGold = isT(GOLD), pSand = isT(SAND, WATER), pWater = isT(WATER);

  function drawGround(x0, y0, x1, y1, time) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { ctx.fillStyle = GR[gIdx[y * W + x]]; ctx.fillRect(x * T, y * T, T + 1, T + 1); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = terrain[y * W + x];
      if (t === FOREST) blobTile(x, y, pForest, 5, '#5a9a44');
      else if (t === ROCK) blobTile(x, y, pRock, 4, '#a49d86');
      else if (t === ORE) blobTile(x, y, pOre, 4, '#9c8466');
      else if (t === GOLD) blobTile(x, y, pGold, 4, '#b8a56d');
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = terrain[y * W + x]; if (t === SAND || t === WATER) blobTile(x, y, pSand, 3, '#eedca6'); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (terrain[y * W + x] === WATER) blobTile(x, y, pWater, 6, '#d9c590');
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (terrain[y * W + x] === WATER) blobTile(x, y, pWater, 3.5, '#e4f6ff');
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (terrain[y * W + x] === WATER) blobTile(x, y, pWater, 0.5, ((x + y) & 1) ? '#3a90d0' : '#3d94d4');
    // hloubka a třpyt vody
    ctx.fillStyle = 'rgba(20,80,150,.22)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (terrain[y * W + x] !== WATER) continue;
      if (pWater(x - 1, y) && pWater(x + 1, y) && pWater(x, y - 1) && pWater(x, y + 1)) rrect(x * T + 5, y * T + 5, T - 10, T - 10, 12), ctx.fill();
    }
    ctx.lineCap = 'round';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (terrain[y * W + x] !== WATER) continue;
      const h = hash(x + 5, y + 9), a = 0.5 + 0.5 * Math.sin(time * 0.9 + h * 12);
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + a * 0.4})`; ctx.lineWidth = 2;
      const px = x * T + 8 + h * 18, py = y * T + 10 + hash(x, y + 3) * 26;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 2.5, px + 12, py); ctx.stroke();
    }
    // tráva: chomáčky a květy
    ctx.strokeStyle = 'rgba(52,120,58,.55)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (terrain[y * W + x] !== G) continue;
      const h = hash(x + 11, y + 5);
      if (h > 0.55) {
        const gx = x * T + 8 + hash(x, y) * 26, gy = y * T + 18 + h * 20;
        ctx.moveTo(gx, gy); ctx.lineTo(gx - 2.5, gy - 7); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 4, gy - 8); ctx.moveTo(gx + 6, gy); ctx.lineTo(gx + 9, gy - 6);
      }
    }
    ctx.stroke();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (terrain[y * W + x] !== G || hash(x + 2, y + 9) < 0.94) continue;
      const h = hash(x, y), fx = x * T + 10 + hash(y, x) * 28, fy = y * T + 10 + h * 28;
      ctx.fillStyle = ['#fff6d6', '#ffd95e', '#ff9ab5', '#c6a8ff'][(h * 4) | 0]; ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(fx, fy, 1.2, 0, 6.3); ctx.fill();
    }
  }

  // --- dopravníky ---
  function belt(b) {
    const cx = b.x * T + T / 2, cy = b.y * T + T / 2, h = T / 2, paths = [];
    let any = false;
    for (let d = 0; d < 4; d++) {
      const n = cell(b.x - DX[d], b.y - DY[d]);
      if (n && n.type === 'conveyor' && n.dir === d && !(d === ((b.dir + 2) & 3))) { paths.push(d); any = true; }
    }
    if (!any) paths.push(b.dir);
    return { cx, cy, h, ins: paths };
  }
  function drawBelts(x0, y0, x1, y1, time) {
    const list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const b = grid[y * W + x]; if (b && b.type === 'conveyor') list.push(b); }
    if (!list.length) return;
    // mosty – prkna pod pásem
    for (const b of list) if (b.bridge) {
      const px = b.x * T, py = b.y * T, horiz = b.dir === 0 || b.dir === 2;
      ctx.fillStyle = 'rgba(10,40,70,.35)'; rrect(px + 3, py + 6, T - 4, T - 4, 6); ctx.fill();
      ctx.fillStyle = '#b4854f'; rrect(px + 1, py + 1, T - 2, T - 2, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,15,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 6; k < T; k += 8) { if (horiz) { ctx.moveTo(px + k, py + 1); ctx.lineTo(px + k, py + T - 1); } else { ctx.moveTo(px + 1, py + k); ctx.lineTo(px + T - 1, py + k); } }
      ctx.stroke();
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 3; ctx.beginPath();
      if (horiz) { ctx.moveTo(px, py + 2); ctx.lineTo(px + T, py + 2); ctx.moveTo(px, py + T - 2); ctx.lineTo(px + T, py + T - 2); } else { ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py + T); ctx.moveTo(px + T - 2, py); ctx.lineTo(px + T - 2, py + T); }
      ctx.stroke();
    }
    const geo = list.map(belt);
    const passes = [[T * 0.66, '#3e2c1d', null], [T * 0.56, '#a97c48', null], [T * 0.38, '#5b4330', null], [T * 0.38, 'rgba(255,232,170,.42)', [5, 11]]];
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    for (const [w, col, dash] of passes) {
      ctx.beginPath();
      for (let i = 0; i < list.length; i++) {
        const b = list[i], g = geo[i];
        for (const d of g.ins) {
          ctx.moveTo(g.cx - DX[d] * g.h, g.cy - DY[d] * g.h); ctx.lineTo(g.cx, g.cy); ctx.lineTo(g.cx + DX[b.dir] * g.h, g.cy + DY[b.dir] * g.h);
        }
      }
      ctx.lineWidth = w; ctx.strokeStyle = col;
      if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = -time * 26; }
      ctx.stroke();
      if (dash) ctx.setLineDash([]);
    }
    // šipky
    ctx.fillStyle = 'rgba(255,240,200,.75)';
    for (const b of list) {
      const cx = b.x * T + T / 2, cy = b.y * T + T / 2, dx = DX[b.dir], dy = DY[b.dir];
      ctx.beginPath(); ctx.moveTo(cx + dx * 6, cy + dy * 6); ctx.lineTo(cx - dx * 4 - dy * 5, cy - dy * 4 + dx * 5); ctx.lineTo(cx - dx * 4 + dy * 5, cy - dy * 4 - dx * 5); ctx.closePath(); ctx.fill();
    }
    // zboží na pásech
    for (const b of list) {
      if (!b.item) continue;
      const cx = b.x * T + T / 2, cy = b.y * T + T / 2, ex = cx - DX[b.inDir] * T / 2, ey = cy - DY[b.inDir] * T / 2, ox = cx + DX[b.dir] * T / 2, oy = cy + DY[b.dir] * T / 2;
      let px, py;
      if (b.p < 0.5) { const k = b.p * 2; px = ex + (cx - ex) * k; py = ey + (cy - ey) * k; } else { const k = (b.p - 0.5) * 2; px = cx + (ox - cx) * k; py = cy + (oy - cy) * k; }
      ctx.fillStyle = 'rgba(30,20,10,.28)'; ctx.beginPath(); ctx.ellipse(px + 1, py + 4, 8, 4, 0, 0, 6.3); ctx.fill();
      A.blit(ctx, A.icon[b.item], px, py - 1, 0.62);
    }
  }

  // --- rekvizity a budovy ---
  const BADGE = { nowork: '🏠', blocked: '📦' };
  function bubble(cx, cy, kind, b) {
    const bob = Math.sin(performance.now() / 260) * 2;
    ctx.fillStyle = 'rgba(28,24,30,.86)'; rrect(cx - 18, cy - 13 + bob, 36, 26, 10); ctx.fill();
    ctx.strokeStyle = kind === 'warn' ? '#ffd166' : '#ff8a7a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + 12 + bob); ctx.lineTo(cx, cy + 18 + bob); ctx.lineTo(cx + 5, cy + 12 + bob); ctx.fillStyle = 'rgba(28,24,30,.86)'; ctx.fill();
    if (b.state === 'input') { A.blit(ctx, A.icon[b.need], cx - 7, cy + bob, 0.55); ctx.font = '800 15px sans-serif'; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx + 8, cy + bob + 1); }
    else if (b.state === 'nowork') { ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('🏠', cx - 6, cy + bob + 1); ctx.font = '800 15px sans-serif'; ctx.fillStyle = '#ff8a7a'; ctx.fillText('?', cx + 9, cy + bob + 1); }
    else if (b.state === 'blocked') { ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('📦', cx - 5, cy + bob + 1); ctx.font = '800 15px sans-serif'; ctx.fillStyle = '#ff8a7a'; ctx.fillText('!', cx + 9, cy + bob + 1); }
    else if (kind === 'hungry') { A.blit(ctx, A.icon.bread, cx - 7, cy + bob, 0.55); ctx.font = '800 15px sans-serif'; ctx.fillStyle = '#ff8a7a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cx + 9, cy + bob + 1); }
  }
  function drawProps(x, y, time, b) {
    const t = terrain[y * W + x], px = x * T, py = y * T;
    if (t === FOREST) {
      if (b) {
        A.blit(ctx, A.tree[(hash(x, y) * 3 | 0) * 2], px + 5, py + T - 2, 0.62);
        A.blit(ctx, A.tree[(hash(y, x) * 3 | 0) * 2 + 1], px + T - 5, py + T - 1, 0.62);
      } else {
        const P = [[0.26, 0.58], [0.74, 0.52], [0.5, 0.96]];
        for (let i = 0; i < 3; i++) {
          const h = hash(x * 3 + i, y * 7 + i), v = (h * 3) | 0, k = hash(x + i, y * 2 + i) > 0.45 ? 0 : 1;
          const s = 0.72 + h * 0.18;
          A.blit(ctx, A.tree[v * 2 + k], px + (P[i][0] + (h - 0.5) * 0.12) * T, py + P[i][1] * T + T * 0.12, s);
        }
      }
    } else if (t === ROCK || t === ORE || t === GOLD) {
      if (b) return;
      const kind = t === ROCK ? 'rock' : t === ORE ? 'ore' : 'gold';
      const P = [[0.3, 0.7], [0.72, 0.6]];
      for (let i = 0; i < 2; i++) {
        const h = hash(x * 5 + i, y * 3 + 1), v = (h * 3) | 0;
        A.blit(ctx, A.rock[kind][v], px + (P[i][0] + (h - 0.5) * 0.18) * T, py + (P[i][1] + (hash(y, x + i) - 0.5) * 0.12) * T, 0.78 + h * 0.2);
      }
      if (kind === 'gold') {
        const a = 0.5 + 0.5 * Math.sin(time * 2.4 + x * 2 + y);
        ctx.strokeStyle = `rgba(255,247,190,${a})`; ctx.lineWidth = 1.4;
        const sx = px + 12 + hash(x, y) * 22, sy = py + 12 + hash(y, x) * 18;
        ctx.beginPath(); ctx.moveTo(sx - 4 * a, sy); ctx.lineTo(sx + 4 * a, sy); ctx.moveTo(sx, sy - 4 * a); ctx.lineTo(sx, sy + 4 * a); ctx.stroke();
      }
    }
  }
  function drawBuilding(b, time) {
    const s = size(b), d = B[b.type], cx = b.x * T + s * T / 2, by = (b.y + s) * T;
    const sp = A.bld[b.type];
    if (!sp) return;
    A.blit(ctx, sp, cx, by);
    const prog = b.working ? b.t / d.rec.t : 0;
    A.overlay(ctx, b.type, cx, by, { time, working: b.working, progress: prog });
    const top = by - (sp.ay - 0) * 0.5 - 6;
    if (d.rec) {
      const ty = b.y * T - 4;
      if (b.state === 'nowork') bubble(cx, ty - 14, 'bad', b);
      else if (!b.working && (b.state === 'input')) bubble(cx, ty - 14, 'warn', b);
      else if (!b.working && b.state === 'blocked') bubble(cx, ty - 14, 'bad', b);
      else if (b.working && b.type !== 'farm') {
        ctx.fillStyle = 'rgba(0,0,0,.5)'; rrect(cx - 15, ty - 2, 30, 7, 3.5); ctx.fill();
        ctx.fillStyle = '#ffd166'; rrect(cx - 15, ty - 2, Math.max(5, 30 * clampP(prog)), 7, 3.5); ctx.fill();
      }
    } else if (b.type === 'house' && b.hungry) bubble(cx, b.y * T - 18, 'hungry', b);
    if (b.type === 'splitter' && b.buf) A.blit(ctx, A.icon[b.buf], cx, by - 14, 0.6);
    void top;
  }
  const clampP = p => clamp(p, 0, 1);

  function drawFog(time) {
    for (let i = 0; i < 9; i++) {
      const f = fog[i];
      if (f < 0.01) continue;
      const [rx, ry] = ORDER[i], x0 = rx * RS * T, y0 = ry * RS * T, S = RS * T;
      if (x0 + S < cam.x || y0 + S < cam.y || x0 > cam.x + vw / cam.z || y0 > cam.y + vh / cam.z) continue;
      ctx.fillStyle = `rgba(24,40,66,${0.66 * f})`; ctx.fillRect(x0, y0, S, S);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
      for (let k = 0; k < 12; k++) {
        // mraky se jen velmi pomalu houpají na místě
        const ph = hash(i, k) * 6.28, cxp = x0 + hash(i * 3 + k, 7) * S + Math.sin(time * 0.045 + ph) * 22;
        const cyp = y0 + hash(k, i + 9) * S + Math.cos(time * 0.037 + ph) * 12, r = T * (1.4 + hash(i + k, k) * 1.4);
        ctx.fillStyle = `rgba(226,236,248,${0.13 * f})`;
        ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(cxp + r * 0.75, cyp + r * 0.12, r * 0.7, 0, 6.3); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = f;
      ctx.font = `${T * 1.1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText('🔒', x0 + S / 2, y0 + S / 2 - T * 0.5);
      ctx.font = `800 ${T * 0.42}px sans-serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,20,34,.85)';
      ctx.strokeText(REG_NAMES[i], x0 + S / 2, y0 + S / 2 + T * 0.35); ctx.fillText(REG_NAMES[i], x0 + S / 2, y0 + S / 2 + T * 0.35);
      ctx.font = `700 ${T * 0.34}px sans-serif`;
      const label = 'Splň level ' + i;
      ctx.strokeText(label, x0 + S / 2, y0 + S / 2 + T * 0.85); ctx.fillText(label, x0 + S / 2, y0 + S / 2 + T * 0.85);
      ctx.globalAlpha = 1;
    }
  }

  function drawOverlays(x0, y0, x1, y1, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    // platná pole pro vybranou budovu
    if (tool && tool !== 'erase' && tool !== 'conveyor') {
      ctx.fillStyle = `rgba(255,250,150,${0.16 + pulse * 0.12})`; ctx.strokeStyle = 'rgba(255,255,210,.6)'; ctx.lineWidth = 1.5;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (regionOpen(x, y) && validTile(tool, x, y)) { rrect(x * T + 3, y * T + 3, T - 6, T - 6, 8); ctx.fill(); ctx.stroke(); }
      }
    }
    // tutoriál
    if (tut.on) {
      if (tutTgt) {
        const [tx, ty] = tutTgt, cx = tx * T + T / 2, cy = ty * T + T / 2;
        ctx.strokeStyle = `rgba(255,224,110,${0.7 + pulse * 0.3})`; ctx.lineWidth = 4; rrect(tx * T + 2, ty * T + 2, T - 4, T - 4, 10); ctx.stroke();
        ctx.fillStyle = `rgba(255,224,110,${0.25 + pulse * 0.2})`; ctx.fill();
        ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
        ctx.fillText('👇', cx, cy - T * 0.8 - pulse * 8);
      }
      if (tutPathTiles.length) {
        for (let i = 1; i < tutPathTiles.length; i++) {
          const [tx, ty] = tutPathTiles[i], last = i === tutPathTiles.length - 1;
          const pd = tutPathTiles[i - 1];
          const d = dirFrom({ x: pd[0], y: pd[1] }, { x: tx, y: ty });
          const cx = tx * T + T / 2, cy = ty * T + T / 2;
          if (!last) { ctx.fillStyle = `rgba(255,224,110,${0.4 + pulse * 0.3})`; rrect(tx * T + 6, ty * T + 6, T - 12, T - 12, 8); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,255,255,.95)';
          ctx.beginPath(); ctx.moveTo(cx + DX[d] * 9, cy + DY[d] * 9); ctx.lineTo(cx - DX[d] * 5 - DY[d] * 7, cy - DY[d] * 5 + DX[d] * 7); ctx.lineTo(cx - DX[d] * 5 + DY[d] * 7, cy - DY[d] * 5 - DX[d] * 7); ctx.closePath(); ctx.fill();
        }
      }
    }
    // vybraná budova: dosah chaloupek, vazby
    if (sel) {
      const s = size(sel);
      if (sel.type === 'house') {
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
        const rx = (sel.x - WORK_RANGE) * T, ry = (sel.y - WORK_RANGE) * T, rw = (WORK_RANGE * 2 + 1) * T;
        ctx.fillRect(rx, ry, rw, rw); ctx.strokeRect(rx, ry, rw, rw); ctx.setLineDash([]);
        for (const b of blds) if (b.house === sel) { ctx.strokeStyle = 'rgba(123,216,143,.95)'; ctx.lineWidth = 3; rrect(b.x * T + 2, b.y * T + 2, T - 4, T - 4, 8); ctx.stroke(); }
      } else if (sel.house) {
        ctx.strokeStyle = 'rgba(123,216,143,.9)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(sel.x * T + T / 2, sel.y * T + T / 2); ctx.lineTo(sel.house.x * T + T / 2, sel.house.y * T + T / 2); ctx.stroke(); ctx.setLineDash([]);
        rrect(sel.house.x * T + 2, sel.house.y * T + 2, T - 4, T - 4, 8); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.4})`; ctx.lineWidth = 3; rrect(sel.x * T + 2, sel.y * T + 2, s * T - 4, s * T - 4, 10); ctx.stroke();
    }
  }

  function draw(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2d7fb8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(W - 1, Math.ceil((cam.x + vw / cam.z) / T)), y1 = Math.min(H - 1, Math.ceil((cam.y + vh / cam.z) / T));
    ctx.fillStyle = '#e9d8a2'; rrect(-14, -14, W * T + 28, H * T + 28, 40); ctx.fill();
    drawGround(x0, y0, x1, y1, time);
    drawBelts(x0, y0, x1, y1, time);
    drawOverlays(x0, y0, x1, y1, time);
    for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) {
      for (let x = x0; x <= x1; x++) {
        const b = grid[y * W + x];
        drawProps(x, y, time, b);
        if (b && b.type !== 'conveyor' && b.x === x && b.y + size(b) - 1 === y) drawBuilding(b, time);
      }
    }
    for (const p of puffs) {
      const k = p.t / 1.8;
      ctx.fillStyle = `rgba(250,250,250,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(p.x + k * 10 + Math.sin(p.t * 2.5) * 3, p.y - k * T * 0.9, 3 + k * 8, 0, 6.3); ctx.fill();
    }
    for (const p of popups) {
      const k = p.t / 1.3;
      ctx.globalAlpha = 1 - k * k;
      const yy = p.y - k * T * 0.8;
      if (p.icon) A.blit(ctx, A.icon[p.icon], p.x, yy, 0.7);
      else { ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(p.txt, p.x, yy); }
      ctx.globalAlpha = 1;
    }
    drawFog(time);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, vw, vh);
    for (const c of confetti) { ctx.globalAlpha = clamp(c.life - c.t, 0, 1); ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, c.s, c.s * 0.6); }
    ctx.globalAlpha = 1;
  }

  // ---------- UI ----------
  const resEl = $('res'), lvlHead = $('lvlHead'), goalsEl = $('goals'), levelCard = $('levelCard'), sheet = $('sheet'), palette = $('palette'), popEl = $('pop');
  let toastTimer = 0;
  function toast(msg, ms) {
    const el = $('toast'); el.innerHTML = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2000);
  }
  function showModal(html, buttons) {
    modalOpen = true;
    const box = $('modalBox'); box.innerHTML = html + '<div class="btns"></div>';
    const wrap = box.querySelector('.btns');
    for (const bt of buttons) {
      const el = document.createElement('button'); el.textContent = bt.label; if (bt.cls) el.className = bt.cls;
      el.onclick = () => { $('modal').classList.remove('show'); modalOpen = false; if (bt.fn) bt.fn(); };
      wrap.appendChild(el);
    }
    $('modal').classList.add('show');
  }

  function updateHUD() {
    let html = '';
    for (const k of RES_KEYS) {
      if (!stock[k] && !delivered[k]) continue;
      html += `<span class="pill${stock[k] >= capStock ? ' full' : ''}">${ico(k)} ${stock[k]}</span>`;
    }
    html += `<span class="pill${needWorkers > employed ? ' bad' : ''}" title="Pracovníci">👷 ${employed}/${needWorkers}</span>`;
    html += `<span class="pill"><small>max</small> ${capStock}</span>`;
    resEl.innerHTML = html;
    const L = LEVELS[Math.min(lvl, LEVELS.length) - 1];
    lvlHead.innerHTML = `<span class="star">⭐</span> Level ${lvl}: ${L.name}${won ? ' ✅' : ''}<span class="chev">${levelCard.classList.contains('collapsed') ? '▼' : '▲'}</span>`;
    goalsEl.innerHTML = L.goals.map(g => {
      const v = Math.min(goalVal(g), g.n), pct = Math.round(v / g.n * 100);
      const em = g.k === 'dl' ? ico(g.r) : g.b === 'bridge' ? '🌉' : `<img class="ic" src="${A.thumbs[g.b]}" alt="">`;
      const lab = g.k === 'dl' ? 'dodej' : 'postav';
      return `<span class="goal${v >= g.n ? ' done' : ''}"><i class="fill" style="width:${pct}%"></i><span>${v >= g.n ? '✓' : ''} ${lab} ${em} ${v}/${g.n}</span></span>`;
    }).join('');
    refreshPalette();
  }

  const cards = {};
  function buildPalette() {
    palette.innerHTML = '';
    for (const t of PALETTE) {
      const el = document.createElement('button');
      el.className = 'card'; el.dataset.t = t;
      const nm = t === 'erase' ? 'Bourat' : B[t].n;
      el.innerHTML = `<img class="th" src="${A.thumbs[t]}" alt=""><span class="nm">${nm}</span><span class="cs"></span>`;
      el.onclick = () => {
        if (lvl < UNLOCK_AT[t]) { toast(`🔒 ${nm} se odemkne po splnění levelu ${UNLOCK_AT[t] - 1}`); return; }
        sel = null; tool = tool === t ? null : t;
        refreshPalette(); showSheet();
      };
      palette.appendChild(el); cards[t] = el;
    }
  }
  let lastPal = '';
  function refreshPalette() {
    const hintCard = tut.on && TUT[tut.step] ? TUT[tut.step].card : null;
    for (const t of PALETTE) {
      const el = cards[t], locked = lvl < UNLOCK_AT[t];
      el.classList.toggle('locked', locked);
      el.classList.toggle('sel', tool === t);
      el.classList.toggle('hint', hintCard === t && tool !== t);
      el.classList.toggle('poor', !locked && t !== 'erase' && !canAfford(t === 'conveyor' ? B.conveyor.cost : B[t].cost));
      const cs = locked ? '🔒 Lv ' + (UNLOCK_AT[t] - 1) : t === 'erase' ? 'vrátí ½' : t === 'conveyor' ? ico('wood') + '1' + (lvl >= BRIDGE_LVL ? ' · most ' + ico('plank') + '2' : '') : costTxt(B[t].cost);
      const key = t + cs; if (el.dataset.k !== key) { el.dataset.k = key; el.querySelector('.cs').innerHTML = cs; }
    }
  }
  function layoutSheet() { sheet.style.bottom = (palette.offsetHeight + 8) + 'px'; }
  let lastSheet = '';
  function setSheet(html) { if (html !== lastSheet) { sheet.innerHTML = html; lastSheet = html; } sheet.classList.add('show'); layoutSheet(); }
  function showSheet() {
    if (tut.on && TUT[tut.step]) { setSheet(tutHTML()); return; }
    if (tool === 'erase') { setSheet('<h3>🗑 Bourání<button class="x" data-a="close">✕</button></h3><div>Klepej nebo táhni prstem přes budovy a dopravníky. Vrátí se polovina ceny.</div>'); return; }
    if (tool === 'conveyor') {
      setSheet(`<h3><img class="ic" src="${A.thumbs.conveyor}" alt=""> Dopravník<button class="x" data-a="close">✕</button></h3><div>Táhni prstem po mapě – pás se kreslí ve směru tažení. <b>Začni tažení na budově</b> a skonči na další, aby pás mířil dovnitř. Klepnutím na pás ho otočíš.</div><div class="muted">Přes les a skály to nejde – obejdi je.${lvl >= BRIDGE_LVL ? ' Na vodě se postaví most (' + costTxt(BRIDGE_COST) + ' za pole).' : ''}</div>`);
      return;
    }
    if (tool) {
      const d = B[tool];
      setSheet(`<h3><img class="ic" src="${A.thumbs[tool]}" alt=""> ${d.n}<button class="x" data-a="close">✕</button></h3><div>${d.desc}</div><div class="muted">${d.hint || ''}${d.work ? ' · potřebuje 1 pracovníka' : ''}</div><div style="margin-top:6px">${costChips(d.cost)}</div>`);
      return;
    }
    sheet.classList.remove('show');
  }
  const costChips = c => Object.keys(c).map(k => `<span class="chip${stock[k] < c[k] ? ' poor' : ''}">${ico(k)} ${c[k]}</span>`).join('');

  sheet.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const act = a.dataset.a;
    if (act === 'close') { tool = null; refreshPalette(); showSheet(); }
    if (act === 'tnext') { tut.step++; tutTick(); showSheet(); save(); }
    if (act === 'tskip') { tut.on = false; refreshPalette(); showSheet(); toast('Tutoriál přeskočen. Cíle levelu vidíš nahoře.', 2400); save(); }
  });
  levelCard.addEventListener('click', () => { levelCard.classList.toggle('collapsed'); updateHUD(); });

  // ---------- Okénko u budovy ----------
  let popKey = '', popB = null, popFill = null;
  function status(b) {
    const d = B[b.type], r = d.rec;
    if (!r) return null;
    if (d.work && !b.house) return { t: '❌ Nemá pracovníka – postav chaloupku do ' + WORK_RANGE + ' polí', c: 'bad' };
    if (b.state === 'blocked') return { t: '📦 Výstup je plný – napoj dopravník na další budovu nebo sklad', c: 'bad' };
    if (b.state === 'input') {
      const miss = Object.keys(r.in).filter(k => (b.inv[k] || 0) < r.in[k]).map(k => RES[k].n).join(', ');
      return { t: '⏳ Čeká na: ' + miss + ' – přiveď dopravník', c: 'warn' };
    }
    if (b.working) return { t: '⚙️ Pracuje' + (b.house && b.house.hungry ? ' (hladoví – poloviční rychlost)' : '') + (b.bonus > 1 ? ' · ⚡ u vody ×1.5' : ''), c: 'ok' };
    return { t: '💤 Čeká', c: '' };
  }
  function popHTML(b) {
    const d = B[b.type], r = d.rec;
    const name = b.type === 'conveyor' ? (b.bridge ? 'Most' : 'Dopravník') : d.n;
    const thumb = b.type === 'conveyor' ? A.thumbs.conveyor : A.thumbs[b.type];
    let h = `<div class="ph"><img class="th" src="${thumb}" alt=""><b>${name}</b><button class="x" data-a="pclose">✕</button></div>`;
    h += `<div class="pd">${b.type === 'conveyor' ? 'Veze zboží ve směru šipky.' : d.desc}</div>`;
    if (r) {
      const ins = r.in ? Object.keys(r.in).map(k => `<span class="fi">${ico(k)} <b>${b.inv[k] || 0}/${r.in[k]}</b></span>`).join(' + ') : '<span class="fi">⛏ žádné vstupy</span>';
      h += `<div class="pflow">${ins}<span class="arrow">➜</span><span class="fi">${ico(r.out)} <b>×1</b></span><span class="muted">za ${(r.t / b.bonus).toFixed(1)} s</span></div>`;
      h += `<div class="pb"><i id="pbfill"></i></div>`;
      const st = status(b); if (st) h += `<div class="pstat ${st.c}">${st.t}</div>`;
      if (b.out.length) h += `<div class="muted">Hotové čeká: ${b.out.map(k => ico(k)).join('')}</div>`;
      if (d.work && b.house) h += `<div class="muted">👷 Pracuje z chaloupky (${Math.max(Math.abs(b.house.x - b.x), Math.abs(b.house.y - b.y))} polí)</div>`;
    } else if (b.type === 'house') {
      h += `<div class="pflow"><span class="fi">👷 <b>${b.used}/${HOUSE_SLOTS}</b> dělníků</span>` + (lvl >= FOOD_LVL ? `<span class="fi">${ico('bread')}${ico('fish')} <b>${b.food}/3</b></span>` : '') + '</div>';
      h += lvl >= FOOD_LVL ? `<div class="pstat ${b.hungry ? 'bad' : 'ok'}">${b.hungry ? '😟 Hladoví! Dovez chléb nebo ryby – dělníci pracují pomalu' : '😊 Sytí. Jí 1 jídlo za 30 s'}</div>` : '<div class="muted">Dosah: 6 polí (zvýrazněno na mapě)</div>';
    } else if (B[b.type].kind === 'sink') {
      h += `<div class="pstat ok">Zásoby: ${RES_KEYS.filter(k => stock[k]).map(k => ico(k) + ' ' + stock[k]).join('  ') || 'prázdné'}</div><div class="muted">Kapacita každé suroviny: ${capStock}</div>`;
    } else if (b.type === 'conveyor') {
      const t = cell(b.x + DX[b.dir], b.y + DY[b.dir]);
      h += `<div class="pflow"><span class="fi">${b.item ? ico(b.item) + ' veze' : 'prázdný'}</span><span class="arrow">➜</span><span class="fi">${t ? (t.type === 'conveyor' ? 'další pás' : B[t.type].n) : '❌ nic'}</span></div>`;
      if (!t) h += '<div class="pstat bad">Pás nikam nevede – natoč ho k budově</div>';
      else if (b.item && b.p >= 1) h += `<div class="pstat warn">⏳ Čeká, až příjemce ${RES[b.item].n.toLowerCase()} převezme</div>`;
    } else if (b.type === 'splitter') {
      h += `<div class="pstat ${b.buf ? 'warn' : ''}">${b.buf ? 'Drží: ' + RES[b.buf].n : 'Čeká na zboží'}</div>`;
    }
    h += '<div class="pbtns">' + (b.type === 'conveyor' ? '<button class="act sec" data-a="protate">🔄 Otočit</button>' : '') + (b.type !== 'hall' ? '<button class="act" data-a="pdemo">🗑 Zbourat</button>' : '') + '</div>';
    return h;
  }
  function updatePopup() {
    if (!sel) { popEl.classList.remove('show'); popB = null; return; }
    const html = popHTML(sel);
    if (html !== popKey || popB !== sel) { popEl.innerHTML = html + '<div class="tail"></div>'; popKey = html; popB = sel; popFill = $('pbfill'); }
    popEl.classList.add('show');
    if (popFill && sel.working) popFill.style.width = Math.round(clampP(sel.t / B[sel.type].rec.t) * 100) + '%'; else if (popFill) popFill.style.width = '0%';
    // pozice
    const s = size(sel), z = cam.z;
    const sx = ((sel.x + s / 2) * T - cam.x) * z, sTop = (sel.y * T - cam.y) * z - (sel.type === 'hall' ? 50 : 24) * z, sBot = ((sel.y + s) * T - cam.y) * z;
    const w = popEl.offsetWidth, h = popEl.offsetHeight;
    let left = clamp(sx - w / 2, 8, vw - w - 8), top = sTop - h - 12, below = false;
    if (top < 150) { top = sBot + 14; below = true; }
    const maxTop = vh - palette.offsetHeight - h - 8;
    if (top > maxTop) top = maxTop;
    popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
    popEl.classList.toggle('below', below);
    const tail = popEl.querySelector('.tail'); if (tail) tail.style.left = clamp(sx - left, 18, w - 18) + 'px';
  }
  popEl.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a || !sel) return;
    if (a.dataset.a === 'pclose') { sel = null; updatePopup(); }
    if (a.dataset.a === 'pdemo') { demolish(sel); sel = null; updatePopup(); updateHUD(); save(); }
    if (a.dataset.a === 'protate') { sel.dir = (sel.dir + 1) & 3; rot = sel.dir; }
  });

  function helpHTML() {
    return '<h2>🌿 Zelené Údolí</h2>' +
      '<p>Vybuduj z malé osady prosperující údolí. Splňuj <b>levely</b> – každý odemkne <b>novou oblast</b> z mlhy a <b>nové budovy</b>.</p>' +
      '<p>🚚 Budovy samy zboží nepřenášejí: vyráběj <b>dopravníky</b> (táhni prstem) a vozi suroviny do Radnice nebo do dalších budov. Víc surovin = musíš je dovézt na jedno místo.</p>' +
      '<p>🏠 Dělníci bydlí v chaloupkách do 6 polí od práce. Přes řeky vedou <b>mosty</b>, lesy a skály musíš obejít. Klepnutím na budovu vidíš, co dělá a co jí chybí.</p>';
  }
  function showMenu() {
    showModal(helpHTML(), [
      { label: 'Hrát' },
      { label: 'Nová hra', cls: 'danger', fn: () => setTimeout(() => showModal('<h2>Začít znovu?</h2><p>Celý postup se smaže.</p>', [
        { label: 'Zpět', cls: 'sec' }, { label: 'Smazat vše', cls: 'danger', fn: () => { newState(); initFog(true); tool = null; sel = null; startCam(); save(); updateHUD(); tutTick(); showSheet(); } }]), 50) },
    ]);
  }

  // ---------- Vstup ----------
  const ptrs = new Map();
  let pinch = null, downInfo = null, moved = 0, painting = false, lastTile = null;
  const toTile = (sx, sy) => [Math.floor((sx / cam.z + cam.x) / T), Math.floor((sy / cam.z + cam.y) / T)];
  function pinchState() {
    const p = [...ptrs.values()];
    return { cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 };
  }
  function eraseAt(x, y) {
    const b = cell(x, y);
    if (b && b.type !== 'hall') { demolish(b); updateHUD(); }
  }
  function paintStep(tx, ty) {
    if (!inb(tx, ty)) return;
    if (tool === 'erase') { eraseAt(tx, ty); lastTile = [tx, ty]; return; }
    // dopravník
    if (!lastTile) {
      const c = cell(tx, ty);
      if (!c) { if (!placeConveyor(tx, ty, rot)) return; }
      lastTile = [tx, ty]; return;
    }
    let [lx, ly] = lastTile, guard = 0;
    while ((lx !== tx || ly !== ty) && guard++ < 200) {
      const ddx = tx - lx, ddy = ty - ly;
      const d = Math.abs(ddx) >= Math.abs(ddy) ? (ddx > 0 ? 0 : 2) : (ddy > 0 ? 1 : 3);
      const nx = lx + DX[d], ny = ly + DY[d];
      const prev = cell(lx, ly);
      if (prev && prev.type === 'conveyor') prev.dir = d;
      rot = d;
      const t = cell(nx, ny);
      if (!t) { if (!placeConveyor(nx, ny, d)) { lastTile = null; return; } }
      else if (t.type === 'conveyor') t.dir = d;
      lx = nx; ly = ny;
    }
    lastTile = [tx, ty];
  }
  function onTap(sx, sy) {
    const [tx, ty] = toTile(sx, sy);
    if (!inb(tx, ty)) return;
    const b = cell(tx, ty);
    if (tool === 'conveyor' && b && b.type === 'conveyor') { b.dir = (b.dir + 1) & 3; rot = b.dir; return; }
    if (b && tool !== 'erase') { tool = null; sel = b; refreshPalette(); showSheet(); return; }
    if (tool && tool !== 'erase' && tool !== 'conveyor') { if (place(tool, tx, ty)) { updateHUD(); showSheet(); } return; }
    if (!regionOpen(tx, ty)) { toast('🔒 ' + REG_NAMES[regIdxAt(tx, ty)] + ' – splň level ' + regIdxAt(tx, ty)); return; }
    sel = null;
  }
  function initInput() {
    canvas.addEventListener('pointerdown', e => {
      fly = null; canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        downInfo = { t: performance.now() }; moved = 0;
        if (tool === 'conveyor' || tool === 'erase') { painting = true; lastTile = null; const [tx, ty] = toTile(e.clientX, e.clientY); paintStep(tx, ty); }
      } else if (ptrs.size === 2) { painting = false; pinch = pinchState(); downInfo = null; }
    });
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size >= 2 && pinch) {
        const s = pinchState();
        const wx = pinch.cx / cam.z + cam.x, wy = pinch.cy / cam.z + cam.y;
        cam.z = clamp(cam.z * s.dist / pinch.dist, 0.4, 2.6); cam.x = wx - s.cx / cam.z; cam.y = wy - s.cy / cam.z;
        pinch = s; clampCam(); return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (painting) { const [tx, ty] = toTile(e.clientX, e.clientY); if (!lastTile || tx !== lastTile[0] || ty !== lastTile[1]) paintStep(tx, ty); }
      else if (moved > 6) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }
    });
    const end = e => {
      if (!ptrs.has(e.pointerId)) return;
      const last = ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (last) {
        if (downInfo && moved < 10 && performance.now() - downInfo.t < 700 && e.type === 'pointerup') onTap(e.clientX, e.clientY);
        if (painting) { updateHUD(); save(); }
        painting = false; lastTile = null; downInfo = null;
      }
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { e.preventDefault(); fly = null; zoomAround(e.clientX, e.clientY, cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); clampCam(); }, { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());
    $('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = '⏩ ' + speed + '×'; };
    $('menuBtn').onclick = showMenu;
    window.addEventListener('resize', () => { resize(); clampCam(); });
  }

  // ---------- Ukládání ----------
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ lvl, stock, delivered, base, won, tut, t: Date.now(), b: blds.filter(b => b.type !== 'hall').map(b => [b.type, b.x, b.y, b.dir, b.bridge ? 1 : 0]) }));
    } catch (e) { /* nic */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      newState();
      lvl = clamp(d.lvl | 0, 1, 9); won = !!d.won; tut = d.tut || { on: false, step: 0 };
      for (const k of RES_KEYS) { stock[k] = (d.stock && d.stock[k]) || 0; delivered[k] = (d.delivered && d.delivered[k]) || 0; base[k] = (d.base && d.base[k]) || 0; }
      for (const [type, x, y, dir, br] of d.b || []) {
        if (B[type] && inb(x, y) && !cell(x, y)) { const b = makeB(type, x, y, dir); b.bridge = !!br; addB(b); }
      }
      recalc();
      const away = Math.min(900, (Date.now() - (d.t || Date.now())) / 1000);
      if (away > 20) { quiet = true; for (let i = 0; i < away; i++) update(1); quiet = false; return 'away'; }
      return true;
    } catch (e) { return false; }
  }
  function initFog(instant) { if (instant) for (let i = 0; i < 9; i++) fog[i] = i < unlockedRegions() ? 0 : 1; }
  function startCam() { cam.z = clamp(vw / (8.5 * T), 0.6, 1.5); centerOn((HALL_X + 1) * T, (HALL_Y + 1.2) * T); }

  // ---------- Smyčka ----------
  let prev = 0, hudT = 0, saveT = 0, goalT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    for (let s = 0; s < speed; s++) update(dt);
    for (let i = 0; i < 9; i++) { const target = i < unlockedRegions() ? 0 : 1; fog[i] += clamp(target - fog[i], -dt * 0.7, dt * 0.7); }
    if (fly) {
      cam.x += (fly.x - cam.x) * Math.min(1, dt * 3); cam.y += (fly.y - cam.y) * Math.min(1, dt * 3);
      if (Math.abs(fly.x - cam.x) + Math.abs(fly.y - cam.y) < 2) fly = null;
      clampCam();
    }
    for (let i = confetti.length - 1; i >= 0; i--) { const c = confetti[i]; c.t += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.t > c.life) confetti.splice(i, 1); }
    hudT += dt; saveT += dt; goalT += dt;
    if (hudT > 0.25) { hudT = 0; updateHUD(); tutTick(); }
    if (goalT > 0.5) { goalT = 0; checkGoals(); }
    if (saveT > 5) { saveT = 0; save(); }
    draw(now / 1000);
    updatePopup();
    requestAnimationFrame(frame);
  }

  function init() {
    canvas = $('game'); ctx = canvas.getContext('2d');
    A.build();
    genTerrain();
    resize();
    buildPalette();
    initInput();
    const r = load();
    if (!r) newState();
    initFog(true);
    startCam();
    updateHUD();
    tutTick();
    showSheet();
    resize();
    if (!r) setTimeout(() => showModal(helpHTML(), [{ label: 'Začít hrát' }]), 100);
    else if (r === 'away') toast('⏳ Údolí pracovalo i bez tebe', 2800);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    prev = performance.now();
    requestAnimationFrame(frame);
  }
  // ladicí rozhraní (pro testy)
  window.__zu = {
    get state() { return { lvl, stock, delivered, base, won, cnt, blds: blds.length, modalOpen, employed, needWorkers, capStock, tut }; },
    place, update, checkGoals, validTile, bfsPath, regionOpen, B, cam, terrain, cell, grid: () => grid, blds: () => blds, tutTick,
    give: (k, n) => { stock[k] += n; }, setLvl: n => { lvl = n; recalc(); }, setTool: t => { tool = t; refreshPalette(); showSheet(); }, select: b => { sel = b; tool = null; refreshPalette(); showSheet(); },
    setSpeed: n => { speed = n; }, recalc, updateHUD, skipTut: () => { tut.on = false; showSheet(); },
    get tgt() { return tutTgt; }, get tpath() { return tutPathTiles; },
    centerOn, setZoom: z => { cam.z = z; },
    layBelt(path, target) {
      // path = [[x,y]...] od prvního pole pásu; poslední pás míří do budovy target
      let ok = true;
      for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i], nx = i + 1 < path.length ? path[i + 1] : [target.x, target.y];
        let d;
        if (i + 1 < path.length) d = dirFrom({ x, y }, { x: nx[0], y: nx[1] });
        else { d = 0; for (let k = 0; k < 4; k++) { const c = cell(x + DX[k], y + DY[k]); if (c === target) d = k; } }
        if (!cell(x, y)) ok = placeConveyor(x, y, d) && ok; else if (cell(x, y).type === 'conveyor') cell(x, y).dir = d;
      }
      return ok;
    },
  };
  init();
})();
