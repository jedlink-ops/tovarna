'use strict';
(() => {
  // =====================================================================
  //  ZELENÉ ÚDOLÍ – útulná budovatelská hra
  // =====================================================================
  const W = 48, H = 48, T = 48, RS = 16;            // mapa 48×48 dlaždic, 3×3 oblasti po 16
  const SAVE_KEY = 'zelene-udoli-v1';
  const $ = id => document.getElementById(id);
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  // ---------- Suroviny ----------
  const RES = {
    wood: { e: '🪵', n: 'Dřevo' }, stone: { e: '🪨', n: 'Kámen' }, plank: { e: '🟫', n: 'Prkna' },
    wheat: { e: '🌾', n: 'Pšenice' }, bread: { e: '🍞', n: 'Chléb' }, fish: { e: '🐟', n: 'Ryby' },
    ironOre: { e: '🟠', n: 'Ruda' }, iron: { e: '🔩', n: 'Železo' }, tool: { e: '🔨', n: 'Nářadí' },
    gold: { e: '🪙', n: 'Zlato' }, jewel: { e: '💎', n: 'Klenoty' },
  };
  const RES_KEYS = Object.keys(RES);

  // ---------- Budovy ----------
  // on: kam se smí stavět (build = tráva/písek, forest, rock, ore, gold, shore = u vody)
  const B = {
    lumber:   { n: 'Dřevorubec', e: '🪓', shape: 'hut', wall: '#b98a56', roof: '#6b4a2b', on: 'forest', work: 1, cost: { wood: 5 },
                rec: { out: 'wood', t: 3 }, desc: 'Kácí les a vyrábí dřevo.', hint: 'Staví se na les.' },
    quarry:   { n: 'Lom', e: '⛏️', shape: 'mound', on: 'rock', work: 1, cost: { wood: 8 },
                rec: { out: 'stone', t: 3.5 }, desc: 'Láme kámen ze skal.', hint: 'Staví se na skálu.' },
    house:    { n: 'Chaloupka', e: '🏠', shape: 'hut', wall: '#f3e4c4', roof: '#c8553d', on: 'build', work: 0, cost: { wood: 12, stone: 4 },
                smoke: true, desc: 'Domov pro 4 obyvatele. Víc lidí = víc pracovníků.', hint: 'Staví se na trávu.' },
    sawmill:  { n: 'Pila', e: '🪚', shape: 'hut', wall: '#c9a36a', roof: '#8a5a34', on: 'build', work: 1, cost: { wood: 15, stone: 6 },
                rec: { in: { wood: 2 }, out: 'plank', t: 4 }, desc: 'Z klád dělá prkna.', hint: 'Staví se na trávu.' },
    well:     { n: 'Studna', e: '💧', shape: 'well', on: 'build', work: 0, cost: { stone: 10, wood: 5 },
                desc: 'Zrychlí všechny sousední budovy o 50 % (max. 2 studny).', hint: 'Dej ji doprostřed budov – ovlivní 8 okolních polí.' },
    warehouse:{ n: 'Sklad', e: '📦', shape: 'barn', wall: '#b07a4a', roof: '#7a3f2a', on: 'build', work: 0, cost: { wood: 25, stone: 10 },
                desc: 'Zvětší místo pro každou surovinu o 100.', hint: 'Staví se na trávu.' },
    farm:     { n: 'Pole', e: '🌾', shape: 'field', on: 'build', work: 1, cost: { wood: 12, plank: 4 },
                rec: { out: 'wheat', t: 4 }, desc: 'Pěstuje pšenici. U vody roste o 50 % rychleji.', hint: 'Staví se na trávu, nejlépe u vody.' },
    bakery:   { n: 'Pekárna', e: '🥖', shape: 'hut', wall: '#f0d9b5', roof: '#d98b3a', on: 'build', work: 1, cost: { wood: 15, stone: 12, plank: 6 },
                smoke: true, rec: { in: { wheat: 2 }, out: 'bread', t: 5 }, desc: 'Ze 2 pšenic upeče chléb.', hint: 'Staví se na trávu.' },
    fisher:   { n: 'Rybář', e: '🎣', shape: 'hut', wall: '#a8cfe0', roof: '#3f7ea6', on: 'shore', work: 1, cost: { wood: 10, plank: 4 },
                rec: { out: 'fish', t: 4 }, desc: 'Loví ryby pro hladové krky.', hint: 'Staví se na břehu vedle vody.' },
    mine:     { n: 'Důl', e: '⛏️', shape: 'mound', on: 'ore', work: 1, cost: { wood: 15, plank: 8, stone: 10 },
                rec: { out: 'ironOre', t: 4 }, desc: 'Těží železnou rudu.', hint: 'Staví se na rudné ložisko (rezavé skály).' },
    forge:    { n: 'Kovárna', e: '🔥', shape: 'hut', wall: '#8d8f94', roof: '#4a4d55', on: 'build', work: 1, cost: { stone: 25, plank: 8 },
                smoke: true, rec: { in: { ironOre: 2, wood: 1 }, out: 'iron', t: 6 }, desc: 'Z 2 rud a 1 dřeva vytaví železo.', hint: 'Staví se na trávu.' },
    workshop: { n: 'Dílna', e: '🔨', shape: 'hut', wall: '#d2b48c', roof: '#2f6d62', on: 'build', work: 1, cost: { plank: 20, stone: 20, iron: 5 },
                rec: { in: { iron: 1, plank: 1 }, out: 'tool', t: 8 }, desc: 'Z železa a prken dělá nářadí.', hint: 'Staví se na trávu.' },
    goldmine: { n: 'Zlatý důl', e: '🪙', shape: 'mound', on: 'gold', work: 1, cost: { plank: 20, iron: 8, tool: 2 },
                rec: { out: 'gold', t: 6 }, desc: 'Těží zlato.', hint: 'Staví se na zlatou žílu (žlutě se třpytí).' },
    jeweler:  { n: 'Klenotník', e: '💎', shape: 'hut', wall: '#e8e0f0', roof: '#7b4fa8', on: 'build', work: 1, cost: { stone: 30, plank: 20, iron: 6 },
                rec: { in: { gold: 1, iron: 1 }, out: 'jewel', t: 10 }, desc: 'Ze zlata a železa vyrábí klenoty.', hint: 'Staví se na trávu.' },
    monument: { n: 'Velký chrám', e: '⛪', shape: 'monument', on: 'build', work: 0, cost: { stone: 400, plank: 150, iron: 80, jewel: 20, tool: 20 },
                desc: 'Dílo celého údolí. Postav ho a vyhráváš!', hint: 'Staví se na trávu. Potřebuje velký sklad (3+ sklady).' },
  };
  const B_ORDER = ['lumber', 'quarry', 'house', 'sawmill', 'well', 'warehouse', 'farm', 'bakery', 'fisher', 'mine', 'forge', 'workshop', 'goldmine', 'jeweler', 'monument'];
  const UNLOCK_AT = { lumber: 1, quarry: 1, house: 1, sawmill: 2, well: 2, warehouse: 2, farm: 3, bakery: 3, fisher: 3, mine: 4, forge: 4, workshop: 5, goldmine: 6, jeweler: 6, monument: 9 };

  // ---------- Levely ----------
  const LEVELS = [
    { name: 'Osada', goals: [{ k: 'prod', r: 'wood', n: 25 }, { k: 'prod', r: 'stone', n: 15 }, { k: 'build', b: 'house', n: 2 }], bonus: { wood: 20, stone: 10 } },
    { name: 'Řemeslníci', goals: [{ k: 'prod', r: 'plank', n: 20 }, { k: 'build', b: 'well', n: 1 }, { k: 'build', b: 'warehouse', n: 1 }], bonus: { bread: 14, plank: 8 } },
    { name: 'Úroda', goals: [{ k: 'prod', r: 'wheat', n: 25 }, { k: 'prod', r: 'bread', n: 12 }, { k: 'pop', n: 12 }], bonus: { wood: 30, plank: 15, stone: 20 } },
    { name: 'Železná doba', goals: [{ k: 'prod', r: 'ironOre', n: 24 }, { k: 'prod', r: 'iron', n: 12 }, { k: 'prod', r: 'fish', n: 10 }], bonus: { plank: 20, iron: 5 } },
    { name: 'Dílny', goals: [{ k: 'prod', r: 'tool', n: 6 }, { k: 'build', b: 'workshop', n: 1 }, { k: 'pop', n: 20 }], bonus: { plank: 30, iron: 10, stone: 30 } },
    { name: 'Zlatá horečka', goals: [{ k: 'prod', r: 'gold', n: 12 }, { k: 'prod', r: 'jewel', n: 4 }, { k: 'build', b: 'warehouse', n: 3 }], bonus: { plank: 40, iron: 20 } },
    { name: 'Bohatství', goals: [{ k: 'prod', r: 'plank', n: 80 }, { k: 'prod', r: 'iron', n: 40 }, { k: 'prod', r: 'bread', n: 60 }], bonus: { stone: 80, tool: 6 } },
    { name: 'Metropole', goals: [{ k: 'prod', r: 'tool', n: 20 }, { k: 'prod', r: 'jewel', n: 12 }, { k: 'pop', n: 40 }], bonus: { stone: 120, plank: 60, iron: 30, jewel: 4 } },
    { name: 'Velký chrám', goals: [{ k: 'build', b: 'monument', n: 1 }], bonus: {} },
  ];

  // ---------- Oblasti mapy (3×3) ----------
  const ORDER = [[1, 1], [1, 0], [2, 1], [1, 2], [0, 1], [2, 0], [2, 2], [0, 2], [0, 0]];
  const REG_NAMES = ['Střed údolí', 'Sever', 'Východ', 'Jih', 'Západ', 'Severovýchod', 'Jihovýchod', 'Jihozápad', 'Severozápad'];
  const REG_IDX = new Array(9);
  ORDER.forEach(([rx, ry], i) => { REG_IDX[ry * 3 + rx] = i; });
  const regIdxAt = (x, y) => REG_IDX[Math.floor(y / RS) * 3 + Math.floor(x / RS)];

  // ---------- Terén ----------
  const G = 0, FOREST = 1, ROCK = 2, WATER = 3, ORE = 4, GOLD = 5, SAND = 6;
  const terrain = new Uint8Array(W * H);
  let grid = new Array(W * H).fill(null);
  let blds = [];

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cell = (x, y) => (inb(x, y) ? grid[y * W + x] : null);
  const tAt = (x, y) => (inb(x, y) ? terrain[y * W + x] : -1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function blob(cx, cy, r, t) {
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) {
      for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        if (!inb(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d < r * (0.7 + 0.5 * hash(x * 3 + Math.floor(cx), y * 5 + Math.floor(cy)))) terrain[y * W + x] = t;
      }
    }
  }
  function genTerrain() {
    terrain.fill(G);
    const F = (x, y, r) => blob(x, y, r, FOREST), R = (x, y, r) => blob(x, y, r, ROCK), O = (x, y, r) => blob(x, y, r, ORE),
          GD = (x, y, r) => blob(x, y, r, GOLD), WA = (x, y, r) => blob(x, y, r, WATER);
    // střed údolí (začátek)
    F(21, 20, 2.8); F(28, 22, 2.4); F(20, 27, 2.4); R(28, 27, 2.2); R(19, 23, 1.6); WA(24, 30, 2.2);
    // sever
    F(20, 6, 4); F(27, 9, 3.5); F(18, 12, 3); R(29, 13, 2.5); WA(24, 4, 3.5); WA(27, 5, 2.5);
    // východ
    O(38, 22, 3.2); O(43, 27, 2.8); R(36, 28, 3); F(34, 19, 3); F(44, 19, 3); WA(41, 17, 2);
    // jih
    F(29, 36, 3); F(17, 34, 2.5); R(25, 35, 2); WA(20, 41, 3); WA(23, 43, 3); WA(27, 45, 2.5);
    // západ
    R(6, 22, 3.5); O(10, 26, 3); O(4, 28, 2.5); F(12, 19, 3); F(3, 18, 2.5); WA(8, 30, 2);
    // severovýchod
    GD(40, 6, 2.6); GD(44, 11, 2); R(36, 10, 3); F(35, 4, 3); WA(45, 4, 3); O(38, 13, 2.5);
    // jihovýchod
    GD(42, 42, 2.6); GD(36, 38, 2); F(44, 35, 3); WA(34, 44, 3.5); O(40, 36, 3); R(46, 44, 2.5);
    // jihozápad
    GD(6, 42, 2.4); O(10, 38, 3); F(4, 35, 3); F(12, 45, 3); WA(5, 46, 3); R(12, 41, 2.5);
    // severozápad
    GD(6, 5, 2.4); GD(10, 10, 2); F(4, 12, 3); F(12, 3, 3); R(5, 9, 3); WA(12, 8, 3); O(3, 3, 2.5);
    // písek kolem vody
    const mark = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (terrain[y * W + x] !== G) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (tAt(x + dx, y + dy) === WATER) { near = true; break; }
      if (near) mark.push(y * W + x);
    }
    for (const i of mark) terrain[i] = SAND;
  }
  function waterNear(x, y) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tAt(x + dx, y + dy) === WATER) return true;
    return false;
  }

  // ---------- Stav hry ----------
  let stock, produced, base, lvl, pop, won, growT, foodT, hungry;
  let cnt = {}, capPop = 4, capStock = 100, used = 0;
  let tool = null, sel = null, speed = 1, modalOpen = false, quiet = false;
  const fog = new Array(9).fill(1);
  const cam = { x: 0, y: 0, z: 1 };
  let fly = null;
  const popups = [], puffs = [], confetti = [];

  function newState() {
    stock = {}; produced = {}; base = {};
    for (const k of RES_KEYS) { stock[k] = 0; produced[k] = 0; base[k] = 0; }
    stock.wood = 30; stock.stone = 15;
    lvl = 1; pop = 4; won = false; growT = 0; foodT = 0; hungry = false;
    grid = new Array(W * H).fill(null); blds = [];
    recalc();
  }
  const unlockedRegions = () => Math.min(9, lvl);
  const regionOpen = (x, y) => regIdxAt(x, y) < unlockedRegions();

  function makeB(type, x, y) {
    return { type, x, y, working: false, t: 0, state: 'ok', need: null, bonus: 1, smokeT: Math.random() * 2 };
  }
  function recalc() {
    cnt = {};
    for (const b of blds) cnt[b.type] = (cnt[b.type] || 0) + 1;
    capPop = 4 + 4 * (cnt.house || 0);
    capStock = 100 + 100 * (cnt.warehouse || 0);
    used = 0;
    for (const b of blds) if (B[b.type].work) used++;
    for (const b of blds) {
      if (!B[b.type].rec) continue;
      let wells = 0, water = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const n = cell(b.x + dx, b.y + dy);
        if (n && n.type === 'well') wells++;
        if (tAt(b.x + dx, b.y + dy) === WATER) water = true;
      }
      b.bonus = 1 + 0.5 * Math.min(2, wells) + (b.type === 'farm' && water ? 0.5 : 0);
    }
    if (pop > capPop) pop = capPop;
  }

  // ---------- Simulace ----------
  function popup(b, txt) {
    if (quiet) return;
    popups.push({ x: b.x * T + T / 2, y: b.y * T + T * 0.15, t: 0, txt });
  }
  function update(dt) {
    // obyvatelé a hlad
    if (pop < capPop && !hungry) { growT += dt; if (growT >= 3.5) { growT = 0; pop++; } }
    if (lvl >= 3) {
      foodT += dt;
      if (foodT >= (hungry ? 4 : 20)) {
        foodT = 0;
        const need = Math.max(1, Math.ceil(pop / 5));
        let got = 0;
        for (const k of ['bread', 'fish']) { const take = Math.min(stock[k], need - got); stock[k] -= take; got += take; }
        hungry = got < need;
      }
    }
    const eff = used > 0 ? Math.min(1, pop / used) : 1;
    const hungerMul = hungry ? 0.6 : 1;
    for (const b of blds) {
      const d = B[b.type];
      // kouř
      if (!quiet && d.smoke && (b.type === 'house' ? pop > 0 : b.working)) {
        b.smokeT -= dt;
        if (b.smokeT <= 0) { b.smokeT = 0.9 + Math.random() * 0.6; puffs.push({ x: b.x * T + T * 0.62, y: b.y * T + T * 0.18, t: 0 }); }
      }
      const r = d.rec;
      if (!r) continue;
      if (!b.working) {
        let missing = null;
        if (r.in) for (const k in r.in) if (stock[k] < r.in[k]) { missing = k; break; }
        if (missing) { b.state = 'input'; b.need = missing; continue; }
        if (stock[r.out] >= capStock) { b.state = 'full'; continue; }
        if (r.in) for (const k in r.in) stock[k] -= r.in[k];
        b.working = true; b.t = 0;
      }
      b.state = 'ok';
      b.t += dt * b.bonus * eff * hungerMul;
      if (b.t >= r.t) {
        if (stock[r.out] >= capStock) { b.state = 'full'; b.t = r.t; continue; }
        stock[r.out]++; produced[r.out]++;
        b.working = false;
        popup(b, '+1 ' + RES[r.out].e);
      }
    }
    // částice
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.2) popups.splice(i, 1); }
    for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt; if (puffs[i].t > 1.6) puffs.splice(i, 1); }
  }

  // ---------- Stavění ----------
  function validTile(type, x, y) {
    if (!inb(x, y) || cell(x, y)) return false;
    const t = terrain[y * W + x], on = B[type].on;
    switch (on) {
      case 'forest': return t === FOREST;
      case 'rock': return t === ROCK;
      case 'ore': return t === ORE;
      case 'gold': return t === GOLD;
      case 'build': return t === G || t === SAND;
      case 'shore': return (t === G || t === SAND) && waterNear(x, y);
    }
    return false;
  }
  const canAfford = c => Object.keys(c).every(k => stock[k] >= c[k]);
  function costText(c, withHave) {
    return Object.keys(c).map(k => RES[k].e + c[k]).join(' ');
  }
  function place(type, x, y) {
    const d = B[type];
    if (!inb(x, y)) return false;
    if (!regionOpen(x, y)) { toast('🔒 Tahle oblast je zamčená – splň level ' + regIdxAt(x, y)); return false; }
    if (cell(x, y)) return false;
    if (!validTile(type, x, y)) { toast(d.hint || 'Sem to nejde postavit'); return false; }
    if (d.work && used + 1 > pop) { toast('👥 Nemáš volné pracovníky – postav chaloupky a počkej, až se osadníci nastěhují'); return false; }
    if (!canAfford(d.cost)) {
      const miss = Object.keys(d.cost).filter(k => stock[k] < d.cost[k]).map(k => RES[k].e + ' ' + (d.cost[k] - stock[k])).join('  ');
      toast('Chybí ti: ' + miss); return false;
    }
    for (const k in d.cost) stock[k] -= d.cost[k];
    const b = makeB(type, x, y);
    blds.push(b); grid[y * W + x] = b;
    recalc();
    popups.push({ x: x * T + T / 2, y: y * T + T * 0.3, t: 0, txt: d.e });
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* nic */ }
    save();
    return true;
  }
  function demolish(b) {
    const d = B[b.type];
    for (const k in d.cost) stock[k] = Math.min(capStock, stock[k] + Math.floor(d.cost[k] * 0.5));
    blds.splice(blds.indexOf(b), 1); grid[b.y * W + b.x] = null;
    recalc();
    if (sel === b) sel = null;
    save();
  }

  // ---------- Úkoly / levely ----------
  function goalVal(g) {
    if (g.k === 'prod') return produced[g.r] - base[g.r];
    if (g.k === 'build') return cnt[g.b] || 0;
    return pop;
  }
  function checkGoals() {
    if (won || modalOpen) return;
    const L = LEVELS[lvl - 1];
    if (L.goals.every(g => goalVal(g) >= g.n)) completeLevel();
  }
  function completeLevel() {
    const L = LEVELS[lvl - 1];
    if (lvl === LEVELS.length) {
      won = true; save();
      burst();
      showModal('<h2>🏆 Velký chrám stojí!</h2><p>Z malé osady se stalo prosperující údolí. Postavil jsi vše, co jsi měl.</p><p>Můžeš si dál hrát a stavět, jak chceš.</p>',
        [{ label: 'Hrát dál' }]);
      return;
    }
    for (const k in L.bonus) stock[k] = Math.min(capStock, stock[k] + L.bonus[k]);
    const done = lvl;
    lvl++;
    for (const k of RES_KEYS) base[k] = produced[k];
    const newB = B_ORDER.filter(t => UNLOCK_AT[t] === lvl);
    const ri = lvl - 1;
    const [rx, ry] = ORDER[ri];
    const bonus = Object.keys(L.bonus).map(k => RES[k].e + ' ' + L.bonus[k]).join('  ');
    burst();
    save();
    showModal(
      `<h2>⭐ Level ${done} splněn!</h2><p><b>${L.name}</b> je za tebou.</p>` +
      `<div class="unlock">🗺️ Nová oblast: <b>${REG_NAMES[ri]}</b></div>` +
      (newB.length ? `<div class="unlock">🔓 Nové budovy: ${newB.map(t => B[t].e + ' ' + B[t].n).join(', ')}</div>` : '') +
      (bonus ? `<div class="unlock">🎁 Odměna: ${bonus}</div>` : '') +
      (lvl === 3 ? '<p>🍞 Pozor: od teď obyvatelé jedí! Bez chleba nebo ryb přestanou přibývat a pracují pomaleji.</p>' : '') +
      `<p><b>Level ${lvl}: ${LEVELS[lvl - 1].name}</b></p>`,
      [{ label: 'Prozkoumat novou oblast', fn: () => flyTo((rx * RS + RS / 2) * T, (ry * RS + RS / 2) * T) }, { label: 'Dál', cls: 'sec' }]);
  }
  function burst() {
    const cols = ['#f5bd4f', '#7bd88f', '#ff8a7a', '#7ec8ff', '#f4f1e8', '#c59bff'];
    for (let i = 0; i < 90; i++) confetti.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 520, vy: -Math.random() * 520 - 120,
      c: cols[i % cols.length], life: 1.8 + Math.random() * 0.8, t: 0, s: 5 + Math.random() * 5 });
  }

  // ---------- Kamera ----------
  let canvas, ctx, vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
    layoutSheet();
  }
  function clampCam() {
    const pad = 60 / cam.z;
    cam.x = clamp(cam.x, -pad, W * T - vw / cam.z + pad);
    cam.y = clamp(cam.y, -pad, H * T - vh / cam.z + pad);
  }
  function centerOn(wx, wy) { cam.x = wx - vw / cam.z / 2; cam.y = wy - vh / cam.z / 2; clampCam(); }
  function flyTo(wx, wy) { fly = { x: wx - vw / cam.z / 2, y: wy - vh / cam.z / 2 }; }
  function zoomAround(sx, sy, nz) {
    const wx = sx / cam.z + cam.x, wy = sy / cam.z + cam.y;
    cam.z = clamp(nz, 0.45, 2.6);
    cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z;
  }

  // ---------- Kreslení ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function emoji(txt, x, y, size, alpha) {
    ctx.font = size + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.fillText(txt, x, y);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }
  const GRASS = ['#86c96f', '#80c56b', '#8ccd74', '#7bc067'];

  function drawGround(x, y, time) {
    const t = terrain[y * W + x], px = x * T, py = y * T, h = hash(x, y);
    if (t === WATER) {
      ctx.fillStyle = (x + y) & 1 ? '#3c8ed0' : '#3f92d4';
      ctx.fillRect(px, py, T + 1, T + 1);
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const yy = py + T * (0.3 + 0.4 * i), xo = Math.sin(time * 1.4 + x * 1.7 + y * 0.9 + i * 2.4) * 5;
        ctx.beginPath(); ctx.moveTo(px + 10 + xo, yy); ctx.quadraticCurveTo(px + 20 + xo, yy - 3, px + 30 + xo, yy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(214,240,255,.9)';
      if (tAt(x, y - 1) !== WATER) ctx.fillRect(px, py, T, 4);
      if (tAt(x, y + 1) !== WATER) ctx.fillRect(px, py + T - 4, T, 4);
      if (tAt(x - 1, y) !== WATER) ctx.fillRect(px, py, 4, T);
      if (tAt(x + 1, y) !== WATER) ctx.fillRect(px + T - 4, py, 4, T);
      return;
    }
    if (t === SAND) {
      ctx.fillStyle = h > 0.5 ? '#ecdca8' : '#e8d8a2';
      ctx.fillRect(px, py, T + 1, T + 1);
      ctx.fillStyle = 'rgba(150,120,70,.35)';
      if (h > 0.6) ctx.fillRect(px + h * 30 + 4, py + hash(x + 3, y) * 30 + 6, 3, 2);
      return;
    }
    ctx.fillStyle = GRASS[(h * 4) | 0];
    ctx.fillRect(px, py, T + 1, T + 1);
    const h2 = hash(x + 11, y + 5);
    if (h2 > 0.45) {
      ctx.strokeStyle = 'rgba(60,130,60,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const gx = px + 8 + h * 26, gy = py + 14 + h2 * 22;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 6); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 4, gy - 7); ctx.moveTo(gx + 6, gy); ctx.lineTo(gx + 9, gy - 5); ctx.stroke();
    }
    if (hash(x + 2, y + 9) > 0.93 && t === G) {
      ctx.fillStyle = ['#fff6d6', '#ffd95e', '#ff9ab5', '#c6a8ff'][(h * 4) | 0];
      const fx = px + 10 + h2 * 28, fy = py + 10 + h * 28;
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(fx, fy, 1.2, 0, 6.3); ctx.fill();
    }
  }

  function drawTree(bx, by, r, pine, shade) {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(bx, by, r * 0.95, r * 0.34, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(bx - 2.5, by - r * 0.9, 5, r * 0.9);
    if (pine) {
      const cols = ['#2a6b3a', '#2f7a41', '#37894a'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        const w = r * (1.25 - i * 0.22), yy = by - r * (0.7 + i * 0.75);
        ctx.beginPath(); ctx.moveTo(bx - w, yy); ctx.lineTo(bx + w, yy); ctx.lineTo(bx, yy - r * 1.25); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#2e7d3a'; ctx.beginPath(); ctx.arc(bx, by - r * 1.45, r * 1.1, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#3f9a47'; ctx.beginPath(); ctx.arc(bx - r * 0.3, by - r * 1.75, r * 0.8, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#62bb60'; ctx.beginPath(); ctx.arc(bx - r * 0.5, by - r * 1.95, r * 0.38, 0, 6.3); ctx.fill();
    }
  }
  function drawBoulder(bx, by, r, base, hi, dark) {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(bx + 1, by + r * 0.25, r * 1.05, r * 0.4, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(bx, by - r * 0.1, r, r * 0.78, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(bx - r * 0.05, by - r * 0.25, r * 0.92, r * 0.66, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(bx - r * 0.3, by - r * 0.5, r * 0.4, r * 0.24, -0.4, 0, 6.3); ctx.fill();
  }
  const TREE_POS = [[0.26, 0.62], [0.72, 0.56], [0.5, 0.92]];
  const ROCK_POS = [[0.3, 0.66, 0.22], [0.7, 0.58, 0.18], [0.5, 0.88, 0.15]];

  function drawProps(x, y, time, b) {
    const t = terrain[y * W + x], px = x * T, py = y * T;
    if (t === FOREST) {
      if (b) {
        drawTree(px + T * 0.1, py + T * 0.85, T * 0.13, hash(x, y) > 0.5);
        drawTree(px + T * 0.92, py + T * 0.88, T * 0.13, hash(y, x) > 0.5);
      } else {
        for (let i = 0; i < 3; i++) {
          const h = hash(x * 3 + i, y * 7 + i);
          drawTree(px + (TREE_POS[i][0] + (h - 0.5) * 0.1) * T, py + (TREE_POS[i][1]) * T, T * (0.15 + h * 0.04), hash(x + i, y * 2 + i) > 0.45);
        }
      }
    } else if (t === ROCK || t === ORE || t === GOLD) {
      if (b) return;
      for (let i = 0; i < 3; i++) {
        const p = ROCK_POS[i], jx = (hash(x * 5 + i, y * 3 + 1) - 0.5) * 0.22, jy = (hash(x * 2 + 7, y * 9 + i) - 0.5) * 0.14;
        const bx = px + (p[0] + jx) * T, by = py + (p[1] + jy) * T, r = p[2] * T * (0.85 + hash(x + i * 3, y * 4) * 0.4);
        if (t === ROCK) drawBoulder(bx, by, r, '#9aa1a8', '#c9cfd4', '#6f767d');
        else if (t === ORE) {
          drawBoulder(bx, by, r, '#8a7f86', '#b5a9a8', '#5e5359');
          ctx.fillStyle = '#d9743b'; ctx.fillRect(bx - r * 0.1, by - r * 0.5, 3, 3); ctx.fillRect(bx + r * 0.3, by - r * 0.2, 3, 3);
        } else {
          drawBoulder(bx, by, r, '#a79463', '#d9c27c', '#756837');
          const tw = 0.5 + 0.5 * Math.sin(time * 3 + x * 2 + y + i * 1.7);
          ctx.fillStyle = `rgba(255,222,70,${0.55 + 0.4 * tw})`;
          ctx.fillRect(bx - r * 0.2, by - r * 0.6, 4, 4); ctx.fillRect(bx + r * 0.35, by - r * 0.1, 3, 3);
          if (tw > 0.85) { ctx.fillStyle = '#fff'; ctx.fillRect(bx - r * 0.2 + 1, by - r * 0.6 + 1, 2, 2); }
        }
      }
    }
  }

  function badge(cx, cy, e) {
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx, cy, T * 0.15, 0, 6.3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#000'; emoji(e, cx, cy + 1, T * 0.2);
  }
  function shapeHut(d, px, py, cx) {
    const wx = cx - T * 0.3, wy = py + T * 0.46, ww = T * 0.6, wh = T * 0.4;
    ctx.fillStyle = '#7b6a5a'; ctx.fillRect(cx + T * 0.14, py + T * 0.14, T * 0.1, T * 0.24);
    ctx.fillStyle = d.wall; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(wx, wy + wh - 5, ww, 5);
    ctx.fillStyle = '#5a3b22'; ctx.fillRect(cx - T * 0.06, py + T * 0.62, T * 0.12, T * 0.24);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(wx + T * 0.06, wy + T * 0.1, T * 0.1, T * 0.1); ctx.fillRect(wx + ww - T * 0.16, wy + T * 0.1, T * 0.1, T * 0.1);
    ctx.fillStyle = d.roof; ctx.beginPath(); ctx.moveTo(cx - T * 0.4, py + T * 0.52); ctx.lineTo(cx + T * 0.4, py + T * 0.52); ctx.lineTo(cx, py + T * 0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(cx - T * 0.4, py + T * 0.52); ctx.lineTo(cx, py + T * 0.14); ctx.lineTo(cx, py + T * 0.52); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.strokeRect(wx, wy, ww, wh);
  }
  function shapeBarn(d, px, py, cx) {
    ctx.fillStyle = d.wall; ctx.fillRect(cx - T * 0.36, py + T * 0.42, T * 0.72, T * 0.44);
    ctx.fillStyle = d.roof; ctx.beginPath(); ctx.moveTo(cx - T * 0.44, py + T * 0.46); ctx.lineTo(cx - T * 0.3, py + T * 0.18); ctx.lineTo(cx + T * 0.3, py + T * 0.18); ctx.lineTo(cx + T * 0.44, py + T * 0.46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(cx - T * 0.3, py + T * 0.18, T * 0.6, T * 0.08);
    ctx.fillStyle = '#5a3b22'; ctx.fillRect(cx - T * 0.15, py + T * 0.58, T * 0.3, T * 0.28);
    ctx.strokeStyle = '#d9b27c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - T * 0.15, py + T * 0.58); ctx.lineTo(cx + T * 0.15, py + T * 0.86); ctx.moveTo(cx + T * 0.15, py + T * 0.58); ctx.lineTo(cx - T * 0.15, py + T * 0.86); ctx.stroke();
  }
  function shapeField(b, px, py) {
    ctx.fillStyle = '#8a5a36'; rr(px + T * 0.05, py + T * 0.1, T * 0.9, T * 0.8, 6); ctx.fill();
    const p = b.working ? clamp(b.t / B[b.type].rec.t, 0, 1) : 0;
    for (let i = 0; i < 5; i++) {
      const yy = py + T * 0.2 + i * T * 0.14;
      ctx.fillStyle = '#6e4628'; ctx.fillRect(px + T * 0.1, yy + 5, T * 0.8, 2);
      ctx.fillStyle = p > 0.85 ? '#e8c14a' : '#6dbb48';
      for (let x = px + T * 0.14; x < px + T * 0.88; x += 6) ctx.fillRect(x, yy + 5 - (2 + p * 8), 3, 2 + p * 8);
    }
  }
  function shapeWell(px, py, cx) {
    ctx.fillStyle = '#6b5a4a'; ctx.fillRect(cx - T * 0.24, py + T * 0.26, 4, T * 0.34); ctx.fillRect(cx + T * 0.24 - 4, py + T * 0.26, 4, T * 0.34);
    ctx.fillStyle = '#a8a29a'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.66, T * 0.3, T * 0.2, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#4aa3e0'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.64, T * 0.2, T * 0.12, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.moveTo(cx - T * 0.32, py + T * 0.3); ctx.lineTo(cx + T * 0.32, py + T * 0.3); ctx.lineTo(cx, py + T * 0.1); ctx.closePath(); ctx.fill();
  }
  function shapeMound(b, px, py, cx) {
    const col = b.type === 'quarry' ? ['#9aa1a8', '#c9cfd4', '#6f767d'] : b.type === 'mine' ? ['#7a6f78', '#a89ea5', '#51484f'] : ['#b09a5a', '#e0cb82', '#7d6f3b'];
    ctx.fillStyle = col[2]; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.74, T * 0.42, T * 0.27, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.68, T * 0.4, T * 0.27, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(cx - T * 0.14, py + T * 0.52, T * 0.14, T * 0.08, -0.4, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#2b2320'; ctx.beginPath(); ctx.arc(cx, py + T * 0.8, T * 0.16, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - T * 0.17, py + T * 0.8); ctx.lineTo(cx - T * 0.17, py + T * 0.66); ctx.lineTo(cx + T * 0.17, py + T * 0.66); ctx.lineTo(cx + T * 0.17, py + T * 0.8); ctx.stroke();
  }
  function shapeMonument(px, py, cx) {
    ctx.fillStyle = '#b9b2a6'; ctx.fillRect(cx - T * 0.42, py + T * 0.78, T * 0.84, T * 0.1);
    ctx.fillStyle = '#cfc8bb'; ctx.fillRect(cx - T * 0.34, py + T * 0.7, T * 0.68, T * 0.1);
    ctx.fillStyle = '#efe7d6'; ctx.fillRect(cx - T * 0.22, py - T * 0.35, T * 0.44, T * 1.05);
    ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(cx + T * 0.06, py - T * 0.35, T * 0.16, T * 1.05);
    ctx.fillStyle = '#3d6fb0'; ctx.fillRect(cx - T * 0.06, py + T * 0.42, T * 0.12, T * 0.28);
    ctx.fillStyle = '#f5bd4f'; ctx.beginPath(); ctx.moveTo(cx - T * 0.3, py - T * 0.35); ctx.lineTo(cx + T * 0.3, py - T * 0.35); ctx.lineTo(cx, py - T * 0.85); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(cx - 1.5, py - T * 1.05, 3, T * 0.22); ctx.fillRect(cx - T * 0.07, py - T * 0.98, T * 0.14, 3);
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(cx - T * 0.12, py - T * 0.1, T * 0.1, T * 0.16); ctx.fillRect(cx + T * 0.02, py - T * 0.1, T * 0.1, T * 0.16);
  }

  function drawBuilding(b, time) {
    const d = B[b.type], px = b.x * T, py = b.y * T, cx = px + T / 2;
    if (d.shape !== 'field') {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, py + T * 0.88, T * 0.38, T * 0.1, 0, 0, 6.3); ctx.fill();
    }
    switch (d.shape) {
      case 'hut': shapeHut(d, px, py, cx); break;
      case 'barn': shapeBarn(d, px, py, cx); break;
      case 'field': shapeField(b, px, py); break;
      case 'well': shapeWell(px, py, cx); break;
      case 'mound': shapeMound(b, px, py, cx); break;
      case 'monument': shapeMonument(px, py, cx); break;
    }
    if (d.shape !== 'well' && d.shape !== 'monument') badge(cx + T * 0.3, py + T * 0.2, d.e);
    // ukazatele stavu
    if (d.rec) {
      if (b.working) {
        const p = clamp(b.t / d.rec.t, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(cx - T * 0.26, py + T * 0.02, T * 0.52, 6, 3); ctx.fill();
        ctx.fillStyle = '#ffd166'; rr(cx - T * 0.26, py + T * 0.02, Math.max(4, T * 0.52 * p), 6, 3); ctx.fill();
      } else if (b.state === 'input' || b.state === 'full') {
        const bob = Math.sin(time * 5) * 2;
        ctx.fillStyle = 'rgba(30,20,20,.82)'; rr(cx - T * 0.28, py - T * 0.14 + bob, T * 0.56, T * 0.3, 9); ctx.fill();
        ctx.strokeStyle = '#ff8a7a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff';
        emoji(b.state === 'input' ? '❗' : '📦', cx - T * 0.1, py + T * 0.01 + bob, T * 0.17);
        emoji(b.state === 'input' ? RES[b.need].e : '', cx + T * 0.1, py + T * 0.01 + bob, T * 0.17);
      }
    }
  }

  function drawFog(time) {
    for (let i = 0; i < 9; i++) {
      const f = fog[i];
      if (f < 0.01) continue;
      const [rx, ry] = ORDER[i], x0 = rx * RS * T, y0 = ry * RS * T, S = RS * T;
      if (x0 + S < cam.x || y0 + S < cam.y || x0 > cam.x + vw / cam.z || y0 > cam.y + vh / cam.z) continue;
      ctx.fillStyle = `rgba(26,38,60,${0.7 * f})`; ctx.fillRect(x0, y0, S, S);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
      for (let k = 0; k < 14; k++) {
        const cxp = x0 + ((hash(i, k) * S + time * (6 + hash(k, i) * 10)) % (S + 200)) - 100;
        const cyp = y0 + hash(k, i + 9) * S, r = T * (1.3 + hash(i + k, k) * 1.5);
        ctx.fillStyle = `rgba(228,236,248,${0.17 * f})`;
        ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(cxp + r * 0.8, cyp + r * 0.1, r * 0.7, 0, 6.3); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = f;
      ctx.fillStyle = '#fff'; emoji('🔒', x0 + S / 2, y0 + S / 2 - T * 0.5, T * 1.2);
      ctx.font = `800 ${T * 0.42}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,20,34,.85)'; ctx.fillStyle = '#fff';
      ctx.strokeText(REG_NAMES[i], x0 + S / 2, y0 + S / 2 + T * 0.35); ctx.fillText(REG_NAMES[i], x0 + S / 2, y0 + S / 2 + T * 0.35);
      ctx.font = `700 ${T * 0.34}px sans-serif`;
      const label = 'Splň level ' + i;
      ctx.strokeText(label, x0 + S / 2, y0 + S / 2 + T * 0.85); ctx.fillText(label, x0 + S / 2, y0 + S / 2 + T * 0.85);
      ctx.globalAlpha = 1;
    }
  }

  function draw(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b78b5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(W - 1, Math.ceil((cam.x + vw / cam.z) / T)), y1 = Math.min(H - 1, Math.ceil((cam.y + vh / cam.z) / T));
    // okraj mapy (pláž)
    ctx.fillStyle = '#e8d8a2'; ctx.fillRect(-10, -10, W * T + 20, H * T + 20);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawGround(x, y, time);
    // zvýraznění platných polí
    if (tool) {
      const pulse = 0.14 + 0.1 * Math.sin(time * 4);
      ctx.fillStyle = `rgba(255,250,150,${pulse + 0.08})`; ctx.strokeStyle = 'rgba(255,255,200,.55)'; ctx.lineWidth = 1.5;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (regionOpen(x, y) && validTile(tool, x, y)) { ctx.fillRect(x * T + 2, y * T + 2, T - 4, T - 4); ctx.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4); }
      }
    }
    // rekvizity + budovy po řádcích
    for (let y = y0; y <= y1 + 1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inb(x, y)) continue;
        const b = grid[y * W + x];
        drawProps(x, y, time, b);
        if (b) drawBuilding(b, time);
      }
    }
    // dosah studny a výběr
    if (sel) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 5);
      if (sel.type === 'well') {
        ctx.fillStyle = 'rgba(120,200,255,.18)'; ctx.fillRect((sel.x - 1) * T, (sel.y - 1) * T, T * 3, T * 3);
        ctx.strokeStyle = 'rgba(160,220,255,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.strokeRect((sel.x - 1) * T, (sel.y - 1) * T, T * 3, T * 3); ctx.setLineDash([]);
      }
      ctx.strokeStyle = `rgba(255,255,255,${pulse})`; ctx.lineWidth = 3; rr(sel.x * T + 2, sel.y * T + 2, T - 4, T - 4, 8); ctx.stroke();
    }
    // kouř
    for (const p of puffs) {
      const k = p.t / 1.6;
      ctx.fillStyle = `rgba(245,245,245,${0.55 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(p.x + k * 8 + Math.sin(p.t * 3) * 3, p.y - k * T * 0.8, 3 + k * 7, 0, 6.3); ctx.fill();
    }
    drawFog(time);
    // popupy
    for (const p of popups) {
      const k = p.t / 1.2;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `800 ${T * 0.3}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,34,.85)'; ctx.fillStyle = '#fff';
      const yy = p.y - k * T * 0.8;
      ctx.strokeText(p.txt, p.x, yy); ctx.fillText(p.txt, p.x, yy);
      ctx.globalAlpha = 1;
    }
    // konfety (obrazovka)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const c of confetti) { ctx.globalAlpha = clamp(c.life - c.t, 0, 1); ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, c.s, c.s * 0.6); }
    ctx.globalAlpha = 1;
  }

  // ---------- UI ----------
  const resEl = $('res'), lvlHead = $('lvlHead'), goalsEl = $('goals'), levelCard = $('levelCard'), sheet = $('sheet'), palette = $('palette');
  let toastTimer = 0;
  function toast(msg, ms = 2000) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
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
      if (!stock[k] && !produced[k]) continue;
      html += `<span class="pill${stock[k] >= capStock ? ' full' : ''}">${RES[k].e} ${stock[k]}</span>`;
    }
    html += `<span class="pill${hungry ? ' bad' : ''}">${hungry ? '😟' : '👥'} ${pop}/${capPop} <small>🛠 ${used}</small></span>`;
    html += `<span class="pill">📦 <small>${capStock}</small></span>`;
    resEl.innerHTML = html;

    const L = LEVELS[Math.min(lvl, LEVELS.length) - 1];
    lvlHead.innerHTML = `<span class="star">⭐</span> Level ${lvl}: ${L.name}${won ? ' ✅' : ''}<span class="chev">${levelCard.classList.contains('collapsed') ? '▼' : '▲'}</span>`;
    goalsEl.innerHTML = L.goals.map(g => {
      const v = Math.min(goalVal(g), g.n), pct = Math.round(v / g.n * 100);
      const em = g.k === 'prod' ? RES[g.r].e : g.k === 'build' ? B[g.b].e : '👥';
      const lab = g.k === 'prod' ? 'vyrob' : g.k === 'build' ? 'postav' : 'obyvatel';
      return `<span class="goal${v >= g.n ? ' done' : ''}"><i class="fill" style="width:${pct}%"></i><span>${v >= g.n ? '✓' : em} ${em !== '' && v >= g.n ? em + ' ' : ''}${v}/${g.n}</span></span>`;
    }).join('');
    refreshPalette();
  }

  const cards = {};
  function buildPalette() {
    palette.innerHTML = '';
    for (const t of B_ORDER) {
      const d = B[t], el = document.createElement('button');
      el.className = 'card'; el.dataset.t = t;
      el.innerHTML = `<span class="em">${d.e}</span><span class="nm">${d.n}</span><span class="cs"></span>`;
      el.onclick = () => {
        if (lvl < UNLOCK_AT[t]) { toast(`🔒 ${d.n} se odemkne po splnění levelu ${UNLOCK_AT[t] - 1}`); return; }
        sel = null; tool = tool === t ? null : t;
        refreshPalette(); showSheet();
      };
      palette.appendChild(el); cards[t] = el;
    }
  }
  function refreshPalette() {
    for (const t of B_ORDER) {
      const el = cards[t], locked = lvl < UNLOCK_AT[t];
      el.classList.toggle('locked', locked);
      el.classList.toggle('sel', tool === t);
      el.classList.toggle('poor', !locked && !canAfford(B[t].cost));
      el.querySelector('.cs').textContent = locked ? '🔒 Lv ' + (UNLOCK_AT[t] - 1) : costText(B[t].cost);
    }
  }
  function layoutSheet() { sheet.style.bottom = (palette.offsetHeight + 8) + 'px'; }
  function chips(c) { return Object.keys(c).map(k => `<span class="chip${stock[k] < c[k] ? ' poor' : ''}">${RES[k].e} ${c[k]}</span>`).join(''); }
  let lastSheet = '';
  function setSheet(html) { if (html !== lastSheet) { sheet.innerHTML = html; lastSheet = html; } }
  function showSheet() {
    if (tool) {
      const d = B[tool];
      setSheet(`<h3>${d.e} ${d.n}<button class="x" data-a="close">✕</button></h3><div>${d.desc}</div><div class="muted">${d.hint}${d.work ? ' · potřebuje 1 pracovníka' : ''}</div><div style="margin-top:6px">${chips(d.cost)}</div>`);
    } else if (sel) {
      const d = B[sel.type], r = d.rec;
      let info = d.desc;
      if (r) {
        const per = (r.t / sel.bonus).toFixed(1);
        const inp = r.in ? Object.keys(r.in).map(k => RES[k].e + r.in[k]).join(' + ') + ' → ' : '';
        info += `<br>${inp}${RES[r.out].e} 1 za ${per} s` + (sel.bonus > 1 ? ` <span class="chip">⚡ ×${sel.bonus.toFixed(1)}</span>` : '');
        const st = sel.working ? '⚙️ pracuje' : sel.state === 'input' ? `❗ chybí ${RES[sel.need].e} ${RES[sel.need].n}` : sel.state === 'full' ? '📦 sklad je plný – postav další sklad' : '💤 čeká';
        info += `<br><span class="muted">${st}${hungry ? ' · 😟 hlad zpomaluje práci' : ''}</span>`;
      }
      const refund = Object.keys(d.cost).map(k => RES[k].e + Math.floor(d.cost[k] * 0.5)).join(' ');
      setSheet(`<h3>${d.e} ${d.n}<button class="x" data-a="close">✕</button></h3><div>${info}</div><div class="row"><button class="act" data-a="demolish">🗑 Zbourat (vrátí ${refund})</button></div>`);
    } else { sheet.classList.remove('show'); return; }
    sheet.classList.add('show'); layoutSheet();
  }
  sheet.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'close') { tool = null; sel = null; sheet.classList.remove('show'); refreshPalette(); }
    if (a.dataset.a === 'demolish' && sel) { demolish(sel); sel = null; sheet.classList.remove('show'); updateHUD(); }
  });
  levelCard.addEventListener('click', () => { levelCard.classList.toggle('collapsed'); updateHUD(); });

  function helpHTML() {
    return '<h2>🌿 Zelené Údolí</h2>' +
      '<p>Vybuduj z malé osady prosperující údolí. Splňuj <b>levely</b> (nahoře) – každý odemkne <b>novou část mapy</b> z mlhy a <b>nové budovy</b>.</p>' +
      '<p>🪓 Vyber budovu dole a <b>klepni na zvýrazněné pole</b>. Mapu posouváš prstem, dvěma prsty přibližuješ.</p>' +
      '<p>🏠 Chaloupky přivádějí obyvatele, ti pracují v budovách. 💧 Studna zrychlí sousedy, 📦 sklad zvětší zásoby. Klepnutím na budovu vidíš její stav.</p>' +
      '<p>Hra se ukládá sama a pracuje i když jsi pryč.</p>';
  }
  function showMenu() {
    showModal(helpHTML(), [
      { label: 'Hrát' },
      { label: 'Nová hra', cls: 'danger', fn: () => setTimeout(() => showModal('<h2>Začít znovu?</h2><p>Celý postup se smaže.</p>', [
        { label: 'Zpět', cls: 'sec' }, { label: 'Smazat vše', cls: 'danger', fn: () => { newState(); initFog(true); tool = null; sel = null; startCam(); save(); updateHUD(); showSheet(); } }]), 50) },
    ]);
  }

  // ---------- Vstup ----------
  const ptrs = new Map();
  let pinch = null, downInfo = null, moved = 0;
  const toTile = (sx, sy) => [Math.floor((sx / cam.z + cam.x) / T), Math.floor((sy / cam.z + cam.y) / T)];
  function pinchState() {
    const p = [...ptrs.values()];
    return { cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 };
  }
  function onTap(sx, sy) {
    const [tx, ty] = toTile(sx, sy);
    if (!inb(tx, ty)) return;
    const b = cell(tx, ty);
    if (b) { tool = null; sel = b; refreshPalette(); showSheet(); return; }
    if (tool) { if (place(tool, tx, ty)) { updateHUD(); showSheet(); } return; }
    if (!regionOpen(tx, ty)) { toast('🔒 ' + REG_NAMES[regIdxAt(tx, ty)] + ' – splň level ' + regIdxAt(tx, ty)); return; }
    sel = null; showSheet();
  }
  function initInput() {
    canvas.addEventListener('pointerdown', e => {
      fly = null;
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { downInfo = { t: performance.now() }; moved = 0; }
      else if (ptrs.size === 2) { pinch = pinchState(); downInfo = null; }
    });
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size >= 2 && pinch) {
        const s = pinchState();
        const wx = pinch.cx / cam.z + cam.x, wy = pinch.cy / cam.z + cam.y;
        cam.z = clamp(cam.z * s.dist / pinch.dist, 0.45, 2.6);
        cam.x = wx - s.cx / cam.z; cam.y = wy - s.cy / cam.z;
        pinch = s; clampCam(); return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }
    });
    const end = e => {
      if (!ptrs.has(e.pointerId)) return;
      const last = ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (last && downInfo && moved < 10 && performance.now() - downInfo.t < 700 && e.type === 'pointerup') onTap(e.clientX, e.clientY);
      if (last) downInfo = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { e.preventDefault(); fly = null; zoomAround(e.clientX, e.clientY, cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); clampCam(); }, { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());
    $('speedBtn').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('speedBtn').textContent = '⏩ ' + speed + '×'; };
    $('menuBtn').onclick = showMenu;
    window.addEventListener('resize', () => { resize(); clampCam(); });
  }

  // ---------- Ukládání ----------
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ lvl, stock, produced, base, pop, won, hungry, t: Date.now(), b: blds.map(b => [b.type, b.x, b.y]) }));
    } catch (e) { /* nic */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      newState();
      lvl = clamp(d.lvl | 0, 1, 9); won = !!d.won; pop = d.pop || 4; hungry = !!d.hungry;
      for (const k of RES_KEYS) { stock[k] = (d.stock && d.stock[k]) || 0; produced[k] = (d.produced && d.produced[k]) || 0; base[k] = (d.base && d.base[k]) || 0; }
      for (const [type, x, y] of d.b || []) {
        if (B[type] && inb(x, y) && !cell(x, y)) { const b = makeB(type, x, y); blds.push(b); grid[y * W + x] = b; }
      }
      recalc();
      const away = Math.min(900, (Date.now() - (d.t || Date.now())) / 1000);
      if (away > 20) { quiet = true; for (let i = 0; i < away; i++) update(1); quiet = false; return 'away'; }
      return true;
    } catch (e) { return false; }
  }
  function initFog(instant) {
    for (let i = 0; i < 9; i++) if (instant) fog[i] = i < unlockedRegions() ? 0 : 1;
  }
  function startCam() {
    cam.z = clamp(vw / (8.5 * T), 0.6, 1.5);
    centerOn(24 * T, 25 * T);
  }

  // ---------- Hlavní smyčka ----------
  let prev = 0, hudT = 0, saveT = 0, goalT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    for (let s = 0; s < speed; s++) update(dt);
    // mlha
    for (let i = 0; i < 9; i++) {
      const target = i < unlockedRegions() ? 0 : 1;
      fog[i] += clamp(target - fog[i], -dt * 0.7, dt * 0.7);
    }
    if (fly) {
      cam.x += (fly.x - cam.x) * Math.min(1, dt * 3); cam.y += (fly.y - cam.y) * Math.min(1, dt * 3);
      if (Math.abs(fly.x - cam.x) + Math.abs(fly.y - cam.y) < 2) fly = null;
      clampCam();
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i]; c.t += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.t > c.life) confetti.splice(i, 1);
    }
    hudT += dt; saveT += dt; goalT += dt;
    if (hudT > 0.25) { hudT = 0; updateHUD(); if (sel && sheet.classList.contains('show')) showSheet(); }
    if (goalT > 0.5) { goalT = 0; checkGoals(); }
    if (saveT > 5) { saveT = 0; save(); }
    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  // ---------- Start ----------
  function init() {
    canvas = $('game'); ctx = canvas.getContext('2d');
    genTerrain();
    resize();
    buildPalette();
    initInput();
    const r = load();
    if (!r) newState();
    initFog(true);
    startCam();
    updateHUD();
    resize();
    if (!r) showMenu();
    else if (r === 'away') toast('⏳ Údolí pracovalo i bez tebe', 2800);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    prev = performance.now();
    requestAnimationFrame(frame);
  }
  // ladicí rozhraní (pro testy)
  window.__zu = {
    get state() { return { lvl, pop, capPop, capStock, used, hungry, stock, produced, base, won, cnt, blds: blds.length, modalOpen }; },
    place: (t, x, y) => place(t, x, y), update: dt => update(dt), checkGoals, validTile, terrain, setLvl: n => { lvl = n; recalc(); }, give: (k, n) => { stock[k] += n; },
    setTool: t => { tool = t; refreshPalette(); showSheet(); }, cam, B, regionOpen, updateHUD, setPop: n => { pop = n; }, setSpeed: n => { speed = n; }, select: (x, y) => { sel = cell(x, y); tool = null; refreshPalette(); showSheet(); },
  };
  init();
})();
