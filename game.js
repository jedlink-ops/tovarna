'use strict';
(() => {
  // ---------- Konstanty ----------
  const W = 64, H = 64, T = 32;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const ARROWS = ['➡️', '⬇️', '⬅️', '⬆️'];
  const SAVE_KEY = 'mini-tovarna-save-v1';

  const COST = {
    conveyor: { ironPlate: 1 },
    miner: { ironPlate: 10 },
    furnace: { ironPlate: 5 },
    gear: { ironPlate: 12 },
    circuit: { ironPlate: 20, gear: 5 },
  };
  const ITEM_NAME = { iron: 'Železná ruda', copper: 'Měděná ruda', ironPlate: 'Železo', copperPlate: 'Měď', gear: 'Kola', circuit: 'Obvody' };
  const ITEM_COL = { iron: '#7f93a8', copper: '#d0803f', ironPlate: '#dfe6ee', copperPlate: '#ffb07a', gear: '#a7b0ba', circuit: '#43d16a' };
  const INV_SHOW = ['ironPlate', 'copperPlate', 'gear', 'circuit', 'iron', 'copper'];
  const BLD = {
    miner: { emoji: '⛏️', col: '#b8651b', label: 'Důl' },
    furnace: { emoji: '🔥', col: '#8a3a2a', label: 'Pec' },
    gear: { emoji: '⚙️', col: '#4d5a68', label: 'Kola' },
    circuit: { emoji: '🔌', col: '#2f6f46', label: 'Obvody' },
    core: { emoji: '📦', col: '#2d5a9e', label: 'Základna' },
  };
  const QUESTS = [
    { item: 'iron', n: 20, txt: 'Dopravuj 20× železnou rudu do základny' },
    { item: 'ironPlate', n: 30, txt: 'Vyrob a dodej 30× železo (pec!)' },
    { item: 'copperPlate', n: 20, txt: 'Dodej 20× měď (měděná ruda → pec)' },
    { item: 'gear', n: 20, txt: 'Postav výrobu kol a dodej 20×' },
    { item: 'circuit', n: 15, txt: 'Postav výrobu obvodů a dodej 15×' },
    { item: 'circuit', n: 60, txt: 'Rozjeď velkou výrobu: dodej 60× obvody' },
  ];
  const QUEST_REWARD = 40;

  // ---------- Stav ----------
  let terrain = new Uint8Array(W * H); // 0 tráva, 1 železo, 2 měď
  let grid = new Array(W * H).fill(null);
  let blds = [];
  let inv, delivered, questIdx;
  const cam = { x: 0, y: 0, z: 1.3 };
  let tool = 'hand', rot = 0;
  let vw = 0, vh = 0, dpr = 1;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- Pomocné ----------
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cell = (x, y) => (inb(x, y) ? grid[y * W + x] : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function canAfford(c) { return Object.keys(c).every(k => (inv[k] || 0) >= c[k]); }
  function pay(c) { for (const k in c) inv[k] -= c[k]; }
  function refund(c) { for (const k in c) inv[k] = (inv[k] || 0) + c[k]; }

  let toastTimer = 0;
  const toastEl = document.getElementById('toast');
  function toast(msg, ms = 1800) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  // ---------- Generování mapy ----------
  function genTerrain() {
    terrain.fill(0);
    const patches = [
      [26, 30, 5, 1], [40, 37, 4, 2], [45, 18, 5, 1], [17, 44, 4, 2],
      [12, 14, 5, 1], [51, 50, 5, 2], [30, 52, 5, 1], [8, 32, 4, 2], [52, 30, 4, 2], [24, 12, 4, 2],
    ];
    for (const [px, py, r, t] of patches) {
      for (let y = py - r - 2; y <= py + r + 2; y++) {
        for (let x = px - r - 2; x <= px + r + 2; x++) {
          if (!inb(x, y)) continue;
          if (x >= 31 && x <= 34 && y >= 31 && y <= 34) continue;
          const d = Math.hypot(x - px, y - py);
          if (d < r * (0.65 + 0.5 * hash(x + t * 7, y + px))) terrain[y * W + x] = t;
        }
      }
    }
  }

  // ---------- Budovy ----------
  function makeBuilding(type, x, y, dir) {
    const b = { type, x, y, dir: dir || 0 };
    if (type === 'conveyor') { b.item = null; b.p = 0; }
    else if (type === 'miner') { b.t = 0; b.out = []; b.rr = 0; }
    else if (type === 'furnace') { b.in = []; b.busy = null; b.t = 0; b.out = []; b.rr = 0; }
    else if (type === 'gear') { b.inv = 0; b.busy = false; b.t = 0; b.out = []; b.rr = 0; }
    else if (type === 'circuit') { b.inv = { ironPlate: 0, copperPlate: 0 }; b.busy = false; b.t = 0; b.out = []; b.rr = 0; }
    else if (type === 'core') { b.w = 2; b.h = 2; }
    return b;
  }
  function addBuilding(b) {
    blds.push(b);
    const w = b.w || 1, h = b.h || 1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) grid[(b.y + j) * W + b.x + i] = b;
  }
  function removeBuilding(b) {
    blds.splice(blds.indexOf(b), 1);
    const w = b.w || 1, h = b.h || 1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) grid[(b.y + j) * W + b.x + i] = null;
  }

  function accept(t, item, src) {
    switch (t.type) {
      case 'conveyor':
        if (t.item) return false;
        if (t.x + DX[t.dir] === src.x && t.y + DY[t.dir] === src.y) return false; // proti sobě
        t.item = item; t.p = 0; return true;
      case 'furnace':
        if ((item === 'iron' || item === 'copper') && t.in.length < 5) { t.in.push(item); return true; }
        return false;
      case 'gear':
        if (item === 'ironPlate' && t.inv < 6) { t.inv++; return true; }
        return false;
      case 'circuit':
        if ((item === 'ironPlate' || item === 'copperPlate') && t.inv[item] < 6) { t.inv[item]++; return true; }
        return false;
      case 'core':
        inv[item] = (inv[item] || 0) + 1;
        delivered[item] = (delivered[item] || 0) + 1;
        return true;
    }
    return false;
  }

  function tryOutput(b) {
    if (!b.out.length) return;
    for (let i = 0; i < 4; i++) {
      const d = (b.rr + i) & 3;
      const t = cell(b.x + DX[d], b.y + DY[d]);
      if (t && t.type !== 'miner' && accept(t, b.out[0], b)) {
        b.out.shift(); b.rr = (d + 1) & 3; return;
      }
    }
  }

  const CONV_SPEED = 2.6, MINE_T = 1.2, SMELT_T = 1.6, GEAR_T = 1.8, CIRC_T = 2.4;
  function update(dt) {
    for (const b of blds) {
      switch (b.type) {
        case 'conveyor':
          if (b.item) {
            b.p = Math.min(1, b.p + CONV_SPEED * dt);
            if (b.p >= 1) {
              const t = cell(b.x + DX[b.dir], b.y + DY[b.dir]);
              if (t && accept(t, b.item, b)) b.item = null;
            }
          }
          break;
        case 'miner':
          if (b.out.length < 5) {
            b.t += dt;
            if (b.t >= MINE_T) { b.t = 0; b.out.push(terrain[b.y * W + b.x] === 1 ? 'iron' : 'copper'); }
          }
          tryOutput(b);
          break;
        case 'furnace':
          if (!b.busy && b.in.length && b.out.length < 5) { b.busy = b.in.shift(); b.t = 0; }
          if (b.busy) {
            b.t += dt;
            if (b.t >= SMELT_T) { b.out.push(b.busy === 'iron' ? 'ironPlate' : 'copperPlate'); b.busy = null; }
          }
          tryOutput(b);
          break;
        case 'gear':
          if (!b.busy && b.inv >= 2 && b.out.length < 5) { b.inv -= 2; b.busy = true; b.t = 0; }
          if (b.busy) { b.t += dt; if (b.t >= GEAR_T) { b.out.push('gear'); b.busy = false; } }
          tryOutput(b);
          break;
        case 'circuit':
          if (!b.busy && b.inv.ironPlate >= 1 && b.inv.copperPlate >= 1 && b.out.length < 5) {
            b.inv.ironPlate--; b.inv.copperPlate--; b.busy = true; b.t = 0;
          }
          if (b.busy) { b.t += dt; if (b.t >= CIRC_T) { b.out.push('circuit'); b.busy = false; } }
          tryOutput(b);
          break;
      }
    }
  }

  // ---------- Stavění ----------
  let lastWarn = 0;
  function warn(msg) {
    const n = performance.now();
    if (n - lastWarn > 900) { toast(msg, 1200); lastWarn = n; }
  }
  function applyTool(x, y, d) {
    if (!inb(x, y)) return;
    const ex = cell(x, y);
    if (tool === 'erase') {
      if (ex && ex.type !== 'core') { refund(COST[ex.type]); removeBuilding(ex); }
      return;
    }
    if (tool === 'hand') return;
    if (tool === 'conveyor' && ex && ex.type === 'conveyor') { ex.dir = d; return; }
    if (ex) return;
    if (tool === 'miner' && terrain[y * W + x] === 0) { warn('Důl se staví na rudu'); return; }
    if (!canAfford(COST[tool])) { warn('Nedostatek materiálu'); return; }
    pay(COST[tool]);
    addBuilding(makeBuilding(tool, x, y, tool === 'conveyor' ? d : 0));
  }

  // ---------- Úkoly ----------
  function checkQuest() {
    while (questIdx < QUESTS.length) {
      const q = QUESTS[questIdx];
      if ((delivered[q.item] || 0) >= q.n) {
        questIdx++;
        inv.ironPlate += QUEST_REWARD;
        toast('✅ Úkol splněn! Odměna: +' + QUEST_REWARD + ' železa', 2600);
      } else break;
    }
  }

  // ---------- HUD ----------
  const invEl = document.getElementById('inv');
  const questEl = document.getElementById('quest');
  function updateHUD() {
    invEl.innerHTML = INV_SHOW.map(k =>
      `<span><i style="background:${ITEM_COL[k]}"></i>${ITEM_NAME[k]} ${inv[k] || 0}</span>`).join('');
    if (questIdx >= QUESTS.length) {
      questEl.textContent = '🏆 Všechny úkoly splněny – stav dál, co chceš!';
    } else {
      const q = QUESTS[questIdx];
      questEl.textContent = `🎯 ${q.txt} (${Math.min(delivered[q.item] || 0, q.n)}/${q.n})`;
    }
  }

  const toolbar = document.getElementById('toolbar');
  const TOOLS = [
    ['hand', '✋', 'Posun'],
    ['conveyor', '➡️', 'Pás'],
    ['miner', '⛏️', 'Důl'],
    ['furnace', '🔥', 'Pec'],
    ['gear', '⚙️', 'Kola'],
    ['circuit', '🔌', 'Obvody'],
    ['erase', '🗑️', 'Smazat'],
    ['rotate', '🔄', 'Směr'],
  ];
  function costText(t) {
    const c = COST[t]; if (!c) return '';
    return Object.keys(c).map(k => c[k] + (k === 'ironPlate' ? 'Fe' : 'K')).join('+');
  }
  function buildToolbar() {
    toolbar.innerHTML = '';
    for (const [id, em, lab] of TOOLS) {
      const btn = document.createElement('button');
      btn.dataset.tool = id;
      btn.innerHTML = `<span class="em">${em}</span><small>${lab}${COST[id] ? ' · ' + costText(id) : ''}</small>`;
      btn.addEventListener('click', () => {
        if (id === 'rotate') { rot = (rot + 1) & 3; refreshToolbar(); return; }
        tool = id; refreshToolbar();
      });
      toolbar.appendChild(btn);
    }
    refreshToolbar();
  }
  function refreshToolbar() {
    for (const btn of toolbar.children) {
      const id = btn.dataset.tool;
      btn.classList.toggle('active', id === tool);
      if (id === 'rotate') btn.querySelector('.em').textContent = ARROWS[rot];
      if (id === 'conveyor') btn.querySelector('.em').textContent = ARROWS[rot];
    }
  }

  // ---------- Vykreslování ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
  }
  function drawTile(x, y) {
    const t = terrain[y * W + x];
    const px = x * T, py = y * T;
    ctx.fillStyle = ((x + y) & 1) ? '#2d4a32' : '#2f4d35';
    ctx.fillRect(px, py, T, T);
    if (t) {
      ctx.fillStyle = t === 1 ? '#566472' : '#6e4a2e';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = t === 1 ? '#9db2c7' : '#e0924a';
      for (let i = 0; i < 4; i++) {
        const hx = hash(x * 5 + i, y * 3 + 11), hy = hash(x * 7 + 3, y * 5 + i);
        ctx.fillRect(px + 3 + hx * (T - 10), py + 3 + hy * (T - 10), 5, 5);
      }
    }
  }
  function drawItem(item, cx, cy, r) {
    ctx.fillStyle = ITEM_COL[item];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#0006'; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawBuilding(b, time) {
    const px = b.x * T, py = b.y * T;
    if (b.type === 'conveyor') {
      ctx.save();
      ctx.translate(px + T / 2, py + T / 2);
      ctx.rotate(b.dir * Math.PI / 2);
      ctx.fillStyle = '#3b424b'; ctx.fillRect(-T / 2 + 1, -T / 2 + 3, T - 2, T - 6);
      ctx.fillStyle = '#6a7683';
      for (let k = 0; k < 2; k++) {
        const ox = ((time * T * 0.8 + k * T / 2) % T) - T / 2;
        ctx.beginPath(); ctx.moveTo(ox + 4, 0); ctx.lineTo(ox - 3, -5); ctx.lineTo(ox - 3, 5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      if (b.item) {
        drawItem(b.item, px + T / 2 + DX[b.dir] * (b.p - 0.5) * T, py + T / 2 + DY[b.dir] * (b.p - 0.5) * T, 5.5);
      }
      return;
    }
    const w = (b.w || 1) * T, h = (b.h || 1) * T;
    const d = BLD[b.type];
    ctx.fillStyle = d.col;
    ctx.fillRect(px + 2, py + 2, w - 4, h - 4);
    ctx.strokeStyle = '#0007'; ctx.lineWidth = 2; ctx.strokeRect(px + 2, py + 2, w - 4, h - 4);
    ctx.font = (b.type === 'core' ? 38 : 20) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.emoji, px + w / 2, py + h / 2 + 1);
    if (b.out && b.out.length) drawItem(b.out[0], px + w - 7, py + 7, 4.5);
    if (b.busy) {
      ctx.fillStyle = '#ffd166';
      const prog = clamp(b.t / (b.type === 'furnace' ? SMELT_T : b.type === 'gear' ? GEAR_T : CIRC_T), 0, 1);
      ctx.fillRect(px + 5, py + h - 7, (w - 10) * prog, 3);
    }
  }
  function draw(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#14181d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(W - 1, Math.ceil((cam.x + vw / cam.z) / T)), y1 = Math.min(H - 1, Math.ceil((cam.y + vh / cam.z) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(x, y);
    // mřížka při přiblížení
    if (cam.z > 0.9) {
      ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1 / cam.z; ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * T, y0 * T); ctx.lineTo(x * T, (y1 + 1) * T); }
      for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * T, y * T); ctx.lineTo((x1 + 1) * T, y * T); }
      ctx.stroke();
    }
    // okraj mapy
    ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 3 / cam.z; ctx.strokeRect(0, 0, W * T, H * T);
    for (const b of blds) {
      if (b.x + (b.w || 1) < x0 || b.x > x1 || b.y + (b.h || 1) < y0 || b.y > y1) continue;
      drawBuilding(b, time);
    }
  }

  // ---------- Vstup ----------
  const ptrs = new Map();
  let painting = false, panning = false, pinch = null, lastTile = null, downPos = null, moved = 0;
  const toTile = (sx, sy) => [Math.floor((sx / cam.z + cam.x) / T), Math.floor((sy / cam.z + cam.y) / T)];

  function paintTo(tx, ty) {
    if (!inb(tx, ty)) return;
    if (!lastTile) { applyTool(tx, ty, rot); lastTile = [tx, ty]; return; }
    let [lx, ly] = lastTile, guard = 0;
    while ((lx !== tx || ly !== ty) && guard++ < 300) {
      const ddx = tx - lx, ddy = ty - ly;
      const d = Math.abs(ddx) >= Math.abs(ddy) ? (ddx > 0 ? 0 : 2) : (ddy > 0 ? 1 : 3);
      const nx = lx + DX[d], ny = ly + DY[d];
      if (tool === 'conveyor') {
        const c = cell(lx, ly);
        if (c && c.type === 'conveyor') c.dir = d;
        rot = d;
      }
      applyTool(nx, ny, d);
      lx = nx; ly = ny;
    }
    lastTile = [tx, ty];
    refreshToolbar();
  }
  function pinchState() {
    const p = [...ptrs.values()];
    return { cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 };
  }
  function zoomAround(sx, sy, newZ) {
    const wx = sx / cam.z + cam.x, wy = sy / cam.z + cam.y;
    cam.z = clamp(newZ, 0.35, 3.2);
    cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z;
  }
  function clampCam() {
    const pad = 80 / cam.z;
    cam.x = clamp(cam.x, -pad, W * T - vw / cam.z + pad);
    cam.y = clamp(cam.y, -pad, H * T - vh / cam.z + pad);
  }

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { painting = false; panning = false; pinch = pinchState(); return; }
    if (ptrs.size > 2) return;
    downPos = { x: e.clientX, y: e.clientY }; moved = 0;
    if (tool === 'hand') panning = true;
    else { painting = true; lastTile = null; const [tx, ty] = toTile(e.clientX, e.clientY); paintTo(tx, ty); }
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2 && pinch) {
      const s = pinchState();
      const wx = pinch.cx / cam.z + cam.x, wy = pinch.cy / cam.z + cam.y;
      cam.z = clamp(cam.z * s.dist / pinch.dist, 0.35, 3.2);
      cam.x = wx - s.cx / cam.z; cam.y = wy - s.cy / cam.z;
      pinch = s; clampCam(); return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (panning) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }
    else if (painting) { const [tx, ty] = toTile(e.clientX, e.clientY); paintTo(tx, ty); }
  });
  function endPtr(e) {
    const had = ptrs.delete(e.pointerId);
    if (!had) return;
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      if (panning && moved < 10 && downPos) { // klepnutí s nástrojem Posun: otočí pás
        const [tx, ty] = toTile(downPos.x, downPos.y);
        const c = cell(tx, ty);
        if (c && c.type === 'conveyor') { c.dir = (c.dir + 1) & 3; rot = c.dir; refreshToolbar(); }
      }
      painting = false; panning = false; lastTile = null; downPos = null;
    }
  }
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoomAround(e.clientX, e.clientY, cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    clampCam();
  }, { passive: false });
  window.addEventListener('resize', resize);
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- Ukládání ----------
  function save() {
    try {
      const data = {
        inv, delivered, questIdx,
        b: blds.filter(b => b.type !== 'core').map(b => [b.type, b.x, b.y, b.dir]),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* ignorovat */ }
  }
  function newGame() {
    grid = new Array(W * H).fill(null); blds = [];
    inv = { ironPlate: 100, copperPlate: 0, gear: 0, circuit: 0, iron: 0, copper: 0 };
    delivered = {}; questIdx = 0;
    addBuilding(makeBuilding('core', 32, 32, 0));
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      newGame();
      inv = Object.assign(inv, d.inv); delivered = d.delivered || {}; questIdx = d.questIdx || 0;
      for (const [type, x, y, dir] of d.b) {
        if (COST[type] && inb(x, y) && !cell(x, y)) addBuilding(makeBuilding(type, x, y, dir));
      }
      return true;
    } catch (e) { return false; }
  }

  // ---------- Nápověda / menu ----------
  const helpEl = document.getElementById('help');
  const helpBtns = document.getElementById('helpBtns');
  function showHelp() {
    helpBtns.innerHTML = '';
    const ok = document.createElement('button'); ok.textContent = 'Hrát'; ok.onclick = () => helpEl.classList.remove('show');
    const nw = document.createElement('button'); nw.className = 'sec'; nw.textContent = 'Nová hra';
    nw.onclick = () => {
      if (confirm('Opravdu začít znovu? Postup se smaže.')) { newGame(); centerCam(); save(); helpEl.classList.remove('show'); }
    };
    helpBtns.append(ok, nw);
    helpEl.classList.add('show');
  }
  document.getElementById('menuBtn').addEventListener('click', showHelp);

  function centerCam() {
    cam.z = 1.3;
    cam.x = 33 * T - vw / cam.z / 2;
    cam.y = 33 * T - vh / cam.z / 2 - 20;
  }

  // ---------- Start ----------
  genTerrain();
  resize();
  const loaded = load();
  if (!loaded) newGame();
  centerCam();
  buildToolbar();
  if (!loaded) showHelp();

  let prev = performance.now(), hudT = 0, saveT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    update(dt);
    hudT += dt; saveT += dt;
    if (hudT > 0.2) { hudT = 0; checkQuest(); updateHUD(); }
    if (saveT > 5) { saveT = 0; save(); }
    draw(now / 1000);
    requestAnimationFrame(frame);
  }
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  requestAnimationFrame(frame);
})();
