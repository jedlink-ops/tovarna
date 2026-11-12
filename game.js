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

  let SEED = 0, SALT = 0, noSave = false, lastSaveAt = 0;
  const setSalt = () => { SALT = SEED ? (Math.imul(SEED, 2654435761) | 0) : 0; };
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263 + SALT) | 0;
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
    fish: { n: 'Ryby' }, ironOre: { n: 'Železná ruda' }, iron: { n: 'Železo' }, tool: { n: 'Nářadí' }, gold: { n: 'Zlato' }, jewel: { n: 'Klenoty' }, meat: { n: 'Zvěřina' },
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
    forge:     { n: 'Kovárna', kind: 'proc', on: 'build', work: 1, cost: { stone: 25, plank: 8 }, site: true, rec: { in: { ironOre: 2, wood: 1 }, out: 'iron', t: 6 }, desc: 'Ze 2 rud a 1 dřeva vytaví železo.', hint: 'Staví se na trávu.' },
    workshop:  { n: 'Dílna', kind: 'proc', on: 'build', work: 1, cost: { plank: 20, stone: 20, iron: 5 }, site: true, rec: { in: { iron: 1, plank: 1 }, out: 'tool', t: 8 }, desc: 'Z železa a prkna vyrobí nářadí.', hint: 'Staví se na trávu.' },
    goldmine:  { n: 'Zlatý důl', kind: 'prod', on: 'gold', work: 1, cost: { plank: 20, iron: 8, tool: 2 }, site: true, rec: { out: 'gold', t: 6 }, desc: 'Těží zlato.', hint: 'Staví se na zlatou žílu (žlutě se třpytí).' },
    jeweler:   { n: 'Klenotník', kind: 'proc', on: 'build', work: 1, cost: { stone: 30, plank: 20, iron: 6 }, site: true, rec: { in: { gold: 1, iron: 1 }, out: 'jewel', t: 10 }, desc: 'Ze zlata a železa vyrobí klenot.', hint: 'Staví se na trávu.' },
    tower:     { n: 'Strážní věž', kind: 'def', on: 'build', range: 6, mode: 'scare', cost: { wood: 12, plank: 4, stone: 8 }, desc: 'Svítí v noci a zahání vlky v okruhu 6 polí. Nepotřebuje pracovníka.', hint: 'Staví se na trávu.' },
    guard:     { n: 'Hlídka', kind: 'def', on: 'build', work: 1, range: 7, mode: 'kill', killT: 2.5, cost: { wood: 10, plank: 6, stone: 6 }, desc: 'Hlídka s kopím. Střeží okruh 7 polí a vlky zažene. Potřebuje pracovníka.', hint: 'Staví se na trávu.' },
    hunter:    { n: 'Myslivec', kind: 'prod', on: 'forest', work: 1, range: 8, mode: 'kill', killT: 2, cost: { wood: 12, plank: 4 }, rec: { out: 'meat', t: 9 }, desc: 'Loví zvěřinu (jídlo pro chaloupky) a střílí vlky do 8 polí.', hint: 'Staví se na les.' },
    well:      { n: 'Studna', kind: 'def', on: 'build', range: 7, mode: 'water', water: true, cost: { wood: 8, stone: 8 }, desc: 'Hasí požáry v okruhu 7 polí.', hint: 'Staví se na trávu.' },
    port:      { n: 'Přístav', kind: 'proj', proj: true, size: 2, cost: { plank: 40, iron: 15, tool: 6 }, desc: 'Vzdálený projekt. Po dokončení vykupuje zboží: každé 2 kusy = 1 zlato.' },
    village:   { n: 'Horská osada', kind: 'proj', proj: true, size: 2, cost: { stone: 60, plank: 30, bread: 20 }, desc: 'Vzdálený projekt. Po dokončení pracují všechny budovy o 20 % rychleji.' },
    castle:    { n: 'Lesní hrad', kind: 'proj', proj: true, size: 2, range: 12, mode: 'kill', killT: 2.5, water: true, cost: { stone: 80, plank: 30, iron: 30, tool: 10 }, desc: 'Vzdálený projekt. Po dokončení chrání okolí do 12 polí před vlky i ohněm.' },
    scout:     { n: 'Průzkumná chata', kind: 'scout', site: true, on: 'build', cost: { wood: 25, stone: 12 }, desc: 'Po dokončení se rozestoupí mlha v nejbližší neprozkoumané oblasti (do 10 polí). Materiál dovez pásem.', hint: 'Staví se na trávu do 10 polí od mlhy (neprozkoumané oblasti).' },
    monument:  { n: 'Velký chrám', kind: 'wonder', site: true, on: 'build', cost: { stone: 200, plank: 100, iron: 50, tool: 12, jewel: 10 }, desc: 'Dílo celého údolí. Je to staveniště: dovez sem pásem všechen materiál a vyhráváš!', hint: 'Staví se na trávu.' },
  };
  const BRIDGE_COST = { plank: 2 };
  const UPG = [null, null, { plank: 6, stone: 8 }, { plank: 12, stone: 14, iron: 6 }];
  const PALETTE = ['erase', 'conveyor', 'splitter', 'lumber', 'quarry', 'house', 'scout', 'tower', 'guard', 'hunter', 'well', 'sawmill', 'warehouse', 'farm', 'bakery', 'fisher', 'mine', 'forge', 'workshop', 'goldmine', 'jeweler', 'monument'];
  const UNLOCK_AT = { erase: 1, conveyor: 1, lumber: 1, quarry: 1, house: 1, scout: 2, tower: 2, sawmill: 2, warehouse: 2, splitter: 3, guard: 3, hunter: 3, well: 3, farm: 3, bakery: 3, fisher: 3, mine: 4, forge: 4, workshop: 5, goldmine: 6, jeweler: 6, monument: 9 };
  const BRIDGE_LVL = 3, FOOD_LVL = 3;

  // ---------- Levely ----------
  const LEVELS = [
    { name: 'Osada', goals: [{ k: 'dl', r: 'wood', n: 15 }, { k: 'dl', r: 'stone', n: 10 }, { k: 'build', b: 'house', n: 1 }], bonus: { wood: 25, stone: 10 } },
    { name: 'Řemeslníci', goals: [{ k: 'dl', r: 'plank', n: 15 }, { k: 'build', b: 'warehouse', n: 1 }, { k: 'build', b: 'house', n: 3 }, { k: 'reg', n: 1 }], bonus: { wood: 30, stone: 20 } },
    { name: 'Úroda a mosty', goals: [{ k: 'build', b: 'bridge', n: 2 }, { k: 'dl', r: 'bread', n: 10 }, { k: 'dl', r: 'fish', n: 6 }], bonus: { plank: 25, wood: 25 } },
    { name: 'Železná doba', goals: [{ k: 'dl', r: 'iron', n: 12 }, { k: 'dl', r: 'stone', n: 40 }, { k: 'reg', n: 3 }], bonus: { plank: 25, iron: 5, stone: 20 } },
    { name: 'Dílny', goals: [{ k: 'dl', r: 'tool', n: 6 }, { k: 'dl', r: 'iron', n: 20 }, { k: 'build', b: 'workshop', n: 1 }, { k: 'build', b: 'port', n: 1 }], bonus: { plank: 30, iron: 10, stone: 30 } },
    { name: 'Zlatá horečka', goals: [{ k: 'dl', r: 'gold', n: 10 }, { k: 'dl', r: 'jewel', n: 4 }, { k: 'build', b: 'warehouse', n: 3 }, { k: 'reg', n: 5 }], bonus: { plank: 40, iron: 20 } },
    { name: 'Bohatství', goals: [{ k: 'dl', r: 'plank', n: 60 }, { k: 'dl', r: 'iron', n: 30 }, { k: 'dl', r: 'bread', n: 40 }, { k: 'dl', r: 'tool', n: 10 }, { k: 'build', b: 'village', n: 1 }], bonus: { stone: 80, tool: 6 } },
    { name: 'Metropole', goals: [{ k: 'dl', r: 'tool', n: 20 }, { k: 'dl', r: 'jewel', n: 12 }, { k: 'build', b: 'house', n: 10 }, { k: 'build', b: 'castle', n: 1 }, { k: 'reg', n: 7 }], bonus: { stone: 120, plank: 60, iron: 30, jewel: 4 } },
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
  let ATT = 0;
  function genOnce() {
    terrain.fill(G);
    let rs = (SEED + ATT * 7919) >>> 0;
    const rnd = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const jit = (x, y) => (SEED ? (rnd() - 0.5) * 2 * ((x >= 16 && x < 32 && y >= 16 && y < 32) ? 3.6 : 3.4) : 0);
    const bl = (x, y, r, t) => { if (SEED) { const jx = jit(x, y), jy = jit(x, y); blob(x + jx, y + jy, r * (0.75 + 0.6 * rnd()), t); } else blob(x, y, r, t); };
    const F = (x, y, r) => bl(x, y, r, FOREST), R = (x, y, r) => bl(x, y, r, ROCK), O = (x, y, r) => bl(x, y, r, ORE),
          GD = (x, y, r) => bl(x, y, r, GOLD), WA = (x, y, r) => bl(x, y, r, WATER);
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
    if (SEED) {
      // náhodné doplňky v každé oblasti
      for (let ri = 1; ri < 9; ri++) {
        const [rx, ry] = ORDER[ri], n = 2 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const t = [FOREST, FOREST, ROCK, WATER, ORE, GOLD][Math.floor(rnd() * 6)];
          blob(rx * RS + 2 + rnd() * (RS - 4), ry * RS + 2 + rnd() * (RS - 4), 1.4 + rnd() * 1.8, t);
        }
      }
    }
    // řeky (čím dál šířejí)
    river(true, 32 + (SEED ? Math.round((rnd() - 0.5) * 5) : 0), 2, 1.1, 0.4 + (SEED ? rnd() * 6 : 0));
    river(false, 32 + (SEED ? Math.round((rnd() - 0.5) * 5) : 0), 3, 1.1, 1.7 + (SEED ? rnd() * 6 : 0));
    river(true, 13 + (SEED ? Math.round((rnd() - 0.5) * 5) : 0), 3, 1.1, 2.6 + (SEED ? rnd() * 6 : 0));
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
  function startOk() {
    const seen = new Uint8Array(W * H), q = [[24, 26]]; seen[26 * W + 24] = 1; let f = 0, r = 0;
    const inC = (x, y) => x >= 16 && x < 32 && y >= 16 && y < 32;
    const fs = new Set(), rsx = new Set();
    while (q.length) {
      const [x, y] = q.pop();
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (!inC(nx, ny) || seen[ny * W + nx]) continue;
        const t = terrain[ny * W + nx];
        if (t === G || t === SAND) { seen[ny * W + nx] = 1; q.push([nx, ny]); }
        else if (t === FOREST) fs.add(ny * W + nx); else if (t === ROCK) rsx.add(ny * W + nx);
      }
    }
    return fs.size >= 6 && rsx.size >= 6;
  }
  function genTerrain() { for (ATT = 0; ATT < 40; ATT++) { genOnce(); if (!SEED || startOk()) return; } }
  const PROJ_POS = {};
  function placeProjects() {
    const WANT = { port: [24, 12, 1], village: [41, 24, 2], castle: [8, 23, 4] };
    for (const t in WANT) {
      const [tx, ty, ri] = WANT[t]; let best = null, bd = 1e9;
      for (let y = 1; y < H - 3; y++) for (let x = 1; x < W - 3; x++) {
        if (regIdxAt(x, y) !== ri || regIdxAt(x + 1, y + 1) !== ri) continue;
        let ok = true;
        for (let j = -1; j <= 2 && ok; j++) for (let i = -1; i <= 2; i++) { const c = tAt(x + i, y + j); if (c === WATER || c === ORE || c === GOLD || c === -1) { ok = false; break; } }
        if (!ok) continue;
        const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) continue;
      for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) terrain[(best[1] + j) * W + best[0] + i] = G;
      PROJ_POS[t] = best;
    }
    forestList = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (terrain[y * W + x] === FOREST) forestList.push([x, y]);
  }
  const waterNear = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tAt(x + dx, y + dy) === WATER) return true; return false; };

  // ---------- Stav ----------
  let stock, delivered, base, lvl, won, tut;
  let cnt = {}, capStock = 100, employed = 0, needWorkers = 0;
  let tool = null, sel = null, speed = 1, modalOpen = false, quiet = false, rot = 0;
  const fog = new Array(9).fill(1);
  const cam = { x: 0, y: 0, z: 1 };
  let fly = null;
  const popups = [], puffs = [], confetti = [], wolves = [];
  const DAY_LEN = 180;
  let stat = { prod: {}, cons: {} }, snaps = [], nextSnap = 0, undoStack = [], curOps = null;
  let clock = 20, sleeping = false, storm = { warn: 0, t: 0 }, nextStorm = DAY_LEN * 3.5, nextFire = DAY_LEN * 4.5, spawnT = 6, forestList = [], nightWarned = -1;

  function newState() {
    stock = {}; delivered = {}; base = {};
    for (const k of RES_KEYS) { stock[k] = 0; delivered[k] = 0; base[k] = 0; }
    stock.wood = 42; stock.stone = 8;
    lvl = 1; won = false; tut = { on: true, step: 0 };
    grid = new Array(W * H).fill(null); blds = [];
    addB(makeB('hall', HALL_X, HALL_Y, 0));
    for (const t of ['port', 'village', 'castle']) {
      const p = PROJ_POS[t]; if (!p) continue;
      const pb = makeB(t, p[0], p[1], 0); pb.site = { need: Object.assign({}, B[t].cost), have: {} }; addB(pb);
    }
    opened = [true, false, false, false, false, false, false, false, false]; stat = { prod: {}, cons: {} }; snaps = []; undoStack = []; curOps = null;
    clock = 20; sleeping = false; storm = { warn: 0, t: 0 }; nextStorm = DAY_LEN * 3.5; nextFire = DAY_LEN * 4.5; wolves.length = 0; nightWarned = -1;
    recalc();
  }
  let opened = [true, false, false, false, false, false, false, false, false];
  const openedCount = () => opened.filter(Boolean).length;
  const regionOpen = (x, y) => inb(x, y) && opened[regIdxAt(x, y)];
  function scoutCost() {
    const n = openedCount();
    if (n <= 1) return { wood: 25, stone: 12 };
    if (n === 2) return { wood: 20, stone: 20, plank: 10 };
    const c = { stone: 10 + 6 * n, plank: 6 + 4 * n }; if (lvl >= FOOD_LVL) c.bread = 4 + 2 * n; return c;
  }
  const costOf = t => (t === 'scout' ? scoutCost() : B[t].cost);
  function scoutTargets(x, y) {
    const out = [];
    for (let r = 1; r < 9; r++) {
      if (opened[r]) continue;
      const [rx, ry] = ORDER[r], x0 = rx * RS, y0 = ry * RS;
      const dx = Math.max(x0 - x, 0, x - (x0 + RS - 1)), dy = Math.max(y0 - y, 0, y - (y0 + RS - 1)), d = Math.hypot(dx, dy);
      if (d <= 10) out.push([r, d]);
    }
    return out.sort((a, b) => a[1] - b[1]).map(p => p[0]);
  }
  function openRegion(r) {
    if (opened[r]) return; opened[r] = true;
    if (quiet) return;
    const [rx, ry] = ORDER[r]; burst(); toast('🧭 Objevena oblast: ' + REG_NAMES[r], 2600);
    flyTo((rx * RS + RS / 2) * T, (ry * RS + RS / 2) * T);
  }
  const size = b => B[b.type].size || 1;

  function makeB(type, x, y, dir) {
    return { type, x, y, dir: dir || 0, out: [], inv: {}, t: 0, working: false, state: 'ok', need: null, house: null,
      item: null, p: 0, inDir: 0, bridge: false, food: 0, foodT: 4, hungry: false, used: 0, buf: null, from: null, rr: 0, smokeT: Math.random() * 2, bonus: 1, up: 1, site: null, broken: false, fire: 0, spreadT: 6, sold: 0 };
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
    for (const b of blds) { if (b.site) continue; cnt[b.type] = (cnt[b.type] || 0) + 1; if (b.bridge) cnt.bridge = (cnt.bridge || 0) + 1; }
    capStock = 100 + 100 * (cnt.warehouse || 0);
    const houses = blds.filter(b => b.type === 'house' && !b.site);
    for (const h of houses) h.used = 0;
    employed = 0; needWorkers = 0;
    for (const b of blds) {
      if (!B[b.type].work || b.site) continue;
      needWorkers++;
      let best = null, bd = 99;
      for (const h of houses) {
        if (h.used >= HOUSE_SLOTS + h.up - 1) continue;
        const d = Math.max(Math.abs(h.x - b.x), Math.abs(h.y - b.y));
        if (d <= WORK_RANGE + h.up - 1 && d < bd) { bd = d; best = h; }
      }
      b.house = best;
      if (best) { best.used++; employed++; }
    }
    for (const b of blds) {
      if (b.type !== 'farm') continue;
      b.bonus = waterNear(b.x, b.y) ? 1.5 : 1;
    }
  }

  // ---------- Den a noc, vlci, události ----------
  const phase = () => (clock % DAY_LEN) / DAY_LEN;
  function darkness() { const p = phase(); if (p < 0.62) return 0; if (p < 0.72) return (p - 0.62) / 0.10; if (p < 0.93) return 1; return 1 - (p - 0.93) / 0.07; }
  const isNight = () => darkness() > 0.55;
  const dayNo = () => Math.floor(clock / DAY_LEN) + 1;
  function breakB(b) { if (b.type === 'hall' || b.site || b.broken) return; b.broken = true; if (!quiet) popups.push({ x: b.x * T + T / 2, y: b.y * T, t: 0, txt: '💢' }); }
  function repairCost(b) { return b.type === 'conveyor' ? (b.bridge ? { plank: 1 } : { wood: 1 }) : { wood: 3 }; }
  function repair(b) {
    if (!b.broken) return true;
    const c = repairCost(b); if (!canAfford(c)) { warn('Na opravu chybí: ' + missTxt(c)); return false; }
    for (const k in c) stock[k] -= c[k];
    b.broken = false; popups.push({ x: b.x * T + T / 2, y: b.y * T, t: 0, txt: '🔧' }); return true;
  }
  function repairAll() {
    let ok = 0, bad = 0;
    for (const b of blds) if (b.broken) { if (repair(b)) ok++; else { bad++; break; } }
    if (ok) toast('🔧 Opraveno: ' + ok + (bad ? ' (na zbytek nemáš suroviny)' : ''), 1800);
    updateHUD(); save();
  }
  function wolfTarget(w) {
    let best = null, bd = 1e9;
    for (const b of blds) {
      if (b.type === 'hall' || b.broken || b.site) continue;
      const s = size(b), d = Math.hypot(b.x + s / 2 - w.x, b.y + s / 2 - w.y);
      if (d < bd && d < 22) { bd = d; best = b; }
    }
    return best;
  }
  function spawnWolf() {
    const open = forestList.filter(p => regionOpen(p[0], p[1]));
    if (!open.length) return;
    for (let k = 0; k < 14; k++) {
      const p = open[(Math.random() * open.length) | 0];
      if (Math.hypot(p[0] - HALL_X, p[1] - HALL_Y) < 9) continue;
      const w = { x: p[0] + 0.5, y: p[1] + 0.5, hp: 1, state: 'hunt', t: 0, bite: 0, tgt: null, fed: 0, face: 1, fleeT: 0 };
      w.tgt = wolfTarget(w); if (!w.tgt) continue;
      wolves.push(w); return;
    }
  }
  function wolvesTick(dt) {
    const night = isNight();
    if (lvl >= 2 && night) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(4, 15 - lvl * 1.2) * (0.7 + Math.random() * 0.6); if (wolves.length < Math.min(8, 1 + Math.floor(lvl / 2))) spawnWolf(); }
    }
    for (let i = wolves.length - 1; i >= 0; i--) {
      const w = wolves[i]; w.t += dt;
      if (!night && w.state === 'hunt') w.state = 'flee';
      for (const d of blds) {
        const D = B[d.type]; if (!D.range || d.site || d.broken || d.fire > 0 || (D.work && !d.house)) continue;
        const r = D.range + (d.up - 1) * 1.5, s = size(d), dx = d.x + s / 2 - w.x, dy = d.y + s / 2 - w.y;
        if (Math.hypot(dx, dy) > r) continue;
        if (D.mode === 'scare') { w.state = 'flee'; w.fx = -dx; w.fy = -dy; }
        else if (D.mode === 'kill') { w.hp -= dt / (D.killT || 2); if (w.state === 'hunt' && w.hp < 0.5) { w.state = 'flee'; w.fx = -dx; w.fy = -dy; } }
      }
      if (w.hp <= 0) { popups.push({ x: w.x * T, y: w.y * T, t: 0, txt: '💥' }); wolves.splice(i, 1); continue; }
      if (w.state === 'flee') {
        const fx = w.fx !== undefined ? w.fx : w.x - HALL_X, fy = w.fy !== undefined ? w.fy : w.y - HALL_Y, n = Math.hypot(fx, fy) || 1;
        w.x += fx / n * 3.4 * dt; w.y += fy / n * 3.4 * dt; w.face = fx >= 0 ? 1 : -1; w.fleeT += dt;
        if (w.fleeT > 6 || w.x < -2 || w.y < -2 || w.x > W + 2 || w.y > H + 2) wolves.splice(i, 1);
        continue;
      }
      if (!w.tgt || w.tgt.broken || blds.indexOf(w.tgt) < 0) { w.tgt = wolfTarget(w); w.bite = 0; if (!w.tgt) { w.state = 'flee'; continue; } }
      const s = size(w.tgt), dx = w.tgt.x + s / 2 - w.x, dy = w.tgt.y + s / 2 - w.y, dist = Math.hypot(dx, dy);
      if (dist > 0.8) { w.x += dx / dist * 2.6 * dt; w.y += dy / dist * 2.6 * dt; w.face = dx >= 0 ? 1 : -1; }
      else { w.bite += dt; if (w.bite >= 2.5) { breakB(w.tgt); w.tgt = null; w.bite = 0; if (++w.fed >= 3) w.state = 'flee'; } }
    }
  }
  function fireTick(b, dt) {
    b.fire += dt / 25;
    const bs = size(b);
    for (const d of blds) {
      const D = B[d.type]; if (!D.water || d.site || d.broken) continue;
      const s = size(d);
      if (Math.hypot(d.x + s / 2 - b.x - bs / 2, d.y + s / 2 - b.y - bs / 2) <= D.range + (d.up - 1) * 1.5) b.fire -= dt / 3;
    }
    if (b.fire <= 0) { b.fire = 0; return; }
    b.spreadT -= dt;
    if (b.spreadT <= 0) {
      b.spreadT = 6;
      for (const n of blds) {
        if (n === b || n.type === 'hall' || n.type === 'conveyor' || n.fire > 0 || n.site) continue;
        if (Math.max(Math.abs(n.x - b.x), Math.abs(n.y - b.y)) <= bs && Math.random() < 0.45) n.fire = 0.01;
      }
    }
    if (b.fire >= 1) { removeB(b); recalc(); if (sel === b) sel = null; if (!quiet) toast('🏚 ' + B[b.type].n + ' shořela do základů', 2600); }
  }
  function floodHit() {
    let n = 0;
    for (const b of blds) {
      if (b.type === 'hall' || b.site || b.broken) continue;
      const t = tAt(b.x, b.y); let hit;
      if (b.type === 'conveyor') hit = b.bridge ? Math.random() < 0.6 : (t === SAND && Math.random() < 0.5);
      else hit = t === SAND && b.up < 2 && !B[b.type].proj;
      if (hit) { b.broken = true; n++; }
    }
    toast(n ? '🌊 Řeka se rozvodnila! Poškozeno: ' + n + '. Oprav to tlačítkem 🔧' : '🌊 Řeka se rozvodnila, ale nic se nestalo.', 3400);
  }
  function igniteRandom() {
    const c = blds.filter(b => ['house', 'bakery', 'forge', 'sawmill'].includes(b.type) && !b.site && !(b.fire > 0));
    if (!c.length) return;
    const b = c[(Math.random() * c.length) | 0]; b.fire = 0.01;
    toast('🔥 Hoří ' + B[b.type].n.toLowerCase() + '! Klepej na budovu a hasíš ji. Studna to zvládne sama.', 3600);
  }
  function worldTick(dt) {
    wolvesTick(dt);
    const p = phase(), dn = dayNo();
    if (lvl >= 2 && p > 0.62 && nightWarned !== dn) {
      nightWarned = dn;
      toast(blds.some(b => B[b.type].range && B[b.type].mode !== 'water' && !b.site) ? '🌙 Padá noc… vlci se ozývají z lesa.' : '🌙 Padá noc! Z lesů vyjdou vlci. Postav Strážní věž nebo Hlídku.', 3200);
    }
    if (lvl >= 3 && clock >= nextStorm && !storm.warn && !storm.t) { storm.warn = 18; nextStorm = clock + DAY_LEN * (4 + Math.random() * 3); toast('🌧️ Žene se bouře! Řeky se brzy rozvodní. Vylepšené budovy na břehu vydrží.', 3400); }
    if (storm.warn > 0) { storm.warn -= dt; if (storm.warn <= 0) { storm.t = 14; floodHit(); } } else if (storm.t > 0) storm.t -= dt;
    if (lvl >= 4 && clock >= nextFire) { nextFire = clock + DAY_LEN * (5 + Math.random() * 3); igniteRandom(); }
  }
  function upgradeCost(b) {
    const k = B[b.type].kind;
    if (b.site || b.type === 'hall' || !['prod', 'proc', 'house', 'def'].includes(k) || b.up >= 3) return null;
    return lvl >= (b.up === 1 ? 4 : 7) ? UPG[b.up + 1] : null;
  }
  function startUpgrade(b) { const c = upgradeCost(b); if (!c) return; b.site = { need: Object.assign({}, c), have: {}, up: true }; recalc(); save(); toast('⬆ Dovez do budovy materiál pásem, pak se vylepší.', 2600); }
  function siteCheck(t) {
    if (!Object.keys(t.site.need).every(k => (t.site.have[k] || 0) >= t.site.need[k])) return;
    const up = t.site.up; t.site = null; if (up) t.up++;
    recalc();
    if (t.type === 'scout') { const c = scoutTargets(t.x, t.y); if (c.length) openRegion(c[0]); }
    if (!quiet) { popups.push({ x: t.x * T + T, y: t.y * T, t: 0, txt: '🎉' }); toast(up ? '⬆ ' + B[t.type].n + ' vylepšena!' : '🏗 ' + B[t.type].n + ' dokončena!', 2400); }
  }

  // ---------- Logistika ----------
  const dirFrom = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3); };
  function delivery(item, t) {
    stock[item]++; delivered[item]++;
    if (!quiet && popups.length < 24 && Math.random() < 0.6) popups.push({ x: t.x * T + T * (0.5 + Math.random() * size(t) * 0.5), y: t.y * T + T * 0.3, t: 0, icon: item });
  }
  function accept(t, item, src) {
    if (t.broken || t.fire > 0) return false;
    if (t.site) {
      const n = t.site.need[item];
      if (n && (t.site.have[item] || 0) < n) { t.site.have[item] = (t.site.have[item] || 0) + 1; stat.cons[item] = (stat.cons[item] || 0) + 1; siteCheck(t); return true; }
      return false;
    }
    switch (B[t.type].kind) {
      case 'proj':
        if (t.type !== 'port') return false;
        t.sold++;
        if (t.sold % 2 === 0 && stock.gold < capStock) { stock.gold++; if (!quiet) popups.push({ x: t.x * T + T, y: t.y * T, t: 0, icon: 'gold' }); }
        return true;
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
        if (lvl >= FOOD_LVL && (item === 'bread' || item === 'fish' || item === 'meat') && t.food < 3) { t.food++; return true; }
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
        for (const k in r.in) { b.inv[k] -= r.in[k]; stat.cons[k] = (stat.cons[k] || 0) + r.in[k]; }
      }
      b.working = true; b.t = 0;
    }
    b.state = 'ok';
    const hungry = b.house && b.house.hungry;
    b.t += dt * b.bonus * (1 + 0.35 * (b.up - 1)) * (cnt.village ? 1.2 : 1) * (hungry ? 0.5 : 1);
    if (b.t >= r.t) { b.out.push(r.out); stat.prod[r.out] = (stat.prod[r.out] || 0) + 1; b.working = false; b.t = 0; }
  }
  function update(dt) {
    clock += dt;
    if (clock >= nextSnap) { nextSnap = clock + 5; snaps.push([clock, Object.assign({}, stat.prod), Object.assign({}, stat.cons)]); if (snaps.length > 13) snaps.shift(); }
    if (!quiet) worldTick(dt);
    for (const b of blds.slice()) {
      if (b.site) continue;
      if (b.fire > 0) fireTick(b, dt);
      if (b.broken || b.fire > 0) continue;
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
    if (type === 'scout' && !scoutTargets(x, y).length) return false;
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
    addB(b); recalc(); recOp({ k: 'add', b, paid: Object.assign({}, c) });
    return true;
  }
  function place(type, x, y, dir) {
    if (type === 'conveyor') return placeConveyor(x, y, dir === undefined ? rot : dir);
    const d = B[type];
    if (!inb(x, y)) return false;
    if (!regionOpen(x, y)) { warn('🔒 Neprozkoumáno – postav Průzkumnou chatu poblíž'); return false; }
    if (cell(x, y)) return false;
    if (!validTile(type, x, y)) { warn(d.hint || 'Sem to nejde postavit'); return false; }
    const b = makeB(type, x, y, 0);
    if (d.site) {
      b.site = { need: Object.assign({}, costOf(type)), have: {} };
      addB(b); recalc(); save(); recOp({ k: 'add', b, paid: {} });
      popups.push({ x: x * T + T / 2, y: y * T + T * 0.2, t: 0, txt: '🏗' });
      toast('🏗 Staveniště! Materiál sem dovez dopravníkem.', 2800);
      return true;
    }
    if (!canAfford(d.cost)) { warn('Chybí ti: ' + missTxt(d.cost)); return false; }
    for (const k in d.cost) stock[k] -= d.cost[k];
    addB(b); recalc(); recOp({ k: 'add', b, paid: Object.assign({}, d.cost) });
    popups.push({ x: x * T + T / 2, y: y * T + T * 0.2, t: 0, txt: '✨' });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* nic */ } }
    if (d.work && !b.house) warn('👷 Tady chybí chaloupka v dosahu ' + WORK_RANGE + ' polí');
    save();
    return true;
  }
  function demolish(b, rec) {
    if (b.type === 'hall' || B[b.type].proj) return;
    const refund = {}, add = (k, n) => { if (n > 0) refund[k] = (refund[k] || 0) + n; };
    if (b.site) for (const k in b.site.have) add(k, Math.floor(b.site.have[k] * 0.5));
    if (!(b.site && !b.site.up)) {
      const c = b.bridge ? BRIDGE_COST : B[b.type].cost;
      if (!B[b.type].site) for (const k in c) add(k, Math.floor(c[k] * 0.5));
    }
    for (const k in refund) stock[k] = Math.min(capStock, stock[k] + refund[k]);
    removeB(b); recalc();
    if (sel === b) sel = null;
    if (rec !== false) recOp({ k: 'del', b, refund });
  }
  function recOp(op) { if (curOps) curOps.push(op); else pushUndo([op]); }
  function pushUndo(ops) { if (!ops.length) return; undoStack.push(ops); if (undoStack.length > 40) undoStack.shift(); }
  function undo() {
    const ops = undoStack.pop(); if (!ops) return;
    for (let i = ops.length - 1; i >= 0; i--) {
      const o = ops[i];
      if (o.k === 'add') {
        if (blds.indexOf(o.b) < 0 || (B[o.b.type].site && !o.b.site)) continue;
        for (const k in o.paid) stock[k] = Math.min(capStock, stock[k] + o.paid[k]);
        if (o.b.site) for (const k in o.b.site.have) stock[k] = Math.min(capStock, stock[k] + o.b.site.have[k]);
        removeB(o.b); if (sel === o.b) sel = null;
      } else {
        if (cell(o.b.x, o.b.y)) continue;
        addB(o.b); for (const k in o.refund) stock[k] = Math.max(0, stock[k] - o.refund[k]);
      }
    }
    recalc(); updateHUD(); save(); toast('↩ Vráceno zpět', 1100);
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
  function goalVal(g) { return g.k === 'dl' ? delivered[g.r] - base[g.r] : g.k === 'reg' ? openedCount() - 1 : (cnt[g.b] || 0); }
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
    const bonus = Object.keys(L.bonus).map(k => ico(k) + ' ' + L.bonus[k]).join('  ');
    burst(); save();
    let extra = '';
    if (lvl === 3) extra = '<div class="unlock">🌊 <b>Řeky:</b> Přes vodu teď postavíš most – dopravník na vodě stojí 2 prkna za pole.</div><div class="unlock">🍞 <b>Pozor:</b> chaloupky od teď jedí! Dovez do nich chléb nebo ryby dopravníkem. Hladoví dělníci pracují jen poloviční rychlostí.</div>';
    if (lvl === 2) extra = '<div class="unlock">🧭 <b>Průzkum:</b> mapa se neotevírá sama. Postav <b>Průzkumnou chatu</b> do 10 polí od mlhy, dovez do ní materiál pásem a mlha se rozestoupí tím směrem. Další oblasti stojí víc. Objev zatím jednu.</div><div class="unlock">🌙 <b>Den a noc:</b> v noci vylézají z lesa <b>vlci</b> a kazí pásy a budovy. Postav <b>Strážní věž</b>. Poškozené věci opravíš tlačítkem 🔧. Tlačítko 🌙 Spát přeskočí noc.</div>';
    if (lvl === 4) extra = '<div class="unlock">🏗 <b>Velké stavby jsou staveniště:</b> kovárna, dílna a další se nestaví z Radnice. Materiál dovez pásem přímo na staveniště. Kovárna chce i <b>2 rudy a 1 dřevo</b> na provoz.</div><div class="unlock">⬆ Budovy teď jde <b>vylepšit</b> (klepni na ni). Na mapě jsou i <b>vzdálené projekty</b> – Přístav, Horská osada a Lesní hrad. Spojíš je jedním pásem.</div><div class="unlock">🔥 Pozor na <b>požáry</b>, postav Studnu.</div>';
    showModal(
      `<h2>⭐ Level ${done} splněn!</h2><p><b>${L.name}</b> je za tebou.</p>` +
      (newB.length ? `<div class="unlock">🔓 Nové: ${newB.map(t => '<b>' + B[t].n + '</b>').join(', ')}</div>` : '') + extra +
      (bonus ? `<div class="unlock">🎁 Odměna: ${bonus}</div>` : '') +
      `<p><b>Level ${lvl}: ${LEVELS[lvl - 1].name}</b></p>`,
      [{ label: 'Dál' }]);
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
    const cx = b.x * T + T / 2, cy = b.y * T + T / 2, h = T / 2, ins = [];
    for (let d = 0; d < 4; d++) {
      const n = cell(b.x - DX[d], b.y - DY[d]);
      if (n && n.type === 'conveyor' && n.dir === d && !(d === ((b.dir + 2) & 3))) ins.push([d, 0]);
    }
    if (!ins.length) { const n = cell(b.x - DX[b.dir], b.y - DY[b.dir]); ins.push([b.dir, n && n.type !== 'conveyor' ? T * 0.55 : 0]); }
    const f = cell(b.x + DX[b.dir], b.y + DY[b.dir]);
    return { cx, cy, h, ins, out: f && f.type !== 'conveyor' ? T * 0.3 : 0 };
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
        for (const [d, ext] of g.ins) {
          ctx.moveTo(g.cx - DX[d] * (g.h + ext), g.cy - DY[d] * (g.h + ext)); ctx.lineTo(g.cx, g.cy); ctx.lineTo(g.cx + DX[b.dir] * (g.h + g.out), g.cy + DY[b.dir] * (g.h + g.out));
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
      if (b.broken) {
        const bx = b.x * T, by = b.y * T;
        ctx.fillStyle = 'rgba(200,40,30,.35)'; rrect(bx + 3, by + 3, T - 6, T - 6, 8); ctx.fill();
        ctx.strokeStyle = '#ff6a5a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 12, by + 12); ctx.lineTo(bx + T - 12, by + T - 12); ctx.moveTo(bx + T - 12, by + 12); ctx.lineTo(bx + 12, by + T - 12); ctx.stroke();
      }
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
  function drawSite(b, cx, by, sp) {
    const s2 = size(b), x0 = b.x * T, w = s2 * T, hh = s2 * T * 0.9;
    ctx.globalAlpha = b.site.up ? 0.8 : 0.45; A.blit(ctx, sp, cx, by); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(x0 + 4, by - 2); ctx.lineTo(x0 + 4, by - hh); ctx.moveTo(x0 + w - 4, by - 2); ctx.lineTo(x0 + w - 4, by - hh);
    ctx.moveTo(x0 + 4, by - hh * 0.5); ctx.lineTo(x0 + w - 4, by - hh * 0.5); ctx.moveTo(x0 + 4, by - hh); ctx.lineTo(x0 + w - 4, by - hh); ctx.moveTo(x0 + 4, by - 2); ctx.lineTo(x0 + w - 4, by - hh * 0.5);
    ctx.stroke();
    const keys = Object.keys(b.site.need), pw = keys.length * 40 + 10, px = cx - pw / 2, py = by - hh - 32;
    ctx.fillStyle = 'rgba(28,24,30,.9)'; rrect(px, py, pw, 25, 9); ctx.fill();
    ctx.font = '800 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    keys.forEach((k, i) => {
      const rem = b.site.need[k] - (b.site.have[k] || 0);
      A.blit(ctx, A.icon[k], px + 15 + i * 40, py + 13, 0.5);
      ctx.fillStyle = rem <= 0 ? '#7bd88f' : '#fff'; ctx.fillText(rem <= 0 ? '✓' : String(rem), px + 25 + i * 40, py + 13);
    });
  }
  function drawBuilding(b, time) {
    const s = size(b), d = B[b.type], cx = b.x * T + s * T / 2, by = (b.y + s) * T;
    const sp = (b.up > 1 && A.bldV[b.type]) ? A.bldV[b.type][b.up] : A.bld[b.type];
    if (!sp) return;
    if (b.site) { drawSite(b, cx, by, sp); return; }
    A.blit(ctx, sp, cx, by);
    const prog = b.working ? b.t / d.rec.t : 0;
    A.overlay(ctx, b.type, cx, by, { time, working: b.working && !b.broken, progress: prog });
    const ty = b.y * T - 4;
    if (d.rec && !b.broken) {
      if (b.state === 'nowork') bubble(cx, ty - 14, 'bad', b);
      else if (!b.working && (b.state === 'input')) bubble(cx, ty - 14, 'warn', b);
      else if (!b.working && b.state === 'blocked') bubble(cx, ty - 14, 'bad', b);
      else if (b.working && b.type !== 'farm') {
        ctx.fillStyle = 'rgba(0,0,0,.5)'; rrect(cx - 15, ty - 2, 30, 7, 3.5); ctx.fill();
        ctx.fillStyle = '#ffd166'; rrect(cx - 15, ty - 2, Math.max(5, 30 * clampP(prog)), 7, 3.5); ctx.fill();
      }
    } else if (b.type === 'house' && b.hungry && !b.broken) bubble(cx, b.y * T - 18, 'hungry', b);
    else if (B[b.type].work && !b.house && !d.rec && !b.broken) bubble(cx, ty - 14, 'bad', { state: 'nowork' });
    if (b.type === 'splitter' && b.buf) A.blit(ctx, A.icon[b.buf], cx, by - 14, 0.6);
    if (b.broken) {
      ctx.fillStyle = 'rgba(200,40,30,.28)'; rrect(b.x * T + 2, b.y * T + 2, s * T - 4, s * T - 4, 10); ctx.fill();
      ctx.fillStyle = 'rgba(28,24,30,.88)'; ctx.beginPath(); ctx.arc(cx, ty - 10, 15, 0, 6.3); ctx.fill();
      ctx.font = '19px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('🔧', cx, ty - 9);
    }
    if (b.fire > 0) {
      ctx.font = `${26 + b.fire * 18}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔥', cx + Math.sin(time * 9) * 3, by - 22 - Math.abs(Math.sin(time * 7)) * 6); ctx.fillText('🔥', cx - 15 + Math.sin(time * 6) * 2, by - 36);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; rrect(cx - 16, ty - 6, 32, 7, 3.5); ctx.fill(); ctx.fillStyle = '#ff6a3a'; rrect(cx - 16, ty - 6, Math.max(4, 32 * b.fire), 7, 3.5); ctx.fill();
    }
    if (b.up > 1) { ctx.font = '800 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = 'rgba(40,25,5,.8)'; ctx.lineWidth = 3; const st = '★'.repeat(b.up - 1); ctx.strokeText(st, cx, by + 7); ctx.fillText(st, cx, by + 7); }
  }
  function drawWolf(w, time) {
    const x = w.x * T, y = w.y * T, bob = Math.sin(time * 14 + w.x * 3) * 1.4, run = w.state === 'flee' ? 1.4 : 1;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(w.face, 1);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 10, 16, 5, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#2a2d35'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [lx, ph] of [[-9, 0], [-4, 2], [6, 1], [11, 3]]) { const sw = Math.sin(time * 16 * run + ph) * 4; ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx + sw, 11); ctx.stroke(); }
    ctx.fillStyle = '#6f7480'; ctx.strokeStyle = '#2a2d35'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-24, -8, -22, 3); ctx.quadraticCurveTo(-18, 0, -13, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b909e'; ctx.beginPath(); ctx.ellipse(14, -5, 7.5, 6, -0.2, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, -6); ctx.lineTo(27, -2); ctx.lineTo(19, -1); ctx.closePath(); ctx.fillStyle = '#9ba0ad'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6f7480'; ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(12, -17); ctx.lineTo(15, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(16, -6, 1.6, 0, 6.3); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(26, -2, 1.3, 0, 6.3); ctx.fill();
    ctx.restore();
    if (w.bite > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; rrect(x - 14, y - 26, 28, 6, 3); ctx.fill(); ctx.fillStyle = '#ff6a5a'; rrect(x - 14, y - 26, 28 * Math.min(1, w.bite / 2.5), 6, 3); ctx.fill(); }
    if (w.hp < 1) { ctx.fillStyle = 'rgba(0,0,0,.5)'; rrect(x - 14, y - 34, 28, 5, 3); ctx.fill(); ctx.fillStyle = '#7bd88f'; rrect(x - 14, y - 34, 28 * Math.max(0, w.hp), 5, 3); ctx.fill(); }
  }
  // ---- noc a déšť
  let nc = null, nctx = null;
  const LIGHT = { house: 2.6, hall: 4.5, tower: 4.2, guard: 3.2, hunter: 3, well: 2.2, castle: 5.5, port: 3.5, village: 4, forge: 3.2, bakery: 2.8, warehouse: 2.4, sawmill: 2.2, monument: 4, scout: 2 };
  function drawNight(time) {
    const dk = darkness(); if (dk < 0.02) return;
    const w = Math.ceil(vw / 2), h = Math.ceil(vh / 2);
    if (!nc) { nc = document.createElement('canvas'); nctx = nc.getContext('2d'); }
    if (nc.width !== w || nc.height !== h) { nc.width = w; nc.height = h; }
    nctx.globalCompositeOperation = 'source-over'; nctx.clearRect(0, 0, w, h);
    nctx.fillStyle = `rgba(10,18,52,${0.66 * dk})`; nctx.fillRect(0, 0, w, h);
    nctx.globalCompositeOperation = 'destination-out';
    const lights = [];
    for (const b of blds) {
      let r = LIGHT[b.type]; if (!r || b.site || b.broken) continue;
      if ((b.type === 'forge' || b.type === 'bakery') && !b.working) r = 2;
      if (b.fire > 0) r = 5;
      const s = size(b), wx = (b.x + s / 2) * T, wy = (b.y + s / 2) * T - 8;
      const sx = (wx - cam.x) * cam.z, sy = (wy - cam.y) * cam.z, rr = r * T * cam.z;
      if (sx < -rr || sy < -rr || sx > vw + rr || sy > vh + rr) continue;
      lights.push([sx, sy, rr, b.fire > 0 ? 1 : 0]);
    }
    for (const [sx, sy, rr] of lights) {
      const g = nctx.createRadialGradient(sx / 2, sy / 2, rr * 0.05, sx / 2, sy / 2, rr / 2);
      g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = g; nctx.beginPath(); nctx.arc(sx / 2, sy / 2, rr / 2, 0, 6.3); nctx.fill();
    }
    ctx.drawImage(nc, 0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy, rr, fr] of lights) {
      const fl = 0.85 + 0.15 * Math.sin(time * 8 + sx);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr * 0.8);
      g.addColorStop(0, fr ? `rgba(255,110,40,${0.45 * dk * fl})` : `rgba(255,185,90,${0.26 * dk * fl})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rr * 0.8, 0, 6.3); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawRain(time) {
    const k = storm.warn > 0 ? 0.5 : (storm.t > 0 ? 1 : 0); if (!k) return;
    ctx.fillStyle = `rgba(30,40,70,${0.18 * k})`; ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = 'rgba(200,220,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
    const n = Math.floor(90 * k);
    for (let i = 0; i < n; i++) { const x = (hash(i, 3) * vw + time * 60) % vw, y = (hash(i, 7) * vh + time * 650 + i * 37) % vh; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
    ctx.stroke();
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
      const label = 'Postav tu poblíž Průzkumnou chatu';
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
        const WR = WORK_RANGE + sel.up - 1, rx = (sel.x - WR) * T, ry = (sel.y - WR) * T, rw = (WR * 2 + 1) * T;
        ctx.fillRect(rx, ry, rw, rw); ctx.strokeRect(rx, ry, rw, rw); ctx.setLineDash([]);
        for (const b of blds) if (b.house === sel) { ctx.strokeStyle = 'rgba(123,216,143,.95)'; ctx.lineWidth = 3; rrect(b.x * T + 2, b.y * T + 2, T - 4, T - 4, 8); ctx.stroke(); }
      } else if (B[sel.type].range && !sel.site) {
        const r = (B[sel.type].range + (sel.up - 1) * 1.5) * T;
        ctx.fillStyle = B[sel.type].mode === 'water' ? 'rgba(90,170,255,.14)' : 'rgba(255,120,100,.12)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc((sel.x + s / 2) * T, (sel.y + s / 2) * T, r, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        if (sel.house) { ctx.strokeStyle = 'rgba(123,216,143,.9)'; ctx.lineWidth = 3; rrect(sel.house.x * T + 2, sel.house.y * T + 2, T - 4, T - 4, 8); ctx.stroke(); }
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
    for (const w of wolves) drawWolf(w, time);
    drawFog(time);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawNight(time); drawRain(time);
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
    html += `<span class="pill">${isNight() ? '🌙' : '☀️'} <small>den</small> ${dayNo()}</span>`;
    const nb = blds.filter(b => b.broken).length, nf = blds.filter(b => b.fire > 0).length;
    if (nf) html += `<span class="pill bad">🔥 ${nf}</span>`;
    $('undoBtn').style.display = undoStack.length ? 'block' : 'none';
    const rb = $('repairBtn'); rb.style.display = nb ? 'block' : 'none'; rb.textContent = '🔧 Opravit vše (' + nb + ')';
    const sl = $('sleepBtn'); sl.style.display = (phase() >= 0.55 && phase() < 0.97 && !sleeping && lvl >= 2) ? 'block' : 'none';
    resEl.innerHTML = html;
    const L = LEVELS[Math.min(lvl, LEVELS.length) - 1];
    lvlHead.innerHTML = `<span class="star">⭐</span> Level ${lvl}: ${L.name}${won ? ' ✅' : ''}<span class="chev">${levelCard.classList.contains('collapsed') ? '▼' : '▲'}</span>`;
    goalsEl.innerHTML = L.goals.map(g => {
      const v = Math.min(goalVal(g), g.n), pct = Math.round(v / g.n * 100);
      const em = g.k === 'reg' ? '🧭' : g.k === 'dl' ? ico(g.r) : g.b === 'bridge' ? '🌉' : `<img class="ic" src="${A.thumbs[g.b]}" alt="">`;
      const lab = g.k === 'dl' ? 'dodej' : g.k === 'reg' ? 'objev' : 'postav';
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
      el.classList.toggle('poor', !locked && t !== 'erase' && !(B[t] && B[t].site) && !canAfford(t === 'conveyor' ? B.conveyor.cost : B[t].cost));
      const cs = locked ? '🔒 Lv ' + (UNLOCK_AT[t] - 1) : t === 'erase' ? 'vrátí ½' : t === 'conveyor' ? ico('wood') + '1' + (lvl >= BRIDGE_LVL ? ' · most ' + ico('plank') + '2' : '') : (B[t].site ? '🚚 ' : '') + costTxt(costOf(t));
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
      setSheet(`<h3><img class="ic" src="${A.thumbs[tool]}" alt=""> ${d.n}<button class="x" data-a="close">✕</button></h3><div>${d.desc}</div><div class="muted">${d.hint || ''}${d.work ? ' · potřebuje 1 pracovníka' : ''}</div><div style="margin-top:6px">${d.site ? '🚚 Staveniště – materiál dovez pásem: ' : ''}${costChips(costOf(tool), d.site)}</div>`);
      return;
    }
    sheet.classList.remove('show');
  }
  const costChips = (c, nocheck) => Object.keys(c).map(k => `<span class="chip${!nocheck && stock[k] < c[k] ? ' poor' : ''}">${ico(k)} ${c[k]}</span>`).join('');

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
    if (d.work && !b.house) return { t: '❌ Nemá pracovníka – postav chaloupku do ' + (WORK_RANGE) + ' polí', c: 'bad' };
    if (b.state === 'blocked') return { t: '📦 Výstup je plný – napoj dopravník na další budovu nebo sklad', c: 'bad' };
    if (b.state === 'input') {
      const miss = Object.keys(r.in).filter(k => (b.inv[k] || 0) < r.in[k]).map(k => RES[k].n).join(', ');
      return { t: '⏳ Čeká na: ' + miss + ' – přiveď dopravník', c: 'warn' };
    }
    if (b.working) return { t: '⚙️ Pracuje' + (b.house && b.house.hungry ? ' (hladoví – poloviční rychlost)' : '') + (b.bonus > 1 ? ' · ⚡ u vody ×1.5' : ''), c: 'ok' };
    return { t: '💤 Čeká', c: '' };
  }
  function progOf(b) {
    if (b.site) { let h = 0, n = 0; for (const k in b.site.need) { h += Math.min(b.site.have[k] || 0, b.site.need[k]); n += b.site.need[k]; } return n ? h / n : 0; }
    return b.working && B[b.type].rec ? clampP(b.t / B[b.type].rec.t) : 0;
  }
  const MODE_TXT = { scare: 'zahání vlky', kill: 'střílí vlky', water: 'hasí požáry' };
  function popHTML(b) {
    const d = B[b.type], r = d.rec;
    const name = (b.type === 'conveyor' ? (b.bridge ? 'Most' : 'Dopravník') : d.n) + (b.up > 1 ? ' ' + '★'.repeat(b.up - 1) : '');
    const thumb = b.type === 'conveyor' ? A.thumbs.conveyor : A.thumbs[b.type];
    let h = `<div class="ph"><img class="th" src="${thumb}" alt=""><b>${name}</b><button class="x" data-a="pclose">✕</button></div>`;
    if (b.site) {
      const keys = Object.keys(b.site.need);
      h += `<div class="pd">${b.site.up ? '⬆ Vylepšení na stupeň ' + (b.up + 1) : '🏗 Staveniště'} – dostaví se, až sem pásem dovezeš materiál.</div>`;
      h += '<div class="pflow">' + keys.map(k => `<span class="fi">${ico(k)} <b>${b.site.have[k] || 0}/${b.site.need[k]}</b></span>`).join(' ') + '</div>';
      h += '<div class="pb"><i id="pbfill"></i></div><div class="pstat warn">⏳ Čeká na materiál – veď sem dopravník</div>';
      if (!d.proj) h += '<div class="pbtns"><button class="act" data-a="pdemo">🗑 Zrušit</button></div>';
      else h += `<div class="muted" style="margin-top:4px">${d.desc}</div>`;
      return h;
    }
    h += `<div class="pd">${b.type === 'conveyor' ? 'Veze zboží ve směru šipky.' : d.desc}</div>`;
    if (b.fire > 0) h += '<div class="pstat bad">🔥 Hoří! Klepej na budovu a hasíš ji, nebo postav studnu.</div>';
    else if (b.broken) h += `<div class="pstat bad">🔧 Poškozeno – nefunguje. Oprava: ${costTxt(repairCost(b))}</div>`;
    if (r) {
      const ins = r.in ? Object.keys(r.in).map(k => `<span class="fi">${ico(k)} <b>${b.inv[k] || 0}/${r.in[k]}</b></span>`).join(' + ') : '<span class="fi">⛏ žádné vstupy</span>';
      h += `<div class="pflow">${ins}<span class="arrow">➜</span><span class="fi">${ico(r.out)} <b>×1</b></span><span class="muted">za ${(r.t / (b.bonus * (1 + 0.35 * (b.up - 1)) * (cnt.village ? 1.2 : 1))).toFixed(1)} s</span></div>`;
      h += `<div class="pb"><i id="pbfill"></i></div>`;
      const st = status(b); if (st && !b.broken) h += `<div class="pstat ${st.c}">${st.t}</div>`;
      if (b.out.length) h += `<div class="muted">Hotové čeká: ${b.out.map(k => ico(k)).join('')}</div>`;
      if (d.work && b.house) h += `<div class="muted">👷 Pracuje z chaloupky (${Math.max(Math.abs(b.house.x - b.x), Math.abs(b.house.y - b.y))} polí)</div>`;
    } else if (b.type === 'house') {
      h += `<div class="pflow"><span class="fi">👷 <b>${b.used}/${HOUSE_SLOTS + b.up - 1}</b> dělníků</span>` + (lvl >= FOOD_LVL ? `<span class="fi">${ico('bread')}${ico('fish')}${ico('meat')} <b>${b.food}/3</b></span>` : '') + '</div>';
      h += lvl >= FOOD_LVL ? `<div class="pstat ${b.hungry ? 'bad' : 'ok'}">${b.hungry ? '😟 Hladoví! Dovez chléb, ryby nebo zvěřinu – dělníci pracují pomalu' : '😊 Sytí. Jí 1 jídlo za 30 s'}</div>` : `<div class="muted">Dosah: ${WORK_RANGE + b.up - 1} polí (zvýrazněno na mapě)</div>`;
    } else if (d.kind === 'sink') {
      h += `<div class="pstat ok">Zásoby: ${RES_KEYS.filter(k => stock[k]).map(k => ico(k) + ' ' + stock[k]).join('  ') || 'prázdné'}</div><div class="muted">Kapacita každé suroviny: ${capStock}</div>`;
    } else if (b.type === 'conveyor') {
      const t = cell(b.x + DX[b.dir], b.y + DY[b.dir]);
      h += `<div class="pflow"><span class="fi">${b.item ? ico(b.item) + ' veze' : 'prázdný'}</span><span class="arrow">➜</span><span class="fi">${t ? (t.type === 'conveyor' ? 'další pás' : B[t.type].n) : '❌ nic'}</span></div>`;
      if (!t) h += '<div class="pstat bad">Pás nikam nevede – natoč ho k budově</div>';
      else if (b.item && b.p >= 1) h += `<div class="pstat warn">⏳ Čeká, až příjemce ${RES[b.item].n.toLowerCase()} převezme</div>`;
    } else if (b.type === 'splitter') {
      h += `<div class="pstat ${b.buf ? 'warn' : ''}">${b.buf ? 'Drží: ' + RES[b.buf].n : 'Čeká na zboží'}</div>`;
    } else if (b.type === 'port') {
      h += '<div class="pstat ok">💰 Vykupuje zboží – vez sem přebytky (2 kusy = 1 zlato)</div>';
    } else if (b.type === 'village') h += '<div class="pstat ok">⚡ Všechny budovy pracují o 20 % rychleji</div>';
    if (d.range) h += `<div class="muted">🛡 ${MODE_TXT[d.mode]}, dosah ${d.range + (b.up - 1) * 1.5} polí${d.work && !b.house ? ' – <b>chybí pracovník!</b>' : ''}</div>`;
    const up = upgradeCost(b);
    h += '<div class="pbtns">' + (b.type === 'conveyor' ? '<button class="act sec" data-a="protate">🔄 Otočit</button>' : '') +
      (b.broken ? '<button class="act ok" data-a="prepair">🔧 Opravit</button>' : '') + (up ? '<button class="act ok" data-a="pup">⬆ Vylepšit</button>' : '') +
      (b.type !== 'hall' && !d.proj ? '<button class="act" data-a="pdemo">🗑 Zbourat</button>' : '') + '</div>';
    if (up) h += `<div class="muted" style="margin-top:4px">Vylepšení na stupeň ${b.up + 1}: ${costTxt(up)} dovezeš pásem. Rychlejší, odolnější a hezčí.</div>`;
    return h;
  }
  function updatePopup() {
    if (!sel) { popEl.classList.remove('show'); popB = null; return; }
    const html = popHTML(sel);
    if (html !== popKey || popB !== sel) { popEl.innerHTML = html + '<div class="tail"></div>'; popKey = html; popB = sel; popFill = $('pbfill'); }
    popEl.classList.add('show');
    if (popFill) popFill.style.width = Math.round(progOf(sel) * 100) + '%';
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
    if (a.dataset.a === 'prepair') { repair(sel); updateHUD(); }
    if (a.dataset.a === 'pup') startUpgrade(sel);
  });

  function helpHTML() {
    return '<h2>🌿 Zelené Údolí</h2>' +
      '<p>Vybuduj z malé osady prosperující údolí. Splňuj <b>levely</b> – odemykají <b>nové budovy</b>. Šedé zamlžené oblasti jsou neprozkoumané. Mlhu rozptýlíš <b>Průzkumnou chatou</b> a sám si vybereš, kam se vydáš.</p>' +
      '<p>🚚 Budovy samy zboží nepřenášejí: vyráběj <b>dopravníky</b> (táhni prstem) a vozi suroviny do Radnice nebo do dalších budov. Víc surovin = musíš je dovézt na jedno místo.</p>' +
      '<p>🏠 Dělníci bydlí v chaloupkách do 6 polí od práce. Přes řeky vedou <b>mosty</b>, lesy a skály musíš obejít. Klepnutím na budovu vidíš, co dělá a co jí chybí.</p>';
  }
  function seedFromText(t) {
    t = (t || '').trim();
    if (!t) return 100000 + Math.floor(Math.random() * 900000);
    if (/^\d+$/.test(t)) return (parseInt(t, 10) % 2000000000) || 1;
    let h = 7; for (const ch of t) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    return Math.abs(h) || 1;
  }
  function startNew(seed, openAll) {
    SEED = seed; setSalt(); genTerrain();
    for (const k in PROJ_POS) delete PROJ_POS[k];
    placeProjects(); newState(); if (openAll) opened.fill(true); initFog(true); tool = null; sel = null; startCam(); save(); updateHUD(); tutTick(); showSheet();
    toast(seed ? '🎲 Nová náhodná mapa (seed ' + seed + ')' : '🏞 Nová hra: pevné Údolí', 2800);
  }
  function ago() { if (!lastSaveAt) return 'právě teď'; const s2 = Math.round((Date.now() - lastSaveAt) / 1000); return s2 < 5 ? 'právě teď' : s2 < 90 ? 'před ' + s2 + ' s' : 'před ' + Math.round(s2 / 60) + ' min'; }
  function showMenu() {
    save();
    showModal(helpHTML() + `<div class="unlock">🗺️ Mapa: <b>${SEED ? 'náhodná (seed ' + SEED + ')' : 'Údolí (pevná)'}</b><br>💾 Hra se ukládá sama v tomto prohlížeči (naposledy ${ago()}). Pro zálohu nebo přenos na jiný telefon použij <b>Export</b>.</div>`, [
      { label: 'Hrát' },
      { label: '💾 Uložit', cls: 'sec', fn: () => { save(); toast('💾 Uloženo', 1400); } },
      { label: '📊 Statistiky', cls: 'sec', fn: () => setTimeout(showStats, 50) },
      { label: '📤 Export', cls: 'sec', fn: () => setTimeout(showExport, 50) },
      { label: '📥 Import', cls: 'sec', fn: () => setTimeout(showImport, 50) },
      { label: '🆕 Nová hra', cls: 'danger', fn: () => setTimeout(showNewGame, 50) },
    ]);
  }
  function showExport() {
    const code = exportCode();
    showModal('<h2>📤 Export postupu</h2><p>Zkopíruj kód nebo stáhni soubor. Na jiném zařízení ho vložíš přes Import.</p><textarea readonly id="expTa">' + code + '</textarea>', [
      { label: '📋 Zkopírovat', fn: () => { try { navigator.clipboard.writeText(code).then(() => toast('📋 Zkopírováno', 1400), () => toast('Zkopíruj ručně z okna', 2000)); } catch (e) { toast('Zkopíruj ručně z okna', 2000); } } },
      { label: '⬇ Soubor', cls: 'sec', fn: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = 'zelene-udoli-postup.txt'; document.body.appendChild(a); a.click(); a.remove(); } },
      { label: 'Zavřít', cls: 'sec' },
    ]);
  }
  function showImport() {
    showModal('<h2>📥 Import postupu</h2><p>Vlož kód z exportu nebo vyber soubor. <b>Přepíše současný postup.</b></p><textarea id="impTa" placeholder="Sem vlož kód…"></textarea><input type="file" id="impFile" accept=".txt,.json,text/plain">', [
      { label: 'Načíst', fn: () => {
        const done = txt => { if (importCode(txt)) { toast('✅ Načteno', 1200); setTimeout(() => location.reload(), 350); } else toast('❌ Neplatný kód', 2400); };
        const f = $('impFile').files[0];
        if (f) { const rd = new FileReader(); rd.onload = () => done(String(rd.result)); rd.readAsText(f); } else done($('impTa').value);
      } },
      { label: 'Zpět', cls: 'sec' },
    ]);
  }
  function showNewGame() {
    showModal('<h2>🆕 Nová hra</h2><p>Současný postup se smaže (nejdřív si ho můžeš exportovat).</p><p>Náhodná mapa: seed může být číslo nebo slovo, stejný seed dá stejnou mapu. Nech prázdné pro náhodný.</p><input id="seedIn" class="seedin" placeholder="Seed (nepovinné)"><label class="chk"><input type="checkbox" id="openAll"> Odkrýt celou mapu (bez mlhy)</label>', [
      { label: '🎲 Náhodná mapa', fn: () => startNew(seedFromText($('seedIn').value), $('openAll').checked) },
      { label: '🏞 Údolí (pevná)', cls: 'sec', fn: () => startNew(0, $('openAll').checked) },
      { label: 'Zpět', cls: 'sec' },
    ]);
  }
  function showStats() {
    const cur = [clock, stat.prod, stat.cons], old = snaps.length ? snaps[0] : [clock - 1, {}, {}], dtm = Math.max(5, cur[0] - old[0]) / 60;
    let rows = '';
    for (const k of RES_KEYS) {
      const p = stat.prod[k] || 0, c = stat.cons[k] || 0, dl = delivered[k] || 0;
      if (!p && !c && !dl && !stock[k]) continue;
      const pr = ((p - (old[1][k] || 0)) / dtm).toFixed(0), cr = ((c - (old[2][k] || 0)) / dtm).toFixed(0);
      rows += `<div class="srow2">${ico(k)} <b>${RES[k].n}</b><span>vyrobeno ${p} (${pr}/min) · spotřeba ${cr}/min · ve skladu ${stock[k]}</span></div>`;
    }
    const probs = [];
    for (const b of blds) {
      const nm = B[b.type].n;
      if (!regionOpen(b.x, b.y)) continue;
      if (b.fire > 0) probs.push([b, '🔥 hoří']);
      else if (b.broken) probs.push([b, '🔧 poškozeno']);
      else if (b.site) probs.push([b, '🏗 čeká na: ' + Object.keys(b.site.need).filter(k => (b.site.have[k] || 0) < b.site.need[k]).map(k => RES[k].n + ' ' + (b.site.need[k] - (b.site.have[k] || 0))).join(', ')]);
      else if (b.state === 'nowork') probs.push([b, '👷 bez pracovníka']);
      else if (b.state === 'blocked') probs.push([b, '📦 plný výstup – není kam']);
      else if (b.state === 'input') probs.push([b, '⏳ čeká na ' + (b.need ? RES[b.need].n : 'vstup')]);
      else if (b.type === 'house' && b.hungry) probs.push([b, '😟 hladoví']);
      void nm;
    }
    const pl = probs.slice(0, 14).map(([b, t]) => `<div class="srow2 fly" data-fly="${b.x},${b.y}"><b>${B[b.type].n}</b><span>${t} · klepni pro zobrazení</span></div>`).join('');
    showModal('<h2>📊 Statistiky</h2><div class="slist">' + (rows || '<p>Zatím nic nevyrábíš.</p>') + '</div><h3>Kde se zasekává</h3><div class="slist">' + (pl || '<p>✅ Všechno běží.</p>') + (probs.length > 14 ? '<p>…a dalších ' + (probs.length - 14) + '</p>' : '') + '</div>', [{ label: 'Zavřít' }]);
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
    if (b && b.fire > 0 && !tool) { b.fire = Math.max(0, b.fire - 0.2); popups.push({ x: tx * T + T / 2, y: ty * T, t: 0, txt: '💧' }); sel = b; return; }
    if (tool === 'conveyor' && b && b.type === 'conveyor') { b.dir = (b.dir + 1) & 3; rot = b.dir; return; }
    if (b && tool !== 'erase') { tool = null; sel = b; refreshPalette(); showSheet(); return; }
    if (tool && tool !== 'erase' && tool !== 'conveyor') { if (place(tool, tx, ty)) { updateHUD(); showSheet(); } return; }
    if (!regionOpen(tx, ty)) { toast('🔒 ' + REG_NAMES[regIdxAt(tx, ty)] + ' – postav Průzkumnou chatu do 10 polí'); return; }
    sel = null;
  }
  function initInput() {
    canvas.addEventListener('pointerdown', e => {
      fly = null; canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        downInfo = { t: performance.now() }; moved = 0;
        if (tool === 'conveyor' || tool === 'erase') { painting = true; lastTile = null; curOps = []; const [tx, ty] = toTile(e.clientX, e.clientY); paintStep(tx, ty); }
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
        if (painting) { if (curOps) pushUndo(curOps); curOps = null; updateHUD(); save(); }
        painting = false; lastTile = null; downInfo = null;
      }
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { e.preventDefault(); fly = null; zoomAround(e.clientX, e.clientY, cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); clampCam(); }, { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());
    $('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = '⏩ ' + speed + '×'; };
    $('menuBtn').onclick = showMenu;
    $('repairBtn').onclick = repairAll;
    $('undoBtn').onclick = undo;
    $('sleepBtn').onclick = () => { if (phase() < 0.55) { toast('Spát se dá až k večeru', 1500); return; } sleeping = true; sel = null; toast('💤 Spíš do rána…', 1800); };
    window.addEventListener('resize', () => { resize(); clampCam(); });
  }

  // ---------- Ukládání ----------
  function saveData() {
    return {
      v: 3, seed: SEED, opened, lvl, stock, delivered, base, won, tut, clock, t: Date.now(),
      b: blds.filter(b => b.type !== 'hall' && !B[b.type].proj).map(b => [b.type, b.x, b.y, b.dir, b.bridge ? 1 : 0, b.up, b.site ? b.site.have : null, b.site && b.site.up ? 1 : 0, b.site ? b.site.need : null]),
      pj: blds.filter(b => B[b.type].proj).map(b => [b.type, b.site ? b.site.have : null]),
    };
  }
  function save() {
    if (noSave) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData())); lastSaveAt = Date.now(); } catch (e) { /* nic */ }
  }
  const exportCode = () => btoa(unescape(encodeURIComponent(JSON.stringify(saveData()))));
  function importCode(str) {
    try {
      str = (str || '').trim(); let j;
      try { j = JSON.parse(str); } catch (e) { j = JSON.parse(decodeURIComponent(escape(atob(str)))); }
      if (typeof j.lvl !== 'number' || !Array.isArray(j.b)) return false;
      noSave = true; localStorage.setItem(SAVE_KEY, JSON.stringify(j)); return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      newState();
      opened = Array.isArray(d.opened) && d.opened.length === 9 ? d.opened.map(Boolean) : opened.map((_, i) => i < clamp(d.lvl | 0, 1, 9));
      opened[0] = true;
      lvl = clamp(d.lvl | 0, 1, 9); won = !!d.won; tut = d.tut || { on: false, step: 0 }; clock = d.clock || 20;
      for (const k of RES_KEYS) { stock[k] = (d.stock && d.stock[k]) || 0; delivered[k] = (d.delivered && d.delivered[k]) || 0; base[k] = (d.base && d.base[k]) || 0; }
      for (const [type, x, y, dir, br, up, have, sup, need] of d.b || []) {
        if (B[type] && !B[type].proj && inb(x, y) && !cell(x, y)) {
          const b = makeB(type, x, y, dir); b.bridge = !!br; b.up = up || 1;
          if (have) b.site = sup ? { need: Object.assign({}, UPG[b.up + 1] || { plank: 6 }), have, up: true } : { need: Object.assign({}, need || B[type].cost), have };
          addB(b);
        }
      }
      for (const [type, have] of d.pj || []) { const b = blds.find(q => q.type === type); if (b) b.site = have ? { need: Object.assign({}, B[type].cost), have } : null; }
      recalc();
      const away = Math.min(900, (Date.now() - (d.t || Date.now())) / 1000);
      if (away > 20) { quiet = true; for (let i = 0; i < away; i++) update(1); quiet = false; wolves.length = 0; return 'away'; }
      return true;
    } catch (e) { return false; }
  }
  function initFog(instant) { if (instant) for (let i = 0; i < 9; i++) fog[i] = opened[i] ? 0 : 1; }
  function startCam() { cam.z = clamp(vw / (8.5 * T), 0.6, 1.5); centerOn((HALL_X + 1) * T, (HALL_Y + 1.2) * T); }

  // ---------- Smyčka ----------
  let prev = 0, hudT = 0, saveT = 0, goalT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    const steps = sleeping ? 10 : speed;
    for (let s = 0; s < steps; s++) update(dt);
    if (sleeping && phase() < 0.5) { sleeping = false; toast('☀️ Dobré ráno!', 1800); }
    for (let i = 0; i < 9; i++) { const target = opened[i] ? 0 : 1; fog[i] += clamp(target - fog[i], -dt * 0.7, dt * 0.7); }
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
    try { const raw0 = localStorage.getItem(SAVE_KEY); if (raw0) SEED = JSON.parse(raw0).seed | 0; } catch (e) { /* nic */ }
    setSalt(); genTerrain(); placeProjects();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* nic */ }
    $('modalBox').addEventListener('click', e => { const r = e.target.closest('[data-fly]'); if (!r) return; const [fx, fy] = r.dataset.fly.split(',').map(Number); $('modal').classList.remove('show'); modalOpen = false; flyTo((fx + 0.5) * T, (fy + 0.5) * T); });
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
    give: (k, n) => { stock[k] += n; }, setLvl: n => { lvl = n; for (let i = 0; i < Math.min(9, n); i++) opened[i] = true; recalc(); }, opened: () => opened, openRegion, scoutCost, scoutTargets, undo, startNew, exportCode, importCode, stat: () => stat, setTool: t => { tool = t; refreshPalette(); showSheet(); }, select: b => { sel = b; tool = null; refreshPalette(); showSheet(); },
    setSpeed: n => { speed = n; }, recalc, updateHUD, skipTut: () => { tut.on = false; showSheet(); },
    get tgt() { return tutTgt; }, get tpath() { return tutPathTiles; },
    wolves, spawnWolf, breakB, repairAll, startUpgrade, siteCheck, igniteRandom, floodHit, upgradeCost, darkness, phase, setClock: t => { clock = t; }, getClock: () => clock, PROJ_POS, isNight,
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
